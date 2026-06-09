import { pool } from '../db/pool.js';
import type { ContentBlock } from '../types/content.js';

// Перетворює рядок з БД у ContentBlock
function mapRow(row: Record<string, unknown>): ContentBlock {
  return {
    id: row.id as number,
    hash: row.hash as string,
    contentType: row.content_type as ContentBlock['contentType'],
    storageKey: row.storage_key as string,
    originalFilename: row.original_filename as string | undefined,
    mimeType: row.mime_type as string | undefined,
    textPreview: row.text_preview as string | undefined,
    passwordHash: row.password_hash as string | undefined,
    maxViews: row.max_views as number | undefined,
    viewCount: row.view_count as number,
    burnAfterRead: row.burn_after_read as boolean,
    expiresAt: (row.expires_at as Date).toISOString(),
    status: row.status as ContentBlock['status'],
    createdAt: (row.created_at as Date).toISOString(),
  };
}

export const contentRepository = {
  async create(data: Omit<ContentBlock, 'id' | 'viewCount' | 'createdAt'> & { userId?: string }): Promise<ContentBlock> {
  const { rows } = await pool.query(
    `INSERT INTO content_blocks
      (hash, content_type, storage_key, original_filename, mime_type,
       text_preview, password_hash, max_views, burn_after_read, expires_at, status, user_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',$11)
     RETURNING *`,
    [
      data.hash,
      data.contentType,
      data.storageKey,
      data.originalFilename ?? null,
      data.mimeType ?? null,
      data.textPreview ?? null,
      data.passwordHash ?? null,
      data.maxViews ?? null,
      data.burnAfterRead,
      data.expiresAt,
      data.userId ?? null,
    ]
  );
  return mapRow(rows[0]);
},
  
  async findByHash(hash: string): Promise<ContentBlock | null> {
    const { rows } = await pool.query(
      'SELECT * FROM content_blocks WHERE hash = $1',
      [hash]
    );
    return rows[0] ? mapRow(rows[0]) : null;
  },

  async incrementViewCount(hash: string): Promise<void> {
    await pool.query(
      'UPDATE content_blocks SET view_count = view_count + 1 WHERE hash = $1',
      [hash]
    );
  },

  async markExpired(hash: string): Promise<void> {
    await pool.query(
      "UPDATE content_blocks SET status = 'expired' WHERE hash = $1",
      [hash]
    );
  },

  async markDeleted(hash: string): Promise<void> {
    await pool.query(
      "UPDATE content_blocks SET status = 'deleted' WHERE hash = $1",
      [hash]
    );
  },

  async findExpired(nowIso: string): Promise<ContentBlock[]> {
    const { rows } = await pool.query(
      `SELECT * FROM content_blocks
       WHERE status = 'active' AND expires_at <= $1`,
      [nowIso]
    );
    return rows.map(mapRow);
  },

  async list(): Promise<ContentBlock[]> {
    const { rows } = await pool.query(
      'SELECT * FROM content_blocks ORDER BY created_at DESC'
    );
    return rows.map(mapRow);
  },

  async deleteByHash(hash: string): Promise<void> {
    await pool.query('DELETE FROM content_blocks WHERE hash = $1', [hash]);
  },
};