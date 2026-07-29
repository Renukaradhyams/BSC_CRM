import React, { useState } from 'react';
import api from '../../services/api';

interface CashLoginProps {
  onAuthenticated: (token: string) => void;
}

export default function CashLogin({ onAuthenticated }: CashLoginProps) {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleKeyTap = async (num: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + num;
    setPin(newPin);
    setError('');

    if (newPin.length === 4) {
      try {
        setSubmitting(true);
        const res = await api.post('/api/auth/cash-login', { pin: newPin });
        if (res.data && res.data.ok) {
          localStorage.setItem('cash_settlement_token', res.data.cashToken);
          onAuthenticated(res.data.cashToken);
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
      background: '#1E2D5A',
      color: '#fff',
      padding: '40px 24px'
    }} className="fade-in">
      <div style={{
        width: '96px',
        height: '96px',
        background: '#fff',
        borderRadius: '22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
        padding: '6px'
      }}>
        <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#1E2D5A' }}>BSC</span>
      </div>
      
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>BSC BELAGAVI</h2>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', marginBottom: '32px' }}>
        The Textile Mall · Cash Settlement
      </p>

      {/* PIN dots status display */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: i < pin.length ? '#fff' : 'rgba(255,255,255,0.2)',
              border: '2px solid rgba(255,255,255,0.35)',
              transition: 'all 0.15s'
            }}
          />
        ))}
      </div>

      <div style={{ color: '#ff7675', fontSize: '13px', minHeight: '22px', marginBottom: '24px' }}>
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
              height: '64px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: '24px',
              fontWeight: 'bold',
              cursor: 'pointer',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {num}
          </button>
        ))}
        <div /> {/* blank grid slot */}
        <button
          type="button"
          onClick={() => handleKeyTap('0')}
          disabled={submitting}
          style={{
            height: '64px',
            borderRadius: '14px',
            background: 'rgba(255,255,255,0.1)',
            color: '#fff',
            fontSize: '24px',
            fontWeight: 'bold',
            cursor: 'pointer',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          0
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          disabled={submitting}
          style={{
            height: '64px',
            borderRadius: '14px',
            background: 'rgba(255,255,255,0.1)',
            color: '#ff7675',
            fontSize: '20px',
            cursor: 'pointer',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
