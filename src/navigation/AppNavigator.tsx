import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import useAuth from '@hooks/useAuth';

// Auth
import Welcome from '@screens/Auth/Welcome';
import SignIn from '@screens/Auth/SignIn';
import SignUp from '@screens/Auth/SignUp';
import ForgotPassword from '@screens/Auth/ForgotPassword';

// App
import Chats from '@screens/Home/Chats';
import Chat from '@screens/Chat/Chat';
import NewChat from '@screens/Chat/NewChat';
import Profile from '@screens/Profile/Profile';
import {
  HeaderNewChatButton,
  HeaderProfileButton,
} from '@components/HeaderButtons';

export type AuthStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  SignIn: undefined;
  ForgotPassword: undefined;
};

export type AppStackParamList = {
  Home: undefined; // chats list
  Chat: { chatId: string; title?: string };
  NewChat: undefined;
  Profile: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <AuthStack.Screen
        name="Welcome"
        component={Welcome}
        options={{ title: 'Welcome' }}
      />
      <AuthStack.Screen
        name="SignUp"
        component={SignUp}
        options={{ title: 'Create account' }}
      />
      <AuthStack.Screen
        name="SignIn"
        component={SignIn}
        options={{ title: 'Sign in' }}
      />
      <AuthStack.Screen
        name="ForgotPassword"
        component={ForgotPassword}
        options={{ title: 'Reset password' }}
      />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <AppStack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <AppStack.Screen
        name="Home"
        component={Chats}
        options={{
          title: 'Chats',
          headerLeft: HeaderNewChatButton,
          headerRight: HeaderProfileButton,
        }}
      />
      <AppStack.Screen name="Chat" component={Chat} />
      <AppStack.Screen
        name="NewChat"
        component={NewChat}
        options={{ title: 'New chat' }}
      />
      <AppStack.Screen
        name="Profile"
        component={Profile}
        options={{ title: 'Profile' }}
      />
    </AppStack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, initializing } = useAuth();
  if (initializing) return null; // Splash screen/loader TO-DO
  return (
    <NavigationContainer>
      {user ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
