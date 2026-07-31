import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface NotificationItem {
  id: number;
  senderName: string;
  senderRole: string;
  targetRole: string;
  title: string;
  message: string;
  isRead: boolean;
  created_at: string;
}

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

  // Notification State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifDrawer, setShowNotifDrawer] = useState<boolean>(false);
  const [notifTab, setNotifTab] = useState<'inbox' | 'compose' | 'broadcast'>('inbox');
  const [showBroadcastModal, setShowBroadcastModal] = useState<boolean>(false);

  const [msgTitle, setMsgTitle] = useState<string>('');

  const [msgBody, setMsgBody] = useState<string>('');
  const [targetRole, setTargetRole] = useState<string>('ALL');
  const [sendingMsg, setSendingMsg] = useState<boolean>(false);
  const [msgSuccess, setMsgSuccess] = useState<string>('');
  const prevUnreadCountRef = useRef<number>(0);

  // Synth Chime Sound on New Notification
  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio context blocked until interaction
    }
  };

  // Live Clock & Date
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

  // Fetch notifications with audio chime on new unread item
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/api/notifications');
      if (res.data?.ok) {
        const fetched: NotificationItem[] = res.data.notifications || [];
        const unreadCount = fetched.filter(n => !n.isRead).length;

        if (unreadCount > prevUnreadCountRef.current) {
          playNotificationSound();
        }
        prevUnreadCountRef.current = unreadCount;
        setNotifications(fetched);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

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

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgTitle || !msgBody) return;

    try {
      setSendingMsg(true);
      setMsgSuccess('');
      const res = await api.post('/api/notifications', {
        targetRole,
        title: msgTitle,
        message: msgBody
      });
      if (res.data?.ok) {
        setMsgSuccess('Broadcast message sent successfully!');
        setMsgTitle('');
        setMsgBody('');
        fetchNotifications();
        setTimeout(() => setMsgSuccess(''), 3000);
      }
    } catch {
      console.error('Failed to send broadcast notification');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleDeleteNotification = async (id: number) => {
    try {
      await api.delete(`/api/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch {
      console.error('Failed to delete notification');
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markRead = async () => {
    try {
      await api.put('/api/notifications/read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch { /* ignore */ }
  };

  // Role visibility filter
  const showMenu = (item: string): boolean => {
    if (!user) return false;
    const role = user.role;
    if (role === 'super_admin' || role === 'admin' || role === 'crm_manager') return true;

    if (role === 'greeter') {
      return ['footfall', 'feedback-qr', 'divert', 'tv', 'attendance-tv'].includes(item);
    }
    if (role === 'telecaller') {
      return ['feedback-list', 'feedback-qr', 'footfall'].includes(item);
    }
    if (role === 'vm') {
      return ['vm-checklist', 'footfall'].includes(item);
    }
    if (role === 'purchase_manager') {
      return ['pm-view', 'footfall'].includes(item);
    }

    if (role === 'supervisor') {
      return ['attendance', 'attendance-tv', 'tv'].includes(item);
    }

    return ['dashboard', 'footfall', 'feedback-qr', 'divert', 'tv', 'attendance-tv', 'attendance', 'reports'].includes(item);
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
        { id: 'vm-checklist', path: '/app/vm-checklist', label: 'VM Checklist', icon: '🏢' },
        { id: 'attendance', path: '/app/attendance', label: 'Staff Attendance', icon: '🗓️' },
        { id: 'attendance-tv', path: '/app/attendance-tv', label: 'Floor TV Roster', icon: '📺' },
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

  const isManagerOrAdmin = ['super_admin', 'admin', 'crm_manager', 'telecaller'].includes(user?.role || '');

  const roleColors: Record<string, string> = {
    super_admin: '#F59E0B',
    admin: '#3B82F6',
    crm_manager: '#10B981',
    crm_staff: '#6366F1',
    telecaller: '#8B5CF6',
    greeter: '#EC4899',
    vm: '#14B8A6',
    hr: '#F97316',
    purchase_manager: '#EF4444',
  };

  const getRoleColor = () => roleColors[user?.role || ''] || '#94A3B8';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FAF7F2' }}>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="mobile-sidebar-backdrop"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)',
            zIndex: 90
          }}
        />
      )}



      {/* Deep Navy Premium Sidebar */}
      <aside
        className={mobileOpen ? 'mobile-open' : ''}
        style={{
          width: collapsed ? '80px' : '250px',
          background: 'linear-gradient(175deg, #0F172A 0%, #1A233D 100%)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          transition: 'width 0.25s ease',
          zIndex: mobileOpen ? 100 : 20,
          boxShadow: '4px 0 24px rgba(0,0,0,0.15)'

        }}
      >
        {/* Header with Brand Logo & Collapse Toggle */}
        <div
          style={{
            padding: collapsed ? '20px 12px' : '20px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderBottom: '1px solid rgba(255,255,255,0.07)'
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
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <h2 className="outfit" style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2, letterSpacing: '-0.2px' }}>
                Retail CRM
              </h2>
              <span style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                {settings?.companyName || 'BSC THE TEXTILE MALL'}
              </span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: 'none',
              borderRadius: '6px',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#94A3B8',
              fontSize: '10px',
              flexShrink: 0
            }}
          >
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        {/* User Role Banner inside Sidebar */}
        {!collapsed && user && (
          <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: getRoleColor(),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: 800, color: '#FFFFFF', flexShrink: 0
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2 }}>{user.name}</div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: getRoleColor(), textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '1px' }}>
                {user.role.replace(/_/g, ' ')}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Categories & Links */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          {navCategories.map((cat) => {
            const visibleItems = cat.items.filter(item => showMenu(item.id));
            if (visibleItems.length === 0) return null;

            return (
              <div key={cat.title} style={{ marginBottom: '18px' }}>
                {!collapsed && (
                  <div style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#475569',
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
                      onClick={() => {
                        navigate(item.path);
                        setMobileOpen(false);
                      }}
                      title={collapsed ? item.label : undefined}
                      style={{
                        padding: collapsed ? '12px 0' : '10px 14px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: active ? 700 : 500,
                        marginBottom: '4px',
                        background: active ? '#D97706' : 'transparent',
                        color: active ? '#FFFFFF' : '#94A3B8',
                        boxShadow: active ? '0 2px 8px rgba(217, 119, 6, 0.35)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'space-between',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                          e.currentTarget.style.color = '#FFFFFF';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#94A3B8';
                        }
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

        {/* Footer: Logout + Developer Credit */}
        <div style={{ padding: '14px 12px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
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

          {/* Developer Credit */}
          {!collapsed && (
            <div style={{
              marginTop: '10px',
              textAlign: 'center',
              fontSize: '10px',
              color: '#475569',
              lineHeight: 1.4,
              letterSpacing: '0.01em'
            }}>
              Designed & Developed by{' '}
              <span style={{ color: '#818CF8', fontWeight: 700 }}>Renukaradhya M S</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#FAF7F2' }}>
        {/* Top Bar */}
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

          {/* Right Header Live Date/Time, Broadcast & Notification Bell Widget */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="mobile-hide-datetime" style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
              <span>{dateStr}</span>
              <span className="mono" style={{ marginLeft: '6px', fontWeight: 700, color: '#0F172A' }}>{timeStr}</span>
            </div>



            {isManagerOrAdmin && (
              <button
                onClick={() => setShowBroadcastModal(true)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(79,70,229,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                📢 Broadcast
              </button>
            )}

            {/* Notification Bell Icon */}
            <div style={{ position: 'relative' }}>

              <button
                onClick={() => {
                  setShowNotifDrawer(!showNotifDrawer);
                  if (!showNotifDrawer) markRead();
                }}
                style={{
                  background: showNotifDrawer ? '#4F46E5' : '#FAF7F2',
                  border: '1px solid #CBD5E1',
                  borderRadius: '10px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s ease'
                }}
                title="Notifications & Broadcast Messages"
              >
                🔔
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      background: '#EF4444',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      fontWeight: 800,
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(239,68,68,0.4)',
                      animation: 'pulse 1.5s ease infinite'
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Viewport Content Container */}
        <main style={{ flex: 1, overflowY: 'auto', background: '#FAF7F2' }}>
          {children}
        </main>
      </div>

      {/* ========== REDESIGNED NOTIFICATION DRAWER ========== */}
      {showNotifDrawer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setShowNotifDrawer(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '440px',
              maxWidth: '95vw',
              height: '100%',
              background: '#0F172A',
              boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
              borderLeft: '1px solid rgba(255,255,255,0.08)'
            }}
            className="fade-in"
          >
            {/* Drawer Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #1E293B, #0F172A)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px', height: '36px', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                  borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', boxShadow: '0 4px 12px rgba(79,70,229,0.4)'
                }}>
                  🔔
                </div>
                <div>
                  <h3 className="outfit" style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
                    Notifications
                  </h3>
                  <p style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                    {unreadCount > 0 ? `${unreadCount} unread messages` : 'All caught up!'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNotifDrawer(false)}
                style={{
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer',
                  color: '#94A3B8', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* Tab Switcher (only for managers/admins) */}
            {isManagerOrAdmin && (
              <div style={{
                display: 'flex',
                padding: '12px 16px',
                gap: '8px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: '#0F172A'
              }}>
                <button
                  onClick={() => setNotifTab('inbox')}
                  style={{
                    flex: 1, padding: '8px', borderRadius: '8px',
                    background: notifTab === 'inbox' ? '#1E293B' : 'transparent',
                    border: notifTab === 'inbox' ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
                    color: notifTab === 'inbox' ? '#FFFFFF' : '#64748B',
                    fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  📥 Inbox
                  {unreadCount > 0 && (
                    <span style={{ background: '#EF4444', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '1px 5px', borderRadius: '8px' }}>
                      {unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setNotifTab('compose')}
                  style={{
                    flex: 1, padding: '8px', borderRadius: '8px',
                    background: notifTab === 'compose' ? '#4F46E5' : 'transparent',
                    border: notifTab === 'compose' ? '1px solid #4F46E5' : '1px solid transparent',
                    color: notifTab === 'compose' ? '#FFFFFF' : '#64748B',
                    fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  📤 Broadcast
                </button>
              </div>
            )}

            {/* COMPOSE TAB */}
            {isManagerOrAdmin && notifTab === 'compose' && (
              <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
                {msgSuccess && (
                  <div style={{
                    background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: '10px', padding: '12px 16px', marginBottom: '16px',
                    color: '#10B981', fontSize: '13px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                    ✅ {msgSuccess}
                  </div>
                )}

                <form onSubmit={handleSendNotification} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>
                      Target Audience
                    </label>
                    <select
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px', fontWeight: 600,
                        background: '#1E293B', color: '#FFFFFF'
                      }}
                    >
                      <option value="ALL">📢 All Logged-in Staff</option>
                      <option value="crm_manager">👔 CRM Managers</option>
                      <option value="supervisor">👮 Supervisors</option>
                      <option value="greeter">👋 Greeters</option>
                      <option value="telecaller">📞 Telecallers</option>
                      <option value="crm_staff">👥 CRM Staff</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>
                      Notification Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Urgent: Staff Meeting at 3 PM"
                      value={msgTitle}
                      onChange={(e) => setMsgTitle(e.target.value)}
                      required
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px',
                        background: '#1E293B', color: '#FFFFFF'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>
                      Message Body
                    </label>
                    <textarea
                      placeholder="Type broadcast announcement details..."
                      rows={4}
                      value={msgBody}
                      onChange={(e) => setMsgBody(e.target.value)}
                      required
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px',
                        resize: 'vertical', background: '#1E293B', color: '#FFFFFF',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sendingMsg}
                    style={{
                      width: '100%', padding: '12px',
                      borderRadius: '10px',
                      background: sendingMsg ? '#334155' : 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                      color: '#FFFFFF', fontSize: '13px', fontWeight: 800,
                      border: 'none', cursor: sendingMsg ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                  >
                    {sendingMsg ? '⏳ Sending...' : '📤 Send Broadcast Message'}
                  </button>
                </form>
              </div>
            )}

            {/* INBOX TAB */}
            {(!isManagerOrAdmin || notifTab === 'inbox') && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {/* Mark all read + clear options */}
                {notifications.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px', gap: '8px' }}>
                    <button
                      onClick={markRead}
                      style={{
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#94A3B8', fontSize: '11px', fontWeight: 700, padding: '5px 10px',
                        borderRadius: '6px', cursor: 'pointer'
                      }}
                    >
                      ✓ Mark all read
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {notifications.length > 0 ? (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        style={{
                          background: n.isRead ? 'rgba(30,41,59,0.6)' : 'rgba(79,70,229,0.12)',
                          border: `1px solid ${n.isRead ? 'rgba(255,255,255,0.07)' : 'rgba(79,70,229,0.35)'}`,
                          borderRadius: '12px',
                          padding: '14px 16px',
                          transition: 'all 0.2s ease',
                          position: 'relative'
                        }}
                      >
                        {/* Unread indicator */}
                        {!n.isRead && (
                          <div style={{
                            position: 'absolute', top: '14px', right: '14px',
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: '#4F46E5', boxShadow: '0 0 6px rgba(79,70,229,0.6)'
                          }} />
                        )}

                        {/* Title row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px', paddingRight: '16px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.3 }}>
                            {n.title}
                          </span>
                        </div>

                        {/* Message */}
                        <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                          {n.message}
                        </p>

                        {/* Footer row */}
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px'
                        }}>
                          <div style={{ fontSize: '11px', color: '#475569' }}>
                            <span style={{ color: '#94A3B8' }}>From: </span>
                            <span style={{ color: '#CBD5E1', fontWeight: 700 }}>{n.senderName}</span>
                            <span style={{ color: '#475569' }}> → </span>
                            <span style={{ color: '#818CF8', fontWeight: 700 }}>{n.targetRole}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '10px', color: '#475569' }}>
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isManagerOrAdmin && (
                              <button
                                onClick={() => handleDeleteNotification(n.id)}
                                style={{
                                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)',
                                  color: '#F87171', fontSize: '10px', fontWeight: 700,
                                  padding: '3px 8px', borderRadius: '6px', cursor: 'pointer'
                                }}
                                title="Delete notification"
                              >
                                🗑 Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: '#475569' }}>
                      <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.4 }}>🔔</div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#64748B' }}>No notifications yet</p>
                      <p style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                        {isManagerOrAdmin ? 'Use Broadcast tab to send messages to staff.' : 'You\'ll see messages from managers here.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ========== CENTERED BROADCAST ANNOUNCEMENT MODAL ========== */}
      {showBroadcastModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            padding: '20px'
          }}
          onClick={() => setShowBroadcastModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '520px',
              maxWidth: '100%',
              background: '#0F172A',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '20px',
              padding: '28px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
              color: '#FFFFFF'
            }}
            className="fade-in"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                  borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px', boxShadow: '0 4px 12px rgba(79,70,229,0.4)'
                }}>
                  📢
                </div>
                <div>
                  <h3 className="outfit" style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
                    Send Broadcast Announcement
                  </h3>
                  <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
                    Publish instant notifications to staff members across the store
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer',
                  color: '#94A3B8', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {msgSuccess && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34D399', padding: '10px 14px', borderRadius: '8px', fontSize: '12px',
                marginBottom: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                ✅ {msgSuccess}
              </div>
            )}

            <form onSubmit={async (e) => {
              await handleSendNotification(e);
              setTimeout(() => setShowBroadcastModal(false), 1500);
            }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>
                  Target Role / Audience
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.12)', fontSize: '13px', fontWeight: 700,
                    background: '#1E293B', color: '#FFFFFF'
                  }}
                >
                  <option value="ALL">📢 All Logged-in Staff</option>
                  <option value="crm_manager">👔 CRM Managers</option>
                  <option value="supervisor">👮 Supervisors</option>
                  <option value="greeter">👋 Greeters</option>
                  <option value="telecaller">📞 Telecallers</option>
                  <option value="crm_staff">👥 CRM Staff</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>
                  Notification Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Floor Meeting at 3:00 PM"
                  value={msgTitle}
                  onChange={(e) => setMsgTitle(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.12)', fontSize: '13px',
                    background: '#1E293B', color: '#FFFFFF'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>
                  Message Body
                </label>
                <textarea
                  placeholder="Type full broadcast details for team members..."
                  rows={4}
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.12)', fontSize: '13px',
                    resize: 'vertical', background: '#1E293B', color: '#FFFFFF',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  style={{
                    flex: 1, padding: '11px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#CBD5E1', fontSize: '13px', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingMsg}
                  style={{
                    flex: 1.5, padding: '11px', borderRadius: '10px',
                    background: sendingMsg ? '#334155' : 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                    color: '#FFFFFF', fontSize: '13px', fontWeight: 800,
                    border: 'none', cursor: sendingMsg ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(79,70,229,0.35)'
                  }}
                >
                  {sendingMsg ? '⏳ Sending...' : '🚀 Publish Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

