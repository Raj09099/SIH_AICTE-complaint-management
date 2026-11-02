import React from 'react';

const statusStyles = {
  // Operational Statuses
  New: 'bg-[#087F75]/10 text-[#087F75] border-[#087F75]/25',
  'Under Review': 'bg-[#D97736]/10 text-[#D97736] border-[#D97736]/25',
  Transferred: 'bg-[#364650]/10 text-[#364650] border-[#364650]/20',
  'Evidence Requested': 'bg-[#364650]/10 text-[#364650] border-[#364650]/20',
  Resolved: 'bg-[#198754]/10 text-[#198754] border-[#198754]/25',
  Escalated: 'bg-[#DC3545]/10 text-[#DC3545] border-[#DC3545]/25',
  Closed: 'bg-[#718096]/10 text-[#718096] border-[#D9DEE3]',

  // Priorities
  Critical: 'bg-[#DC3545]/10 text-[#DC3545] border-[#DC3545]/30 font-semibold',
  Urgent: 'bg-[#DC3545]/10 text-[#DC3545] border-[#DC3545]/25',
  High: 'bg-[#D97736]/10 text-[#D97736] border-[#D97736]/25',
  Medium: 'bg-[#087F75]/10 text-[#087F75] border-[#087F75]/20',
  Low: 'bg-[#718096]/10 text-[#718096] border-[#D9DEE3]',

  // AI & Analytics Flags
  'High Overlap': 'bg-[#087F75]/10 text-[#087F75] border-[#087F75]/30 font-medium',
  'Potential Overlap': 'bg-[#D97736]/10 text-[#D97736] border-[#D97736]/25',
  'Pattern Match': 'bg-[#087F75]/10 text-[#087F75] border-[#087F75]/25',
  'Verified Match': 'bg-[#198754]/10 text-[#198754] border-[#198754]/25',
};

const statusDots = {
  New: 'bg-[#087F75]',
  'Under Review': 'bg-[#D97736]',
  Transferred: 'bg-[#364650]',
  'Evidence Requested': 'bg-[#364650]',
  Resolved: 'bg-[#198754]',
  Escalated: 'bg-[#DC3545]',
  Critical: 'bg-[#DC3545]',
  Urgent: 'bg-[#DC3545]',
  High: 'bg-[#D97736]',
  Medium: 'bg-[#087F75]',
  Low: 'bg-[#718096]',
  'High Overlap': 'bg-[#087F75]',
  'Pattern Match': 'bg-[#087F75]',
  'Verified Match': 'bg-[#198754]',
};

export function StatusBadge({ status = 'New', showDot = true, className = '' }) {
  const appliedStyle = statusStyles[status] || 'bg-[#F5F7F7] text-[#263746] border-[#D9DEE3]';
  const dotColor = statusDots[status] || 'bg-[#718096]';

  return (
    <span
      className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${appliedStyle} ${className}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
      )}
      <span>{status}</span>
    </span>
  );
}

export default StatusBadge;
