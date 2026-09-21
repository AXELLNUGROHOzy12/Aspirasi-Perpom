import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Halaman tidak ditemukan.' } });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, fields: err.fields } });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION',
        message: 'Data yang kamu masukkan belum lengkap. Silakan periksa kembali form.',
        fields: err.flatten().fieldErrors,
      },
    });
  }

  if (err instanceof multer.MulterError) {
    const mb = Math.round((env.UPLOAD_MAX_SIZE / 1024 / 1024) * 10) / 10;
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `Ukuran lampiran terlalu besar. Maksimal ${mb} MB per file.`
        : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
          ? `Maksimal ${env.UPLOAD_MAX_FILES} lampiran.`
          : 'Lampiran tidak bisa diproses. Coba pilih file lain.';
    return res.status(400).json({ error: { code: 'INVALID_FILE', message } });
  }

  const e = err as { type?: string; status?: number };
  if (e?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Data yang dikirim tidak bisa dibaca.' } });
  }
  if (e?.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'TOO_LARGE', message: 'Data yang dikirim terlalu besar.' } });
  }

  // Detail error hanya masuk log internal, tidak pernah dikirim ke pengguna.
  logger.error(`${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Terjadi masalah di server. Silakan coba lagi nanti.' } });
}
