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

// iOS system colors (same palette as the patient screens)
const IOS = {
  blue: '#007AFF',
  label: '#1C1C1E',
  fill: '#EFEFF4',
  secondaryLabel: '#636366',
  white: '#FFFFFF'
};


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
                size={22}
                color={IOS.blue}
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

            <Text
              style={styles.pageTitle}
              numberOfLines={1}
            >
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
            size={18}
            color="#FFFFFF"
          />
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: IOS.white
  },

  header: {
    height: 62,

    paddingHorizontal: 16,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    backgroundColor: IOS.white,

    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(60,60,67,0.18)'
  },

  leftSide: {
    flexDirection: 'row',
    alignItems: 'center',

    flex: 1
  },

  backButton: {
    width: 36,
    height: 36,
    marginRight: 8,

    borderRadius: 18,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: IOS.fill
  },

  logo: {
    width: 34,
    height: 34,

    maxWidth: 34,
    maxHeight: 34,

    marginRight: 10
  },

  brandText: {
    flex: 1,
    justifyContent: 'center'
  },

  brandName: {
    fontSize: 10,
    lineHeight: 12,

    fontWeight: '700',

    letterSpacing: 0.8,

    color: IOS.blue
  },

  pageTitle: {
    marginTop: 1,

    fontSize: 17,
    lineHeight: 21,

    fontWeight: '700',
    letterSpacing: -0.2,

    color: IOS.label
  },

  profileButton: {
    width: 38,
    height: 38,

    borderRadius: 19,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: IOS.blue,

    shadowColor: IOS.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3
  }
});