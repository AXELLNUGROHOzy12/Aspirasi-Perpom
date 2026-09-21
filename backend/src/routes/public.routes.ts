import { Router } from 'express';
import * as ctrl from '../controllers/public.controller';
import { submitLimiter, trackLimiter } from '../middleware/rateLimit';
import { uploadMiddleware } from '../services/upload.service';

const router = Router();

router.get('/settings', ctrl.settings);
// Urutan: rate limit -> parsing multipart -> (controller) validasi, captcha, sanitasi, anti-spam, moderasi, kode, database
router.post('/aspirations', submitLimiter, uploadMiddleware, ctrl.submit);
router.get('/aspirations/:code', trackLimiter, ctrl.track);

export default router;
