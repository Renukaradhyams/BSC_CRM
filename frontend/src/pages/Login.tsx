import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

type LoginRole = 'admin' | 'crm' | 'greeter' | 'supervisor';

interface GreeterOption {
  id: number;
  name: string;
}

export default function Login() {
  const { login, settings } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState<LoginRole>('admin');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [greeterList, setGreeterList] = useState<GreeterOption[]>([]);
  const [selectedGreeterName, setSelectedGreeterName] = useState<string>('');
  const [greeterPin, setGreeterPin] = useState<string>('');

  // Supervisor PIN login state
  const [supervisorPin, setSupervisorPin] = useState<string>('');

  useEffect(() => {
    fetchGreeters();
  }, []);

  const fetchGreeters = async () => {
    try {
      const res = await api.get('/api/crm/greeters');
      if (res.data && res.data.ok) {
        setGreeterList(res.data.greeters || []);
        if (res.data.greeters && res.data.greeters.length > 0) {
          setSelectedGreeterName(res.data.greeters[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to load greeter list:', err);
    }
  };

  const handleSubmitStandard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter your email/username and password.');
      return;
    }
    setSubmitting(true);
    setError('');
    const res = await login(username, password);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error || 'Invalid credentials. Please check your username & password.');
      setPassword('');
    } else {
      navigate('/app');
    }
  };

  const handleGreeterPinInput = (num: string) => {
    if (greeterPin.length < 4) {
      const newPin = greeterPin + num;
      setGreeterPin(newPin);
      if (newPin.length === 4) {
        handleGreeterSubmit(undefined, newPin);
      }
    }
  };

  const handleGreeterPinBackspace = () => {
    setGreeterPin(prev => prev.slice(0, -1));
  };

  const handleGreeterSubmit = async (e?: React.FormEvent, pinToSubmit?: string) => {
    if (e) e.preventDefault();
    const finalPin = pinToSubmit || greeterPin;
    if (!selectedGreeterName) {
      setError('Please select your greeter name.');
      return;
    }
    if (finalPin.length !== 4) {
      setError('Please enter your 4-digit PIN.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await api.post('/api/auth/greeter-login', {
        name: selectedGreeterName,
        pin: finalPin
      });

      if (res.data && res.data.ok) {
        const { token, user: userData, settings: settingsData } = res.data;
        localStorage.setItem('crm_token', token);
        localStorage.setItem('crm_user', JSON.stringify(userData));
        if (settingsData) {
          localStorage.setItem('crm_settings', JSON.stringify(settingsData));
        }
        window.location.href = '/app/footfall';
      } else {
        setError(res.data?.error || 'Invalid Greeter PIN');
        setGreeterPin('');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to login');
      setGreeterPin('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSupervisorPinInput = (num: string) => {
    if (supervisorPin.length < 4) {
      const newPin = supervisorPin + num;
      setSupervisorPin(newPin);
      if (newPin.length === 4) {
        handleSupervisorSubmit(undefined, newPin);
      }
    }
  };

  const handleSupervisorPinBackspace = () => {
    setSupervisorPin(prev => prev.slice(0, -1));
  };

  const handleSupervisorSubmit = async (e?: React.FormEvent, pinToSubmit?: string) => {
    if (e) e.preventDefault();
    const finalPin = pinToSubmit || supervisorPin;
    if (finalPin.length !== 4) {
      setError('Please enter your 4-digit PIN.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await api.post('/api/attendance/supervisor/login', { pin: finalPin });
      if (res.data && res.data.ok) {
        const { token, user: userData, settings: settingsData } = res.data;
        localStorage.setItem('crm_token', token);
        localStorage.setItem('crm_user', JSON.stringify(userData));
        if (settingsData) {
          localStorage.setItem('crm_settings', JSON.stringify(settingsData));
        }
        if (res.data.supervisor) {
          localStorage.setItem('crm_supervisor', JSON.stringify(res.data.supervisor));
        }
        window.location.href = '/app/attendance';
      } else {
        setError(res.data?.error || 'Invalid Supervisor PIN');
        setSupervisorPin('');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to login');
      setSupervisorPin('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FAF7F2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Inter', sans-serif"
      }}
    >
      <div className="login-card-container fade-in">
        {/* Left Side: Brand Banner */}
        <div className="login-brand-side">
          <div>
            {/* Logo pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                padding: '8px 16px',
                marginBottom: '24px'
              }}
            >
              <img
                src={settings?.companyLogoUrl || 'https://bsctextilescandb-ui.github.io/retail-crm/logo.jpg'}
                alt="BSC Logo"
                style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'contain', background: '#FFFFFF' }}
              />
              <span className="outfit" style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>
                {settings?.companyName || 'BSC Exclusive Davangere'}
              </span>
            </div>

            <h1 className="outfit" style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.25, letterSpacing: '-0.5px' }}>
              Retail Operations & Customer Relationship Portal
            </h1>

            <p className="login-brand-desc" style={{ fontSize: '14px', color: '#94A3B8', marginTop: '16px', lineHeight: 1.6 }}>
              Streamlined footfall tracking, customer satisfaction telemetry, store diverts management, and daily cash settlements.
            </p>
          </div>

          {/* Bottom Banner Status */}
          <div className="login-brand-footer">
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(255,255,255,0.06)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Version</div>
                <div style={{ fontSize: '12px', color: '#FFFFFF', fontWeight: 600, marginTop: '2px' }}>v2.4 CRM Core</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Status</div>
                <div style={{ fontSize: '12px', color: '#34D399', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>●</span> Operational
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '13px', color: '#94A3B8' }}>
              © {new Date().getFullYear()} BSC Exclusive Davangere. All rights reserved.
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="login-form-side">
          <div style={{ marginBottom: '24px' }}>
            <h2 className="outfit" style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A' }}>
              Sign In to Your Workspace
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
              Select your role category to log into the CRM system
            </p>
          </div>

          {/* Role Navigation Pills matching screenshot style */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '24px' }}>
            {[
              { id: 'admin', label: '🛡️ Manager / Admin' },
              { id: 'crm', label: '📊 CRM Staff' },
              { id: 'greeter', label: '🚶 Greeter PIN' },
              { id: 'supervisor', label: '🔐 Supervisor' }
            ].map(role => (
              <button
                key={role.id}
                onClick={() => {
                  setSelectedRole(role.id as LoginRole);
                  setError('');
                  if (role.id === 'admin') setUsername('admin@store.com');
                  else if (role.id === 'crm') setUsername('crm@store.com');
                  else setUsername('');
                }}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: selectedRole === role.id ? 700 : 500,
                  background: selectedRole === role.id ? '#D97706' : '#FAF7F2',
                  color: selectedRole === role.id ? '#FFFFFF' : '#475569',
                  border: selectedRole === role.id ? 'none' : '1px solid #EAE5DC',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {role.label}
              </button>
            ))}
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {/* STANDARD PASSWORD LOGIN FORM */}
          {(selectedRole === 'admin' || selectedRole === 'crm') ? (
            <form onSubmit={handleSubmitStandard}>
              <div className="field">
                <label>Email Address / Username</label>
                <input
                  type="text"
                  placeholder="name@bsctextiles.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                  <label style={{ margin: 0 }}>Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'none', border: 'none', fontSize: '11px', color: '#4F46E5', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {showPassword ? 'Hide Password' : 'Show Password'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary btn-full btn-lg"
                style={{ background: '#1E293B', borderColor: '#1E293B', marginTop: '12px' }}
              >
                {submitting ? 'Authenticating...' : 'Sign In →'}
              </button>
            </form>
          ) : selectedRole === 'greeter' ? (
            /* GREETER TABLET PIN LOGIN FORM */
            <div>
              <div className="field">
                <label>Select Greeter Staff</label>
                <select
                  value={selectedGreeterName}
                  onChange={(e) => setSelectedGreeterName(e.target.value)}
                >
                  {greeterList.length > 0 ? (
                    greeterList.map(g => (
                      <option key={g.id} value={g.name}>{g.name}</option>
                    ))
                  ) : (
                    <option value="">No greeters found</option>
                  )}
                </select>
              </div>

              {/* Visual PIN Dots Display */}
              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '12px' }}>
                  ENTER 4-DIGIT PIN
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
                  {[0, 1, 2, 3].map(i => (
                    <div
                      key={i}
                      style={{
                        width: '42px',
                        height: '48px',
                        borderRadius: '10px',
                        border: '2px solid #CBD5E1',
                        background: i < greeterPin.length ? '#D97706' : '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        fontWeight: 800,
                        color: '#FFFFFF',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {i < greeterPin.length ? '●' : ''}
                    </div>
                  ))}
                </div>
              </div>

              {/* Circular Keypad for Touch Tablets */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                  maxWidth: '280px',
                  margin: '0 auto 16px auto'
                }}
              >
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleGreeterPinInput(num)}
                    style={{
                      height: '52px',
                      borderRadius: '12px',
                      background: '#FAF7F2',
                      border: '1px solid #EAE5DC',
                      fontSize: '18px',
                      fontWeight: 800,
                      color: '#0F172A',
                      cursor: 'pointer'
                    }}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setGreeterPin('')}
                  style={{
                    height: '52px',
                    borderRadius: '12px',
                    background: '#FEE2E2',
                    border: '1px solid #FCA5A5',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#EF4444',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleGreeterPinInput('0')}
                  style={{
                    height: '52px',
                    borderRadius: '12px',
                    background: '#FAF7F2',
                    border: '1px solid #EAE5DC',
                    fontSize: '18px',
                    fontWeight: 800,
                    color: '#0F172A',
                    cursor: 'pointer'
                  }}
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleGreeterPinBackspace}
                  style={{
                    height: '52px',
                    borderRadius: '12px',
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  ⌫
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleGreeterSubmit()}
                disabled={greeterPin.length !== 4 || submitting}
                className="btn btn-primary btn-full btn-lg"
                style={{ background: '#D97706', borderColor: '#D97706' }}
              >
                {submitting ? 'Verifying PIN...' : 'Login as Greeter →'}
              </button>
            </div>
          ) : (
            /* SUPERVISOR PIN LOGIN FORM */
            <div>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <p style={{ fontSize: '14px', color: '#64748B' }}>Enter your 4-digit Section PIN</p>
              </div>

              {/* Visual PIN Dots Display */}
              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
                  {[0, 1, 2, 3].map(i => (
                    <div
                      key={i}
                      style={{
                        width: '42px',
                        height: '48px',
                        borderRadius: '10px',
                        border: '2px solid #CBD5E1',
                        background: i < supervisorPin.length ? '#1E293B' : '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        fontWeight: 800,
                        color: '#FFFFFF',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {i < supervisorPin.length ? '●' : ''}
                    </div>
                  ))}
                </div>
              </div>

              {/* Circular Keypad for Touch Tablets */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                  maxWidth: '280px',
                  margin: '0 auto 16px auto'
                }}
              >
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleSupervisorPinInput(num)}
                    style={{
                      height: '52px',
                      borderRadius: '12px',
                      background: '#FAF7F2',
                      border: '1px solid #EAE5DC',
                      fontSize: '18px',
                      fontWeight: 800,
                      color: '#0F172A',
                      cursor: 'pointer'
                    }}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSupervisorPin('')}
                  style={{
                    height: '52px',
                    borderRadius: '12px',
                    background: '#FEE2E2',
                    border: '1px solid #FCA5A5',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#EF4444',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleSupervisorPinInput('0')}
                  style={{
                    height: '52px',
                    borderRadius: '12px',
                    background: '#FAF7F2',
                    border: '1px solid #EAE5DC',
                    fontSize: '18px',
                    fontWeight: 800,
                    color: '#0F172A',
                    cursor: 'pointer'
                  }}
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleSupervisorPinBackspace}
                  style={{
                    height: '52px',
                    borderRadius: '12px',
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  ⌫
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleSupervisorSubmit()}
                disabled={supervisorPin.length !== 4 || submitting}
                className="btn btn-primary btn-full btn-lg"
                style={{ background: '#1E293B', borderColor: '#1E293B' }}
              >
                {submitting ? 'Verifying PIN...' : 'Login as Supervisor →'}
              </button>
            </div>
          )}

          <div style={{ marginTop: '24px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
            Designed and Developed by <span style={{ color: '#4F46E5', fontWeight: 800 }}>Renukaradhya M S</span>
          </div>
        </div>
      </div>
    </div>
  );
}
