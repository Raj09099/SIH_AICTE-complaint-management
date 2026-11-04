import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  ArrowLeft,
  Building2,
  MapPin,
  GraduationCap,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Eye,
  TrendingUp,
  Calendar,
  Layers,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Repeat,
  Info,
  SlidersHorizontal,
  ExternalLink,
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
} from 'recharts';
import StatusBadge from '../components/common/StatusBadge';
import { institutionService } from '../services/institutions';
import { formatDate } from '../utils/formatters';
const ITEMS_PER_PAGE = 10;


export function InstitutionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  // Core Data State
  const [institution, setInstitution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  // Table Filter & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBureau, setSelectedBureau] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'
  const [currentPage, setCurrentPage] = useState(1);
  // Fetch Institutional Dossier
  const fetchDetails = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const data = await institutionService.getInstitutionById(id);
        setInstitution(data);
      } catch (err) {
        console.error('Failed to load institution 360° dossier:', err);
        setError(
          err.response?.data?.detail ||
            err.message ||
            `Unable to locate institutional record for identifier '${id}'.`
        );
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [id]
  );
  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);
  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBureau, selectedStatus, selectedPriority, sortOrder]);
  // Derived Complaints List with Filtering & Sorting
  const allComplaints = useMemo(() => {
    return institution?.complaints || [];
  }, [institution]);
  // Extract distinct bureaus from complaints for filter dropdown
  const availableBureaus = useMemo(() => {
    const set = new Set();
    allComplaints.forEach((c) => {
      if (c.bureau && c.bureau.trim()) set.add(c.bureau.trim());
    });
    return Array.from(set).sort();
  }, [allComplaints]);
  // Filtered & Sorted complaints
  const filteredComplaints = useMemo(() => {
    let result = [...allComplaints];
    // Search filter: complaint_no, subject, or category
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter(
        (c) =>
          (c.complaint_no && c.complaint_no.toLowerCase().includes(q)) ||
          (c.subject && c.subject.toLowerCase().includes(q)) ||
          (c.category && c.category.toLowerCase().includes(q))
      );
    }
    // Bureau filter
    if (selectedBureau !== 'ALL') {
      result = result.filter((c) => (c.bureau || '').trim() === selectedBureau);
    }
    // Status filter
    if (selectedStatus !== 'ALL') {
      result = result.filter((c) => c.status === selectedStatus);
    }
    // Priority filter
    if (selectedPriority !== 'ALL') {
      result = result.filter((c) => c.priority === selectedPriority);
    }
    // Sort order: filing date
    result.sort((a, b) => {
      const dateA = a.filing_date ? new Date(a.filing_date).getTime() : 0;
      const dateB = b.filing_date ? new Date(b.filing_date).getTime() : 0;
      if (sortOrder === 'newest') {
        return dateB - dateA || (b.id || 0) - (a.id || 0);
      }
      return dateA - dateB || (a.id || 0) - (b.id || 0);
    });
    return result;
  }, [allComplaints, searchTerm, selectedBureau, selectedStatus, selectedPriority, sortOrder]);
  // Paginated Complaints
  const totalPages = Math.ceil(filteredComplaints.length / ITEMS_PER_PAGE) || 1;
  const paginatedComplaints = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredComplaints.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredComplaints, currentPage]);
  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    selectedBureau !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedPriority !== 'ALL' ||
    sortOrder !== 'newest';
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedBureau('ALL');
    setSelectedStatus('ALL');
    setSelectedPriority('ALL');
    setSortOrder('newest');
    setCurrentPage(1);
  };
  // Prepare Recharts data for Bureau-wise distribution
  const chartData = useMemo(() => {
    if (!institution?.bureau_breakdown || institution.bureau_breakdown.length === 0) {
      return [];
    }
    return institution.bureau_breakdown.map((item) => ({
      name: item.bureau,
      Open: item.open,
      Resolved: item.resolved,
      Overdue: item.overdue,
      Total: item.total,
    }));
  }, [institution]);
  // Count recurring categories
  const recurringCategoriesList = institution?.recurring_categories || [];
  const recurringCount = recurringCategoriesList.filter((cat) => cat.is_recurring).length;
  // Loading State
  if (loading && !isRefreshing) {
    return (
      <div className="space-y-6 bg-[#F5F7F7] min-h-screen p-4 sm:p-6">
        <button
          type="button"
          onClick={() => navigate('/institutions')}
          className="inline-flex items-center space-x-1.5 text-xs text-[#718096] hover:text-[#263746] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Institutions Directory</span>
        </button>
        <div className="bg-white p-16 rounded-xl border border-[#D9DEE3] text-center space-y-3 shadow-sm">
          <RefreshCw className="w-8 h-8 animate-spin text-[#087F75] mx-auto" />
          <h2 className="text-base font-semibold text-[#263746]">
            Retrieving Institution 360° Dossier
          </h2>
          <p className="text-xs text-[#718096]">
            Querying grievance telemetry, bureau metrics, and compliance status for #{id}...
          </p>
        </div>
      </div>
    );
  }
  // Error State
  if (error || !institution) {
    return (
      <div className="space-y-6 bg-[#F5F7F7] min-h-screen p-4 sm:p-6">
        <button
          type="button"
          onClick={() => navigate('/institutions')}
          className="inline-flex items-center space-x-1.5 text-xs text-[#718096] hover:text-[#263746] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Institutions Directory</span>
        </button>
        <div className="bg-white p-12 rounded-xl border border-rose-200 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#263746]">Institution Record Not Found</h2>
          <p className="text-xs text-[#718096] max-w-md mx-auto">
            {error || `No registered technical institution matched the query '${id}'.`}
          </p>
          <div className="flex items-center justify-center space-x-3 pt-2">
            <button
              type="button"
              onClick={() => fetchDetails(false)}
              className="px-4 py-2 rounded-lg bg-[#087F75] hover:bg-[#06635c] text-white font-medium text-xs transition shadow-sm"
            >
              Retry Request
            </button>
            <button
              type="button"
              onClick={() => navigate('/institutions')}
              className="px-4 py-2 rounded-lg bg-white border border-[#D9DEE3] hover:bg-[#F5F7F7] text-[#263746] font-medium text-xs transition"
            >
              Return to Directory
            </button>
          </div>
        </div>
      </div>
    );
  }
  const isOverdueBreach = (institution.overdue_complaints || 0) > 0;
  const slaRate = institution.sla_compliance_rate ?? 0.0;
  return (
    <div className="space-y-6 bg-[#F5F7F7] min-h-screen p-4 sm:p-6">
      {/* 1. Header Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/institutions')}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-[#087F75] hover:text-[#06635c] transition group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Institutions Directory</span>
        </button>
        <div className="flex items-center space-x-3">
          <span className="text-xs text-[#718096] hidden md:inline">
            Identifier: <span className="font-mono text-[#263746] font-medium">{id}</span>
          </span>
          <Link
            to={`/institution-risk?search=${encodeURIComponent(institution?.name || '')}`}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition shadow-sm"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>Risk Attention Analysis</span>
          </Link>
          <button
            type="button"
            onClick={() => fetchDetails(true)}
            disabled={isRefreshing}
            className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white border border-[#D9DEE3] text-xs text-[#263746] hover:bg-[#F5F7F7] disabled:opacity-50 transition shadow-sm"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#087F75] ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Dossier'}</span>
          </button>
        </div>
      </div>
      {/* 2. Institution Profile Card */}
      <div className="bg-white rounded-xl p-6 sm:p-8 border border-[#D9DEE3] shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 relative">
          <div className="space-y-3 flex-1">
            {/* Badges strip */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#087F75] bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg">
                AICTE Permanent ID: {institution.aicte_id}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-[#F5F7F7] border border-[#D9DEE3] text-[#263746] font-medium">
                {institution.institution_type || 'Technical Institute'}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[#15803D] font-semibold flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
                <span>Active Regulatory Status</span>
              </span>
              {institution.established_year && (
                <span className="text-xs px-2.5 py-1 rounded-lg bg-[#F5F7F7] border border-[#D9DEE3] text-[#718096] font-mono">
                  Est. {institution.established_year}
                </span>
              )}
              <Link
                to={`/institution-risk?search=${encodeURIComponent(institution?.name || '')}`}
                className="text-xs px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-semibold flex items-center space-x-1 hover:bg-amber-100 transition"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>Feature 3.7 Risk Profile</span>
              </Link>
            </div>
            {/* Institution Name */}
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#263746]">
              {institution.name}
            </h1>
            {/* Metadata (Location, University, Details) */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-[#718096] pt-1">
              <span className="flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#087F75] shrink-0" />
                <span className="text-[#263746] font-medium">
                  {institution.city}, {institution.state}
                  {institution.pincode ? ` - ${institution.pincode}` : ''}
                </span>
                {institution.address && (
                  <span className="text-[#718096] hidden sm:inline">
                    • {institution.address}
                  </span>
                )}
              </span>
              {institution.affiliating_university && (
                <span className="flex items-center space-x-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-[#087F75] shrink-0" />
                  <span>
                    Affiliated with:{' '}
                    <strong className="text-[#263746] font-semibold">
                      {institution.affiliating_university}
                    </strong>
                  </span>
                </span>
              )}
            </div>
            {/* Active Bureau Jurisdiction Information */}
            <div className="pt-2">
              <div className="text-[11px] font-bold text-[#718096] uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-[#087F75]" />
                <span>Active Bureaus Handling Cases</span>
              </div>
              {institution.active_bureaus && institution.active_bureaus.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {institution.active_bureaus.map((bureau) => (
                    <span
                      key={bureau}
                      className="px-2.5 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-[#087F75] text-xs font-medium"
                    >
                      {bureau}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#718096] italic">
                  No active bureau grievance assignments.
                </p>
              )}
            </div>
          </div>
          {/* Quick Compliance Summary Pill */}
          <div className="flex flex-col items-start lg:items-end gap-2 shrink-0 bg-[#F5F7F7] p-4 rounded-xl border border-[#D9DEE3]">
            <div className="text-left lg:text-right">
              <p className="text-[10px] uppercase font-bold tracking-wider text-[#718096]">
                Institutional Redressal Health
              </p>
              <div className="flex items-baseline space-x-2 mt-0.5">
                <span className="text-2xl font-extrabold text-[#263746] font-mono">
                  {institution.total_complaints}
                </span>
                <span className="text-xs text-[#718096]">Total Cases</span>
              </div>
            </div>
            {isOverdueBreach ? (
              <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-[#DC3545] font-semibold text-xs flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#DC3545]" />
                <span>{institution.overdue_complaints} Overdue Breach(es)</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[#15803D] font-semibold text-xs flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D]" />
                <span>Zero Overdue Breaches</span>
              </span>
            )}
          </div>
        </div>
      </div>
      {/* 3. 360° KPI Telemetry Cards (6 Core Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Complaints */}
        <div className="bg-white p-4 rounded-xl border border-[#D9DEE3] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#718096] mb-1.5">
            <span className="text-xs font-semibold">Total Complaints</span>
            <div className="p-1 rounded-md bg-[#263746]/10 text-[#263746]">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#263746] font-mono">
            {institution.total_complaints}
          </p>
          <p className="text-[11px] text-[#718096] mt-1">All registered filings</p>
        </div>
        {/* Pending Complaints (Status: New) */}
        <div className="bg-white p-4 rounded-xl border border-[#D9DEE3] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#718096] mb-1.5">
            <span className="text-xs font-semibold">Pending</span>
            <div className="p-1 rounded-md bg-[#087F75]/10 text-[#087F75]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#087F75] font-mono">
            {institution.pending_complaints ?? 0}
          </p>
          <p className="text-[11px] text-[#087F75] mt-1">Status: New</p>
        </div>
        {/* In-Progress Complaints */}
        <div className="bg-white p-4 rounded-xl border border-[#D9DEE3] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#718096] mb-1.5">
            <span className="text-xs font-semibold">In Progress</span>
            <div className="p-1 rounded-md bg-[#D97736]/10 text-[#D97736]">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#D97736] font-mono">
            {institution.in_progress_complaints ?? 0}
          </p>
          <p className="text-[11px] text-[#718096] mt-1">Review / Evidence / Transfer</p>
        </div>
        {/* Resolved Complaints */}
        <div className="bg-white p-4 rounded-xl border border-[#D9DEE3] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#718096] mb-1.5">
            <span className="text-xs font-semibold">Resolved</span>
            <div className="p-1 rounded-md bg-[#15803D]/10 text-[#15803D]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#15803D] font-mono">
            {institution.resolved_complaints ?? 0}
          </p>
          <p className="text-[11px] text-[#15803D] mt-1">Formal closure</p>
        </div>
        {/* Overdue Complaints */}
        <div className="bg-white p-4 rounded-xl border border-[#D9DEE3] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#718096] mb-1.5">
            <span className="text-xs font-semibold">Overdue Breaches</span>
            <div className="p-1 rounded-md bg-[#DC3545]/10 text-[#DC3545]">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#DC3545] font-mono">
            {institution.overdue_complaints ?? 0}
          </p>
          <p className="text-[11px] text-[#DC3545] mt-1">Past statutory deadline</p>
        </div>
        {/* SLA Compliance Rate */}
        <div className="bg-white p-4 rounded-xl border border-[#D9DEE3] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#718096] mb-1.5">
            <span className="text-xs font-semibold">SLA Compliance</span>
            <div className="p-1 rounded-md bg-teal-50 text-[#087F75]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#263746] font-mono">
              {institution.resolved_complaints > 0 ? `${slaRate}%` : 'N/A'}
            </p>
            {/* Explicit Notice: Estimated based on updated_at */}
            <p
              className="text-[10px] text-[#718096] mt-1 flex items-center space-x-1"
              title="Estimated using last update timestamp; dedicated resolution timestamp is not recorded."
            >
              <Info className="w-3 h-3 text-[#087F75] shrink-0" />
              <span>*Est. via update time</span>
            </p>
          </div>
        </div>
      </div>
      {/* 4. Deep-Dive Analytics: Bureau Breakdown & Recurring Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bureau-wise Complaint Analysis Card */}
        <div className="bg-white rounded-xl p-5 border border-[#D9DEE3] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-teal-50 text-[#087F75]">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#263746]">
                    Bureau-Wise Complaint Analysis
                  </h3>
                  <p className="text-xs text-[#718096]">
                    Distribution of active cases, resolutions, and overdue counts per bureau
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[#F5F7F7] text-[#263746] border border-[#D9DEE3]">
                {chartData.length} Bureaus
              </span>
            </div>
            {/* Recharts Bar Chart */}
            {chartData.length > 0 ? (
              <div className="mt-4">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 25, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                      <XAxis type="number" stroke="#718096" fontSize={11} tickLine={false} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        stroke="#263746"
                        fontSize={11}
                        tickLine={false}
                        width={120}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #D9DEE3',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#263746',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}
                      />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                      />
                      <Bar dataKey="Open" name="Open Cases" fill="#263746" radius={[0, 4, 4, 0]} />
                      <Bar
                        dataKey="Resolved"
                        name="Resolved Cases"
                        fill="#087F75"
                        radius={[0, 4, 4, 0]}
                      />
                      <Bar
                        dataKey="Overdue"
                        name="Overdue Breaches"
                        fill="#DC3545"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Compact Breakdown Data Table */}
                <div className="mt-4 overflow-x-auto border-t border-[#D9DEE3] pt-3">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[#718096] font-semibold uppercase text-[10px] tracking-wider border-b border-[#D9DEE3]">
                        <th className="py-2 pr-2">Bureau</th>
                        <th className="py-2 px-2 text-center">Total</th>
                        <th className="py-2 px-2 text-center">Open</th>
                        <th className="py-2 px-2 text-center">Resolved</th>
                        <th className="py-2 pl-2 text-center">Overdue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D9DEE3] text-[#263746]">
                      {institution.bureau_breakdown.map((b) => (
                        <tr key={b.bureau} className="hover:bg-[#F5F7F7]">
                          <td className="py-2 pr-2 font-medium">{b.bureau}</td>
                          <td className="py-2 px-2 text-center font-mono font-semibold">{b.total}</td>
                          <td className="py-2 px-2 text-center font-mono text-[#263746]">{b.open}</td>
                          <td className="py-2 px-2 text-center font-mono text-[#15803D]">
                            {b.resolved}
                          </td>
                          <td className="py-2 pl-2 text-center font-mono font-bold text-[#DC3545]">
                            {b.overdue > 0 ? b.overdue : '0'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-sm font-semibold text-[#263746]">
                  No Bureau Grievances Recorded
                </p>
                <p className="text-xs text-[#718096]">
                  This institution currently has no complaint cases assigned across AICTE bureaus.
                </p>
              </div>
            )}
          </div>
        </div>
        {/* Recurring Complaint Categories Card */}
        <div className="bg-white rounded-xl p-5 border border-[#D9DEE3] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-amber-50 text-[#D97736]">
                  <Repeat className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#263746]">
                    Recurring Complaint Categories
                  </h3>
                  <p className="text-xs text-[#718096]">
                    Systemic pattern detection (marked recurring when ≥ 2 complaints lodged)
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {recurringCount > 0 ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-[#D97736] border border-amber-200">
                    {recurringCount} Recurring Pattern{recurringCount > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-[#15803D] border border-emerald-200">
                    No Recurrences
                  </span>
                )}
                <button
                  onClick={() => navigate('/recurrence-radar')}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#087F75] border border-teal-200 text-xs font-semibold transition"
                  title="Open Recurrence Radar"
                >
                  <Activity className="w-3 h-3" />
                  <span>Radar</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
            {/* Recurring Status Banner */}
            {recurringCount > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-[#D97736] shrink-0 mt-0.5" />
                <p className="text-xs text-[#92400E]">
                  <strong>Systemic Grievance Warning:</strong> {recurringCount} complaint categories
                  have multiple filings against this college, indicating recurring institutional or
                  administrative non-compliance.
                </p>
              </div>
            )}
            {/* List of Recurring Categories */}
            {recurringCategoriesList.length > 0 ? (
              <div className="mt-4 space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {recurringCategoriesList.map((cat) => (
                  <div
                    key={cat.category}
                    className={`p-3.5 rounded-xl border transition ${
                      cat.is_recurring
                        ? 'bg-amber-50/40 border-amber-200 shadow-sm'
                        : 'bg-white border-[#D9DEE3]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-[#263746] leading-tight">
                            {cat.category}
                          </span>
                          {cat.is_recurring ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-[#D97736] border border-amber-300">
                              <Repeat className="w-2.5 h-2.5" />
                              <span>Recurring Pattern (≥2)</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F5F7F7] text-[#718096] border border-[#D9DEE3]">
                              Single Case
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#718096]">
                          <strong className="text-[#263746]">{cat.count}</strong> complaint
                          {cat.count > 1 ? 's' : ''} lodged • Represents{' '}
                          <strong className="text-[#087F75]">{cat.percentage}%</strong> of total
                          grievances
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono text-xs font-bold text-[#263746]">
                          {cat.percentage}%
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-[#D9DEE3] rounded-full h-1.5 mt-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          cat.is_recurring ? 'bg-[#D97736]' : 'bg-[#087F75]'
                        }`}
                        style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-sm font-semibold text-[#263746]">No Grievance Categories</p>
                <p className="text-xs text-[#718096]">
                  No complaints have been filed under any category for this institution.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* 5. Comprehensive Complaint History Table with Interactive Controls */}
      <div className="bg-white rounded-xl border border-[#D9DEE3] shadow-sm overflow-hidden">
        {/* Table Header Strip */}
        <div className="p-4 sm:p-5 border-b border-[#D9DEE3] bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-[#263746]">
                Institutional Complaint History Dossier
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#F5F7F7] text-[#263746] border border-[#D9DEE3]">
                {filteredComplaints.length} of {allComplaints.length} Cases
              </span>
            </div>
            <p className="text-xs text-[#718096] mt-0.5">
              Comprehensive chronological log of complaints registered against {institution.name}
            </p>
          </div>
          {/* Reset Filters Shortcut */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-[#DC3545] hover:bg-rose-100 transition self-start md:self-auto"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>
        {/* Filter Controls Toolbar */}
        <div className="p-4 border-b border-[#D9DEE3] bg-[#F5F7F7]/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="w-4 h-4 text-[#718096] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search complaint # or subject..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white border border-[#D9DEE3] text-xs text-[#263746] placeholder-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#087F75] focus:border-[#087F75]"
            />
          </div>
          {/* Bureau Filter */}
          <div>
            <select
              value={selectedBureau}
              onChange={(e) => setSelectedBureau(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#D9DEE3] text-xs text-[#263746] focus:outline-none focus:ring-1 focus:ring-[#087F75] focus:border-[#087F75]"
            >
              <option value="ALL">All Bureaus ({availableBureaus.length})</option>
              {availableBureaus.map((b) => (
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
              className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#D9DEE3] text-xs text-[#263746] focus:outline-none focus:ring-1 focus:ring-[#087F75] focus:border-[#087F75]"
            >
              <option value="ALL">All Statuses</option>
              <option value="New">New</option>
              <option value="Under Review">Under Review</option>
              <option value="Evidence Requested">Evidence Requested</option>
              <option value="Transferred">Transferred</option>
              <option value="Resolved">Resolved</option>
              <option value="Escalated">Escalated</option>
            </select>
          </div>
          {/* Priority Filter */}
          <div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#D9DEE3] text-xs text-[#263746] focus:outline-none focus:ring-1 focus:ring-[#087F75] focus:border-[#087F75]"
            >
              <option value="ALL">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          {/* Sort By Filing Date */}
          <div>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#D9DEE3] text-xs text-[#263746] focus:outline-none focus:ring-1 focus:ring-[#087F75] focus:border-[#087F75]"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
            </select>
          </div>
        </div>
        {/* Complaints Data Table */}
        {allComplaints.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="text-base font-bold text-[#263746]">Clean Compliance Record</h4>
            <p className="text-xs text-[#718096] max-w-sm mx-auto">
              No institutional complaints or grievances have been registered against {institution.name}.
            </p>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <h4 className="text-sm font-bold text-[#263746]">No Complaints Match Your Filters</h4>
            <p className="text-xs text-[#718096] max-w-md mx-auto">
              There are no complaint records matching your selected query and filter combination.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="px-3.5 py-1.5 rounded-lg bg-[#087F75] text-white font-medium text-xs hover:bg-[#06635c] transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#D9DEE3] bg-[#F5F7F7] text-[#718096] font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Tracking No</th>
                  <th className="py-3 px-4">Grievance Subject & Category</th>
                  <th className="py-3 px-4">Bureau</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Filing Date</th>
                  <th className="py-3 px-4 hidden md:table-cell">SLA Deadline</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9DEE3] text-[#263746]">
                {paginatedComplaints.map((c) => {
                  const today = new Date().toISOString().split('T')[0];
                  const isCaseOverdue =
                    c.status !== 'Resolved' && c.deadline_date && c.deadline_date < today;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/complaints/${c.id}`)}
                      className="hover:bg-[#F5F7F7] transition-colors cursor-pointer group"
                    >
                      {/* Complaint No */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#087F75] whitespace-nowrap">
                        {c.complaint_no}
                      </td>
                      {/* Subject & Category */}
                      <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                        <p className="font-semibold text-[#263746] group-hover:text-[#087F75] transition-colors line-clamp-1">
                          {c.subject || 'Untitled Grievance'}
                        </p>
                        <p className="text-[11px] text-[#718096] mt-0.5 truncate">
                          Category: <span className="text-[#263746]">{c.category || 'General'}</span>
                        </p>
                      </td>
                      {/* Bureau */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-[#F5F7F7] text-[11px] text-[#263746] border border-[#D9DEE3] font-medium">
                          {c.bureau || 'Unassigned'}
                        </span>
                      </td>
                      {/* Priority */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase ${
                            c.priority === 'Critical' || c.priority === 'Urgent'
                              ? 'bg-rose-50 text-[#DC3545] border border-rose-200'
                              : c.priority === 'High'
                              ? 'bg-amber-50 text-[#D97736] border border-amber-200'
                              : 'bg-teal-50 text-[#087F75] border border-teal-200'
                          }`}
                        >
                          {c.priority || 'Medium'}
                        </span>
                      </td>
                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={c.status} />
                      </td>
                      {/* Filing Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap hidden sm:table-cell font-mono text-[11px] text-[#718096]">
                        {formatDate(c.filing_date)}
                      </td>
                      {/* SLA Deadline Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap hidden md:table-cell font-mono text-[11px]">
                        {c.deadline_date ? (
                          <span
                            className={
                              isCaseOverdue
                                ? 'text-[#DC3545] font-semibold flex items-center space-x-1'
                                : 'text-[#718096]'
                            }
                          >
                            {isCaseOverdue && <AlertTriangle className="w-3 h-3 text-[#DC3545]" />}
                            <span>{formatDate(c.deadline_date)}</span>
                          </span>
                        ) : (
                          <span className="text-[#9CA3AF]">—</span>
                        )}
                      </td>
                      {/* Inspect Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          to={`/complaints/${c.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white hover:bg-[#F5F7F7] border border-[#D9DEE3] text-[#263746] text-xs font-medium transition shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#087F75]" />
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
        {/* Pagination Toolbar */}
        {filteredComplaints.length > ITEMS_PER_PAGE && (
          <div className="p-4 border-t border-[#D9DEE3] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#718096]">
            <div>
              Showing{' '}
              <strong className="text-[#263746]">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}
              </strong>{' '}
              to{' '}
              <strong className="text-[#263746]">
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredComplaints.length)}
              </strong>{' '}
              of <strong className="text-[#263746]">{filteredComplaints.length}</strong> filtered
              records
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-[#D9DEE3] bg-white text-[#263746] hover:bg-[#F5F7F7] disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <span className="px-3 py-1.5 rounded-lg bg-[#F5F7F7] border border-[#D9DEE3] font-mono font-medium text-[#263746]">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-[#D9DEE3] bg-white text-[#263746] hover:bg-[#F5F7F7] disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default InstitutionDetails;
