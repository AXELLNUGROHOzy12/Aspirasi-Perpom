import { env } from '../config/env';
import { prisma } from '../lib/prisma';

export const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

export async function getClasses(): Promise<string[]> {
  const row = await prisma.setting.findUnique({ where: { key: 'classes' } });
  if (row && Array.isArray(row.value)) return (row.value as unknown[]).filter((v): v is string => typeof v === 'string');
  return env.CLASS_LIST.split(',').map((s) => s.trim()).filter(Boolean);
}

export async function getSchoolName(): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key: 'schoolName' } });
  return typeof row?.value === 'string' ? row.value : env.SCHOOL_NAME;
}

export async function getPublicSettings() {
  const [schoolName, classes, categories] = await Promise.all([
    getSchoolName(),
    getClasses(),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { slug: true, name: true } }),
  ]);
  return {
    schoolName,
    classes,
    categories,
    turnstileSiteKey: env.CAPTCHA_SECRET && env.TURNSTILE_SITE_KEY ? env.TURNSTILE_SITE_KEY : null,
    upload: { maxFiles: env.UPLOAD_MAX_FILES, maxSizeBytes: env.UPLOAD_MAX_SIZE, allowedExtensions: ALLOWED_EXTENSIONS },
  };
}

export async function updateSettings(input: { schoolName: string; classes: string[] }) {
  await prisma.$transaction([
    prisma.setting.upsert({ where: { key: 'schoolName' }, create: { key: 'schoolName', value: input.schoolName }, update: { value: input.schoolName } }),
    prisma.setting.upsert({ where: { key: 'classes' }, create: { key: 'classes', value: input.classes }, update: { value: input.classes } }),
  ]);
}
