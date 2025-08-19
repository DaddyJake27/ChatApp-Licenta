import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

// Screens
import SignIn from '@screens/Auth/SignIn';
import Chats from '@screens/Home/Chats';

export type RootStackParamList = {
  SignIn: undefined;
  Chats: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);

  useEffect(() => {
    const sub = auth().onAuthStateChanged(u => {
      setUser(u);
      if (initializing) setInitializing(false);
    });
    return sub;
  }, [initializing]);

  if (initializing) return null; // or a splash component

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      {user ? (
        <Stack.Screen
          name="Chats"
          component={Chats}
          options={{ title: 'Chats' }}
        />
      ) : (
        <Stack.Screen
          name="SignIn"
          component={SignIn}
          options={{ title: 'Sign in' }}
        />
      )}
    </Stack.Navigator>
  );
}
