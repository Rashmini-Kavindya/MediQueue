import React, {
  useEffect,
  useState
} from 'react';

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';

import {
  getLinkedPatientStatus
} from '../../services/caregiverApi';

// iOS style soft shadow + squircle corners (same as the patient screens)
const card = {
  borderCurve: 'continuous',
  borderWidth: 0.5,
  borderColor: 'rgba(60,60,67,0.12)',
  shadowColor: '#0B1B3A',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.07,
  shadowRadius: 16,
  elevation: 2
};
const squircle = { borderCurve: 'continuous' };


export default function PatientStatusScreen({
  route,
  navigation
}) {
  const {
    linkId
  } = route.params;

  const [
    statusData,
    setStatusData
  ] = useState(null);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    refreshing,
    setRefreshing
  ] = useState(false);

  const [
    error,
    setError
  ] = useState('');


  const loadStatus = async () => {
    try {
      setError('');

      const response =
        await getLinkedPatientStatus(
          linkId
        );

      setStatusData(
        response?.data || null
      );

    } catch (err) {
      console.log(
        'Patient status error:',
        err?.response?.data ||
        err.message
      );

      setError(
        err?.response?.data?.message ||
        'Unable to load patient queue status.'
      );

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  useEffect(() => {
    loadStatus();
  }, [linkId]);


  const handleRefresh = () => {
    setRefreshing(true);
    loadStatus();
  };


  if (loading) {
    return (
      <View className="flex-1 bg-[#F2F2F7] justify-center items-center">

        <ActivityIndicator
          size="large"
          color="#8E8E93"
        />

        <Text className="text-[#8E8E93] mt-3 text-sm">
          Loading queue status...
        </Text>

      </View>
    );
  }


  return (
    <View className="flex-1 bg-[#F2F2F7]">

      {/* HEADER */}
      <View
        className="bg-white pt-14 pb-4 px-5"
        style={{ borderBottomWidth: 0.5, borderBottomColor: 'rgba(60,60,67,0.18)' }}
      >

        <View className="flex-row items-center">

          <TouchableOpacity
            onPress={() =>
              navigation.goBack()
            }
            className="mr-3 w-9 h-9 rounded-full bg-[#EFEFF4] items-center justify-center"
          >
            <Text className="text-[#007AFF] text-lg font-semibold">
              ←
            </Text>
          </TouchableOpacity>

          <View>
            <Text className="text-[22px] font-bold text-[#1C1C1E]">
              Patient Queue
            </Text>

            <Text className="text-sm text-[#8E8E93]">
              Live queue tracking
            </Text>
          </View>

        </View>

      </View>


      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 40
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#8E8E93"
            colors={['#007AFF']}
          />
        }
      >

        {error ? (
          <View
            className="bg-[rgba(255,59,48,0.08)] rounded-[22px] p-4"
            style={squircle}
          >
            <Text className="text-[#FF3B30] text-sm">
              {error}
            </Text>
          </View>
        ) : (
          <>
            {/* PATIENT */}
            <View
              className="bg-white rounded-[26px] p-5 mb-4"
              style={card}
            >

              <Text className="text-xs text-[#8E8E93] font-semibold tracking-widest">
                PATIENT
              </Text>

              <Text className="text-xl font-bold text-[#1C1C1E] mt-1">
                {statusData?.patient?.firstName}{' '}
                {statusData?.patient?.lastName}
              </Text>

              <Text className="text-[#8E8E93] mt-1">
                {statusData?.patient?.patientId}
              </Text>

            </View>


            {!statusData?.token ? (

              /* NO ACTIVE TOKEN */
              <View
                className="bg-[rgba(255,149,0,0.14)] rounded-[26px] p-5"
                style={squircle}
              >

                <Text className="text-lg font-bold text-[#FF9500]">
                  No Active Token
                </Text>

                <Text className="text-[#636366] mt-2">
                  This patient currently has no active queue token.
                </Text>

              </View>

            ) : (
              <>
                {/* TOKEN */}
                <View
                  className="bg-[#007AFF] rounded-[26px] p-6 items-center mb-4"
                  style={{
                    ...squircle,
                    shadowColor: '#007AFF',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.3,
                    shadowRadius: 16,
                    elevation: 4
                  }}
                >

                  <Text className="text-white/80 text-xs font-semibold tracking-widest">
                    CURRENT TOKEN
                  </Text>

                  <Text className="text-white text-5xl font-extrabold mt-2">
                    {statusData.token.tokenNo}
                  </Text>

                  <View className="bg-white/20 rounded-full px-4 py-2 mt-4">

                    <Text className="text-white font-semibold capitalize">
                      {statusData.token.status}
                    </Text>

                  </View>

                </View>


                {/* QUEUE DETAILS */}
                <View
                  className="bg-white rounded-[26px] p-5"
                  style={card}
                >

                  <Text className="text-lg font-bold text-[#1C1C1E] mb-4">
                    Live Queue
                  </Text>


                  <View className="flex-row justify-between mb-4">

                    <View
                      className="flex-1 bg-[#F7F7FA] rounded-[18px] p-4 mr-2"
                      style={squircle}
                    >
                      <Text className="text-xs text-[#8E8E93] font-semibold">
                        NOW SERVING
                      </Text>

                      <Text className="text-xl font-bold text-[#1C1C1E] mt-1">
                        {statusData?.liveQueue?.currentToken || '--'}
                      </Text>
                    </View>


                    <View
                      className="flex-1 bg-[#F7F7FA] rounded-[18px] p-4 ml-2"
                      style={squircle}
                    >
                      <Text className="text-xs text-[#8E8E93] font-semibold">
                        PEOPLE AHEAD
                      </Text>

                      <Text className="text-xl font-bold text-[#1C1C1E] mt-1">
                        {statusData?.liveQueue?.patientsAhead ?? '--'}
                      </Text>
                    </View>

                  </View>


                  <View
                    className="bg-[#F7F7FA] rounded-[18px] p-4"
                    style={squircle}
                  >

                    <Text className="text-xs text-[#8E8E93] font-semibold">
                      ESTIMATED WAIT
                    </Text>

                    <Text className="text-2xl font-bold text-[#007AFF] mt-1">
                      {statusData?.liveQueue?.estimatedWaitMinutes ?? '--'} min
                    </Text>

                  </View>


                  <View
                    className="bg-[#F7F7FA] rounded-[18px] p-4 mt-3"
                    style={squircle}
                  >

                    <Text className="text-xs text-[#8E8E93] font-semibold">
                      OPD
                    </Text>

                    <Text className="text-[#1C1C1E] font-semibold mt-1">
                      {statusData?.liveQueue?.opdName ||
                        statusData?.token?.opdId}
                    </Text>

                  </View>

                </View>
              </>
            )}

          </>
        )}

      </ScrollView>

    </View>
  );
}