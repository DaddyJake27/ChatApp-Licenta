import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Button, StyleSheet } from 'react-native';
import auth from '@react-native-firebase/auth';

type Status = 'idle' | 'loading' | 'success' | 'error';

const FirebaseTest: React.FC = () => {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string>('');

  const connect = useCallback(async () => {
    setStatus('loading');
    setMessage('Signing in anonymously…');
    try {
      await auth().signInAnonymously();
      setStatus('success');
      setMessage('Firebase connected ✅ (anonymous user signed in)');
    } catch (err: any) {
      setStatus('error');
      setMessage(`Firebase error ❌ ${err?.code ?? ''} ${err?.message ?? ''}`.trim());
    }
  }, []);

  useEffect(() => {
    // Try once on mount
    connect();

    // Reflect auth state changes as an extra signal
    const unsub = auth().onAuthStateChanged(user => {
      if (user) {
        setStatus('success');
        setMessage('Firebase connected ✅ (auth state active)');
      }
    });
    return unsub;
  }, [connect]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firebase Auth Status</Text>

      {status === 'loading' && <ActivityIndicator size="large" />}
      <Text style={[styles.message,
        status === 'success' ? styles.ok :
        status === 'error' ? styles.err :
        undefined
      ]}>
        {message || 'Waiting…'}
      </Text>

      <View style={styles.row}>
        <Button title="Retry" onPress={connect} />
        <View style={{ width: 12 }} />
        <Button title="Sign out" onPress={async () => {
          try {
            await auth().signOut();
            setStatus('idle');
            setMessage('Signed out. You can Retry to connect again.');
          } catch (e: any) {
            setStatus('error');
            setMessage(`Sign-out error ❌ ${e?.code ?? ''} ${e?.message ?? ''}`.trim());
          }
        }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  message: { marginTop: 8, textAlign: 'center' },
  ok: { color: 'green' },
  err: { color: 'crimson' },
  row: { flexDirection: 'row', marginTop: 12 },
});

export default FirebaseTest;