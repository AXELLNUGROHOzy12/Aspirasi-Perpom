import { env } from '../config/env';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';

/** Verifikasi Cloudflare Turnstile. Jika CAPTCHA_SECRET kosong, verifikasi dilewati (mode development). */
export async function verifyCaptcha(token: string, ip?: string) {
  if (!env.CAPTCHA_SECRET) return;
  if (!token) throw new HttpError(422, 'Selesaikan verifikasi keamanan terlebih dulu.', 'CAPTCHA_REQUIRED');

  try {
    const body = new URLSearchParams({ secret: env.CAPTCHA_SECRET, response: token });
    if (ip) body.set('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { success?: boolean };
    if (!data.success) throw new HttpError(422, 'Verifikasi keamanan gagal. Muat ulang verifikasi lalu coba lagi.', 'CAPTCHA_FAILED');
  } catch (err) {
    if (err instanceof HttpError) throw err;
    logger.error('Turnstile tidak bisa dihubungi', err);
    throw new HttpError(503, 'Verifikasi keamanan sedang bermasalah. Coba lagi sebentar lagi.', 'CAPTCHA_UNAVAILABLE');
  }
}
