'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Alert from '@/components/Alert';
import Header from '@/components/Header';
import { api, errorMessage } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true); setError('');
    try {
      await api.post('/admin/login', { email, password });
      router.replace('/');
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="font-display text-3xl font-bold">Masuk Admin</h1>
        <p className="mt-2 text-muted">Khusus pihak sekolah yang berwenang.</p>
        <form onSubmit={onSubmit} className="card mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" type="email" className="input" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="password" className="label">Kata sandi</label>
            <input id="password" type="password" className="input" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <Alert tone="error">{error}</Alert>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? 'Masuk...' : 'Masuk'}</button>
        </form>
      </main>
    </>
  );
}
