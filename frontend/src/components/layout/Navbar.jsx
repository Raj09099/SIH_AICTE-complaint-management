import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Bell,
  Search,
  ShieldCheck,
  User,
  Menu,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  LogOut,
  ChevronDown,
  Shield,
} from 'lucide-react';

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

  // Poll backend health check
  useEffect(() => {
    const checkHealth = async () => {
      const start = Date.now();
      try {
        const res = await fetch('/api/health');
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
    <header className="h-16 border-b border-slate-800/80 bg-[#07101e]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-all">
      {/* Left Area: Mobile Menu + Bureau Brand */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden focus:outline-none"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center space-x-2.5">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <span
              className={`w-2 h-2 rounded-full ${
                apiStatus.online ? 'bg-cyan-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="font-medium">
              {apiStatus.online ? 'FastAPI Grid Active' : 'Checking API'}
            </span>
            {apiStatus.latency && (
              <span className="text-[10px] text-cyan-400 font-mono">
                {apiStatus.latency}ms
              </span>
            )}
          </div>

          <span className="text-slate-700">|</span>

          <span className="text-xs font-medium text-slate-400 hidden md:inline">
            Active Cell:
          </span>
          <span className="text-xs font-semibold text-teal-300 bg-teal-500/10 border border-teal-500/25 px-2.5 py-0.5 rounded-full">
            {user?.bureau || 'Central Grievance Redressal Cell'}
          </span>
        </div>
      </div>

      {/* Center Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search complaint ID, college code, subject... (Ctrl+K)"
            className="w-full pl-9 pr-12 py-1.5 bg-[#0a1424] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-850 text-slate-400 border border-slate-750">
            Ctrl K
          </kbd>
        </div>
      </div>

      {/* Right Area: Time, Notifications, Officer Avatar */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* IST Clock */}
        <div className="hidden xl:flex items-center space-x-1.5 text-xs text-slate-400 font-mono bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{currentTime || 'IST'}</span>
        </div>

        {/* Notifications Popover Toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="View notifications"
            className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition focus:outline-none"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-[#07101e]" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-[#0a1424] border border-slate-800 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-semibold text-white">System Alerts</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  3 Priority
                </span>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20 flex items-start space-x-2.5">
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-cyan-200">AI Overlap Detected</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Case #AICTE-2026-0842 has 91% similarity with #AICTE-2026-0914 across Approval and PGRC cells.
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/20 flex items-start space-x-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-200">SLA Warning (48h Remaining)</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Case #AICTE-2026-0612 escalated regarding faculty salary non-payment.
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-teal-950/30 border border-teal-500/20 flex items-start space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-teal-200">Resolution Evidence Uploaded</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Apex Tech College submitted compliance affidavit (NLP Score: 88%).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Identity Chip with Dropdown */}
        <div className="relative pl-3 border-l border-slate-800">
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2.5 p-1 rounded-xl hover:bg-slate-800/60 transition text-left focus:outline-none"
            aria-expanded={showUserMenu}
            aria-label="User profile menu"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-teal-500 p-0.5 shadow-md shadow-cyan-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-[#07101e] rounded-full flex items-center justify-center text-cyan-300 font-bold text-xs">
                <User className="w-4 h-4" />
              </div>
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-slate-200 leading-tight">
                {user?.name || user?.full_name || 'Authorized AICTE Official'}
              </p>
              <p className="text-[10px] text-slate-400 capitalize">
                {user?.role || 'Case Officer'} • AICTE HQ
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0a1424] border border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="pb-2.5 mb-2 border-b border-slate-800">
                <p className="text-xs font-bold text-white">
                  {user?.name || user?.full_name || 'AICTE Official'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {user?.email || 'officer@aicte-india.org'}
                </p>
                <div className="mt-1.5 flex items-center space-x-1.5">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 uppercase tracking-wider">
                    {user?.role || 'officer'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {user?.bureau || 'Approval Bureau'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-500/20 transition text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Grid</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
