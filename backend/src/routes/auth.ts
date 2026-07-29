import express from 'express';
import { setupCheck, onboard, login, logout, cashLogin, vmLogin } from '../controllers/authController';

const router = express.Router();

router.get('/setup-check', setupCheck);
router.post('/setup-check', setupCheck);
router.post('/onboard', onboard);
router.post('/login', login);
router.post('/logout', logout);
router.post('/cash-login', cashLogin);
router.get('/vm-login', vmLogin);
router.post('/vm-login', vmLogin);

export default router;
