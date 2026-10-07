import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Shared input field for the auth screens (Register / Login / ForgotPassword).
 * Props: label, icon (Ionicons name), optionalLabel, hint, isPassword (adds show/hide eye)
 * + any TextInput prop (value, onChangeText, placeholder, keyboardType, ...)
 */
export default function AuthField({ label, icon, optionalLabel, hint, isPassword, ...inputProps }) {
  const [show, setShow] = useState(false);

  return (
    <View>
      <View className="flex-row justify-between items-center mb-1.5">
        <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          {label}
        </Text>
        {optionalLabel ? (
          <Text className="text-[10px] font-bold text-slate-400 uppercase">{optionalLabel}</Text>
        ) : null}
      </View>

      <View className="flex-row items-center bg-white border border-slate-200 rounded-xl px-3.5 py-3">
        <Ionicons name={icon} size={18} color="#94A3B8" />
        <TextInput
          className="flex-1 text-sm text-slate-800 ml-2.5"
          placeholderTextColor="#94A3B8"
          secureTextEntry={!!isPassword && !show}
          autoCapitalize={isPassword ? 'none' : inputProps.autoCapitalize}
          {...inputProps}
        />
        {isPassword ? (
          <TouchableOpacity onPress={() => setShow((s) => !s)} hitSlop={8}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {hint ? <Text className="text-[11px] text-slate-400 mt-1 ml-1">{hint}</Text> : null}
    </View>
  );
}