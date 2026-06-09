import type { FastifyInstance } from 'fastify';
import { authService } from '../modules/auth-service.js';

export async function authRoutes(app: FastifyInstance) {

  // POST /api/auth/register
  app.post('/api/auth/register', async (request, reply) => {
    const body = request.body as { email?: string; password?: string };

    if (!body?.email || !body?.password) {
      return reply.code(400).send({ message: 'email and password are required.' });
    }

    try {
      const result = await authService.register(
        body.email,
        body.password,
        (payload) => app.jwt.sign(payload, { expiresIn: '15m' })
      );

      reply.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/api/auth',
        maxAge: 7 * 24 * 60 * 60,
      });

      return reply.code(201).send({
        accessToken: result.accessToken,
        user: result.user,
      });
    } catch (error) {
      return handleAuthError(error, reply);
    }
  });

  // POST /api/auth/login
  app.post('/api/auth/login', async (request, reply) => {
    const body = request.body as { email?: string; password?: string };

    if (!body?.email || !body?.password) {
      return reply.code(400).send({ message: 'email and password are required.' });
    }

    try {
      const result = await authService.login(
        body.email,
        body.password,
        (payload) => app.jwt.sign(payload, { expiresIn: '15m' })
      );

      reply.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/api/auth',
        maxAge: 7 * 24 * 60 * 60,
      });

      return reply.send({
        accessToken: result.accessToken,
        user: result.user,
      });
    } catch (error) {
      return handleAuthError(error, reply);
    }
  });

  // POST /api/auth/refresh
  app.post('/api/auth/refresh', async (request, reply) => {
    const refreshToken = request.cookies?.refreshToken;
    if (!refreshToken) {
      return reply.code(401).send({ message: 'No refresh token.' });
    }

    try {
      const result = await authService.refresh(
        refreshToken,
        (payload) => app.jwt.sign(payload, { expiresIn: '15m' })
      );
      return reply.send(result);
    } catch {
      return reply.code(401).send({ message: 'Invalid refresh token.' });
    }
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', async (request, reply) => {
    const refreshToken = request.cookies?.refreshToken;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    reply.clearCookie('refreshToken', { path: '/api/auth' });
    return reply.send({ message: 'Logged out.' });
  });
}

function handleAuthError(error: unknown, reply: any) {
  const message = error instanceof Error ? error.message : 'UNKNOWN';
  const errorMap: Record<string, [number, string]> = {
    EMAIL_TAKEN: [409, 'Email already in use.'],
    INVALID_CREDENTIALS: [401, 'Invalid email or password.'],
    PASSWORD_TOO_SHORT: [400, 'Password must be at least 6 characters.'],
    INVALID_REFRESH_TOKEN: [401, 'Invalid refresh token.'],
  };
  const [code, msg] = errorMap[message] ?? [500, 'Internal server error.'];
  return reply.code(code).send({ message: msg });
}