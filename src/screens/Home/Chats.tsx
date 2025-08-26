import React, { useMemo, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@navigation/AppNavigator';
import useRealtimeList from '@hooks/useRealtimeList';
import { userChatsQueryForCurrentUser, Chat } from '@services/db';
import ChatItem from '@components/ChatItem';

type ChatRoute = NativeStackNavigationProp<AppStackParamList, 'Home'>;

type UserChatsRow = {
  title?: string | null;
  isGroup?: boolean;
  lastMessagePreview?: string;
  lastMessageAt?: number;
  lastMessageSender?: string;
  lastMessageType?: 'text' | 'image';
  lastRead?: number;
};

export default function Chats() {
  const nav = useNavigation<ChatRoute>();
  const user = getAuth().currentUser;

  if (!user) {
    return (
      <View style={styles.center}>
        <Text>Please sign in</Text>
      </View>
    );
  }
  return <ChatsInner nav={nav} />;
}

function ChatsInner({ nav }: { nav: ChatRoute }) {
  const q = useMemo(() => userChatsQueryForCurrentUser(50), []);
  const chats = useRealtimeList<Chat>(
    q,
    snap => {
      const v = (snap.val() ?? {}) as UserChatsRow;
      const lastType: 'text' | 'image' =
        v.lastMessageType === 'image' ? 'image' : 'text';
      const createdAt =
        typeof v.lastMessageAt === 'number' ? v.lastMessageAt : 0;

      const base: Chat = {
        id: snap.key!,
        title: typeof v.title === 'string' ? v.title : undefined,
        isGroup: !!v?.isGroup,
        lastMessage: {
          type: lastType,
          text: lastType === 'image' ? '[image]' : v?.lastMessagePreview ?? '',
          createdAt,
          senderId:
            typeof v?.lastMessageSender === 'string' ? v.lastMessageSender : '',
        },
        updatedAt: createdAt,
      };

      if (
        typeof v?.lastRead === 'number' &&
        typeof base.updatedAt === 'number'
      ) {
        base.unreadCount = base.updatedAt > v.lastRead ? 1 : 0;
      }
      return base;
    },
    'value',
    { sort: (a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0) },
  );

  const keyExtractor = useCallback((c: Chat) => c.id, []);
  const renderItem = useCallback(
    ({ item }: { item: Chat }) => (
      <ChatItem
        chat={item}
        onPress={() =>
          nav.navigate('Chat', {
            chatId: item.id,
            title: item.title ?? 'Direct chat',
          })
        }
      />
    ),
    [nav],
  );

  return (
    <View style={styles.container}>
      {chats.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.noChatsText}>No chats yet</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noChatsText: { marginTop: 8 },
});
