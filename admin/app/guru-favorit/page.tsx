'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Alert from '@/components/Alert';
import { useAdmin } from '@/components/AdminShell';
import EmptyState from '@/components/EmptyState';
import { IconDown, IconEdit, IconPlus, IconTrash, IconTrophy, IconUp } from '@/components/Icons';
import Spinner from '@/components/Spinner';
import { API_BASE, api, errorMessage } from '@/lib/api';
import type { FavoriteTeacherOverview } from '@/lib/types';

export default function GuruFavoritPage() {
  const admin = useAdmin();
  const isSuperAdmin = admin.role === 'SUPER_ADMIN';
  const [data, setData] = useState<FavoriteTeacherOverview | null>(null);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState(false);

  const load = useCallback(() => {
    api.get<FavoriteTeacherOverview>('/admin/favorite-teacher').then(setData).catch((e) => setError(errorMessage(e)));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggle() {
    if (!data || toggling) return;
    setToggling(true);
    setError('');
    try {
      setData(await api.put<FavoriteTeacherOverview>('/admin/favorite-teacher/toggle', { active: !data.active }));
    } catch (e) { setError(errorMessage(e)); }
    finally { setToggling(false); }
  }

  async function resetVotes() {
    if (!confirm('Hapus semua suara yang sudah masuk? Daftar guru tidak ikut terhapus. Tindakan ini tidak bisa dibatalkan.')) return;
    try { setData(await api.post<FavoriteTeacherOverview>('/admin/favorite-teacher/reset-votes')); }
    catch (e) { setError(errorMessage(e)); }
  }

  async function move(id: string, dir: -1 | 1) {
    if (!data) return;
    const ids = data.teachers.map((t) => t.id);
    const idx = ids.indexOf(id);
    const swapWith = idx + dir;
    if (swapWith < 0 || swapWith >= ids.length) return;
    [ids[idx], ids[swapWith]] = [ids[swapWith], ids[idx]];
    try { setData(await api.patch<FavoriteTeacherOverview>('/admin/favorite-teacher/reorder', { order: ids })); }
    catch (e) { setError(errorMessage(e)); }
  }

  async function removeTeacher(id: string, name: string) {
    if (!confirm(`Hapus guru "${name}" dari pilihan? Foto dan suaranya ikut terhapus.`)) return;
    try { setData(await api.del<FavoriteTeacherOverview>(`/admin/favorite-teacher/teachers/${id}`)); }
    catch (e) { setError(errorMessage(e)); }
  }

  async function toggleActive(id: string, isActive: boolean) {
    const form = new FormData();
    form.append('isActive', String(!isActive));
    try { setData(await api.patch<FavoriteTeacherOverview>(`/admin/favorite-teacher/teachers/${id}`, form)); }
    catch (e) { setError(errorMessage(e)); }
  }

  if (!data) return error ? <Alert tone="error">{error}</Alert> : <Spinner />;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display flex items-center gap-2 text-3xl font-bold tracking-tight"><IconTrophy size={26} /> Guru Favorit</h1>
          <p className="mt-1 text-sm text-muted">Polling foto guru favorit yang tampil sebagai badge mengambang di halaman siswa. Siswa tidak melihat kata &quot;event&quot; — cukup aktif/nonaktifkan di sini.</p>
        </div>
        <button type="button" onClick={toggle} disabled={toggling} className={data.active ? 'btn-outline' : 'btn-primary'}>
          {toggling ? 'Menyimpan...' : data.active ? 'Nonaktifkan' : 'Aktifkan'}
        </button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      <Alert tone={data.active ? 'success' : 'info'}>
        {data.active ? 'Badge sedang tampil ke siswa di halaman publik.' : 'Sedang nonaktif — badge tidak tampil ke siswa sampai kamu aktifkan lagi.'}
        {' '}Total suara masuk: <strong>{data.totalVotes}</strong>.
      </Alert>

      <AddTeacherForm onSaved={setData} />

      {data.teachers.length === 0 ? (
        <EmptyState title="Belum ada guru" hint="Tambahkan minimal satu guru supaya badge punya isi untuk dipilih siswa." />
      ) : (
        <ul className="space-y-3">
          {data.teachers.map((t, i) => (
            <TeacherRow
              key={t.id}
              teacher={t}
              isFirst={i === 0}
              isLast={i === data.teachers.length - 1}
              isSuperAdmin={isSuperAdmin}
              onMove={move}
              onRemove={removeTeacher}
              onToggleActive={toggleActive}
              onSaved={setData}
            />
          ))}
        </ul>
      )}

      {isSuperAdmin && (
        <div className="card">
          <h2 className="text-sm font-bold">Mulai ulang polling</h2>
          <p className="mt-1 text-sm text-muted">Menghapus semua suara supaya kamu bisa membuka polling baru dari nol. Daftar guru tetap ada.</p>
          <button type="button" onClick={resetVotes} className="btn-danger btn-sm mt-3">Reset semua suara</button>
        </div>
      )}
    </div>
  );
}

function TeacherRow({
  teacher, isFirst, isLast, isSuperAdmin, onMove, onRemove, onToggleActive, onSaved,
}: {
  teacher: FavoriteTeacherOverview['teachers'][number];
  isFirst: boolean; isLast: boolean; isSuperAdmin: boolean;
  onMove: (id: string, dir: -1 | 1) => void;
  onRemove: (id: string, name: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onSaved: (d: FavoriteTeacherOverview) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(teacher.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoKey, setPhotoKey] = useState(0);

  async function save() {
    if (saving) return;
    setSaving(true); setError('');
    try {
      const form = new FormData();
      if (name.trim() !== teacher.name) form.append('name', name.trim());
      const file = fileRef.current?.files?.[0];
      if (file) form.append('photo', file);
      onSaved(await api.patch<FavoriteTeacherOverview>(`/admin/favorite-teacher/teachers/${teacher.id}`, form));
      setEditing(false);
      setPhotoKey((k) => k + 1);
    } catch (e) { setError(errorMessage(e)); }
    finally { setSaving(false); }
  }

  return (
    <li className="card flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={photoKey} src={`${API_BASE}/api/favorite-teacher/photo/${teacher.id}?v=${photoKey}`} alt={teacher.name} className="h-14 w-14 shrink-0 rounded-full object-cover" />

      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="space-y-2">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" />
            {error && <p className="field-error">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={save} disabled={saving} className="btn-primary btn-sm">{saving ? 'Menyimpan...' : 'Simpan'}</button>
              <button type="button" onClick={() => { setEditing(false); setName(teacher.name); setError(''); }} className="btn-outline btn-sm">Batal</button>
            </div>
          </div>
        ) : (
          <>
            <p className="truncate font-semibold">{teacher.name} {!teacher.isActive && <span className="ml-1 text-xs font-normal text-muted">(disembunyikan)</span>}</p>
            <p className="text-sm text-muted">{teacher.votes} suara · {teacher.percentage}%</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-brand" style={{ width: `${teacher.percentage}%` }} />
            </div>
          </>
        )}
      </div>

      {!editing && (
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={() => onMove(teacher.id, -1)} disabled={isFirst} className="btn-outline btn-sm !min-h-9 !px-2.5 disabled:opacity-30" aria-label="Naikkan urutan"><IconUp size={16} /></button>
          <button type="button" onClick={() => onMove(teacher.id, 1)} disabled={isLast} className="btn-outline btn-sm !min-h-9 !px-2.5 disabled:opacity-30" aria-label="Turunkan urutan"><IconDown size={16} /></button>
          <button type="button" onClick={() => onToggleActive(teacher.id, teacher.isActive)} className="btn-outline btn-sm !min-h-9 !px-2.5" title={teacher.isActive ? 'Sembunyikan dari pilihan' : 'Tampilkan lagi'}>{teacher.isActive ? 'Sembunyikan' : 'Tampilkan'}</button>
          <button type="button" onClick={() => setEditing(true)} className="btn-outline btn-sm !min-h-9 !px-2.5" aria-label="Ubah"><IconEdit size={16} /></button>
          {isSuperAdmin && (
            <button type="button" onClick={() => onRemove(teacher.id, teacher.name)} className="btn-danger btn-sm !min-h-9 !px-2.5" aria-label="Hapus"><IconTrash size={16} /></button>
          )}
        </div>
      )}
    </li>
  );
}

function AddTeacherForm({ onSaved }: { onSaved: (d: FavoriteTeacherOverview) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!name.trim() || !file) { setError('Nama dan foto guru wajib diisi.'); return; }
    setSaving(true); setError('');
    try {
      const form = new FormData();
      form.append('name', name.trim());
      form.append('photo', file);
      onSaved(await api.post<FavoriteTeacherOverview>('/admin/favorite-teacher/teachers', form));
      setName(''); if (fileRef.current) fileRef.current.value = ''; setOpen(false);
    } catch (e) { setError(errorMessage(e)); }
    finally { setSaving(false); }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-outline w-full justify-center">
        <IconPlus size={18} /> Tambah guru
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="text-sm font-bold">Guru baru</h2>
      <div>
        <label htmlFor="teacher-name" className="label">Nama guru</label>
        <input id="teacher-name" className="input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Ibu Siti Aminah, S.Pd." />
      </div>
      <div>
        <label htmlFor="teacher-photo" className="label">Foto (JPG/PNG/WebP, maks 2MB)</label>
        <input id="teacher-photo" ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" />
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary btn-sm">{saving ? 'Menyimpan...' : 'Simpan guru'}</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-outline btn-sm">Batal</button>
      </div>
    </form>
  );
}
