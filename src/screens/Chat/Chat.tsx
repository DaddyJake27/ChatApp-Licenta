import React, {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
} from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import type { KeyboardEvent } from 'react-native';
import database from '@react-native-firebase/database';
import storage from '@react-native-firebase/storage';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { AppStackParamList } from '@navigation/AppNavigator';
import { sendImageMessage, sendTextMessage, Message } from '@services/db';
import useRealtimeList from '@hooks/useRealtimeList';
import {
  launchImageLibrary,
  type ImageLibraryOptions,
  type Asset,
} from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MessageBubble from '@components/MessageBubble';
import MessageInput from '@components/MessageInput';

type ChatRoute = RouteProp<AppStackParamList, 'Chat'>;

const errorMessage = (err: unknown) =>
  err instanceof Error
    ? err.message
    : typeof err === 'string'
    ? err
    : 'Unknown error';

export default function ChatScreen() {
  const {
    params: { chatId, title },
  } = useRoute<ChatRoute>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [inputH, setInputH] = useState(56);
  const [text, setText] = useState('');
  const [, setKeyboardShown] = useState(false);
  const [kb, setKb] = useState(0);
  const listRef = useRef<FlatList<Message>>(null);

  const keyExtractor = useCallback((m: Message) => m.id, []);

  const handleDelete = useCallback(
    async (m: Message) => {
      try {
        await database().ref(`messages/${chatId}/${m.id}`).remove();
        if (m.type === 'image' && m.imageUrl) {
          try {
            await storage().refFromURL(m.imageUrl).delete();
          } catch {
            // ignore if already deleted or no permission
          }
        }
      } catch (e) {
        Alert.alert('Delete failed', errorMessage(e));
      }
    },
    [chatId],
  );

  const renderItem = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubble msg={item} onDelete={handleDelete} />
    ),
    [handleDelete],
  );

  useLayoutEffect(() => {
    //set initial header title from route
    navigation.setOptions({ title: title ?? 'Chat' });
  }, [navigation, title]);

  useEffect(() => {
    //live-update title from RTDB if it changes
    const ref = database().ref(`chats/${chatId}/title`);
    const handler = ref.on('value', snap => {
      const t = snap.val();
      if (t && typeof t === 'string') navigation.setOptions({ title: t });
    });
    return () => ref.off('value', handler);
  }, [chatId, navigation]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () =>
      setKeyboardShown(true),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardShown(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      'keyboardDidShow',
      (e: KeyboardEvent) => {
        setKb(e.endCoordinates.height);
      },
    );
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKb(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const msgQuery = useMemo(
    () =>
      database()
        .ref(`messages/${chatId}`)
        .orderByChild('createdAt')
        .limitToLast(100),
    [chatId],
  );

  const asNum = (t: unknown) => (typeof t === 'number' ? t : 0);

  const messages = useRealtimeList<Message>(
    msgQuery,
    snap => ({ id: snap.key!, ...(snap.val() as Omit<Message, 'id'>) }),
    'value',
    { sort: (a, b) => asNum(a.createdAt) - asNum(b.createdAt) }, // oldest → newest
  );

  const dataNewestFirst = useMemo(() => [...messages].reverse(), [messages]);

  const onSend = useCallback(async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    try {
      await sendTextMessage(chatId, t);
    } catch (e) {
      Alert.alert('Send failed', errorMessage(e));
    }
  }, [chatId, text]);

  const onPickImage = useCallback(async () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 1,
    };
    const res = await launchImageLibrary(options);
    if (res.didCancel) return;
    const asset: Asset | undefined = res.assets?.[0];
    if (!asset?.uri) return;

    try {
      await sendImageMessage(chatId, asset.uri);
    } catch (e) {
      Alert.alert('Upload failed', errorMessage(e));
    }
  }, [chatId]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.view, { paddingBottom: kb }]}>
        <FlatList
          ref={listRef}
          data={dataNewestFirst}
          inverted
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.flatlistContainer}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={7}
          removeClippedSubviews
        />

        <MessageInput
          text={text}
          setText={setText}
          onSend={onSend}
          onPickImage={onPickImage}
          onLayout={e => setInputH(e.nativeEvent.layout.height)}
          containerStyle={{
            paddingBottom: 8 + insets.bottom,
            minHeight: inputH,
          }}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  view: { flex: 1 },
  flatlistContainer: { padding: 12 },
});
