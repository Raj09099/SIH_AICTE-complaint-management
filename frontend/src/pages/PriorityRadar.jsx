import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  History,
  Info,
  RefreshCw,
  Search,
  Sliders,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { priorityService } from '../services/priority';

const AICTE_BUREAUS = [
  'All Bureaus',
  'Approval Bureau',
  'Academic Bureau',
  'Grievance Cell',
  'Finance Cell',
  'Administration Cell',
];

export function PriorityRadar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isInstitute = user?.role === 'institute';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBureau, setSelectedBureau] = useState('All Bureaus');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [discrepancyOnly, setDiscrepancyOnly] = useState(false);

  // Action modals state
  const [overrideTarget, setOverrideTarget] = useState(null); // complaint object
  const [overrideChoice, setOverrideChoice] = useState('Critical');
  const [overrideJustification, setOverrideJustification] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [historyTargetId, setHistoryTargetId] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [notificationMsg, setNotificationMsg] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedBureau && selectedBureau !== 'All Bureaus') params.bureau = selectedBureau;
      if (selectedPriority && selectedPriority !== 'all') params.recommended_priority = selectedPriority;
      if (discrepancyOnly) params.discrepancy_only = true;

      const res = await priorityService.getDashboard(params);
      setData(res);
    } catch (err) {
      console.error('Failed to load priority telemetry:', err);
      setError('Unable to load priority recommendations from AICTE central grid.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [selectedBureau, selectedPriority, discrepancyOnly]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDashboard();
  };

  const handleAccept = async (complaintId) => {
    setActionLoading(true);
    try {
      await priorityService.acceptRecommendation(complaintId);
      setNotificationMsg(`AI recommended priority accepted successfully for complaint #${complaintId}.`);
      fetchDashboard();
    } catch (err) {
      console.error('Failed to accept recommendation:', err);
      alert(err.response?.data?.detail || 'Failed to accept recommendation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!overrideTarget) return;

    setActionLoading(true);
    try {
      await priorityService.overrideRecommendation(
        overrideTarget.complaint_id,
        overrideChoice,
        overrideJustification.trim() || undefined
      );
      setNotificationMsg(
        `Priority manually overridden to ${overrideChoice} for complaint #${overrideTarget.complaint_id}.`
      );
      setOverrideTarget(null);
      setOverrideJustification('');
      fetchDashboard();
    } catch (err) {
      console.error('Failed to override priority:', err);
      alert(err.response?.data?.detail || 'Failed to override priority.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenHistory = async (complaintId) => {
    setHistoryTargetId(complaintId);
    setHistoryLoading(true);
    try {
      const logs = await priorityService.getPriorityHistory(complaintId);
      setHistoryList(logs);
    } catch (err) {
      console.error('Failed to load priority history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Prepare Distribution Chart Data
  const distributionData = [
    {
      tier: 'Critical',
      Assigned: data?.priority_distribution?.assigned?.Critical || 0,
      AI_Recommended: data?.priority_distribution?.recommended?.Critical || 0,
    },
    {
      tier: 'High',
      Assigned: data?.priority_distribution?.assigned?.High || 0,
      AI_Recommended: data?.priority_distribution?.recommended?.High || 0,
    },
    {
      tier: 'Medium',
      Assigned: data?.priority_distribution?.assigned?.Medium || 0,
      AI_Recommended: data?.priority_distribution?.recommended?.Medium || 0,
    },
    {
      tier: 'Low',
      Assigned: data?.priority_distribution?.assigned?.Low || 0,
      AI_Recommended: data?.priority_distribution?.recommended?.Low || 0,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-[#D9DEE3] shadow-sm">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#087F75] text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AICTE Feature 3.5 • Transparent Case Priority Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-[#263746]">
            AI-Assisted Priority System
          </h1>
          <p className="text-sm text-[#718096] mt-1 max-w-3xl">
            Multi-factor algorithmic priority recommendation calculating grievance severity, pending ageing,
            and statutory SLA deadline urgency. Officers retain complete decision authority to accept or override.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg border border-[#D9DEE3] text-sm font-medium text-[#263746] hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#087F75]' : ''}`} />
            <span>Refresh Priorities</span>
          </button>
        </div>
      </div>

      {notificationMsg && (
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-sm text-[#087F75] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{notificationMsg}</span>
          </div>
          <button onClick={() => setNotificationMsg(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-[#DC3545] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchDashboard} className="font-semibold underline hover:text-red-700">
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Critical Priority */}
        <div className="bg-white p-5 rounded-xl border border-[#D9DEE3] shadow-sm border-l-4 border-l-[#DC3545]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096] uppercase tracking-wider">
              Critical Urgency
            </span>
            <div className="p-2 rounded-lg bg-red-50 text-[#DC3545]">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-[#DC3545]">
              {loading ? '—' : (data?.critical_count ?? 0)}
            </span>
            <span className="text-xs text-[#718096]">
              recommended cases
            </span>
          </div>
          <p className="mt-2 text-xs text-[#718096]">
            Severe safety infractions, overdue SLA breaches, or escalated hearings.
          </p>
        </div>

        {/* High Priority */}
        <div className="bg-white p-5 rounded-xl border border-[#D9DEE3] shadow-sm border-l-4 border-l-[#D97736]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096] uppercase tracking-wider">
              High Priority
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-[#D97736]">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-[#D97736]">
              {loading ? '—' : (data?.high_count ?? 0)}
            </span>
            <span className="text-xs text-[#718096]">
              recommended cases
            </span>
          </div>
          <p className="mt-2 text-xs text-[#718096]">
            Capitation fees, faculty salary arrears, or approaching deadlines.
          </p>
        </div>

        {/* Priority Discrepancies Alert */}
        <div className="bg-white p-5 rounded-xl border border-[#D9DEE3] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096] uppercase tracking-wider">
              Priority Discrepancies
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-indigo-700">
              {loading ? '—' : (data?.discrepancy_count ?? 0)}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Under-Ranked
            </span>
          </div>
          <p className="mt-2 text-xs text-[#718096]">
            Complaints where AI recommended priority is higher than currently assigned.
          </p>
        </div>

        {/* Pending Officer Review Queue */}
        <div className="bg-white p-5 rounded-xl border border-[#D9DEE3] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096] uppercase tracking-wider">
              Awaiting Officer Review
            </span>
            <div className="p-2 rounded-lg bg-teal-50 text-[#087F75]">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-[#263746]">
              {loading ? '—' : (data?.awaiting_review_count ?? 0)}
            </span>
            <span className="text-xs text-[#718096]">
              pending decisions
            </span>
          </div>
          <p className="mt-2 text-xs text-[#718096]">
            Active complaints ready for officer confirmation or manual override.
          </p>
        </div>
      </div>

      {/* Priority Distribution Chart Comparison */}
      <div className="bg-white p-5 rounded-xl border border-[#D9DEE3] shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-[#263746] flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-[#087F75]" />
            <span>Priority Tier Distribution: Currently Assigned vs. AI Recommended</span>
          </h2>
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-teal-50 text-[#087F75] border border-teal-200">
            Algorithmic Calibration
          </span>
        </div>
        <p className="text-xs text-[#718096] mb-4">
          Identifies under-prioritized critical complaints across AICTE bureaus.
        </p>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distributionData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="tier" stroke="#718096" fontSize={12} tickLine={false} />
              <YAxis stroke="#718096" fontSize={12} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#D9DEE3', borderRadius: '8px', fontSize: '12px' }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="Assigned" name="Current Assigned Priority" fill="#94A3B8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="AI_Recommended" name="AI Recommended Priority" fill="#087F75" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#D9DEE3] shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#718096]" />
            <input
              type="text"
              placeholder="Search by complaint number, college, category, or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-[#D9DEE3] rounded-lg focus:outline-none focus:border-[#087F75] focus:ring-1 focus:ring-[#087F75]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Bureau Filter */}
            <select
              value={selectedBureau}
              onChange={(e) => setSelectedBureau(e.target.value)}
              className="text-sm border border-[#D9DEE3] rounded-lg px-3 py-2 bg-white text-[#263746] focus:outline-none focus:border-[#087F75]"
            >
              {AICTE_BUREAUS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Priority Tier Filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="text-sm border border-[#D9DEE3] rounded-lg px-3 py-2 bg-white text-[#263746] focus:outline-none focus:border-[#087F75]"
            >
              <option value="all">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {/* Discrepancy Filter Button */}
            <button
              type="button"
              onClick={() => setDiscrepancyOnly(!discrepancyOnly)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition border ${
                discrepancyOnly
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
              }`}
            >
              {discrepancyOnly ? '✓ Discrepancies Only' : 'Show Discrepancies'}
            </button>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#087F75] hover:bg-[#06635B] text-white text-sm font-medium transition shadow-sm"
            >
              Apply Filter
            </button>
          </div>
        </form>
      </div>

      {/* Complaint Priority Decision Table */}
      <div className="bg-white rounded-xl border border-[#D9DEE3] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#D9DEE3] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[#263746] flex items-center space-x-2">
              <Zap className="w-4 h-4 text-[#087F75]" />
              <span>Priority Recommendation & Officer Decision Queue</span>
            </h2>
            <p className="text-xs text-[#718096] mt-0.5">
              Showing {data?.recommendations?.length || 0} active grievances requiring triage.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-[#D9DEE3] text-[11px] font-bold uppercase tracking-wider text-[#718096]">
                <th className="py-3.5 px-4">Complaint ID & Institution</th>
                <th className="py-3.5 px-4">Category & Subject</th>
                <th className="py-3.5 px-4 text-center">Current Priority</th>
                <th className="py-3.5 px-4 text-center">AI Recommendation</th>
                <th className="py-3.5 px-4">Transparent Justification</th>
                <th className="py-3.5 px-4 text-center">Decision Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9DEE3] text-sm">
              {data?.recommendations && data.recommendations.length > 0 ? (
                data.recommendations.map((rec) => {
                  const isCritical = rec.recommended_priority === 'Critical';
                  const isHigh = rec.recommended_priority === 'High';
                  const isMedium = rec.recommended_priority === 'Medium';

                  return (
                    <tr
                      key={rec.complaint_id}
                      className={`hover:bg-slate-50/70 transition ${
                        rec.has_discrepancy ? 'bg-indigo-50/20' : ''
                      }`}
                    >
                      {/* ID & College */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-xs text-[#087F75] flex items-center space-x-1.5">
                          <span>{rec.complaint_no}</span>
                          {rec.has_discrepancy && (
                            <span className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 font-bold" title="AI recommends higher priority than assigned">
                              Under-Ranked
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-[#263746] mt-0.5 max-w-[200px] truncate" title={rec.institution_name}>
                          {rec.institution_name}
                        </div>
                        <div className="text-[11px] text-[#718096] font-mono">
                          {rec.bureau}
                        </div>
                      </td>

                      {/* Category & Subject */}
                      <td className="py-3.5 px-4 max-w-[240px]">
                        <span className="text-xs font-semibold text-[#263746] block truncate" title={rec.category}>
                          {rec.category}
                        </span>
                        <span className="text-xs text-[#718096] line-clamp-1 mt-0.5" title={rec.subject}>
                          {rec.subject}
                        </span>
                      </td>

                      {/* Current Priority */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          rec.current_priority === 'Critical' || rec.current_priority === 'Urgent'
                            ? 'bg-red-50 text-[#DC3545] border border-red-200'
                            : rec.current_priority === 'High'
                            ? 'bg-amber-50 text-[#D97736] border border-amber-200'
                            : 'bg-slate-100 text-[#718096]'
                        }`}>
                          {rec.current_priority}
                        </span>
                      </td>

                      {/* AI Recommended Priority & Score */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                            isCritical
                              ? 'bg-red-50 text-[#DC3545] border border-red-200'
                              : isHigh
                              ? 'bg-amber-50 text-[#D97736] border border-amber-200'
                              : isMedium
                              ? 'bg-teal-50 text-[#087F75] border border-teal-200'
                              : 'bg-slate-100 text-[#718096] border border-slate-200'
                          }`}
                        >
                          {isCritical && <Flame className="w-3 h-3 text-[#DC3545]" />}
                          {isHigh && <AlertTriangle className="w-3 h-3 text-[#D97736]" />}
                          <span>{rec.recommended_priority}</span>
                          <span className="text-[10px] font-normal text-[#718096]">({rec.score})</span>
                        </span>
                      </td>

                      {/* Justification */}
                      <td className="py-3.5 px-4 max-w-[260px]">
                        <p className="text-xs text-[#718096] line-clamp-2" title={rec.reason}>
                          {rec.reason}
                        </p>
                      </td>

                      {/* Decision Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rec.status === 'Accepted'
                              ? 'bg-emerald-50 text-[#15803D] border border-emerald-200'
                              : rec.status === 'Overridden'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-amber-50 text-[#D97736] border border-amber-200'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                        {!isInstitute && (
                          <>
                            {rec.status === 'Pending Review' && (
                              <button
                                onClick={() => handleAccept(rec.complaint_id)}
                                disabled={actionLoading}
                                title="Accept AI Recommended Priority"
                                className="px-2 py-1 rounded text-xs font-semibold text-[#087F75] bg-teal-50 hover:bg-teal-100 border border-teal-200 transition"
                              >
                                Accept
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setOverrideTarget(rec);
                                setOverrideChoice(rec.recommended_priority);
                                setOverrideJustification('');
                              }}
                              title="Override Priority Level"
                              className="px-2 py-1 rounded text-xs font-semibold text-[#263746] hover:bg-slate-100 border border-[#D9DEE3] transition"
                            >
                              Override
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleOpenHistory(rec.complaint_id)}
                          title="View Decision History"
                          className="p-1 rounded text-[#718096] hover:text-[#263746] hover:bg-slate-100 transition inline-flex items-center"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => navigate(`/complaints/${rec.complaint_id}`)}
                          title="Open Complaint Details"
                          className="p-1 rounded text-[#718096] hover:text-[#087F75] hover:bg-slate-100 transition inline-flex items-center"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-[#718096]">
                    No active complaints found matching the selected priority filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Override Priority Modal */}
      {overrideTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-[#D9DEE3] overflow-hidden">
            <div className="p-5 border-b border-[#D9DEE3] flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-[#087F75]" />
                <h3 className="text-base font-bold text-[#263746]">
                  Override Complaint Priority
                </h3>
              </div>
              <button
                onClick={() => setOverrideTarget(null)}
                className="p-1 rounded-lg text-[#718096] hover:text-[#263746] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOverrideSubmit} className="p-6 space-y-4">
              <div>
                <span className="text-xs text-[#718096] block">Complaint Reference</span>
                <span className="font-mono font-bold text-sm text-[#087F75]">
                  {overrideTarget.complaint_no}
                </span>
                <span className="text-xs text-[#263746] block truncate">
                  {overrideTarget.institution_name}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-xs text-[#087F75]">
                <strong>AI Recommendation:</strong> {overrideTarget.recommended_priority} (Score {overrideTarget.score}/100)
              </div>

              <div>
                <label className="block text-xs font-bold text-[#263746] mb-1">
                  Officer Chosen Priority <span className="text-red-500">*</span>
                </label>
                <select
                  value={overrideChoice}
                  onChange={(e) => setOverrideChoice(e.target.value)}
                  className="w-full text-sm border border-[#D9DEE3] rounded-lg p-2.5 bg-white text-[#263746] focus:outline-none focus:border-[#087F75]"
                >
                  <option value="Critical">Critical Priority</option>
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#263746] mb-1">
                  Override Justification / Officer Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={overrideJustification}
                  onChange={(e) => setOverrideJustification(e.target.value)}
                  placeholder="Enter reason for modifying algorithmically recommended priority..."
                  className="w-full text-xs border border-[#D9DEE3] rounded-lg p-2.5 focus:outline-none focus:border-[#087F75]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setOverrideTarget(null)}
                  className="px-4 py-2 border border-[#D9DEE3] rounded-lg text-xs font-semibold text-[#718096] hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#087F75] hover:bg-[#06635B] text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {actionLoading ? 'Saving Decision...' : 'Confirm Priority Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decision Audit History Modal */}
      {historyTargetId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-[#D9DEE3] overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-[#D9DEE3] flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-[#087F75]" />
                <h3 className="text-base font-bold text-[#263746]">
                  Priority Decision Audit History
                </h3>
              </div>
              <button
                onClick={() => setHistoryTargetId(null)}
                className="p-1 rounded-lg text-[#718096] hover:text-[#263746] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {historyLoading ? (
                <div className="py-8 text-center text-xs text-[#718096]">
                  Loading decision logs...
                </div>
              ) : historyList.length > 0 ? (
                historyList.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-lg border border-[#D9DEE3] bg-slate-50 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#263746]">
                        {log.status === 'Accepted' ? 'AI Priority Accepted' : log.status === 'Overridden' ? 'Priority Overridden' : 'Initial AI Evaluation'}
                      </span>
                      <span className="text-[10px] text-[#718096] font-mono">
                        {log.decided_at ? new Date(log.decided_at).toLocaleString() : new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[#718096]">
                      Decided Priority: <strong className="text-[#263746]">{log.final_priority || log.recommended_priority}</strong> (Score {log.score}/100)
                    </div>
                    {log.decided_by_name && (
                      <div className="text-[11px] text-[#718096]">
                        Officer: {log.decided_by_name}
                      </div>
                    )}
                    {log.decision_notes && (
                      <div className="mt-1 p-2 rounded bg-white border border-[#D9DEE3] text-[11px] text-[#263746] italic">
                        "{log.decision_notes}"
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-[#718096]">
                  No previous decision changes recorded. Initial AI evaluation active.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PriorityRadar;

