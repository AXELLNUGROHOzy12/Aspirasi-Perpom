import type { Metadata, Viewport } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import { SCHOOL_NAME } from '@/lib/config';
import './globals.css';

export const metadata: Metadata = {
  title: { default: `Sistem Aspirasi Siswa · ${SCHOOL_NAME}`, template: `%s · ${SCHOOL_NAME}` },
  description: `Sampaikan aspirasimu untuk ${SCHOOL_NAME} tanpa perlu login.`,
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

// Menerapkan tema sebelum halaman tampil supaya tidak berkedip.
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  const brand = process.env.NEXT_PUBLIC_BRAND_RGB;
  return (
    <html lang="id" suppressHydrationWarning style={brand ? ({ '--brand': brand } as CSSProperties) : undefined}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
