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
  const [selectedFeedbackDate, setSelectedFeedbackDate] = useState<string>('');
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
        const res = await api.get('/api/crm/feedbacks');
        if (res.data && res.data.ok) {
          setFeedbacks(res.data.feedbacks || []);
        }
      } else {
        const res = await api.get('/api/crm/call-queue');
        if (res.data && res.data.ok) {
          setQueue(res.data.queue || []);
        }
      }
    } catch {
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
        followupDate: followupDate || null,
        escalated
      });

      if (res.data && res.data.ok) {
        setSuccess('Completed: Call queue follow-up status saved successfully!');
        setEditingItem(null);
        fetchData();
      } else {
        setError(res.data?.error || 'Failed to update status.');
      }
    } catch {
      setError('Error saving call update.');
    } finally {
      setSavingCall(false);
    }
  };

  const handleDownloadFeedbackCSV = () => {
    if (feedbacks.length === 0) return;
    const headers = "ID,Date,Source,Area,Customer Name,Mobile,Rating (Q0),Recommend (Q1),Customer Voice,Status\n";
    const rows = feedbacks.map(f => [
      f.id,
      `"${f.date || ''}"`,
      `"${f.source || ''}"`,
      `"${f.area || ''}"`,
      `"${(f.custName || '').replace(/"/g, '""')}"`,
      `"${f.custMobile || ''}"`,
      `"${(f.q0 || '').replace(/"/g, '""')}"`,
      `"${(f.q1 || '').replace(/"/g, '""')}"`,
      `"${(f.yourVoice || '').replace(/"/g, '""')}"`,
      `"${f.status || ''}"`
    ].join(',')).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Customer_Feedback_Report_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-container fade-in">
      {/* Top Page Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="outfit" style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
            Customer Voice & Feedback List
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            Review customer CSI experience entries and manage negative feedback call desk
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', maxWidth: '100%' }}>
          <div className="scroll-tabs" style={{ display: 'flex', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '4px' }}>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                background: activeTab === 'all' ? '#4F46E5' : 'transparent',
                color: activeTab === 'all' ? '#FFFFFF' : '#64748B',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              📋 All Feedbacks ({feedbacks.length})
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                background: activeTab === 'queue' ? '#4F46E5' : 'transparent',
                color: activeTab === 'queue' ? '#FFFFFF' : '#64748B',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              📞 Call Queue ({queue.length})
            </button>
          </div>

          {activeTab === 'all' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF', padding: '6px 12px', borderRadius: '10px', border: '1px solid #CBD5E1' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>📅 Filter Date:</span>
                <input
                  type="date"
                  value={selectedFeedbackDate}
                  onChange={(e) => setSelectedFeedbackDate(e.target.value)}
                  style={{ border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 700, color: '#4F46E5', cursor: 'pointer' }}
                />
                {selectedFeedbackDate && (
                  <button
                    onClick={() => setSelectedFeedbackDate('')}
                    style={{ background: '#F1F5F9', border: 'none', borderRadius: '6px', fontSize: '11px', padding: '2px 6px', color: '#64748B', cursor: 'pointer' }}
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              <button
                onClick={handleDownloadFeedbackCSV}
                disabled={feedbacks.length === 0}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  background: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(16,185,129,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                📥 Export CSV Report
              </button>
            </div>
          )}
        </div>
      </div>


      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="spinner" style={{ width: '28px', height: '28px' }} />
        </div>
      ) : activeTab === 'all' ? (
        /* Full Width Table Card */
        <div className="glass-card" style={{ padding: '24px', width: '100%' }}>
          {feedbacks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px', background: '#FAF7F2', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>No customer feedback entries collected yet</p>
              <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                Feedback submitted via QR code or greeter desk will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="data-table-wrap" style={{ width: '100%' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Guest Name</th>
                    <th>Location / Section</th>
                    <th>Rating (Q0)</th>
                    <th>Customer Voice Note</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbacks
                    .filter(f => {
                      if (!selectedFeedbackDate) return true;
                      // Date in DB is DD/MM/YYYY or YYYY-MM-DD
                      const parts = selectedFeedbackDate.split('-');
                      const targetDdmmyyyy = `${parts[2]}/${parts[1]}/${parts[0]}`;
                      return f.date === targetDdmmyyyy || f.date === selectedFeedbackDate;
                    })
                    .map((f) => (
                    <tr key={f.id}>

                      <td className="mono" style={{ fontWeight: 800, color: '#0F172A', fontSize: '12px' }}>
                        {f.date}
                      </td>
                      <td style={{ fontWeight: 700, color: '#0F172A' }}>
                        {f.custName || 'Anonymous Guest'}
                        {f.custMobile && <div className="mono" style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>{f.custMobile}</div>}
                      </td>
                      <td style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                        {f.area || 'Ground Floor'}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: f.q0 === 'Excellent' || f.q0 === 'Good' ? '#D1FAE5' : f.q0 === 'Poor' || f.q0 === 'Very Poor' ? '#FEE2E2' : '#FEF3C7',
                            color: f.q0 === 'Excellent' || f.q0 === 'Good' ? '#059669' : f.q0 === 'Poor' || f.q0 === 'Very Poor' ? '#DC2626' : '#D97706'
                          }}
                        >
                          {f.q0 || 'N/A'}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', color: '#334155', fontStyle: 'italic', maxWidth: '340px' }}>
                        {f.yourVoice ? `"${f.yourVoice}"` : '—'}
                      </td>
                      <td>
                        <span
                          style={{
                            background: f.status === 'resolved' ? '#D1FAE5' : '#EEF2FF',
                            color: f.status === 'resolved' ? '#059669' : '#4F46E5',
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            textTransform: 'uppercase'
                          }}
                        >
                          {f.status || 'NEW'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Call Queue Table Card */
        <div className="glass-card" style={{ padding: '24px', width: '100%' }}>
          {queue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px', background: '#FAF7F2', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📞</div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>No pending negative follow-up calls in queue</p>
              <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                All negative feedback entries have been resolved!
              </p>
            </div>
          ) : (
            <div className="data-table-wrap" style={{ width: '100%' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer Name</th>
                    <th>Phone</th>
                    <th>Issue Summary</th>
                    <th>Attempts</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((q) => (
                    <tr key={q.id}>
                      <td className="mono" style={{ fontWeight: 800, color: '#0F172A', fontSize: '12px' }}>
                        {q.feedback?.date}
                      </td>
                      <td style={{ fontWeight: 700, color: '#0F172A' }}>
                        {q.feedback?.custName || 'Guest'}
                      </td>
                      <td className="mono" style={{ fontSize: '12px', color: '#4F46E5', fontWeight: 700 }}>
                        {q.feedback?.custMobile || 'N/A'}
                      </td>
                      <td style={{ fontSize: '12px', color: '#475569', maxWidth: '280px' }}>
                        {q.feedback?.yourVoice || 'Low CSI rating submitted'}
                      </td>
                      <td className="mono" style={{ fontSize: '12px', textAlign: 'center' }}>
                        {q.callAttempts}
                      </td>
                      <td>
                        <span
                          style={{
                            background: q.isDone ? '#D1FAE5' : '#FEF3C7',
                            color: q.isDone ? '#059669' : '#D97706',
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px'
                          }}
                        >
                          {q.callStatus || (q.isDone ? 'RESOLVED' : 'PENDING')}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleOpenCallModal(q)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            background: '#4F46E5',
                            color: '#FFFFFF',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          📞 Follow Up
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Call Update Modal */}
      {editingItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div className="glass-card fade-in" style={{ width: '460px', maxWidth: '100%', padding: '24px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="outfit" style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                📞 Update Call Follow-up Status
              </h3>
              <button onClick={() => setEditingItem(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSaveCallStatus}>
              <div className="field">
                <label>Call Status Outcome <span className="req">*</span></label>
                <select value={callStatus} onChange={(e) => setCallStatus(e.target.value)}>
                  <option value="issue_resolved">✅ Issue Resolved (Satisfied)</option>
                  <option value="customer_unreachable">📵 Customer Unreachable</option>
                  <option value="followup_required">📅 Follow-up Required Later</option>
                  <option value="escalated_to_management">🚨 Escalated to Store Manager</option>
                </select>
              </div>

              <div className="field">
                <label>Call Log Notes / Customer Response</label>
                <textarea
                  rows={3}
                  placeholder="Enter notes from the call..."
                  value={callNote}
                  onChange={(e) => setCallNote(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Follow-up Date (If required)</label>
                <input
                  type="date"
                  value={followupDate}
                  onChange={(e) => setFollowupDate(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCall}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#4F46E5', border: 'none', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
                >
                  {savingCall ? 'Saving...' : '💾 Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
