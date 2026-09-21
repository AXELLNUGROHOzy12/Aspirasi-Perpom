'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import { StatusBadge } from '@/components/Badges';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { api, errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { STATUS_INFO } from '@/lib/labels';
import type { AspirationStatus, TrackingResult } from '@/lib/types';

const STEPS: { status: AspirationStatus; label: string }[] = [
  { status: 'PENDING', label: 'Aspirasi diterima' },
  { status: 'REVIEWING', label: 'Sedang ditinjau' },
  { status: 'IN_PROGRESS', label: 'Sedang diproses' },
  { status: 'RESOLVED', label: 'Selesai' },
];

export default function TrackPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TrackingResult | null>(null);

  async function lookup(value: string) {
    const c = value.trim().toUpperCase();
    if (!c) { setError('Masukkan kode aspirasimu dulu.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      setResult(await api.get<TrackingResult>(`/aspirations/${encodeURIComponent(c)}`));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get('kode');
    if (k) { setCode(k.toUpperCase()); void lookup(k); }
  }, []);

  const reachedAt = new Map<AspirationStatus, string>();
  result?.timeline.forEach((t) => { if (!reachedAt.has(t.status)) reachedAt.set(t.status, t.at); });
  const stepIdx = (s: AspirationStatus) => STEPS.findIndex((x) => x.status === s);
  const maxIdx = result ? Math.max(...result.timeline.map((t) => stepIdx(t.status)), stepIdx(result.status), 0) : 0;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Lacak Aspirasi</h1>
        <p className="mt-2 text-muted">Masukkan kode yang kamu dapat setelah mengirim aspirasi.</p>

        <form onSubmit={(e) => { e.preventDefault(); void lookup(code); }} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="code" className="sr-only">Kode aspirasi</label>
          <input id="code" className="input font-mono tracking-wider" placeholder="ASP-20260921-XXXXXX" value={code} maxLength={40} autoCapitalize="characters" autoComplete="off" onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <button type="submit" className="btn-primary sm:w-40" disabled={loading}>{loading ? 'Mencari...' : 'Cek Status'}</button>
        </form>

        {error && <div className="mt-5"><Alert tone="error">{error}</Alert></div>}

        {result && (
          <div className="mt-6 space-y-4">
            <section className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-sm text-muted">{result.code}</p>
                <StatusBadge status={result.status} />
              </div>
              <h2 className="mt-2 text-xl font-bold">{result.title}</h2>
              <p className="mt-1 text-sm text-muted">{result.category} · {result.className} · dikirim {formatDate(result.createdAt)}</p>
              <p className="mt-3 rounded-xl bg-bg px-4 py-3 text-sm"><strong>{STATUS_INFO[result.status].label}:</strong> {STATUS_INFO[result.status].description}</p>
            </section>

            <section className="card" aria-label="Perkembangan aspirasi">
              <ol>
                {STEPS.map((s, i) => {
                  const done = i <= maxIdx;
                  const at = reachedAt.get(s.status);
                  return (
                    <li key={s.status} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-brand text-white' : 'border border-line text-muted'}`}>{done ? '✓' : i + 1}</span>
                        {i < STEPS.length - 1 && <span className={`my-1 w-0.5 flex-1 ${i < maxIdx ? 'bg-brand' : 'bg-line'}`} style={{ minHeight: 24 }} />}
                      </div>
                      <div className="pb-5">
                        <p className={`font-semibold ${done ? '' : 'text-muted'}`}>{s.label}</p>
                        {at && <p className="text-sm text-muted">{formatDate(at)}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
              {result.status === 'ARCHIVED' && <p className="text-sm text-muted">Aspirasi ini sudah diarsipkan oleh pihak sekolah.</p>}
            </section>

            {result.replies.length > 0 ? (
              <section className="space-y-3" aria-label="Balasan sekolah">
                {result.replies.map((r) => (
                  <blockquote key={r.id} className="card border-l-4 border-l-brand">
                    <p className="text-sm font-semibold text-brand">Balasan Sekolah</p>
                    <p className="mt-2 whitespace-pre-line">{r.message}</p>
                    <p className="mt-2 text-xs text-muted">{formatDate(r.createdAt)}</p>
                  </blockquote>
                ))}
              </section>
            ) : (
              <p className="text-center text-sm text-muted">Belum ada balasan dari pihak sekolah. Cek lagi nanti, ya.</p>
            )}
          </div>
        )}

        <p className="mt-8 text-center text-sm text-muted">Belum punya kode? <Link href="/aspirasi" className="font-medium text-brand underline underline-offset-4">Sampaikan aspirasi</Link></p>
      </main>
      <Footer />
    </>
  );
}
