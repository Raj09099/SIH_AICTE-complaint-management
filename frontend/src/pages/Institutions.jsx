import React from 'react';
import { Building2, Search, Filter, MapPin } from 'lucide-react';

export function Institutions() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Institutions Directory</h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse and monitor AICTE approved technical colleges and their grievance history.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Institution Name, AICTE Permanent ID, or City..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          type="button"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition"
        >
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Filter by State</span>
        </button>
      </div>

      {/* Placeholder State for Initial Setup */}
      <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto">
          <Building2 className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-white">No Institutions Ingested Yet</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          The database schema and API route (<code>/api/v1/institutions</code>) are initialized.
          Run the synthetic data generator in Phase 2 to populate approved institutions.
        </p>
      </div>
    </div>
  );
}

export default Institutions;
