import express from 'express';
import { getNotifications, sendNotification, markNotificationsRead, deleteNotification } from '../controllers/notificationController';
import { authenticateJWT } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticateJWT, getNotifications);
router.post('/', authenticateJWT, sendNotification);
router.put('/read', authenticateJWT, markNotificationsRead);
router.delete('/:id', authenticateJWT, deleteNotification);

export default router;
