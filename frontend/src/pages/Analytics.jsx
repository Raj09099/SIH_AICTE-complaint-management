import React from 'react';
import { BarChart3, Download, TrendingUp, PieChart, ShieldAlert } from 'lucide-react';

export function Analytics() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Cross-Bureau Analytics & Reports</h1>
          <p className="text-sm text-slate-400 mt-1">
            Analyze grievance volume trends, bureau resolution efficiency, and exportable audit reports.
          </p>
        </div>
        <button
          type="button"
          disabled
          className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-800 text-slate-500 rounded-lg text-sm cursor-not-allowed border border-slate-700"
        >
          <Download className="w-4 h-4" />
          <span>Export Summary (CSV)</span>
        </button>
      </div>

      {/* Analytics Preview Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Bureau Resolution Distribution</h3>
            <PieChart className="w-4 h-4 text-slate-400" />
          </div>
          <div className="h-48 flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
            Recharts visualization will mount here once complaint records are active
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Monthly Grievance Filing Trends</h3>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="h-48 flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
            Recharts trend area chart will mount here once time-series data is ingested
          </div>
        </div>
      </div>

      <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center space-y-3">
        <BarChart3 className="w-8 h-8 text-blue-400 mx-auto" />
        <h4 className="text-base font-semibold text-white">Analytics Service Configured</h4>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Endpoints (<code>/api/v1/analytics/summary</code>) and Recharts dependencies are ready for data binding.
        </p>
      </div>
    </div>
  );
}

export default Analytics;
