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
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  // Live IST Clock
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
    const interval = setInterval(fetchAlerts, 15000);
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
      case 'attendance':
        return ['crm_manager', 'admin', 'super_admin', 'hr'].includes(role);
      case 'admin':
        return false;
      default:
        return false;
    }
  };

  const navItems = [
    { id: 'dashboard', path: '/app', label: 'Dashboard', icon: '📊' },
    { id: 'footfall', path: '/app/footfall', label: 'Footfall Entry', icon: '🚶' },
    { id: 'feedback-qr', path: '/app/feedback-qr', label: 'Feedback QR', icon: '📱' },
    { id: 'feedback-list', path: '/app/feedback-list', label: 'Call Queue / Feedback', icon: '📞' },
    { id: 'divert', path: '/app/divert', label: 'Sourcing Diverts', icon: '📦' },
    { id: 'pm-view', path: '/app/pm-view', label: 'Purchase Manager', icon: '👔' },
    { id: 'reports', path: '/app/reports', label: 'Reports & Analytics', icon: '📈' },
    { id: 'cash-settlement', path: '/app/cash-settlement', label: 'Cash Settlement', icon: '💰' },
    { id: 'vm-checklist', path: '/app/vm-checklist', label: 'VM Checklist', icon: '🏢' },
    { id: 'attendance', path: '/app/attendance', label: 'Staff Attendance', icon: '🗓️' },
    { id: 'admin', path: '/app/admin', label: 'Admin Settings', icon: '⚙️' },
    { id: 'tv', path: '/app/tv', label: 'Live TV Display', icon: '📺' }
  ];

  const getPageTitle = () => {
    const current = navItems.find(i => i.path === location.pathname);
    return current ? current.label : 'CRM Workspace';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)', position: 'relative' }}>
      {/* Mobile sidebar overlay backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 19, display: 'none'
          }}
          className="mobile-sidebar-backdrop"
        />
      )}
      {/* Sidebar Navigation Panel */}
      <aside
        style={{
          width: collapsed ? '80px' : '260px',
          background: '#0F172A',
          borderRight: '1px solid #1E293B',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 20
        }}
      >
        {/* Company Header */}
        <div
          style={{
            padding: '24px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                background: '#FFFFFF',
                borderRadius: '10px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                padding: '2px',
                flexShrink: 0
              }}
            >
              <img
                src={settings?.companyLogoUrl || 'https://bsctextilescandb-ui.github.io/retail-crm/logo.jpg'}
                alt="BSC"
                style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px' }}
              />
            </div>
            {!collapsed && (
              <div>
                <h2 className="outfit" style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.1 }}>
                  {settings?.companyName || 'BSC Textiles'}
                </h2>
                <span style={{ fontSize: '10px', color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                  Retail CRM
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'rgba(255,255,255,0.08)',
              color: '#94A3B8',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            {collapsed ? '❯' : '❮'}
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav style={{ flex: 1, padding: '16px 10px', overflowY: 'auto' }}>
          {navItems.map(item => {
            if (!showMenu(item.id)) return null;
            const active = location.pathname === item.path;
            return (
              <div
                key={item.id}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : undefined}
                style={{
                  padding: collapsed ? '12px 0' : '12px 14px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: active ? 600 : 500,
                  marginBottom: '4px',
                  background: active ? 'linear-gradient(90deg, #2563EB 0%, #1D4ED8 100%)' : 'transparent',
                  color: active ? '#FFFFFF' : '#94A3B8',
                  boxShadow: active ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: collapsed ? 'center' : 'space-between',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </div>

                {!collapsed && item.id === 'divert' && alertsCount > 0 && (
                  <span
                    style={{
                      background: '#DC2626',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '10px'
                    }}
                  >
                    {alertsCount}
                  </span>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Info & Logout Panel */}
        <div style={{ padding: '16px 14px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}>
          {!collapsed && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF' }}>{user?.name}</div>
              <div style={{ fontSize: '11px', color: '#60A5FA', textTransform: 'capitalize' }}>
                {user?.role.replace('_', ' ')}
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: collapsed ? '10px 0' : '10px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#FCA5A5',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <span>🚪</span>
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* Topbar Header */}
        <header
          style={{
            height: '64px',
            background: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            padding: '0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            zIndex: 10,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          {/* Left: Hamburger (mobile) + Breadcrumb Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="mobile-hamburger"
              style={{
                background: '#F1F5F9', border: '1px solid #E2E8F0',
                borderRadius: '8px', padding: '6px 10px', fontSize: '16px',
                cursor: 'pointer', display: 'none'
              }}
              title="Toggle sidebar"
            >
              ☰
            </button>
            <h1 className="outfit" style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
              {getPageTitle()}
            </h1>
          </div>

          {/* Right Header Status Widgets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Live IST Clock */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#475569'
              }}
            >
              <span style={{ color: '#2563EB' }}>⏰</span> IST {timeStr || '10:00:00'}
            </div>

            {/* Profile Avatar Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(37,99,235,0.3)'
                }}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Viewport Body Content */}
        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-dark)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
