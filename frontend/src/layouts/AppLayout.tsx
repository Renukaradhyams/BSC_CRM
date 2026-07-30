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
  const [dateStr, setDateStr] = useState<string>('');
  const [alertsCount, setAlertsCount] = useState<number>(0);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  // Live Clock & Date formatted as "Thu, Jul 30, 2026 04:30:44 PM"
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      };
      const formattedDate = d.toLocaleDateString('en-US', options);
      const formattedTime = d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      setDateStr(formattedDate);
      setTimeStr(formattedTime);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch divert alerts count
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
    const interval = setInterval(fetchAlerts, 45000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Role visibility filter
  const showMenu = (item: string): boolean => {
    if (!user) return false;
    const role = user.role;
    if (role === 'super_admin' || role === 'admin') return true;

    switch (item) {
      case 'dashboard':
      case 'reports':
      case 'feedback-qr':
      case 'tv':
      case 'footfall':
      case 'divert':
      case 'cash-settlement':
        return ['crm_manager', 'crm_staff', 'greeter', 'telecaller'].includes(role);
      case 'feedback-list':
        return ['crm_manager', 'telecaller', 'greeter'].includes(role);
      case 'pm-view':
        return role === 'purchase_manager';
      case 'vm-checklist':
        return ['crm_manager', 'vm'].includes(role);
      case 'attendance':
        return ['crm_manager', 'admin', 'super_admin', 'hr', 'greeter'].includes(role);
      case 'admin':
        return false;
      default:
        return false;
    }
  };

  const navCategories = [
    {
      title: 'CRM',
      items: [
        { id: 'dashboard', path: '/app', label: 'Dashboard', icon: '📊' },
        { id: 'footfall', path: '/app/footfall', label: 'Footfall', icon: '🚶' },
        { id: 'feedback-list', path: '/app/feedback-list', label: 'Feedback List', icon: '📞' },
        { id: 'feedback-qr', path: '/app/feedback-qr', label: 'New Feedback', icon: '📱' },
        { id: 'divert', path: '/app/divert', label: 'Divert Register', icon: '📦' },
        { id: 'pm-view', path: '/app/pm-view', label: 'Purchase Manager', icon: '👔' },
        { id: 'cash-settlement', path: '/app/cash-settlement', label: 'Cash Settlement', icon: '💰' },
        { id: 'vm-checklist', path: '/app/vm-checklist', label: 'VM Checklist', icon: '🏢' },
        { id: 'attendance', path: '/app/attendance', label: 'Staff Attendance', icon: '🗓️' },
        { id: 'tv', path: '/app/tv', label: 'Live TV Display', icon: '📺' }
      ]
    },
    {
      title: 'REPORTS',
      items: [
        { id: 'reports', path: '/app/reports', label: 'Reports', icon: '📈' }
      ]
    },
    {
      title: 'ADMIN',
      items: [
        { id: 'admin', path: '/app/admin', label: 'Settings', icon: '⚙️' }
      ]
    }
  ];

  const getPageTitle = () => {
    for (const cat of navCategories) {
      const match = cat.items.find(i => i.path === location.pathname);
      if (match) return match.label.toLowerCase();
    }
    return 'dashboard';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FAF7F2', position: 'relative', fontFamily: "'Inter', sans-serif" }}>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 19
          }}
          className="mobile-sidebar-backdrop"
        />
      )}

      {/* Deep Navy Premium Sidebar */}
      <aside
        className={mobileOpen ? 'mobile-open' : ''}
        style={{
          width: collapsed ? '80px' : '250px',
          background: '#1A233D',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          transition: 'width 0.25s ease',
          zIndex: 20,
          boxShadow: '4px 0 20px rgba(0,0,0,0.08)'
        }}
      >
        {/* Header with Brand Logo */}
        <div
          style={{
            padding: collapsed ? '20px 12px' : '20px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderBottom: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              background: '#FFFFFF',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3px',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          >
            <img
              src={settings?.companyLogoUrl || 'https://bsctextilescandb-ui.github.io/retail-crm/logo.jpg'}
              alt="BSC Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <h2 className="outfit" style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2, letterSpacing: '-0.2px' }}>
                Retail CRM
              </h2>
              <span style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                {settings?.companyName || 'BSC THE TEXTILE MALL'}
              </span>
            </div>
          )}
        </div>

        {/* User Role Banner inside Sidebar */}
        {!collapsed && user && (
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>{user.name}</div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#CBD5E1', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>
              {user.role.replace('_', ' ')}
            </div>
          </div>
        )}

        {/* Navigation Categories & Links */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          {navCategories.map((cat, cIdx) => {
            const visibleItems = cat.items.filter(item => showMenu(item.id));
            if (visibleItems.length === 0) return null;

            return (
              <div key={cat.title} style={{ marginBottom: '18px' }}>
                {!collapsed && (
                  <div style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#64748B',
                    letterSpacing: '0.12em',
                    padding: '0 8px 8px 8px',
                    textTransform: 'uppercase'
                  }}>
                    {cat.title}
                  </div>
                )}
                {visibleItems.map(item => {
                  const active = location.pathname === item.path;
                  return (
                    <div
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      title={collapsed ? item.label : undefined}
                      style={{
                        padding: collapsed ? '12px 0' : '10px 14px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: active ? 700 : 500,
                        marginBottom: '4px',
                        background: active ? '#D97706' : 'transparent', // Rich Amber Gold active pill as in user image
                        color: active ? '#FFFFFF' : '#94A3B8',
                        boxShadow: active ? '0 2px 8px rgba(217, 119, 6, 0.35)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'space-between',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '15px', flexShrink: 0 }}>{item.icon}</span>
                        {!collapsed && <span>{item.label}</span>}
                      </div>

                      {!collapsed && item.id === 'divert' && alertsCount > 0 && (
                        <span
                          style={{
                            background: '#EF4444',
                            color: '#FFFFFF',
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '10px'
                          }}
                        >
                          {alertsCount}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer Logout Button */}
        <div style={{ padding: '14px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: collapsed ? '10px 0' : '9px 14px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#CBD5E1',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.color = '#FFFFFF'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#CBD5E1'; }}
          >
            <span>🚪</span>
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#FAF7F2' }}>
        {/* Top Bar matching screenshot */}
        <header
          style={{
            height: '56px',
            background: '#FFFFFF',
            borderBottom: '1px solid #EAE5DC',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            zIndex: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="mobile-hamburger"
              style={{
                background: '#F1F5F9', border: '1px solid #E2E8F0',
                borderRadius: '6px', padding: '5px 10px', fontSize: '16px',
                cursor: 'pointer', display: 'none'
              }}
              title="Toggle Menu"
            >
              ☰
            </button>
            <h1 className="outfit" style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', textTransform: 'lowercase' }}>
              {getPageTitle()}
            </h1>
          </div>

          {/* Right Header Live Date/Time Widget */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
              <span>{dateStr}</span>
              <span className="mono" style={{ marginLeft: '10px', fontWeight: 700, color: '#0F172A' }}>{timeStr}</span>
            </div>
          </div>
        </header>

        {/* Viewport Content Container */}
        <main style={{ flex: 1, overflowY: 'auto', background: '#FAF7F2' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
