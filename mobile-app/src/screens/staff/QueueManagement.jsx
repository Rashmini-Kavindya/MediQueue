import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StaffScreen from '../../components/staff/StaffScreen';
import StatusPill from '../../components/staff/StatusPill';
import api from '../../services/api'; // Adjust this path to your existing Axios client.

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  'Something went wrong. Please try again.';

export default function QueueScreen() {
  const [opds, setOpds] = useState([]);
  const [selectedOpdId, setSelectedOpdId] = useState(null);
  const [queueData, setQueueData] = useState(null);
  const [loadingOpds, setLoadingOpds] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadOpds = useCallback(async () => {
    try {
      const response = await api.get('/opds');
      const activeOpds = response.data?.data || [];

      setOpds(activeOpds);

      // Preserve the current selection when possible.
      setSelectedOpdId((currentId) =>
        activeOpds.some((opd) => opd.opdId === currentId)
          ? currentId
          : activeOpds[0]?.opdId || null
      );
    } catch (error) {
      Alert.alert('Unable to load OPDs', getErrorMessage(error));
    } finally {
      setLoadingOpds(false);
    }
  }, []);

  const loadQueue = useCallback(async (opdId, showLoader = true) => {
    if (!opdId) {
      setQueueData(null);
      return;
    }

    if (showLoader) setLoadingQueue(true);

    try {
      const response = await api.get(
        `/queue/live/${encodeURIComponent(opdId)}`
      );

      const data = response.data?.data;

      if (!data) {
        throw new Error('The server returned an invalid queue response.');
      }

      setQueueData(data);
    } catch (error) {
      setQueueData(null);
      Alert.alert('Unable to load queue', getErrorMessage(error));
    } finally {
      setLoadingQueue(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOpds();
  }, [loadOpds]);

  useEffect(() => {
    setQueueData(null);

    if (selectedOpdId) {
      loadQueue(selectedOpdId);
    }
  }, [selectedOpdId, loadQueue]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadOpds();

      // Refresh the currently selected queue as well.
      if (selectedOpdId) {
        await loadQueue(selectedOpdId, false);
      }
    } finally {
      setRefreshing(false);
    }
  }, [loadOpds, loadQueue, selectedOpdId]);

  const runAction = async (action, tokenId = null) => {
    if (!selectedOpdId || actionLoading) return;

    setActionLoading(true);

    try {
      if (action === 'call-next') {
        await api.post('/queue/call-next', {
          opdId: selectedOpdId,
        });
      } else if (tokenId) {
        await api.put(`/queue/${encodeURIComponent(tokenId)}/${action}`);
      } else {
        throw new Error('No token was selected for this action.');
      }

      await loadQueue(selectedOpdId, false);
    } catch (error) {
      Alert.alert(
        action === 'call-next' ? 'Unable to call next patient' : 'Queue action failed',
        getErrorMessage(error)
      );

      // Reload in case the server updated the token before an error occurred.
      await loadQueue(selectedOpdId, false);
    } finally {
      setActionLoading(false);
    }
  };

  const queue = queueData?.queue || [];

  const currentToken =
    queue.find((token) =>
      ['called', 'in-consultation'].includes(token.status)
    ) || null;

  const heldTokens = queue.filter((token) => token.status === 'hold');

  const waitingCount = queue.filter(
    (token) => token.status === 'waiting'
  ).length;

  const confirmAction = (title, message, action, tokenId) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: () => runAction(action, tokenId),
      },
    ]);
  };

  return (
    <StaffScreen title="QUEUE MANAGEMENT">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        {/* OPD selector */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-slate-500 mb-2">
            SELECT OPD
          </Text>

          {loadingOpds ? (
            <ActivityIndicator />
          ) : opds.length === 0 ? (
            <Text className="text-sm text-slate-500">
              No active OPDs available.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {opds.map((opd) => {
                const selected = selectedOpdId === opd.opdId;

                return (
                  <TouchableOpacity
                    key={opd.opdId}
                    onPress={() => setSelectedOpdId(opd.opdId)}
                    className={`mr-2 rounded-xl px-4 py-3 border ${
                      selected
                        ? 'bg-blue-700 border-blue-700'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        selected ? 'text-white' : 'text-slate-700'
                      }`}
                    >
                      {opd.name}
                    </Text>
                    <Text
                      className={`text-[10px] mt-1 ${
                        selected ? 'text-blue-100' : 'text-slate-400'
                      }`}
                    >
                      {opd.roomId || opd.opdId}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Currently serving */}
        <View className="bg-white border border-slate-200 rounded-2xl p-5 items-center mb-4">
          <View className="flex-row items-center bg-slate-100 rounded-full px-3 py-1">
            <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
            <Text className="text-[9px] font-bold text-slate-600 tracking-wider">
              CURRENTLY SERVING
            </Text>
          </View>

          <Text className="text-sm text-slate-500 mt-3">
            {queueData?.opdName || 'Select an OPD'}
          </Text>

          {loadingQueue ? (
            <ActivityIndicator size="large" className="my-5" />
          ) : (
            <Text className="text-6xl font-extrabold text-slate-900 my-5">
              {currentToken?.tokenNo || '—'}
            </Text>
          )}

          <TouchableOpacity
            disabled={!selectedOpdId || loadingQueue || actionLoading}
            onPress={() => runAction('call-next')}
            className={`w-full rounded-xl py-3.5 flex-row items-center justify-center ${
              !selectedOpdId || loadingQueue || actionLoading
                ? 'bg-blue-300'
                : 'bg-[#0052CC]'
            }`}
          >
            {actionLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="notifications-outline"
                  size={16}
                  color="#FFFFFF"
                />
                <Text className="text-white font-bold text-xs tracking-wide ml-2">
                  CALL NEXT PATIENT
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View className="flex-row w-full mt-2.5" style={{ gap: 8 }}>
            {[
              {
                label: 'RECALL',
                icon: 'refresh-outline',
                disabled: heldTokens.length === 0,
                onPress: () => {
                  const held = heldTokens[0];
                  if (held) {
                    confirmAction(
                      'Recall patient',
                      `Call ${held.tokenNo} again?`,
                      'recall',
                      held.tokenId
                    );
                  }
                },
              },
              {
                label: 'HOLD',
                icon: 'pause-circle-outline',
                disabled: !currentToken,
                onPress: () => {
                  if (currentToken) {
                    confirmAction(
                      'Hold patient',
                      `Put ${currentToken.tokenNo} on hold?`,
                      'hold',
                      currentToken.tokenId
                    );
                  }
                },
              },
              {
                label: 'SKIP',
                icon: 'play-skip-forward-outline',
                disabled: !currentToken,
                onPress: () => {
                  if (currentToken) {
                    confirmAction(
                      'Skip patient',
                      `Skip ${currentToken.tokenNo}?`,
                      'skip',
                      currentToken.tokenId
                    );
                  }
                },
              },
            ].map((button) => (
              <TouchableOpacity
                key={button.label}
                disabled={button.disabled || actionLoading}
                onPress={button.onPress}
                className={`flex-1 border border-slate-200 rounded-xl py-2.5 flex-row items-center justify-center ${
                  button.disabled || actionLoading ? 'opacity-40' : ''
                }`}
              >
                <Ionicons
                  name={button.icon}
                  size={14}
                  color="#475569"
                />
                <Text className="text-[10px] font-bold text-slate-600 ml-1">
                  {button.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {heldTokens.length > 0 && (
            <Text className="text-[10px] text-slate-500 mt-3">
              {heldTokens.length} patient(s) on hold. Recall calls the
              first held patient in the displayed queue.
            </Text>
          )}
        </View>

        {/* Upcoming queue */}
        <View className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-5">
          <View className="flex-row items-center justify-between px-4 py-3 bg-slate-50">
            <Text className="text-[11px] font-bold text-slate-800 tracking-wide">
              OPD QUEUE
            </Text>
            <View className="bg-slate-200 rounded-full px-2 py-0.5">
              <Text className="text-[9px] font-bold text-slate-600">
                {waitingCount} Waiting
              </Text>
            </View>
          </View>

          <View className="flex-row px-4 py-2 border-b border-slate-100">
            <Text className="flex-1 text-[9px] font-bold text-slate-400">
              TOKEN NUMBER
            </Text>
            <Text className="flex-1 text-[9px] font-bold text-slate-400">
              STATUS
            </Text>
          </View>

          {loadingQueue && !queueData ? (
            <ActivityIndicator className="py-6" />
          ) : queue.length === 0 ? (
            <Text className="text-center text-xs text-slate-400 py-6">
              No active patients in this OPD queue.
            </Text>
          ) : (
            queue.map((token) => (
              <View
                key={token.tokenId}
                className="flex-row items-center px-4 py-3.5 border-b border-slate-100"
              >
                <Text className="flex-1 text-sm font-bold text-slate-900">
                  {token.tokenNo}
                </Text>
                <View className="flex-1">
                  <StatusPill status={token.status.toUpperCase()} />
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </StaffScreen>
  );
}