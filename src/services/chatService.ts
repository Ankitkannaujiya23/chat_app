import * as chatRepository from '../repositories/chatRepository';
import { ChatSummary, User } from '../types';
import { AppError } from '../utils/errors';

export async function registerUser(name: string, email: string): Promise<User> {
  return chatRepository.createUser(name, email);
}

export async function createOrGetChat(userAId: number, userBId: number): Promise<number> {
  if (userAId === userBId) {
    throw new AppError(400, 'A chat needs two different users');
  }
  if (!(await chatRepository.usersExist([userAId, userBId]))) {
    throw new AppError(404, 'One or both users do not exist');
  }
  return chatRepository.getOrCreateDirectChat(userAId, userBId);
}

export async function assertChatExists(chatId: number): Promise<void> {
  if (!(await chatRepository.chatExists(chatId))) {
    throw new AppError(404, 'Chat not found');
  }
}

export async function assertChatMember(chatId: number, userId: number): Promise<void> {
  await assertChatExists(chatId);
  if (!(await chatRepository.isMember(chatId, userId))) {
    throw new AppError(403, 'User is not a member of this chat');
  }
}

export async function getUserChats(userId: number): Promise<ChatSummary[]> {
  if (!(await chatRepository.userExists(userId))) {
    throw new AppError(404, 'User not found');
  }
  return chatRepository.listUserChats(userId);
}
