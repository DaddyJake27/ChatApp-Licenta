import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/AppNavigator';
import useRealtimeList from '@hooks/useRealtimeList';
import { chatsQueryForCurrentUser, Chat } from '@services/db';

type ChatsNav = NativeStackNavigationProp<RootStackParamList, 'Chats'>;

export default function Chats() {
  const nav = useNavigation<ChatsNav>();
  const user = auth().currentUser;

  if (!user) {
    return (
      <View style={styles.center}>
        <Text>Please sign in</Text>
      </View>
    );
  }
  return <ChatsInner uid={user.uid} nav={nav} />;
}

function ChatsInner({ nav }: { uid: string; nav: ChatsNav }) {
  // helper to coerce RTDBTimestamp -> number for sorting
  const asNum = (t: unknown): number => (typeof t === 'number' ? t : 0);

  const q = useMemo(() => chatsQueryForCurrentUser(50), []);
  const chats = useRealtimeList<Chat>(
    q,
    snap => ({ id: snap.key!, ...(snap.val() as Omit<Chat, 'id'>) }),
    'value',
    {
      // newest first
      sort: (a, b) => asNum(b.updatedAt) - asNum(a.updatedAt),
    },
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
          keyExtractor={c => c.id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.item}
              onPress={() =>
                nav.navigate('Chat', {
                  chatId: item.id,
                  title: item.title ?? 'Direct chat',
                })
              }
            >
              <Text style={styles.itemTitle}>
                {item.title || 'Direct chat'}
              </Text>
              <Text style={styles.itemSub}>
                {item.lastMessage?.type === 'image'
                  ? '[image]'
                  : item.lastMessage?.text || '…'}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  item: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  itemTitle: { fontSize: 16, fontWeight: '600' },
  itemSub: { color: '#666', marginTop: 4 },
  noChatsText: { marginTop: 8 },
});
