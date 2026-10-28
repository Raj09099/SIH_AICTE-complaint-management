import React from 'react';

const statusStyles = {
  New: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Under Review': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Evidence Requested': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Escalated: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  High: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  Urgent: 'bg-red-600/20 text-red-300 border-red-500/30 animate-pulse',
  Medium: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  Low: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export function StatusBadge({ status = 'New', className = '' }) {
  const appliedStyle = statusStyles[status] || 'bg-slate-700/50 text-slate-300 border-slate-600';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${appliedStyle} ${className}`}
    >
      {status}
    </span>
  );
}

export default StatusBadge;
