import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CompanyInput, SectionInput, AdminInput } from '../types';

export default function Onboarding() {
  const { onboard, setupComplete } = useAuth();
  const navigate = useNavigate();

  // Redirect if setup is already complete
  if (setupComplete) {
    return <Navigate to="/login" replace />;
  }

  const [step, setStep] = useState<number>(1);
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Step 1: Company Profile State
  const [company, setCompany] = useState<CompanyInput>({
    name: '',
    logo_url: '',
    op_start: '10:00',
    op_end: '22:00',
    grace_min: '30',
    edit_cutoff: '10:30'
  });

  // Step 2: Sections State
  const [sections, setSections] = useState<SectionInput[]>([]);
  const [newSection, setNewSection] = useState<SectionInput>({
    name: '',
    type: 'sales',
    manager_name: '',
    manager_email: ''
  });

  // Step 3: Admin State
  const [admin, setAdmin] = useState<AdminInput & { passwordConfirm: string }>({
    name: '',
    email: '',
    password: '',
    passwordConfirm: ''
  });

  // Password strength check score
  const [pwdScore, setPwdScore] = useState<number>(0);

  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCompany({ ...company, [e.target.id]: e.target.value });
  };

  const handleAdminChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const id = e.target.id;
    setAdmin({ ...admin, [id]: val });

    if (id === 'password') {
      const score = [
        val.length >= 8,
        /[A-Z]/.test(val),
        /[0-9]/.test(val),
        /[^A-Za-z0-9]/.test(val)
      ].filter(Boolean).length;
      setPwdScore(score);
    }
  };

  // Step 1 Navigation validation
  const validateStep1 = () => {
    if (!company.name) {
      setError('Company name is required.');
      return;
    }
    if (!company.op_start || !company.op_end) {
      setError('Please set operating hours.');
      return;
    }
    if (company.op_start >= company.op_end) {
      setError('Opening time must be before closing time.');
      return;
    }
    setError('');
    setStep(2);
  };

  // Step 2 Add/Delete Section helpers
  const addSection = () => {
    if (!newSection.name) {
      setError('Section name is required.');
      return;
    }
    const exists = sections.some(s => s.name.toLowerCase() === newSection.name.toLowerCase());
    if (exists) {
      setError('A section with this name already exists.');
      return;
    }

    setSections([...sections, newSection]);
    setNewSection({ name: '', type: 'sales', manager_name: '', manager_email: '' });
    setError('');
  };

  const removeSection = (idx: number) => {
    setSections(sections.filter((_, i) => i !== idx));
  };

  const validateStep2 = () => {
    if (sections.length === 0) {
      setError('Please add at least one section before continuing.');
      return;
    }
    setError('');
    setStep(3);
  };

  // Onboard Submission
  const handleSubmit = async () => {
    if (!admin.name || !admin.email || !admin.password) {
      setError('All fields are required.');
      return;
    }
    if (admin.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (admin.password !== admin.passwordConfirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError('');

    const res = await onboard(company, sections, {
      name: admin.name,
      email: admin.email,
      password: admin.password
    });

    setSubmitting(false);

    if (res.ok) {
      navigate('/success');
    } else {
      setError(res.error || 'Setup failed.');
    }
  };

  const renderSteps = () => {
    const labels = ["Company", "Sections", "Admin"];
    return (
      <div className="steps-wrap">
        <div className="steps">
          {labels.map((lbl, i) => {
            const n = i + 1;
            const cls = n < step ? "done" : n === step ? "active" : "pending";
            return (
              <div key={lbl} className={`step-item ${cls}`}>
                <div className={`step-dot ${cls}`}>
                  {n < step ? "✓" : n}
                </div>
                <div className="step-lbl">{lbl}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const colors = ["#e74c3c", "#e67e22", "#f1c40f", "#2ecc71"];

  return (
    <div className="page page-top fade-in">
      <div className="glass-card card-wide">
        {/* Brand Strip */}
        <div className="brand-strip">
          <div className="brand-icon">
            <span style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>BSC</span>
          </div>
          <div className="brand-text">
            <h1>Retail CRM</h1>
            <p>First-time Setup</p>
          </div>
        </div>

        {/* Card Body */}
        <div className="card-body">
          {renderSteps()}

          {error && (
            <div className="alert alert-error" style={{ display: 'block' }}>
              {error}
            </div>
          )}

          {/* STEP 1: Company Profile */}
          {step === 1 && (
            <div>
              <h2 className="card-title serif">Company Details</h2>
              <p className="card-sub">Set up your store profile and operating hours</p>

              <div className="field">
                <label>Company / Store Name <span className="req">*</span></label>
                <input
                  id="name"
                  type="text"
                  placeholder="e.g. BSC The Textile Mall"
                  value={company.name}
                  onChange={handleCompanyChange}
                />
              </div>

              <div className="field">
                <label>Logo URL <span className="opt">Optional</span></label>
                <input
                  id="logo_url"
                  type="url"
                  placeholder="https://..."
                  value={company.logo_url}
                  onChange={handleCompanyChange}
                />
                <p className="field-note">Direct image link — shown on the login page</p>
              </div>

              <div className="field">
                <label>Operating Hours <span className="req">*</span></label>
                <div className="time-row">
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--ink-60)', marginBottom: '5px' }}>Opens at</div>
                    <input
                      id="op_start"
                      type="time"
                      value={company.op_start}
                      onChange={handleCompanyChange}
                    />
                  </div>
                  <div className="time-sep">→</div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--ink-60)', marginBottom: '5px' }}>Closes at</div>
                    <input
                      id="op_end"
                      type="time"
                      value={company.op_end}
                      onChange={handleCompanyChange}
                    />
                  </div>
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Footfall Entry Grace (minutes)</label>
                  <input
                    id="grace_min"
                    type="number"
                    min="0"
                    max="60"
                    value={company.grace_min}
                    onChange={handleCompanyChange}
                  />
                  <p className="field-note">How long after a slot ends staff can submit</p>
                </div>
                <div className="field">
                  <label>Edit Cutoff Time (next day)</label>
                  <input
                    id="edit_cutoff"
                    type="time"
                    value={company.edit_cutoff}
                    onChange={handleCompanyChange}
                  />
                  <p className="field-note">Admin edit window next morning</p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button className="btn btn-primary" onClick={validateStep1}>
                  Continue to Sections →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Departments & Sections */}
          {step === 2 && (
            <div>
              <h2 className="card-title serif">Departments & Sections</h2>
              <p className="card-sub">Add all sales and non-sales sections. You can add more later from Admin settings.</p>

              <div className="section-list">
                {sections.length > 0 ? (
                  sections.map((s, i) => (
                    <div key={i} className="section-row">
                      <div className="section-tag">
                        {s.name}
                        <span>({s.type === 'sales' ? 'Sales' : 'Non-Sales'})</span>
                        {s.manager_email && <em>· {s.manager_email}</em>}
                      </div>
                      <button className="section-del" onClick={() => removeSection(i)}>×</button>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'var(--ink-30)', fontSize: '13px', textAlign: 'center', padding: '16px' }}>
                    No sections added yet
                  </p>
                )}
              </div>

              <div className="add-box">
                <p className="add-box-title">Add New Section</p>
                <div className="field-row" style={{ marginBottom: '10px' }}>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Section Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Sarees, Kids Wear…"
                      value={newSection.name}
                      onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Type</label>
                    <select
                      value={newSection.type}
                      onChange={(e) => setNewSection({ ...newSection, type: e.target.value as 'sales' | 'non_sales' })}
                    >
                      <option value="sales">Sales</option>
                      <option value="non_sales">Non-Sales</option>
                    </select>
                  </div>
                </div>
                <div className="field-row" style={{ marginBottom: '10px' }}>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Manager Name <span className="opt">Optional</span></label>
                    <input
                      type="text"
                      placeholder="Purchase Manager name"
                      value={newSection.manager_name}
                      onChange={(e) => setNewSection({ ...newSection, manager_name: e.target.value })}
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Manager Email <span className="opt">For divert alerts</span></label>
                    <input
                      type="email"
                      placeholder="pm@store.com"
                      value={newSection.manager_email}
                      onChange={(e) => setNewSection({ ...newSection, manager_email: e.target.value })}
                    />
                  </div>
                </div>
                <button className="btn btn-teal btn-sm" onClick={addSection}>+ Add Section</button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
                <button className="btn btn-primary" onClick={validateStep2}>
                  Continue to Admin →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Create Super Admin */}
          {step === 3 && (
            <div>
              <h2 className="card-title serif">Create Super Admin</h2>
              <p className="card-sub">This account has full access to manage users, settings, and all data.</p>

              <div className="field-row">
                <div className="field">
                  <label>Full Name <span className="req">*</span></label>
                  <input
                    id="name"
                    type="text"
                    placeholder="Admin full name"
                    value={admin.name}
                    onChange={handleAdminChange}
                  />
                </div>
                <div className="field">
                  <label>Email / Username <span className="req">*</span></label>
                  <input
                    id="email"
                    type="text"
                    placeholder="e.g. admin or bsc_admin"
                    value={admin.email}
                    onChange={handleAdminChange}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Password <span className="req">*</span></label>
                  <input
                    id="password"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={admin.password}
                    onChange={handleAdminChange}
                  />
                  <div className="pwd-bar">
                    <div
                      className="pwd-fill"
                      style={{
                        width: `${pwdScore * 25}%`,
                        background: colors[pwdScore - 1] || 'var(--border)'
                      }}
                    ></div>
                  </div>
                </div>
                <div className="field">
                  <label>Confirm Password <span className="req">*</span></label>
                  <input
                    id="passwordConfirm"
                    type="password"
                    placeholder="Repeat password"
                    value={admin.passwordConfirm}
                    onChange={handleAdminChange}
                  />
                </div>
              </div>

              <div className="summary-box">
                <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ink-60)', textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: '10px' }}>
                  Setup Summary
                </p>
                <div className="summary-row">
                  <span>Company</span>
                  <span>{company.name || '—'}</span>
                </div>
                <div className="summary-row">
                  <span>Operating Hours</span>
                  <span>{company.op_start || '—'} → {company.op_end || '—'}</span>
                </div>
                <div className="summary-row">
                  <span>Sections Added</span>
                  <span>{sections.length}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
                <button
                  id="submitBtn"
                  className="btn btn-teal"
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {submitting && <span className="spinner"></span>}
                  {submitting ? 'Creating...' : '🚀 Complete Setup'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
