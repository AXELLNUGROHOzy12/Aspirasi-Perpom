import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import type { CSSProperties, ReactNode } from 'react';
import AdminShell from '@/components/AdminShell';
import { SCHOOL_NAME } from '@/lib/config';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' });

export const metadata: Metadata = {
  title: { default: `Admin Aspirasi · ${SCHOOL_NAME}`, template: `%s · Admin ${SCHOOL_NAME}` },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

// Menerapkan tema sebelum halaman tampil supaya tidak berkedip.
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  const brand = process.env.NEXT_PUBLIC_BRAND_RGB;
  return (
    <html lang="id" className={jakarta.variable} suppressHydrationWarning style={brand ? ({ '--brand': brand } as CSSProperties) : undefined}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen"><AdminShell>{children}</AdminShell></body>
    </html>
  );
}
