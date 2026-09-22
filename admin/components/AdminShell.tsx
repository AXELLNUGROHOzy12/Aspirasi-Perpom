'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { SCHOOL_NAME } from '@/lib/config';
import type { AdminUser } from '@/lib/types';
import { IconClose, IconDashboard, IconInbox, IconLogout, IconMenu, IconSettings, IconTrophy } from './Icons';
import Logo from './Logo';
import Spinner from './Spinner';
import ThemeToggle from './ThemeToggle';

const AdminContext = createContext<AdminUser | null>(null);
export const useAdmin = () => useContext(AdminContext)!;

const ROLE_LABEL: Record<string, string> = { SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin', MODERATOR: 'Moderator' };

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const isLogin = pathname.startsWith('/login');

  useEffect(() => {
    if (isLogin) return;
    api.get<AdminUser>('/admin/me').then(setAdmin).catch(() => router.replace('/login'));
  }, [isLogin, router]);

  useEffect(() => setOpen(false), [pathname]);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try { await api.post('/admin/logout'); } finally { router.replace('/login'); }
  }

  if (isLogin) return <>{children}</>;
  if (!admin) return <Spinner label="Memeriksa sesi..." />;

  const nav = [
    { href: '/', label: 'Dashboard', icon: <IconDashboard />, active: pathname === '/' },
    { href: '/aspirations', label: 'Aspirasi', icon: <IconInbox />, active: pathname.startsWith('/aspirations') },
    ...(admin.role === 'SUPER_ADMIN' || admin.role === 'ADMIN'
      ? [{ href: '/guru-favorit', label: 'Guru Favorit', icon: <IconTrophy />, active: pathname.startsWith('/guru-favorit') }]
      : []),
    ...(admin.role === 'SUPER_ADMIN' ? [{ href: '/settings', label: 'Pengaturan', icon: <IconSettings />, active: pathname.startsWith('/settings') }] : []),
  ];
  const title = nav.find((n) => n.active)?.label ?? 'Admin';
  const initials = admin.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <Logo size={40} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight">Aspirasi Siswa</p>
          <p className="truncate text-xs text-muted">{SCHOOL_NAME}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label="Menu admin">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} aria-current={n.active ? 'page' : undefined} className={`nav-link ${n.active ? 'nav-link-active' : ''}`}>
            {n.icon}{n.label}
          </Link>
        ))}
      </nav>
      <div className="m-3 rounded-2xl border border-line/70 p-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">{initials}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{admin.name}</p>
            <p className="truncate text-xs text-muted">{ROLE_LABEL[admin.role] ?? admin.role}</p>
          </div>
        </div>
        <button type="button" onClick={logout} disabled={loggingOut} className="nav-link mt-3 w-full !min-h-10 border border-line/70 disabled:opacity-60">
          <IconLogout />{loggingOut ? 'Keluar...' : 'Keluar'}
        </button>
      </div>
    </div>
  );

  return (
    <AdminContext.Provider value={admin}>
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line/70 bg-card lg:block">{sidebar}</aside>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Tutup menu" className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-card shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line/70 bg-bg/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
            <button type="button" className="btn-outline !min-h-11 !px-3 lg:hidden" onClick={() => setOpen(!open)} aria-label={open ? 'Tutup menu' : 'Buka menu'} aria-expanded={open}>
              {open ? <IconClose /> : <IconMenu />}
            </button>
            <h2 className="truncate text-base font-bold sm:text-lg">{title}</h2>
            <div className="ml-auto flex items-center gap-3">
              <ThemeToggle />
              <span className="hidden h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand sm:flex" title={admin.name}>{initials}</span>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </AdminContext.Provider>
  );
}
