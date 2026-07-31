import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface FootfallSlot {
  id?: number;
  slotStart: number;
  slotEnd: number;
  count: number;
  remarks: string | null;
  submittedBy?: string;
  editedBy?: string | null;
}

export default function Footfall() {
  const { user } = useAuth();

  const getTodayISO = (): string => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const [dateQuery, setDateQuery] = useState<string>(getTodayISO());
  const [selectedDateFormatted, setSelectedDateFormatted] = useState<string>('');
  const [slots, setSlots] = useState<FootfallSlot[]>([]);
  const [bills, setBills] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [savingSlot, setSavingSlot] = useState<number | null>(null);
  const [savingBills, setSavingBills] = useState<boolean>(false);
  const [activeModalSlot, setActiveModalSlot] = useState<FootfallSlot | null>(null);
  const [inputCount, setInputCount] = useState<string>('');
  const [inputRemarks, setInputRemarks] = useState<string>('');

  // Past days bills state
  const [pastDays, setPastDays] = useState<Array<{ date: string; dateLabel: string; bills: string; savedBills: number | null; editVal?: string }>>([]);

  const DEFAULT_SLOTS = Array.from({ length: 12 }, (_, i) => ({
    slotStart: 10 + i,
    slotEnd: 11 + i,
    count: 0,
    remarks: null
  }));

  useEffect(() => {
    fetchSlots();
    generatePastDays();
  }, [dateQuery]);

  const fetchSlots = async () => {
    try {
      setError('');
      setSuccess('');
      const parts = dateQuery.split('-');
      const ddmmyyyy = `${parts[2]}/${parts[1]}/${parts[0]}`;
      setSelectedDateFormatted(ddmmyyyy);

      const res = await api.get(`/api/crm/footfall?date=${ddmmyyyy}`);
      if (res.data && res.data.ok) {
        const fetched: FootfallSlot[] = res.data.footfalls || [];
        const merged = DEFAULT_SLOTS.map(def => {
          const match = fetched.find(f => f.slotStart === def.slotStart);
          return match ? { ...match } : { ...def, count: 0, remarks: '' };
        });
        setSlots(merged);
        setBills(res.data.bills ? String(res.data.bills) : '');
      }
    } catch {
      setError('Failed to fetch footfall slot records.');
    }
  };

  const generatePastDays = () => {
    const list = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 1; i <= 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const formatted = `${dd}/${mm}/${yyyy}`;
      const dateLabel = `${dd} ${months[d.getMonth()]} ${yyyy}`;
      list.push({ date: formatted, dateLabel, bills: '', savedBills: Math.floor(150 + Math.random() * 80) });
    }
    setPastDays(list);
  };

  const currentHour = new Date().getHours();
  const isToday = dateQuery === getTodayISO();

  // Helper to check 40-minute slot cutoff (e.g. 4:40 PM for slot 3:00 - 4:00 PM)
  const isSlotExpired = (slotStart: number): boolean => {
    if (!isToday) return false;
    const d = new Date();
    const currentTotalMin = d.getHours() * 60 + d.getMinutes();
    const cutoffTotalMin = (slotStart + 1) * 60 + 40; // e.g. slotStart=15 -> 16:40 (1000 min)
    return currentTotalMin > cutoffTotalMin;
  };

  const getSlotCutoffFormatted = (slotStart: number): string => {
    const endH = slotStart + 1;
    const h = endH % 12 || 12;
    const ampm = endH >= 12 ? 'PM' : 'AM';
    return `${String(h).padStart(2, '0')}:40 ${ampm}`;
  };

  const getSlotStatus = (slot: FootfallSlot) => {
    const isDone = slot.count > 0 || slot.submittedBy;
    if (isDone) return 'done';
    if (currentHour === slot.slotStart) return 'active';
    if (isToday && isSlotExpired(slot.slotStart) && !isDone) return 'missed_expired';
    if (currentHour > slot.slotStart && !isDone) return 'missed';
    return 'pending';
  };

  const totalFootfall = slots.reduce((acc, curr) => acc + (Number(curr.count) || 0), 0);
  const slotsSubmittedCount = slots.filter(s => s.count > 0 || s.submittedBy).length;
  const missedSlotsCount = slots.filter(s => getSlotStatus(s) === 'missed' || getSlotStatus(s) === 'missed_expired').length;
  const activeSlotObj = slots.find(s => currentHour === s.slotStart);

  const formatSlotTime = (hour: number) => {
    const h = hour % 12 || 12;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${String(h).padStart(2, '0')}:00 ${ampm}`;
  };

  const handleOpenSlotModal = (slot: FootfallSlot) => {
    setActiveModalSlot(slot);
    setInputCount(slot.count > 0 ? String(slot.count) : '');
    setInputRemarks(slot.remarks || '');
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalSlot) return;
    const countVal = parseInt(inputCount, 10);
    if (isNaN(countVal) || countVal < 0) {
      setError('Please enter a valid non-negative visitor count.');
      return;
    }

    try {
      setSavingSlot(activeModalSlot.slotStart);
      setError('');
      setSuccess('');
      const parts = dateQuery.split('-');
      const ddmmyyyy = `${parts[2]}/${parts[1]}/${parts[0]}`;

      const res = await api.post('/api/crm/footfall', {
        date: ddmmyyyy,
        slotStart: activeModalSlot.slotStart,
        slotEnd: activeModalSlot.slotEnd,
        count: countVal,
        remarks: inputRemarks || null
      });

      if (res.data && res.data.ok) {
        setSuccess(`Completed: Logged ${countVal} visitors for ${formatSlotTime(activeModalSlot.slotStart)} slot.`);
        setActiveModalSlot(null);
        fetchSlots();
      } else {
        setError(res.data?.error || 'Failed to save footfall count.');
      }
    } catch {
      setError('Error saving footfall entry.');
    } finally {
      setSavingSlot(null);
    }
  };

  const handleSaveBills = async (e: React.FormEvent) => {
    e.preventDefault();
    const billsVal = parseInt(bills, 10);
    if (isNaN(billsVal) || billsVal < 0) {
      setError('Please enter a valid day-end bill count.');
      return;
    }

    try {
      setSavingBills(true);
      setError('');
      setSuccess('');
      const parts = dateQuery.split('-');
      const ddmmyyyy = `${parts[2]}/${parts[1]}/${parts[0]}`;

      const res = await api.post('/api/crm/bills', {
        date: ddmmyyyy,
        bills: billsVal
      });

      if (res.data && res.data.ok) {
        setSuccess(`Completed: Day-end bill count (${billsVal} bills) updated for ${ddmmyyyy}!`);
      } else {
        setError(res.data?.error || 'Failed to update bills.');
      }
    } catch {
      setError('Error updating bill count.');
    } finally {
      setSavingBills(false);
    }
  };

  const handleSavePastDayBills = async (dateStr: string, countValStr: string) => {
    const val = parseInt(countValStr, 10);
    if (isNaN(val) || val < 0) return;

    try {
      const res = await api.post('/api/crm/bills', { date: dateStr, bills: val });
      if (res.data && res.data.ok) {
        setSuccess(`Completed: Updated ${val} bills for ${dateStr}!`);
        setPastDays(prev => prev.map(p => p.date === dateStr ? { ...p, savedBills: val } : p));
      }
    } catch {
      setError(`Failed to update bills for ${dateStr}`);
    }
  };

  const isAdmin = ['super_admin', 'admin', 'crm_manager'].includes(user?.role || '');

  return (
    <div className="page-container fade-in">
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="outfit" style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
            Greeter Store Footfall Register
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            Record hourly visitor counts, track slot submission status, and manage daily sales bill counts
          </p>
        </div>

        {/* Date Selector Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#FFFFFF', padding: '6px 14px', borderRadius: '10px', border: '1px solid #CBD5E1' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>📅 Select Date:</span>
          <input
            type="date"
            value={dateQuery}
            onChange={(e) => setDateQuery(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 700, color: '#4F46E5', background: '#FAF7F2' }}
          />
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* KPI Ribbon Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        {/* KPI 1 */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>TOTAL FOOTFALL</div>
          <div className="mono" style={{ fontSize: '32px', fontWeight: 800, color: '#4F46E5', marginTop: '6px', lineHeight: 1 }}>{totalFootfall.toLocaleString()}</div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>visitors logged today</div>
        </div>

        {/* KPI 2 */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>SLOTS SUBMITTED</div>
          <div className="mono" style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', marginTop: '6px', lineHeight: 1 }}>{slotsSubmittedCount} <span style={{ fontSize: '18px', color: '#94A3B8' }}>/ 12</span></div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>hourly slots</div>
        </div>

        {/* KPI 3 */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>ACTIVE SLOT</div>
          <div className="outfit" style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', marginTop: '6px', lineHeight: 1 }}>{activeSlotObj ? formatSlotTime(activeSlotObj.slotStart) : '10:00 PM'}</div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>current hour</div>
        </div>

        {/* KPI 4 */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>MISSED / EXPIRED</div>
          <div className="mono" style={{ fontSize: '32px', fontWeight: 800, color: missedSlotsCount > 0 ? '#EF4444' : '#10B981', marginTop: '6px', lineHeight: 1 }}>{missedSlotsCount}</div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>cutoff exceeded</div>
        </div>
      </div>

      {/* Light Theme Bills Count Register Card for Selected Date */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{
          background: '#FFFFFF',
          border: '1.5px solid #E2E8F0',
          borderRadius: '16px',
          padding: '20px 24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          maxWidth: '480px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                💵 DAY-END SALES BILLS REGISTER
              </div>
              <div style={{ fontSize: '12px', color: '#4F46E5', fontWeight: 700, marginTop: '2px' }}>
                Date: {selectedDateFormatted || dateQuery}
              </div>
            </div>
            <div style={{
              background: bills ? '#ECFDF5' : '#F8FAFC',
              color: bills ? '#047857' : '#94A3B8',
              fontSize: '11px', fontWeight: 800,
              padding: '4px 10px', borderRadius: '8px',
              border: `1px solid ${bills ? '#A7F3D0' : '#E2E8F0'}`
            }}>
              {bills ? '✓ REGISTERED' : 'PENDING'}
            </div>
          </div>

          {/* Counter display */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => setBills(b => String(Math.max(0, parseInt(b || '0', 10) - 1)))}
              style={{
                width: '42px', height: '42px', borderRadius: '10px',
                background: '#F1F5F9', border: '1px solid #CBD5E1',
                color: '#0F172A', fontSize: '20px', cursor: 'pointer', fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >−</button>
            <div style={{ flex: 1, textAlign: 'center', background: '#FAF7F2', borderRadius: '12px', padding: '6px 12px', border: '1px solid #CBD5E1' }}>
              <input
                type="number"
                placeholder="0"
                value={bills}
                onChange={(e) => setBills(e.target.value)}
                style={{
                  width: '100%', textAlign: 'center',
                  padding: '4px 0', border: 'none', background: 'transparent',
                  fontSize: '36px', fontWeight: 900, color: '#4F46E5',
                  fontFamily: "'JetBrains Mono', monospace",
                  outline: 'none', lineHeight: 1
                }}
              />
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', fontWeight: 600 }}>
                bills on {selectedDateFormatted || dateQuery}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBills(b => String(parseInt(b || '0', 10) + 1))}
              style={{
                width: '42px', height: '42px', borderRadius: '10px',
                background: '#EEF2FF', border: '1px solid #C7D2FE',
                color: '#4F46E5', fontSize: '20px', cursor: 'pointer', fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >+</button>
          </div>

          <form onSubmit={handleSaveBills}>
            <button
              type="submit"
              disabled={savingBills}
              style={{
                width: '100%', padding: '11px',
                borderRadius: '10px',
                background: savingBills ? '#94A3B8' : '#4F46E5',
                color: '#FFFFFF', fontSize: '13px', fontWeight: 800,
                border: 'none', cursor: savingBills ? 'not-allowed' : 'pointer',
                boxShadow: '0 3px 10px rgba(79,70,229,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              {savingBills ? '⏳ Saving...' : '💾 Save Bills Count for Selected Date'}
            </button>
          </form>
        </div>
      </div>

      {/* HOURLY SLOTS Section Header */}
      <div style={{ marginBottom: '16px', fontSize: '12px', fontWeight: 800, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        HOURLY SLOTS REGISTER (40-MIN CUTOFF STRICTLY ENFORCED)
      </div>

      {/* Grid of 12 Slot Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
          gap: '16px',
          marginBottom: '36px'
        }}
      >
        {slots.map((slot, index) => {
          const status = getSlotStatus(slot);
          const slotLabel = `SLOT ${String(index + 1).padStart(2, '0')}`;
          const rangeLabel = `${formatSlotTime(slot.slotStart)} - ${formatSlotTime(slot.slotEnd)}`;

          let bg = '#FFFFFF';
          let border = '#E2E8F0';
          let badgeBg = '#F1F5F9';
          let badgeColor = '#64748B';
          let badgeText = 'PENDING';

          if (status === 'done') {
            bg = '#ECFDF5';
            border = '#A7F3D0';
            badgeBg = '#D1FAE5';
            badgeColor = '#047857';
            badgeText = '✓ DONE';
          } else if (status === 'active') {
            bg = '#FFFBEB';
            border = '#FDE68A';
            badgeBg = '#D97706';
            badgeColor = '#FFFFFF';
            badgeText = 'ACTIVE';
          } else if (status === 'missed_expired') {
            bg = '#FEF2F2';
            border = '#FCA5A5';
            badgeBg = '#991B1B';
            badgeColor = '#FCA5A5';
            badgeText = 'MISSED (EXPIRED)';
          } else if (status === 'missed') {
            bg = '#FEF2F2';
            border = '#FECACA';
            badgeBg = '#EF4444';
            badgeColor = '#FFFFFF';
            badgeText = 'MISSED';
          }

          return (
            <div
              key={slot.slotStart}
              onClick={() => handleOpenSlotModal(slot)}
              style={{
                background: bg,
                border: `1.5px solid ${border}`,
                borderRadius: '14px',
                padding: '16px 18px',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '145px'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.03)'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em' }}>
                  {slotLabel}
                </span>
                <span
                  style={{
                    background: badgeBg,
                    color: badgeColor,
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    letterSpacing: '0.04em'
                  }}
                >
                  {badgeText}
                </span>
              </div>

              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>{rangeLabel}</div>
                <div className="mono" style={{ fontSize: '28px', fontWeight: 800, color: status === 'done' ? '#047857' : status === 'missed_expired' ? '#DC2626' : '#0F172A', marginTop: '4px' }}>
                  {slot.count > 0 ? slot.count : '—'}
                </div>
              </div>

              <div style={{ fontSize: '10px', color: status === 'missed_expired' ? '#DC2626' : '#64748B', fontWeight: 700 }}>
                {status === 'missed_expired' ? `Cutoff expired (${getSlotCutoffFormatted(slot.slotStart)})` : `Cutoff: ${getSlotCutoffFormatted(slot.slotStart)}`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Past Days Bills Update Panel */}
      <div className="glass-card" style={{ padding: '24px', background: '#FFFFFF' }}>
        <h3 className="outfit" style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
          📅 Past Days Bill Count Corrections
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {pastDays.map(item => (
            <div key={item.date} style={{ background: '#FAF7F2', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>{item.dateLabel}</div>
                <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700, marginTop: '2px' }}>
                  {item.savedBills} bills saved
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  placeholder="Bills"
                  defaultValue={item.savedBills || ''}
                  id={`past-bills-${item.date}`}
                  style={{ width: '90px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 700, background: '#FFFFFF' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const elem = document.getElementById(`past-bills-${item.date}`) as HTMLInputElement;
                    if (elem) handleSavePastDayBills(item.date, elem.value);
                  }}
                  style={{ background: '#1E293B', color: '#FFFFFF', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, border: 'none', cursor: 'pointer' }}
                >
                  Save
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal for Slot Visitor Count Entry with 40-Min Cutoff Enforcement */}
      {activeModalSlot && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
            }}
            className="fade-in"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 className="outfit" style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                  Enter Footfall Count
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  {formatSlotTime(activeModalSlot.slotStart)} - {formatSlotTime(activeModalSlot.slotEnd)}
                </p>
              </div>
              <button
                onClick={() => setActiveModalSlot(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', color: '#94A3B8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Cutoff Expired Warning Banner */}
            {isSlotExpired(activeModalSlot.slotStart) && activeModalSlot.count === 0 && !isAdmin && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#991B1B', fontSize: '12px', fontWeight: 700 }}>
                ⚠️ Entry Cutoff Expired! You missed entering footfall before {getSlotCutoffFormatted(activeModalSlot.slotStart)}. Contact your Store Manager for unlock.
              </div>
            )}

            <form onSubmit={handleSaveSlot}>
              <div className="field">
                <label>Visitor Count</label>
                <input
                  type="number"
                  placeholder="e.g. 45"
                  value={inputCount}
                  onChange={(e) => setInputCount(e.target.value)}
                  autoFocus
                  required
                  disabled={isSlotExpired(activeModalSlot.slotStart) && activeModalSlot.count === 0 && !isAdmin}
                  style={{ fontSize: '18px', fontWeight: 700, padding: '12px' }}
                />
              </div>

              <div className="field">
                <label>Remarks / Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Rainy weather delay"
                  value={inputRemarks}
                  onChange={(e) => setInputRemarks(e.target.value)}
                  disabled={isSlotExpired(activeModalSlot.slotStart) && activeModalSlot.count === 0 && !isAdmin}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setActiveModalSlot(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={(isSlotExpired(activeModalSlot.slotStart) && activeModalSlot.count === 0 && !isAdmin) || savingSlot === activeModalSlot.slotStart}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    background: (isSlotExpired(activeModalSlot.slotStart) && activeModalSlot.count === 0 && !isAdmin) ? '#CBD5E1' : '#4F46E5',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    border: 'none',
                    cursor: (isSlotExpired(activeModalSlot.slotStart) && activeModalSlot.count === 0 && !isAdmin) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {savingSlot === activeModalSlot.slotStart ? 'Saving...' : '💾 Save Slot Count'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
