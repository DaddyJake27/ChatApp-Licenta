import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import type { Chat } from '@services/db';
import { Feather } from '@react-native-vector-icons/feather';
import { getAuth } from '@react-native-firebase/auth';
import {
  getDatabase,
  ref as dbRef,
  onValue,
} from '@react-native-firebase/database';
import FastImage from '@d11/react-native-fast-image';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@navigation/AppNavigator';

type Props = {
  chat: Chat;
  onPress: () => void;
  onLongPress?: () => void;
};

function useUserField(uid?: string, key?: 'displayName' | 'photoURL') {
  const [val, setVal] = useState<string | null>(null);
  useEffect(() => {
    if (!uid || !key) return;
    const r = dbRef(getDatabase(), `usersPublic/${uid}/${key}`);
    const unsub = onValue(r, snap => {
      const v = snap.val();
      setVal(typeof v === 'string' && v.trim() ? v.trim() : null);
    });
    return unsub;
  }, [uid, key]);
  return val;
}

function useDisplayName(uid?: string) {
  return useUserField(uid, 'displayName');
}

function usePhotoURL(uid?: string) {
  return useUserField(uid, 'photoURL');
}

function useChatPhotoURL(chatId?: string) {
  const [url, setUrl] = React.useState<string | null>(null);
  useEffect(() => {
    if (!chatId) return;
    const r = dbRef(getDatabase(), `chats/${chatId}/photoURL`);
    const unsub = onValue(r, snap => {
      const v = snap.val();
      setUrl(typeof v === 'string' && v.trim() ? v : null);
    });
    return unsub;
  }, [chatId]);
  return url;
}

function AvatarThumb({ uid }: { uid?: string; size?: number }) {
  const name = useDisplayName(uid);
  const photoURL = usePhotoURL(uid);

  const initials = useMemo(() => {
    const n = (name ?? '').trim();
    if (!n) return '🙂';
    const parts = n.split(/\s+/);
    return (
      ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '🙂'
    );
  }, [name]);

  return (
    <View style={s.wrap}>
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
        <Text style={s.txt}>{initials}</Text>
      )}
    </View>
  );
}

type ChatWithMembers = {
  id?: string;
  members?: Record<string, boolean>;
};

function useMemberIds(chat: ChatWithMembers): string[] {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    // If the chat object already contains members, reflect them and skip RTDB subscribe.
    if (chat?.members && typeof chat.members === 'object') {
      setIds(Object.keys(chat.members));
      return; // no subscription => no cleanup needed
    }

    // Otherwise, subscribe to /chats/{id}/members
    const chatId = chat?.id;
    if (!chatId) {
      setIds([]);
      return;
    }

    const r = dbRef(getDatabase(), `chats/${chatId}/members`);
    const unsub = onValue(r, snap => {
      if (snap.exists() && typeof snap.val() === 'object') {
        setIds(Object.keys(snap.val() as Record<string, boolean>));
      } else {
        setIds([]);
      }
    });
    return unsub;
  }, [chat?.id, chat?.members]); // <- include members itself, not a boolean

  return ids;
}

export default function ChatItem({ chat, onPress, onLongPress }: Props) {
  const nav = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const title = chat.title || 'Direct chat';
  const isUnread = (chat.unreadCount ?? 0) > 0;

  const me = getAuth().currentUser?.uid;
  const memberIds = useMemberIds(chat);
  const otherUid = useMemo(() => {
    if (!me || memberIds.length === 0) return undefined;
    const ids = memberIds.filter(id => id && id !== me);
    return ids[0];
  }, [me, memberIds]);

  const lastSenderId = chat.lastMessage?.senderId;
  const lastSenderName = useDisplayName(lastSenderId);

  const isGroup = !!chat.isGroup;
  const groupPhotoURL = useChatPhotoURL(chat.id);
  const groupInitial = (title?.trim()?.[0] ?? '👥').toUpperCase();
  const senderLabel = (() => {
    if (!lastSenderId) return '';
    if (lastSenderId === me) return 'You: ';
    return isGroup ? `${lastSenderName || 'Someone'}: ` : '';
  })();

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
          {senderLabel}Photo
        </Text>
      </View>
    ) : (
      <Text style={[s.subText, isUnread && s.unreadText]} numberOfLines={1}>
        {senderLabel}
        {chat.lastMessage?.text || '…'}
      </Text>
    );

  return (
    <Pressable style={s.item} onPress={onPress} onLongPress={onLongPress}>
      <View style={s.row}>
        {/* Avatar on the left (other user for 1:1; for groups you can later swap to a group avatar) */}
        {!isGroup ? (
          <Pressable
            onPress={() => {
              if (otherUid) nav.navigate('UserProfile', { uid: otherUid });
            }}
            hitSlop={10}
          >
            <AvatarThumb uid={otherUid} />
          </Pressable>
        ) : (
          <View style={s.wrap}>
            {groupPhotoURL ? (
              <FastImage
                source={{
                  uri: groupPhotoURL,
                  priority: FastImage.priority.high,
                  cache: FastImage.cacheControl.immutable,
                }}
                style={s.img}
                resizeMode={FastImage.resizeMode.cover}
              />
            ) : (
              <Text style={s.txt}>{groupInitial}</Text>
            )}
          </View>
        )}
        <View style={s.meta}>
          <Text style={s.title}>{title}</Text>
          {sub}
        </View>
      </View>
    </Pressable>
  );
}

const thumbSize = 42;

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
  wrap: {
    width: thumbSize,
    height: thumbSize,
    borderRadius: thumbSize / 2,
    backgroundColor: '#6bdd6bff',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
    overflow: 'hidden' as const,
  },
  img: { width: thumbSize, height: thumbSize, borderRadius: thumbSize / 2 },
  txt: {
    fontWeight: '700' as const,
    color: '#555',
    fontSize: Math.max(14, thumbSize * 0.36),
  },
});
