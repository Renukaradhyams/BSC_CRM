import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface VmLoginProps {
  onLoginSuccess: (name: string, role: string) => void;
}

export default function VmLogin({ onLoginSuccess }: VmLoginProps) {
  const [vmUsers, setVmUsers] = useState<string[]>(['DURGAPPA', 'PRASHANT', 'NITIN', 'SHRIDAR', 'SACHIN', 'ANIL', 'PRAKASH', 'VM_MANAGER']);
  const [name, setName] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Load VM users from backend (VMUser table)
  useEffect(() => {
    api.get('/api/vm/users').then(res => {
      if (res.data?.ok && res.data.users?.length > 0) {
        const names = res.data.users.map((u: any) => u.name);
        setVmUsers(names);
        setName(names[0]);
      } else {
        setName('DURGAPPA');
      }
    }).catch(() => {
      setName('DURGAPPA');
    });
  }, []);

  const handleKeyTap = async (num: string) => {
    if (pin.length >= 4 || submitting) return;
    const newPin = pin + num;
    setPin(newPin);
    setError('');

    if (newPin.length === 4) {
      try {
        setSubmitting(true);
        const res = await api.post('/api/auth/vm-login', { name: name || vmUsers[0], pin: newPin });
        if (res.data?.ok) {
          localStorage.setItem('vm_user_name', res.data.name);
          localStorage.setItem('vm_user_role', res.data.role);
          onLoginSuccess(res.data.name, res.data.role);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Invalid PIN code. Please try again.');
        setPin('');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleBackspace = () => {
    if (!submitting) setPin(prev => prev.slice(0, -1));
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0F172A 0%, #1E2A3D 40%, #162032 100%)',
      padding: '40px 24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative floating circles */}
      <div style={{
        position: 'absolute', top: '-120px', right: '-80px',
        width: '350px', height: '350px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-100px', left: '-80px',
        width: '280px', height: '280px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(20,184,166,0.1) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div className="fade-in" style={{
        width: '100%',
        maxWidth: '380px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0'
      }}>
        {/* Header Icon & Title */}
        <div style={{
          width: '72px', height: '72px',
          background: 'linear-gradient(135deg, #14B8A6 0%, #0EA5E9 100%)',
          borderRadius: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '34px', marginBottom: '16px',
          boxShadow: '0 12px 32px rgba(20,184,166,0.35)'
        }}>
          🏢
        </div>

        <h2 className="outfit" style={{
          fontSize: '24px', fontWeight: 900, color: '#FFFFFF',
          marginBottom: '4px', letterSpacing: '-0.3px'
        }}>
          VM Checklist Portal
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', marginBottom: '28px', textAlign: 'center' }}>
          Select your name and enter your 4-digit PIN
        </p>

        {/* Name Selector */}
        <div style={{ width: '100%', marginBottom: '24px' }}>
          <label style={{
            display: 'block', fontSize: '11px', fontWeight: 700,
            color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: '8px'
          }}>
            VM Staff Name
          </label>
          <select
            value={name}
            onChange={(e) => { setName(e.target.value); setPin(''); setError(''); }}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#FFFFFF', fontSize: '14px', fontWeight: 700,
              cursor: 'pointer', outline: 'none'
            }}
          >
            {vmUsers.map(u => <option key={u} value={u} style={{ color: '#000', background: '#fff' }}>{u}</option>)}
          </select>
        </div>

        {/* PIN dots */}
        <div style={{ display: 'flex', gap: '14px', marginBottom: '8px' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{
              width: '16px', height: '16px', borderRadius: '50%',
              background: i < pin.length
                ? 'linear-gradient(135deg, #14B8A6, #0EA5E9)'
                : 'rgba(255,255,255,0.12)',
              border: `2px solid ${i < pin.length ? 'rgba(20,184,166,0.4)' : 'rgba(255,255,255,0.2)'}`,
              boxShadow: i < pin.length ? '0 0 10px rgba(20,184,166,0.5)' : 'none',
              transition: 'all 0.2s ease'
            }} />
          ))}
        </div>

        {/* Error message */}
        <div style={{
          color: '#F87171', fontSize: '13px', fontWeight: 700,
          minHeight: '22px', marginBottom: '16px', textAlign: 'center'
        }}>
          {error}
          {submitting && <span style={{ color: '#94A3B8', fontWeight: 500 }}>Verifying...</span>}
        </div>

        {/* PIN Pad */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          width: '100%'
        }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyTap(num)}
              disabled={submitting}
              style={{
                height: '62px', borderRadius: '14px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#FFFFFF', fontSize: '22px', fontWeight: 800,
                cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.12s ease',
                letterSpacing: '-0.3px'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(20,184,166,0.15)'; e.currentTarget.style.borderColor = 'rgba(20,184,166,0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            >
              {num}
            </button>
          ))}

          {/* Bottom row: empty, 0, backspace */}
          <div />
          <button
            type="button"
            onClick={() => handleKeyTap('0')}
            disabled={submitting}
            style={{
              height: '62px', borderRadius: '14px',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#FFFFFF', fontSize: '22px', fontWeight: 800,
              cursor: submitting ? 'not-allowed' : 'pointer', transition: 'all 0.12s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(20,184,166,0.15)'; e.currentTarget.style.borderColor = 'rgba(20,184,166,0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            disabled={submitting}
            style={{
              height: '62px', borderRadius: '14px',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#F87171', fontSize: '20px',
              cursor: submitting ? 'not-allowed' : 'pointer', transition: 'all 0.12s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
          >
            ⌫
          </button>
        </div>

        {/* Bottom hint */}
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '24px', textAlign: 'center' }}>
          Contact admin if you forget your PIN
        </p>
      </div>
    </div>
  );
}
