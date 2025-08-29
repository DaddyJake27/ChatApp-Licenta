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

type ChatMetaNode = {
  title?: string | null;
  isGroup?: boolean;
};

export const serverTimestamp: RTDBServerTimestamp = ServerValue.TIMESTAMP;

const emailToKey = (email: string) =>
  email.trim().toLowerCase().replace(/\./g, ',');
const db = getDatabase();
const auth = getAuth();

const dmIdOf = (a: string, b: string) => {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
};

function requireUid(): string {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not signed in');
  }
  return user.uid;
}

async function getDisplayName(uid: string): Promise<string | null> {
  const snap = await get(ref(db, `usersPublic/${uid}/displayName`));
  const v = snap.val();
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

export async function ensureUserDirectory() {
  const u = getAuth().currentUser;
  if (!u?.email) return;

  const key = emailToKey(u.email);
  const createdAtRef = ref(db, `usersPublic/${u.uid}/createdAt`);

  const createdAtSnap = await get(createdAtRef);

  const updates: Record<string, unknown> = {
    [`usersPublic/${u.uid}/displayName`]: u.displayName ?? null,
    [`usersPublic/${u.uid}/emailLower`]: u.email.trim().toLowerCase(),
    [`usersPublic/${u.uid}/photoURL`]: u.photoURL ?? null,
    [`emailToUid/${key}`]: u.uid,
  };

  if (!createdAtSnap.exists()) {
    updates[`usersPublic/${u.uid}/createdAt`] = ServerValue.TIMESTAMP;
  }

  await update(ref(db), updates);
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
      title: null,
      members: { [me]: true, [other]: true },
      updatedAt: serverTimestamp as RTDBTimestamp,
    });

    await initUserChatsMetaDM(chatId, me, other);
    await postSystemMessage(chatId, `Started a direct chat.`);
  } else {
    // Chat exists but make sure userChats has titles
    await initUserChatsMetaDM(chatId, me, other);
  }

  return chatId;
}

export async function createGroupByEmails(
  title: string | null,
  emails: string[],
  localImagePath?: string | null,
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

  if (localImagePath) {
    const storage = getStorage();
    const filePath = `group_avatars/${chatId}/${me}/${Date.now()}.jpg`;
    const sref = storageRef(storage, filePath);
    await putFile(sref, localImagePath);
    const url = await getDownloadURL(sref);
    await update(ref(db, `chats/${chatId}`), { photoURL: url });
  }

  await initUserChatsMetaGroup(chatId, members, true, title ?? null);
  await postSystemMessage(chatId, `Chat created.`);

  return chatId;
}

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

  try {
    await sendTextMessage(chatId, 'left the chat');
  } catch {
    // If this fails (rare), still proceed to leave.
  }

  await update(ref(db), {
    [`chats/${chatId}/members/${me}`]: null,
    [`chats/${chatId}/lastRead/${me}`]: null,
    [`chats/${chatId}/leftAt/${me}`]: ServerValue.TIMESTAMP,
  });
}

export async function deleteChat(chatId: string) {
  const me = requireUid();

  // Load chat meta (creator, members, leftAt) once
  const chatSnap = await get(ref(db, `chats/${chatId}`));
  if (!chatSnap.exists()) return;
  const chat = chatSnap.val() as {
    createdBy: string;
    members?: Record<string, true>;
    leftAt?: Record<string, number>;
  };
  if (chat.createdBy !== me)
    throw new Error('Only the chat creator can delete this chat.');

  // Build the set of all participants (current members + past leavers + creator)
  const memberIds = Object.keys(chat.members || {});
  const leavers = Object.keys(chat.leftAt || {});
  const allUids = Array.from(
    new Set([...memberIds, ...leavers, chat.createdBy]),
  );

  // STEP 1: remove /userChats rows for all participants
  const updates1: Record<string, null> = {};
  for (const uid of allUids) {
    updates1[`userChats/${uid}/${chatId}`] = null;
  }
  await update(ref(db), updates1);

  // STEP 2: Delete Storage images referenced by messages
  const msgsSnap = await get(ref(db, `messages/${chatId}`));
  const storage = getStorage();
  const deletions: Promise<void>[] = [];
  msgsSnap.forEach(msg => {
    const v = msg.val();
    if (v?.type === 'image' && v.imagePath) {
      deletions.push(
        deleteObject(storageRef(storage, v.imagePath)).catch(() => {}),
      );
    }
    return undefined;
  });
  await Promise.all(deletions);

  // STEP 3: delete messages + chat
  await update(ref(db), {
    [`messages/${chatId}`]: null,
    [`chats/${chatId}`]: null,
  });
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
  const meta = metaSnap.exists() ? (metaSnap.val() as ChatMetaNode) : {};
  const isGroup = !!meta.isGroup;
  const groupTitle = typeof meta.title === 'string' ? meta.title : null;

  const updates: Record<string, unknown> = {};
  Object.keys(members).forEach(uid => {
    const base = `userChats/${uid}/${chatId}`;
    updates[`${base}/isGroup`] = isGroup;
    updates[`${base}/lastMessagePreview`] = preview;
    updates[`${base}/lastMessageAt`] = at;
    updates[`${base}/lastMessageSender`] = senderId;
    updates[`${base}/lastMessageType`] = type;

    // Only groups get a shared title; DMs keep their existing per-user nickname
    if (isGroup && groupTitle !== null) {
      updates[`${base}/title`] = groupTitle;
    }
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
async function initUserChatsMetaGroup(
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

// initUserChatsMetaDM exclusive for DMs
async function initUserChatsMetaDM(chatId: string, me: string, other: string) {
  const [myName, otherName] = await Promise.all([
    getDisplayName(me),
    getDisplayName(other),
  ]);

  const now = Date.now();
  const updates: Record<string, unknown> = {};

  updates[`userChats/${me}/${chatId}`] = {
    title: otherName ?? 'Direct chat',
    isGroup: false,
    lastMessagePreview: '',
    lastMessageAt: now,
    lastMessageSender: '',
    lastMessageType: 'text',
  };

  updates[`userChats/${other}/${chatId}`] = {
    title: myName ?? 'Direct chat',
    isGroup: false,
    lastMessagePreview: '',
    lastMessageAt: now,
    lastMessageSender: '',
    lastMessageType: 'text',
  };

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
