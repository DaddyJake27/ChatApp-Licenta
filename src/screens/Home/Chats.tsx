import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@navigation/AppNavigator';
import useRealtimeList from '@hooks/useRealtimeList';
import { chatsQueryForCurrentUser, Chat } from '@services/db';
import ChatItem from '@components/ChatItem';

type ChatRoute = NativeStackNavigationProp<AppStackParamList, 'Home'>;

export default function Chats() {
  const nav = useNavigation<ChatRoute>();
  const user = auth().currentUser;

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
  const asNum = (t: unknown): number => (typeof t === 'number' ? t : 0);

  const q = useMemo(() => chatsQueryForCurrentUser(50), []);
  const userId = auth().currentUser?.uid;
  const chats = useRealtimeList<Chat>(
    q,
    snap => {
      const base = {
        id: snap.key!,
        ...(snap.val() as Omit<Chat, 'id'>),
      } as Chat;

      if (base.lastMessage && userId) {
        const lastReadTs = base.lastRead?.[userId] ?? 0;
        const unread = base.lastMessage.createdAt > lastReadTs ? 1 : 0; // simple 0/1 flag
        return { ...base, unreadCount: unread };
      }

      return base;
    },
    'value',
    { sort: (a, b) => asNum(b.updatedAt) - asNum(a.updatedAt) },
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
          <ActivityIndicator />
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
