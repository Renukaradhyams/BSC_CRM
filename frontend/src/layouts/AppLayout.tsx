import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout, settings } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [timeStr, setTimeStr] = useState<string>('');
  const [alertsCount, setAlertsCount] = useState<number>(0);

  // Live dynamic Clock (IST)
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const hrs = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const secs = String(d.getSeconds()).padStart(2, '0');
      setTimeStr(`${hrs}:${mins}:${secs}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch open alerts count
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await api.get('/api/crm/divert');
        if (res.data && res.data.ok) {
          const openCount = res.data.diverts.filter((d: any) => d.status === 'open').length;
          setAlertsCount(openCount);
        }
      } catch (err) {
        console.error('Failed to load divert alerts count', err);
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Sidebar Role-Based menu visibility filter
  const showMenu = (item: string): boolean => {
    if (!user) return false;
    const role = user.role;

    if (role === 'super_admin' || role === 'admin') return true;

    switch (item) {
      case 'dashboard':
      case 'reports':
      case 'feedback-qr':
      case 'tv':
        return ['crm_manager', 'crm_staff'].includes(role);
      case 'footfall':
      case 'divert':
        return ['crm_manager', 'crm_staff'].includes(role);
      case 'feedback-list':
        return ['crm_manager', 'telecaller'].includes(role);
      case 'pm-view':
        return role === 'purchase_manager';
      case 'cash-settlement':
        return ['crm_manager', 'crm_staff'].includes(role);
      case 'vm-checklist':
        return ['crm_manager', 'vm'].includes(role);
      case 'admin':
        return false; // Only admin/super_admin
      default:
        return false;
    }
  };

  const navItems = [
    { id: 'dashboard', path: '/app', label: '📊 Dashboard' },
    { id: 'footfall', path: '/app/footfall', label: '🚶 Footfall Entry' },
    { id: 'feedback-qr', path: '/app/feedback-qr', label: '📱 Feedback QR' },
    { id: 'feedback-list', path: '/app/feedback-list', label: '📞 Feedback Queue' },
    { id: 'divert', path: '/app/divert', label: '📦 Divert Register' },
    { id: 'pm-view', path: '/app/pm-view', label: '👔 Purchase Manager' },
    { id: 'reports', path: '/app/reports', label: '📈 Reports' },
    { id: 'cash-settlement', path: '/app/cash-settlement', label: '💰 Cash Settlement' },
    { id: 'vm-checklist', path: '/app/vm-checklist', label: '🏢 VM Checklist' },
    { id: 'admin', path: '/app/admin', label: '⚙️ Admin Settings' },
    { id: 'tv', path: '/app/tv', label: '📺 Live TV Display' }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--ivory)' }}>
      {/* Sidebar Layout container */}
      <aside style={{
        width: '260px',
        background: 'var(--navy)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0
      }}>
        {/* Company Header */}
        <div style={{
          padding: '24px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            background: '#fff',
            borderRadius: '8px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justify: 'center'
          }}>
            <img 
              src={settings?.companyLogoUrl || 'https://bsctextilescandb-ui.github.io/retail-crm/logo.jpg'} 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              alt="BSC"
            />
          </div>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 'bold', fontFamily: "'DM Serif Display', serif", lineHeight: 1.1 }}>
              {settings?.companyName || 'BSC Textiles'}
            </h2>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              CRM Workspace
            </span>
          </div>
        </div>

        {/* Dynamic Clock & User context indicators */}
        <div style={{ padding: '16px 20px', background: 'rgba(0,0,0,0.15)', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
            <span>🕒 IST Clock:</span>
            <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{timeStr}</span>
          </div>
          <div style={{ color: 'var(--gold-l)', fontSize: '11px', textTransform: 'capitalize' }}>
            👤 Logged as: {user?.name} ({user?.role.replace('_', ' ')})
          </div>
        </div>

        {/* Menu Navigation */}
        <nav style={{ flex: 1, padding: '16px 10px', overflowY: 'auto' }}>
          {navItems.map(item => {
            if (!showMenu(item.id)) return null;
            const active = location.pathname === item.path;
            return (
              <div
                key={item.id}
                onClick={() => navigate(item.path)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  marginBottom: '6px',
                  background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: active ? 'var(--gold-l)' : 'rgba(255,255,255,0.85)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background 0.15s'
                }}
              >
                <span>{item.label}</span>
                {item.id === 'divert' && alertsCount > 0 && (
                  <span style={{
                    background: 'var(--crimson)',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '10px'
                  }}>{alertsCount}</span>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer Logout Button */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button 
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🚪 Logout Session
          </button>
        </div>
      </aside>

      {/* Main Workspace content viewport container */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
