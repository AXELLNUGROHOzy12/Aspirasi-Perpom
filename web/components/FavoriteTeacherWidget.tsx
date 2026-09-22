'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, API_BASE, errorMessage } from '@/lib/api';
import type { FavoriteTeacherPublic } from '@/lib/types';

const VOTER_KEY = 'ft_voter_id';
const POS_KEY = 'ft_widget_pos';
const BADGE = 56;
const DRAG_THRESHOLD = 6;

function getVoterId(): string {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem(VOTER_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(VOTER_KEY, id);
  }
  return id;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function defaultPos() {
  if (typeof window === 'undefined') return { x: -BADGE * 0.45, y: 320 };
  return { x: -BADGE * 0.45, y: Math.max(120, window.innerHeight * 0.55) };
}

export default function FavoriteTeacherWidget() {
  const [state, setState] = useState<FavoriteTeacherPublic | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number; moved: boolean; pointerId: number } | null>(null);

  useEffect(() => {
    const voterId = getVoterId();
    api
      .get<FavoriteTeacherPublic>(`/favorite-teacher?voterId=${encodeURIComponent(voterId)}`)
      .then(setState)
      .catch(() => setState(null));

    try {
      const saved = window.localStorage.getItem(POS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { x: number; y: number };
        setPos({ x: clamp(parsed.x, -BADGE * 0.6, window.innerWidth - BADGE * 0.4), y: clamp(parsed.y, 12, window.innerHeight - BADGE - 12) });
        return;
      }
    } catch {
      /* abaikan, pakai posisi default */
    }
    setPos(defaultPos());
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!pos) return;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: pos.x, baseY: pos.y, moved: false, pointerId: e.pointerId };
    },
    [pos],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) d.moved = true;
    if (!d.moved) return;
    setPos({
      x: clamp(d.baseX + dx, -BADGE * 0.6, window.innerWidth - BADGE * 0.4),
      y: clamp(d.baseY + dy, 12, window.innerHeight - BADGE - 12),
    });
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      if (!d) return;
      if (d.moved) {
        setPos((current) => {
          if (current) window.localStorage.setItem(POS_KEY, JSON.stringify(current));
          return current;
        });
      } else {
        setOpen(true);
      }
    },
    [],
  );

  async function submitVote() {
    if (!selected || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post('/favorite-teacher/vote', { teacherId: selected, voterId: getVoterId() });
      setState((s) => (s ? { ...s, alreadyVoted: true, votedTeacherId: selected } : s));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (!state?.active || !pos) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Pilih guru favorit"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ left: pos.x, top: pos.y, width: BADGE, height: BADGE, touchAction: 'none' }}
        className="ft-badge fixed z-40 flex items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-brand to-brand text-white shadow-lg shadow-slate-900/20 active:scale-95"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M8 21h8M12 17v4M7 4h10v3a5 5 0 0 1-10 0V4z" />
          <path d="M7 5H4a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4M17 5h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4" />
        </svg>
        <span className="ft-sparkle pointer-events-none absolute -right-0.5 -top-0.5 text-sm">✨</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Pilih guru favorit">
          <button type="button" aria-label="Tutup" className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <div className="ft-sheet card relative m-0 w-full max-w-md rounded-b-none sm:m-4 sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold">Pilih Guru Favorit ✨</h2>
                <p className="mt-1 text-sm text-muted">Satu suara per perangkat. Yuk pilih guru favoritmu!</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Tutup" className="btn-outline btn-sm !min-h-9 !px-3">✕</button>
            </div>

            {state.alreadyVoted ? (
              <div className="mt-5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-4 text-center text-sm text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
                🎉 Terima kasih! Pilihanmu sudah tercatat.
              </div>
            ) : (
              <>
                {state.teachers.length === 0 ? (
                  <p className="mt-5 text-sm text-muted">Belum ada guru yang bisa dipilih.</p>
                ) : (
                  <div className="mt-4 grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto pb-1 sm:grid-cols-3">
                    {state.teachers.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelected(t.id)}
                        className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition ${
                          selected === t.id ? 'border-brand bg-brand/10' : 'border-line hover:border-brand/50'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`${API_BASE}/api/favorite-teacher/photo/${t.id}`}
                          alt={t.name}
                          className="h-16 w-16 rounded-full object-cover"
                        />
                        <span className="line-clamp-2 text-xs font-semibold">{t.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {error && <p className="field-error mt-3">{error}</p>}
                <button type="button" onClick={submitVote} disabled={!selected || submitting} className="btn-primary mt-4 w-full">
                  {submitting ? 'Mengirim...' : 'Pilih Guru Ini'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
