import {
  getDatabase,
  ref,
  query,
  orderByChild,
  equalTo,
  limitToLast,
  push,
  set,
  update,
  ServerValue,
  type Query,
} from '@react-native-firebase/database';
import { getAuth } from '@react-native-firebase/auth';
import {
  getStorage,
  ref as storageRef,
  putFile,
  getDownloadURL,
} from '@react-native-firebase/storage';
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
    imageUrl?: string;
    createdAt: RTDBTimestamp;
    senderId: string;
  };
  updatedAt?: RTDBTimestamp;
  lastRead?: Record<string, RTDBTimestamp>;
  unreadCount?: number;
};

export type Message = {
  id: string;
  senderId: string;
  type: 'text' | 'image';
  text?: string;
  imageUrl?: string;
  createdAt: RTDBTimestamp;
};

export const serverTimestamp: RTDBServerTimestamp = ServerValue.TIMESTAMP;

function requireUid(): string {
  const user = getAuth().currentUser;
  if (!user) {
    throw new Error('Not signed in');
  }
  return user.uid;
}

export function chatsQueryForCurrentUser(limit = 50): Query {
  const db = getDatabase();
  const uid = requireUid();

  return query(
    ref(db, 'chats'),
    orderByChild(`members/${uid}`),
    equalTo(true),
    limitToLast(limit),
  );
}

export async function sendTextMessage(chatId: string, text: string) {
  const db = getDatabase();
  const uid = requireUid();

  const msgRef = push(ref(db, `messages/${chatId}`));
  const payload = {
    senderId: uid,
    type: 'text' as const,
    text: text.trim(),
    createdAt: serverTimestamp as RTDBTimestamp,
  };

  await set(msgRef, payload);

  await update(ref(db, `chats/${chatId}`), {
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
  const db = getDatabase();
  const uid = requireUid();

  const filename = `${Date.now()}_${uid}.jpg`;
  const sref = storageRef(getStorage(), `chat_images/${chatId}/${filename}`);
  await putFile(sref, localPath);
  const imageUrl = await getDownloadURL(sref);

  const msgRef = push(ref(db, `messages/${chatId}`));
  const payload = {
    senderId: uid,
    type: 'image' as const,
    imageUrl,
    createdAt: serverTimestamp as RTDBTimestamp,
  };

  await set(msgRef, payload);

  await update(ref(db, `chats/${chatId}`), {
    lastMessage: {
      type: 'image',
      createdAt: serverTimestamp as RTDBTimestamp,
      senderId: uid,
      text: '[image]',
    },
    updatedAt: serverTimestamp as RTDBTimestamp,
  });
}
