import React from 'react';
import { FileCheck2, Sparkles, UploadCloud, AlertCircle, FileSearch, ShieldCheck } from 'lucide-react';

export function EvidenceChecker() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-[#087F75] border border-teal-200 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Feature 3: Verification Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#263746]">Resolution Evidence Checker</h1>
          <p className="text-sm text-[#718096] mt-1">
            Extracts PDF document text and assesses relevance against claimed complaint resolutions.
          </p>
        </div>
      </div>

      {/* Upload & Inspect Dropzone */}
      <div className="bg-white p-8 rounded-2xl border border-dashed border-[#D9DEE3] hover:border-[#087F75] transition text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-teal-50 text-[#087F75] border border-teal-200 flex items-center justify-center mx-auto">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-[#263746]">Upload Resolution Evidence Document (PDF)</h3>
          <p className="text-xs text-[#718096] mt-1">
            Supports compliance letters, student receipt affidavits, and institutional inspection proofs up to 25MB.
          </p>
        </div>
        <button
          type="button"
          disabled
          className="px-4 py-2 bg-[#F5F7F7] text-[#718096] rounded-lg text-xs font-medium cursor-not-allowed border border-[#D9DEE3]"
        >
          Select PDF File (Phase 2)
        </button>
      </div>

      {/* Feature Capabilities */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#D9DEE3] shadow-sm">
          <div className="flex items-center space-x-2 text-[#087F75] mb-2">
            <FileSearch className="w-4 h-4" />
            <h3 className="text-sm font-semibold text-[#263746]">PyMuPDF Text Parser</h3>
          </div>
          <p className="text-xs text-[#718096] leading-relaxed">
            High accuracy text and metadata extraction from institutional response documentation.
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#D9DEE3] shadow-sm">
          <div className="flex items-center space-x-2 text-[#087F75] mb-2">
            <Sparkles className="w-4 h-4" />
            <h3 className="text-sm font-semibold text-[#263746]">Relevance Scoring</h3>
          </div>
          <p className="text-xs text-[#718096] leading-relaxed">
            Calculates thematic overlap score between the original student grievance and institutional affidavit.
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#D9DEE3] shadow-sm">
          <div className="flex items-center space-x-2 text-[#198754] mb-2">
            <ShieldCheck className="w-4 h-4" />
            <h3 className="text-sm font-semibold text-[#263746]">Official Human Review</h3>
          </div>
          <p className="text-xs text-[#718096] leading-relaxed">
            Algorithm results support human judgment; decisions are confirmed by authorized AICTE officers.
          </p>
        </div>
      </div>
    </div>
  );
}

export default EvidenceChecker;
