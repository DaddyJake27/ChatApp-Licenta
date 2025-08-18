import React from 'react';
import { StyleSheet } from 'react-native';
import FirebaseEmailAuth from './testing (delete when finished)/FirebaseEmailAuth.tsx';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <FirebaseEmailAuth />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
