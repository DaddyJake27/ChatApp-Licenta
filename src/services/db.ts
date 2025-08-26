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
  deleteObject,
} from '@react-native-firebase/storage';
import { RTDBTimestamp, RTDBServerTimestamp } from '@utils/types';

export type Chat = {
  id: string;
  members?: Record<string, true>;
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

const emailToKey = (email: string) =>
  email.trim().toLowerCase().replace(/\./g, ',');
const db = getDatabase();
const auth = getAuth();

const dmIdOf = (a: string, b: string) => {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
};

type ChatMetaNode = {
  title?: string | null;
  isGroup?: boolean;
};

function requireUid(): string {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not signed in');
  }
  return user.uid;
}

export async function ensureUserDirectory() {
  const u = getAuth().currentUser;
  if (!u?.email) return;

  const key = emailToKey(u.email);

  await update(ref(db), {
    [`usersPublic/${u.uid}`]: {
      displayName: u.displayName ?? null, // add function to set a nickname (displayName) & display in profile
      emailLower: u.email.trim().toLowerCase(),
      photoURL: u.photoURL ?? null, // add profile picture that sets photoURL
      createdAt: ServerValue.TIMESTAMP,
    },
    [`emailToUid/${key}`]: u.uid,
  });
}

export async function uidByEmail(email: string): Promise<string | null> {
  const key = emailToKey(email);
  const snap = await get(ref(db, `emailToUid/${key}`));
  return snap.exists() ? (snap.val() as string) : null;
}

export async function postSystemMessage(chatId: string, text: string) {
  await sendTextMessage(chatId, text);
}

export async function createDMByEmail(email: string) {
  const me = requireUid();
  const other = await uidByEmail(email);
  if (!other) throw new Error('No user matches that email.');
  if (other === me) throw new Error('You cannot DM yourself.');

  const chatId = dmIdOf(me, other);
  const chatRef = ref(db, `chats/${chatId}`);
  const snap = await get(chatRef);

  if (!snap.exists()) {
    await set(chatRef, {
      createdBy: me,
      isGroup: false,
      title: other ?? null, //modify title to show the other person's displayName [TESTING]
      members: { [me]: true, [other]: true },
      updatedAt: serverTimestamp as RTDBTimestamp,
    });

    await initUserChatsMeta(
      chatId,
      { [me]: true, [other]: true },
      false,
      other ?? null,
    );
    await postSystemMessage(chatId, `Started a direct chat.`);
  }

  return chatId;
}

export async function createGroupByEmails(
  title: string | null,
  emails: string[],
) {
  const me = requireUid();
  const uids = new Set<string>([me]);
  for (const e of emails) {
    const uid = await uidByEmail(e);
    if (uid) uids.add(uid);
  }
  if (uids.size < 2) throw new Error('Add at least one other member.');

  const chatRef = push(ref(db, 'chats'));
  const chatId = chatRef.key!;
  const members: Record<string, true> = {};
  uids.forEach(u => (members[u] = true));

  await set(chatRef, {
    createdBy: me,
    isGroup: true,
    title: title ?? null,
    members,
    updatedAt: serverTimestamp as RTDBTimestamp,
  });

  await initUserChatsMeta(chatId, members, true, title ?? null);
  await postSystemMessage(chatId, `Chat created.`);

  return chatId;
}

//NEEDS TESTING
export async function addMembersByEmails(chatId: string, emails: string[]) {
  const me = requireUid();
  const add: string[] = [];
  for (const e of emails) {
    const uid = await uidByEmail(e);
    if (uid) add.push(uid);
  }
  if (add.length === 0) return;

  const updates: Record<string, true> = {};
  for (const uid of add) {
    updates[`chats/${chatId}/members/${uid}`] = true;
  }
  await update(ref(db), updates);

  // Announce (single line; can be expanded to names if stored)
  await postSystemMessage(chatId, `User ${me} added ${add.join(', ')}.`);
}

export async function leaveChat(chatId: string) {
  const me = requireUid();

  // can later include displayName instead of chatId
  try {
    await sendTextMessage(chatId, 'left the chat');
  } catch {
    // If this fails (rare), still proceed to leave.
  }

  await update(ref(db), {
    [`chats/${chatId}/members/${me}`]: null,
    [`chats/${chatId}/lastRead/${me}`]: null,
  });
}

export async function deleteChat(chatId: string) {
  const me = requireUid();
  const creator = (await get(ref(db, `chats/${chatId}/createdBy`))).val();

  if (creator !== me)
    throw new Error('Only the chat creator can delete this chat.');

  // 1) collect all messages
  const msgsSnap = await get(ref(db, `messages/${chatId}`));

  // 2) delete any Storage files those messages reference
  const storage = getStorage();
  const deletions: Promise<void>[] = [];
  msgsSnap.forEach(msg => {
    const val = msg.val();
    if (val?.type === 'image' && val.imagePath) {
      const sref = storageRef(storage, val.imagePath);
      deletions.push(deleteObject(sref).catch(() => {})); // ignore missing files
    }
    return undefined;
  });
  await Promise.all(deletions);

  // 3) delete messages + chat metadata
  const updates: Record<string, unknown> = {};
  updates[`messages/${chatId}`] = null;
  updates[`chats/${chatId}`] = null;
  await update(ref(db), updates);
}

async function bumpUserChats(
  chatId: string,
  preview: string,
  at: number,
  senderId: string,
  type: 'text' | 'image',
) {
  const membersSnap = await get(ref(db, `chats/${chatId}/members`));
  if (!membersSnap.exists()) return;
  const members = (membersSnap.val() ?? {}) as Record<string, true>;

  const metaSnap = await get(ref(db, `chats/${chatId}`));
  let title: string | null = null;
  let isGroup = false;

  if (metaSnap.exists()) {
    const meta = (metaSnap.val() ?? {}) as ChatMetaNode;
    title = typeof meta.title === 'string' ? meta.title : null;
    isGroup = !!meta.isGroup;
  }

  const updates: Record<string, unknown> = {};
  Object.keys(members).forEach(uid => {
    updates[`userChats/${uid}/${chatId}`] = {
      title,
      isGroup: !!isGroup,
      lastMessagePreview: preview,
      lastMessageAt: at,
      lastMessageSender: senderId,
      lastMessageType: type,
    };
  });
  await update(ref(db), updates);
}

export function chatsQueryForCurrentUser(limit = 50): Query {
  const uid = requireUid();

  return query(
    ref(db, 'chats'),
    orderByChild(`members/${uid}`),
    equalTo(true),
    limitToLast(limit),
  );
}

export function userChatsQueryForCurrentUser(limit = 50): Query {
  const uid = requireUid();
  return query(
    ref(db, `userChats/${uid}`),
    orderByChild('lastMessageAt'),
    limitToLast(limit),
  );
}

// initUserChatsMeta seeds /userChats meta so a brand-new chat appears immediately
async function initUserChatsMeta(
  chatId: string,
  members: Record<string, true>,
  isGroup: boolean,
  title: string | null,
) {
  const updates: Record<string, unknown> = {};
  const now = Date.now();
  for (const uid of Object.keys(members)) {
    updates[`userChats/${uid}/${chatId}`] = {
      title,
      isGroup: !!isGroup,
      lastMessagePreview: '',
      lastMessageAt: now, // so new chat sorts to top
      lastMessageSender: '',
      lastMessageType: 'text', // placeholder
    };
  }
  await update(ref(db), updates);
}

export async function sendTextMessage(chatId: string, text: string) {
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
  await bumpUserChats(chatId, payload.text, Date.now(), uid, 'text');
}

export async function sendImageMessage(chatId: string, localPath: string) {
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
  await bumpUserChats(chatId, '[image]', Date.now(), uid, 'image');
}

export async function refreshChatLastMessage(chatId: string) {
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
