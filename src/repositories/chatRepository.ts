import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db';
import { ChatSummary, ChatType, User } from '../types';
import { AppError } from '../utils/errors';

interface IdRow extends RowDataPacket {
  id: number;
}

interface ChatRow extends RowDataPacket {
  id: number;
  type: ChatType;
  created_at: Date;
  member_ids: string;
}

function isDuplicateError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'ER_DUP_ENTRY';
}

export async function createUser(name: string, email: string): Promise<User> {
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      [name, email]
    );
    return { id: result.insertId, name, email };
  } catch (err) {
    if (isDuplicateError(err)) {
      throw new AppError(409, 'Email already registered');
    }
    throw err;
  }
}

export async function usersExist(ids: number[]): Promise<boolean> {
  const unique = Array.from(new Set(ids));
  const placeholders = unique.map(() => '?').join(',');
  const [rows] = await pool.execute<IdRow[]>(
    `SELECT id FROM users WHERE id IN (${placeholders})`,
    unique
  );
  return rows.length === unique.length;
}

export async function userExists(userId: number): Promise<boolean> {
  const [rows] = await pool.execute<IdRow[]>('SELECT id FROM users WHERE id = ?', [userId]);
  return rows.length > 0;
}

export async function chatExists(chatId: number): Promise<boolean> {
  const [rows] = await pool.execute<IdRow[]>('SELECT id FROM chats WHERE id = ?', [chatId]);
  return rows.length > 0;
}

export async function isMember(chatId: number, userId: number): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?',
    [chatId, userId]
  );
  return rows.length > 0;
}

async function findDirectChatId(directKey: string): Promise<number | null> {
  const [rows] = await pool.execute<IdRow[]>('SELECT id FROM chats WHERE direct_key = ?', [directKey]);
  return rows[0]?.id ?? null;
}

export async function getOrCreateDirectChat(userAId: number, userBId: number): Promise<number> {
  const directKey = `${Math.min(userAId, userBId)}_${Math.max(userAId, userBId)}`;

  const existing = await findDirectChatId(directKey);
  if (existing !== null) {
    return existing;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute<ResultSetHeader>(
      'INSERT INTO chats (type, direct_key) VALUES (?, ?)',
      ['direct', directKey]
    );
    const chatId = result.insertId;
    await connection.query('INSERT INTO chat_members (chat_id, user_id) VALUES ?', [
      [
        [chatId, userAId],
        [chatId, userBId]
      ]
    ]);
    await connection.commit();
    return chatId;
  } catch (err) {
    await connection.rollback();
    if (isDuplicateError(err)) {
      const raced = await findDirectChatId(directKey);
      if (raced !== null) {
        return raced;
      }
    }
    throw err;
  } finally {
    connection.release();
  }
}

export async function listUserChats(userId: number): Promise<ChatSummary[]> {
  const [rows] = await pool.execute<ChatRow[]>(
    `SELECT c.id, c.type, c.created_at,
            GROUP_CONCAT(m2.user_id ORDER BY m2.user_id) AS member_ids
       FROM chat_members m1
       JOIN chats c ON c.id = m1.chat_id
       JOIN chat_members m2 ON m2.chat_id = c.id
      WHERE m1.user_id = ?
      GROUP BY c.id, c.type, c.created_at
      ORDER BY c.created_at DESC`,
    [userId]
  );

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    memberIds: row.member_ids.split(',').map(Number),
    createdAt: row.created_at.toISOString()
  }));
}
