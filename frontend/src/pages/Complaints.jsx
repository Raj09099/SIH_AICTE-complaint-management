import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  UploadCloud,
  Paperclip,
  Trash2,
  File,
  Image as ImageIcon,
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import { complaintService } from '../services/complaints';
import { formatDate } from '../utils/formatters';

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.docx'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per file
const MAX_FILES = 5;

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

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
  const location = useLocation();
  const { user } = useAuth();
  const isInstitute = user?.role === 'institute';

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

  // Attached files state
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [fileError, setFileError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Auto-open modal if URL query param ?action=new is passed
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'new') {
      setShowRegisterModal(true);
    }
  }, [location.search]);

  // Form fields for new complaint
  const [newFormData, setNewFormData] = useState({
    institution_id: isInstitute && user?.institution_id ? user.institution_id : 1,
    complainant_type: 'Student',
    bureau: 'Approval Bureau',
    category: 'Excessive / Non-Sanctioned Fee Surcharges',
    subject: '',
    description: '',
    priority: 'Medium',
    incident_date: '',
  });

  // Update institution_id when user info loads for institute role
  useEffect(() => {
    if (isInstitute && user?.institution_id) {
      setNewFormData((prev) => ({ ...prev, institution_id: user.institution_id }));
    }
  }, [isInstitute, user]);

  const handleFilesSelected = (filesList) => {
    setFileError(null);
    const incoming = Array.from(filesList);

    if (attachedFiles.length + incoming.length > MAX_FILES) {
      setFileError(`You can attach a maximum of ${MAX_FILES} files total.`);
      return;
    }

    const validNewFiles = [];
    for (const file of incoming) {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setFileError(`Invalid format for '${file.name}'. Allowed extensions: PDF, JPG, PNG, DOCX.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`File '${file.name}' (${formatFileSize(file.size)}) exceeds the 10 MB limit.`);
        return;
      }
      validNewFiles.push({
        file,
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: file.size,
        label: 'Supporting Evidence',
      });
    }

    setAttachedFiles((prev) => [...prev, ...validNewFiles]);
  };

  const handleRemoveFile = (id) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpdateFileLabel = (id, newLabel) => {
    setAttachedFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, label: newLabel } : f))
    );
  };

  const handleCloseModal = () => {
    if (!isSubmitting) {
      setShowRegisterModal(false);
      setAttachedFiles([]);
      setFileError(null);
      setSubmitError(null);
    }
  };

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
        institution_id: isInstitute && user?.institution_id ? user.institution_id : parseInt(newFormData.institution_id, 10),
        complainant_type: newFormData.complainant_type,
        bureau: newFormData.bureau,
        category: newFormData.category,
        subject: newFormData.subject.trim(),
        description: newFormData.description.trim(),
        priority: newFormData.priority,
        incident_date: newFormData.incident_date || null,
      };

      const created = await complaintService.createComplaint(payload);

      // Upload attached documents if selected
      let uploadedCount = 0;
      if (attachedFiles.length > 0) {
        try {
          const formData = new FormData();
          attachedFiles.forEach((item) => {
            formData.append('files', item.file);
            formData.append('labels', item.label);
          });
          const uploadRes = await complaintService.uploadAttachments(created.id, formData);
          uploadedCount = uploadRes?.length || attachedFiles.length;
        } catch (uploadErr) {
          console.error('Document upload failed after case creation:', uploadErr);
          setSubmitError(
            `Case created (#${created.complaint_no}), but document upload failed: ${
              uploadErr.response?.data?.detail || uploadErr.message
            }`
          );
          setIsSubmitting(false);
          return;
        }
      }

      setSubmitSuccess(
        `Grievance successfully registered with Tracking ID: ${created.complaint_no}${
          uploadedCount > 0 ? ` with ${uploadedCount} attached document(s)` : ''
        }. Persisted to database.`
      );
      setShowRegisterModal(false);
      // Reset form & attachments
      setNewFormData({
        institution_id: isInstitute && user?.institution_id ? user.institution_id : 1,
        complainant_type: 'Student',
        bureau: 'Approval Bureau',
        category: 'Excessive / Non-Sanctioned Fee Surcharges',
        subject: '',
        description: '',
        priority: 'Medium',
        incident_date: '',
      });
      setAttachedFiles([]);
      setFileError(null);
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
      <div className="bg-white rounded-xl p-5 border border-[#D9DEE3] shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-teal-50 text-[#087F75] border border-teal-200">
              {isInstitute ? 'Technical Institute Portal' : 'AICTE Redressal Grid'}
            </span>
            <span className="text-[#718096]">•</span>
            <span className="text-xs font-mono text-[#718096]">
              {isInstitute ? `Campus Registry: ${user?.bureau || 'Apex Institute'}` : 'Grievance Master Registry'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#263746] mt-1.5">
            {isInstitute ? 'Institute Grievance Registry' : 'Complaint Registry'}
          </h1>
          <p className="text-xs sm:text-sm text-[#718096] mt-0.5">
            {isInstitute
              ? 'Lodge and track grievance submissions dispatched to AICTE Central Bureaus for review and resolution.'
              : 'Search, filter, track status, and monitor statutory SLA deadlines across technical institutions.'}
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => fetchComplaints(true)}
            disabled={loading || isRefreshing}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-[#F5F7F7] text-[#718096] hover:text-[#263746] rounded-lg text-xs font-medium border border-[#D9DEE3] transition"
            title="Reload from API"
            aria-label="Reload from API"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#087F75]' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubmitError(null);
              setShowRegisterModal(true);
            }}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#087F75] hover:bg-[#115E59] active:bg-[#134E4A] text-white font-medium rounded-lg text-xs transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{isInstitute ? 'Send Grievance to AICTE' : 'Register Complaint'}</span>
          </button>
        </div>
      </div>

      {/* 2. Success Notification Banner */}
      {submitSuccess && (
        <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-[#087F75] text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-[#087F75] shrink-0" />
            <span className="font-medium">{submitSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setSubmitSuccess(null)}
            className="p-1 text-[#087F75] hover:text-[#115E59]"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. KPI Telemetry Cards (Supported by actual complaint records) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#D9DEE3] shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-medium uppercase tracking-wider text-[#718096] block">
              Total Grievances
            </span>
            <span className="text-2xl font-bold text-[#263746]">{stats.total}</span>
            <span className="text-[11px] text-[#718096] block">Cross-Bureau Inflow</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#263746]/10 text-[#263746] border border-[#263746]/20">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D9DEE3] shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-medium uppercase tracking-wider text-[#718096] block">
              Active / In-Review
            </span>
            <span className="text-2xl font-bold text-[#D97736]">{stats.open}</span>
            <span className="text-[11px] text-[#718096] block">Pending Redressal</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#D97736]/10 text-[#D97736] border border-[#D97736]/20">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D9DEE3] shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-medium uppercase tracking-wider text-[#718096] block">
              SLA Overdue
            </span>
            <span className="text-2xl font-bold text-[#DC3545]">{stats.overdue}</span>
            <span className="text-[11px] text-[#718096] block">Exceeded Resolution SLA</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#DC3545]/10 text-[#DC3545] border border-[#DC3545]/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D9DEE3] shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-medium uppercase tracking-wider text-[#718096] block">
              Resolved Cases
            </span>
            <span className="text-2xl font-bold text-[#198754]">{stats.resolved}</span>
            <span className="text-[11px] text-[#718096] block">Closed with Final Order</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#198754]/10 text-[#198754] border border-[#198754]/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Filter and Search Controls */}
      <div className="bg-white p-4 rounded-xl border border-[#D9DEE3] shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search Input */}
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#718096]" />
          <input
            type="text"
            placeholder="Search Complaint No, keyword, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#F5F7F7] border border-[#D9DEE3] rounded-lg text-xs text-[#263746] placeholder-[#718096] focus:outline-none focus:border-[#087F75] transition-colors"
          />
        </div>

        {/* Bureau Filter */}
        <div>
          <select
            value={selectedBureau}
            onChange={(e) => setSelectedBureau(e.target.value)}
            className="w-full px-3 py-2 bg-[#F5F7F7] border border-[#D9DEE3] rounded-lg text-xs text-[#263746] focus:outline-none focus:border-[#087F75]"
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
            className="w-full px-3 py-2 bg-[#F5F7F7] border border-[#D9DEE3] rounded-lg text-xs text-[#263746] focus:outline-none focus:border-[#087F75]"
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
            className="w-full px-3 py-2 bg-[#F5F7F7] border border-[#D9DEE3] rounded-lg text-xs text-[#263746] focus:outline-none focus:border-[#087F75]"
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
        <div className="bg-white p-8 rounded-xl border border-[#DC3545]/25 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#DC3545]/10 text-[#DC3545] border border-[#DC3545]/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#DC3545]">Unable to Fetch Grievance Records</h3>
          <p className="text-xs text-[#718096] max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={() => fetchComplaints()}
            className="px-4 py-2 rounded-lg bg-[#087F75] hover:bg-[#115E59] text-white text-xs font-semibold transition"
          >
            Retry API Request
          </button>
        </div>
      ) : loading ? (
        /* Loading State */
        <div className="bg-white rounded-xl border border-[#D9DEE3] p-12 text-center space-y-3 shadow-sm">
          <RefreshCw className="w-7 h-7 animate-spin text-[#087F75] mx-auto" />
          <p className="text-sm font-semibold text-[#263746]">Loading complaints from database...</p>
        </div>
      ) : filteredComplaints.length === 0 ? (
        /* Empty State */
        <div className="bg-white p-12 rounded-xl border border-[#D9DEE3] text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-[#087F75]/10 text-[#087F75] border border-[#087F75]/20 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#263746]">No Complaints Found</h3>
          <p className="text-xs text-[#718096] max-w-md mx-auto">
            {complaints.length > 0
              ? 'No grievances match your active filter or search keywords. Try adjusting or clearing filters.'
              : 'The database currently contains no grievance records. Click "Register Complaint" to file the first case.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-lg bg-[#087F75] hover:bg-[#115E59] text-white text-xs font-semibold transition"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        /* Populated Table State */
        <div className="bg-white rounded-xl border border-[#D9DEE3] overflow-hidden shadow-sm">
          <div className="p-4 bg-[#F5F7F7] border-b border-[#D9DEE3] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-[#718096]">
            <div>
              Showing <strong className="text-[#263746]">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
              <strong className="text-[#263746]">
                {Math.min(currentPage * pageSize, filteredComplaints.length)}
              </strong>{' '}
              of <strong className="text-[#263746]">{filteredComplaints.length}</strong> complaints
              {filteredComplaints.length < complaints.length && (
                <span className="ml-1 text-[#718096]">(filtered from {complaints.length} loaded)</span>
              )}
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[#087F75] hover:underline font-medium text-xs self-start sm:self-auto"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F5F7F7] text-[#718096] uppercase text-[10px] tracking-wider border-b border-[#D9DEE3]">
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
              <tbody className="divide-y divide-[#D9DEE3] text-[#263746]">
                {paginatedComplaints.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedComplaint(item)}
                    className="hover:bg-[#F5F7F7]/80 transition-colors group cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-[#087F75] whitespace-nowrap">
                      {item.complaint_no}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-[#263746] font-medium">{item.bureau}</span>
                    </td>

                    <td className="py-3 px-4 max-w-xs sm:max-w-md">
                      <p className="font-semibold text-[#263746] group-hover:text-[#087F75] transition line-clamp-1">
                        {item.subject}
                      </p>
                      <p className="text-[11px] text-[#718096] line-clamp-1">{item.category}</p>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-[#718096]">
                      {item.complainant_type}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.priority === 'Urgent' || item.priority === 'High'
                            ? 'bg-[#DC3545]/10 text-[#DC3545] border border-[#DC3545]/25'
                            : item.priority === 'Medium'
                            ? 'bg-[#D97736]/10 text-[#D97736] border border-[#D97736]/25'
                            : 'bg-[#F5F7F7] text-[#718096] border border-[#D9DEE3]'
                        }`}
                      >
                        {item.priority || 'Medium'}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={item.status} />
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-[#718096]">
                      {formatDate(item.filing_date)}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-[#718096] font-mono text-[11px]">
                      {item.deadline_date || '—'}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedComplaint(item);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#F5F7F7] text-[#263746] hover:text-[#087F75] border border-[#D9DEE3] transition text-xs inline-flex items-center space-x-1"
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
            <div className="p-4 bg-[#F5F7F7] border-t border-[#D9DEE3] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-[#718096]">
              <div>
                Page <span className="font-semibold text-[#263746]">{currentPage}</span> of{' '}
                <span className="font-semibold text-[#263746]">{totalPages}</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={currentPage <= 1 || loading}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg bg-white border border-[#D9DEE3] text-[#263746] hover:bg-[#F5F7F7] disabled:opacity-40 disabled:cursor-not-allowed transition"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="font-mono px-2 text-[#263746] font-semibold">
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages || loading}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg bg-white border border-[#D9DEE3] text-[#263746] hover:bg-[#F5F7F7] disabled:opacity-40 disabled:cursor-not-allowed transition"
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
            className="bg-white border border-[#D9DEE3] rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-[#D9DEE3]">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-[#087F75] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {selectedComplaint.complaint_no}
                  </span>
                  <StatusBadge status={selectedComplaint.status} />
                </div>
                <h3 className="text-base font-bold text-[#263746] mt-1.5">
                  {selectedComplaint.subject}
                </h3>
                <p className="text-xs text-[#718096]">
                  {selectedComplaint.bureau} • {selectedComplaint.category}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="p-1 rounded-lg text-[#718096] hover:text-[#263746] hover:bg-[#F5F7F7]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#718096] font-medium">Full Description:</span>
                <p className="text-[#263746] mt-1 p-3 rounded-lg bg-[#F5F7F7] border border-[#D9DEE3] leading-relaxed max-h-36 overflow-y-auto">
                  {selectedComplaint.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[#F5F7F7] border border-[#D9DEE3]">
                <div>
                  <span className="text-[#718096] block text-[11px]">Institution Reference</span>
                  <span className="text-[#263746] font-medium">Institution #{selectedComplaint.institution_id}</span>
                </div>
                <div>
                  <span className="text-[#718096] block text-[11px]">Complainant Type</span>
                  <span className="text-[#263746] font-medium">{selectedComplaint.complainant_type}</span>
                </div>
                <div>
                  <span className="text-[#718096] block text-[11px]">Priority</span>
                  <span className="text-[#263746] font-medium">{selectedComplaint.priority || 'Medium'}</span>
                </div>
                <div>
                  <span className="text-[#718096] block text-[11px]">SLA Deadline</span>
                  <span className="text-[#263746] font-medium">{selectedComplaint.deadline_date || '—'}</span>
                </div>
              </div>

              {selectedComplaint.resolution_summary && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <div className="flex items-center space-x-1.5 text-[#198754] font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Resolution Summary</span>
                  </div>
                  <p className="text-[11px] text-[#263746]">
                    {selectedComplaint.resolution_summary}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2 border-t border-[#D9DEE3]">
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-[#F5F7F7] text-[#263746] border border-[#D9DEE3] text-xs font-medium"
              >
                Close
              </button>
              <Link
                to={`/complaints/${selectedComplaint.complaint_no}`}
                className="px-3.5 py-1.5 rounded-lg bg-[#087F75] hover:bg-[#115E59] text-white text-xs font-semibold shadow-sm inline-flex items-center space-x-1"
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
          onClick={handleCloseModal}
        >
          <div
            className="bg-white border border-[#D9DEE3] rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-[#D9DEE3]">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-teal-50 text-[#087F75] border border-teal-200">
                    {isInstitute ? 'Institute Escalation Desk' : 'AICTE Intake Desk'}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-[#263746] mt-1">
                  {isInstitute ? 'Send Grievance to AICTE Central Grid' : 'Register Official Grievance Case'}
                </h2>
                <p className="text-xs text-[#718096]">
                  {isInstitute
                    ? 'Submit an official grievance, compliance issue, or dispute directly to AICTE central bureaus for formal redressal.'
                    : 'New complaints are assigned statutory SLA tracking numbers and routed to target bureau queues.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1 rounded-lg text-[#718096] hover:text-[#263746] hover:bg-[#F5F7F7]" 
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[#DC3545] text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC3545]" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#263746] font-semibold mb-1">
                    Institution ID <span className="text-[#087F75]">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    readOnly={isInstitute}
                    value={isInstitute && user?.institution_id ? user.institution_id : newFormData.institution_id}
                    onChange={(e) =>
                      !isInstitute &&
                      setNewFormData({ ...newFormData, institution_id: e.target.value })
                    }
                    className={`w-full px-3 py-2 border rounded-lg text-[#263746] focus:outline-none ${
                      isInstitute
                        ? 'bg-slate-100 border-[#D9DEE3] cursor-not-allowed text-slate-500 font-mono font-semibold'
                        : 'bg-[#F5F7F7] border-[#D9DEE3] focus:border-[#087F75]'
                    }`}
                    placeholder="e.g. 1"
                  />
                  <p className="text-[10px] text-[#718096] mt-0.5">
                    {isInstitute
                      ? `Locked to your verified campus institution (ID #${user?.institution_id || 1}).`
                      : 'Foreign key to registered AICTE institution.'}
                  </p>
                </div>

                <div>
                  <label className="block text-[#263746] font-semibold mb-1">
                    Complainant Type <span className="text-[#087F75]">*</span>
                  </label>
                  <select
                    value={newFormData.complainant_type}
                    onChange={(e) =>
                      setNewFormData({ ...newFormData, complainant_type: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F5F7F7] border border-[#D9DEE3] rounded-lg text-[#263746] focus:outline-none focus:border-[#087F75]"
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
                  <label className="block text-[#263746] font-semibold mb-1">
                    AICTE Bureau / Cell <span className="text-[#087F75]">*</span>
                  </label>
                  <select
                    value={newFormData.bureau}
                    onChange={(e) =>
                      setNewFormData({ ...newFormData, bureau: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F5F7F7] border border-[#D9DEE3] rounded-lg text-[#263746] focus:outline-none focus:border-[#087F75]"
                  >
                    {BUREAU_LIST.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#263746] font-semibold mb-1">
                    Priority Level <span className="text-[#087F75]">*</span>
                  </label>
                  <select
                    value={newFormData.priority}
                    onChange={(e) =>
                      setNewFormData({ ...newFormData, priority: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F5F7F7] border border-[#D9DEE3] rounded-lg text-[#263746] focus:outline-none focus:border-[#087F75]"
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
                <label className="block text-[#263746] font-semibold mb-1">
                  Grievance Category <span className="text-[#087F75]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newFormData.category}
                  onChange={(e) =>
                    setNewFormData({ ...newFormData, category: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#F5F7F7] border border-[#D9DEE3] rounded-lg text-[#263746] focus:outline-none focus:border-[#087F75]"
                  placeholder="e.g. Excessive / Non-Sanctioned Fee Surcharges" 
                />
              </div>

              <div>
                <label className="block text-[#263746] font-semibold mb-1">
                  Complaint Subject / Summary <span className="text-[#087F75]">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={300}
                  value={newFormData.subject}
                  onChange={(e) =>
                    setNewFormData({ ...newFormData, subject: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#F5F7F7] border border-[#D9DEE3] rounded-lg text-[#263746] focus:outline-none focus:border-[#087F75]"
                  placeholder="Concise overview of institutional irregularity"
                />
              </div>

              <div>
                <label className="block text-[#263746] font-semibold mb-1">
                  Detailed Narrative Statement <span className="text-[#087F75]">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={newFormData.description}
                  onChange={(e) =>
                    setNewFormData({ ...newFormData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#F5F7F7] border border-[#D9DEE3] rounded-lg text-[#263746] focus:outline-none focus:border-[#087F75]"
                  placeholder="Provide chronological details, affected cohorts, and specific AICTE norm infractions..."
                />
              </div>

              <div>
                <label className="block text-[#263746] font-semibold mb-1">
                  Incident Occurrence Date (Optional)
                </label>
                <input
                  type="date"
                  value={newFormData.incident_date}
                  onChange={(e) =>
                    setNewFormData({ ...newFormData, incident_date: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#F5F7F7] border border-[#D9DEE3] rounded-lg text-[#263746] focus:outline-none focus:border-[#087F75]"
                />
              </div>

              {/* Upload Supporting Evidence Section */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[#263746] font-semibold">
                    Attach Evidence & Supporting Documents (Optional)
                  </label>
                  <span className="text-[10px] font-medium text-[#718096]">
                    {attachedFiles.length} of {MAX_FILES} files selected
                  </span>
                </div>

                {/* Drag & Drop File Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleFilesSelected(e.dataTransfer.files);
                    }
                  }}
                  onClick={() => document.getElementById('modal-file-upload-input')?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition cursor-pointer ${
                    isDragging
                      ? 'border-[#087F75] bg-teal-50/70'
                      : 'border-slate-300 bg-[#F9FAFB] hover:border-[#087F75] hover:bg-teal-50/30'
                  }`}
                >
                  <input
                    id="modal-file-upload-input"
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.docx"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFilesSelected(e.target.files);
                        e.target.value = '';
                      }
                    }}
                  />
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <div className="w-9 h-9 rounded-full bg-teal-50 text-[#087F75] border border-teal-200 flex items-center justify-center">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-[#263746]">
                      <span className="text-[#087F75] hover:underline">Click to browse from device</span> or drag and drop files here
                    </p>
                    <p className="text-[10px] text-[#718096]">
                      PDF, JPG, PNG, DOCX supported up to 10 MB per file (Max 5 files)
                    </p>
                  </div>
                </div>

                {/* File Error Alert */}
                {fileError && (
                  <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-200 text-[#B91C1C] text-[11px] flex items-center space-x-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fileError}</span>
                  </div>
                )}

                {/* Attached Files List Preview */}
                {attachedFiles.length > 0 && (
                  <div className="mt-2.5 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {attachedFiles.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#F5F7F7] border border-[#D9DEE3] text-xs"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                          <div className="p-1.5 rounded bg-white border border-[#D9DEE3] text-[#087F75] shrink-0">
                            {item.name.match(/\.(jpg|jpeg|png)$/i) ? (
                              <ImageIcon className="w-4 h-4" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#263746] truncate max-w-[200px] sm:max-w-xs" title={item.name}>
                              {item.name}
                            </p>
                            <p className="text-[10px] text-[#718096]">{formatFileSize(item.size)}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <select
                            value={item.label}
                            onChange={(e) => handleUpdateFileLabel(item.id, e.target.value)}
                            className="px-2 py-1 bg-white border border-[#D9DEE3] rounded text-[11px] text-[#263746] focus:outline-none focus:border-[#087F75]"
                          >
                            <option value="Supporting Evidence">Supporting Evidence</option>
                            <option value="Complaint Letter">Complaint Letter</option>
                            <option value="Institutional Response">Institutional Response</option>
                            <option value="Other">Other</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(item.id)}
                            className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                            title="Remove file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-[#D9DEE3]">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-[#F5F7F7] text-[#263746] border border-[#D9DEE3] text-xs font-semibold" 
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#087F75] hover:bg-[#115E59] active:bg-[#134E4A] text-white font-bold rounded-lg text-xs transition shadow-sm flex items-center space-x-1.5 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>{isInstitute ? 'Dispatching to AICTE...' : 'Persisting to Database...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>{isInstitute ? 'Dispatch Grievance to AICTE' : 'Submit Grievance'}</span>
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
