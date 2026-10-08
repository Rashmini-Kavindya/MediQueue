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
      <View className="flex-1 bg-slate-50 justify-center items-center">

        <ActivityIndicator
          size="large"
          color="#2563eb"
        />

        <Text className="text-slate-500 mt-3">
          Loading queue status...
        </Text>

      </View>
    );
  }


  return (
    <View className="flex-1 bg-slate-50">

      {/* HEADER */}
      <View className="bg-white pt-14 pb-4 px-5 border-b border-slate-200">

        <View className="flex-row items-center">

          <TouchableOpacity
            onPress={() =>
              navigation.goBack()
            }
            className="mr-4"
          >
            <Text className="text-blue-600 text-lg font-semibold">
              ←
            </Text>
          </TouchableOpacity>

          <View>
            <Text className="text-xl font-bold text-slate-900">
              Patient Queue
            </Text>

            <Text className="text-sm text-slate-500">
              Live queue tracking
            </Text>
          </View>

        </View>

      </View>


      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 40
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >

        {error ? (
          <View className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <Text className="text-red-700">
              {error}
            </Text>
          </View>
        ) : (
          <>
            {/* PATIENT */}
            <View className="bg-white border border-slate-200 rounded-2xl p-5 mb-4">

              <Text className="text-xs text-slate-500">
                PATIENT
              </Text>

              <Text className="text-xl font-bold text-slate-900 mt-1">
                {statusData?.patient?.firstName}{' '}
                {statusData?.patient?.lastName}
              </Text>

              <Text className="text-slate-500 mt-1">
                {statusData?.patient?.patientId}
              </Text>

            </View>


            {!statusData?.token ? (

              /* NO ACTIVE TOKEN */
              <View className="bg-amber-50 border border-amber-200 rounded-2xl p-5">

                <Text className="text-lg font-bold text-amber-800">
                  No Active Token
                </Text>

                <Text className="text-amber-700 mt-2">
                  This patient currently has no active queue token.
                </Text>

              </View>

            ) : (
              <>
                {/* TOKEN */}
                <View className="bg-blue-600 rounded-3xl p-6 items-center mb-4">

                  <Text className="text-blue-100 text-sm">
                    CURRENT TOKEN
                  </Text>

                  <Text className="text-white text-5xl font-bold mt-2">
                    {statusData.token.tokenNo}
                  </Text>

                  <View className="bg-white/20 rounded-full px-4 py-2 mt-4">

                    <Text className="text-white font-semibold capitalize">
                      {statusData.token.status}
                    </Text>

                  </View>

                </View>


                {/* QUEUE DETAILS */}
                <View className="bg-white border border-slate-200 rounded-2xl p-5">

                  <Text className="text-lg font-bold text-slate-900 mb-4">
                    Live Queue
                  </Text>


                  <View className="flex-row justify-between mb-4">

                    <View>
                      <Text className="text-xs text-slate-500">
                        NOW SERVING
                      </Text>

                      <Text className="text-xl font-bold text-slate-900 mt-1">
                        {statusData?.liveQueue?.currentToken || '--'}
                      </Text>
                    </View>


                    <View>
                      <Text className="text-xs text-slate-500">
                        PEOPLE AHEAD
                      </Text>

                      <Text className="text-xl font-bold text-slate-900 mt-1">
                        {statusData?.liveQueue?.patientsAhead ?? '--'}
                      </Text>
                    </View>

                  </View>


                  <View className="border-t border-slate-100 pt-4">

                    <Text className="text-xs text-slate-500">
                      ESTIMATED WAIT
                    </Text>

                    <Text className="text-2xl font-bold text-blue-600 mt-1">
                      {statusData?.liveQueue?.estimatedWaitMinutes ?? '--'} min
                    </Text>

                  </View>


                  <View className="border-t border-slate-100 pt-4 mt-4">

                    <Text className="text-xs text-slate-500">
                      OPD
                    </Text>

                    <Text className="text-slate-800 font-semibold mt-1">
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