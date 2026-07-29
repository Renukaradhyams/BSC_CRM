import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

type GreeterTab = 'footfall' | 'feedback';

interface FootfallSlot {
  slotStart: number;
  slotEnd: number;
  count: number;
}

export default function Greeter() {
  const { user, logout, settings } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<GreeterTab>('footfall');
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // ── Footfall States ────────────────────────────────────────────────────────
  const [countInput, setCountInput] = useState<string>('');
  const [footfallSlots, setFootfallSlots] = useState<FootfallSlot[]>([]);
  const [todayTotal, setTodayTotal] = useState<number>(0);

  // Identify current hour slot (e.g. 14 -> 14:00 - 15:00)
  const now = new Date();
  const currentHour = now.getHours();
  const currentSlotStart = currentHour < 10 ? 10 : currentHour >= 22 ? 21 : currentHour;
  const currentSlotEnd = currentSlotStart + 1;

  // ── Feedback States ────────────────────────────────────────────────────────
  const [serviceRating, setServiceRating] = useState<string>('Excellent');
  const [recommendRating, setRecommendRating] = useState<string>('Yes, Definitely');
  const [area, setArea] = useState<string>('Ground Floor');
  const [customerVoice, setCustomerVoice] = useState<string>('');
  const [custName, setCustName] = useState<string>('');
  const [custMobile, setCustMobile] = useState<string>('');

  const [submittedFeedbackSuccess, setSubmittedFeedbackSuccess] = useState<boolean>(false);

  useEffect(() => {
    fetchFootfallData();
  }, []);

  const fetchFootfallData = async () => {
    try {
      const todayStr = new Date().toLocaleDateString('en-GB');
      const res = await api.get(`/api/crm/footfall?date=${todayStr}`);
      if (res.data && res.data.ok) {
        const fetched: FootfallSlot[] = res.data.footfalls || [];
        setFootfallSlots(fetched);
        const total = fetched.reduce((sum, item) => sum + item.count, 0);
        setTodayTotal(total);

        // Pre-fill current slot count if already entered
        const currentMatch = fetched.find(f => f.slotStart === currentSlotStart);
        if (currentMatch && currentMatch.count > 0) {
          setCountInput(currentMatch.count.toString());
        }
      }
    } catch (err) {
      console.error('Failed to load footfall slots', err);
    }
  };

  const handleFootfallKeypad = (num: string) => {
    if (num === 'C') {
      setCountInput('');
    } else if (num === '⌫') {
      setCountInput(prev => prev.slice(0, -1));
    } else {
      if (countInput.length < 4) {
        setCountInput(prev => prev + num);
      }
    }
  };

  const handleFootfallSubmit = async () => {
    if (!countInput || parseInt(countInput, 10) < 0) {
      setErrorMsg('Please enter visitor count.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const todayStr = new Date().toLocaleDateString('en-GB');
      const res = await api.post('/api/crm/footfall', {
        date: todayStr,
        slotStart: currentSlotStart,
        slotEnd: currentSlotEnd,
        count: parseInt(countInput, 10),
        submittedBy: user?.name || 'Greeter'
      });

      if (res.data && res.data.ok) {
        setSuccessMsg(`✅ Slot ${currentSlotStart}:00–${currentSlotEnd}:00 saved: ${countInput} visitors!`);
        fetchFootfallData();
      } else {
        setErrorMsg(res.data.error || 'Failed to save footfall count');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to submit footfall count');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const todayStr = new Date().toLocaleDateString('en-GB');
      const res = await api.post('/api/crm/feedback', {
        date: todayStr,
        source: 'greeter_tablet',
        area,
        yourVoice: customerVoice || null,
        custName: custName || null,
        custMobile: custMobile || null,
        q0: serviceRating,
        q1: recommendRating
      });

      if (res.data && res.data.ok) {
        setSubmittedFeedbackSuccess(true);
        // Reset feedback form
        setServiceRating('Excellent');
        setRecommendRating('Yes, Definitely');
        setCustomerVoice('');
        setCustName('');
        setCustMobile('');
      } else {
        setErrorMsg(res.data.error || 'Failed to submit feedback');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to submit feedback.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
      {/* Tablet Header Bar */}
      <header
        style={{
          height: '70px',
          background: '#0E1324',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '0 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              background: '#FFFFFF',
              borderRadius: '10px',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img
              src={settings?.companyLogoUrl || 'https://bsctextilescandb-ui.github.io/retail-crm/logo.jpg'}
              alt="Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px' }}
            />
          </div>
          <div>
            <h1 className="outfit" style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1 }}>
              {settings?.companyName || 'BSC Textiles'}
            </h1>
            <span style={{ fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              Greeter Entrance Portal
            </span>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div 
          style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.05)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          <button
            onClick={() => { setActiveTab('footfall'); setSubmittedFeedbackSuccess(false); }}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 700,
              background: activeTab === 'footfall' ? 'var(--gold)' : 'transparent',
              color: activeTab === 'footfall' ? '#0B0E19' : 'var(--text-muted)'
            }}
          >
            🚶 Log Hourly Footfall
          </button>
          <button
            onClick={() => { setActiveTab('feedback'); setSubmittedFeedbackSuccess(false); }}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 700,
              background: activeTab === 'feedback' ? 'var(--gold)' : 'transparent',
              color: activeTab === 'feedback' ? '#0B0E19' : 'var(--text-muted)'
            }}
          >
            💬 Collect Feedback
          </button>
        </div>

        {/* User & Sign Out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>{user?.name || 'Greeter Staff'}</div>
            <div style={{ fontSize: '10px', color: '#10B981', textTransform: 'uppercase', fontWeight: 700 }}>● Active Desk</div>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm">
            🚪 Exit
          </button>
        </div>
      </header>

      {/* Main Body Viewport */}
      <main style={{ flex: 1, padding: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {errorMsg && <div className="alert alert-error" style={{ position: 'fixed', top: '80px', zIndex: 100 }}>{errorMsg}</div>}
        {successMsg && <div className="alert alert-success" style={{ position: 'fixed', top: '80px', zIndex: 100 }}>{successMsg}</div>}

        {/* MODE 1: HOURLY FOOTFALL ENTRY */}
        {activeTab === 'footfall' && (
          <div 
            className="fade-in" 
            style={{ 
              maxWidth: '850px', 
              width: '100%', 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '32px', 
              alignItems: 'center' 
            }}
          >
            {/* Keypad & Slot Card */}
            <div className="glass-card glow-gold" style={{ padding: '32px', textAlign: 'center' }}>
              <div className="badge badge-gold" style={{ marginBottom: '12px' }}>
                CURRENT TIME SLOT
              </div>
              <h2 className="outfit" style={{ fontSize: '32px', fontWeight: 800, color: '#FFFFFF' }}>
                {currentSlotStart}:00 – {currentSlotEnd}:00
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '6px 0 24px' }}>
                Tap numbers to enter visitor count for this hour
              </p>

              {/* Number Display Screen */}
              <div 
                className="mono" 
                style={{ 
                  background: '#0B0E19', 
                  border: '2px solid var(--gold)', 
                  borderRadius: '16px', 
                  padding: '16px', 
                  fontSize: '42px', 
                  fontWeight: 800, 
                  color: 'var(--gold)',
                  marginBottom: '24px',
                  boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
                }}
              >
                {countInput || '0'}
              </div>

              {/* Tactile Keypad */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(num => (
                  <button
                    key={num}
                    onClick={() => handleFootfallKeypad(num)}
                    style={{
                      height: '56px',
                      borderRadius: '14px',
                      background: num === 'C' || num === '⌫' ? 'rgba(255,255,255,0.06)' : 'rgba(245,200,66,0.12)',
                      color: num === 'C' || num === '⌫' ? 'var(--text-muted)' : '#FFFFFF',
                      fontSize: '22px',
                      fontWeight: 700,
                      border: '1px solid rgba(245,200,66,0.2)',
                      cursor: 'pointer'
                    }}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <button
                onClick={handleFootfallSubmit}
                className="btn btn-primary btn-full"
                disabled={loading}
                style={{ padding: '16px', fontSize: '16px' }}
              >
                {loading ? <span className="spinner"></span> : '✅ Save Footfall Entry'}
              </button>
            </div>

            {/* Today's Running Summary Card */}
            <div>
              <div className="glass-card glow-blue" style={{ padding: '28px', marginBottom: '20px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                  TODAY'S TOTAL VISITORS
                </span>
                <div className="mono" style={{ fontSize: '54px', fontWeight: 800, color: '#FFFFFF', marginTop: '8px' }}>
                  {todayTotal.toLocaleString()}
                </div>
                <div style={{ fontSize: '13px', color: '#10B981', marginTop: '4px', fontWeight: 600 }}>
                  ● Live Store Entrance Counter
                </div>
              </div>

              {/* Slot History Grid */}
              <div className="glass-card" style={{ padding: '20px', maxHeight: '340px', overflowY: 'auto' }}>
                <h4 className="outfit" style={{ fontSize: '15px', color: '#FFFFFF', marginBottom: '14px' }}>
                  Today's Submitted Slots
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {footfallSlots.map((s, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: s.slotStart === currentSlotStart ? 'rgba(245,200,66,0.1)' : 'rgba(255,255,255,0.03)',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: s.slotStart === currentSlotStart ? '1px solid var(--gold)' : '1px solid transparent'
                      }}
                    >
                      <span className="mono" style={{ fontSize: '13px', fontWeight: 600, color: s.slotStart === currentSlotStart ? 'var(--gold)' : 'var(--text-main)' }}>
                        {s.slotStart}:00 – {s.slotEnd}:00
                      </span>
                      <span className="mono" style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>
                        {s.count} visitors
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: CUSTOMER FEEDBACK COLLECTION */}
        {activeTab === 'feedback' && (
          <div className="fade-in" style={{ maxWidth: '650px', width: '100%' }}>
            {submittedFeedbackSuccess ? (
              <div className="glass-card glow-teal" style={{ padding: '48px 36px', textAlign: 'center' }}>
                <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
                <h2 className="outfit" style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
                  Thank You for Your Feedback!
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' }}>
                  Your review has been recorded to help us improve our store experience.
                </p>
                <button
                  onClick={() => setSubmittedFeedbackSuccess(false)}
                  className="btn btn-primary"
                  style={{ padding: '14px 32px' }}
                >
                  ➕ Submit Another Feedback
                </button>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="glass-card" style={{ padding: '36px' }}>
                <h2 className="outfit" style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>
                  Customer Feedback Survey
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '28px' }}>
                  Please rate your experience at BSC Textiles
                </p>

                {/* Q0: Service Quality Emoji Scale */}
                <div className="field">
                  <label>1. How do you rate our service quality?</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginTop: '8px' }}>
                    {[
                      { label: 'Excellent', emoji: '😍' },
                      { label: 'Good', emoji: '😊' },
                      { label: 'Average', emoji: '😐' },
                      { label: 'Poor', emoji: '🙁' },
                      { label: 'Very Poor', emoji: '😠' }
                    ].map(item => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setServiceRating(item.label)}
                        style={{
                          padding: '12px 6px',
                          borderRadius: '12px',
                          background: serviceRating === item.label ? 'var(--gold)' : 'rgba(255,255,255,0.04)',
                          color: serviceRating === item.label ? '#0B0E19' : 'var(--text-main)',
                          border: serviceRating === item.label ? 'none' : '1px solid rgba(255,255,255,0.08)',
                          fontWeight: 700,
                          fontSize: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span style={{ fontSize: '24px' }}>{item.emoji}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q1: Recommend Scale */}
                <div className="field" style={{ marginTop: '24px' }}>
                  <label>2. Would you recommend BSC Textiles to friends?</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '8px' }}>
                    {[
                      { label: 'Yes, Definitely', emoji: '👍' },
                      { label: 'Maybe', emoji: '🤷' },
                      { label: 'No', emoji: '👎' }
                    ].map(item => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setRecommendRating(item.label)}
                        style={{
                          padding: '14px 10px',
                          borderRadius: '12px',
                          background: recommendRating === item.label ? 'var(--gold)' : 'rgba(255,255,255,0.04)',
                          color: recommendRating === item.label ? '#0B0E19' : 'var(--text-main)',
                          border: recommendRating === item.label ? 'none' : '1px solid rgba(255,255,255,0.08)',
                          fontWeight: 700,
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        <span style={{ fontSize: '20px' }}>{item.emoji}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Area & Comments */}
                <div className="field-row" style={{ marginTop: '20px' }}>
                  <div className="field">
                    <label>Store Floor / Area</label>
                    <select value={area} onChange={(e) => setArea(e.target.value)}>
                      <option value="Ground Floor">Ground Floor (Sarees)</option>
                      <option value="1st Floor">1st Floor (Mens)</option>
                      <option value="2nd Floor">2nd Floor (Kids & Shirting)</option>
                      <option value="3rd Floor">3rd Floor (Ethnic)</option>
                      <option value="Billing Counter">Billing Counter</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Customer Mobile (Optional)</label>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      value={custMobile}
                      onChange={(e) => setCustMobile(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Customer Voice / Feedback Remarks</label>
                  <textarea
                    placeholder="Write customer comments or suggestions here..."
                    value={customerVoice}
                    onChange={(e) => setCustomerVoice(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-teal btn-full"
                  disabled={loading}
                  style={{ padding: '16px', fontSize: '16px', marginTop: '12px' }}
                >
                  {loading ? <span className="spinner"></span> : '✨ Submit Customer Feedback'}
                </button>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
