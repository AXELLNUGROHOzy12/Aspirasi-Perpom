import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { HttpError } from '../utils/httpError';

// Foto guru tampil publik (bukan lampiran privat), disimpan terpisah dari uploads aspirasi.
export const TEACHER_PHOTO_DIR = path.join(env.UPLOAD_DIR, 'teachers');
const MAX_SIZE = 2 * 1024 * 1024; // 2MB cukup untuk foto profil

type Kind = 'jpg' | 'png' | 'webp';
const MIME: Record<Kind, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

/** Cek isi file (magic bytes), sama seperti upload.service.ts, bukan hanya percaya ekstensi/MIME dari klien. */
function detectKind(b: Buffer): Kind | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.length > 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

const rawUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: 1, fields: 5, fieldSize: 4 * 1024 },
}).single('photo');

/** Bungkus multer supaya errornya (ukuran/jumlah file) jadi HttpError yang konsisten dengan bagian lain. */
export function teacherPhotoUpload(req: Request, res: Response, next: NextFunction) {
  rawUpload(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(new HttpError(422, 'Ukuran foto maksimal 2MB.', 'INVALID_FILE'));
    }
    return next(new HttpError(422, 'Foto tidak bisa diproses. Coba pilih file lain.', 'INVALID_FILE'));
  });
}

export interface StoredPhoto {
  storedName: string;
  originalName: string;
  mimeType: string;
}

export async function saveTeacherPhoto(file: Express.Multer.File): Promise<StoredPhoto> {
  if (file.size <= 0) throw new HttpError(422, 'File foto kosong.', 'INVALID_FILE');
  if (file.size > MAX_SIZE) throw new HttpError(422, 'Ukuran foto maksimal 2MB.', 'INVALID_FILE');

  const kind = detectKind(file.buffer);
  if (!kind) throw new HttpError(422, 'Foto harus berformat JPG, PNG, atau WebP.', 'INVALID_FILE');

  await fs.mkdir(TEACHER_PHOTO_DIR, { recursive: true });
  const storedName = `${crypto.randomUUID()}.${kind}`;
  await fs.writeFile(path.join(TEACHER_PHOTO_DIR, storedName), file.buffer, { mode: 0o644 });

  const decoded = Buffer.from(file.originalname || '', 'latin1').toString('utf8');
  const originalName = path.basename(decoded).replace(/[\u0000-\u001F\u007F<>:"|?*\\/]/g, '').slice(0, 100).trim() || 'foto-guru';

  return { storedName, originalName, mimeType: MIME[kind] };
}

export const teacherPhotoPath = (storedName: string) => path.join(TEACHER_PHOTO_DIR, path.basename(storedName));

export async function deleteTeacherPhoto(storedName: string) {
  await fs.unlink(teacherPhotoPath(storedName)).catch(() => undefined);
}
