# Panduan Deploy: dari Backend ke Frontend

Backend + database di **Railway**, dua frontend (`web` dan `admin`) di **Vercel**. Ikuti urutan ini, jangan lompat, karena frontend butuh alamat backend yang sudah hidup.

```
1. Push kode ke GitHub
2. Backend + database di Railway   (api.domain.com)
3. Tes backend
4. Frontend publik di Vercel      (domain.com)
5. Frontend admin di Vercel       (admin.domain.com)
6. Domain + update CORS
7. Tes dari ujung ke ujung
8. Turnstile (opsional)
9. Pasang desain Figma
```

---

## Istilah Railway yang dipakai di panduan ini

**Project**: wadah satu proyek di Railway. Di dalamnya ada beberapa *service*.

**Service**: satu aplikasi yang berjalan. Di sini ada 2: `PostgreSQL` (database) dan `aspirasi-api` (backend).

**Root Directory**: folder mana dari repo GitHub yang dibangun untuk service ini. Repo kamu isinya 3 folder (`web`, `admin`, `backend`) dan Railway tidak tahu yang mana punya dia. Kalau dikosongkan, Railway melihat folder paling luar, tidak menemukan `package.json`, lalu build gagal. Untuk backend isi `backend`.
Letaknya: klik service > tab **Settings** > bagian **Source** (atau "Build") > kolom **Root Directory**.

**Variables**: pengaturan dan rahasia yang dibaca aplikasi saat berjalan, seperti isi file `.env`. Sengaja tidak ditaruh di GitHub supaya password dan kunci tidak bocor.
Letaknya: klik service > tab **Variables** > **New Variable** (isi nama dan nilai satu-satu), atau **Raw Editor** untuk menempel banyak sekaligus dengan format `NAMA=nilai`.
Setiap variable diubah, service otomatis deploy ulang.

**Reference variable**: cara menyambungkan variable milik service lain tanpa menyalin. Untuk `DATABASE_URL`, ketik nilainya `${{Postgres.DATABASE_URL}}` (atau pakai tombol **Add Reference**). Railway akan mengisi alamat database yang benar.

**Volume**: disk permanen. Tanpa Volume, file lampiran hilang setiap deploy ulang.

**Networking > Generate Domain**: membuat alamat publik gratis `xxx.up.railway.app` untuk service itu.

---

## 1. Push kode ke GitHub

Ekstrak zip, lalu dari folder `aspirasi-sma`:

```bash
git init
git add .
git commit -m "Sistem aspirasi v1.1"
git branch -M main
git remote add origin https://github.com/USERNAME/aspirasi-sma.git
git push -u origin main
```

`.env` sudah masuk `.gitignore`, jadi rahasia tidak ikut ter-push.

---

## 2. Backend + database (Railway)

**a. Buat database**
1. Railway > New Project > **Provision PostgreSQL**.

**b. Buat service backend**
1. Di project yang sama: New > **GitHub Repo** > pilih repo aspirasi.
2. Buka service tadi > Settings > **Root Directory** = `backend`.
3. Nama service bebas, mis. `aspirasi-api`.

**c. Isi Variables** (tab Variables service backend)

| Variable | Isi |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Add Reference > Postgres > `DATABASE_URL` |
| `JWT_SECRET` | string acak 32+ karakter (lihat di bawah) |
| `CORS_ORIGIN` | alamat frontend, dipisah koma. Belum ada? isi dulu `https://domain.com,https://admin.domain.com`, nanti disesuaikan di langkah 5-6 |
| `COOKIE_SAMESITE` | `none` selama masih domain bawaan (`*.up.railway.app` / `*.vercel.app`), ganti `lax` setelah pakai domain sendiri |
| `SEED_ADMIN_EMAIL` | email admin kamu |
| `SEED_ADMIN_PASSWORD` | minimal 12 karakter |
| `IP_HASH_SALT` | string acak |
| `SCHOOL_NAME` | nama sekolah |
| `CLASS_LIST` | `X IPA 1,X IPA 2,...` |

Buat string acak (bisa dari Termux):
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**d. Volume untuk lampiran**
1. Di service backend, tambah **Volume**, mount path `/data`.
2. Tambah variable `UPLOAD_DIR` = `/data/uploads`.

**e. Generate domain sementara**
Settings > Networking > **Generate Domain**. Catat alamatnya, mis. `aspirasi-api-production.up.railway.app`.

**f. Deploy dan baca log**
Log yang benar akan berisi kira-kira:
```
[seed] Admin dibuat: email-kamu
[seed] 8 kategori siap.
Backend berjalan di http://localhost:...
```
Setiap redeploy, seed jalan lagi tapi aman: admin tidak dibuat ulang dan password tidak ditimpa.

---

## 3. Tes backend

Ganti `API` dengan alamat backend kamu.

```bash
# Harus {"ok":true}
curl https://API/health

# Harus berisi schoolName, classes, categories
curl https://API/api/settings

# Login admin, harus 200 dan ada header Set-Cookie
curl -i -X POST https://API/api/admin/login \
  -H "Content-Type: application/json" \
  -H "X-Requested-With: aspirasi" \
  -H "Origin: https://admin.domain.com" \
  -d '{"email":"EMAIL_ADMIN","password":"PASSWORD_ADMIN"}'
```

Kalau login mengembalikan 403 "Permintaan tidak valid", berarti `Origin` yang kamu kirim belum ada di `CORS_ORIGIN`.

Backend beres kalau ketiganya berhasil. Baru lanjut.

---

## 4. Frontend publik di Vercel (`web`)

Di sini **Root Directory** artinya sama: folder repo yang mau dibuild. Untuk yang ini isi `web`.

1. Buka vercel.com > **Add New** > **Project** > pilih repo aspirasi (**Import**).
2. Di halaman konfigurasi, cari **Root Directory** > klik **Edit** > pilih folder `web`. **Framework Preset** akan terdeteksi otomatis sebagai Next.js.
3. Buka bagian **Environment Variables** (fungsinya sama dengan Variables di Railway), tambahkan:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://alamat-backend` (tanpa `/` di akhir) |
| `NEXT_PUBLIC_SCHOOL_NAME` | nama sekolah |
| `NEXT_PUBLIC_BRAND_RGB` | `15 118 110` (warna utama, format "R G B") |

4. Klik **Deploy**. Selesai, Vercel memberi alamat `nama-project.vercel.app`.
5. Buka alamatnya: landing page harus muncul, dan `/aspirasi` harus menampilkan daftar kelas dan kategori dari backend.

> `NEXT_PUBLIC_*` dibaca saat **build**. Kalau salah isi: Settings > Environment Variables > betulkan, lalu Deployments > titik tiga di deploy terakhir > **Redeploy**.

---

## 5. Frontend admin di Vercel (`admin`)

Buat **project Vercel kedua** dari repo yang sama (Add New > Project > import repo lagi):
- Root Directory = `admin`
- Environment Variables sama persis dengan `web`

Buka alamat `vercel.app`-nya, harus muncul halaman login. Login dengan email dan password seed.

Karena masih domain `*.vercel.app` dan `*.up.railway.app` (dianggap beda situs oleh browser), atur dulu di backend (Railway > Variables):
- `CORS_ORIGIN` = alamat `web` dan `admin` Vercel, dipisah koma, tanpa `/` di akhir
- `COOKIE_SAMESITE` = `none`

Backend deploy ulang otomatis.

---

## 6. Domain sendiri

**Backend (Railway)**: service backend > Settings > Networking > **Custom Domain** > isi `api.domain.com`. Railway menampilkan nilai **CNAME**; buat record itu di DNS domain kamu.

**Frontend (Vercel)**:
- Project `web` > Settings > **Domains** > Add `domain.com` (dan `www.domain.com`)
- Project `admin` > Settings > **Domains** > Add `admin.domain.com`

Vercel menampilkan record DNS yang harus dibuat (A atau CNAME). Salin persis yang ditampilkan Vercel di DNS domain kamu. Tunggu sampai statusnya "Valid".

| Domain | Tujuan |
|---|---|
| `domain.com`, `www.domain.com` | Vercel project `web` |
| `admin.domain.com` | Vercel project `admin` |
| `api.domain.com` | Railway service backend |

Setelah semua aktif:

1. Railway > backend > Variables:
   - `CORS_ORIGIN` = `https://domain.com,https://www.domain.com,https://admin.domain.com`
   - `COOKIE_SAMESITE` = `lax`
2. Vercel, di **kedua** project: ubah `NEXT_PUBLIC_API_URL` = `https://api.domain.com`
3. **Redeploy** kedua project Vercel (wajib, karena variable tertanam saat build).

---

## 7. Tes dari ujung ke ujung

Centang satu per satu:

- [ ] `domain.com` tampil, tombol Sampaikan Aspirasi dan Lacak Aspirasi jalan
- [ ] Form `/aspirasi`: pilihan kelas dan kategori muncul
- [ ] Kirim aspirasi: muncul kode `ASP-...`, tombol Salin Kode jalan
- [ ] `/lacak` dengan kode itu: status "Diterima" tampil
- [ ] `admin.domain.com/login`: login berhasil dan masuk dashboard
- [ ] Aspirasi tadi muncul di daftar admin
- [ ] Buka detail, Tandai Ditinjau, lalu kirim balasan
- [ ] Refresh `/lacak`: status berubah dan Balasan Sekolah muncul
- [ ] Kirim aspirasi dengan lampiran gambar: gambar tampil di detail admin
- [ ] Logout lalu buka `admin.domain.com`: kembali ke login
- [ ] Uji moderasi: kirim kalimat kasar, harus ditolak atau masuk "Perlu dicek"

---

## 8. Turnstile (opsional, disarankan sebelum dipakai siswa)

1. Cloudflare Dashboard > Turnstile > Add site, domain `domain.com`.
2. Backend Variables: `CAPTCHA_SECRET` (secret key) dan `TURNSTILE_SITE_KEY` (site key).
3. Backend redeploy. Widget muncul otomatis di form, tanpa ubah frontend.

Tanpa `CAPTCHA_SECRET`, CAPTCHA mati dan form hanya dilindungi rate limit, honeypot, dan anti-duplikat.

---

## 9. Pasang desain Figma

Hanya ubah `web/`. Jangan ubah:
- `web/lib/api.ts` dan `web/lib/types.ts`
- logika di dalam halaman: `state`, `onSubmit`, pemanggilan `api.*`

Boleh diganti bebas:
- JSX dan kelas Tailwind di `web/app/page.tsx`, `web/app/aspirasi/page.tsx`, `web/app/lacak/page.tsx`
- warna dan token di `web/app/globals.css` dan `web/tailwind.config.ts`
- logo: timpa `web/public/school-logo.png`

Nama field form yang wajib tetap: `name, className, category, title, body, consent, website, startedAt, captchaToken, files`.
Kolom `website` adalah honeypot: harus tetap ada dan tersembunyi dari pengguna.

Setelah selesai, `git push`. Vercel deploy ulang otomatis.

---

## Masalah umum

| Gejala | Penyebab | Solusi |
|---|---|---|
| Form tidak memuat kelas/kategori, console ada error CORS | `CORS_ORIGIN` belum berisi alamat frontend, atau ada `/` di akhir | Betulkan, backend redeploy |
| Login berhasil tapi langsung terlempar ke login lagi | Cookie tidak tersimpan | Domain sendiri: `COOKIE_SAMESITE=lax`. Domain bawaan Railway/Vercel: `none`. Pastikan `NODE_ENV=production` |
| Frontend masih memanggil `localhost:5000` | `NEXT_PUBLIC_API_URL` salah atau belum di-redeploy | Betulkan di Vercel lalu Redeploy |
| Log backend: `SEED_ADMIN_PASSWORD wajib diisi` | Admin pertama belum ada dan password kosong/kurang 12 karakter | Isi variable, redeploy |
| Log backend: `JWT_SECRET minimal 32 karakter` | Variable kosong/pendek | Isi string acak panjang |
| Lupa password admin | Seed tidak menimpa password | Hapus baris admin lewat tab Data Postgres di Railway, lalu ubah `SEED_ADMIN_PASSWORD` dan redeploy |
| Lampiran hilang setelah deploy | Volume belum dipasang | Langkah 2d |
| Kena "terlalu banyak permintaan" saat tes | Rate limit | Tunggu beberapa menit |
| 500 saat kirim aspirasi | Database/skema | Cek log backend, pastikan `prisma db push` sukses |

---

## Edit dari HP (Termux)

Setelah ubah file:
```bash
git add . && git commit -m "update" && git push
```
Railway (backend) dan Vercel (frontend) build ulang sendiri. Jangan jalankan Prisma di Termux, biarkan Railway yang menjalankannya.
