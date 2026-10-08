import React, {
  useCallback,
  useState
} from 'react';

import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import CaregiverHeader from '../../components/caregiver/CaregiverHeader';
import CaregiverBottomNav from '../../components/caregiver/CaregiverBottomNav';

import {
  getLinkedPatients,
  getLinkedPatientNotifications
} from '../../services/caregiverApi';


export default function CaregiverAlertsScreen({
  navigation
}) {
  const [notifications, setNotifications] =
    useState([]);

  const [loading, setLoading] =
    useState(true);


  const loadAlerts = async () => {
    try {

      const linksResponse =
        await getLinkedPatients();

      const activeLinks =
        (linksResponse?.data || [])
          .filter(
            link =>
              link.verified &&
              link.status === 'active'
          );


      const responses =
        await Promise.all(
          activeLinks.map(
            link =>
              getLinkedPatientNotifications(
                link.linkId
              )
          )
        );


      const allNotifications =
        responses.flatMap(
          response =>
            response?.data?.notifications ||
            []
        );


      allNotifications.sort(
        (a, b) =>
          new Date(b.sentAt) -
          new Date(a.sentAt)
      );


      setNotifications(
        allNotifications
      );

    } catch (error) {

      setNotifications([]);

    } finally {

      setLoading(false);

    }
  };


  useFocusEffect(
    useCallback(() => {

      setLoading(true);
      loadAlerts();

    }, [])
  );


  const getIcon = (type) => {

    if (type === 'called') {
      return 'megaphone-outline';
    }

    if (type === 'near') {
      return 'time-outline';
    }

    return 'notifications-outline';
  };


  return (
    <View style={styles.outer}>

      <View style={styles.screen}>

        <CaregiverHeader
          title="Alerts"
          navigation={navigation}
        />


        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >

          <Text style={styles.pageTitle}>
            Caregiver Alerts
          </Text>

          <Text style={styles.pageSubtitle}>
            Queue updates and notifications for your linked patients
          </Text>


          <View style={styles.filterRow}>

            <View style={styles.activeFilter}>
              <Text style={styles.activeFilterText}>
                All
              </Text>
            </View>

            <View style={styles.filter}>
              <Text style={styles.filterText}>
                Queue
              </Text>
            </View>

            <View style={styles.filter}>
              <Text style={styles.filterText}>
                Updates
              </Text>
            </View>

          </View>


          {loading ? (

            <View style={styles.loading}>
              <ActivityIndicator
                size="large"
                color="#155EEF"
              />
            </View>

          ) : notifications.length === 0 ? (

            <View style={styles.emptyCard}>

              <View style={styles.emptyIcon}>

                <Ionicons
                  name="notifications-outline"
                  size={25}
                  color="#155EEF"
                />

              </View>

              <Text style={styles.emptyTitle}>
                No alerts yet
              </Text>

              <Text style={styles.emptyText}>
                Important queue updates and linked patient notifications will appear here.
              </Text>

            </View>

          ) : (

            notifications.map(
              (notification) => (

                <View
                  key={
                    notification.notificationId
                  }
                  style={
                    notification.isRead
                      ? styles.notificationCard
                      : styles.unreadCard
                  }
                >

                  <View style={styles.notificationIcon}>

                    <Ionicons
                      name={
                        getIcon(
                          notification.type
                        )
                      }
                      size={18}
                      color="#155EEF"
                    />

                  </View>


                  <View style={styles.notificationBody}>

                    <View style={styles.notificationTop}>

                      <Text style={styles.notificationTitle}>
                        {notification.type === 'near'
                          ? 'Your Turn is Near'
                          : notification.type === 'called'
                          ? 'Patient Called'
                          : 'Queue Update'}
                      </Text>

                      {!notification.isRead && (
                        <View style={styles.unreadDot} />
                      )}

                    </View>


                    <Text style={styles.notificationMessage}>
                      {notification.message}
                    </Text>


                    <Text style={styles.notificationTime}>
                      {notification.sentAt
                        ? new Date(
                            notification.sentAt
                          ).toLocaleString()
                        : ''}
                    </Text>

                  </View>

                </View>

              )
            )
          )}

        </ScrollView>


        <CaregiverBottomNav
          navigation={navigation}
          activeRoute="CaregiverAlerts"
        />

      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: '#EEF1F5'
  },

  screen: {
    flex: 1,

    width: '100%',
    maxWidth: 430,

    alignSelf: 'center',

    backgroundColor: '#F8F7FC'
  },

  scroll: {
    flex: 1
  },

  content: {
    padding: 18,
    paddingBottom: 30
  },

  pageTitle: {
    fontSize: 20,
    fontWeight: '800',

    color: '#111827'
  },

  pageSubtitle: {
    marginTop: 4,

    fontSize: 11,
    lineHeight: 17,

    color: '#64748B'
  },

  filterRow: {
    flexDirection: 'row',

    marginTop: 18,
    marginBottom: 15
  },

  activeFilter: {
    paddingHorizontal: 14,
    paddingVertical: 7,

    borderRadius: 18,

    backgroundColor: '#155EEF',

    marginRight: 7
  },

  activeFilterText: {
    color: '#FFFFFF',

    fontSize: 10,
    fontWeight: '700'
  },

  filter: {
    paddingHorizontal: 14,
    paddingVertical: 7,

    borderRadius: 18,

    backgroundColor: '#FFFFFF',

    borderWidth: 1,
    borderColor: '#E2E8F0',

    marginRight: 7
  },

  filterText: {
    color: '#64748B',

    fontSize: 10,
    fontWeight: '600'
  },

  loading: {
    paddingVertical: 80
  },

  emptyCard: {
    marginTop: 15,

    paddingVertical: 34,
    paddingHorizontal: 25,

    alignItems: 'center',

    backgroundColor: '#FFFFFF',

    borderRadius: 17,

    borderWidth: 1,
    borderColor: '#E2E8F0'
  },

  emptyIcon: {
    width: 48,
    height: 48,

    borderRadius: 24,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#EEF4FF'
  },

  emptyTitle: {
    marginTop: 13,

    fontSize: 15,
    fontWeight: '800',

    color: '#111827'
  },

  emptyText: {
    marginTop: 6,

    color: '#64748B',

    fontSize: 11,
    lineHeight: 17,

    textAlign: 'center'
  },

  notificationCard: {
    flexDirection: 'row',

    padding: 14,
    marginBottom: 10,

    borderRadius: 14,

    backgroundColor: '#FFFFFF',

    borderWidth: 1,
    borderColor: '#E6EAF0'
  },

  unreadCard: {
    flexDirection: 'row',

    padding: 14,
    marginBottom: 10,

    borderRadius: 14,

    backgroundColor: '#F5F8FF',

    borderWidth: 1,
    borderColor: '#C9D8FF'
  },

  notificationIcon: {
    width: 36,
    height: 36,

    borderRadius: 10,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#EAF1FF'
  },

  notificationBody: {
    flex: 1,
    marginLeft: 11
  },

  notificationTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },

  notificationTitle: {
    color: '#111827',

    fontSize: 12,
    fontWeight: '800'
  },

  unreadDot: {
    width: 7,
    height: 7,

    borderRadius: 4,

    backgroundColor: '#155EEF'
  },

  notificationMessage: {
    marginTop: 5,

    color: '#475569',

    fontSize: 10,
    lineHeight: 16
  },

  notificationTime: {
    marginTop: 7,

    color: '#94A3B8',

    fontSize: 8
  }
});