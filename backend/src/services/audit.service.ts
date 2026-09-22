import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

export type AuditAction =
  | 'ADMIN_LOGIN'
  | 'ADMIN_LOGIN_FAILED'
  | 'ADMIN_LOGOUT'
  | 'ASPIRATION_VIEWED'
  | 'STATUS_CHANGED'
  | 'REPLY_CREATED'
  | 'ASPIRATION_ARCHIVED'
  | 'MODERATION_UPDATED'
  | 'ASPIRATION_DELETED'
  | 'SETTINGS_UPDATED'
  | 'FAVORITE_TEACHER_TOGGLED'
  | 'FAVORITE_TEACHER_CREATED'
  | 'FAVORITE_TEACHER_UPDATED'
  | 'FAVORITE_TEACHER_DELETED'
  | 'FAVORITE_TEACHER_VOTES_RESET'
  | 'MAINTENANCE_TOGGLED';

export async function writeAudit(
  req: Request,
  action: AuditAction,
  opts: { adminId?: string | null; targetType?: string; targetId?: string; meta?: Prisma.InputJsonValue } = {},
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        adminId: opts.adminId ?? req.admin?.id ?? null,
        targetType: opts.targetType,
        targetId: opts.targetId,
        meta: opts.meta,
        ip: req.ip ?? null,
      },
    });
  } catch (err) {
    // Kegagalan audit tidak boleh menjatuhkan request, tapi harus tercatat.
    logger.error('Gagal menulis audit log', err);
  }
}
