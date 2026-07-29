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

export default function Dashboard() {
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState<MetricState>({
    totalFootfall: 0,
    totalBills: 0,
    openDiverts: 0,
    feedbacksCollected: 0,
    nps: 0,
    csi: 0
  });
  const [slots, setSlots] = useState<FootfallSlot[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const DEFAULT_SLOTS = Array.from({ length: 12 }, (_, i) => ({
    slotStart: 10 + i,
    slotEnd: 11 + i,
    count: 0,
    remarks: null
  }));

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await api.get('/api/crm/dashboard');
        if (res.data && res.data.ok) {
          setMetrics(res.data.metrics);
          setReviews(res.data.reviews || []);

          const fetchedFootfalls: FootfallSlot[] = res.data.footfalls || [];
          const merged = DEFAULT_SLOTS.map(def => {
            const match = fetchedFootfalls.find(f => f.slotStart === def.slotStart);
            return match ? match : def;
          });
          setSlots(merged);
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const renderSVGChart = () => {
    const width = 600;
    const height = 150;
    const padding = 20;

    const maxCount = Math.max(...slots.map(s => s.count), 10);

    const points = slots.map((s, i) => {
      const x = padding + (i * (width - 2 * padding)) / (slots.length - 1);
      const y = height - padding - (s.count * (height - 2 * padding)) / maxCount;
      return { x, y };
    });

    const pathD = points.reduce((path, p, i) => {
      return path + `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y} `;
    }, '');

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '180px' }}>
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {Array.from({ length: 4 }).map((_, i) => {
          const y = padding + (i * (height - 2 * padding)) / 3;
          return (
            <line key={i} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#E2E8F0" strokeWidth="1" />
          );
        })}

        {/* Filled area under line */}
        {pathD && (
          <path
            d={`${pathD} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`}
            fill="url(#chartGradient)"
          />
        )}

        {/* Stroke line */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="#2563EB"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2.5" />
            {slots[i].count > 0 && (
              <text x={p.x} y={p.y - 9} fontSize="10" fill="#1D4ED8" textAnchor="middle" fontWeight="bold">
                {slots[i].count}
              </text>
            )}
          </g>
        ))}
      </svg>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="page-container fade-in">
      {/* Top Banner Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="outfit" style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A' }}>
            Store Intelligence Command Center
          </h1>
          <p style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
            Real-time hourly footfalls, customer satisfaction, and sourcing inventory metrics
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/app/footfall')} className="btn btn-ghost btn-sm">
            🚶 Log Footfall
          </button>
          <button onClick={() => navigate('/app/divert')} className="btn btn-ghost btn-sm">
            📦 Diverts ({metrics.openDiverts})
          </button>
          <button onClick={() => navigate('/app/tv')} className="btn btn-primary btn-sm">
            📺 TV Display
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <section 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
          marginBottom: '28px'
        }}
      >
        {/* Footfall */}
        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #2563EB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              🚶 Today Footfall
            </span>
            <span className="badge badge-gold">Real-time</span>
          </div>
          <div className="mono" style={{ fontSize: '34px', fontWeight: 800, color: '#0F172A' }}>
            {metrics.totalFootfall.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px' }}>
            Visitors logged today
          </div>
        </div>

        {/* Bills */}
        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #0D9488' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              🧾 Total Bills
            </span>
            <span className="badge badge-green">Sales</span>
          </div>
          <div className="mono" style={{ fontSize: '34px', fontWeight: 800, color: '#0D9488' }}>
            {metrics.totalBills.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px' }}>
            Completed counter transactions
          </div>
        </div>

        {/* Diverts */}
        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #DC2626' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ⚠️ Open Diverts
            </span>
            <span className="badge badge-crimson">Sourcing</span>
          </div>
          <div className="mono" style={{ fontSize: '34px', fontWeight: 800, color: '#DC2626' }}>
            {metrics.openDiverts}
          </div>
          <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px' }}>
            Unfulfilled item requests
          </div>
        </div>

        {/* NPS */}
        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #16A34A' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              💬 Net Promoter (NPS)
            </span>
            <span className="badge badge-green">Satisfaction</span>
          </div>
          <div className="mono" style={{ fontSize: '34px', fontWeight: 800, color: '#16A34A' }}>
            {metrics.nps > 0 ? `+${metrics.nps}` : `${metrics.nps}`}%
          </div>
          <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px' }}>
            {metrics.feedbacksCollected} customer responses
          </div>
        </div>

        {/* CSI */}
        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #7C3AED' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              🛎️ Service Index (CSI)
            </span>
            <span className="badge badge-gold">Quality</span>
          </div>
          <div className="mono" style={{ fontSize: '34px', fontWeight: 800, color: '#7C3AED' }}>
            {metrics.csi}%
          </div>
          <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px' }}>
            Overall service score
          </div>
        </div>
      </section>

      {/* Chart Section */}
      <section className="glass-card" style={{ padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 className="outfit" style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
              Hourly Visitor Footfall Distribution
            </h3>
            <p style={{ fontSize: '12px', color: '#475569' }}>
              10:00 AM to 10:00 PM slot counts
            </p>
          </div>
          <span className="mono" style={{ fontSize: '12px', color: '#2563EB', fontWeight: 700 }}>
            Peak: {Math.max(...slots.map(s => s.count), 0)} visitors
          </span>
        </div>
        {renderSVGChart()}
      </section>

      {/* Hourly Slot Logs Table */}
      <section className="glass-card" style={{ padding: '24px', marginBottom: '28px' }}>
        <h3 className="outfit" style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>
          Hourly Entry Audit Log
        </h3>
        <div className="data-table-wrap" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F1F5F9', borderBottom: '2px solid #E2E8F0', textAlign: 'left', color: '#475569' }}>
                <th style={{ padding: '12px 16px' }}>Time Slot</th>
                <th style={{ padding: '12px 16px' }}>Visitor Count</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Logged By</th>
                <th style={{ padding: '12px 16px' }}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((s, idx) => {
                const now = new Date();
                const curHour = now.getHours();
                const isPassed = curHour >= s.slotEnd;
                const isEntered = s.count > 0;

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td className="mono" style={{ padding: '12px 16px', fontWeight: 700, color: '#0F172A' }}>
                      {s.slotStart}:00 – {s.slotEnd}:00
                    </td>
                    <td className="mono" style={{ padding: '12px 16px', fontSize: '15px', color: '#2563EB', fontWeight: 700 }}>
                      {s.count}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {isEntered ? (
                        <span className="badge badge-green">Submitted</span>
                      ) : isPassed ? (
                        <span className="badge badge-crimson">Missed</span>
                      ) : (
                        <span className="badge badge-gold">Pending</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: '12px' }}>
                      {s.submittedBy || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontStyle: 'italic', fontSize: '12px' }}>
                      {s.remarks || 'No notes'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Customer Feedback Ticker */}
      {reviews.length > 0 && (
        <section 
          className="glass-card" 
          style={{
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0'
          }}
        >
          <span className="badge badge-gold" style={{ flexShrink: 0 }}>
            🌟 Voice of Customer
          </span>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <marquee behavior="scroll" direction="left" scrollamount="4" style={{ fontSize: '13px', color: '#0F172A', fontStyle: 'italic' }}>
              {reviews.map((r, i) => (
                <span key={i} style={{ marginRight: '40px' }}>
                  " {r.text} " — <strong style={{ color: '#2563EB' }}>{r.name}</strong> ({r.area})
                </span>
              ))}
            </marquee>
          </div>
        </section>
      )}
    </div>
  );
}
