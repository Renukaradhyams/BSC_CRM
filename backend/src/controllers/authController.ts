import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { JWT_SECRET } from '../middleware/auth';

// 1. Check Onboarding Status
export const setupCheck = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.settings.findFirst({
      where: { deletedAt: null }
    });
    const superAdmin = await prisma.user.findFirst({
      where: { role: 'super_admin', deletedAt: null }
    });

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
    const settingsCheck = await prisma.settings.findFirst({
      where: { deletedAt: null }
    });
    const adminCheck = await prisma.user.findFirst({
      where: { role: 'super_admin', deletedAt: null }
    });

    if (settingsCheck?.setupComplete && adminCheck) {
      return res.status(400).json({ ok: false, error: 'CRM setup is already complete' });
    }

    const { company, sections, admin_user } = req.body;
    if (!company || !admin_user) {
      return res.status(400).json({ ok: false, error: 'Missing company details or admin credentials' });
    }

    // Delete any old settings and admin accounts
    await prisma.$transaction([
      prisma.settings.deleteMany(),
      prisma.user.deleteMany({ where: { role: 'super_admin' } })
    ]);

    // Create Settings
    await prisma.settings.create({
      data: {
        companyName: company.name,
        companyLogoUrl: company.logo_url || null,
        operatingStart: company.op_start || "10:00",
        operatingEnd: company.op_end || "22:00",
        footfallGraceMin: parseInt(company.grace_min, 10) || 30,
        footfallEditCutoff: company.edit_cutoff || "10:30",
        setupComplete: true
      }
    });

    // Create Sections
    if (sections && Array.isArray(sections)) {
      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        const sectionId = `S${i + 1}`;
        await prisma.section.upsert({
          where: { sectionId },
          update: {
            sectionName: sec.name,
            type: sec.type,
            managerName: sec.manager_name || null,
            managerEmail: sec.manager_email || null,
            isActive: true,
            deletedAt: null
          },
          create: {
            sectionId,
            sectionName: sec.name,
            type: sec.type,
            managerName: sec.manager_name || null,
            managerEmail: sec.manager_email || null
          }
        });
      }
    }

    // Create Super Admin User
    const hashedPassword = await bcrypt.hash(admin_user.password, 10);
    await prisma.user.create({
      data: {
        name: admin_user.name,
        email: admin_user.email,
        password: hashedPassword,
        role: 'super_admin',
        sectionsAssigned: 'ALL',
        isActive: true
      }
    });

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

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { name: identifier }
        ],
        deletedAt: null
      }
    });

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

    const settings = await prisma.settings.findFirst({
      where: { deletedAt: null }
    });

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

// 4. Logout (audit log stub)
export const logout = async (req: Request, res: Response) => {
  return res.json({ ok: true, message: 'Logged out successfully' });
};

// 5. Cash Login PIN verify
export const cashLogin = async (req: Request, res: Response) => {
  try {
    const { pin } = req.body;
    if (pin === '1938') {
      const cashToken = jwt.sign(
        { scope: 'cash_settlement' },
        JWT_SECRET,
        { expiresIn: '2h' }
      );
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

    const vmUser = await prisma.vMUser.findFirst({
      where: { name, deletedAt: null }
    });

    if (!vmUser || !vmUser.isActive) {
      return res.status(401).json({ ok: false, error: 'VM User not found or inactive' });
    }

    if (vmUser.pin !== pin) {
      return res.status(401).json({ ok: false, error: 'Incorrect PIN' });
    }

    return res.json({
      ok: true,
      name: vmUser.name,
      role: vmUser.role
    });
  } catch (err: any) {
    console.error('VM login error:', err);
    return res.status(500).json({ ok: false, error: 'VM Login failed: ' + err.message });
  }
};
