'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  function apply(next: Theme) {
    document.documentElement.classList.toggle('dark', next === 'dark');
    try { localStorage.setItem('theme', next); } catch { /* penyimpanan diblokir, abaikan */ }
    setTheme(next);
  }

  return (
    <div role="group" aria-label="Tema tampilan" className="flex shrink-0 rounded-xl border border-line bg-card p-1 text-sm">
      {(['light', 'dark'] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => apply(t)}
          aria-pressed={theme === t}
          className={`min-h-9 rounded-lg px-3 font-medium transition ${theme === t ? 'bg-brand text-white' : 'text-muted hover:text-ink'}`}
        >
          {t === 'light' ? '☀️ Light' : '🌙 Dark'}
        </button>
      ))}
    </div>
  );
}
