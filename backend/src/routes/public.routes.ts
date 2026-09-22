import { Router } from 'express';
import * as ctrl from '../controllers/public.controller';
import * as ft from '../controllers/favoriteTeacher.controller';
import { submitLimiter, trackLimiter, voteLimiter } from '../middleware/rateLimit';
import { uploadMiddleware } from '../services/upload.service';
import { validate } from '../middleware/validate';
import { teacherIdParam } from '../validators/favoriteTeacher.validator';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../utils/httpError';
import { getMaintenanceMode } from '../services/settings.service';

const router = Router();

// /settings tetap bisa diakses saat maintenance supaya frontend tahu harus menampilkan halaman maintenance.
router.get('/settings', ctrl.settings);

// Saat maintenance aktif, semua aksi publik lain diblokir di level API juga (bukan cuma tampilan).
router.use(
  asyncHandler(async (_req, _res, next) => {
    if (await getMaintenanceMode()) {
      throw new HttpError(503, 'Sistem sedang dalam perbaikan. Coba lagi beberapa saat lagi.', 'MAINTENANCE');
    }
    next();
  }),
);

// Urutan: rate limit -> parsing multipart -> (controller) validasi, captcha, sanitasi, anti-spam, moderasi, kode, database
router.post('/aspirations', submitLimiter, uploadMiddleware, ctrl.submit);
router.get('/aspirations/:code', trackLimiter, ctrl.track);

// Guru Favorit: widget publik (tanpa login, tersembunyi otomatis kalau nonaktif)
router.get('/favorite-teacher', ft.state);
router.post('/favorite-teacher/vote', voteLimiter, ft.vote);
router.get('/favorite-teacher/photo/:id', validate(teacherIdParam, 'params'), ft.photo);

export default router;
