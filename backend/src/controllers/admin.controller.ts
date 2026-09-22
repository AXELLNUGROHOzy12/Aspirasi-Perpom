import fs from 'fs';
import { prisma } from '../lib/prisma';
import { writeAudit } from '../services/audit.service';
import * as svc from '../services/adminAspiration.service';
import { getMaintenanceMode, setMaintenanceMode, updateSettings } from '../services/settings.service';
import { uploadPath } from '../services/upload.service';
import { asyncHandler } from '../utils/asyncHandler';
import { notFound } from '../utils/httpError';

const idOf = (req: { params: Record<string, string> }) => req.params.id;

export const statistics = asyncHandler(async (_req, res) => {
  res.json({ data: await svc.getStatistics() });
});

export const list = asyncHandler(async (req, res) => {
  res.json({ data: await svc.listAspirations(req.query as never) });
});

export const detail = asyncHandler(async (req, res) => {
  const data = await svc.getAspiration(idOf(req));
  await writeAudit(req, 'ASPIRATION_VIEWED', { targetType: 'Aspiration', targetId: data.id, meta: { code: data.code } });
  res.json({ data });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body as { status: never; note?: string };
  const result = await svc.changeStatus(idOf(req), status, note, req.admin!.id);
  if (result.changed) {
    await writeAudit(req, status === 'ARCHIVED' ? 'ASPIRATION_ARCHIVED' : 'STATUS_CHANGED', {
      targetType: 'Aspiration',
      targetId: idOf(req),
      meta: { from: result.from, to: status },
    });
  }
  res.json({ data: await svc.getAspiration(idOf(req)) });
});

export const reply = asyncHandler(async (req, res) => {
  const created = await svc.addReply(idOf(req), (req.body as { message: string }).message, req.admin!.id);
  await writeAudit(req, 'REPLY_CREATED', { targetType: 'Aspiration', targetId: idOf(req), meta: { replyId: created.id } });
  res.status(201).json({ data: await svc.getAspiration(idOf(req)) });
});

export const moderate = asyncHandler(async (req, res) => {
  const { decision, note } = req.body as { decision: never; note?: string };
  await svc.moderateManually(idOf(req), decision, note, req.admin!.id);
  await writeAudit(req, 'MODERATION_UPDATED', { targetType: 'Aspiration', targetId: idOf(req), meta: { decision } });
  res.json({ data: await svc.getAspiration(idOf(req)) });
});

export const remove = asyncHandler(async (req, res) => {
  const { code } = await svc.deleteAspiration(idOf(req));
  await writeAudit(req, 'ASPIRATION_DELETED', { targetType: 'Aspiration', targetId: idOf(req), meta: { code } });
  res.json({ data: { ok: true } });
});

export const downloadAttachment = asyncHandler(async (req, res) => {
  const file = await prisma.attachment.findUnique({ where: { id: idOf(req) } });
  if (!file) throw notFound('Lampiran tidak ditemukan.');
  const abs = uploadPath(file.storedName);
  if (!fs.existsSync(abs)) throw notFound('File lampiran sudah tidak ada di server.');

  const inlineOk = req.query.inline === '1' && file.mimeType.startsWith('image/');
  const encoded = encodeURIComponent(file.originalName);
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', `${inlineOk ? 'inline' : 'attachment'}; filename*=UTF-8''${encoded}`);
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.sendFile(abs);
});

export const saveSettings = asyncHandler(async (req, res) => {
  await updateSettings(req.body as { schoolName: string; classes: string[] });
  await writeAudit(req, 'SETTINGS_UPDATED', { meta: { classes: (req.body as { classes: string[] }).classes.length } });
  res.json({ data: { ok: true } });
});

export const maintenanceStatus = asyncHandler(async (_req, res) => {
  res.json({ data: { active: await getMaintenanceMode() } });
});

export const toggleMaintenance = asyncHandler(async (req, res) => {
  const active = await setMaintenanceMode((req.body as { active: boolean }).active);
  await writeAudit(req, 'MAINTENANCE_TOGGLED', { meta: { active } });
  res.json({ data: { active } });
});
