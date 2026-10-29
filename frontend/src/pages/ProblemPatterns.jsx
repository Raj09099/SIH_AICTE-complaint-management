import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Building2,
  FileText,
  Calendar,
  Tag,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Info,
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import { patternService } from '../services/patterns';
import { formatDate, formatPercentage } from '../utils/formatters';

const CATEGORY_OPTIONS = [
  'All Categories',
  'Fee Irregularities',
  'Faculty Deficiency',
  'Faculty Grievance',
  'Infrastructure',
  'Ragging',
  'Hostel Amenities',
  'Admission Malpractice',
  'Scholarship',
  'Approval Delay',
  'Affiliation',
];

const BUREAU_OPTIONS = [
  'All Bureaus',
  'Approval Bureau',
  'Public Grievance Redressal Cell (PGRC)',
  'Anti-Ragging Cell',
  'Faculty & Staff Grievances Cell',
  'Finance & Scholarships Bureau',
  'Legal & Redressal Cell',
];

export function ProblemPatterns() {
  const [patterns, setPatterns] = useState([]);
  const [summaryData, setSummaryData] = useState({
    total: 0,
    totalAnalyzed: 0,
    totalInstitutions: 0,
    thresholdUsed: 0.25,
  });
  const [loading, setLoading] = useState(true);
  const [isClustering, setIsClustering] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Filters & Parameters
  const [threshold, setThreshold] = useState(0.25);
  const [minInstitutions, setMinInstitutions] = useState(2);
  const [minComplaints, setMinComplaints] = useState(2);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedBureau, setSelectedBureau] = useState('All Bureaus');

  // Expanded card tracking (multi-accordion)
  const [expandedPatterns, setExpandedPatterns] = useState({});

  const toggleExpand = (patternCode) => {
    setExpandedPatterns((prev) => ({
      ...prev,
      [patternCode]: !prev[patternCode],
    }));
  };

  // Fetch patterns from API
  const fetchPatterns = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const params = {
          threshold: parseFloat(threshold),
          min_institutions: parseInt(minInstitutions, 10),
          min_complaints: parseInt(minComplaints, 10),
          limit: 50,
        };
        if (selectedCategory !== 'All Categories') {
          params.category = selectedCategory;
        }
        if (selectedBureau !== 'All Bureaus') {
          params.bureau = selectedBureau;
        }

        const data = await patternService.getPatterns(params);
        setPatterns(data.patterns || []);
        setSummaryData({
          total: data.total || 0,
          totalAnalyzed: data.total_complaints_analyzed || 0,
          totalInstitutions: data.total_distinct_institutions_affected || 0,
          thresholdUsed: data.threshold || threshold,
        });

        // Automatically expand the top pattern on initial load
        if (data.patterns && data.patterns.length > 0 && Object.keys(expandedPatterns).length === 0) {
          setExpandedPatterns({ [data.patterns[0].pattern_code]: true });
        }
      } catch (err) {
        console.error('Failed to fetch problem patterns:', err);
        setError(
          err.response?.data?.detail ||
            err.message ||
            'Unable to load problem patterns from the analytics service.'
        );
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [threshold, minInstitutions, minComplaints, selectedCategory, selectedBureau]
  );

  useEffect(() => {
    fetchPatterns();
  }, [fetchPatterns]);

  // Trigger On-Demand Clustering Pipeline (Officer/Admin role)
  const handleRunClustering = async () => {
    setIsClustering(true);
    setError(null);
    setFeedback(null);

    try {
      const payload = {
        threshold: parseFloat(threshold),
        min_institutions: parseInt(minInstitutions, 10),
        min_complaints: parseInt(minComplaints, 10),
        limit: 50,
      };
      if (selectedCategory !== 'All Categories') {
        payload.category = selectedCategory;
      }
      if (selectedBureau !== 'All Bureaus') {
        payload.bureau = selectedBureau;
      }

      const data = await patternService.runClustering(payload);
      setPatterns(data.patterns || []);
      setSummaryData({
        total: data.total || 0,
        totalAnalyzed: data.total_complaints_analyzed || 0,
        totalInstitutions: data.total_distinct_institutions_affected || 0,
        thresholdUsed: data.threshold || threshold,
      });

      // Expand top pattern
      if (data.patterns && data.patterns.length > 0) {
        setExpandedPatterns({ [data.patterns[0].pattern_code]: true });
      }

      setFeedback(
        `Clustering pipeline completed successfully! Discovered ${data.total} multi-institution pattern(s) across ${data.total_distinct_institutions_affected} distinct institutions from ${data.total_complaints_analyzed} complaints.`
      );
    } catch (err) {
      console.error('Clustering pipeline failed:', err);
      setError(
        err.response?.data?.detail ||
          err.message ||
          'Failed to execute grievance pattern clustering pipeline.'
      );
    } finally {
      setIsClustering(false);
    }
  };

  // Aggregated KPI calculations
  const totalGrievancesInPatterns = useMemo(() => {
    return patterns.reduce((acc, p) => acc + (p.complaint_count || 0), 0);
  }, [patterns]);

  const avgClusterConfidence = useMemo(() => {
    if (!patterns.length) return 0;
    const sum = patterns.reduce((acc, p) => acc + (p.cluster_score || 0), 0);
    return sum / patterns.length;
  }, [patterns]);

  return (
    <div className="space-y-6 bg-white min-h-[calc(100vh-80px)] pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/20 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Feature 2: Multi-Institution Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#36454F]">
            Multi-Institution Problem Pattern Detector
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Unsupervised scikit-learn TF-IDF and cosine similarity clustering to identify systemic
            grievance trends across technical institutions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => fetchPatterns(true)}
            disabled={loading || isRefreshing || isClustering}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-[#374151] bg-[#F5F7F7] hover:bg-[#E5E7EB] border border-[#E5E7EB] rounded-lg transition-colors disabled:opacity-50"
            title="Refresh current patterns"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0F766E]' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={handleRunClustering}
            disabled={loading || isClustering}
            className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-medium text-white bg-[#0F766E] hover:bg-[#0D655E] rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {isClustering ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running Clustering...</span>
              </>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5" />
                <span>Run Clustering Pipeline</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Action / Error Feedback Notifications */}
      {feedback && (
        <div className="p-3.5 rounded-lg border border-[#15803D]/30 bg-[#15803D]/10 text-[#15803D] flex items-center justify-between text-xs font-medium">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[#15803D] hover:underline text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-lg border border-[#B91C1C]/30 bg-[#B91C1C]/10 text-[#B91C1C] flex items-center justify-between text-xs font-medium">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchPatterns()}
            className="text-[#B91C1C] hover:underline text-[11px]"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6B7280]">Discovered Patterns</span>
            <div className="p-2 rounded-lg bg-[#0F766E]/10 text-[#0F766E]">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-[#36454F]">{summaryData.total}</span>
            <span className="text-[11px] text-[#6B7280]">systemic groups</span>
          </div>
          <p className="text-[11px] text-[#6B7280] mt-1">Cross-institution qualified</p>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6B7280]">Affected Institutions</span>
            <div className="p-2 rounded-lg bg-[#0F766E]/10 text-[#0F766E]">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-[#36454F]">
              {summaryData.totalInstitutions}
            </span>
            <span className="text-[11px] text-[#6B7280]">colleges involved</span>
          </div>
          <p className="text-[11px] text-[#6B7280] mt-1">Under AICTE jurisdiction</p>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6B7280]">Grievances in Patterns</span>
            <div className="p-2 rounded-lg bg-[#0F766E]/10 text-[#0F766E]">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-[#36454F]">{totalGrievancesInPatterns}</span>
            <span className="text-[11px] text-[#6B7280]">
              of {summaryData.totalAnalyzed} analyzed
            </span>
          </div>
          <p className="text-[11px] text-[#6B7280] mt-1">Filtered by topical cohesion</p>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6B7280]">TF-IDF Similarity Cutoff</span>
            <div className="p-2 rounded-lg bg-[#0F766E]/10 text-[#0F766E]">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-[#36454F]">
              {formatPercentage(summaryData.thresholdUsed)}
            </span>
            <span className="text-[11px] text-[#6B7280]">
              (avg conf: {formatPercentage(avgClusterConfidence)})
            </span>
          </div>
          <p className="text-[11px] text-[#6B7280] mt-1">Min {minInstitutions} distinct institutions</p>
        </div>
      </div>

      {/* Filter and Configuration Toolbar */}
      <div className="bg-[#F5F7F7] p-4 rounded-xl border border-[#E5E7EB] space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#36454F]">
            <SlidersHorizontal className="w-4 h-4 text-[#0F766E]" />
            <span>Clustering Parameters & Category Filters</span>
          </div>
          <div className="text-[11px] text-[#6B7280]">
            Adjust threshold and constraints to calibrate pattern discovery sensitivity.
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-medium text-[#6B7280] mb-1">
              Grievance Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs bg-white text-[#374151] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-[#0F766E]"
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Bureau Filter */}
          <div>
            <label className="block text-[11px] font-medium text-[#6B7280] mb-1">
              AICTE Bureau / Cell
            </label>
            <select
              value={selectedBureau}
              onChange={(e) => setSelectedBureau(e.target.value)}
              className="w-full text-xs bg-white text-[#374151] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-[#0F766E]"
            >
              {BUREAU_OPTIONS.map((bur) => (
                <option key={bur} value={bur}>
                  {bur}
                </option>
              ))}
            </select>
          </div>

          {/* Similarity Threshold Slider */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-medium text-[#6B7280] mb-1">
              <span>Similarity Threshold:</span>
              <span className="font-semibold text-[#0F766E]">
                {(threshold * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.15"
              max="0.65"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#E5E7EB] rounded-lg appearance-none cursor-pointer accent-[#0F766E]"
            />
          </div>

          {/* Min Institutions Selector */}
          <div>
            <label className="block text-[11px] font-medium text-[#6B7280] mb-1">
              Min Distinct Institutions
            </label>
            <select
              value={minInstitutions}
              onChange={(e) => setMinInstitutions(parseInt(e.target.value, 10))}
              className="w-full text-xs bg-white text-[#374151] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-[#0F766E]"
            >
              <option value={2}>2+ Technical Institutions</option>
              <option value={3}>3+ Technical Institutions</option>
              <option value={4}>4+ Technical Institutions</option>
              <option value={5}>5+ Technical Institutions</option>
            </select>
          </div>
        </div>
      </div>

      {/* Discovered Patterns List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#36454F] flex items-center space-x-2">
            <span>Discovered Multi-Institution Patterns</span>
            <span className="text-xs font-normal text-[#6B7280]">
              ({patterns.length} pattern{patterns.length === 1 ? '' : 's'})
            </span>
          </h2>
          <span className="text-xs text-[#6B7280]">
            Ranked by Systemic Severity (Institutions × Volume)
          </span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-12 text-center bg-white rounded-xl border border-[#E5E7EB] space-y-3">
            <RefreshCw className="w-8 h-8 text-[#0F766E] animate-spin mx-auto" />
            <h3 className="text-sm font-semibold text-[#36454F]">
              Executing Unsupervised Pattern Discovery...
            </h3>
            <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
              Analyzing complaint texts, institutional affiliations, and categories using scikit-learn
              TF-IDF and cosine distance clustering.
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && patterns.length === 0 && (
          <div className="p-12 text-center bg-[#F5F7F7] rounded-xl border border-[#E5E7EB] space-y-3">
            <div className="w-12 h-12 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center mx-auto text-[#6B7280]">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-[#36454F]">
              No Multi-Institution Patterns Discovered
            </h3>
            <p className="text-xs text-[#6B7280] max-w-md mx-auto">
              No complaint groups meet the current similarity threshold of{' '}
              {(threshold * 100).toFixed(0)}% across {minInstitutions} or more distinct institutions.
              Try lowering the threshold or clearing category/bureau filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setThreshold(0.20);
                setMinInstitutions(2);
                setSelectedCategory('All Categories');
                setSelectedBureau('All Bureaus');
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-[#0F766E] bg-white border border-[#0F766E]/30 rounded-lg hover:bg-[#0F766E]/5"
            >
              <span>Reset Filters to Relaxed Threshold (20%)</span>
            </button>
          </div>
        )}

        {/* Pattern Cards */}
        {!loading &&
          patterns.map((pattern) => {
            const isExpanded = !!expandedPatterns[pattern.pattern_code];

            return (
              <div
                key={pattern.pattern_code}
                className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden transition-all duration-200 hover:border-[#0F766E]/40"
              >
                {/* Card Header & Summary Bar */}
                <div
                  onClick={() => toggleExpand(pattern.pattern_code)}
                  className="p-4 sm:p-5 cursor-pointer bg-white hover:bg-[#F5F7F7]/60 transition-colors select-none"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/20">
                          {pattern.pattern_code}
                        </span>

                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#36454F]/10 text-[#36454F] border border-[#36454F]/20">
                          {pattern.category}
                        </span>

                        {pattern.trend_direction && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-medium border flex items-center space-x-1 ${
                              pattern.trend_direction === 'Surging'
                                ? 'bg-[#B45309]/10 text-[#B45309] border-[#B45309]/30'
                                : pattern.trend_direction === 'Emerging'
                                ? 'bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/30'
                                : 'bg-[#6B7280]/10 text-[#6B7280] border-[#E5E7EB]'
                            }`}
                          >
                            <TrendingUp className="w-3 h-3" />
                            <span>{pattern.trend_direction} Pattern</span>
                          </span>
                        )}

                        {pattern.bureau && (
                          <span className="text-[11px] text-[#6B7280] hidden sm:inline">
                            • {pattern.bureau}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-semibold text-[#36454F] leading-snug">
                        {pattern.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Metric summary pills */}
                      <div className="flex items-center space-x-3 text-xs text-[#374151]">
                        <div
                          className="flex items-center space-x-1 px-2 py-1 rounded bg-[#F5F7F7] border border-[#E5E7EB]"
                          title="Distinct technical colleges reporting this grievance"
                        >
                          <Building2 className="w-3.5 h-3.5 text-[#0F766E]" />
                          <span className="font-semibold text-[#36454F]">
                            {pattern.affected_institutions_count}
                          </span>
                          <span className="text-[#6B7280]">Colleges</span>
                        </div>

                        <div
                          className="flex items-center space-x-1 px-2 py-1 rounded bg-[#F5F7F7] border border-[#E5E7EB]"
                          title="Total complaints clustered in this pattern"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#0F766E]" />
                          <span className="font-semibold text-[#36454F]">
                            {pattern.complaint_count}
                          </span>
                          <span className="text-[#6B7280]">Cases</span>
                        </div>

                        <div
                          className="hidden sm:flex items-center space-x-1 px-2 py-1 rounded bg-[#F5F7F7] border border-[#E5E7EB]"
                          title="Average TF-IDF Cosine Semantic Cohesion"
                        >
                          <span className="text-[#6B7280]">Cohesion:</span>
                          <span className="font-semibold text-[#0F766E]">
                            {(pattern.cluster_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        aria-label="Toggle pattern details"
                        className="p-1 rounded-md text-[#6B7280] hover:bg-[#E5E7EB] transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Summary Narrative snippet */}
                  <p className="text-xs text-[#6B7280] mt-2 line-clamp-2">
                    {pattern.description}
                  </p>

                  {/* Keywords chips preview */}
                  {pattern.keywords && pattern.keywords.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                      <span className="text-[11px] text-[#6B7280] mr-1 flex items-center space-x-1">
                        <Tag className="w-3 h-3 text-[#0F766E]" />
                        <span>Key Terms:</span>
                      </span>
                      {pattern.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="px-2 py-0.5 rounded text-[11px] bg-[#F5F7F7] text-[#374151] border border-[#E5E7EB]"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="border-t border-[#E5E7EB] bg-[#FFFFFF] p-4 sm:p-5 space-y-5">
                    {/* Representative Complaint Quote Box */}
                    {pattern.representative_text && (
                      <div className="p-3.5 rounded-lg bg-[#F5F7F7] border border-[#E5E7EB] space-y-1">
                        <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#36454F]">
                          <Info className="w-3.5 h-3.5 text-[#0F766E]" />
                          <span>Representative Grievance Narrative (Cluster Medoid)</span>
                        </div>
                        <p className="text-xs text-[#374151] italic leading-relaxed">
                          "{pattern.representative_text}"
                        </p>
                      </div>
                    )}

                    {/* Affected Institutions Table */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#36454F] flex items-center space-x-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#0F766E]" />
                          <span>
                            Affected Technical Institutions ({pattern.affected_institutions?.length || 0})
                          </span>
                        </h4>
                        <span className="text-[11px] text-[#6B7280]">
                          Must span 2+ colleges to qualify as a multi-institution pattern
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-lg border border-[#E5E7EB]">
                        <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-xs">
                          <thead className="bg-[#F5F7F7] text-[#374151] font-semibold">
                            <tr>
                              <th className="py-2 px-3">AICTE ID</th>
                              <th className="py-2 px-3">Institution Name</th>
                              <th className="py-2 px-3">State & City</th>
                              <th className="py-2 px-3 text-right">Pattern Cases</th>
                              <th className="py-2 px-3 text-right">Directory</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB] bg-white text-[#374151]">
                            {pattern.affected_institutions?.map((inst) => (
                              <tr key={inst.id} className="hover:bg-[#F5F7F7]/50 transition-colors">
                                <td className="py-2 px-3 font-mono font-medium text-[#0F766E]">
                                  {inst.aicte_id}
                                </td>
                                <td className="py-2 px-3 font-medium text-[#36454F]">
                                  {inst.name}
                                </td>
                                <td className="py-2 px-3 text-[#6B7280]">
                                  {inst.city ? `${inst.city}, ` : ''}
                                  {inst.state || '—'}
                                </td>
                                <td className="py-2 px-3 text-right font-semibold text-[#36454F]">
                                  {inst.complaint_count}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <Link
                                    to={`/institutions/${inst.id}`}
                                    className="inline-flex items-center space-x-1 text-xs text-[#0F766E] hover:underline"
                                  >
                                    <span>Profile</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Linked Complaints Table */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#36454F] flex items-center space-x-1.5">
                          <FileText className="w-3.5 h-3.5 text-[#0F766E]" />
                          <span>Associated Case Complaints ({pattern.complaints?.length || 0})</span>
                        </h4>
                        <span className="text-[11px] text-[#6B7280]">
                          Individual records mapped to this recurring theme
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-lg border border-[#E5E7EB]">
                        <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-xs">
                          <thead className="bg-[#F5F7F7] text-[#374151] font-semibold">
                            <tr>
                              <th className="py-2 px-3">Complaint No</th>
                              <th className="py-2 px-3">Institution</th>
                              <th className="py-2 px-3">Grievance Subject</th>
                              <th className="py-2 px-3">Filing Date</th>
                              <th className="py-2 px-3">Priority</th>
                              <th className="py-2 px-3">Status</th>
                              <th className="py-2 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB] bg-white text-[#374151]">
                            {pattern.complaints?.map((c) => (
                              <tr key={c.id} className="hover:bg-[#F5F7F7]/50 transition-colors">
                                <td className="py-2 px-3 font-mono font-medium text-[#0F766E]">
                                  {c.complaint_no}
                                </td>
                                <td className="py-2 px-3 max-w-[180px] truncate text-[#36454F]" title={c.institution_name}>
                                  {c.institution_name || `College #${c.institution_id}`}
                                </td>
                                <td className="py-2 px-3 max-w-[260px] truncate text-[#374151]" title={c.subject}>
                                  {c.subject}
                                </td>
                                <td className="py-2 px-3 text-[#6B7280] whitespace-nowrap">
                                  {formatDate(c.filing_date)}
                                </td>
                                <td className="py-2 px-3">
                                  <StatusBadge status={c.priority} showDot={false} />
                                </td>
                                <td className="py-2 px-3">
                                  <StatusBadge status={c.status} showDot={true} />
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <Link
                                    to={`/complaints/${c.id}`}
                                    className="inline-flex items-center space-x-1 text-xs text-[#0F766E] hover:underline"
                                  >
                                    <span>Details</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Timeline & Monthly Distribution Summary */}
                    {pattern.trend_distribution && pattern.trend_distribution.length > 0 && (
                      <div className="p-3 rounded-lg bg-[#F5F7F7] border border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center space-x-2 text-[#374151]">
                          <Calendar className="w-4 h-4 text-[#0F766E]" />
                          <span className="font-medium">Incident Timeline:</span>
                          <span className="text-[#6B7280]">
                            {formatDate(pattern.earliest_filing_date)} to{' '}
                            {formatDate(pattern.latest_filing_date)}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] text-[#6B7280]">Monthly Spread:</span>
                          <div className="flex items-center space-x-1.5">
                            {pattern.trend_distribution.map((t) => (
                              <span
                                key={t.month}
                                className="px-2 py-0.5 rounded text-[11px] font-mono bg-white text-[#36454F] border border-[#E5E7EB]"
                              >
                                {t.month}: <strong>{t.count}</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

export default ProblemPatterns;
