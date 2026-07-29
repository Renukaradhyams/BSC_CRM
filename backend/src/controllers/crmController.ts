import { Request, Response } from 'express';
import { query, transaction } from '../config/db';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest } from '../middleware/auth';
import mysql from 'mysql2/promise';

// Helper to format date "DD/MM/YYYY" from Date object
export const formatDateString = (dateObj: Date): string => {
  const d = new Date(dateObj.getTime() + 5.5 * 60 * 60 * 1000); // Convert to IST
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

// 1. Get Dashboard Summary
export const getDashboard = async (req: Request, res: Response) => {
  try {
    const todayStr = req.query.date as string || formatDateString(new Date());

    const footfalls = await query('SELECT * FROM FootfallEntry WHERE date = ? AND deleted_at IS NULL', [todayStr]);
    const [summary] = await query('SELECT * FROM DailySummary WHERE date = ? AND deleted_at IS NULL LIMIT 1', [todayStr]);
    const [{ cnt: openDivertsCount }] = await query(
      "SELECT COUNT(*) as cnt FROM Divert WHERE status IN ('open','sourcing','available') AND deleted_at IS NULL"
    );
    const feedbacks = await query('SELECT * FROM Feedback WHERE date = ? AND deleted_at IS NULL', [todayStr]);

    let promoters = 0, detractors = 0, totalFeedbackWithNps = 0, csiTotal = 0;
    feedbacks.forEach((f: any) => {
      if (f.q0) {
        let score = 3;
        if (f.q0.toLowerCase().includes('excellent')) score = 5;
        else if (f.q0.toLowerCase().includes('good')) score = 4;
        else if (f.q0.toLowerCase().includes('average')) score = 3;
        else if (f.q0.toLowerCase().includes('poor')) score = 2;
        else if (f.q0.toLowerCase().includes('very')) score = 1;
        csiTotal += score;
      }
      if (f.q1) {
        totalFeedbackWithNps++;
        const rec = f.q1.toLowerCase();
        if (rec.includes('yes') || rec.includes('definitely')) promoters++;
        else if (rec.includes('no') || rec.includes('not') || rec.includes('maybe')) detractors++;
      }
    });

    const nps = totalFeedbackWithNps > 0 ? Math.round(((promoters - detractors) / totalFeedbackWithNps) * 100) : 0;
    const csi = feedbacks.length > 0 ? Math.round((csiTotal / (feedbacks.length * 5)) * 100) : 100;
    const reviews = feedbacks.filter((f: any) => f.yourVoice).map((f: any) => ({
      name: f.custName || 'Anonymous', area: f.area, text: f.yourVoice
    }));

    return res.json({
      ok: true, today: todayStr,
      metrics: {
        totalFootfall: footfalls.reduce((sum: number, item: any) => sum + item.count, 0),
        totalBills: summary ? summary.billsCount : 0,
        openDiverts: openDivertsCount, feedbacksCollected: feedbacks.length, nps, csi
      },
      footfalls, reviews
    });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

// 2. Get Footfall Slots
export const getFootfall = async (req: Request, res: Response) => {
  try {
    const dateStr = req.query.date as string || formatDateString(new Date());
    const footfalls = await query('SELECT * FROM FootfallEntry WHERE date = ? AND deleted_at IS NULL ORDER BY slotStart ASC', [dateStr]);
    return res.json({ ok: true, footfalls });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

// 3. Save/Update Footfall Slot
export const saveFootfall = async (req: Request, res: Response) => {
  try {
    const { date, slotStart, slotEnd, count, remarks, submittedBy, editedBy } = req.body;
    if (!date || slotStart === undefined || count === undefined) {
      return res.status(400).json({ ok: false, error: 'Missing footfall parameters' });
    }
    await query(
      `INSERT INTO FootfallEntry (date, slotStart, slotEnd, count, remarks, submittedBy, editedBy)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE count = VALUES(count), remarks = VALUES(remarks), editedBy = VALUES(editedBy)`,
      [date, slotStart, slotEnd, count, remarks || null, submittedBy || 'system', editedBy || null]
    );
    return res.json({ ok: true });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

// 4. Save Daily Bills Count
export const saveDailyBills = async (req: Request, res: Response) => {
  try {
    const { date, billsCount } = req.body;
    if (!date || billsCount === undefined) {
      return res.status(400).json({ ok: false, error: 'Missing bills data' });
    }
    await query(
      'INSERT INTO DailySummary (date, billsCount) VALUES (?, ?) ON DUPLICATE KEY UPDATE billsCount = VALUES(billsCount)',
      [date, billsCount]
    );
    return res.json({ ok: true });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

// 5. Get Feedback Questions
export const getFeedbackQuestions = async (req: Request, res: Response) => {
  try {
    const questions = await query(
      'SELECT * FROM FeedbackQuestion WHERE isActive = TRUE AND deleted_at IS NULL ORDER BY displayOrder ASC'
    );
    return res.json({ ok: true, questions });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

// 6. Save Customer Feedback
export const saveFeedback = async (req: Request, res: Response) => {
  try {
    const { date, source, area, yourVoice, custName, custMobile, custDob,
      q0, q0_other, q1, q1_other, q2, q2_other, q3, q3_other,
      q4, q4_other, q5, q5_other, q6, q6_other, q7, q7_other } = req.body;

    if (!date || !source || !area) {
      return res.status(400).json({ ok: false, error: 'Missing required feedback data' });
    }

    const [result]: any = await query(
      `INSERT INTO Feedback (date, source, area, yourVoice, custName, custMobile, custDob,
         q0, q0_other, q1, q1_other, q2, q2_other, q3, q3_other,
         q4, q4_other, q5, q5_other, q6, q6_other, q7, q7_other, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
      [date, source, area, yourVoice || null, custName || null, custMobile || null, custDob || null,
        q0 || null, q0_other || null, q1 || null, q1_other || null, q2 || null, q2_other || null,
        q3 || null, q3_other || null, q4 || null, q4_other || null, q5 || null, q5_other || null,
        q6 || null, q6_other || null, q7 || null, q7_other || null]
    );

    const feedbackId = result.insertId;

    // Auto-add negative feedback to call queue
    const isNegative = (q0 && (q0.toLowerCase().includes('poor') || q0.toLowerCase().includes('very'))) ||
      (q1 && q1.toLowerCase().includes('no'));

    if (isNegative && custMobile) {
      await query(
        `INSERT INTO CallQueue (feedbackId, callType, callAttempts, isDone) VALUES (?, 'negative', 0, FALSE)`,
        [feedbackId]
      );
    }

    return res.json({ ok: true, feedbackId });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

// 7. Get Call Queue
export const getCallQueue = async (req: Request, res: Response) => {
  try {
    const items = await query(
      `SELECT cq.*, f.custName, f.custMobile, f.area, f.date, f.q0, f.q1, f.yourVoice
       FROM CallQueue cq
       JOIN Feedback f ON cq.feedbackId = f.id
       WHERE cq.isDone = FALSE AND cq.deleted_at IS NULL
       ORDER BY cq.created_at DESC`
    );
    return res.json({ ok: true, items });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

// 8. Update Call Queue Status
export const updateCallStatus = async (req: Request, res: Response) => {
  try {
    const { id, callStatus, callNote, isDone, followupDate } = req.body;
    if (!id) return res.status(400).json({ ok: false, error: 'Missing queue item ID' });

    await query(
      `UPDATE CallQueue SET callStatus = ?, callNote = ?, isDone = ?, followupDate = ?,
       callAttempts = callAttempts + 1 WHERE id = ?`,
      [callStatus || null, callNote || null, isDone ? 1 : 0, followupDate || null, id]
    );
    return res.json({ ok: true });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

// 9. Get Diverts
export const getDiverts = async (req: Request, res: Response) => {
  try {
    const { status, sectionId } = req.query;
    let sql = 'SELECT * FROM Divert WHERE deleted_at IS NULL';
    const params: any[] = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (sectionId) { sql += ' AND sectionId = ?'; params.push(sectionId); }
    sql += ' ORDER BY created_at DESC';
    const diverts = await query(sql, params);
    return res.json({ ok: true, diverts });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

// 10. Create Divert
export const createDivert = async (req: Request, res: Response) => {
  try {
    const { date, sectionId, sectionName, productWanted, qty, priceRange, fabricOccasion,
      reasonCode, detailedRemarks, comingBack, custName, custMobile, expectedDate, raisedBy } = req.body;

    const divertId = `DIV-${Date.now()}`;
    await query(
      `INSERT INTO Divert (divertId, date, sectionId, sectionName, productWanted, qty, priceRange,
         fabricOccasion, reasonCode, detailedRemarks, comingBack, custName, custMobile,
         expectedDate, raisedBy, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
      [divertId, date, sectionId, sectionName, productWanted, qty || null, priceRange || null,
        fabricOccasion || null, reasonCode, detailedRemarks || null, comingBack,
        custName || null, custMobile || null, expectedDate || null, raisedBy]
    );
    return res.json({ ok: true, divertId });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

// 11. Update Divert
export const updateDivert = async (req: Request, res: Response) => {
  try {
    const { id, status, pmAction, adminRemark } = req.body;
    if (!id) return res.status(400).json({ ok: false, error: 'Missing divert ID' });

    const closedAt = (status === 'closed' || status === 'cannot_fulfill') ? new Date() : null;
    await query(
      'UPDATE Divert SET status = ?, pmAction = ?, adminRemark = ?, closedAt = ? WHERE id = ?',
      [status, pmAction || null, adminRemark || null, closedAt, id]
    );
    return res.json({ ok: true });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

// 12. Get Divert Reasons
export const getDivertReasons = async (req: Request, res: Response) => {
  try {
    const reasons = await query('SELECT * FROM DivertReason WHERE deleted_at IS NULL ORDER BY reasonId');
    return res.json({ ok: true, reasons });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

// 13. Get Settings
export const getSettings = async (req: Request, res: Response) => {
  try {
    const [settings] = await query('SELECT * FROM Settings WHERE deleted_at IS NULL LIMIT 1');
    return res.json({ ok: true, settings: settings || null });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

// 14. Update Settings
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const { companyName, companyLogoUrl, operatingStart, operatingEnd,
      footfallGraceMin, footfallEditCutoff, derEmail } = req.body;

    const [existing] = await query('SELECT id FROM Settings WHERE deleted_at IS NULL LIMIT 1');
    if (existing) {
      await query(
        `UPDATE Settings SET companyName=?, companyLogoUrl=?, operatingStart=?, operatingEnd=?,
         footfallGraceMin=?, footfallEditCutoff=?, derEmail=? WHERE id=?`,
        [companyName, companyLogoUrl || null, operatingStart, operatingEnd,
          footfallGraceMin, footfallEditCutoff, derEmail || null, existing.id]
      );
    } else {
      await query(
        `INSERT INTO Settings (companyName, companyLogoUrl, operatingStart, operatingEnd,
           footfallGraceMin, footfallEditCutoff, derEmail, setupComplete)
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [companyName, companyLogoUrl || null, operatingStart, operatingEnd,
          footfallGraceMin, footfallEditCutoff, derEmail || null]
      );
    }
    return res.json({ ok: true });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

// 15. Get Sections
export const getSections = async (req: Request, res: Response) => {
  try {
    const sections = await query('SELECT * FROM Section WHERE deleted_at IS NULL ORDER BY sectionId');
    return res.json({ ok: true, sections });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

// 16. Create Section
export const createSection = async (req: Request, res: Response) => {
  try {
    const { sectionId, sectionName, type, managerName, managerEmail } = req.body;
    await query(
      'INSERT INTO Section (sectionId, sectionName, type, managerName, managerEmail) VALUES (?, ?, ?, ?, ?)',
      [sectionId, sectionName, type, managerName || null, managerEmail || null]
    );
    return res.json({ ok: true });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

// 17. Delete Section
export const deleteSection = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    await query('UPDATE Section SET deleted_at = NOW() WHERE id = ?', [id]);
    return res.json({ ok: true });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

// 18. Send Day End Report Email
export const sendDER = async (req: Request, res: Response) => {
  try {
    const todayStr = formatDateString(new Date());
    const [settings] = await query('SELECT * FROM Settings WHERE deleted_at IS NULL LIMIT 1');
    if (!settings || !settings.derEmail) {
      return res.status(400).json({ ok: false, error: 'DER Email target is not configured in settings.' });
    }

    const footfalls = await query('SELECT count FROM FootfallEntry WHERE date = ? AND deleted_at IS NULL', [todayStr]);
    const [summary] = await query('SELECT billsCount FROM DailySummary WHERE date = ? LIMIT 1', [todayStr]);
    const totalFootfall = footfalls.reduce((sum: number, item: any) => sum + item.count, 0);
    const totalBills = summary ? summary.billsCount : 0;
    const abv = totalBills > 0 ? Math.round(totalFootfall / totalBills) : 0;

    const transporter = nodemailer.createTransport({
      host: 'smtp.mailtrap.io',
      port: 2525,
      auth: { user: process.env.EMAIL_USER || '', pass: process.env.EMAIL_PASS || '' }
    });

    await transporter.sendMail({
      from: '"BSC CRM System" <crm@store.com>',
      to: settings.derEmail,
      subject: `Day End CRM Summary - ${todayStr}`,
      html: `<h2>Store Performance Report - ${todayStr}</h2>
             <p><strong>Total Visitors:</strong> ${totalFootfall}</p>
             <p><strong>Total Bills:</strong> ${totalBills}</p>
             <p><strong>ABV:</strong> ₹${abv}</p>`
    });

    return res.json({ ok: true, message: 'DER dispatched to ' + settings.derEmail });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

// 19. Get Users
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await query(
      'SELECT id, name, email, role, sectionsAssigned, isActive FROM User WHERE deleted_at IS NULL ORDER BY created_at DESC'
    );
    return res.json({ ok: true, users });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

// 20. Create User
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, sectionsAssigned } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ ok: false, error: 'All user fields are required' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await query(
      'INSERT INTO User (name, email, password, role, sectionsAssigned, isActive) VALUES (?, ?, ?, ?, ?, TRUE)',
      [name, email, hashedPassword, role, sectionsAssigned || 'ALL']
    );
    return res.json({ ok: true });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};
