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
  Modal,
  Text,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import type { KeyboardEvent } from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import {
  getDatabase,
  ref as dbRef,
  query,
  orderByChild,
  limitToLast,
  onValue,
  set as dbSet,
  remove as dbRemove,
  ServerValue,
  type DataSnapshot,
} from '@react-native-firebase/database';
import {
  getStorage,
  ref as storageRef,
  deleteObject,
} from '@react-native-firebase/storage';
import {
  RouteProp,
  useRoute,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import { AppStackParamList } from '@navigation/AppNavigator';
import { sendImageMessage, sendTextMessage, Message } from '@services/db';
import useRealtimeList from '@hooks/useRealtimeList';
import {
  launchImageLibrary,
  launchCamera,
  type ImageLibraryOptions,
  type CameraOptions,
  type Asset,
} from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MessageBubble from '@components/MessageBubble';
import MessageInput from '@components/MessageInput';

const galleryOptions: ImageLibraryOptions = {
  mediaType: 'photo',
  quality: 0.7 as const,
  maxWidth: 1600,
  maxHeight: 1600,
  selectionLimit: 1,
};

const cameraOptions: CameraOptions = {
  mediaType: 'photo',
  quality: 0.7 as const,
  maxWidth: 1600,
  maxHeight: 1600,
  saveToPhotos: false,
};

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
  const [preview, setPreview] = useState<{ uri: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const keyExtractor = useCallback((m: Message) => m.id, []);

  const handleDelete = useCallback(
    async (m: Message) => {
      try {
        await dbRemove(dbRef(getDatabase(), `messages/${chatId}/${m.id}`));
        if (m.type === 'image' && m.imageUrl) {
          try {
            const r = storageRef(getStorage(), m.imageUrl);
            await deleteObject(r);
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
    const r = dbRef(getDatabase(), `chats/${chatId}/title`);
    const unsubscribe = onValue(r, (snap: DataSnapshot) => {
      const t = snap.val();
      if (t && typeof t === 'string') navigation.setOptions({ title: t });
    });
    return unsubscribe;
  }, [chatId, navigation]);

  useFocusEffect(
    useCallback(() => {
      // on screen focus → update immediately
      const uid = getAuth().currentUser?.uid;
      if (!uid) return;
      const r = dbRef(getDatabase(), `chats/${chatId}/lastRead/${uid}`);
      dbSet(r, ServerValue.TIMESTAMP).catch(() => {});
      return () => {
        // on screen blur (exit) → update again
        dbSet(r, ServerValue.TIMESTAMP).catch(() => {});
      };
    }, [chatId]),
  );

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
      query(
        dbRef(getDatabase(), `messages/${chatId}`),
        orderByChild('createdAt'),
        limitToLast(100),
      ),
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

  useEffect(() => {
    // Preload up to the last 10 image URLs
    const urls = messages
      .filter(m => m.type === 'image' && m.imageUrl)
      .slice(-10)
      .map(m => ({ uri: m.imageUrl! }));

    if (urls.length) {
      FastImage.preload(urls);
    }
  }, [messages]);

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
    const res = await launchImageLibrary(galleryOptions);
    if (res.didCancel) return;
    const asset: Asset | undefined = res.assets?.[0];
    if (asset?.uri) setPreview({ uri: asset.uri });
  }, []);

  const onTakePhoto = useCallback(async () => {
    const res = await launchCamera(cameraOptions);
    if (res.didCancel) return;
    const asset: Asset | undefined = res.assets?.[0];
    if (asset?.uri) setPreview({ uri: asset.uri });
  }, []);

  const sendPreview = useCallback(async () => {
    if (!preview?.uri) return;
    setUploading(true);
    try {
      await sendImageMessage(chatId, preview.uri);
      setPreview(null);
    } catch (e) {
      Alert.alert('Upload failed', errorMessage(e));
    } finally {
      setUploading(false);
    }
  }, [chatId, preview]);

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
          onTakePhoto={onTakePhoto}
          onLayout={e => setInputH(e.nativeEvent.layout.height)}
          containerStyle={{
            paddingBottom: 8 + insets.bottom,
            minHeight: inputH,
          }}
        />
        <Modal
          visible={!!preview}
          transparent
          animationType="slide"
          onRequestClose={() => setPreview(null)}
        >
          <View style={styles.backdrop}>
            <View style={styles.card}>
              {preview?.uri ? (
                <FastImage
                  source={{
                    uri: preview.uri,
                    cache: FastImage.cacheControl.immutable,
                    priority: FastImage.priority.high,
                  }}
                  resizeMode={FastImage.resizeMode.contain}
                  style={styles.previewImg}
                />
              ) : null}

              <View style={styles.actions}>
                <Pressable
                  style={[styles.btn, styles.btnGhost]}
                  onPress={() => setPreview(null)}
                  disabled={uploading}
                >
                  <Text style={[styles.btnText, styles.btnGhostText]}>
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={sendPreview}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Send</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  view: { flex: 1 },
  flatlistContainer: { padding: 12 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 12,
    paddingBottom: 16,
  },
  previewImg: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    backgroundColor: '#eee',
  },
  actions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  btn: {
    minWidth: 96,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnPrimary: { backgroundColor: '#111' },
  btnPrimaryText: { color: '#fff', fontWeight: '600' },
  btnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  btnText: { fontSize: 15 },
  btnGhostText: { color: '#111', fontWeight: '600' },
});
