import express from 'express';
import { getDashboard, getFootfall, saveFootfall, saveDailyBills, getFeedbackQuestions, saveFeedback, getCallQueue, updateCallStatus, getDiverts, createDivert, updateDivert, getDivertReasons, sendDER, getSettings, updateSettings, getSections, getUsers, createUser, createSection, deleteSection, resetUserPassword, getGreeters, getReports, getAdminAuditLog } from '../controllers/crmController';
import { authenticateJWT, authorizeRoles, authenticateTV } from '../middleware/auth';

const router = express.Router();

// Dashboard Summary (TV View uses global TV auth, others use standard JWT)
router.get('/dashboard', getDashboard);
router.get('/tv-dashboard', authenticateTV, getDashboard);

// Footfalls slots CRUD
router.get('/footfall', authenticateJWT, getFootfall);
router.post('/footfall', authenticateJWT, saveFootfall);
router.post('/bills', authenticateJWT, saveDailyBills);

// Customer feedback routing
router.get('/questions', getFeedbackQuestions);
router.post('/feedback', authenticateJWT, saveFeedback);
router.post('/feedback/public', saveFeedback); // Public QR submission is unsecured

// Negative feedback follow-up CallQueue
router.get('/call-queue', authenticateJWT, authorizeRoles(['super_admin', 'admin', 'telecaller', 'crm_manager']), getCallQueue);
router.put('/call-queue/status', authenticateJWT, authorizeRoles(['super_admin', 'admin', 'telecaller', 'crm_manager']), updateCallStatus);

// Diverts CRUD
router.get('/divert', authenticateJWT, getDiverts);
router.post('/divert', authenticateJWT, createDivert);
router.put('/divert', authenticateJWT, updateDivert);
router.get('/divert/reasons', authenticateJWT, getDivertReasons);

// Settings and sections panels
router.get('/settings', authenticateJWT, getSettings);
router.put('/settings', authenticateJWT, authorizeRoles(['super_admin', 'admin']), updateSettings);
router.get('/sections', authenticateJWT, getSections);
router.post('/sections', authenticateJWT, authorizeRoles(['super_admin', 'admin']), createSection);
router.delete('/sections', authenticateJWT, authorizeRoles(['super_admin', 'admin']), deleteSection);

// User Accounts CRUD
router.get('/users', authenticateJWT, authorizeRoles(['super_admin', 'admin']), getUsers);
router.post('/users', authenticateJWT, authorizeRoles(['super_admin', 'admin']), createUser);
router.put('/users/reset-password', authenticateJWT, authorizeRoles(['super_admin', 'admin']), resetUserPassword);
router.get('/greeters', getGreeters); // Public list for greeter login selection

// Send Email DER triggers
router.post('/der', authenticateJWT, sendDER);

// Date-range Reports endpoint
router.get('/reports', authenticateJWT, getReports);

// Admin Audit Log
router.get('/audit-log', authenticateJWT, authorizeRoles(['super_admin', 'admin']), getAdminAuditLog);

export default router;

