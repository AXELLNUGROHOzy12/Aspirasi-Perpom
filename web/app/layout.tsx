import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import type { CSSProperties, ReactNode } from 'react';
import FavoriteTeacherWidget from '@/components/FavoriteTeacherWidget';
import MaintenanceScreen from '@/components/MaintenanceScreen';
import { API_BASE } from '@/lib/api';
import { SCHOOL_NAME } from '@/lib/config';
import type { PublicSettings } from '@/lib/types';
import './globals.css';

// Dicek di server setiap request supaya siswa langsung melihat halaman maintenance tanpa perlu render app dulu.
// Gagal ambil data (mis. backend down) dianggap TIDAK maintenance, supaya situs tidak ikut mati karena error jaringan.
async function isMaintenanceActive(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/settings`, { cache: 'no-store' });
    if (!res.ok) return false;
    const json = (await res.json()) as { data?: PublicSettings };
    return json.data?.maintenanceMode === true;
  } catch {
    return false;
  }
}

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' });

export const metadata: Metadata = {
  title: { default: `Sistem Aspirasi Siswa · ${SCHOOL_NAME}`, template: `%s · ${SCHOOL_NAME}` },
  description: `Sampaikan aspirasimu untuk ${SCHOOL_NAME} tanpa perlu login.`,
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

// Menerapkan tema sebelum halaman tampil supaya tidak berkedip.
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const brand = process.env.NEXT_PUBLIC_BRAND_RGB;
  const maintenance = await isMaintenanceActive();
  return (
    <html lang="id" className={jakarta.variable} suppressHydrationWarning style={brand ? ({ '--brand': brand } as CSSProperties) : undefined}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        {maintenance ? (
          <MaintenanceScreen />
        ) : (
          <>
            {children}
            <FavoriteTeacherWidget />
          </>
        )}
      </body>
    </html>
  );
}
