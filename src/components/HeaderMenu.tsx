import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@react-native-vector-icons/feather';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@navigation/AppNavigator';

type Nav = NativeStackNavigationProp<AppStackParamList>;

export default function HeaderMenu() {
  const navigation = useNavigation<Nav>();

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => navigation.navigate('NewChat' as never)}
        hitSlop={10}
        style={styles.iconButton}
      >
        <Feather name="plus-square" size={27} color="#000" />
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate('Profile' as never)}
        hitSlop={10}
        style={styles.iconButton}
      >
        <Feather name="user" size={27} color="#000" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 16, // spacing between icons
  },
});
