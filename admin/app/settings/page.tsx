'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import { useAdmin } from '@/components/AdminShell';
import Spinner from '@/components/Spinner';
import { api, errorMessage } from '@/lib/api';
import type { PublicSettings } from '@/lib/types';

export default function SettingsPage() {
  const admin = useAdmin();
  const router = useRouter();
  const [schoolName, setSchoolName] = useState('');
  const [classes, setClasses] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);

  useEffect(() => {
    if (admin.role !== 'SUPER_ADMIN') { router.replace('/'); return; }
    api.get<PublicSettings>('/settings').then((s) => { setSchoolName(s.schoolName); setClasses(s.classes.join('\n')); setMaintenance(s.maintenanceMode); setLoaded(true); }).catch((e) => setError(errorMessage(e)));
  }, [admin.role, router]);

  async function toggleMaintenance() {
    if (togglingMaintenance) return;
    setTogglingMaintenance(true);
    setError('');
    try {
      const res = await api.put<{ active: boolean }>('/admin/maintenance', { active: !maintenance });
      setMaintenance(res.active);
    } catch (e) { setError(errorMessage(e)); }
    finally { setTogglingMaintenance(false); }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true); setError(''); setOk(false);
    try {
      const list = classes.split('\n').map((c) => c.trim()).filter(Boolean);
      await api.put('/admin/settings', { schoolName, classes: list });
      setClasses(list.join('\n')); setOk(true);
    } catch (err) { setError(errorMessage(err)); }
    finally { setSaving(false); }
  }

  if (!loaded) return error ? <Alert tone="error">{error}</Alert> : <Spinner />;

  return (
    <form onSubmit={save} className="max-w-xl space-y-5">
      <h1 className="font-display text-3xl font-bold tracking-tight">Pengaturan</h1>

      <div className="card flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold">Mode Maintenance</p>
          <p className="mt-0.5 text-sm text-muted">
            {maintenance ? 'Sedang aktif — siswa melihat halaman perbaikan dan tidak bisa memakai web.' : 'Nonaktif — web bisa dipakai siswa seperti biasa.'}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleMaintenance}
          disabled={togglingMaintenance}
          className={maintenance ? 'btn-primary btn-sm shrink-0' : 'btn-outline btn-sm shrink-0'}
        >
          {togglingMaintenance ? 'Menyimpan...' : maintenance ? 'Nonaktifkan' : 'Aktifkan'}
        </button>
      </div>

      <div>
        <label htmlFor="school" className="label">Nama sekolah</label>
        <input id="school" className="input" maxLength={100} value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
        <p className="mt-1 text-sm text-muted">Nama di header halaman diatur lewat NEXT_PUBLIC_SCHOOL_NAME di frontend.</p>
      </div>
      <div>
        <label htmlFor="classes" className="label">Daftar kelas (satu per baris)</label>
        <textarea id="classes" className="input min-h-64 font-mono" value={classes} onChange={(e) => setClasses(e.target.value)} />
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {ok && <Alert tone="success">Pengaturan disimpan. Daftar kelas di form siswa sudah diperbarui.</Alert>}
      <button className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan pengaturan'}</button>
    </form>
  );
}
