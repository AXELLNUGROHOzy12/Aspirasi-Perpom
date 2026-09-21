'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import Alert from '@/components/Alert';
import { useAdmin } from '@/components/AdminShell';
import { ModerationBadge, StatusBadge } from '@/components/Badges';
import Spinner from '@/components/Spinner';
import { API_BASE, api, errorMessage } from '@/lib/api';
import { formatDate, formatSize } from '@/lib/format';
import { MODERATION_INFO, STATUS_INFO } from '@/lib/labels';
import type { AspirationDetail, AspirationStatus, ModerationStatus } from '@/lib/types';

export default function AspirationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const admin = useAdmin();
  const canManage = admin.role !== 'MODERATOR';
  const [a, setA] = useState<AspirationDetail | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [reply, setReply] = useState('');
  const [decision, setDecision] = useState<ModerationStatus>('APPROVED');
  const replyRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    try {
      const d = await api.get<AspirationDetail>(`/admin/aspirations/${id}`);
      setA(d); setDecision(d.moderationStatus);
    } catch (e) { setError(errorMessage(e)); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  async function run(fn: () => Promise<AspirationDetail | unknown>, okMsg: string) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await fn();
      if (res && typeof res === 'object' && 'id' in res) setA(res as AspirationDetail);
      setNotice(okMsg);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  const setStatus = (status: AspirationStatus) =>
    run(async () => { const r = await api.patch<AspirationDetail>(`/admin/aspirations/${id}/status`, { status, note: note || undefined }); setNote(''); return r; }, `Status diubah menjadi ${STATUS_INFO[status].label}.`);

  const sendReply = () =>
    run(async () => { const r = await api.post<AspirationDetail>(`/admin/aspirations/${id}/reply`, { message: reply }); setReply(''); return r; }, 'Balasan terkirim dan sudah bisa dilihat siswa.');

  const saveModeration = () =>
    run(() => api.post<AspirationDetail>(`/admin/aspirations/${id}/moderate`, { decision, note: note || undefined }).then((r) => { setNote(''); return r; }), 'Status moderasi diperbarui.');

  async function remove() {
    if (!confirm('Hapus aspirasi ini secara permanen? Tindakan ini tidak bisa dibatalkan.')) return;
    setBusy(true);
    try { await api.del(`/admin/aspirations/${id}`); router.replace('/aspirations'); }
    catch (e) { setError(errorMessage(e)); setBusy(false); }
  }

  if (!a) return error ? <Alert tone="error">{error}</Alert> : <Spinner />;
  const isImage = (m: string) => m.startsWith('image/');
  const btn = (s: AspirationStatus, label: string) => (
    <button type="button" className="btn-outline btn-sm" disabled={busy || a.status === s} onClick={() => setStatus(s)}>{label}</button>
  );

  return (
    <div className="space-y-4">
      <Link href="/aspirations" className="inline-flex min-h-10 items-center text-sm font-medium text-brand">‹ Kembali ke daftar</Link>
      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <section className="card">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-muted">{a.code}</span>
          <StatusBadge status={a.status} />
          <ModerationBadge status={a.moderationStatus} />
        </div>
        <h1 className="mt-3 text-2xl font-bold leading-snug">{a.title}</h1>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div><dt className="text-muted">Kelas</dt><dd className="font-medium">{a.className}</dd></div>
          <div><dt className="text-muted">Kategori</dt><dd className="font-medium">{a.category.name}</dd></div>
          <div><dt className="text-muted">Nama</dt><dd className="font-medium">{a.authorName || <span className="text-muted">Tidak dicantumkan</span>}</dd></div>
          <div><dt className="text-muted">Tanggal</dt><dd className="font-medium">{formatDate(a.createdAt)}</dd></div>
        </dl>
        <p className="mt-4 whitespace-pre-line break-words leading-relaxed">{a.body}</p>

        {a.attachments.length > 0 && (
          <div className="mt-5">
            <h2 className="text-sm font-semibold">Lampiran</h2>
            <ul className="mt-2 space-y-3">
              {a.attachments.map((f) => (
                <li key={f.id} className="rounded-xl border border-line p-3">
                  {isImage(f.mimeType) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`${API_BASE}/api/admin/attachments/${f.id}/download?inline=1`} alt={f.originalName} className="mb-2 max-h-72 w-full rounded-lg object-contain" />
                  )}
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">{f.originalName} <span className="text-muted">({formatSize(f.size)})</span></span>
                    <a href={`${API_BASE}/api/admin/attachments/${f.id}/download`} className="btn-outline btn-sm shrink-0">Unduh</a>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {canManage && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Tindakan</h2>
          <div>
            <label htmlFor="note" className="label">Catatan internal (opsional, tidak dilihat siswa)</label>
            <input id="note" className="input" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            {btn('REVIEWING', 'Tandai Ditinjau')}
            {btn('IN_PROGRESS', 'Tandai Diproses')}
            {btn('RESOLVED', 'Tandai Selesai')}
            <button type="button" className="btn-outline btn-sm" onClick={() => replyRef.current?.focus()}>Balas</button>
            {a.status === 'ARCHIVED' ? btn('PENDING', 'Buka Arsip') : btn('ARCHIVED', 'Arsipkan')}
          </div>
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="font-semibold">Balasan</h2>
        {a.replies.length === 0 && <p className="text-sm text-muted">Belum ada balasan.</p>}
        {a.replies.map((r) => (
          <div key={r.id} className="rounded-xl bg-bg p-3">
            <p className="whitespace-pre-line text-sm">{r.message}</p>
            <p className="mt-2 text-xs text-muted">{r.admin?.name ?? 'Admin'} · {formatDate(r.createdAt)}</p>
          </div>
        ))}
        {canManage && (
          <>
            <label htmlFor="reply" className="label">Balasan untuk siswa</label>
            <textarea id="reply" ref={replyRef} className="input min-h-28" maxLength={2000} placeholder="Tulis balasan yang akan tampil di halaman Lacak siswa..." value={reply} onChange={(e) => setReply(e.target.value)} />
            <button type="button" className="btn-primary" disabled={busy || reply.trim().length < 3} onClick={sendReply}>{busy ? 'Mengirim...' : 'Kirim Balasan'}</button>
          </>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Moderasi</h2>
        {a.moderationLogs.map((m) => (
          <div key={m.id} className="rounded-xl bg-bg p-3 text-sm">
            <p><strong>{MODERATION_INFO[m.decision].label}</strong> · {m.source === 'AUTO' ? `Otomatis${m.score != null ? ` (skor ${m.score})` : ''}` : `Oleh ${m.admin?.name ?? 'admin'}`} · <span className="text-muted">{formatDate(m.createdAt)}</span></p>
            {m.reasons && m.reasons.length > 0 && <ul className="mt-1 list-disc pl-5 text-muted">{m.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
            {m.note && <p className="mt-1 text-muted">Catatan: {m.note}</p>}
          </div>
        ))}
        <div className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="decision" className="sr-only">Keputusan moderasi</label>
          <select id="decision" className="input" value={decision} onChange={(e) => setDecision(e.target.value as ModerationStatus)}>
            {(Object.keys(MODERATION_INFO) as ModerationStatus[]).map((m) => <option key={m} value={m}>{MODERATION_INFO[m].label}</option>)}
          </select>
          <button type="button" className="btn-outline sm:w-48" disabled={busy || decision === a.moderationStatus} onClick={saveModeration}>Simpan moderasi</button>
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold">Riwayat status</h2>
        <ol className="mt-3 space-y-3">
          {a.statusHistory.map((h) => (
            <li key={h.id} className="border-l-2 border-brand pl-3 text-sm">
              <p className="text-xs text-muted">{formatDate(h.createdAt)}</p>
              <p className="font-medium">{h.fromStatus === null ? 'Aspirasi dikirim' : `${STATUS_INFO[h.toStatus].label}${h.admin ? ` oleh ${h.admin.name}` : ''}`}</p>
              {h.note && h.fromStatus !== null && <p className="text-muted">Catatan: {h.note}</p>}
            </li>
          ))}
        </ol>
      </section>

      {admin.role === 'SUPER_ADMIN' && (
        <button type="button" className="btn-danger w-full sm:w-auto" disabled={busy} onClick={remove}>Hapus aspirasi</button>
      )}
    </div>
  );
}
