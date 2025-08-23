import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { signUp } from '@services/auth';

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
      <Text style={s.t}>Create account</Text>
      <TextInput
        style={s.i}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
      />
      <TextInput
        style={s.i}
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
      />
      <Pressable style={[s.b, busy && s.d]} onPress={onSubmit} disabled={busy}>
        <Text style={s.bt}>Sign up</Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  c: { flex: 1, padding: 24, justifyContent: 'center' },
  t: { fontSize: 28, fontWeight: '600', marginBottom: 24, textAlign: 'center' },
  i: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  b: {
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  bt: { color: '#fff', fontWeight: '600' },
  d: { opacity: 0.6 },
});
