import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';
import { RTDBTimestamp, RTDBServerTimestamp } from '@utils/types';

export type Chat = {
  id: string;
  members: Record<string, true>;
  isGroup?: boolean;
  title?: string;
  photoURL?: string;
  lastMessage?: {
    text?: string;
    type: 'text' | 'image';
    createdAt: RTDBTimestamp;
    senderId: string;
  };
  updatedAt?: RTDBTimestamp;
};

export type Message = {
  id: string;
  senderId: string;
  type: 'text' | 'image';
  text?: string;
  imageUrl?: string;
  createdAt: RTDBTimestamp;
};

export const serverTimestamp: RTDBServerTimestamp =
  database.ServerValue.TIMESTAMP;

function requireUid(): string {
  const user = auth().currentUser;
  if (!user) {
    throw new Error('Not signed in');
  }
  return user.uid;
}

export function chatsQueryForCurrentUser(limit = 50) {
  const uid = requireUid();
  return database()
    .ref('chats')
    .orderByChild(`members/${uid}`)
    .equalTo(true)
    .limitToLast(limit);
}

export async function sendTextMessage(chatId: string, text: string) {
  const uid = requireUid();

  const msgRef = database().ref(`messages/${chatId}`).push();
  const payload = {
    senderId: uid,
    type: 'text' as const,
    text: text.trim(),
    createdAt: serverTimestamp as RTDBTimestamp,
  };
  await msgRef.set(payload);

  await database()
    .ref(`chats/${chatId}`)
    .update({
      lastMessage: {
        text: payload.text,
        type: 'text',
        createdAt: serverTimestamp as RTDBTimestamp,
        senderId: uid,
      },
      updatedAt: serverTimestamp as RTDBTimestamp,
    });
}

export async function sendImageMessage(chatId: string, localPath: string) {
  const uid = requireUid();

  const filename = `${Date.now()}_${uid}.jpg`;
  const ref = storage().ref(`chat_images/${chatId}/${filename}`);
  await ref.putFile(localPath);
  const imageUrl = await ref.getDownloadURL();

  const msgRef = database().ref(`messages/${chatId}`).push();
  const payload = {
    senderId: uid,
    type: 'image' as const,
    imageUrl,
    createdAt: serverTimestamp as RTDBTimestamp,
  };
  await msgRef.set(payload);

  await database()
    .ref(`chats/${chatId}`)
    .update({
      lastMessage: {
        type: 'image',
        createdAt: serverTimestamp as RTDBTimestamp,
        senderId: uid,
        text: '[image]',
      },
      updatedAt: serverTimestamp as RTDBTimestamp,
    });
}
