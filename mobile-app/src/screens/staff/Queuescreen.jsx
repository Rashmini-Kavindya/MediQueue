import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StaffScreen from '../../components/staff/StaffScreen';
import StatusPill from '../../components/staff/StatusPill';
import api from '../../services/api';

/**
 * Returns today's date as "YYYY-MM-DD" in the Asia/Colombo timezone.
 */
function getColomboDayString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export default function QueueScreen() {
  const [opds, setOpds] = useState([]);
  const [selectedOpdId, setSelectedOpdId] = useState('');
  const [queueData, setQueueData] = useState(null);

  const [loadingOpds, setLoadingOpds] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Load active OPDs from the backend.
  const loadOpds = useCallback(async () => {
    try {
      setError('');

      const response = await api.get('/opds');
      const activeOpds = response.data?.data || [];

      setOpds(activeOpds);

      setSelectedOpdId((currentId) => {
        if (activeOpds.some((opd) => opd.opdId === currentId)) {
          return currentId;
        }

        return activeOpds[0]?.opdId || '';
      });
    } catch (err) {
      console.error(
        'Failed to load OPDs:',
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.message ||
          'Unable to load OPDs. Check your API connection.'
      );
    } finally {
      setLoadingOpds(false);
    }
  }, []);

  // Load the queue for the selected OPD and Colombo date.
  const loadQueue = useCallback(async (opdId, showLoader = true) => {
    if (!opdId) {
      setQueueData(null);
      return;
    }

    if (showLoader) setLoadingQueue(true);

    try {
      const colomboDate = getColomboDayString();

      const response = await api.get(
        `/queue/live/${encodeURIComponent(opdId)}?date=${colomboDate}`
      );

      if (response.data?.success) {
        setQueueData(response.data.data);
        setError('');
      } else {
        setQueueData(null);
        setError('Unable to retrieve the live queue.');
      }
    } catch (err) {
      console.error(
        'Failed to load live queue:',
        err.response?.data || err.message
      );

      setQueueData(null);

      setError(
        err.response?.data?.message ||
          'Unable to load the queue. Please try again.'
      );
    } finally {
      if (showLoader) setLoadingQueue(false);
    }
  }, []);

  useEffect(() => {
    loadOpds();
  }, [loadOpds]);

  useEffect(() => {
    if (selectedOpdId) {
      setQueueData(null);
      loadQueue(selectedOpdId);
    } else {
      setQueueData(null);
    }
  }, [selectedOpdId, loadQueue]);

  const refresh = async () => {
    await loadQueue(selectedOpdId);
  };

  const selectedOpd = opds.find(
    (opd) => opd.opdId === selectedOpdId
  );

  const queue = queueData?.queue || [];

  // Split active and finished tokens for display.
  const activeStatuses = [
    'waiting',
    'called',
    'hold',
    'in-consultation',
  ];

  const activeTokens = queue.filter(
    (token) => activeStatuses.includes(token.status)
  );

  const finishedTokens = queue.filter(
    (token) =>
      token.status === 'completed' ||
      token.status === 'skipped'
  );

  const waitingTokens = activeTokens.filter(
    (token) => token.status === 'waiting'
  );

  const heldTokens = activeTokens.filter(
    (token) => token.status === 'hold'
  );

  const currentToken = activeTokens.find(
    (token) =>
      token.status === 'called' ||
      token.status === 'in-consultation'
  );

  console.log('Queue debug:', {
  selectedOpdId,
  queueCount: queue.length,
  statuses: queue.map((token) => ({
    tokenId: token.tokenId,
    tokenNo: token.tokenNo,
    status: token.status,
  })),
  waitingCount: waitingTokens.length,
  currentToken: currentToken
    ? {
        tokenId: currentToken.tokenId,
        tokenNo: currentToken.tokenNo,
        status: currentToken.status,
      }
    : null,
  actionLoading,
  loadingQueue,
});
  // Call the next waiting token using the existing API.
  const callNext = async () => {
    if (!selectedOpdId || actionLoading) return;

    if (currentToken) {
      Alert.alert(
        'Patient already called',
        `Token ${currentToken.tokenNo} is already active.`
      );
      return;
    }

    if (waitingTokens.length === 0) {
      Alert.alert(
        'Queue is empty',
        'There are no waiting patients in this OPD.'
      );
      return;
    }

    setActionLoading(true);

    try {
      const response = await api.post('/queue/call-next', {
        opdId: selectedOpdId,
        queueDate: getColomboDayString(),
      });

      if (response.data?.success) {
        await loadQueue(selectedOpdId, false);

        Alert.alert(
          'Success',
          response.data.message || 'Next patient called.'
        );
      } else {
        Alert.alert(
          'Unable to call patient',
          response.data?.message || 'Please try again.'
        );
      }
    } catch (err) {
      console.error(
        'Call next failed:',
        err.response?.data || err.message
      );

      Alert.alert(
        'Call next failed',
        err.response?.data?.message ||
          'Unable to call the next patient.'
      );

      await loadQueue(selectedOpdId, false);
    } finally {
      setActionLoading(false);
    }
  };

  // Perform Hold, Skip, or Recall on an active token.
  const performTokenAction = async (token, action) => {
    if (!token?.tokenId || actionLoading) return;

    const allowedActions = {
      hold: ['called'],
      recall: ['hold'],
      skip: ['called'],
    };

    if (!allowedActions[action]?.includes(token.status)) {
      Alert.alert(
        'Action unavailable',
        `Cannot ${action} a token with status "${token.status}".`
      );
      return;
    }

    setActionLoading(true);

    try {
      const response = await api.put(
        `/queue/${encodeURIComponent(token.tokenId)}/${action}`
      );

      if (response.data?.success) {
        await loadQueue(selectedOpdId, false);
      } else {
        Alert.alert(
          'Action failed',
          response.data?.message || 'Please try again.'
        );

        await loadQueue(selectedOpdId, false);
      }
    } catch (err) {
      console.error(
        `Token ${action} failed:`,
        err.response?.data || err.message
      );

      Alert.alert(
        'Action failed',
        err.response?.data?.message ||
          `Unable to ${action} the token. Please try again.`
      );

      await loadQueue(selectedOpdId, false);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmSkip = (token) => {
    Alert.alert(
      'Skip patient',
      `Are you sure you want to skip ${token.tokenNo}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => performTokenAction(token, 'skip'),
        },
      ]
    );
  };

  const renderActionButton = (
    label,
    icon,
    onPress,
    disabled = false
  ) => (
    <TouchableOpacity
      key={label}
      activeOpacity={0.7}
      disabled={disabled || actionLoading}
      onPress={onPress}
      className="flex-1 border border-slate-200 rounded-xl py-2.5 flex-row items-center justify-center"
      style={{
        opacity: disabled || actionLoading ? 0.45 : 1,
      }}
    >
      <Ionicons name={icon} size={14} color="#475569" />
      <Text className="text-[10px] font-bold text-slate-600 ml-1">
        {label}
      </Text>
    </TouchableOpacity>
  );

  // Reusable token row. Actions are shown only for active tokens.
  const renderTokenRow = (token, showActions = true, index = 0) => (
    <View
      key={`${token.tokenId || token.tokenNo || 'token'}-${index}`}
      className="flex-row items-center px-4 py-3.5 border-b border-slate-100"
    >
      <View className="flex-1">
        <Text className="text-sm font-bold text-slate-900">
          {token.tokenNo}
        </Text>

        <Text className="text-[10px] text-slate-400 mt-1">
          {token.tokenSequence != null
            ? `Sequence ${token.tokenSequence}`
            : ''}
        </Text>
      </View>

      <View className="flex-1">
        <StatusPill status={token.status.toUpperCase()} />
      </View>

      <View className="w-16 items-end">
        {showActions && token.status === 'called' && (
          <TouchableOpacity
            disabled={actionLoading}
            onPress={() => performTokenAction(token, 'hold')}
          >
            <Text className="text-[11px] font-bold text-blue-600">
              Hold
            </Text>
          </TouchableOpacity>
        )}

        {showActions && token.status === 'hold' && (
          <TouchableOpacity
            disabled={actionLoading}
            onPress={() => performTokenAction(token, 'recall')}
          >
            <Text className="text-[11px] font-bold text-blue-600">
              Recall
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loadingOpds) {
    return (
      <StaffScreen title="QUEUE MANAGEMENT">
        <View className="flex-1 items-center justify-center py-12">
          <ActivityIndicator size="large" color="#0052CC" />
          <Text className="text-sm text-slate-500 mt-3">
            Loading OPDs...
          </Text>
        </View>
      </StaffScreen>
    );
  }

  return (
    <StaffScreen title="QUEUE MANAGEMENT">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* OPD selector */}
        <View className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
          <Text className="text-[11px] font-bold text-slate-500 tracking-wide mb-2">
            SELECT OPD
          </Text>

          {opds.length === 0 ? (
            <Text className="text-sm text-slate-500">
              No active OPDs were returned by the server.
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {opds.map((opd, opdIndex) => {
                const selected = opd.opdId === selectedOpdId;

                return (
                  <TouchableOpacity
                    key={opd.opdId || `opd-${opdIndex}`}
                    activeOpacity={0.8}
                    onPress={() => setSelectedOpdId(opd.opdId)}
                    className={`mr-2 px-3 py-2.5 rounded-xl border ${
                      selected
                        ? 'bg-blue-50 border-blue-600'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        selected
                          ? 'text-blue-700'
                          : 'text-slate-600'
                      }`}
                    >
                      {opd.name}
                    </Text>

                    <Text className="text-[10px] text-slate-400 mt-1">
                      {opd.roomId || 'Room not assigned'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Error and retry */}
        {!!error && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <Text className="text-sm text-red-700">{error}</Text>

            <TouchableOpacity
              onPress={() => {
                if (selectedOpdId) {
                  loadQueue(selectedOpdId);
                } else {
                  loadOpds();
                }
              }}
              className="mt-2"
            >
              <Text className="text-xs font-bold text-red-700">
                TRY AGAIN
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Currently serving */}
        <View className="bg-white border border-slate-200 rounded-2xl p-5 items-center mb-4">
          <View className="flex-row items-center bg-slate-100 rounded-full px-3 py-1">
            <View
              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                currentToken ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            />

            <Text className="text-[9px] font-bold text-slate-600 tracking-wider">
              {currentToken ? 'CURRENTLY CALLED' : 'NO ACTIVE TOKEN'}
            </Text>
          </View>

          {loadingQueue ? (
            <ActivityIndicator
              size="large"
              color="#0052CC"
              style={{ marginVertical: 20 }}
            />
          ) : (
            <Text className="text-6xl font-extrabold text-slate-900 my-5">
              {currentToken?.tokenNo || '—'}
            </Text>
          )}

          {!!selectedOpd && (
            <Text className="text-xs text-slate-500 mb-3">
              {selectedOpd.name}
              {queueData?.roomId ? ` · ${queueData.roomId}` : ''}
            </Text>
          )}

          <TouchableOpacity
            activeOpacity={0.8}
            disabled={
              actionLoading ||
              loadingQueue ||
              !selectedOpdId ||
              waitingTokens.length === 0 ||
              !!currentToken
            }
            onPress={callNext}
            className="w-full bg-[#0052CC] rounded-xl py-3.5 flex-row items-center justify-center"
            style={{
              opacity:
                actionLoading ||
                loadingQueue ||
                !selectedOpdId ||
                waitingTokens.length === 0 ||
                !!currentToken
                  ? 0.5
                  : 1,
            }}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons
                name="notifications-outline"
                size={16}
                color="#FFFFFF"
              />
            )}

            <Text className="text-white font-bold text-xs tracking-wide ml-2">
              {actionLoading ? 'PLEASE WAIT...' : 'CALL NEXT PATIENT'}
            </Text>
          </TouchableOpacity>

          <View className="flex-row w-full mt-2.5" style={{ gap: 8 }}>
            {renderActionButton(
              'RECALL',
              'refresh-outline',
              () => {
                if (heldTokens.length > 0) {
                  performTokenAction(heldTokens[0], 'recall');
                } else {
                  Alert.alert(
                    'Nothing to recall',
                    'There are no held patients to recall.'
                  );
                }
              },
              heldTokens.length === 0
            )}

            {renderActionButton(
              'HOLD',
              'pause-circle-outline',
              () => {
                if (currentToken) {
                  performTokenAction(currentToken, 'hold');
                } else {
                  Alert.alert(
                    'No active token',
                    'Call a patient before placing a token on hold.'
                  );
                }
              },
              !currentToken
            )}

            {renderActionButton(
              'SKIP',
              'play-skip-forward-outline',
              () => {
                if (currentToken) {
                  confirmSkip(currentToken);
                } else {
                  Alert.alert(
                    'No active token',
                    'Call a patient before skipping a token.'
                  );
                }
              },
              !currentToken
            )}
          </View>

          <TouchableOpacity
            onPress={refresh}
            disabled={loadingQueue || actionLoading}
            className="flex-row items-center mt-4"
          >
            <Ionicons name="refresh-outline" size={14} color="#64748B" />
            <Text className="text-[10px] font-bold text-slate-500 ml-1">
              REFRESH QUEUE
            </Text>
          </TouchableOpacity>
        </View>

        {/* Queue summary */}
        <View className="flex-row mb-4" style={{ gap: 8 }}>
          <View className="flex-1 bg-white border border-slate-200 rounded-xl p-3">
            <Text className="text-[10px] font-bold text-slate-500">
              WAITING
            </Text>

            <Text className="text-2xl font-extrabold text-slate-900 mt-1">
              {queueData?.totalWaiting ?? waitingTokens.length}
            </Text>
          </View>

          <View className="flex-1 bg-white border border-slate-200 rounded-xl p-3">
            <Text className="text-[10px] font-bold text-slate-500">
              ON HOLD
            </Text>

            <Text className="text-2xl font-extrabold text-slate-900 mt-1">
              {heldTokens.length}
            </Text>
          </View>
        </View>

        {/* Active queue */}
        <View className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <View className="flex-row items-center justify-between px-4 py-3 bg-slate-50">
            <View>
              <Text className="text-[11px] font-bold text-slate-800 tracking-wide">
                LIVE QUEUE
              </Text>

              <Text className="text-[10px] text-slate-500 mt-1">
                {queueData?.opdName || selectedOpd?.name || 'Select an OPD'}
              </Text>
            </View>

            <View className="bg-slate-200 rounded-full px-2 py-1">
              <Text className="text-[9px] font-bold text-slate-600">
                {waitingTokens.length} Waiting
              </Text>
            </View>
          </View>

          <View className="flex-row px-4 py-2 border-b border-slate-100">
            <Text className="flex-1 text-[9px] font-bold text-slate-400 tracking-wider">
              TOKEN NUMBER
            </Text>

            <Text className="flex-1 text-[9px] font-bold text-slate-400 tracking-wider">
              STATUS
            </Text>

            <Text className="w-16 text-right text-[9px] font-bold text-slate-400 tracking-wider">
              ACTIONS
            </Text>
          </View>

          {loadingQueue ? (
            <View className="py-8 items-center">
              <ActivityIndicator color="#0052CC" />
              <Text className="text-xs text-slate-400 mt-2">
                Loading queue...
              </Text>
            </View>
          ) : !selectedOpdId ? (
            <Text className="text-center text-xs text-slate-400 py-6">
              Select an active OPD to view its queue.
            </Text>
          ) : activeTokens.length === 0 ? (
            <Text className="text-center text-xs text-slate-400 py-6">
              No active patients in this queue.
            </Text>
          ) : (
            activeTokens.map((token, index) => renderTokenRow(token, true, index))
          )}
        </View>

        {/* Completed and skipped tokens */}
        <View className="bg-white border border-slate-200 rounded-2xl overflow-hidden mt-4">
          <View className="flex-row items-center justify-between px-4 py-3 bg-slate-50">
            <View>
              <Text className="text-[11px] font-bold text-slate-800 tracking-wide">
                COMPLETED / SKIPPED
              </Text>

              <Text className="text-[10px] text-slate-500 mt-1">
                Finished tokens for this OPD and date
              </Text>
            </View>

            <View className="bg-slate-200 rounded-full px-2 py-1">
              <Text className="text-[9px] font-bold text-slate-600">
                {finishedTokens.length} Tokens
              </Text>
            </View>
          </View>

          <View className="flex-row px-4 py-2 border-b border-slate-100">
            <Text className="flex-1 text-[9px] font-bold text-slate-400 tracking-wider">
              TOKEN NUMBER
            </Text>

            <Text className="flex-1 text-[9px] font-bold text-slate-400 tracking-wider">
              STATUS
            </Text>

            <Text className="w-16 text-right text-[9px] font-bold text-slate-400 tracking-wider">
              ACTIONS
            </Text>
          </View>

          {loadingQueue ? (
            <View className="py-6 items-center">
              <ActivityIndicator color="#0052CC" />
            </View>
          ) : finishedTokens.length === 0 ? (
            <Text className="text-center text-xs text-slate-400 py-6">
              No completed or skipped tokens yet.
            </Text>
          ) : (
            finishedTokens.map((token, index) => renderTokenRow(token, false, index))
          )}
        </View>

        {!!queueData?.queueDate && (
          <Text className="text-center text-[10px] text-slate-400 mt-3">
            Queue date: {queueData.queueDate}
          </Text>
        )}
      </ScrollView>
    </StaffScreen>
  );
}