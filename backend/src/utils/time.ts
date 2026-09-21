import { env } from '../config/env';

export function offsetMs(): number {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(env.TIMEZONE_OFFSET);
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) * 60_000;
}

export const startOfDay = (ymd: string) => new Date(`${ymd}T00:00:00.000${env.TIMEZONE_OFFSET}`);
export const endOfDay = (ymd: string) => new Date(`${ymd}T23:59:59.999${env.TIMEZONE_OFFSET}`);
export const localDateKey = (d: Date) => new Date(d.getTime() + offsetMs()).toISOString().slice(0, 10);
