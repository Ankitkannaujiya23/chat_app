import { DocumentSnapshot, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { firestore } from '../config/firebase';
import { LastSeen, Message } from '../types';
import { AppError } from '../utils/errors';

interface StoredMessage {
  senderId: number;
  text: string;
  createdAt: Timestamp;
  editedAt: Timestamp | null;
  deleted: boolean;
  readBy: Record<string, Timestamp>;
}

function chatDoc(chatId: number) {
  return firestore.collection('chats').doc(String(chatId));
}

function messagesCollection(chatId: number) {
  return chatDoc(chatId).collection('messages');
}

function lastSeenCollection(chatId: number) {
  return chatDoc(chatId).collection('lastSeen');
}

function toMessage(chatId: number, snapshot: DocumentSnapshot): Message {
  const data = snapshot.data() as StoredMessage;
  const readBy: Record<string, string> = {};
  for (const [userId, readAt] of Object.entries(data.readBy ?? {})) {
    readBy[userId] = readAt.toDate().toISOString();
  }
  return {
    id: snapshot.id,
    chatId,
    senderId: data.senderId,
    text: data.deleted ? '' : data.text,
    createdAt: data.createdAt.toDate().toISOString(),
    editedAt: data.editedAt ? data.editedAt.toDate().toISOString() : null,
    deleted: data.deleted,
    readBy
  };
}

async function requireMessage(chatId: number, messageId: string): Promise<DocumentSnapshot> {
  const snapshot = await messagesCollection(chatId).doc(messageId).get();
  if (!snapshot.exists) {
    throw new AppError(404, 'Message not found');
  }
  return snapshot;
}

export async function sendMessage(chatId: number, senderId: number, text: string): Promise<Message> {
  const ref = messagesCollection(chatId).doc();
  await ref.set({
    senderId,
    text,
    createdAt: FieldValue.serverTimestamp(),
    editedAt: null,
    deleted: false,
    readBy: {}
  });
  return toMessage(chatId, await ref.get());
}

export async function getMessages(chatId: number, limit: number): Promise<Message[]> {
  const snapshot = await messagesCollection(chatId).orderBy('createdAt', 'desc').limit(limit).get();
  return snapshot.docs.map((doc) => toMessage(chatId, doc)).reverse();
}

export async function markRead(chatId: number, messageId: string, userId: number): Promise<Message> {
  const snapshot = await requireMessage(chatId, messageId);
  const data = snapshot.data() as StoredMessage;

  if (data.senderId === userId) {
    throw new AppError(400, 'Sender cannot mark their own message as read');
  }
  if (data.readBy?.[String(userId)]) {
    return toMessage(chatId, snapshot);
  }

  await snapshot.ref.update({ [`readBy.${userId}`]: FieldValue.serverTimestamp() });
  return toMessage(chatId, await snapshot.ref.get());
}

export async function updateLastSeen(chatId: number, userId: number, messageId: string): Promise<LastSeen> {
  await requireMessage(chatId, messageId);
  await lastSeenCollection(chatId).doc(String(userId)).set({
    messageId,
    updatedAt: FieldValue.serverTimestamp()
  });
  return { userId, messageId };
}

export async function editMessage(
  chatId: number,
  messageId: string,
  senderId: number,
  text: string
): Promise<Message> {
  const snapshot = await requireMessage(chatId, messageId);
  const data = snapshot.data() as StoredMessage;

  if (data.senderId !== senderId) {
    throw new AppError(403, 'Only the sender can edit this message');
  }
  if (data.deleted) {
    throw new AppError(409, 'Message was deleted');
  }

  await snapshot.ref.update({ text, editedAt: FieldValue.serverTimestamp() });
  return toMessage(chatId, await snapshot.ref.get());
}

export async function deleteMessage(chatId: number, messageId: string, senderId: number): Promise<Message> {
  const snapshot = await requireMessage(chatId, messageId);
  const data = snapshot.data() as StoredMessage;

  if (data.senderId !== senderId) {
    throw new AppError(403, 'Only the sender can delete this message');
  }

  await snapshot.ref.update({ deleted: true, text: '' });
  return toMessage(chatId, await snapshot.ref.get());
}
