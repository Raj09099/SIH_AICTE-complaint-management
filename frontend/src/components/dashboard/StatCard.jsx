import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const colorStyles = {
  teal: {
    iconBg: 'bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/20',
    bar: 'bg-[#0F766E]',
    tag: 'bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/20',
  },
  green: {
    iconBg: 'bg-[#15803D]/10 text-[#15803D] border-[#15803D]/20',
    bar: 'bg-[#15803D]',
    tag: 'bg-[#15803D]/10 text-[#15803D] border-[#15803D]/20',
  },
  amber: {
    iconBg: 'bg-[#B45309]/10 text-[#B45309] border-[#B45309]/20',
    bar: 'bg-[#B45309]',
    tag: 'bg-[#B45309]/10 text-[#B45309] border-[#B45309]/20',
  },
  red: {
    iconBg: 'bg-[#B91C1C]/10 text-[#B91C1C] border-[#B91C1C]/20',
    bar: 'bg-[#B91C1C]',
    tag: 'bg-[#B91C1C]/10 text-[#B91C1C] border-[#B91C1C]/20',
  },
  charcoal: {
    iconBg: 'bg-[#36454F]/10 text-[#36454F] border-[#36454F]/20',
    bar: 'bg-[#36454F]',
    tag: 'bg-[#36454F]/10 text-[#36454F] border-[#36454F]/20',
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'teal',
  tag,
  progress,
  to,
}) {
  const scheme = colorStyles[color] || colorStyles.teal;

  const CardContent = (
    <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-sm hover:shadow transition-shadow duration-150 flex flex-col justify-between h-full">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">
            {title}
          </p>
          <div className="text-2xl sm:text-3xl font-bold text-[#36454F] tracking-tight">
            {value}
          </div>
          {subtitle && (
            <p className="text-xs text-[#6B7280] leading-snug">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div className={`p-2.5 rounded-lg border shrink-0 ${scheme.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(progress != null || tag || to) && (
        <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-xs">
          {progress != null && (
            <div className="flex-1 mr-3">
              <div className="w-full bg-[#E5E7EB] h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${scheme.bar}`}
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
            </div>
          )}

          {tag && (
            <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${scheme.tag}`}>
              {tag}
            </span>
          )}

          {to && (
            <span className="inline-flex items-center text-xs font-medium text-[#0F766E] hover:underline ml-auto">
              <span>View</span>
              <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block group focus:outline-none focus:ring-2 focus:ring-[#0F766E] rounded-xl">
        {CardContent}
      </Link>
    );
  }

  return CardContent;
}

export default StatCard;
