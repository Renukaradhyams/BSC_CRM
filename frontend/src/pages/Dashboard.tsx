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
    label: 'Today Footfall',
    icon: '🚶',
    badge: 'Real-time',
    accent: '#2563EB',
    accentBg: 'rgba(37,99,235,0.08)',
    sub: 'Visitors logged today',
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: 'totalBills',
    label: 'Total Bills',
    icon: '🧾',
    badge: 'Sales',
    accent: '#0D9488',
    accentBg: 'rgba(13,148,136,0.08)',
    sub: 'Counter transactions',
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: 'openDiverts',
    label: 'Open Diverts',
    icon: '⚠️',
    badge: 'Sourcing',
    accent: '#DC2626',
    accentBg: 'rgba(220,38,38,0.08)',
    sub: 'Unfulfilled requests',
    format: (v: number) => String(v),
  },
  {
    key: 'nps',
    label: 'Net Promoter (NPS)',
    icon: '💬',
    badge: 'Satisfaction',
    accent: '#16A34A',
    accentBg: 'rgba(22,163,74,0.08)',
    sub: 'Customer responses',
    format: (v: number) => (v > 0 ? `+${v}%` : `${v}%`),
  },
  {
    key: 'csi',
    label: 'Service Index (CSI)',
    icon: '🛎️',
    badge: 'Quality',
    accent: '#7C3AED',
    accentBg: 'rgba(124,58,237,0.08)',
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
  const [slots, setSlots] = useState<FootfallSlot[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const DEFAULT_SLOTS = Array.from({ length: 12 }, (_, i) => ({
    slotStart: 10 + i,
    slotEnd: 11 + i,
    count: 0,
    remarks: null,
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

  /* ── SVG Area Chart ─────────────────────── */
  const renderSVGChart = () => {
    const W = 700, H = 160, P = 30;
    const maxCount = Math.max(...slots.map(s => s.count), 10);
    const pts = slots.map((s, i) => ({
      x: P + (i * (W - 2 * P)) / (slots.length - 1),
      y: H - P - (s.count * (H - 2 * P)) / maxCount,
      s,
    }));
    const pathD = pts.reduce((d, p, i) => d + `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y} `, '');

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '180px' }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75, 1].map((t, i) => (
          <line
            key={i}
            x1={P} y1={H - P - t * (H - 2 * P)}
            x2={W - P} y2={H - P - t * (H - 2 * P)}
            stroke="#e2d9c8" strokeWidth="1" strokeDasharray="4,4"
          />
        ))}

        {pathD && (
          <path
            d={`${pathD} L ${W - P} ${H - P} L ${P} ${H - P} Z`}
            fill="url(#areaGrad)"
          />
        )}

        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="#2563EB"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill="#f5f0e8" stroke="#2563EB" strokeWidth="2.5" />
            {p.s.count > 0 && (
              <text x={p.x} y={p.y - 10} fontSize="10" fill="#1a2744" textAnchor="middle" fontWeight="700">
                {p.s.count}
              </text>
            )}
            <text x={p.x} y={H - 6} fontSize="9" fill="#8a7e6a" textAnchor="middle">
              {p.s.slotStart}:00
            </text>
          </g>
        ))}
      </svg>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '16px' }}>
        <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
        <p style={{ fontSize: '13px', color: '#8a7e6a', fontWeight: 500 }}>Loading dashboard…</p>
      </div>
    );
  }

  const now = new Date();
  const curHour = now.getHours();
  const totalVisitors = slots.reduce((a, s) => a + s.count, 0);
  const peakSlot = slots.reduce((best, s) => (s.count > best.count ? s : best), slots[0] || { slotStart: 0, slotEnd: 0, count: 0 });

  return (
    <div className="page-container fade-in" style={{ background: 'transparent' }}>

      {/* ── Page Header ───────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="outfit" style={{ fontSize: '24px', fontWeight: 800, color: '#1a2744', letterSpacing: '-0.3px' }}>
            Store Intelligence Command Center
          </h1>
          <p style={{ fontSize: '13px', color: '#8a7e6a', marginTop: '4px' }}>
            Real-time footfall, satisfaction scores &amp; sourcing alerts
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/app/footfall')}
            style={{
              padding: '9px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
              background: '#f5f0e8', color: '#1a2744', border: '1px solid #d4c9b5',
              cursor: 'pointer', transition: 'all 0.18s ease',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            🚶 Log Footfall
          </button>
          <button
            onClick={() => navigate('/app/divert')}
            style={{
              padding: '9px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
              background: metrics.openDiverts > 0 ? 'rgba(220,38,38,0.08)' : '#f5f0e8',
              color: metrics.openDiverts > 0 ? '#DC2626' : '#1a2744',
              border: `1px solid ${metrics.openDiverts > 0 ? 'rgba(220,38,38,0.25)' : '#d4c9b5'}`,
              cursor: 'pointer', transition: 'all 0.18s ease',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            📦 Diverts
            {metrics.openDiverts > 0 && (
              <span style={{ background: '#DC2626', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '10px', fontWeight: 700 }}>
                {metrics.openDiverts}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate('/app/tv')}
            style={{
              padding: '9px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
              background: 'linear-gradient(135deg, #1a2744 0%, #2563EB 100%)',
              color: '#FFFFFF', border: 'none',
              cursor: 'pointer', transition: 'all 0.18s ease',
              boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            📺 TV Display
          </button>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {KPI_CONFIG.map(cfg => {
          const val = metrics[cfg.key as keyof MetricState] as number;
          const isHovered = hoveredCard === cfg.key;
          const subVal = cfg.key === 'nps' ? `${metrics.feedbacksCollected} responses` : cfg.sub;

          return (
            <div
              key={cfg.key}
              onMouseEnter={() => setHoveredCard(cfg.key)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                background: '#FFFFFF',
                border: `1px solid ${isHovered ? cfg.accent : '#e8e0d0'}`,
                borderRadius: '14px',
                padding: '20px',
                borderTop: `3px solid ${cfg.accent}`,
                transition: 'all 0.2s ease',
                boxShadow: isHovered
                  ? `0 8px 24px -4px ${cfg.accent}30`
                  : '0 2px 8px rgba(26,39,68,0.06)',
                transform: isHovered ? 'translateY(-3px)' : 'none',
                cursor: 'default',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: cfg.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
                }}>
                  {cfg.icon}
                </div>
                <span style={{
                  padding: '3px 9px', borderRadius: '20px', fontSize: '10px', fontWeight: 700,
                  background: cfg.accentBg, color: cfg.accent,
                  letterSpacing: '0.06em', textTransform: 'uppercase'
                }}>
                  {cfg.badge}
                </span>
              </div>

              <div className="mono" style={{ fontSize: '32px', fontWeight: 800, color: cfg.accent, lineHeight: 1 }}>
                {cfg.format(val)}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#1a2744', marginTop: '8px' }}>{cfg.label}</div>
              <div style={{ fontSize: '11px', color: '#8a7e6a', marginTop: '3px' }}>{subVal}</div>
            </div>
          );
        })}
      </section>

      {/* ── Summary Ribbon ────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '12px', marginBottom: '24px',
        background: '#1a2744', borderRadius: '14px', padding: '18px 24px',
      }}>
        {[
          { label: 'Total Logged', value: totalVisitors.toLocaleString(), icon: '👣' },
          { label: 'Peak Hour', value: `${peakSlot.slotStart}:00–${peakSlot.slotEnd}:00`, icon: '⏰' },
          { label: 'Peak Count', value: peakSlot.count.toLocaleString(), icon: '📈' },
          { label: 'Conversion Rate', value: metrics.totalFootfall > 0 ? `${Math.round((metrics.totalBills / metrics.totalFootfall) * 100)}%` : '—', icon: '🎯' },
        ].map(stat => (
          <div key={stat.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
            <div className="mono" style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF' }}>{stat.value}</div>
            <div style={{ fontSize: '11px', color: '#60A5FA', fontWeight: 600, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── Footfall Chart ────────────────────── */}
      <section style={{
        background: '#FFFFFF', border: '1px solid #e8e0d0',
        borderRadius: '14px', padding: '24px', marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(26,39,68,0.06)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 className="outfit" style={{ fontSize: '17px', fontWeight: 700, color: '#1a2744' }}>
              Hourly Visitor Footfall Distribution
            </h3>
            <p style={{ fontSize: '12px', color: '#8a7e6a', marginTop: '2px' }}>10:00 AM – 10:00 PM slot counts</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span style={{
              padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
              background: 'rgba(37,99,235,0.08)', color: '#2563EB', border: '1px solid rgba(37,99,235,0.2)'
            }}>
              Peak: {Math.max(...slots.map(s => s.count), 0)} visitors
            </span>
            <span style={{
              padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
              background: 'rgba(26,39,68,0.06)', color: '#1a2744', border: '1px solid #d4c9b5'
            }}>
              Total: {totalVisitors}
            </span>
          </div>
        </div>
        {renderSVGChart()}
      </section>

      {/* ── Hourly Audit Table ────────────────── */}
      <section style={{
        background: '#FFFFFF', border: '1px solid #e8e0d0',
        borderRadius: '14px', padding: '24px', marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(26,39,68,0.06)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 className="outfit" style={{ fontSize: '17px', fontWeight: 700, color: '#1a2744' }}>
            Hourly Entry Audit Log
          </h3>
          <span style={{ fontSize: '12px', color: '#8a7e6a' }}>
            {slots.filter(s => s.count > 0).length} / {slots.length} slots logged
          </span>
        </div>

        <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #e8e0d0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#1a2744' }}>
                {['Time Slot', 'Visitors', 'Status', 'Logged By', 'Remarks'].map(h => (
                  <th key={h} style={{
                    padding: '12px 18px', textAlign: 'left', fontSize: '11px',
                    fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em',
                    whiteSpace: 'nowrap'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((s, idx) => {
                const isPassed = curHour >= s.slotEnd;
                const isEntered = s.count > 0;
                const isCurrent = curHour >= s.slotStart && curHour < s.slotEnd;
                const rowBg = isCurrent ? 'rgba(37,99,235,0.04)' : idx % 2 === 0 ? '#FFFFFF' : '#faf8f4';

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f0e8dc', background: rowBg }}>
                    <td className="mono" style={{ padding: '13px 18px', fontWeight: 700, color: '#1a2744', whiteSpace: 'nowrap' }}>
                      {isCurrent && (
                        <span style={{
                          display: 'inline-block', width: '7px', height: '7px',
                          borderRadius: '50%', background: '#22C55E',
                          marginRight: '8px', boxShadow: '0 0 6px #22C55E',
                          verticalAlign: 'middle'
                        }} />
                      )}
                      {s.slotStart}:00 – {s.slotEnd}:00
                    </td>
                    <td className="mono" style={{ padding: '13px 18px', fontSize: '16px', color: '#2563EB', fontWeight: 800 }}>
                      {s.count > 0 ? s.count : <span style={{ color: '#c5b89e', fontWeight: 500, fontSize: '14px' }}>—</span>}
                    </td>
                    <td style={{ padding: '13px 18px' }}>
                      {isEntered ? (
                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: 'rgba(22,163,74,0.1)', color: '#16A34A', border: '1px solid rgba(22,163,74,0.25)' }}>✓ Submitted</span>
                      ) : isCurrent ? (
                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: 'rgba(37,99,235,0.1)', color: '#2563EB', border: '1px solid rgba(37,99,235,0.25)' }}>⏺ Active</span>
                      ) : isPassed ? (
                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: 'rgba(220,38,38,0.08)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.2)' }}>✕ Missed</span>
                      ) : (
                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: 'rgba(217,119,6,0.08)', color: '#D97706', border: '1px solid rgba(217,119,6,0.2)' }}>○ Pending</span>
                      )}
                    </td>
                    <td style={{ padding: '13px 18px', color: '#5a5044', fontSize: '12px', fontWeight: 500 }}>
                      {s.submittedBy || <span style={{ color: '#c5b89e' }}>—</span>}
                    </td>
                    <td style={{ padding: '13px 18px', color: '#8a7e6a', fontStyle: s.remarks ? 'italic' : 'normal', fontSize: '12px' }}>
                      {s.remarks || <span style={{ color: '#c5b89e' }}>No notes</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Voice of Customer Ticker ──────────── */}
      {reviews.length > 0 && (
        <section style={{
          background: '#1a2744', borderRadius: '14px',
          padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '16px',
          overflow: 'hidden', marginBottom: '8px'
        }}>
          <span style={{
            padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
            background: 'rgba(245,200,66,0.18)', color: '#F5C842',
            border: '1px solid rgba(245,200,66,0.3)', whiteSpace: 'nowrap',
            letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0
          }}>
            🌟 Voice of Customer
          </span>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <marquee behavior="scroll" direction="left" scrollamount="4"
              style={{ fontSize: '13px', color: '#CBD5E1', fontStyle: 'italic' }}>
              {reviews.map((r, i) => (
                <span key={i} style={{ marginRight: '48px' }}>
                  "{r.text}" — <strong style={{ color: '#60A5FA' }}>{r.name}</strong>
                  <span style={{ color: '#94A3B8', marginLeft: '4px' }}>({r.area})</span>
                </span>
              ))}
            </marquee>
          </div>
        </section>
      )}
    </div>
  );
}
