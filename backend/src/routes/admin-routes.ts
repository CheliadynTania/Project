import type { FastifyInstance } from 'fastify';
import { adminRepository } from '../modules/admin-repository.js';
import { requireAdmin } from '../middleware/admin.middleware.js';
import { deleteContent } from '../storage/local-storage.js';

export async function adminRoutes(app: FastifyInstance) {

  // GET /api/admin/stats
  app.get('/api/admin/stats', { preHandler: requireAdmin }, async (_req, reply) => {
    const stats = await adminRepository.getStats();
    return reply.send(stats);
  });

  // GET /api/admin/users
  app.get('/api/admin/users', { preHandler: requireAdmin }, async (_req, reply) => {
    const users = await adminRepository.getAllUsers();
    return reply.send(users);
  });

  // GET /api/admin/blocks
  app.get('/api/admin/blocks', { preHandler: requireAdmin }, async (_req, reply) => {
    const blocks = await adminRepository.getAllBlocks();
    return reply.send(blocks);
  });

  // DELETE /api/admin/blocks/:id
  app.delete('/api/admin/blocks/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const blocks = await adminRepository.getAllBlocks();
    const block = blocks.find((b: any) => b.id === Number(id));
    if (block) await deleteContent(block.storage_key);
    await adminRepository.deleteBlock(Number(id));
    return reply.code(204).send();
  });

  // PATCH /api/admin/users/:id/role
  app.patch('/api/admin/users/:id/role', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { role } = request.body as { role: string };
    if (!['user', 'admin'].includes(role)) {
      return reply.code(400).send({ message: 'Invalid role.' });
    }
    await adminRepository.setUserRole(id, role);
    return reply.send({ message: 'Role updated.' });
  });
}