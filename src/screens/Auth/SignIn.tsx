import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { signIn, signUp } from '@services/auth';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    if (!email || !password)
      return Alert.alert('Please fill email and password');
    setBusy(true);
    try {
      await signIn(email, password);
      // onAuthStateChanged in AppNavigator will auto-switch to Chats
    } catch (e: unknown) {
      Alert.alert('Sign-in failed', getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp() {
    if (!email || !password)
      return Alert.alert('Please fill email and password');
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
    <View style={styles.container}>
      <Text style={styles.title}>Welcome</Text>

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />

      <Pressable
        style={[styles.button, busy && styles.disabled]}
        onPress={handleSignIn}
        disabled={busy}
      >
        <Text style={styles.buttonText}>
          {busy ? 'Please wait…' : 'Sign in'}
        </Text>
      </Pressable>

      <Pressable style={[styles.link]} onPress={handleSignUp} disabled={busy}>
        <Text style={styles.linkText}>Create account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontWeight: '600' },
  link: { padding: 12, alignItems: 'center' },
  linkText: { color: '#3b82f6', fontWeight: '500' },
});
