import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Building2,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  ArrowRight,
  ShieldAlert,
  Share2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import { complaintService } from '../services/complaints';
import { formatDate } from '../utils/formatters';

const BUREAU_OPTIONS = [
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

const STATUS_OPTIONS = [
  'New',
  'Under Review',
  'Evidence Requested',
  'Transferred',
  'Escalated',
  'Resolved',
];

export function ComplaintDetails() {
  const { id } = useParams();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Status Action Form State
  const [targetStatus, setTargetStatus] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [targetBureau, setTargetBureau] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null);
  const [actionErrorMessage, setActionErrorMessage] = useState(null);

  const fetchComplaint = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await complaintService.getComplaintById(id);
      setComplaint(data);
      setTargetStatus(data.status || 'New');
      setTargetBureau(data.bureau || BUREAU_OPTIONS[0]);
      if (data.resolution_summary) {
        setResolutionSummary(data.resolution_summary);
      }
    } catch (err) {
      console.error('Failed to load complaint details:', err);
      setError(
        err.response?.data?.detail ||
        err.message ||
        `Unable to locate complaint record '${id}'.`
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchComplaint();
  }, [fetchComplaint]);

  const handleStatusTransition = async (e) => {
    e.preventDefault();
    if (!complaint) return;

    setIsSubmittingAction(true);
    setActionSuccessMessage(null);
    setActionErrorMessage(null);

    try {
      const payload = {
        status: targetStatus,
      };

      if (targetStatus === 'Resolved') {
        if (!resolutionSummary.trim()) {
          setActionErrorMessage('Resolution summary is required when marking a complaint as Resolved.');
          setIsSubmittingAction(false);
          return;
        }
        payload.resolution_summary = resolutionSummary.trim();
      }

      if (targetStatus === 'Transferred') {
        payload.bureau = targetBureau;
      }

      const updated = await complaintService.updateStatus(complaint.complaint_no, payload);
      setComplaint(updated);
      setActionSuccessMessage(
        `Complaint lifecycle status successfully transitioned to '${targetStatus}'. Changes persisted to PostgreSQL.`
      );
    } catch (err) {
      console.error('Failed to update complaint status:', err);
      setActionErrorMessage(
        err.response?.data?.detail ||
        err.message ||
        'Failed to transition complaint status.'
      );
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // SLA calculations
  const deadlineDate = complaint?.deadline_date ? new Date(complaint.deadline_date) : null;
  let hoursRemaining = 0;
  if (deadlineDate && !isNaN(deadlineDate.getTime())) {
    hoursRemaining = Math.round((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60));
  }
  const isOverdue = hoursRemaining < 0 && complaint?.status !== 'Resolved';
  const isUrgentSla = hoursRemaining >= 0 && hoursRemaining <= 48 && complaint?.status !== 'Resolved';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Link
            to="/complaints"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Loading Case Dossier...</h1>
            <p className="text-xs text-slate-400">Fetching record #{id} from registry</p>
          </div>
        </div>

        <div className="glass-panel p-16 rounded-2xl border border-slate-800/90 text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Retrieving case metadata from FastAPI backend...</p>
        </div>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Link
            to="/complaints"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Complaint Not Found</h1>
            <p className="text-xs text-slate-400">Case #{id}</p>
          </div>
        </div>

        <div className="glass-panel p-12 rounded-2xl border border-rose-500/30 bg-rose-950/10 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Unable to Locate Case File</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">{error}</p>
          <div className="pt-2">
            <Link
              to="/complaints"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Complaints Registry</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800/90 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            to="/complaints"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 transition"
            title="Back to Registry"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/30">
                {complaint.complaint_no}
              </span>
              <StatusBadge status={complaint.status} />
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  complaint.priority === 'High' || complaint.priority === 'Urgent'
                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                {complaint.priority || 'Medium'} Priority
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white mt-1.5">
              {complaint.subject}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Filed under {complaint.bureau} • Grievance Category: {complaint.category}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchComplaint(true)}
            disabled={isRefreshing}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium border border-slate-800 transition"
            title="Refresh from PostgreSQL"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Reload Record</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Details (Left 2 cols) & Action Panel (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Case Metadata & Narrative */}
        <div className="lg:col-span-2 space-y-6">
          {/* Detailed Narrative Card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <FileText className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Official Complainant Statement
              </h2>
            </div>
            <div className="p-4 rounded-xl bg-[#07101e] border border-slate-800/80 text-xs text-slate-300 leading-relaxed space-y-2">
              <p>{complaint.description}</p>
            </div>
          </div>

          {/* Key Parameters Matrix */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3">
              Case Registry Parameters
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#07101e] border border-slate-800/80 space-y-1">
                <span className="text-slate-400 flex items-center space-x-1.5 text-[11px]">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Referenced Institution</span>
                </span>
                <p className="font-semibold text-slate-100">
                  Institution ID #{complaint.institution_id}
                </p>
                <p className="text-[11px] text-slate-500">AICTE Approved Technical Entity</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#07101e] border border-slate-800/80 space-y-1">
                <span className="text-slate-400 flex items-center space-x-1.5 text-[11px]">
                  <User className="w-3.5 h-3.5 text-teal-400" />
                  <span>Complainant Affiliation</span>
                </span>
                <p className="font-semibold text-slate-100">
                  {complaint.complainant_type}
                </p>
                <p className="text-[11px] text-slate-500">Authenticated Grievance Filer</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#07101e] border border-slate-800/80 space-y-1">
                <span className="text-slate-400 flex items-center space-x-1.5 text-[11px]">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Filing & Incident Dates</span>
                </span>
                <p className="font-semibold text-slate-100">
                  Filed: {formatDate(complaint.filing_date)}
                </p>
                <p className="text-[11px] text-slate-500">
                  Incident: {complaint.incident_date ? formatDate(complaint.incident_date) : 'Unspecified'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#07101e] border border-slate-800/80 space-y-1">
                <span className="text-slate-400 flex items-center space-x-1.5 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Statutory SLA Deadline</span>
                </span>
                <p className="font-semibold text-slate-100">
                  {complaint.deadline_date ? formatDate(complaint.deadline_date) : 'Not specified'}
                </p>
                {isOverdue ? (
                  <span className="text-rose-400 text-[10px] font-bold flex items-center space-x-1 mt-0.5">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Overdue by {Math.abs(hoursRemaining)} hours</span>
                  </span>
                ) : isUrgentSla ? (
                  <span className="text-amber-400 text-[10px] font-bold flex items-center space-x-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>{hoursRemaining} hours remaining before SLA lapse</span>
                  </span>
                ) : (
                  <span className="text-teal-400 text-[10px]">Within statutory timeframe</span>
                )}
              </div>
            </div>
          </div>

          {/* Official Resolution Summary (if resolved) */}
          {complaint.resolution_summary && (
            <div className="glass-panel p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/15 space-y-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Statutory Resolution Dossier</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed bg-[#07101e] p-3.5 rounded-xl border border-emerald-500/20">
                {complaint.resolution_summary}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Authorized Lifecycle Actions Panel */}
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Case Lifecycle Action
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Update statutory review status, record resolution affidavit summaries, or transfer bureau jurisdiction.
            </p>

            {actionSuccessMessage && (
              <div className="p-3 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-teal-400" />
                <span>{actionSuccessMessage}</span>
              </div>
            )}

            {actionErrorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{actionErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleStatusTransition} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Target Lifecycle Status
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-[#07101e] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500/50"
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bureau Selection if status is Transferred */}
              {targetStatus === 'Transferred' && (
                <div className="space-y-1 p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30">
                  <label className="block text-cyan-300 font-semibold">
                    Target Bureau Jurisdiction
                  </label>
                  <select
                    value={targetBureau}
                    onChange={(e) => setTargetBureau(e.target.value)}
                    className="w-full px-3 py-2 bg-[#07101e] border border-cyan-500/30 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    {BUREAU_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    This case will be routed to the selected bureau's triage queue.
                  </p>
                </div>
              )}

              {/* Resolution Summary Textarea if status is Resolved */}
              {targetStatus === 'Resolved' && (
                <div className="space-y-1 p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                  <label className="block text-emerald-300 font-semibold">
                    Official Resolution Summary <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter official inquiry outcome, compliance directives issued, or settlement notes..."
                    value={resolutionSummary}
                    onChange={(e) => setResolutionSummary(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-[#07101e] border border-emerald-500/30 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                  />
                  <p className="text-[11px] text-slate-400">
                    Required for formal closure under AICTE Redressal Grid guidelines.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingAction}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 disabled:opacity-60"
              >
                {isSubmittingAction ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Persisting Update...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Apply Lifecycle Update</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick AI Modules Navigation Card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 space-y-3 text-xs">
            <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider block">
              Intelligence Actions
            </span>
            <div className="space-y-2">
              <Link
                to="/case-overlap"
                className="block p-2.5 rounded-xl bg-[#07101e] hover:bg-slate-800/80 border border-slate-800 transition text-slate-300 hover:text-cyan-400"
              >
                <div className="font-semibold flex items-center justify-between">
                  <span>Cross-Bureau Overlap Check</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Scan for identical claims filed across other AICTE bureaus.
                </p>
              </Link>

              <Link
                to="/evidence-checker"
                className="block p-2.5 rounded-xl bg-[#07101e] hover:bg-slate-800/80 border border-slate-800 transition text-slate-300 hover:text-purple-400"
              >
                <div className="font-semibold flex items-center justify-between">
                  <span>Verify Compliance Affidavits</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Check institutional PDF proof with PyMuPDF verifier.
                </p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ComplaintDetails;
