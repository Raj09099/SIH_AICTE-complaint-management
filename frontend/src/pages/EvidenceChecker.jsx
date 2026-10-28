import React from 'react';
import { FileCheck2, Sparkles, UploadCloud, AlertCircle, FileSearch, ShieldCheck } from 'lucide-react';

export function EvidenceChecker() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Feature 3: Verification Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Resolution Evidence Checker</h1>
          <p className="text-sm text-slate-400 mt-1">
            Extracts PDF document text and assesses relevance against claimed complaint resolutions.
          </p>
        </div>
      </div>

      {/* Upload & Inspect Dropzone */}
      <div className="glass-panel p-8 rounded-2xl border border-dashed border-slate-700 hover:border-slate-600 transition text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">Upload Resolution Evidence Document (PDF)</h3>
          <p className="text-xs text-slate-400 mt-1">
            Supports compliance letters, student receipt affidavits, and institutional inspection proofs up to 25MB.
          </p>
        </div>
        <button
          type="button"
          disabled
          className="px-4 py-2 bg-slate-800 text-slate-500 rounded-lg text-xs font-medium cursor-not-allowed border border-slate-700"
        >
          Select PDF File (Phase 2)
        </button>
      </div>

      {/* Feature Capabilities */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center space-x-2 text-blue-400 mb-2">
            <FileSearch className="w-4 h-4" />
            <h3 className="text-sm font-semibold text-white">PyMuPDF Text Parser</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            High accuracy text and metadata extraction from institutional response documentation.
          </p>
        </div>
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center space-x-2 text-blue-400 mb-2">
            <Sparkles className="w-4 h-4" />
            <h3 className="text-sm font-semibold text-white">Relevance Scoring</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Calculates thematic overlap score between the original student grievance and institutional affidavit.
          </p>
        </div>
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center space-x-2 text-emerald-400 mb-2">
            <ShieldCheck className="w-4 h-4" />
            <h3 className="text-sm font-semibold text-white">Official Human Review</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Algorithm results support human judgment; decisions are confirmed by authorized AICTE officers.
          </p>
        </div>
      </div>
    </div>
  );
}

export default EvidenceChecker;
