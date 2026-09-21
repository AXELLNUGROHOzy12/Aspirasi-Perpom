import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import multer from 'multer';
import { env } from '../config/env';
import { sha256 } from '../utils/hash';
import { HttpError } from '../utils/httpError';

type FileKind = 'jpg' | 'png' | 'webp' | 'pdf';

const KIND_MIME: Record<FileKind, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
};
const EXT_TO_KIND: Record<string, FileKind> = { jpg: 'jpg', jpeg: 'jpg', png: 'png', webp: 'webp', pdf: 'pdf' };
const DANGEROUS_NAME = /\.(exe|bat|cmd|sh|php\d?|phtml|js|mjs|jsx|html?|svg|jar|apk|msi|dll|com|scr|vbs|ps1|py|rb|pl|cgi|asp|aspx|jsp)(\.|$)/i;

/** Multer hanya menampung file di memori; file baru ditulis ke disk setelah lolos semua validasi. */
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.UPLOAD_MAX_SIZE, files: env.UPLOAD_MAX_FILES, fields: 15, fieldSize: 64 * 1024 },
}).array('files', env.UPLOAD_MAX_FILES);

/** Cek isi file (magic bytes), bukan hanya ekstensi atau MIME dari klien. */
function detectKind(b: Buffer): FileKind | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.length > 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  if (b.length > 5 && b.subarray(0, 5).toString('ascii') === '%PDF-') return 'pdf';
  return null;
}

export interface ValidatedFile {
  buffer: Buffer;
  originalName: string;
  kind: FileKind;
  mimeType: string;
  size: number;
}

const reject = (name: string, why: string) =>
  new HttpError(422, `Lampiran "${name}" tidak bisa diterima: ${why}`, 'INVALID_FILE');

export function validateFiles(files: Express.Multer.File[]): ValidatedFile[] {
  if (files.length > env.UPLOAD_MAX_FILES) throw new HttpError(422, `Maksimal ${env.UPLOAD_MAX_FILES} lampiran.`, 'INVALID_FILE');

  return files.map((f) => {
    // Multer membaca nama file sebagai latin1; kembalikan ke UTF-8 lalu bersihkan.
    const decoded = Buffer.from(f.originalname, 'latin1').toString('utf8');
    const originalName = path.basename(decoded).replace(/[\u0000-\u001F\u007F<>:"|?*\\/]/g, '').slice(0, 100).trim() || 'lampiran';

    if (!originalName || originalName.length > 100) throw reject(originalName, 'nama file tidak valid.');
    if (DANGEROUS_NAME.test(originalName)) throw reject(originalName, 'jenis file ini tidak diizinkan.');

    const ext = path.extname(originalName).slice(1).toLowerCase();
    const kindByExt = EXT_TO_KIND[ext];
    if (!kindByExt) throw reject(originalName, 'hanya JPG, PNG, WebP, atau PDF yang boleh.');
    if (f.size <= 0) throw reject(originalName, 'file kosong.');
    if (f.size > env.UPLOAD_MAX_SIZE) throw reject(originalName, 'ukuran terlalu besar.');

    const declared = f.mimetype.toLowerCase();
    const okMime = declared === KIND_MIME[kindByExt] || (kindByExt === 'jpg' && declared === 'image/jpg');
    if (!okMime) throw reject(originalName, 'jenis file tidak sesuai dengan ekstensinya.');

    const detected = detectKind(f.buffer);
    if (detected !== kindByExt) throw reject(originalName, 'isi file tidak sesuai dengan jenisnya.');

    return { buffer: f.buffer, originalName, kind: detected, mimeType: KIND_MIME[detected], size: f.size };
  });
}

export interface StoredFile {
  storedName: string;
  originalName: string;
  mimeType: string;
  size: number;
  sha256: string;
}

export async function saveFiles(files: ValidatedFile[]): Promise<StoredFile[]> {
  if (files.length === 0) return [];
  await fs.mkdir(env.UPLOAD_DIR, { recursive: true });
  const saved: StoredFile[] = [];
  try {
    for (const f of files) {
      // Nama di disk acak; nama asli tidak pernah dipakai sebagai path.
      const storedName = `${crypto.randomUUID()}.${f.kind}`;
      await fs.writeFile(path.join(env.UPLOAD_DIR, storedName), f.buffer, { mode: 0o640 });
      saved.push({ storedName, originalName: f.originalName, mimeType: f.mimeType, size: f.size, sha256: sha256(f.buffer) });
    }
  } catch (err) {
    await deleteFiles(saved.map((s) => s.storedName));
    throw err;
  }
  return saved;
}

export const uploadPath = (storedName: string) => path.join(env.UPLOAD_DIR, path.basename(storedName));

export async function deleteFiles(storedNames: string[]) {
  await Promise.all(storedNames.map((n) => fs.unlink(uploadPath(n)).catch(() => undefined)));
}
