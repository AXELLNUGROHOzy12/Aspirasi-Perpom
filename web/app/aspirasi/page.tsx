'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Alert from '@/components/Alert';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Spinner from '@/components/Spinner';
import Turnstile from '@/components/Turnstile';
import { ApiError, api } from '@/lib/api';
import { formatSize } from '@/lib/format';
import type { PublicSettings } from '@/lib/types';

interface Form { name: string; className: string; category: string; title: string; body: string; consent: boolean; website: string }
const EMPTY: Form = { name: '', className: '', category: '', title: '', body: '', consent: false, website: '' };
type Errors = Partial<Record<keyof Form | 'files' | 'captcha', string>>;

export default function AspirationFormPage() {
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState<Form>(EMPTY);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaReset, setCaptchaReset] = useState(0);
  const startedAt = useRef(Date.now());
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<PublicSettings>('/settings').then(setSettings).catch((e: ApiError) => setLoadError(e.message));
  }, []);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function addFiles(list: FileList | null) {
    if (!list || !settings) return;
    const { maxFiles, maxSizeBytes, allowedExtensions } = settings.upload;
    const next = [...files];
    let problem = '';
    for (const f of Array.from(list)) {
      const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
      if (!allowedExtensions.includes(ext)) problem = `"${f.name}" tidak bisa dipakai. Pilih file ${allowedExtensions.join(', ').toUpperCase()}.`;
      else if (f.size > maxSizeBytes) problem = `"${f.name}" terlalu besar. Maksimal ${formatSize(maxSizeBytes)} per file.`;
      else if (next.length >= maxFiles) problem = `Maksimal ${maxFiles} lampiran.`;
      else next.push(f);
    }
    setFiles(next);
    setErrors((e) => ({ ...e, files: problem || undefined }));
    if (fileInput.current) fileInput.current.value = '';
  }

  function validate(): Errors {
    const e: Errors = {};
    if (!form.className) e.className = 'Pilih kelasmu.';
    if (!form.category) e.category = 'Pilih kategori.';
    if (form.title.trim().length < 5) e.title = 'Judul minimal 5 karakter.';
    if (form.body.trim().length < 20) e.body = 'Isi aspirasi minimal 20 karakter.';
    if (!form.consent) e.consent = 'Centang persetujuan terlebih dulu.';
    if (settings?.turnstileSiteKey && !captchaToken) e.captcha = 'Selesaikan verifikasi keamanan di atas.';
    return e;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (submitting) return;
    setFormError('');
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFormError('Data yang kamu masukkan belum lengkap. Silakan periksa kembali form.');
      return;
    }

    const data = new FormData();
    data.set('name', form.name);
    data.set('className', form.className);
    data.set('category', form.category);
    data.set('title', form.title);
    data.set('body', form.body);
    data.set('consent', 'true');
    data.set('website', form.website);
    data.set('startedAt', String(startedAt.current));
    data.set('captchaToken', captchaToken);
    files.forEach((f) => data.append('files', f));

    setSubmitting(true);
    try {
      const result = await api.post<{ code: string }>('/aspirations', data);
      setCode(result.code);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const e = err as ApiError;
      setFormError(e.message || 'Aspirasi gagal dikirim. Silakan periksa kembali data yang kamu masukkan.');
      if (e.fields) {
        const mapped: Errors = {};
        for (const [k, v] of Object.entries(e.fields)) mapped[k as keyof Errors] = v[0];
        setErrors(mapped);
      }
      setCaptchaReset((n) => n + 1);
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const t = document.createElement('textarea');
      t.value = code;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    setForm(EMPTY); setFiles([]); setErrors({}); setFormError(''); setCode(''); setCaptchaToken('');
    startedAt.current = Date.now();
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        {code ? (
          <section className="card text-center" aria-live="polite">
            <p className="text-4xl" aria-hidden>✅</p>
            <h1 className="font-display mt-3 text-2xl font-bold">Aspirasi berhasil dikirim!</h1>
            <p className="mt-5 text-sm text-muted">Kode Aspirasi</p>
            <p className="mt-1 select-all break-all rounded-xl border border-line bg-bg px-4 py-4 font-mono text-xl font-bold tracking-wider sm:text-2xl">{code}</p>
            <p className="mx-auto mt-4 max-w-sm text-sm text-muted">Simpan kode ini untuk melihat perkembangan aspirasimu.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button type="button" onClick={copyCode} className="btn-primary">{copied ? 'Tersalin ✓' : 'Salin Kode'}</button>
              <Link href={`/lacak?kode=${encodeURIComponent(code)}`} className="btn-outline">Lacak Aspirasi</Link>
            </div>
            <button type="button" onClick={reset} className="mt-5 min-h-10 text-sm font-medium text-brand underline underline-offset-4">Kirim aspirasi lain</button>
          </section>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold tracking-tight">Sampaikan Aspirasi</h1>
            <p className="mt-2 text-muted">Tidak perlu login. Kolom bertanda * wajib diisi.</p>

            {loadError && <div className="mt-6"><Alert tone="error">{loadError}</Alert></div>}
            {!settings && !loadError && <Spinner label="Menyiapkan form..." />}

            {settings && (
              <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
                <div>
                  <label htmlFor="name" className="label">Nama (opsional)</label>
                  <input id="name" className="input" maxLength={60} autoComplete="off" placeholder="Boleh dikosongkan" value={form.name} onChange={(e) => set('name', e.target.value)} />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="className" className="label">Kelas *</label>
                    <select id="className" className="input" value={form.className} onChange={(e) => set('className', e.target.value)} aria-invalid={!!errors.className}>
                      <option value="">Pilih kelas</option>
                      {settings.classes.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errors.className && <p className="field-error">{errors.className}</p>}
                  </div>
                  <div>
                    <label htmlFor="category" className="label">Kategori *</label>
                    <select id="category" className="input" value={form.category} onChange={(e) => set('category', e.target.value)} aria-invalid={!!errors.category}>
                      <option value="">Pilih kategori</option>
                      {settings.categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                    </select>
                    {errors.category && <p className="field-error">{errors.category}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="title" className="label">Judul *</label>
                  <input id="title" className="input" maxLength={120} placeholder="Ringkas dalam satu kalimat" value={form.title} onChange={(e) => set('title', e.target.value)} aria-invalid={!!errors.title} />
                  {errors.title && <p className="field-error">{errors.title}</p>}
                </div>

                <div>
                  <label htmlFor="body" className="label">Isi Aspirasi *</label>
                  <textarea id="body" className="input min-h-48 resize-y" maxLength={3000} placeholder="Ceritakan dengan jelas: apa yang terjadi, di mana, dan apa yang kamu harapkan." value={form.body} onChange={(e) => set('body', e.target.value)} aria-invalid={!!errors.body} />
                  <div className="mt-1 flex justify-between text-sm">
                    <span className="field-error !mt-0">{errors.body}</span>
                    <span className="text-muted">{form.body.length}/3000</span>
                  </div>
                </div>

                {settings.upload.maxFiles > 0 && (
                  <div>
                    <span className="label">Lampiran (opsional)</span>
                    <p className="mb-2 text-sm text-muted">
                      Maksimal {settings.upload.maxFiles} file, {formatSize(settings.upload.maxSizeBytes)} per file. Format: {settings.upload.allowedExtensions.join(', ').toUpperCase()}.
                    </p>
                    <input ref={fileInput} id="files" type="file" multiple hidden accept={settings.upload.allowedExtensions.map((e) => `.${e}`).join(',')} onChange={(e) => addFiles(e.target.files)} />
                    <label htmlFor="files" className="btn-outline btn-sm cursor-pointer">Pilih file</label>
                    {files.length > 0 && (
                      <ul className="mt-3 space-y-2">
                        {files.map((f, i) => (
                          <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card px-3 py-2 text-sm">
                            <span className="min-w-0 truncate">{f.name} <span className="text-muted">({formatSize(f.size)})</span></span>
                            <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="min-h-9 shrink-0 px-2 font-medium text-rose-700 dark:text-rose-300" aria-label={`Hapus ${f.name}`}>Hapus</button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {errors.files && <p className="field-error">{errors.files}</p>}
                  </div>
                )}

                {/* Honeypot: disembunyikan dari manusia, bot biasanya mengisinya */}
                <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
                  <label htmlFor="website">Jangan diisi</label>
                  <input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set('website', e.target.value)} />
                </div>

                <div>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-card p-4">
                    <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--brand))]" checked={form.consent} onChange={(e) => set('consent', e.target.checked)} />
                    <span className="text-sm">Saya memahami bahwa aspirasi harus disampaikan dengan sopan dan sesuai tujuan sistem.</span>
                  </label>
                  {errors.consent && <p className="field-error">{errors.consent}</p>}
                </div>

                {settings.turnstileSiteKey && (
                  <div>
                    <Turnstile siteKey={settings.turnstileSiteKey} onToken={(t) => { setCaptchaToken(t); if (t) setErrors((e) => ({ ...e, captcha: undefined })); }} resetKey={captchaReset} />
                    {errors.captcha && <p className="field-error">{errors.captcha}</p>}
                  </div>
                )}

                {formError && <Alert tone="error"><strong className="block">Aspirasi gagal dikirim.</strong>{formError}</Alert>}

                <button type="submit" className="btn-primary w-full" disabled={submitting}>
                  {submitting ? 'Mengirim aspirasi...' : 'Kirim Aspirasi'}
                </button>
              </form>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
