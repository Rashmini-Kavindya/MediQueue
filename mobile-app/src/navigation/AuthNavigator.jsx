import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LanguageSelectScreen from '../screens/auth/LanguageSelectScreen';
import RoleSelectScreen from '../screens/auth/RoleSelectScreen';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import OtpScreen from '../screens/auth/OtpScreen';
import SelectOpdScreen from '../screens/auth/SelectOpdScreen';
import TokenConfirmationScreen from '../screens/auth/TokenConfirmationScreen';

import AccessScreen from '../screens/auth/Accessscreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import StaffLoginScreen from '../screens/staff/StaffLoginScreen';

const AuthStack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <AuthStack.Navigator 
      initialRouteName="LanguageSelect" 
      screenOptions={{ headerShown: false }}
    >
      <AuthStack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
      <AuthStack.Screen name="RoleSelectScreen" component={RoleSelectScreen} />
      <AuthStack.Screen name="Access" component={AccessScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="Otp" component={OtpScreen} />
      <AuthStack.Screen name="SelectOpd" component={SelectOpdScreen} />
      <AuthStack.Screen name="TokenConfirmation" component={TokenConfirmationScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="StaffLogin" component={StaffLoginScreen} />
    </AuthStack.Navigator>
  );
}