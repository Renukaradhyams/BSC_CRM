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
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [slots, setSlots] = useState<FootfallSlot[]>([]);
  const [bills, setBills] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [savingSlot, setSavingSlot] = useState<number | null>(null);
  const [savingBills, setSavingBills] = useState<boolean>(false);

  // Helper to format date "DD/MM/YYYY" from Date object
  const formatDateStr = (dateObj: Date): string => {
    const d = new Date(dateObj.getTime());
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const getTodayISO = (): string => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const [dateQuery, setDateQuery] = useState<string>(getTodayISO());

  const DEFAULT_SLOTS = Array.from({ length: 12 }, (_, i) => ({
    slotStart: 10 + i,
    slotEnd: 11 + i,
    count: 0,
    remarks: null
  }));

  useEffect(() => {
    fetchSlots();
  }, [dateQuery]);

  const fetchSlots = async () => {
    try {
      setError('');
      setSuccess('');
      // Parse ISO to DD/MM/YYYY
      const parts = dateQuery.split('-');
      const ddmmyyyy = `${parts[2]}/${parts[1]}/${parts[0]}`;
      setSelectedDate(ddmmyyyy);

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
      setError('Failed to fetch slot records.');
    }
  };

  // Determine if a slot is locked for editing
  const isSlotLocked = (slot: FootfallSlot): boolean => {
    if (!user) return true;
    if (user.role === 'super_admin' || user.role === 'admin') return false; // Admins bypass

    // For staff: Check slot grace period
    const graceMin = settings ? settings.graceMin : 30;
    const now = new Date();

    // Check if the slot date is today
    const parts = dateQuery.split('-');
    const slotDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const isToday = slotDate.toDateString() === now.toDateString();

    if (!isToday) return true; // Cannot edit past dates

    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    // Verification if slot is in the future
    if (currentHour < slot.slotStart) return true;

    // Grace period calculations: slot ends at slot.slotEnd
    const deadlineHour = slot.slotEnd;
    const minutesPassed = (currentHour - deadlineHour) * 60 + currentMin;

    return minutesPassed > graceMin;
  };

  const handleSlotSave = async (slot: FootfallSlot, index: number) => {
    try {
      setSavingSlot(index);
      setError('');
      setSuccess('');

      const res = await api.post('/api/crm/footfall', {
        date: selectedDate,
        slotStart: slot.slotStart,
        slotEnd: slot.slotEnd,
        count: slot.count,
        remarks: slot.remarks
      });

      if (res.data && res.data.ok) {
        setSuccess(`Slot ${slot.slotStart}:00 successfully saved!`);
        fetchSlots();
      } else {
        setError(res.data.error || 'Failed to save slot count');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save slot entry.');
    } finally {
      setSavingSlot(null);
    }
  };

  const handleBillsSave = async () => {
    try {
      setSavingBills(true);
      setError('');
      setSuccess('');

      const res = await api.post('/api/crm/bills', {
        date: selectedDate,
        bills: bills === '' ? 0 : parseInt(bills, 10)
      });

      if (res.data && res.data.ok) {
        setSuccess('Daily total bills successfully updated!');
        fetchSlots();
      } else {
        setError(res.data.error || 'Failed to update bills');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update bills count.');
    } finally {
      setSavingBills(false);
    }
  };

  const totalFootfallCount = slots.reduce((sum, s) => sum + (s.count || 0), 0);

  return (
    <div className="fade-in" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Page Header */}
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="outfit" style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A' }}>Footfall Register</h1>
          <p style={{ fontSize: '13px', color: '#475569' }}>Hourly visitor traffic metrics and daily bill summaries</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '6px 14px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', color: '#64748B', textTransform: 'uppercase' }}>
              📅 Select Date
            </label>
            <input
              type="date"
              value={dateQuery}
              onChange={(e) => setDateQuery(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '14px',
                fontWeight: 600,
                color: '#0F172A',
                background: 'transparent',
                cursor: 'pointer'
              }}
            />
          </div>
        </div>
      </header>

      {/* Summary KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-card" style={{ padding: '16px 20px', borderLeft: '4px solid #2563EB' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            🚶 Total Day Footfall
          </span>
          <div className="mono" style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
            {totalFootfallCount} <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>visitors</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px 20px', borderLeft: '4px solid #0D9488' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            🧾 Daily Total Bills
          </span>
          <div className="mono" style={{ fontSize: '28px', fontWeight: 800, color: '#0D9488', marginTop: '4px' }}>
            {bills || '0'} <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>bills</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px 20px', borderLeft: '4px solid #16A34A' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            ⏱️ Operating Hours
          </span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginTop: '8px' }}>
            10:00 AM – 10:00 PM
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ display: 'block' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ display: 'block' }}>{success}</div>}

      {/* Hourly Slots List */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
        {slots.map((s, idx) => {
          const isLocked = isSlotLocked(s);
          const formattedStart = s.slotStart > 12 ? `${s.slotStart - 12}:00 PM` : s.slotStart === 12 ? '12:00 PM' : `${s.slotStart}:00 AM`;
          const formattedEnd = s.slotEnd > 12 ? `${s.slotEnd - 12}:00 PM` : s.slotEnd === 12 ? '12:00 PM' : `${s.slotEnd}:00 AM`;

          return (
            <div
              key={idx}
              className="glass-card"
              style={{
                padding: '16px 20px',
                background: isLocked ? '#F8FAFC' : '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                opacity: isLocked ? 0.75 : 1
              }}
            >
              {/* Slot Time Badge */}
              <div style={{ minWidth: '170px' }}>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⏰</span> {formattedStart} – {formattedEnd}
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                  {s.submittedBy ? `Saved by ${s.submittedBy}` : 'Slot entry pending'}
                </div>
              </div>

              {/* Count Input with Quick +/- Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (isLocked) return;
                    const updated = [...slots];
                    updated[idx].count = Math.max(0, (updated[idx].count || 0) - 1);
                    setSlots(updated);
                  }}
                  disabled={isLocked || savingSlot === idx}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#0F172A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isLocked ? 'not-allowed' : 'pointer'
                  }}
                >
                  -
                </button>

                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={s.count === 0 ? '' : s.count}
                  onChange={(e) => {
                    const updated = [...slots];
                    updated[idx].count = parseInt(e.target.value, 10) || 0;
                    setSlots(updated);
                  }}
                  disabled={isLocked || savingSlot === idx}
                  style={{
                    width: '70px',
                    textAlign: 'center',
                    padding: '6px 8px',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#2563EB',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '6px',
                    background: '#FFFFFF'
                  }}
                />

                <button
                  type="button"
                  onClick={() => {
                    if (isLocked) return;
                    const updated = [...slots];
                    updated[idx].count = (updated[idx].count || 0) + 1;
                    setSlots(updated);
                  }}
                  disabled={isLocked || savingSlot === idx}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isLocked ? 'not-allowed' : 'pointer'
                  }}
                >
                  +
                </button>
              </div>

              {/* Slot Remarks Note */}
              <div style={{ flex: 1, minWidth: '180px' }}>
                <input
                  type="text"
                  placeholder="Optional slot remarks (e.g. rain, heavy rush)..."
                  value={s.remarks || ''}
                  onChange={(e) => {
                    const updated = [...slots];
                    updated[idx].remarks = e.target.value;
                    setSlots(updated);
                  }}
                  disabled={isLocked || savingSlot === idx}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    background: '#FFFFFF'
                  }}
                />
              </div>

              {/* Save & Status Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isLocked ? (
                  <span className="badge badge-crimson" style={{ fontSize: '11px' }}>
                    🔒 Locked
                  </span>
                ) : (
                  <button
                    onClick={() => handleSlotSave(s, idx)}
                    disabled={savingSlot === idx}
                    className="btn btn-primary btn-sm"
                  >
                    {savingSlot === idx ? 'Saving...' : '💾 Save'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Bill Entries summary card */}
      <section className="glass-card" style={{ padding: '24px', border: '1px solid #E2E8F0', background: '#FFFFFF', marginBottom: '24px' }}>
        <h3 className="outfit" style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>Day-End Billing Summary</h3>
        <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px' }}>
          Enter total completed billing receipts for this operational day.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ width: '220px' }}>
            <input
              type="number"
              min="0"
              placeholder="Total Bills Count"
              value={bills}
              onChange={(e) => setBills(e.target.value)}
              disabled={savingBills}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '15px',
                fontWeight: 600,
                border: '1.5px solid #CBD5E1',
                borderRadius: '8px'
              }}
            />
          </div>
          <button
            onClick={handleBillsSave}
            disabled={savingBills}
            className="btn btn-primary"
          >
            {savingBills ? 'Updating...' : '💾 Save Daily Bills Total'}
          </button>
        </div>
      </section>
    </div>
  );
}
