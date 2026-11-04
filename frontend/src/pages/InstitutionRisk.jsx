import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ShieldAlert,
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  HelpCircle,
  Filter,
  Search,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info,
  Calendar,
  Layers,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  X,
  FileText,
  Activity,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { institutionRiskService } from '../services/institutionRisk';

const CONCERN_CONFIG = {
  'High Concern': {
    badge: 'bg-rose-50 text-rose-700 border-rose-300',
    barColor: '#E11D48',
    icon: ShieldAlert,
    label: 'High Concern',
    description: 'Requires prioritized administrative oversight & expedited grievance review.',
  },
  'Moderate Concern': {
    badge: 'bg-amber-50 text-amber-700 border-amber-300',
    barColor: '#D97706',
    icon: AlertTriangle,
    label: 'Moderate Concern',
    description: 'Elevated repeat issues or increasing trajectory; ongoing surveillance recommended.',
  },
  'Low Concern': {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    barColor: '#059669',
    icon: CheckCircle2,
    label: 'Low Concern',
    description: 'Low complaint volume, no significant systemic recurrence, compliant resolution.',
  },
  'Insufficient Data': {
    badge: 'bg-slate-100 text-slate-700 border-slate-300',
    barColor: '#64748B',
    icon: HelpCircle,
    label: 'Insufficient Data',
    description: 'Minimal complaint history available; baseline patterns cannot be reliably assessed.',
  },
};

const BUREAUS = [
  'All',
  'Approval Bureau',
  'Academic Bureau',
  'Anti-Ragging Cell',
  'Faculty & Staff',
  'Finance & Accounts',
];

const CONCERN_LEVELS = ['All', 'High Concern', 'Moderate Concern', 'Low Concern', 'Insufficient Data'];
const TRENDS = ['All', 'Increasing', 'Stable', 'Decreasing', 'Insufficient Data'];

export default function InstitutionRisk() {
  const { user } = useAuth();
  const isInstitute = user?.role === 'institute';
  const [searchParams] = useSearchParams();

  // State
  const [overviewData, setOverviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedBureau, setSelectedBureau] = useState('All');
  const [selectedConcern, setSelectedConcern] = useState('All');
  const [selectedTrend, setSelectedTrend] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Detail Modal State
  const [selectedInstitutionId, setSelectedInstitutionId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Fetch Overview Data
  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (selectedBureau !== 'All') params.bureau = selectedBureau;
      if (selectedConcern !== 'All') params.concern_level = selectedConcern;
      if (selectedTrend !== 'All') params.trend = selectedTrend;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const data = await institutionRiskService.getOverview(params);
      setOverviewData(data);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to load institution risk data:', err);
      setError('Unable to fetch institution risk telemetry. Please verify backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, [selectedBureau, selectedConcern, selectedTrend, dateFrom, dateTo]);

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadOverview();
  };

  // Open Detail Slide-over
  const handleOpenDetail = async (instId) => {
    setSelectedInstitutionId(instId);
    setLoadingDetail(true);
    setDetailData(null);
    try {
      const data = await institutionRiskService.getInstitutionDetail(instId);
      setDetailData(data);
    } catch (err) {
      console.error('Failed to fetch institution risk detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Close Detail Slide-over
  const handleCloseDetail = () => {
    setSelectedInstitutionId(null);
    setDetailData(null);
  };

  // Pagination calculations
  const institutions = overviewData?.institutions || [];
  const totalPages = Math.ceil(institutions.length / itemsPerPage) || 1;
  const paginatedInstitutions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return institutions.slice(start, start + itemsPerPage);
  }, [institutions, currentPage]);

  // Chart data: Concern Level Distribution
  const concernChartData = useMemo(() => {
    if (!overviewData?.concern_level_distribution) return [];
    return [
      { name: 'High Concern', count: overviewData.high_concern_count || 0, color: '#E11D48' },
      { name: 'Moderate Concern', count: overviewData.moderate_concern_count || 0, color: '#D97706' },
      { name: 'Low Concern', count: overviewData.low_concern_count || 0, color: '#059669' },
      { name: 'Insufficient Data', count: overviewData.insufficient_data_count || 0, color: '#64748B' },
    ];
  }, [overviewData]);

  // Chart data: Trends across institutions
  const trendChartData = useMemo(() => {
    if (!overviewData?.trend_distribution) return [];
    return Object.entries(overviewData.trend_distribution).map(([trendName, count]) => ({
      name: trendName,
      count,
    }));
  }, [overviewData]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header & Official Disclaimer */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Institution Risk Analysis
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#087F75]/10 text-[#087F75] border border-[#087F75]/20 font-mono">
                  Feature 3.7
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Multi-factor analytical attention indicators based on grievance volume, repeated issues, SLA compliance, and temporal trends.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadOverview}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Telemetry</span>
            </button>
          </div>
        </div>

        {/* Mandatory Statutory Disclaimer */}
        <div className="p-4 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 flex items-start space-x-3 text-xs leading-relaxed">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block text-amber-950 mb-0.5">
              Notice of Analytical Intent & Statutory Non-Judgmental Posture:
            </span>
            {overviewData?.disclaimer || (
              "Institution Concern Indicator is an analytical attention-support signal based on available complaint data. " +
              "It is not an institutional quality rating, proof of wrongdoing or automatic finding against any institution. " +
              "All findings require authorized human review."
            )}
          </div>
        </div>
      </div>

      {/* 2. Summary KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Institutions Monitored
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {loading ? '...' : overviewData?.total_institutions_analyzed || 0}
            </span>
            <span className="text-xs text-slate-500">Campuses</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-rose-200 shadow-sm space-y-1 bg-gradient-to-br from-white to-rose-50/30">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 block">
            High Concern
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-rose-700 font-mono">
              {loading ? '...' : overviewData?.high_concern_count || 0}
            </span>
            <span className="text-xs text-rose-600 font-medium">Score 60–100</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm space-y-1 bg-gradient-to-br from-white to-amber-50/30">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block">
            Moderate Concern
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-amber-700 font-mono">
              {loading ? '...' : overviewData?.moderate_concern_count || 0}
            </span>
            <span className="text-xs text-amber-600 font-medium">Score 30–59</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm space-y-1 bg-gradient-to-br from-white to-emerald-50/30">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block">
            Low Concern
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-emerald-700 font-mono">
              {loading ? '...' : overviewData?.low_concern_count || 0}
            </span>
            <span className="text-xs text-emerald-600 font-medium">Score 0–29</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Insufficient Data
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-700 font-mono">
              {loading ? '...' : overviewData?.insufficient_data_count || 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">&lt; 2 cases</span>
          </div>
        </div>
      </div>

      {/* 3. Recharts Telemetry Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Concern Level Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Institution Concern Level Distribution
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">Council-wide Breakdown</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={concernChartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748B" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#64748B" />
                <Tooltip
                  formatter={(val) => [`${val} institutions`, 'Count']}
                  contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {concernChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Complaint Growth Trend Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Complaint Growth Trajectory Breakdown
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">Month-on-Month Trends</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendChartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748B" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#64748B" />
                <Tooltip
                  formatter={(val) => [`${val} institutions`, 'Count']}
                  contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#087F75" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Filter & Search Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Institution Name, AICTE ID, or City..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#087F75] focus:border-transparent text-slate-800"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-[#087F75] hover:bg-[#06635B] rounded-lg transition shrink-0"
          >
            Apply Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          {/* Bureau Filter */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500 font-medium">Bureau:</span>
            <select
              value={selectedBureau}
              onChange={(e) => setSelectedBureau(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs focus:ring-1 focus:ring-[#087F75]"
            >
              {BUREAUS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Concern Level Filter */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500 font-medium">Concern:</span>
            <select
              value={selectedConcern}
              onChange={(e) => setSelectedConcern(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs focus:ring-1 focus:ring-[#087F75]"
            >
              {CONCERN_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          {/* Trend Filter */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500 font-medium">Trend:</span>
            <select
              value={selectedTrend}
              onChange={(e) => setSelectedTrend(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs focus:ring-1 focus:ring-[#087F75]"
            >
              {TRENDS.map((tr) => (
                <option key={tr} value={tr}>
                  {tr}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center space-x-2 text-xs ml-auto">
            <span className="text-slate-500 font-medium">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-1 rounded border border-slate-300 text-slate-700 text-xs"
            />
            <span className="text-slate-500 font-medium">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-1 rounded border border-slate-300 text-slate-700 text-xs"
            />
          </div>
        </div>
      </div>

      {/* 5. Institution Risk Surveillance Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-900">
              Institution Risk Surveillance Grid
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              {institutions.length} Matching
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Click 'Inspect Profile' to review 5-factor scoring breakdown
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#087F75] mb-2" />
            Evaluating multi-factor institutional risk indicators...
          </div>
        ) : institutions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No institutions match the configured search and filter parameters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Institution Name & AICTE ID</th>
                  <th className="py-3 px-3">Bureau</th>
                  <th className="py-3 px-3 text-center">Total Cases</th>
                  <th className="py-3 px-3 text-center">Recurring</th>
                  <th className="py-3 px-3 text-center">Trajectory</th>
                  <th className="py-3 px-3 text-center">High/Critical</th>
                  <th className="py-3 px-3 text-center">Overdue</th>
                  <th className="py-3 px-4 text-center">Concern Indicator</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedInstitutions.map((inst) => {
                  const cfg = CONCERN_CONFIG[inst.concern_level] || CONCERN_CONFIG['Low Concern'];
                  const Icon = cfg.icon;
                  return (
                    <tr key={inst.institution_id} className="hover:bg-slate-50/70 transition">
                      {/* Name & ID */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 block truncate max-w-xs">
                          {inst.name}
                        </span>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono mt-0.5">
                          <span>{inst.aicte_id}</span>
                          <span>•</span>
                          <span>{inst.city}, {inst.state}</span>
                        </div>
                      </td>

                      {/* Bureau */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-slate-600">
                        {inst.bureau}
                      </td>

                      {/* Total Complaints */}
                      <td className="py-3.5 px-3 text-center font-mono font-semibold text-slate-800">
                        {inst.total_complaints}
                      </td>

                      {/* Recurring Cases */}
                      <td className="py-3.5 px-3 text-center">
                        {inst.recurring_complaints > 0 ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                            {inst.recurring_complaints}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">0</span>
                        )}
                      </td>

                      {/* Growth Trend */}
                      <td className="py-3.5 px-3 text-center">
                        {inst.trend === 'Increasing' && (
                          <span className="inline-flex items-center space-x-1 text-rose-600 font-medium">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>Increasing</span>
                          </span>
                        )}
                        {inst.trend === 'Decreasing' && (
                          <span className="inline-flex items-center space-x-1 text-emerald-600 font-medium">
                            <TrendingDown className="w-3.5 h-3.5" />
                            <span>Decreasing</span>
                          </span>
                        )}
                        {inst.trend === 'Stable' && (
                          <span className="inline-flex items-center space-x-1 text-slate-600 font-medium">
                            <Minus className="w-3.5 h-3.5" />
                            <span>Stable</span>
                          </span>
                        )}
                        {inst.trend === 'Insufficient Data' && (
                          <span className="text-slate-400 text-[11px]">Insufficient</span>
                        )}
                      </td>

                      {/* High/Critical Priority */}
                      <td className="py-3.5 px-3 text-center">
                        {inst.high_critical_cases > 0 ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 font-mono">
                            {inst.high_critical_cases}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">0</span>
                        )}
                      </td>

                      {/* Overdue */}
                      <td className="py-3.5 px-3 text-center">
                        {inst.overdue_cases > 0 ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 font-mono">
                            {inst.overdue_cases}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">0</span>
                        )}
                      </td>

                      {/* Concern Indicator & Score */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.badge}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{cfg.label}</span>
                          <span className="font-mono text-[10px] opacity-75">
                            ({inst.risk_score} pts)
                          </span>
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenDetail(inst.institution_id)}
                          className="inline-flex items-center space-x-1 text-xs font-semibold text-[#087F75] hover:text-[#06635B] bg-[#087F75]/10 hover:bg-[#087F75]/20 px-2.5 py-1 rounded-lg transition"
                        >
                          <span>Inspect Profile</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded border border-slate-200 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded border border-slate-200 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Granular Institution Risk Detail Modal / Slide-over */}
      {selectedInstitutionId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#087F75]/10 text-[#087F75] flex items-center justify-center font-bold font-mono">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {detailData?.name || 'Institution Risk Profile'}
                  </h3>
                  <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono">
                    <span>{detailData?.aicte_id}</span>
                    <span>•</span>
                    <span>{detailData?.city}, {detailData?.state}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCloseDetail}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#087F75] mb-2" />
                Retrieving detailed risk scoring breakdown...
              </div>
            ) : detailData ? (
              <div className="p-6 space-y-6">
                {/* Risk Score & Concern Level Banner */}
                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Attention Indicator
                      </span>
                      <span
                        className={`px-3 py-0.5 rounded-full text-xs font-bold border ${
                          CONCERN_CONFIG[detailData.concern_level]?.badge || ''
                        }`}
                      >
                        {detailData.concern_level}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 max-w-xl">
                      {detailData.explanation}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-3xl font-extrabold text-slate-900 font-mono">
                      {detailData.risk_score}
                    </span>
                    <span className="text-xs text-slate-400 font-mono block">/ 100 Points</span>
                  </div>
                </div>

                {/* 5-Factor Scoring Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    5-Factor Transparent Scoring Weights
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    <div className="p-3.5 rounded-lg bg-white border border-slate-200 text-xs">
                      <span className="text-slate-500 block">Complaint Volume</span>
                      <span className="text-base font-bold text-slate-900 font-mono block mt-1">
                        +{detailData.scoring_factors.volume_score} pts
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {detailData.scoring_factors.volume_count} Total Cases
                      </span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-white border border-slate-200 text-xs">
                      <span className="text-slate-500 block">Repeated Issues</span>
                      <span className="text-base font-bold text-slate-900 font-mono block mt-1">
                        +{detailData.scoring_factors.recurrence_score} pts
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {detailData.scoring_factors.recurring_count} Repeat Cases
                      </span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-white border border-slate-200 text-xs">
                      <span className="text-slate-500 block">Trajectory Trend</span>
                      <span className="text-base font-bold text-slate-900 font-mono block mt-1">
                        +{detailData.scoring_factors.growth_score} pts
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {detailData.scoring_factors.growth_trend}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-white border border-slate-200 text-xs">
                      <span className="text-slate-500 block">Severity / Priority</span>
                      <span className="text-base font-bold text-slate-900 font-mono block mt-1">
                        +{detailData.scoring_factors.priority_score} pts
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {detailData.scoring_factors.high_critical_count} High/Crit Cases
                      </span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-white border border-slate-200 text-xs">
                      <span className="text-slate-500 block">Overdue SLA</span>
                      <span className="text-base font-bold text-slate-900 font-mono block mt-1">
                        +{detailData.scoring_factors.overdue_score} pts
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {detailData.scoring_factors.overdue_count} Overdue Cases
                      </span>
                    </div>
                  </div>
                </div>

                {/* Monthly Trajectory Chart */}
                {detailData.monthly_trend?.length > 1 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Chronological Monthly Inflow Trajectory
                    </h4>
                    <div className="h-44 w-full bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={detailData.monthly_trend}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#64748B" />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="#64748B" />
                          <Tooltip
                            formatter={(val) => [`${val} complaints`, 'Volume']}
                            contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                          />
                          <Area type="monotone" dataKey="count" stroke="#087F75" fill="#087F75" fillOpacity={0.15} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Data Limitations Disclosure */}
                <div className="p-3.5 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-600 space-y-1">
                  <span className="font-semibold text-slate-800 block">
                    Data Coverage & Schema Limitations:
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    {detailData.data_limitations}
                  </p>
                </div>

                {/* Modal Actions / Cross-links */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to={`/institutions/${detailData.institution_id}`}
                    className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#087F75] hover:underline"
                  >
                    <span>View Institution 360° Profile</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    to={`/recurrence-radar?search=${encodeURIComponent(detailData.name)}`}
                    className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Inspect in Recurrence Radar</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500">
                Failed to load profile details.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

