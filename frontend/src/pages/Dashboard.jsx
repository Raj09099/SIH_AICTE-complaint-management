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
  Sparkles,
  Database,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert,
  Calendar,
} from 'lucide-react';
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

// Sample demonstration dataset for SIH presentation
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
    hoursRemaining: 48,
    priority: 'Critical',
    status: 'Under Review',
    aiFlag: 'High Overlap (91%)',
    aiFlagType: 'cyan',
    relatedCaseId: 'AICTE-2026-0914',
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
    hoursRemaining: 120,
    priority: 'High',
    status: 'Under Review',
    aiFlag: 'High Overlap (91%)',
    aiFlagType: 'cyan',
    relatedCaseId: 'AICTE-2026-0842',
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
    hoursRemaining: 18,
    priority: 'Urgent',
    status: 'Evidence Requested',
    aiFlag: 'Evidence Submitted (92%)',
    aiFlagType: 'teal',
    relatedCaseId: null,
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
    hoursRemaining: -4, // Overdue
    priority: 'Critical',
    status: 'Escalated',
    aiFlag: 'Pattern Cluster #4',
    aiFlagType: 'amber',
    relatedCaseId: null,
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
    hoursRemaining: -48,
    priority: 'High',
    status: 'Under Review',
    aiFlag: 'Pattern Cluster #2',
    aiFlagType: 'amber',
    relatedCaseId: null,
    description: 'Institutional delay in crediting Prime Minister Special Scholarship Scheme stipend to eligible scholars.',
  },
  {
    id: 'AICTE-2026-0419',
    institution: 'St. Xavier Polytechnic',
    state: 'Kerala',
    bureau: 'PGRC Central Cell',
    category: 'Admission Cancellation & Refund',
    summary: 'Refusal to refund security deposit after student admission withdrawal before official cut-off date.',
    submittedDate: '2026-09-28',
    slaDeadline: '2026-10-18',
    hoursRemaining: 0,
    priority: 'Medium',
    status: 'Resolved',
    aiFlag: 'Resolved with Proof',
    aiFlagType: 'emerald',
    relatedCaseId: null,
    description: 'Refusal to refund security deposit after student admission withdrawal before official cut-off date.',
  },
];

// Inflow & resolution historical trend data for Demo mode
const demoMonthlyTrendData = [
  { month: 'May', received: 112, resolved: 98, overlaps: 8 },
  { month: 'Jun', received: 145, resolved: 130, overlaps: 14 },
  { month: 'Jul', received: 210, resolved: 185, overlaps: 22 },
  { month: 'Aug', received: 198, resolved: 176, overlaps: 19 },
  { month: 'Sep', received: 245, resolved: 210, overlaps: 28 },
  { month: 'Oct', received: 268, resolved: 232, overlaps: 42 },
];

// Bureau distribution data for Demo mode
const demoBureauStatsData = [
  { name: 'Approval Bureau', active: 114, resolved: 310, slaOnTime: 94 },
  { name: 'PGRC Central Cell', active: 98, resolved: 280, slaOnTime: 92 },
  { name: 'Anti-Ragging Cell', active: 46, resolved: 120, slaOnTime: 98 },
  { name: 'Faculty & Staff', active: 62, resolved: 95, slaOnTime: 86 },
  { name: 'Finance & Schol.', active: 36, resolved: 87, slaOnTime: 91 },
];

export function Dashboard() {
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

  const fetchHealth = () => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setBackendHealth(data);
      })
      .catch(() => {
        setBackendHealth({ status: 'offline' });
      });
  };

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
  }, [fetchDashboardData]);

  // Map live complaint entities from API into dashboard table format
  const liveMappedComplaints = useMemo(() => {
    return liveComplaints.map((item) => {
      const deadline = item.deadline_date ? new Date(item.deadline_date) : null;
      let hoursRemaining = 0;
      if (deadline && !isNaN(deadline.getTime())) {
        hoursRemaining = Math.round((deadline.getTime() - Date.now()) / (1000 * 60 * 60));
      }
      const isOverdue = hoursRemaining < 0;

      return {
        id: item.complaint_no,
        institution: `Institution #${item.institution_id}`,
        state: 'AICTE Redressal Grid',
        bureau: item.bureau,
        category: item.category,
        summary: item.subject,
        submittedDate: item.filing_date || 'N/A',
        slaDeadline: item.deadline_date || 'N/A',
        hoursRemaining,
        priority: item.priority || 'Medium',
        status: item.status || 'New',
        aiFlag: item.is_escalated
          ? 'Escalated Priority'
          : item.status === 'Resolved'
          ? 'Resolved with Proof'
          : isOverdue
          ? 'Overdue SLA Alert'
          : 'Telemetry Monitored',
        aiFlagType: item.is_escalated
          ? 'amber'
          : item.status === 'Resolved'
          ? 'emerald'
          : isOverdue
          ? 'amber'
          : 'cyan',
        relatedCaseId: null,
        description: item.description,
        complainantType: item.complainant_type,
        rawItem: item,
      };
    });
  }, [liveComplaints]);

  // Bureau options dynamically based on available data
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
      'PGRC Central Cell',
      'Faculty & Staff Cell',
    ];
  }, [presentationMode, summaryData]);

  // Filtered complaints for the dashboard table
  const filteredComplaints = useMemo(() => {
    const source = presentationMode === 'demo' ? demoComplaints : liveMappedComplaints;

    return source.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        (item.id && item.id.toLowerCase().includes(q)) ||
        (item.institution && item.institution.toLowerCase().includes(q)) ||
        (item.summary && item.summary.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.bureau && item.bureau.toLowerCase().includes(q));

      const matchesBureau =
        selectedBureau === 'All' ||
        (item.bureau && item.bureau.toLowerCase().includes(selectedBureau.toLowerCase())) ||
        (item.bureau && selectedBureau.toLowerCase().includes(item.bureau.toLowerCase()));

      const matchesStatus =
        selectedStatus === 'All' ||
        (item.status && item.status.toLowerCase() === selectedStatus.toLowerCase());

      return matchesSearch && matchesBureau && matchesStatus;
    });
  }, [presentationMode, liveMappedComplaints, searchQuery, selectedBureau, selectedStatus]);

  return (
    <div className="space-y-6">
      {/* Institutional Top Control Bar */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800/90 shadow-xl flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Ministry of Education • Govt. of India
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs font-mono text-slate-400">SIH-26264 Integrated Redressal Grid</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white mt-1">
            AICTE Cross-Bureau Complaint Intelligence Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Real-time multi-bureau grievance telemetry, automated NLP case overlap resolution, systemic clustering, and resolution affidavit verification.
          </p>
        </div>

        {/* Controls: Presentation Mode Selector & Health Status */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Switcher */}
          <div className="flex items-center bg-[#07101e] p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setPresentationMode('demo')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                presentationMode === 'demo'
                  ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-slate-950 font-semibold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>SIH Demo Mode</span>
            </button>
            <button
              type="button"
              onClick={() => setPresentationMode('live')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                presentationMode === 'live'
                  ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-slate-950 font-semibold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Live Database Mode</span>
            </button>
          </div>

          {/* Backend Status Chip */}
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-2 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                backendHealth?.status === 'ok' ? 'bg-cyan-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-300">
              API: {backendHealth?.status === 'ok' ? 'FastAPI Grid Connected' : 'Offline / Checking'}
            </span>
            <button
              type="button"
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              className="p-1 text-slate-500 hover:text-cyan-400 transition ml-1"
              title="Refresh API Health & Telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Mode Explanation Banner */}
      {presentationMode === 'demo' ? (
        <div className="glass-panel p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <p className="font-semibold text-cyan-200">
                SIH Presentation Demo Mode Active
              </p>
              <p className="text-slate-400 text-[11px]">
                Showing representative multi-bureau grievance data, AI cross-bureau overlap detection telemetry, and clustering models for jury evaluation.
              </p>
            </div>
          </div>
          <span className="shrink-0 self-start sm:self-auto px-2.5 py-1 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-semibold">
            SYNTHETIC DEMO SET
          </span>
        </div>
      ) : (
        <div className="glass-panel p-3.5 rounded-xl border border-teal-500/30 bg-teal-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 shrink-0">
              <Database className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <p className="font-semibold text-teal-200">
                  Live Database Telemetry (PostgreSQL Supabase Connected)
                </p>
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
              </div>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Displaying live metrics from FastAPI endpoint <code>/api/v1/analytics/summary</code>. Database contains{' '}
                <strong className="text-teal-300">{summaryData?.total_complaints ?? 0}</strong> complaints across{' '}
                <strong className="text-teal-300">{summaryData?.total_institutions ?? 0}</strong> institutions with{' '}
                <strong className="text-teal-300">{summaryData?.active_complaints ?? 0}</strong> active grievances.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              className="px-2.5 py-1 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center space-x-1"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Refresh Telemetry</span>
            </button>
            <button
              type="button"
              onClick={() => setPresentationMode('demo')}
              className="px-3 py-1 rounded text-[11px] font-medium bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition font-semibold"
            >
              Switch to Demo Dataset
            </button>
          </div>
        </div>
      )}

      {/* Primary KPI Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monitored Grievances"
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
              ? '892 Resolved • 356 Active'
              : summaryData
              ? `${summaryData.resolved_complaints} Resolved • ${summaryData.active_complaints} Active`
              : 'Loading telemetry...'
          }
          icon={FileText}
          color="cyan"
          trend={presentationMode === 'demo' ? '+8.4%' : `${summaryData?.total_institutions || 0} Colleges`}
          trendType="up"
          progress={
            presentationMode === 'demo'
              ? 71.5
              : summaryData?.total_complaints
              ? Math.round((summaryData.resolved_complaints / summaryData.total_complaints) * 100)
              : 0
          }
          tag={presentationMode === 'demo' ? 'SLA 94.2%' : `SLA ${summaryData?.sla_compliance_rate || 0}%`}
          to="/complaints"
        />
        <StatCard
          title="Cross-Bureau Overlaps"
          value={
            presentationMode === 'demo'
              ? '42'
              : summaryData
              ? summaryData.total_overlaps.toString()
              : '0'
          }
          subtitle={
            presentationMode === 'demo'
              ? '18 High Confidence (>85%)'
              : summaryData && summaryData.total_overlaps > 0
              ? `${summaryData.high_confidence_overlaps} High Confidence`
              : 'Engine Ready • Standby'
          }
          icon={GitCompare}
          color="teal"
          trend={presentationMode === 'demo' ? '+12%' : '0 Pending'}
          trendType="up"
          progress={presentationMode === 'demo' ? 85 : summaryData?.total_overlaps > 0 ? 100 : 0}
          tag={presentationMode === 'demo' ? 'Saves ~310 Hrs' : summaryData?.total_overlaps > 0 ? `${summaryData.total_overlaps} Pairs` : 'TF-IDF Ready'}
          to="/case-overlap"
        />
        <StatCard
          title="Systemic Problem Patterns"
          value={
            presentationMode === 'demo'
              ? '6'
              : summaryData
              ? summaryData.total_patterns.toString()
              : '0'
          }
          subtitle={
            presentationMode === 'demo'
              ? 'Affecting 38 Institutions'
              : summaryData && summaryData.total_patterns > 0
              ? `Affecting ${summaryData.institutions_affected_by_patterns} Colleges`
              : 'Clustering Engine Standby'
          }
          icon={Network}
          color="amber"
          trend={presentationMode === 'demo' ? '2 Escalated' : '0 Escalated'}
          trendType="down"
          progress={presentationMode === 'demo' ? 60 : summaryData?.total_patterns > 0 ? 100 : 0}
          tag={presentationMode === 'demo' ? '7 States' : summaryData?.total_patterns > 0 ? 'Active' : 'ML Standby'}
          to="/problem-patterns"
        />
        <StatCard
          title="Evidence Verified"
          value={
            presentationMode === 'demo'
              ? '88.4%'
              : summaryData && summaryData.evidence_total > 0
              ? `${summaryData.evidence_verification_rate}%`
              : '0%'
          }
          subtitle={
            presentationMode === 'demo'
              ? '142 Affidavits PyMuPDF Checked'
              : summaryData && summaryData.evidence_total > 0
              ? `${summaryData.evidence_verified_count} Affidavits Verified`
              : 'PyMuPDF Parser Ready'
          }
          icon={FileCheck2}
          color="purple"
          trend={presentationMode === 'demo' ? '+5.1%' : 'Ready'}
          trendType="up"
          progress={
            presentationMode === 'demo'
              ? 88.4
              : summaryData?.evidence_verification_rate || 0
          }
          tag={presentationMode === 'demo' ? 'NLP Scored' : summaryData && summaryData.evidence_total > 0 ? 'NLP Scored' : 'Parser Ready'}
          to="/evidence-checker"
        />
      </div>

      {/* Decision-Support Feature Showcase (The 3 Core SIH26264 Capabilities) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Feature 1: Case Overlap Highlight */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 flex flex-col justify-between space-y-4 hover:border-cyan-500/40 transition">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  <GitCompare className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                    Core Capability 1
                  </span>
                  <h2 className="text-base font-bold text-white leading-tight">
                    Case Overlap Detection
                  </h2>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                TF-IDF + Cosine
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Detects duplicate or multi-bureau overlapping complaints submitted under different categories using text vectorization and institution metadata.
            </p>

            {/* Live Case Comparison Spotlight */}
            <div className="p-3 rounded-xl bg-[#071120] border border-cyan-500/25 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-cyan-300">Live Match Detected</span>
                <span className="font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  91% Similarity
                </span>
              </div>
              <div className="text-[11px] text-slate-300 space-y-1">
                <p className="font-medium text-slate-200 truncate">
                  Apex Institute of Technology
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1">
                  <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-cyan-400 block font-mono">#0842 (Anti-Ragging)</span>
                    Hostel amenity surcharge
                  </div>
                  <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-teal-400 block font-mono">#0914 (Approval)</span>
                    Arbitrary fee collection
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Link
            to="/case-overlap"
            className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition"
          >
            <span>Launch Overlap Resolution Engine</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Feature 2: Problem Pattern Clustering */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 flex flex-col justify-between space-y-4 hover:border-teal-500/40 transition">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30">
                  <Network className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider">
                    Core Capability 2
                  </span>
                  <h2 className="text-base font-bold text-white leading-tight">
                    Multi-Institution Patterns
                  </h2>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Clustering ML
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Unsupervised clustering surfaces emerging systemic irregularities affecting multiple colleges across states before they escalate.
            </p>

            {/* Pattern Spotlight */}
            <div className="p-3 rounded-xl bg-[#071120] border border-teal-500/25 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-teal-300">Cluster #PAT-2026-04</span>
                <span className="font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 text-[10px]">
                  Critical Escalation
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium line-clamp-1">
                Faculty 7th CPC Non-Compliance & Delayed Salaries
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                <span>8 Colleges • North Region</span>
                <span className="text-teal-400 font-mono font-semibold">28 Grievances</span>
              </div>
            </div>
          </div>

          <Link
            to="/problem-patterns"
            className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold transition"
          >
            <span>Explore Emerging Pattern Map</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Feature 3: Resolution Evidence Checker */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 flex flex-col justify-between space-y-4 hover:border-purple-500/40 transition">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider">
                    Core Capability 3
                  </span>
                  <h2 className="text-base font-bold text-white leading-tight">
                    Resolution Evidence Verifier
                  </h2>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                PyMuPDF + NLP
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Extracts text from college compliance PDFs and checks contextual relevance against original complaint clauses to streamline review.
            </p>

            {/* Evidence Spotlight */}
            <div className="p-3 rounded-xl bg-[#071120] border border-purple-500/25 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-purple-300">Verified Proof Document</span>
                <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  92.4% Match
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium truncate">
                Compliance_Affidavit_LabEquipment_v2.pdf
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                <span>Case #AICTE-2026-0771</span>
                <span className="text-purple-400 font-medium">5/5 Clauses Verified</span>
              </div>
            </div>
          </div>

          <Link
            to="/evidence-checker"
            className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold transition"
          >
            <span>Review Resolution Documents</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Visual Analytics Grid (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inflow vs Resolution Trend Chart */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-slate-800/90 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-white">
                Monthly Grievance Inflow & Resolution Velocity
              </h2>
              <p className="text-xs text-slate-400">
                {presentationMode === 'demo'
                  ? 'Comparison of newly lodged cases vs cases resolved within statutory AICTE SLA.'
                  : 'Live monthly aggregation derived from registered complaint filing cohorts.'}
              </p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1.5 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400"></span>
                <span>Inflow</span>
              </div>
              <div className="flex items-center space-x-1.5 text-teal-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-teal-400"></span>
                <span>Resolved</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={
                  presentationMode === 'demo'
                    ? demoMonthlyTrendData
                    : summaryData?.monthly_trends || []
                }
              >
                <defs>
                  <linearGradient id="cyanArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="tealArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a1424',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="received"
                  name="Grievances Received"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#cyanArea)"
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  name="Resolved Cases"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#tealArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bureau Distribution Bar Chart */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 space-y-4">
          <div>
            <h2 className="text-base font-bold text-white">
              Bureau Workload & SLA Compliance
            </h2>
            <p className="text-xs text-slate-400">
              Active complaint volume and on-time resolution rate per AICTE bureau.
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={
                  presentationMode === 'demo'
                    ? demoBureauStatsData
                    : summaryData?.bureau_distribution || []
                }
                layout="vertical"
                margin={{ top: 5, right: 10, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a1424',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#f8fafc',
                  }}
                />
                <Bar dataKey="active" name="Active Cases" fill="#06b6d4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Overall Council SLA:</span>
            <span className="font-bold text-teal-400">
              {presentationMode === 'demo'
                ? '92.2% Compliant'
                : `${summaryData?.sla_compliance_rate || 0}% Compliant`}
            </span>
          </div>
        </div>
      </div>

      {/* Priority Grievances Worklist Table */}
      <div className="glass-panel rounded-2xl border border-slate-800/90 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800/90 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white">
                Active Priority Grievance Queue
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {filteredComplaints.length} Cases
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {presentationMode === 'demo'
                ? 'Demonstration triage queue with simulated SLA countdowns and AI flags.'
                : 'Live queue fetched from database (/api/v1/complaints) with real SLA calculations.'}
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Filter by ID, subject, bureau..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#0a1424] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-52 sm:w-60"
              />
            </div>

            <select
              value={selectedBureau}
              onChange={(e) => setSelectedBureau(e.target.value)}
              className="px-2.5 py-1.5 bg-[#0a1424] border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50"
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
              className="px-2.5 py-1.5 bg-[#0a1424] border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Under Review">Under Review</option>
              <option value="Transferred">Transferred</option>
              <option value="Evidence Requested">Evidence Requested</option>
              <option value="Escalated">Escalated</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#07101e] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Case ID</th>
                <th className="py-3 px-4 font-semibold">Institution & Region</th>
                <th className="py-3 px-4 font-semibold">Bureau / Category</th>
                <th className="py-3 px-4 font-semibold">SLA Deadline</th>
                <th className="py-3 px-4 font-semibold">AI Assessment</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loadingLive && presentationMode === 'live' ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 space-y-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
                    <p className="text-slate-300 font-semibold text-xs">
                      Loading live grievances from database...
                    </p>
                  </td>
                </tr>
              ) : filteredComplaints.length > 0 ? (
                filteredComplaints.map((item) => {
                  const isOverdue = item.hoursRemaining < 0;
                  const isUrgent = item.hoursRemaining >= 0 && item.hoursRemaining <= 48;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-900/50 transition-colors group cursor-pointer"
                      onClick={() => setSelectedCaseDetail(item)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-cyan-400 whitespace-nowrap">
                        {item.id}
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-100 group-hover:text-cyan-300 transition">
                          {item.institution}
                        </p>
                        <p className="text-[11px] text-slate-400">{item.state}</p>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-slate-300 font-medium block">
                          {item.bureau}
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                          {item.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          {isOverdue ? (
                            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              <span>Overdue ({Math.abs(item.hoursRemaining)}h)</span>
                            </span>
                          ) : isUrgent ? (
                            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>{item.hoursRemaining}h remaining</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">
                              {item.slaDeadline}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                            item.aiFlagType === 'cyan'
                              ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25'
                              : item.aiFlagType === 'teal'
                              ? 'bg-teal-500/10 text-teal-300 border-teal-500/25'
                              : item.aiFlagType === 'amber'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>{item.aiFlag}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={item.status} />
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCaseDetail(item);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-slate-700/80 transition text-xs inline-flex items-center space-x-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Review</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto">
                      <FileText className="w-5 h-5" />
                    </div>
                    {liveError && presentationMode === 'live' ? (
                      <div>
                        <p className="text-rose-400 font-semibold">
                          Failed to load live complaints
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{liveError}</p>
                        <button
                          type="button"
                          onClick={() => fetchDashboardData(true)}
                          className="mt-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs transition"
                        >
                          Retry Live Request
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-slate-200 font-semibold">
                          No complaints match your search query or filters
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Try resetting the filters or search keywords.
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="p-4 bg-[#07101e] border-t border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-400 gap-2">
          <span>
            Displaying {filteredComplaints.length} priority grievance records
            {presentationMode === 'live' ? ' (Live Database)' : ' (Demo)'}
          </span>
          <Link
            to="/complaints"
            className="inline-flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 font-medium"
          >
            <span>Access Complete Registry & Ingestion Pipeline</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Case Details Drawer / Modal */}
      {selectedCaseDetail && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedCaseDetail(null)}
        >
          <div
            className="bg-[#0a1424] border border-cyan-500/30 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    {selectedCaseDetail.id}
                  </span>
                  <StatusBadge status={selectedCaseDetail.status} />
                </div>
                <h3 className="text-lg font-bold text-white mt-1.5">
                  {selectedCaseDetail.institution}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedCaseDetail.state} • {selectedCaseDetail.bureau}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCaseDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Grievance Category:</span>
                <p className="text-slate-200 font-semibold mt-0.5">{selectedCaseDetail.category}</p>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Summary of Allegations:</span>
                <p className="text-slate-300 mt-0.5 p-3 rounded-lg bg-slate-900 border border-slate-800 leading-relaxed">
                  {selectedCaseDetail.summary}
                </p>
              </div>

              {selectedCaseDetail.description && selectedCaseDetail.description !== selectedCaseDetail.summary && (
                <div>
                  <span className="text-slate-400 font-medium">Detailed Narrative:</span>
                  <p className="text-slate-300 mt-0.5 p-3 rounded-lg bg-slate-900 border border-slate-800 leading-relaxed text-[11px] max-h-36 overflow-y-auto">
                    {selectedCaseDetail.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[#071120] border border-slate-800/80">
                <div>
                  <span className="text-slate-400 block text-[11px]">Lodged Date</span>
                  <span className="text-slate-200 font-medium">{selectedCaseDetail.submittedDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">SLA Expiry Deadline</span>
                  <span className="text-slate-200 font-medium">{selectedCaseDetail.slaDeadline}</span>
                </div>
              </div>

              {selectedCaseDetail.relatedCaseId && (
                <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 space-y-1">
                  <div className="flex items-center justify-between text-cyan-300 font-semibold">
                    <span className="flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>Cross-Bureau Overlap Detected</span>
                    </span>
                    <span className="font-mono text-cyan-400 font-bold">91% Match</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    This grievance matches record <strong>{selectedCaseDetail.relatedCaseId}</strong> filed with another bureau. Cross-referencing recommended before formal inquiry.
                  </p>
                  <Link
                    to="/case-overlap"
                    className="inline-flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 text-[11px] font-semibold pt-1"
                  >
                    <span>View Cross-Bureau Dossier in Overlap Engine</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setSelectedCaseDetail(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Close
              </button>
              <Link
                to="/complaints"
                className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold shadow-md"
              >
                Open Full Case Registry
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
