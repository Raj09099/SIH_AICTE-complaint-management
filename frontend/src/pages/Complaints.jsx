import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Search,
  Plus,
  RefreshCw,
  Eye,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  Send,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import { complaintService } from '../services/complaints';
import { formatDate } from '../utils/formatters';

const BUREAU_LIST = [
  'Approval Bureau',
  'Academic Bureau',
  'Administration Cell',
  'Finance Cell',
  'Grievance Cell',
  'Anti-Ragging Cell',
  'Public Grievance Redressal Cell (PGRC)',
  'Faculty & Staff Grievances Cell',
  'Finance & Scholarships Bureau',
];

const COMPLAINANT_TYPES = ['Student', 'Faculty', 'Parent', 'Anonymous', 'Public'];
const PRIORITIES = ['Urgent', 'High', 'Medium', 'Low'];

export function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBureau, setSelectedBureau] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Registration Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Form fields for new complaint
  const [newFormData, setNewFormData] = useState({
    institution_id: 1,
    complainant_type: 'Student',
    bureau: 'Approval Bureau',
    category: 'Excessive / Non-Sanctioned Fee Surcharges',
    subject: '',
    description: '',
    priority: 'Medium',
    incident_date: '',
  });

  // Data fetching callback
  const fetchComplaints = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const params = { limit: 200 };
      if (selectedBureau) params.bureau = selectedBureau;
      if (selectedStatus) params.status = selectedStatus;
      if (selectedPriority) params.priority = selectedPriority;

      const data = await complaintService.getComplaints(params);
      setComplaints(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load complaints:', err);
      const message =
        err.response?.data?.detail ||
        err.message ||
        'Unable to connect to the complaints API service. Please verify the backend is running.';
      setError(message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedBureau, selectedStatus, selectedPriority]);

  // Initial fetch and on filter change
  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Reset pagination to page 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedBureau, selectedStatus, selectedPriority]);

  // Client-side search across multiple fields
  const filteredComplaints = useMemo(() => {
    if (!searchQuery.trim()) return complaints;
    const q = searchQuery.toLowerCase();
    return complaints.filter((c) =>
      (c.complaint_no && c.complaint_no.toLowerCase().includes(q)) ||
      (c.subject && c.subject.toLowerCase().includes(q)) ||
      (c.category && c.category.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q)) ||
      (c.bureau && c.bureau.toLowerCase().includes(q))
    );
  }, [complaints, searchQuery]);

  // Paginated complaints slice
  const paginatedComplaints = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredComplaints.slice(start, start + pageSize);
  }, [filteredComplaints, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredComplaints.length / pageSize) || 1;

  // Real KPI statistics computed from actual loaded complaints
  const stats = useMemo(() => {
    const now = new Date();
    const total = complaints.length;
    const open = complaints.filter((c) => c.status !== 'Resolved').length;
    const overdue = complaints.filter(
      (c) => c.status !== 'Resolved' && c.deadline_date && new Date(c.deadline_date) < now
    ).length;
    const resolved = complaints.filter((c) => c.status === 'Resolved').length;
    return { total, open, overdue, resolved };
  }, [complaints]);

  // Handle complaint creation submission
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const payload = {
        institution_id: parseInt(newFormData.institution_id, 10),
        complainant_type: newFormData.complainant_type,
        bureau: newFormData.bureau,
        category: newFormData.category,
        subject: newFormData.subject.trim(),
        description: newFormData.description.trim(),
        priority: newFormData.priority,
        incident_date: newFormData.incident_date || null,
      };

      const created = await complaintService.createComplaint(payload);
      setSubmitSuccess(
        `Grievance successfully registered with Tracking ID: ${created.complaint_no}. Persisted to database.`
      );
      setShowRegisterModal(false);
      // Reset form
      setNewFormData({
        institution_id: 1,
        complainant_type: 'Student',
        bureau: 'Approval Bureau',
        category: 'Excessive / Non-Sanctioned Fee Surcharges',
        subject: '',
        description: '',
        priority: 'Medium',
        incident_date: '',
      });
      // Refresh list
      fetchComplaints(true);
    } catch (err) {
      console.error('Registration failed:', err);
      setSubmitError(
        err.response?.data?.detail ||
        err.message ||
        'Failed to register complaint. Please verify all inputs.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasActiveFilters = Boolean(
    searchQuery || selectedBureau || selectedStatus || selectedPriority
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedBureau('');
    setSelectedStatus('');
    setSelectedPriority('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 bg-white min-h-screen">
      {/* 1. Header with Title and Primary Actions */}
      <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-teal-50 text-[#0F766E] border border-teal-200">
              AICTE Redressal Grid
            </span>
            <span className="text-[#6B7280]">•</span>
            <span className="text-xs font-mono text-[#6B7280]">Grievance Master Registry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#36454F] mt-1.5">
            Complaint Registry
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">
            Search, filter, track status, and monitor statutory SLA deadlines across technical institutions.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => fetchComplaints(true)}
            disabled={loading || isRefreshing}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-[#F5F7F7] text-[#6B7280] hover:text-[#36454F] rounded-lg text-xs font-medium border border-[#E5E7EB] transition"
            title="Reload from API"
            aria-label="Reload from API"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0F766E]' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubmitError(null);
              setShowRegisterModal(true);
            }}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#0F766E] hover:bg-[#115E59] active:bg-[#134E4A] text-white font-medium rounded-lg text-xs transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Register Complaint</span>
          </button>
        </div>
      </div>

      {/* 2. Success Notification Banner */}
      {submitSuccess && (
        <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0" />
            <span className="font-medium">{submitSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setSubmitSuccess(null)}
            className="p-1 text-[#0F766E] hover:text-[#115E59]"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. KPI Telemetry Cards (Supported by actual complaint records) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-medium uppercase tracking-wider text-[#6B7280] block">
              Total Grievances
            </span>
            <span className="text-2xl font-bold text-[#36454F]">{stats.total}</span>
            <span className="text-[11px] text-[#6B7280] block">Cross-Bureau Inflow</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#36454F]/10 text-[#36454F] border border-[#36454F]/20">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-medium uppercase tracking-wider text-[#6B7280] block">
              Active / In-Review
            </span>
            <span className="text-2xl font-bold text-[#B45309]">{stats.open}</span>
            <span className="text-[11px] text-[#6B7280] block">Pending Redressal</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#B45309]/10 text-[#B45309] border border-[#B45309]/20">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-medium uppercase tracking-wider text-[#6B7280] block">
              SLA Overdue
            </span>
            <span className="text-2xl font-bold text-[#B91C1C]">{stats.overdue}</span>
            <span className="text-[11px] text-[#6B7280] block">Exceeded Resolution SLA</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#B91C1C]/10 text-[#B91C1C] border border-[#B91C1C]/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-medium uppercase tracking-wider text-[#6B7280] block">
              Resolved Cases
            </span>
            <span className="text-2xl font-bold text-[#15803D]">{stats.resolved}</span>
            <span className="text-[11px] text-[#6B7280] block">Closed with Final Order</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#15803D]/10 text-[#15803D] border border-[#15803D]/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Filter and Search Controls */}
      <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search Input */}
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
          <input
            type="text"
            placeholder="Search Complaint No, keyword, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#F5F7F7] border border-[#E5E7EB] rounded-lg text-xs text-[#374151] placeholder-[#6B7280] focus:outline-none focus:border-[#0F766E] transition-colors"
          />
        </div>

        {/* Bureau Filter */}
        <div>
          <select
            value={selectedBureau}
            onChange={(e) => setSelectedBureau(e.target.value)}
            className="w-full px-3 py-2 bg-[#F5F7F7] border border-[#E5E7EB] rounded-lg text-xs text-[#374151] focus:outline-none focus:border-[#0F766E]"
          >
            <option value="">All Bureaus</option>
            {BUREAU_LIST.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 bg-[#F5F7F7] border border-[#E5E7EB] rounded-lg text-xs text-[#374151] focus:outline-none focus:border-[#0F766E]"
          >
            <option value="">All Statuses</option>
            <option value="New">New</option>
            <option value="Under Review">Under Review</option>
            <option value="Transferred">Transferred</option>
            <option value="Evidence Requested">Evidence Requested</option>
            <option value="Escalated">Escalated</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="w-full px-3 py-2 bg-[#F5F7F7] border border-[#E5E7EB] rounded-lg text-xs text-[#374151] focus:outline-none focus:border-[#0F766E]"
          >
            <option value="">All Priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p} Priority
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 5. Main Content Area */}
      {error ? (
        /* Error State */
        <div className="bg-white p-8 rounded-xl border border-[#B91C1C]/25 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#B91C1C]/10 text-[#B91C1C] border border-[#B91C1C]/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#B91C1C]">Unable to Fetch Grievance Records</h3>
          <p className="text-xs text-[#6B7280] max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={() => fetchComplaints()}
            className="px-4 py-2 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold transition"
          >
            Retry API Request
          </button>
        </div>
      ) : loading ? (
        /* Loading State */
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center space-y-3 shadow-sm">
          <RefreshCw className="w-7 h-7 animate-spin text-[#0F766E] mx-auto" />
          <p className="text-sm font-semibold text-[#36454F]">Loading complaints from database...</p>
        </div>
      ) : filteredComplaints.length === 0 ? (
        /* Empty State */
        <div className="bg-white p-12 rounded-xl border border-[#E5E7EB] text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/20 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#36454F]">No Complaints Found</h3>
          <p className="text-xs text-[#6B7280] max-w-md mx-auto">
            {complaints.length > 0
              ? 'No grievances match your active filter or search keywords. Try adjusting or clearing filters.'
              : 'The database currently contains no grievance records. Click "Register Complaint" to file the first case.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold transition"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        /* Populated Table State */
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
          <div className="p-4 bg-[#F5F7F7] border-b border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-[#6B7280]">
            <div>
              Showing <strong className="text-[#36454F]">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
              <strong className="text-[#36454F]">
                {Math.min(currentPage * pageSize, filteredComplaints.length)}
              </strong>{' '}
              of <strong className="text-[#36454F]">{filteredComplaints.length}</strong> complaints
              {filteredComplaints.length < complaints.length && (
                <span className="ml-1 text-[#6B7280]">(filtered from {complaints.length} loaded)</span>
              )}
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[#0F766E] hover:underline font-medium text-xs self-start sm:self-auto"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F5F7F7] text-[#6B7280] uppercase text-[10px] tracking-wider border-b border-[#E5E7EB]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Complaint No</th>
                  <th className="py-3 px-4 font-semibold">Bureau</th>
                  <th className="py-3 px-4 font-semibold">Category & Subject</th>
                  <th className="py-3 px-4 font-semibold">Complainant</th>
                  <th className="py-3 px-4 font-semibold">Priority</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Filing Date</th>
                  <th className="py-3 px-4 font-semibold">SLA Deadline</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#374151]">
                {paginatedComplaints.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedComplaint(item)}
                    className="hover:bg-[#F5F7F7]/80 transition-colors group cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-[#0F766E] whitespace-nowrap">
                      {item.complaint_no}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-[#374151] font-medium">{item.bureau}</span>
                    </td>

                    <td className="py-3 px-4 max-w-xs sm:max-w-md">
                      <p className="font-semibold text-[#36454F] group-hover:text-[#0F766E] transition line-clamp-1">
                        {item.subject}
                      </p>
                      <p className="text-[11px] text-[#6B7280] line-clamp-1">{item.category}</p>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-[#6B7280]">
                      {item.complainant_type}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.priority === 'Urgent' || item.priority === 'High'
                            ? 'bg-[#B91C1C]/10 text-[#B91C1C] border border-[#B91C1C]/25'
                            : item.priority === 'Medium'
                            ? 'bg-[#B45309]/10 text-[#B45309] border border-[#B45309]/25'
                            : 'bg-[#F5F7F7] text-[#6B7280] border border-[#E5E7EB]'
                        }`}
                      >
                        {item.priority || 'Medium'}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={item.status} />
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-[#6B7280]">
                      {formatDate(item.filing_date)}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-[#6B7280] font-mono text-[11px]">
                      {item.deadline_date || '—'}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedComplaint(item);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#F5F7F7] text-[#374151] hover:text-[#0F766E] border border-[#E5E7EB] transition text-xs inline-flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-4 bg-[#F5F7F7] border-t border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-[#6B7280]">
              <div>
                Page <span className="font-semibold text-[#36454F]">{currentPage}</span> of{' '}
                <span className="font-semibold text-[#36454F]">{totalPages}</span>
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
                  {currentPage} / {totalPages}
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
          )}
        </div>
      )}

      {/* 6. Case Details Modal / Drawer */}
      {selectedComplaint && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedComplaint(null)}
        >
          <div
            className="bg-white border border-[#E5E7EB] rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-[#E5E7EB]">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-[#0F766E] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {selectedComplaint.complaint_no}
                  </span>
                  <StatusBadge status={selectedComplaint.status} />
                </div>
                <h3 className="text-base font-bold text-[#36454F] mt-1.5">
                  {selectedComplaint.subject}
                </h3>
                <p className="text-xs text-[#6B7280]">
                  {selectedComplaint.bureau} • {selectedComplaint.category}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="p-1 rounded-lg text-[#6B7280] hover:text-[#36454F] hover:bg-[#F5F7F7]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#6B7280] font-medium">Full Description:</span>
                <p className="text-[#374151] mt-1 p-3 rounded-lg bg-[#F5F7F7] border border-[#E5E7EB] leading-relaxed max-h-36 overflow-y-auto">
                  {selectedComplaint.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[#F5F7F7] border border-[#E5E7EB]">
                <div>
                  <span className="text-[#6B7280] block text-[11px]">Institution Reference</span>
                  <span className="text-[#374151] font-medium">Institution #{selectedComplaint.institution_id}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block text-[11px]">Complainant Type</span>
                  <span className="text-[#374151] font-medium">{selectedComplaint.complainant_type}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block text-[11px]">Priority</span>
                  <span className="text-[#374151] font-medium">{selectedComplaint.priority || 'Medium'}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block text-[11px]">SLA Deadline</span>
                  <span className="text-[#374151] font-medium">{selectedComplaint.deadline_date || '—'}</span>
                </div>
              </div>

              {selectedComplaint.resolution_summary && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <div className="flex items-center space-x-1.5 text-[#15803D] font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Resolution Summary</span>
                  </div>
                  <p className="text-[11px] text-[#374151]">
                    {selectedComplaint.resolution_summary}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-[#F5F7F7] text-[#374151] border border-[#E5E7EB] text-xs font-medium"
              >
                Close
              </button>
              <Link
                to={`/complaints/${selectedComplaint.complaint_no}`}
                className="px-3.5 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold shadow-sm inline-flex items-center space-x-1"
              >
                <span>Open Full Case File & Update Status</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 7. Registration Modal Dialog */}
      {showRegisterModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => !isSubmitting && setShowRegisterModal(false)}
        >
          <div
            className="bg-white border border-[#E5E7EB] rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-[#E5E7EB]">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-teal-50 text-[#0F766E] border border-teal-200">
                    AICTE Intake Desk
                  </span>
                </div>
                <h2 className="text-lg font-bold text-[#36454F] mt-1">
                  Register Official Grievance Case
                </h2>
                <p className="text-xs text-[#6B7280]">
                  New complaints are assigned statutory SLA tracking numbers and routed to target bureau queues.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isSubmitting && setShowRegisterModal(false)}
                className="p-1 rounded-lg text-[#6B7280] hover:text-[#36454F] hover:bg-[#F5F7F7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[#B91C1C] text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#B91C1C]" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#374151] font-semibold mb-1">
                    Institution ID <span className="text-[#0F766E]">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newFormData.institution_id}
                    onChange={(e) =>
                      setNewFormData({ ...newFormData, institution_id: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F5F7F7] border border-[#E5E7EB] rounded-lg text-[#374151] focus:outline-none focus:border-[#0F766E]"
                    placeholder="e.g. 1"
                  />
                  <p className="text-[10px] text-[#6B7280] mt-0.5">
                    Foreign key to registered AICTE institution.
                  </p>
                </div>

                <div>
                  <label className="block text-[#374151] font-semibold mb-1">
                    Complainant Type <span className="text-[#0F766E]">*</span>
                  </label>
                  <select
                    value={newFormData.complainant_type}
                    onChange={(e) =>
                      setNewFormData({ ...newFormData, complainant_type: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F5F7F7] border border-[#E5E7EB] rounded-lg text-[#374151] focus:outline-none focus:border-[#0F766E]"
                  >
                    {COMPLAINANT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#374151] font-semibold mb-1">
                    AICTE Bureau / Cell <span className="text-[#0F766E]">*</span>
                  </label>
                  <select
                    value={newFormData.bureau}
                    onChange={(e) =>
                      setNewFormData({ ...newFormData, bureau: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F5F7F7] border border-[#E5E7EB] rounded-lg text-[#374151] focus:outline-none focus:border-[#0F766E]"
                  >
                    {BUREAU_LIST.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#374151] font-semibold mb-1">
                    Priority Level <span className="text-[#0F766E]">*</span>
                  </label>
                  <select
                    value={newFormData.priority}
                    onChange={(e) =>
                      setNewFormData({ ...newFormData, priority: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F5F7F7] border border-[#E5E7EB] rounded-lg text-[#374151] focus:outline-none focus:border-[#0F766E]"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p} Priority
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#374151] font-semibold mb-1">
                  Grievance Category <span className="text-[#0F766E]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newFormData.category}
                  onChange={(e) =>
                    setNewFormData({ ...newFormData, category: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#F5F7F7] border border-[#E5E7EB] rounded-lg text-[#374151] focus:outline-none focus:border-[#0F766E]"
                  placeholder="e.g. Fee Overcharging, Lab Deficiencies, Faculty Salary Arrears"
                />
              </div>

              <div>
                <label className="block text-[#374151] font-semibold mb-1">
                  Complaint Subject / Summary <span className="text-[#0F766E]">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={300}
                  value={newFormData.subject}
                  onChange={(e) =>
                    setNewFormData({ ...newFormData, subject: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#F5F7F7] border border-[#E5E7EB] rounded-lg text-[#374151] focus:outline-none focus:border-[#0F766E]"
                  placeholder="Concise overview of institutional irregularity"
                />
              </div>

              <div>
                <label className="block text-[#374151] font-semibold mb-1">
                  Detailed Narrative Statement <span className="text-[#0F766E]">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={newFormData.description}
                  onChange={(e) =>
                    setNewFormData({ ...newFormData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#F5F7F7] border border-[#E5E7EB] rounded-lg text-[#374151] focus:outline-none focus:border-[#0F766E]"
                  placeholder="Provide chronological details, affected cohorts, and specific AICTE norm infractions..."
                />
              </div>

              <div>
                <label className="block text-[#374151] font-semibold mb-1">
                  Incident Occurrence Date (Optional)
                </label>
                <input
                  type="date"
                  value={newFormData.incident_date}
                  onChange={(e) =>
                    setNewFormData({ ...newFormData, incident_date: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#F5F7F7] border border-[#E5E7EB] rounded-lg text-[#374151] focus:outline-none focus:border-[#0F766E]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-[#F5F7F7] text-[#374151] border border-[#E5E7EB] text-xs font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#0F766E] hover:bg-[#115E59] active:bg-[#134E4A] text-white font-bold rounded-lg text-xs transition shadow-sm flex items-center space-x-1.5 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Persisting to Database...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Grievance</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Complaints;
