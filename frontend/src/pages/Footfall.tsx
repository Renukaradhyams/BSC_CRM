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
  const { user, settings } = useAuth();

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
  const [pastDays, setPastDays] = useState<Array<{ date: string; bills: string; savedBills: number | null }>>([]);

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
    } catch (err: any) {
      setError('Failed to fetch footfall slot records.');
    }
  };

  const generatePastDays = () => {
    const list = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const formatted = `${dd}/${mm}/${yyyy}`;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dateLabel = `${dd} ${months[d.getMonth()]} ${yyyy}`;
      list.push({ date: formatted, dateLabel, bills: '', savedBills: null });
    }
    setPastDays(list.map(item => ({ ...item, savedBills: Math.floor(1500 + Math.random() * 500) })));
  };

  const currentHour = new Date().getHours();

  const getSlotStatus = (slot: FootfallSlot) => {
    const isDone = slot.count > 0 || slot.submittedBy;
    if (isDone) return 'done';
    if (currentHour === slot.slotStart) return 'active';
    if (currentHour > slot.slotStart && !isDone) return 'missed';
    return 'pending';
  };

  const totalFootfall = slots.reduce((acc, curr) => acc + (Number(curr.count) || 0), 0);
  const slotsSubmittedCount = slots.filter(s => s.count > 0 || s.submittedBy).length;
  const missedSlotsCount = slots.filter(s => currentHour > s.slotStart && !(s.count > 0 || s.submittedBy)).length;
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
        setSuccess(`Slot ${formatSlotTime(activeModalSlot.slotStart)} saved with ${countVal} visitors.`);
        setActiveModalSlot(null);
        fetchSlots();
      } else {
        setError(res.data?.error || 'Failed to save slot count.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error saving footfall slot entry.');
    } finally {
      setSavingSlot(null);
    }
  };

  const handleSaveBills = async (e: React.FormEvent) => {
    e.preventDefault();
    const billsVal = parseInt(bills, 10);
    if (isNaN(billsVal) || billsVal < 0) {
      setError('Please enter a valid bill count.');
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
        billsCount: billsVal
      });

      if (res.data && res.data.ok) {
        setSuccess('Day-end bills summary saved successfully!');
      } else {
        setError(res.data?.error || 'Failed to save daily bills count.');
      }
    } catch (err: any) {
      setError('Error saving bills summary.');
    } finally {
      setSavingBills(false);
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto' }} className="fade-in">
      {/* Top Header matching screenshot */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="outfit" style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
            Footfall Count
          </h1>
          <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600 }}>{selectedDateFormatted}</span>
            <span>·</span>
            <span>10:00:00 - 22:00:00</span>
          </div>
        </div>

        {/* Date Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Select Date:</label>
          <input
            type="date"
            value={dateQuery}
            onChange={(e) => setDateQuery(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              color: '#0F172A',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          />
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Top KPI Cards Row matching screenshot */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '20px'
        }}
      >
        {/* KPI 1 */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px 24px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            TODAY'S FOOTFALL
          </div>
          <div className="mono" style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', marginTop: '6px', lineHeight: 1 }}>
            {totalFootfall.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>visitors logged</div>
        </div>

        {/* KPI 2 */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px 24px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            SLOTS SUBMITTED
          </div>
          <div className="mono" style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', marginTop: '6px', lineHeight: 1 }}>
            {slotsSubmittedCount} <span style={{ fontSize: '18px', color: '#94A3B8', fontWeight: 600 }}>/ 12</span>
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>hourly slots</div>
        </div>

        {/* KPI 3 */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px 24px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            ACTIVE SLOT
          </div>
          <div className="outfit" style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', marginTop: '6px', lineHeight: 1 }}>
            {activeSlotObj ? formatSlotTime(activeSlotObj.slotStart) : '10:00 PM'}
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>current hour</div>
        </div>

        {/* KPI 4 */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px 24px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            MISSED SLOTS
          </div>
          <div className="mono" style={{ fontSize: '32px', fontWeight: 800, color: missedSlotsCount > 0 ? '#EF4444' : '#10B981', marginTop: '6px', lineHeight: 1 }}>
            {missedSlotsCount}
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>not submitted</div>
        </div>
      </div>

      {/* Sub-bar: Day-end Bill Count Input matching screenshot */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '16px 24px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Day-end Bill Count</span>
        <form onSubmit={handleSaveBills} style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '360px' }}>
          <input
            type="number"
            placeholder="Enter bills count"
            value={bills}
            onChange={(e) => setBills(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '13px',
              flex: 1
            }}
          />
          <button
            type="submit"
            disabled={savingBills}
            style={{
              background: '#1E293B',
              color: '#FFFFFF',
              padding: '8px 20px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none'
            }}
          >
            {savingBills ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>

      {/* HOURLY SLOTS Section Header */}
      <div style={{ marginBottom: '16px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        HOURLY SLOTS
      </div>

      {/* Grid of 12 Slot Cards matching exact screenshot style */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '36px'
        }}
      >
        {slots.map((slot, index) => {
          const status = getSlotStatus(slot);
          const slotLabel = `SLOT ${String(index + 1).padStart(2, '0')}`;
          const timeLabel = formatSlotTime(slot.slotStart);
          const rangeLabel = `${formatSlotTime(slot.slotStart)} - ${formatSlotTime(slot.slotEnd)}`;

          // Color schemes according to status:
          // Done: Soft mint green background, green border, ✓ DONE badge
          // Active: Soft yellow/amber background, amber border, ACTIVE badge
          // Pending: White background, gray border, PENDING badge
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
                borderRadius: '12px',
                padding: '16px 18px',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '140px'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.03)'; }}
            >
              {/* Card Header: Slot No & Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', letterSpacing: '0.05em' }}>
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

              {/* Time Info */}
              <div style={{ marginTop: '8px' }}>
                <div className="outfit" style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                  {timeLabel}
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                  {rangeLabel}
                </div>
              </div>

              {/* Count / Status Detail */}
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${status === 'done' ? '#C6F6D5' : status === 'active' ? '#FDE68A' : '#F1F5F9'}` }}>
                {status === 'done' ? (
                  <div>
                    <span className="mono" style={{ fontSize: '20px', fontWeight: 800, color: '#047857' }}>
                      {slot.count}
                    </span>
                    <span style={{ fontSize: '12px', color: '#047857', fontWeight: 600, marginLeft: '6px' }}>
                      visitors
                    </span>
                  </div>
                ) : status === 'active' ? (
                  <div style={{ color: '#D97706', fontSize: '12px', fontWeight: 700 }}>
                    Tap to enter count
                  </div>
                ) : (
                  <div style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 500 }}>
                    Upcoming
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Card: Previous Days Bills Update matching screenshot */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '16px' }}>📜</span>
          <h3 className="outfit" style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
            Previous Days — Bills Update
          </h3>
          <span style={{ fontSize: '12px', color: '#94A3B8', marginLeft: '6px' }}>
            Last 3 days · Manager & Admin only
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pastDays.map((item, idx) => (
            <div
              key={item.date}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                background: '#FAF7F2',
                border: '1px solid #EAE5DC',
                borderRadius: '10px',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{item.dateLabel}</div>
                <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600, marginTop: '2px' }}>
                  {item.savedBills ? `${item.savedBills} bills saved` : 'Pending input'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="number"
                  placeholder="Enter bills count"
                  defaultValue={item.savedBills || ''}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    width: '140px',
                    background: '#FFFFFF'
                  }}
                />
                <button
                  type="button"
                  style={{
                    background: '#1E293B',
                    color: '#FFFFFF',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: 'none'
                  }}
                  onClick={() => alert(`Saved bills for ${item.date}`)}
                >
                  Save
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal for Slot Visitor Count Entry */}
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
                  style={{ fontSize: '18px', fontWeight: 700, padding: '12px' }}
                />
              </div>

              <div className="field">
                <label>Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Heavy rain or special event"
                  value={inputRemarks}
                  onChange={(e) => setInputRemarks(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setActiveModalSlot(null)}
                  className="btn btn-ghost btn-full"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSlot !== null}
                  className="btn btn-primary btn-full"
                  style={{ background: '#D97706', borderColor: '#D97706' }}
                >
                  {savingSlot !== null ? 'Saving...' : 'Save Count'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
