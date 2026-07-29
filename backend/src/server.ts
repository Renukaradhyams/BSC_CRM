import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import crmRoutes from './routes/crm';
import cashRoutes from './routes/cash';
import vmRoutes from './routes/vm';

dotenv.config();

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors());

// Logging
app.use(morgan('combined'));

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Static uploads path mapping
app.use('/uploads', express.static('uploads'));

// Base Route
app.get('/', (req: Request, res: Response) => {
  res.json({ ok: true, message: 'BSC Retail CRM API Server is active' });
});

// Bind routers
app.use('/api/auth', authRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/vm', vmRoutes);

// Unhandled Route Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ ok: false, error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ ok: false, error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`TypeScript Server running on port ${PORT}`);
});
