import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  Plus,
  Calendar,
  AlertCircle,
  RefreshCw,
  Eye,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Building2,
  CheckCircle2,
  X,
  Send,
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
const PRIORITIES = ['Medium', 'High', 'Urgent', 'Low'];

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
        `Grievance successfully registered with Tracking ID: ${created.complaint_no}. Persisted to PostgreSQL database.`
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

  return (
    <div className="space-y-6">
      {/* Header with Title and Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              AICTE Redressal Grid
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs font-mono text-slate-400">Grievance Master Registry</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white mt-1">
            Complaint Management
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Search, filter, track status, and monitor statutory SLA deadlines across technical institutions.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => fetchComplaints(true)}
            disabled={loading || isRefreshing}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium border border-slate-800 transition"
            title="Reload from API"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubmitError(null);
              setShowRegisterModal(true);
            }}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-slate-950 font-semibold rounded-lg text-xs transition shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Register Complaint</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {submitSuccess && (
        <div className="p-3.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="font-medium">{submitSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setSubmitSuccess(null)}
            className="p-1 text-teal-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800/90 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search Input */}
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Complaint No, keyword, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#0a1424] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>

        {/* Bureau Filter */}
        <div>
          <select
            value={selectedBureau}
            onChange={(e) => setSelectedBureau(e.target.value)}
            className="w-full px-3 py-2 bg-[#0a1424] border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50"
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
            className="w-full px-3 py-2 bg-[#0a1424] border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50"
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
            className="w-full px-3 py-2 bg-[#0a1424] border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {error ? (
        /* Error State */
        <div className="glass-panel p-8 rounded-2xl border border-rose-500/30 bg-rose-950/20 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-rose-200">Unable to Fetch Grievance Records</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={() => fetchComplaints()}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
          >
            Retry API Request
          </button>
        </div>
      ) : loading ? (
        /* Loading Skeleton State */
        <div className="glass-panel rounded-2xl border border-slate-800/90 p-8 space-y-4">
          <div className="flex items-center justify-center space-x-2 text-cyan-400 text-xs py-12">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="font-medium text-slate-300">Querying /api/v1/complaints from PostgreSQL...</span>
          </div>
        </div>
      ) : filteredComplaints.length === 0 ? (
        /* Empty State */
        <div className="glass-panel p-12 rounded-2xl border border-slate-800/90 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-white">No Complaints Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {complaints.length > 0
              ? 'No complaints match your active filter or search keywords. Try clearing filters.'
              : 'The database currently contains 0 complaint records. Click "Register Complaint" to add one.'}
          </p>
          {(selectedBureau || selectedStatus || selectedPriority || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedBureau('');
                setSelectedStatus('');
                setSelectedPriority('');
                setSearchQuery('');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 transition"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        /* Populated Table State */
        <div className="glass-panel rounded-2xl border border-slate-800/90 overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing <strong className="text-cyan-400">{filteredComplaints.length}</strong> of{' '}
              <strong className="text-slate-200">{complaints.length}</strong> loaded grievances
            </span>
            <span className="text-[11px] font-mono text-teal-400">
              Live API Connection: /api/v1/complaints
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#07101e] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
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
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredComplaints.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedComplaint(item)}
                    className="hover:bg-slate-900/50 transition-colors group cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400 whitespace-nowrap">
                      {item.complaint_no}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-slate-300 font-medium">{item.bureau}</span>
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-100 group-hover:text-cyan-300 transition line-clamp-1">
                        {item.subject}
                      </p>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{item.category}</p>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                      {item.complainant_type}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.priority === 'High' || item.priority === 'Urgent'
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {item.priority || 'Medium'}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={item.status} />
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                      {formatDate(item.filing_date)}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {item.deadline_date || '—'}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedComplaint(item);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-slate-700/80 transition text-xs inline-flex items-center space-x-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Case Details Drawer / Modal */}
      {selectedComplaint && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedComplaint(null)}
        >
          <div
            className="bg-[#0a1424] border border-cyan-500/30 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    {selectedComplaint.complaint_no}
                  </span>
                  <StatusBadge status={selectedComplaint.status} />
                </div>
                <h3 className="text-base font-bold text-white mt-1.5">
                  {selectedComplaint.subject}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedComplaint.bureau} • {selectedComplaint.category}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Full Description:</span>
                <p className="text-slate-300 mt-1 p-3 rounded-lg bg-slate-900 border border-slate-800 leading-relaxed max-h-36 overflow-y-auto">
                  {selectedComplaint.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[#071120] border border-slate-800/80">
                <div>
                  <span className="text-slate-400 block text-[11px]">Institution Reference</span>
                  <span className="text-slate-200 font-medium">Institution #{selectedComplaint.institution_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Complainant Type</span>
                  <span className="text-slate-200 font-medium">{selectedComplaint.complainant_type}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Priority</span>
                  <span className="text-slate-200 font-medium">{selectedComplaint.priority || 'Medium'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">SLA Deadline</span>
                  <span className="text-slate-200 font-medium">{selectedComplaint.deadline_date || '—'}</span>
                </div>
              </div>

              {selectedComplaint.resolution_summary && (
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                  <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Resolution Summary</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {selectedComplaint.resolution_summary}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Close
              </button>
              <Link
                to={`/complaints/${selectedComplaint.complaint_no}`}
                className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold shadow-md inline-flex items-center space-x-1"
              >
                <span>Open Full Case File & Update Status</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Registration Modal Dialog */}
      {showRegisterModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => !isSubmitting && setShowRegisterModal(false)}
        >
          <div
            className="bg-[#0a1424] border border-cyan-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    AICTE Intake Desk
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1">
                  Register Official Grievance Case
                </h2>
                <p className="text-xs text-slate-400">
                  New complaints are assigned statutory SLA tracking numbers and routed to target bureau queues.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isSubmitting && setShowRegisterModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Institution ID <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newFormData.institution_id}
                    onChange={(e) =>
                      setNewFormData({ ...newFormData, institution_id: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#07101e] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                    placeholder="e.g. 1 (1 to 100 in database)"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Foreign key to registered AICTE institution.
                  </p>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Complainant Type <span className="text-cyan-400">*</span>
                  </label>
                  <select
                    value={newFormData.complainant_type}
                    onChange={(e) =>
                      setNewFormData({ ...newFormData, complainant_type: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#07101e] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
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
                  <label className="block text-slate-300 font-semibold mb-1">
                    AICTE Bureau / Cell <span className="text-cyan-400">*</span>
                  </label>
                  <select
                    value={newFormData.bureau}
                    onChange={(e) =>
                      setNewFormData({ ...newFormData, bureau: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#07101e] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    {BUREAU_LIST.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Priority Level <span className="text-cyan-400">*</span>
                  </label>
                  <select
                    value={newFormData.priority}
                    onChange={(e) =>
                      setNewFormData({ ...newFormData, priority: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#07101e] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
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
                <label className="block text-slate-300 font-semibold mb-1">
                  Grievance Category <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newFormData.category}
                  onChange={(e) =>
                    setNewFormData({ ...newFormData, category: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#07101e] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. Fee Overcharging, Lab Deficiencies, Faculty Salary Arrears"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Complaint Subject / Summary <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={300}
                  value={newFormData.subject}
                  onChange={(e) =>
                    setNewFormData({ ...newFormData, subject: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#07101e] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                  placeholder="Concise overview of institutional irregularity"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Detailed Narrative Statement <span className="text-cyan-400">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={newFormData.description}
                  onChange={(e) =>
                    setNewFormData({ ...newFormData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#07101e] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                  placeholder="Provide chronological details, affected cohorts, and specific AICTE norm infractions..."
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Incident Occurrence Date (Optional)
                </label>
                <input
                  type="date"
                  value={newFormData.incident_date}
                  onChange={(e) =>
                    setNewFormData({ ...newFormData, incident_date: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#07101e] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-slate-950 font-bold rounded-lg text-xs transition shadow-lg shadow-cyan-500/20 flex items-center space-x-1.5 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
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
