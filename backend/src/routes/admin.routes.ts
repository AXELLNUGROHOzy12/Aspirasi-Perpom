import { Router } from 'express';
import * as admin from '../controllers/admin.controller';
import * as auth from '../controllers/auth.controller';
import * as ft from '../controllers/adminFavoriteTeacher.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { requireXhrHeader } from '../middleware/csrf';
import { loginLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { idParam, listQuerySchema, loginSchema, moderateBody, replyBody, settingsBody, statusBody } from '../validators/admin.validator';
import { reorderBody, teacherIdParam, toggleBody } from '../validators/favoriteTeacher.validator';
import { teacherPhotoUpload } from '../services/teacherPhoto.service';

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

// Guru Favorit: kelola guru, aktif/nonaktifkan, dan lihat hasil
router.get('/favorite-teacher', ft.overview);
router.put('/favorite-teacher/toggle', canManage, validate(toggleBody), ft.toggle);
router.post('/favorite-teacher/teachers', canManage, teacherPhotoUpload, ft.createTeacher);
router.patch('/favorite-teacher/teachers/:id', canManage, validate(teacherIdParam, 'params'), teacherPhotoUpload, ft.updateTeacher);
router.delete('/favorite-teacher/teachers/:id', requireRole('SUPER_ADMIN'), validate(teacherIdParam, 'params'), ft.deleteTeacher);
router.patch('/favorite-teacher/reorder', canManage, validate(reorderBody), ft.reorder);
router.post('/favorite-teacher/reset-votes', requireRole('SUPER_ADMIN'), ft.resetVotes);

export default router;
