import { z } from 'zod';
import { CODE_REGEX, normalizeCode } from '../utils/code';

export const submitSchema = z.object({
  name: z.string().trim().max(60, 'Nama maksimal 60 karakter.').default(''),
  className: z.string().trim().min(1, 'Pilih kelas.').max(30),
  category: z.string().trim().min(1, 'Pilih kategori.').max(40),
  title: z.string().trim().min(5, 'Judul minimal 5 karakter.').max(120, 'Judul maksimal 120 karakter.'),
  body: z.string().trim().min(20, 'Isi aspirasi minimal 20 karakter.').max(3000, 'Isi aspirasi maksimal 3000 karakter.'),
  consent: z.union([z.literal('true'), z.literal(true)], { errorMap: () => ({ message: 'Centang persetujuan terlebih dulu.' }) }),
  website: z.string().max(200).default(''), // honeypot: manusia tidak mengisi kolom ini
  startedAt: z.coerce.number().optional(),
  captchaToken: z.string().max(4096).default(''),
});
export type SubmitInput = z.infer<typeof submitSchema>;

export const codeParam = z.object({
  code: z.string().max(40).transform(normalizeCode),
});
export const isValidCode = (code: string) => CODE_REGEX.test(code);
