import express from 'express';
import { getMaster, saveSettlement } from '../controllers/cashController';
import { authenticateCash } from '../middleware/auth';

const router = express.Router();

router.get('/master', authenticateCash, getMaster);
router.post('/settlement', authenticateCash, saveSettlement);

export default router;
