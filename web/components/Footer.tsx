import { SCHOOL_NAME } from '@/lib/config';

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-line">
      <div className="mx-auto max-w-3xl px-4 py-6 text-sm text-muted">
        <p>© {new Date().getFullYear()} {SCHOOL_NAME}</p>
      </div>
    </footer>
  );
}
