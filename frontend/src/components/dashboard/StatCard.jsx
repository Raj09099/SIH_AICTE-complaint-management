import React from 'react';

export function StatCard({ title, value, subtitle, icon: Icon, color = 'blue' }) {
  const colorMap = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  };

  const badgeStyle = colorMap[color] || colorMap.blue;

  return (
    <div className="glass-panel rounded-xl p-5 border border-slate-800 hover:border-slate-700 transition duration-200">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        {Icon && (
          <div className={`p-2 rounded-lg border ${badgeStyle}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}

export default StatCard;
