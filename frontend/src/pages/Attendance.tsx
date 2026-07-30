import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';

interface Employee {
  id: number;
  empNo: string;
  name: string;
  department: string;
  section: string;
  designation: string;
  phone: string | null;
  isActive: boolean;
}

interface AttendanceRecord {
  empId: number;
  empNo: string;
  userName: string;
  department: string;
  section: string;
  userRole: string;
  id: number;
  date: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  workedMinutes: number;
  remarks: string | null;
}

const formatDateForApi = (d: Date): string => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const formatDateInput = (d: Date): string => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
};

const inputToApi = (inputVal: string): string => {
  if (!inputVal) return '';
  const [yyyy, mm, dd] = inputVal.split('-');
  return `${dd}/${mm}/${yyyy}`;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  present:  { label: 'Present',  color: '#059669', bg: '#D1FAE5' },
  absent:   { label: 'Absent',   color: '#DC2626', bg: '#FEE2E2' },
  late:     { label: 'Late',     color: '#D97706', bg: '#FEF3C7' },
  half_day: { label: 'Half Day', color: '#7C3AED', bg: '#EDE9FE' },
  leave:    { label: 'On Leave', color: '#2563EB', bg: '#EFF6FF' },
};

export default function Attendance() {
  const today = new Date();
  const [activeTab, setActiveTab] = useState<'register' | 'employees'>('register');

  // Register State
  const [selectedDateInput, setSelectedDateInput] = useState<string>(formatDateInput(today));
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingEmpId, setSavingEmpId] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Employee Form State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empNo, setEmpNo] = useState<string>('');
  const [empName, setEmpName] = useState<string>('');
  const [department, setDepartment] = useState<string>('Sales');
  const [section, setSection] = useState<string>('Sarees Division');
  const [designation, setDesignation] = useState<string>('Sales Executive');
  const [phone, setPhone] = useState<string>('');
  const [submittingEmp, setSubmittingEmp] = useState<boolean>(false);

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const apiDate = inputToApi(selectedDateInput);
      const res = await api.get('/api/attendance', { params: { date: apiDate } });
      if (res.data?.ok) {
        setRecords(res.data.records || []);
      } else {
        setError(res.data?.error || 'Failed to load attendance records.');
      }
    } catch {
      setError('Could not connect to attendance server.');
    } finally {
      setLoading(false);
    }
  }, [selectedDateInput]);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await api.get('/api/attendance/employees');
      if (res.data?.ok) {
        setEmployees(res.data.employees || []);
      }
    } catch {
      console.error('Failed to load employee list.');
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  useEffect(() => {
    if (activeTab === 'employees') {
      fetchEmployees();
    }
  }, [activeTab, fetchEmployees]);

  // Calculate stats
  const stats = {
    total: records.length,
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
    late: records.filter(r => r.status === 'late').length,
    leave: records.filter(r => r.status === 'leave').length,
  };

  const handleRowStatusChange = (empId: number, field: string, val: any) => {
    setRecords(prev => prev.map(r => {
      if (r.empId === empId) {
        return { ...r, [field]: val };
      }
      return r;
    }));
  };

  const handleSaveRow = async (record: AttendanceRecord) => {
    try {
      setSavingEmpId(record.empId);
      setError('');
      setSuccess('');
      const apiDate = inputToApi(selectedDateInput);

      // Compute worked minutes if checkIn and checkOut are provided
      let workedMin = record.workedMinutes || 0;
      if (record.checkIn && record.checkOut) {
        const [inH, inM] = record.checkIn.split(':').map(Number);
        const [outH, outM] = record.checkOut.split(':').map(Number);
        if (!isNaN(inH) && !isNaN(outH)) {
          workedMin = (outH * 60 + outM) - (inH * 60 + inM);
          if (workedMin < 0) workedMin = 0;
        }
      }

      const res = await api.post('/api/attendance/upsert', {
        empId: record.empId,
        date: apiDate,
        status: record.status,
        checkIn: record.checkIn || null,
        checkOut: record.checkOut || null,
        workedMinutes: workedMin,
        remarks: record.remarks || null
      });

      if (res.data?.ok) {
        setSuccess(`Attendance updated for ${record.userName}.`);
        fetchAttendance();
      } else {
        setError(res.data?.error || 'Failed to update attendance.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save attendance.');
    } finally {
      setSavingEmpId(null);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empNo || !empName || !department || !section || !designation) {
      setError('Emp No, Name, Department, Section, and Designation are required.');
      return;
    }

    try {
      setSubmittingEmp(true);
      setError('');
      setSuccess('');

      const res = await api.post('/api/attendance/employees', {
        empNo,
        name: empName,
        department,
        section,
        designation,
        phone
      });

      if (res.data?.ok) {
        setSuccess(`Employee ${empName} (${empNo}) added to staff roster!`);
        setEmpNo('');
        setEmpName('');
        setPhone('');
        fetchEmployees();
        fetchAttendance();
      } else {
        setError(res.data?.error || 'Failed to add employee.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error adding employee.');
    } finally {
      setSubmittingEmp(false);
    }
  };

  const handleDeleteEmployee = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from the active staff roster?`)) return;
    try {
      const res = await api.delete(`/api/attendance/employees/${id}`);
      if (res.data?.ok) {
        setSuccess(`Employee ${name} removed.`);
        fetchEmployees();
        fetchAttendance();
      }
    } catch {
      setError('Could not remove employee.');
    }
  };

  const handleExportCSV = () => {
    const apiDate = inputToApi(selectedDateInput);
    const lines = [
      `BSC Retail CRM — Staff Attendance Register — ${apiDate}`,
      '',
      'Emp No,Name,Department,Section,Designation,Status,Check-In,Check-Out,Hours Worked',
      ...records.map(r => {
        const hrs = r.workedMinutes ? `${Math.floor(r.workedMinutes / 60)}h ${r.workedMinutes % 60}m` : '—';
        return `"${r.empNo}","${r.userName}","${r.department}","${r.section}","${r.userRole}","${r.status}","${r.checkIn || ''}","${r.checkOut || ''}","${hrs}"`;
      })
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_${apiDate.replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto' }} className="fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="outfit" style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
            Staff Attendance & Roster Management
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            Manage employee master data, mark daily presence, check-in/out times, and working hours
          </p>
        </div>

        {/* Tab Navigation & Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '4px' }}>
            <button
              onClick={() => setActiveTab('register')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                background: activeTab === 'register' ? '#4F46E5' : 'transparent',
                color: activeTab === 'register' ? '#FFFFFF' : '#64748B',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              📋 Attendance Register
            </button>
            <button
              onClick={() => setActiveTab('employees')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                background: activeTab === 'employees' ? '#4F46E5' : 'transparent',
                color: activeTab === 'employees' ? '#FFFFFF' : '#64748B',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              👥 Employee Master ({employees.length || 'Roster'})
            </button>
          </div>

          {activeTab === 'register' && (
            <button
              onClick={handleExportCSV}
              disabled={records.length === 0}
              style={{
                padding: '9px 18px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 700,
                background: '#10B981',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(16,185,129,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              📥 Export CSV
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* TAB 1: DAILY ATTENDANCE REGISTER */}
      {activeTab === 'register' && (
        <>
          {/* Summary KPI Ribbon */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
              marginBottom: '24px',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '20px 24px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}
          >
            {[
              { label: 'Total Staff', value: stats.total, icon: '👥', color: '#0F172A' },
              { label: 'Present', value: stats.present, icon: '✅', color: '#10B981' },
              { label: 'Absent', value: stats.absent, icon: '❌', color: '#EF4444' },
              { label: 'Late', value: stats.late, icon: '⏰', color: '#F59E0B' },
              { label: 'On Leave', value: stats.leave, icon: '🏖️', color: '#3B82F6' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', marginBottom: '2px' }}>{s.icon}</div>
                <div className="mono" style={{ fontSize: '26px', fontWeight: 800, color: s.color, lineHeight: 1.1 }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Date Picker Bar */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>📅 Attendance Date:</span>
              <input
                type="date"
                value={selectedDateInput}
                onChange={(e) => setSelectedDateInput(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0F172A',
                  background: '#FAF7F2'
                }}
              />
            </div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>
              Date formatted: <span className="mono" style={{ fontWeight: 700, color: '#4F46E5' }}>{inputToApi(selectedDateInput)}</span>
            </div>
          </div>

          {/* Register Table */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 className="outfit" style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A' }}>
                Daily Register Sheet
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Showing {records.length} staff records
              </span>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                <div className="spinner" style={{ width: '28px', height: '28px' }} />
              </div>
            ) : records.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', background: '#FAF7F2', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>No staff registered yet</p>
                <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                  Click on "Employee Master" tab to add your store employees.
                </p>
              </div>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Emp No</th>
                      <th>Employee Name</th>
                      <th>Department / Section</th>
                      <th>Designation</th>
                      <th>Status</th>
                      <th>Check-In</th>
                      <th>Check-Out</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => {
                      const isSaving = savingEmpId === r.empId;
                      return (
                        <tr key={r.empId}>
                          <td className="mono" style={{ fontWeight: 800, color: '#4F46E5', fontSize: '12px' }}>
                            {r.empNo}
                          </td>
                          <td style={{ fontWeight: 700, color: '#0F172A' }}>
                            {r.userName}
                          </td>
                          <td style={{ fontSize: '12px', color: '#475569' }}>
                            <div>{r.department}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8' }}>{r.section}</div>
                          </td>
                          <td style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                            {r.userRole}
                          </td>
                          <td>
                            <select
                              value={r.status}
                              onChange={(e) => handleRowStatusChange(r.empId, 'status', e.target.value)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                background: STATUS_CONFIG[r.status]?.bg || '#F1F5F9',
                                color: STATUS_CONFIG[r.status]?.color || '#475569',
                                border: '1px solid #CBD5E1',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="present">✅ Present</option>
                              <option value="absent">❌ Absent</option>
                              <option value="late">⏰ Late</option>
                              <option value="half_day">🌓 Half Day</option>
                              <option value="leave">🏖️ On Leave</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="time"
                              value={r.checkIn || ''}
                              onChange={(e) => handleRowStatusChange(r.empId, 'checkIn', e.target.value)}
                              style={{ padding: '6px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #CBD5E1', width: '105px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="time"
                              value={r.checkOut || ''}
                              onChange={(e) => handleRowStatusChange(r.empId, 'checkOut', e.target.value)}
                              style={{ padding: '6px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #CBD5E1', width: '105px' }}
                            />
                          </td>
                          <td>
                            <button
                              onClick={() => handleSaveRow(r)}
                              disabled={isSaving}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                background: '#1E293B',
                                color: '#FFFFFF',
                                border: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              {isSaving ? '...' : 'Save'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 2: EMPLOYEE MASTER & REGISTRATION */}
      {activeTab === 'employees' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
          {/* Add Employee Form Card */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 className="outfit" style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
              ➕ Register New Staff Member
            </h3>

            <form onSubmit={handleCreateEmployee}>
              <div className="field">
                <label>Employee No <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. EMP-106"
                  value={empNo}
                  onChange={(e) => setEmpNo(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label>Full Employee Name <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Anil Kumar"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label>Department <span className="req">*</span></label>
                <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                  <option value="Sales">Sales</option>
                  <option value="Billing & Cash">Billing & Cash</option>
                  <option value="Visual Merchandising">Visual Merchandising</option>
                  <option value="Inventory & Stock">Inventory & Stock</option>
                  <option value="Customer Relations">Customer Relations</option>
                  <option value="Security & Facility">Security & Facility</option>
                  <option value="Store Management">Store Management</option>
                </select>
              </div>

              <div className="field">
                <label>Floor Section <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Sarees Division / Cash Counter 1"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label>Designation <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Senior Sales Executive"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label>Phone Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 9845012345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={submittingEmp}
                className="btn btn-primary btn-full"
                style={{ background: '#4F46E5', marginTop: '8px' }}
              >
                {submittingEmp ? 'Adding...' : '➕ Register Employee'}
              </button>
            </form>
          </div>

          {/* Employee Directory List */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 className="outfit" style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
              👥 Active Employee Roster Directory
            </h3>

            {employees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: '13px' }}>
                No employees registered in master roster.
              </div>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Emp No</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Section</th>
                      <th>Designation</th>
                      <th>Phone</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => (
                      <tr key={emp.id}>
                        <td className="mono" style={{ fontWeight: 800, color: '#4F46E5' }}>
                          {emp.empNo}
                        </td>
                        <td style={{ fontWeight: 700, color: '#0F172A' }}>
                          {emp.name}
                        </td>
                        <td style={{ fontSize: '12px' }}>{emp.department}</td>
                        <td style={{ fontSize: '12px' }}>{emp.section}</td>
                        <td style={{ fontSize: '12px', fontWeight: 600 }}>{emp.designation}</td>
                        <td className="mono" style={{ fontSize: '12px', color: '#64748B' }}>
                          {emp.phone || '—'}
                        </td>
                        <td>
                          <button
                            onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                            style={{
                              background: '#FEE2E2',
                              color: '#EF4444',
                              border: '1px solid #FCA5A5',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
