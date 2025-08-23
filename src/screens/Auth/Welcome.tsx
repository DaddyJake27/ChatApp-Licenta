import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@navigation/AppNavigator';

type Nav = NativeStackNavigationProp<AuthStackParamList>;

export default function Welcome() {
  const nav = useNavigation<Nav>();
  return (
    <View style={s.c}>
      <Text style={s.t}>Welcome 👋</Text>
      <Pressable style={s.btn} onPress={() => nav.navigate('SignUp')}>
        <Text style={s.bt}>Create account</Text>
      </Pressable>
      <Pressable onPress={() => nav.navigate('SignIn')}>
        <Text style={s.link}>I already have an account</Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  c: { flex: 1, justifyContent: 'center', padding: 24 },
  t: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  btn: {
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  bt: { color: '#fff', fontWeight: '600' },
  link: { color: '#3b82f6', textAlign: 'center' },
});
