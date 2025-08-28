import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import useAuth from '@hooks/useAuth';
import SplashScreen from '@components/SplashScreen';

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
import UserProfile from '@screens/Profile/UserProfile';
import HeaderMoreMenu from '@components/HeaderMenu';

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
  UserProfile: { uid: string };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        statusBarHidden: false,
        statusBarStyle: 'dark',
      }}
    >
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

const HomeHeaderOptions: NativeStackNavigationOptions = {
  title: 'Chats',
  headerRight: () => <HeaderMoreMenu />,
};

function MainNavigator() {
  return (
    <AppStack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        statusBarHidden: false,
        statusBarStyle: 'dark',
      }}
    >
      <AppStack.Screen
        name="Home"
        component={Chats}
        options={HomeHeaderOptions}
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
      <AppStack.Screen
        name="UserProfile"
        component={UserProfile}
        options={{ title: 'Profile' }}
      />
    </AppStack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, initializing } = useAuth();
  if (initializing) return <SplashScreen />; // show logo + spinner
  return (
    <NavigationContainer>
      {user ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
