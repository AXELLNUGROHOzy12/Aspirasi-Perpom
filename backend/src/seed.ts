/**
 * Seed otomatis (dijalankan setiap start di Railway, idempotent).
 * - Selalu: akun SUPER_ADMIN pertama (jika belum ada) + kategori.
 * - Hanya jika SEED_DEMO_DATA=true: aspirasi dummy (bukan data siswa asli).
 */
import crypto from 'crypto';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import { AspirationStatus, ModerationStatus, PrismaClient } from '@prisma/client';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const prisma = new PrismaClient();
const sha = (s: string) => crypto.createHash('sha256').update(s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()).digest('hex');
const ago = (hours: number) => new Date(Date.now() - hours * 3600_000);

const CATEGORIES = [
  ['fasilitas', 'Fasilitas'], ['pembelajaran', 'Pembelajaran'], ['kebersihan', 'Kebersihan'], ['kegiatan', 'Kegiatan'],
  ['organisasi', 'Organisasi'], ['keamanan', 'Keamanan'], ['saran', 'Saran'], ['lainnya', 'Lainnya'],
];

interface Demo {
  code: string; className: string; category: string; title: string; body: string;
  status: AspirationStatus; moderation: ModerationStatus; hoursAgo: number;
  history: [AspirationStatus, number][]; reply?: string;
}

const DEMOS: Demo[] = [
  {
    code: 'ASP-20260915-K7M2QX', className: 'XI IPA 1', category: 'fasilitas', title: 'AC di ruang kelas tidak dingin',
    body: 'AC di kelas kami sudah beberapa minggu tidak dingin, sehingga saat pelajaran siang suasana kelas sangat panas dan sulit berkonsentrasi. Mohon dicek dan diperbaiki.',
    status: 'RESOLVED', moderation: 'APPROVED', hoursAgo: 120,
    history: [['REVIEWING', 110], ['IN_PROGRESS', 90], ['RESOLVED', 48]],
    reply: 'Terima kasih atas aspirasinya. AC sudah diperbaiki oleh teknisi pada hari Jumat. Kabari kami kalau masih ada kendala.',
  },
  {
    code: 'ASP-20260916-R4TN8W', className: 'X IPA 2', category: 'kebersihan', title: 'Tempat sampah di lorong lantai 2 kurang',
    body: 'Di lorong lantai 2 hanya ada satu tempat sampah sehingga sampah sering berserakan saat jam istirahat. Mohon ditambah tempat sampah, terutama yang terpisah untuk organik dan plastik.',
    status: 'IN_PROGRESS', moderation: 'APPROVED', hoursAgo: 72,
    history: [['REVIEWING', 60], ['IN_PROGRESS', 30]],
    reply: 'Laporan sudah kami teruskan ke bagian sarana. Penambahan tempat sampah sedang kami proses.',
  },
  {
    code: 'ASP-20260917-B9HZ3D', className: 'XII IPS 1', category: 'pembelajaran', title: 'Usul jadwal konsultasi ujian',
    body: 'Kami mengusulkan adanya jadwal konsultasi mata pelajaran sepulang sekolah menjelang ujian, supaya siswa yang belum paham materi bisa bertanya langsung kepada guru.',
    status: 'PENDING', moderation: 'APPROVED', hoursAgo: 30, history: [],
  },
  {
    code: 'ASP-20260918-W5PC6E', className: 'XI IPS 1', category: 'saran', title: 'Laporan perkataan kasar di kelas',
    body: 'Saya melaporkan bahwa beberapa teman sering menggunakan kata-kata kasar kepada teman sekelas saat pelajaran kosong. Mohon ada pembinaan supaya suasana kelas lebih nyaman.',
    status: 'PENDING', moderation: 'NEEDS_REVIEW', hoursAgo: 6, history: [],
  },
];

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@sekolah.test').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || '';
  const withDemo = process.env.SEED_DEMO_DATA === 'true';

  // Idempotent: aman dijalankan di setiap deploy. Admin yang sudah ada tidak diubah (password tidak ditimpa).
  let admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) {
    if (password.length < 12) {
      throw new Error('SEED_ADMIN_PASSWORD wajib diisi (minimal 12 karakter) untuk membuat akun admin pertama.');
    }
    admin = await prisma.admin.create({
      data: { email, name: 'Admin Sekolah', role: 'SUPER_ADMIN', passwordHash: await bcrypt.hash(password, 12) },
    });
    console.log(`[seed] Admin dibuat: ${email}`);
  } else {
    console.log(`[seed] Admin ${email} sudah ada, dilewati.`);
  }

  const adminId = admin.id;

  for (const [i, [slug, name]] of CATEGORIES.entries()) {
    await prisma.category.upsert({ where: { slug }, update: { name, sortOrder: i }, create: { slug, name, sortOrder: i } });
  }
  console.log(`[seed] ${CATEGORIES.length} kategori siap.`);

  if (!withDemo) return;

  for (const d of DEMOS) {
    if (await prisma.aspiration.findUnique({ where: { code: d.code } })) continue;
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: d.category } });
    await prisma.aspiration.create({
      data: {
        code: d.code, className: d.className, title: d.title, body: d.body, contentHash: sha(`${d.title} ${d.body}`),
        status: d.status, moderationStatus: d.moderation, createdAt: ago(d.hoursAgo), category: { connect: { id: category.id } },
        statusHistory: {
          create: [
            { fromStatus: null, toStatus: 'PENDING', note: 'Aspirasi dikirim', createdAt: ago(d.hoursAgo) },
            ...d.history.map(([toStatus, h], i) => ({
              fromStatus: i === 0 ? ('PENDING' as const) : d.history[i - 1][0], toStatus, adminId, createdAt: ago(h),
            })),
          ],
        },
        moderationLogs: {
          create: { source: 'AUTO', decision: d.moderation, score: d.moderation === 'APPROVED' ? 0 : 0.4, reasons: d.moderation === 'APPROVED' ? [] : ['Kata kasar terdeteksi (1)'], createdAt: ago(d.hoursAgo) },
        },
        ...(d.reply ? { replies: { create: { adminId, message: d.reply, createdAt: ago(d.hoursAgo - 20) } } } : {}),
      },
    });
  }

  console.log('[seed] Data dummy siap. Kode contoh untuk /lacak: ' + DEMOS.map((d) => d.code).join(', '));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
