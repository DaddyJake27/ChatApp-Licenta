import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  PermissionsAndroid,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import FastImage from '@d11/react-native-fast-image';
import { getAuth } from '@react-native-firebase/auth';
import { Message } from '@services/db';

type Props = {
  msg: Message;
  onDelete: (m: Message) => void;
};

async function ensureAndroidMediaPermission() {
  const perm =
    PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES ?? // Android 13+
    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE; // Android 9 and below
  const granted = await PermissionsAndroid.request(perm);
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

function MessageBubble({ msg, onDelete }: Props) {
  const mine = msg.senderId === getAuth().currentUser?.uid;

  const copyText = useCallback(() => {
    if (msg.type === 'text' && msg.text) {
      Clipboard.setString(msg.text);
      Alert.alert('Copied', 'Message text copied to clipboard');
    }
  }, [msg]);

  const saveImage = useCallback(async () => {
    if (msg.type !== 'image' || !msg.imageUrl) return;
    try {
      const ok = await ensureAndroidMediaPermission();
      if (!ok) return;
      await CameraRoll.save(msg.imageUrl, { type: 'photo' });
      Alert.alert('Saved', 'Image saved to gallery');
    } catch (e) {
      Alert.alert('Save failed', (e as Error)?.message ?? 'Unknown error');
    }
  }, [msg]);

  const openMenu = useCallback(() => {
    if (msg.type === 'image') {
      Alert.alert('Options', undefined, [
        { text: 'Save image', onPress: saveImage },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Confirm delete',
              'Are you sure you want to delete this message?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => onDelete(msg),
                },
              ],
            ),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      Alert.alert('Options', undefined, [
        { text: 'Copy text', onPress: copyText },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Confirm delete',
              'Are you sure you want to delete this message?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => onDelete(msg),
                },
              ],
            ),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [copyText, saveImage, onDelete, msg]);

  const containerStyle =
    msg.type === 'image'
      ? [s.imgBubble, mine ? s.mine : s.theirs]
      : [s.b, mine ? s.mine : s.theirs];

  return (
    <Pressable onLongPress={openMenu} delayLongPress={300}>
      <View style={containerStyle}>
        {msg.type === 'image' ? (
          <FastImage
            source={{
              uri: msg.imageUrl,
              cache: FastImage.cacheControl.immutable,
              priority: FastImage.priority.high,
            }}
            resizeMode={FastImage.resizeMode.cover}
            style={s.img}
          />
        ) : (
          <Text style={s.txt}>{msg.text}</Text>
        )}
      </View>
    </Pressable>
  );
}

export default memo(MessageBubble);

const s = StyleSheet.create({
  b: { padding: 10, borderRadius: 16, maxWidth: '80%', marginVertical: 4 },
  mine: { alignSelf: 'flex-end', backgroundColor: '#138f38ff' },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#3b3939ff' },
  txt: { fontSize: 16, color: '#fff' },
  img: { width: 200, height: 200, borderRadius: 12 },
  imgBubble: { borderRadius: 16, marginVertical: 4, padding: 2 },
});
