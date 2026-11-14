import { Router } from 'express';
import * as chatController from '../controllers/chatController';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.post('/users', asyncHandler(chatController.createUser));
router.post('/chat/create', asyncHandler(chatController.createOrGetChat));
router.post('/chat/:chatId/message/send', asyncHandler(chatController.sendMessage));
router.get('/chat/:chatId/messages', asyncHandler(chatController.getMessages));
router.post('/chat/:chatId/message/:messageId/read', asyncHandler(chatController.markMessageRead));
router.post('/chat/:chatId/lastseen', asyncHandler(chatController.updateLastSeen));
router.get('/user/:userId/chats', asyncHandler(chatController.listUserChats));
router.patch('/chat/:chatId/message/:messageId', asyncHandler(chatController.editMessage));
router.delete('/chat/:chatId/message/:messageId', asyncHandler(chatController.deleteMessage));

export default router;
