'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import { IconEye, IconEyeOff } from '@/components/Icons';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import { api, errorMessage } from '@/lib/api';
import { SCHOOL_NAME } from '@/lib/config';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // "Ingat email": hanya menyimpan email (bukan kata sandi) di perangkat ini.
  useEffect(() => {
    try { const saved = localStorage.getItem('admin-email'); if (saved) { setEmail(saved); setRemember(true); } } catch { /* diblokir, abaikan */ }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true); setError('');
    try {
      await api.post('/admin/login', { email, password });
      try { if (remember) localStorage.setItem('admin-email', email); else localStorage.removeItem('admin-email'); } catch { /* abaikan */ }
      router.replace('/');
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Kiri: identitas */}
      <section className="flex flex-col justify-between bg-brand px-6 py-8 text-white sm:px-12 lg:py-12">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-1.5"><Logo size={44} /></span>
          <p className="text-sm font-semibold opacity-90">{SCHOOL_NAME}</p>
        </div>
        <div className="py-10 lg:py-0">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">Aspirasi Siswa</h1>
          <p className="mt-3 max-w-md text-base opacity-90 sm:text-lg">Kelola dan tindak lanjuti aspirasi siswa dengan lebih mudah.</p>
        </div>
        <p className="hidden text-xs opacity-70 lg:block">Panel khusus pihak sekolah yang berwenang.</p>
      </section>

      {/* Kanan: form */}
      <section className="relative flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="absolute right-4 top-4"><ThemeToggle /></div>
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold tracking-tight">Masuk Admin</h2>
          <p className="mt-1 text-sm text-muted">Gunakan akun yang diberikan oleh sekolah.</p>
          <form onSubmit={onSubmit} className="card mt-6 space-y-4 !p-6">
            {error && <Alert tone="error">{error}</Alert>}
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input id="email" type="email" className="input" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} />
            </div>
            <div>
              <label htmlFor="password" className="label">Kata sandi</label>
              <div className="relative">
                <input id="password" type={show ? 'text' : 'password'} className="input pr-12" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!error} />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted hover:text-ink">
                  {show ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>
            <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm">
              <input type="checkbox" className="h-5 w-5 rounded border-line accent-[rgb(var(--brand))]" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Ingat email saya di perangkat ini
            </label>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />}
              {loading ? 'Masuk...' : 'Masuk'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
