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
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '@navigation/AppNavigator';
import { sendImageMessage, sendTextMessage, Message } from '@services/db';
import useRealtimeList from '@hooks/useRealtimeList';
import {
  launchImageLibrary,
  type ImageLibraryOptions,
  type Asset,
} from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ChatRoute = RouteProp<RootStackParamList, 'Chat'>;

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
  const [inputH, setInputH] = useState(56); // current input bar height
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<Message>>(null);
  const [keyboardShown, setKeyboardShown] = useState(false);

  useLayoutEffect(() => {
    //set initial header title from route
    navigation.setOptions({ title: title ?? 'Chat' });
  }, [navigation, title]);

  useEffect(() => {
    //live-update title from RTDB if it changes
    const ref = database().ref(`chats/${chatId}/title`);
    const handler = ref.on('value', snap => {
      const t = snap.val();
      if (t && typeof t === 'string') {
        navigation.setOptions({ title: t });
      }
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
    {
      sort: (a, b) => asNum(a.createdAt) - asNum(b.createdAt), // oldest → newest
    },
  );

  const onSend = useCallback(async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    try {
      await sendTextMessage(chatId, t);
      listRef.current?.scrollToEnd({ animated: true });
    } catch (e: unknown) {
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
    } catch (e: unknown) {
      Alert.alert('Upload failed', errorMessage(e));
    }
  }, [chatId]);

  const renderItem = ({ item }: { item: Message }) => {
    const mine = item.senderId === auth().currentUser?.uid;
    return (
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        {item.type === 'image' ? (
          <Image source={{ uri: item.imageUrl }} style={styles.imageSize} />
        ) : (
          <Text
            style={[styles.text, mine ? styles.textMine : styles.textTheirs]}
          >
            {item.text}
          </Text>
        )}
      </View>
    );
  };

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
          keyExtractor={m => m.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.flatlistContainer}
          ListFooterComponent={<View style={styles.listFooterComp} />}
          onContentSizeChange={() => {
            // Avoid fighting with the user while typing
            if (!keyboardShown)
              listRef.current?.scrollToEnd({ animated: true });
          }}
          onLayout={() => listRef.current?.scrollToEnd({ animated: true })}
        />
        <View
          style={[
            styles.inputRow,
            { paddingBottom: 8 + insets.bottom, minHeight: inputH },
          ]}
          onLayout={e => setInputH(e.nativeEvent.layout.height)}
        >
          <Pressable style={styles.iconBtn} onPress={onPickImage}>
            <Text style={styles.imageButton}>🖼️</Text>
          </Pressable>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message"
            style={styles.input}
            multiline
            editable
            onFocus={() => {
              listRef.current?.scrollToEnd({ animated: true });
            }}
          />
          <Pressable style={styles.sendBtn} onPress={onSend}>
            <Text style={styles.sendButtonText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  bubble: {
    padding: 10,
    borderRadius: 16,
    maxWidth: '80%',
    marginVertical: 4,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: '#4f93ff',
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: '#e23a3aff',
  },
  text: {
    fontSize: 16,
  },
  textMine: {
    color: '#fff',
  },
  textTheirs: {
    color: '#111',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 8,
    maxHeight: 120,
  },
  sendBtn: {
    backgroundColor: '#111',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  iconBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  imageSize: { width: 200, height: 200, borderRadius: 12 },
  keyboardAvoidingView: { flex: 1 },
  flatlistContainer: { padding: 12 },
  imageButton: { fontSize: 18 },
  sendButtonText: { color: 'white', fontWeight: '600' },
  listFooterComp: { height: 8 },
});
