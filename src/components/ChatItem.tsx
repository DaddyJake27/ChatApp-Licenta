import React, { useEffect, useState } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import type { Chat } from '@services/db';
import { Feather } from '@react-native-vector-icons/feather';
import { getAuth } from '@react-native-firebase/auth';
import {
  getDatabase,
  ref as dbRef,
  onValue,
} from '@react-native-firebase/database';

type Props = {
  chat: Chat;
  onPress: () => void;
  onLongPress?: () => void;
};

//hook used to get a display name for a UID from /usersPublic/{uid}
function useDisplayName(uid?: string) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    const r = dbRef(getDatabase(), `usersPublic/${uid}/displayName`);
    const unsubscribe = onValue(r, snap => {
      const v = snap.val();
      setName(typeof v === 'string' && v.trim() ? v.trim() : null);
    });
    return unsubscribe;
  }, [uid]);

  return name;
}

export default function ChatItem({ chat, onPress, onLongPress }: Props) {
  const title = chat.title || 'Direct chat';
  const isUnread = (chat.unreadCount ?? 0) > 0;

  const me = getAuth().currentUser?.uid;
  const lastSenderId = chat.lastMessage?.senderId;
  const lastSenderName = useDisplayName(lastSenderId);

  const senderLabel = lastSenderId
    ? lastSenderId === me
      ? 'You'
      : lastSenderName || 'Someone'
    : '';

  const sub =
    chat.lastMessage?.type === 'image' ? (
      <View style={s.subRow}>
        <Feather
          name="image"
          size={14}
          color={isUnread ? '#000' : '#666'}
          style={s.subIcon}
        />
        <Text style={[s.subText, isUnread && s.unreadText]} numberOfLines={1}>
          {senderLabel ? `${senderLabel}: ` : ''}Photo
        </Text>
      </View>
    ) : (
      <Text style={[s.subText, isUnread && s.unreadText]} numberOfLines={1}>
        {senderLabel ? `${senderLabel}: ` : ''}
        {chat.lastMessage?.text || '…'}
      </Text>
    );

  return (
    <Pressable style={s.item} onPress={onPress} onLongPress={onLongPress}>
      <View style={s.row}>
        {/* Placeholder for avatar left side to add later */}
        <View style={s.meta}>
          <Text style={s.title}>{title}</Text>
          {sub}
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  item: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  meta: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600' },
  subRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  subIcon: { marginRight: 4 },
  subText: { color: '#666' },
  unreadText: { fontWeight: '700', color: '#000' }, // bold + darker
});
