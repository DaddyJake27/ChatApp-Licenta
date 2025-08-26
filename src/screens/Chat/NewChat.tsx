import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@navigation/AppNavigator';
import { createDMByEmail, createGroupByEmails } from '@services/db';

type Nav = NativeStackNavigationProp<AppStackParamList, 'NewChat'>;
type Mode = 'dm' | 'group';

const errorMessage = (err: unknown) =>
  err instanceof Error
    ? err.message
    : typeof err === 'string'
    ? err
    : 'Unknown error';

export default function NewChat() {
  const nav = useNavigation<Nav>();
  const [mode, setMode] = useState<Mode>('dm');

  // DM
  const [dmEmail, setDmEmail] = useState('');

  // Group
  const [title, setTitle] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState<string[]>([]);

  const addEmail = useCallback(() => {
    const e = emailInput.trim().toLowerCase();
    if (!e) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (emails.includes(e)) return;
    setEmails(prev => [...prev, e]);
    setEmailInput('');
  }, [emailInput, emails]);

  const removeEmail = useCallback((e: string) => {
    setEmails(prev => prev.filter(x => x !== e));
  }, []);

  const canCreate = useMemo(() => {
    return mode === 'dm' ? dmEmail.trim().length > 0 : emails.length > 0; // at least one other member
  }, [mode, dmEmail, emails]);

  const handleCreate = useCallback(async () => {
    try {
      if (mode === 'dm') {
        const chatId = await createDMByEmail(dmEmail.trim());
        nav.replace('Chat', { chatId, title: 'Direct chat' });
      } else {
        const chatId = await createGroupByEmails(title.trim() || null, emails);
        nav.replace('Chat', { chatId, title: title.trim() || 'Group' });
      }
    } catch (e) {
      Alert.alert('Could not create chat', errorMessage(e));
    }
  }, [mode, dmEmail, title, emails, nav]);

  return (
    <View style={s.c}>
      {/* Mode toggle */}
      <View style={s.toggleRow}>
        <Pressable
          onPress={() => setMode('dm')}
          style={[s.toggleBtn, mode === 'dm' && s.toggleBtnActive]}
        >
          <Text style={[s.toggleText, mode === 'dm' && s.toggleTextActive]}>
            Direct message
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('group')}
          style={[s.toggleBtn, mode === 'group' && s.toggleBtnActive]}
        >
          <Text style={[s.toggleText, mode === 'group' && s.toggleTextActive]}>
            Group
          </Text>
        </Pressable>
      </View>

      {mode === 'dm' ? (
        <View style={s.card}>
          <Text style={s.label}>Their email</Text>
          <TextInput
            value={dmEmail}
            onChangeText={setDmEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="user@example.com"
            style={s.input}
          />
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.label}>Group name (optional)</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="My group"
            style={s.input}
          />

          <Text style={[s.label, s.addMembersText]}>Add members by email</Text>
          <View style={s.row}>
            <TextInput
              value={emailInput}
              onChangeText={setEmailInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="user@example.com"
              style={[s.input, s.emailInput]}
            />
            <Pressable onPress={addEmail} style={[s.btn, s.btnSecondary]}>
              <Text style={s.btnText}>Add</Text>
            </Pressable>
          </View>

          {emails.length > 0 ? (
            <FlatList
              data={emails}
              keyExtractor={e => e}
              renderItem={({ item }) => (
                <View style={s.emailRow}>
                  <Text style={s.emailText}>{item}</Text>
                  <Pressable onPress={() => removeEmail(item)}>
                    <Text style={s.removeText}>Remove</Text>
                  </Pressable>
                </View>
              )}
              style={s.emailList}
            />
          ) : null}
        </View>
      )}

      <Pressable
        onPress={handleCreate}
        disabled={!canCreate}
        style={[s.btn, s.btnPrimary, !canCreate && s.btnDisabled]}
      >
        <Text style={[s.btnText, s.btnPrimaryText]}>Create</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, padding: 16 },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  toggleText: { color: '#111', fontWeight: '600' },
  toggleTextActive: { color: '#fff' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 12,
  },
  label: { fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  row: { flexDirection: 'row', alignItems: 'center' },

  emailList: { marginTop: 8, maxHeight: 160 },
  emailRow: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emailText: { color: '#111' },
  emailInput: { flex: 1, marginRight: 8 },
  addMembersText: { marginTop: 12 },
  removeText: { color: '#c00', fontWeight: '600' },

  btn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnSecondary: {
    backgroundColor: '#f4f4f5',
  },
  btnPrimary: { backgroundColor: '#111' },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontWeight: '700' },
  btnPrimaryText: { color: '#fff' },
});
