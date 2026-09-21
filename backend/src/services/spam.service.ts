import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { HttpError } from '../utils/httpError';

const DAY = 24 * 3600_000;

export const normalizeForHash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Form yang selesai diisi dalam < 2 detik hampir pasti bot. */
export function assertHumanTiming(startedAt?: number) {
  if (startedAt && Date.now() - startedAt < 2000) {
    throw new HttpError(429, 'Kamu mengirim terlalu cepat. Tunggu sebentar lalu coba lagi.', 'TOO_FAST');
  }
}

export async function assertNotSpam(p: { contentHash: string; ipHash: string }) {
  const since = new Date(Date.now() - DAY);

  const duplicate = await prisma.aspiration.findFirst({ where: { contentHash: p.contentHash, createdAt: { gte: since } }, select: { id: true } });
  if (duplicate) {
    throw new HttpError(409, 'Aspirasi yang sama sudah pernah dikirim. Kalau ingin menambah informasi, tulis aspirasi baru dengan isi yang berbeda.', 'DUPLICATE');
  }

  const count = await prisma.aspiration.count({ where: { ipHash: p.ipHash, createdAt: { gte: since } } });
  if (count >= env.DAILY_LIMIT_PER_IP) {
    throw new HttpError(429, 'Terlalu banyak aspirasi dari jaringan ini hari ini. Coba lagi besok, ya.', 'DAILY_LIMIT');
  }
}
