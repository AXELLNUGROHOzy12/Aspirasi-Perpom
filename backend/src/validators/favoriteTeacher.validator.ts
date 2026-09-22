import { z } from 'zod';

export const teacherIdParam = z.object({ id: z.string().min(10).max(40) });

export const voteBody = z.object({
  teacherId: z.string().min(10).max(40),
  // Token acak dibuat & disimpan di localStorage browser siswa (bukan akun/identitas asli).
  voterId: z.string().uuid('Perangkat kamu belum siap memilih. Muat ulang halaman lalu coba lagi.'),
});

export const toggleBody = z.object({ active: z.boolean() });

export const reorderBody = z.object({
  order: z.array(z.string().min(10).max(40)).min(1).max(200),
});

// Dipakai manual di controller (bukan lewat middleware `validate`) karena datang dari multipart/form-data.
export const teacherNameField = z
  .string()
  .trim()
  .min(2, 'Nama guru minimal 2 karakter.')
  .max(80, 'Nama guru maksimal 80 karakter.');
