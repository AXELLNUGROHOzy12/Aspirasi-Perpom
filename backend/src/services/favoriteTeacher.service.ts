import { prisma } from '../lib/prisma';
import { hashIp } from '../utils/hash';
import { HttpError, notFound } from '../utils/httpError';
import { sanitizeText } from '../utils/sanitize';
import { deleteTeacherPhoto, type StoredPhoto } from './teacherPhoto.service';

const ACTIVE_KEY = 'favoriteTeacherActive';

export async function isEventActive(): Promise<boolean> {
  const row = await prisma.setting.findUnique({ where: { key: ACTIVE_KEY } });
  return row?.value === true;
}

export async function setEventActive(active: boolean) {
  await prisma.setting.upsert({
    where: { key: ACTIVE_KEY },
    create: { key: ACTIVE_KEY, value: active },
    update: { value: active },
  });
}

// ---------- Publik ----------

export async function getPublicState(voterId?: string) {
  const [active, teachers] = await Promise.all([
    isEventActive(),
    prisma.teacher.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, name: true },
    }),
  ]);

  let alreadyVoted = false;
  let votedTeacherId: string | null = null;
  if (voterId) {
    const vote = await prisma.teacherVote.findUnique({ where: { voterId }, select: { teacherId: true } });
    if (vote) {
      alreadyVoted = true;
      votedTeacherId = vote.teacherId;
    }
  }

  return { active, teachers, alreadyVoted, votedTeacherId };
}

export async function castVote(input: { teacherId: string; voterId: string; ip: string }) {
  const active = await isEventActive();
  if (!active) throw new HttpError(409, 'Pemilihan guru favorit sedang tidak dibuka.', 'EVENT_INACTIVE');

  const teacher = await prisma.teacher.findUnique({ where: { id: input.teacherId } });
  if (!teacher || !teacher.isActive) throw notFound('Guru yang kamu pilih tidak ditemukan.');

  const existing = await prisma.teacherVote.findUnique({ where: { voterId: input.voterId } });
  if (existing) throw new HttpError(409, 'Kamu sudah memilih guru favorit sebelumnya.', 'ALREADY_VOTED');

  try {
    await prisma.teacherVote.create({
      data: { teacherId: input.teacherId, voterId: input.voterId, ipHash: input.ip ? hashIp(input.ip) : null },
    });
  } catch {
    // Race condition: dua request nyaris bersamaan dari voterId yang sama.
    throw new HttpError(409, 'Kamu sudah memilih guru favorit sebelumnya.', 'ALREADY_VOTED');
  }

  return { teacherId: input.teacherId, teacherName: teacher.name };
}

// ---------- Admin ----------

export async function listTeachersAdmin() {
  const teachers = await prisma.teacher.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { votes: true } } },
  });
  const totalVotes = teachers.reduce((sum, t) => sum + t._count.votes, 0);

  return {
    active: await isEventActive(),
    totalVotes,
    teachers: teachers.map((t) => ({
      id: t.id,
      name: t.name,
      isActive: t.isActive,
      sortOrder: t.sortOrder,
      votes: t._count.votes,
      percentage: totalVotes > 0 ? Math.round((t._count.votes / totalVotes) * 1000) / 10 : 0,
    })),
  };
}

export async function createTeacher(input: { name: string; photo: StoredPhoto }) {
  const name = sanitizeText(input.name);
  if (name.length < 2) throw new HttpError(422, 'Nama guru minimal 2 karakter.', 'VALIDATION', { name: ['Nama guru minimal 2 karakter.'] });
  if (name.length > 80) throw new HttpError(422, 'Nama guru maksimal 80 karakter.', 'VALIDATION', { name: ['Nama guru maksimal 80 karakter.'] });

  const max = await prisma.teacher.aggregate({ _max: { sortOrder: true } });
  return prisma.teacher.create({
    data: {
      name,
      photoStored: input.photo.storedName,
      photoOriginalName: input.photo.originalName,
      photoMimeType: input.photo.mimeType,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
    },
  });
}

export async function updateTeacher(
  id: string,
  input: { name?: string; isActive?: boolean; photo?: StoredPhoto },
) {
  const teacher = await prisma.teacher.findUnique({ where: { id } });
  if (!teacher) throw notFound('Guru tidak ditemukan.');

  const data: { name?: string; isActive?: boolean; photoStored?: string; photoOriginalName?: string; photoMimeType?: string } = {};

  if (input.name !== undefined) {
    const name = sanitizeText(input.name);
    if (name.length < 2 || name.length > 80) {
      throw new HttpError(422, 'Nama guru harus 2-80 karakter.', 'VALIDATION', { name: ['Nama guru harus 2-80 karakter.'] });
    }
    data.name = name;
  }
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.photo) {
    data.photoStored = input.photo.storedName;
    data.photoOriginalName = input.photo.originalName;
    data.photoMimeType = input.photo.mimeType;
  }

  const updated = await prisma.teacher.update({ where: { id }, data });
  if (input.photo) await deleteTeacherPhoto(teacher.photoStored); // hapus foto lama setelah foto baru tersimpan
  return updated;
}

export async function deleteTeacher(id: string) {
  const teacher = await prisma.teacher.findUnique({ where: { id } });
  if (!teacher) throw notFound('Guru tidak ditemukan.');
  await prisma.teacher.delete({ where: { id } });
  await deleteTeacherPhoto(teacher.photoStored);
}

export async function reorderTeachers(order: string[]) {
  const count = await prisma.teacher.count({ where: { id: { in: order } } });
  if (count !== order.length) throw new HttpError(422, 'Urutan guru tidak valid.', 'VALIDATION');
  await prisma.$transaction(order.map((id, idx) => prisma.teacher.update({ where: { id }, data: { sortOrder: idx } })));
}

export async function resetVotes() {
  await prisma.teacherVote.deleteMany({});
}
