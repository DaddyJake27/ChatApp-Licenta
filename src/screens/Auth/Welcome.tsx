import React from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@navigation/AppNavigator';
import FastImage from '@d11/react-native-fast-image';

type Nav = NativeStackNavigationProp<AuthStackParamList>;

export default function Welcome() {
  const nav = useNavigation<Nav>();
  return (
    <View style={s.c}>
      <StatusBar backgroundColor="#0dad4bff" />
      <FastImage
        source={require('@assets/Welcome_logo.png')}
        style={s.logo}
        resizeMode={FastImage.resizeMode.contain}
      />
      <Pressable style={s.btn} onPress={() => nav.navigate('SignUp')}>
        <Text style={s.bt}>Sign up</Text>
      </Pressable>
      <Pressable onPress={() => nav.navigate('SignIn')}>
        <Text style={s.link}>I already have an account</Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  c: {
    flex: 1,
    backgroundColor: '#4e8362ff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  logo: {
    width: 355,
    height: 80,
  },
  btn: {
    backgroundColor: '#21432F',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  bt: { color: '#fff', fontWeight: '600' },
  link: {
    color: '#82ff95ff',
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '500',
  },
});
