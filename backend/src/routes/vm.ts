import express from 'express';
import {
  getVmDashboard,
  getAdminDashboard,
  getChecklist,
  getTodaySubmission,
  submitChecklist,
  getAdminReports,
  getHistory,
  getSubmissionDetail,
  getChecklistMaster,
  addChecklistPoint,
  updateChecklistPoint,
  deleteChecklistPoint,
  getSubmissions
} from '../controllers/vmController';
import { getVmUsers } from '../controllers/vmController';

const router = express.Router();

router.get('/dashboard', getVmDashboard);
router.get('/admin-dashboard', getAdminDashboard);
router.get('/points', getChecklist);
router.get('/today-submission', getTodaySubmission);
router.post('/submit', submitChecklist);
router.get('/reports', getAdminReports);
router.get('/history', getHistory);
router.get('/detail', getSubmissionDetail);
router.get('/submissions', getSubmissions);
router.get('/users', getVmUsers);

// Configuration points editor
router.get('/checklist-master', getChecklistMaster);
router.post('/add-point', addChecklistPoint);
router.put('/update-point/:id', updateChecklistPoint);
router.delete('/delete-point/:id', deleteChecklistPoint);

export default router;
