import Link from 'next/link';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Logo from '@/components/Logo';
import { SCHOOL_NAME } from '@/lib/config';

const STEPS = [
  { title: 'Tulis aspirasimu', text: 'Pilih kelas dan kategori, lalu ceritakan saran atau laporanmu. Tidak perlu login.' },
  { title: 'Simpan kodenya', text: 'Setelah terkirim, kamu mendapat kode unik untuk memantau perkembangannya.' },
  { title: 'Pantau balasan', text: 'Masukkan kode di halaman Lacak untuk melihat status dan balasan dari pihak sekolah.' },
];

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4">
        <section className="pb-10 pt-10 sm:pt-16">
          <Logo size={72} />
          <p className="mt-5 text-sm font-semibold text-brand">{SCHOOL_NAME}</p>
          <h1 className="font-display mt-1 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            Sampaikan Aspirasimu
            <br />
            untuk Sekolah yang Lebih Baik
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Sistem Aspirasi Siswa: tempat menyampaikan saran, kritik, dan laporan langsung ke pihak sekolah, tanpa perlu membuat akun.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/aspirasi" className="btn-primary">Sampaikan Aspirasi</Link>
            <Link href="/lacak" className="btn-outline">Lacak Aspirasi</Link>
          </div>
        </section>

        <section aria-labelledby="cara" className="pb-10">
          <h2 id="cara" className="text-xl font-bold">Cara kerjanya</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="card">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{i + 1}</span>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="privasi" className="card">
          <h2 id="privasi" className="text-lg font-bold">Privasi kamu terjaga</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>Nama boleh dikosongkan. Kami hanya meminta kelas agar aspirasi bisa ditindaklanjuti.</li>
            <li>Aspirasi tidak ditampilkan ke publik. Hanya pihak sekolah yang berwenang yang bisa membacanya.</li>
            <li>Demi keamanan, sistem mencatat data teknis singkat (alamat jaringan dalam bentuk terenkripsi) hanya untuk mencegah spam.</li>
            <li>Sampaikan dengan sopan. Kritik dan laporan tetap sangat diterima.</li>
          </ul>
        </section>
      </main>
      <Footer />
    </>
  );
}
