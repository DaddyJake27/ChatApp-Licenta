import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { signOut } from '@services/auth';
import { getAuth } from '@react-native-firebase/auth';

export default function Profile() {
  const email = getAuth().currentUser?.email ?? '(no email)';
  return (
    <View style={s.c}>
      <Text style={s.t}>{email}</Text>
      <Pressable style={s.btn} onPress={signOut}>
        <Text style={s.bt}>Sign out</Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  c: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  t: { fontSize: 18, marginBottom: 16 },
  btn: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  bt: { color: '#fff', fontWeight: '600' },
});
