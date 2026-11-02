import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  GitCompare,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  SlidersHorizontal,
  ChevronRight,
  AlertCircle,
  FileText,
  Building2,
  Calendar,
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import { overlapService } from '../services/overlap';
import { formatDate } from '../utils/formatters';

export function CaseOverlap() {
  const [overlaps, setOverlaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Controls
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Flagged' | 'Duplicate' | 'Related' | 'Unrelated'
  const [threshold, setThreshold] = useState(0.60);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [submittingReviewId, setSubmittingReviewId] = useState(null);

  // Fetch detected overlaps from API
  const fetchOverlaps = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const params = { limit: 100 };
      if (statusFilter !== 'All') {
        params.status = statusFilter;
      }
      const data = await overlapService.getOverlaps(params);
      setOverlaps(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load case overlaps:', err);
      setError(
        err.response?.data?.detail ||
        err.message ||
        'Unable to load case overlaps from the backend.'
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOverlaps();
  }, [fetchOverlaps]);

  // Run ML Overlap Detection Analysis
  const handleRunDetection = async () => {
    setIsAnalyzing(true);
    setError(null);
    setActionFeedback(null);

    try {
      const res = await overlapService.detectOverlaps({
        threshold: parseFloat(threshold),
        limit: 50,
        persist: true,
      });

      setActionFeedback(
        `Analysis complete! Identified ${res.detected_count} potential case overlap pairs using scikit-learn TF-IDF & Cosine Similarity (Threshold >= ${(res.threshold_used * 100).toFixed(0)}%).`
      );
      fetchOverlaps(true);
    } catch (err) {
      console.error('Overlap detection failed:', err);
      setError(
        err.response?.data?.detail ||
        err.message ||
        'Failed to execute ML overlap detection.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Reviewer binding determination
  const handleReviewDecision = async (overlapId, decision) => {
    setSubmittingReviewId(overlapId);
    setActionFeedback(null);

    try {
      const updated = await overlapService.reviewOverlap(overlapId, {
        decision,
        notes: `Human determination marked as ${decision}`,
      });

      // Update in local state
      setOverlaps((prev) =>
        prev.map((item) => (item.id === overlapId ? updated : item))
      );

      setActionFeedback(
        `Case pair #${overlapId} successfully determined as '${updated.status}'. Persisted to database.`
      );
    } catch (err) {
      console.error('Failed to submit reviewer decision:', err);
      setError(
        err.response?.data?.detail ||
        err.message ||
        'Failed to record reviewer determination.'
      );
    } finally {
      setSubmittingReviewId(null);
    }
  };

  // Filtered overlaps based on local status selection
  const filteredOverlaps = useMemo(() => {
    if (statusFilter === 'All') return overlaps;
    return overlaps.filter((item) => {
      if (!item.status) return false;
      const st = item.status.toLowerCase();
      const filter = statusFilter.toLowerCase();
      if (filter === 'duplicate') {
        return st === 'duplicate' || st === 'confirmed linked';
      }
      if (filter === 'unrelated') {
        return st === 'unrelated' || st === 'dismissed';
      }
      return st === filter;
    });
  }, [overlaps, statusFilter]);

  // Statistics
  const flaggedCount = useMemo(
    () => overlaps.filter((o) => o.status === 'Flagged').length,
    [overlaps]
  );
  const duplicateCount = useMemo(
    () =>
      overlaps.filter(
        (o) => o.status === 'Duplicate' || o.status === 'Confirmed Linked'
      ).length,
    [overlaps]
  );
  const relatedCount = useMemo(
    () => overlaps.filter((o) => o.status === 'Related').length,
    [overlaps]
  );
  const highConfidenceCount = useMemo(
    () => overlaps.filter((o) => parseFloat(o.similarity_score) >= 0.85).length,
    [overlaps]
  );

  return (
    <div className="space-y-6 bg-white min-h-screen">
      {/* 1. Header & ML Control Bar */}
      <div className="bg-white rounded-xl p-5 border border-[#D9DEE3] shadow-sm flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-teal-50 text-[#087F75] border border-teal-200 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-[#087F75]" />
              <span>Feature 1: ML Intelligence</span>
            </span>
            <span className="text-[#718096]">•</span>
            <span className="text-xs font-mono text-[#718096]">
              TF-IDF Vectorization & Cosine Similarity
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#263746] mt-1.5">
            Smart Case Relationship & Overlap Detector
          </h1>
          <p className="text-xs sm:text-sm text-[#718096] mt-0.5">
            Detect duplicate grievances and cross-bureau related filings using scikit-learn NLP models, verified by authorized council officers.
          </p>
        </div>

        {/* Controls: Threshold Selector & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-[#F5F7F7] px-3 py-1.5 rounded-lg border border-[#D9DEE3] text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#718096]" />
            <span className="text-[#718096] font-medium">Threshold:</span>
            <select
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              disabled={isAnalyzing}
              className="bg-transparent text-[#087F75] font-semibold focus:outline-none cursor-pointer"
            >
              <option value={0.50}>50% (High Recall)</option>
              <option value={0.60}>60% (Recommended)</option>
              <option value={0.70}>70% (Strict)</option>
              <option value={0.85}>85% (Near Duplicate)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => fetchOverlaps(true)}
            disabled={loading || isRefreshing}
            className="p-2 bg-white hover:bg-[#F5F7F7] text-[#718096] hover:text-[#263746] rounded-lg text-xs font-medium border border-[#D9DEE3] transition"
            title="Refresh from Database"
            aria-label="Refresh from Database"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#087F75]' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleRunDetection}
            disabled={isAnalyzing}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#087F75] hover:bg-[#115E59] active:bg-[#134E4A] text-white font-medium rounded-lg text-xs transition shadow-sm disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Scanning Corpus...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run Overlap Analysis</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Action Notification Feedback */}
      {actionFeedback && (
        <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-[#087F75] text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-[#087F75] shrink-0" />
            <span className="font-medium">{actionFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="p-1 text-[#087F75] hover:text-[#115E59]"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Primary Telemetry Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#D9DEE3] shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-medium uppercase tracking-wider text-[#718096] block">
              Flagged for Review
            </span>
            <span className="text-2xl font-bold text-[#D97736]">{flaggedCount}</span>
            <span className="text-[11px] text-[#718096] block">Awaiting Officer Decision</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#D97736]/10 text-[#D97736] border border-[#D97736]/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D9DEE3] shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-medium uppercase tracking-wider text-[#718096] block">
              High Confidence Matches
            </span>
            <span className="text-2xl font-bold text-[#DC3545]">{highConfidenceCount}</span>
            <span className="text-[11px] text-[#718096] block">Cosine Similarity &ge; 85%</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#DC3545]/10 text-[#DC3545] border border-[#DC3545]/20">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D9DEE3] shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-medium uppercase tracking-wider text-[#718096] block">
              Confirmed Duplicates
            </span>
            <span className="text-2xl font-bold text-[#198754]">{duplicateCount}</span>
            <span className="text-[11px] text-[#718096] block">Binding Officer Ruling</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#198754]/10 text-[#198754] border border-[#198754]/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D9DEE3] shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-medium uppercase tracking-wider text-[#718096] block">
              Related Cross-Cases
            </span>
            <span className="text-2xl font-bold text-[#087F75]">{relatedCount}</span>
            <span className="text-[11px] text-[#718096] block">Linked in Redressal Grid</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#087F75]/10 text-[#087F75] border border-[#087F75]/20">
            <GitCompare className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 pb-2 text-xs">
        {[
          { key: 'All', label: `All Pairs (${overlaps.length})` },
          { key: 'Flagged', label: `Awaiting Review (${flaggedCount})` },
          { key: 'Duplicate', label: `Confirmed Duplicates (${duplicateCount})` },
          { key: 'Related', label: `Related Cases (${relatedCount})` },
          { key: 'Unrelated', label: 'Dismissed / Unrelated' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === tab.key
                ? 'bg-[#087F75] text-white font-semibold shadow-sm'
                : 'bg-white text-[#718096] hover:text-[#263746] hover:bg-[#F5F7F7] border border-[#D9DEE3]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. Main Content Area */}
      {error ? (
        <div className="bg-white p-8 rounded-xl border border-[#DC3545]/25 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#DC3545]/10 text-[#DC3545] border border-[#DC3545]/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#DC3545]">Unable to Fetch Overlap Records</h3>
          <p className="text-xs text-[#718096] max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={() => fetchOverlaps()}
            className="px-4 py-2 rounded-lg bg-[#087F75] hover:bg-[#115E59] text-white text-xs font-semibold transition"
          >
            Retry Request
          </button>
        </div>
      ) : loading ? (
        <div className="bg-white rounded-xl border border-[#D9DEE3] p-12 text-center space-y-3 shadow-sm">
          <RefreshCw className="w-7 h-7 animate-spin text-[#087F75] mx-auto" />
          <p className="text-sm font-semibold text-[#263746]">Loading case overlap telemetry from database...</p>
        </div>
      ) : filteredOverlaps.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-[#D9DEE3] text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-[#087F75]/10 text-[#087F75] border border-[#087F75]/20 flex items-center justify-center mx-auto">
            <GitCompare className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#263746]">
            {overlaps.length === 0
              ? 'No Case Overlaps Currently Recorded'
              : 'No Pairs Match Active Filter'}
          </h3>
          <p className="text-xs text-[#718096] max-w-md mx-auto">
            {overlaps.length === 0
              ? 'Run the TF-IDF and Cosine Similarity analysis across the 500+ registered grievances to detect potential duplicates and cross-bureau overlaps.'
              : 'Try switching the filter above or run a fresh analysis with a lower similarity threshold.'}
          </p>
          {overlaps.length === 0 && (
            <button
              type="button"
              onClick={handleRunDetection}
              disabled={isAnalyzing}
              className="px-5 py-2.5 rounded-lg bg-[#087F75] hover:bg-[#115E59] text-white font-medium text-xs transition shadow-sm"
            >
              Run First Overlap Scan
            </button>
          )}
        </div>
      ) : (
        /* 5. Populated Overlap Comparison Cards */
        <div className="space-y-4">
          {filteredOverlaps.map((item) => {
            const scorePct = (parseFloat(item.similarity_score) * 100).toFixed(1);
            const isHighMatch = parseFloat(item.similarity_score) >= 0.85;
            const isReviewed = item.status && item.status !== 'Flagged';
            const isSubmitting = submittingReviewId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-[#D9DEE3] overflow-hidden shadow-sm hover:shadow transition-shadow"
              >
                {/* Card Header: Score, Type & Status */}
                <div className="p-4 bg-[#F5F7F7] border-b border-[#D9DEE3] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#263746] bg-white px-2.5 py-1 rounded border border-[#D9DEE3]">
                      PAIR #{item.id}
                    </span>

                    {/* Similarity Meter Badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-mono text-xs font-bold flex items-center space-x-1.5 border ${
                        isHighMatch
                          ? 'bg-[#DC3545]/10 text-[#DC3545] border-[#DC3545]/25'
                          : 'bg-[#087F75]/10 text-[#087F75] border-[#087F75]/25'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{scorePct}% Match</span>
                    </span>

                    {/* Overlap Classification */}
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-white text-[#263746] border border-[#D9DEE3]">
                      {item.overlap_type || 'Semantic Duplicate'}
                    </span>
                  </div>

                  <div>
                    <StatusBadge status={item.status} />
                  </div>
                </div>

                {/* AI Rationale & Overlapping Keywords */}
                <div className="p-4 bg-white border-b border-[#D9DEE3] space-y-2 text-xs">
                  <div className="flex items-start space-x-2">
                    <Sparkles className="w-4 h-4 text-[#087F75] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#263746]">AI Detection Rationale: </span>
                      <span className="text-[#263746]">{item.reason}</span>
                    </div>
                  </div>

                  {item.matching_keywords && item.matching_keywords.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-semibold text-[#718096] uppercase tracking-wider">
                        Matched Lexical Terms:
                      </span>
                      {item.matching_keywords.map((kw, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F5F7F7] text-[#087F75] border border-[#D9DEE3]"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Side-by-Side Complaint Comparison Cards */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
                  {/* Primary Complaint */}
                  <div className="p-4 rounded-xl border border-[#D9DEE3] bg-white space-y-2.5 text-xs shadow-sm">
                    <div className="flex items-center justify-between border-b border-[#D9DEE3] pb-2">
                      <span className="text-[11px] font-mono font-bold text-[#087F75] uppercase tracking-wider">
                        Primary Grievance
                      </span>
                      <Link
                        to={`/complaints/${item.primary_complaint?.complaint_no || item.primary_complaint_id}`}
                        className="text-[#087F75] hover:underline font-mono font-bold inline-flex items-center space-x-1"
                      >
                        <span>{item.primary_complaint?.complaint_no || `ID #${item.primary_complaint_id}`}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    <div>
                      <p className="font-bold text-[#263746] text-sm line-clamp-1">
                        {item.primary_complaint?.subject || 'Subject details loaded'}
                      </p>
                      <p className="text-[11px] text-[#718096] mt-0.5">
                        Bureau: <strong className="text-[#263746]">{item.primary_complaint?.bureau || '—'}</strong> • Category: {item.primary_complaint?.category || '—'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#F5F7F7] border border-[#D9DEE3] text-[11px] text-[#263746] line-clamp-3 leading-relaxed">
                      {item.primary_complaint?.description || 'Narrative allegation loaded from database.'}
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[11px] text-[#718096]">
                      <span>Institution ID: #{item.primary_complaint?.institution_id}</span>
                      <span>Filed: {formatDate(item.primary_complaint?.filing_date)}</span>
                    </div>
                  </div>

                  {/* Matched Related Complaint */}
                  <div className="p-4 rounded-xl border border-[#D9DEE3] bg-white space-y-2.5 text-xs shadow-sm">
                    <div className="flex items-center justify-between border-b border-[#D9DEE3] pb-2">
                      <span className="text-[11px] font-mono font-bold text-[#263746] uppercase tracking-wider">
                        Matched Related Grievance
                      </span>
                      <Link
                        to={`/complaints/${item.related_complaint?.complaint_no || item.related_complaint_id}`}
                        className="text-[#263746] hover:text-[#087F75] hover:underline font-mono font-bold inline-flex items-center space-x-1"
                      >
                        <span>{item.related_complaint?.complaint_no || `ID #${item.related_complaint_id}`}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    <div>
                      <p className="font-bold text-[#263746] text-sm line-clamp-1">
                        {item.related_complaint?.subject || 'Subject details loaded'}
                      </p>
                      <p className="text-[11px] text-[#718096] mt-0.5">
                        Bureau: <strong className="text-[#263746]">{item.related_complaint?.bureau || '—'}</strong> • Category: {item.related_complaint?.category || '—'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#F5F7F7] border border-[#D9DEE3] text-[11px] text-[#263746] line-clamp-3 leading-relaxed">
                      {item.related_complaint?.description || 'Narrative allegation loaded from database.'}
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[11px] text-[#718096]">
                      <span>Institution ID: #{item.related_complaint?.institution_id}</span>
                      <span>Filed: {formatDate(item.related_complaint?.filing_date)}</span>
                    </div>
                  </div>
                </div>

                {/* Reviewer Determination Action Bar */}
                <div className="p-4 bg-[#F5F7F7] border-t border-[#D9DEE3] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                  <div>
                    {isReviewed ? (
                      <div className="flex items-center space-x-2 text-[#263746]">
                        <CheckCircle2 className="w-4 h-4 text-[#198754]" />
                        <span>
                          Officer Determination: <strong className="text-[#263746]">{item.status}</strong>
                          {item.reviewed_at && ` (Recorded ${formatDate(item.reviewed_at)})`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1.5 text-[#D97736]">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span className="font-semibold">Reviewer Determination Required (AI suggestion is non-binding)</span>
                      </div>
                    )}
                  </div>

                  {/* Binding Decision Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleReviewDecision(item.id, 'Duplicate')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center space-x-1.5 ${
                        item.status === 'Duplicate' || item.status === 'Confirmed Linked'
                          ? 'bg-[#DC3545] text-white shadow-sm'
                          : 'bg-white hover:bg-[#DC3545]/10 text-[#DC3545] border border-[#DC3545]/30'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Mark as Duplicate</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleReviewDecision(item.id, 'Related')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center space-x-1.5 ${
                        item.status === 'Related'
                          ? 'bg-[#087F75] text-white shadow-sm'
                          : 'bg-white hover:bg-[#087F75]/10 text-[#087F75] border border-[#087F75]/30'
                      }`}
                    >
                      <GitCompare className="w-3.5 h-3.5" />
                      <span>Mark as Related</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleReviewDecision(item.id, 'Unrelated')}
                      className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center space-x-1.5 ${
                        item.status === 'Unrelated' || item.status === 'Dismissed'
                          ? 'bg-[#263746] text-white shadow-sm'
                          : 'bg-white hover:bg-[#F5F7F7] text-[#718096] hover:text-[#263746] border border-[#D9DEE3]'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Dismiss (Unrelated)</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CaseOverlap;
