import { Router } from 'express';
import * as ctrl from '../controllers/public.controller';
import * as ft from '../controllers/favoriteTeacher.controller';
import { submitLimiter, trackLimiter, voteLimiter } from '../middleware/rateLimit';
import { uploadMiddleware } from '../services/upload.service';
import { validate } from '../middleware/validate';
import { teacherIdParam } from '../validators/favoriteTeacher.validator';

const router = Router();

router.get('/settings', ctrl.settings);
// Urutan: rate limit -> parsing multipart -> (controller) validasi, captcha, sanitasi, anti-spam, moderasi, kode, database
router.post('/aspirations', submitLimiter, uploadMiddleware, ctrl.submit);
router.get('/aspirations/:code', trackLimiter, ctrl.track);

// Guru Favorit: widget publik (tanpa login, tersembunyi otomatis kalau nonaktif)
router.get('/favorite-teacher', ft.state);
router.post('/favorite-teacher/vote', voteLimiter, ft.vote);
router.get('/favorite-teacher/photo/:id', validate(teacherIdParam, 'params'), ft.photo);

export default router;
