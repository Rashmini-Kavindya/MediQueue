import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StaffScreen from '../../components/staff/StaffScreen';
import StatusPill from '../../components/staff/StatusPill';
import api from '../../services/api';

const STATUS_OPTIONS = [
  'WAITING',
  'CALLED',
  'CONSULTING',
  'COMPLETED',
  'HOLD',
  'NO SHOW',
];

const toDisplayStatus = (status) => {
  const map = {
    waiting: 'WAITING',
    called: 'CALLED',
    'in-consultation': 'CONSULTING',
    completed: 'COMPLETED',
    hold: 'HOLD',
    skipped: 'NO SHOW',
    cancelled: 'NO SHOW',
  };

  return map[status] || 'WAITING';
};

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  'Something went wrong. Please try again.';

export default function ConsultationScreen({ navigation }) {
  const [opds, setOpds] = useState([]);
  const [selectedOpdId, setSelectedOpdId] = useState('');
  const [patients, setPatients] = useState([]);
  const [selectedTokenId, setSelectedTokenId] = useState('');
  const [newStatus, setNewStatus] = useState('WAITING');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const selected = patients.find(
    (patient) => patient.tokenId === selectedTokenId
  );

  const showMessage = (message) => {
    Alert.alert('Consultation Status', message);
  };

  const loadQueue = useCallback(async (opdId, preserveSelection = true) => {
    if (!opdId) {
      setPatients([]);
      setSelectedTokenId('');
      return;
    }

    try {
      setErrorMessage('');

      const response = await api.get(
        `/tokens/opd/${encodeURIComponent(opdId)}`
      );

      const tokens = (response.data?.data || []).map((token) => ({
        tokenId: token.tokenId,
        token: token.tokenNo,
        name: token.patientName || 'Patient',
        dept:
          opds.find((opd) => opd.opdId === opdId)?.name || 'OPD',
        status: toDisplayStatus(token.status),
        rawStatus: token.status,
      }));

      setPatients(tokens);

      setSelectedTokenId((current) => {
        if (
          preserveSelection &&
          current &&
          tokens.some((patient) => patient.tokenId === current)
        ) {
          return current;
        }

        const activePatient = tokens.find(
          (patient) =>
            patient.rawStatus === 'called' ||
            patient.rawStatus === 'in-consultation' ||
            patient.rawStatus === 'hold'
        );

        return activePatient?.tokenId || tokens[0]?.tokenId || '';
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }, [opds]);

  useEffect(() => {
    let mounted = true;

    const loadOpds = async () => {
      try {
        const response = await api.get('/opds');
        if (!mounted) return;

        const availableOpds = response.data?.data || [];
        setOpds(availableOpds);

        if (availableOpds.length > 0) {
          setSelectedOpdId(availableOpds[0].opdId);
        } else {
          setPatients([]);
          setErrorMessage('No active OPDs were found.');
        }
      } catch (error) {
        if (mounted) setErrorMessage(getErrorMessage(error));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadOpds();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (selectedOpdId) {
      loadQueue(selectedOpdId, false);
    }
  }, [selectedOpdId, loadQueue]);

  useEffect(() => {
    if (selected) {
      setNewStatus(selected.status);
    }
  }, [selectedTokenId, patients]);

  const selectPatient = (patient) => {
    setSelectedTokenId(patient.tokenId);
    setNewStatus(patient.status);
  };

const updateStatus = async () => {
  if (!selected) {
    Alert.alert('No patient selected', 'Please select a patient first.');
    return;
  }

  if (saving) return;

  const tokenId = selected.tokenId;
  const currentStatus = selected.rawStatus;

  console.log('Updating patient status:', {
    tokenId,
    currentStatus,
    requestedStatus: newStatus,
  });

  try {
    setSaving(true);
    setErrorMessage('');

    if (newStatus === toDisplayStatus(currentStatus)) {
      Alert.alert('No change', 'Select a different status first.');
      return;
    }

    switch (newStatus) {
      case 'WAITING':
        throw new Error(
          'The backend does not currently support resetting a token to waiting.'
        );

      case 'CALLED':
        if (currentStatus !== 'hold') {
          throw new Error(
            'To call a waiting patient, use Manage Queue → Call Next.'
          );
        }
        await api.put(`/queue/${encodeURIComponent(tokenId)}/recall`);
        break;

      case 'CONSULTING':
        if (currentStatus !== 'called') {
          throw new Error('Only a called patient can start a consultation.');
        }
        await api.post('/consultations/start', { tokenId });
        break;

      case 'COMPLETED': {
        if (currentStatus !== 'in-consultation') {
          throw new Error('Start the consultation before completing it.');
        }

        const response = await api.get(
          `/consultations/token/${encodeURIComponent(tokenId)}`
        );

        // Support either common response format.
        const consultation =
          response.data?.data || response.data?.consultation || response.data;

        if (!consultation?.consultationId) {
          throw new Error('Consultation record not found for this token.');
        }

        await api.put(
          `/consultations/${encodeURIComponent(
            consultation.consultationId
          )}/complete`
        );
        break;
      }

      case 'HOLD':
        if (currentStatus !== 'called') {
          throw new Error('Only a called patient can be put on hold.');
        }
        await api.put(`/queue/${encodeURIComponent(tokenId)}/hold`);
        break;

      case 'NO SHOW':
        if (currentStatus !== 'called') {
          throw new Error('Only a called patient can be marked as no-show.');
        }
        await api.put(`/queue/${encodeURIComponent(tokenId)}/skip`);
        break;

      default:
        throw new Error(`Unsupported status: ${newStatus}`);
    }

    await loadQueue(selectedOpdId, true);
    Alert.alert('Success', 'The patient status was updated.');
  } catch (error) {
    console.error(
      'Status update failed:',
      error.response?.status,
      error.response?.data || error.message
    );

    const message = getErrorMessage(error);
    setErrorMessage(message);
    Alert.alert('Status update failed', message);
  } finally {
    setSaving(false);
  }
};

  const activeCount = patients.filter(
    (patient) =>
      patient.rawStatus === 'called' ||
      patient.rawStatus === 'in-consultation'
  ).length;

  const footer = (
    <View className="px-4 py-3 bg-white border-t border-slate-100">
      <TouchableOpacity
        activeOpacity={0.8}
        disabled={!selected || selected.rawStatus !== 'completed'}
        onPress={() =>
          navigation.navigate('AddPrescription', {
            token: selected?.token,
            tokenId: selected?.tokenId,
            name: selected?.name,
          })
        }
        className="bg-[#0F3FCC] rounded-xl py-3.5 items-center"
        style={{ opacity: selected?.rawStatus === 'completed' ? 1 : 0.5 }}
      >
        <Text className="text-white font-bold text-xs tracking-wide">
          ADD PRESCRIPTION
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <StaffScreen title="CONSULTATION STATUS" footer={footer}>
      {loading ? (
        <View className="py-10 items-center">
          <ActivityIndicator size="large" color="#0052CC" />
          <Text className="text-xs text-slate-500 mt-3">
            Loading consultation data...
          </Text>
        </View>
      ) : (
        <>
          {errorMessage ? (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <Text className="text-xs text-red-700">
                {errorMessage}
              </Text>

              <TouchableOpacity
                onPress={() => loadQueue(selectedOpdId)}
                className="mt-2"
              >
                <Text className="text-xs font-bold text-red-800">
                  TRY AGAIN
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {opds.length > 1 && (
            <View className="mb-4">
              <Text className="text-[10px] font-bold text-slate-500 mb-2">
                SELECT OPD
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {opds.map((opd) => (
                  <TouchableOpacity
                    key={opd.opdId}
                    onPress={() => setSelectedOpdId(opd.opdId)}
                    className={`mr-2 px-4 py-2 rounded-xl border ${
                      selectedOpdId === opd.opdId
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        selectedOpdId === opd.opdId
                          ? 'text-white'
                          : 'text-slate-700'
                      }`}
                    >
                      {opd.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[11px] font-bold text-slate-800 tracking-wide">
                UPDATE STATUS
              </Text>
              <Text className="text-[9px] font-semibold text-slate-400">
                ACTION REQUIRED
              </Text>
            </View>

            <View className="bg-slate-50 border border-slate-200 rounded-xl p-4 items-center mb-4">
              <View className="flex-row items-center bg-blue-50 rounded-full px-2.5 py-1">
                <View className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1.5" />
                <Text className="text-[8px] font-bold text-blue-700 tracking-wider">
                  SELECTED PATIENT
                </Text>
              </View>

              <Text className="text-3xl font-extrabold text-slate-900 mt-2">
                {selected?.token || '—'}
              </Text>

              <Text className="text-xs text-slate-700 mt-1">
                <Text className="font-bold">
                  {selected?.name || 'No patient selected'}
                </Text>
                {selected ? `  (${selected.dept})` : ''}
              </Text>
            </View>

            <Text className="text-[9px] font-bold text-slate-500 tracking-wider mb-2">
              SELECT NEW STATUS:
            </Text>

            <View className="flex-row flex-wrap justify-between">
              {STATUS_OPTIONS.map((status) => {
                const active = newStatus === status;

                return (
                  <TouchableOpacity
                    key={status}
                    activeOpacity={0.7}
                    disabled={!selected || saving}
                    onPress={() => setNewStatus(status)}
                    className={`w-[48.5%] rounded-lg border py-3 items-center mb-2 ${
                      active
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold tracking-wide ${
                        active ? 'text-white' : 'text-slate-600'
                      }`}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={!selected || saving}
              onPress={updateStatus}
              className="bg-slate-900 rounded-xl py-3.5 flex-row items-center justify-center mt-2"
              style={{ opacity: !selected || saving ? 0.5 : 1 }}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text className="text-white font-bold text-xs tracking-wide mr-2">
                    UPDATE STATUS
                  </Text>
                  <Ionicons
                    name="refresh-outline"
                    size={14}
                    color="#FFFFFF"
                  />
                </>
              )}
            </TouchableOpacity>
          </View>

          <View className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-3">
              <Text className="text-[11px] font-bold text-slate-800 tracking-wide">
                CURRENT CONSULTATIONS
              </Text>
              <Text className="text-[9px] font-semibold text-slate-400">
                {activeCount} ACTIVE
              </Text>
            </View>

            <View className="flex-row px-4 py-2 bg-slate-50">
              <Text className="w-14 text-[9px] font-bold text-slate-400 tracking-wider">
                TOKEN
              </Text>
              <Text className="flex-1 text-[9px] font-bold text-slate-400 tracking-wider">
                PATIENT
              </Text>
              <Text className="w-28 text-right text-[9px] font-bold text-slate-400 tracking-wider">
                STATUS
              </Text>
            </View>

            {patients.map((patient) => (
              <TouchableOpacity
                key={patient.tokenId}
                activeOpacity={0.7}
                onPress={() => selectPatient(patient)}
                className={`flex-row items-center px-4 py-3.5 border-t border-slate-100 ${
                  patient.tokenId === selectedTokenId
                    ? 'bg-blue-50'
                    : 'bg-white'
                }`}
              >
                <Text className="w-14 text-xs font-bold text-slate-900">
                  {patient.token}
                </Text>

                <Text
                  className="flex-1 text-xs text-slate-700"
                  numberOfLines={1}
                >
                  {patient.name}
                </Text>

                <View className="w-28 items-end">
                  <StatusPill status={patient.status} />
                </View>
              </TouchableOpacity>
            ))}

            {patients.length === 0 && (
              <View className="p-6 items-center">
                <Text className="text-sm text-slate-500">
                  No tokens found for this OPD today.
                </Text>
              </View>
            )}
          </View>
        </>
      )}
    </StaffScreen>
  );
}
