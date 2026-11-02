import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const colorStyles = {
  teal: {
    iconBg: 'bg-[#087F75]/10 text-[#087F75] border-[#087F75]/20',
    bar: 'bg-[#087F75]',
    tag: 'bg-[#087F75]/10 text-[#087F75] border-[#087F75]/20',
  },
  green: {
    iconBg: 'bg-[#198754]/10 text-[#198754] border-[#198754]/20',
    bar: 'bg-[#198754]',
    tag: 'bg-[#198754]/10 text-[#198754] border-[#198754]/20',
  },
  amber: {
    iconBg: 'bg-[#D97736]/10 text-[#D97736] border-[#D97736]/20',
    bar: 'bg-[#D97736]',
    tag: 'bg-[#D97736]/10 text-[#D97736] border-[#D97736]/20',
  },
  red: {
    iconBg: 'bg-[#DC3545]/10 text-[#DC3545] border-[#DC3545]/20',
    bar: 'bg-[#DC3545]',
    tag: 'bg-[#DC3545]/10 text-[#DC3545] border-[#DC3545]/20',
  },
  charcoal: {
    iconBg: 'bg-[#364650]/10 text-[#364650] border-[#364650]/20',
    bar: 'bg-[#364650]',
    tag: 'bg-[#364650]/10 text-[#364650] border-[#364650]/20',
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
    <div className="bg-white rounded-xl p-5 border border-[#D9DEE3] shadow-sm hover:shadow transition-shadow duration-150 flex flex-col justify-between h-full">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-[#718096]">
            {title}
          </p>
          <div className="text-2xl sm:text-3xl font-bold text-[#263746] tracking-tight">
            {value}
          </div>
          {subtitle && (
            <p className="text-xs text-[#718096] leading-snug">
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
        <div className="mt-4 pt-3 border-t border-[#D9DEE3] flex items-center justify-between text-xs">
          {progress != null && (
            <div className="flex-1 mr-3">
              <div className="w-full bg-[#D9DEE3] h-1.5 rounded-full overflow-hidden">
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
            <span className="inline-flex items-center text-xs font-medium text-[#087F75] hover:underline ml-auto">
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
      <Link to={to} className="block group focus:outline-none focus:ring-2 focus:ring-[#087F75] rounded-xl">
        {CardContent}
      </Link>
    );
  }

  return CardContent;
}

export default StatCard;
