import fs from 'fs';
import path from 'path';
import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { logger } from './utils/logger';

fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
fs.mkdirSync(path.join(env.UPLOAD_DIR, 'teachers'), { recursive: true }); // foto guru favorit

const server = createApp().listen(env.PORT, () => {
  logger.info(`Backend berjalan di http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

async function shutdown(signal: string) {
  logger.info(`${signal} diterima, menutup server...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => logger.error('unhandledRejection', reason));
