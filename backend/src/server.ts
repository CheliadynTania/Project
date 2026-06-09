import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { contentRoutes } from './routes/content-routes.js';
import { cleanupExpiredBlocks } from './modules/content-service.js';
import { checkDbConnection } from './db/pool.js';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { authRoutes } from './routes/auth-routes.js';
import { adminRoutes } from './routes/admin-routes.js';
import { collectionRoutes } from './modules/collection-routes.js';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: 'http://localhost:5173',
  credentials: true,
});
await app.register(multipart, {
  limits: { fileSize: 50 * 1024 * 1024 },
});

await app.register(swagger, {
  openapi: {
    info: {
      title: 'Temp Share API',
      description: 'Сервіс тимчасового доступу до контенту',
      version: '1.0.0',
    },
    tags: [
      { name: 'blocks', description: 'Записи (текст і файли)' },
      { name: 'health', description: 'Стан сервісу' },
    ],
  },
});

await app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
    tryItOutEnabled: true,
  },
});
await app.register(collectionRoutes);
await app.register(contentRoutes);
await app.register(cookie);
await app.register(jwt, {
  secret: process.env.JWT_SECRET ?? 'supersecret_change_in_production',
});
await app.register(authRoutes);
await app.register(adminRoutes);

app.get('/', async () => ({ status: 'ok', service: 'temp-share-backend', docs: '/docs' }));

setInterval(async () => {
  const removed = await cleanupExpiredBlocks();
  if (removed > 0) app.log.info(`Expired blocks cleaned: ${removed}`);
}, 15_000);

const port = Number(process.env.PORT ?? 3001);

// Перевірка БД перед стартом
try {
  await checkDbConnection();
  app.log.info('✅ Database connected successfully');
} catch (err) {
  app.log.error('❌ Database connection failed');
  app.log.error(err);
  process.exit(1);
}

app.listen({ port, host: '0.0.0.0' }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});

