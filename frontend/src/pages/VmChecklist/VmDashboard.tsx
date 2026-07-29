import React, { useEffect, useState } from 'react';
import api from '../../services/api';

interface VmDashboardProps {
  userName: string;
  userRole: string;
  onNavigateToForm: (type: 'overall' | 'floor', floor?: string) => void;
  onNavigateToAdmin: () => void;
  onLogout: () => void;
}

interface FloorStatus {
  floor: string;
  done: boolean;
  score: number;
  date: string | null;
}

export default function VmDashboard({ userName, userRole, onNavigateToForm, onNavigateToAdmin, onLogout }: VmDashboardProps) {
  const [overallDone, setOverallDone] = useState<boolean>(false);
  const [overallScore, setOverallScore] = useState<number>(0);
  const [floors, setFloors] = useState<FloorStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchDashboardDetails();
  }, []);

  const fetchDashboardDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/api/vm/dashboard?name=${userName}`);
      if (res.data && res.data.ok) {
        setOverallDone(res.data.overall_done);
        setOverallScore(res.data.overall_score);
        setFloors(res.data.floor_status || []);
      }
    } catch (err) {
      setError('Failed to load VM dashboard summaries.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }} className="fade-in">
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="serif" style={{ fontSize: '28px' }}>VM Dashboard</h1>
          <p style={{ fontSize: '14px', color: 'var(--ink-60)' }}>Logged in as: <strong>{userName}</strong> ({userRole})</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {userRole === 'admin' && (
            <button onClick={onNavigateToAdmin} className="btn btn-primary">
              ⚙️ Admin Dashboard
            </button>
          )}
          <button onClick={onLogout} className="btn btn-ghost">
            🚪 Exit VM
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
          {/* Daily Overall Checklist card */}
          <div className="card" style={{ padding: '20px', border: '1.5px solid var(--border)' }}>
            <h3 className="serif" style={{ fontSize: '18px', marginBottom: '8px' }}>Daily Overall Checklist</h3>
            <p style={{ fontSize: '13px', color: 'var(--ink-60)', marginBottom: '16px' }}>
              Checklist of VM aspects compiled store-wide.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '14px', color: 'var(--ink-60)' }}>Today's Status: </span>
                <span style={{
                  fontWeight: 'bold',
                  color: overallDone ? 'var(--green)' : 'var(--crimson)'
                }}>
                  {overallDone ? `✅ Completed (Score: ${overallScore}/5)` : '❌ Pending Submission'}
                </span>
              </div>
              <button
                onClick={() => onNavigateToForm('overall')}
                disabled={overallDone}
                className="btn btn-teal"
              >
                {overallDone ? 'Submitted Today' : '📝 Start Overall Checklist'}
              </button>
            </div>
          </div>

          {/* Floors list layout */}
          <div className="card" style={{ padding: '20px', border: '1.5px solid var(--border)' }}>
            <h3 className="serif" style={{ fontSize: '18px', marginBottom: '14px' }}>Floor Checklist Status (This Week)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {floors.map((fl) => (
                <div
                  key={fl.floor}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border)',
                    background: 'var(--white)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '15px' }}>🏢 {fl.floor}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--ink-60)' }}>
                      {fl.done ? `Score: ${fl.score}/5 · Filled: ${fl.date}` : 'Awaiting compliance checklist'}
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigateToForm('floor', fl.floor)}
                    className="btn btn-ghost btn-sm"
                    style={{ borderColor: fl.done ? 'var(--green)' : 'var(--border)' }}
                  >
                    {fl.done ? '🔄 Re-audit Floor' : '📝 Fill Floor Audit'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
