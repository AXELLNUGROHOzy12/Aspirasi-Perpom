# Sistem Aspirasi Siswa SMA

Siswa mengirim saran atau laporan **tanpa login**, mendapat kode unik, lalu memantau status dan balasan sekolah. Admin punya dashboard sendiri. Semua data diproses backend dan disimpan di PostgreSQL.

## Arsitektur: 3 layanan terpisah

```
domain.com          -> web/      Next.js  (halaman siswa: /, /aspirasi, /lacak)
admin.domain.com    -> admin/    Next.js  (login + dashboard admin)
api.domain.com      -> backend/  Express + Prisma + PostgreSQL (Railway)
```

Panduan langkah demi langkah ada di [PANDUAN.md](PANDUAN.md).

Backend di Railway, `web` dan `admin` di Vercel. Ketiganya di-deploy sendiri-sendiri dan hanya bicara lewat REST API. Karena satu domain induk (`domain.com`), cookie sesi admin tetap aman memakai `SameSite=Lax`.

```
aspirasi-sma/
├── web/       frontend publik. Tempat menaruh desain Figma
├── admin/     frontend admin (admin.domain.com)
├── backend/   API, Prisma schema (prisma/), seed (src/seed.ts)
├── .env.example   daftar variabel backend
└── README.md
```

`web/` dan `admin/` sengaja tidak berbagi paket, jadi masing-masing bisa di-deploy dengan Root Directory sendiri di Railway. File umum (`lib/api.ts`, `lib/types.ts`, komponen kecil) disalin di keduanya.

## Deploy ke Railway (seed otomatis)

### 1. Backend + database
1. Project baru di Railway, tambahkan **PostgreSQL**.
2. Tambah service dari repo GitHub, **Root Directory = `backend`**. File `backend/railway.json` sudah mengatur build dan start.
3. Isi Variables (lihat `.env.example`). Yang wajib:

| Variable | Contoh |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Add Reference: `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | string acak 32+ karakter |
| `CORS_ORIGIN` | `https://domain.com,https://www.domain.com,https://admin.domain.com` |
| `COOKIE_SAMESITE` | `lax` (pakai `none` jika masih di domain `*.up.railway.app`) |
| `SEED_ADMIN_EMAIL` | email admin pertama |
| `SEED_ADMIN_PASSWORD` | minimal 12 karakter |
| `IP_HASH_SALT` | string acak |

4. **Volume** untuk lampiran: pasang Volume (mis. mount `/data`), lalu `UPLOAD_DIR=/data/uploads`. Tanpa volume, lampiran hilang setiap deploy.
5. Deploy. Setiap start, Railway menjalankan otomatis:
   `prisma db push` (membuat/menyesuaikan tabel) -> `seed` -> server.
   Seed bersifat **idempotent**: membuat admin SUPER_ADMIN pertama dan 8 kategori hanya jika belum ada. Password admin yang sudah ada tidak pernah ditimpa. Data dummy hanya dibuat jika `SEED_DEMO_DATA=true`.
6. Tes: buka `https://<backend>/health` harus `{"ok":true}`.

### 2. Frontend publik dan admin (Vercel)
Buat dua project Vercel dari repo yang sama, masing-masing dengan **Root Directory** `web` dan `admin`. Environment Variables untuk keduanya: `NEXT_PUBLIC_API_URL=https://api.domain.com`, `NEXT_PUBLIC_SCHOOL_NAME`, `NEXT_PUBLIC_BRAND_RGB`. Detail ada di [PANDUAN.md](PANDUAN.md).

Catatan: `NEXT_PUBLIC_*` tertanam saat **build**, jadi ubah nilainya lalu Redeploy.

### 3. Domain (DNS)
Backend: Railway > Networking > Custom Domain. Frontend: Vercel > Settings > Domains. Buat record DNS persis seperti yang ditampilkan masing-masing.

| Domain | Service |
|---|---|
| `domain.com` (dan `www`) | Vercel: web |
| `admin.domain.com` | Vercel: admin |
| `api.domain.com` | Railway: backend |

Setelah domain aktif, pastikan `CORS_ORIGIN` di backend berisi ketiga alamat frontend yang benar dan `COOKIE_SAMESITE=lax`.

## Desain frontend pakai Figma

Ganti tampilan hanya di `web/`. Logika sudah terpisah dari markup:
- `web/lib/api.ts`, `web/lib/types.ts`: pemanggilan API (jangan diubah)
- `web/app/page.tsx` (landing), `web/app/aspirasi/page.tsx` (form), `web/app/lacak/page.tsx` (tracking): ganti JSX/kelas Tailwind sesuai desain, pertahankan `state`, `onSubmit`, dan pemanggilan `api.*`
- `web/app/globals.css` dan `web/tailwind.config.ts`: token warna (`--brand`, dll.)

Alur kerja yang disarankan: beri Claude (atau tools export Figma) frame per halaman beserta isi file halaman terkait, lalu minta markup diganti tanpa mengubah logika. Nama field form yang dikirim ke backend harus tetap: `name, className, category, title, body, consent, website, startedAt, captchaToken, files`.

## Jalankan lokal

Butuh Node.js 18.17+ dan PostgreSQL.

```bash
# Backend
cd backend
npm install
cp ../.env.example .env     # isi DATABASE_URL, JWT_SECRET, SEED_ADMIN_PASSWORD (12+ karakter)
npm run db:push             # buat tabel
SEED_DEMO_DATA=true npm run seed
npm run dev                 # http://localhost:5000

# Frontend publik
cd web && npm install && cp .env.example .env.local && npm run dev    # http://localhost:3000

# Admin
cd admin && npm install && cp .env.example .env.local && npm run dev  # http://localhost:3001
```

Kode contoh untuk `/lacak` (dari data dummy): `ASP-20260915-K7M2QX`.

## Fitur

**Siswa**: form aspirasi (kelas, kategori, judul, isi, lampiran, persetujuan; nama opsional), kode unik + Salin Kode, halaman lacak dengan stepper dan Balasan Sekolah.

**Admin**: login, sesi kedaluwarsa, dashboard statistik, cari + filter + pagination, ubah status, balas, arsipkan, moderasi manual, riwayat status, pengaturan daftar kelas, audit log. Role: `SUPER_ADMIN` (semua + hapus + pengaturan), `ADMIN` (kelola aspirasi), `MODERATOR` (lihat + moderasi).

**Umum**: mobile-first, dark mode, loading dan empty state, error berbahasa Indonesia tanpa detail teknis.

**Guru Favorit** (opsional, default nonaktif): badge mengambang di pojok kiri halaman siswa, bisa digeser bebas dan posisinya diingat per perangkat. Siswa memilih satu guru (foto + nama), satu suara per perangkat, tanpa ada tulisan "event" yang terlihat siswa. Admin (`SUPER_ADMIN`/`ADMIN`) mengelola dari menu **Guru Favorit**: aktif/nonaktifkan kapan saja, tambah/ubah/sembunyikan/hapus guru beserta fotonya, urutkan tampilan, lihat hasil suara real-time, dan reset suara untuk membuka polling baru (`SUPER_ADMIN`).

## Teknologi

Next.js 14 + React + TypeScript + Tailwind (web dan admin); Node.js + Express + TypeScript + Zod (backend); PostgreSQL + Prisma; bcryptjs (cost 12), JWT di cookie httpOnly, helmet, CORS, express-rate-limit, Cloudflare Turnstile.

Hash password memakai bcryptjs, bukan Argon2, karena murni JavaScript (tanpa kompilasi native) sehingga mudah di-deploy dan dipasang di Termux.

## Alur pengiriman aspirasi

```
Form -> POST /api/aspirations -> Rate limit -> Validasi (Zod) -> CAPTCHA
     -> Sanitasi -> Anti-spam -> Validasi lampiran -> Moderasi -> Kode unik -> Database -> Respons
```

- **Anti-spam**: rate limit, honeypot, batas waktu isi form, deteksi duplikat 24 jam, batas harian per jaringan, batas ukuran request. Batas per jaringan sengaja longgar karena WiFi sekolah dipakai bersama.
- **Moderasi**: skor gabungan, bukan blacklist saja. Kata kasar dinormalisasi (leetspeak, penyamaran), konteks laporan menurunkan skor (mis. "guru memanggil kami bodoh"), frasa wajar dikecualikan ("anjing liar", "daging babi"). Hasil: `APPROVED`, `NEEDS_REVIEW`, `REJECTED`. Yang meragukan masuk `NEEDS_REVIEW`. Ancaman dan topik keselamatan diri **tidak pernah** ditolak otomatis, selalu ditandai PRIORITAS untuk admin. `REJECTED` hanya untuk skor sangat tinggi dan tetap tersimpan agar admin bisa memeriksa salah deteksi.
- **Lampiran**: hanya JPG, PNG, WebP, PDF. Dicek ekstensi, MIME, isi file (magic bytes), ukuran, jumlah, dan nama. Nama di disk diacak (UUID), file berbahaya ditolak, metadata disimpan. Lampiran hanya bisa diakses admin yang login.

## API

Semua respons sukses berbentuk `{ "data": ... }`, error `{ "error": { "code", "message", "fields?" } }`.

Publik
- `GET /api/settings`
- `POST /api/aspirations` (multipart)
- `GET /api/aspirations/:code`
- `GET /api/favorite-teacher?voterId=` — status badge + daftar guru aktif
- `POST /api/favorite-teacher/vote` — `{ teacherId, voterId }`, satu kali per `voterId`
- `GET /api/favorite-teacher/photo/:id` — foto guru (publik, cache 1 hari)

Admin (butuh login, request yang mengubah data wajib header `X-Requested-With: aspirasi`)
- `POST /api/admin/login`, `POST /api/admin/logout`, `GET /api/admin/me`
- `GET /api/admin/statistics`
- `GET /api/admin/aspirations` (q, category, className, status, moderation, dateFrom, dateTo, page, pageSize)
- `GET /api/admin/aspirations/:id`
- `PATCH /api/admin/aspirations/:id/status`
- `POST /api/admin/aspirations/:id/reply`
- `POST /api/admin/aspirations/:id/moderate`
- `DELETE /api/admin/aspirations/:id` (SUPER_ADMIN)
- `GET /api/admin/attachments/:id/download`
- `PUT /api/admin/settings` (SUPER_ADMIN)
- `GET /api/admin/favorite-teacher` — daftar guru + jumlah & persentase suara
- `PUT /api/admin/favorite-teacher/toggle` — `{ active }`
- `POST /api/admin/favorite-teacher/teachers` (multipart: `name`, `photo`)
- `PATCH /api/admin/favorite-teacher/teachers/:id` (multipart, semua field opsional)
- `DELETE /api/admin/favorite-teacher/teachers/:id` (SUPER_ADMIN)
- `PATCH /api/admin/favorite-teacher/reorder` — `{ order: string[] }`
- `POST /api/admin/favorite-teacher/reset-votes` (SUPER_ADMIN)

## Keamanan

- Password di-hash bcrypt; login dibatasi 10 percobaan gagal per 15 menit; waktu respons login disamakan
- Sesi JWT di cookie `httpOnly`, `Secure` di production, status aktif admin dicek ke database di setiap request
- Antar-domain: CORS hanya untuk origin di `CORS_ORIGIN`; request admin yang mengubah data wajib lolos cek `Origin` dan header `X-Requested-With`
- Admin app dikirim dengan `X-Robots-Tag: noindex` dan tidak ada link ke admin di situs publik
- Helmet, batas ukuran body, sanitasi input, React meng-escape output (XSS), Prisma memakai query berparameter
- Error database/stack trace hanya masuk log server
- Lampiran hanya bisa dibuka admin yang login

## Privasi data teknis

Alamat IP siswa tidak disimpan mentah, hanya hash bergaram, dan user-agent dipotong 200 karakter. Keduanya hanya untuk mendeteksi spam. IP admin dicatat di audit log untuk keamanan. Nama siswa opsional dan tidak tampil di halaman publik atau tracking.

## Catatan

- Start di Railway memakai `prisma db push`, jadi tidak perlu folder migrasi. Untuk perubahan skema yang menghapus kolom/tabel, Prisma akan menolak demi keamanan data; saat itu beralih ke `prisma migrate` (`npm run migrate:dev` lokal, `migrate:deploy` di Railway).
- Prisma sering bermasalah di Termux/Android. Jalankan backend di Railway dan cukup edit kode dari HP.
- Pencarian memakai `ILIKE` tanpa indeks khusus; cukup untuk ribuan aspirasi.
