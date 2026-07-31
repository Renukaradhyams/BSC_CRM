import { Request, Response } from 'express';
import { query } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { formatDateString } from './crmController';

// 1. Get Employee Roster
export const getEmployees = async (req: Request, res: Response) => {
  try {
    const employees = await query(
      'SELECT * FROM Employee WHERE deleted_at IS NULL ORDER BY empNo ASC'
    );
    return res.json({ ok: true, employees });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 2. Add New Employee
export const createEmployee = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { empNo, name, department, section, designation, phone, supervisorCode, designationLevel } = req.body;
    if (!empNo || !name || !department || !section || !designation) {
      return res.status(400).json({ ok: false, error: 'Employee No, Name, Department, Section, and Designation are required.' });
    }

    const [existing] = await query('SELECT id FROM Employee WHERE empNo = ? AND deleted_at IS NULL', [empNo]);
    if (existing) {
      return res.status(400).json({ ok: false, error: `Employee No '${empNo}' is already registered.` });
    }

    await query(
      `INSERT INTO Employee (empNo, name, department, section, designation, phone, supervisorCode, designationLevel)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [empNo, name, department, section, designation, phone || null, supervisorCode || null, designationLevel || 'salesman']
    );

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 2c. Update Employee Details
export const updateEmployee = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { empNo, name, department, section, designation, phone, supervisorCode, designationLevel } = req.body;
    if (!empNo || !name) {
      return res.status(400).json({ ok: false, error: 'Employee No and Name are required.' });
    }

    await query(
      `UPDATE Employee SET empNo=?, name=?, department=?, section=?, designation=?, phone=?, supervisorCode=?, designationLevel=?
       WHERE id=? AND deleted_at IS NULL`,
      [empNo, name, department || 'Sales', section || 'Sarees Division', designation || 'Sales Executive', phone || null, supervisorCode || null, designationLevel || 'salesman', id]
    );

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 2b. Bulk Upload Employees (CSV Import)
export const bulkUploadEmployees = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { employees } = req.body;
    if (!Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ ok: false, error: 'No employee records provided for bulk upload.' });
    }

    let inserted = 0;
    let skipped = 0;

    for (const emp of employees) {
      const { empNo, name, department, section, designation, phone, supervisorCode } = emp;
      if (!empNo || !name) {
        skipped++;
        continue;
      }

      try {
        await query(
          `INSERT INTO Employee (empNo, name, department, section, designation, phone, supervisorCode)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
            name = VALUES(name),
            department = VALUES(department),
            section = VALUES(section),
            designation = VALUES(designation),
            phone = VALUES(phone),
            supervisorCode = VALUES(supervisorCode),
            isActive = TRUE,
            deleted_at = NULL`,
          [empNo, name, department || 'General', section || 'Main Floor', designation || 'Staff', phone || null, supervisorCode || null]
        );
        inserted++;
      } catch (err) {
        skipped++;
      }
    }

    return res.json({ ok: true, inserted, skipped, total: employees.length });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 3. Delete Employee
export const deleteEmployee = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await query('UPDATE Employee SET deleted_at = NOW(), isActive = FALSE WHERE id = ?', [id]);
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 4. Get Daily Attendance Register
export const getAttendance = async (req: Request, res: Response) => {
  try {
    const dateStr = (req.query.date as string) || formatDateString(new Date());

    // Join Employee roster with Attendance table for given date
    const records = await query(
      `SELECT 
        e.id as empId,
        e.empNo,
        e.name as userName,
        e.department,
        e.section,
        e.designation as userRole,
        e.supervisorCode,
        e.designationLevel,
        COALESCE(a.id, 0) as id,
        COALESCE(a.date, ?) as date,
        COALESCE(a.status, 'present') as status,
        a.checkIn,
        a.checkOut,
        COALESCE(a.workedMinutes, 0) as workedMinutes,
        a.remarks
       FROM Employee e
       LEFT JOIN Attendance a ON e.id = a.empId AND a.date = ? AND a.deleted_at IS NULL
       WHERE e.deleted_at IS NULL AND e.isActive = TRUE
       ORDER BY e.empNo ASC`,
      [dateStr, dateStr]
    );

    return res.json({ ok: true, date: dateStr, records });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 5. Save/Update Employee Attendance Record
export const upsertAttendance = async (req: Request, res: Response) => {
  try {
    const { empId, date, status, checkIn, checkOut, workedMinutes, remarks, markedByName } = req.body;
    if (!empId || !date || !status) {
      return res.status(400).json({ ok: false, error: 'empId, date, and status are required' });
    }

    const markedBy = markedByName || (req as AuthenticatedRequest).user?.name || 'Manager';

    await query(
      `INSERT INTO Attendance (empId, date, status, checkIn, checkOut, workedMinutes, remarks, markedBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
        status = VALUES(status),
        checkIn = VALUES(checkIn),
        checkOut = VALUES(checkOut),
        workedMinutes = VALUES(workedMinutes),
        remarks = VALUES(remarks),
        markedBy = VALUES(markedBy)`,
      [empId, date, status, checkIn || null, checkOut || null, workedMinutes || 0, remarks || null, markedBy]
    );

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// ==================== SECTION SUPERVISOR MANAGEMENT ====================

// 6. Get All Section Supervisors
export const getSupervisors = async (req: Request, res: Response) => {
  try {
    const supervisors = await query(
      'SELECT * FROM SectionSupervisor WHERE deleted_at IS NULL ORDER BY sectionCode ASC'
    );
    return res.json({ ok: true, supervisors });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 7. Create Section Supervisor
export const createSupervisor = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, sectionCode, sectionName, floor, pin } = req.body;
    if (!name || !sectionCode || !sectionName || !pin) {
      return res.status(400).json({ ok: false, error: 'Name, sectionCode, sectionName, and PIN are required.' });
    }

    const [existing] = await query('SELECT id FROM SectionSupervisor WHERE sectionCode = ? AND deleted_at IS NULL', [sectionCode]);
    if (existing) {
      return res.status(400).json({ ok: false, error: `Section code '${sectionCode}' already exists.` });
    }

    await query(
      `INSERT INTO SectionSupervisor (name, sectionCode, sectionName, floor, pin) VALUES (?, ?, ?, ?, ?)`,
      [name, sectionCode, sectionName, floor || 'Ground Floor', pin]
    );

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 8. Update Section Supervisor
export const updateSupervisor = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, sectionCode, sectionName, floor, pin } = req.body;

    await query(
      `UPDATE SectionSupervisor SET name=?, sectionCode=?, sectionName=?, floor=?, pin=? WHERE id=? AND deleted_at IS NULL`,
      [name, sectionCode, sectionName, floor || 'Ground Floor', pin, id]
    );

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 9. Delete Section Supervisor
export const deleteSupervisor = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await query('UPDATE SectionSupervisor SET deleted_at = NOW(), isActive = FALSE WHERE id = ?', [id]);
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 10. Section Supervisor PIN Login
export const supervisorLogin = async (req: Request, res: Response) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ ok: false, error: 'PIN is required.' });
    }

    const [supervisor] = await query(
      'SELECT * FROM SectionSupervisor WHERE pin = ? AND isActive = TRUE AND deleted_at IS NULL',
      [pin]
    );

    if (!supervisor) {
      return res.status(401).json({ ok: false, error: 'Invalid PIN. Please check with your manager.' });
    }

    return res.json({ 
      ok: true, 
      supervisor: {
        id: supervisor.id,
        name: supervisor.name,
        sectionCode: supervisor.sectionCode,
        sectionName: supervisor.sectionName,
        floor: supervisor.floor
      }
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// 11. Get Team for a Section Supervisor
export const getSupervisorTeam = async (req: Request, res: Response) => {
  try {
    const { sectionCode, date } = req.query as { sectionCode: string; date: string };
    
    if (!sectionCode) {
      return res.status(400).json({ ok: false, error: 'sectionCode is required.' });
    }

    const dateStr = date || formatDateString(new Date());

    const records = await query(
      `SELECT 
        e.id as empId,
        e.empNo,
        e.name as userName,
        e.department,
        e.section,
        e.designation as userRole,
        e.supervisorCode,
        e.designationLevel,
        COALESCE(a.id, 0) as id,
        COALESCE(a.date, ?) as date,
        COALESCE(a.status, 'present') as status,
        a.checkIn,
        a.checkOut,
        COALESCE(a.workedMinutes, 0) as workedMinutes,
        a.remarks
       FROM Employee e
       LEFT JOIN Attendance a ON e.id = a.empId AND a.date = ? AND a.deleted_at IS NULL
       WHERE e.deleted_at IS NULL AND e.isActive = TRUE AND e.supervisorCode = ?
       ORDER BY e.empNo ASC`,
      [dateStr, dateStr, sectionCode]
    );

    return res.json({ ok: true, date: dateStr, sectionCode, records });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};
