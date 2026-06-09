import type { FastifyInstance } from 'fastify';
import {
  createFileBlock,
  createTextBlock,
  deleteBlock,
  getBlockContent,
  getBlockMetadata,
  listBlocks,
} from '../modules/content-service.js';
import type { CreateTextDTO } from '../types/content.js';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/admin.middleware.js';

export async function contentRoutes(app: FastifyInstance) {

  // GET /api/health
  app.get('/api/health', async (_req, reply) => {
    try {
      const { checkDbConnection } = await import('../db/pool.js');
      await checkDbConnection();
      return reply.send({ status: 'ok', db: 'ok' });
    } catch {
      return reply.code(503).send({ status: 'error', db: 'unreachable' });
    }
  });

  // GET /api/blocks — тільки для адміна
app.get('/api/blocks', { preHandler: requireAdmin }, async () => {
  return listBlocks();
});

  // GET /api/blocks/my — записи поточного юзера
app.get('/api/blocks/my', { preHandler: requireAuth }, async (request, reply) => {
  const user = request.user as { sub: string };
  const { pool } = await import('../db/pool.js');
  const { rows } = await pool.query(
    `SELECT * FROM content_blocks WHERE user_id = $1 ORDER BY created_at DESC`,
    [user.sub]
  );
  return reply.send(rows.map((row: any) => ({
    id: row.id,
    hash: row.hash,
    contentType: row.content_type,
    viewCount: row.view_count,
    maxViews: row.max_views,
    expiresAt: row.expires_at,
    status: row.status,
    createdAt: row.created_at,
  })));
});

  // GET /api/blocks/:hash/meta — тільки метадані (без вмісту)
  app.get('/api/blocks/:hash/meta', async (request, reply) => {
    const { hash } = request.params as { hash: string };
    try {
      const metadata = await getBlockMetadata(hash);
      return {
  hash: metadata.hash,
  contentType: metadata.contentType,
  originalFilename: metadata.originalFilename,
  mimeType: metadata.mimeType,
  viewCount: metadata.viewCount,
  maxViews: metadata.maxViews,
  burnAfterRead: metadata.burnAfterRead,
  hasPassword: !!metadata.passwordHash,
  expiresAt: metadata.expiresAt,
  createdAt: metadata.createdAt,
};
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // GET /api/blocks/:hash — отримати вміст
  app.get('/api/blocks/:hash', async (request, reply) => {
    const { hash } = request.params as { hash: string };
    const password = request.headers['x-password'] as string | undefined;

    try {
      const { metadata, data } = await getBlockContent(hash, password);

      if (metadata.contentType === 'text') {
        return reply.send({
          hash: metadata.hash,
          contentType: metadata.contentType,
          expiresAt: metadata.expiresAt,
          createdAt: metadata.createdAt,
          content: data.toString('utf-8'),
        });
      }

      reply.header('Content-Type', metadata.mimeType ?? 'application/octet-stream');
      reply.header(
        'Content-Disposition',
        `inline; filename="${metadata.originalFilename ?? 'download'}"`,
      );
      return reply.send(data);
    } catch (error) {
      return handleError(error, reply);
    }
  });

// GET /api/collections/my
app.get('/api/collections/my', { preHandler: requireAuth }, async (request, reply) => {
  const user = request.user as { sub: string };
  const { pool } = await import('../db/pool.js');
  const { rows } = await pool.query(
    'SELECT * FROM collections WHERE user_id = $1 ORDER BY created_at DESC',
    [user.sub]
  );
  return reply.send(rows);
});

app.post('/api/blocks/text', { preHandler: optionalAuth }, async (request, reply) => {
  const body = request.body as Partial<CreateTextDTO>;
  const user = request.user as { sub?: string } | undefined;

  if (!body?.text || typeof body.text !== 'string') {
    return reply.code(400).send({ message: 'text is required.' });
  }

  const ttlMinutes = Number(body.ttlMinutes ?? 60);
  if (!Number.isFinite(ttlMinutes) || ttlMinutes <= 0) {
    return reply.code(400).send({ message: 'ttlMinutes must be a positive number.' });
  }

  const block = await createTextBlock({
    text: body.text,
    ttlMinutes,
    maxViews: body.maxViews,
    password: body.password,
    burnAfterRead: body.burnAfterRead,
    userId: user?.sub,
  });

  return reply.code(201).send({
    ...block,
    shortUrl: `/view/${block.hash}`,
  });
}); 

  // POST /api/blocks/file — завантажити файл
  app.post('/api/blocks/file', async (request, reply) => {
    const parts = request.parts();
    let fileBuffer: Buffer | null = null;
    let filename = '';
    let mimeType = 'application/octet-stream';
    let ttlMinutes = 60;
    let maxViews: number | undefined;
    let password: string | undefined;
    let burnAfterRead = false;

    for await (const part of parts) {
      if (part.type === 'file') {
        fileBuffer = await part.toBuffer();
        filename = part.filename;
        mimeType = part.mimetype;
      }
      if (part.type === 'field') {
        if (part.fieldname === 'ttlMinutes') ttlMinutes = Number(part.value);
        if (part.fieldname === 'maxViews') maxViews = Number(part.value);
        if (part.fieldname === 'password') password = String(part.value);
        if (part.fieldname === 'burnAfterRead') burnAfterRead = part.value === 'true';
      }
    }

    if (!fileBuffer || !filename) {
      return reply.code(400).send({ message: 'File is required.' });
    }

    const block = await createFileBlock({
      fileBuffer,
      filename,
      mimeType,
      ttlMinutes,
      maxViews,
      password,
      burnAfterRead,
    });

    return reply.code(201).send({
      ...block,
      shortUrl: `/view/${block.hash}`,
    });
  });

  // DELETE /api/blocks/:hash — видалити запис
  app.delete('/api/blocks/:hash', async (request, reply) => {
    const { hash } = request.params as { hash: string };
    const adminSecret = request.headers['x-admin-secret'] as string | undefined;

    if (adminSecret !== process.env.ADMIN_SECRET) {
      return reply.code(403).send({ message: 'Forbidden.' });
    }

    try {
      await deleteBlock(hash);
      return reply.code(204).send();
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // POST /api/blocks/:hash/verify-password — перевірити пароль
  app.post('/api/blocks/:hash/verify-password', async (request, reply) => {
    const { hash } = request.params as { hash: string };
    const body = request.body as { password?: string };

    if (!body?.password) {
      return reply.code(400).send({ message: 'password is required.' });
    }

    try {
      const metadata = await getBlockMetadata(hash);
      if (!metadata.passwordHash) {
        return reply.send({ verified: true, passwordRequired: false });
      }

      const { default: bcrypt } = await import('bcryptjs');
      const ok = await bcrypt.compare(body.password, metadata.passwordHash);
      if (!ok) return reply.code(401).send({ message: 'Wrong password.' });

      return reply.send({ verified: true });
    } catch (error) {
      return handleError(error, reply);
    }
  });
}
// Централізована обробка помилок
function handleError(error: unknown, reply: Parameters<typeof contentRoutes>[0]['inject'] extends never ? never : any) {
  const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';

  const errorMap: Record<string, [number, string]> = {
    CONTENT_NOT_FOUND:      [404, 'Content not found.'],
    CONTENT_EXPIRED:        [410, 'Content has expired.'],
    CONTENT_NOT_AVAILABLE:  [410, 'Content is no longer available.'],
    PASSWORD_REQUIRED:      [401, 'This content is password protected.'],
    WRONG_PASSWORD:         [401, 'Wrong password.'],
  };

  const [code, msg] = errorMap[message] ?? [500, 'Internal server error.'];
  return reply.code(code).send({ message: msg });
}