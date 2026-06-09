import type { FastifyRequest, FastifyReply } from 'fastify';

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
    const payload = request.user as { role?: string };
    if (payload.role !== 'admin') {
      reply.code(403).send({ message: 'Forbidden. Admin only.' });
    }
  } catch {
    reply.code(401).send({ message: 'Unauthorized.' });
  }
}