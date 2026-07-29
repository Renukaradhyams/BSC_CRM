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
            <stop offset="0%" stopColor="#F5C842" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#F5C842" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {Array.from({ length: 4 }).map((_, i) => {
          const y = padding + (i * (height - 2 * padding)) / 3;
          return (
            <line key={i} x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          );
        })}

        {/* Filled area under line */}
        {pathD && (
          <path
            d={`${pathD} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`}
            fill="url(#chartGradient)"
          />
        )}

        {/* Glowing stroke line */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="var(--gold)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 0 6px rgba(245,200,66,0.6))' }}
          />
        )}

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill="#0B0E19" stroke="var(--gold)" strokeWidth="2.5" />
            {slots[i].count > 0 && (
              <text x={p.x} y={p.y - 9} fontSize="10" fill="var(--gold)" textAnchor="middle" fontWeight="bold">
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
          <h1 className="outfit" style={{ fontSize: '26px', fontWeight: 800, color: '#FFFFFF' }}>
            Store Intelligence Command Center
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
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
        <div className="glass-card glow-blue" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              🚶 Today Footfall
            </span>
            <span className="badge badge-blue">Real-time</span>
          </div>
          <div className="mono" style={{ fontSize: '34px', fontWeight: 800, color: '#FFFFFF' }}>
            {metrics.totalFootfall.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Visitors logged today
          </div>
        </div>

        {/* Bills */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              🧾 Total Bills
            </span>
            <span className="badge badge-gold">Sales</span>
          </div>
          <div className="mono" style={{ fontSize: '34px', fontWeight: 800, color: 'var(--gold)' }}>
            {metrics.totalBills.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Completed counter transactions
          </div>
        </div>

        {/* Diverts */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ⚠️ Open Diverts
            </span>
            <span className="badge badge-red">Sourcing</span>
          </div>
          <div className="mono" style={{ fontSize: '34px', fontWeight: 800, color: 'var(--crimson)' }}>
            {metrics.openDiverts}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Unfulfilled item requests
          </div>
        </div>

        {/* NPS */}
        <div className="glass-card glow-teal" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              💬 Net Promoter (NPS)
            </span>
            <span className="badge badge-green">Satisfaction</span>
          </div>
          <div className="mono" style={{ fontSize: '34px', fontWeight: 800, color: 'var(--green)' }}>
            {metrics.nps > 0 ? `+${metrics.nps}` : `${metrics.nps}`}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
            {metrics.feedbacksCollected} customer responses
          </div>
        </div>

        {/* CSI */}
        <div className="glass-card glow-gold" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              🛎️ Service Index (CSI)
            </span>
            <span className="badge badge-gold">Quality</span>
          </div>
          <div className="mono" style={{ fontSize: '34px', fontWeight: 800, color: 'var(--gold)' }}>
            {metrics.csi}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Overall service score
          </div>
        </div>
      </section>

      {/* Chart Section */}
      <section className="glass-card" style={{ padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 className="outfit" style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>
              Hourly Visitor Footfall Distribution
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              10:00 AM to 10:00 PM slot counts
            </p>
          </div>
          <span className="mono" style={{ fontSize: '12px', color: 'var(--gold)' }}>
            Peak: {Math.max(...slots.map(s => s.count), 0)} visitors
          </span>
        </div>
        {renderSVGChart()}
      </section>

      {/* Hourly Slot Logs Table */}
      <section className="glass-card" style={{ padding: '24px', marginBottom: '28px' }}>
        <h3 className="outfit" style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginBottom: '16px' }}>
          Hourly Entry Audit Log
        </h3>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time Slot</th>
                <th>Visitor Count</th>
                <th>Status</th>
                <th>Logged By</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((s, idx) => {
                const now = new Date();
                const curHour = now.getHours();
                const isPassed = curHour >= s.slotEnd;
                const isEntered = s.count > 0;

                return (
                  <tr key={idx}>
                    <td className="mono" style={{ fontWeight: 700, color: '#FFFFFF' }}>
                      {s.slotStart}:00 – {s.slotEnd}:00
                    </td>
                    <td className="mono" style={{ fontSize: '15px', color: 'var(--gold)', fontWeight: 700 }}>
                      {s.count}
                    </td>
                    <td>
                      {isEntered ? (
                        <span className="badge badge-green">Submitted</span>
                      ) : isPassed ? (
                        <span className="badge badge-red">Missed</span>
                      ) : (
                        <span className="badge badge-gold">Pending</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {s.submittedBy || '—'}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '12px' }}>
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
          className="glass-card glow-gold" 
          style={{
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <span className="badge badge-gold" style={{ flexShrink: 0 }}>
            🌟 Voice of Customer
          </span>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <marquee behavior="scroll" direction="left" scrollamount="4" style={{ fontSize: '13px', color: '#FFFFFF', fontStyle: 'italic' }}>
              {reviews.map((r, i) => (
                <span key={i} style={{ marginRight: '40px' }}>
                  " {r.text} " — <strong style={{ color: 'var(--gold)' }}>{r.name}</strong> ({r.area})
                </span>
              ))}
            </marquee>
          </div>
        </section>
      )}
    </div>
  );
}
