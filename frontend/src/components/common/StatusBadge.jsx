import React from 'react';

const statusStyles = {
  // Operational Statuses
  New: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25',
  'Under Review': 'bg-amber-500/10 text-amber-300 border-amber-500/25',
  Transferred: 'bg-purple-500/10 text-purple-300 border-purple-500/25',
  'Evidence Requested': 'bg-indigo-500/10 text-indigo-300 border-indigo-500/25',
  Resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  Escalated: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  Closed: 'bg-slate-700/30 text-slate-400 border-slate-700/50',

  // Priorities
  Critical: 'bg-red-500/15 text-red-300 border-red-500/35 font-semibold animate-pulse',
  Urgent: 'bg-rose-500/15 text-rose-300 border-rose-500/30 animate-pulse',
  High: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Medium: 'bg-sky-500/10 text-sky-300 border-sky-500/25',
  Low: 'bg-slate-500/10 text-slate-400 border-slate-600/30',

  // AI & Analytics Flags
  'High Overlap': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35 font-medium',
  'Potential Overlap': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'Pattern Match': 'bg-teal-500/15 text-teal-300 border-teal-500/35',
  'Verified Match': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
};

const statusDots = {
  New: 'bg-cyan-400',
  'Under Review': 'bg-amber-400',
  Transferred: 'bg-purple-400',
  'Evidence Requested': 'bg-indigo-400',
  Resolved: 'bg-emerald-400',
  Escalated: 'bg-rose-500',
  Critical: 'bg-red-500',
  Urgent: 'bg-rose-400',
  High: 'bg-amber-400',
  Medium: 'bg-sky-400',
  Low: 'bg-slate-400',
  'High Overlap': 'bg-cyan-400',
  'Pattern Match': 'bg-teal-400',
  'Verified Match': 'bg-emerald-400',
};

export function StatusBadge({ status = 'New', showDot = true, className = '' }) {
  const appliedStyle = statusStyles[status] || 'bg-slate-800 text-slate-300 border-slate-700';
  const dotColor = statusDots[status];

  return (
    <span
      className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border backdrop-blur-sm ${appliedStyle} ${className}`}
    >
      {showDot && dotColor && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
      )}
      <span>{status}</span>
    </span>
  );
}

export default StatusBadge;
