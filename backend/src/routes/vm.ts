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
  deleteChecklistPoint
} from '../controllers/vmController';

const router = express.Router();

router.get('/dashboard', getVmDashboard);
router.get('/admin-dashboard', getAdminDashboard);
router.get('/points', getChecklist);
router.get('/today-submission', getTodaySubmission);
router.post('/submit', submitChecklist);
router.get('/reports', getAdminReports);
router.get('/history', getHistory);
router.get('/detail', getSubmissionDetail);

// Configuration points editor
router.get('/checklist-master', getChecklistMaster);
router.get('/add-point', addChecklistPoint);
router.get('/update-point', updateChecklistPoint);
router.get('/delete-point', deleteChecklistPoint);

export default router;
