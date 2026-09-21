import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { forbidden } from '../utils/httpError';

// Frontend admin ada di domain lain, jadi request admin yang mengubah data dijaga dua lapis:
// 1. Origin harus salah satu frontend yang diizinkan (CORS_ORIGIN)
// 2. Wajib membawa header X-Requested-With (memicu preflight CORS, tidak bisa dikirim dari form situs lain)
export function requireXhrHeader(req: Request, _res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin && !env.allowedOrigins.includes(origin.replace(/\/$/, ''))) return next(forbidden('Permintaan tidak valid.'));
  if (req.get('x-requested-with') !== 'aspirasi') return next(forbidden('Permintaan tidak valid.'));
  next();
}
