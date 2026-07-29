import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface UserRecord {
  id: number;
  name: string;
  email: string;
  role: string;
  sectionsAssigned: string;
  isActive: boolean;
}

interface SectionRecord {
  id: number;
  sectionId: string;
  sectionName: string;
  type: string;
  managerName: string | null;
  managerEmail: string | null;
}

export default function Admin() {
  const { settings, checkSetupStatus } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Company Settings form state
  const [companyName, setCompanyName] = useState<string>('');
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string>('');
  const [opStart, setOpStart] = useState<string>('10:00');
  const [opEnd, setOpEnd] = useState<string>('22:00');
  const [graceMin, setGraceMin] = useState<number>(30);
  const [editCutoff, setEditCutoff] = useState<string>('10:30');
  const [derEmail, setDerEmail] = useState<string>('');

  // User form state
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserPassword, setNewUserPassword] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<string>('crm_staff');
  const [newUserSections, setNewUserSections] = useState<string>('ALL');

  useEffect(() => {
    fetchAdminData();
    if (settings) {
      setCompanyName(settings.companyName);
      setCompanyLogoUrl(settings.companyLogoUrl || '');
      setOpStart(settings.operatingStart);
      setOpEnd(settings.operatingEnd);
      setGraceMin(settings.graceMin);
      setEditCutoff(settings.editCutoff);
    }
  }, [settings]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const userRes = await api.get('/api/crm/users');
      if (userRes.data && userRes.data.ok) {
        setUsers(userRes.data.users || []);
      }
      const secRes = await api.get('/api/crm/sections');
      if (secRes.data && secRes.data.ok) {
        setSections(secRes.data.sections || []);
      }
      const settingsRes = await api.get('/api/crm/settings');
      if (settingsRes.data && settingsRes.data.ok && settingsRes.data.settings) {
        const s = settingsRes.data.settings;
        setCompanyName(s.companyName);
        setCompanyLogoUrl(s.companyLogoUrl || '');
        setOpStart(s.operatingStart);
        setOpEnd(s.operatingEnd);
        setGraceMin(s.footfallGraceMin);
        setEditCutoff(s.footfallEditCutoff);
        setDerEmail(s.derEmail || '');
      }
    } catch (err) {
      setError('Failed to fetch registry lists.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      const res = await api.put('/api/crm/settings', {
        companyName,
        companyLogoUrl,
        operatingStart: opStart,
        operatingEnd: opEnd,
        footfallGraceMin: graceMin,
        footfallEditCutoff: editCutoff,
        derEmail
      });
      if (res.data && res.data.ok) {
        setSuccess('Company profile parameters saved successfully!');
        checkSetupStatus();
      }
    } catch (err) {
      setError('Failed to save store configurations.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail || !newUserPassword) {
      setError('All user fields are mandatory.');
      return;
    }
    try {
      setError('');
      setSuccess('');
      const res = await api.post('/api/crm/users', {
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
        sectionsAssigned: newUserSections
      });
      if (res.data && res.data.ok) {
        setSuccess('User created successfully!');
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        fetchAdminData();
      } else {
        setError(res.data.error || 'Failed to create user');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to register user.');
    }
  };

  return (
    <div style={{ padding: '24px' }} className="fade-in">
      <header style={{ marginBottom: '24px' }}>
        <h1 className="serif" style={{ fontSize: '28px' }}>Control Dashboard</h1>
        <p style={{ fontSize: '14px', color: 'var(--ink-60)' }}>Admin settings, section hierarchies, and user access lists</p>
      </header>

      {error && <div className="alert alert-error" style={{ display: 'block' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ display: 'block' }}>{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Company profile parameters settings card */}
        <section className="card" style={{ padding: '20px', border: '1.5px solid var(--border)' }}>
          <h3 className="serif" style={{ fontSize: '18px', marginBottom: '14px' }}>Company Configurations</h3>
          <form onSubmit={handleUpdateSettings}>
            <div className="field">
              <label>Company / Mall Name</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div className="field">
              <label>Company Logo URL</label>
              <input type="text" value={companyLogoUrl} onChange={(e) => setCompanyLogoUrl(e.target.value)} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Opening Time</label>
                <input type="time" value={opStart} onChange={(e) => setOpStart(e.target.value)} />
              </div>
              <div className="field">
                <label>Closing Time</label>
                <input type="time" value={opEnd} onChange={(e) => setOpEnd(e.target.value)} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Footfall grace window (Min)</label>
                <input type="number" value={graceMin} onChange={(e) => setGraceMin(parseInt(e.target.value, 10))} />
              </div>
              <div className="field">
                <label>Edit cutoff window</label>
                <input type="time" value={editCutoff} onChange={(e) => setEditCutoff(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>DER Target Email</label>
              <input type="email" placeholder="pm@store.com" value={derEmail} onChange={(e) => setDerEmail(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-teal btn-full">
              💾 Save Configurations
            </button>
          </form>
        </section>

        {/* User list management card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <section className="card" style={{ padding: '20px', border: '1.5px solid var(--border)' }}>
            <h3 className="serif" style={{ fontSize: '18px', marginBottom: '14px' }}>Access Control List</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'var(--navy)', color: '#fff', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>User Name</th>
                    <th style={{ padding: '8px' }}>Role</th>
                    <th style={{ padding: '8px' }}>Sections</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-l)' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>{u.name}</td>
                      <td style={{ padding: '8px', textTransform: 'capitalize' }}>{u.role.replace('_', ' ')}</td>
                      <td style={{ padding: '8px' }}>{u.sectionsAssigned}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* User registration card */}
          <section className="card" style={{ padding: '20px', border: '1.5px solid var(--border)' }}>
            <h3 className="serif" style={{ fontSize: '18px', marginBottom: '14px' }}>Register New User</h3>
            <form onSubmit={handleCreateUser}>
              <div className="field">
                <label>User Name</label>
                <input type="text" placeholder="John" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
              </div>
              <div className="field">
                <label>Email Address / Username</label>
                <input type="text" placeholder="john@store.com" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />
              </div>
              <div className="field">
                <label>Credentials Password</label>
                <input type="password" placeholder="••••••••" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Assign Role</label>
                  <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                    <option value="crm_staff">CRM Staff</option>
                    <option value="crm_manager">CRM Manager</option>
                    <option value="purchase_manager">Purchase Manager</option>
                    <option value="telecaller">Telecaller</option>
                    <option value="vm">Visual Merchandiser</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div className="field">
                  <label>Assigned Sections</label>
                  <input type="text" placeholder="ALL or S1,S2" value={newUserSections} onChange={(e) => setNewUserSections(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-full">
                ➕ Create User
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
