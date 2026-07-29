import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

type LoginRole = 'admin' | 'crm' | 'greeter' | 'telecaller';

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

  // Greeter specific states
  const [greeterList, setGreeterList] = useState<GreeterOption[]>([]);
  const [selectedGreeterName, setSelectedGreeterName] = useState<string>('');
  const [greeterPin, setGreeterPin] = useState<string>('');

  useEffect(() => {
    // Fetch greeters for greeter role selection
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
      setError(res.error || 'Invalid credentials. Please try again.');
      setPassword('');
    } else {
      navigate('/app');
    }
  };

  const handleGreeterPinInput = (num: string) => {
    if (greeterPin.length < 4) {
      setGreeterPin(prev => prev + num);
    }
  };

  const handleGreeterPinBackspace = () => {
    setGreeterPin(prev => prev.slice(0, -1));
  };

  const handleGreeterSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedGreeterName) {
      setError('Please select your greeter name.');
      return;
    }
    if (greeterPin.length !== 4) {
      setError('Please enter your 4-digit PIN.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await api.post('/api/auth/greeter-login', {
        name: selectedGreeterName,
        pin: greeterPin
      });

      if (res.data && res.data.ok) {
        const { token, user: userData, settings: settingsData } = res.data;
        localStorage.setItem('crm_token', token);
        localStorage.setItem('crm_user', JSON.stringify(userData));
        if (settingsData) {
          localStorage.setItem('crm_settings', JSON.stringify(settingsData));
        }
        // Force reload / navigation to greeter tablet view
        window.location.href = '/app/greeter';
      } else {
        setError(res.data.error || 'Greeter PIN login failed.');
        setGreeterPin('');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to authenticate greeter.');
      setGreeterPin('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page fade-in">
      <div 
        className="card" 
        style={{
          maxWidth: '960px',
          display: 'grid',
          gridTemplateColumns: '1fr 1.2fr',
          minHeight: '620px',
          background: '#121626',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        {/* Left Brand Showcase Panel */}
        <div 
          style={{
            background: 'linear-gradient(145deg, #1C233D 0%, #0E1324 100%)',
            padding: '44px 36px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Subtle Ambient Glow */}
          <div 
            style={{
              position: 'absolute',
              top: '-80px',
              left: '-80px',
              width: '240px',
              height: '240px',
              background: 'radial-gradient(circle, rgba(245,200,66,0.15) 0%, rgba(0,0,0,0) 70%)',
              pointerEvents: 'none'
            }}
          />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
              <div 
                style={{
                  width: '50px',
                  height: '50px',
                  background: '#FFFFFF',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  padding: '4px'
                }}
              >
                <img 
                  src={settings?.companyLogoUrl || 'https://bsctextilescandb-ui.github.io/retail-crm/logo.jpg'} 
                  alt="Logo"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '10px' }}
                />
              </div>
              <div>
                <h1 className="outfit" style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1 }}>
                  {settings?.companyName || 'BSC Textiles'}
                </h1>
                <p style={{ fontSize: '11px', color: 'var(--text-gold)', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '3px', fontWeight: 600 }}>
                  Retail Management CRM
                </p>
              </div>
            </div>

            <div style={{ marginTop: '40px' }}>
              <h2 className="outfit" style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.25, marginBottom: '12px' }}>
                Store Operations & Experience Portal
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Unified intelligence for footfalls, customer satisfaction, sourcing diverts, and store visual merchandising.
              </p>
            </div>
          </div>

          {/* Quick Info Badges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
              <span style={{ color: 'var(--gold)', fontSize: '16px' }}>✨</span>
              <span>Tablet-ready hourly footfall & feedback capture</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
              <span style={{ color: '#10B981', fontSize: '16px' }}>🛡️</span>
              <span>Encrypted multi-role access control</span>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div style={{ padding: '40px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 className="outfit" style={{ fontSize: '24px', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
            Sign In to Portal
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Select your staff role to open your portal workspace
          </p>

          {/* Role Selector Grid */}
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              marginBottom: '24px',
              background: 'rgba(255,255,255,0.03)',
              padding: '6px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            {[
              { id: 'admin', label: 'Admin', icon: '🛡️' },
              { id: 'crm', label: 'CRM', icon: '📊' },
              { id: 'greeter', label: 'Greeter', icon: '🚶' },
              { id: 'telecaller', label: 'Telecaller', icon: '📞' }
            ].map(role => (
              <button
                key={role.id}
                type="button"
                onClick={() => {
                  setSelectedRole(role.id as LoginRole);
                  setError('');
                }}
                style={{
                  padding: '10px 6px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  background: selectedRole === role.id ? 'var(--gold)' : 'transparent',
                  color: selectedRole === role.id ? '#0B0E19' : 'var(--text-muted)',
                  boxShadow: selectedRole === role.id ? '0 4px 12px rgba(245,200,66,0.3)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ fontSize: '18px' }}>{role.icon}</span>
                <span>{role.label}</span>
              </button>
            ))}
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {/* Role 1, 2, 4: Standard Email/Username + Password Login Form */}
          {selectedRole !== 'greeter' && (
            <form onSubmit={handleSubmitStandard} className="fade-in">
              <div className="field">
                <label htmlFor="username">Email / Username</label>
                <input
                  id="username"
                  type="text"
                  placeholder={
                    selectedRole === 'admin' ? 'admin@store.com' :
                    selectedRole === 'crm' ? 'crm@store.com' : 'tele@store.com'
                  }
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label htmlFor="password" style={{ margin: 0 }}>Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'none', border: 0, color: 'var(--text-gold)', fontSize: '12px', cursor: 'pointer' }}
                  >
                    {showPassword ? '🙈 Hide' : '👁️ Show'}
                  </button>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={submitting}
                style={{ marginTop: '10px' }}
              >
                {submitting ? <span className="spinner"></span> : `Sign In as ${selectedRole.toUpperCase()}`}
              </button>
            </form>
          )}

          {/* Role 3: Store Greeter Tablet PIN Pad Login */}
          {selectedRole === 'greeter' && (
            <form onSubmit={handleGreeterSubmit} className="fade-in">
              <div className="field">
                <label>Select Greeter Staff</label>
                <select
                  value={selectedGreeterName}
                  onChange={(e) => setSelectedGreeterName(e.target.value)}
                  disabled={submitting}
                >
                  {greeterList.length === 0 ? (
                    <option value="">No greeter users found</option>
                  ) : (
                    greeterList.map(g => (
                      <option key={g.id} value={g.name}>{g.name}</option>
                    ))
                  )}
                </select>
              </div>

              {/* PIN Display Dots */}
              <div className="field" style={{ textAlign: 'center' }}>
                <label>Enter 4-Digit Greeter PIN</label>
                <div 
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '12px',
                    margin: '12px 0'
                  }}
                >
                  {[0, 1, 2, 3].map(idx => (
                    <div
                      key={idx}
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: '2px solid var(--gold)',
                        background: greeterPin.length > idx ? 'var(--gold)' : 'transparent',
                        transition: 'all 0.15s ease',
                        boxShadow: greeterPin.length > idx ? '0 0 10px rgba(245,200,66,0.5)' : 'none'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Numeric Tactile PIN Pad */}
              <div 
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '10px',
                  maxWidth: '280px',
                  margin: '0 auto 20px'
                }}
              >
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      if (num === 'C') setGreeterPin('');
                      else if (num === '⌫') handleGreeterPinBackspace();
                      else handleGreeterPinInput(num);
                    }}
                    style={{
                      height: '46px',
                      borderRadius: '12px',
                      background: num === 'C' || num === '⌫' ? 'rgba(255,255,255,0.06)' : 'rgba(245,200,66,0.1)',
                      color: num === 'C' || num === '⌫' ? 'var(--text-muted)' : 'var(--text-gold)',
                      border: '1px solid rgba(245,200,66,0.2)',
                      fontSize: '18px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="btn btn-teal btn-full"
                disabled={submitting || greeterPin.length !== 4}
              >
                {submitting ? <span className="spinner"></span> : '🚀 Open Greeter Tablet Portal'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
