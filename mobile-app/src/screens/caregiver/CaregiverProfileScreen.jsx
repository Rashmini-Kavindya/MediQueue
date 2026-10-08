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
  StyleSheet
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { AuthContext } from '../../context/AuthContext';

import CaregiverHeader from '../../components/caregiver/CaregiverHeader';
import CaregiverBottomNav from '../../components/caregiver/CaregiverBottomNav';

import {
  getProfile
} from '../../services/caregiverApi';


export default function CaregiverProfileScreen({
  navigation
}) {
  const {
    user,
    logout
  } = useContext(AuthContext);

  const [profile, setProfile] =
    useState(null);

  const [loading, setLoading] =
    useState(true);


  useFocusEffect(
    useCallback(() => {

      const loadProfile = async () => {

        try {

          const response =
            await getProfile();

          setProfile(
            response?.data ||
            user
          );

        } catch (error) {

          setProfile(user);

        } finally {

          setLoading(false);

        }
      };


      loadProfile();

    }, [user])
  );


  const settings = [
    {
      icon: 'language-outline',
      title: 'Language',
      subtitle: profile?.language || 'English'
    },
    {
      icon: 'notifications-outline',
      title: 'Notification Preferences',
      subtitle: 'Queue alerts and updates'
    },
    {
      icon: 'text-outline',
      title: 'Accessibility & Text Size',
      subtitle: 'Display preferences'
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'Privacy & Security',
      subtitle: 'Account and privacy settings'
    }
  ];


  return (
    <View style={styles.outer}>

      <View style={styles.screen}>

        <CaregiverHeader
          title="Profile"
          navigation={navigation}
        />


        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >

          {loading ? (

            <View style={styles.loading}>

              <ActivityIndicator
                size="large"
                color="#155EEF"
              />

            </View>

          ) : (

            <>
              <View style={styles.profileCard}>

                <View style={styles.avatar}>

                  <Text style={styles.avatarText}>
                    {profile?.firstName?.[0] || 'C'}
                    {profile?.lastName?.[0] || ''}
                  </Text>

                </View>


                <Text style={styles.name}>
                  {profile?.firstName || user?.firstName}{' '}
                  {profile?.lastName || user?.lastName}
                </Text>


                <Text style={styles.role}>
                  Caregiver
                </Text>


                <View style={styles.activeBadge}>

                  <View style={styles.activeDot} />

                  <Text style={styles.activeText}>
                    Active
                  </Text>

                </View>


                <View style={styles.profileInfo}>

                  <View style={styles.profileInfoItem}>

                    <Text style={styles.infoLabel}>
                      CAREGIVER ID
                    </Text>

                    <Text style={styles.infoValue}>
                      {profile?.caregiverId ||
                        profile?.userId ||
                        user?.userId}
                    </Text>

                  </View>


                  <View style={styles.profileDivider} />


                  <View style={styles.profileInfoItem}>

                    <Text style={styles.infoLabel}>
                      EMAIL
                    </Text>

                    <Text
                      numberOfLines={1}
                      style={styles.infoValue}
                    >
                      {profile?.email ||
                        user?.email ||
                        '-'}
                    </Text>

                  </View>

                </View>

              </View>


              <Text style={styles.sectionLabel}>
                APP SETTINGS
              </Text>


              <View style={styles.settingsCard}>

                {settings.map(
                  (item, index) => (

                    <TouchableOpacity
                      key={item.title}
                      style={[
                        styles.settingRow,

                        index !==
                          settings.length - 1 &&
                          styles.settingBorder
                      ]}
                    >

                      <View style={styles.settingIcon}>

                        <Ionicons
                          name={item.icon}
                          size={18}
                          color="#155EEF"
                        />

                      </View>


                      <View style={styles.settingContent}>

                        <Text style={styles.settingTitle}>
                          {item.title}
                        </Text>

                        <Text style={styles.settingSubtitle}>
                          {item.subtitle}
                        </Text>

                      </View>


                      <Ionicons
                        name="chevron-forward"
                        size={17}
                        color="#94A3B8"
                      />

                    </TouchableOpacity>

                  )
                )}

              </View>


              <TouchableOpacity
                onPress={logout}
                style={styles.logoutButton}
              >

                <Ionicons
                  name="log-out-outline"
                  size={18}
                  color="#DC2626"
                />

                <Text style={styles.logoutText}>
                  Log Out
                </Text>

              </TouchableOpacity>

            </>
          )}

        </ScrollView>


        <CaregiverBottomNav
          navigation={navigation}
          activeRoute="CaregiverProfile"
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

  loading: {
    paddingVertical: 80
  },

  profileCard: {
    padding: 18,

    backgroundColor: '#FFFFFF',

    borderRadius: 18,

    borderWidth: 1,
    borderColor: '#E3E8EF',

    alignItems: 'center'
  },

  avatar: {
    width: 68,
    height: 68,

    borderRadius: 34,

    backgroundColor: '#EAF1FF',

    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 3,
    borderColor: '#FFFFFF'
  },

  avatarText: {
    color: '#155EEF',

    fontSize: 21,
    fontWeight: '800'
  },

  name: {
    marginTop: 10,

    color: '#111827',

    fontSize: 18,
    fontWeight: '800'
  },

  role: {
    marginTop: 3,

    color: '#64748B',

    fontSize: 10
  },

  activeBadge: {
    marginTop: 9,

    paddingHorizontal: 9,
    paddingVertical: 4,

    borderRadius: 20,

    backgroundColor: '#ECFDF3',

    flexDirection: 'row',
    alignItems: 'center'
  },

  activeDot: {
    width: 5,
    height: 5,

    borderRadius: 3,

    backgroundColor: '#16A34A',

    marginRight: 5
  },

  activeText: {
    color: '#15803D',

    fontSize: 9,
    fontWeight: '700'
  },

  profileInfo: {
    width: '100%',

    marginTop: 18,

    paddingTop: 15,

    borderTopWidth: 1,
    borderTopColor: '#EEF0F3',

    flexDirection: 'row'
  },

  profileInfoItem: {
    flex: 1,
    alignItems: 'center'
  },

  profileDivider: {
    width: 1,
    backgroundColor: '#E2E8F0'
  },

  infoLabel: {
    color: '#94A3B8',

    fontSize: 8,
    fontWeight: '700'
  },

  infoValue: {
    marginTop: 5,

    maxWidth: 145,

    color: '#334155',

    fontSize: 10,
    fontWeight: '700'
  },

  sectionLabel: {
    marginTop: 22,
    marginBottom: 8,

    color: '#64748B',

    fontSize: 9,
    fontWeight: '800',

    letterSpacing: 0.8
  },

  settingsCard: {
    borderRadius: 16,

    backgroundColor: '#FFFFFF',

    borderWidth: 1,
    borderColor: '#E3E8EF',

    overflow: 'hidden'
  },

  settingRow: {
    minHeight: 62,

    paddingHorizontal: 14,

    flexDirection: 'row',
    alignItems: 'center'
  },

  settingBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F3'
  },

  settingIcon: {
    width: 34,
    height: 34,

    borderRadius: 10,

    backgroundColor: '#EEF4FF',

    alignItems: 'center',
    justifyContent: 'center'
  },

  settingContent: {
    flex: 1,
    marginLeft: 10
  },

  settingTitle: {
    color: '#111827',

    fontSize: 11,
    fontWeight: '700'
  },

  settingSubtitle: {
    marginTop: 3,

    color: '#94A3B8',

    fontSize: 9
  },

  logoutButton: {
    height: 44,

    marginTop: 20,

    borderRadius: 11,

    borderWidth: 1,
    borderColor: '#FECACA',

    backgroundColor: '#FEF2F2',

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },

  logoutText: {
    marginLeft: 6,

    color: '#DC2626',

    fontSize: 11,
    fontWeight: '700'
  }
});