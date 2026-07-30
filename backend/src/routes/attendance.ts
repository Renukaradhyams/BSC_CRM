import express from 'express';
import { getEmployees, createEmployee, bulkUploadEmployees, deleteEmployee, getAttendance, upsertAttendance } from '../controllers/attendanceController';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = express.Router();

// Employee Roster management
router.get('/employees', authenticateJWT, getEmployees);
router.post('/employees', authenticateJWT, authorizeRoles(['super_admin', 'admin', 'crm_manager', 'hr']), createEmployee);
router.post('/employees/bulk', authenticateJWT, authorizeRoles(['super_admin', 'admin', 'crm_manager', 'hr']), bulkUploadEmployees);
router.delete('/employees/:id', authenticateJWT, authorizeRoles(['super_admin', 'admin', 'crm_manager', 'hr']), deleteEmployee);

// Daily Register
router.get('/', authenticateJWT, getAttendance);
router.post('/upsert', authenticateJWT, authorizeRoles(['super_admin', 'admin', 'crm_manager', 'hr']), upsertAttendance);

export default router;
