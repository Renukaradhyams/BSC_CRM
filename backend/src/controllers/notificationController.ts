import { Response } from 'express';
import { query } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

// 1. Get Notifications for current user's role
export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role || 'crm_staff';
    const notifications = await query(
      `SELECT * FROM Notification 
       WHERE targetRole = 'ALL' OR targetRole = ? OR senderId = ?
       ORDER BY id DESC LIMIT 50`,
      [userRole, req.user?.id || 0]
    );

    return res.json({ ok: true, notifications });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 2. Send Broadcast / Targeted Notification (Admin, CRM Manager, Telecaller, Greeter)
export const sendNotification = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetRole, title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ ok: false, error: 'Title and message are required.' });
    }

    const senderId = req.user?.id || null;
    const senderName = req.user?.name || 'Staff Member';
    const senderRole = req.user?.role || 'admin';
    const roleTarget = targetRole || 'ALL';

    await query(
      `INSERT INTO Notification (senderId, senderName, senderRole, targetRole, title, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [senderId, senderName, senderRole, roleTarget, title, message]
    );

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 3. Mark Notifications as Read
export const markNotificationsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role || 'crm_staff';
    await query(
      `UPDATE Notification SET isRead = TRUE WHERE targetRole = 'ALL' OR targetRole = ?`,
      [userRole]
    );
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 4. Delete Notification
export const deleteNotification = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM Notification WHERE id = ?`, [id]);
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};
