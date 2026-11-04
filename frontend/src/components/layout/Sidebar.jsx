import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
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
  Send,
  Activity,
  Zap,
  ShieldAlert,
} from 'lucide-react';

export function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isInstitute = user?.role === 'institute';

  const officerGroups = [
    {
      title: t('nav.corePlatform', 'CORE PLATFORM'),
      items: [
        { name: t('nav.dashboard', 'Dashboard'), path: '/dashboard', icon: LayoutDashboard },
        { name: t('nav.complaintRegistry', 'Complaint Registry'), path: '/complaints', icon: FileText },
        { name: t('nav.institutionsDirectory', 'Institutions Directory'), path: '/institutions', icon: Building2 },
      ],
    },
    {
      title: t('nav.aiDecisionSupport', 'AI DECISION SUPPORT'),
      items: [
        {
          name: t('nav.caseOverlap', 'Case Overlap'),
          path: '/case-overlap',
          icon: GitCompare,
          badge: 'TF-IDF',
        },
        {
          name: t('nav.problemPatterns', 'Problem Patterns'),
          path: '/problem-patterns',
          icon: Network,
          badge: 'ML Clustered',
        },
        {
          name: t('nav.recurrenceRadar', 'Recurrence Radar'),
          path: '/recurrence-radar',
          icon: Activity,
          badge: 'Systemic',
        },
        {
          name: t('nav.aiPriorityTriage', 'AI Priority Triage'),
          path: '/priority-radar',
          icon: Zap,
          badge: 'AI Priority',
        },
        {
          name: t('nav.evidenceReview', 'Evidence Review'),
          path: '/evidence-checker',
          icon: FileCheck2,
          badge: 'Phase 2',
        },
      ],
    },
    {
      title: t('nav.governanceAnalytics', 'GOVERNANCE & ANALYTICS'),
      items: [
        {
          name: t('nav.institutionRiskAnalysis', 'Institution Risk Analysis'),
          path: '/institution-risk',
          icon: ShieldAlert,
          badge: 'Risk 3.7',
        },
        { name: t('nav.crossBureauAnalytics', 'Cross-Bureau Analytics'), path: '/analytics', icon: BarChart3 },
      ],
    },
  ];

  const instituteGroups = [
    {
      title: isInstitute ? 'Institute Grievance Portal' : t('nav.corePlatform', 'CORE PLATFORM'),
      items: [
        { name: t('nav.dashboard', 'Campus Dashboard'), path: '/dashboard', icon: LayoutDashboard },
        {
          name: 'Send Grievance to AICTE',
          path: '/complaints?action=new',
          icon: Send,
          badge: 'Submit',
        },
        { name: t('nav.complaintRegistry', 'My College Grievances'), path: '/complaints', icon: FileText },
      ],
    },
  ];

  const navigationGroups = isInstitute ? instituteGroups : officerGroups;

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

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-[#263746] text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-700/60 bg-[#1E2C38]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#087F75] flex items-center justify-center text-white font-bold text-base shadow-sm">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-wide text-white block">
                {t('common.appName', 'AICTE Central Grid')}
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider block">
                {t('common.appSubtitle', 'SIH26264 • INTELLIGENCE')}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 custom-scrollbar">
          {navigationGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                {group.title}
              </span>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition group ${
                        isActive
                          ? 'bg-[#087F75] text-white shadow-sm font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`
                    }
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110" />
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700 group-hover:border-slate-600 transition">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        {/* Institutional / Officer Profile Footer */}
        <div className="p-4 border-t border-slate-700/60 bg-[#1E2C38]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-[#087F75]/20 text-[#087F75] border border-[#087F75]/40 flex items-center justify-center text-xs font-bold font-mono flex-shrink-0">
                {user?.role === 'institute' ? 'INST' : 'OFF'}
              </div>
              <div className="overflow-hidden">
                <span className="text-xs font-semibold text-white block truncate">
                  {user?.name || (user?.role === 'institute' ? t('common.institute', 'Institute Desk') : t('common.officer', 'AICTE Officer'))}
                </span>
                <span className="text-[10px] text-slate-400 block truncate font-mono">
                  {user?.bureau || 'Central Bureau'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
