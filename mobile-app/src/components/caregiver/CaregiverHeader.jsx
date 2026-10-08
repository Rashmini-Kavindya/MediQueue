import React from 'react';

import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function CaregiverHeader({
  title,
  navigation,
  showBack = false,
  onBack
}) {
  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('CaregiverHome');
    }
  };


  return (
    <SafeAreaView
      edges={['top']}
      style={styles.safeArea}
    >
      <View style={styles.header}>

        <View style={styles.leftSide}>

          {showBack && (
            <TouchableOpacity
              onPress={handleBack}
              activeOpacity={0.7}
              style={styles.backButton}
            >
              <Ionicons
                name="chevron-back"
                size={19}
                color="#334155"
              />
            </TouchableOpacity>
          )}


          <Image
            source={require('../../../assets/mediqueue-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />


          <View style={styles.brandText}>

            <Text style={styles.brandName}>
              MEDIQUEUE
            </Text>

            <Text style={styles.pageTitle}>
              {title}
            </Text>

          </View>

        </View>


        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.profileButton}
          onPress={() =>
            navigation.navigate('CaregiverProfile')
          }
        >
          <Ionicons
            name="person-outline"
            size={16}
            color="#FFFFFF"
          />
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF'
  },

  header: {
    height: 58,

    paddingHorizontal: 14,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    backgroundColor: '#FFFFFF',

    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F4'
  },

  leftSide: {
    flexDirection: 'row',
    alignItems: 'center',

    flex: 1
  },

  backButton: {
    width: 25,
    height: 34,

    justifyContent: 'center'
  },

  logo: {
    width: 27,
    height: 27,

    maxWidth: 27,
    maxHeight: 27,

    marginRight: 7
  },

  brandText: {
    justifyContent: 'center'
  },

  brandName: {
    fontSize: 7,
    lineHeight: 9,

    fontWeight: '800',

    letterSpacing: 0.8,

    color: '#155EEF'
  },

  pageTitle: {
    marginTop: 1,

    fontSize: 13,
    lineHeight: 16,

    fontWeight: '800',

    color: '#111827'
  },

  profileButton: {
    width: 31,
    height: 31,

    borderRadius: 16,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#0757D8'
  }
});