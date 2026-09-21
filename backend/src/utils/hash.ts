import crypto from 'crypto';
import { env } from '../config/env';

export const sha256 = (input: string | Buffer) => crypto.createHash('sha256').update(input).digest('hex');

// IP siswa tidak disimpan mentah, hanya hash bergaram untuk deteksi penyalahgunaan.
export const hashIp = (ip: string) => sha256(`${env.IP_HASH_SALT}:${ip}`);
