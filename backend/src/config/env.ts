import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL wajib diisi'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET minimal 32 karakter'),
  SESSION_HOURS: z.coerce.number().positive().default(8),
  // Semua origin frontend, pisahkan dengan koma. Contoh: https://domain.com,https://admin.domain.com
  CORS_ORIGIN: z.string().default('http://localhost:3000,http://localhost:3001'),
  // 'lax' jika frontend & backend satu domain induk (domain.com, admin.domain.com, api.domain.com).
  // 'none' hanya untuk domain bawaan Railway (*.up.railway.app) yang dianggap beda situs.
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_DOMAIN: z.string().default(''),
  CAPTCHA_SECRET: z.string().default(''),
  TURNSTILE_SITE_KEY: z.string().default(''),
  UPLOAD_MAX_SIZE: z.coerce.number().int().positive().default(3 * 1024 * 1024),
  UPLOAD_MAX_FILES: z.coerce.number().int().min(0).max(10).default(3),
  UPLOAD_DIR: z.string().default('uploads'),
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  IP_HASH_SALT: z.string().default('ganti-dengan-string-acak'),
  DAILY_LIMIT_PER_IP: z.coerce.number().int().positive().default(100),
  TIMEZONE_OFFSET: z.string().regex(/^[+-]\d{2}:\d{2}$/).default('+07:00'),
  SCHOOL_NAME: z.string().default('SMA Negeri Contoh'),
  CLASS_LIST: z.string().default('X IPA 1,X IPA 2,XI IPA 1,XI IPA 2,XII IPA 1,XII IPA 2'),
});

// Nilai kosong (mis. "PORT=") dianggap tidak diisi supaya default berlaku.
const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ''));
const parsed = schema.safeParse(raw);

if (!parsed.success) {
  console.error('Konfigurasi environment tidak valid:');
  for (const issue of parsed.error.issues) console.error(` - ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  UPLOAD_DIR: path.resolve(process.cwd(), parsed.data.UPLOAD_DIR),
  isProd: parsed.data.NODE_ENV === 'production',
  allowedOrigins: parsed.data.CORS_ORIGIN.split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean),
};
