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
  reasonCode: string;
  detailedRemarks: string | null;
  comingBack: string;
  custName: string | null;
  custMobile: string | null;
  expectedDate: string | null;
  raisedBy: string;
  status: 'open' | 'sourcing' | 'available' | 'closed' | 'cannot_fulfill';
  pmAction: string | null;
  adminRemark: string | null;
  updates?: any[];
}

interface Section {
  sectionId: string;
  sectionName: string;
}

interface Reason {
  reasonId: string;
  reasonText: string;
}

export default function Divert() {
  const { user } = useAuth();
  const [diverts, setDiverts] = useState<DivertItem[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // New Divert State
  const [newDivert, setNewDivert] = useState({
    sectionId: '',
    productWanted: '',
    qty: '',
    priceRange: '',
    fabricOccasion: '',
    reasonCode: '',
    detailedRemarks: '',
    comingBack: 'No',
    custName: '',
    custMobile: '',
    expectedDate: ''
  });

  // Timeline Action State
  const [activeDivert, setActiveDivert] = useState<DivertItem | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string>('');
  const [updateNote, setUpdateNote] = useState<string>('');
  const [savingUpdate, setSavingUpdate] = useState<boolean>(false);

  useEffect(() => {
    fetchDiverts();
    fetchConfig();
  }, []);

  const fetchDiverts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/crm/divert');
      if (res.data && res.data.ok) {
        setDiverts(res.data.diverts || []);
      }
    } catch (err) {
      setError('Failed to fetch diverts list.');
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const secRes = await api.get('/api/crm/sections');
      if (secRes.data && secRes.data.ok) {
        setSections(secRes.data.sections || []);
        if (secRes.data.sections?.length > 0) {
          setNewDivert(prev => ({ ...prev, sectionId: secRes.data.sections[0].sectionId }));
        }
      }
      const reasonRes = await api.get('/api/crm/divert/reasons');
      let loadedReasons = [];
      if (reasonRes.data && reasonRes.data.ok && reasonRes.data.reasons?.length > 0) {
        loadedReasons = reasonRes.data.reasons;
      } else {
        loadedReasons = [
          { reasonId: 'R1', reasonText: 'Fabric out of stock' },
          { reasonId: 'R2', reasonText: 'Color variant unavailable' },
          { reasonId: 'R3', reasonText: 'Size variation mismatch' },
          { reasonId: 'R4', reasonText: 'Price range mismatch' },
          { reasonId: 'R5', reasonText: 'Design not available' }
        ];
      }
      setReasons(loadedReasons);
      setNewDivert(prev => ({ ...prev, reasonCode: loadedReasons[0].reasonId }));
    } catch (err) {
      console.error('Failed to load divert configurations', err);
    }
  };

  const handleCreateDivert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDivert.sectionId || !newDivert.productWanted || !newDivert.reasonCode) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    try {
      setError('');
      setSuccess('');
      // Find section name corresponding to code
      const section = sections.find(s => s.sectionId === newDivert.sectionId);
      const payload = {
        ...newDivert,
        sectionName: section ? section.sectionName : ''
      };

      const res = await api.post('/api/crm/divert', payload);
      if (res.data && res.data.ok) {
        setSuccess('Divert request logged successfully!');
        setShowAddForm(false);
        setNewDivert({
          sectionId: sections[0]?.sectionId || '',
          productWanted: '',
          qty: '',
          priceRange: '',
          fabricOccasion: '',
          reasonCode: reasons[0]?.reasonId || '',
          detailedRemarks: '',
          comingBack: 'No',
          custName: '',
          custMobile: '',
          expectedDate: ''
        });
        fetchDiverts();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit divert.');
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDivert) return;

    try {
      setSavingUpdate(true);
      setError('');

      const res = await api.put('/api/crm/divert', {
        id: activeDivert.id,
        status: updateStatus,
        updateNote
      });

      if (res.data && res.data.ok) {
        setSuccess('Divert timeline updated!');
        setActiveDivert(null);
        setUpdateNote('');
        fetchDiverts();
      }
    } catch (err) {
      setError('Failed to update divert status.');
    } finally {
      setSavingUpdate(false);
    }
  };

  // Determine if active user can edit updates
  const canUserManageDivert = (item: DivertItem): boolean => {
    if (!user) return false;
    const role = user.role;
    if (role === 'super_admin' || role === 'admin' || role === 'crm_manager') return true;

    // PMs check assigned sections
    if (role === 'purchase_manager') {
      const assigned = user.sectionsAssigned.split(',');
      return assigned.includes('ALL') || assigned.includes(item.sectionId);
    }

    return false;
  };

  return (
    <div className="glass-card fade-in" style={{ padding: '24px' }}>
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="serif" style={{ fontSize: '28px' }}>Divert Register</h1>
          <p style={{ fontSize: '14px', color: 'var(--ink-60)' }}>Track custom sourcing requests and PM inventory orders</p>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} className="btn btn-teal">
          {showAddForm ? '📋 View List' : '➕ Raise Divert Request'}
        </button>
      </header>

      {error && <div className="alert alert-error" style={{ display: 'block' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ display: 'block' }}>{success}</div>}

      {showAddForm ? (
        /* Create Divert Request Form */
        <form onSubmit={handleCreateDivert} className="card card-wide" style={{ padding: '24px', border: '1.5px solid var(--border)', margin: '0 auto' }}>
          <h3 className="serif" style={{ fontSize: '20px', marginBottom: '16px' }}>Raise Divert Form</h3>

          <div className="field-row">
            <div className="field">
              <label>Select Department Section <span className="req">*</span></label>
              <select
                value={newDivert.sectionId}
                onChange={(e) => setNewDivert({ ...newDivert, sectionId: e.target.value })}
              >
                {sections.map(s => (
                  <option key={s.sectionId} value={s.sectionId}>{s.sectionName} ({s.sectionId})</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Product Wanted Description <span className="req">*</span></label>
              <input
                type="text"
                placeholder="e.g. Red silk saree with border"
                value={newDivert.productWanted}
                onChange={(e) => setNewDivert({ ...newDivert, productWanted: e.target.value })}
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Quantity</label>
              <input
                type="number"
                placeholder="1"
                value={newDivert.qty}
                onChange={(e) => setNewDivert({ ...newDivert, qty: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Fabric / Design Occasion</label>
              <input
                type="text"
                placeholder="e.g. Chiffon, Wedding Wear"
                value={newDivert.fabricOccasion}
                onChange={(e) => setNewDivert({ ...newDivert, fabricOccasion: e.target.value })}
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Target Price Range</label>
              <input
                type="text"
                placeholder="e.g. ₹5,000 - ₹8,000"
                value={newDivert.priceRange}
                onChange={(e) => setNewDivert({ ...newDivert, priceRange: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Divert Reason Code <span className="req">*</span></label>
              <select
                value={newDivert.reasonCode}
                onChange={(e) => setNewDivert({ ...newDivert, reasonCode: e.target.value })}
              >
                {reasons.map(r => (
                  <option key={r.reasonId} value={r.reasonId}>{r.reasonText} ({r.reasonId})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Detailed Request Notes</label>
            <textarea
              placeholder="Provide exact customer requirements..."
              value={newDivert.detailedRemarks}
              onChange={(e) => setNewDivert({ ...newDivert, detailedRemarks: e.target.value })}
            />
          </div>

          <h4 className="serif" style={{ fontSize: '15px', borderTop: '1px solid var(--border)', paddingTop: '14px', margin: '14px 0 10px' }}>
            Guest Availability
          </h4>

          <div className="field-row">
            <div className="field">
              <label>Coming Back?</label>
              <select
                value={newDivert.comingBack}
                onChange={(e) => setNewDivert({ ...newDivert, comingBack: e.target.value })}
              >
                <option value="Yes">Yes (Expected Visit)</option>
                <option value="No">No (Need Home Delivery / Call)</option>
              </select>
            </div>
            <div className="field">
              <label>Expected return / Delivery Date</label>
              <input
                type="date"
                value={newDivert.expectedDate}
                onChange={(e) => setNewDivert({ ...newDivert, expectedDate: e.target.value })}
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Customer Name</label>
              <input
                type="text"
                placeholder="Name"
                value={newDivert.custName}
                onChange={(e) => setNewDivert({ ...newDivert, custName: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Mobile number</label>
              <input
                type="tel"
                placeholder="Mobile"
                value={newDivert.custMobile}
                onChange={(e) => setNewDivert({ ...newDivert, custMobile: e.target.value })}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-teal btn-full">
            💾 Log Sourcing Divert
          </button>
        </form>
      ) : (
        /* Sourcing Diverts Grid Table list */
        <section className="card" style={{ padding: '20px', border: '1.5px solid var(--border)' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '160px' }}>
              <div className="spinner"></div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--navy)', color: '#fff', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>Divert ID</th>
                    <th style={{ padding: '12px' }}>Date</th>
                    <th style={{ padding: '12px' }}>Section</th>
                    <th style={{ padding: '12px' }}>Product</th>
                    <th style={{ padding: '12px' }}>Price Range</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {diverts.length > 0 ? (
                    diverts.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border-l)' }}>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{item.divertId}</td>
                        <td style={{ padding: '12px' }}>{item.date}</td>
                        <td style={{ padding: '12px' }}>{item.sectionName} ({item.sectionId})</td>
                        <td style={{ padding: '12px' }}>{item.productWanted} (x{item.qty || 1})</td>
                        <td style={{ padding: '12px' }}>{item.priceRange || '—'}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            background: item.status === 'closed' ? 'var(--green-l)' : item.status === 'sourcing' ? 'var(--orange-l)' : 'var(--crimson-l)',
                            color: item.status === 'closed' ? 'var(--green)' : item.status === 'sourcing' ? 'var(--orange)' : 'var(--crimson)'
                          }}>
                            {item.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          {canUserManageDivert(item) ? (
                            <button
                              onClick={() => {
                                setActiveDivert(item);
                                setUpdateStatus(item.status);
                              }}
                              className="btn btn-teal btn-sm"
                            >
                              Update Status
                            </button>
                          ) : (
                            <span style={{ color: 'var(--ink-30)' }}>Locked</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-30)' }}>
                        No divert requests logged.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Sourcing updates overlay */}
      {activeDivert && (
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
          <form onSubmit={handleUpdateStatus} className="card" style={{ padding: '24px', maxWidth: '400px', border: '1px solid var(--border)' }}>
            <h3 className="serif" style={{ fontSize: '20px', marginBottom: '8px' }}>
              Divert: {activeDivert.divertId}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--ink-60)', marginBottom: '16px' }}>
              Product: <strong>{activeDivert.productWanted}</strong>
            </p>

            <div className="field">
              <label>Update Sourcing Status</label>
              <select value={updateStatus} onChange={(e) => setUpdateStatus(e.target.value)}>
                <option value="open">⏳ Awaiting Review (Open)</option>
                <option value="sourcing">📦 PM Sourcing (Procuring)</option>
                <option value="available">✅ Item Available in Store</option>
                <option value="closed">💼 Fulfull & Closed</option>
                <option value="cannot_fulfill">❌ Cannot Fulfill Request</option>
              </select>
            </div>

            <div className="field">
              <label>Status Update Note</label>
              <textarea
                placeholder="Specify sourcing notes..."
                value={updateNote}
                onChange={(e) => setUpdateNote(e.target.value)}
                style={{ minHeight: '60px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setActiveDivert(null)}
                className="btn btn-ghost"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingUpdate}
                className="btn btn-teal"
                style={{ flex: 2 }}
              >
                {savingUpdate ? 'Saving...' : '💾 Update Status'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
