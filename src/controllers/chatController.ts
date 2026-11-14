import { Request, Response } from 'express';
import { z } from 'zod';
import * as chatService from '../services/chatService';
import * as messageService from '../services/messageService';

const idSchema = z.coerce.number().int().positive();
const messageIdSchema = z.string().min(1).max(128);
const textSchema = z.string().trim().min(1).max(5000);

const createUserBody = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255)
});

const createChatBody = z.object({
  userAId: idSchema,
  userBId: idSchema
});

const chatParams = z.object({ chatId: idSchema });
const messageParams = z.object({ chatId: idSchema, messageId: messageIdSchema });
const userParams = z.object({ userId: idSchema });

const sendMessageBody = z.object({ senderId: idSchema, text: textSchema });
const getMessagesQuery = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) });
const userBody = z.object({ userId: idSchema });
const lastSeenBody = z.object({ userId: idSchema, messageId: messageIdSchema });
const editMessageBody = z.object({ senderId: idSchema, text: textSchema });
const deleteMessageBody = z.object({ senderId: idSchema });

export async function createUser(req: Request, res: Response): Promise<void> {
  const body = createUserBody.parse(req.body);
  const user = await chatService.registerUser(body.name, body.email);
  res.status(201).json(user);
}

export async function createOrGetChat(req: Request, res: Response): Promise<void> {
  const body = createChatBody.parse(req.body);
  const chatId = await chatService.createOrGetChat(body.userAId, body.userBId);
  res.json({ chatId });
}

export async function sendMessage(req: Request, res: Response): Promise<void> {
  const { chatId } = chatParams.parse(req.params);
  const body = sendMessageBody.parse(req.body);
  await chatService.assertChatMember(chatId, body.senderId);
  const message = await messageService.sendMessage(chatId, body.senderId, body.text);
  res.status(201).json(message);
}

export async function getMessages(req: Request, res: Response): Promise<void> {
  const { chatId } = chatParams.parse(req.params);
  const { limit } = getMessagesQuery.parse(req.query);
  await chatService.assertChatExists(chatId);
  const messages = await messageService.getMessages(chatId, limit);
  res.json({ messages });
}

export async function markMessageRead(req: Request, res: Response): Promise<void> {
  const { chatId, messageId } = messageParams.parse(req.params);
  const { userId } = userBody.parse(req.body);
  await chatService.assertChatMember(chatId, userId);
  const message = await messageService.markRead(chatId, messageId, userId);
  res.json(message);
}

export async function updateLastSeen(req: Request, res: Response): Promise<void> {
  const { chatId } = chatParams.parse(req.params);
  const body = lastSeenBody.parse(req.body);
  await chatService.assertChatMember(chatId, body.userId);
  const lastSeen = await messageService.updateLastSeen(chatId, body.userId, body.messageId);
  res.json(lastSeen);
}

export async function listUserChats(req: Request, res: Response): Promise<void> {
  const { userId } = userParams.parse(req.params);
  const chats = await chatService.getUserChats(userId);
  res.json({ chats });
}

export async function editMessage(req: Request, res: Response): Promise<void> {
  const { chatId, messageId } = messageParams.parse(req.params);
  const body = editMessageBody.parse(req.body);
  await chatService.assertChatMember(chatId, body.senderId);
  const message = await messageService.editMessage(chatId, messageId, body.senderId, body.text);
  res.json(message);
}

export async function deleteMessage(req: Request, res: Response): Promise<void> {
  const { chatId, messageId } = messageParams.parse(req.params);
  const body = deleteMessageBody.parse(req.body);
  await chatService.assertChatMember(chatId, body.senderId);
  const message = await messageService.deleteMessage(chatId, messageId, body.senderId);
  res.json(message);
}
