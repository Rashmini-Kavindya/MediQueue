import React from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native';

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

// Same colors as the patient tab bar
const ACTIVE_COLOR = '#2563eb';
const INACTIVE_COLOR = '#64748b';


const tabs = [
  {
    key: 'CaregiverHome',
    label: 'Home',
    icon: 'home-outline',
    activeIcon: 'home'
  },
  {
    key: 'CaregiverQueue',
    label: 'Queue',
    icon: 'format-list-numbered',
    activeIcon: 'format-list-numbered',
    iconSet: 'material'
  },
  {
    key: 'CaregiverAlerts',
    label: 'Alerts',
    icon: 'notifications-outline',
    activeIcon: 'notifications'
  },
  {
    key: 'CaregiverProfile',
    label: 'Profile',
    icon: 'person-circle-outline',
    activeIcon: 'person-circle'
  }
];


export default function CaregiverBottomNav({
  navigation,
  activeRoute
}) {
  return (
    <SafeAreaView
      edges={['bottom']}
      style={styles.safeArea}
    >
      <View style={styles.nav}>

        {tabs.map((tab) => {
          const active =
            activeRoute === tab.key;

          const IconComponent =
            tab.iconSet === 'material'
              ? MaterialCommunityIcons
              : Ionicons;

          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.7}
              style={styles.tab}
              onPress={() =>
                navigation.navigate(tab.key)
              }
            >

              <View style={styles.iconWrapper}>

                <IconComponent
                  name={
                    active
                      ? tab.activeIcon
                      : tab.icon
                  }
                  size={24}
                  color={
                    active
                      ? ACTIVE_COLOR
                      : INACTIVE_COLOR
                  }
                />


                {tab.key ===
                  'CaregiverAlerts' && (
                  <View style={styles.alertDot} />
                )}

              </View>


              <Text
                style={[
                  styles.label,
                  active && styles.activeLabel
                ]}
              >
                {tab.label}
              </Text>

            </TouchableOpacity>
          );
        })}

      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0'
  },

  nav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',

    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: 12,

    backgroundColor: '#FFFFFF'
  },

  tab: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center'
  },

  iconWrapper: {
    position: 'relative'
  },

  alertDot: {
    position: 'absolute',

    top: -4,
    right: -4,

    width: 12,
    height: 12,

    borderRadius: 6,

    backgroundColor: '#DC2626',

    borderWidth: 2,
    borderColor: '#FFFFFF'
  },

  label: {
    marginTop: 4,

    fontSize: 12,
    fontWeight: '500',

    color: '#64748b'
  },

  activeLabel: {
    color: '#2563eb',
    fontWeight: '700'
  }
});