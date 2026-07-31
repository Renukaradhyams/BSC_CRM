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
  const [pin, setPin] = useState<string>('');
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string>('');

  const [selectedFloor, setSelectedFloor] = useState<string>('ALL');
  const [records, setRecords] = useState<AttendanceTVRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeStr, setTimeStr] = useState<string>('');

  const [presentPage, setPresentPage] = useState<number>(0);
  const [absentPage, setAbsentPage] = useState<number>(0);

  const ITEMS_PER_PAGE = 12;

  // Clock
  useEffect(() => {
    if (!authenticated) return;
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [authenticated]);

  // Handle PIN unlock
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '9911' || pin === '1234') {
      setAuthenticated(true);
      setPinError('');
    } else {
      setPinError('Invalid Live TV Unlock PIN code');
    }
  };

  // Poll Attendance Data every 15s
  useEffect(() => {
    if (!authenticated) return;

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
    const poll = setInterval(fetchAttendanceData, 15000);
    return () => clearInterval(poll);
  }, [authenticated]);

  // Filter records by selected floor/section
  const filteredRecords = selectedFloor === 'ALL'
    ? records
    : records.filter(r => r.section.toLowerCase().includes(selectedFloor.toLowerCase()) || r.department.toLowerCase().includes(selectedFloor.toLowerCase()));

  const presentList = filteredRecords.filter(r => r.status === 'present');
  const absentList = filteredRecords.filter(r => r.status !== 'present');

  useEffect(() => {
    if (!authenticated || filteredRecords.length === 0) return;
    const interval = setInterval(() => {
      setPresentPage(p => {
        const maxPage = Math.max(0, Math.ceil(presentList.length / ITEMS_PER_PAGE) - 1);
        return p >= maxPage ? 0 : p + 1;
      });
      setAbsentPage(p => {
        const maxPage = Math.max(0, Math.ceil(absentList.length / ITEMS_PER_PAGE) - 1);
        return p >= maxPage ? 0 : p + 1;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [authenticated, presentList.length, absentList.length]);

  const displayedPresent = presentList.slice(presentPage * ITEMS_PER_PAGE, (presentPage + 1) * ITEMS_PER_PAGE);
  const displayedAbsent = absentList.slice(absentPage * ITEMS_PER_PAGE, (absentPage + 1) * ITEMS_PER_PAGE);

  // Unlock PIN Screen matching TVDisplay.tsx
  if (!authenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0B0F19',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: "'Inter', sans-serif"
        }}
        className="fade-in"
      >
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1.5px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '36px 40px',
            width: '400px',
            maxWidth: '100%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              background: '#4F46E5',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              margin: '0 auto 16px auto',
              boxShadow: '0 8px 24px rgba(79,70,229,0.4)'
            }}
          >
            📺
          </div>
          <h2 className="outfit" style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>
            Floor TV Attendance Unlock
          </h2>
          <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '24px' }}>
            Enter Master Live TV Security PIN (Default: <span className="mono" style={{ color: '#F59E0B', fontWeight: 700 }}>9911</span>)
          </p>

          {pinError && <div style={{ color: '#FCA5A5', fontSize: '12px', fontWeight: 700, marginBottom: '16px', background: 'rgba(239,68,68,0.2)', padding: '8px', borderRadius: '8px' }}>{pinError}</div>}

          <form onSubmit={handlePinSubmit}>
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              autoFocus
              className="mono"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                background: '#0F172A',
                border: '1px solid #334155',
                color: '#FFFFFF',
                fontSize: '24px',
                textAlign: 'center',
                letterSpacing: '8px',
                marginBottom: '20px'
              }}
            />

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                background: '#4F46E5',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(79,70,229,0.4)'
              }}
            >
              Unlock Floor Telemetry TV →
            </button>
          </form>
        </div>
      </div>
    );
  }

  const uniqueFloors = Array.from(new Set(records.map(r => r.section).filter(Boolean)));

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0B0F19',
        color: '#FFFFFF',
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', sans-serif"
      }}
      className="fade-in"
    >
      {/* Top Header Bar matching TVDisplay.tsx */}
      <header
        style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid rgba(255,255,255,0.08)',
          paddingBottom: '16px',
          marginBottom: '24px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              background: '#4F46E5',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 800,
              boxShadow: '0 4px 14px rgba(79,70,229,0.4)'
            }}
          >
            📺
          </div>
          <div>
            <h1 className="outfit" style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
              Floor Live Attendance Scoreboard
            </h1>
            <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>BSC THE TEXTILE MALL</span>
              <span>·</span>
              <span style={{ color: '#10B981', fontWeight: 700 }}>● LIVE STORE POLLING</span>
            </div>
          </div>
        </div>

        {/* Floor Dropdown & Digital Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.06)', padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)' }}>
            <span style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: 700, textTransform: 'uppercase' }}>Floor Filter:</span>
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              style={{
                background: '#1E293B',
                color: '#FFFFFF',
                border: '1px solid #475569',
                padding: '6px 12px',
                borderRadius: '8px',
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

          <div className="mono" style={{ fontSize: '24px', fontWeight: 800, color: '#F59E0B', background: 'rgba(245,158,11,0.1)', padding: '6px 16px', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.3)' }}>
            {timeStr}
          </div>
        </div>
      </header>

      {/* Main Grid: Present vs Absent */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <div className="spinner" style={{ width: '40px', height: '40px', borderTopColor: '#4F46E5' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flex: 1, minHeight: 0 }}>
          {/* LEFT: PRESENT ON FLOOR */}
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.04)',
              border: '1.5px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '22px' }}>🟢</span>
                <h2 className="outfit" style={{ fontSize: '20px', fontWeight: 800, color: '#34D399' }}>
                  PRESENT ON FLOOR ({presentList.length})
                </h2>
              </div>
              <span style={{ background: '#065F46', color: '#A7F3D0', fontSize: '11px', fontWeight: 800, padding: '4px 12px', borderRadius: '20px' }}>
                ON DUTY
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'hidden', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '12px', alignContent: 'start' }}>
              {displayedPresent.length > 0 ? (
                displayedPresent.map(r => (
                  <div
                    key={r.empId}
                    style={{
                      background: 'rgba(15, 23, 42, 0.85)',
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
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: '#10B981',
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '16px',
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

          {/* RIGHT: NOT ON FLOOR */}
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.04)',
              border: '1.5px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '22px' }}>🔴</span>
                <h2 className="outfit" style={{ fontSize: '20px', fontWeight: 800, color: '#FCA5A5' }}>
                  NOT ON FLOOR ({absentList.length})
                </h2>
              </div>
              <span style={{ background: '#7F1D1D', color: '#FCA5A5', fontSize: '11px', fontWeight: 800, padding: '4px 12px', borderRadius: '20px' }}>
                ABSENT / LATE / LEAVE
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'hidden', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '12px', alignContent: 'start' }}>
              {displayedAbsent.length > 0 ? (
                displayedAbsent.map(r => {
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
                        background: 'rgba(15, 23, 42, 0.85)',
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
