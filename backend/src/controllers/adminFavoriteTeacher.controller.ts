import { writeAudit } from '../services/audit.service';
import * as svc from '../services/favoriteTeacher.service';
import { saveTeacherPhoto } from '../services/teacherPhoto.service';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../utils/httpError';
import { teacherNameField } from '../validators/favoriteTeacher.validator';

export const overview = asyncHandler(async (_req, res) => {
  res.json({ data: await svc.listTeachersAdmin() });
});

export const toggle = asyncHandler(async (req, res) => {
  const { active } = req.body as { active: boolean };
  await svc.setEventActive(active);
  await writeAudit(req, 'FAVORITE_TEACHER_TOGGLED', { meta: { active } });
  res.json({ data: await svc.listTeachersAdmin() });
});

export const createTeacher = asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(422, 'Foto guru wajib diunggah.', 'VALIDATION', { photo: ['Foto guru wajib diunggah.'] });
  const name = teacherNameField.safeParse(req.body?.name);
  if (!name.success) throw new HttpError(422, name.error.issues[0].message, 'VALIDATION', { name: [name.error.issues[0].message] });

  const photo = await saveTeacherPhoto(req.file);
  const teacher = await svc.createTeacher({ name: name.data, photo });
  await writeAudit(req, 'FAVORITE_TEACHER_CREATED', { targetType: 'Teacher', targetId: teacher.id, meta: { name: teacher.name } });
  res.status(201).json({ data: await svc.listTeachersAdmin() });
});

export const updateTeacher = asyncHandler(async (req, res) => {
  const body = req.body as { name?: string; isActive?: string | boolean };
  const photo = req.file ? await saveTeacherPhoto(req.file) : undefined;

  await svc.updateTeacher(req.params.id, {
    name: body.name,
    isActive: body.isActive === undefined ? undefined : body.isActive === true || body.isActive === 'true',
    photo,
  });
  await writeAudit(req, 'FAVORITE_TEACHER_UPDATED', { targetType: 'Teacher', targetId: req.params.id });
  res.json({ data: await svc.listTeachersAdmin() });
});

export const deleteTeacher = asyncHandler(async (req, res) => {
  await svc.deleteTeacher(req.params.id);
  await writeAudit(req, 'FAVORITE_TEACHER_DELETED', { targetType: 'Teacher', targetId: req.params.id });
  res.json({ data: await svc.listTeachersAdmin() });
});

export const reorder = asyncHandler(async (req, res) => {
  const { order } = req.body as { order: string[] };
  await svc.reorderTeachers(order);
  res.json({ data: await svc.listTeachersAdmin() });
});

export const resetVotes = asyncHandler(async (req, res) => {
  await svc.resetVotes();
  await writeAudit(req, 'FAVORITE_TEACHER_VOTES_RESET', {});
  res.json({ data: await svc.listTeachersAdmin() });
});
