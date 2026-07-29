import React, { useEffect, useState } from 'react';
import api from '../../services/api';

interface PointRecord {
  id: number;
  pointNo: number;
  aspect: string;
  point: string;
  type: string;
  frequency: string;
}

interface VmAdminEditProps {
  onBack: () => void;
}

export default function VmAdminEdit({ onBack }: VmAdminEditProps) {
  const [points, setPoints] = useState<PointRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Add Point State
  const [newAspect, setNewAspect] = useState<string>('');
  const [newPoint, setNewPoint] = useState<string>('');
  const [newType, setNewType] = useState<string>('Overall');
  const [newFrequency, setNewFrequency] = useState<string>('Daily');

  useEffect(() => {
    fetchChecklistPoints();
  }, []);

  const fetchChecklistPoints = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/vm/checklist-master');
      if (res.data && res.data.ok) {
        setPoints(res.data.points || []);
      }
    } catch (err) {
      setError('Failed to fetch checklist template list.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateField = async (pointNo: number, field: string, value: string) => {
    try {
      const res = await api.get(`/api/vm/update-point?point_no=${pointNo}&field=${field}&value=${encodeURIComponent(value)}`);
      if (res.data && res.data.ok) {
        fetchChecklistPoints();
      }
    } catch (err) {
      setError('Failed to update checklist item.');
    }
  };

  const handleDeletePoint = async (pointNo: number) => {
    if (!window.confirm(`Are you sure you want to delete checklist point #${pointNo}?`)) return;

    try {
      const res = await api.get(`/api/vm/delete-point?point_no=${pointNo}`);
      if (res.data && res.data.ok) {
        setSuccess(`Successfully deleted point #${pointNo}!`);
        fetchChecklistPoints();
      }
    } catch (err) {
      setError('Failed to delete checklist point.');
    }
  };

  const handleAddPoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAspect || !newPoint) {
      setError('Please enter both aspect name and point details.');
      return;
    }

    try {
      setError('');
      setSuccess('');
      const res = await api.get(`/api/vm/add-point?type=${newType}&aspect=${encodeURIComponent(newAspect)}&point=${encodeURIComponent(newPoint)}&frequency=${newFrequency}`);
      if (res.data && res.data.ok) {
        setSuccess('Checklist point added successfully!');
        setNewAspect('');
        setNewPoint('');
        fetchChecklistPoints();
      }
    } catch (err) {
      setError('Failed to add checklist point.');
    }
  };

  return (
    <div style={{ padding: '24px' }} className="fade-in">
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="serif" style={{ fontSize: '28px' }}>Edit Checklist template</h1>
          <p style={{ fontSize: '14px', color: 'var(--ink-60)' }}>Configure Visual Merchandising template questions and metrics</p>
        </div>
        <button onClick={onBack} className="btn btn-ghost">
          ← Back to Admin
        </button>
      </header>

      {error && <div className="alert alert-error" style={{ display: 'block' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ display: 'block' }}>{success}</div>}

      {/* Checklist list edit inputs */}
      <section className="card" style={{ padding: '20px', border: '1.5px solid var(--border)', marginBottom: '24px' }}>
        <h3 className="serif" style={{ fontSize: '18px', marginBottom: '14px' }}>Current Checklist Points</h3>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '160px' }}>
            <div className="spinner"></div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--navy)', color: '#fff', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>No.</th>
                  <th style={{ padding: '10px' }}>Aspect Name</th>
                  <th style={{ padding: '10px' }}>Point Statement</th>
                  <th style={{ padding: '10px' }}>Type</th>
                  <th style={{ padding: '10px' }}>Frequency</th>
                  <th style={{ padding: '10px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-l)' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>#{p.pointNo}</td>
                    <td style={{ padding: '8px' }}>
                      <input
                        type="text"
                        value={p.aspect}
                        onChange={(e) => handleUpdateField(p.pointNo, 'ASPECT', e.target.value)}
                        style={{ border: '1px dashed var(--border)', padding: '4px', fontSize: '12px' }}
                      />
                    </td>
                    <td style={{ padding: '8px', width: '40%' }}>
                      <input
                        type="text"
                        value={p.point}
                        onChange={(e) => handleUpdateField(p.pointNo, 'POINT', e.target.value)}
                        style={{ border: '1px dashed var(--border)', padding: '4px', fontSize: '12px', width: '100%' }}
                      />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <select
                        value={p.type}
                        onChange={(e) => handleUpdateField(p.pointNo, 'TYPE', e.target.value)}
                        style={{ border: '1px dashed var(--border)', padding: '4px', fontSize: '12px' }}
                      >
                        <option value="Overall">Overall</option>
                        <option value="Floor">Floor</option>
                      </select>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <select
                        value={p.frequency}
                        onChange={(e) => handleUpdateField(p.pointNo, 'FREQUENCY', e.target.value)}
                        style={{ border: '1px dashed var(--border)', padding: '4px', fontSize: '12px' }}
                      >
                        <option value="Daily">Daily</option>
                        <option value="3 Days Once">3 Days Once</option>
                        <option value="Weekly">Weekly</option>
                      </select>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <button
                        onClick={() => handleDeletePoint(p.pointNo)}
                        className="section-del"
                        style={{ width: '28px', height: '28px', fontSize: '14px' }}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add new point form card */}
      <section className="card" style={{ padding: '20px', border: '1.5px solid var(--border)' }}>
        <h3 className="serif" style={{ fontSize: '18px', marginBottom: '14px' }}>Add New Checklist Question</h3>
        
        <form onSubmit={handleAddPoint}>
          <div className="field-row">
            <div className="field">
              <label>Aspect Name</label>
              <input
                type="text"
                placeholder="e.g. Ironing & Pressing"
                value={newAspect}
                onChange={(e) => setNewAspect(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Point Statement description</label>
              <input
                type="text"
                placeholder="e.g. All shirts must be neatly ironed..."
                value={newPoint}
                onChange={(e) => setNewPoint(e.target.value)}
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Audit Type</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value)}>
                <option value="Overall">Overall (Store-Wide)</option>
                <option value="Floor">Floor (Floor-Wide)</option>
              </select>
            </div>
            <div className="field">
              <label>Audit Frequency</label>
              <select value={newFrequency} onChange={(e) => setNewFrequency(e.target.value)}>
                <option value="Daily">Daily</option>
                <option value="3 Days Once">3 Days Once</option>
                <option value="Weekly">Weekly</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-teal btn-full">
            ➕ Add Question
          </button>
        </form>
      </section>
    </div>
  );
}
