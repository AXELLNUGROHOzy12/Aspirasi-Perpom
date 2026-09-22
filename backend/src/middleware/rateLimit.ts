import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

const make = (windowMs: number, limit: number, message: string, extra: { skipSuccessfulRequests?: boolean } = {}) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    ...extra,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({ error: { code: 'RATE_LIMITED', message } });
    },
  });

const MIN = 60_000;

export const globalLimiter = make(MIN, 200, 'Terlalu banyak permintaan. Coba lagi sebentar lagi.');
// Jaringan WiFi sekolah dipakai bersama, jadi batasnya tidak terlalu ketat per IP.
export const submitLimiter = make(10 * MIN, 15, 'Kamu terlalu sering mengirim aspirasi. Tunggu beberapa menit, lalu coba lagi.');
export const trackLimiter = make(10 * MIN, 60, 'Terlalu banyak pengecekan kode. Tunggu beberapa menit, lalu coba lagi.');
export const loginLimiter = make(15 * MIN, 10, 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.', { skipSuccessfulRequests: true });
// Voting guru favorit: longgar juga (WiFi sekolah dipakai bersama), tapi tetap membatasi percobaan berulang.
export const voteLimiter = make(10 * MIN, 20, 'Terlalu banyak percobaan memilih. Tunggu beberapa menit, lalu coba lagi.');
