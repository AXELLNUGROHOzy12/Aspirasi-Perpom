import { asyncHandler } from '../utils/asyncHandler';
import { generateCode } from '../utils/code';
import { notFound } from '../utils/httpError';
import { codeParam, isValidCode, submitSchema } from '../validators/aspiration.validator';
import { submitAspiration, trackByCode } from '../services/aspiration.service';
import { verifyCaptcha } from '../services/captcha.service';
import { getPublicSettings } from '../services/settings.service';
import { assertHumanTiming } from '../services/spam.service';

export const settings = asyncHandler(async (_req, res) => {
  res.json({ data: await getPublicSettings() });
});

export const submit = asyncHandler(async (req, res) => {
  // 1. Validasi bentuk data
  const input = submitSchema.parse(req.body ?? {});

  // Honeypot terisi = bot. Beri respons sukses palsu supaya bot tidak belajar, tanpa menyimpan apa pun.
  if (input.website) {
    res.status(201).json({ data: { code: generateCode(), createdAt: new Date() } });
    return;
  }

  // 2. Anti-spam awal + CAPTCHA
  assertHumanTiming(input.startedAt);
  await verifyCaptcha(input.captchaToken, req.ip);

  // 3. Sanitasi, anti-spam, moderasi, kode unik, simpan ke database (di service)
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const result = await submitAspiration({
    input,
    files,
    ip: req.ip ?? '',
    userAgent: String(req.get('user-agent') ?? '').slice(0, 200),
  });
  res.status(201).json({ data: result });
});

export const track = asyncHandler(async (req, res) => {
  const { code } = codeParam.parse(req.params);
  if (!isValidCode(code)) throw notFound('Kode aspirasi tidak ditemukan. Periksa kembali penulisan kodenya.');
  res.json({ data: await trackByCode(code) });
});
