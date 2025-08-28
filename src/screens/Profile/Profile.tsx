import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { getDatabase, ref, get, set } from '@react-native-firebase/database';
import { getAuth } from '@react-native-firebase/auth';
import { signOut } from '@services/auth';

export default function Profile() {
  const db = getDatabase();
  const auth = getAuth();
  const user = auth.currentUser;
  const uid = user?.uid ?? null;
  const email = user?.email ?? '(no email)';

  const [nickname, setNickname] = useState<string>(user?.displayName ?? '');
  const [initialNickname, setInitialNickname] = useState<string>(
    user?.displayName ?? '',
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Load nickname from RTDB (fallback to Auth displayName)
  useEffect(() => {
    (async () => {
      if (!uid) {
        setLoading(false);
        return;
      }
      try {
        const nickRef = ref(db, `usersPublic/${uid}/displayName`);
        const snap = await get(nickRef);
        const n = (
          snap.exists() ? String(snap.val()) : user?.displayName || ''
        ).trim();
        setNickname(n);
        setInitialNickname(n);
      } finally {
        setLoading(false);
      }
    })();
  }, [db, uid, user?.displayName]);

  const changed = useMemo(
    () => nickname.trim() !== initialNickname.trim(),
    [nickname, initialNickname],
  );

  const saveNickname = useCallback(async () => {
    if (!uid) return;
    const n = nickname.trim();
    if (n.length < 2 || n.length > 32) {
      Alert.alert('Nickname', 'Please use 2–32 characters.');
      return;
    }
    try {
      setSaving(true);
      // Save to RTDB and Auth
      await Promise.all([
        set(ref(db, `usersPublic/${uid}/displayName`), n),
        auth.currentUser?.updateProfile?.({ displayName: n }),
      ]);
      setInitialNickname(n);
      Alert.alert('Saved', 'Nickname updated.');
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Failed to save nickname.';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  }, [db, uid, nickname, auth]);

  if (loading) {
    return (
      <View style={s.c}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={s.c}>
      <Text style={s.label}>Nickname</Text>
      <View style={s.row}>
        <TextInput
          style={s.input}
          value={nickname}
          onChangeText={setNickname}
          placeholder="Add your nickname"
          autoCapitalize="words"
          maxLength={32}
        />
        <Pressable
          style={[s.saveBtn, (!changed || saving) && s.saveBtnDisabled]}
          disabled={!changed || saving}
          onPress={saveNickname}
        >
          {saving ? (
            <ActivityIndicator />
          ) : (
            <Text style={s.saveText}>Save</Text>
          )}
        </Pressable>
      </View>

      <Text style={[s.t, s.email]}>{email}</Text>

      <Pressable style={[s.btn, s.signOutbtn]} onPress={signOut}>
        <Text style={s.bt}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  label: {
    alignSelf: 'flex-start',
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 6,
  },
  row: { width: '100%', flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#111',
    borderRadius: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { color: '#fff', fontWeight: '600' },
  t: { fontSize: 18, marginBottom: 16 },
  btn: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  bt: { color: '#fff', fontWeight: '600' },
  email: { marginTop: 24 },
  signOutbtn: { marginTop: 16 },
});
