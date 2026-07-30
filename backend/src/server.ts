import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { initDb } from './initDb';

import authRoutes from './routes/auth';
import crmRoutes from './routes/crm';
import cashRoutes from './routes/cash';
import vmRoutes from './routes/vm';
import attendanceRoutes from './routes/attendance';

dotenv.config();

const app = express();

// Trust reverse proxy header configurations (like Hostinger Cloudflare/Loadbalancers)
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? true : 1);

// Security Middlewares
app.use(helmet());
app.use(cors());

// Logging
app.use(morgan('combined'));

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting — 5000 requests per 15 minutes to allow active multi-page CRM telemetry and polling
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: { ok: false, error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Static uploads path mapping
app.use('/uploads', express.static('uploads'));

// Bind API routers
app.use('/api/auth', authRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/vm', vmRoutes);
app.use('/api/attendance', attendanceRoutes);

// Serve static frontend build assets
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// Fallback all other routing requests to React Router index.html
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ ok: false, error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

// Auto-initialize database tables then start the server
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`TypeScript Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
  });
