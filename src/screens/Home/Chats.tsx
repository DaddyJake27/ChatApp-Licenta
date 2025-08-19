import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { signOut } from '@services/auth';

export default function Chats() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home / Chats</Text>
      <Text style={styles.status}>You are signed in ✅</Text>
      <Pressable style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  status: {
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: { color: 'white', fontWeight: '600' },
});
