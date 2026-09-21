import { MODERATION_INFO, STATUS_INFO, TONE_CLASS } from '@/lib/labels';
import type { AspirationStatus, ModerationStatus } from '@/lib/types';

const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold';

export function StatusBadge({ status }: { status: AspirationStatus }) {
  const info = STATUS_INFO[status];
  return <span className={`${base} ${TONE_CLASS[info.tone]}`}>{info.label}</span>;
}

export function ModerationBadge({ status }: { status: ModerationStatus }) {
  const info = MODERATION_INFO[status];
  return <span className={`${base} ${TONE_CLASS[info.tone]}`}>Moderasi: {info.label}</span>;
}
