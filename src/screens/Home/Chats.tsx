import React, {
  useMemo,
  useCallback,
  useLayoutEffect,
  useState,
  useRef,
} from 'react';
import { View, Text, FlatList, StyleSheet, TextInput } from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@navigation/AppNavigator';
import useRealtimeList from '@hooks/useRealtimeList';
import { userChatsQueryForCurrentUser, Chat } from '@services/db';
import ChatItem from '@components/ChatItem';
import HeaderMenu from '@components/HeaderMenu';

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef<TextInput>(null);

  const toggleSearch = useCallback(() => {
    setSearchOpen(prev => {
      const next = !prev;
      if (!prev) setTimeout(() => inputRef.current?.focus(), 0); // focus when opening
      if (prev) setQ(''); // clear when closing
      return next;
    });
  }, []);

  const headerRightEl = useMemo(
    () => <HeaderMenu onSearchPress={toggleSearch} />,
    [toggleSearch],
  );

  useLayoutEffect(() => {
    nav.setOptions({
      headerRight: () => headerRightEl,
    });
  }, [nav, headerRightEl]);

  const queryRef = useMemo(() => userChatsQueryForCurrentUser(50), []);
  const chats = useRealtimeList<Chat>(
    queryRef,
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

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return chats;
    return chats.filter(c =>
      (c.title ?? 'Direct chat').toLowerCase().includes(term),
    );
  }, [q, chats]);

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
      {searchOpen && (
        <TextInput
          ref={inputRef}
          value={q}
          onChangeText={setQ}
          placeholder="Search chats by title…"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.searchInput}
        />
      )}

      {filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.noChatsText}>
            {q ? `No results for “${q}”` : 'No chats yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
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
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
});
