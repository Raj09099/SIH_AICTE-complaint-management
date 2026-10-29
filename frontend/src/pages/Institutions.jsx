import React, { useState, useEffect, useCallback } from 'react';
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
      let message =
        err.response?.data?.detail ||
        err.message ||
        'Unable to load institutions directory from the backend.';

      if (err.code === 'ECONNABORTED' || (err.message && err.message.includes('timeout'))) {
        message =
          'The cloud database connection timed out during SSL session initiation. Please click Retry to establish the session over the warm link.';
      }

      setError(message);
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

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedState('All');
    setSelectedType('All');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() || selectedState !== 'All' || selectedType !== 'All'
  );

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6 bg-white min-h-screen">
      {/* 1. Page Header */}
      <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-teal-50 text-[#0F766E] border border-teal-200">
              Institutional Directory
            </span>
            <span className="text-[#6B7280]">•</span>
            <span className="text-xs font-mono text-[#6B7280]">Registry Grid</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#36454F] mt-1.5">
            Institutions Directory
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">
            Search and monitor AICTE approved institutions, grievance density, and cross-bureau compliance statuses.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchInstitutions(true)}
          disabled={loading || isRefreshing}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-white border border-[#E5E7EB] hover:bg-[#F5F7F7] text-[#6B7280] hover:text-[#36454F] text-xs font-medium transition shadow-sm disabled:opacity-50"
          title="Sync from Database"
          aria-label="Sync from Database"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0F766E]' : ''}`} />
          <span>{isRefreshing ? 'Syncing...' : 'Sync Registry'}</span>
        </button>
      </div>

      {/* 2. KPI Telemetry Cards (Backed by actual API response) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm">
          <div className="flex items-center justify-between text-[#6B7280] mb-2">
            <span className="text-xs font-semibold">Total Institutions</span>
            <div className="p-1.5 rounded-lg bg-[#36454F]/10 text-[#36454F]">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#36454F] font-mono">
            {stats ? stats.total_institutions : total || '—'}
          </p>
          <p className="text-[11px] text-[#6B7280] mt-1">AICTE Redressal Grid</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm">
          <div className="flex items-center justify-between text-[#6B7280] mb-2">
            <span className="text-xs font-semibold">Total Grievances</span>
            <div className="p-1.5 rounded-lg bg-[#0F766E]/10 text-[#0F766E]">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#36454F] font-mono">
            {stats ? stats.total_complaints : '—'}
          </p>
          <p className="text-[11px] text-[#0F766E] mt-1">Cross-Bureau Inflow</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm">
          <div className="flex items-center justify-between text-[#6B7280] mb-2">
            <span className="text-xs font-semibold">Open / In-Review</span>
            <div className="p-1.5 rounded-lg bg-[#B45309]/10 text-[#B45309]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#B45309] font-mono">
            {stats ? stats.open_complaints : '—'}
          </p>
          <p className="text-[11px] text-[#6B7280] mt-1">Pending Resolution</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm">
          <div className="flex items-center justify-between text-[#6B7280] mb-2">
            <span className="text-xs font-semibold">SLA Overdue</span>
            <div className="p-1.5 rounded-lg bg-[#B91C1C]/10 text-[#B91C1C]">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#B91C1C] font-mono">
            {stats ? stats.overdue_complaints : '—'}
          </p>
          <p className="text-[11px] text-[#B91C1C] mt-1">Exceeded Resolution SLA</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[#6B7280] mb-2">
            <span className="text-xs font-semibold">Resolved Cases</span>
            <div className="p-1.5 rounded-lg bg-[#15803D]/10 text-[#15803D]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#15803D] font-mono">
            {stats ? stats.resolved_complaints : '—'}
          </p>
          <p className="text-[11px] text-[#15803D] mt-1">Closed with Proof</p>
        </div>
      </div>

      {/* 3. Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by Institution Name, AICTE Permanent ID, or City..."
            className="w-full pl-9 pr-3 py-2 bg-[#F5F7F7] border border-[#E5E7EB] rounded-lg text-xs text-[#374151] placeholder-[#6B7280] focus:outline-none focus:border-[#0F766E] transition"
          />
        </div>

        {/* State Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
          <select
            value={selectedState}
            onChange={handleStateChange}
            className="bg-[#F5F7F7] border border-[#E5E7EB] rounded-lg text-xs text-[#374151] py-2 px-2.5 focus:outline-none focus:border-[#0F766E]"
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
          className="bg-[#F5F7F7] border border-[#E5E7EB] rounded-lg text-xs text-[#374151] py-2 px-2.5 focus:outline-none focus:border-[#0F766E]"
        >
          {INSTITUTION_TYPES.map((t) => (
            <option key={t} value={t}>
              Type: {t}
            </option>
          ))}
        </select>
      </div>

      {/* 4. Error Alert */}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-[#B91C1C] flex items-start space-x-3 text-xs shadow-sm"
        >
          <AlertCircle className="w-4 h-4 text-[#B91C1C] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-[#B91C1C]">Unable to load institutions directory</p>
            <p className="mt-0.5 text-[#374151]">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => fetchInstitutions(false)}
            className="px-3 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-xs transition"
          >
            Retry Request
          </button>
        </div>
      )}

      {/* 5. Table & Content Area */}
      {loading && !isRefreshing ? (
        <div className="bg-white p-12 rounded-xl border border-[#E5E7EB] text-center space-y-3 shadow-sm">
          <RefreshCw className="w-7 h-7 animate-spin text-[#0F766E] mx-auto" />
          <p className="text-sm font-semibold text-[#36454F]">Loading AICTE technical institutions from database...</p>
        </div>
      ) : institutions.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-[#E5E7EB] text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/20 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#36454F]">No Institutions Match Your Query</h3>
          <p className="text-xs text-[#6B7280] max-w-md mx-auto">
            Try adjusting your search keywords, state selection, or filter parameters.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="mt-2 px-3.5 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold transition"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F5F7F7] text-[#6B7280] font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Permanent AICTE ID</th>
                  <th className="py-3.5 px-4">Institution Name & Location</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Type</th>
                  <th className="py-3.5 px-4 text-center">Complaints</th>
                  <th className="py-3.5 px-4 hidden lg:table-cell">Status Breakdown</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#374151]">
                {institutions.map((inst) => {
                  const hasOverdue = (inst.overdue_complaints || 0) > 0;
                  const totalComp = inst.total_complaints || 0;

                  return (
                    <tr
                      key={inst.id}
                      onClick={() => navigate(`/institutions/${inst.id}`)}
                      className="hover:bg-[#F5F7F7]/80 transition-colors cursor-pointer group"
                    >
                      {/* AICTE ID */}
                      <td className="py-3.5 px-4 font-mono text-[#0F766E] font-semibold whitespace-nowrap">
                        {inst.aicte_id}
                      </td>

                      {/* Name & City */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#36454F] group-hover:text-[#0F766E] transition-colors">
                          {inst.name}
                        </p>
                        <p className="text-[11px] text-[#6B7280] flex items-center space-x-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#6B7280] shrink-0" />
                          <span>
                            {inst.city}, {inst.state}
                          </span>
                        </p>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4 hidden md:table-cell text-[#6B7280]">
                        <span className="px-2 py-0.5 rounded-md bg-[#F5F7F7] border border-[#E5E7EB] text-[11px] text-[#374151]">
                          {inst.institution_type || 'Technical Institute'}
                        </span>
                      </td>

                      {/* Complaints Density */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-mono font-semibold text-xs border ${
                            totalComp === 0
                              ? 'bg-[#F5F7F7] text-[#6B7280] border-[#E5E7EB]'
                              : hasOverdue
                              ? 'bg-[#B91C1C]/10 text-[#B91C1C] border-[#B91C1C]/25'
                              : 'bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/25'
                          }`}
                        >
                          {totalComp} {totalComp === 1 ? 'case' : 'cases'}
                        </span>
                      </td>

                      {/* Status Breakdown */}
                      <td className="py-3.5 px-4 hidden lg:table-cell">
                        {totalComp === 0 ? (
                          <span className="text-[11px] text-[#6B7280] italic">No active grievances</span>
                        ) : (
                          <div className="flex items-center space-x-1.5 text-[11px]">
                            <span className="text-[#B45309] font-medium font-mono">
                              {inst.open_complaints || 0} Open
                            </span>
                            <span className="text-[#6B7280]">•</span>
                            <span className="text-[#15803D] font-medium font-mono">
                              {inst.resolved_complaints || 0} Resolved
                            </span>
                            {hasOverdue && (
                              <>
                                <span className="text-[#6B7280]">•</span>
                                <span className="text-[#B91C1C] font-semibold font-mono">
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
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F5F7F7] text-[#374151] hover:text-[#0F766E] border border-[#E5E7EB] text-xs font-semibold transition"
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
          <div className="p-4 border-t border-[#E5E7EB] bg-[#F5F7F7] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-[#6B7280]">
            <div>
              Showing <span className="font-semibold text-[#36454F]">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-[#36454F]">{Math.min(currentPage * pageSize, total)}</span> of{' '}
              <span className="font-semibold text-[#36454F]">{total}</span> approved institutions
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-white border border-[#E5E7EB] text-[#374151] hover:bg-[#F5F7F7] disabled:opacity-40 disabled:cursor-not-allowed transition"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-mono px-2 text-[#374151] font-semibold">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages || loading}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg bg-white border border-[#E5E7EB] text-[#374151] hover:bg-[#F5F7F7] disabled:opacity-40 disabled:cursor-not-allowed transition"
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
