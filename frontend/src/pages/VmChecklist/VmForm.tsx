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
}

interface FormEntry {
  point_no: number;
  value: 'yes' | 'no' | 'na' | '';
  remarks: string;
  photo_link: string;
}

export default function VmForm({ type, floor, userName, onBack }: VmFormProps) {
  const [points, setPoints] = useState<Point[]>([]);
  const [entries, setEntries] = useState<{ [key: number]: FormEntry }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchChecklistPoints();
  }, []);

  const fetchChecklistPoints = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/vm/points?type=${type}`);
      if (res.data && res.data.ok) {
        const pts: Point[] = res.data.points || [];
        setPoints(pts);

        // Prepopulate empty answer entries
        const initial: any = {};
        pts.forEach(p => {
          initial[p.point_no] = {
            point_no: p.point_no,
            value: '',
            remarks: '',
            photo_link: ''
          };
        });
        setEntries(initial);
      }
    } catch (err) {
      setError('Failed to fetch checklist points.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectValue = (pointNo: number, val: 'yes' | 'no' | 'na') => {
    setEntries({
      ...entries,
      [pointNo]: { ...entries[pointNo], value: val }
    });
  };

  const handleTextChange = (pointNo: number, text: string) => {
    setEntries({
      ...entries,
      [pointNo]: { ...entries[pointNo], remarks: text }
    });
  };

  const handleFileUpload = (pointNo: number) => {
    // Standard mock image file capture slot
    const mockUrl = `https://picsum.photos/400/300?random=${pointNo}`;
    setEntries({
      ...entries,
      [pointNo]: { ...entries[pointNo], photo_link: mockUrl }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Check that all points are answered
    let unanswered = false;
    points.forEach(p => {
      if (!entries[p.point_no]?.value) {
        unanswered = true;
      }
    });

    if (unanswered) {
      setError('Please answer all checklist items before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      const dataPayload = points.map(p => entries[p.point_no]);

      const res = await api.post('/api/vm/submit', {
        action: type === 'floor' ? 'submit_floor' : 'submit_overall',
        submitted_by: userName,
        floor: floor || null,
        data: JSON.stringify(dataPayload)
      });

      if (res.data && res.data.ok) {
        setSuccess(`Audit submitted successfully! Score achieved: ${res.data.score}/5`);
        setTimeout(onBack, 2000);
      }
    } catch (err) {
      setError('Failed to submit compliance list.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '640px', margin: '0 auto' }} className="fade-in">
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="serif" style={{ fontSize: '28px' }}>
            📝 {type === 'overall' ? 'Store-Wide Audit' : `Audit: ${floor}`}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--ink-60)' }}>Complete Visual Merchandising checkpoints</p>
        </div>
        <button onClick={onBack} className="btn btn-ghost">
          ← Cancel
        </button>
      </header>

      {error && <div className="alert alert-error" style={{ display: 'block' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ display: 'block' }}>{success}</div>}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '160px' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {points.map((p, idx) => {
            const current = entries[p.point_no];
            const val = current?.value || '';

            return (
              <div key={idx} className="card" style={{ padding: '20px', marginBottom: '16px', border: '1.5px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-60)', fontWeight: 'bold' }}>
                    Aspect: {p.aspect}
                  </span>
                  <span style={{ fontSize: '10px', background: 'var(--border-l)', padding: '2px 6px', borderRadius: '4px', color: 'var(--ink-60)' }}>
                    ⏱️ {p.frequency}
                  </span>
                </div>

                <p style={{ fontSize: '15px', fontWeight: '500', marginBottom: '14px', lineHeight: '1.4' }}>
                  {p.point_no}. {p.point}
                </p>

                {/* Yes/No/NA selectors */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => handleSelectValue(p.point_no, 'yes')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      border: '1.5px solid var(--border)',
                      background: val === 'yes' ? 'var(--green)' : '#fff',
                      color: val === 'yes' ? '#fff' : 'var(--ink-60)',
                      cursor: 'pointer'
                    }}
                  >
                    Yes (Compliant)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectValue(p.point_no, 'no')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      border: '1.5px solid var(--border)',
                      background: val === 'no' ? 'var(--crimson)' : '#fff',
                      color: val === 'no' ? '#fff' : 'var(--ink-60)',
                      cursor: 'pointer'
                    }}
                  >
                    No (Failed Check)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectValue(p.point_no, 'na')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      border: '1.5px solid var(--border)',
                      background: val === 'na' ? 'var(--ink-30)' : '#fff',
                      color: val === 'na' ? '#fff' : 'var(--ink-60)',
                      cursor: 'pointer'
                    }}
                  >
                    N/A
                  </button>
                </div>

                {/* Failed aspect warning triggers */}
                {val === 'no' && (
                  <div className="fade-in" style={{
                    background: 'var(--crimson-l)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(192,57,43,0.15)',
                    marginTop: '10px'
                  }}>
                    <div style={{ color: 'var(--crimson)', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px' }}>
                      ⚠️ Aspect Fail: Photo upload & remark notes required!
                    </div>

                    <div className="field-row" style={{ marginBottom: 0 }}>
                      <div className="field" style={{ marginBottom: 0, flex: 2 }}>
                        <input
                          type="text"
                          placeholder="State remarks or corrective actions..."
                          value={current?.remarks || ''}
                          onChange={(e) => handleTextChange(p.point_no, e.target.value)}
                        />
                      </div>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                        {current?.photo_link ? (
                          <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 'bold' }}>
                            📸 Attached
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleFileUpload(p.point_no)}
                            className="btn btn-ghost btn-sm btn-full"
                          >
                            📷 Capture Photo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-teal btn-full"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {submitting && <span className="spinner"></span>}
            {submitting ? 'Submitting Audit...' : '🚀 Submit Compliance checklist'}
          </button>
        </form>
      )}
    </div>
  );
}
