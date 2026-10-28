import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, ShieldCheck, User } from 'lucide-react';

export function Navbar() {
  const { user } = useAuth();

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
            AICTE Monitoring Grid
          </span>
        </div>
        <span className="text-slate-600">|</span>
        <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
          {user?.bureau || 'Central Cell'}
        </span>
      </div>

      <div className="flex items-center space-x-4">
        <button
          type="button"
          aria-label="Notifications"
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <Bell className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-xs">
            <User className="w-4 h-4" />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-slate-200">{user?.name || 'Officer'}</p>
            <p className="text-[10px] text-slate-400">{user?.role || 'Reviewer'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
