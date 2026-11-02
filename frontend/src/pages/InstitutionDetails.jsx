import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  MapPin,
  GraduationCap,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Eye,
  ShieldAlert,
  GitCompare,
  TrendingUp,
  Calendar,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import { institutionService } from '../services/institutions';
import { formatDate } from '../utils/formatters';

export function InstitutionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [institution, setInstitution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchDetails = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await institutionService.getInstitutionById(id);
      setInstitution(data);
    } catch (err) {
      console.error('Failed to load institution dossier:', err);
      setError(
        err.response?.data?.detail ||
        err.message ||
        `Unable to locate institution dossier for identifier '${id}'.`
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  if (loading && !isRefreshing) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => navigate('/institutions')}
          className="inline-flex items-center space-x-1.5 text-xs text-[#718096] hover:text-[#263746] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Institutions Directory</span>
        </button>

        <div className="bg-white p-16 rounded-2xl border border-[#D9DEE3] text-center space-y-3 shadow-sm">
          <RefreshCw className="w-8 h-8 animate-spin text-[#087F75] mx-auto" />
          <h2 className="text-base font-semibold text-[#263746]">Retrieving Institutional Dossier</h2>
          <p className="text-xs text-[#718096]">Loading complaint history and cross-bureau telemetry for #{id}...</p>
        </div>
      </div>
    );
  }

  if (error || !institution) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => navigate('/institutions')}
          className="inline-flex items-center space-x-1.5 text-xs text-[#718096] hover:text-[#263746] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Institutions Directory</span>
        </button>

        <div className="bg-white p-12 rounded-2xl border border-[#DC3545]/30 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-10 h-10 text-[#DC3545] mx-auto" />
          <h2 className="text-lg font-bold text-[#263746]">Institution Record Not Found</h2>
          <p className="text-xs text-[#718096] max-w-md mx-auto">
            {error || `No registered technical institution matched the query '${id}'.`}
          </p>
          <button
            type="button"
            onClick={() => fetchDetails(false)}
            className="px-4 py-2 rounded-xl bg-[#087F75] hover:bg-[#06635c] text-white font-semibold text-xs transition shadow-sm"
          >
            Retry Request
          </button>
        </div>
      </div>
    );
  }

  const complaints = institution.complaints || [];
  const topCategories = Object.entries(institution.category_distribution || {}).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <div className="space-y-6">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/institutions')}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-[#087F75] hover:underline transition group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Institutions Directory</span>
        </button>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => fetchDetails(true)}
            disabled={isRefreshing}
            className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-white border border-[#D9DEE3] text-xs text-[#263746] hover:bg-[#F5F7F7] disabled:opacity-50 transition shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#087F75]' : 'text-[#718096]'}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh Dossier'}</span>
          </button>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#D9DEE3] shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 relative">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#087F75] bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg">
                AICTE Permanent ID: {institution.aicte_id}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-[#F5F7F7] border border-[#D9DEE3] text-[#263746] font-medium">
                {institution.institution_type || 'Technical Institute'}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[#198754] font-semibold flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#198754]" />
                <span>Active Status</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#263746]">
              {institution.name}
            </h1>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-[#718096]">
              <span className="flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#718096] shrink-0" />
                <span>
                  {institution.city}, {institution.state}
                  {institution.address ? ` • ${institution.address}` : ''}
                </span>
              </span>

              {institution.affiliating_university && (
                <span className="flex items-center space-x-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-[#087F75] shrink-0" />
                  <span>Affiliated with: {institution.affiliating_university}</span>
                </span>
              )}

              {institution.established_year && (
                <span className="flex items-center space-x-1.5 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-[#718096] shrink-0" />
                  <span>Est. {institution.established_year}</span>
                </span>
              )}
            </div>
          </div>

          {/* Quick Risk Indicator Pill */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-2 shrink-0">
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold tracking-wider text-[#718096]">
                Grievance Density
              </p>
              <p className="text-3xl font-extrabold text-[#263746] font-mono leading-tight">
                {institution.total_complaints}
              </p>
            </div>
            {institution.overdue_complaints > 0 ? (
              <span className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-[#DC3545] font-bold text-xs flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#DC3545]" />
                <span>{institution.overdue_complaints} Overdue Breach</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-[#087F75] font-bold text-xs flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#087F75]" />
                <span>SLA Compliant</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Metric Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#D9DEE3] shadow-sm">
          <div className="flex items-center justify-between text-[#718096] text-xs mb-1 font-semibold">
            <span>Total Lodged</span>
            <FileText className="w-4 h-4 text-[#087F75]" />
          </div>
          <p className="text-2xl font-bold text-[#263746] font-mono">{institution.total_complaints}</p>
          <p className="text-[11px] text-[#718096] mt-0.5">Council Registry</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D9DEE3] shadow-sm">
          <div className="flex items-center justify-between text-[#718096] text-xs mb-1 font-semibold">
            <span>Open & In-Review</span>
            <Clock className="w-4 h-4 text-[#D97736]" />
          </div>
          <p className="text-2xl font-bold text-[#D97736] font-mono">{institution.open_complaints}</p>
          <p className="text-[11px] text-[#718096] mt-0.5">Active investigation</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D9DEE3] shadow-sm">
          <div className="flex items-center justify-between text-[#718096] text-xs mb-1 font-semibold">
            <span>Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-[#198754]" />
          </div>
          <p className="text-2xl font-bold text-[#198754] font-mono">{institution.resolved_complaints}</p>
          <p className="text-[11px] text-[#718096] mt-0.5">Formal closure</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D9DEE3] shadow-sm">
          <div className="flex items-center justify-between text-[#718096] text-xs mb-1 font-semibold">
            <span>AI Case Overlaps</span>
            <GitCompare className="w-4 h-4 text-[#087F75]" />
          </div>
          <p className="text-2xl font-bold text-[#263746] font-mono">
            {institution.related_overlaps_count}
          </p>
          <p className="text-[11px] text-[#718096] mt-0.5">Flagged duplicate pairs</p>
        </div>
      </div>

      {/* Intelligence Insights Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Bureaus */}
        <div className="bg-white p-5 rounded-xl border border-[#D9DEE3] shadow-sm">
          <h3 className="text-xs font-bold text-[#263746] uppercase tracking-wider mb-3 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[#087F75]" />
            <span>AICTE Bureaus Handling Cases</span>
          </h3>
          {institution.active_bureaus && institution.active_bureaus.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {institution.active_bureaus.map((bureau) => (
                <span
                  key={bureau}
                  className="px-2.5 py-1 rounded-lg bg-[#F5F7F7] border border-[#D9DEE3] text-[#263746] text-xs font-semibold"
                >
                  {bureau}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#718096] italic">No active bureau assignments.</p>
          )}
        </div>

        {/* Top Allegation Categories */}
        <div className="bg-white p-5 rounded-xl border border-[#D9DEE3] shadow-sm">
          <h3 className="text-xs font-bold text-[#263746] uppercase tracking-wider mb-3 flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-[#087F75]" />
            <span>Frequent Grievance Categories</span>
          </h3>
          {topCategories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {topCategories.map(([category, cnt]) => (
                <span
                  key={category}
                  className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-[#087F75] text-xs font-semibold flex items-center space-x-1.5"
                >
                  <span>{category}</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-white text-[#087F75] border border-teal-200">
                    {cnt}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#718096] italic">No complaint categories recorded.</p>
          )}
        </div>
      </div>

      {/* Complaints History Table */}
      <div className="bg-white rounded-xl border border-[#D9DEE3] overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-[#D9DEE3] bg-[#F5F7F7] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#263746] tracking-tight">
              Institutional Grievance Dossier
            </h3>
            <p className="text-xs text-[#718096] mt-0.5">
              Complete chronological registry of complaints filed against {institution.name}
            </p>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-white text-[#263746] border border-[#D9DEE3]">
            {complaints.length} Records
          </span>
        </div>

        {complaints.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#198754] mx-auto" />
            <h4 className="text-sm font-semibold text-[#263746]">Clean Compliance Record</h4>
            <p className="text-xs text-[#718096]">
              No institutional complaints or grievances have been registered against this college.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#D9DEE3] bg-white text-[#718096] font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Tracking No</th>
                  <th className="py-3 px-4">Grievance Subject & Category</th>
                  <th className="py-3 px-4">Bureau</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Filing Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9DEE3] text-[#263746]">
                {complaints.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/complaints/${c.id}`)}
                    className="hover:bg-[#F5F7F7] transition-colors cursor-pointer group"
                  >
                    {/* Complaint No */}
                    <td className="py-3.5 px-4 font-mono font-bold text-[#087F75] whitespace-nowrap">
                      {c.complaint_no}
                    </td>

                    {/* Subject & Category */}
                    <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                      <p className="font-semibold text-[#263746] group-hover:text-[#087F75] transition-colors truncate">
                        {c.subject}
                      </p>
                      <p className="text-[11px] text-[#718096] mt-0.5">{c.category}</p>
                    </td>

                    {/* Bureau */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-[#263746]">
                      <span className="px-2 py-0.5 rounded-full bg-[#F5F7F7] text-[11px] text-[#263746] border border-[#D9DEE3]">
                        {c.bureau}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase ${
                          c.priority === 'Critical' || c.priority === 'Urgent'
                            ? 'bg-red-50 text-[#DC3545] border border-red-200'
                            : c.priority === 'High'
                            ? 'bg-orange-50 text-[#D97736] border border-orange-200'
                            : 'bg-[#F5F7F7] text-[#263746] border-[#D9DEE3]'
                        }`}
                      >
                        {c.priority}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={c.status} />
                    </td>

                    {/* Filing Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap hidden sm:table-cell font-mono text-[11px] text-[#718096]">
                      {c.filing_date || 'N/A'}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        to={`/complaints/${c.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-white hover:bg-[#F5F7F7] text-[#263746] border border-[#D9DEE3] text-xs font-semibold transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#087F75]" />
                        <span>Inspect</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default InstitutionDetails;
