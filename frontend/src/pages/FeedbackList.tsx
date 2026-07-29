import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface FeedbackItem {
  id: number;
  date: string;
  source: string;
  area: string;
  yourVoice: string | null;
  custName: string | null;
  custMobile: string | null;
  custDob: string | null;
  q0: string | null;
  q1: string | null;
  status: string;
  actionTaken: string | null;
}

interface QueueItem {
  id: number;
  feedbackId: number;
  feedback: FeedbackItem;
  callType: string;
  callStatus: string | null;
  callNote: string | null;
  callAttempts: number;
  followupDate: string | null;
  escalated: boolean;
  isDone: boolean;
}

export default function FeedbackList() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'queue'>('all');
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Call Update State
  const [editingItem, setEditingItem] = useState<QueueItem | null>(null);
  const [callStatus, setCallStatus] = useState<string>('issue_resolved');
  const [callNote, setCallNote] = useState<string>('');
  const [followupDate, setFollowupDate] = useState<string>('');
  const [escalated, setEscalated] = useState<boolean>(false);
  const [savingCall, setSavingCall] = useState<boolean>(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      if (activeTab === 'all') {
        const res = await api.get('/api/crm/dashboard');
        if (res.data && res.data.ok) {
          // Fetch feedbacks list from dashboard mock aggregation
          // In production this fetches feedbacks table
          const listRes = await api.get('/api/crm/divert'); // fallback list or dashboard mock
          setFeedbacks(res.data.feedbacks || []);
        }
      } else {
        const res = await api.get('/api/crm/call-queue');
        if (res.data && res.data.ok) {
          setQueue(res.data.queue || []);
        }
      }
    } catch (err) {
      setError('Failed to fetch data list.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCallModal = (item: QueueItem) => {
    setEditingItem(item);
    setCallStatus(item.callStatus || 'issue_resolved');
    setCallNote(item.callNote || '');
    setFollowupDate(item.followupDate || '');
    setEscalated(item.escalated);
  };

  const handleSaveCallStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      setSavingCall(true);
      setError('');
      setSuccess('');

      const res = await api.put('/api/crm/call-queue/status', {
        id: editingItem.id,
        callStatus,
        callNote,
        followupDate,
        escalated
      });

      if (res.data && res.data.ok) {
        setSuccess('Call outcome successfully recorded!');
        setEditingItem(null);
        fetchData();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update call status.');
    } finally {
      setSavingCall(false);
    }
  };

  // WhatsApp template generator link
  const triggerWhatsApp = (mobile: string, name: string, status: string) => {
    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    let message = `Hello ${name || 'Customer'},\n\nWe noticed you had some concerns during your recent visit to BSC Belagavi store. We would love to address them and resolve your feedback.\n\nThank you,\nBSC Textiles Team`;

    if (status === 'issue_resolved') {
      message = `Hello ${name || 'Customer'},\n\nThank you for speaking with us. We are pleased to note that your concern has been resolved. We look forward to serving you again at BSC Textiles Belagavi!\n\nBest Regards,\nBSC Team`;
    }

    const encodedText = encodeURIComponent(message);
    const link = `https://wa.me/91${cleanMobile}?text=${encodedText}`;
    window.open(link, '_blank');
  };

  return (
    <div className="glass-card fade-in" style={{ padding: '24px' }}>
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="serif" style={{ fontSize: '28px' }}>Feedback Portal</h1>
          <p style={{ fontSize: '14px', color: 'var(--ink-60)' }}>View customer CSI logs and telecaller action queues</p>
        </div>

        {/* Tab switchers */}
        <div style={{ display: 'flex', background: 'var(--border-l)', borderRadius: '24px', padding: '4px' }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '8px 18px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              background: activeTab === 'all' ? 'var(--navy)' : 'transparent',
              color: activeTab === 'all' ? '#fff' : 'var(--ink-60)',
              transition: 'background 0.15s'
            }}
          >
            📋 All Feedbacks
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            style={{
              padding: '8px 18px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              background: activeTab === 'queue' ? 'var(--navy)' : 'transparent',
              color: activeTab === 'queue' ? '#fff' : 'var(--ink-60)',
              transition: 'background 0.15s'
            }}
          >
            📞 Call Queue ({queue.length})
          </button>
        </div>
      </header>

      {error && <div className="alert alert-error" style={{ display: 'block' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ display: 'block' }}>{success}</div>}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <div className="spinner"></div>
        </div>
      ) : activeTab === 'all' ? (
        /* Tab 1: All Feedbacks table */
        <section className="glass-card" style={{ padding: '20px', border: '1.5px solid var(--border)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'var(--navy)', color: '#fff', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px' }}>Date</th>
                  <th style={{ padding: '12px 16px' }}>Guest Name</th>
                  <th style={{ padding: '12px 16px' }}>Location</th>
                  <th style={{ padding: '12px 16px' }}>CSI (Rating)</th>
                  <th style={{ padding: '12px 16px' }}>Comment Voice</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.length > 0 ? (
                  feedbacks.map((f) => (
                    <tr key={f.id} style={{ borderBottom: '1px solid var(--border-l)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{f.date}</td>
                      <td style={{ padding: '12px 16px' }}>{f.custName || 'Anonymous'}</td>
                      <td style={{ padding: '12px 16px' }}>{f.area}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontWeight: 'bold',
                          color: f.q0?.toLowerCase().includes('excellent') || f.q0?.toLowerCase().includes('good') ? 'var(--green)' : 'var(--crimson)'
                        }}>
                          {f.q0 || 'N/A'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontStyle: 'italic', color: 'var(--ink-60)' }}>
                        {f.yourVoice || '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          background: f.status === 'closed' ? 'var(--green-l)' : 'var(--orange-l)',
                          color: f.status === 'closed' ? 'var(--green)' : 'var(--orange)'
                        }}>
                          {f.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-30)' }}>
                      No feedback logs available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        /* Tab 2: Call Queue Cards list */
        <section style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
          {queue.length > 0 ? (
            queue.map((item) => (
              <div
                key={item.id}
                className="card"
                style={{
                  padding: '16px',
                  border: '1.5px solid var(--border)',
                  background: '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '16px'
                }}
              >
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--navy)' }}>
                    👤 {item.feedback.custName || 'Anonymous Guest'}
                  </h4>
                  <div style={{ fontSize: '12px', color: 'var(--ink-60)', marginTop: '4px' }}>
                    📱 Mobile: {item.feedback.custMobile || 'N/A'} | 📅 Date: {item.feedback.date}
                  </div>
                  <div style={{ marginTop: '10px', padding: '10px', background: 'var(--crimson-l)', borderRadius: '8px', border: '1px solid rgba(192,57,43,0.1)' }}>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--crimson)' }}>
                      ⚠️ Issue reported:
                    </p>
                    <p style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--ink)' }}>
                      "{item.feedback.yourVoice || 'Unsatisfactory rating provided.'}"
                    </p>
                  </div>
                  {item.callAttempts > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--orange)', fontWeight: 'bold', marginTop: '8px' }}>
                      🔄 Call attempts: {item.callAttempts} | Note: {item.callNote || '—'}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleOpenCallModal(item)}
                    className="btn btn-teal btn-sm"
                  >
                    📞 Update Call Outcome
                  </button>
                  {item.feedback.custMobile && (
                    <button
                      onClick={() => triggerWhatsApp(item.feedback.custMobile!, item.feedback.custName || '', item.callStatus || '')}
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#25D366', borderColor: '#25D366' }}
                    >
                      💬 Send WhatsApp message
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="card" style={{ padding: '40px', textAlign: 'center', border: '1.5px solid var(--border)' }}>
              <h3 className="serif" style={{ color: 'var(--green)' }}>🎉 Clean Queue</h3>
              <p style={{ fontSize: '13px', color: 'var(--ink-60)', marginTop: '6px' }}>
                There are no negative feedback call entries requiring attention.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Call update Modal overlay */}
      {editingItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <form onSubmit={handleSaveCallStatus} className="card" style={{ padding: '24px', maxWidth: '400px', border: '1px solid var(--border)' }}>
            <h3 className="serif" style={{ fontSize: '20px', marginBottom: '16px' }}>
              Record Call Outcome
            </h3>

            <div className="field">
              <label>Call Status Outcome</label>
              <select value={callStatus} onChange={(e) => setCallStatus(e.target.value)}>
                <option value="issue_resolved">✅ Concern Resolved</option>
                <option value="will_visit">🗓️ Promised Visit</option>
                <option value="no_answer">📞 Ringing / No Answer</option>
                <option value="not_reachable">📵 Switch Off / Unreachable</option>
                <option value="not_satisfied">❌ Refused Resolution</option>
                <option value="thanked">🙏 Thank Call (Closed)</option>
              </select>
            </div>

            <div className="field">
              <label>Telecaller Summary Notes</label>
              <textarea
                placeholder="Details of call discussion..."
                value={callNote}
                onChange={(e) => setCallNote(e.target.value)}
                style={{ minHeight: '60px' }}
              />
            </div>

            <div className="field">
              <label>Follow-up Date (Optional)</label>
              <input
                type="date"
                value={followupDate}
                onChange={(e) => setFollowupDate(e.target.value)}
              />
            </div>

            <div className="field" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <input
                id="escalated"
                type="checkbox"
                checked={escalated}
                onChange={(e) => setEscalated(e.target.checked)}
                style={{ width: 'auto' }}
              />
              <label htmlFor="escalated" style={{ textTransform: 'none', margin: 0, fontSize: '13px' }}>
                Escalate issue to management
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="btn btn-ghost"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingCall}
                className="btn btn-teal"
                style={{ flex: 2 }}
              >
                {savingCall ? 'Saving...' : '💾 Save Status'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
