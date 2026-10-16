import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import NotificationBell from '../staff/NotificationBell';

// iOS system colors (same palette as the patient screens)
const IOS = {
  blue: '#007AFF',
  label: '#1C1C1E',
  fill: '#EFEFF4',
  white: '#FFFFFF',
};

export default function Header({ title, showBack = false, rightElement }) {
  const navigation = useNavigation();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: IOS.white,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(60,60,67,0.18)',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
        {showBack ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            hitSlop={8}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: IOS.fill,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <Ionicons name="chevron-back" size={22} color={IOS.blue} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.openDrawer()}
            activeOpacity={0.7}
            hitSlop={8}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: IOS.fill,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <Ionicons name="menu-outline" size={22} color={IOS.blue} />
          </TouchableOpacity>
        )}
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: 20,
            fontWeight: '700',
            letterSpacing: -0.2,
            color: IOS.label,
          }}
        >
          {title}
        </Text>
      </View>

      {/* Dynamic Right Side Element (e.g. Staff Tag, Refresh). Default = notification bell popup */}
      {rightElement ? rightElement : <NotificationBell />}
    </View>
  );
}