import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, Filter, Plus, Calendar, AlertCircle } from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';

export function Complaints() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Complaint Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Search, filter, track status, and assign grievances across AICTE bureaus.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm transition shadow-lg shadow-blue-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>Register Complaint</span>
        </button>
      </div>

      {/* Controls */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Complaint No, subject keyword, or college..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-blue-500">
          <option value="">All Bureaus</option>
          <option value="Approval Bureau">Approval Bureau</option>
          <option value="Anti-Ragging Cell">Anti-Ragging Cell</option>
          <option value="Faculty & Staff Grievances">Faculty & Staff Grievances</option>
          <option value="Finance & Scholarships">Finance & Scholarships</option>
        </select>
        <select className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-blue-500">
          <option value="">All Statuses</option>
          <option value="New">New</option>
          <option value="Under Review">Under Review</option>
          <option value="Evidence Requested">Evidence Requested</option>
          <option value="Resolved">Resolved</option>
          <option value="Escalated">Escalated</option>
        </select>
      </div>

      {/* Placeholder Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-white">No Complaints Active in Initial Phase</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          The complaints data schema and routes (<code>/api/v1/complaints</code>) are configured.
          Generate synthetic complaints in Phase 2 using <code>scripts/generate_synthetic_data.py</code>.
        </p>
      </div>
    </div>
  );
}

export default Complaints;
