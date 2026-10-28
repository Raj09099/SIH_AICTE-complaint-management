import React from 'react';
import { Network, Sparkles, TrendingUp, Layers, MapPin } from 'lucide-react';

export function ProblemPatterns() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Feature 2: Systemic Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Multi-Institution Problem Pattern Detector</h1>
          <p className="text-sm text-slate-400 mt-1">
            Groups similar complaints from multiple institutions to uncover systemic and recurring issues.
          </p>
        </div>
        <button
          type="button"
          disabled
          className="px-4 py-2 bg-slate-800 text-slate-500 rounded-lg text-sm cursor-not-allowed border border-slate-700"
        >
          Cluster Complaints (Phase 2)
        </button>
      </div>

      {/* Feature Capabilities */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center space-x-2 text-purple-400 mb-2">
            <Layers className="w-4 h-4" />
            <h3 className="text-sm font-semibold text-white">Cross-College Clustering</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Unsupervised algorithms cluster complaints by underlying grievance patterns rather than superficial keywords.
          </p>
        </div>
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center space-x-2 text-purple-400 mb-2">
            <TrendingUp className="w-4 h-4" />
            <h3 className="text-sm font-semibold text-white">Anomaly & Surge Detection</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Identifies sudden spikes in specific categories (e.g. tuition fees, withholding marksheets) across a region.
          </p>
        </div>
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center space-x-2 text-purple-400 mb-2">
            <MapPin className="w-4 h-4" />
            <h3 className="text-sm font-semibold text-white">Geographic Correlation</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Maps affected institutions by state and affiliating university to guide regulatory advisories.
          </p>
        </div>
      </div>

      {/* Placeholder State */}
      <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mx-auto">
          <Network className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-white">Pattern Detector Pipeline Standby</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Route <code>/api/v1/patterns</code> and ML module <code>backend/app/ml/pattern_detector.py</code> are initialized.
          Clustering models will execute in Phase 2 once complaints are ingested.
        </p>
      </div>
    </div>
  );
}

export default ProblemPatterns;
