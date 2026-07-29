import React, { useEffect, useState } from 'react';
import api from '../services/api';

interface FootfallRecord {
  date: string;
  slotStart: number;
  count: number;
}

export default function Reports() {
  const [footfallData, setFootfallData] = useState<FootfallRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchReportStats();
  }, []);

  const fetchReportStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/crm/dashboard'); // fetch dashboard logs
      if (res.data && res.data.ok) {
        setFootfallData(res.data.footfalls || []);
      }
    } catch (err) {
      setError('Failed to fetch analytics statistics.');
    } finally {
      setLoading(false);
    }
  };

  // Compile and Export CSV Spreadsheet
  const handleExportCSV = () => {
    const headers = ['Date', 'Slot Start Hour', 'Visitor Count'];
    const rows = footfallData.map(item => [
      item.date,
      `${item.slotStart}:00`,
      item.count
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BSC_Footfall_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '24px' }} className="fade-in">
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="serif" style={{ fontSize: '28px' }}>Store Analytics</h1>
          <p style={{ fontSize: '14px', color: 'var(--ink-60)' }}>Review visitor performance ratios and export reports</p>
        </div>
        <button onClick={handleExportCSV} className="btn btn-teal">
          📥 Export Excel/CSV
        </button>
      </header>

      {error && <div className="alert alert-error" style={{ display: 'block' }}>{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          {/* Sourcing Summary grid */}
          <section className="card" style={{ padding: '20px', border: '1.5px solid var(--border)' }}>
            <h3 className="serif" style={{ fontSize: '18px', marginBottom: '16px' }}>Sourcing & Sells Registry</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: 'var(--navy)', color: '#fff', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px' }}>Date</th>
                    <th style={{ padding: '12px 16px' }}>Total Footfall</th>
                    <th style={{ padding: '12px 16px' }}>Traffic Level</th>
                  </tr>
                </thead>
                <tbody>
                  {footfallData.length > 0 ? (
                    // Group counts by date
                    Object.entries(
                      footfallData.reduce((acc: { [key: string]: number }, item) => {
                        acc[item.date] = (acc[item.date] || 0) + item.count;
                        return acc;
                      }, {})
                    ).map(([date, total]) => {
                      const level = total > 150 ? '🔥 High Traffic' : total > 60 ? '⚡ Moderate' : '💤 Light';
                      return (
                        <tr key={date} style={{ borderBottom: '1px solid var(--border-l)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{date}</td>
                          <td style={{ padding: '12px 16px' }}>{total} visitors</td>
                          <td style={{ padding: '12px 16px', fontWeight: '500' }}>{level}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-30)' }}>
                        No records logged for selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
