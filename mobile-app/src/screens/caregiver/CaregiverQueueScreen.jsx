import React, {
  useCallback,
  useState
} from 'react';

import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import CaregiverHeader from '../../components/caregiver/CaregiverHeader';
import CaregiverBottomNav from '../../components/caregiver/CaregiverBottomNav';

import {
  getLinkedPatients,
  getLinkedPatientStatus,
  getAlertPreferences,
  updateAlertPreferences
} from '../../services/caregiverApi';


export default function CaregiverQueueScreen({
  navigation,
  route
}) {
  const [data, setData] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [alertEnabled, setAlertEnabled] =
    useState(true);

  const [alertThreshold, setAlertThreshold] =
    useState(5);


  // ======================================================
  // LOAD LINKED PATIENT QUEUE
  // ======================================================
  const loadQueue = async () => {
    try {
      const linksResponse =
        await getLinkedPatients();

      const links =
        linksResponse?.data || [];

      let activeLink = null;


      // If user came from a specific patient card
      if (route?.params?.linkId) {
        activeLink =
          links.find(
            link =>
              link.linkId ===
              route.params.linkId
          );
      }


      // Otherwise use first active verified patient
      if (!activeLink) {
        activeLink =
          links.find(
            link =>
              link.verified &&
              link.status === 'active'
          );
      }


      if (!activeLink) {
        setData(null);
        return;
      }


      const queueResponse =
        await getLinkedPatientStatus(
          activeLink.linkId
        );


      setData(
        queueResponse?.data || null
      );


      // ==================================================
      // LOAD ALERT PREFERENCE
      // ==================================================
      try {
        const prefResponse =
          await getAlertPreferences();

        const preference =
          prefResponse?.data;


        if (preference) {
          setAlertThreshold(
            preference.threshold || 5
          );


          setAlertEnabled(
            Array.isArray(
              preference.channels
            ) &&
            preference.channels.includes(
              'app'
            )
          );
        }

      } catch (error) {
        console.log(
          'Alert preference load error:',
          error?.response?.data ||
          error.message
        );
      }

    } catch (error) {
      console.log(
        'Queue load error:',
        error?.response?.data ||
        error.message
      );

      setData(null);

    } finally {
      setLoading(false);
    }
  };


  // ======================================================
  // RELOAD WHEN SCREEN OPENS
  // ======================================================
  useFocusEffect(
    useCallback(() => {
      setLoading(true);

      loadQueue();

    }, [route?.params?.linkId])
  );


  // ======================================================
  // TOGGLE QUEUE ALERT
  // ======================================================
  const handleToggleAlert =
    async (value) => {

      const previousValue =
        alertEnabled;

      // Update UI immediately
      setAlertEnabled(value);


      try {
        await updateAlertPreferences({
          threshold:
            alertThreshold,

          channels:
            value
              ? ['app']
              : [],

          language:
            'en'
        });

      } catch (error) {
        console.log(
          'Alert preference error:',
          error?.response?.data ||
          error.message
        );

        // Revert if API fails
        setAlertEnabled(
          previousValue
        );
      }
    };


  return (
    <View style={styles.outer}>

      <View style={styles.screen}>

        {/* ================= HEADER ================= */}
        <CaregiverHeader
          title="PATIENT QUEUE"
          navigation={navigation}
          showBack
          onBack={() =>
            navigation.navigate(
              'CaregiverHome'
            )
          }
        />


        {/* ================= CONTENT ================= */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={
            styles.content
          }
          showsVerticalScrollIndicator={
            false
          }
        >

          {/* ================= LOADING ================= */}
          {loading ? (

            <View style={styles.loading}>

              <ActivityIndicator
                size="large"
                color="#155EEF"
              />

            </View>

          ) : !data?.token ? (

            /* ================= NO ACTIVE QUEUE ================= */
            <View style={styles.emptyCard}>

              <View style={styles.emptyIcon}>

                <Ionicons
                  name="time-outline"
                  size={23}
                  color="#155EEF"
                />

              </View>


              <Text style={styles.emptyTitle}>
                No Active Queue
              </Text>


              <Text style={styles.emptyText}>
                Your linked patient does not currently have an active queue token.
              </Text>

            </View>

          ) : (

            <>
              {/* ========================================= */}
              {/* PATIENT NAME + OPD */}
              {/* ========================================= */}
              <View style={styles.patientTitleArea}>

                <Text style={styles.patientName}>
                  {data.patient?.firstName}{' '}
                  {data.patient?.lastName}
                </Text>


                <View style={styles.opdPill}>

                  <Ionicons
                    name="medical-outline"
                    size={9}
                    color="#0F4C81"
                  />


                  <Text style={styles.opdPillText}>
                    OPD:{' '}
                    {String(
                      data.liveQueue?.opdName ||
                      data.token.opdId
                    ).toUpperCase()}
                  </Text>

                </View>

              </View>


              {/* ========================================= */}
              {/* MAIN QUEUE CARD */}
              {/* ========================================= */}
              <View style={styles.queueCard}>

                <Text style={styles.tokenLabel}>
                  YOUR TOKEN NUMBER
                </Text>


                {/* TOKEN */}
                <View style={styles.tokenNumberBox}>

                  <Text style={styles.tokenNumber}>
                    {data.token.tokenNo}
                  </Text>

                </View>


                {/* NOW SERVING + PATIENTS AHEAD */}
                <View style={styles.queueStats}>

                  <View style={styles.queueStat}>

                    <Text style={styles.queueStatLabel}>
                      NOW SERVING
                    </Text>

                    <Text style={styles.queueStatValue}>
                      {data.liveQueue
                        ?.currentToken ||
                        '--'}
                    </Text>

                  </View>


                  <View
                    style={
                      styles.verticalDivider
                    }
                  />


                  <View style={styles.queueStat}>

                    <Text style={styles.queueStatLabel}>
                      PATIENTS AHEAD
                    </Text>

                    <Text style={styles.queueStatValue}>
                      {data.liveQueue
                        ?.patientsAhead ??
                        '--'}
                    </Text>

                  </View>

                </View>


                <View
                  style={
                    styles.horizontalDivider
                  }
                />


                {/* ESTIMATED WAIT */}
                <Text style={styles.waitLabel}>
                  ESTIMATED WAIT TIME
                </Text>


                <View style={styles.waitTimeRow}>

                  <Ionicons
                    name="time-outline"
                    size={15}
                    color="#0F6170"
                  />

                  <Text style={styles.waitTime}>
                    {data.liveQueue
                      ?.estimatedWaitMinutes ??
                      '--'}
                    {' '}MIN
                  </Text>

                </View>


                {/* ========================================= */}
                {/* QUEUE PROGRESS */}
                {/* ========================================= */}
                <View style={styles.progressArea}>

                  <View style={styles.progressTrack}>

                    <View
                      style={[
                        styles.progressFill,

                        {
                          width:
                            data.liveQueue
                              ?.patientsAhead <= 1
                              ? '80%'

                              : data.liveQueue
                                  ?.patientsAhead <= 5
                              ? '60%'

                              : '40%'
                        }
                      ]}
                    />

                  </View>


                  <View style={styles.progressLabels}>

                    <Text style={styles.progressToken}>
                      {data.liveQueue
                        ?.currentToken ||
                        '--'}
                    </Text>


                    <Text style={styles.progressStatus}>
                      Queue progressing
                    </Text>


                    <Text style={styles.progressToken}>
                      {data.token.tokenNo}
                    </Text>

                  </View>

                </View>


                {/* QUEUE MOVING STATUS */}
                <View style={styles.normalBox}>

                  <View style={styles.normalDot} />

                  <Text style={styles.normalText}>
                    QUEUE IS MOVING NORMALLY
                  </Text>

                </View>

              </View>


              {/* ========================================= */}
              {/* ALERT CARD */}
              {/* ========================================= */}
              <View style={styles.alertCard}>

                <View style={styles.alertIcon}>

                  <Ionicons
                    name="notifications"
                    size={16}
                    color="#155EEF"
                  />

                </View>


                <View style={styles.alertTextArea}>

                  <Text style={styles.alertTitle}>
                    {alertThreshold} Numbers Remaining
                  </Text>


                  <Text style={styles.alertSubtitle}>
                    Get alert when you're {alertThreshold}th in queue
                  </Text>

                </View>


                {/* ====================================== */}
                {/* CUSTOM TOGGLE - WHITE THUMB */}
                {/* ====================================== */}
                <TouchableOpacity
                  activeOpacity={0.85}

                  onPress={() =>
                    handleToggleAlert(
                      !alertEnabled
                    )
                  }

                  style={[
                    styles.customToggle,

                    alertEnabled
                      ? styles.customToggleOn
                      : styles.customToggleOff
                  ]}
                >

                  <View
                    style={[
                      styles.toggleThumb,

                      alertEnabled
                        ? styles.toggleThumbOn
                        : styles.toggleThumbOff
                    ]}
                  />

                </TouchableOpacity>

              </View>

            </>
          )}

        </ScrollView>


        {/* ================= BOTTOM NAVIGATION ================= */}
        <CaregiverBottomNav
          navigation={navigation}
          activeRoute="CaregiverQueue"
        />

      </View>

    </View>
  );
}



// ======================================================
// STYLES
// ======================================================
const styles = StyleSheet.create({

  outer: {
    flex: 1,

    backgroundColor: '#EDF1F5'
  },


  screen: {
    flex: 1,

    width: '100%',

    maxWidth: 430,

    alignSelf: 'center',

    backgroundColor: '#F9F7FF'
  },


  scroll: {
    flex: 1
  },


  content: {
    paddingHorizontal: 18,

    paddingTop: 12,

    paddingBottom: 28
  },


  loading: {
    paddingVertical: 80,

    alignItems: 'center'
  },


  // ====================================================
  // PATIENT HEADER
  // ====================================================

  patientTitleArea: {
    alignItems: 'center',

    marginBottom: 14
  },


  patientName: {
    color: '#111827',

    fontSize: 16,

    fontWeight: '800'
  },


  opdPill: {
    marginTop: 5,

    paddingHorizontal: 9,

    paddingVertical: 4,

    borderRadius: 12,

    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: '#DFF0F7'
  },


  opdPillText: {
    marginLeft: 4,

    color: '#0F4C81',

    fontSize: 7,

    fontWeight: '700'
  },


  // ====================================================
  // MAIN QUEUE CARD
  // ====================================================

  queueCard: {
    paddingHorizontal: 20,

    paddingVertical: 19,

    borderRadius: 18,

    borderWidth: 1,

    borderColor: '#E1E5EC',

    backgroundColor: '#FFFFFF'
  },


  tokenLabel: {
    textAlign: 'center',

    color: '#475569',

    fontSize: 8,

    fontWeight: '700',

    letterSpacing: 0.8
  },


  tokenNumberBox: {
    marginTop: 10,

    height: 70,

    borderRadius: 10,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: '#E9F0FF'
  },


  tokenNumber: {
    color: '#12213A',

    fontSize: 36,

    fontWeight: '900'
  },


  // ====================================================
  // QUEUE STATS
  // ====================================================

  queueStats: {
    marginTop: 18,

    flexDirection: 'row'
  },


  queueStat: {
    flex: 1,

    alignItems: 'center'
  },


  verticalDivider: {
    width: 1,

    backgroundColor: '#E5E7EB'
  },


  queueStatLabel: {
    color: '#64748B',

    fontSize: 7,

    fontWeight: '700'
  },


  queueStatValue: {
    marginTop: 5,

    color: '#0F172A',

    fontSize: 18,

    fontWeight: '900'
  },


  horizontalDivider: {
    height: 1,

    marginTop: 16,

    backgroundColor: '#EEF0F3'
  },


  // ====================================================
  // ESTIMATED WAIT
  // ====================================================

  waitLabel: {
    marginTop: 14,

    textAlign: 'center',

    color: '#64748B',

    fontSize: 7,

    fontWeight: '700'
  },


  waitTimeRow: {
    marginTop: 4,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center'
  },


  waitTime: {
    marginLeft: 4,

    color: '#12213A',

    fontSize: 19,

    fontWeight: '900'
  },


  // ====================================================
  // QUEUE PROGRESS
  // ====================================================

  progressArea: {
    marginTop: 17
  },


  progressTrack: {
    height: 4,

    overflow: 'hidden',

    borderRadius: 4,

    backgroundColor: '#E2E8F0'
  },


  progressFill: {
    height: 4,

    borderRadius: 4,

    backgroundColor: '#155EEF'
  },


  progressLabels: {
    marginTop: 5,

    flexDirection: 'row',

    justifyContent: 'space-between'
  },


  progressToken: {
    color: '#64748B',

    fontSize: 7
  },


  progressStatus: {
    color: '#0F6170',

    fontSize: 7,

    fontWeight: '700'
  },


  // ====================================================
  // NORMAL QUEUE STATUS
  // ====================================================

  normalBox: {
    marginTop: 15,

    height: 29,

    borderRadius: 15,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: '#F4F9FF'
  },


  normalDot: {
    width: 7,

    height: 7,

    marginRight: 5,

    borderRadius: 4,

    backgroundColor: '#155EEF'
  },


  normalText: {
    color: '#155EEF',

    fontSize: 8,

    fontWeight: '800'
  },


  // ====================================================
  // ALERT CARD
  // ====================================================

  alertCard: {
    minHeight: 68,

    marginTop: 15,

    paddingHorizontal: 13,

    flexDirection: 'row',

    alignItems: 'center',

    borderRadius: 14,

    borderWidth: 1,

    borderColor: '#E2E8F0',

    backgroundColor: '#FFFFFF'
  },


  alertIcon: {
    width: 34,

    height: 34,

    borderRadius: 17,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: '#EAF1FF'
  },


  alertTextArea: {
    flex: 1,

    marginLeft: 9
  },


  alertTitle: {
    color: '#111827',

    fontSize: 10,

    fontWeight: '800'
  },


  alertSubtitle: {
    marginTop: 3,

    color: '#64748B',

    fontSize: 8
  },


  // ====================================================
  // CUSTOM TOGGLE
  // ====================================================

  customToggle: {
    width: 44,

    height: 24,

    borderRadius: 12,

    padding: 3,

    justifyContent: 'center'
  },


  customToggleOn: {
    backgroundColor: '#155EEF'
  },


  customToggleOff: {
    backgroundColor: '#CBD5E1'
  },


  toggleThumb: {
    width: 18,

    height: 18,

    borderRadius: 9,

    backgroundColor: '#FFFFFF',

    shadowColor: '#000000',

    shadowOpacity: 0.15,

    shadowRadius: 2,

    shadowOffset: {
      width: 0,
      height: 1
    },

    elevation: 2
  },


  toggleThumbOn: {
    alignSelf: 'flex-end'
  },


  toggleThumbOff: {
    alignSelf: 'flex-start'
  },


  // ====================================================
  // EMPTY QUEUE
  // ====================================================

  emptyCard: {
    marginTop: 30,

    padding: 28,

    borderRadius: 16,

    alignItems: 'center',

    borderWidth: 1,

    borderColor: '#E2E8F0',

    backgroundColor: '#FFFFFF'
  },


  emptyIcon: {
    width: 44,

    height: 44,

    borderRadius: 22,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: '#EEF4FF'
  },


  emptyTitle: {
    marginTop: 12,

    color: '#111827',

    fontSize: 15,

    fontWeight: '800'
  },


  emptyText: {
    marginTop: 6,

    color: '#64748B',

    fontSize: 10,

    lineHeight: 16,

    textAlign: 'center'
  }

});