import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as authSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  reload,
} from '@react-native-firebase/auth';

type Status = 'idle' | 'loading' | 'success' | 'error';

const niceError = (code?: string) => {
  switch (code) {
    case 'auth/invalid-email':
      return 'Email invalid.';
    case 'auth/email-already-in-use':
      return 'Email deja folosit.';
    case 'auth/weak-password':
      return 'Parolă prea slabă (min. 6 caractere).';
    case 'auth/user-not-found':
      return 'Utilizator inexistent.';
    case 'auth/wrong-password':
      return 'Parolă greșită.';
    default:
      return 'A apărut o eroare. Verifică email/parola și config-ul.';
  }
};

const FirebaseEmailAuth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [msg, setMsg] = useState('');
  const [verified, setVerified] = useState<boolean | null>(null);

  const auth = getAuth();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (u) {
        await reload(u);
        setVerified(u.emailVerified ?? false);
        setStatus('success');
        setMsg(
          `Autentificat ca ${u.email ?? '(fără email)'}${
            u.emailVerified ? ' (verificat ✅)' : ' (neconfirmat ✉️)'
          }`,
        );
      } else {
        setVerified(null);
        setStatus('idle');
        setMsg('Neautentificat.');
      }
    });
    return unsub;
  }, [auth]);

  const run = useCallback(async (fn: () => Promise<any>) => {
    try {
      setStatus('loading');
      setMsg('Se procesează…');
      await fn();
      setStatus('success');
    } catch (e: any) {
      setStatus('error');
      setMsg(`${niceError(e?.code)} ${e?.code ? `(${e.code})` : ''}`);
    }
  }, []);

  const signUp = () =>
    run(async () => {
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        pass,
      );
      await sendEmailVerification(cred.user);
      setMsg(
        'Cont creat. Ți-am trimis email de verificare. Verifică-ți inboxul.',
      );
    });

  const signIn = () =>
    run(async () => {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
      const u = auth.currentUser;
      if (u) await reload(u);
      setMsg(
        u?.emailVerified
          ? 'Autentificat (email verificat ✅)'
          : 'Autentificat (email neconfirmat ✉️)',
      );
    });

  const signOut = () =>
    run(async () => {
      await authSignOut(auth);
      setMsg('Ai ieșit din cont.');
    });

  const resendVerification = () =>
    run(async () => {
      const u = auth.currentUser;
      if (!u) throw { code: 'app/no-user' };
      await sendEmailVerification(u);
      setMsg('Email de verificare retrimis.');
    });

  const resetPassword = () =>
    run(async () => {
      await sendPasswordResetEmail(auth, email.trim());
      setMsg(
        'Email de resetare parolă trimis (dacă există cont pentru acest email).',
      );
    });

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Firebase Email/Password</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="email@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        value={pass}
        onChangeText={setPass}
        placeholder="Parolă (min 6 caractere)"
        secureTextEntry
        style={styles.input}
      />

      <View style={styles.row}>
        <Button title="Sign Up" onPress={signUp} />
        <View style={styles.gap} />
        <Button title="Sign In" onPress={signIn} />
      </View>

      <View style={styles.row}>
        <Button title="Sign Out" onPress={signOut} />
        <View style={styles.gap} />
        <Button title="Reset Password" onPress={resetPassword} />
      </View>

      {verified === false && (
        <View style={styles.row}>
          <Button title="Resend Verification" onPress={resendVerification} />
        </View>
      )}

      <Text
        style={[
          styles.msg,
          status === 'success'
            ? styles.ok
            : status === 'error'
            ? styles.err
            : undefined,
        ]}
      >
        {msg}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { padding: 16, width: '100%', maxWidth: 480, alignSelf: 'center' },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: 6 },
  gap: { width: 12 },
  msg: { marginTop: 12, textAlign: 'center' },
  ok: { color: 'green' },
  err: { color: 'crimson' },
});

export default FirebaseEmailAuth;
