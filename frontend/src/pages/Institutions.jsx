import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Search,
  Filter,
  MapPin,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  GraduationCap,
  Layers,
} from 'lucide-react';
import { institutionService } from '../services/institutions';

const INDIAN_STATES = [
  'All',
  'Andhra Pradesh',
  'Delhi',
  'Gujarat',
  'Haryana',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'West Bengal',
];

const INSTITUTION_TYPES = [
  'All',
  'Technical Institute',
  'Engineering College',
  'Polytechnic College',
  'Management Institute',
  'Pharmacy Institute',
  'University Department',
];

export function Institutions() {
  const navigate = useNavigate();

  // State
  const [institutions, setInstitutions] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const fetchInstitutions = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const params = {
        skip: (currentPage - 1) * pageSize,
        limit: pageSize,
      };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (selectedState && selectedState !== 'All') {
        params.state = selectedState;
      }
      if (selectedType && selectedType !== 'All') {
        params.institution_type = selectedType;
      }

      const data = await institutionService.getInstitutions(params);
      
      const items = Array.isArray(data) ? data : data.items || [];
      const totalCount = typeof data.total === 'number' ? data.total : items.length;
      
      setInstitutions(items);
      setTotal(totalCount);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load institutions directory:', err);
      setError(
        err.response?.data?.detail ||
        err.message ||
        'Unable to load institutions directory from FastAPI backend.'
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, searchQuery, selectedState, selectedType]);

  useEffect(() => {
    fetchInstitutions();
  }, [fetchInstitutions]);

  // Reset to page 1 on filter changes
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleStateChange = (e) => {
    setSelectedState(e.target.value);
    setCurrentPage(1);
  };

  const handleTypeChange = (e) => {
    setSelectedType(e.target.value);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-teal-400 uppercase tracking-widest">
              Institutional Directory
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs font-mono text-cyan-400">Registry Grid</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Technical Institutions Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitor AICTE approved colleges, complaint density, and cross-bureau compliance statuses.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchInstitutions(true)}
          disabled={loading || isRefreshing}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-300 text-xs font-medium transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          <span>{isRefreshing ? 'Syncing...' : 'Sync Registry'}</span>
        </button>
      </div>

      {/* KPI Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="glass-panel p-4 rounded-xl border border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Total Institutions</span>
            <Building2 className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">
            {stats ? stats.total_institutions : total || 100}
          </p>
          <p className="text-[11px] text-cyan-400/80 mt-1">AICTE Redressal Grid</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Total Grievances</span>
            <FileText className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">
            {stats ? stats.total_complaints : '—'}
          </p>
          <p className="text-[11px] text-teal-400/80 mt-1">Cross-Bureau Inflow</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Open / In-Review</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-300 font-mono">
            {stats ? stats.open_complaints : '—'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Pending Resolution</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">SLA Overdue</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400 font-mono">
            {stats ? stats.overdue_complaints : '—'}
          </p>
          <p className="text-[11px] text-rose-400/80 mt-1">Exceeded 30-Day SLA</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Resolved Cases</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 font-mono">
            {stats ? stats.resolved_complaints : '—'}
          </p>
          <p className="text-[11px] text-emerald-400/80 mt-1">Closed with Proof</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/40 flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by Institution Name, AICTE Permanent ID, or City..."
            className="w-full pl-9 pr-3 py-2 bg-[#060d19] border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition"
          />
        </div>

        {/* State Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <select
            value={selectedState}
            onChange={handleStateChange}
            className="bg-[#060d19] border border-slate-700/80 rounded-lg text-xs text-slate-300 py-2 px-2.5 focus:outline-none focus:border-cyan-500/60"
          >
            {INDIAN_STATES.map((st) => (
              <option key={st} value={st}>
                State: {st}
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <select
          value={selectedType}
          onChange={handleTypeChange}
          className="bg-[#060d19] border border-slate-700/80 rounded-lg text-xs text-slate-300 py-2 px-2.5 focus:outline-none focus:border-cyan-500/60"
        >
          {INSTITUTION_TYPES.map((t) => (
            <option key={t} value={t}>
              Type: {t}
            </option>
          ))}
        </select>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 flex items-start space-x-3 text-xs"
        >
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-200">Unable to load institutions directory</p>
            <p className="mt-0.5 text-rose-300/80">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => fetchInstitutions(false)}
            className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold text-[11px]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table & Cards Area */}
      {loading && !isRefreshing ? (
        <div className="glass-panel p-12 rounded-xl border border-slate-800 text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
          <p className="text-xs text-slate-400">Loading AICTE technical institutions from database...</p>
        </div>
      ) : institutions.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center space-y-3">
          <Building2 className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-white">No Institutions Match Your Query</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Try adjusting your search keywords, state selection, or filter parameters.
          </p>
          {(searchQuery || selectedState !== 'All' || selectedType !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedState('All');
                setSelectedType('All');
                setCurrentPage(1);
              }}
              className="mt-2 px-3 py-1.5 rounded-lg bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold hover:bg-cyan-600/30 transition"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="glass-panel rounded-xl border border-slate-800/80 overflow-hidden shadow-xl bg-slate-900/30">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-[#060c18] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Permanent AICTE ID</th>
                  <th className="py-3.5 px-4">Institution Name & Location</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Type</th>
                  <th className="py-3.5 px-4 text-center">Complaints</th>
                  <th className="py-3.5 px-4 hidden lg:table-cell">Status Breakdown</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {institutions.map((inst) => {
                  const hasOverdue = (inst.overdue_complaints || 0) > 0;
                  const totalComp = inst.total_complaints || 0;

                  return (
                    <tr
                      key={inst.id}
                      onClick={() => navigate(`/institutions/${inst.id}`)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      {/* AICTE ID */}
                      <td className="py-3.5 px-4 font-mono text-cyan-400 font-semibold whitespace-nowrap">
                        {inst.aicte_id}
                      </td>

                      {/* Name & City */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-white group-hover:text-cyan-300 transition-colors">
                          {inst.name}
                        </p>
                        <p className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>
                            {inst.city}, {inst.state}
                          </span>
                        </p>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4 hidden md:table-cell text-slate-400">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300">
                          {inst.institution_type || 'Technical Institute'}
                        </span>
                      </td>

                      {/* Complaints Density */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-mono font-semibold text-xs ${
                            totalComp === 0
                              ? 'bg-slate-800 text-slate-400 border border-slate-700'
                              : hasOverdue
                              ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                              : 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                          }`}
                        >
                          {totalComp} {totalComp === 1 ? 'case' : 'cases'}
                        </span>
                      </td>

                      {/* Status Breakdown Pill */}
                      <td className="py-3.5 px-4 hidden lg:table-cell">
                        {totalComp === 0 ? (
                          <span className="text-[11px] text-slate-500 italic">No active grievances</span>
                        ) : (
                          <div className="flex items-center space-x-1.5 text-[11px]">
                            <span className="text-amber-400 font-medium font-mono">
                              {inst.open_complaints || 0} Open
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-emerald-400 font-medium font-mono">
                              {inst.resolved_complaints || 0} Resolved
                            </span>
                            {hasOverdue && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span className="text-rose-400 font-semibold font-mono">
                                  {inst.overdue_complaints} Overdue
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/institutions/${inst.id}`);
                          }}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition"
                        >
                          <span>View Details</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t border-slate-800 bg-[#060c18] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-400">
            <div>
              Showing <span className="font-semibold text-white">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-white">{Math.min(currentPage * pageSize, total)}</span> of{' '}
              <span className="font-semibold text-white">{total}</span> approved institutions
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-mono px-2 text-slate-300 font-semibold">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages || loading}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Institutions;
