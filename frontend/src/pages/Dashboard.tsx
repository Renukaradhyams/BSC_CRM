import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

interface MetricState {
  totalFootfall: number;
  totalBills: number;
  openDiverts: number;
  feedbacksCollected: number;
  nps: number;
  csi: number;
}

interface FootfallSlot {
  id?: number;
  slotStart: number;
  slotEnd: number;
  count: number;
  remarks: string | null;
  submittedBy?: string;
}

interface Review {
  name: string;
  area: string;
  text: string;
}

const KPI_CONFIG = [
  {
    key: 'totalFootfall',
    label: "Today's Footfall",
    icon: '🚶',
    accent: '#2563EB',
    sub: 'Total visitors logged today',
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: 'totalBills',
    label: 'Total Bills',
    icon: '🧾',
    accent: '#0D9488',
    sub: 'Counter transactions',
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: 'openDiverts',
    label: 'Open Diverts',
    icon: '📦',
    accent: '#DC2626',
    sub: 'Unfulfilled item requests',
    format: (v: number) => String(v),
  },
  {
    key: 'nps',
    label: 'NPS Score',
    icon: '⭐',
    accent: '#16A34A',
    sub: 'Customer satisfaction rating',
    format: (v: number) => (v > 0 ? `+${v}%` : `${v}%`),
  },
  {
    key: 'csi',
    label: 'Service Index (CSI)',
    icon: '🛎️',
    accent: '#7C3AED',
    sub: 'Overall service score',
    format: (v: number) => `${v}%`,
  },
];

export default function Dashboard() {
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState<MetricState>({
    totalFootfall: 0,
    totalBills: 0,
    openDiverts: 0,
    feedbacksCollected: 0,
    nps: 0,
    csi: 0,
  });
  const [attendanceStats, setAttendanceStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    leave: 0,
    rate: 0
  });
  const [slots, setSlots] = useState<FootfallSlot[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const DEFAULT_SLOTS = Array.from({ length: 12 }, (_, i) => ({
    slotStart: 10 + i,
    slotEnd: 11 + i,
    count: 0,
    remarks: null,
  }));

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/crm/dashboard');
      if (res.data && res.data.ok) {
        const { summary, footfalls, recentReviews } = res.data;
        if (summary) setMetrics(summary);
        if (recentReviews) setReviews(recentReviews);

        if (footfalls && Array.isArray(footfalls)) {
          const merged = DEFAULT_SLOTS.map(def => {
            const found = footfalls.find((f: any) => f.slotStart === def.slotStart);
            return found ? { ...found } : def;
          });
          setSlots(merged);
        } else {
          setSlots(DEFAULT_SLOTS);
        }
      }

      // Fetch today's staff attendance summary
      const d = new Date();
      const ddmmyyyy = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      const attRes = await api.get(`/api/attendance?date=${ddmmyyyy}`);
      if (attRes.data?.ok && Array.isArray(attRes.data.records)) {
        const recs = attRes.data.records;
        const tot = recs.length;
        const pres = recs.filter((r: any) => ['present', 'late', 'half_day'].includes(r.status)).length;
        const abs = recs.filter((r: any) => r.status === 'absent').length;
        const lve = recs.filter((r: any) => r.status === 'leave').length;
        const rateVal = tot > 0 ? Math.round((pres / tot) * 100) : 0;
        setAttendanceStats({ total: tot, present: pres, absent: abs, leave: lve, rate: rateVal });
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };


  const currentHour = new Date().getHours();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', gap: '12px' }}>
        <div className="spinner" style={{ width: '28px', height: '28px' }}></div>
        <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 600 }}>Loading dashboard analytics...</span>
      </div>
    );
  }

  return (
    <div className="page-container fade-in">
      {/* Top Welcome Title */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="outfit" style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
            Store Performance Overview
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            Real-time footfall telemetry, sales conversion, and divert alerts
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/app/footfall')}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              background: '#D97706',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)'
            }}
          >
            + Log Footfall
          </button>
          <button
            onClick={() => navigate('/app/divert')}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              background: '#1E293B',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            📦 Diverts Register
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '28px'
        }}
      >
        {KPI_CONFIG.map(kpi => {
          const val = metrics[kpi.key as keyof MetricState] || 0;
          return (
            <div
              key={kpi.key}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                transition: 'transform 0.15s ease',
                cursor: 'pointer'
              }}
              onClick={() => {
                if (kpi.key === 'totalFootfall') navigate('/app/footfall');
                else if (kpi.key === 'openDiverts') navigate('/app/divert');
                else if (kpi.key === 'nps' || kpi.key === 'csi') navigate('/app/feedback-list');
                else navigate('/app/reports');
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {kpi.label}
                </span>
                <span style={{ fontSize: '18px' }}>{kpi.icon}</span>
              </div>

              <div className="mono" style={{ fontSize: '30px', fontWeight: 800, color: kpi.accent, marginTop: '10px', lineHeight: 1 }}>
                {kpi.format(val)}
              </div>

              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>
                {kpi.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* Staff Attendance Telemetry Summary Row */}
      <div className="glass-card" style={{ padding: '20px 24px', marginBottom: '28px', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 className="outfit" style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              👥 Today's Staff Attendance Summary
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>Live presence and roster telemetry for store employees</p>
          </div>
          <button
            onClick={() => navigate('/app/attendance')}
            style={{
              padding: '7px 16px', borderRadius: '8px', background: '#EEF2FF',
              border: '1px solid #C7D2FE', color: '#4F46E5', fontSize: '12px', fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            📋 Manage Attendance Roster →
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
          <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase' }}>ROSTER STAFF</div>
            <div className="mono" style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>{attendanceStats.total}</div>
            <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>total registered</div>
          </div>

          <div style={{ background: '#ECFDF5', padding: '14px', borderRadius: '10px', border: '1px solid #A7F3D0' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#047857', letterSpacing: '0.06em', textTransform: 'uppercase' }}>PRESENT TODAY</div>
            <div className="mono" style={{ fontSize: '24px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>{attendanceStats.present}</div>
            <div style={{ fontSize: '10px', color: '#047857', marginTop: '2px' }}>on floor active</div>
          </div>

          <div style={{ background: '#FEF2F2', padding: '14px', borderRadius: '10px', border: '1px solid #FCA5A5' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#B91C1C', letterSpacing: '0.06em', textTransform: 'uppercase' }}>ABSENT TODAY</div>
            <div className="mono" style={{ fontSize: '24px', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>{attendanceStats.absent}</div>
            <div style={{ fontSize: '10px', color: '#B91C1C', marginTop: '2px' }}>unreported</div>
          </div>

          <div style={{ background: '#EFF6FF', padding: '14px', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#1D4ED8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>ATTENDANCE RATE</div>
            <div className="mono" style={{ fontSize: '24px', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>{attendanceStats.rate}%</div>
            <div style={{ fontSize: '10px', color: '#3B82F6', marginTop: '2px' }}>daily turnout</div>
          </div>
        </div>
      </div>


      {/* Main Grid: Footfall Hourly Bar Chart & Customer Feedback Voices */}
      <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '28px' }}>
        {/* Hourly Footfall Chart Container */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            padding: '24px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 className="outfit" style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                Hourly Visitor Trend Today
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                Live visitor distribution across 12 store operating slots
              </p>
            </div>
            <button
              onClick={() => navigate('/app/footfall')}
              style={{ fontSize: '12px', color: '#2563EB', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              View Full Table →
            </button>
          </div>

          {/* Bar Chart Visualization with Mobile Scroll */}
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '180px', paddingTop: '20px', minWidth: '400px' }}>

            {slots.map((slot) => {
              const maxVal = Math.max(...slots.map(s => s.count), 50);
              const heightPct = Math.max(10, Math.round((slot.count / maxVal) * 100));
              const isCurrent = currentHour === slot.slotStart;
              const formatHour = (h: number) => `${h % 12 || 12}${h >= 12 ? 'p' : 'a'}`;

              return (
                <div key={slot.slotStart} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  {slot.count > 0 && (
                    <span className="mono" style={{ fontSize: '10px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                      {slot.count}
                    </span>
                  )}
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '28px',
                      height: `${heightPct}%`,
                      background: isCurrent ? '#D97706' : slot.count > 0 ? '#2563EB' : '#F1F5F9',
                      borderRadius: '6px 6px 0 0',
                      transition: 'all 0.2s ease'
                    }}
                    title={`Slot ${slot.slotStart}:00 - ${slot.count} visitors`}
                  />
                  <span style={{ fontSize: '10px', color: '#64748B', marginTop: '6px', fontWeight: 600 }}>
                    {formatHour(slot.slotStart)}
                  </span>
                </div>
              );
            })}
            </div>
          </div>
        </div>

        {/* Recent Customer Voices Box */}

        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            padding: '24px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="outfit" style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
              Customer Feedback Voices
            </h3>
            <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700, background: '#DCFCE7', padding: '2px 8px', borderRadius: '10px' }}>
              Live
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {reviews.length > 0 ? (
              reviews.slice(0, 3).map((r, i) => (
                <div key={i} style={{ padding: '12px', background: '#FAF7F2', borderRadius: '8px', border: '1px solid #EAE5DC' }}>
                  <p style={{ fontSize: '12px', color: '#334155', fontStyle: 'italic', lineHeight: 1.4 }}>
                    "{r.text}"
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#64748B', marginTop: '8px' }}>
                    <span>{r.name || 'Customer'}</span>
                    <span style={{ color: '#2563EB' }}>{r.area || 'Store Floor'}</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94A3B8', fontSize: '13px' }}>
                No customer voices logged today
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
