import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { RouteProp, useRoute } from '@react-navigation/native';
import { sendImageMessage, sendTextMessage, Message } from '@services/db';
import useRealtimeList from '@hooks/useRealtimeList';
import {
  launchImageLibrary,
  type ImageLibraryOptions,
  type Asset,
} from 'react-native-image-picker';

type ChatRoute = RouteProp<{ Chat: { chatId: string } }, 'Chat'>;

const errorMessage = (err: unknown) =>
  err instanceof Error
    ? err.message
    : typeof err === 'string'
    ? err
    : 'Unknown error';

export default function ChatScreen() {
  const {
    params: { chatId },
  } = useRoute<ChatRoute>();
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<Message>>(null);

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
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.flatlistContainer}
        />
        <View style={styles.inputRow}>
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
            blurOnSubmit={false}
            onFocus={() => {
              // sanity log + keep view scrolled to end
              console.log('Input focused');
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
});
