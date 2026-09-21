import type { AspirationStatus, ModerationStatus } from './types';

export type Tone = 'amber' | 'blue' | 'violet' | 'green' | 'slate' | 'red';

export const TONE_CLASS: Record<Tone, string> = {
  amber: 'bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200',
  blue: 'bg-sky-100 text-sky-900 dark:bg-sky-400/15 dark:text-sky-200',
  violet: 'bg-violet-100 text-violet-900 dark:bg-violet-400/15 dark:text-violet-200',
  green: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200',
  slate: 'bg-slate-200 text-slate-800 dark:bg-slate-400/15 dark:text-slate-200',
  red: 'bg-rose-100 text-rose-900 dark:bg-rose-400/15 dark:text-rose-200',
};

export const STATUS_INFO: Record<AspirationStatus, { label: string; description: string; tone: Tone }> = {
  PENDING: { label: 'Diterima', description: 'Menunggu pemeriksaan.', tone: 'amber' },
  REVIEWING: { label: 'Ditinjau', description: 'Sedang ditinjau oleh pihak sekolah.', tone: 'blue' },
  IN_PROGRESS: { label: 'Diproses', description: 'Sedang diproses.', tone: 'violet' },
  RESOLVED: { label: 'Selesai', description: 'Aspirasi telah ditindaklanjuti.', tone: 'green' },
  ARCHIVED: { label: 'Diarsipkan', description: 'Aspirasi telah diarsipkan.', tone: 'slate' },
};

export const MODERATION_INFO: Record<ModerationStatus, { label: string; tone: Tone }> = {
  APPROVED: { label: 'Aman', tone: 'green' },
  NEEDS_REVIEW: { label: 'Perlu dicek', tone: 'amber' },
  REJECTED: { label: 'Ditolak', tone: 'red' },
};

export const STATUS_ORDER: AspirationStatus[] = ['PENDING', 'REVIEWING', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED'];
