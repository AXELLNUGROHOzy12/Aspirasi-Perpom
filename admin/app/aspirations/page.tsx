'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import { ModerationBadge, StatusBadge } from '@/components/Badges';
import EmptyState from '@/components/EmptyState';
import Spinner from '@/components/Spinner';
import { api, errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { STATUS_INFO, STATUS_ORDER } from '@/lib/labels';
import type { AspirationList, PublicSettings } from '@/lib/types';

interface Filters { q: string; status: string; category: string; className: string; moderation: string; dateFrom: string; dateTo: string; page: number }
const DEFAULT: Filters = { q: '', status: '', category: '', className: '', moderation: '', dateFrom: '', dateTo: '', page: 1 };

export default function AspirationListPage() {
  const [filters, setFilters] = useState<Filters>(DEFAULT);
  const [search, setSearch] = useState('');
  const [ready, setReady] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [data, setData] = useState<AspirationList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const init: Filters = { ...DEFAULT, q: p.get('q') ?? '', status: p.get('status') ?? '', moderation: p.get('moderation') ?? '' };
    setFilters(init); setSearch(init.q); setShowMore(!!init.moderation); setReady(true);
    api.get<PublicSettings>('/settings').then(setSettings).catch(() => undefined);
  }, []);

  // Pencarian ditunda 350 ms agar tidak memanggil server di setiap ketukan
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setFilters((f) => (f.q === search ? f : { ...f, q: search, page: 1 })), 350);
    return () => clearTimeout(t);
  }, [search, ready]);

  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams({ page: String(filters.page), pageSize: '10' });
    (['q', 'status', 'category', 'className', 'moderation', 'dateFrom', 'dateTo'] as const).forEach((k) => filters[k] && params.set(k, filters[k]));
    let stale = false;
    setLoading(true); setError('');
    api.get<AspirationList>(`/admin/aspirations?${params}`)
      .then((d) => { if (!stale) setData(d); })
      .catch((e) => { if (!stale) setError(errorMessage(e)); })
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, [filters, ready]);

  const update = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch, page: 1 }));
  const hasFilter = Object.entries(filters).some(([k, v]) => k !== 'page' && v);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-bold tracking-tight">Daftar Aspirasi</h1>

      <label htmlFor="search" className="sr-only">Cari aspirasi</label>
      <input id="search" className="input" placeholder="🔍 Cari kode, judul, isi, atau kelas..." value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button type="button" className={`chip shrink-0 ${filters.status === '' ? 'chip-active' : ''}`} onClick={() => update({ status: '' })}>Semua</button>
        {STATUS_ORDER.map((s) => (
          <button key={s} type="button" className={`chip shrink-0 ${filters.status === s ? 'chip-active' : ''}`} onClick={() => update({ status: s })}>{STATUS_INFO[s].label}</button>
        ))}
      </div>

      <button type="button" className="min-h-10 text-sm font-medium text-brand underline underline-offset-4" onClick={() => setShowMore(!showMore)}>
        {showMore ? 'Sembunyikan filter' : 'Filter lainnya'}
      </button>

      {showMore && (
        <div className="card grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="f-cat">Kategori</label>
            <select id="f-cat" className="input" value={filters.category} onChange={(e) => update({ category: e.target.value })}>
              <option value="">Semua kategori</option>
              {settings?.categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="f-class">Kelas</label>
            <select id="f-class" className="input" value={filters.className} onChange={(e) => update({ className: e.target.value })}>
              <option value="">Semua kelas</option>
              {settings?.classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="f-mod">Status moderasi</label>
            <select id="f-mod" className="input" value={filters.moderation} onChange={(e) => update({ moderation: e.target.value })}>
              <option value="">Semua</option>
              <option value="APPROVED">Aman</option>
              <option value="NEEDS_REVIEW">Perlu dicek</option>
              <option value="REJECTED">Ditolak</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="f-from">Dari tanggal</label>
              <input id="f-from" type="date" className="input" value={filters.dateFrom} onChange={(e) => update({ dateFrom: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="f-to">Sampai</label>
              <input id="f-to" type="date" className="input" value={filters.dateTo} onChange={(e) => update({ dateTo: e.target.value })} />
            </div>
          </div>
          {hasFilter && (
            <button type="button" className="btn-outline btn-sm sm:col-span-2" onClick={() => { setSearch(''); setFilters(DEFAULT); }}>Reset filter</button>
          )}
        </div>
      )}

      {error && <Alert tone="error">{error}</Alert>}
      {loading && !data && <Spinner />}

      {data && (
        <div className={loading ? 'opacity-60 transition' : 'transition'}>
          {data.items.length === 0 ? (
            hasFilter ? <EmptyState title="Aspirasi yang kamu cari tidak ditemukan." hint="Coba ubah kata kunci atau filter." />
                      : <EmptyState title="Belum ada aspirasi." hint="Aspirasi yang masuk akan muncul di sini." />
          ) : (
            <>
              <p className="mb-3 text-sm text-muted">{data.total} aspirasi</p>
              <ul className="space-y-3">
                {data.items.map((a) => (
                  <li key={a.id} className="card !p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs text-muted">{a.code}</span>
                      <span className="text-xs text-muted">{formatDate(a.createdAt)}</span>
                    </div>
                    <h2 className="mt-1 font-semibold leading-snug">{a.title}</h2>
                    <p className="mt-1 text-sm text-muted">{a.category.name} · {a.className}{a._count.replies > 0 && ` · ${a._count.replies} balasan`}{a._count.attachments > 0 && ` · ${a._count.attachments} lampiran`}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusBadge status={a.status} />
                      <ModerationBadge status={a.moderationStatus} />
                      <Link href={`/aspirations/${a.id}`} className="btn-outline btn-sm ml-auto">Detail</Link>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-center justify-between gap-3">
                <button type="button" className="btn-outline btn-sm" disabled={data.page <= 1 || loading} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>‹ Sebelumnya</button>
                <span className="text-sm text-muted">Halaman {data.page} dari {data.totalPages}</span>
                <button type="button" className="btn-outline btn-sm" disabled={data.page >= data.totalPages || loading} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>Berikutnya ›</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
