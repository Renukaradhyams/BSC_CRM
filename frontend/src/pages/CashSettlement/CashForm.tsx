import React, { useEffect, useState, useRef } from 'react';
import api from '../../services/api';

interface CounterRow {
  counterId: string;
  cashierName: string;
  cashDiff: number;
  cardDiff: number;
  upiDiff: number;
  staffDisc: number;
  custDisc: number;
}

export default function CashForm() {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [sale, setSale] = useState<string>('');
  const [bills, setBills] = useState<string>('');
  const [abv, setAbv] = useState<number>(0);

  const [cash, setCash] = useState<string>('');
  const [card, setCard] = useState<string>('');
  const [upi, setUpi] = useState<string>('');

  const [counters, setCounters] = useState<CounterRow[]>([
    { counterId: 'CS1', cashierName: 'DURGAPPA', cashDiff: 0, cardDiff: 0, upiDiff: 0, staffDisc: 0, custDisc: 0 },
    { counterId: 'CS2', cashierName: 'PRASHANT', cashDiff: 0, cardDiff: 0, upiDiff: 0, staffDisc: 0, custDisc: 0 },
    { counterId: 'CS3', cashierName: 'NITIN', cashDiff: 0, cardDiff: 0, upiDiff: 0, staffDisc: 0, custDisc: 0 }
  ]);

  const [counterIds, setCounterIds] = useState<string[]>(['CS1', 'CS2', 'CS3', 'CS4', 'CS5']);
  const [cashierNames, setCashierNames] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    fetchMasterDetails();
  }, []);

  useEffect(() => {
    const saleNum = parseFloat(sale) || 0;
    const billsNum = parseInt(bills, 10) || 0;
    setAbv(billsNum > 0 ? Math.round(saleNum / billsNum) : 0);
  }, [sale, bills]);

  const fetchMasterDetails = async () => {
    try {
      const token = localStorage.getItem('cash_settlement_token');
      const res = await api.get('/api/cash/master', {
        headers: { 'x-cash-token': token }
      });
      if (res.data && res.data.ok) {
        setCounterIds(res.data.counterIds || []);
        setCashierNames(res.data.cashierNames || []);
      }
    } catch (err) {
      console.error('Failed to load master counters', err);
    }
  };

  const handleAddRow = () => {
    const nextIdx = counters.length + 1;
    setCounters([
      ...counters,
      {
        counterId: `CS${nextIdx}`,
        cashierName: cashierNames[0] || 'CASHIER',
        cashDiff: 0,
        cardDiff: 0,
        upiDiff: 0,
        staffDisc: 0,
        custDisc: 0
      }
    ]);
  };

  const handleRemoveRow = (idx: number) => {
    setCounters(counters.filter((_, i) => i !== idx));
  };

  const handleRowChange = (idx: number, field: keyof CounterRow, val: string | number) => {
    const updated = [...counters];
    updated[idx] = {
      ...updated[idx],
      [field]: val
    };
    setCounters(updated);
  };

  // Calculations
  const sumField = (field: 'cashDiff' | 'cardDiff' | 'upiDiff' | 'staffDisc' | 'custDisc'): number => {
    return counters.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
  };

  const totalDiff = sumField('cashDiff') + sumField('cardDiff') + sumField('upiDiff');

  // Preview Drawing on canvas
  const drawPreview = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 400;
    const H = 480;
    canvas.width = W;
    canvas.height = H;

    ctx.fillStyle = '#F9F7F0'; // Ivory
    ctx.fillRect(0, 0, W, H);

    // Header strip
    ctx.fillStyle = '#1E2D5A';
    ctx.fillRect(0, 0, W, 80);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Cambria, serif';
    ctx.fillText('BSC Belagavi Settlement', 20, 35);
    ctx.font = '12px Cambria, serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(`Date: ${date}`, 20, 58);

    // Draw parameters
    ctx.fillStyle = '#1A1A2E';
    ctx.font = 'bold 12px Cambria, serif';
    ctx.fillText('TODAY\'S SUMMARY', 20, 110);
    ctx.font = '14px Cambria, serif';
    ctx.fillText(`Sales Volume: ₹${parseFloat(sale || '0').toLocaleString('en-IN')}`, 30, 135);
    ctx.fillText(`Total Bills Count: ${bills || 0}`, 30, 155);
    ctx.fillText(`ABV: ₹${abv.toLocaleString('en-IN')}`, 30, 175);

    ctx.font = 'bold 12px Cambria, serif';
    ctx.fillText('AUDIT DETAILS', 20, 215);
    ctx.font = '14px Cambria, serif';
    ctx.fillText(`Entered Cash: ₹${parseFloat(cash || '0').toLocaleString('en-IN')}`, 30, 240);
    ctx.fillText(`Entered Card: ₹${parseFloat(card || '0').toLocaleString('en-IN')}`, 30, 260);
    ctx.fillText(`Entered UPI: ₹${parseFloat(upi || '0').toLocaleString('en-IN')}`, 30, 280);

    ctx.font = 'bold 12px Cambria, serif';
    ctx.fillText('COUNTER SUMS SUMMARY', 20, 320);
    ctx.font = '14px Cambria, serif';
    ctx.fillText(`Total Cash Diff: ₹${sumField('cashDiff').toLocaleString('en-IN')}`, 30, 345);
    ctx.fillText(`Total Card Diff: ₹${sumField('cardDiff').toLocaleString('en-IN')}`, 30, 365);
    ctx.fillText(`Total UPI Diff: ₹${sumField('upiDiff').toLocaleString('en-IN')}`, 30, 385);
    ctx.font = 'bold 15px Cambria, serif';
    ctx.fillStyle = totalDiff !== 0 ? '#C0392B' : '#1E7A1E';
    ctx.fillText(`Net Difference: ₹${totalDiff.toLocaleString('en-IN')}`, 30, 415);
  };

  const handlePreviewAndSave = () => {
    setShowPreview(true);
    setTimeout(drawPreview, 100);
  };

  const handleConfirmSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('cash_settlement_token');
      const payload = {
        date,
        saleAmount: parseFloat(sale) || 0,
        billsCount: parseInt(bills, 10) || 0,
        abv,
        cashTotal: parseFloat(cash) || 0,
        cardTotal: parseFloat(card) || 0,
        upiTotal: parseFloat(upi) || 0,
        cashDiff: sumField('cashDiff'),
        cardDiff: sumField('cardDiff'),
        upiDiff: sumField('upiDiff'),
        counters
      };

      const res = await api.post('/api/cash/settlement', payload, {
        headers: { 'x-cash-token': token }
      });

      if (res.data && res.data.ok) {
        alert('Settlement successfully recorded in database!');

        // Share on Whatsapp
        const message = `📊 *BSC Textiles Cash Settlement*\n📅 Date: ${date}\n💰 Sales: ₹${parseFloat(sale || '0').toLocaleString('en-IN')}\n🧾 Bills: ${bills}\n💵 Cash Diff: ₹${sumField('cashDiff')}\n💳 Card Diff: ₹${sumField('cardDiff')}\n📲 UPI Diff: ₹${sumField('upiDiff')}\n🔥 Total Diff: ₹${totalDiff}`;
        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');

        setShowPreview(false);
      }
    } catch (err) {
      alert('Failed to save settlement tallies.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px' }} className="fade-in">
      <header style={{ marginBottom: '24px' }}>
        <h1 className="serif" style={{ fontSize: '28px' }}>Cash Settlement</h1>
        <p style={{ fontSize: '14px', color: 'var(--ink-60)' }}>Record cashier summaries and denomination tallies</p>
      </header>

      {/* Date and sale summary cards */}
      <section className="card" style={{ padding: '20px', border: '1.5px solid var(--border)', marginBottom: '20px' }}>
        <h3 className="serif" style={{ fontSize: '18px', marginBottom: '14px' }}>Today's Sales Summary</h3>
        
        <div className="field-row">
          <div className="field">
            <label>Settlement Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Today's Sale Volume (₹)</label>
            <input type="number" placeholder="0" value={sale} onChange={(e) => setSale(e.target.value)} />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Total Bills count</label>
            <input type="number" placeholder="0" value={bills} onChange={(e) => setBills(e.target.value)} />
          </div>
          <div className="field">
            <label>ABV (Average Bill Value)</label>
            <div style={{ padding: '10px 14px', background: 'var(--navy-l)', color: 'var(--navy)', fontWeight: 'bold', borderRadius: '8px' }}>
              ₹ {abv}
            </div>
          </div>
        </div>
      </section>

      {/* Collection totals cards */}
      <section className="card" style={{ padding: '20px', border: '1.5px solid var(--border)', marginBottom: '20px' }}>
        <h3 className="serif" style={{ fontSize: '18px', marginBottom: '14px' }}>Collection Totals</h3>
        
        <div className="field-row">
          <div className="field">
            <label>Cash Total (₹)</label>
            <input type="number" placeholder="0" value={cash} onChange={(e) => setCash(e.target.value)} />
          </div>
          <div className="field">
            <label>Card Total (₹)</label>
            <input type="number" placeholder="0" value={card} onChange={(e) => setCard(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label>UPI Total (₹)</label>
          <input type="number" placeholder="0" value={upi} onChange={(e) => setUpi(e.target.value)} />
        </div>
      </section>

      {/* Cashier counter reports grid table */}
      <section className="card" style={{ padding: '20px', border: '1.5px solid var(--border)', marginBottom: '24px' }}>
        <h3 className="serif" style={{ fontSize: '18px', marginBottom: '14px' }}>Cashier Counter reports</h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--navy)', color: '#fff', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Counter</th>
                <th style={{ padding: '12px' }}>Cashier</th>
                <th style={{ padding: '12px' }}>Cash Diff</th>
                <th style={{ padding: '12px' }}>Card Diff</th>
                <th style={{ padding: '12px' }}>UPI Diff</th>
                <th style={{ padding: '12px' }}>Staff Disc</th>
                <th style={{ padding: '12px' }}>Cust Disc</th>
                <th style={{ padding: '12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {counters.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-l)' }}>
                  <td style={{ padding: '8px' }}>
                    <select
                      value={row.counterId}
                      onChange={(e) => handleRowChange(idx, 'counterId', e.target.value)}
                      style={{ padding: '6px', border: '1px solid var(--border)', borderRadius: '4px' }}
                    >
                      {counterIds.map(id => <option key={id} value={id}>{id}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input
                      type="text"
                      value={row.cashierName}
                      onChange={(e) => handleRowChange(idx, 'cashierName', e.target.value.toUpperCase())}
                      style={{ padding: '6px', border: '1px solid var(--border)', borderRadius: '4px', width: '100px' }}
                    />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input
                      type="number"
                      value={row.cashDiff || ''}
                      placeholder="0"
                      onChange={(e) => handleRowChange(idx, 'cashDiff', parseFloat(e.target.value) || 0)}
                      style={{ padding: '6px', border: '1px solid var(--border)', borderRadius: '4px', width: '70px' }}
                    />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input
                      type="number"
                      value={row.cardDiff || ''}
                      placeholder="0"
                      onChange={(e) => handleRowChange(idx, 'cardDiff', parseFloat(e.target.value) || 0)}
                      style={{ padding: '6px', border: '1px solid var(--border)', borderRadius: '4px', width: '70px' }}
                    />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input
                      type="number"
                      value={row.upiDiff || ''}
                      placeholder="0"
                      onChange={(e) => handleRowChange(idx, 'upiDiff', parseFloat(e.target.value) || 0)}
                      style={{ padding: '6px', border: '1px solid var(--border)', borderRadius: '4px', width: '70px' }}
                    />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input
                      type="number"
                      value={row.staffDisc || ''}
                      placeholder="0"
                      onChange={(e) => handleRowChange(idx, 'staffDisc', parseFloat(e.target.value) || 0)}
                      style={{ padding: '6px', border: '1px solid var(--border)', borderRadius: '4px', width: '70px' }}
                    />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input
                      type="number"
                      value={row.custDisc || ''}
                      placeholder="0"
                      onChange={(e) => handleRowChange(idx, 'custDisc', parseFloat(e.target.value) || 0)}
                      style={{ padding: '6px', border: '1px solid var(--border)', borderRadius: '4px', width: '70px' }}
                    />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      className="section-del"
                      style={{ width: '30px', height: '30px' }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--gold-l)', fontWeight: 'bold' }}>
                <td colSpan={2} style={{ padding: '12px' }}>TOTALS:</td>
                <td style={{ padding: '12px' }}>{sumField('cashDiff')}</td>
                <td style={{ padding: '12px' }}>{sumField('cardDiff')}</td>
                <td style={{ padding: '12px' }}>{sumField('upiDiff')}</td>
                <td style={{ padding: '12px' }}>{sumField('staffDisc')}</td>
                <td style={{ padding: '12px' }}>{sumField('custDisc')}</td>
                <td style={{ padding: '12px' }}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <button onClick={handleAddRow} className="btn btn-ghost btn-sm btn-full" style={{ marginTop: '12px' }}>
          ➕ Add Cashier Row
        </button>
      </section>

      <button onClick={handlePreviewAndSave} className="btn btn-teal btn-full">
        💾 Preview & Save Settlement
      </button>

      {/* Settlement preview modal overlay */}
      {showPreview && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="card" style={{ padding: '24px', maxWidth: '440px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <h3 className="serif" style={{ fontSize: '20px', marginBottom: '14px' }}>
              Confirm Settlement
            </h3>
            
            <div style={{ border: '2px solid var(--border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
              <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="btn btn-ghost"
                style={{ flex: 1 }}
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={saving}
                className="btn btn-teal"
                style={{ flex: 2 }}
              >
                {saving ? 'Saving...' : '🚀 Save & Share on WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
