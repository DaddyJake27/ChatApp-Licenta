import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { getDatabase, ref, onValue } from '@react-native-firebase/database';
import FastImage from '@d11/react-native-fast-image';
import type { AppStackParamList } from '@navigation/AppNavigator';

type R = RouteProp<AppStackParamList, 'UserProfile'>;

export default function UserProfile() {
  const { params } = useRoute<R>();
  const { uid } = params;

  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string>('');
  const [about, setAbout] = useState<string>('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);

  useEffect(() => {
    const db = getDatabase();
    const r = ref(db, `usersPublic/${uid}`);
    const unsub = onValue(r, snap => {
      const v = snap.val() || {};
      setDisplayName((v.displayName || '').trim());
      setAbout(typeof v.about === 'string' ? v.about : '');
      setPhotoURL(typeof v.photoURL === 'string' ? v.photoURL : null);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <View style={s.avatar}>
        {photoURL ? (
          <FastImage
            source={{
              uri: photoURL,
              priority: FastImage.priority.high,
              cache: FastImage.cacheControl.immutable,
            }}
            style={s.img}
            resizeMode={FastImage.resizeMode.cover}
          />
        ) : (
          <Text style={s.initials}>
            {displayName
              ? displayName
                  .split(/\s+/)
                  .map(p => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
              : '🙂'}
          </Text>
        )}
      </View>

      <Text style={s.name}>{displayName || 'User'}</Text>

      {about ? (
        <>
          <Text style={s.label}>About</Text>
          <Text style={s.about}>{about}</Text>
        </>
      ) : null}
    </View>
  );
}

const AV = 140;
const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wrap: { flex: 1, alignItems: 'center', padding: 24 },
  avatar: {
    width: AV,
    height: AV,
    borderRadius: AV / 2,
    backgroundColor: '#e8e8e8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 8,
  },
  img: { width: AV, height: AV, borderRadius: AV / 2 },
  initials: { fontSize: 40, fontWeight: '700', color: '#555' },
  name: { marginTop: 16, fontSize: 22, fontWeight: '700' },
  label: { marginTop: 18, alignSelf: 'flex-start', opacity: 0.6 },
  about: { alignSelf: 'flex-start', marginTop: 4, fontSize: 16 },
});
