import React, { useEffect, useState } from 'react';
import api from '../services/api';

interface AttendanceRecord {
  id: number;
  userId: number;
  userName: string;
  userRole: string;
  date: string;
  shiftName: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  workedMinutes: number;
}

const formatDateForApi = (d: Date): string => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  present:  { label: 'Present',  color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  absent:   { label: 'Absent',   color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
  late:     { label: 'Late',     color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  half_day: { label: 'Half Day', color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
  leave:    { label: 'On Leave', color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
};

export default function Attendance() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<string>(formatDateForApi(today));
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Summary stats
  const stats = {
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
    late: records.filter(r => r.status === 'late').length,
    leave: records.filter(r => r.status === 'leave').length,
    total: records.length,
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/api/attendance', { params: { date: selectedDate } });
      if (res.data?.ok) {
        setRecords(res.data.records || []);
      } else {
        setError(res.data?.error || 'Failed to load attendance.');
      }
    } catch (err) {
      // Endpoint may not be implemented on backend yet — show empty gracefully
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (recordId: number, newStatus: string) => {
    try {
      setError('');
      setSuccess('');
      const res = await api.post('/api/attendance/upsert', { id: recordId, status: newStatus });
      if (res.data?.ok) {
        setSuccess('Attendance updated.');
        fetchAttendance();
      } else {
        setError(res.data?.error || 'Update failed.');
      }
    } catch {
      setError('Could not update attendance.');
    }
  };

  const handleExportCSV = () => {
    const lines = [
      `BSC Retail CRM — Attendance Report — ${selectedDate}`,
      '',
      'Name,Role,Shift,Status,Check-In,Check-Out,Hours Worked',
      ...records.map(r => {
        const hrs = r.workedMinutes ? `${Math.floor(r.workedMinutes / 60)}h ${r.workedMinutes % 60}m` : '—';
        return `"${r.userName}","${r.userRole}","${r.shiftName}","${r.status}","${r.checkIn || ''}","${r.checkOut || ''}","${hrs}"`;
      })
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_${selectedDate.replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-container fade-in" style={{ background: 'transparent' }}>

      {/* ── Header ──────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="outfit" style={{ fontSize: '24px', fontWeight: 800, color: '#1a2744', letterSpacing: '-0.3px' }}>
            Staff Attendance
          </h1>
          <p style={{ fontSize: '13px', color: '#8a7e6a', marginTop: '4px' }}>
            Track daily staff presence, shifts, and working hours
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="date"
            value={selectedDate.split('/').reverse().join('-')}
            onChange={e => {
              const [yyyy, mm, dd] = e.target.value.split('-');
              setSelectedDate(`${dd}/${mm}/${yyyy}`);
            }}
            style={{
              padding: '9px 14px', borderRadius: '10px', border: '1px solid #d4c9b5',
              fontSize: '13px', color: '#1a2744', background: '#faf8f4', fontFamily: 'inherit'
            }}
          />
          <button
            onClick={handleExportCSV}
            disabled={records.length === 0}
            style={{
              padding: '9px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
              background: records.length > 0 ? 'linear-gradient(135deg, #0D9488, #059669)' : '#e8e0d0',
              color: records.length > 0 ? '#FFFFFF' : '#8a7e6a', border: 'none',
              cursor: records.length > 0 ? 'pointer' : 'default',
              boxShadow: records.length > 0 ? '0 4px 14px rgba(13,148,136,0.3)' : 'none',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* ── Alerts ──────────────────────────────────── */}
      {error && (
        <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', fontSize: '13px', color: '#DC2626', fontWeight: 500 }}>
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', fontSize: '13px', color: '#16A34A', fontWeight: 500 }}>
          ✓ {success}
        </div>
      )}

      {/* ── Summary Ribbon ──────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '12px', marginBottom: '24px',
        background: '#1a2744', borderRadius: '14px', padding: '18px 24px'
      }}>
        {[
          { label: 'Total Staff', value: stats.total, icon: '👥', color: '#FFFFFF' },
          { label: 'Present', value: stats.present, icon: '✅', color: '#4ADE80' },
          { label: 'Absent', value: stats.absent, icon: '❌', color: '#F87171' },
          { label: 'Late', value: stats.late, icon: '⏰', color: '#FCD34D' },
          { label: 'On Leave', value: stats.leave, icon: '🏖️', color: '#60A5FA' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>{s.icon}</div>
            <div className="mono" style={{ fontSize: '26px', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: '#60A5FA', fontWeight: 600, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Attendance Table ─────────────────────────── */}
      <section style={{
        background: '#FFFFFF', border: '1px solid #e8e0d0', borderRadius: '14px',
        padding: '24px', boxShadow: '0 2px 8px rgba(26,39,68,0.06)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 className="outfit" style={{ fontSize: '17px', fontWeight: 700, color: '#1a2744' }}>
            Attendance Register — {selectedDate}
          </h3>
          <span style={{ fontSize: '12px', color: '#8a7e6a' }}>
            {stats.present} present of {stats.total} staff
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', gap: '12px' }}>
            <div className="spinner" style={{ width: '24px', height: '24px', borderWidth: '3px' }} />
            <span style={{ fontSize: '13px', color: '#8a7e6a' }}>Loading attendance…</span>
          </div>
        ) : records.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 24px', borderRadius: '12px',
            background: '#faf8f4', border: '1px dashed #d4c9b5'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#1a2744' }}>No attendance records for {selectedDate}</p>
            <p style={{ fontSize: '13px', color: '#8a7e6a', marginTop: '4px' }}>
              Records appear here once staff attendance is logged via the backend.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #e8e0d0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#1a2744' }}>
                  {['Staff Name', 'Role', 'Shift', 'Status', 'Check-In', 'Check-Out', 'Hours'].map(h => (
                    <th key={h} style={{
                      padding: '12px 18px', textAlign: 'left', fontSize: '11px',
                      fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase',
                      letterSpacing: '0.07em', whiteSpace: 'nowrap'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r, idx) => {
                  const sc = STATUS_CONFIG[r.status] || { label: r.status, color: '#6B7280', bg: 'rgba(107,114,128,0.1)' };
                  const hrs = r.workedMinutes ? `${Math.floor(r.workedMinutes / 60)}h ${r.workedMinutes % 60}m` : '—';
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f0e8dc', background: idx % 2 === 0 ? '#FFFFFF' : '#faf8f4' }}>
                      <td style={{ padding: '13px 18px', fontWeight: 700, color: '#1a2744' }}>{r.userName}</td>
                      <td style={{ padding: '13px 18px', fontSize: '12px', color: '#5a5044', textTransform: 'capitalize' }}>
                        {r.userRole?.replace(/_/g, ' ')}
                      </td>
                      <td style={{ padding: '13px 18px', fontSize: '12px', color: '#5a5044' }}>{r.shiftName || '—'}</td>
                      <td style={{ padding: '13px 18px' }}>
                        <span style={{
                          padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                          background: sc.bg, color: sc.color, textTransform: 'uppercase', letterSpacing: '0.04em'
                        }}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="mono" style={{ padding: '13px 18px', color: '#16A34A', fontWeight: 600 }}>
                        {r.checkIn || <span style={{ color: '#c5b89e' }}>—</span>}
                      </td>
                      <td className="mono" style={{ padding: '13px 18px', color: '#DC2626', fontWeight: 600 }}>
                        {r.checkOut || <span style={{ color: '#c5b89e' }}>—</span>}
                      </td>
                      <td className="mono" style={{ padding: '13px 18px', color: '#7C3AED', fontWeight: 700 }}>{hrs}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Info Banner ──────────────────────────────── */}
      <div style={{
        marginTop: '20px', padding: '16px 20px', borderRadius: '12px',
        background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)',
        display: 'flex', alignItems: 'flex-start', gap: '12px'
      }}>
        <span style={{ fontSize: '18px', flexShrink: 0 }}>ℹ️</span>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a2744', marginBottom: '2px' }}>
            Attendance Backend Integration
          </p>
          <p style={{ fontSize: '12px', color: '#5a5044', lineHeight: 1.6 }}>
            This page connects to <code style={{ background: '#f0e8dc', padding: '1px 6px', borderRadius: '4px', fontSize: '11px' }}>/api/attendance</code> to fetch and update records.
            Shifts and roster are managed by the backend route defined in the project report.
            Connect the backend attendance router to activate full functionality.
          </p>
        </div>
      </div>
    </div>
  );
}
