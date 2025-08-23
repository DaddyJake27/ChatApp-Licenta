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
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import database from '@react-native-firebase/database';
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
  const [keyboardShown, setKeyboardShown] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const keyExtractor = useCallback((m: Message) => m.id, []);

  const renderItem = useCallback(
    ({ item }: { item: Message }) => <MessageBubble msg={item} />,
    [],
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

  const onSend = useCallback(async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    try {
      await sendTextMessage(chatId, t);
      listRef.current?.scrollToEnd({ animated: true });
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
      listRef.current?.scrollToEnd({ animated: true });
    } catch (e) {
      Alert.alert('Upload failed', errorMessage(e));
    }
  }, [chatId]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 85}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.flatlistContainer}
          ListFooterComponent={<View style={styles.listFooterComp} />}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={7}
          removeClippedSubviews
          onContentSizeChange={() => {
            if (!keyboardShown)
              listRef.current?.scrollToEnd({ animated: true });
          }}
          onLayout={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        <MessageInput
          text={text}
          setText={setText}
          onSend={onSend}
          onPickImage={onPickImage}
          onFocus={() => listRef.current?.scrollToEnd({ animated: true })}
          onLayout={e => setInputH(e.nativeEvent.layout.height)}
          containerStyle={{
            paddingBottom: 8 + insets.bottom,
            minHeight: inputH,
          }}
        />
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: { flex: 1 },
  flatlistContainer: { padding: 12 },
  listFooterComp: { height: 8 },
});
