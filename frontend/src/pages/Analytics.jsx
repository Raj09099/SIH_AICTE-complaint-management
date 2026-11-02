import React from 'react';
import { BarChart3, Download, TrendingUp, PieChart, ShieldAlert } from 'lucide-react';

export function Analytics() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#263746]">Cross-Bureau Analytics & Reports</h1>
          <p className="text-sm text-[#718096] mt-1">
            Analyze grievance volume trends, bureau resolution efficiency, and exportable audit reports.
          </p>
        </div>
        <button
          type="button"
          disabled
          className="inline-flex items-center space-x-2 px-4 py-2 bg-[#F5F7F7] text-[#718096] rounded-lg text-sm cursor-not-allowed border border-[#D9DEE3]"
        >
          <Download className="w-4 h-4" />
          <span>Export Summary (CSV)</span>
        </button>
      </div>

      {/* Analytics Preview Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[#D9DEE3] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#263746]">Bureau Resolution Distribution</h3>
            <PieChart className="w-4 h-4 text-[#718096]" />
          </div>
          <div className="h-48 flex items-center justify-center text-xs text-[#718096] border border-dashed border-[#D9DEE3] rounded-xl bg-[#F5F7F7]">
            Recharts visualization will mount here once complaint records are active
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#D9DEE3] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#263746]">Monthly Grievance Filing Trends</h3>
            <TrendingUp className="w-4 h-4 text-[#718096]" />
          </div>
          <div className="h-48 flex items-center justify-center text-xs text-[#718096] border border-dashed border-[#D9DEE3] rounded-xl bg-[#F5F7F7]">
            Recharts trend area chart will mount here once time-series data is ingested
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-[#D9DEE3] text-center space-y-3 shadow-sm">
        <BarChart3 className="w-8 h-8 text-[#087F75] mx-auto" />
        <h4 className="text-base font-semibold text-[#263746]">Analytics Service Configured</h4>
        <p className="text-xs text-[#718096] max-w-md mx-auto">
          Endpoints (<code>/api/v1/analytics/summary</code>) and Recharts dependencies are ready for data binding.
        </p>
      </div>
    </div>
  );
}

export default Analytics;
