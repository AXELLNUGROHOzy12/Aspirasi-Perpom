import fs from 'fs';
import { prisma } from '../lib/prisma';
import * as svc from '../services/favoriteTeacher.service';
import { teacherPhotoPath } from '../services/teacherPhoto.service';
import { asyncHandler } from '../utils/asyncHandler';
import { notFound } from '../utils/httpError';
import { voteBody } from '../validators/favoriteTeacher.validator';

export const state = asyncHandler(async (req, res) => {
  const voterId = typeof req.query.voterId === 'string' ? req.query.voterId : undefined;
  res.json({ data: await svc.getPublicState(voterId) });
});

export const vote = asyncHandler(async (req, res) => {
  const input = voteBody.parse(req.body ?? {});
  const result = await svc.castVote({ ...input, ip: req.ip ?? '' });
  res.status(201).json({ data: result });
});

export const photo = asyncHandler(async (req, res) => {
  const teacher = await prisma.teacher.findUnique({ where: { id: req.params.id }, select: { photoStored: true, photoMimeType: true } });
  if (!teacher) throw notFound('Foto tidak ditemukan.');
  const abs = teacherPhotoPath(teacher.photoStored);
  if (!fs.existsSync(abs)) throw notFound('Foto tidak ditemukan.');

  res.setHeader('Content-Type', teacher.photoMimeType);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(abs);
});
