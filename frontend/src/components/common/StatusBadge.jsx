import React from 'react';

const statusStyles = {
  // Operational Statuses
  New: 'bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/25',
  'Under Review': 'bg-[#B45309]/10 text-[#B45309] border-[#B45309]/25',
  Transferred: 'bg-[#36454F]/10 text-[#36454F] border-[#36454F]/20',
  'Evidence Requested': 'bg-[#36454F]/10 text-[#36454F] border-[#36454F]/20',
  Resolved: 'bg-[#15803D]/10 text-[#15803D] border-[#15803D]/25',
  Escalated: 'bg-[#B91C1C]/10 text-[#B91C1C] border-[#B91C1C]/25',
  Closed: 'bg-[#6B7280]/10 text-[#6B7280] border-[#E5E7EB]',

  // Priorities
  Critical: 'bg-[#B91C1C]/10 text-[#B91C1C] border-[#B91C1C]/30 font-semibold',
  Urgent: 'bg-[#B91C1C]/10 text-[#B91C1C] border-[#B91C1C]/25',
  High: 'bg-[#B45309]/10 text-[#B45309] border-[#B45309]/25',
  Medium: 'bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/20',
  Low: 'bg-[#6B7280]/10 text-[#6B7280] border-[#E5E7EB]',

  // AI & Analytics Flags
  'High Overlap': 'bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/30 font-medium',
  'Potential Overlap': 'bg-[#B45309]/10 text-[#B45309] border-[#B45309]/25',
  'Pattern Match': 'bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/25',
  'Verified Match': 'bg-[#15803D]/10 text-[#15803D] border-[#15803D]/25',
};

const statusDots = {
  New: 'bg-[#0F766E]',
  'Under Review': 'bg-[#B45309]',
  Transferred: 'bg-[#36454F]',
  'Evidence Requested': 'bg-[#36454F]',
  Resolved: 'bg-[#15803D]',
  Escalated: 'bg-[#B91C1C]',
  Critical: 'bg-[#B91C1C]',
  Urgent: 'bg-[#B91C1C]',
  High: 'bg-[#B45309]',
  Medium: 'bg-[#0F766E]',
  Low: 'bg-[#6B7280]',
  'High Overlap': 'bg-[#0F766E]',
  'Pattern Match': 'bg-[#0F766E]',
  'Verified Match': 'bg-[#15803D]',
};

export function StatusBadge({ status = 'New', showDot = true, className = '' }) {
  const appliedStyle = statusStyles[status] || 'bg-[#F5F7F7] text-[#374151] border-[#E5E7EB]';
  const dotColor = statusDots[status] || 'bg-[#6B7280]';

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
