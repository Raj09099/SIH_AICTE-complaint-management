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
  Cpu,
} from 'lucide-react';

const navigationGroups = [
  {
    title: 'Core Platform',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Complaint Registry', path: '/complaints', icon: FileText },
      { name: 'Institutions Directory', path: '/institutions', icon: Building2 },
    ],
  },
  {
    title: 'AI Decision Support',
    items: [
      {
        name: 'Case Overlap',
        path: '/case-overlap',
        icon: GitCompare,
        badge: 'TF-IDF',
      },
      {
        name: 'Problem Patterns',
        path: '/problem-patterns',
        icon: Network,
        badge: 'Phase 2',
      },
      {
        name: 'Evidence Review',
        path: '/evidence-checker',
        icon: FileCheck2,
        badge: 'Phase 2',
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
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#36454F] border-r border-[#28343C] flex flex-col justify-between transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Institutional Brand Header */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-[#28343C] bg-[#2E3B43]">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[#0F766E] flex items-center justify-center text-white shadow-sm shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[9px] font-bold tracking-widest text-teal-300 uppercase block leading-tight">
                  Govt. of India • AICTE
                </span>
                <span className="text-xs font-bold text-white tracking-tight truncate block leading-tight">
                  SIH26264 Portal
                </span>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#28343C] lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items Grouped */}
          <nav className="p-3 space-y-5 flex-1">
            {navigationGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                <h2 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  {group.title}
                </h2>
                <div className="space-y-0.5">
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
                          `group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-[#0F766E] text-white font-semibold shadow-sm'
                              : 'text-slate-300 hover:text-white hover:bg-[#28343C]'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <div className="flex items-center space-x-2.5">
                              <Icon
                                className={`w-4 h-4 shrink-0 transition-colors ${
                                  isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
                                }`}
                              />
                              <span className="truncate">{item.name}</span>
                            </div>

                            {item.badge && (
                              <span
                                className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded border shrink-0 ${
                                  isActive
                                    ? 'bg-teal-900/60 text-teal-100 border-teal-500'
                                    : 'bg-[#28343C] text-slate-300 border-slate-600/60'
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

        {/* Footer System Status Card */}
        <div className="p-3 border-t border-[#28343C] bg-[#2E3B43]">
          <div className="rounded-lg p-2.5 bg-[#28343C] border border-slate-600/40 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-white">System Status</span>
              <span className="text-[10px] font-medium text-teal-300">Operational</span>
            </div>
            <div className="text-[10px] text-slate-300 space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1">
                  <Database className="w-3 h-3 text-slate-400" />
                  <span>PostgreSQL</span>
                </span>
                <span className="text-[#14B8A6] font-medium">Ready</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1">
                  <Cpu className="w-3 h-3 text-slate-400" />
                  <span>ML Engine</span>
                </span>
                <span className="text-teal-200 font-medium">Active</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
