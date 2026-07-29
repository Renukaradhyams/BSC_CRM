import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';

export const JWT_SECRET = process.env.JWT_SECRET || "RetailCrmSuperSecureSecret123!";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
    sectionsAssigned: string;
    isActive: boolean;
  };
}

// JWT Authentication Middleware
export const authenticateJWT = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Authorization token missing' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };
    const [user] = await query(
      'SELECT * FROM User WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [decoded.id]
    );

    if (!user || !user.isActive) {
      return res.status(403).json({ ok: false, error: 'User is inactive or deleted' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      sectionsAssigned: user.sectionsAssigned,
      isActive: user.isActive
    };
    next();
  } catch (err) {
    return res.status(403).json({ ok: false, error: 'Invalid or expired token' });
  }
};

// Role authorization
export const authorizeRoles = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Unauthenticated user context' });
    }
    if (req.user.role === 'super_admin') {
      return next(); // Super admin bypasses all role checks
    }
    if (allowedRoles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ ok: false, error: 'Forbidden: Insufficient privileges' });
  };
};

// TV Lock screen auth (PIN: 9911)
export const authenticateTV = (req: Request, res: Response, next: NextFunction) => {
  const tvPin = req.headers['x-tv-pin'];
  if (tvPin === '9911') {
    return next();
  }
  return res.status(401).json({ ok: false, error: 'Unauthorized: Invalid TV dashboard PIN' });
};

// Cash Settlement lock screen auth (PIN: 1938)
export const authenticateCash = (req: Request, res: Response, next: NextFunction) => {
  const cashPin = req.headers['x-cash-pin'] || req.query.pin;
  if (cashPin === '1938') {
    return next();
  }
  const cashToken = req.headers['x-cash-token'] as string;
  if (cashToken) {
    try {
      const decoded = jwt.verify(cashToken, JWT_SECRET) as { scope: string };
      if (decoded.scope === 'cash_settlement') {
        return next();
      }
    } catch (err) {}
  }
  return res.status(401).json({ ok: false, error: 'Unauthorized: Invalid Cash Settlement PIN' });
};
