import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  GitCompare,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  Building2,
  Calendar,
  FileText,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Eye,
  Check,
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
    <div className="space-y-6">
      {/* Top Header & ML Control Bar */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800/90 shadow-xl flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Feature 1: ML Intelligence</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs font-mono text-slate-400">TF-IDF Vectorization & Cosine Similarity</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white mt-1">
            Smart Case Relationship & Overlap Detector
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Detect duplicate grievances and cross-bureau related filings using scikit-learn NLP models, verified by authorized council officers.
          </p>
        </div>

        {/* Controls: Threshold Selector & Run Action */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5 bg-[#07101e] px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Threshold:</span>
            <select
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              disabled={isAnalyzing}
              className="bg-transparent text-cyan-400 font-semibold focus:outline-none cursor-pointer"
            >
              <option value={0.50} className="bg-slate-900 text-slate-200">50% (High Recall)</option>
              <option value={0.60} className="bg-slate-900 text-slate-200">60% (Recommended)</option>
              <option value={0.70} className="bg-slate-900 text-slate-200">70% (Strict)</option>
              <option value={0.85} className="bg-slate-900 text-slate-200">85% (Near Duplicate)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => fetchOverlaps(true)}
            disabled={loading || isRefreshing}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-medium border border-slate-800 transition"
            title="Refresh from Database"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleRunDetection}
            disabled={isAnalyzing}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-amber-500/20 disabled:opacity-60"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
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
        <div className="p-3.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="font-medium">{actionFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="p-1 text-teal-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Primary Telemetry Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800/90 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block">Flagged for Review</span>
            <span className="text-xl font-extrabold text-amber-400">{flaggedCount}</span>
            <span className="text-[10px] text-slate-500 block">Awaiting Officer Decision</span>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800/90 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block">High Confidence Matches</span>
            <span className="text-xl font-extrabold text-rose-400">{highConfidenceCount}</span>
            <span className="text-[10px] text-slate-500 block">Cosine Similarity &ge; 85%</span>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800/90 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block">Confirmed Duplicates</span>
            <span className="text-xl font-extrabold text-teal-400">{duplicateCount}</span>
            <span className="text-[10px] text-slate-500 block">Binding Officer Ruling</span>
          </div>
          <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800/90 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block">Related Cross-Cases</span>
            <span className="text-xl font-extrabold text-cyan-400">{relatedCount}</span>
            <span className="text-[10px] text-slate-500 block">Linked In Redressal Grid</span>
          </div>
          <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <GitCompare className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3 text-xs">
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
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              statusFilter === tab.key
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      {error ? (
        <div className="glass-panel p-8 rounded-2xl border border-rose-500/30 bg-rose-950/20 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-rose-200">Unable to Fetch Overlap Records</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={() => fetchOverlaps()}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
          >
            Retry Request
          </button>
        </div>
      ) : loading ? (
        <div className="glass-panel rounded-2xl border border-slate-800/90 p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Loading case overlap telemetry from database...</p>
        </div>
      ) : filteredOverlaps.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800/90 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
            <GitCompare className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">
            {overlaps.length === 0
              ? 'No Case Overlaps Currently Recorded'
              : 'No Pairs Match Active Filter'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {overlaps.length === 0
              ? 'Run the TF-IDF and Cosine Similarity analysis across the 500+ registered grievances to detect potential duplicates and cross-bureau overlaps.'
              : 'Try switching the filter above or run a fresh analysis with a lower similarity threshold.'}
          </p>
          {overlaps.length === 0 && (
            <button
              type="button"
              onClick={handleRunDetection}
              disabled={isAnalyzing}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20"
            >
              Run First Overlap Scan
            </button>
          )}
        </div>
      ) : (
        /* Populated Overlap Comparison Cards */
        <div className="space-y-5">
          {filteredOverlaps.map((item) => {
            const scorePct = (parseFloat(item.similarity_score) * 100).toFixed(1);
            const isHighMatch = parseFloat(item.similarity_score) >= 0.85;
            const isReviewed = item.status && item.status !== 'Flagged';
            const isSubmitting = submittingReviewId === item.id;

            return (
              <div
                key={item.id}
                className="glass-panel rounded-2xl border border-slate-800/90 overflow-hidden shadow-xl hover:border-slate-700 transition"
              >
                {/* Card Header with Scores & Classification */}
                <div className="p-4 bg-[#07101e] border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      PAIR #{item.id}
                    </span>

                    {/* Similarity Meter Badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-mono text-xs font-bold flex items-center space-x-1.5 border ${
                        isHighMatch
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{scorePct}% Match</span>
                    </span>

                    {/* Overlap Type Badge */}
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {item.overlap_type || 'Semantic Duplicate'}
                    </span>
                  </div>

                  {/* Status Indicator */}
                  <div>
                    <StatusBadge status={item.status} />
                  </div>
                </div>

                {/* AI Rationale & Overlapping Keywords */}
                <div className="p-4 bg-[#0a1424]/60 border-b border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-start space-x-2">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-200">AI Detection Rationale: </span>
                      <span className="text-slate-300">{item.reason}</span>
                    </div>
                  </div>

                  {item.matching_keywords && item.matching_keywords.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Matched Lexical Terms:
                      </span>
                      {item.matching_keywords.map((kw, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/40 text-cyan-300 border border-cyan-500/30"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Side-by-Side Complaint Comparison Columns */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Primary Complaint */}
                  <div className="p-4 rounded-xl bg-[#07101e] border border-cyan-500/25 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                        Primary Grievance
                      </span>
                      <Link
                        to={`/complaints/${item.primary_complaint?.complaint_no || item.primary_complaint_id}`}
                        className="text-cyan-400 hover:text-cyan-300 font-mono font-bold inline-flex items-center space-x-1"
                      >
                        <span>{item.primary_complaint?.complaint_no || `ID #${item.primary_complaint_id}`}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    <div>
                      <p className="font-bold text-white text-sm line-clamp-1">
                        {item.primary_complaint?.subject || 'Subject details loaded'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Bureau: <strong className="text-slate-300">{item.primary_complaint?.bureau || '—'}</strong> • Category: {item.primary_complaint?.category || '—'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-[11px] text-slate-300 line-clamp-3 leading-relaxed">
                      {item.primary_complaint?.description || 'Narrative allegation loaded from database.'}
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Institution ID: #{item.primary_complaint?.institution_id}</span>
                      <span>Filed: {formatDate(item.primary_complaint?.filing_date)}</span>
                    </div>
                  </div>

                  {/* Related Complaint */}
                  <div className="p-4 rounded-xl bg-[#07101e] border border-amber-500/25 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                        Matched Related Grievance
                      </span>
                      <Link
                        to={`/complaints/${item.related_complaint?.complaint_no || item.related_complaint_id}`}
                        className="text-amber-400 hover:text-amber-300 font-mono font-bold inline-flex items-center space-x-1"
                      >
                        <span>{item.related_complaint?.complaint_no || `ID #${item.related_complaint_id}`}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    <div>
                      <p className="font-bold text-white text-sm line-clamp-1">
                        {item.related_complaint?.subject || 'Subject details loaded'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Bureau: <strong className="text-slate-300">{item.related_complaint?.bureau || '—'}</strong> • Category: {item.related_complaint?.category || '—'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-[11px] text-slate-300 line-clamp-3 leading-relaxed">
                      {item.related_complaint?.description || 'Narrative allegation loaded from database.'}
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Institution ID: #{item.related_complaint?.institution_id}</span>
                      <span>Filed: {formatDate(item.related_complaint?.filing_date)}</span>
                    </div>
                  </div>
                </div>

                {/* Reviewer Determination Action Bar (Requirement 8) */}
                <div className="p-4 bg-[#07101e] border-t border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                  <div>
                    {isReviewed ? (
                      <div className="flex items-center space-x-2 text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-teal-400" />
                        <span>
                          Officer Determination: <strong className="text-white">{item.status}</strong>
                          {item.reviewed_at && ` (Recorded ${formatDate(item.reviewed_at)})`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1.5 text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span className="font-semibold">Reviewer Determination Required (AI suggestion non-binding)</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleReviewDecision(item.id, 'Duplicate')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center space-x-1 ${
                        item.status === 'Duplicate' || item.status === 'Confirmed Linked'
                          ? 'bg-rose-500 text-slate-950 font-bold'
                          : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Mark as Duplicate</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleReviewDecision(item.id, 'Related')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center space-x-1 ${
                        item.status === 'Related'
                          ? 'bg-teal-500 text-slate-950 font-bold'
                          : 'bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30'
                      }`}
                    >
                      <GitCompare className="w-3.5 h-3.5" />
                      <span>Mark as Related</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleReviewDecision(item.id, 'Unrelated')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center space-x-1 ${
                        item.status === 'Unrelated' || item.status === 'Dismissed'
                          ? 'bg-slate-700 text-white font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700'
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
