import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface DivertItem {
  id: number;
  divertId: string;
  date: string;
  sectionId: string;
  sectionName: string;
  productWanted: string;
  qty: number | null;
  priceRange: string | null;
  fabricOccasion: string | null;
  comingBack: string;
  custName: string | null;
  custMobile: string | null;
  status: 'open' | 'sourcing' | 'available' | 'closed' | 'cannot_fulfill';
  pmAction: string | null;
  createdAt: string;
}

export default function PMView() {
  const { user } = useAuth();
  const [diverts, setDiverts] = useState<DivertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const [activeItem, setActiveItem] = useState<DivertItem | null>(null);
  const [actionText, setActionText] = useState<string>('');
  const [statusVal, setStatusVal] = useState<string>('sourcing');
  const [savingAction, setSavingAction] = useState<boolean>(false);

  useEffect(() => {
    fetchAssignedDiverts();
  }, []);

  const fetchAssignedDiverts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/crm/divert');
      if (res.data && res.data.ok) {
        const all: DivertItem[] = res.data.diverts || [];

        // PM Section filtering logic
        const assignedSections = user?.sectionsAssigned.split(',') || [];
        const isAll = assignedSections.includes('ALL');

        const filtered = all.filter(item => {
          return (isAll || assignedSections.includes(item.sectionId)) &&
                 ['open', 'sourcing', 'available'].includes(item.status);
        });

        setDiverts(filtered);
      }
    } catch (err) {
      setError('Failed to fetch assigned diverts.');
    } finally {
      setLoading(false);
    }
  };

  // Aging alerts calculation
  const getAgingBadge = (createdAtStr: string) => {
    const createdDate = new Date(createdAtStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 7) {
      return (
        <span style={{ background: 'var(--crimson-l)', color: 'var(--crimson)', fontSize: '10px', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
          🚨 Critical: {diffDays} Days Aging
        </span>
      );
    }
    if (diffDays >= 3) {
      return (
        <span style={{ background: 'var(--orange-l)', color: 'var(--orange)', fontSize: '10px', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
          ⚠️ Warning: {diffDays} Days Aging
        </span>
      );
    }
    return null;
  };

  const handleSavePMAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;

    try {
      setSavingAction(true);
      setError('');
      setSuccess('');

      const res = await api.put('/api/crm/divert', {
        id: activeItem.id,
        status: statusVal,
        pmAction: actionText,
        updateNote: `PM updated status to ${statusVal}. Note: ${actionText}`
      });

      if (res.data && res.data.ok) {
        setSuccess(`Successfully updated request ${activeItem.divertId}!`);
        setActiveItem(null);
        setActionText('');
        fetchAssignedDiverts();
      }
    } catch (err) {
      setError('Failed to log sourcing action.');
    } finally {
      setSavingAction(false);
    }
  };

  return (
    <div style={{ padding: '24px' }} className="fade-in">
      <header style={{ marginBottom: '24px' }}>
        <h1 className="serif" style={{ fontSize: '28px' }}>Sourcing Console</h1>
        <p style={{ fontSize: '14px', color: 'var(--ink-60)' }}>PM Section Dashboard: track, source, and deliver requests</p>
      </header>

      {error && <div className="alert alert-error" style={{ display: 'block' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ display: 'block' }}>{success}</div>}

      <section className="card" style={{ padding: '20px', border: '1.5px solid var(--border)' }}>
        <h3 className="serif" style={{ fontSize: '18px', marginBottom: '16px' }}>Active Sourcing Requests</h3>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '160px' }}>
            <div className="spinner"></div>
          </div>
        ) : diverts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {diverts.map(item => (
              <div
                key={item.id}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--border)',
                  background: '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '16px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--navy)' }}>
                      {item.productWanted} (x{item.qty || 1})
                    </h4>
                    {getAgingBadge(item.createdAt)}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-60)', marginTop: '4px' }}>
                    📦 Section: {item.sectionName} ({item.sectionId}) | 🏷️ Target Price: {item.priceRange || '—'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-60)' }}>
                    👤 Customer: {item.custName || 'Anonymous'} ({item.custMobile || '—'}) | 📅 Raised: {item.date}
                  </div>
                  {item.pmAction && (
                    <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--green)', fontWeight: 'bold' }}>
                      💼 Sourcing update: {item.pmAction}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '10px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    background: item.status === 'open' ? 'var(--crimson-l)' : 'var(--orange-l)',
                    color: item.status === 'open' ? 'var(--crimson)' : 'var(--orange)'
                  }}>
                    {item.status.toUpperCase()}
                  </span>
                  <button
                    onClick={() => {
                      setActiveItem(item);
                      setStatusVal(item.status);
                      setActionText(item.pmAction || '');
                    }}
                    className="btn btn-teal btn-sm"
                  >
                    📝 Log Sourcing
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--ink-30)', padding: '24px' }}>
            No assigned sourcing requests found for your sections.
          </p>
        )}
      </section>

      {/* Sourcing update Modal overlay */}
      {activeItem && (
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
          <form onSubmit={handleSavePMAction} className="card" style={{ padding: '24px', maxWidth: '400px', border: '1px solid var(--border)' }}>
            <h3 className="serif" style={{ fontSize: '20px', marginBottom: '8px' }}>
              Log Sourcing Action
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--ink-60)', marginBottom: '16px' }}>
              Item: <strong>{activeItem.productWanted}</strong>
            </p>

            <div className="field">
              <label>Update Sourcing Status</label>
              <select value={statusVal} onChange={(e) => setStatusVal(e.target.value)}>
                <option value="sourcing">📦 PM Sourcing (Procuring)</option>
                <option value="available">✅ Item Available in Store</option>
              </select>
            </div>

            <div className="field">
              <label>PM Sourcing Update Notes</label>
              <textarea
                placeholder="Details of sourcing update (e.g. Sourced from Bombay, arrives Friday)..."
                value={actionText}
                onChange={(e) => setActionText(e.target.value)}
                style={{ minHeight: '80px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="btn btn-ghost"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingAction}
                className="btn btn-teal"
                style={{ flex: 2 }}
              >
                {savingAction ? 'Saving...' : '💾 Save Sourcing'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
