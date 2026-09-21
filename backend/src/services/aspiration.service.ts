import { Prisma, AspirationStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { SubmitInput } from '../validators/aspiration.validator';
import { generateCode } from '../utils/code';
import { hashIp, sha256 } from '../utils/hash';
import { HttpError, invalid, notFound } from '../utils/httpError';
import { sanitizeText } from '../utils/sanitize';
import { moderate } from './moderation.service';
import { getClasses } from './settings.service';
import { assertNotSpam, normalizeForHash } from './spam.service';
import { deleteFiles, saveFiles, validateFiles } from './upload.service';

export const STATUS_INFO: Record<AspirationStatus, { label: string; description: string }> = {
  PENDING: { label: 'Diterima', description: 'Menunggu pemeriksaan.' },
  REVIEWING: { label: 'Ditinjau', description: 'Sedang ditinjau oleh pihak sekolah.' },
  IN_PROGRESS: { label: 'Diproses', description: 'Sedang diproses.' },
  RESOLVED: { label: 'Selesai', description: 'Aspirasi telah ditindaklanjuti.' },
  ARCHIVED: { label: 'Diarsipkan', description: 'Aspirasi telah diarsipkan.' },
};

/** Insert dengan kode acak; jika kebetulan bentrok (unique), coba kode lain. */
async function insertWithUniqueCode(build: (code: string) => Prisma.AspirationCreateInput) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.aspiration.create({ data: build(generateCode()) });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') continue;
      throw err;
    }
  }
  throw new HttpError(503, 'Server sedang sibuk. Silakan coba lagi.', 'CODE_COLLISION');
}

export async function submitAspiration(p: { input: SubmitInput; files: Express.Multer.File[]; ip: string; userAgent: string }) {
  const { input } = p;

  const [classes, category] = await Promise.all([
    getClasses(),
    prisma.category.findFirst({ where: { slug: input.category, isActive: true } }),
  ]);
  if (!classes.includes(input.className)) throw invalid('className', 'Pilih kelas dari daftar yang tersedia.');
  if (!category) throw invalid('category', 'Pilih kategori dari daftar yang tersedia.');

  // Sanitization
  const title = sanitizeText(input.title);
  const body = sanitizeText(input.body, { multiline: true });
  const authorName = sanitizeText(input.name) || null;
  if (title.length < 5) throw invalid('title', 'Judul minimal 5 karakter.');
  if (body.length < 20) throw invalid('body', 'Isi aspirasi minimal 20 karakter.');

  // Anti-spam
  const contentHash = sha256(normalizeForHash(`${title} ${body}`));
  const ipHash = hashIp(p.ip);
  await assertNotSpam({ contentHash, ipHash });

  // Validasi lampiran (ukuran, MIME, ekstensi, isi file, nama)
  const validFiles = validateFiles(p.files);

  // Anti-toxic / moderasi
  const mod = moderate(title, body);
  const common = {
    className: input.className,
    authorName,
    title,
    body,
    contentHash,
    ipHash,
    userAgent: p.userAgent || null,
    category: { connect: { id: category.id } },
    moderationStatus: mod.decision,
    statusHistory: { create: { fromStatus: null, toStatus: 'PENDING' as const, note: 'Aspirasi dikirim' } },
    moderationLogs: { create: { source: 'AUTO' as const, decision: mod.decision, score: mod.score, reasons: mod.reasons } },
  };

  if (mod.decision === 'REJECTED') {
    // Tetap disimpan (tanpa lampiran) supaya admin bisa memeriksa kalau ternyata salah deteksi.
    await insertWithUniqueCode((code) => ({ ...common, code }));
    throw new HttpError(
      422,
      'Aspirasi belum bisa dikirim karena ada bahasa yang kurang pantas. Coba tulis ulang dengan lebih sopan, ya. Kritik tetap boleh disampaikan.',
      'CONTENT_REJECTED',
    );
  }

  const stored = await saveFiles(validFiles);
  try {
    const created = await insertWithUniqueCode((code) => ({
      ...common,
      code,
      attachments: { create: stored },
    }));
    return { code: created.code, createdAt: created.createdAt };
  } catch (err) {
    await deleteFiles(stored.map((s) => s.storedName));
    throw err;
  }
}

/** Data yang boleh dilihat siswa lewat kode. Tidak ada nama, IP, atau hasil moderasi. */
export async function trackByCode(code: string) {
  const a = await prisma.aspiration.findUnique({
    where: { code },
    include: {
      category: { select: { name: true } },
      statusHistory: { orderBy: { createdAt: 'asc' }, select: { toStatus: true, createdAt: true } },
      replies: { orderBy: { createdAt: 'asc' }, select: { id: true, message: true, createdAt: true } },
    },
  });
  if (!a || a.moderationStatus === 'REJECTED') throw notFound('Kode aspirasi tidak ditemukan. Periksa kembali penulisan kodenya.');

  return {
    code: a.code,
    title: a.title,
    category: a.category.name,
    className: a.className,
    status: a.status,
    statusLabel: STATUS_INFO[a.status].label,
    statusDescription: STATUS_INFO[a.status].description,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    timeline: a.statusHistory.map((h) => ({ status: h.toStatus, label: STATUS_INFO[h.toStatus].label, at: h.createdAt })),
    replies: a.replies,
  };
}
