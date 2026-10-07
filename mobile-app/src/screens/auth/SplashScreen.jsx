import React, { useEffect, useRef } from 'react';
import { View, Image, Animated, StatusBar, Platform } from 'react-native';

export default function SplashScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Web එකේදී native driver වැඩ කරන්නේ නැති නිසා False කරනු ලබයි
  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    // 1. Initial Fade In & Spring Scale
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 35,
        useNativeDriver,
      }),
    ]).start(() => {
      // 2. Pulse Animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 900,
            useNativeDriver,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver,
          }),
        ])
      ).start();
    });

    // 3. Auto Navigate to Language Select
    const timer = setTimeout(() => {
      if (navigation && navigation.replace) {
        navigation.replace('LanguageSelect');
      }
    }, 3200);

    return () => clearTimeout(timer);
  }, [navigation, useNativeDriver]);

  return (
    <View className="flex-1 bg-white items-center justify-center">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }, { scale: pulseAnim }],
        }}
        className="items-center justify-center"
      >
        <Image
          source={require('../../../assets/logo.png')}
          style={{ width: 150, height: 150 }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}