import { pool } from '../db/pool.js';

export const adminRepository = {
  async getAllUsers() {
    const { rows } = await pool.query(
      'SELECT id, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    return rows;
  },

  async getAllBlocks() {
    const { rows } = await pool.query(
      `SELECT cb.*, u.email as user_email 
       FROM content_blocks cb
       LEFT JOIN users u ON cb.user_id = u.id
       ORDER BY cb.created_at DESC`
    );
    return rows;
  },

  async getStats() {
    const { rows: userCount } = await pool.query('SELECT COUNT(*) FROM users');
    const { rows: blockCount } = await pool.query('SELECT COUNT(*) FROM content_blocks');
    const { rows: activeCount } = await pool.query(
      "SELECT COUNT(*) FROM content_blocks WHERE status = 'active'"
    );
    const { rows: storageSize } = await pool.query(
      'SELECT COALESCE(SUM(size), 0) as total FROM content_blocks'
    );
    return {
      users: Number(userCount[0].count),
      blocks: Number(blockCount[0].count),
      activeBlocks: Number(activeCount[0].count),
      storageBytes: Number(storageSize[0].total),
    };
  },

  async deleteBlock(id: number) {
    await pool.query('DELETE FROM content_blocks WHERE id = $1', [id]);
  },

  async setUserRole(userId: string, role: string) {
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, userId]);
  },
};