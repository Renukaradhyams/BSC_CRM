import React, { useEffect, useState } from 'react';
import api from '../services/api';

interface AttendanceTVRecord {
  empId: number;
  empNo: string;
  userName: string;
  department: string;
  section: string;
  userRole: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
}

export default function AttendanceTV() {
  const [selectedFloor, setSelectedFloor] = useState<string>('ALL');
  const [records, setRecords] = useState<AttendanceTVRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeStr, setTimeStr] = useState<string>('');

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll Attendance Data every 20s
  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        const res = await api.get('/api/attendance');
        if (res.data?.ok) {
          setRecords(res.data.records || []);
        }
      } catch (err) {
        console.error('Failed to load live floor attendance TV data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
    const poll = setInterval(fetchAttendanceData, 20000);
    return () => clearInterval(poll);
  }, []);

  // Filter records by selected floor/section
  const filteredRecords = selectedFloor === 'ALL'
    ? records
    : records.filter(r => r.section.toLowerCase().includes(selectedFloor.toLowerCase()) || r.department.toLowerCase().includes(selectedFloor.toLowerCase()));

  const presentList = filteredRecords.filter(r => r.status === 'present');
  const absentList = filteredRecords.filter(r => r.status !== 'present');

  const uniqueFloors = Array.from(new Set(records.map(r => r.section).filter(Boolean)));

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0F172A',
        color: '#FFFFFF',
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', sans-serif"
      }}
      className="fade-in"
    >
      {/* Top Header Bar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid rgba(255,255,255,0.1)',
          paddingBottom: '16px',
          marginBottom: '24px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              background: '#4F46E5',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              fontWeight: 800,
              boxShadow: '0 4px 14px rgba(79,70,229,0.4)'
            }}
          >
            📺
          </div>
          <div>
            <h1 className="outfit" style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
              Floor Live Attendance Telemetry Board
            </h1>
            <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>BSC THE TEXTILE MALL</span>
              <span>·</span>
              <span style={{ color: '#10B981', fontWeight: 700 }}>● LIVE AUTO-POLLING</span>
            </div>
          </div>
        </div>

        {/* Floor Dropdown & Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.06)', padding: '6px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)' }}>
            <span style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: 700, textTransform: 'uppercase' }}>Select Floor:</span>
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              style={{
                background: '#1E293B',
                color: '#FFFFFF',
                border: '1px solid #475569',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Store Floors & Sections</option>
              {uniqueFloors.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="mono" style={{ fontSize: '24px', fontWeight: 800, color: '#F59E0B' }}>
            {timeStr}
          </div>
        </div>
      </header>

      {/* Main Grid: Present vs Absent/Late */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <div className="spinner" style={{ width: '36px', height: '36px', borderTopColor: '#4F46E5' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flex: 1, minHeight: 0 }}>
          {/* LEFT: PRESENT ON FLOOR */}
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1.5px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>🟢</span>
                <h2 className="outfit" style={{ fontSize: '20px', fontWeight: 800, color: '#34D399' }}>
                  PRESENT ON FLOOR ({presentList.length})
                </h2>
              </div>
              <span style={{ background: '#065F46', color: '#A7F3D0', fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '20px' }}>
                ON DUTY
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', alignContent: 'start' }}>
              {presentList.length > 0 ? (
                presentList.map(r => (
                  <div
                    key={r.empId}
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: '#10B981',
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {r.userName.charAt(0)}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.userName}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                        {r.userRole} · <span className="mono" style={{ color: '#10B981', fontWeight: 700 }}>{r.empNo}</span>
                      </div>
                      {r.checkIn && (
                        <div style={{ fontSize: '10px', color: '#6EE7B7', marginTop: '3px' }}>
                          In: {r.checkIn}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: '14px', gridColumn: '1 / -1' }}>
                  No staff members currently marked present on this floor.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: NOT ON FLOOR / ABSENT / LATE / LEAVE */}
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1.5px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>🔴</span>
                <h2 className="outfit" style={{ fontSize: '20px', fontWeight: 800, color: '#FCA5A5' }}>
                  NOT ON FLOOR ({absentList.length})
                </h2>
              </div>
              <span style={{ background: '#7F1D1D', color: '#FCA5A5', fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '20px' }}>
                ABSENT / LATE / LEAVE
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', alignContent: 'start' }}>
              {absentList.length > 0 ? (
                absentList.map(r => {
                  const statusColors: Record<string, { bg: string; color: string; label: string }> = {
                    absent:   { bg: '#991B1B', color: '#FCA5A5', label: 'ABSENT' },
                    late:     { bg: '#92400E', color: '#FCD34D', label: 'LATE' },
                    half_day: { bg: '#5B21B6', color: '#C4B5FD', label: 'HALF DAY' },
                    leave:    { bg: '#1E40AF', color: '#93C5FD', label: 'ON LEAVE' },
                  };
                  const statusInfo = statusColors[r.status] || { bg: '#374151', color: '#9CA3AF', label: r.status.toUpperCase() };

                  return (
                    <div
                      key={r.empId}
                      style={{
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}
                    >
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {r.userName}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                          {r.userRole} · <span className="mono">{r.empNo}</span>
                        </div>
                      </div>

                      <span
                        style={{
                          background: statusInfo.bg,
                          color: statusInfo.color,
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: '14px', gridColumn: '1 / -1' }}>
                  All registered staff members are currently present on this floor!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
