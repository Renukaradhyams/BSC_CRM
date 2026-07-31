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
      minHeight: '85vh',
      background: '#FAF7F2',
      color: '#0F172A',
      padding: '40px 24px',
      fontFamily: "'Inter', sans-serif"
    }} className="fade-in">
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: '#FFFFFF',
        borderRadius: '20px',
        border: '1px solid #EAE5DC',
        padding: '36px 28px',
        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.07)',
        textAlign: 'center'
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          background: '#1A233D',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          boxShadow: '0 4px 12px rgba(26,35,61,0.2)'
        }}>
          <span style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF' }}>💰</span>
        </div>

        <h2 className="outfit" style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
          Cash Settlement Portal
        </h2>
        <p style={{ color: '#64748B', fontSize: '13px', marginBottom: '24px' }}>
          BSC DAVANAGERE · Enter Cashier 4-Digit PIN
        </p>

        {/* PIN dots status display */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginBottom: '16px' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: '40px',
                height: '46px',
                borderRadius: '10px',
                border: '2px solid #CBD5E1',
                background: i < pin.length ? '#4F46E5' : '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 800,
                color: '#FFFFFF',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease'
              }}
            >
              {i < pin.length ? '●' : ''}
            </div>
          ))}
        </div>

        <div style={{ color: '#EF4444', fontSize: '13px', minHeight: '22px', marginBottom: '16px', fontWeight: 600 }}>
          {error}
        </div>

        {/* Numeric PIN Pad Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          width: '100%',
          maxWidth: '280px',
          margin: '0 auto'
        }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyTap(num)}
              disabled={submitting}
              style={{
                height: '54px',
                borderRadius: '12px',
                background: '#FAF7F2',
                color: '#0F172A',
                fontSize: '20px',
                fontWeight: 800,
                cursor: 'pointer',
                border: '1px solid #EAE5DC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPin('')}
            disabled={submitting}
            style={{
              height: '54px',
              borderRadius: '12px',
              background: '#FEE2E2',
              color: '#EF4444',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid #FCA5A5'
            }}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleKeyTap('0')}
            disabled={submitting}
            style={{
              height: '54px',
              borderRadius: '12px',
              background: '#FAF7F2',
              color: '#0F172A',
              fontSize: '20px',
              fontWeight: 800,
              cursor: 'pointer',
              border: '1px solid #EAE5DC'
            }}
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            disabled={submitting}
            style={{
              height: '54px',
              borderRadius: '12px',
              background: '#F1F5F9',
              color: '#475569',
              fontSize: '18px',
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid #CBD5E1'
            }}
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
}
