import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import type { Chat } from '@services/db';

type Props = {
  chat: Chat;
  onPress: () => void;
  onLongPress?: () => void;
};

export default function ChatItem({ chat, onPress, onLongPress }: Props) {
  const title = chat.title || 'Direct chat';
  const sub =
    chat.lastMessage?.type === 'image'
      ? '[image]'
      : chat.lastMessage?.text || '…';

  return (
    <Pressable style={s.item} onPress={onPress} onLongPress={onLongPress}>
      <View style={s.row}>
        {/* Placeholder for avatar left side to add later */}
        <View style={s.meta}>
          <Text style={s.title}>{title}</Text>
          <Text style={s.sub} numberOfLines={1}>
            {sub}
          </Text>
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
  sub: { color: '#666', marginTop: 4 },
});
