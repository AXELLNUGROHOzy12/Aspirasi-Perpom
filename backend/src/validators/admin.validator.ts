import { AspirationStatus, ModerationStatus } from '@prisma/client';
import { z } from 'zod';

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD');
const optionalNote = z.string().trim().max(500).optional();

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(1).max(200),
});

export const idParam = z.object({ id: z.string().min(10).max(40) });

export const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(40).optional(),
  className: z.string().trim().max(30).optional(),
  status: z.nativeEnum(AspirationStatus).optional(),
  moderation: z.nativeEnum(ModerationStatus).optional(),
  dateFrom: ymd.optional(),
  dateTo: ymd.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
export type ListQuery = z.infer<typeof listQuerySchema>;

export const statusBody = z.object({ status: z.nativeEnum(AspirationStatus), note: optionalNote });
export const replyBody = z.object({ message: z.string().trim().min(3, 'Balasan terlalu pendek.').max(2000) });
export const moderateBody = z.object({ decision: z.nativeEnum(ModerationStatus), note: optionalNote });

export const settingsBody = z.object({
  schoolName: z.string().trim().min(2).max(100),
  classes: z
    .array(z.string().trim().min(1).max(30))
    .min(1, 'Minimal satu kelas.')
    .max(80)
    .refine((list) => new Set(list).size === list.length, 'Nama kelas tidak boleh ada yang sama.'),
});

export const maintenanceBody = z.object({ active: z.boolean() });
