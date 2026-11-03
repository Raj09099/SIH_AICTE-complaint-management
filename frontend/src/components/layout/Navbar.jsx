import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Bell,
  Menu,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ChevronDown,
  Shield,
  User,
  Building2,
  Clock,
  AlertTriangle,
  CheckCheck,
  ExternalLink,
} from 'lucide-react';
import { API_BASE_URL } from '../../services/api';
import { notificationService } from '../../services/notifications';

export function Navbar({ onToggleSidebar }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [apiStatus, setApiStatus] = useState({ online: false, latency: null });
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  // Poll unread notification count
  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const res = await notificationService.getUnreadCount();
        setUnreadCount(res.unread_count || 0);
      } catch (err) {
        // fail silently on background poll
      }
    };
    fetchUnread();
    const timer = setInterval(fetchUnread, 30000);
    return () => clearInterval(timer);
  }, [user]);

  // Load detailed notifications when popover opens
  useEffect(() => {
    if (showNotifications && user) {
      setLoadingNotifications(true);
      notificationService
        .getNotifications({ limit: 30 })
        .then((res) => {
          setNotifications(res.items || []);
          setUnreadCount(res.unread_count || 0);
        })
        .catch((err) => console.error('Failed to load notifications:', err))
        .finally(() => setLoadingNotifications(false));
    }
  }, [showNotifications, user]);

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await notificationService.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error('Failed to mark notification read:', err);
      }
    }
    setShowNotifications(false);
    if (notif.complaint_id) {
      navigate(`/complaints/${notif.complaint_id}`);
    }
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Clock in Indian Standard Time (IST)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll backend health check safely
  useEffect(() => {
    const checkHealth = async () => {
      const start = Date.now();
      try {
        const healthUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '/api/health');
        const res = await fetch(healthUrl);
        if (res.ok) {
          const latency = Date.now() - start;
          setApiStatus({ online: true, latency });
        } else {
          setApiStatus({ online: false, latency: null });
        }
      } catch {
        setApiStatus({ online: false, latency: null });
      }
    };

    checkHealth();
    const timer = setInterval(checkHealth, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-[#364650] border-b border-[#2b3840] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm text-white">
      {/* Left Area: Mobile Menu + Application Branding */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-[#2b3840] lg:hidden focus:outline-none focus:ring-2 focus:ring-[#087F75]"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand Identification */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#087F75] flex items-center justify-center text-white shadow-sm shrink-0">
            {user?.role === 'institute' ? (
              <Building2 className="w-5 h-5" />
            ) : (
              <Shield className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight">
                AICTE Complaint Intelligence
              </h1>
              {user?.role === 'institute' ? (
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-500/20 text-[#2DD4BF] border border-teal-500/30">
                  Institute Level
                </span>
              ) : (
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-700 text-slate-300 border border-slate-600">
                  AICTE Officer
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 leading-tight">
              {user?.role === 'institute'
                ? `Campus Portal • ${user?.bureau || 'Technical Institution'}`
                : 'Central Bureau Monitoring & Resolution'}
            </p>
          </div>
        </div>
      </div>

      {/* Right Area: System Status, Clock, Notifications, Profile */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Backend Grid Status Pill */}
        <div className="hidden md:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-[#2b3840] border border-slate-600/50 text-xs text-slate-200">
          <span
            className={`w-2 h-2 rounded-full ${
              apiStatus.online ? 'bg-[#198754]' : 'bg-[#D97736]'
            }`}
          />
          <span className="font-medium text-[11px]">
            {apiStatus.online ? 'Backend Connected' : 'Checking API'}
          </span>
          {apiStatus.latency && (
            <span className="text-[10px] text-teal-200 font-mono">
              {apiStatus.latency}ms
            </span>
          )}
        </div>

        {/* Live IST Clock */}
        <div className="hidden lg:flex items-center text-xs text-slate-300 font-mono bg-[#2b3840] px-2.5 py-1 rounded-md border border-slate-600/50">
          <span>{currentTime || 'IST'}</span>
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-[#2b3840] focus:outline-none focus:ring-2 focus:ring-[#087F75] relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-[#DC3545] text-white text-[9px] font-bold font-mono shadow-xs border border-white leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-[#D9DEE3] py-2 z-50 text-[#263746]">
              <div className="px-4 py-2 border-b border-[#D9DEE3] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-[#263746] uppercase tracking-wider">
                    SLA Alerts & Reminders
                  </span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold text-[#DC3545] bg-red-50 px-2 py-0.5 rounded border border-red-200">
                      {unreadCount} Unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    disabled={isMarkingAll}
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-[#087F75] hover:underline flex items-center space-x-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-[#D9DEE3] text-xs">
                {loadingNotifications ? (
                  <div className="p-6 text-center text-xs text-[#718096]">
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#718096] space-y-1">
                    <CheckCircle2 className="w-6 h-6 text-[#198754] mx-auto mb-1" />
                    <p className="font-semibold text-[#263746]">No pending reminders</p>
                    <p className="text-[11px]">All statutory deadlines are compliant.</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isOverdue = n.notification_type === 'DEADLINE_OVERDUE';
                    const isDueToday = n.notification_type === 'DEADLINE_TODAY';
                    const is3Days = n.notification_type === 'DEADLINE_APPROACHING_3D';

                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3 transition cursor-pointer hover:bg-[#F5F7F7] flex items-start space-x-2.5 ${
                          !n.is_read ? 'bg-teal-50/40' : ''
                        }`}
                      >
                        <div className="shrink-0 mt-0.5">
                          {isOverdue ? (
                            <AlertTriangle className="w-4 h-4 text-[#DC3545]" />
                          ) : isDueToday ? (
                            <AlertCircle className="w-4 h-4 text-[#D97736]" />
                          ) : is3Days ? (
                            <Clock className="w-4 h-4 text-[#087F75]" />
                          ) : (
                            <Shield className="w-4 h-4 text-[#087F75]" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-semibold text-[#263746] truncate text-[11px]" title={n.title}>
                              {n.title}
                            </p>
                            {!n.is_read && (
                              <span className="w-2 h-2 rounded-full bg-[#087F75] shrink-0" title="Unread" />
                            )}
                          </div>
                          <p className="text-[11px] text-[#718096] mt-0.5 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>

                          {n.pending_action && (
                            <div className="mt-1.5 flex items-center space-x-1.5">
                              <span className="text-[9px] uppercase font-bold text-[#718096]">Action:</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white border border-[#D9DEE3] text-[#263746] truncate max-w-[200px]">
                                {n.pending_action}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Officer Profile & Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-[#2b3840] focus:outline-none focus:ring-2 focus:ring-[#087F75] transition"
            aria-label="User account menu"
          >
            <div className="w-8 h-8 rounded-full bg-[#087F75] flex items-center justify-center text-white font-bold text-xs">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'O'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-white leading-tight truncate max-w-[120px]">
                {user?.full_name || 'AICTE Officer'}
              </p>
              <p className="text-[10px] text-teal-200 leading-tight truncate max-w-[120px]">
                {user?.bureau || 'Council Official'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-[#D9DEE3] py-2 z-50 text-[#263746]">
              <div className="px-4 py-2 border-b border-[#D9DEE3]">
                <p className="text-xs font-bold text-[#263746] truncate">
                  {user?.full_name || 'AICTE Officer'}
                </p>
                <p className="text-[11px] text-[#718096] truncate">
                  {user?.email || 'officer@aicte-india.org'}
                </p>
                <span className="inline-block mt-1 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-teal-50 text-[#087F75] border border-teal-200">
                  {user?.role || 'officer'}
                </span>
              </div>

              <div className="py-1 text-xs">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-[#DC3545] hover:bg-[#F5F7F7] flex items-center space-x-2 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
