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

  return (
    <div style={{ padding: '24px' }} className="fade-in">
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="serif" style={{ fontSize: '28px' }}>Footfall Register</h1>
          <p style={{ fontSize: '14px', color: 'var(--ink-60)' }}>Record hourly store traffic metrics</p>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: 'var(--ink-60)' }}>
            📅 Select Date
          </label>
          <input
            type="date"
            value={dateQuery}
            onChange={(e) => setDateQuery(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1.5px solid var(--border)',
              borderRadius: '8px',
              fontSize: '14px',
              background: '#fff'
            }}
          />
        </div>
      </header>

      {error && <div className="alert alert-error" style={{ display: 'block' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ display: 'block' }}>{success}</div>}

      {/* Slots grid inputs */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {slots.map((s, idx) => {
          const isLocked = isSlotLocked(s);
          return (
            <div
              key={idx}
              className="card"
              style={{
                padding: '16px',
                border: '1.5px solid var(--border)',
                background: isLocked ? 'var(--surface)' : '#fff',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '16px',
                opacity: isLocked ? 0.8 : 1
              }}
            >
              <div style={{ width: '130px', fontWeight: 'bold', fontSize: '15px' }}>
                ⏰ {s.slotStart}:00 - {s.slotEnd}:00
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-60)' }}>Count:</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={s.count || ''}
                  onChange={(e) => {
                    const updated = [...slots];
                    updated[idx].count = parseInt(e.target.value, 10) || 0;
                    setSlots(updated);
                  }}
                  disabled={isLocked || savingSlot === idx}
                  style={{ width: '80px', padding: '8px 10px', fontSize: '14px', border: '1px solid var(--border)', borderRadius: '6px' }}
                />
              </div>

              <div style={{ flex: 1, minWidth: '150px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-60)' }}>Remarks:</label>
                <input
                  type="text"
                  placeholder="Slot notes..."
                  value={s.remarks || ''}
                  onChange={(e) => {
                    const updated = [...slots];
                    updated[idx].remarks = e.target.value;
                    setSlots(updated);
                  }}
                  disabled={isLocked || savingSlot === idx}
                  style={{ flex: 1, padding: '8px 10px', fontSize: '14px', border: '1px solid var(--border)', borderRadius: '6px' }}
                />
              </div>

              <div>
                <button
                  onClick={() => handleSlotSave(s, idx)}
                  disabled={isLocked || savingSlot === idx}
                  className="btn btn-teal btn-sm"
                >
                  {savingSlot === idx ? 'Saving...' : '💾 Save Slot'}
                </button>
              </div>

              {isLocked && (
                <div style={{ fontSize: '11px', color: 'var(--crimson)', fontWeight: 'bold' }}>
                  🔒 Locked
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Bill Entries bottom card */}
      <section className="card" style={{ padding: '20px', border: '1.5px solid var(--border)' }}>
        <h3 className="serif" style={{ fontSize: '18px', marginBottom: '8px' }}>Day-End Billing Summary</h3>
        <p style={{ fontSize: '13px', color: 'var(--ink-60)', marginBottom: '16px' }}>
          Enter the total bills generated for this operational day.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <input
              type="number"
              min="0"
              placeholder="Total Bills Count"
              value={bills}
              onChange={(e) => setBills(e.target.value)}
              disabled={savingBills}
              style={{ width: '180px', padding: '10px 14px' }}
            />
          </div>
          <button
            onClick={handleBillsSave}
            disabled={savingBills}
            className="btn btn-primary"
          >
            {savingBills ? 'Updating...' : '💾 Save Daily Bills'}
          </button>
        </div>
      </section>
    </div>
  );
}
