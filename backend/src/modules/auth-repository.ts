import { pool } from '../db/pool.js';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: string;
}

export const authRepository = {
  async findUserByEmail(email: string): Promise<User | null> {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return rows[0] ?? null;
  },

  async findUserById(id: string): Promise<User | null> {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return rows[0] ?? null;
  },

  async createUser(email: string, passwordHash: string): Promise<User> {
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
      [email, passwordHash]
    );
    return rows[0];
  },

  async createSession(userId: string, tokenHash: string, expiresAt: string): Promise<Session> {
    const { rows } = await pool.query(
      'INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING *',
      [userId, tokenHash, expiresAt]
    );
    return rows[0];
  },

  async findSession(tokenHash: string): Promise<Session | null> {
    const { rows } = await pool.query(
      'SELECT * FROM sessions WHERE token_hash = $1 AND expires_at > NOW()',
      [tokenHash]
    );
    return rows[0] ?? null;
  },

  async deleteSession(tokenHash: string): Promise<void> {
    await pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
  },

  async deleteUserSessions(userId: string): Promise<void> {
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
  },
};