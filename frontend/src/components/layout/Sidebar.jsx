import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  FileText,
  GitCompare,
  Network,
  FileCheck2,
  BarChart3,
  Shield,
  LogOut,
} from 'lucide-react';

const navigationItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Institutions', path: '/institutions', icon: Building2 },
  { name: 'Complaints', path: '/complaints', icon: FileText },
  { name: 'Case Overlap', path: '/case-overlap', icon: GitCompare, badge: 'ML' },
  { name: 'Problem Patterns', path: '/problem-patterns', icon: Network, badge: 'ML' },
  { name: 'Evidence Checker', path: '/evidence-checker', icon: FileCheck2, badge: 'ML' },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between min-h-screen">
      <div>
        {/* AICTE Brand Header */}
        <div className="h-16 px-6 flex items-center space-x-3 border-b border-slate-800/80">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white leading-tight">AICTE Intelligence</h1>
            <p className="text-[10px] text-blue-400 font-mono tracking-wider">SIH-26264 PORTAL</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`
                }
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-900 bg-slate-950/60">
        <div className="rounded-lg p-3 bg-slate-900/60 border border-slate-800/80">
          <p className="text-xs font-semibold text-slate-300">Phase 1 Initial Setup</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Compliant with SIH26264 Multi-Bureau Intelligence Architecture.
          </p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
