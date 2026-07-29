import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

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
  const { user } = useAuth();
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

  // Initialize operational empty slots list
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

          // Merge fetched footfalls with operational default slots
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
    const interval = setInterval(fetchDashboardData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Simple SVG Line Chart generator
  const renderSVGChart = () => {
    const width = 600;
    const height = 150;
    const padding = 20;

    const maxCount = Math.max(...slots.map(s => s.count), 5);

    const points = slots.map((s, i) => {
      const x = padding + (i * (width - 2 * padding)) / (slots.length - 1);
      const y = height - padding - (s.count * (height - 2 * padding)) / maxCount;
      return { x, y };
    });

    const pathD = points.reduce((path, p, i) => {
      return path + `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y} `;
    }, '');

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '180px', background: '#fff', borderRadius: '8px', border: '1px solid var(--border)' }}>
        {/* Draw grid lines */}
        {Array.from({ length: 4 }).map((_, i) => {
          const y = padding + (i * (height - 2 * padding)) / 3;
          return (
            <line key={i} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#f0eded" strokeWidth="1" />
          );
        })}
        {/* Draw main line */}
        {pathD && <path d={pathD} fill="none" stroke="var(--navy)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
        {/* Draw data dots */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="var(--gold)" stroke="#fff" strokeWidth="1.5" />
            <text x={p.x} y={p.y - 8} fontSize="9" fill="var(--ink-60)" textAnchor="middle" fontWeight="bold">
              {slots[i].count > 0 ? slots[i].count : ''}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }} className="fade-in">
      <header style={{ marginBottom: '24px' }}>
        <h1 className="serif" style={{ fontSize: '28px' }}>Store Overview</h1>
        <p style={{ fontSize: '14px', color: 'var(--ink-60)' }}>CRM Pulse & real-time operational feeds</p>
      </header>

      {/* KPI Cards Grid */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div className="card" style={{ padding: '16px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-60)' }}>🚶 Footfall Today</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--navy)', marginTop: '8px' }}>{metrics.totalFootfall}</div>
        </div>

        <div className="card" style={{ padding: '16px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-60)' }}>🧾 Bills Generated</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--navy)', marginTop: '8px' }}>{metrics.totalBills}</div>
        </div>

        <div className="card" style={{ padding: '16px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-60)' }}>⚠️ Open Diverts</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--crimson)', marginTop: '8px' }}>{metrics.openDiverts}</div>
        </div>

        <div className="card" style={{ padding: '16px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-60)' }}>💬 NPS Score</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--green)', marginTop: '8px' }}>{metrics.nps}%</div>
        </div>

        <div className="card" style={{ padding: '16px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-60)' }}>🛎️ CSI Index</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--gold)', marginTop: '8px' }}>{metrics.csi}%</div>
        </div>
      </section>

      {/* Inline SVGs chart */}
      <section className="card" style={{ padding: '20px', marginBottom: '24px', border: '1px solid var(--border)' }}>
        <h3 className="serif" style={{ fontSize: '18px', marginBottom: '14px' }}>Hourly Traffic Chart</h3>
        {renderSVGChart()}
      </section>

      {/* Hourly Slots Registry */}
      <section className="card" style={{ padding: '20px', border: '1px solid var(--border)' }}>
        <h3 className="serif" style={{ fontSize: '18px', marginBottom: '16px' }}>Hourly Slot Logs</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: 'var(--navy)', color: '#fff', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px' }}>Hour Slot</th>
                <th style={{ padding: '12px 16px' }}>Count</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((s, idx) => {
                const hour = s.slotStart;
                const now = new Date();
                const curHour = now.getHours();
                const isPassed = curHour >= s.slotEnd;
                const isEntered = s.count > 0;

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-l)', background: idx % 2 === 0 ? '#fff' : 'var(--surface)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{hour}:00 - {s.slotEnd}:00</td>
                    <td style={{ padding: '12px 16px' }}>{s.count}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {isEntered ? (
                        <span style={{ color: 'var(--green)', fontWeight: 'bold' }}>✅ Submitted</span>
                      ) : isPassed ? (
                        <span style={{ color: 'var(--crimson)', fontWeight: 'bold' }}>❌ Unfilled</span>
                      ) : (
                        <span style={{ color: 'var(--orange)', fontWeight: 'bold' }}>⏳ Pending</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--ink-60)', fontStyle: 'italic' }}>
                      {s.remarks || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Guest reviews Loop ticker marquee */}
      {reviews.length > 0 && (
        <section style={{ marginTop: '24px', background: 'var(--navy-l)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
          <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--navy)', fontWeight: 'bold', marginBottom: '8px' }}>
            🌟 Customer Praise Ticker
          </h4>
          <marquee behavior="scroll" direction="left" scrollamount="4" style={{ fontSize: '13px', color: 'var(--navy)', fontStyle: 'italic' }}>
            {reviews.map((r, i) => (
              <span key={i} style={{ marginRight: '32px' }}>
                " {r.text} " — <strong>{r.name}</strong> ({r.area})
              </span>
            ))}
          </marquee>
        </section>
      )}
    </div>
  );
}
