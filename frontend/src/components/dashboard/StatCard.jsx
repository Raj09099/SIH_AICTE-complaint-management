import React from 'react';
import { ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';

const colorStyles = {
  cyan: {
    badge: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25',
    glow: 'group-hover:border-cyan-500/40',
    bar: 'bg-cyan-400',
    text: 'text-cyan-400',
  },
  teal: {
    badge: 'text-teal-400 bg-teal-500/10 border-teal-500/25',
    glow: 'group-hover:border-teal-500/40',
    bar: 'bg-teal-400',
    text: 'text-teal-400',
  },
  emerald: {
    badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
    glow: 'group-hover:border-emerald-500/40',
    bar: 'bg-emerald-400',
    text: 'text-emerald-400',
  },
  amber: {
    badge: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
    glow: 'group-hover:border-amber-500/40',
    bar: 'bg-amber-400',
    text: 'text-amber-400',
  },
  purple: {
    badge: 'text-purple-400 bg-purple-500/10 border-purple-500/25',
    glow: 'group-hover:border-purple-500/40',
    bar: 'bg-purple-400',
    text: 'text-purple-400',
  },
  rose: {
    badge: 'text-rose-400 bg-rose-500/10 border-rose-500/25',
    glow: 'group-hover:border-rose-500/40',
    bar: 'bg-rose-400',
    text: 'text-rose-400',
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'cyan',
  trend,
  trendType = 'up',
  tag,
  progress,
  to,
}) {
  const scheme = colorStyles[color] || colorStyles.cyan;

  const CardContent = (
    <div
      className={`group relative glass-panel rounded-xl p-5 border border-slate-800/80 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${scheme.glow}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</p>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
              {value}
            </span>
            {trend && (
              <span
                className={`inline-flex items-center text-xs font-semibold ${
                  trendType === 'up' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {trendType === 'up' ? (
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                )}
                {trend}
              </span>
            )}
          </div>
        </div>

        {Icon && (
          <div className={`p-2.5 rounded-lg border ${scheme.badge} transition-transform group-hover:scale-105`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {progress != null && (
        <div className="mt-3 w-full bg-slate-800/70 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${scheme.bar}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span className="truncate">{subtitle}</span>
        {tag && (
          <span className="shrink-0 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60">
            {tag}
          </span>
        )}
        {to && (
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition ml-1 shrink-0" />
        )}
      </div>
    </div>
  );

  if (to) {
    return <Link to={to} className="block focus:outline-none">{CardContent}</Link>;
  }

  return CardContent;
}

export default StatCard;
