import { Router } from 'express';
import * as admin from '../controllers/admin.controller';
import * as auth from '../controllers/auth.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { requireXhrHeader } from '../middleware/csrf';
import { loginLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { idParam, listQuerySchema, loginSchema, moderateBody, replyBody, settingsBody, statusBody } from '../validators/admin.validator';

const router = Router();
const canManage = requireRole('SUPER_ADMIN', 'ADMIN');

router.use(requireXhrHeader);

router.post('/login', loginLimiter, validate(loginSchema), auth.login);
router.post('/logout', auth.logout);

router.use(requireAuth);

router.get('/me', auth.me);
router.get('/statistics', admin.statistics);
router.get('/aspirations', validate(listQuerySchema, 'query'), admin.list);
router.get('/aspirations/:id', validate(idParam, 'params'), admin.detail);
router.patch('/aspirations/:id/status', canManage, validate(idParam, 'params'), validate(statusBody), admin.updateStatus);
router.post('/aspirations/:id/reply', canManage, validate(idParam, 'params'), validate(replyBody), admin.reply);
router.post('/aspirations/:id/moderate', validate(idParam, 'params'), validate(moderateBody), admin.moderate);
router.delete('/aspirations/:id', requireRole('SUPER_ADMIN'), validate(idParam, 'params'), admin.remove);
router.get('/attachments/:id/download', validate(idParam, 'params'), admin.downloadAttachment);
router.put('/settings', requireRole('SUPER_ADMIN'), validate(settingsBody), admin.saveSettings);

export default router;
