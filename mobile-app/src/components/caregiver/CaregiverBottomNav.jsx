import React from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';


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
    icon: 'people-outline',
    activeIcon: 'people'
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

                <Ionicons
                  name={
                    active
                      ? tab.activeIcon
                      : tab.icon
                  }
                  size={19}
                  color={
                    active
                      ? '#155EEF'
                      : '#475569'
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


              {active && (
                <View style={styles.activeLine} />
              )}

            </TouchableOpacity>
          );
        })}

      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF'
  },

  nav: {
    height: 62,

    flexDirection: 'row',

    backgroundColor: '#FFFFFF',

    borderTopWidth: 1,
    borderTopColor: '#EBEEF3'
  },

  tab: {
    flex: 1,

    position: 'relative',

    alignItems: 'center',
    justifyContent: 'center'
  },

  iconWrapper: {
    position: 'relative'
  },

  alertDot: {
    position: 'absolute',

    top: -2,
    right: -4,

    width: 6,
    height: 6,

    borderRadius: 3,

    backgroundColor: '#EF4444'
  },

  label: {
    marginTop: 3,

    fontSize: 9,

    color: '#475569'
  },

  activeLabel: {
    color: '#155EEF',
    fontWeight: '700'
  },

  activeLine: {
    position: 'absolute',

    top: 0,

    width: 30,
    height: 2,

    borderRadius: 2,

    backgroundColor: '#155EEF'
  }
});