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
import { getAuth, updateProfile } from '@react-native-firebase/auth';
import { signOut } from '@services/auth';
import { deleteMyAccountAndData } from '@services/db';
import Avatar from '@components/Avatar';

const ABOUT_MAX = 280;

export default function Profile() {
  const db = getDatabase();
  const user = getAuth().currentUser;
  const uid = user?.uid ?? null;
  const email = user?.email ?? '(no email)';
  const [deleting, setDeleting] = useState(false);

  const [nickname, setNickname] = useState<string>(user?.displayName ?? '');
  const [initialNickname, setInitialNickname] = useState<string>(
    user?.displayName ?? '',
  );
  const [savingNick, setSavingNick] = useState<boolean>(false);

  const [about, setAbout] = useState<string>('');
  const [initialAbout, setInitialAbout] = useState<string>('');
  const [savingAbout, setSavingAbout] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);

  // Load nickname from RTDB (fallback to Auth displayName)
  useEffect(() => {
    (async () => {
      if (!uid) {
        setLoading(false);
        return;
      }
      try {
        const userPubRef = ref(db, `usersPublic/${uid}`);
        const snap = await get(userPubRef);

        const n = (
          snap.exists() && snap.child('displayName').exists()
            ? String(snap.child('displayName').val())
            : user?.displayName || ''
        ).trim();

        const a =
          snap.exists() && snap.child('about').exists()
            ? String(snap.child('about').val())
            : '';

        setNickname(n);
        setInitialNickname(n);
        setAbout(a);
        setInitialAbout(a);
      } finally {
        setLoading(false);
      }
    })();
  }, [db, uid, user?.displayName]);

  const nickChanged = useMemo(
    () => nickname.trim() !== initialNickname.trim(),
    [nickname, initialNickname],
  );

  const aboutChanged = useMemo(
    () => about !== initialAbout,
    [about, initialAbout],
  );

  const saveNickname = useCallback(async () => {
    if (!uid) return;
    const n = nickname.trim();
    if (n.length < 2 || n.length > 32) {
      Alert.alert('Nickname', 'Please use 2–32 characters.');
      return;
    }
    try {
      setSavingNick(true);
      await Promise.all([
        set(ref(db, `usersPublic/${uid}/displayName`), n),
        (async () => {
          const u = getAuth().currentUser;
          if (u) await updateProfile(u, { displayName: n });
        })(),
      ]);
      setInitialNickname(n);
      Alert.alert('Saved', 'Nickname updated.');
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Failed to save nickname.';
      Alert.alert('Error', message);
    } finally {
      setSavingNick(false);
    }
  }, [db, uid, nickname]);

  const saveAbout = useCallback(async () => {
    if (!uid) return;
    const a = about; // allow empty; just length-limit
    if (a.length > ABOUT_MAX) {
      Alert.alert('About', `Please keep it under ${ABOUT_MAX} characters.`);
      return;
    }
    try {
      setSavingAbout(true);
      await set(ref(db, `usersPublic/${uid}/about`), a);
      setInitialAbout(a);
      Alert.alert('Saved', 'About updated.');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save about.';
      Alert.alert('Error', message);
    } finally {
      setSavingAbout(false);
    }
  }, [db, uid, about]);

  const errMsgDelete = (e: unknown) =>
    e instanceof Error
      ? e.message
      : typeof e === 'string'
      ? e
      : 'Account deletion failed.';

  const confirmDelete = useCallback(() => {
    Alert.alert(
      'Delete account?',
      'This will remove your account. Your old messages remain for others.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteMyAccountAndData();
            } catch (e: unknown) {
              Alert.alert('Error', errMsgDelete(e));
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }, []);

  if (loading) {
    return (
      <View style={s.c}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={s.c}>
      <Avatar size={150} />
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
          style={[s.saveBtn, (!nickChanged || savingNick) && s.saveBtnDisabled]}
          disabled={!nickChanged || savingNick}
          onPress={saveNickname}
        >
          {savingNick ? (
            <ActivityIndicator />
          ) : (
            <Text style={s.saveText}>Save</Text>
          )}
        </Pressable>
      </View>

      <Text style={[s.label, s.aboutTextMargin]}>About</Text>
      <View style={s.fullWidth}>
        <TextInput
          style={[s.input, s.aboutInput]}
          value={about}
          onChangeText={setAbout}
          placeholder="Say something about yourself…"
          multiline
          maxLength={ABOUT_MAX}
          textAlignVertical="top"
        />
        <Text style={s.counter}>
          {about.length}/{ABOUT_MAX}
        </Text>

        <Pressable
          style={[
            s.longSaveBtn,
            (!aboutChanged || savingAbout) && s.saveBtnDisabled,
          ]}
          disabled={!aboutChanged || savingAbout}
          onPress={saveAbout}
        >
          {savingAbout ? (
            <ActivityIndicator />
          ) : (
            <Text style={s.longSaveText}>Save</Text>
          )}
        </Pressable>
      </View>

      <Text style={[s.t, s.email]}>{email}</Text>
      <Pressable style={[s.btn, s.signOutbtn]} onPress={signOut}>
        <Text style={s.bt}>Sign out</Text>
      </Pressable>

      <Pressable
        style={[s.btn, s.deleteBtn, deleting && s.saveBtnDisabled]}
        disabled={deleting}
        onPress={confirmDelete}
      >
        {deleting ? (
          <ActivityIndicator color="#237512ff" />
        ) : (
          <Text style={s.deleteText}>Delete account</Text>
        )}
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  c: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 24,
    paddingTop: 16,
  },
  label: {
    alignSelf: 'flex-start',
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 6,
  },
  row: { width: '100%', flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  fullWidth: { width: '100%' },
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
  aboutInput: {
    minHeight: 105,
  },
  aboutTextMargin: { marginTop: 16 },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#111',
    borderRadius: 10,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  longSaveBtn: {
    marginTop: 8,
    marginBottom: 12,
    width: '100%',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  longSaveText: { color: '#fff', fontWeight: '600' },
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
  email: { marginTop: 100 },
  signOutbtn: { marginTop: 10 },
  counter: {
    alignSelf: 'flex-end',
    marginTop: 6,
    marginBottom: 8,
    fontSize: 12,
    opacity: 0.6,
  },
  deleteBtn: {
    marginTop: 12,
    backgroundColor: '#c00000',
  },
  deleteText: { color: '#fff', fontWeight: '700' },
});
