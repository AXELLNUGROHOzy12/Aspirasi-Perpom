'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import Alert from '@/components/Alert';
import EmptyState from '@/components/EmptyState';
import { IconArrow, IconCheck, IconInbox, IconRefresh, IconSearch, IconShield } from '@/components/Icons';
import Spinner from '@/components/Spinner';
import { useAdmin } from '@/components/AdminShell';
import { api, errorMessage } from '@/lib/api';
import type { Statistics } from '@/lib/types';

function StatCard({ href, icon, label, value, hint }: { href: string; icon: ReactNode; label: string; value: number; hint: string }) {
  return (
    <Link href={href} className="card group !p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">{icon}</span>
        <span className="text-muted opacity-0 transition group-hover:opacity-100"><IconArrow size={16} /></span>
      </div>
      <p className="mt-4 text-3xl font-extrabold tabular-nums tracking-tight">{value}</p>
      <p className="mt-0.5 text-sm font-semibold">{label}</p>
      <p className="mt-0.5 text-xs text-muted">{hint}</p>
    </Link>
  );
}

export default function DashboardPage() {
  const admin = useAdmin();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    api.get<Statistics>('/admin/statistics').then(setStats).catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!stats) return <Spinner />;

  const maxDay = Math.max(1, ...stats.last7Days.map((d) => d.count));
  const maxCat = Math.max(1, ...stats.byCategory.map((c) => c.count));
  const week = stats.last7Days.reduce((s, d) => s + d.count, 0);
  const firstName = admin.name.split(' ')[0];

  // Urutan prioritas: baru, perlu moderasi, sedang diproses
  const attention = [
    { label: 'Aspirasi baru', value: stats.pending, href: '/aspirations?status=PENDING', text: 'menunggu diperiksa' },
    { label: 'Perlu dicek moderator', value: stats.needsReview, href: '/aspirations?moderation=NEEDS_REVIEW', text: 'butuh peninjauan manual' },
    { label: 'Sedang ditinjau', value: stats.reviewing, href: '/aspirations?status=REVIEWING', text: 'menunggu balasan' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Selamat datang kembali, {firstName}.</h1>
          <p className="mt-1 text-sm text-muted">Ringkasan aspirasi siswa hari ini.</p>
        </div>
        <form action="/aspirations" className="flex w-full gap-2 sm:max-w-sm">
          <label htmlFor="q" className="sr-only">Cari aspirasi</label>
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted"><IconSearch size={18} /></span>
            <input id="q" name="q" className="input pl-11" placeholder="Cari aspirasi..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </form>
      </div>

      <section aria-label="Statistik" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard href="/aspirations" icon={<IconInbox />} label="Total Aspirasi" value={stats.total} hint={`${week} masuk 7 hari terakhir`} />
        <StatCard href="/aspirations?status=PENDING" icon={<IconSearch />} label="Menunggu Ditinjau" value={stats.pending} hint="Belum diperiksa" />
        <StatCard href="/aspirations?status=IN_PROGRESS" icon={<IconRefresh />} label="Sedang Diproses" value={stats.inProgress} hint="Sedang ditindaklanjuti" />
        <StatCard href="/aspirations?status=RESOLVED" icon={<IconCheck />} label="Selesai" value={stats.resolved} hint="Sudah ditindaklanjuti" />
      </section>

      {stats.total === 0 ? (
        <EmptyState title="Belum ada aspirasi." hint="Aspirasi yang masuk akan muncul di sini." />
      ) : (
        <>
          <section aria-label="Perlu perhatian" className="card">
            <div className="flex items-center gap-2">
              <span className="text-brand"><IconShield size={18} /></span>
              <h2 className="font-bold">Perlu perhatian</h2>
            </div>
            <ul className="mt-3 divide-y divide-line/70">
              {attention.map((a) => (
                <li key={a.label}>
                  <Link href={a.href} className="flex min-h-14 items-center justify-between gap-3 py-2 transition hover:text-brand">
                    <span>
                      <span className="block text-sm font-semibold">{a.label}</span>
                      <span className="block text-xs text-muted">{a.text}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={`min-w-8 rounded-full px-2.5 py-1 text-center text-sm font-bold tabular-nums ${a.value > 0 ? 'bg-brand text-white' : 'bg-line/60 text-muted'}`}>{a.value}</span>
                      <IconArrow size={16} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card">
              <h2 className="font-bold">Masuk 7 hari terakhir</h2>
              <div className="mt-5 flex h-40 items-end gap-2 sm:gap-3">
                {stats.last7Days.map((d) => (
                  <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                    <span className="text-xs font-semibold tabular-nums text-muted">{d.count}</span>
                    <div className="w-full rounded-lg bg-brand" style={{ height: `${Math.max(4, (d.count / maxDay) * 100)}px`, opacity: d.count ? 1 : 0.2 }} />
                    <span className="text-[11px] text-muted">{d.date.slice(8)}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="card">
              <h2 className="font-bold">Per kategori</h2>
              <ul className="mt-4 space-y-4">
                {stats.byCategory.map((c) => (
                  <li key={c.name}>
                    <div className="flex justify-between text-sm"><span className="font-medium">{c.name}</span><span className="tabular-nums text-muted">{c.count}</span></div>
                    <div className="mt-1.5 h-2 rounded-full bg-line/60"><div className="h-2 rounded-full bg-brand" style={{ width: `${(c.count / maxCat) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
