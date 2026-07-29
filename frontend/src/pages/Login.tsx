import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, settings } = useAuth();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter your username and password.');
      return;
    }

    setSubmitting(true);
    setError('');

    const res = await login(username, password);
    setSubmitting(false);

    if (!res.ok) {
      setError(res.error || 'Invalid credentials. Please try again.');
      setPassword('');
    }
  };

  const handleForgotPwd = () => {
    alert('Please contact your Super Admin to reset your password.');
  };

  return (
    <div className="page fade-in">
      <div className="card">
        {/* Brand Strip */}
        <div className="brand-strip">
          <div className="brand-icon">
            <img 
              src={settings?.companyLogoUrl || 'https://bsctextilescandb-ui.github.io/retail-crm/logo.jpg'} 
              alt="Logo" 
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <div className="brand-text">
            <h1>{settings?.companyName || 'Retail CRM'}</h1>
            <p>Staff Portal</p>
          </div>
        </div>

        {/* Card Body */}
        <div className="card-body">
          <h2 className="card-title serif">Welcome back</h2>
          <p className="card-sub">Sign in to access your CRM dashboard</p>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-error" style={{ display: 'block' }}>
                {error}
              </div>
            )}

            <div className="field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                autoComplete="username"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                disabled={submitting}
              />
              <span className="link-sm" onClick={handleForgotPwd}>
                Forgot password?
              </span>
            </div>

            <button
              id="loginBtn"
              type="submit"
              className="btn btn-teal btn-full"
              disabled={submitting}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {submitting && <span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.25)', borderTopColor: '#fff' }}></span>}
              {submitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <p className="footer-note">Authorized personnel only · Access is logged</p>
        </div>
      </div>
    </div>
  );
}
