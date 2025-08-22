import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getApp } from '@react-native-firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  FirebaseAuthTypes,
} from '@react-native-firebase/auth';

// Screens
import SignIn from '@screens/Auth/SignIn';
import Chats from '@screens/Home/Chats';
import Chat from '@screens/Chat/Chat';

export type RootStackParamList = {
  SignIn: undefined;
  Chats: undefined;
  Chat: { chatId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);

  useEffect(() => {
    const app = getApp();
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      if (initializing) setInitializing(false);
    });
    return unsub;
  }, [initializing]);

  if (initializing) return null; // or a splash component

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      {user ? (
        <>
          <Stack.Screen
            name="Chats"
            component={Chats}
            options={{ title: 'Chats' }}
          />
          <Stack.Screen
            name="Chat"
            component={Chat}
            options={{ title: 'Chat' }}
          />
        </>
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
