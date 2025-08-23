import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import auth from '@react-native-firebase/auth';

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
      await auth().sendPasswordResetEmail(email.trim());
      Alert.alert('Check your inbox for reset link');
    } catch (e: unknown) {
      Alert.alert('Error', getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={s.c}>
      <Text style={s.t}>Reset password</Text>
      <TextInput
        style={s.i}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
      />
      <Pressable style={[s.b, busy && s.d]} onPress={onReset} disabled={busy}>
        <Text style={s.bt}>Send reset link</Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  c: { flex: 1, padding: 24, justifyContent: 'center' },
  t: { fontSize: 24, fontWeight: '600', marginBottom: 16 },
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
