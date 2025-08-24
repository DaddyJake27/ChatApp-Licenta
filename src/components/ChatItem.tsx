import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import type { Chat } from '@services/db';
import { Feather } from '@react-native-vector-icons/feather';

type Props = {
  chat: Chat;
  onPress: () => void;
  onLongPress?: () => void;
};

export default function ChatItem({ chat, onPress, onLongPress }: Props) {
  const title = chat.title || 'Direct chat';
  const isUnread = (chat.unreadCount ?? 0) > 0;
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
          Photo
        </Text>
      </View>
    ) : (
      <Text style={[s.subText, isUnread && s.unreadText]} numberOfLines={1}>
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
