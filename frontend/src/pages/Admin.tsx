import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface UserRecord {
  id: number;
  name: string;
  email: string;
  role: string;
  sectionsAssigned: string;
  pin: string | null;
  plainPassword: string | null;
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

type AdminTab = 'users' | 'company' | 'sections' | 'system' | 'auditlog';

export default function Admin() {
  const { settings, checkSetupStatus } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);

  // Visible Passwords reveal state: set of user IDs whose credentials are password-unmasked
  const [revealedUsers, setRevealedUsers] = useState<Set<number>>(new Set());

  // Company Settings form state
  const [companyName, setCompanyName] = useState<string>('');
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string>('');
  const [opStart, setOpStart] = useState<string>('10:00');
  const [opEnd, setOpEnd] = useState<string>('22:00');
  const [graceMin, setGraceMin] = useState<number>(30);
  const [editCutoff, setEditCutoff] = useState<string>('10:30');
  const [derEmail, setDerEmail] = useState<string>('');
  const [tvBoardPin, setTvBoardPin] = useState<string>('9911');
  const [cashSettlementPin, setCashSettlementPin] = useState<string>('1234');

  // New User form state
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserPassword, setNewUserPassword] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<string>('crm_staff');
  const [newUserSections, setNewUserSections] = useState<string>('ALL');
  const [newUserPin, setNewUserPin] = useState<string>('');

  // Password reset inline state
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState<string>('');
  const [resetPinVal, setResetPinVal] = useState<string>('');

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
        setTvBoardPin(s.tvBoardPin || '9911');
        setCashSettlementPin(s.cashSettlementPin || '1234');
      }
    } catch (err) {
      setError('Failed to fetch registry lists.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLog = async () => {
    setAuditLoading(true);
    try {
      const res = await api.get('/api/crm/audit-log');
      if (res.data?.ok) setAuditLogs(res.data.logs || []);
    } catch { /* silently ignore if not admin */ }
    finally { setAuditLoading(false); }
  };

  const toggleRevealUser = (userId: number) => {
    setRevealedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
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
        derEmail,
        tvBoardPin,
        cashSettlementPin
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
        sectionsAssigned: newUserSections,
        pin: newUserPin || (newUserRole === 'greeter' ? newUserPassword : null)
      });
      if (res.data && res.data.ok) {
        setSuccess('User created successfully with credentials saved!');
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserPin('');
        fetchAdminData();
      } else {
        setError(res.data.error || 'Failed to create user');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to register user.');
    }
  };

  const handleResetCredentialsSubmit = async (userId: number) => {
    if (!resetPasswordVal && !resetPinVal) {
      setError('Please enter a new password or PIN.');
      return;
    }
    try {
      setError('');
      setSuccess('');
      const res = await api.put('/api/crm/users/reset-password', {
        id: userId,
        newPassword: resetPasswordVal || undefined,
        newPin: resetPinVal || undefined
      });
      if (res.data && res.data.ok) {
        setSuccess('Credentials updated successfully!');
        setResetUserId(null);
        setResetPasswordVal('');
        setResetPinVal('');
        fetchAdminData();
      } else {
        setError(res.data.error || 'Password reset failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset user password.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 className="outfit" style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A' }}>
          Admin Control Center & Credential Vault
        </h1>
        <p style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
          Manage staff credentials, store settings, sections, and system status
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Admin Tab Navigation */}
      <div 
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: '12px'
        }}
      >
        {[
          { id: 'users', label: '🔑 User Vault & Access', count: users.length },
          { id: 'company', label: '🏢 Store Settings' },
          { id: 'sections', label: '🏪 Floor Sections', count: sections.length },
          { id: 'system', label: '📊 System Status' },
          { id: 'auditlog', label: '🔍 Audit Log' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as AdminTab);
              if (tab.id === 'auditlog' && auditLogs.length === 0) fetchAuditLog();
            }}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              background: activeTab === tab.id ? '#2563EB' : '#FFFFFF',
              color: activeTab === tab.id ? '#FFFFFF' : '#475569',
              border: activeTab === tab.id ? 'none' : '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                style={{
                  background: activeTab === tab.id ? '#FFFFFF' : '#F1F5F9',
                  color: activeTab === tab.id ? '#2563EB' : '#475569',
                  fontSize: '11px',
                  padding: '2px 7px',
                  borderRadius: '10px'
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: User Vault & Access Control */}
      {activeTab === 'users' && (
        <div>
          {/* Live TV Display PIN Banner */}
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h4 style={{ color: '#1D4ED8', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📺</span> Store Live TV Board PIN Code
              </h4>
              <p style={{ color: '#3B82F6', fontSize: '12px', marginTop: '2px' }}>
                Use this master PIN to unlock the live scoreboard on store display TVs
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>TV PIN:</span>
              <span className="mono" style={{ background: '#2563EB', color: '#FFFFFF', padding: '6px 14px', borderRadius: '8px', fontSize: '16px', fontWeight: 800, letterSpacing: '2px' }}>
                9911
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '24px', alignItems: 'start' }}>
            {/* User List Table with Credential Vault */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 className="outfit" style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>
                🔑 Staff Credential Vault
              </h3>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User Name</th>
                    <th>Role</th>
                    <th>Email / Username</th>
                    <th>Password</th>
                    <th>4-Digit PIN</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const isRevealed = revealedUsers.has(u.id);
                    return (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 700, color: '#0F172A' }}>
                          {u.name}
                        </td>
                        <td>
                          <span
                            className={
                              u.role === 'super_admin' || u.role === 'admin' ? 'badge badge-gold' :
                              u.role === 'greeter' ? 'badge badge-green' :
                              u.role === 'telecaller' ? 'badge badge-blue' : 'badge badge-gold'
                            }
                          >
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {u.email}
                        </td>
                        <td className="mono" style={{ fontSize: '13px' }}>
                          {isRevealed ? (
                            <span style={{ color: 'var(--gold)', fontWeight: 700 }}>
                              {u.plainPassword || '••••••••'}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-dim)' }}>••••••••</span>
                          )}
                        </td>
                        <td className="mono" style={{ fontSize: '13px' }}>
                          {isRevealed ? (
                            <span style={{ color: '#10B981', fontWeight: 700 }}>
                              {u.pin || '—'}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-dim)' }}>{u.pin ? '••••' : '—'}</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => toggleRevealUser(u.id)}
                              className="btn btn-ghost btn-sm"
                              title={isRevealed ? 'Hide credentials' : 'Reveal credentials'}
                            >
                              {isRevealed ? '🙈' : '👁️'}
                            </button>
                            <button
                              onClick={() => {
                                setResetUserId(u.id);
                                setResetPasswordVal(u.plainPassword || '');
                                setResetPinVal(u.pin || '');
                              }}
                              className="btn btn-ghost btn-sm"
                              title="Reset Password / PIN"
                            >
                              ✏️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </div>

            {/* User Registration Form Card */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 className="outfit" style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>
                ➕ Register New User
              </h3>
              <form onSubmit={handleCreateUser}>
                <div className="field">
                  <label>User Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Durgappa"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>Email / Username</label>
                  <input
                    type="text"
                    placeholder="durgappa@store.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>Assign Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                  >
                    <option value="greeter">🚶 Greeter (Tablet PIN Login)</option>
                    <option value="crm_staff">📊 CRM Staff</option>
                    <option value="crm_manager">📊 CRM Manager</option>
                    <option value="telecaller">📞 Telecaller</option>
                    <option value="purchase_manager">👔 Purchase Manager</option>
                    <option value="vm">🏢 Visual Merchandiser</option>
                    <option value="admin">🛡️ Administrator</option>
                  </select>
                </div>

                <div className="field">
                  <label>Password</label>
                  <input
                    type="text"
                    placeholder="Set password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                  />
                </div>

                {newUserRole === 'greeter' && (
                  <div className="field">
                    <label>4-Digit Greeter Tablet PIN</label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="e.g. 1234"
                      value={newUserPin}
                      onChange={(e) => setNewUserPin(e.target.value)}
                    />
                  </div>
                )}

                <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '8px' }}>
                  ➕ Create User Account
                </button>
              </form>

              {/* Inline Password Reset Panel */}
              {resetUserId !== null && (
                <div
                  style={{
                    marginTop: '24px',
                    padding: '20px',
                    borderRadius: '14px',
                    background: 'rgba(245,200,66,0.08)',
                    border: '1px solid var(--border-gold)'
                  }}
                >
                  <h4 className="outfit" style={{ fontSize: '15px', color: 'var(--gold)', marginBottom: '12px' }}>
                    ✏️ Reset User Password / PIN (ID: {resetUserId})
                  </h4>
                  <div className="field">
                    <label>New Password</label>
                    <input
                      type="text"
                      placeholder="New password"
                      value={resetPasswordVal}
                      onChange={(e) => setResetPasswordVal(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>New 4-Digit PIN</label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="New 4-digit PIN"
                      value={resetPinVal}
                      onChange={(e) => setResetPinVal(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => handleResetCredentialsSubmit(resetUserId)}
                      className="btn btn-primary btn-sm"
                    >
                      💾 Save Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetUserId(null)}
                      className="btn btn-ghost btn-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Company Configurations */}
      {activeTab === 'company' && (
        <div className="glass-card" style={{ padding: '28px', maxWidth: '700px' }}>
          <h3 className="outfit" style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', marginBottom: '20px' }}>
            🏢 Store & Company Profile Parameters
          </h3>
          <form onSubmit={handleUpdateSettings}>
            <div className="field">
              <label>Company / Mall Name</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div className="field">
              <label>Company Logo Image URL</label>
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
                <label>Edit Cutoff Time</label>
                <input type="time" value={editCutoff} onChange={(e) => setEditCutoff(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>DER Report Email Target</label>
              <input type="email" placeholder="manager@bsctextiles.com" value={derEmail} onChange={(e) => setDerEmail(e.target.value)} />
            </div>

            {/* Master Security PINs Configuration */}
            <div style={{
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '12px',
              padding: '20px',
              marginTop: '20px',
              marginBottom: '20px'
            }}>
              <h4 className="outfit" style={{ fontSize: '15px', fontWeight: 700, color: '#1D4ED8', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔑 Master Security PINs Configuration
              </h4>
              <p style={{ fontSize: '12px', color: '#3B82F6', marginBottom: '16px' }}>
                Configure access PINs for store Live TV Scoreboards and Cash Settlement counters
              </p>

              <div className="field-row">
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ color: '#1E40AF' }}>Live TV Scoreboard PIN</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={tvBoardPin}
                    onChange={(e) => setTvBoardPin(e.target.value)}
                    placeholder="e.g. 9911"
                    style={{ fontWeight: 800, letterSpacing: '2px', background: '#FFFFFF', color: '#1D4ED8' }}
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ color: '#1E40AF' }}>Cash Settlement Counter PIN</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={cashSettlementPin}
                    onChange={(e) => setCashSettlementPin(e.target.value)}
                    placeholder="e.g. 1234"
                    style={{ fontWeight: 800, letterSpacing: '2px', background: '#FFFFFF', color: '#1D4ED8' }}
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-teal btn-full" style={{ marginTop: '12px' }}>
              💾 Save Store Configurations & PINs
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: Store Sections */}
      {activeTab === 'sections' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 className="outfit" style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginBottom: '16px' }}>
            🏪 Floor Sections Registry
          </h3>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Section ID</th>
                  <th>Section Name</th>
                  <th>Type</th>
                  <th>Section Manager</th>
                  <th>Manager Email</th>
                </tr>
              </thead>
              <tbody>
                {sections.map(s => (
                  <tr key={s.id}>
                    <td className="mono" style={{ fontWeight: 700, color: 'var(--gold)' }}>
                      {s.sectionId}
                    </td>
                    <td style={{ fontWeight: 700, color: '#FFFFFF' }}>
                      {s.sectionName}
                    </td>
                    <td>
                      <span className={s.type === 'sales' ? 'badge badge-green' : 'badge badge-gold'}>
                        {s.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-main)' }}>
                      {s.managerName || 'Unassigned'}
                    </td>
                    <td className="mono" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {s.managerEmail || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: System Audit */}
      {activeTab === 'system' && (
        <div className="glass-card" style={{ padding: '28px', maxWidth: '600px' }}>
          <h3 className="outfit" style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF', marginBottom: '20px' }}>
            📊 System & Database Audit Status
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Database Driver</span>
              <span className="mono" style={{ color: 'var(--gold)', fontWeight: 700 }}>Direct MySQL (mysql2 pool)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Backend Architecture</span>
              <span className="mono" style={{ color: '#10B981', fontWeight: 700 }}>Express TypeScript (Port 5000)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Auto Table Migrations</span>
              <span className="badge badge-green">Active (initDb)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Greeter Tablet PIN Login</span>
              <span className="badge badge-gold">Enabled</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Admin Audit Log */}
      {activeTab === 'auditlog' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 className="outfit" style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                🔍 Admin Action Audit Log
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                Last 100 admin actions — user creation, settings changes, section management
              </p>
            </div>
            <button
              onClick={fetchAuditLog}
              disabled={auditLoading}
              style={{
                padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              {auditLoading ? <><span className="spinner" style={{ width: '12px', height: '12px', borderTopColor: '#2563EB', borderColor: 'rgba(37,99,235,0.2)' }} /> Loading...</> : '🔄 Refresh'}
            </button>
          </div>

          {auditLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
              <div className="spinner" style={{ width: '28px', height: '28px', borderWidth: '3px', borderTopColor: '#2563EB', borderColor: 'rgba(37,99,235,0.2)' }} />
            </div>
          ) : auditLogs.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 24px', borderRadius: '12px',
              background: '#faf8f4', border: '1px dashed #d4c9b5'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a2744' }}>No audit events recorded yet</p>
              <p style={{ fontSize: '12px', color: '#8a7e6a', marginTop: '4px' }}>
                Admin actions (create user, settings change, section management) will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Role</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log: any, i: number) => {
                    const actionColors: Record<string, string> = {
                      CREATE_USER: '#16A34A', RESET_PASSWORD: '#D97706', RESET_PIN: '#D97706',
                      UPDATE_SETTINGS: '#2563EB', CREATE_SECTION: '#0D9488', DELETE_SECTION: '#DC2626'
                    };
                    const color = actionColors[log.action] || '#6B7280';
                    const ts = new Date(log.created_at);
                    const timeStr = ts.toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', year: '2-digit',
                      hour: '2-digit', minute: '2-digit', hour12: true
                    });
                    return (
                      <tr key={log.id || i}>
                        <td className="mono" style={{ fontSize: '11px', color: '#475569', whiteSpace: 'nowrap' }}>{timeStr}</td>
                        <td style={{ fontWeight: 700, color: '#0F172A' }}>{log.actorName}</td>
                        <td style={{ fontSize: '11px', textTransform: 'capitalize', color: '#475569' }}>
                          {log.actorRole?.replace(/_/g, ' ')}
                        </td>
                        <td>
                          <span style={{
                            padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 700,
                            background: `${color}18`, color, textTransform: 'uppercase', letterSpacing: '0.05em',
                            border: `1px solid ${color}30`, whiteSpace: 'nowrap'
                          }}>
                            {log.action?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: '#1a2744', fontWeight: 600 }}>
                          {log.targetName || log.targetId || '—'}
                        </td>
                        <td style={{ fontSize: '12px', color: '#64748B', fontStyle: log.details ? 'italic' : 'normal' }}>
                          {log.details || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
