import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { AdminRole } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { forbidden, unauthorized } from '../utils/httpError';

export const COOKIE_NAME = 'aspirasi_session';

export interface AuthAdmin {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AuthAdmin;
    }
  }
}

export const cookieOptions = () => ({
  httpOnly: true,
  sameSite: env.COOKIE_SAMESITE,
  secure: env.isProd || env.COOKIE_SAMESITE === 'none',
  path: '/',
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
});

export function signSession(admin: { id: string; role: AdminRole }): string {
  return jwt.sign({ role: admin.role }, env.JWT_SECRET, {
    subject: admin.id,
    expiresIn: Math.round(env.SESSION_HOURS * 3600),
  });
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[COOKIE_NAME] as string | undefined;
    if (!token) throw unauthorized();

    let sub: string | undefined;
    try {
      const payload = jwt.verify(token, env.JWT_SECRET);
      sub = typeof payload === 'string' ? undefined : payload.sub;
    } catch {
      throw unauthorized('Sesi kamu sudah berakhir. Silakan login lagi.');
    }
    if (!sub) throw unauthorized();

    // Selalu cek ke database supaya admin yang dinonaktifkan langsung kehilangan akses.
    const admin = await prisma.admin.findUnique({ where: { id: sub } });
    if (!admin || !admin.isActive) throw unauthorized();

    req.admin = { id: admin.id, email: admin.email, name: admin.name, role: admin.role };
    next();
  } catch (err) {
    next(err);
  }
}

export const requireRole =
  (...roles: AdminRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.admin || !roles.includes(req.admin.role)) return next(forbidden());
    next();
  };
