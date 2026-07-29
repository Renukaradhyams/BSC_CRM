import React from 'react';

export default function FeedbackQR() {
  const publicLink = `${window.location.origin}/feedback-public`;

  const handleOpenLink = () => {
    window.open(publicLink, '_blank');
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }} className="fade-in">
      <div className="card" style={{ maxWidth: '420px', padding: '32px', textAlign: 'center', border: '1.5px solid var(--border)' }}>
        <h2 className="serif" style={{ fontSize: '24px', marginBottom: '8px' }}>Guest Self-Fill QR</h2>
        <p style={{ fontSize: '13px', color: 'var(--ink-60)', marginBottom: '24px' }}>
          Display this screen or print the QR code at billing counters to collect customer reviews directly.
        </p>

        {/* Dynamic QR Display */}
        <div style={{
          width: '200px',
          height: '200px',
          margin: '0 auto 24px',
          border: '4px solid var(--navy)',
          borderRadius: '16px',
          padding: '16px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Using a public QR generator engine or static placeholder */}
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(publicLink)}`} 
            alt="QR Code Scan Link" 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg';
            }}
          />
        </div>

        <div style={{ background: 'var(--navy-l)', padding: '12px', borderRadius: '8px', marginBottom: '24px', wordBreak: 'break-all' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--navy)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
            🔗 Public Survey URL:
          </span>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--navy)' }}>{publicLink}</span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => navigator.clipboard.writeText(publicLink).then(() => alert('Link copied to clipboard!'))} className="btn btn-ghost" style={{ flex: 1 }}>
            📋 Copy URL
          </button>
          <button onClick={handleOpenLink} className="btn btn-teal" style={{ flex: 1.5 }}>
            🚀 Open Live Form
          </button>
        </div>
      </div>
    </div>
  );
}
