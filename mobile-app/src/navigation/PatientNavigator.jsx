import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthContext } from '../context/AuthContext';

import PatientDashboard from '../screens/patient/PatientDashboard';
import ChatbotScreen from '../screens/patient/ChatbotScreen';

const PatientStack = createNativeStackNavigator();

// ChatbotScreen needs the auth token (for chat history) and a back handler
function ChatbotRoute({ navigation }) {
  const { token } = useContext(AuthContext);

  return (
    <ChatbotScreen
      token={token}
      onBack={() => navigation.goBack()}
      // TODO: connect to token booking screen when it's ready
      // onSelectOpd={(opd) => navigation.navigate('TokenBooking', { opd })}
    />
  );
}

export default function PatientNavigator() {
  return (
    <PatientStack.Navigator screenOptions={{ headerShown: false }}>
      <PatientStack.Screen name="PatientDashboard" component={PatientDashboard} />
      <PatientStack.Screen name="Chatbot" component={ChatbotRoute} />
    </PatientStack.Navigator>
  );
}