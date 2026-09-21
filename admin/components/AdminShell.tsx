'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { SCHOOL_NAME } from '@/lib/config';
import type { AdminUser } from '@/lib/types';
import Logo from './Logo';
import Spinner from './Spinner';
import ThemeToggle from './ThemeToggle';

const AdminContext = createContext<AdminUser | null>(null);
export const useAdmin = () => useContext(AdminContext)!;

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const isLogin = pathname.startsWith('/login');

  useEffect(() => {
    if (isLogin) return;
    api.get<AdminUser>('/admin/me').then(setAdmin).catch(() => router.replace('/login'));
  }, [isLogin, router]);

  async function logout() {
    try { await api.post('/admin/logout'); } finally { router.replace('/login'); }
  }

  if (isLogin) return <>{children}</>;
  if (!admin) return <Spinner label="Memeriksa sesi..." />;

  const nav = [
    { href: '/', label: 'Dashboard', active: pathname === '/' },
    { href: '/aspirations', label: 'Aspirasi', active: pathname.startsWith('/aspirations') },
    ...(admin.role === 'SUPER_ADMIN' ? [{ href: '/settings', label: 'Pengaturan', active: pathname.startsWith('/settings') }] : []),
  ];

  return (
    <AdminContext.Provider value={admin}>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Logo size={32} />
            <span className="truncate text-sm font-bold">Admin · {SCHOOL_NAME}</span>
          </div>
          <ThemeToggle />
        </div>
        <nav className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 pb-3" aria-label="Menu admin">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={`chip shrink-0 ${n.active ? 'chip-active' : ''}`}>{n.label}</Link>
          ))}
          <button type="button" onClick={logout} className="chip ml-auto shrink-0">Keluar</button>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </AdminContext.Provider>
  );
}
