/* eslint-disable @next/next/no-img-element */
// Ganti file /public/school-logo.png dengan logo sekolah yang asli (rasio persegi disarankan).
export default function Logo({ size = 40 }: { size?: number }) {
  return <img src="/school-logo.png" alt="Logo sekolah" width={size} height={size} className="shrink-0 rounded-lg object-contain" style={{ width: size, height: size }} />;
}
