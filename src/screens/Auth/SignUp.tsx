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
import { signUp } from '@services/auth';
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

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  async function onSubmit() {
    if (!email || !password) return Alert.alert('Fill both fields');
    setBusy(true);
    try {
      await signUp(email, password);
    } catch (e: unknown) {
      Alert.alert('Sign-up failed', getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={s.c}>
      <StatusBar backgroundColor="#0dad4bff" />
      <FastImage
        source={require('@assets/SignUp_logo.png')}
        style={s.logo}
        resizeMode={FastImage.resizeMode.contain}
      />
      <TextInput
        style={s.i}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor="#c0f1ccff"
        autoCapitalize="none"
        selectionColor="#c0f1ccff"
      />
      <TextInput
        style={s.i}
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="#c0f1ccff"
        secureTextEntry
        selectionColor="#c0f1ccff"
      />
      <Pressable style={[s.b, busy && s.d]} onPress={onSubmit} disabled={busy}>
        <Text style={s.bt}>Sign up</Text>
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
    width: 330,
    height: 80,
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
