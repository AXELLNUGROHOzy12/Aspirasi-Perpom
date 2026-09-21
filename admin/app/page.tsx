'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import EmptyState from '@/components/EmptyState';
import Spinner from '@/components/Spinner';
import { api, errorMessage } from '@/lib/api';
import type { Statistics } from '@/lib/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    api.get<Statistics>('/admin/statistics').then(setStats).catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!stats) return <Spinner />;

  const cards = [
    { label: 'Total', value: stats.total, href: '/aspirations' },
    { label: 'Baru', value: stats.pending, href: '/aspirations?status=PENDING' },
    { label: 'Ditinjau', value: stats.reviewing, href: '/aspirations?status=REVIEWING' },
    { label: 'Diproses', value: stats.inProgress, href: '/aspirations?status=IN_PROGRESS' },
    { label: 'Selesai', value: stats.resolved, href: '/aspirations?status=RESOLVED' },
    { label: 'Perlu dicek', value: stats.needsReview, href: '/aspirations?moderation=NEEDS_REVIEW' },
  ];
  const maxDay = Math.max(1, ...stats.last7Days.map((d) => d.count));
  const maxCat = Math.max(1, ...stats.byCategory.map((c) => c.count));

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>

      <form action="/aspirations" className="flex gap-2">
        <label htmlFor="q" className="sr-only">Cari aspirasi</label>
        <input id="q" name="q" className="input" placeholder="🔍 Cari aspirasi..." value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-primary" type="submit">Cari</button>
      </form>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card !p-4 transition hover:border-brand">
            <p className="text-sm text-muted">{c.label}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{c.value}</p>
          </Link>
        ))}
      </div>

      {stats.total === 0 ? (
        <EmptyState title="Belum ada aspirasi." hint="Aspirasi yang masuk akan muncul di sini." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="card">
            <h2 className="font-semibold">Masuk 7 hari terakhir</h2>
            <div className="mt-4 flex h-32 items-end gap-2">
              {stats.last7Days.map((d) => (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs tabular-nums text-muted">{d.count}</span>
                  <div className="w-full rounded-t bg-brand" style={{ height: `${Math.max(4, (d.count / maxDay) * 80)}px`, opacity: d.count ? 1 : 0.25 }} />
                  <span className="text-[10px] text-muted">{d.date.slice(8)}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="card">
            <h2 className="font-semibold">Per kategori</h2>
            <ul className="mt-3 space-y-3">
              {stats.byCategory.map((c) => (
                <li key={c.name}>
                  <div className="flex justify-between text-sm"><span>{c.name}</span><span className="tabular-nums text-muted">{c.count}</span></div>
                  <div className="mt-1 h-2 rounded-full bg-line"><div className="h-2 rounded-full bg-brand" style={{ width: `${(c.count / maxCat) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
