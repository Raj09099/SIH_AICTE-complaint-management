import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Building2,
  GitCompare,
  Network,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  Calendar,
  Layers,
  ArrowRight,
  Send,
  Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import StatCard from '../components/dashboard/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import { analyticsService } from '../services/analytics';
import { complaintService } from '../services/complaints';
import { API_BASE_URL } from '../services/api';
import { formatDate } from '../utils/formatters';

// Demonstration dataset for presentation fallback
const demoComplaints = [
  {
    id: 'AICTE-2026-0842',
    institution: 'Apex Institute of Technology',
    state: 'Maharashtra',
    bureau: 'Anti-Ragging Cell',
    category: 'Hostel Harassment & Coercion',
    summary: 'Senior hostel students subjected to unauthorized fee surcharges and amenities deprivation under ragging guise.',
    submittedDate: '2026-10-22',
    slaDeadline: '2026-11-05',
    priority: 'Critical',
    status: 'Under Review',
    description: 'Senior hostel students subjected to unauthorized fee surcharges and amenities deprivation under ragging guise.',
  },
  {
    id: 'AICTE-2026-0914',
    institution: 'Apex Institute of Technology',
    state: 'Maharashtra',
    bureau: 'Approval Bureau',
    category: 'Arbitrary Fee Surcharges',
    summary: 'Institution charging exorbitant non-sanctioned amenity fees in violation of AICTE Fee Committee norms.',
    submittedDate: '2026-10-24',
    slaDeadline: '2026-11-08',
    priority: 'High',
    status: 'Under Review',
    description: 'Institution charging exorbitant non-sanctioned amenity fees in violation of AICTE Fee Committee norms.',
  },
  {
    id: 'AICTE-2026-0771',
    institution: 'National Engineering College',
    state: 'Karnataka',
    bureau: 'Approval Bureau',
    category: 'Laboratory Deficiencies',
    summary: 'Non-functional robotics and advanced computing laboratories despite claimed AICTE compliance.',
    submittedDate: '2026-10-15',
    slaDeadline: '2026-10-30',
    priority: 'Urgent',
    status: 'Evidence Requested',
    description: 'Non-functional robotics and advanced computing laboratories despite claimed AICTE compliance.',
  },
  {
    id: 'AICTE-2026-0612',
    institution: 'Shri Ram Technical Campus',
    state: 'Punjab',
    bureau: 'Faculty & Staff Cell',
    category: 'Salary Non-Payment & Arrears',
    summary: 'Adjunct and assistant professors unpaid for 4 months; violation of 7th CPC salary mandate.',
    submittedDate: '2026-10-08',
    slaDeadline: '2026-10-28',
    priority: 'Critical',
    status: 'Escalated',
    description: 'Adjunct and assistant professors unpaid for 4 months; violation of 7th CPC salary mandate.',
  },
  {
    id: 'AICTE-2026-0520',
    institution: 'Greenfield Institute of Management',
    state: 'Uttar Pradesh',
    bureau: 'Finance & Scholarships',
    category: 'PMSSS Scholarship Withholding',
    summary: 'Institutional delay in crediting Prime Minister Special Scholarship Scheme stipend to eligible scholars.',
    submittedDate: '2026-10-02',
    slaDeadline: '2026-10-25',
    priority: 'High',
    status: 'Under Review',
    description: 'Institutional delay in crediting Prime Minister Special Scholarship Scheme stipend to eligible scholars.',
  },
  {
    id: 'AICTE-2026-0419',
    institution: 'St. Xavier Polytechnic',
    state: 'Kerala',
    bureau: 'Grievance Cell',
    category: 'Admission Cancellation & Refund',
    summary: 'Refusal to refund security deposit after student admission withdrawal before official cut-off date.',
    submittedDate: '2026-09-28',
    slaDeadline: '2026-10-18',
    priority: 'Medium',
    status: 'Resolved',
    description: 'Refusal to refund security deposit after student admission withdrawal before official cut-off date.',
  },
];

const demoMonthlyTrends = [
  { month: 'May', received: 112, resolved: 98 },
  { month: 'Jun', received: 145, resolved: 130 },
  { month: 'Jul', received: 210, resolved: 185 },
  { month: 'Aug', received: 198, resolved: 176 },
  { month: 'Sep', received: 245, resolved: 210 },
  { month: 'Oct', received: 268, resolved: 232 },
];

const demoBureauStats = [
  { name: 'Approval Bureau', active: 114, resolved: 310, total: 424, slaOnTime: 94.2 },
  { name: 'Grievance Cell', active: 98, resolved: 280, total: 378, slaOnTime: 92.5 },
  { name: 'Anti-Ragging Cell', active: 46, resolved: 120, total: 166, slaOnTime: 98.1 },
  { name: 'Faculty & Staff', active: 62, resolved: 95, total: 157, slaOnTime: 86.4 },
  { name: 'Finance Cell', active: 36, resolved: 87, total: 123, slaOnTime: 91.0 },
];

export function Dashboard() {
  const { user } = useAuth();
  const isInstitute = user?.role === 'institute';

  const [backendHealth, setBackendHealth] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [presentationMode, setPresentationMode] = useState('live'); // 'live' | 'demo'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBureau, setSelectedBureau] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedCaseDetail, setSelectedCaseDetail] = useState(null);

  // Live Backend Data States
  const [summaryData, setSummaryData] = useState(null);
  const [liveComplaints, setLiveComplaints] = useState([]);
  const [loadingLive, setLoadingLive] = useState(true);
  const [liveError, setLiveError] = useState(null);

  const fetchHealth = useCallback(async () => {
    try {
      const healthUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '/api/health');
      const res = await fetch(healthUrl);
      if (res.ok) {
        const data = await res.json();
        setBackendHealth(data);
      } else {
        setBackendHealth({ status: 'offline' });
      }
    } catch {
      setBackendHealth({ status: 'offline' });
    }
  }, []);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setLoadingLive(true);
    }
    setLiveError(null);

    try {
      const [summaryRes, complaintsRes] = await Promise.all([
        analyticsService.getSummary(),
        complaintService.getComplaints({ limit: 50 }),
      ]);
      setSummaryData(summaryRes);
      setLiveComplaints(Array.isArray(complaintsRes) ? complaintsRes : []);
    } catch (err) {
      console.error('Failed to load live dashboard telemetry:', err);
      setLiveError(
        err.response?.data?.detail ||
        err.message ||
        'Unable to load live telemetry from FastAPI backend.'
      );
    } finally {
      setLoadingLive(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleRefreshAll = () => {
    fetchHealth();
    fetchDashboardData(true);
  };

  useEffect(() => {
    fetchHealth();
    fetchDashboardData();
  }, [fetchHealth, fetchDashboardData]);

  // Map live complaint entities from API
  const liveMappedComplaints = useMemo(() => {
    return liveComplaints.map((item) => ({
      id: item.complaint_no,
      institution: `Institution #${item.institution_id}`,
      bureau: item.bureau,
      category: item.category,
      summary: item.subject,
      submittedDate: item.filing_date || 'N/A',
      slaDeadline: item.deadline_date || 'N/A',
      priority: item.priority || 'Medium',
      status: item.status || 'New',
      description: item.description,
      rawItem: item,
    }));
  }, [liveComplaints]);

  // Bureau options based on active data
  const bureauOptions = useMemo(() => {
    if (presentationMode === 'live' && summaryData?.bureau_distribution?.length) {
      return ['All', ...summaryData.bureau_distribution.map((b) => b.name)];
    }
    return [
      'All',
      'Approval Bureau',
      'Academic Bureau',
      'Administration Cell',
      'Finance Cell',
      'Grievance Cell',
      'Anti-Ragging Cell',
      'Faculty & Staff Cell',
    ];
  }, [presentationMode, summaryData]);

  // Filtered complaints for the dashboard table
  const filteredComplaints = useMemo(() => {
    const source = presentationMode === 'demo' ? demoComplaints : liveMappedComplaints;

    return source.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        item.id.toLowerCase().includes(q) ||
        item.institution.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);

      const matchesBureau =
        selectedBureau === 'All' || item.bureau.toLowerCase() === selectedBureau.toLowerCase();

      const matchesStatus =
        selectedStatus === 'All' || item.status.toLowerCase() === selectedStatus.toLowerCase();

      return matchesSearch && matchesBureau && matchesStatus;
    });
  }, [presentationMode, liveMappedComplaints, searchQuery, selectedBureau, selectedStatus]);

  // Monthly trends data for the chart
  const monthlyTrendsData = useMemo(() => {
    if (presentationMode === 'live' && summaryData?.monthly_trends?.length) {
      return summaryData.monthly_trends;
    }
    return demoMonthlyTrends;
  }, [presentationMode, summaryData]);

  // Bureau breakdown data for the bar chart
  const bureauStatsData = useMemo(() => {
    if (presentationMode === 'live' && summaryData?.bureau_distribution?.length) {
      return summaryData.bureau_distribution;
    }
    return demoBureauStats;
  }, [presentationMode, summaryData]);

  return (
    <div className="space-y-6 bg-white min-h-screen">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-teal-50 text-[#0F766E] border border-teal-200">
              {isInstitute ? 'Technical Institute Redressal Portal' : 'AICTE Central Command'}
            </span>
            <span className="text-[#6B7280]">•</span>
            <span className="text-xs font-mono text-[#6B7280]">
              {isInstitute ? (user?.bureau || 'Apex Institute of Technology') : 'All India Monitoring Grid'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#36454F] tracking-tight mt-1">
            {isInstitute ? 'Campus Grievance Console' : 'Complaint Intelligence Dashboard'}
          </h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {isInstitute
              ? 'Lodge institutional disputes, track redressal milestones, and interface directly with AICTE Bureaus.'
              : 'Overview of complaint cases, resolution progress, and cross-bureau overlap telemetry.'}
          </p>
        </div>

        {/* Action Button for Institute + Presentation Mode Selector & Refresh */}
        <div className="flex items-center space-x-2">
          {isInstitute && (
            <Link
              to="/complaints?action=new"
              className="inline-flex items-center space-x-2 px-3.5 py-2 bg-[#0F766E] hover:bg-[#115E59] active:bg-[#134E4A] text-white font-semibold rounded-lg text-xs transition shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Grievance to AICTE</span>
            </Link>
          )}

          <div className="inline-flex rounded-lg border border-[#E5E7EB] bg-[#F5F7F7] p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setPresentationMode('live')}
              className={`px-3 py-1.5 rounded-md transition ${
                presentationMode === 'live'
                  ? 'bg-white text-[#36454F] font-semibold shadow-sm border border-[#E5E7EB]'
                  : 'text-[#6B7280] hover:text-[#36454F]'
              }`}
            >
              Live Database
            </button>
            <button
              type="button"
              onClick={() => setPresentationMode('demo')}
              className={`px-3 py-1.5 rounded-md transition ${
                presentationMode === 'demo'
                  ? 'bg-white text-[#36454F] font-semibold shadow-sm border border-[#E5E7EB]'
                  : 'text-[#6B7280] hover:text-[#36454F]'
              }`}
            >
              Demo Set
            </button>
          </div>

          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="p-2 rounded-lg border border-[#E5E7EB] bg-white text-[#6B7280] hover:text-[#36454F] hover:bg-[#F5F7F7] transition"
            title="Refresh Dashboard Data"
            aria-label="Refresh Dashboard Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#0F766E]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Institute Institutional Affiliation Banner */}
      {isInstitute && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-teal-50 to-[#F5F7F7] border border-teal-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 rounded-lg bg-[#0F766E] text-white shrink-0 shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-[#36454F]">
                  {user?.bureau || 'Apex Institute of Technology'} (AICTE Permanent ID: 1-001)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white text-[#0F766E] border border-teal-200">
                  Affiliated Technical Institute
                </span>
              </div>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Logged in as <strong>{user?.full_name || 'Institute Grievance Officer'}</strong> ({user?.email}). You have authorized dispatch access to transmit institutional grievances directly to AICTE Central Bureaus.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <Link
              to="/complaints?action=new"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#0F766E] hover:bg-[#115E59] text-white font-medium rounded-lg text-xs transition shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch New Grievance</span>
            </Link>
          </div>
        </div>
      )}

      {/* Live Error Banner if any */}
      {liveError && presentationMode === 'live' && (
        <div className="p-3.5 rounded-xl bg-[#B91C1C]/10 border border-[#B91C1C]/25 text-[#B91C1C] flex items-start space-x-2.5 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Backend Connection Alert: </span>
            <span>{liveError}</span>
          </div>
        </div>
      )}

      {/* 2. Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Cases"
          value={
            presentationMode === 'demo'
              ? '1,248'
              : summaryData
              ? summaryData.total_complaints.toLocaleString()
              : loadingLive
              ? '...'
              : '0'
          }
          subtitle={
            presentationMode === 'demo'
              ? 'All AICTE Registered Cases'
              : summaryData
              ? `${summaryData.total_institutions} Institutions Monitored`
              : 'All Grievances Ingested'
          }
          icon={FileText}
          color="teal"
          tag={presentationMode === 'demo' ? 'SLA 94.2%' : `SLA ${summaryData?.sla_compliance_rate || 0}%`}
          to="/complaints"
        />

        <StatCard
          title="Pending Cases"
          value={
            presentationMode === 'demo'
              ? '356'
              : summaryData
              ? summaryData.active_complaints.toLocaleString()
              : loadingLive
              ? '...'
              : '0'
          }
          subtitle="Currently Active or Under Review"
          icon={Clock}
          color="amber"
          progress={
            presentationMode === 'demo'
              ? 28.5
              : summaryData?.total_complaints
              ? Math.round((summaryData.active_complaints / summaryData.total_complaints) * 100)
              : 0
          }
          to="/complaints"
        />

        <StatCard
          title="Resolved Cases"
          value={
            presentationMode === 'demo'
              ? '892'
              : summaryData
              ? summaryData.resolved_complaints.toLocaleString()
              : loadingLive
              ? '...'
              : '0'
          }
          subtitle="Successfully Redressed with Proof"
          icon={CheckCircle2}
          color="green"
          progress={
            presentationMode === 'demo'
              ? 71.5
              : summaryData?.total_complaints
              ? Math.round((summaryData.resolved_complaints / summaryData.total_complaints) * 100)
              : 0
          }
          to="/complaints"
        />

        <StatCard
          title="Overdue Cases"
          value={
            presentationMode === 'demo'
              ? '24'
              : summaryData
              ? summaryData.overdue_complaints.toLocaleString()
              : loadingLive
              ? '...'
              : '0'
          }
          subtitle="Exceeded 30-Day Turnaround SLA"
          icon={AlertTriangle}
          color="red"
          tag={presentationMode === 'demo' ? 'Requires Action' : summaryData?.overdue_complaints > 0 ? 'Urgent Review' : 'Within SLA'}
          to="/complaints"
        />
      </div>

      {/* 3. Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Area Chart */}
        <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <div>
              <h2 className="text-sm font-bold text-[#36454F] uppercase tracking-wider">
                Monthly Inflow vs. Resolution
              </h2>
              <p className="text-xs text-[#6B7280]">
                Monthly filing volume and redressal velocity
              </p>
            </div>
            <span className="text-[11px] font-medium text-[#0F766E] bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
              Council Telemetry
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F766E" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0F766E" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#15803D" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#15803D" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" stroke="#6B7280" fontSize={11} tickLine={false} />
                <YAxis stroke="#6B7280" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#374151',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  dataKey="received"
                  name="Cases Inflow"
                  stroke="#0F766E"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorReceived)"
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  name="Cases Resolved"
                  stroke="#15803D"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorResolved)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bureau Distribution Bar Chart */}
        <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <div>
              <h2 className="text-sm font-bold text-[#36454F] uppercase tracking-wider">
                Cross-Bureau Workload
              </h2>
              <p className="text-xs text-[#6B7280]">
                Active cases and SLA resolution rates by bureau/cell
              </p>
            </div>
            <Link
              to="/analytics"
              className="text-xs text-[#0F766E] font-medium hover:underline flex items-center space-x-1"
            >
              <span>Detailed</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bureauStatsData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                <XAxis type="number" stroke="#6B7280" fontSize={11} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#36454F" fontSize={11} tickLine={false} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#374151',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="active" name="Active Cases" fill="#36454F" radius={[0, 4, 4, 0]} />
                <Bar dataKey="resolved" name="Resolved Cases" fill="#0F766E" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Decision-Support Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/case-overlap"
          className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm hover:shadow hover:border-[#0F766E]/40 transition group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-[#0F766E]/10 text-[#0F766E]">
                <GitCompare className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-semibold text-[#0F766E] uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                Core Feature 1
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#36454F] group-hover:text-[#0F766E] transition">
              Case Overlap Detection
            </h3>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              TF-IDF text similarity & cross-bureau matching. Identify duplicate or related complaints.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-[#E5E7EB] flex items-center justify-between text-xs font-medium text-[#0F766E]">
            <span>Explore Matches ({summaryData?.total_overlaps || 50})</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
          </div>
        </Link>

        <Link
          to="/problem-patterns"
          className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm hover:shadow hover:border-[#36454F]/40 transition group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-[#36454F]/10 text-[#36454F]">
                <Network className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider bg-[#F5F7F7] px-2 py-0.5 rounded border border-[#E5E7EB]">
                Core Feature 2
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#36454F] group-hover:text-[#0F766E] transition">
              Problem Pattern Detector
            </h3>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Unsupervised clustering pipeline across technical institutions to discover systemic themes.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-[#E5E7EB] flex items-center justify-between text-xs font-medium text-[#36454F]">
            <span>View Clustering Grid</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
          </div>
        </Link>

        <Link
          to="/evidence-checker"
          className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm hover:shadow hover:border-[#36454F]/40 transition group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-[#36454F]/10 text-[#36454F]">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider bg-[#F5F7F7] px-2 py-0.5 rounded border border-[#E5E7EB]">
                Core Feature 3
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#36454F] group-hover:text-[#0F766E] transition">
              Evidence Relevance Checker
            </h3>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              PyMuPDF compliance verification assessing affidavit text against claimed complaint resolutions.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-[#E5E7EB] flex items-center justify-between text-xs font-medium text-[#36454F]">
            <span>Open Evidence Review</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
          </div>
        </Link>
      </div>

      {/* 5. Recent Complaints Card & Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-base font-bold text-[#36454F]">
              Recent Complaints
            </h2>
            <p className="text-xs text-[#6B7280]">
              Active grievances submitted across AICTE affiliated institutions
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/complaints"
              className="text-xs font-semibold text-[#0F766E] hover:underline flex items-center space-x-1"
            >
              <span>View all complaints</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, institution, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs text-[#374151] placeholder-[#6B7280] focus:outline-none focus:ring-1 focus:ring-[#0F766E] focus:border-[#0F766E]"
            />
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedBureau}
              onChange={(e) => setSelectedBureau(e.target.value)}
              className="py-1.5 px-3 rounded-lg border border-[#E5E7EB] bg-white text-xs text-[#374151] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
            >
              {bureauOptions.map((b) => (
                <option key={b} value={b}>
                  {b === 'All' ? 'All Bureaus' : b}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="py-1.5 px-3 rounded-lg border border-[#E5E7EB] bg-white text-xs text-[#374151] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Under Review">Under Review</option>
              <option value="Evidence Requested">Evidence Requested</option>
              <option value="Escalated">Escalated</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        {/* Table / Results */}
        {loadingLive && presentationMode === 'live' ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2 text-[#6B7280]">
            <RefreshCw className="w-5 h-5 animate-spin text-[#0F766E]" />
            <span className="text-xs">Loading live complaint cases from database...</span>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#6B7280]">
            No complaint cases found matching current search or filters.
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#E5E7EB] rounded-lg">
            <table className="w-full text-left text-xs text-[#374151]">
              <thead className="bg-[#F5F7F7] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Tracking ID</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Bureau / Cell</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Filing Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredComplaints.slice(0, 10).map((item) => (
                  <tr key={item.id} className="hover:bg-[#F5F7F7]/60 transition">
                    <td className="py-3 px-4 font-mono font-medium text-[#0F766E]">
                      {item.id}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-semibold text-[#36454F] truncate">{item.summary}</p>
                      <p className="text-[11px] text-[#6B7280] truncate">{item.institution}</p>
                    </td>
                    <td className="py-3 px-4 text-[#374151]">
                      {item.bureau}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.priority} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3 px-4 text-[#6B7280] font-mono text-[11px]">
                      {formatDate(item.submittedDate)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedCaseDetail(item)}
                        className="p-1 rounded text-[#0F766E] hover:bg-teal-50 hover:text-[#115E59] transition"
                        title="Quick View"
                        aria-label="Quick View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Case Detail Quick Inspection Modal */}
      {selectedCaseDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div>
                <span className="text-xs font-mono font-bold text-[#0F766E]">
                  {selectedCaseDetail.id}
                </span>
                <h3 className="text-base font-bold text-[#36454F] mt-0.5">
                  Case Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCaseDetail(null)}
                className="text-[#6B7280] hover:text-[#36454F] p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#374151]">
              <div>
                <span className="text-[#6B7280] block font-medium">Grievance Subject</span>
                <p className="font-semibold text-sm text-[#36454F] mt-0.5">{selectedCaseDetail.summary}</p>
              </div>

              <div>
                <span className="text-[#6B7280] block font-medium">Full Narrative Description</span>
                <p className="mt-1 p-2.5 rounded-lg bg-[#F5F7F7] border border-[#E5E7EB] text-[#374151] leading-relaxed">
                  {selectedCaseDetail.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-[#6B7280] block">Jurisdiction Bureau</span>
                  <span className="font-semibold text-[#36454F]">{selectedCaseDetail.bureau}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block">Institution</span>
                  <span className="font-semibold text-[#36454F]">{selectedCaseDetail.institution}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block">Current Status</span>
                  <StatusBadge status={selectedCaseDetail.status} />
                </div>
                <div>
                  <span className="text-[#6B7280] block">Priority Level</span>
                  <StatusBadge status={selectedCaseDetail.priority} />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setSelectedCaseDetail(null)}
                className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#6B7280] hover:bg-[#F5F7F7]"
              >
                Close
              </button>
              {selectedCaseDetail.rawItem?.id && (
                <Link
                  to={`/complaints/${selectedCaseDetail.rawItem.id}`}
                  className="px-3 py-1.5 rounded-lg bg-[#0F766E] text-white text-xs font-medium hover:bg-[#115E59] transition"
                >
                  Open Full Case File →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
