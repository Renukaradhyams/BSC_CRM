import React, { useEffect, useState } from 'react';
import api from '../../services/api';

interface VmFormProps {
  type: 'overall' | 'floor';
  floor?: string;
  userName: string;
  onBack: () => void;
}

interface Point {
  point_no: number;
  aspect: string;
  point: string;
  frequency: string;
  floor?: string | null;
}

interface FormEntry {
  point_no: number;
  value: 'yes' | 'no' | 'na' | '';
  remarks: string;
  photo_link: string;
}

const FLOOR_EMOJI: Record<string, string> = {
  'Ground Floor': '🏪',
  'First Floor': '🏬',
  'Second Floor': '🏢',
  'Third Floor': '🏗️',
  'overall': '🏪',
};

const FLOOR_COLOR: Record<string, string> = {
  'Ground Floor': '#10B981',
  'First Floor': '#3B82F6',
  'Second Floor': '#8B5CF6',
  'Third Floor': '#F59E0B',
};

export default function VmForm({ type, floor, userName, onBack }: VmFormProps) {
  const [points, setPoints] = useState<Point[]>([]);
  const [entries, setEntries] = useState<{ [key: number]: FormEntry }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedScore, setSubmittedScore] = useState<number | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string>('');

  const floorColor = floor ? FLOOR_COLOR[floor] : '#14B8A6';
  const floorEmoji = floor ? FLOOR_EMOJI[floor] : '🏪';

  useEffect(() => {
    fetchChecklistPoints();
  }, [type, floor]);

  const fetchChecklistPoints = async () => {
    try {
      setLoading(true);
      // Request floor-specific questions when floor is provided
      const queryParam = floor ? `type=floor&floor=${encodeURIComponent(floor)}` : `type=${type}`;
      const res = await api.get(`/api/vm/points?${queryParam}`);
      if (res.data?.ok) {
        const pts: Point[] = res.data.points || [];
        setPoints(pts);

        const initial: Record<number, FormEntry> = {};
        pts.forEach(p => {
          initial[p.point_no] = { point_no: p.point_no, value: '', remarks: '', photo_link: '' };
        });
        setEntries(initial);
      }
    } catch {
      setError('Failed to fetch checklist points.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectValue = (pointNo: number, val: 'yes' | 'no' | 'na') => {
    setEntries(prev => ({ ...prev, [pointNo]: { ...prev[pointNo], value: val } }));
  };

  const handleTextChange = (pointNo: number, text: string) => {
    setEntries(prev => ({ ...prev, [pointNo]: { ...prev[pointNo], remarks: text } }));
  };

  const handleFileUpload = (pointNo: number) => {
    const mockUrl = `https://picsum.photos/400/300?random=${pointNo}`;
    setEntries(prev => ({ ...prev, [pointNo]: { ...prev[pointNo], photo_link: mockUrl } }));
  };

  const answeredCount = Object.values(entries).filter(e => e.value !== '').length;
  const progress = points.length > 0 ? (answeredCount / points.length) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const unanswered = points.some(p => !entries[p.point_no]?.value);
    if (unanswered) {
      setError('Please answer all checklist items before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      const now = new Date().toISOString();
      const dataPayload = points.map(p => entries[p.point_no]);

      const res = await api.post('/api/vm/submit', {
        action: type === 'floor' ? 'submit_floor' : 'submit_overall',
        submitted_by: userName,
        floor: floor || null,
        submitted_at: now,
        data: JSON.stringify(dataPayload)
      });

      if (res.data?.ok) {
        const scoreNum = parseFloat(res.data.score) || 0;
        const scorePercent = Math.round((scoreNum / 5) * 100);
        setSubmittedScore(scorePercent);
        setSubmittedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setSuccess('');
        setTimeout(onBack, 3500);
      }
    } catch {
      setError('Failed to submit compliance list. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Score result screen
  if (submittedScore !== null) {
    const scoreColor = submittedScore >= 90 ? '#10B981' : submittedScore >= 70 ? '#F59E0B' : '#EF4444';
    const scoreLabel = submittedScore >= 90 ? 'Excellent! 🎉' : submittedScore >= 70 ? 'Good! 👍' : 'Needs Attention ⚠️';

    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0F172A 0%, #1E2A3D 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px'
      }}>
        <div className="fade-in" style={{
          textAlign: 'center', maxWidth: '400px', width: '100%'
        }}>
          <div style={{
            width: '100px', height: '100px', borderRadius: '50%',
            background: `${scoreColor}22`, border: `4px solid ${scoreColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '40px', margin: '0 auto 20px auto',
            boxShadow: `0 0 40px ${scoreColor}44`
          }}>
            {submittedScore >= 90 ? '🏆' : submittedScore >= 70 ? '✅' : '⚠️'}
          </div>
          <h2 className="outfit" style={{ fontSize: '24px', fontWeight: 900, color: '#FFFFFF', marginBottom: '8px' }}>
            Audit Submitted!
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '20px' }}>
            {type === 'floor' ? `${floor} Checklist` : 'Overall Store Audit'}
          </p>
          <div style={{
            fontSize: '64px', fontWeight: 900, lineHeight: 1,
            color: scoreColor, marginBottom: '8px',
            textShadow: `0 0 30px ${scoreColor}66`
          }}>
            {submittedScore}%
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: scoreColor, marginBottom: '8px' }}>{scoreLabel}</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '24px' }}>
            Submitted at {submittedAt} by {userName}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Returning to dashboard in 3 seconds...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0F172A 0%, #1E2A3D 100%)',
      padding: '0'
    }}>
      {/* Header */}
      <div style={{
        padding: '18px 28px',
        background: 'rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: `${floorColor}22`,
            border: `1px solid ${floorColor}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px'
          }}>
            {floorEmoji}
          </div>
          <div>
            <h2 className="outfit" style={{ fontSize: '16px', fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>
              {type === 'overall' ? 'Overall Store Audit' : `${floor} — VM Audit`}
            </h2>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>
              {answeredCount} of {points.length} answered · {userName}
            </p>
          </div>
        </div>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px', padding: '8px 16px', color: 'rgba(255,255,255,0.6)',
            fontSize: '12px', fontWeight: 700, cursor: 'pointer'
          }}
        >
          ← Cancel
        </button>
      </div>

      {/* Progress Bar */}
      <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px 28px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Progress
          </span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: floorColor }}>
            {Math.round(progress)}% Complete
          </span>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '6px', height: '6px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '6px',
            background: `linear-gradient(90deg, ${floorColor}, ${floorColor}cc)`,
            width: `${progress}%`,
            transition: 'width 0.3s ease',
            boxShadow: `0 0 8px ${floorColor}66`
          }} />
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: '24px 28px', maxWidth: '760px', margin: '0 auto' }} className="fade-in">
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '12px', padding: '12px 16px', marginBottom: '16px',
            color: '#F87171', fontSize: '13px', fontWeight: 700
          }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
            <div className="spinner" />
          </div>
        ) : points.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 40px',
            background: 'rgba(255,255,255,0.04)', borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
              No checklist points configured
            </h3>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
              Ask your admin to add VM checklist points for {floor || 'this category'}.
            </p>
            <button onClick={onBack} style={{
              marginTop: '20px', padding: '10px 24px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#FFFFFF', fontWeight: 700, fontSize: '13px', cursor: 'pointer'
            }}>
              ← Go Back
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {points.map((p, idx) => {
              const current = entries[p.point_no];
              const val = current?.value || '';

              return (
                <div
                  key={idx}
                  style={{
                    background: val === 'yes' ? 'rgba(16,185,129,0.08)' : val === 'no' ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${val === 'yes' ? 'rgba(16,185,129,0.25)' : val === 'no' ? 'rgba(239,68,68,0.25)' : val === 'na' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '14px',
                    padding: '18px 20px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Question header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                      <span style={{
                        width: '26px', height: '26px', borderRadius: '8px',
                        background: floorColor + '22',
                        border: `1px solid ${floorColor}44`,
                        color: floorColor,
                        fontSize: '11px', fontWeight: 900,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {idx + 1}
                      </span>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                          {p.aspect}
                        </div>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF', lineHeight: 1.4, margin: 0 }}>
                          {p.point}
                        </p>
                      </div>
                    </div>
                    <span style={{
                      background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px', padding: '3px 8px',
                      color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 700,
                      flexShrink: 0, marginLeft: '12px'
                    }}>
                      ⏱ {p.frequency}
                    </span>
                  </div>

                  {/* Answer buttons */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    {([
                      { v: 'yes', label: '✅ Compliant', bg: '#10B981', bgLight: 'rgba(16,185,129,0.2)', border: 'rgba(16,185,129,0.4)' },
                      { v: 'no', label: '❌ Failed', bg: '#EF4444', bgLight: 'rgba(239,68,68,0.2)', border: 'rgba(239,68,68,0.4)' },
                      { v: 'na', label: '➖ N/A', bg: '#64748B', bgLight: 'rgba(100,116,139,0.2)', border: 'rgba(100,116,139,0.4)' }
                    ] as const).map(opt => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => handleSelectValue(p.point_no, opt.v as 'yes' | 'no' | 'na')}
                        style={{
                          padding: '8px 14px', borderRadius: '8px',
                          fontSize: '12px', fontWeight: 800,
                          background: val === opt.v ? opt.bg : opt.bgLight,
                          color: val === opt.v ? '#FFFFFF' : opt.bg,
                          border: `1px solid ${val === opt.v ? opt.bg : opt.border}`,
                          cursor: 'pointer', transition: 'all 0.15s ease'
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Fail panel */}
                  {val === 'no' && (
                    <div className="fade-in" style={{
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: '10px', padding: '14px', marginTop: '12px'
                    }}>
                      <div style={{ color: '#F87171', fontSize: '12px', fontWeight: 800, marginBottom: '10px' }}>
                        ⚠️ Failed — remark required
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                          type="text"
                          placeholder="Describe issue / corrective action..."
                          value={current?.remarks || ''}
                          onChange={(e) => handleTextChange(p.point_no, e.target.value)}
                          style={{
                            flex: 1, padding: '8px 12px', borderRadius: '8px',
                            border: '1px solid rgba(239,68,68,0.3)',
                            background: 'rgba(255,255,255,0.05)',
                            color: '#FFFFFF', fontSize: '13px',
                            outline: 'none'
                          }}
                        />
                        {current?.photo_link ? (
                          <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                            📸 Attached
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleFileUpload(p.point_no)}
                            style={{
                              padding: '8px 12px', borderRadius: '8px',
                              background: 'rgba(255,255,255,0.08)',
                              border: '1px solid rgba(255,255,255,0.15)',
                              color: 'rgba(255,255,255,0.7)', fontSize: '12px',
                              fontWeight: 700, cursor: 'pointer', flexShrink: 0
                            }}
                          >
                            📷 Photo
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitting || answeredCount < points.length}
              style={{
                width: '100%', padding: '14px',
                borderRadius: '14px',
                background: answeredCount >= points.length
                  ? `linear-gradient(135deg, ${floorColor}, ${floorColor}cc)`
                  : 'rgba(255,255,255,0.07)',
                color: '#FFFFFF', fontSize: '14px', fontWeight: 900,
                border: 'none',
                cursor: answeredCount >= points.length ? 'pointer' : 'not-allowed',
                boxShadow: answeredCount >= points.length ? `0 6px 20px ${floorColor}44` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                transition: 'all 0.2s ease',
                marginTop: '8px'
              }}
            >
              {submitting && <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />}
              {submitting ? 'Submitting Audit...' : answeredCount < points.length
                ? `⏳ Answer ${points.length - answeredCount} more to submit`
                : '🚀 Submit Compliance Audit'
              }
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
