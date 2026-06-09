import type { FastifyInstance } from 'fastify';
import { collectionRepository } from '../modules/collection-repository';
import { optionalAuth, requireAuth } from '../middleware/auth.middleware.js';
import { nanoid } from 'nanoid';

export async function collectionRoutes(app: FastifyInstance) {

  // POST /api/collections
  app.post('/api/collections', { preHandler: optionalAuth }, async (request, reply) => {
    const body = request.body as { title?: string; ttlMinutes?: number; blockHashes?: string[] };
    const user = request.user as { sub?: string } | undefined;

    const ttlMinutes = Number(body.ttlMinutes ?? 60);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
    const hash = nanoid(8);

    const collection = await collectionRepository.create(
      hash,
      user?.sub ?? null,
      body.title ?? null,
      expiresAt
    );

    if (body.blockHashes?.length) {
      const { pool } = await import('../db/pool.js');
      for (const blockHash of body.blockHashes) {
        const { rows } = await pool.query('SELECT id FROM content_blocks WHERE hash = $1', [blockHash]);
        if (rows[0]) await collectionRepository.addBlock(collection.id, rows[0].id);
      }
    }

    return reply.code(201).send({ ...collection, shortUrl: `/collection/${collection.hash}` });
  });

  
  // GET /api/collections/:hash
  app.get('/api/collections/:hash', async (request, reply) => {
    const { hash } = request.params as { hash: string };
    const collection = await collectionRepository.findByHash(hash);
    if (!collection) return reply.code(404).send({ message: 'Collection not found.' });

    if (new Date(collection.expires_at) < new Date()) {
      return reply.code(410).send({ message: 'Collection has expired.' });
    }

    const blocks = await collectionRepository.getBlocks(collection.id);
    return reply.send({ ...collection, blocks });
  });

  // DELETE /api/collections/:hash
  app.delete('/api/collections/:hash', { preHandler: requireAuth }, async (request, reply) => {
    const { hash } = request.params as { hash: string };
    await collectionRepository.deleteByHash(hash);
    return reply.code(204).send();
  });
}