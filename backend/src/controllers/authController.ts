import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';
import { JWT_SECRET } from '../middleware/auth';

// 1. Check Onboarding Status
export const setupCheck = async (req: Request, res: Response) => {
  try {
    const [settings] = await query('SELECT id, setupComplete FROM Settings WHERE deleted_at IS NULL LIMIT 1');
    const [superAdmin] = await query("SELECT id FROM User WHERE role = 'super_admin' AND deleted_at IS NULL LIMIT 1");
    const isComplete = !!(settings && settings.setupComplete && superAdmin);
    return res.json({ ok: true, setup_complete: isComplete });
  } catch (err: any) {
    console.error('Setup check error:', err);
    return res.status(500).json({ ok: false, error: 'Database check failed: ' + err.message });
  }
};

// 2. Perform Onboarding
export const onboard = async (req: Request, res: Response) => {
  try {
    const [existingSettings] = await query('SELECT id, setupComplete FROM Settings WHERE deleted_at IS NULL LIMIT 1');
    const [existingAdmin] = await query("SELECT id FROM User WHERE role = 'super_admin' AND deleted_at IS NULL LIMIT 1");

    if (existingSettings?.setupComplete && existingAdmin) {
      return res.status(400).json({ ok: false, error: 'CRM setup is already complete' });
    }

    const { company, sections, admin_user } = req.body;
    if (!company || !admin_user) {
      return res.status(400).json({ ok: false, error: 'Missing company details or admin credentials' });
    }

    // Clear old settings and super_admin accounts
    await query('DELETE FROM Settings');
    await query("DELETE FROM User WHERE role = 'super_admin'");

    // Create Settings
    await query(
      `INSERT INTO Settings (companyName, companyLogoUrl, operatingStart, operatingEnd, footfallGraceMin, footfallEditCutoff, setupComplete)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [
        company.name,
        company.logo_url || null,
        company.op_start || '10:00',
        company.op_end || '22:00',
        parseInt(company.grace_min, 10) || 30,
        company.edit_cutoff || '10:30'
      ]
    );

    // Create Sections
    if (sections && Array.isArray(sections)) {
      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        const sectionId = `S${i + 1}`;
        await query(
          `INSERT INTO Section (sectionId, sectionName, type, managerName, managerEmail)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE sectionName = VALUES(sectionName), type = VALUES(type),
             managerName = VALUES(managerName), managerEmail = VALUES(managerEmail), deleted_at = NULL`,
          [sectionId, sec.name, sec.type, sec.manager_name || null, sec.manager_email || null]
        );
      }
    }

    // Create Super Admin User
    const hashedPassword = await bcrypt.hash(admin_user.password, 10);
    await query(
      `INSERT INTO User (name, email, password, role, sectionsAssigned, isActive) VALUES (?, ?, ?, 'super_admin', 'ALL', TRUE)`,
      [admin_user.name, admin_user.email, hashedPassword]
    );

    return res.json({ ok: true, message: 'CRM onboarding completed successfully' });
  } catch (err: any) {
    console.error('Onboard error:', err);
    return res.status(500).json({ ok: false, error: 'Setup execution failed: ' + err.message });
  }
};

// 3. User Login
export const login = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    const identifier = email || username;

    if (!identifier || !password) {
      return res.status(400).json({ ok: false, error: 'Username and password are required' });
    }

    const [user] = await query(
      'SELECT * FROM User WHERE (email = ? OR name = ?) AND deleted_at IS NULL LIMIT 1',
      [identifier, identifier]
    );

    if (!user || !user.isActive) {
      return res.status(401).json({ ok: false, error: 'Invalid username or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ ok: false, error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    const [settings] = await query('SELECT * FROM Settings WHERE deleted_at IS NULL LIMIT 1');

    return res.json({
      ok: true,
      token,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        sectionsAssigned: user.sectionsAssigned
      },
      settings: settings ? {
        companyName: settings.companyName,
        companyLogoUrl: settings.companyLogoUrl,
        operatingStart: settings.operatingStart,
        operatingEnd: settings.operatingEnd,
        graceMin: settings.footfallGraceMin,
        editCutoff: settings.footfallEditCutoff
      } : null
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ ok: false, error: 'Login process failed: ' + err.message });
  }
};

// 4. Logout
export const logout = async (req: Request, res: Response) => {
  return res.json({ ok: true, message: 'Logged out successfully' });
};

// 5. Cash Login PIN verify
export const cashLogin = async (req: Request, res: Response) => {
  try {
    const { pin } = req.body;
    if (pin === '1938') {
      const cashToken = jwt.sign({ scope: 'cash_settlement' }, JWT_SECRET, { expiresIn: '2h' });
      return res.json({ ok: true, cashToken });
    }
    return res.status(401).json({ ok: false, error: 'Incorrect Cash Settlement PIN' });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 6. VM Login verify name/pin
export const vmLogin = async (req: Request, res: Response) => {
  try {
    const name = (req.query.name || req.body.name) as string;
    const pin = (req.query.pin || req.body.pin) as string;

    if (!name || !pin) {
      return res.status(400).json({ ok: false, error: 'Name and PIN are required' });
    }

    const [vmUser] = await query(
      'SELECT * FROM VMUser WHERE name = ? AND deleted_at IS NULL LIMIT 1',
      [name]
    );

    if (!vmUser || !vmUser.isActive) {
      return res.status(401).json({ ok: false, error: 'VM User not found or inactive' });
    }
    if (vmUser.pin !== pin) {
      return res.status(401).json({ ok: false, error: 'Incorrect PIN' });
    }

    return res.json({ ok: true, name: vmUser.name, role: vmUser.role });
  } catch (err: any) {
    console.error('VM login error:', err);
    return res.status(500).json({ ok: false, error: 'VM Login failed: ' + err.message });
  }
};

// 7. Greeter Login verify name/PIN or select from list
export const greeterLogin = async (req: Request, res: Response) => {
  try {
    const name = (req.body.name || req.query.name) as string;
    const pin = (req.body.pin || req.query.pin) as string;

    if (!name || !pin) {
      return res.status(400).json({ ok: false, error: 'Greeter name and 4-digit PIN are required' });
    }

    const [user] = await query(
      "SELECT * FROM User WHERE name = ? AND role = 'greeter' AND deleted_at IS NULL LIMIT 1",
      [name]
    );

    if (!user || !user.isActive) {
      return res.status(401).json({ ok: false, error: 'Greeter account not found or inactive' });
    }

    if (user.pin !== pin) {
      return res.status(401).json({ ok: false, error: 'Invalid 4-digit PIN' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    const [settings] = await query('SELECT * FROM Settings WHERE deleted_at IS NULL LIMIT 1');

    return res.json({
      ok: true,
      token,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        sectionsAssigned: user.sectionsAssigned
      },
      settings: settings ? {
        companyName: settings.companyName,
        companyLogoUrl: settings.companyLogoUrl,
        operatingStart: settings.operatingStart,
        operatingEnd: settings.operatingEnd,
        graceMin: settings.footfallGraceMin,
        editCutoff: settings.footfallEditCutoff
      } : null
    });
  } catch (err: any) {
    console.error('Greeter login error:', err);
    return res.status(500).json({ ok: false, error: 'Greeter login failed: ' + err.message });
  }
};

