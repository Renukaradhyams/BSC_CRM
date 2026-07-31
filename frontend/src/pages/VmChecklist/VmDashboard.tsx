import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface VmDashboardProps {
  userName: string;
  userRole: string;
  onNavigateToForm: (type: 'overall' | 'floor', floor?: string) => void;
  onNavigateToAdmin: () => void;
  onLogout: () => void;
}

interface TodaySubmission {
  id: number;
  type: string;
  floor: string | null;
  score: number;
  submittedBy: string;
  submittedAt: string | null;
  created_at: string;
}

const FLOORS = [
  { id: 'Ground Floor', label: 'Ground Floor', emoji: '🏪', color: '#10B981' },
  { id: 'First Floor', label: 'First Floor', emoji: '🏬', color: '#3B82F6' },
  { id: 'Second Floor', label: 'Second Floor', emoji: '🏢', color: '#8B5CF6' },
  { id: 'Third Floor', label: 'Third Floor', emoji: '🏗️', color: '#F59E0B' },
];

export default function VmDashboard({ userName, userRole, onNavigateToForm, onNavigateToAdmin, onLogout }: VmDashboardProps) {
  const [submissions, setSubmissions] = useState<TodaySubmission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const res = await api.get('/api/vm/submissions');
        if (res.data?.ok) {
          const todayStr = new Date().toISOString().slice(0, 10);
          const todayItems = res.data.submissions.filter((s: any) => {
            const d = s.created_at ? new Date(s.created_at).toISOString().slice(0, 10) : '';
            return d === todayStr;
          });
          setSubmissions(todayItems);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  const getFloorSubmission = (floorId: string) => {
    return submissions.find(s => s.type === 'floor' && s.floor === floorId);
  };

  const overallSubmission = submissions.find(s => s.type === 'overall');
  const isManager = userRole === 'manager' || userName.includes('MANAGER');

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#10B981';
    if (score >= 70) return '#F59E0B';
    return '#EF4444';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    return 'Needs Attention';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0F172A 0%, #1E2A3D 50%, #162032 100%)',
      padding: '0',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative background elements */}
      <div style={{
        position: 'absolute', top: '-100px', right: '-100px',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(20,184,166,0.07) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-100px', left: '-60px',
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(79,70,229,0.07) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* Header Bar */}
      <div style={{
        padding: '20px 28px',
        background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px', height: '44px',
            background: 'linear-gradient(135deg, #14B8A6, #0EA5E9)',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px',
            boxShadow: '0 6px 16px rgba(20,184,166,0.3)'
          }}>🏢</div>
          <div>
            <h1 className="outfit" style={{ fontSize: '18px', fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>
              VM Checklist
            </h1>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
              {today}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #14B8A6, #0EA5E9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 800, color: '#FFFFFF'
            }}>
              {userName.charAt(0)}
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>{userName}</span>
          </div>

          {isManager && (
            <button
              onClick={onNavigateToAdmin}
              style={{
                background: 'rgba(79,70,229,0.2)',
                border: '1px solid rgba(79,70,229,0.4)',
                borderRadius: '10px',
                padding: '8px 14px',
                color: '#A5B4FC',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ⚙️ Admin
            </button>
          )}

          <button
            onClick={onLogout}
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '10px',
              padding: '8px 14px',
              color: '#F87171',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: '28px', maxWidth: '900px', margin: '0 auto' }} className="fade-in">
        {/* Summary Stats Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '14px',
          marginBottom: '28px'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            padding: '16px 18px'
          }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Checklists Done Today
            </div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#14B8A6', marginTop: '6px', lineHeight: 1 }}>
              {loading ? '—' : submissions.length}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
              of {FLOORS.length + 1} total
            </div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            padding: '16px 18px'
          }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Avg Score
            </div>
            <div style={{
              fontSize: '32px', fontWeight: 900, marginTop: '6px', lineHeight: 1,
              color: submissions.length > 0 ? getScoreColor((submissions.reduce((a, s) => a + Number(s.score), 0) / submissions.length) * 20) : 'rgba(255,255,255,0.3)'
            }}>
              {loading || submissions.length === 0
                ? '—'
                : `${Math.round((submissions.reduce((a, s) => a + Number(s.score), 0) / submissions.length) * 20)}%`}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
              {submissions.length > 0 ? getScoreLabel((submissions.reduce((a, s) => a + Number(s.score), 0) / submissions.length) * 20) : 'No data yet'}
            </div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            padding: '16px 18px'
          }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Floors Pending
            </div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#F59E0B', marginTop: '6px', lineHeight: 1 }}>
              {loading ? '—' : FLOORS.filter(f => !getFloorSubmission(f.id)).length}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
              floor checklists
            </div>
          </div>
        </div>

        {/* Overall Store Audit Card */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
            OVERALL STORE AUDIT
          </h3>
          <div
            onClick={() => onNavigateToForm('overall')}
            style={{
              background: overallSubmission
                ? 'rgba(16,185,129,0.1)'
                : 'rgba(255,255,255,0.05)',
              border: overallSubmission
                ? '1px solid rgba(16,185,129,0.3)'
                : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '20px 24px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => { if (!overallSubmission) { e.currentTarget.style.background = 'rgba(20,184,166,0.08)'; e.currentTarget.style.borderColor = 'rgba(20,184,166,0.3)'; }}}
            onMouseLeave={(e) => { if (!overallSubmission) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px',
                background: overallSubmission ? 'rgba(16,185,129,0.2)' : 'rgba(20,184,166,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px'
              }}>🏪</div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
                  Overall Store Checklist
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                  {overallSubmission ? `Completed by ${overallSubmission.submittedBy}` : 'Daily store-wide VM audit'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {overallSubmission ? (
                <>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '22px', fontWeight: 900, color: getScoreColor(overallSubmission.score * 20) }}>
                      {Math.round(overallSubmission.score * 20)}%
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                      {overallSubmission.submittedAt
                        ? new Date(overallSubmission.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : new Date(overallSubmission.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(16,185,129,0.2)',
                    border: '1px solid rgba(16,185,129,0.4)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    color: '#10B981',
                    fontSize: '11px',
                    fontWeight: 800
                  }}>✅ Done</div>
                </>
              ) : (
                <div style={{
                  background: 'rgba(20,184,166,0.15)',
                  border: '1px solid rgba(20,184,166,0.3)',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  color: '#2DD4BF',
                  fontSize: '12px',
                  fontWeight: 800
                }}>
                  Start Audit →
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floor Checklists Grid */}
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
            FLOOR-SPECIFIC CHECKLISTS
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '14px'
          }}>
            {FLOORS.map(floor => {
              const sub = getFloorSubmission(floor.id);
              return (
                <div
                  key={floor.id}
                  onClick={() => onNavigateToForm('floor', floor.id)}
                  style={{
                    background: sub ? `rgba(${floor.color === '#10B981' ? '16,185,129' : floor.color === '#3B82F6' ? '59,130,246' : floor.color === '#8B5CF6' ? '139,92,246' : '245,158,11'},0.1)` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${sub ? floor.color + '44' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '16px',
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${floor.color}22`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {/* Color accent bar */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    height: '3px',
                    background: floor.color,
                    borderRadius: '16px 16px 0 0',
                    opacity: sub ? 1 : 0.35
                  }} />

                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>{floor.emoji}</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', marginBottom: '4px' }}>{floor.label}</div>

                  {sub ? (
                    <>
                      <div style={{ fontSize: '22px', fontWeight: 900, color: getScoreColor(sub.score * 20), lineHeight: 1, marginBottom: '4px' }}>
                        {Math.round(sub.score * 20)}%
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                        {sub.submittedAt
                          ? new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : new Date(sub.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {sub.submittedBy}
                      </div>
                      <div style={{
                        display: 'inline-block',
                        marginTop: '10px',
                        background: 'rgba(16,185,129,0.2)',
                        border: '1px solid rgba(16,185,129,0.35)',
                        borderRadius: '6px', padding: '3px 8px',
                        color: '#10B981', fontSize: '11px', fontWeight: 800
                      }}>✅ Complete</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '12px' }}>
                        Not submitted today
                      </div>
                      <div style={{
                        display: 'inline-block',
                        background: `${floor.color}22`,
                        border: `1px solid ${floor.color}44`,
                        borderRadius: '6px', padding: '4px 10px',
                        color: floor.color, fontSize: '11px', fontWeight: 800
                      }}>
                        Start →
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
