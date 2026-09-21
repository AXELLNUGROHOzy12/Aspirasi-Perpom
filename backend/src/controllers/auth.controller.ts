import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { COOKIE_NAME, cookieOptions, signSession } from '../middleware/auth';
import { writeAudit } from '../services/audit.service';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../utils/httpError';

// Dipakai agar waktu respons sama, baik email terdaftar maupun tidak (mencegah user enumeration).
const DUMMY_HASH = bcrypt.hashSync('bukan-password-asli', 12);

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  const admin = await prisma.admin.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);

  if (!admin || !admin.isActive || !ok) {
    await writeAudit(req, 'ADMIN_LOGIN_FAILED', { adminId: admin?.id ?? null, meta: { email } });
    throw new HttpError(401, 'Email atau kata sandi salah.', 'BAD_CREDENTIALS');
  }

  await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  res.cookie(COOKIE_NAME, signSession(admin), { ...cookieOptions(), maxAge: env.SESSION_HOURS * 3600_000 });
  await writeAudit(req, 'ADMIN_LOGIN', { adminId: admin.id });
  res.json({ data: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (token) {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET);
      if (typeof payload !== 'string' && payload.sub) await writeAudit(req, 'ADMIN_LOGOUT', { adminId: payload.sub });
    } catch {
      /* token sudah tidak berlaku, cukup hapus cookie */
    }
  }
  res.clearCookie(COOKIE_NAME, cookieOptions());
  res.json({ data: { ok: true } });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ data: req.admin });
});
