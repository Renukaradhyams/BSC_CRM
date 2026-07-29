import { Request, Response } from 'express';
import prisma from '../config/db';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest } from '../middleware/auth';

// Helper to format date "DD/MM/YYYY" from Date object
export const formatDateString = (dateObj: Date): string => {
  const d = new Date(dateObj.getTime() + 5.5 * 60 * 60 * 1000); // Convert to IST
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

// 1. Get Dashboard Summary (CRM and TV View)
export const getDashboard = async (req: Request, res: Response) => {
  try {
    const todayStr = req.query.date as string || formatDateString(new Date());

    // 1. Hourly slots visitor counts
    const footfalls = await prisma.footfallEntry.findMany({
      where: { date: todayStr, deletedAt: null }
    });

    // 2. Daily summary (Bills count)
    const summary = await prisma.dailySummary.findUnique({
      where: { date: todayStr }
    });

    // 3. Open Diverts count
    const openDivertsCount = await prisma.divert.count({
      where: { status: { in: ['open', 'sourcing', 'available'] }, deletedAt: null }
    });

    // 4. Feedbacks metrics
    const feedbacks = await prisma.feedback.findMany({
      where: { date: todayStr, deletedAt: null }
    });

    // Calculate NPS / CSI
    let promoters = 0, detractors = 0, satisfiedCsi = 0, totalFeedbackWithNps = 0, csiTotal = 0;
    feedbacks.forEach(f => {
      // CSI: q0 is Service, scale is Excellent (5), Good (4), Average (3), Poor (2), Very Poor (1)
      if (f.q0) {
        let score = 3;
        if (f.q0.toLowerCase().includes('excellent')) score = 5;
        else if (f.q0.toLowerCase().includes('good')) score = 4;
        else if (f.q0.toLowerCase().includes('average')) score = 3;
        else if (f.q0.toLowerCase().includes('poor')) score = 2;
        else if (f.q0.toLowerCase().includes('very')) score = 1;
        csiTotal += score;
      }
      // NPS: q1 is Recommend
      if (f.q1) {
        totalFeedbackWithNps++;
        const rec = f.q1.toLowerCase();
        if (rec.includes('yes') || rec.includes('definitely') || rec.includes('10') || rec.includes('9')) {
          promoters++;
        } else if (rec.includes('no') || rec.includes('not') || rec.includes('maybe') || rec.includes('6') || rec.includes('5')) {
          detractors++;
        }
      }
    });

    const nps = totalFeedbackWithNps > 0 ? Math.round(((promoters - detractors) / totalFeedbackWithNps) * 100) : 0;
    const csi = feedbacks.length > 0 ? Math.round((csiTotal / (feedbacks.length * 5)) * 100) : 100;

    // Voices ticker reviews (comments/voice from positive feedbacks)
    const reviews = feedbacks.filter(f => f.yourVoice).map(f => ({
      name: f.custName || 'Anonymous',
      area: f.area,
      text: f.yourVoice
    }));

    return res.json({
      ok: true,
      today: todayStr,
      metrics: {
        totalFootfall: footfalls.reduce((sum, item) => sum + item.count, 0),
        totalBills: summary ? summary.billsCount : 0,
        openDiverts: openDivertsCount,
        feedbacksCollected: feedbacks.length,
        nps,
        csi
      },
      footfalls,
      reviews
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 2. Get Footfall Slots List for a Date
export const getFootfall = async (req: Request, res: Response) => {
  try {
    const dateStr = req.query.date as string || formatDateString(new Date());

    const footfalls = await prisma.footfallEntry.findMany({
      where: { date: dateStr, deletedAt: null }
    });

    const summary = await prisma.dailySummary.findUnique({
      where: { date: dateStr }
    });

    return res.json({
      ok: true,
      date: dateStr,
      footfalls,
      bills: summary ? summary.billsCount : 0
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 3. Save Footfall Entry for an Hourly Slot
export const saveFootfall = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date, slotStart, slotEnd, count, remarks } = req.body;
    const userName = req.user?.name || 'CRM Staff';

    if (!date || slotStart === undefined || count === undefined) {
      return res.status(400).json({ ok: false, error: 'Missing required parameters' });
    }

    // Grace Check
    const settings = await prisma.settings.findFirst({ where: { deletedAt: null } });
    const graceMin = settings ? settings.footfallGraceMin : 30;

    // Current time checks
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    // Verify if slot is locked (only allowed to edit current slot, or previous slot within grace period)
    const slotDeadlineHour = slotEnd; // e.g. 11:00 slot ends at 11
    const minutesPassed = (currentHour - slotDeadlineHour) * 60 + currentMin;

    if (minutesPassed > graceMin && req.user?.role === 'crm_staff') {
      return res.status(403).json({ ok: false, error: 'Slot is locked. Submission period has expired.' });
    }

    const entry = await prisma.footfallEntry.upsert({
      where: { date_slotStart: { date, slotStart } },
      update: {
        count: parseInt(count, 10),
        remarks: remarks || null,
        editedBy: userName,
        deletedAt: null
      },
      create: {
        date,
        slotStart,
        slotEnd,
        count: parseInt(count, 10),
        remarks: remarks || null,
        submittedBy: userName
      }
    });

    return res.json({ ok: true, entry });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 4. Save Day-End Bills count
export const saveDailyBills = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date, bills } = req.body;
    if (!date || bills === undefined) {
      return res.status(400).json({ ok: false, error: 'Missing date or bill count' });
    }

    // Cutoff Time Verification
    const settings = await prisma.settings.findFirst({ where: { deletedAt: null } });
    const cutoffStr = settings ? settings.footfallEditCutoff : "10:30"; // next morning cutoff

    const now = new Date();
    const cutoffHour = parseInt(cutoffStr.split(':')[0]);
    const cutoffMin = parseInt(cutoffStr.split(':')[1]);

    // Check if we are past cutoff of next day
    const [d, m, y] = date.split('/');
    const entryDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const nextDayDeadline = new Date(entryDate.getTime() + 24 * 60 * 60 * 1000);
    nextDayDeadline.setHours(cutoffHour, cutoffMin, 0, 0);

    if (now > nextDayDeadline && req.user?.role !== 'super_admin' && req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Edit window closed. Cutoff was at ' + cutoffStr });
    }

    const summary = await prisma.dailySummary.upsert({
      where: { date },
      update: { billsCount: parseInt(bills, 10) },
      create: { date, billsCount: parseInt(bills, 10) }
    });

    return res.json({ ok: true, summary });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 5. Retrieve Customer Feedback Questions Configurations
export const getFeedbackQuestions = async (req: Request, res: Response) => {
  try {
    const questions = await prisma.feedbackQuestion.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { displayOrder: 'asc' }
    });
    return res.json({ ok: true, questions });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 6. Record Customer Feedback Response (Supports Staff & Public)
export const saveFeedback = async (req: Request, res: Response) => {
  try {
    const { date, source, area, yourVoice, custName, custMobile, custDob, answers } = req.body;
    if (!date || !area) {
      return res.status(400).json({ ok: false, error: 'Date and Area are required' });
    }

    // Answers maps to q0-q7 fields
    const fData: any = {
      date,
      source: source || 'staff',
      area,
      yourVoice: yourVoice || null,
      custName: custName || null,
      custMobile: custMobile || null,
      custDob: custDob || null,
      status: 'new'
    };

    if (answers && typeof answers === 'object') {
      Object.keys(answers).forEach(qKey => {
        if (qKey.startsWith('q')) {
          fData[qKey] = answers[qKey]?.val || answers[qKey] || '';
          if (answers[qKey]?.other) {
            fData[`${qKey}_other`] = answers[qKey].other;
          }
        }
      });
    }

    const feedback = await prisma.feedback.create({
      data: fData
    });

    // Check if negative feedback to register in telecaller CallQueue
    // If CSI rating (q0) is Poor / Very Poor or q1 Recommend is "No"
    let isNegative = false;
    if (fData.q0 && (fData.q0.toLowerCase().includes('poor') || fData.q0.toLowerCase().includes('average'))) {
      isNegative = true;
    }
    if (fData.q1 && (fData.q1.toLowerCase().includes('no') || fData.q1.toLowerCase().includes('never'))) {
      isNegative = true;
    }

    if (isNegative) {
      await prisma.callQueue.create({
        data: {
          feedbackId: feedback.id,
          callType: 'negative',
          callAttempts: 0,
          isDone: false
        }
      });
    }

    return res.json({ ok: true, feedback });
  } catch (err: any) {
    console.error('Feedback save error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 7. Get Call Queue telecaller list
export const getCallQueue = async (req: Request, res: Response) => {
  try {
    const list = await prisma.callQueue.findMany({
      where: { isDone: false, deletedAt: null },
      include: { feedback: true }
    });
    return res.json({ ok: true, queue: list });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 8. Update Call queue item status
export const updateCallStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, callStatus, callNote, followupDate, escalated } = req.body;

    if (!id || !callStatus) {
      return res.status(400).json({ ok: false, error: 'Missing ID or status' });
    }

    const item = await prisma.callQueue.findUnique({ where: { id } });
    if (!item) {
      return res.status(404).json({ ok: false, error: 'Queue item not found' });
    }

    const isFinished = ['issue_resolved', 'thanked', 'not_satisfied'].includes(callStatus);

    const updated = await prisma.callQueue.update({
      where: { id },
      data: {
        callStatus,
        callNote: callNote || null,
        followupDate: followupDate || null,
        escalated: !!escalated,
        callAttempts: { increment: 1 },
        isDone: isFinished,
        updatedAt: new Date()
      }
    });

    if (isFinished) {
      await prisma.feedback.update({
        where: { id: item.feedbackId },
        data: { status: 'closed', actionTaken: callNote || 'Issue addressed' }
      });
    } else {
      await prisma.feedback.update({
        where: { id: item.feedbackId },
        data: { status: 'reviewed', actionTaken: callNote || 'Contacted guest' }
      });
    }

    return res.json({ ok: true, queueItem: updated });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 9. Divert Management CRUD & timeline logs
export const getDiverts = async (req: Request, res: Response) => {
  try {
    const diverts = await prisma.divert.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { updates: true }
    });
    return res.json({ ok: true, diverts });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

export const createDivert = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sectionId, sectionName, productWanted, qty, priceRange, fabricOccasion, reasonCode, detailedRemarks, comingBack, custName, custMobile, expectedDate } = req.body;
    const userName = req.user?.name || 'CRM Staff';

    if (!sectionId || !productWanted || !reasonCode || !comingBack) {
      return res.status(400).json({ ok: false, error: 'Missing required parameters' });
    }

    const divertId = `DIV-${Date.now()}`;

    const divert = await prisma.divert.create({
      data: {
        divertId,
        date: formatDateString(new Date()),
        sectionId,
        sectionName,
        productWanted,
        qty: qty ? parseInt(qty, 10) : null,
        priceRange: priceRange || null,
        fabricOccasion: fabricOccasion || null,
        reasonCode,
        detailedRemarks: detailedRemarks || null,
        comingBack,
        custName: custName || null,
        custMobile: custMobile || null,
        expectedDate: expectedDate || null,
        raisedBy: userName,
        status: 'open'
      }
    });

    return res.json({ ok: true, divert });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

export const updateDivert = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, status, pmAction, adminRemark, updateNote } = req.body;
    const userId = req.user?.id;
    const userName = req.user?.name || 'Staff';
    const userRole = req.user?.role || 'crm_staff';

    if (!id || !userId) {
      return res.status(400).json({ ok: false, error: 'Divert ID missing' });
    }

    const divert = await prisma.divert.findUnique({ where: { id } });
    if (!divert) {
      return res.status(404).json({ ok: false, error: 'Divert item not found' });
    }

    const updatedData: any = {};
    if (status) updatedData.status = status;
    if (pmAction) updatedData.pmAction = pmAction;
    if (adminRemark) updatedData.adminRemark = adminRemark;
    if (status === 'closed' || status === 'cannot_fulfill') {
      updatedData.closedAt = new Date();
    }

    const updated = await prisma.divert.update({
      where: { id },
      data: updatedData
    });

    // Create log timeline entry
    await prisma.divertUpdate.create({
      data: {
        divertId: id,
        updatedBy: userName,
        userId: userId,
        role: userRole,
        note: updateNote || `Updated status to ${status || divert.status}`,
        newStatus: status || null
      }
    });

    return res.json({ ok: true, divert: updated });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 10. Divert reasons
export const getDivertReasons = async (req: Request, res: Response) => {
  try {
    const reasons = await prisma.divertReason.findMany({
      where: { deletedAt: null }
    });
    return res.json({ ok: true, reasons });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 11. Custom Settings profile Management
export const getSettings = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.settings.findFirst({
      where: { deletedAt: null }
    });
    return res.json({ ok: true, settings });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const { id, companyName, companyLogoUrl, operatingStart, operatingEnd, footfallGraceMin, footfallEditCutoff, derEmail, derWhatsappNote } = req.body;

    const settings = await prisma.settings.upsert({
      where: { id: id || 1 },
      update: {
        companyName,
        companyLogoUrl,
        operatingStart,
        operatingEnd,
        footfallGraceMin: parseInt(footfallGraceMin, 10),
        footfallEditCutoff,
        derEmail,
        derWhatsappNote
      },
      create: {
        companyName,
        companyLogoUrl,
        operatingStart,
        operatingEnd,
        footfallGraceMin: parseInt(footfallGraceMin, 10),
        footfallEditCutoff,
        derEmail,
        derWhatsappNote,
        setupComplete: true
      }
    });

    return res.json({ ok: true, settings });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 12. CRUD sections
export const getSections = async (req: Request, res: Response) => {
  try {
    const list = await prisma.section.findMany({
      where: { isActive: true, deletedAt: null }
    });
    return res.json({ ok: true, sections: list });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 13. Send Day End Report (DER) Email
export const sendDER = async (req: Request, res: Response) => {
  try {
    const todayStr = req.body.date as string || formatDateString(new Date());

    const settings = await prisma.settings.findFirst({ where: { deletedAt: null } });
    if (!settings || !settings.derEmail) {
      return res.status(400).json({ ok: false, error: 'DER Email target is not configured in settings.' });
    }

    const footfalls = await prisma.footfallEntry.findMany({
      where: { date: todayStr, deletedAt: null }
    });

    const summary = await prisma.dailySummary.findUnique({
      where: { date: todayStr }
    });

    const totalFootfall = footfalls.reduce((sum, item) => sum + item.count, 0);
    const totalBills = summary ? summary.billsCount : 0;
    const abv = totalBills > 0 ? Math.round(totalFootfall / totalBills) : 0;

    // Send email using Nodemailer
    const transporter = nodemailer.createTransport({
      host: 'smtp.mailtrap.io', // Placeholder or use process.env settings
      port: 2525,
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || ''
      }
    });

    const mailOptions = {
      from: '"BSC CRM System" <crm@store.com>',
      to: settings.derEmail,
      subject: `Day End CRM Summary - ${todayStr}`,
      html: `
        <h2>Store Performance Report - ${todayStr}</h2>
        <p><strong>Total Visitors (Footfall):</strong> ${totalFootfall}</p>
        <p><strong>Total Bills Count:</strong> ${totalBills}</p>
        <p><strong>Average Bill Value (ABV):</strong> ₹${abv}</p>
        <br/>
        <p>Generated by BSC Textiles CRM.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    return res.json({ ok: true, message: 'DER dispatched successfully to ' + settings.derEmail });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 14. Fetch all active users
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({
      ok: true,
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        sectionsAssigned: u.sectionsAssigned,
        isActive: u.isActive
      }))
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 15. Create a new user with bcrypt password hashing
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, sectionsAssigned } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ ok: false, error: 'Missing required parameters' });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(400).json({ ok: false, error: 'User email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        sectionsAssigned: sectionsAssigned || 'ALL',
        isActive: true
      }
    });

    return res.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        sectionsAssigned: user.sectionsAssigned
      }
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 16. Create a store section
export const createSection = async (req: Request, res: Response) => {
  try {
    const { sectionId, sectionName, type, managerName, managerEmail } = req.body;
    if (!sectionId || !sectionName || !type) {
      return res.status(400).json({ ok: false, error: 'Missing section parameters' });
    }

    const section = await prisma.section.upsert({
      where: { sectionId },
      update: {
        sectionName,
        type,
        managerName: managerName || null,
        managerEmail: managerEmail || null,
        isActive: true,
        deletedAt: null
      },
      create: {
        sectionId,
        sectionName,
        type,
        managerName: managerName || null,
        managerEmail: managerEmail || null
      }
    });

    return res.json({ ok: true, section });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 17. Delete a store section
export const deleteSection = async (req: Request, res: Response) => {
  try {
    const { sectionId } = req.query;
    if (!sectionId) {
      return res.status(400).json({ ok: false, error: 'Missing section ID parameter' });
    }

    await prisma.section.update({
      where: { sectionId: sectionId as string },
      data: { deletedAt: new Date(), isActive: false }
    });

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};
