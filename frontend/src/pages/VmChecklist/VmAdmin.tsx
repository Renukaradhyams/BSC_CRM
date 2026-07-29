import React, { useEffect, useState } from 'react';
import api from '../../services/api';

interface VmAdminProps {
  onNavigateToEdit: () => void;
  onBack: () => void;
}

interface ComplianceTrend {
  week: string;
  days_filled: number;
}

interface AspectReport {
  aspect: string;
  score: number;
}

export default function VmAdmin({ onNavigateToEdit, onBack }: VmAdminProps) {
  const [trends, setTrends] = useState<ComplianceTrend[]>([]);
  const [aspects, setAspects] = useState<AspectReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchComplianceReports();
  }, []);

  const fetchComplianceReports = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/vm/reports');
      if (res.data && res.data.ok) {
        setTrends(res.data.weekly_compliance || []);
        setAspects(res.data.aspect_report || []);
      }
    } catch (err) {
      setError('Failed to fetch VM compliance statistics.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }} className="fade-in">
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="serif" style={{ fontSize: '28px' }}>VM Compliance Admin</h1>
          <p style={{ fontSize: '14px', color: 'var(--ink-60)' }}>Review aspect logs and audit frequencies</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onNavigateToEdit} className="btn btn-teal">
            ⚙️ Edit Checklist Points
          </button>
          <button onClick={onBack} className="btn btn-ghost">
            ← Back Dashboard
          </button>
        </div>
      </header>

      {error && <div className="alert alert-error" style={{ display: 'block' }}>{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '160px' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          {/* Weekly audit logs card */}
          <div className="card" style={{ padding: '20px', border: '1.5px solid var(--border)' }}>
            <h3 className="serif" style={{ fontSize: '18px', marginBottom: '14px' }}>Weekly Audit Logs Compliance</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'var(--navy)', color: '#fff', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px' }}>Week Period</th>
                  <th style={{ padding: '12px 16px' }}>Days Audited (Out of 7)</th>
                </tr>
              </thead>
              <tbody>
                {trends.map((t, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-l)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{t.week}</td>
                    <td style={{ padding: '12px 16px' }}>{t.days_filled} Days</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Aspect compliance stats card */}
          <div className="card" style={{ padding: '20px', border: '1.5px solid var(--border)' }}>
            <h3 className="serif" style={{ fontSize: '18px', marginBottom: '14px' }}>Aspect Scores Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {aspects.map((asp, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                    <span>{asp.aspect}</span>
                    <span>{asp.score.toFixed(1)} / 5.0</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--border-l)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      background: asp.score >= 4.0 ? 'var(--green)' : asp.score >= 3.0 ? 'var(--orange)' : 'var(--crimson)',
                      width: `${(asp.score / 5.0) * 100}%`
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
