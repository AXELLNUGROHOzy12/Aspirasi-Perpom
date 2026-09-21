import crypto from 'crypto';
import { localDateKey } from './time';

// Tanpa huruf/angka yang mudah tertukar (0/O, 1/I)
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const CODE_REGEX = /^ASP-\d{8}-[A-HJ-NP-Z2-9]{6}$/;

export function generateCode(now = new Date()): string {
  const bytes = crypto.randomBytes(6);
  let suffix = '';
  for (const b of bytes) suffix += ALPHABET[b % ALPHABET.length]; // 256 % 32 == 0, jadi tidak bias
  return `ASP-${localDateKey(now).replace(/-/g, '')}-${suffix}`;
}

export const normalizeCode = (input: string) => input.trim().toUpperCase().replace(/\s+/g, '');
