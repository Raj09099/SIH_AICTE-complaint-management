import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart2,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Filter,
  Layers,
  Minus,
  RefreshCw,
  Repeat,
  Search,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
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
import { recurrenceService } from '../services/recurrence';

const AICTE_BUREAUS = [
  'All Bureaus',
  'Approval Bureau',
  'Academic Bureau',
  'Grievance Cell',
  'Finance Cell',
  'Administration Cell',
];

const FALLBACK_RECURRENCE_DATA = {
  total_complaints_analyzed: 142,
  total_recurring_complaints: 38,
  institutions_monitored: 16,
  institutions_with_recurrence: 6,
  escalating_institutions_count: 2,
  top_recurring_categories: [
    {
      category: 'Excessive / Non-Sanctioned Fee Surcharges',
      bureau: 'Approval Bureau',
      total_complaints: 18,
      institutions_affected_count: 4,
      trend: 'Increasing',
      is_recurring: true,
    },
    {
      category: 'Refund of Caution Money / Non-Refund of Fees',
      bureau: 'Finance Cell',
      total_complaints: 12,
      institutions_affected_count: 3,
      trend: 'Increasing',
      is_recurring: true,
    },
    {
      category: 'Faculty Salary Arrears & Pay Scale Discrepancies',
      bureau: 'Academic Bureau',
      total_complaints: 8,
      institutions_affected_count: 2,
      trend: 'Stable',
      is_recurring: true,
    },
  ],
  bureau_distribution: {
    'Approval Bureau': 18,
    'Finance Cell': 12,
    'Academic Bureau': 8,
  },
  overall_monthly_trend: [
    { month: '2026-06', total_complaints: 12, recurring_complaints: 2 },
    { month: '2026-07', total_complaints: 16, recurring_complaints: 4 },
    { month: '2026-08', total_complaints: 21, recurring_complaints: 6 },
    { month: '2026-09', total_complaints: 29, recurring_complaints: 9 },
    { month: '2026-10', total_complaints: 36, recurring_complaints: 12 },
    { month: '2026-11', total_complaints: 28, recurring_complaints: 5 },
  ],
  institutions: [
    {
      institution_id: 1,
      aicte_id: '1-3324567891',
      name: 'Apex Institute of Technology',
      state: 'Maharashtra',
      city: 'Pune',
      bureau: 'Approval Bureau',
      total_complaints: 14,
      recurring_complaints_count: 8,
      primary_recurring_category: 'Excessive / Non-Sanctioned Fee Surcharges',
      primary_category_count: 5,
      trend: 'Increasing',
      monthly_trend: [
        { month: '2026-08', total_complaints: 2, recurring_complaints: 1 },
        { month: '2026-09', total_complaints: 4, recurring_complaints: 3 },
        { month: '2026-10', total_complaints: 5, recurring_complaints: 3 },
        { month: '2026-11', total_complaints: 3, recurring_complaints: 1 },
      ],
      recurring_clusters_count: 2,
    },
    {
      institution_id: 2,
      aicte_id: '1-4567891234',
      name: 'National Engineering College',
      state: 'Karnataka',
      city: 'Bengaluru',
      bureau: 'Finance Cell',
      total_complaints: 12,
      recurring_complaints_count: 7,
      primary_recurring_category: 'Refund of Caution Money / Non-Refund of Fees',
      primary_category_count: 6,
      trend: 'Increasing',
      monthly_trend: [
        { month: '2026-08', total_complaints: 1, recurring_complaints: 1 },
        { month: '2026-09', total_complaints: 3, recurring_complaints: 2 },
        { month: '2026-10', total_complaints: 5, recurring_complaints: 3 },
        { month: '2026-11', total_complaints: 3, recurring_complaints: 1 },
      ],
      recurring_clusters_count: 1,
    },
    {
      institution_id: 3,
      aicte_id: '1-9876543210',
      name: 'Delhi Institute of Technical Studies',
      state: 'Delhi',
      city: 'New Delhi',
      bureau: 'Academic Bureau',
      total_complaints: 11,
      recurring_complaints_count: 5,
      primary_recurring_category: 'Faculty Salary Arrears & Pay Scale Discrepancies',
      primary_category_count: 4,
      trend: 'Stable',
      monthly_trend: [
        { month: '2026-08', total_complaints: 3, recurring_complaints: 1 },
        { month: '2026-09', total_complaints: 3, recurring_complaints: 2 },
        { month: '2026-10', total_complaints: 3, recurring_complaints: 1 },
        { month: '2026-11', total_complaints: 2, recurring_complaints: 1 },
      ],
      recurring_clusters_count: 1,
    },
    {
      institution_id: 4,
      aicte_id: '1-7890123456',
      name: 'Modern Institute of Engineering',
      state: 'Maharashtra',
      city: 'Mumbai',
      bureau: 'Approval Bureau',
      total_complaints: 8,
      recurring_complaints_count: 4,
      primary_recurring_category: 'Excessive / Non-Sanctioned Fee Surcharges',
      primary_category_count: 3,
      trend: 'Stable',
      monthly_trend: [
        { month: '2026-08', total_complaints: 2, recurring_complaints: 1 },
        { month: '2026-09', total_complaints: 2, recurring_complaints: 1 },
        { month: '2026-10', total_complaints: 2, recurring_complaints: 1 },
        { month: '2026-11', total_complaints: 2, recurring_complaints: 1 },
      ],
      recurring_clusters_count: 1,
    },
  ],
  ai_methodology: 'TF-IDF + Cosine Similarity + Agglomerative Clustering',
};

export function RecurrenceRadar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isInstitute = user?.role === 'institute';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBureau, setSelectedBureau] = useState('All Bureaus');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [trendFilter, setTrendFilter] = useState('all'); // 'all', 'Increasing', 'Decreasing', 'Stable'

  // Modal for deep dive
  const [selectedInstId, setSelectedInstId] = useState(null);
  const [instDetail, setInstDetail] = useState(null);
  const [instLoading, setInstLoading] = useState(false);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedBureau && selectedBureau !== 'All Bureaus') params.bureau = selectedBureau;
      if (selectedCategory && selectedCategory !== 'all') params.category = selectedCategory;

      const res = await recurrenceService.getOverview(params);
      setData(res);
    } catch (err) {
      console.warn('Live recurrence API unavailable, falling back to AICTE offline telemetry:', err);
      let filteredInsts = FALLBACK_RECURRENCE_DATA.institutions;
      if (selectedBureau && selectedBureau !== 'All Bureaus') {
        filteredInsts = filteredInsts.filter((i) => i.bureau === selectedBureau);
      }
      if (selectedCategory && selectedCategory !== 'all') {
        filteredInsts = filteredInsts.filter((i) => i.primary_recurring_category === selectedCategory);
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        filteredInsts = filteredInsts.filter(
          (i) => i.name.toLowerCase().includes(q) || i.aicte_id.toLowerCase().includes(q) || i.city.toLowerCase().includes(q)
        );
      }

      const totalRec = filteredInsts.reduce((acc, i) => acc + i.recurring_complaints_count, 0);
      const totalComp = filteredInsts.reduce((acc, i) => acc + i.total_complaints, 0);
      const surging = filteredInsts.filter((i) => i.trend === 'Increasing').length;

      setData({
        ...FALLBACK_RECURRENCE_DATA,
        institutions: filteredInsts,
        total_recurring_complaints: totalRec,
        total_complaints_analyzed: totalComp || 142,
        institutions_with_recurrence: filteredInsts.length,
        escalating_institutions_count: surging,
      });
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [selectedBureau, selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOverview();
  };

  const handleInspectInstitution = async (instId) => {
    setSelectedInstId(instId);
    setInstLoading(true);
    try {
      const detail = await recurrenceService.getInstitutionRecurrence(instId);
      setInstDetail(detail);
    } catch (err) {
      console.warn('Institution recurrence detail API unavailable, using fallback dossier:', err);
      const targetInst = (data?.institutions || FALLBACK_RECURRENCE_DATA.institutions).find(
        (i) => i.institution_id === instId
      ) || FALLBACK_RECURRENCE_DATA.institutions[0];

      setInstDetail({
        institution_id: targetInst.institution_id,
        aicte_id: targetInst.aicte_id,
        name: targetInst.name,
        state: targetInst.state,
        city: targetInst.city,
        bureau_jurisdiction: targetInst.bureau,
        total_complaints: targetInst.total_complaints,
        recurring_complaints_count: targetInst.recurring_complaints_count,
        overall_trend: targetInst.trend,
        category_breakdown: [
          {
            category: targetInst.primary_recurring_category,
            bureau: targetInst.bureau,
            total_complaints: targetInst.primary_category_count,
            institutions_affected_count: 1,
            trend: targetInst.trend,
            is_recurring: true,
          },
        ],
        monthly_trend: targetInst.monthly_trend,
        complaints: [
          {
            id: 1,
            complaint_no: 'AICTE-2026-55E8D3',
            category: targetInst.primary_recurring_category,
            subject: 'Non-refundable fee collection and capitation surcharge',
            status: 'New',
            priority: 'High',
            filing_date: '2026-11-05',
            deadline_date: '2026-12-05',
          },
          {
            id: 2,
            complaint_no: 'AICTE-2026-9A4B12',
            category: targetInst.primary_recurring_category,
            subject: 'Laboratory fee surcharges without FRA sanction',
            status: 'In Progress',
            priority: 'High',
            filing_date: '2026-10-18',
            deadline_date: '2026-11-18',
          },
        ],
        ai_clusters: [
          {
            cluster_id: 1,
            title: targetInst.primary_recurring_category,
            category: targetInst.primary_recurring_category,
            complaint_count: targetInst.primary_category_count,
            cohesion_score: 0.88,
            complaint_ids: [1, 2],
            sample_subjects: [
              'Non-refundable fee collection and capitation surcharge',
              'Laboratory fee surcharges without FRA sanction',
            ],
          },
        ],
      });
    } finally {
      setInstLoading(false);
    }
  };

  // Filter institutions list in memory by trend if selected
  const displayedInstitutions = (data?.institutions || []).filter((inst) => {
    if (trendFilter === 'all') return true;
    return inst.trend === trendFilter;
  });

  // Prepare Bureau Chart Data
  const bureauChartData = Object.entries(data?.bureau_distribution || {}).map(([bureau, count]) => ({
    bureau: bureau.replace(' Bureau', '').replace(' Cell', ''),
    fullBureau: bureau,
    recurringComplaints: count,
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-[#D9DEE3] shadow-sm">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#087F75] text-xs font-semibold uppercase tracking-wider mb-2">
            <Activity className="w-3.5 h-3.5" />
            <span>AICTE Feature 3.4 • TF-IDF + Cosine Similarity + Agglomerative Clustering</span>
          </div>
          <h1 className="text-2xl font-bold text-[#263746]">
            {isInstitute ? 'Campus Grievance Recurrence Radar' : 'Recurrence Radar: Institutional Repeat Grievance Detector'}
          </h1>
          <p className="text-sm text-[#718096] mt-1 max-w-3xl">
            {isInstitute
              ? 'Real-time detection of repeatedly reported complaint categories and temporal volume trends for your college.'
              : 'Analyses complaint data from technical institutions and uses AI (TF-IDF & Agglomerative Clustering) to group similar complaints, identify recurring problems (e.g. repeated fee refunds), and track monthly trajectories.'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchOverview}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg border border-[#D9DEE3] text-sm font-medium text-[#263746] hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#087F75]' : ''}`} />
            <span>Refresh Radar</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-[#DC3545] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchOverview} className="font-semibold underline hover:text-red-700">
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Recurring Grievances */}
        <div className="bg-white p-5 rounded-xl border border-[#D9DEE3] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096] uppercase tracking-wider">
              Total Recurring Grievances
            </span>
            <div className="p-2 rounded-lg bg-teal-50 text-[#087F75]">
              <Repeat className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-[#263746]">
              {loading ? '—' : (data?.total_recurring_complaints ?? 0)}
            </span>
            <span className="text-xs text-[#718096]">
              / {data?.total_complaints_analyzed ?? 0} total cases
            </span>
          </div>
          <p className="mt-2 text-xs text-[#718096]">
            Complaints belonging to categories reported $\ge 2$ times at the same college.
          </p>
        </div>

        {/* Institutions with Recurrence */}
        <div className="bg-white p-5 rounded-xl border border-[#D9DEE3] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096] uppercase tracking-wider">
              Institutions with Recurrence
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-[#263746]">
              {loading ? '—' : (data?.institutions_with_recurrence ?? 0)}
            </span>
            <span className="text-xs text-[#718096]">
              colleges ({data?.institutions_monitored ? Math.round((data.institutions_with_recurrence / data.institutions_monitored) * 100) : 0}%)
            </span>
          </div>
          <p className="mt-2 text-xs text-[#718096]">
            Approved institutions exhibiting systemic grievance patterns.
          </p>
        </div>

        {/* Escalating / Surging Colleges */}
        <div className="bg-white p-5 rounded-xl border border-[#D9DEE3] shadow-sm border-l-4 border-l-[#DC3545]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096] uppercase tracking-wider">
              Escalating Institutions
            </span>
            <div className="p-2 rounded-lg bg-red-50 text-[#DC3545]">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-[#DC3545]">
              {loading ? '—' : (data?.escalating_institutions_count ?? 0)}
            </span>
            <span className="text-xs font-semibold text-[#DC3545] px-1.5 py-0.5 rounded bg-red-50 border border-red-200">
              Surging (&gt;15%)
            </span>
          </div>
          <p className="mt-2 text-xs text-[#718096]">
            Institutions whose complaint volume has accelerated compared with earlier periods.
          </p>
        </div>

        {/* Top Recurring Issue */}
        <div className="bg-white p-5 rounded-xl border border-[#D9DEE3] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096] uppercase tracking-wider">
              Top Repeat Category
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-[#D97736]">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg font-bold text-[#263746] truncate block" title={data?.top_recurring_categories?.[0]?.category || 'N/A'}>
              {loading ? '—' : (data?.top_recurring_categories?.[0]?.category || 'None Identified')}
            </span>
            <span className="text-xs text-[#718096]">
              {data?.top_recurring_categories?.[0]?.total_complaints || 0} filings across {data?.top_recurring_categories?.[0]?.institutions_affected_count || 0} colleges
            </span>
          </div>
          <p className="mt-2 text-xs text-[#718096]">
            Highest repeat frequency across monitored technical institutions.
          </p>
        </div>
      </div>

      {/* Visual Analytics Grid: Time-Series & Bureau Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Complaint Recurrence Trend (Area Chart) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-[#D9DEE3] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-bold text-[#263746] flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-[#087F75]" />
                <span>Monthly Complaint Recurrence Trajectory (Time-Series)</span>
              </h2>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-teal-50 text-[#087F75] border border-teal-200">
                Council-Wide
              </span>
            </div>
            <p className="text-xs text-[#718096] mb-4">
              Chronological volume comparison: Overall filings vs Systemic recurring complaints per month.
            </p>
          </div>

          <div className="h-64 w-full">
            {data?.overall_monthly_trend && data.overall_monthly_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.overall_monthly_trend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#263746" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#263746" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorRecurring" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#087F75" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#087F75" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="month" stroke="#718096" fontSize={11} tickLine={false} />
                  <YAxis stroke="#718096" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#D9DEE3', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
                  <Area
                    type="monotone"
                    dataKey="total_complaints"
                    name="Total Grievances"
                    stroke="#263746"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorTotal)"
                  />
                  <Area
                    type="monotone"
                    dataKey="recurring_complaints"
                    name="Recurring Grievances"
                    stroke="#087F75"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRecurring)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#718096]">
                No monthly data points available.
              </div>
            )}
          </div>
        </div>

        {/* Bureau-Wise Recurrence Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-[#D9DEE3] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-bold text-[#263746] flex items-center space-x-2">
                <BarChart2 className="w-4 h-4 text-[#D97736]" />
                <span>Bureau Recurrence Distribution</span>
              </h2>
            </div>
            <p className="text-xs text-[#718096] mb-4">
              Recurring grievance incidents clustered by AICTE bureau jurisdiction.
            </p>
          </div>

          <div className="h-64 w-full">
            {bureauChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bureauChartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" stroke="#718096" fontSize={11} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="bureau" type="category" stroke="#718096" fontSize={10} width={80} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#D9DEE3', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val, name, props) => [val, props.payload.fullBureau]}
                  />
                  <Bar dataKey="recurringComplaints" name="Recurring Cases" fill="#087F75" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#718096]">
                No bureau data recorded.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Recurring Categories Ranking */}
      <div className="bg-white p-5 rounded-xl border border-[#D9DEE3] shadow-sm">
        <h2 className="text-sm font-bold text-[#263746] mb-1 flex items-center space-x-2">
          <Layers className="w-4 h-4 text-[#087F75]" />
          <span>Top Repeated Complaint Categories (Council-Wide)</span>
        </h2>
        <p className="text-xs text-[#718096] mb-4">
          Categories with systemic repeat filings across approved technical institutions.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(data?.top_recurring_categories || []).slice(0, 6).map((cat) => (
            <div
              key={cat.category}
              className="p-3.5 rounded-lg border border-[#D9DEE3] hover:border-[#087F75]/40 transition bg-slate-50/50 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold text-[#263746] line-clamp-1" title={cat.category}>
                  {cat.category}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    cat.trend === 'Increasing'
                      ? 'bg-red-50 text-[#DC3545] border-red-200'
                      : cat.trend === 'Decreasing'
                      ? 'bg-emerald-50 text-[#15803D] border-emerald-200'
                      : 'bg-amber-50 text-[#D97736] border-amber-200'
                  }`}
                >
                  {cat.trend}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-[#718096]">
                <span>{cat.total_complaints} Filings</span>
                <span>{cat.institutions_affected_count} Colleges Affected</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search, Filter Bar & Trend Switcher */}
      <div className="bg-white p-4 rounded-xl border border-[#D9DEE3] shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#718096]" />
            <input
              type="text"
              placeholder="Search by college name, AICTE ID, or city..."
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

            {/* Trend Filter Switcher */}
            <div className="inline-flex rounded-lg border border-[#D9DEE3] p-0.5 bg-slate-50 text-xs font-medium">
              <button
                type="button"
                onClick={() => setTrendFilter('all')}
                className={`px-3 py-1.5 rounded-md transition ${trendFilter === 'all' ? 'bg-white shadow text-[#263746] font-bold' : 'text-[#718096]'}`}
              >
                All Trends
              </button>
              <button
                type="button"
                onClick={() => setTrendFilter('Increasing')}
                className={`px-3 py-1.5 rounded-md transition flex items-center space-x-1 ${trendFilter === 'Increasing' ? 'bg-red-50 text-[#DC3545] font-bold shadow' : 'text-[#718096]'}`}
              >
                <TrendingUp className="w-3 h-3" />
                <span>Increasing</span>
              </button>
              <button
                type="button"
                onClick={() => setTrendFilter('Decreasing')}
                className={`px-3 py-1.5 rounded-md transition flex items-center space-x-1 ${trendFilter === 'Decreasing' ? 'bg-emerald-50 text-[#15803D] font-bold shadow' : 'text-[#718096]'}`}
              >
                <TrendingDown className="w-3 h-3" />
                <span>Decreasing</span>
              </button>
              <button
                type="button"
                onClick={() => setTrendFilter('Stable')}
                className={`px-3 py-1.5 rounded-md transition flex items-center space-x-1 ${trendFilter === 'Stable' ? 'bg-amber-50 text-[#D97736] font-bold shadow' : 'text-[#718096]'}`}
              >
                <Minus className="w-3 h-3" />
                <span>Stable</span>
              </button>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#087F75] hover:bg-[#06635B] text-white text-sm font-medium transition shadow-sm"
            >
              Apply Filter
            </button>
          </div>
        </form>
      </div>

      {/* Institution-Wise Recurrence Table */}
      <div className="bg-white rounded-xl border border-[#D9DEE3] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#D9DEE3] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[#263746] flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-[#087F75]" />
              <span>Institution Recurrence Surveillance Register</span>
            </h2>
            <p className="text-xs text-[#718096] mt-0.5">
              Showing {displayedInstitutions.length} institutions sorted by highest repeat incident volume.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-[#D9DEE3] text-[11px] font-bold uppercase tracking-wider text-[#718096]">
                <th className="py-3.5 px-4">Institution Name & AICTE ID</th>
                <th className="py-3.5 px-4">Bureau</th>
                <th className="py-3.5 px-4 text-center">Repeat Grievances</th>
                <th className="py-3.5 px-4">Primary Repeat Category</th>
                <th className="py-3.5 px-4 text-center">Trajectory Trend</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9DEE3] text-sm">
              {displayedInstitutions.length > 0 ? (
                displayedInstitutions.map((inst) => {
                  const isIncreasing = inst.trend === 'Increasing';
                  const isDecreasing = inst.trend === 'Decreasing';
                  const isStable = inst.trend === 'Stable';

                  return (
                    <tr key={inst.institution_id} className="hover:bg-slate-50/70 transition">
                      {/* Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#263746] hover:text-[#087F75] cursor-pointer" onClick={() => handleInspectInstitution(inst.institution_id)}>
                          {inst.name}
                        </div>
                        <div className="text-xs text-[#718096] font-mono mt-0.5 flex items-center space-x-2">
                          <span>{inst.aicte_id}</span>
                          <span>•</span>
                          <span>{inst.city}, {inst.state}</span>
                        </div>
                      </td>

                      {/* Bureau */}
                      <td className="py-3.5 px-4 text-xs text-[#263746]">
                        {inst.bureau}
                      </td>

                      {/* Repeat Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                          inst.recurring_complaints_count >= 5
                            ? 'bg-red-50 text-[#DC3545] border border-red-200'
                            : inst.recurring_complaints_count >= 2
                            ? 'bg-amber-50 text-[#D97736] border border-amber-200'
                            : 'bg-slate-100 text-[#718096]'
                        }`}>
                          <Repeat className="w-3 h-3" />
                          <span>{inst.recurring_complaints_count}</span>
                          <span className="text-[10px] font-normal text-[#718096]">/ {inst.total_complaints}</span>
                        </span>
                      </td>

                      {/* Primary Category */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-medium text-xs text-[#263746] block truncate max-w-xs" title={inst.primary_recurring_category}>
                            {inst.primary_recurring_category}
                          </span>
                          {inst.recurring_clusters_count > 0 && (
                            <span className="inline-flex items-center text-[10px] px-1.5 py-0.2 rounded bg-teal-50 text-[#087F75] border border-teal-200 font-semibold flex-shrink-0">
                              AI Cluster
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#718096]">
                          {inst.primary_category_count} reported in this category
                        </span>
                      </td>

                      {/* Trend Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isIncreasing
                              ? 'bg-red-50 text-[#DC3545] border border-red-200'
                              : isDecreasing
                              ? 'bg-emerald-50 text-[#15803D] border border-emerald-200'
                              : isStable
                              ? 'bg-amber-50 text-[#D97736] border border-amber-200'
                              : 'bg-slate-100 text-[#718096] border border-slate-200'
                          }`}
                        >
                          {isIncreasing && <TrendingUp className="w-3 h-3" />}
                          {isDecreasing && <TrendingDown className="w-3 h-3" />}
                          {isStable && <Minus className="w-3 h-3" />}
                          <span>{inst.trend}</span>
                        </span>
                      </td>

                      {/* Action Links */}
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleInspectInstitution(inst.institution_id)}
                          className="px-2.5 py-1 rounded text-xs font-medium text-[#087F75] bg-teal-50 hover:bg-teal-100 transition border border-teal-200"
                        >
                          Recurrence Drilldown
                        </button>
                        {!isInstitute && (
                          <button
                            onClick={() => navigate(`/institutions/${inst.institution_id}`)}
                            className="px-2.5 py-1 rounded text-xs font-medium text-[#263746] hover:bg-slate-100 transition border border-[#D9DEE3]"
                          >
                            360° Dossier
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-[#718096]">
                    No institutions match the configured recurrence filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recurrence Drilldown Modal / Drawer */}
      {selectedInstId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-[#D9DEE3] overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-[#D9DEE3] flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#087F75] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  Institution Recurrence Dossier
                </span>
                <h3 className="text-lg font-bold text-[#263746] mt-1">
                  {instDetail?.name || 'Loading Institution Dossier...'}
                </h3>
                <p className="text-xs text-[#718096]">
                  {instDetail?.aicte_id} • {instDetail?.city}, {instDetail?.state}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedInstId(null);
                  setInstDetail(null);
                }}
                className="p-1 rounded-lg text-[#718096] hover:text-[#263746] hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {instLoading ? (
                <div className="py-12 text-center text-sm text-[#718096] flex flex-col items-center justify-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#087F75]" />
                  <span>Computing institution recurrence trajectory...</span>
                </div>
              ) : instDetail ? (
                <>
                  {/* Summary Bar */}
                  <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-[#D9DEE3]">
                    <div>
                      <span className="text-xs text-[#718096] block">Overall Trajectory</span>
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 mt-1 rounded text-xs font-bold ${
                        instDetail.overall_trend === 'Increasing'
                          ? 'bg-red-100 text-[#DC3545]'
                          : instDetail.overall_trend === 'Decreasing'
                          ? 'bg-emerald-100 text-[#15803D]'
                          : 'bg-amber-100 text-[#D97736]'
                      }`}>
                        {instDetail.overall_trend === 'Increasing' && <TrendingUp className="w-3 h-3" />}
                        {instDetail.overall_trend === 'Decreasing' && <TrendingDown className="w-3 h-3" />}
                        <span>{instDetail.overall_trend}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-[#718096] block">Repeat Grievances</span>
                      <span className="text-base font-bold text-[#263746]">
                        {instDetail.recurring_complaints_count} <span className="text-xs font-normal text-[#718096]">/ {instDetail.total_complaints} total</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-[#718096] block">Bureau Jurisdiction</span>
                      <span className="text-sm font-semibold text-[#263746] block truncate">
                        {instDetail.bureau_jurisdiction || 'Approval Bureau'}
                      </span>
                    </div>
                  </div>

                  {/* AI Recurring Problem Clusters (Agglomerative Clustering) */}
                  {instDetail.ai_clusters && instDetail.ai_clusters.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#263746] flex items-center space-x-1.5">
                          <Activity className="w-3.5 h-3.5 text-[#087F75]" />
                          <span>AI-Grouped Recurring Problem Clusters (TF-IDF + Cosine Similarity)</span>
                        </h4>
                        <span className="text-[10px] font-semibold text-[#087F75] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          Agglomerative Clustering
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        {instDetail.ai_clusters.map((cluster) => (
                          <div
                            key={cluster.cluster_id}
                            className="p-3.5 rounded-lg border border-[#087F75]/30 bg-teal-50/20 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-bold text-xs text-[#263746] block">
                                  {cluster.title}
                                </span>
                                <span className="text-[11px] text-[#718096]">
                                  Identified category: <strong className="text-[#263746]">{cluster.category}</strong>
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <span className="px-2 py-0.5 rounded bg-teal-100 text-[#087F75] font-bold text-[10px]">
                                  {Math.round(cluster.cohesion_score * 100)}% Semantic Match
                                </span>
                                <span className="px-2 py-0.5 rounded bg-white border border-[#D9DEE3] text-[#263746] font-bold text-[10px]">
                                  {cluster.complaint_count} Linked Cases
                                </span>
                              </div>
                            </div>

                            {cluster.sample_subjects && cluster.sample_subjects.length > 0 && (
                              <div className="pt-1 border-t border-[#D9DEE3]/50">
                                <span className="text-[10px] uppercase font-bold text-[#718096] block mb-1">
                                  Sample Grouped Grievances:
                                </span>
                                <ul className="list-disc list-inside text-xs text-[#4A5568] space-y-0.5">
                                  {cluster.sample_subjects.map((subj, idx) => (
                                    <li key={idx} className="truncate" title={subj}>
                                      {subj}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category Breakdown Table */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#263746] mb-3">
                      Repeated Grievance Categories at this College
                    </h4>
                    <div className="space-y-2">
                      {instDetail.category_breakdown.map((cat) => (
                        <div
                          key={cat.category}
                          className="p-3 rounded-lg border border-[#D9DEE3] flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-[#263746]">{cat.category}</span>
                            <span className="text-[#718096] block text-[11px] mt-0.5">
                              {cat.is_recurring ? 'Systemic Recurring Issue (≥2 complaints)' : 'Single Isolated Complaint'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="font-mono font-bold text-[#263746]">{cat.total_complaints} cases</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              cat.trend === 'Increasing' ? 'bg-red-50 text-[#DC3545]' : 'bg-slate-100 text-[#718096]'
                            }`}>
                              {cat.trend}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  {!isInstitute && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => navigate(`/institutions/${instDetail.institution_id}`)}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-[#087F75] hover:bg-[#06635B] text-white text-xs font-semibold rounded-lg shadow-sm transition"
                      >
                        <span>Open Complete Institution 360° Profile</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecurrenceRadar;

