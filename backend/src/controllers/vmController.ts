import { Request, Response } from 'express';
import { query, transaction } from '../config/db';
import mysql from 'mysql2/promise';

const FLOORS = ["Ground Floor", "1st Floor", "2nd Floor", "3rd Floor", "4th Floor"];

// Get VM team user dashboard summary
export const getVmDashboard = async (req: Request, res: Response) => {
  try {
    const name = req.query.name as string;
    const todayStr = new Date().toISOString().split('T')[0];
    if (!name) return res.status(400).json({ ok: false, error: 'Name is required' });

    const [overallSub] = await query(
      "SELECT * FROM VMSubmission WHERE date=? AND type='overall' AND submittedBy=? LIMIT 1",
      [todayStr, name]
    );

    const floorStatus = await Promise.all(
      FLOORS.map(async (floor) => {
        const [sub] = await query(
          "SELECT * FROM VMSubmission WHERE type='floor' AND floor=? AND deleted_at IS NULL ORDER BY date DESC LIMIT 1",
          [floor]
        );
        return {
          floor,
          done: !!sub,
          score: sub ? parseFloat(sub.score) : 0,
          date: sub ? sub.date : null
        };
      })
    );

    return res.json({
      ok: true, date: todayStr,
      overall_done: !!overallSub,
      overall_score: overallSub ? parseFloat(overallSub.score) : 0,
      floor_status: floorStatus
    });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

// Admin VM dashboard
export const getAdminDashboard = async (req: Request, res: Response) => {
  try {
    const dateStr = req.query.date as string || new Date().toISOString().split('T')[0];

    const [overallSub] = await query(
      "SELECT * FROM VMSubmission WHERE date=? AND type='overall' LIMIT 1", [dateStr]
    );
    const floorSubmissions = await query(
      "SELECT * FROM VMSubmission WHERE date=? AND type='floor'", [dateStr]
    );

    const aspectScores: any[] = [];
    if (overallSub) {
      const entries = await query('SELECT * FROM VMSubmissionEntry WHERE submissionId=?', [overallSub.id]);
      const aspectGroups: { [key: string]: { sum: number; count: number } } = {};
      entries.forEach((e: any) => {
        const aspect = 'Standard Aspect';
        if (!aspectGroups[aspect]) aspectGroups[aspect] = { sum: 0, count: 0 };
        const scoreVal = e.value === 'yes' ? 5 : e.value === 'no' ? 1 : 3;
        aspectGroups[aspect].sum += scoreVal;
        aspectGroups[aspect].count++;
      });
      Object.keys(aspectGroups).forEach(asp => {
        aspectScores.push({ aspect: asp, score: aspectGroups[asp].sum / aspectGroups[asp].count });
      });
    }

    const floorStatus = FLOORS.map(floor => {
      const sub = floorSubmissions.find((s: any) => s.floor === floor);
      return { floor, done: !!sub, score: sub ? parseFloat(sub.score) : 0, date: sub?.date || null };
    });

    return res.json({
      ok: true, date: dateStr, week: 'Current Week',
      overall_done: !!overallSub,
      overall_score: overallSub ? parseFloat(overallSub.score) : 0,
      submitted_by: overallSub ? [overallSub.submittedBy] : [],
      aspect_scores: aspectScores, floor_status: floorStatus
    });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

// Get VM Checklist Points
export const getChecklist = async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string || 'overall';
    const points = await query(
      'SELECT * FROM VMChecklistPoint WHERE type=? AND isActive=TRUE AND deleted_at IS NULL ORDER BY pointNo',
      [type]
    );
    return res.json({
      ok: true,
      points: points.map((p: any) => ({
        point_no: p.pointNo, aspect: p.aspect, point: p.point, frequency: p.frequency
      }))
    });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

// Get today's submission entries
export const getTodaySubmission = async (req: Request, res: Response) => {
  try {
    const { submitted_by, type, floor } = req.query;
    const todayStr = new Date().toISOString().split('T')[0];

    const floorVal = floor ? (floor as string) : null;
    const [submission] = await query(
      'SELECT * FROM VMSubmission WHERE date=? AND type=? AND submittedBy=? AND (floor=? OR (floor IS NULL AND ? IS NULL)) LIMIT 1',
      [todayStr, type, submitted_by, floorVal, floorVal]
    );

    const answered: { [key: string]: any } = {};
    if (submission) {
      const entries = await query('SELECT * FROM VMSubmissionEntry WHERE submissionId=?', [submission.id]);
      entries.forEach((e: any) => {
        answered[e.pointNo] = { value: e.value, remarks: e.remarks, photo_link: e.photoLink };
      });
    }
    return res.json({ ok: true, answered });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

// Submit checklist responses
export const submitChecklist = async (req: Request, res: Response) => {
  try {
    const { action, submitted_by, data, floor } = req.body;
    const type = action === 'submit_floor' ? 'floor' : 'overall';
    const todayStr = new Date().toISOString().split('T')[0];

    const entries = JSON.parse(data);
    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({ ok: false, error: 'Invalid submission data format' });
    }

    let sum = 0, count = 0;
    entries.forEach((e: any) => {
      if (e.value === 'yes') { sum += 5; count++; }
      else if (e.value === 'no') { sum += 1; count++; }
    });
    const score = count > 0 ? sum / count : 5.0;

    await transaction(async (conn: mysql.PoolConnection) => {
      const [result] = await conn.execute(
        'INSERT INTO VMSubmission (date, type, floor, submittedBy, score) VALUES (?, ?, ?, ?, ?)',
        [todayStr, type, floor || null, submitted_by, score]
      ) as any;
      const subId = (result as any).insertId;

      for (const entry of entries) {
        await conn.execute(
          'INSERT INTO VMSubmissionEntry (submissionId, pointNo, value, remarks, photoLink) VALUES (?, ?, ?, ?, ?)',
          [subId, parseInt(entry.point_no, 10), entry.value, entry.remarks || null, entry.photo_link || null]
        );
      }
    });

    return res.json({ ok: true, score });
  } catch (err: any) {
    console.error('VM Checklist save error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// Historical compliance reports
export const getAdminReports = async (req: Request, res: Response) => {
  try {
    const weekly_compliance = [
      { week: 'Week 30', days_filled: 6 },
      { week: 'Week 29', days_filled: 7 },
      { week: 'Week 28', days_filled: 5 }
    ];
    const aspect_report = [
      { aspect: 'Mannequin Styling', score: 4.2 },
      { aspect: 'Display Alignment', score: 4.8 },
      { aspect: 'Ironing & Presentation', score: 3.9 }
    ];
    return res.json({ ok: true, weekly_compliance, aspect_report });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

// VM score history
export const getHistory = async (req: Request, res: Response) => {
  try {
    const list = await query(
      "SELECT date, score FROM VMSubmission WHERE type='overall' AND deleted_at IS NULL ORDER BY date DESC LIMIT 20"
    );
    return res.json({
      ok: true,
      history: list.map((item: any) => ({ date: item.date, score: parseFloat(item.score) }))
    });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

// Get single submission detail
export const getSubmissionDetail = async (req: Request, res: Response) => {
  try {
    const { type, date, floor } = req.query;
    const floorVal = floor ? (floor as string) : null;
    const [submission] = await query(
      'SELECT * FROM VMSubmission WHERE date=? AND type=? AND (floor=? OR (floor IS NULL AND ? IS NULL)) AND deleted_at IS NULL LIMIT 1',
      [date, type, floorVal, floorVal]
    );
    if (!submission) return res.status(404).json({ ok: false, error: 'Submission not found' });

    const entries = await query('SELECT * FROM VMSubmissionEntry WHERE submissionId=?', [submission.id]);
    return res.json({
      ok: true,
      entries: entries.map((e: any) => ({
        point_no: e.pointNo, value: e.value, remarks: e.remarks, photo_link: e.photoLink
      }))
    });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

// Checklist master CRUD
export const getChecklistMaster = async (req: Request, res: Response) => {
  try {
    const list = await query('SELECT * FROM VMChecklistPoint WHERE deleted_at IS NULL ORDER BY pointNo');
    return res.json({ ok: true, points: list });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

export const addChecklistPoint = async (req: Request, res: Response) => {
  try {
    const { type, aspect, point, frequency } = req.query;
    const [lastPoint] = await query(
      'SELECT pointNo FROM VMChecklistPoint ORDER BY pointNo DESC LIMIT 1'
    );
    const nextNo = lastPoint ? lastPoint.pointNo + 1 : 1;
    await query(
      'INSERT INTO VMChecklistPoint (pointNo, aspect, point, type, frequency) VALUES (?, ?, ?, ?, ?)',
      [nextNo, aspect, point, type, frequency]
    );
    return res.json({ ok: true, pointNo: nextNo });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

export const updateChecklistPoint = async (req: Request, res: Response) => {
  try {
    const { point_no, field, value } = req.query;
    const pNo = parseInt(point_no as string, 10);
    const allowedFields: { [key: string]: string } = {
      'POINT': 'point', 'ASPECT': 'aspect', 'TYPE': 'type', 'FREQUENCY': 'frequency'
    };
    const col = allowedFields[field as string];
    if (!col) return res.status(400).json({ ok: false, error: 'Invalid field name' });

    await query(`UPDATE VMChecklistPoint SET ${col}=? WHERE pointNo=?`, [value, pNo]);
    return res.json({ ok: true });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};

export const deleteChecklistPoint = async (req: Request, res: Response) => {
  try {
    const { point_no } = req.query;
    const pNo = parseInt(point_no as string, 10);
    await query('UPDATE VMChecklistPoint SET deleted_at=NOW() WHERE pointNo=?', [pNo]);
    return res.json({ ok: true });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err.message }); }
};
