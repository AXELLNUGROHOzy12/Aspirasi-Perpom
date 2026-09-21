import Link from 'next/link';
import { SCHOOL_NAME } from '@/lib/config';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <Logo size={36} />
          <span className="truncate text-sm font-bold">{SCHOOL_NAME}</span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
