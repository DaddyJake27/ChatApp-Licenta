import {
  getDatabase,
  ref,
  query,
  orderByChild,
  equalTo,
  limitToLast,
  push,
  set,
  get,
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
  imagePath?: string;
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

  const imagePath = `chat_images/${chatId}/${uid}/${Date.now()}.jpg`;
  const sref = storageRef(getStorage(), imagePath);
  await putFile(sref, localPath);
  const imageUrl = await getDownloadURL(sref);

  const msgRef = push(ref(db, `messages/${chatId}`));
  const payload = {
    senderId: uid,
    type: 'image' as const,
    imageUrl,
    imagePath,
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

export async function refreshChatLastMessage(chatId: string) {
  const db = getDatabase();

  // newest remaining message
  const q = query(
    ref(db, `messages/${chatId}`),
    orderByChild('createdAt'),
    limitToLast(1),
  );
  const snap = await get(q);

  if (!snap.exists()) {
    // no messages left → clear summary
    await update(ref(db, `chats/${chatId}`), {
      lastMessage: null,
      updatedAt: null,
    });
    return;
  }

  // extract the single child
  let last!: { id: string } & Omit<Message, 'id'>;
  snap.forEach(child => {
    last = { id: child.key!, ...(child.val() as Omit<Message, 'id'>) };
    return true;
  });

  const lastMsg =
    last.type === 'text'
      ? {
          text: last.text,
          type: 'text' as const,
          createdAt: last.createdAt,
          senderId: last.senderId,
        }
      : {
          text: '[image]',
          type: 'image' as const,
          imageUrl: last.imageUrl,
          createdAt: last.createdAt,
          senderId: last.senderId,
        };

  // write back to chat summary; updatedAt = when that message was created
  await update(ref(db, `chats/${chatId}`), {
    lastMessage: lastMsg,
    updatedAt: last.createdAt,
  });
}
