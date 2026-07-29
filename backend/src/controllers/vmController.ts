import { Request, Response } from 'express';
import prisma from '../config/db';

// Get VM team user dashboard summary
export const getVmDashboard = async (req: Request, res: Response) => {
  try {
    const name = req.query.name as string;
    const todayStr = new Date().toISOString().split('T')[0];

    if (!name) {
      return res.status(400).json({ ok: false, error: 'Name is required' });
    }

    // Check if overall submitted today
    const overallSub = await prisma.vMSubmission.findFirst({
      where: { date: todayStr, type: 'overall', submittedBy: name }
    });

    // Check this week's floor checklist status (week range)
    const floorStatus = await Promise.all(
      ["Ground Floor", "1st Floor", "2nd Floor", "3rd Floor", "4th Floor"].map(async (floor) => {
        const sub = await prisma.vMSubmission.findFirst({
          where: { type: 'floor', floor, deletedAt: null },
          orderBy: { date: 'desc' }
        });
        return {
          floor,
          done: !!sub,
          score: sub ? parseFloat(sub.score.toString()) : 0,
          date: sub ? sub.date : null
        };
      })
    );

    return res.json({
      ok: true,
      date: todayStr,
      overall_done: !!overallSub,
      overall_score: overallSub ? parseFloat(overallSub.score.toString()) : 0,
      floor_status: floorStatus
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// Get Admin VM dashboard parameters
export const getAdminDashboard = async (req: Request, res: Response) => {
  try {
    const dateStr = req.query.date as string || new Date().toISOString().split('T')[0];

    const overallSub = await prisma.vMSubmission.findFirst({
      where: { date: dateStr, type: 'overall' }
    });

    const floorSubmissions = await prisma.vMSubmission.findMany({
      where: { date: dateStr, type: 'floor' }
    });

    // Calculate Aspect Scores from entries
    const aspectScores: any[] = [];
    if (overallSub) {
      const entries = await prisma.vMSubmissionEntry.findMany({
        where: { submissionId: overallSub.id }
      });
      // Group by aspect and calculate average score
      const aspectGroups: { [key: string]: { sum: number, count: number } } = {};
      entries.forEach((e: any) => {
        // Mock aspect grouping from points table
        const aspect = "Standard Aspect"; // Or fetch point aspect relations
        if (!aspectGroups[aspect]) aspectGroups[aspect] = { sum: 0, count: 0 };
        const scoreVal = e.value === 'yes' ? 5 : e.value === 'no' ? 1 : 3;
        aspectGroups[aspect].sum += scoreVal;
        aspectGroups[aspect].count++;
      });
      Object.keys(aspectGroups).forEach(asp => {
        aspectScores.push({
          aspect: asp,
          score: aspectGroups[asp].sum / aspectGroups[asp].count
        });
      });
    }

    const floorStatus = await Promise.all(
      ["Ground Floor", "1st Floor", "2nd Floor", "3rd Floor", "4th Floor"].map(async (floor) => {
        const sub = floorSubmissions.find((s: any) => s.floor === floor);
        return {
          floor,
          done: !!sub,
          score: sub ? parseFloat(sub.score.toString()) : 0,
          date: sub ? sub.date : null,
          submitted: sub ? 5 : 0,
          total: 5
        };
      })
    );

    return res.json({
      ok: true,
      date: dateStr,
      week: "Current Week",
      overall_done: !!overallSub,
      overall_score: overallSub ? parseFloat(overallSub.score.toString()) : 0,
      submitted_by: overallSub ? [overallSub.submittedBy] : [],
      aspect_scores: aspectScores,
      floor_status: floorStatus
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// Retrieve VM Checklist Points
export const getChecklist = async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string || 'overall';
    const points = await prisma.vMChecklistPoint.findMany({
      where: { type, isActive: true, deletedAt: null }
    });
    return res.json({
      ok: true,
      points: points.map((p: any) => ({
        point_no: p.pointNo,
        aspect: p.aspect,
        point: p.point,
        frequency: p.frequency
      }))
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// Retrieve user submissions already sent today
export const getTodaySubmission = async (req: Request, res: Response) => {
  try {
    const { submitted_by, type, floor } = req.query;
    const todayStr = new Date().toISOString().split('T')[0];

    const submission = await prisma.vMSubmission.findFirst({
      where: {
        date: todayStr,
        type: type as string,
        floor: floor ? (floor as string) : null,
        submittedBy: submitted_by as string
      },
      include: { entries: true }
    });

    const answered: { [key: string]: any } = {};
    if (submission) {
      submission.entries.forEach((e: any) => {
        answered[e.pointNo] = {
          value: e.value,
          remarks: e.remarks,
          photo_link: e.photoLink
        };
      });
    }

    return res.json({ ok: true, answered });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// Submit checklist responses
export const submitChecklist = async (req: Request, res: Response) => {
  try {
    const { action, submitted_by, total_daily, data, floor } = req.body;
    const type = action === 'submit_floor' ? 'floor' : 'overall';
    const todayStr = new Date().toISOString().split('T')[0];

    const entries = JSON.parse(data);
    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({ ok: false, error: 'Invalid submission data format' });
    }

    // Calculate score (average based on values: yes = 5, no = 1, na = excluded)
    let sum = 0, count = 0;
    entries.forEach((e: any) => {
      if (e.value === 'yes') {
        sum += 5;
        count++;
      } else if (e.value === 'no') {
        sum += 1;
        count++;
      }
    });
    const score = count > 0 ? sum / count : 5.0;

    await prisma.$transaction(async (tx: any) => {
      const sub = await tx.vMSubmission.create({
        data: {
          date: todayStr,
          type,
          floor: floor || null,
          submittedBy: submitted_by,
          score
        }
      });

      for (const entry of entries) {
        await tx.vMSubmissionEntry.create({
          data: {
            submissionId: sub.id,
            pointNo: parseInt(entry.point_no, 10),
            value: entry.value,
            remarks: entry.remarks || null,
            photoLink: entry.photo_link || null
          }
        });
      }
    });

    return res.json({ ok: true, score });
  } catch (err: any) {
    console.error('VM Checklist save error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// Retrieve Admin VM historical compliance reports
export const getAdminReports = async (req: Request, res: Response) => {
  try {
    // Return sample reporting aggregates for trends chart mapping
    const weekly_compliance = [
      { week: "Week 30", days_filled: 6 },
      { week: "Week 29", days_filled: 7 },
      { week: "Week 28", days_filled: 5 }
    ];

    const aspect_report = [
      { aspect: "Mannequin Styling", score: 4.2 },
      { aspect: "Display Alignment", score: 4.8 },
      { aspect: "Ironing & Presentation", score: 3.9 }
    ];

    return res.json({
      ok: true,
      weekly_compliance,
      aspect_report
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// Get VM Overall score history list
export const getHistory = async (req: Request, res: Response) => {
  try {
    const list = await prisma.vMSubmission.findMany({
      where: { type: 'overall', deletedAt: null },
      orderBy: { date: 'desc' },
      take: 20
    });

    return res.json({
      ok: true,
      history: list.map((item: any) => ({
        date: item.date,
        score: parseFloat(item.score.toString())
      }))
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// Get single submission detailed lists
export const getSubmissionDetail = async (req: Request, res: Response) => {
  try {
    const { type, date, floor } = req.query;

    const submission = await prisma.vMSubmission.findFirst({
      where: {
        date: date as string,
        type: type as string,
        floor: floor ? (floor as string) : null,
        deletedAt: null
      },
      include: { entries: true }
    });

    if (!submission) {
      return res.status(404).json({ ok: false, error: 'Submission not found' });
    }

    return res.json({
      ok: true,
      entries: submission.entries.map((e: any) => ({
        point_no: e.pointNo,
        aspect: "Checklist aspect",
        point: "Point description",
        value: e.value,
        remarks: e.remarks,
        photo_link: e.photoLink
      }))
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// VM Checklist Points configuration panel CRUD
export const getChecklistMaster = async (req: Request, res: Response) => {
  try {
    const list = await prisma.vMChecklistPoint.findMany({
      where: { deletedAt: null }
    });
    return res.json({ ok: true, points: list });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

export const addChecklistPoint = async (req: Request, res: Response) => {
  try {
    const { type, aspect, point, frequency } = req.query;

    const lastPoint = await prisma.vMChecklistPoint.findFirst({
      orderBy: { pointNo: 'desc' }
    });
    const nextNo = lastPoint ? lastPoint.pointNo + 1 : 1;

    const newPt = await prisma.vMChecklistPoint.create({
      data: {
        pointNo: nextNo,
        aspect: aspect as string,
        point: point as string,
        type: type as string,
        frequency: frequency as string
      }
    });

    return res.json({ ok: true, point: newPt });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

export const updateChecklistPoint = async (req: Request, res: Response) => {
  try {
    const { point_no, field, value } = req.query;
    const pNo = parseInt(point_no as string, 10);

    const updateData: any = {};
    if (field === 'POINT') updateData.point = value as string;
    if (field === 'ASPECT') updateData.aspect = value as string;
    if (field === 'TYPE') updateData.type = value as string;
    if (field === 'FREQUENCY') updateData.frequency = value as string;

    await prisma.vMChecklistPoint.update({
      where: { pointNo: pNo },
      data: updateData
    });

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

export const deleteChecklistPoint = async (req: Request, res: Response) => {
  try {
    const { point_no } = req.query;
    const pNo = parseInt(point_no as string, 10);

    await prisma.vMChecklistPoint.update({
      where: { pointNo: pNo },
      data: { deletedAt: new Date() }
    });

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};
