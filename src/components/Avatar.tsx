import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Text,
} from 'react-native';
import { getAuth, updateProfile } from '@react-native-firebase/auth';
import { getDatabase, ref, get, set } from '@react-native-firebase/database';
import {
  getStorage,
  ref as storageRef,
  putFile as storagePutFile,
  getDownloadURL as storageGetDownloadURL,
} from '@react-native-firebase/storage';
import {
  launchCamera,
  launchImageLibrary,
  Asset,
  ImageLibraryOptions,
  CameraOptions,
  MediaType,
} from 'react-native-image-picker';

type Props = {
  /** Optional fixed size; defaults to 112 */
  size?: number;
  /** Optional: if you pass a uid, we’ll use that; otherwise current user */
  uid?: string;
  /** Optional displayName for initials fallback */
  displayName?: string | null;
};

export default function Avatar({
  size = 112,
  uid: uidProp,
  displayName,
}: Props) {
  const auth = getAuth();
  const db = getDatabase();
  const uid = uidProp ?? auth.currentUser?.uid ?? null;

  const [photoURL, setPhotoURL] = useState<string | null>(
    auth.currentUser?.photoURL ?? null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);

  // Pull latest from RTDB if present; fall back to Auth
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!uid) {
        setLoading(false);
        return;
      }
      try {
        const snap = await get(ref(db, `usersPublic/${uid}/photoURL`));
        const url =
          (snap.exists()
            ? String(snap.val())
            : auth.currentUser?.photoURL || '') || '';
        if (!cancelled) setPhotoURL(url || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, uid, auth.currentUser?.photoURL]);

  const initials = useMemo(() => {
    const name = (displayName ?? auth.currentUser?.displayName ?? '').trim();
    if (!name) return '🙂';
    const parts = name.split(/\s+/);
    const s = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
    return s.toUpperCase() || '🙂';
  }, [displayName, auth.currentUser?.displayName]);

  const pick = useCallback(
    async (from: 'camera' | 'gallery') => {
      const libOpts: ImageLibraryOptions = {
        mediaType: 'photo' as MediaType,
        quality: 0.9,
        selectionLimit: 1,
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
      const asset: Asset | undefined = res.assets?.[0];
      if (!asset?.uri) {
        Alert.alert('Image', 'No image selected.');
        return;
      }
      if (!uid) return;

      try {
        setUploading(true);
        const ext = asset.fileName?.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `avatars/${uid}/${Date.now()}.${ext}`;
        const st = getStorage();
        const fileRef = storageRef(st, path);
        await storagePutFile(fileRef, asset.uri);
        const url = await storageGetDownloadURL(fileRef);

        // Save to RTDB + Auth profile for easy reuse across the app
        await Promise.all([
          set(ref(db, `usersPublic/${uid}/photoURL`), url),
          (async () => {
            const u = getAuth().currentUser;
            if (u) {
              await updateProfile(u, { photoURL: url });
            }
          })(),
        ]);

        setPhotoURL(url);
        Alert.alert('Profile photo', 'Updated successfully.');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Upload failed.';
        Alert.alert('Error', msg);
      } finally {
        setUploading(false);
      }
    },
    [db, uid],
  );

  const onPress = useCallback(() => {
    Alert.alert(
      'Change photo',
      undefined,
      [
        {
          text: 'Camera',
          onPress: () => {
            pick('camera').catch(() => {});
          },
        },
        {
          text: 'Gallery',
          onPress: () => {
            pick('gallery').catch(() => {});
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true },
    );
  }, [pick]);

  const S = useMemo(
    () =>
      StyleSheet.create({
        wrap: { alignItems: 'center', justifyContent: 'center' },
        ring: {
          width: size + 8,
          height: size + 8,
          borderRadius: (size + 8) / 2,
          backgroundColor: '#35662bff',
          alignItems: 'center',
          justifyContent: 'center',
        },
        img: {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#e6e6e6',
        },
        fallback: {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#6bdd6bff',
        },
        initials: {
          fontSize: Math.max(18, size * 0.32),
          fontWeight: '700',
          color: '#2e2e2eff',
        },
        hint: { marginTop: 8, fontSize: 12, opacity: 0.6 },
        overlay: {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [size],
  );

  if (loading) {
    return (
      <View style={S.wrap}>
        <View style={S.ring}>
          <ActivityIndicator />
        </View>
      </View>
    );
  }

  return (
    <View style={S.wrap}>
      <Pressable onPress={onPress} android_ripple={{ radius: size / 2 }}>
        <View style={S.ring}>
          {photoURL ? (
            <Image
              source={{ uri: photoURL }}
              style={S.img}
              resizeMode="cover"
            />
          ) : (
            <View style={S.fallback}>
              <Text style={S.initials}>{initials}</Text>
            </View>
          )}
          {uploading && (
            <View style={S.overlay}>
              <ActivityIndicator />
            </View>
          )}
        </View>
      </Pressable>
      <Text style={S.hint}>Tap to change photo</Text>
    </View>
  );
}
