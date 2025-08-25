import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Pressable,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  StatusBar,
} from 'react-native';
import { Feather } from '@react-native-vector-icons/feather';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@navigation/AppNavigator';

type Nav = NativeStackNavigationProp<AppStackParamList>;

export default function HeaderMoreMenu() {
  const navigation = useNavigation<Nav>();
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen(v => !v), []);
  const close = useCallback(() => setOpen(false), []);

  const go = useCallback(
    (route: keyof AppStackParamList) => {
      close();
      navigation.navigate(route as never);
    },
    [navigation, close],
  );

  const topOffset = StatusBar.currentHeight ?? 0;
  const rightOffset = 20;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="More options"
        hitSlop={12}
        onPress={toggle}
      >
        <Feather name="more-vertical" color="#000000ff" size={22} />
      </Pressable>

      <Modal
        visible={open}
        animationType="fade"
        transparent
        onRequestClose={close}
      >
        <TouchableWithoutFeedback onPress={close}>
          <View style={styles.touchLayer} />
        </TouchableWithoutFeedback>

        <View style={[styles.menu, { top: topOffset, right: rightOffset }]}>
          <Pressable style={styles.item} onPress={() => go('NewChat')}>
            <Text style={styles.itemText}>New chat</Text>
          </Pressable>
          <Pressable style={styles.item} onPress={() => go('Profile')}>
            <Text style={styles.itemText}>Profile</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  touchLayer: { ...StyleSheet.absoluteFillObject },
  menu: {
    position: 'absolute',
    minWidth: 160,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 6,
    elevation: 6,
  },
  item: { paddingVertical: 10, paddingHorizontal: 14 },
  itemText: { fontSize: 16 },
});
