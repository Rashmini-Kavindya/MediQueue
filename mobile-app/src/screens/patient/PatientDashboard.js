import React, { useContext } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AuthContext } from '../../context/AuthContext';

export default function PatientDashboard() {
  const { user, logout } = useContext(AuthContext);

  return (
    <View className="flex-1 bg-slate-900 justify-center items-center px-6">
      <View className="w-full max-w-sm bg-slate-800 p-6 rounded-2xl border border-slate-700 items-center">
        <Text className="text-2xl font-bold text-white mb-2">Patient Dashboard</Text>
        <Text className="text-cyan-400 font-medium mb-1">Welcome, {user?.firstName} {user?.lastName}!</Text>
        <Text className="text-slate-400 text-sm mb-6">User ID: {user?.userId}</Text>

        <TouchableOpacity 
          className="bg-red-600 px-6 py-3 rounded-xl w-full items-center"
          onPress={logout}
        >
          <Text className="text-white font-semibold">Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}