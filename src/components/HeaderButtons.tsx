import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@navigation/AppNavigator';

type Nav = NativeStackNavigationProp<AppStackParamList>;

type RoutesNoParams = {
  [K in keyof AppStackParamList]: undefined extends AppStackParamList[K]
    ? K
    : never;
}[keyof AppStackParamList];

function HeaderTextButton({
  label,
  to,
}: {
  label: string;
  to: RoutesNoParams;
}) {
  const navigation = useNavigation<Nav>();
  return (
    <Pressable
      onPress={() => navigation.navigate(to)}
      style={styles.navigateTo}
    >
      <Text>{label}</Text>
    </Pressable>
  );
}

export function HeaderNewChatButton() {
  return <HeaderTextButton label="New" to="NewChat" />;
}

export function HeaderProfileButton() {
  return <HeaderTextButton label="Profile" to="Profile" />;
}

const styles = StyleSheet.create({
  navigateTo: { paddingHorizontal: 12 },
});
