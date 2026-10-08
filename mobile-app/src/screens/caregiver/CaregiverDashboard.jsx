import React, {
  useCallback,
  useContext,
  useState
} from 'react';

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { AuthContext } from '../../context/AuthContext';

import CaregiverHeader from '../../components/caregiver/CaregiverHeader';
import CaregiverBottomNav from '../../components/caregiver/CaregiverBottomNav';

import {
  getLinkedPatients,
  getLinkedPatientStatus
} from '../../services/caregiverApi';


export default function CaregiverDashboard({
  navigation
}) {
  const { user } =
    useContext(AuthContext);

  const [links, setLinks] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');


  const loadPatients = async () => {
    try {
      setError('');

      const response =
        await getLinkedPatients();

      const linkedPatients =
        response?.data || [];


      const enriched =
        await Promise.all(
          linkedPatients.map(
            async (link) => {

              if (
                !link.verified ||
                link.status !== 'active'
              ) {
                return {
                  ...link,
                  queueData: null
                };
              }


              try {
                const queueResponse =
                  await getLinkedPatientStatus(
                    link.linkId
                  );

                return {
                  ...link,

                  queueData:
                    queueResponse?.data ||
                    null
                };

              } catch {
                return {
                  ...link,
                  queueData: null
                };
              }
            }
          )
        );


      setLinks(enriched);

    } catch (error) {

      setError(
        error?.response?.data?.message ||
        'Unable to load linked patients.'
      );

    } finally {

      setLoading(false);
      setRefreshing(false);

    }
  };


  useFocusEffect(
    useCallback(() => {
      loadPatients();
    }, [])
  );


  const handleRefresh = () => {
    setRefreshing(true);
    loadPatients();
  };


  return (
    <View style={styles.outer}>

      <View style={styles.screen}>

        <CaregiverHeader
          title="Home"
          navigation={navigation}
        />


        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}

          contentContainerStyle={
            styles.content
          }

          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#155EEF"
            />
          }
        >

          <Text style={styles.welcomeLabel}>
            WELCOME BACK
          </Text>

          <Text style={styles.welcomeName}>
            Hello, {user?.firstName || 'Caregiver'}
          </Text>


          <View style={styles.updatedRow}>

            <Text style={styles.updatedText}>
              Updated just now
            </Text>

          </View>


          {loading ? (

            <View style={styles.loadingContainer}>

              <ActivityIndicator
                size="large"
                color="#155EEF"
              />

            </View>

          ) : error ? (

            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {error}
              </Text>
            </View>

          ) : links.length === 0 ? (

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.emptyAddCard}
              onPress={() =>
                navigation.navigate(
                  'LinkPatient'
                )
              }
            >

              <View style={styles.addCircle}>

                <Ionicons
                  name="add"
                  size={21}
                  color="#155EEF"
                />

              </View>

              <Text style={styles.addTitle}>
                ADD PATIENT
              </Text>

              <Text style={styles.addSubtitle}>
                Track another appointment or prescription
              </Text>

            </TouchableOpacity>

          ) : (

            <>
              <View style={styles.activeHeader}>

                <Text style={styles.activeTitle}>
                  Active Patients
                </Text>

                <View style={styles.activeCountBadge}>
                  <Text style={styles.activeCountText}>
                    {links.length} Active
                  </Text>
                </View>

                <Text style={styles.updatedSmall}>
                  Updated just now
                </Text>

              </View>


              {links.map((link) => {

                const queue =
                  link.queueData;

                return (
                  <View
                    key={
                      link.linkId ||
                      link._id
                    }
                    style={styles.patientCard}
                  >

                    <View style={styles.patientTop}>

                      <View style={styles.patientIdentity}>

                        <View style={styles.avatar}>

                          <Text style={styles.avatarText}>
                            {link.patient
                              ?.firstName?.[0] || 'P'}
                            {link.patient
                              ?.lastName?.[0] || ''}
                          </Text>

                        </View>


                        <View>

                          <Text style={styles.patientName}>
                            {link.patient
                              ?.firstName}{' '}
                            {link.patient
                              ?.lastName}
                          </Text>

                          <View style={styles.checkinRow}>

                            <Ionicons
                              name="time-outline"
                              size={10}
                              color="#64748B"
                            />

                            <Text style={styles.checkinText}>
                              {link.patient
                                ?.patientId}
                            </Text>

                          </View>

                        </View>

                      </View>


                      <View
                        style={
                          queue?.token
                            ? styles.waitingBadge
                            : styles.verifiedBadge
                        }
                      >

                        <View
                          style={
                            queue?.token
                              ? styles.orangeDot
                              : styles.greenDot
                          }
                        />

                        <Text
                          style={
                            queue?.token
                              ? styles.waitingText
                              : styles.verifiedText
                          }
                        >
                          {queue?.token
                            ? 'Waiting'
                            : 'Verified'}
                        </Text>

                      </View>

                    </View>


                    {queue?.token ? (

                      <>
                        <View style={styles.statsRow}>

                          <View style={styles.statBox}>

                            <Text style={styles.statLabel}>
                              TOKEN
                            </Text>

                            <Text style={styles.statNumber}>
                              {queue.token.tokenNo}
                            </Text>

                          </View>


                          <View style={styles.statBox}>

                            <Text style={styles.statLabel}>
                              IN LINE
                            </Text>

                            <Text style={styles.statNumberBlue}>
                              {queue.liveQueue
                                ?.patientsAhead ?? '--'}

                              <Text style={styles.smallUnit}>
                                {' '}ahead
                              </Text>

                            </Text>

                          </View>


                          <View style={styles.statBox}>

                            <Text style={styles.statLabel}>
                              EST. WAIT
                            </Text>

                            <Text style={styles.statNumber}>
                              ~
                              {queue.liveQueue
                                ?.estimatedWaitMinutes ?? '--'}
                              m
                            </Text>

                          </View>

                        </View>


                        <View style={styles.opdBar}>

                          <View style={styles.opdLeft}>

                            <Ionicons
                              name="medical-outline"
                              size={12}
                              color="#334155"
                            />

                            <Text style={styles.opdText}>
                              {queue.liveQueue
                                ?.opdName ||
                                queue.token.opdId}
                            </Text>

                          </View>


                          <Text style={styles.roomText}>
                            {queue.token.roomId ||
                              ''}
                          </Text>

                        </View>


                        <TouchableOpacity
                          activeOpacity={0.85}
                          style={styles.liveQueueButton}

                          onPress={() =>
                            navigation.navigate(
                              'CaregiverQueue',
                              {
                                linkId:
                                  link.linkId
                              }
                            )
                          }
                        >

                          <Text style={styles.liveQueueText}>
                            View Live Queue
                          </Text>

                          <Ionicons
                            name="arrow-forward"
                            size={14}
                            color="#FFFFFF"
                          />

                        </TouchableOpacity>

                      </>

                    ) : (

                      <View style={styles.noQueueBox}>

                        <Text style={styles.noQueueText}>
                          No active queue for this patient
                        </Text>

                      </View>

                    )}

                  </View>
                );
              })}


              <TouchableOpacity
                style={styles.emptyAddCard}
                onPress={() =>
                  navigation.navigate(
                    'LinkPatient'
                  )
                }
              >

                <View style={styles.addCircle}>

                  <Ionicons
                    name="add"
                    size={21}
                    color="#155EEF"
                  />

                </View>

                <Text style={styles.addTitle}>
                  ADD PATIENT
                </Text>

                <Text style={styles.addSubtitle}>
                  Track another appointment or prescription
                </Text>

              </TouchableOpacity>

            </>
          )}

        </ScrollView>


        <CaregiverBottomNav
          navigation={navigation}
          activeRoute="CaregiverHome"
        />

      </View>

    </View>
  );
}


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
    paddingTop: 21,
    paddingBottom: 26
  },

  welcomeLabel: {
    fontSize: 8,

    fontWeight: '700',

    letterSpacing: 0.8,

    color: '#64748B'
  },

  welcomeName: {
    marginTop: 3,

    fontSize: 20,

    fontWeight: '800',

    color: '#111827'
  },

  updatedRow: {
    marginTop: 20
  },

  updatedText: {
    fontSize: 9,

    color: '#94A3B8'
  },

  loadingContainer: {
    paddingVertical: 70,

    alignItems: 'center'
  },

  errorBox: {
    marginTop: 15,

    padding: 13,

    borderRadius: 12,

    backgroundColor: '#FEF2F2'
  },

  errorText: {
    fontSize: 10,

    color: '#B91C1C'
  },

  activeHeader: {
    marginTop: 21,
    marginBottom: 12,

    flexDirection: 'row',
    alignItems: 'center'
  },

  activeTitle: {
    fontSize: 13,

    fontWeight: '800',

    color: '#111827'
  },

  activeCountBadge: {
    marginLeft: 6,

    paddingHorizontal: 6,
    paddingVertical: 3,

    borderRadius: 10,

    backgroundColor: '#DCEEFE'
  },

  activeCountText: {
    fontSize: 8,

    fontWeight: '600',

    color: '#155EEF'
  },

  updatedSmall: {
    marginLeft: 'auto',

    fontSize: 8,

    color: '#94A3B8'
  },

  patientCard: {
    padding: 15,

    marginBottom: 16,

    borderRadius: 14,

    borderWidth: 1,
    borderColor: '#E0E5EC',

    backgroundColor: '#FFFFFF'
  },

  patientTop: {
    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'space-between'
  },

  patientIdentity: {
    flexDirection: 'row',
    alignItems: 'center'
  },

  avatar: {
    width: 39,
    height: 39,

    marginRight: 10,

    borderRadius: 10,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#D7ECFF'
  },

  avatarText: {
    color: '#0757D8',

    fontSize: 12,

    fontWeight: '800'
  },

  patientName: {
    color: '#111827',

    fontSize: 12,

    fontWeight: '800'
  },

  checkinRow: {
    marginTop: 4,

    flexDirection: 'row',
    alignItems: 'center'
  },

  checkinText: {
    marginLeft: 3,

    fontSize: 8,

    color: '#64748B'
  },

  waitingBadge: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 7,
    paddingVertical: 4,

    borderRadius: 15,

    backgroundColor: '#FFF7E6'
  },

  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 7,
    paddingVertical: 4,

    borderRadius: 15,

    backgroundColor: '#ECFDF3'
  },

  orangeDot: {
    width: 4,
    height: 4,

    marginRight: 4,

    borderRadius: 2,

    backgroundColor: '#F59E0B'
  },

  greenDot: {
    width: 4,
    height: 4,

    marginRight: 4,

    borderRadius: 2,

    backgroundColor: '#16A34A'
  },

  waitingText: {
    color: '#B45309',

    fontSize: 8,

    fontWeight: '700'
  },

  verifiedText: {
    color: '#15803D',

    fontSize: 8,

    fontWeight: '700'
  },

  statsRow: {
    marginTop: 14,

    flexDirection: 'row',

    justifyContent: 'space-between'
  },

  statBox: {
    width: '31%',

    minHeight: 58,

    padding: 9,

    borderRadius: 9,

    backgroundColor: '#F7F9FC'
  },

  statLabel: {
    color: '#94A3B8',

    fontSize: 7,

    fontWeight: '700'
  },

  statNumber: {
    marginTop: 7,

    color: '#0F172A',

    fontSize: 15,

    fontWeight: '800'
  },

  statNumberBlue: {
    marginTop: 7,

    color: '#155EEF',

    fontSize: 15,

    fontWeight: '800'
  },

  smallUnit: {
    color: '#64748B',

    fontSize: 7,

    fontWeight: '500'
  },

  opdBar: {
    minHeight: 37,

    marginTop: 10,

    paddingHorizontal: 10,

    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'space-between',

    borderRadius: 8,

    backgroundColor: '#F8FAFC'
  },

  opdLeft: {
    flexDirection: 'row',
    alignItems: 'center',

    flex: 1
  },

  opdText: {
    marginLeft: 5,

    fontSize: 8,

    color: '#334155',

    fontWeight: '600'
  },

  roomText: {
    fontSize: 7,

    color: '#94A3B8'
  },

  liveQueueButton: {
    height: 41,

    marginTop: 10,

    borderRadius: 9,

    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#0757D8'
  },

  liveQueueText: {
    marginRight: 6,

    color: '#FFFFFF',

    fontSize: 10,

    fontWeight: '700'
  },

  noQueueBox: {
    marginTop: 12,

    paddingVertical: 11,

    borderRadius: 8,

    backgroundColor: '#F8FAFC'
  },

  noQueueText: {
    textAlign: 'center',

    fontSize: 9,

    color: '#64748B'
  },

  emptyAddCard: {
    minHeight: 145,

    marginTop: 2,

    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',

    borderRadius: 14,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#FFFFFF'
  },

  addCircle: {
    width: 37,
    height: 37,

    borderRadius: 19,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#EAF1FF'
  },

  addTitle: {
    marginTop: 9,

    fontSize: 9,

    fontWeight: '800',

    color: '#111827'
  },

  addSubtitle: {
    marginTop: 6,

    fontSize: 8,

    color: '#94A3B8'
  }
});