import { pool } from '../db/pool.js';

export const collectionRepository = {
  async create(hash: string, userId: string | null, title: string | null, expiresAt: string) {
    const { rows } = await pool.query(
      'INSERT INTO collections (hash, user_id, title, expires_at) VALUES ($1,$2,$3,$4) RETURNING *',
      [hash, userId, title, expiresAt]
    );
    return rows[0];
  },

  async findByHash(hash: string) {
    const { rows } = await pool.query(
      'SELECT * FROM collections WHERE hash = $1',
      [hash]
    );
    return rows[0] ?? null;
  },

  async addBlock(collectionId: number, blockId: number) {
    await pool.query(
      'INSERT INTO collection_blocks (collection_id, block_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [collectionId, blockId]
    );
  },

  async getBlocks(collectionId: number) {
    const { rows } = await pool.query(
      `SELECT cb.* FROM content_blocks cb
       JOIN collection_blocks col ON col.block_id = cb.id
       WHERE col.collection_id = $1`,
      [collectionId]
    );
    return rows;
  },

  async deleteByHash(hash: string) {
    await pool.query('DELETE FROM collections WHERE hash = $1', [hash]);
  },
};