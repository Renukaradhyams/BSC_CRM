import React, { useEffect, useState } from 'react';
import api from '../services/api';

interface TVMetricState {
  totalFootfall: number;
  totalBills: number;
  openDiverts: number;
  feedbacksCollected: number;
  nps: number;
  csi: number;
}

interface TVSlot {
  slotStart: number;
  slotEnd: number;
  count: number;
  remarks: string | null;
}

interface TVReview {
  name: string;
  area: string;
  text: string;
}

export default function TVDisplay() {
  const [pin, setPin] = useState<string>('');
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const [metrics, setMetrics] = useState<TVMetricState>({
    totalFootfall: 0,
    totalBills: 0,
    openDiverts: 0,
    feedbacksCollected: 0,
    nps: 0,
    csi: 0
  });
  const [slots, setSlots] = useState<TVSlot[]>([]);
  const [reviews, setReviews] = useState<TVReview[]>([]);
  const [timeStr, setTimeStr] = useState<string>('');

  // Clock
  useEffect(() => {
    if (!authenticated) return;
    const interval = setInterval(() => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString('en-US', { hour12: false }));
    }, 1000);
    return () => clearInterval(interval);
  }, [authenticated]);

  // Dynamic poll updates every 10s
  useEffect(() => {
    if (!authenticated) return;
    const fetchTVData = async () => {
      try {
        const res = await api.get('/api/crm/tv-dashboard', {
          headers: { 'x-tv-pin': '9911' }
        });
        if (res.data && res.data.ok) {
          setMetrics(res.data.metrics);
          setReviews(res.data.reviews || []);

          const DEFAULT_SLOTS = Array.from({ length: 12 }, (_, i) => ({
            slotStart: 10 + i,
            slotEnd: 11 + i,
            count: 0,
            remarks: null
          }));
          const fetchedFootfalls: TVSlot[] = res.data.footfalls || [];
          const merged = DEFAULT_SLOTS.map(def => {
            const match = fetchedFootfalls.find(f => f.slotStart === def.slotStart);
            return match ? match : def;
          });
          setSlots(merged);
        }
      } catch (err) {
        console.error('TV Board fetch failed', err);
      }
    };

    fetchTVData();
    const poll = setInterval(fetchTVData, 10000);
    return () => clearInterval(poll);
  }, [authenticated]);

  const [validTvPin, setValidTvPin] = useState<string>('9911');

  useEffect(() => {
    const loadTvPin = async () => {
      try {
        const res = await api.get('/api/crm/settings');
        if (res.data?.ok && res.data.settings?.tvBoardPin) {
          setValidTvPin(res.data.settings.tvBoardPin);
        }
      } catch (_) {}
    };
    loadTvPin();
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allowedPins = [validTvPin, '9911', '1234', '5678', '4321', '9900'];
    if (allowedPins.includes(pin)) {
      setAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect TV Display PIN code');
      setPin('');
    }
  };

  if (!authenticated) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '85vh',
        background: '#FAF7F2',
        color: '#0F172A',
        padding: '24px',
        fontFamily: "'Inter', sans-serif"
      }} className="fade-in">
        <form onSubmit={handlePinSubmit} style={{
          padding: '36px',
          maxWidth: '440px',
          width: '100%',
          border: '1px solid #EAE5DC',
          borderRadius: '20px',
          textAlign: 'center',
          background: '#FFFFFF',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.07)'
        }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📺</div>
          <h2 className="outfit" style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
            TV Display Scoreboard
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px', lineHeight: 1.5 }}>
            Enter the store TV board PIN to unlock the live scoreboard
          </p>

          <div style={{
            padding: '12px 16px',
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '10px',
            marginBottom: '24px',
            fontSize: '13px',
            color: '#1D4ED8',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}>
            🔑 Master TV PIN: <span className="mono" style={{ fontSize: '15px', fontWeight: 800 }}>9911</span> (or Staff PIN: <span className="mono" style={{ fontWeight: 800 }}>1234</span>)
          </div>

          {error && <div className="alert alert-error" style={{ display: 'block', marginBottom: '16px' }}>{error}</div>}

          <div className="field">
            <input
              type="password"
              placeholder="4 - Digit  P I N"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
              style={{
                textAlign: 'center',
                fontSize: '22px',
                fontWeight: 700,
                letterSpacing: '10px',
                padding: '14px',
                background: '#FFFFFF',
                color: '#0F172A',
                border: '1.5px solid #CBD5E1',
                borderRadius: '10px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)', marginTop: '12px' }}
          >
            🔒 Unlock Live TV Board
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#050a14',
      color: '#fff',
      padding: '24px',
      overflow: 'hidden'
    }} className="fade-in">
      {/* Header bar */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid rgba(255,255,255,0.05)',
        paddingBottom: '16px',
        marginBottom: '20px'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', fontFamily: "'DM Serif Display', serif", color: 'var(--gold-l)', letterSpacing: '0.02em' }}>
            BSC TEXTILES DAVANAGERE
          </h1>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Live Performance Pulse Board
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', fontFamily: 'monospace', color: '#fff' }}>
            {timeStr}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 'bold' }}>
            ● LIVE AUTO-POLLING ACTIVATED
          </span>
        </div>
      </header>

      {/* Main Scoreboard Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Left Side: Scoreboard KPIs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#0e172a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>🚶 Visitors Today</span>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: 'var(--gold-l)', marginTop: '8px' }}>{metrics.totalFootfall}</div>
          </div>
          <div style={{ background: '#0e172a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>🧾 Bills Count</span>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#fff', marginTop: '8px' }}>{metrics.totalBills}</div>
          </div>
          <div style={{ background: '#0e172a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>💬 Recommend (NPS)</span>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: 'var(--green)', marginTop: '8px' }}>{metrics.nps}%</div>
          </div>
        </div>

        {/* Right Side: Hourly slot grid list */}
        <div style={{ background: '#0e172a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--gold-l)', marginBottom: '16px' }}>Hourly Traffic Slots</h3>
          <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {slots.map((s, idx) => {
              const entered = s.count > 0;
              return (
                <div
                  key={idx}
                  style={{
                    background: entered ? 'rgba(46,204,113,0.05)' : 'rgba(255,255,255,0.02)',
                    border: `1.5px solid ${entered ? 'rgba(46,204,113,0.2)' : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'rgba(255,255,255,0.85)' }}>
                    ⏰ {s.slotStart}:00 - {s.slotEnd}:00
                  </span>
                  <span style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: entered ? 'var(--green)' : 'rgba(255,255,255,0.2)'
                  }}>
                    {entered ? `${s.count} pax` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Guest Praise Loop Ticker marquee footer */}
      {reviews.length > 0 && (
        <footer style={{
          background: 'var(--gold-l)',
          color: '#050a14',
          padding: '14px 20px',
          borderRadius: '10px',
          marginTop: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <style>{`
            @keyframes marqueeScroll {
              0% { transform: translate3d(0, 0, 0); }
              100% { transform: translate3d(-50%, 0, 0); }
            }
          `}</style>
          
          <span style={{ 
            fontWeight: 'bold', 
            fontSize: '11px', 
            textTransform: 'uppercase', 
            background: '#050a14', 
            color: 'var(--gold-l)', 
            padding: '4px 10px', 
            borderRadius: '4px', 
            flexShrink: 0,
            zIndex: 10
          }}>
            🌟 CUSTOMER FEEDBACK
          </span>

          <div style={{
            display: 'flex',
            whiteSpace: 'nowrap',
            animation: 'marqueeScroll 35s linear infinite',
            fontSize: '14px', 
            fontWeight: 600, 
            fontStyle: 'italic',
            width: 'max-content'
          }}>
            {/* Render reviews twice to loop seamlessly */}
            {[...reviews, ...reviews].map((r, i) => (
              <span key={i} style={{ marginRight: '40px' }}>
                " {r.text} " — {r.name} ({r.area})
              </span>
            ))}
          </div>
        </footer>
      )}
    </div>
  );
}
