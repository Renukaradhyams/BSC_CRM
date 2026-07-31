import express from 'express';
import { 
  getEmployees, createEmployee, updateEmployee, bulkUploadEmployees, deleteEmployee, 
  getAttendance, upsertAttendance,
  getSupervisors, createSupervisor, updateSupervisor, deleteSupervisor,
  supervisorLogin, getSupervisorTeam
} from '../controllers/attendanceController';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = express.Router();

// Employee Roster management
router.get('/employees', authenticateJWT, getEmployees);
router.post('/employees', authenticateJWT, authorizeRoles(['super_admin', 'admin', 'crm_manager', 'hr']), createEmployee);
router.put('/employees/:id', authenticateJWT, authorizeRoles(['super_admin', 'admin', 'crm_manager', 'hr']), updateEmployee);
router.post('/employees/bulk', authenticateJWT, authorizeRoles(['super_admin', 'admin', 'crm_manager', 'hr']), bulkUploadEmployees);
router.delete('/employees/:id', authenticateJWT, authorizeRoles(['super_admin', 'admin', 'crm_manager', 'hr']), deleteEmployee);

// Section Supervisor Management (Admin only)
router.get('/supervisors', authenticateJWT, getSupervisors);
router.post('/supervisors', authenticateJWT, authorizeRoles(['super_admin', 'admin', 'crm_manager', 'hr']), createSupervisor);
router.put('/supervisors/:id', authenticateJWT, authorizeRoles(['super_admin', 'admin', 'crm_manager', 'hr']), updateSupervisor);
router.delete('/supervisors/:id', authenticateJWT, authorizeRoles(['super_admin', 'admin', 'crm_manager', 'hr']), deleteSupervisor);

// Section Supervisor PIN login (no JWT required — PIN based)
router.post('/supervisor/login', supervisorLogin);

// Get team for section supervisor
router.get('/supervisor/team', getSupervisorTeam);

// Daily Register
router.get('/', authenticateJWT, getAttendance);
router.post('/upsert', upsertAttendance);

export default router;
