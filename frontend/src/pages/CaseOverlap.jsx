import React from 'react';
import { GitCompare, Sparkles, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export function CaseOverlap() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Feature 1: ML Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Smart Case Overlap & Relationship Detector</h1>
          <p className="text-sm text-slate-400 mt-1">
            Detects duplicate complaints and links related cross-bureau cases using NLP similarity algorithms.
          </p>
        </div>
        <button
          type="button"
          disabled
          className="px-4 py-2 bg-slate-800 text-slate-500 rounded-lg text-sm cursor-not-allowed border border-slate-700"
        >
          Run Overlap Analysis (Phase 2)
        </button>
      </div>

      {/* Feature Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <h3 className="text-sm font-semibold text-white">1. NLP Semantic Comparison</h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Evaluates text vectors and TF-IDF representations to match complaints despite varied phrasing and vocabulary.
          </p>
        </div>
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <h3 className="text-sm font-semibold text-white">2. Multi-Bureau Cross-Referencing</h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Identifies when a student files simultaneously with the Approval Bureau and the Anti-Ragging Cell.
          </p>
        </div>
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <h3 className="text-sm font-semibold text-white">3. Human Review Workflow</h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            AI flags potential duplicates with confidence ratings; AICTE officers make final binding determinations.
          </p>
        </div>
      </div>

      {/* Placeholder State */}
      <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
          <GitCompare className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-white">Overlap Detector Ready for Algorithm Training</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Route <code>/api/v1/overlap</code> and Python detector module <code>backend/app/ml/overlap_detector.py</code> are created.
          In Phase 2, similarity pipelines will process ingested synthetic complaints.
        </p>
      </div>
    </div>
  );
}

export default CaseOverlap;
