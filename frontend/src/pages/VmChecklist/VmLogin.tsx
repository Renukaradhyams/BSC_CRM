import React, { useState } from 'react';
import api from '../../services/api';

interface VmLoginProps {
  onLoginSuccess: (name: string, role: string) => void;
}

export default function VmLogin({ onLoginSuccess }: VmLoginProps) {
  const [name, setName] = useState<string>('DURGAPPA');
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const vmUsers = ["DURGAPPA", "PRASHANT", "NITIN", "SHRIDAR", "SACHIN", "ANIL", "PRAKASH", "VM_MANAGER"];

  const handleKeyTap = async (num: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + num;
    setPin(newPin);
    setError('');

    if (newPin.length === 4) {
      try {
        setSubmitting(true);
        const res = await api.post('/api/auth/vm-login', { name, pin: newPin });
        if (res.data && res.data.ok) {
          localStorage.setItem('vm_user_name', res.data.name);
          localStorage.setItem('vm_user_role', res.data.role);
          onLoginSuccess(res.data.name, res.data.role);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Invalid PIN code');
        setPin('');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      background: '#2c3e50',
      color: '#fff',
      padding: '40px 24px'
    }} className="fade-in">
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>VM Checklist Portal</h2>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', marginBottom: '24px' }}>
        Select your user name and enter your PIN code
      </p>

      {/* Name selector */}
      <div className="field" style={{ width: '100%', maxWidth: '280px', marginBottom: '24px' }}>
        <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>VM staff Name</label>
        <select value={name} onChange={(e) => setName(e.target.value)} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '10px 14px' }}>
          {vmUsers.map(u => <option key={u} value={u} style={{ color: '#000' }}>{u}</option>)}
        </select>
      </div>

      {/* PIN dots display */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: i < pin.length ? '#fff' : 'rgba(255,255,255,0.2)',
              border: '2px solid rgba(255,255,255,0.35)'
            }}
          />
        ))}
      </div>

      <div style={{ color: '#ff7675', fontSize: '13px', minHeight: '22px', marginBottom: '20px' }}>
        {error}
      </div>

      {/* Numeric PIN Pad Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '14px',
        width: '100%',
        maxWidth: '280px'
      }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
          <button
            key={num}
            type="button"
            onClick={() => handleKeyTap(num)}
            disabled={submitting}
            style={{
              height: '60px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: '22px',
              fontWeight: 'bold',
              cursor: 'pointer',
              border: 'none'
            }}
          >
            {num}
          </button>
        ))}
        <div />
        <button
          type="button"
          onClick={() => handleKeyTap('0')}
          disabled={submitting}
          style={{
            height: '60px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.1)',
            color: '#fff',
            fontSize: '22px',
            fontWeight: 'bold',
            cursor: 'pointer',
            border: 'none'
          }}
        >
          0
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          disabled={submitting}
          style={{
            height: '60px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.1)',
            color: '#ff7675',
            fontSize: '18px',
            cursor: 'pointer',
            border: 'none'
          }}
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
