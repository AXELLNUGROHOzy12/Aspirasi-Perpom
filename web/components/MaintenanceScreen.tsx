import { SCHOOL_NAME } from '@/lib/config';

export default function MaintenanceScreen() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div aria-hidden className="maint-blob maint-blob-a" />
      <div aria-hidden className="maint-blob maint-blob-b" />

      <div className="maint-wrap relative w-full max-w-md text-center">
        <div className="maint-icon mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10" aria-hidden>
            <path
              d="M12 3.5 2.5 20h19L12 3.5Z"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinejoin="round"
              fill="currentColor"
              fillOpacity={0.08}
            />
            <path d="M12 9.5v4.2" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
            <circle cx="12" cy="16.6" r="1.05" fill="currentColor" />
          </svg>
        </div>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-brand">{SCHOOL_NAME}</p>
        <h1 className="font-display mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Maintenance Alert</h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          Maaf, saat ini sistem sedang dalam perbaikan.
          <br />
          Tunggu beberapa saat lagi ya. Terima kasih!
        </p>

        <div className="mt-8 flex items-center justify-center gap-1.5" role="status" aria-label="Sedang diperbaiki">
          <span className="maint-dot" style={{ animationDelay: '0ms' }} />
          <span className="maint-dot" style={{ animationDelay: '160ms' }} />
          <span className="maint-dot" style={{ animationDelay: '320ms' }} />
        </div>
      </div>
    </main>
  );
}
