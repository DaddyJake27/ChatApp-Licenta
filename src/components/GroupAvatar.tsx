import React, { useMemo, useCallback } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import {
  launchImageLibrary,
  launchCamera,
  ImageLibraryOptions,
  CameraOptions,
  MediaType,
} from 'react-native-image-picker';
import { colorForUid } from '@utils/helpers';

type Props = {
  size?: number;
  title?: string | null;
  uri: string | null;
  onChange: (localUri: string | null) => void;
  remoteUrl?: string | null;
};

export default function GroupAvatar({
  size = 64,
  title,
  uri,
  onChange,
  remoteUrl,
}: Props) {
  const initial = useMemo(() => {
    const t = (title ?? '').trim();
    return t ? t[0].toUpperCase() : '👥';
  }, [title]);

  const fallbackBg = useMemo(() => colorForUid(title ?? ''), [title]);

  const pick = useCallback(
    async (from: 'camera' | 'gallery') => {
      const libOpts: ImageLibraryOptions = {
        mediaType: 'photo' as MediaType,
        selectionLimit: 1,
        quality: 0.9,
      };
      const camOpts: CameraOptions = {
        mediaType: 'photo' as MediaType,
        quality: 0.9,
        saveToPhotos: false,
      };
      const res =
        from === 'camera'
          ? await launchCamera(camOpts)
          : await launchImageLibrary(libOpts);
      if (res.didCancel) return;
      const a = res.assets?.[0];
      onChange(a?.uri ?? null);
    },
    [onChange],
  );

  const onPress = useCallback(() => {
    Alert.alert('Group picture', undefined, [
      { text: 'Camera', onPress: () => pick('camera').catch(() => {}) },
      { text: 'Gallery', onPress: () => pick('gallery').catch(() => {}) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [pick]);

  return (
    <Pressable
      onPress={onPress}
      style={[s.wrap, { width: size, height: size, borderRadius: size / 2 }]}
    >
      {uri || remoteUrl ? (
        <FastImage
          source={{ uri: uri ?? remoteUrl! }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode={FastImage.resizeMode.cover}
        />
      ) : (
        <View
          style={[
            s.fallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: fallbackBg,
            },
          ]}
        >
          <Text style={[s.initial, { fontSize: Math.max(18, size * 0.42) }]}>
            {initial}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { overflow: 'hidden', marginBottom: 12, alignSelf: 'flex-start' },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontWeight: '800', color: '#000000ff' },
});
