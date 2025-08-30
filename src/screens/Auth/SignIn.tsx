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
import { signIn } from '@services/auth';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@navigation/AppNavigator';
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

export default function SignIn() {
  const nav = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    if (!email || !password)
      return Alert.alert('Please fill email and password');
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (e: unknown) {
      Alert.alert('Sign-in failed', getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#0dad4bff" />
      <FastImage
        source={require('@assets/SignIn_logo.png')}
        style={styles.logo}
        resizeMode={FastImage.resizeMode.contain}
      />
      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholderTextColor="#ccffd9ff"
        selectionColor="#ccffd9ff"
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholderTextColor="#ccffd9ff"
        selectionColor="#ccffd9ff"
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

      <Pressable
        style={styles.link}
        onPress={() => nav.navigate('ForgotPassword')}
      >
        <Text style={styles.linkText}>Forgot password?</Text>
      </Pressable>

      <Pressable style={styles.link} onPress={() => nav.navigate('SignUp')}>
        <Text style={styles.linkText}>Create an account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  input: {
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
  button: {
    backgroundColor: '#21432F',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' },
  link: { alignItems: 'center', paddingTop: 16 },
  linkText: {
    color: '#82ff95ff',
    textAlign: 'center',
    fontWeight: '500',
  },
});
