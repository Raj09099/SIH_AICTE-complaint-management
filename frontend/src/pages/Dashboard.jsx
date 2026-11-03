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
  User,
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
import { notificationService } from '../services/notifications';
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

const demoDeadlines = {
  upcoming_count: 2,
  due_today_count: 1,
  overdue_count: 3,
  total_monitored: 6,
  items: [
    {
      complaint_id: 1,
      complaint_no: 'AICTE-2026-0612',
      institution_id: 4,
      institution_name: 'Shri Ram Technical Campus',
      assigned_officer_id: 10,
      assigned_officer_name: 'Dr. S. Kumar',
      bureau: 'Faculty & Staff Cell',
      category: 'Salary Non-Payment & Arrears',
      priority: 'Critical',
      status: 'Escalated',
      deadline_date: '2026-10-28',
      days_remaining: -5,
      urgency_level: 'OVERDUE',
      pending_action: 'Immediate Redressal / Escalation Hearing',
    },
    {
      complaint_id: 2,
      complaint_no: 'AICTE-2026-0771',
      institution_id: 3,
      institution_name: 'National Engineering College',
      assigned_officer_id: null,
      assigned_officer_name: 'Unassigned',
      bureau: 'Approval Bureau',
      category: 'Laboratory Deficiencies',
      priority: 'Urgent',
      status: 'Evidence Requested',
      deadline_date: '2026-10-30',
      days_remaining: -3,
      urgency_level: 'OVERDUE',
      pending_action: 'Verify Compliance Affidavits',
    },
    {
      complaint_id: 3,
      complaint_no: 'AICTE-2026-0914',
      institution_id: 1,
      institution_name: 'Apex Institute of Technology',
      assigned_officer_id: 10,
      assigned_officer_name: 'Dr. S. Kumar',
      bureau: 'Approval Bureau',
      category: 'Arbitrary Fee Surcharges',
      priority: 'High',
      status: 'Under Review',
      deadline_date: '2026-11-02',
      days_remaining: 0,
      urgency_level: 'DUE_TODAY',
      pending_action: 'Statutory Resolution Deadline Today',
    },
    {
      complaint_id: 4,
      complaint_no: 'AICTE-2026-0842',
      institution_id: 1,
      institution_name: 'Apex Institute of Technology',
      assigned_officer_id: 20,
      assigned_officer_name: 'Prof. M. Verma',
      bureau: 'Anti-Ragging Cell',
      category: 'Hostel Harassment & Coercion',
      priority: 'Critical',
      status: 'Under Review',
      deadline_date: '2026-11-05',
      days_remaining: 3,
      urgency_level: 'UPCOMING',
      pending_action: 'Conduct Bureau Inquiry',
    },
    {
      complaint_id: 5,
      complaint_no: 'AICTE-2026-0520',
      institution_id: 2,
      institution_name: 'Greenfield Institute of Management',
      assigned_officer_id: 10,
      assigned_officer_name: 'Dr. S. Kumar',
      bureau: 'Finance & Scholarships',
      category: 'PMSSS Scholarship Withholding',
      priority: 'High',
      status: 'Under Review',
      deadline_date: '2026-11-04',
      days_remaining: 2,
      urgency_level: 'UPCOMING',
      pending_action: 'Review Verification Affidavits',
    },
    {
      complaint_id: 6,
      complaint_no: 'AICTE-2026-0419',
      institution_id: 5,
      institution_name: 'St. Xavier Polytechnic',
      assigned_officer_id: 20,
      assigned_officer_name: 'Prof. M. Verma',
      bureau: 'Grievance Cell',
      category: 'Admission Cancellation & Refund',
      priority: 'Medium',
      status: 'New',
      deadline_date: '2026-10-25',
      days_remaining: -8,
      urgency_level: 'OVERDUE',
      pending_action: 'Initial Triage & Officer Assignment',
    },
  ],
};

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

  // Automated Deadline & Reminder States
  const [deadlinesData, setDeadlinesData] = useState(null);
  const [loadingDeadlines, setLoadingDeadlines] = useState(true);
  const [deadlineFilter, setDeadlineFilter] = useState('all'); // 'all' | 'overdue' | 'due_today' | 'upcoming'
  const [deadlineSearch, setDeadlineSearch] = useState('');
  const [deadlineBureau, setDeadlineBureau] = useState('All');
  const [isTriggeringCheck, setIsTriggeringCheck] = useState(false);
  const [triggerCheckSuccess, setTriggerCheckSuccess] = useState(null);

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
      const [summaryRes, complaintsRes, deadlinesRes] = await Promise.all([
        analyticsService.getSummary(),
        complaintService.getComplaints({ limit: 50 }),
        notificationService.getDeadlines().catch((err) => {
          console.warn('Unable to load deadlines telemetry:', err);
          return null;
        }),
      ]);
      setSummaryData(summaryRes);
      setLiveComplaints(Array.isArray(complaintsRes) ? complaintsRes : []);
      if (deadlinesRes) {
        setDeadlinesData(deadlinesRes);
      }
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

  // Active deadlines dataset (live or demo)
  const activeDeadlines = useMemo(() => {
    if (presentationMode === 'demo') return demoDeadlines;
    return deadlinesData || demoDeadlines;
  }, [presentationMode, deadlinesData]);

  // Filtered deadline monitored items
  const filteredDeadlineItems = useMemo(() => {
    let list = activeDeadlines?.items || [];

    if (deadlineFilter === 'overdue') {
      list = list.filter((it) => it.urgency_level === 'OVERDUE');
    } else if (deadlineFilter === 'due_today') {
      list = list.filter((it) => it.urgency_level === 'DUE_TODAY');
    } else if (deadlineFilter === 'upcoming') {
      list = list.filter((it) => it.urgency_level === 'UPCOMING');
    }

    if (deadlineBureau !== 'All') {
      list = list.filter((it) => it.bureau.toLowerCase() === deadlineBureau.toLowerCase());
    }

    if (deadlineSearch.trim()) {
      const q = deadlineSearch.trim().toLowerCase();
      list = list.filter(
        (it) =>
          it.complaint_no.toLowerCase().includes(q) ||
          it.institution_name.toLowerCase().includes(q) ||
          (it.assigned_officer_name && it.assigned_officer_name.toLowerCase().includes(q)) ||
          it.category.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeDeadlines, deadlineFilter, deadlineBureau, deadlineSearch]);

  const handleTriggerDeadlineCheck = async () => {
    setIsTriggeringCheck(true);
    setTriggerCheckSuccess(null);
    try {
      const res = await notificationService.triggerCheck();
      setTriggerCheckSuccess(
        `Automated check executed: ${res.processed} complaints evaluated, ${res.new_notifications_created} reminder alert(s) dispatched.`
      );
      const refreshed = await notificationService.getDeadlines();
      setDeadlinesData(refreshed);
      setTimeout(() => setTriggerCheckSuccess(null), 6000);
    } catch (err) {
      console.error('Failed to trigger deadline check:', err);
    } finally {
      setIsTriggeringCheck(false);
    }
  };

  return (
    <div className="space-y-6 bg-white min-h-screen">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#D9DEE3]">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-teal-50 text-[#087F75] border border-teal-200">
              {isInstitute ? 'Technical Institute Redressal Portal' : 'AICTE Central Command'}
            </span>
            <span className="text-[#718096]">•</span>
            <span className="text-xs font-mono text-[#718096]">
              {isInstitute ? (user?.bureau || 'Apex Institute of Technology') : 'All India Monitoring Grid'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#263746] tracking-tight mt-1">
            {isInstitute ? 'Campus Grievance Console' : 'Complaint Intelligence Dashboard'}
          </h1>
          <p className="text-sm text-[#718096] mt-0.5">
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
              className="inline-flex items-center space-x-2 px-3.5 py-2 bg-[#087F75] hover:bg-[#115E59] active:bg-[#134E4A] text-white font-semibold rounded-lg text-xs transition shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Grievance to AICTE</span>
            </Link>
          )}

          <div className="inline-flex rounded-lg border border-[#D9DEE3] bg-[#F5F7F7] p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setPresentationMode('live')}
              className={`px-3 py-1.5 rounded-md transition ${
                presentationMode === 'live'
                  ? 'bg-white text-[#263746] font-semibold shadow-sm border border-[#D9DEE3]'
                  : 'text-[#718096] hover:text-[#263746]'
              }`}
            >
              Live Database
            </button>
            <button
              type="button"
              onClick={() => setPresentationMode('demo')}
              className={`px-3 py-1.5 rounded-md transition ${
                presentationMode === 'demo'
                  ? 'bg-white text-[#263746] font-semibold shadow-sm border border-[#D9DEE3]'
                  : 'text-[#718096] hover:text-[#263746]'
              }`}
            >
              Demo Set
            </button>
          </div>

          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="p-2 rounded-lg border border-[#D9DEE3] bg-white text-[#718096] hover:text-[#263746] hover:bg-[#F5F7F7] transition"
            title="Refresh Dashboard Data"
            aria-label="Refresh Dashboard Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#087F75]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Institute Institutional Affiliation Banner */}
      {isInstitute && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-teal-50 to-[#F5F7F7] border border-teal-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 rounded-lg bg-[#087F75] text-white shrink-0 shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-[#263746]">
                  {user?.bureau || 'Apex Institute of Technology'} (AICTE Permanent ID: 1-001)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white text-[#087F75] border border-teal-200">
                  Affiliated Technical Institute
                </span>
              </div>
              <p className="text-xs text-[#718096] mt-0.5">
                Logged in as <strong>{user?.full_name || 'Institute Grievance Officer'}</strong> ({user?.email}). You have authorized dispatch access to transmit institutional grievances directly to AICTE Central Bureaus.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <Link
              to="/complaints?action=new"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#087F75] hover:bg-[#115E59] text-white font-medium rounded-lg text-xs transition shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch New Grievance</span>
            </Link>
          </div>
        </div>
      )}

      {/* Live Error Banner if any */}
      {liveError && presentationMode === 'live' && (
        <div className="p-3.5 rounded-xl bg-[#DC3545]/10 border border-[#DC3545]/25 text-[#DC3545] flex items-start space-x-2.5 text-xs">
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
        <div className="bg-white rounded-xl p-5 border border-[#D9DEE3] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#D9DEE3]">
            <div>
              <h2 className="text-sm font-bold text-[#263746] uppercase tracking-wider">
                Monthly Inflow vs. Resolution
              </h2>
              <p className="text-xs text-[#718096]">
                Monthly filing volume and redressal velocity
              </p>
            </div>
            <span className="text-[11px] font-medium text-[#087F75] bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
              Council Telemetry
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#087F75" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#087F75" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#198754" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#198754" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" stroke="#718096" fontSize={11} tickLine={false} />
                <YAxis stroke="#718096" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D9DEE3',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#263746',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  dataKey="received"
                  name="Cases Inflow"
                  stroke="#087F75"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorReceived)"
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  name="Cases Resolved"
                  stroke="#198754"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorResolved)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bureau Distribution Bar Chart */}
        <div className="bg-white rounded-xl p-5 border border-[#D9DEE3] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#D9DEE3]">
            <div>
              <h2 className="text-sm font-bold text-[#263746] uppercase tracking-wider">
                Cross-Bureau Workload
              </h2>
              <p className="text-xs text-[#718096]">
                Active cases and SLA resolution rates by bureau/cell
              </p>
            </div>
            <Link
              to="/analytics"
              className="text-xs text-[#087F75] font-medium hover:underline flex items-center space-x-1"
            >
              <span>Detailed</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bureauStatsData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                <XAxis type="number" stroke="#718096" fontSize={11} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#263746" fontSize={11} tickLine={false} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D9DEE3',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#263746',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="active" name="Active Cases" fill="#263746" radius={[0, 4, 4, 0]} />
                <Bar dataKey="resolved" name="Resolved Cases" fill="#087F75" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Decision-Support Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/case-overlap"
          className="bg-white rounded-xl p-4 border border-[#D9DEE3] shadow-sm hover:shadow hover:border-[#087F75]/40 transition group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-[#087F75]/10 text-[#087F75]">
                <GitCompare className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-semibold text-[#087F75] uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                Core Feature 1
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#263746] group-hover:text-[#087F75] transition">
              Case Overlap Detection
            </h3>
            <p className="text-xs text-[#718096] leading-relaxed">
              TF-IDF text similarity & cross-bureau matching. Identify duplicate or related complaints.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-[#D9DEE3] flex items-center justify-between text-xs font-medium text-[#087F75]">
            <span>Explore Matches ({summaryData?.total_overlaps || 50})</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
          </div>
        </Link>

        <Link
          to="/problem-patterns"
          className="bg-white rounded-xl p-4 border border-[#D9DEE3] shadow-sm hover:shadow hover:border-[#263746]/40 transition group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-[#263746]/10 text-[#263746]">
                <Network className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-semibold text-[#718096] uppercase tracking-wider bg-[#F5F7F7] px-2 py-0.5 rounded border border-[#D9DEE3]">
                Core Feature 2
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#263746] group-hover:text-[#087F75] transition">
              Problem Pattern Detector
            </h3>
            <p className="text-xs text-[#718096] leading-relaxed">
              Unsupervised clustering pipeline across technical institutions to discover systemic themes.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-[#D9DEE3] flex items-center justify-between text-xs font-medium text-[#263746]">
            <span>View Clustering Grid</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
          </div>
        </Link>

        <Link
          to="/evidence-checker"
          className="bg-white rounded-xl p-4 border border-[#D9DEE3] shadow-sm hover:shadow hover:border-[#263746]/40 transition group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-[#263746]/10 text-[#263746]">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-semibold text-[#718096] uppercase tracking-wider bg-[#F5F7F7] px-2 py-0.5 rounded border border-[#D9DEE3]">
                Core Feature 3
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#263746] group-hover:text-[#087F75] transition">
              Evidence Relevance Checker
            </h3>
            <p className="text-xs text-[#718096] leading-relaxed">
              PyMuPDF compliance verification assessing affidavit text against claimed complaint resolutions.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-[#D9DEE3] flex items-center justify-between text-xs font-medium text-[#263746]">
            <span>Open Evidence Review</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
          </div>
        </Link>
      </div>

      {/* 5. Automatic Reminder & Deadline Management Section */}
      <div className="bg-white rounded-xl border border-[#D9DEE3] shadow-sm p-5 space-y-5">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#D9DEE3]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded-md bg-teal-50 text-[#087F75] border border-teal-200">
                <Clock className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-[#263746]">
                Automatic Reminder & Statutory Deadline Grid
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-[#198754] border border-emerald-200">
                APScheduler Active
              </span>
            </div>
            <p className="text-xs text-[#718096] mt-0.5">
              Automated hourly evaluation tracking 3-day approaching deadlines, due-today cases, and daily overdue escalations.
            </p>
          </div>

          {!isInstitute && (
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={handleTriggerDeadlineCheck}
                disabled={isTriggeringCheck}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#087F75] hover:bg-[#06635c] text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-60"
                title="Execute manual check and generate reminders"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTriggeringCheck ? 'animate-spin' : ''}`} />
                <span>{isTriggeringCheck ? 'Checking Deadlines...' : 'Run Deadline Check Now'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Trigger check success notification alert */}
        {triggerCheckSuccess && (
          <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-[#087F75] text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#087F75]" />
            <span>{triggerCheckSuccess}</span>
          </div>
        )}

        {/* 3 Deadline Telemetry Cards: Upcoming, Due Today, Overdue */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Upcoming Deadlines (3-Day Window) */}
          <div
            onClick={() => setDeadlineFilter(deadlineFilter === 'upcoming' ? 'all' : 'upcoming')}
            className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between shadow-xs ${
              deadlineFilter === 'upcoming'
                ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-300'
                : 'bg-white hover:bg-[#F5F7F7] border-[#D9DEE3]'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-xs text-[#D97736] font-semibold">
                <Clock className="w-4 h-4" />
                <span>Upcoming Deadlines</span>
              </div>
              <div className="text-2xl font-bold text-[#263746]">
                {activeDeadlines?.upcoming_count || 0}
              </div>
              <p className="text-[11px] text-[#718096]">Due within 1–3 days • Notice Sent</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-[#D97736] border border-amber-200">
              3-Day Notice
            </span>
          </div>

          {/* Card 2: Due Today */}
          <div
            onClick={() => setDeadlineFilter(deadlineFilter === 'due_today' ? 'all' : 'due_today')}
            className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between shadow-xs ${
              deadlineFilter === 'due_today'
                ? 'bg-orange-50/70 border-orange-400 ring-2 ring-orange-300'
                : 'bg-white hover:bg-[#F5F7F7] border-[#D9DEE3]'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-xs text-orange-600 font-semibold">
                <AlertCircle className="w-4 h-4" />
                <span>Due Today</span>
              </div>
              <div className="text-2xl font-bold text-[#263746]">
                {activeDeadlines?.due_today_count || 0}
              </div>
              <p className="text-[11px] text-[#718096]">Statutory SLA expires today</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
              Immediate
            </span>
          </div>

          {/* Card 3: Overdue Complaints */}
          <div
            onClick={() => setDeadlineFilter(deadlineFilter === 'overdue' ? 'all' : 'overdue')}
            className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between shadow-xs ${
              deadlineFilter === 'overdue'
                ? 'bg-red-50/70 border-red-400 ring-2 ring-red-300'
                : 'bg-white hover:bg-[#F5F7F7] border-[#D9DEE3]'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-xs text-[#DC3545] font-semibold">
                <AlertTriangle className="w-4 h-4" />
                <span>Overdue Complaints</span>
              </div>
              <div className="text-2xl font-bold text-[#DC3545]">
                {activeDeadlines?.overdue_count || 0}
              </div>
              <p className="text-[11px] text-[#718096]">Exceeded SLA • Daily alerts active</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-50 text-[#DC3545] border border-red-200">
              Breached
            </span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Filter Pills */}
          <div className="inline-flex rounded-lg border border-[#D9DEE3] bg-[#F5F7F7] p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setDeadlineFilter('all')}
              className={`px-3 py-1 rounded-md transition ${
                deadlineFilter === 'all'
                  ? 'bg-white text-[#263746] font-semibold shadow-xs border border-[#D9DEE3]'
                  : 'text-[#718096] hover:text-[#263746]'
              }`}
            >
              All Deadlines ({activeDeadlines?.total_monitored || 0})
            </button>
            <button
              type="button"
              onClick={() => setDeadlineFilter('overdue')}
              className={`px-3 py-1 rounded-md transition ${
                deadlineFilter === 'overdue'
                  ? 'bg-white text-[#DC3545] font-semibold shadow-xs border border-red-200'
                  : 'text-[#718096] hover:text-[#DC3545]'
              }`}
            >
              Overdue ({activeDeadlines?.overdue_count || 0})
            </button>
            <button
              type="button"
              onClick={() => setDeadlineFilter('due_today')}
              className={`px-3 py-1 rounded-md transition ${
                deadlineFilter === 'due_today'
                  ? 'bg-white text-orange-700 font-semibold shadow-xs border border-orange-200'
                  : 'text-[#718096] hover:text-orange-700'
              }`}
            >
              Due Today ({activeDeadlines?.due_today_count || 0})
            </button>
            <button
              type="button"
              onClick={() => setDeadlineFilter('upcoming')}
              className={`px-3 py-1 rounded-md transition ${
                deadlineFilter === 'upcoming'
                  ? 'bg-white text-[#D97736] font-semibold shadow-xs border border-amber-200'
                  : 'text-[#718096] hover:text-[#D97736]'
              }`}
            >
              Approaching 3 Days ({activeDeadlines?.upcoming_count || 0})
            </button>
          </div>

          {/* Search & Bureau Dropdown */}
          <div className="flex items-center space-x-2 flex-1 sm:flex-initial min-w-[240px]">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-[#718096] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search case, institution, officer..."
                value={deadlineSearch}
                onChange={(e) => setDeadlineSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#D9DEE3] text-xs text-[#263746] placeholder-[#718096] focus:outline-none focus:ring-1 focus:ring-[#087F75]"
              />
            </div>
            <select
              value={deadlineBureau}
              onChange={(e) => setDeadlineBureau(e.target.value)}
              className="py-1.5 px-2.5 rounded-lg border border-[#D9DEE3] bg-white text-xs text-[#263746] focus:outline-none focus:ring-1 focus:ring-[#087F75]"
            >
              {bureauOptions.map((b) => (
                <option key={b} value={b}>
                  {b === 'All' ? 'All Bureaus' : b}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Deadline Monitoring Table */}
        {filteredDeadlineItems.length === 0 ? (
          <div className="p-8 text-center border border-[#D9DEE3] rounded-lg bg-[#F5F7F7]/50 text-xs text-[#718096] space-y-1">
            <CheckCircle2 className="w-5 h-5 text-[#198754] mx-auto mb-1" />
            <p className="font-semibold text-[#263746]">No cases match this deadline filter.</p>
            <p className="text-[11px]">All tracked complaint cases in this category are compliant.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#D9DEE3] rounded-lg">
            <table className="w-full text-left text-xs text-[#263746]">
              <thead className="bg-[#F5F7F7] border-b border-[#D9DEE3] text-[11px] font-semibold text-[#718096] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Tracking No</th>
                  <th className="py-3 px-4">Referenced Institution</th>
                  <th className="py-3 px-4">Assigned Officer</th>
                  <th className="py-3 px-4">Bureau / Cell</th>
                  <th className="py-3 px-4">Statutory Deadline</th>
                  <th className="py-3 px-4">SLA Days Remaining</th>
                  <th className="py-3 px-4">Pending Statutory Action</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9DEE3]">
                {filteredDeadlineItems.map((c) => {
                  const isOverdue = c.days_remaining < 0;
                  const isDueToday = c.days_remaining === 0;
                  const isUpcoming = c.days_remaining > 0 && c.days_remaining <= 3;

                  return (
                    <tr key={c.complaint_id || c.complaint_no} className="hover:bg-[#F5F7F7]/70 transition">
                      {/* Complaint ID */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-[#087F75]">
                        <Link
                          to={`/complaints/${c.complaint_id}`}
                          className="hover:underline flex items-center space-x-1"
                        >
                          <span>{c.complaint_no}</span>
                        </Link>
                      </td>

                      {/* Institution */}
                      <td className="py-3 px-4 max-w-[180px]">
                        <p className="font-semibold text-[#263746] truncate" title={c.institution_name}>
                          {c.institution_name}
                        </p>
                        <p className="text-[10px] text-[#718096]">ID #{c.institution_id}</p>
                      </td>

                      {/* Assigned Officer */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {c.assigned_officer_name && c.assigned_officer_name !== 'Unassigned' ? (
                          <span className="font-medium text-[#263746] flex items-center space-x-1">
                            <User className="w-3.5 h-3.5 text-[#087F75]" />
                            <span>{c.assigned_officer_name}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-[#718096] border border-slate-200">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Bureau */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-white text-[11px] font-medium text-[#263746] border border-[#D9DEE3]">
                          {c.bureau}
                        </span>
                      </td>

                      {/* Deadline Date */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-[#263746]">
                        {formatDate(c.deadline_date)}
                      </td>

                      {/* Days Remaining & Warning Badges */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isOverdue ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-red-50 text-[#DC3545] border border-red-200 font-bold text-[10px] font-mono">
                            <AlertTriangle className="w-3 h-3 text-[#DC3545]" />
                            <span>Overdue by {Math.abs(c.days_remaining)}d</span>
                          </span>
                        ) : isDueToday ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-bold text-[10px] font-mono">
                            <AlertCircle className="w-3 h-3 text-orange-600" />
                            <span>Due Today</span>
                          </span>
                        ) : isUpcoming ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-[#D97736] border border-amber-200 font-bold text-[10px] font-mono">
                            <Clock className="w-3 h-3 text-[#D97736]" />
                            <span>{c.days_remaining}d remaining</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-teal-50 text-[#087F75] border border-teal-200 font-medium text-[10px] font-mono">
                            <span>{c.days_remaining}d remaining</span>
                          </span>
                        )}
                      </td>

                      {/* Pending Statutory Action */}
                      <td className="py-3 px-4 max-w-[200px]">
                        <span className="text-[11px] font-medium text-[#263746] bg-[#F5F7F7] px-2 py-0.5 rounded border border-[#D9DEE3] truncate block" title={c.pending_action}>
                          {c.pending_action}
                        </span>
                      </td>

                      {/* Inspect Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Link
                          to={`/complaints/${c.complaint_id}`}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-white hover:bg-[#F5F7F7] text-[#087F75] border border-[#D9DEE3] text-xs font-semibold transition"
                          title="Inspect Complaint"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Recent Complaints Card & Table */}
      <div className="bg-white rounded-xl border border-[#D9DEE3] shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#D9DEE3]">
          <div>
            <h2 className="text-base font-bold text-[#263746]">
              Recent Complaints
            </h2>
            <p className="text-xs text-[#718096]">
              Active grievances submitted across AICTE affiliated institutions
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/complaints"
              className="text-xs font-semibold text-[#087F75] hover:underline flex items-center space-x-1"
            >
              <span>View all complaints</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-[#718096] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, institution, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#D9DEE3] text-xs text-[#263746] placeholder-[#718096] focus:outline-none focus:ring-1 focus:ring-[#087F75] focus:border-[#087F75]"
            />
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedBureau}
              onChange={(e) => setSelectedBureau(e.target.value)}
              className="py-1.5 px-3 rounded-lg border border-[#D9DEE3] bg-white text-xs text-[#263746] focus:outline-none focus:ring-1 focus:ring-[#087F75]"
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
              className="py-1.5 px-3 rounded-lg border border-[#D9DEE3] bg-white text-xs text-[#263746] focus:outline-none focus:ring-1 focus:ring-[#087F75]"
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
          <div className="py-12 flex flex-col items-center justify-center space-y-2 text-[#718096]">
            <RefreshCw className="w-5 h-5 animate-spin text-[#087F75]" />
            <span className="text-xs">Loading live complaint cases from database...</span>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#718096]">
            No complaint cases found matching current search or filters.
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#D9DEE3] rounded-lg">
            <table className="w-full text-left text-xs text-[#263746]">
              <thead className="bg-[#F5F7F7] border-b border-[#D9DEE3] text-[11px] font-semibold text-[#718096] uppercase tracking-wider">
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
              <tbody className="divide-y divide-[#D9DEE3]">
                {filteredComplaints.slice(0, 10).map((item) => (
                  <tr key={item.id} className="hover:bg-[#F5F7F7]/60 transition">
                    <td className="py-3 px-4 font-mono font-medium text-[#087F75]">
                      {item.id}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-semibold text-[#263746] truncate">{item.summary}</p>
                      <p className="text-[11px] text-[#718096] truncate">{item.institution}</p>
                    </td>
                    <td className="py-3 px-4 text-[#263746]">
                      {item.bureau}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.priority} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3 px-4 text-[#718096] font-mono text-[11px]">
                      {formatDate(item.submittedDate)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedCaseDetail(item)}
                        className="p-1 rounded text-[#087F75] hover:bg-teal-50 hover:text-[#115E59] transition"
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
          <div className="bg-white rounded-xl border border-[#D9DEE3] shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9DEE3]">
              <div>
                <span className="text-xs font-mono font-bold text-[#087F75]">
                  {selectedCaseDetail.id}
                </span>
                <h3 className="text-base font-bold text-[#263746] mt-0.5">
                  Case Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCaseDetail(null)}
                className="text-[#718096] hover:text-[#263746] p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#263746]">
              <div>
                <span className="text-[#718096] block font-medium">Grievance Subject</span>
                <p className="font-semibold text-sm text-[#263746] mt-0.5">{selectedCaseDetail.summary}</p>
              </div>

              <div>
                <span className="text-[#718096] block font-medium">Full Narrative Description</span>
                <p className="mt-1 p-2.5 rounded-lg bg-[#F5F7F7] border border-[#D9DEE3] text-[#263746] leading-relaxed">
                  {selectedCaseDetail.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-[#718096] block">Jurisdiction Bureau</span>
                  <span className="font-semibold text-[#263746]">{selectedCaseDetail.bureau}</span>
                </div>
                <div>
                  <span className="text-[#718096] block">Institution</span>
                  <span className="font-semibold text-[#263746]">{selectedCaseDetail.institution}</span>
                </div>
                <div>
                  <span className="text-[#718096] block">Current Status</span>
                  <StatusBadge status={selectedCaseDetail.status} />
                </div>
                <div>
                  <span className="text-[#718096] block">Priority Level</span>
                  <StatusBadge status={selectedCaseDetail.priority} />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#D9DEE3] flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setSelectedCaseDetail(null)}
                className="px-3 py-1.5 rounded-lg border border-[#D9DEE3] text-xs font-medium text-[#718096] hover:bg-[#F5F7F7]"
              >
                Close
              </button>
              {selectedCaseDetail.rawItem?.id && (
                <Link
                  to={`/complaints/${selectedCaseDetail.rawItem.id}`}
                  className="px-3 py-1.5 rounded-lg bg-[#087F75] text-white text-xs font-medium hover:bg-[#115E59] transition"
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
