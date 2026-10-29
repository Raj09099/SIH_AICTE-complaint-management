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
} from 'lucide-react';
import { API_BASE_URL } from '../../services/api';

export function Navbar({ onToggleSidebar }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [apiStatus, setApiStatus] = useState({ online: false, latency: null });
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

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
    <header className="h-16 bg-[#36454F] border-b border-[#28343C] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm text-white">
      {/* Left Area: Mobile Menu + Application Branding */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-[#28343C] lg:hidden focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand Identification */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#0F766E] flex items-center justify-center text-white shadow-sm shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight">
              AICTE Complaint Intelligence
            </h1>
            <p className="text-[11px] text-slate-300 leading-tight">
              Institution Monitoring & Resolution
            </p>
          </div>
        </div>
      </div>

      {/* Right Area: System Status, Clock, Notifications, Profile */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Backend Grid Status Pill */}
        <div className="hidden md:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-[#28343C] border border-slate-600/50 text-xs text-slate-200">
          <span
            className={`w-2 h-2 rounded-full ${
              apiStatus.online ? 'bg-[#14B8A6]' : 'bg-[#B45309]'
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
        <div className="hidden lg:flex items-center text-xs text-slate-300 font-mono bg-[#28343C] px-2.5 py-1 rounded-md border border-slate-600/50">
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
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-[#28343C] focus:outline-none focus:ring-2 focus:ring-[#0F766E] relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#0F766E]" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-[#E5E7EB] py-2 z-50 text-[#374151]">
              <div className="px-4 py-2 border-b border-[#E5E7EB] flex items-center justify-between">
                <span className="text-xs font-bold text-[#36454F] uppercase tracking-wider">
                  Council Alerts
                </span>
                <span className="text-[10px] font-semibold text-[#0F766E] bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                  Active
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-[#E5E7EB] text-xs">
                <div className="p-3 hover:bg-[#F5F7F7] transition">
                  <div className="flex items-center space-x-2 text-[#0F766E] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Database Synchronized</span>
                  </div>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">
                    100 approved institutions and 501 complaint cases connected to telemetry.
                  </p>
                </div>
                <div className="p-3 hover:bg-[#F5F7F7] transition">
                  <div className="flex items-center space-x-2 text-[#B45309] font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Cross-Bureau Cases Flagged</span>
                  </div>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">
                    Overlap detection identified potential multi-bureau duplicate filings.
                  </p>
                </div>
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
            className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-[#28343C] focus:outline-none focus:ring-2 focus:ring-[#0F766E] transition"
            aria-label="User account menu"
          >
            <div className="w-8 h-8 rounded-full bg-[#0F766E] flex items-center justify-center text-white font-bold text-xs">
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
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-[#E5E7EB] py-2 z-50 text-[#374151]">
              <div className="px-4 py-2 border-b border-[#E5E7EB]">
                <p className="text-xs font-bold text-[#36454F] truncate">
                  {user?.full_name || 'AICTE Officer'}
                </p>
                <p className="text-[11px] text-[#6B7280] truncate">
                  {user?.email || 'officer@aicte-india.org'}
                </p>
                <span className="inline-block mt-1 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-teal-50 text-[#0F766E] border border-teal-200">
                  {user?.role || 'officer'}
                </span>
              </div>

              <div className="py-1 text-xs">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-[#B91C1C] hover:bg-[#F5F7F7] flex items-center space-x-2 font-medium"
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
