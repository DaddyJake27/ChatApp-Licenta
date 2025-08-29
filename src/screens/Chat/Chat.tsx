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
  get,
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
import {
  sendImageMessage,
  sendTextMessage,
  Message,
  refreshChatLastMessage,
  leaveChat,
  deleteGroupChat,
  deleteChatForSelf,
} from '@services/db';
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
import { colorForUid } from '@utils/helpers';

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

function HeaderActionButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text style={styles.headerLeave}>{label}</Text>
    </Pressable>
  );
}
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
  const suppressLastReadRef = useRef(false);

  const [inputH, setInputH] = useState(56);
  const [text, setText] = useState('');
  const [, setKeyboardShown] = useState(false);
  const [kb, setKb] = useState(0);
  const listRef = useRef<FlatList<Message>>(null);
  const [preview, setPreview] = useState<{ uri: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [nameByUid, setNameByUid] = useState<Record<string, string>>({});
  const [colorByUid, setColorByUid] = useState<Record<string, string>>({});
  const me = getAuth().currentUser?.uid;
  const [headerAvatarUrl, setHeaderAvatarUrl] = useState<string | null>(null);
  const [headerInitial, setHeaderInitial] = useState<string>('');
  const [headerTitleText, setHeaderTitleText] = useState(title ?? 'Chat');

  const keyExtractor = useCallback((m: Message) => m.id, []);

  const confirmLeaveGroup = useCallback(() => {
    Alert.alert(
      'Leave group chat?',
      'You will no longer receive messages from this group chat.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveChat(chatId);
              navigation.goBack(); // or nav.popToTop()
            } catch (e) {
              Alert.alert('Could not leave', errorMessage(e));
            }
          },
        },
      ],
    );
  }, [chatId, navigation]);

  const confirmDeleteDM = useCallback(() => {
    Alert.alert(
      'Delete chat?',
      "This removes the chat from your list only. It won't delete messages or affect the other person.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              suppressLastReadRef.current = true;
              await deleteChatForSelf(chatId);
              navigation.goBack();
            } catch (e) {
              Alert.alert('Could not delete', errorMessage(e));
            }
          },
        },
      ],
    );
  }, [chatId, navigation]);

  const confirmDeleteGroup = useCallback(() => {
    Alert.alert(
      'Delete group chat?',
      'This removes all messages and images for everyone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              suppressLastReadRef.current = true;
              await deleteGroupChat(chatId);
              navigation.goBack();
            } catch (e) {
              Alert.alert('Could not delete', errorMessage(e));
            }
          },
        },
      ],
    );
  }, [chatId, navigation]);

  const handleDelete = useCallback(
    async (m: Message) => {
      const uid = getAuth().currentUser?.uid;

      if (!uid) {
        Alert.alert('Sign in required', 'Please sign in to delete messages.');
        return;
      }

      if (m.senderId !== uid) {
        Alert.alert('Not allowed', 'You can only delete your own messages.');
        return;
      }
      try {
        // remove the RTDB message
        await dbRemove(dbRef(getDatabase(), `messages/${chatId}/${m.id}`));

        // if it's an image, delete by imagePath
        if (m.type === 'image' && m.imagePath) {
          await deleteObject(storageRef(getStorage(), m.imagePath));
        }
        await refreshChatLastMessage(chatId);
      } catch (e) {
        Alert.alert('Delete failed', errorMessage(e));
      }
    },
    [chatId],
  );

  const [isGroup, setIsGroup] = useState(false);

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

  const renderItem = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const mine = item.senderId === me;
      const next = dataNewestFirst[index + 1]; // chronologically previous
      const firstOfRun = !next || next.senderId !== item.senderId;
      const showAuthorLabel = isGroup && !mine && firstOfRun;

      return (
        <MessageBubble
          msg={item}
          onDelete={handleDelete}
          showAuthorLabel={showAuthorLabel}
          authorName={nameByUid[item.senderId]}
          authorColor={colorByUid[item.senderId]}
        />
      );
    },
    [handleDelete, isGroup, dataNewestFirst, nameByUid, colorByUid, me],
  );

  const [isCreator, setIsCreator] = useState(false);
  const [amMember, setAmMember] = useState(true);

  const renderHeaderRight = useCallback(() => {
    // Show Delete only for the creator of a group, for members show Leave.
    if (isGroup) {
      const showDelete = isCreator;
      return (
        <HeaderActionButton
          label={showDelete ? 'Delete group' : 'Leave group'}
          onPress={showDelete ? confirmDeleteGroup : confirmLeaveGroup}
        />
      );
    }
    // DM only
    return <HeaderActionButton label="Delete chat" onPress={confirmDeleteDM} />;
  }, [
    isGroup,
    isCreator,
    confirmDeleteGroup,
    confirmLeaveGroup,
    confirmDeleteDM,
  ]);

  const HeaderTitle = useCallback(() => {
    return (
      <View style={styles.headerTitle}>
        {/* Avatar */}
        <View style={styles.headerAvatar}>
          {headerAvatarUrl ? (
            <FastImage
              source={{ uri: headerAvatarUrl }}
              style={styles.headerImg}
              resizeMode={FastImage.resizeMode.cover}
            />
          ) : (
            <Text style={styles.headerInit}>{headerInitial || '👥'}</Text>
          )}
        </View>

        {/* Title (live) */}
        <Text numberOfLines={1} style={styles.headerTitleText}>
          {headerTitleText}
        </Text>
      </View>
    );
  }, [headerAvatarUrl, headerInitial, headerTitleText]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitleAlign: 'left',
      headerRight: renderHeaderRight,
      headerTitle: HeaderTitle,
    });
  }, [navigation, renderHeaderRight, HeaderTitle]);

  useEffect(() => {
    const r = dbRef(getDatabase(), `chats/${chatId}`);
    const unsub = onValue(r, async (snap: DataSnapshot) => {
      const val = snap.val() || {};

      //live-update title from RTDB if it changes
      if (typeof val.title === 'string' && val.title.trim()) {
        setHeaderTitleText(val.title.trim());
        navigation.setOptions({ title: val.title.trim() });
      }

      const currentUid = getAuth().currentUser?.uid;
      setIsGroup(!!val.isGroup);
      setAmMember(
        !!(currentUid && val.members && val.members[currentUid] === true),
      );

      // creator check using the snapshot value
      const isCreatorNow =
        !!currentUid &&
        typeof val.createdBy === 'string' &&
        val.createdBy === currentUid;
      setIsCreator(isCreatorNow);

      try {
        if (val.isGroup) {
          // group: prefer group photoURL; fallback to first letter of title
          setHeaderAvatarUrl(
            typeof val.photoURL === 'string' ? val.photoURL : null,
          );
          const t = typeof val.title === 'string' ? val.title.trim() : '';
          setHeaderInitial(t ? t[0].toUpperCase() : '👥');
        } else {
          // DM: pick the other member; fetch their public avatar + name
          const memObj = (val.members ?? {}) as Record<string, true>;
          const uids = Object.keys(memObj);
          const otherUid = uids.find(u => u !== currentUid) ?? null;

          if (!otherUid) {
            setHeaderAvatarUrl(null);
            setHeaderInitial('🙂');
          } else {
            const db = getDatabase();
            const [photoSnap, nameSnap] = await Promise.all([
              get(dbRef(db, `usersPublic/${otherUid}/photoURL`)),
              get(dbRef(db, `usersPublic/${otherUid}/displayName`)),
            ]);
            const photo = photoSnap.exists() ? String(photoSnap.val()) : null;
            const name = nameSnap.exists() ? String(nameSnap.val()).trim() : '';
            setHeaderAvatarUrl(photo || null);
            setHeaderInitial(name ? name[0].toUpperCase() : '🙂');
            if (!val.title && name) setHeaderTitleText(name); // if DM has no custom title
          }
        }
      } catch {
        // keep current avatar/initial
      }

      const memObj = (val.members ?? {}) as Record<string, true>;
      const uids = Object.keys(memObj);
      if (!uids.length) {
        setNameByUid({});
        setColorByUid({});
        return;
      }

      const db = getDatabase();
      const pairs = await Promise.all(
        uids.map(async uid => {
          const s = await get(dbRef(db, `usersPublic/${uid}/displayName`));
          const n = (s.val() ?? '') as string;
          return [uid, (n || '').trim()] as const;
        }),
      );
      setNameByUid(Object.fromEntries(pairs));
      setColorByUid(
        Object.fromEntries(uids.map(uid => [uid, colorForUid(uid)])),
      );
    });
    return unsub;
  }, [chatId, navigation]);

  useFocusEffect(
    useCallback(() => {
      // on screen focus → update immediately
      const uid = getAuth().currentUser?.uid;
      if (!uid) return;

      const db = getDatabase();
      const rChats = dbRef(db, `chats/${chatId}/lastRead/${uid}`);
      const rUser = dbRef(db, `userChats/${uid}/${chatId}/lastRead`);

      if (!suppressLastReadRef.current) {
        dbSet(rChats, ServerValue.TIMESTAMP).catch(() => {});
        dbSet(rUser, ServerValue.TIMESTAMP).catch(() => {});
      }

      return () => {
        // on screen blur (exit) → update again
        if (!suppressLastReadRef.current) {
          dbSet(rChats, ServerValue.TIMESTAMP).catch(() => {});
          dbSet(rUser, ServerValue.TIMESTAMP).catch(() => {});
        }
        suppressLastReadRef.current = false; // reset for next time
      };
    }, [chatId]),
  );

  useEffect(() => {
    const uidsInMessages = Array.from(
      new Set(dataNewestFirst.map(m => m.senderId)),
    );
    const missing = uidsInMessages.filter(uid => !nameByUid[uid]);
    if (missing.length === 0) return;

    const db = getDatabase();
    (async () => {
      const pairs = await Promise.all(
        missing.map(async uid => {
          const s = await get(dbRef(db, `usersPublic/${uid}/displayName`));
          const n = (s.val() ?? '') as string;
          return [uid, (n || '').trim()] as const;
        }),
      );
      setNameByUid(prev => ({ ...prev, ...Object.fromEntries(pairs) }));
    })();
  }, [dataNewestFirst, nameByUid]);

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
    if (!amMember) return;
    const t = text.trim();
    if (!t) return;
    setText('');
    try {
      await sendTextMessage(chatId, t);
    } catch (e) {
      Alert.alert('Send failed', errorMessage(e));
    }
  }, [amMember, chatId, text]);

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
          extraData={{ nameByUid, colorByUid, isGroup, dataNewestFirst }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.flatlistContainer}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={7}
          removeClippedSubviews
        />

        {amMember ? (
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
        ) : (
          <View style={[styles.banner, { paddingBottom: 8 + insets.bottom }]}>
            <Text style={styles.bannerTxt}>
              You can't send messages in this group because you're no longer a
              member.
            </Text>
          </View>
        )}
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
  headerLeave: { fontSize: 17, color: '#c00', fontWeight: '600' },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '85%',
    marginLeft: -17,
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 18,
    overflow: 'hidden',
    marginRight: 6,
    backgroundColor: '#6bdd6bff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerImg: { width: 34, height: 34 },
  headerInit: { fontWeight: '800', color: '#2e2e2e' },
  headerTitleText: { fontSize: 18, fontWeight: '600' },
  banner: { padding: 12, backgroundColor: '#ffffffff' },
  bannerTxt: {
    textAlign: 'center',
    padding: 10,
    borderRadius: 8,
    color: '#000000ff',
    backgroundColor: '#ffffffff',
  },
});
