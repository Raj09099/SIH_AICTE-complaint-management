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
  X,
  Database,
  ExternalLink,
  Cpu,
} from 'lucide-react';

const navigationGroups = [
  {
    title: 'Core Platform',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Complaint Registry', path: '/complaints', icon: FileText },
      { name: 'Institutions', path: '/institutions', icon: Building2 },
    ],
  },
  {
    title: 'AI Decision Support',
    items: [
      {
        name: 'Case Overlap',
        path: '/case-overlap',
        icon: GitCompare,
        badge: 'AI Match',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      },
      {
        name: 'Problem Patterns',
        path: '/problem-patterns',
        icon: Network,
        badge: 'ML Cluster',
        badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
      },
      {
        name: 'Evidence Review',
        path: '/evidence-checker',
        icon: FileCheck2,
        badge: 'NLP Proof',
        badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      },
    ],
  },
  {
    title: 'Governance & Analytics',
    items: [
      { name: 'Cross-Bureau Analytics', path: '/analytics', icon: BarChart3 },
    ],
  },
];

export function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#07101e] border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Institutional Brand Header */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80 bg-[#060d19]">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-teal-600 to-slate-900 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
                <div className="w-full h-full bg-[#07101e] rounded-[10px] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[9px] font-bold tracking-widest text-teal-400 uppercase">
                    Govt. of India
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-[9px] font-mono text-cyan-400 font-semibold">
                    SIH26264
                  </span>
                </div>
                <h1 className="text-sm font-bold text-slate-100 tracking-tight leading-tight">
                  AICTE Intelligence
                </h1>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items Grouped */}
          <nav className="p-4 space-y-6 flex-1">
            {navigationGroups.map((group) => (
              <div key={group.title} className="space-y-1.5">
                <h2 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.title}
                </h2>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => {
                          if (window.innerWidth < 1024 && onClose) onClose();
                        }}
                        className={({ isActive }) =>
                          `group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                            isActive
                              ? 'bg-gradient-to-r from-cyan-950/80 via-slate-900 to-transparent text-cyan-300 font-semibold border-l-2 border-cyan-400 shadow-sm shadow-cyan-950'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <div className="flex items-center space-x-3">
                              <Icon
                                className={`w-4 h-4 shrink-0 transition-colors ${
                                  isActive
                                    ? 'text-cyan-400'
                                    : 'text-slate-500 group-hover:text-slate-300'
                                }`}
                              />
                              <span className="truncate">{item.name}</span>
                            </div>

                            {item.badge && (
                              <span
                                className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${
                                  item.badgeColor ||
                                  'bg-slate-800 text-slate-300 border-slate-700'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Footer Institutional & System Status Card */}
        <div className="p-4 border-t border-slate-800/80 bg-[#060c17]">
          <div className="rounded-xl p-3 bg-slate-900/80 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span className="text-[11px] font-semibold text-slate-200">
                  AICTE Telemetry
                </span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                v0.1.0
              </span>
            </div>

            <div className="text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1">
                  <Database className="w-3 h-3 text-slate-500" />
                  <span>PostgreSQL (Supabase)</span>
                </span>
                <span className="text-emerald-400 font-medium">Ready</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1">
                  <Cpu className="w-3 h-3 text-slate-500" />
                  <span>ML Detection Grid</span>
                </span>
                <span className="text-cyan-400 font-medium">Standby</span>
              </div>
            </div>

            <div className="pt-1.5 border-t border-slate-800/70 flex items-center justify-between text-[10px] text-slate-400">
              <span>National Redressal Grid</span>
              <span className="text-slate-400">SLA: 30 Days</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
