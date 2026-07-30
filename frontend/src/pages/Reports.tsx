import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';

interface DailyStat {
  date: string;
  totalVisitors?: number;
  billsCount?: number;
}

interface ReportSummary {
  totalFootfall: number;
  totalBills: number;
  conversionRate: number;
  totalFeedback: number;
  nps: number;
  csi: number;
  divertSummary: Record<string, number>;
}

interface FeedbackVoice {
  date: string;
  name: string;
  area: string;
  text: string;
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

export default function Reports() {
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 6);

  const [fromDate, setFromDate] = useState<string>(formatDateInput(sevenDaysAgo));
  const [toDate, setToDate] = useState<string>(formatDateInput(today));

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [footfallByDay, setFootfallByDay] = useState<DailyStat[]>([]);
  const [billsByDay, setBillsByDay] = useState<DailyStat[]>([]);
  const [voices, setVoices] = useState<FeedbackVoice[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const fetchReports = useCallback(async () => {
    if (!fromDate || !toDate) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/crm/reports', {
        params: { from: inputToApi(fromDate), to: inputToApi(toDate) }
      });
      if (res.data?.ok) {
        setSummary(res.data.summary);
        setFootfallByDay(res.data.footfallByDay || []);
        setBillsByDay(res.data.billsByDay || []);
        setVoices(res.data.feedbackVoices || []);
      } else {
        setError(res.data?.error || 'Failed to load reports');
      }
    } catch (err) {
      setError('Could not connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ── CSV Export ──────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!summary) return;
    const lines: string[] = [
      'BSC Retail CRM Hub — Analytics Export',
      `Period: ${inputToApi(fromDate)} to ${inputToApi(toDate)}`,
      '',
      '=== SUMMARY ===',
      `Total Footfall,${summary.totalFootfall}`,
      `Total Bills,${summary.totalBills}`,
      `Conversion Rate,${summary.conversionRate}%`,
      `Total Feedback,${summary.totalFeedback}`,
      `NPS,${summary.nps > 0 ? '+' : ''}${summary.nps}%`,
      `CSI,${summary.csi}%`,
      '',
      '=== DAILY FOOTFALL ===',
      'Date,Total Visitors',
      ...footfallByDay.map(r => `${r.date},${r.totalVisitors}`),
      '',
      '=== DAILY BILLS ===',
      'Date,Bills Count',
      ...billsByDay.map(r => `${r.date},${r.billsCount}`),
      '',
      '=== CUSTOMER VOICES ===',
      'Date,Customer,Area,Feedback',
      ...voices.map(v => `"${v.date}","${v.name}","${v.area}","${v.text.replace(/"/g, '""')}"`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BSC_CRM_Report_${inputToApi(fromDate).replace(/\//g, '-')}_to_${inputToApi(toDate).replace(/\//g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── SVG Footfall Trend Chart ───────────────────────────────────────────
  const renderTrendChart = () => {
    if (footfallByDay.length === 0) return null;
    const W = 720, H = 180, PX = 40, PY = 24;
    const vals = footfallByDay.map(d => Number(d.totalVisitors) || 0);
    const maxVal = Math.max(...vals, 10);
    const pts = footfallByDay.map((d, i) => ({
      x: PX + (i * (W - 2 * PX)) / Math.max(footfallByDay.length - 1, 1),
      y: H - PY - (vals[i] * (H - 2 * PY)) / maxVal,
      d,
      v: vals[i],
    }));
    const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const areaD = `${pathD} L ${pts[pts.length - 1].x.toFixed(1)} ${(H - PY).toFixed(1)} L ${PX} ${(H - PY).toFixed(1)} Z`;

    // Bills overlay
    const billsMap: Record<string, number> = {};
    billsByDay.forEach(b => { billsMap[b.date] = Number(b.billsCount) || 0; });
    const bVals = footfallByDay.map(d => billsMap[d.date] || 0);
    const maxBills = Math.max(...bVals, 10);
    const bPts = footfallByDay.map((d, i) => ({
      x: PX + (i * (W - 2 * PX)) / Math.max(footfallByDay.length - 1, 1),
      y: H - PY - (bVals[i] * (H - 2 * PY)) / maxBills,
    }));
    const bPathD = bPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '200px' }}>
        <defs>
          <linearGradient id="rptGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((t, i) => (
          <line key={i}
            x1={PX} y1={H - PY - t * (H - 2 * PY)}
            x2={W - PX} y2={H - PY - t * (H - 2 * PY)}
            stroke="#e8e0d0" strokeWidth="1" strokeDasharray="4 4"
          />
        ))}
        <path d={areaD} fill="url(#rptGrad)" />
        <path d={pathD} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#f5f0e8" stroke="#2563EB" strokeWidth="2" />
            {p.v > 0 && (
              <text x={p.x} y={p.y - 9} fontSize="9" fill="#1a2744" textAnchor="middle" fontWeight="700">{p.v}</text>
            )}
          </g>
        ))}
        {bPts.length > 1 && (
          <path d={bPathD} fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 3" />
        )}
        {footfallByDay.map((d, i) => (
          <text key={i} x={pts[i].x} y={H - 6} fontSize="8" fill="#8a7e6a" textAnchor="middle">
            {d.date.split('/').slice(0, 2).join('/')}
          </text>
        ))}
        {/* Legend */}
        <circle cx={W - 140} cy={12} r="4" fill="#2563EB" />
        <text x={W - 132} y={16} fontSize="9" fill="#1a2744" fontWeight="600">Footfall</text>
        <line x1={W - 80} y1={12} x2={W - 66} y2={12} stroke="#0D9488" strokeWidth="2" strokeDasharray="4 2" />
        <text x={W - 62} y={16} fontSize="9" fill="#0D9488" fontWeight="600">Bills</text>
      </svg>
    );
  };

  const KPI_CARDS = summary ? [
    { label: 'Total Footfall', value: summary.totalFootfall.toLocaleString(), icon: '🚶', color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
    { label: 'Total Bills', value: summary.totalBills.toLocaleString(), icon: '🧾', color: '#0D9488', bg: 'rgba(13,148,136,0.08)' },
    { label: 'Conversion Rate', value: `${summary.conversionRate}%`, icon: '🎯', color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
    { label: 'Feedback Collected', value: summary.totalFeedback.toLocaleString(), icon: '💬', color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
    { label: 'NPS Score', value: `${summary.nps > 0 ? '+' : ''}${summary.nps}%`, icon: '⭐', color: summary.nps >= 0 ? '#16A34A' : '#DC2626', bg: summary.nps >= 0 ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)' },
    { label: 'CSI Score', value: `${summary.csi}%`, icon: '🛎️', color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
  ] : [];

  const divertStatuses = summary ? [
    { status: 'open', label: 'Open', color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
    { status: 'sourcing', label: 'Sourcing', color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
    { status: 'available', label: 'Available', color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
    { status: 'closed', label: 'Closed', color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
    { status: 'cancelled', label: 'Cancelled', color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
  ] : [];

  return (
    <div className="page-container fade-in" style={{ background: 'transparent' }}>

      {/* ── Page Header ───────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="outfit" style={{ fontSize: '24px', fontWeight: 800, color: '#1a2744', letterSpacing: '-0.3px' }}>
            Reports & Analytics
          </h1>
          <p style={{ fontSize: '13px', color: '#8a7e6a', marginTop: '4px' }}>
            Date-range footfall trends, customer satisfaction, and divert resolution metrics
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={!summary}
          style={{
            padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
            background: summary ? 'linear-gradient(135deg, #0D9488 0%, #059669 100%)' : '#e8e0d0',
            color: summary ? '#FFFFFF' : '#8a7e6a', border: 'none', cursor: summary ? 'pointer' : 'default',
            boxShadow: summary ? '0 4px 14px rgba(13,148,136,0.3)' : 'none',
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.18s ease'
          }}
        >
          📥 Export Full CSV
        </button>
      </div>

      {/* ── Date Range Picker ─────────────────────────── */}
      <div style={{
        background: '#FFFFFF', border: '1px solid #e8e0d0', borderRadius: '14px',
        padding: '20px 24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(26,39,68,0.06)',
        display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a2744' }}>📅 Date Range</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#5a5044' }}>FROM</label>
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={e => setFromDate(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: '8px', border: '1px solid #d4c9b5',
                fontSize: '13px', color: '#1a2744', background: '#faf8f4',
                fontFamily: 'inherit', cursor: 'pointer'
              }}
            />
          </div>
          <span style={{ color: '#c5b89e' }}>→</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#5a5044' }}>TO</label>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              max={formatDateInput(new Date())}
              onChange={e => setToDate(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: '8px', border: '1px solid #d4c9b5',
                fontSize: '13px', color: '#1a2744', background: '#faf8f4',
                fontFamily: 'inherit', cursor: 'pointer'
              }}
            />
          </div>
        </div>

        {/* Quick Presets */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginLeft: 'auto' }}>
          {[
            { label: 'Today', days: 0 },
            { label: '7 Days', days: 6 },
            { label: '30 Days', days: 29 },
          ].map(preset => (
            <button
              key={preset.label}
              onClick={() => {
                const t = new Date();
                const f = new Date();
                f.setDate(t.getDate() - preset.days);
                setToDate(formatDateInput(t));
                setFromDate(formatDateInput(f));
              }}
              style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                background: '#f5f0e8', color: '#1a2744', border: '1px solid #d4c9b5',
                cursor: 'pointer', transition: 'all 0.15s ease'
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error State ──────────────────────────────── */}
      {error && (
        <div style={{
          background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)',
          borderRadius: '10px', padding: '14px 18px', marginBottom: '20px',
          fontSize: '13px', color: '#DC2626', fontWeight: 500
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Loading State ────────────────────────────── */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', gap: '12px' }}>
          <div className="spinner" style={{ width: '24px', height: '24px', borderWidth: '3px' }} />
          <span style={{ fontSize: '13px', color: '#8a7e6a', fontWeight: 500 }}>Loading analytics…</span>
        </div>
      )}

      {!loading && summary && (
        <>
          {/* ── KPI Summary Cards ──────────────────── */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
            {KPI_CARDS.map(k => (
              <div key={k.label} style={{
                background: '#FFFFFF', border: '1px solid #e8e0d0', borderRadius: '14px',
                padding: '18px 20px', borderTop: `3px solid ${k.color}`,
                boxShadow: '0 2px 8px rgba(26,39,68,0.06)', transition: 'all 0.2s ease'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                    {k.icon}
                  </div>
                </div>
                <div className="mono" style={{ fontSize: '28px', fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#1a2744', marginTop: '8px' }}>{k.label}</div>
              </div>
            ))}
          </section>

          {/* ── Footfall Trend Chart ───────────────── */}
          <section style={{
            background: '#FFFFFF', border: '1px solid #e8e0d0', borderRadius: '14px',
            padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(26,39,68,0.06)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 className="outfit" style={{ fontSize: '17px', fontWeight: 700, color: '#1a2744' }}>
                  Daily Footfall & Bills Trend
                </h3>
                <p style={{ fontSize: '12px', color: '#8a7e6a', marginTop: '2px' }}>
                  Solid line = visitors · Dashed line = bills count
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: 'rgba(37,99,235,0.08)', color: '#2563EB', border: '1px solid rgba(37,99,235,0.2)' }}>
                  Total: {summary.totalFootfall.toLocaleString()} visitors
                </span>
              </div>
            </div>
            {footfallByDay.length > 0 ? renderTrendChart() : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#c5b89e', fontSize: '13px' }}>
                No footfall data for this period
              </div>
            )}
          </section>

          {/* ── Two Column: Feedback + Diverts ──────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>

            {/* Feedback Analytics */}
            <section style={{
              background: '#FFFFFF', border: '1px solid #e8e0d0', borderRadius: '14px',
              padding: '24px', boxShadow: '0 2px 8px rgba(26,39,68,0.06)'
            }}>
              <h3 className="outfit" style={{ fontSize: '17px', fontWeight: 700, color: '#1a2744', marginBottom: '18px' }}>
                💬 Customer Satisfaction
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Total Responses', value: summary.totalFeedback, suffix: '', color: '#2563EB' },
                  { label: 'NPS Score', value: summary.nps, suffix: '%', color: summary.nps >= 0 ? '#16A34A' : '#DC2626', prefix: summary.nps > 0 ? '+' : '' },
                  { label: 'CSI Score', value: summary.csi, suffix: '%', color: '#7C3AED' },
                ].map(stat => (
                  <div key={stat.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', borderRadius: '10px', background: '#faf8f4',
                    border: '1px solid #f0e8dc'
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#5a5044' }}>{stat.label}</span>
                    <span className="mono" style={{ fontSize: '22px', fontWeight: 800, color: stat.color }}>
                      {(stat as any).prefix || ''}{stat.value}{stat.suffix}
                    </span>
                  </div>
                ))}
                {/* NPS Bar */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#8a7e6a', fontWeight: 600 }}>NPS GAUGE</span>
                    <span style={{ fontSize: '11px', color: '#8a7e6a' }}>-100 to +100</span>
                  </div>
                  <div style={{ height: '8px', background: '#f0e8dc', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.max(0, Math.min(100, ((summary.nps + 100) / 200) * 100))}%`,
                      height: '100%',
                      background: summary.nps >= 0
                        ? 'linear-gradient(90deg, #16A34A, #22C55E)'
                        : 'linear-gradient(90deg, #DC2626, #EF4444)',
                      borderRadius: '4px', transition: 'width 0.6s ease'
                    }} />
                  </div>
                </div>
              </div>
            </section>

            {/* Divert Resolution */}
            <section style={{
              background: '#FFFFFF', border: '1px solid #e8e0d0', borderRadius: '14px',
              padding: '24px', boxShadow: '0 2px 8px rgba(26,39,68,0.06)'
            }}>
              <h3 className="outfit" style={{ fontSize: '17px', fontWeight: 700, color: '#1a2744', marginBottom: '18px' }}>
                📦 Divert Resolution
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {divertStatuses.map(ds => {
                  const count = summary.divertSummary[ds.status] || 0;
                  const total = Object.values(summary.divertSummary).reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={ds.status}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                            background: ds.bg, color: ds.color, textTransform: 'uppercase'
                          }}>
                            {ds.label}
                          </span>
                        </div>
                        <span className="mono" style={{ fontSize: '16px', fontWeight: 800, color: ds.color }}>
                          {count}
                          <span style={{ fontSize: '11px', color: '#8a7e6a', fontWeight: 500, marginLeft: '4px' }}>({pct}%)</span>
                        </span>
                      </div>
                      <div style={{ height: '5px', background: '#f0e8dc', borderRadius: '3px' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: ds.color, borderRadius: '3px', opacity: 0.7, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(summary.divertSummary).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#c5b89e', fontSize: '13px' }}>
                    No diverts in this period
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ── Daily Breakdown Table ─────────────────── */}
          <section style={{
            background: '#FFFFFF', border: '1px solid #e8e0d0', borderRadius: '14px',
            padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(26,39,68,0.06)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 className="outfit" style={{ fontSize: '17px', fontWeight: 700, color: '#1a2744' }}>
                Day-by-Day Breakdown
              </h3>
              <span style={{ fontSize: '12px', color: '#8a7e6a' }}>{footfallByDay.length} days in range</span>
            </div>
            <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #e8e0d0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#1a2744' }}>
                    {['Date', 'Visitors', 'Bills', 'ABV (₹)', 'Conversion', 'Traffic Level'].map(h => (
                      <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {footfallByDay.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#c5b89e' }}>No footfall data for this period</td>
                    </tr>
                  ) : (
                    footfallByDay.map((row, idx) => {
                      const billsMap: Record<string, number> = {};
                      billsByDay.forEach(b => { billsMap[b.date] = Number(b.billsCount) || 0; });
                      const visitors = Number(row.totalVisitors) || 0;
                      const bills = billsMap[row.date] || 0;
                      const abv = bills > 0 ? Math.round(visitors / bills) : 0;
                      const conv = visitors > 0 ? Math.round((bills / visitors) * 100) : 0;
                      const level = visitors > 200 ? { label: '🔥 High', color: '#DC2626' } : visitors > 100 ? { label: '⚡ Moderate', color: '#D97706' } : { label: '💤 Light', color: '#6B7280' };
                      return (
                        <tr key={row.date} style={{ borderBottom: '1px solid #f0e8dc', background: idx % 2 === 0 ? '#FFFFFF' : '#faf8f4' }}>
                          <td className="mono" style={{ padding: '13px 18px', fontWeight: 700, color: '#1a2744' }}>{row.date}</td>
                          <td className="mono" style={{ padding: '13px 18px', fontSize: '16px', color: '#2563EB', fontWeight: 800 }}>{visitors.toLocaleString()}</td>
                          <td className="mono" style={{ padding: '13px 18px', color: '#0D9488', fontWeight: 700 }}>{bills || <span style={{ color: '#c5b89e' }}>—</span>}</td>
                          <td className="mono" style={{ padding: '13px 18px', color: '#7C3AED', fontWeight: 700 }}>{abv ? `₹${abv}` : <span style={{ color: '#c5b89e' }}>—</span>}</td>
                          <td style={{ padding: '13px 18px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: 'rgba(37,99,235,0.08)', color: '#2563EB' }}>
                              {conv}%
                            </span>
                          </td>
                          <td style={{ padding: '13px 18px', fontWeight: 600, color: level.color, fontSize: '13px' }}>{level.label}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Voice of Customer Panel ───────────────── */}
          {voices.length > 0 && (
            <section style={{
              background: '#1a2744', borderRadius: '14px', padding: '24px',
              boxShadow: '0 4px 16px rgba(26,39,68,0.15)'
            }}>
              <h3 className="outfit" style={{ fontSize: '17px', fontWeight: 700, color: '#FFFFFF', marginBottom: '16px' }}>
                🌟 Voice of Customer — Top Feedback
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {voices.slice(0, 6).map((v, i) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <p style={{ fontSize: '13px', color: '#CBD5E1', fontStyle: 'italic', marginBottom: '10px', lineHeight: 1.6 }}>
                      "{v.text}"
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#60A5FA' }}>— {v.name}</span>
                      <span style={{ fontSize: '11px', color: '#94A3B8' }}>{v.area} · {v.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {!loading && !summary && !error && (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: '#FFFFFF', borderRadius: '14px', border: '1px solid #e8e0d0'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#1a2744' }}>Select a date range to load your analytics</p>
          <p style={{ fontSize: '13px', color: '#8a7e6a', marginTop: '4px' }}>Footfall trends, feedback scores & divert summary will appear here</p>
        </div>
      )}
    </div>
  );
}
