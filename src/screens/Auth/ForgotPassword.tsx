import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  StatusBar,
} from 'react-native';
import { getAuth, sendPasswordResetEmail } from '@react-native-firebase/auth';
import FastImage from '@d11/react-native-fast-image';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  async function onReset() {
    if (!email) return Alert.alert('Type your email');
    setBusy(true);
    try {
      await sendPasswordResetEmail(getAuth(), email.trim());
      Alert.alert('Check your inbox for reset link');
    } catch (e: unknown) {
      Alert.alert('Error', getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={s.c}>
      <StatusBar backgroundColor="#0dad4bff" />
      <FastImage
        source={require('@assets/Reset_password_logo.png')}
        style={s.logo}
        resizeMode={FastImage.resizeMode.contain}
      />
      <TextInput
        style={s.i}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor="#ccffd9ff"
        selectionColor="#ccffd9ff"
        autoCapitalize="none"
      />
      <Pressable style={[s.b, busy && s.d]} onPress={onReset} disabled={busy}>
        <Text style={s.bt}>Send reset link</Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  c: {
    flex: 1,
    backgroundColor: '#4e8362ff',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 24,
    paddingTop: 210,
  },
  logo: {
    width: 360,
    height: 90,
  },
  i: {
    borderWidth: 1.5,
    borderColor: '#0c3b13ff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignSelf: 'stretch',
    color: '#c0f1ccff',
  },
  b: {
    backgroundColor: '#21432F',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  bt: { color: '#fff', fontWeight: '600' },
  d: { opacity: 0.6 },
});
