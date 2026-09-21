import { AspirationStatus, ModerationStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { ListQuery } from '../validators/admin.validator';
import { notFound } from '../utils/httpError';
import { endOfDay, localDateKey, startOfDay } from '../utils/time';
import { deleteFiles } from './upload.service';

export async function listAspirations(q: ListQuery) {
  const where: Prisma.AspirationWhereInput = {};
  if (q.q) {
    const contains = { contains: q.q, mode: 'insensitive' as const };
    where.OR = [{ code: contains }, { title: contains }, { body: contains }, { className: contains }];
  }
  if (q.category) where.category = { slug: q.category };
  if (q.className) where.className = q.className;
  if (q.status) where.status = q.status;
  if (q.moderation) where.moderationStatus = q.moderation;
  if (q.dateFrom || q.dateTo) {
    where.createdAt = {
      ...(q.dateFrom ? { gte: startOfDay(q.dateFrom) } : {}),
      ...(q.dateTo ? { lte: endOfDay(q.dateTo) } : {}),
    };
  }

  const [total, items] = await Promise.all([
    prisma.aspiration.count({ where }),
    prisma.aspiration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      select: {
        id: true, code: true, title: true, className: true, status: true, moderationStatus: true, createdAt: true,
        category: { select: { name: true, slug: true } },
        _count: { select: { replies: true, attachments: true } },
      },
    }),
  ]);
  return { items, total, page: q.page, pageSize: q.pageSize, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) };
}

export async function getAspiration(id: string) {
  const a = await prisma.aspiration.findUnique({
    where: { id },
    include: {
      category: { select: { name: true, slug: true } },
      attachments: { orderBy: { createdAt: 'asc' } },
      replies: { orderBy: { createdAt: 'asc' }, include: { admin: { select: { name: true } } } },
      statusHistory: { orderBy: { createdAt: 'asc' }, include: { admin: { select: { name: true } } } },
      moderationLogs: { orderBy: { createdAt: 'desc' }, include: { admin: { select: { name: true } } } },
    },
  });
  if (!a) throw notFound('Aspirasi tidak ditemukan.');
  // ipHash & contentHash tidak perlu tampil di UI
  const { ipHash: _ip, contentHash: _ch, ...safe } = a;
  return safe;
}

export async function changeStatus(id: string, status: AspirationStatus, note: string | undefined, adminId: string) {
  const current = await prisma.aspiration.findUnique({ where: { id }, select: { status: true } });
  if (!current) throw notFound('Aspirasi tidak ditemukan.');
  if (current.status === status) return { changed: false, from: current.status };

  await prisma.$transaction([
    prisma.aspiration.update({ where: { id }, data: { status, archivedAt: status === 'ARCHIVED' ? new Date() : null } }),
    prisma.statusHistory.create({ data: { aspirationId: id, fromStatus: current.status, toStatus: status, note: note || null, adminId } }),
  ]);
  return { changed: true, from: current.status };
}

export async function addReply(id: string, message: string, adminId: string) {
  const exists = await prisma.aspiration.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw notFound('Aspirasi tidak ditemukan.');
  return prisma.reply.create({ data: { aspirationId: id, adminId, message } });
}

export async function moderateManually(id: string, decision: ModerationStatus, note: string | undefined, adminId: string) {
  const exists = await prisma.aspiration.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw notFound('Aspirasi tidak ditemukan.');
  await prisma.$transaction([
    prisma.aspiration.update({ where: { id }, data: { moderationStatus: decision } }),
    prisma.moderationLog.create({ data: { aspirationId: id, adminId, source: 'ADMIN', decision, note: note || null } }),
  ]);
}

export async function deleteAspiration(id: string) {
  const a = await prisma.aspiration.findUnique({ where: { id }, include: { attachments: { select: { storedName: true } } } });
  if (!a) throw notFound('Aspirasi tidak ditemukan.');
  await prisma.aspiration.delete({ where: { id } });
  await deleteFiles(a.attachments.map((f) => f.storedName));
  return { code: a.code };
}

export async function getStatistics() {
  const days = Array.from({ length: 7 }, (_, i) => localDateKey(new Date(Date.now() - (6 - i) * 86_400_000)));

  const [byStatus, needsReview, byCategory, categories, recent] = await Promise.all([
    prisma.aspiration.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.aspiration.count({ where: { moderationStatus: 'NEEDS_REVIEW' } }),
    prisma.aspiration.groupBy({ by: ['categoryId'], _count: { _all: true } }),
    prisma.category.findMany({ select: { id: true, name: true } }),
    prisma.aspiration.findMany({ where: { createdAt: { gte: startOfDay(days[0]) } }, select: { createdAt: true } }),
  ]);

  const count = (s: AspirationStatus) => byStatus.find((r) => r.status === s)?._count._all ?? 0;
  const perDay = new Map(days.map((d) => [d, 0]));
  for (const r of recent) {
    const k = localDateKey(r.createdAt);
    if (perDay.has(k)) perDay.set(k, (perDay.get(k) ?? 0) + 1);
  }

  return {
    total: byStatus.reduce((sum, r) => sum + r._count._all, 0),
    pending: count('PENDING'),
    reviewing: count('REVIEWING'),
    inProgress: count('IN_PROGRESS'),
    resolved: count('RESOLVED'),
    archived: count('ARCHIVED'),
    needsReview,
    byCategory: byCategory
      .map((r) => ({ name: categories.find((c) => c.id === r.categoryId)?.name ?? '-', count: r._count._all }))
      .sort((a, b) => b.count - a.count),
    last7Days: days.map((d) => ({ date: d, count: perDay.get(d) ?? 0 })),
  };
}
