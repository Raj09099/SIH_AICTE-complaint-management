import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Download,
  ExternalLink,
  FileCheck2,
  FileSearch,
  FileText,
  HelpCircle,
  Info,
  Layers,
  Lock,
  MinusCircle,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
  XCircle,
} from 'lucide-react';
import { evidenceService } from '../services/evidence';
import { complaintService } from '../services/complaints';
import { useAuth } from '../context/AuthContext';

export function EvidenceChecker() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // URL search query: ?complaintId=...
  const queryParams = new URLSearchParams(location.search);
  const initialComplaintId = queryParams.get('complaintId')
    ? parseInt(queryParams.get('complaintId'), 10)
    : null;

  // Selected complaint and candidates
  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [selectedComplaintId, setSelectedComplaintId] = useState(initialComplaintId);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [officerNotes, setOfficerNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Evidence list and active result
  const [evidenceList, setEvidenceList] = useState([]);
  const [activeEvidence, setActiveEvidence] = useState(null);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);

  // Text preview toggle
  const [showExtractedText, setShowExtractedText] = useState(false);

  // Human review form state
  const [reviewDecision, setReviewDecision] = useState('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState(null);
  const [reviewErrorMsg, setReviewErrorMsg] = useState(null);

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Load candidate complaints with automatic fallback
  const fetchCandidates = async (query = '') => {
    setCandidatesLoading(true);
    try {
      const data = await evidenceService.getCandidates({ search: query, limit: 50 });
      if (Array.isArray(data) && data.length > 0) {
        setCandidates(data);
        return;
      }
      // If evidence candidate returns empty, query complaints directly
      const compData = await complaintService.getComplaints({ search: query, limit: 50 });
      const list = Array.isArray(compData) ? compData : (compData?.items || []);
      if (list && list.length > 0) {
        setCandidates(list.map((c) => ({
          id: c.id,
          complaint_no: c.complaint_no,
          category: c.category,
          bureau: c.bureau,
          subject: c.subject,
          description: c.description || '',
          institution_id: c.institution_id,
          institution_name: c.institution?.name || `Institution #${c.institution_id}`,
          status: c.status || 'New',
          filing_date: c.filing_date,
          evidence_count: 0,
        })));
      } else {
        setCandidates([]);
      }
    } catch (err) {
      console.warn('Could not fetch candidate complaints via evidenceService, falling back:', err);
      try {
        const compData = await complaintService.getComplaints({ search: query, limit: 50 });
        const list = Array.isArray(compData) ? compData : (compData?.items || []);
        if (list && list.length > 0) {
          setCandidates(list.map((c) => ({
            id: c.id,
            complaint_no: c.complaint_no,
            category: c.category,
            bureau: c.bureau,
            subject: c.subject,
            description: c.description || '',
            institution_id: c.institution_id,
            institution_name: c.institution?.name || `Institution #${c.institution_id}`,
            status: c.status || 'New',
            filing_date: c.filing_date,
            evidence_count: 0,
          })));
        }
      } catch (fallbackErr) {
        console.error('Fallback candidates fetch also failed:', fallbackErr);
      }
    } finally {
      setCandidatesLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates(searchQuery);
  }, []);

  // When selectedComplaintId changes, load complaint details and its evidence dossiers
  useEffect(() => {
    if (!selectedComplaintId) {
      setSelectedComplaint(null);
      setEvidenceList([]);
      setActiveEvidence(null);
      return;
    }

    // Immediately resolve known candidate from cache for instantaneous UI feedback
    const candidateMatch = candidates.find((c) => c.id === selectedComplaintId);
    if (candidateMatch) {
      setSelectedComplaint((prev) => prev?.id === selectedComplaintId ? prev : candidateMatch);
    }

    const loadComplaintAndEvidence = async () => {
      setIsLoadingEvidence(true);
      setUploadError(null);
      setReviewSuccessMsg(null);
      setReviewErrorMsg(null);
      try {
        const getFn = complaintService.getComplaintById || complaintService.getById;
        let comp = null;
        try {
          comp = await getFn(selectedComplaintId);
        } catch (compErr) {
          console.warn('complaintService.getComplaintById failed, using cached candidate:', compErr);
          comp = candidateMatch;
        }
        if (comp) {
          setSelectedComplaint(comp);
        }

        try {
          const evidences = await evidenceService.getByComplaint(selectedComplaintId);
          setEvidenceList(evidences || []);
          if (evidences && evidences.length > 0) {
            setActiveEvidence(evidences[0]);
          } else {
            setActiveEvidence(null);
          }
        } catch (evErr) {
          console.warn('Could not load evidence list for complaint:', evErr);
          setEvidenceList([]);
          setActiveEvidence(null);
        }
      } catch (err) {
        console.error('Failed to load complaint or evidence:', err);
      } finally {
        setIsLoadingEvidence(false);
      }
    };

    loadComplaintAndEvidence();
  }, [selectedComplaintId]);

  // Handle file drop/selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        setUploadError('File size exceeds the 25MB maximum limit.');
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        setUploadError('File size exceeds the 25MB maximum limit.');
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  // Submit upload and verification
  const handleUploadAndVerify = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (!selectedComplaintId) {
      setUploadError('Please select a target complaint from the dropdown above to verify against.');
      return;
    }
    if (!selectedFile) {
      setUploadError('Please choose or drop a PDF or DOCX resolution evidence file from your device.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setReviewSuccessMsg(null);

    try {
      const result = await evidenceService.uploadAndVerify(
        selectedFile,
        selectedComplaintId,
        officerNotes
      );
      setActiveEvidence(result);
      setEvidenceList((prev) => [result, ...(prev || [])]);
      setSelectedFile(null);
      setOfficerNotes('');
      setShowExtractedText(true);
    } catch (err) {
      console.error('Evidence upload failed:', err);
      setUploadError(
        err.response?.data?.detail || 'Failed to parse and verify resolution evidence document.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Open confirmation modal
  const handleInitiateReview = (e) => {
    e.preventDefault();
    if (!activeEvidence) return;
    if (!reviewNotes.trim() || reviewNotes.trim().length < 5) {
      setReviewErrorMsg('Verification findings/rationale must be at least 5 characters long.');
      return;
    }
    setReviewErrorMsg(null);
    setShowConfirmModal(true);
  };

  // Confirm and execute review
  const handleConfirmReview = async () => {
    setShowConfirmModal(false);
    setIsSubmittingReview(true);
    setReviewSuccessMsg(null);
    setReviewErrorMsg(null);

    try {
      const updated = await evidenceService.submitReview(activeEvidence.id, {
        decision: reviewDecision,
        verification_notes: reviewNotes.trim(),
        resolution_summary: resolutionSummary.trim() || reviewNotes.trim(),
      });

      setActiveEvidence(updated);
      setEvidenceList((prev) =>
        prev.map((ev) => (ev.id === updated.id ? updated : ev))
      );

      // Refresh selected complaint to reflect status changes
      try {
        const getFn = complaintService.getComplaintById || complaintService.getById;
        const comp = await getFn(selectedComplaintId);
        if (comp) {
          setSelectedComplaint(comp);
        }
      } catch (err) {
        console.warn('Could not refresh complaint status after review:', err);
      }

      setReviewSuccessMsg(
        reviewDecision === 'approved'
          ? 'Resolution verified and approved. Complaint status updated to "Resolved".'
          : reviewDecision === 'rejected'
          ? 'Evidence rejected. Complaint status updated to "Evidence Requested".'
          : 'Supplementary information requested from institution.'
      );
    } catch (err) {
      console.error('Failed to submit human review:', err);
      setReviewErrorMsg(
        err.response?.data?.detail || 'Failed to submit human review decision.'
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Helper for 4-state checklist styling
  const getChecklistBadge = (status) => {
    switch (status) {
      case 'Present':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D]" />,
          style: 'bg-emerald-50 text-[#15803D] border-emerald-200',
        };
      case 'Missing':
        return {
          icon: <XCircle className="w-3.5 h-3.5 text-[#DC3545]" />,
          style: 'bg-red-50 text-[#DC3545] border-red-200',
        };
      case 'Unable to Verify':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-[#D97736]" />,
          style: 'bg-amber-50 text-[#D97736] border-amber-200',
        };
      case 'Not Applicable':
      default:
        return {
          icon: <MinusCircle className="w-3.5 h-3.5 text-[#718096]" />,
          style: 'bg-slate-100 text-[#718096] border-[#D9DEE3]',
        };
    }
  };

  // Helper for recommendation badges
  const getRecommendationBadge = (code) => {
    switch (code) {
      case 'APPROVE_RECOMMENDED':
        return {
          label: 'Approve Recommended',
          style: 'bg-emerald-100 text-[#15803D] border-emerald-300',
          icon: <CheckCircle2 className="w-4 h-4 mr-1 text-[#15803D]" />,
        };
      case 'SCRUTINIZE_RECOMMENDED':
        return {
          label: 'Scrutiny Advised',
          style: 'bg-amber-100 text-[#D97736] border-amber-300',
          icon: <AlertTriangle className="w-4 h-4 mr-1 text-[#D97736]" />,
        };
      case 'REJECT_RECOMMENDED':
      default:
        return {
          label: 'Reject Recommended',
          style: 'bg-red-100 text-[#DC3545] border-red-300',
          icon: <XCircle className="w-4 h-4 mr-1 text-[#DC3545]" />,
        };
    }
  };

  const breakdown = activeEvidence?.relevance_breakdown || {};
  const scoreComponents = breakdown.score_components || [];
  const checklistItems = breakdown.checklist || [];
  const entityMatches = breakdown.entity_matches || [];
  const warnings = breakdown.warnings || [];
  const matchedKeywords = breakdown.matched_keywords || [];
  const missingElements = breakdown.missing_elements || [];

  const filteredCandidates = candidates.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const cNo = (c.complaint_no || '').toLowerCase();
    const cCat = (c.category || '').toLowerCase();
    const cInst = (c.institution_name || '').toLowerCase();
    const cSubj = (c.subject || '').toLowerCase();
    const cId = String(c.id || '');
    return cNo.includes(q) || cCat.includes(q) || cInst.includes(q) || cSubj.includes(q) || cId.includes(q);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-[#D9DEE3] shadow-sm">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#087F75] text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Feature 3 • PyMuPDF Resolution Evidence Checker</span>
          </div>
          <h1 className="text-2xl font-bold text-[#263746]">Resolution Evidence Checker</h1>
          <p className="text-sm text-[#718096] mt-1 max-w-3xl">
            Extracts text from institutional compliance PDFs and DOCX files using PyMuPDF, scores contextual relevance against student grievances with an explainable 6-factor model, and empowers AICTE officers to prevent false complaint closures.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs bg-slate-100 text-[#263746] px-3 py-1.5 rounded-lg border border-[#D9DEE3] font-mono">
            PyMuPDF v1.26 + Scikit-Learn
          </span>
        </div>
      </div>

      {/* Grid: Left Column (Complaint Selector & Upload) | Right Column (AI Score & Review) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Step 1: Complaint Selector */}
          <div className="bg-white p-5 rounded-xl border border-[#D9DEE3] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#263746] uppercase tracking-wider flex items-center space-x-1.5">
                <span className="w-5 h-5 rounded-full bg-[#087F75] text-white flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>Target Grievance Case</span>
              </span>
              {selectedComplaint && (
                <span className="text-xs text-[#087F75] font-semibold">
                  {selectedComplaint.complaint_no}
                </span>
              )}
            </div>

            {/* Search Input for candidates */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#718096]" />
              <input
                type="text"
                placeholder="Search complaint no, institution, category..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  fetchCandidates(e.target.value);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#D9DEE3] rounded-lg focus:outline-none focus:border-[#087F75]"
              />
            </div>

            {/* Candidate Dropdown Selector */}
            <div>
              <select
                value={selectedComplaintId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedComplaintId(val ? parseInt(val, 10) : null);
                }}
                disabled={candidatesLoading && candidates.length === 0}
                className="w-full p-2.5 text-xs border border-[#D9DEE3] rounded-lg bg-slate-50 text-[#263746] focus:outline-none focus:border-[#087F75] disabled:opacity-60 font-medium"
              >
                <option value="">-- Choose a Complaint to Verify --</option>
                {candidatesLoading && candidates.length === 0 ? (
                  <option disabled>Loading candidate complaints...</option>
                ) : filteredCandidates.length === 0 ? (
                  <option disabled>No candidate complaints match your search query</option>
                ) : (
                  filteredCandidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.complaint_no} • {c.category} ({c.institution_name}) [{c.status}]
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Selected Complaint Overview Card */}
            {selectedComplaint ? (
              <div className="p-3.5 rounded-lg border border-teal-200 bg-teal-50/20 space-y-2 text-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-[#263746] block text-sm">
                      {selectedComplaint.complaint_no}
                    </span>
                    <span className="text-[#718096] text-[11px] flex items-center mt-0.5">
                      <Building2 className="w-3.5 h-3.5 mr-1 text-[#087F75]" />
                      {selectedComplaint.institution?.name || `Institution #${selectedComplaint.institution_id}`}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedComplaint.status === 'Resolved'
                        ? 'bg-emerald-100 text-[#15803D]'
                        : selectedComplaint.status === 'Under Review'
                        ? 'bg-amber-100 text-[#D97736]'
                        : selectedComplaint.status === 'Evidence Requested'
                        ? 'bg-red-100 text-[#DC3545]'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {selectedComplaint.status}
                  </span>
                </div>

                <div className="pt-2 border-t border-[#D9DEE3]">
                  <span className="text-[10px] font-bold text-[#718096] uppercase tracking-wider block">
                    Grievance Statement:
                  </span>
                  <p className="text-[#263746] mt-0.5 line-clamp-3 italic bg-white p-2 rounded border border-[#D9DEE3]">
                    "{selectedComplaint.translated_description || selectedComplaint.description}"
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#718096] pt-1">
                  <span>Category: <strong>{selectedComplaint.category}</strong></span>
                  <span>Bureau: <strong>{selectedComplaint.bureau}</strong></span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-slate-50 border border-dashed border-[#D9DEE3] text-center text-xs text-[#718096]">
                Please select a complaint from the list above or via the Complaint Registry.
              </div>
            )}
          </div>

          {/* Step 2: Upload Evidence File */}
          <div className="bg-white p-5 rounded-xl border border-[#D9DEE3] shadow-sm space-y-4">
            <span className="text-xs font-bold text-[#263746] uppercase tracking-wider flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-[#087F75] text-white flex items-center justify-center text-[10px]">
                2
              </span>
              <span>Upload Resolution Evidence Document</span>
            </span>

            {/* Drag & Drop File Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={`p-6 rounded-xl border-2 border-dashed text-center transition cursor-pointer ${
                selectedFile
                  ? 'border-[#087F75] bg-teal-50/30'
                  : 'border-[#D9DEE3] hover:border-[#087F75] bg-slate-50/50'
              }`}
              onClick={() => document.getElementById('evidence-file-input')?.click()}
            >
              <input
                id="evidence-file-input"
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#087F75] border border-teal-200 flex items-center justify-center mx-auto mb-2">
                <UploadCloud className="w-5 h-5" />
              </div>

              {selectedFile ? (
                <div className="space-y-1">
                  <div className="font-bold text-xs text-[#263746] truncate max-w-xs mx-auto">
                    {selectedFile.name}
                  </div>
                  <div className="text-[11px] text-[#718096]">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Ready for PyMuPDF Parsing
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    className="text-[11px] text-[#DC3545] underline font-semibold mt-1"
                  >
                    Choose Different File
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-[#263746]">
                    Click to select from device or drag & drop
                  </div>
                  <p className="text-[11px] text-[#718096]">
                    Supports PDF documents, Word (.docx), or compliance letters up to 25MB.
                  </p>
                </div>
              )}
            </div>

            {/* Officer Preliminary Notes */}
            <div>
              <label className="block text-xs font-semibold text-[#263746] mb-1">
                Preliminary Notes / Affidavit Reference (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Received via registered speed post ref #AICTE/PUN/2026..."
                value={officerNotes}
                onChange={(e) => setOfficerNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D9DEE3] rounded-lg focus:outline-none focus:border-[#087F75]"
              />
            </div>

            {uploadError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#DC3545] flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Action Button */}
            <button
              type="button"
              onClick={handleUploadAndVerify}
              disabled={isUploading}
              className={`w-full py-2.5 px-4 text-white text-xs font-bold rounded-lg transition shadow-sm flex items-center justify-center space-x-2 ${
                isUploading
                  ? 'bg-slate-400 cursor-not-allowed opacity-75'
                  : !selectedComplaintId || !selectedFile
                  ? 'bg-[#087F75] hover:bg-[#06635c] cursor-pointer'
                  : 'bg-[#087F75] hover:bg-[#06635c] cursor-pointer shadow-md'
              }`}
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Extracting with PyMuPDF & Scoring...</span>
                </>
              ) : (
                <>
                  <FileSearch className="w-4 h-4" />
                  <span>Upload & Verify Resolution Proof</span>
                </>
              )}
            </button>

            {/* Step-by-Step Helper Guidance */}
            {!selectedComplaintId ? (
              <p className="text-[11px] text-amber-800 bg-amber-50/80 p-2 rounded-lg border border-amber-200 text-center font-medium">
                👉 Step 1: Select a grievance case from the dropdown above.
              </p>
            ) : !selectedFile ? (
              <p className="text-[11px] text-[#087F75] bg-teal-50/80 p-2 rounded-lg border border-teal-200 text-center font-medium">
                👉 Step 2: Choose or drop a PDF or DOCX resolution proof file above.
              </p>
            ) : (
              <p className="text-[11px] text-emerald-800 bg-emerald-50/80 p-2 rounded-lg border border-emerald-200 text-center font-medium flex items-center justify-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline mr-1 shrink-0" />
                <span>Ready to extract text with PyMuPDF and calculate 6-factor score.</span>
              </p>
            )}
          </div>

          {/* Previous Evidence Files for this Complaint */}
          {evidenceList && evidenceList.length > 0 && (
            <div className="bg-white p-5 rounded-xl border border-[#D9DEE3] shadow-sm space-y-3">
              <span className="text-xs font-bold text-[#263746] uppercase tracking-wider block">
                Evidence Submissions for this Case ({evidenceList.length})
              </span>
              <div className="space-y-2">
                {evidenceList.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => setActiveEvidence(ev)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between ${
                      activeEvidence?.id === ev.id
                        ? 'border-[#087F75] bg-teal-50/40 shadow-sm'
                        : 'border-[#D9DEE3] hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-0.5 truncate max-w-[200px]">
                      <div className="font-bold text-[#263746] truncate">{ev.filename}</div>
                      <div className="text-[10px] text-[#718096]">
                        {ev.created_at ? new Date(ev.created_at).toLocaleDateString() : 'Recent'} • {(ev.file_size_bytes / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ev.relevance_score >= 0.70
                            ? 'bg-emerald-100 text-[#15803D]'
                            : ev.relevance_score >= 0.40
                            ? 'bg-amber-100 text-[#D97736]'
                            : 'bg-red-100 text-[#DC3545]'
                        }`}
                      >
                        {Math.round(ev.relevance_score * 100)}% Match
                      </span>
                      {ev.human_verified && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D]" title="Human Verified" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (7 Cols): Verification Dossier & Human Review */}
        <div className="lg:col-span-7 space-y-6">
          {activeEvidence ? (
            <>
              {/* Dossier Card */}
              <div className="bg-white p-6 rounded-xl border border-[#D9DEE3] shadow-sm space-y-5">
                {/* Header with Title and Download */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#D9DEE3]">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#087F75] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      PyMuPDF Verification Dossier
                    </span>
                    <h2 className="text-lg font-bold text-[#263746] mt-1 truncate max-w-md">
                      {activeEvidence.filename}
                    </h2>
                    <p className="text-xs text-[#718096]">
                      Associated with {activeEvidence.complaint_no} • {activeEvidence.file_size_bytes ? `${(activeEvidence.file_size_bytes / 1024).toFixed(1)} KB` : ''}
                    </p>
                  </div>

                  <a
                    href={evidenceService.getDownloadUrl(activeEvidence.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[#D9DEE3] hover:bg-slate-50 text-xs font-semibold text-[#263746] transition shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-[#087F75]" />
                    <span>Download Original</span>
                  </a>
                </div>

                {/* Authenticity Disclaimer Banner */}
                <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-[#92400E] flex items-start space-x-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-[#D97736] mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    <strong className="font-bold">Decision Support Only:</strong> This automated check extracts text and assesses thematic alignment. A high relevance score is <strong>not</strong> proof of legal authenticity or banking clearance. Physical seals and final resolution approval must be confirmed by an authorized AICTE officer.
                  </div>
                </div>

                {/* Scanned PDF / OCR Warning */}
                {(breakdown.is_scanned_pdf || breakdown.requires_ocr) && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#DC3545] flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold">Scanned Document Detected:</strong> This file contains embedded images without an extractable text layer. OCR processing is required, or please request the college to submit a digital PDF/Word document with text.
                    </div>
                  </div>
                )}

                {/* Main Score Banner */}
                <div
                  className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    activeEvidence.relevance_score >= 0.70
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : activeEvidence.relevance_score >= 0.40
                      ? 'bg-amber-50/60 border-amber-200'
                      : 'bg-red-50/60 border-red-200'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-sm ${
                        activeEvidence.relevance_score >= 0.70
                          ? 'bg-[#15803D] text-white'
                          : activeEvidence.relevance_score >= 0.40
                          ? 'bg-[#D97736] text-white'
                          : 'bg-[#DC3545] text-white'
                      }`}
                    >
                      {breakdown.percentage ?? Math.round(activeEvidence.relevance_score * 100)}%
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-[#718096]">
                        Contextual Relevance Score
                      </div>
                      <div className="text-sm font-bold text-[#263746] mt-0.5">
                        {breakdown.recommendation || 'Scored via Multi-Signal Engine'}
                      </div>
                      <div className="text-xs text-[#718096] mt-0.5">
                        Risk Level: <strong>{breakdown.risk_level || 'Evaluated'}</strong> • Semantic Cosine: {Math.round((breakdown.semantic_similarity || 0) * 100)}%
                      </div>
                    </div>
                  </div>

                  {/* Recommendation Badge */}
                  <div className="sm:text-right">
                    {(() => {
                      const rec = getRecommendationBadge(breakdown.recommendation_code);
                      return (
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${rec.style}`}
                        >
                          {rec.icon}
                          <span>{rec.label}</span>
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Audit Summary Narrative */}
                {breakdown.summary && (
                  <p className="text-xs text-[#4A5568] bg-slate-50 p-3 rounded-lg border border-[#D9DEE3] leading-relaxed">
                    {breakdown.summary}
                  </p>
                )}

                {/* 6-Factor Transparent Scoring Breakdown */}
                {scoreComponents.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#263746]">
                        Contextual Relevance Scoring Formula (100 Pts Total)
                      </h3>
                      <span className="text-[11px] font-mono text-[#087F75] font-semibold">
                        Total: {breakdown.total_score || 0} / 100
                      </span>
                    </div>

                    <div className="overflow-x-auto border border-[#D9DEE3] rounded-lg">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-[#263746] font-semibold border-b border-[#D9DEE3]">
                            <th className="p-2.5">Evaluation Factor</th>
                            <th className="p-2.5 text-center">Weight</th>
                            <th className="p-2.5 text-center">Score</th>
                            <th className="p-2.5">Indicator / Raw Value</th>
                            <th className="p-2.5">Determination Rationale</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D9DEE3]">
                          {scoreComponents.map((sc, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="p-2.5 font-medium text-[#263746]">{sc.factor}</td>
                              <td className="p-2.5 text-center text-[#718096]">{sc.max_score}</td>
                              <td className="p-2.5 text-center font-bold text-[#087F75]">
                                {sc.score} / {sc.max_score}
                              </td>
                              <td className="p-2.5 font-mono text-[11px] text-[#718096]">
                                {sc.raw_value || 'Evaluated'}
                              </td>
                              <td className="p-2.5 text-[11px] text-[#4A5568] leading-tight">
                                {sc.explanation}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Entity & Financial Consistency Audit */}
                {entityMatches.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#D9DEE3]">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#263746]">
                      Entity & Financial Discrepancy Audit
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {entityMatches.map((em, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-lg border space-y-1 ${
                            em.status === 'MISMATCH'
                              ? 'bg-red-50/60 border-red-300 text-[#DC3545]'
                              : em.status === 'MATCH' || em.status === 'FOUND'
                              ? 'bg-emerald-50/40 border-emerald-200 text-[#263746]'
                              : 'bg-slate-50 border-[#D9DEE3] text-[#718096]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[11px]">{em.field}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                em.status === 'MISMATCH'
                                  ? 'bg-red-100 text-[#DC3545]'
                                  : em.status === 'MATCH' || em.status === 'FOUND'
                                  ? 'bg-emerald-100 text-[#15803D]'
                                  : 'bg-slate-200 text-[#718096]'
                              }`}
                            >
                              {em.status}
                            </span>
                          </div>
                          <div className="text-[11px] space-y-0.5">
                            {em.complaint_value && (
                              <div className="text-[#718096]">
                                Claimed: <span className="font-mono text-[#263746]">{em.complaint_value}</span>
                              </div>
                            )}
                            {em.document_value && (
                              <div className="text-[#718096]">
                                Document: <span className="font-mono text-[#263746]">{em.document_value}</span>
                              </div>
                            )}
                            <div className="text-[10px] text-[#4A5568] italic">{em.notes}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4-State Institutional Proof Checklist */}
                {checklistItems.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#D9DEE3]">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#263746]">
                        Institutional Verification Criteria (4-State Audit)
                      </h3>
                      {breakdown.all_elements_present ? (
                        <span className="text-[11px] font-bold text-[#15803D] flex items-center">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          All Applicable Elements Present
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-[#D97736] flex items-center">
                          <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                          Unverified / Missing Elements Present
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {checklistItems.map((item) => {
                        const badge = getChecklistBadge(item.status);
                        return (
                          <div
                            key={item.key}
                            className={`p-2.5 rounded-lg border flex flex-col justify-between space-y-1.5 ${badge.style}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-[11px] text-[#263746]">
                                {item.label}
                              </span>
                              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold border border-current shrink-0">
                                {badge.icon}
                                <span>{item.status}</span>
                              </span>
                            </div>
                            <p className="text-[10px] text-[#4A5568] leading-tight">
                              {item.details}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Structured Warnings & Missing Elements */}
                {(warnings.length > 0 || missingElements.length > 0) && (
                  <div className="space-y-2 pt-2 border-t border-[#D9DEE3]">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#DC3545]">
                      Missing Elements & Warnings Audit
                    </h3>

                    <div className="space-y-1.5">
                      {warnings.map((w, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-lg border text-xs flex items-start space-x-2 ${
                            w.severity === 'Critical'
                              ? 'bg-red-50 border-red-200 text-[#DC3545]'
                              : w.severity === 'Warning'
                              ? 'bg-amber-50 border-amber-200 text-[#D97736]'
                              : 'bg-blue-50 border-blue-200 text-blue-800'
                          }`}
                        >
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                              w.severity === 'Critical'
                                ? 'bg-red-200 text-[#DC3545]'
                                : w.severity === 'Warning'
                                ? 'bg-amber-200 text-[#D97736]'
                                : 'bg-blue-200 text-blue-800'
                            }`}
                          >
                            {w.severity}
                          </span>
                          <div className="flex-1 text-[11px]">
                            <span className="font-semibold">{w.message}</span>
                            {w.recommendation && (
                              <span className="block text-[10px] opacity-90 mt-0.5">
                                Action: {w.recommendation}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matched Keywords */}
                {matchedKeywords.length > 0 && (
                  <div className="pt-2 border-t border-[#D9DEE3]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#263746] block mb-1.5">
                      Matched Proof Points & Keywords ({matchedKeywords.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {matchedKeywords.map((kw, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-teal-50 border border-teal-200 text-[#087F75] font-semibold text-[10px]"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extracted Text Viewer Accordion */}
                <div className="pt-2 border-t border-[#D9DEE3]">
                  <button
                    type="button"
                    onClick={() => setShowExtractedText(!showExtractedText)}
                    className="w-full flex items-center justify-between text-xs font-bold text-[#263746] hover:text-[#087F75] py-2 transition"
                  >
                    <span className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-[#087F75]" />
                      <span>
                        Extracted Document Text ({breakdown.word_count || 0} words, {breakdown.page_count || 1} pages)
                      </span>
                    </span>
                    {showExtractedText ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showExtractedText && (
                    <div className="mt-2 p-3 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text border border-slate-700">
                      {activeEvidence.extracted_text || 'No text extracted.'}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Official Human Review Form */}
              <div className="bg-white p-6 rounded-xl border border-[#D9DEE3] shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-5 h-5 text-[#087F75]" />
                    <h3 className="text-sm font-bold text-[#263746]">
                      Official AICTE Officer Determination (Human Review)
                    </h3>
                  </div>
                  {activeEvidence.human_verified && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#15803D] font-bold text-xs border border-emerald-300">
                      Reviewed by {activeEvidence.reviewer_name || 'Officer'}
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#718096]">
                  AI relevance scoring supports officer oversight. Formal case closure or rejection directives must be confirmed by an authorized AICTE officer to prevent false complaint resolutions.
                </p>

                <form onSubmit={handleInitiateReview} className="space-y-4 text-xs">
                  {/* Decision Selector */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setReviewDecision('approved')}
                      className={`p-3 rounded-xl border text-left transition flex items-center space-x-2.5 ${
                        reviewDecision === 'approved'
                          ? 'border-[#15803D] bg-emerald-50 text-[#15803D] font-bold shadow-sm'
                          : 'border-[#D9DEE3] text-[#718096] hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <div>
                        <div className="font-bold text-xs">Approve Resolution</div>
                        <div className="text-[10px] font-normal">Genuine resolution confirmed • Close Case</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReviewDecision('rejected')}
                      className={`p-3 rounded-xl border text-left transition flex items-center space-x-2.5 ${
                        reviewDecision === 'rejected'
                          ? 'border-[#DC3545] bg-red-50 text-[#DC3545] font-bold shadow-sm'
                          : 'border-[#D9DEE3] text-[#718096] hover:bg-slate-50'
                      }`}
                    >
                      <XCircle className="w-4 h-4 shrink-0" />
                      <div>
                        <div className="font-bold text-xs">Reject Evidence</div>
                        <div className="text-[10px] font-normal">Inconclusive proof • Request Evidence</div>
                      </div>
                    </button>
                  </div>

                  {/* Verification Notes */}
                  <div>
                    <label className="block font-semibold text-[#263746] mb-1">
                      Officer Verification Findings & Rationale <span className="text-[#DC3545]">*</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Enter verification findings, transaction confirmation details, or grounds for rejection (min 5 characters)..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-[#D9DEE3] rounded-lg focus:outline-none focus:border-[#087F75] text-xs"
                    />
                  </div>

                  {/* Resolution Summary (Optional) */}
                  {reviewDecision === 'approved' && (
                    <div>
                      <label className="block font-semibold text-[#263746] mb-1">
                        Resolution Summary (Recorded in Case History)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Caution deposit refunded to student via UTR #998811."
                        value={resolutionSummary}
                        onChange={(e) => setResolutionSummary(e.target.value)}
                        className="w-full px-3 py-2 border border-[#D9DEE3] rounded-lg focus:outline-none focus:border-[#087F75] text-xs"
                      />
                    </div>
                  )}

                  {reviewSuccessMsg && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-[#15803D] flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{reviewSuccessMsg}</span>
                    </div>
                  )}

                  {reviewErrorMsg && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#DC3545] flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{reviewErrorMsg}</span>
                    </div>
                  )}

                  {/* Submit Review Button */}
                  <button
                    type="submit"
                    disabled={isSubmittingReview || !reviewNotes.trim() || reviewNotes.trim().length < 5}
                    className="w-full py-2.5 px-4 bg-[#263746] hover:bg-[#1E2C38] text-white text-xs font-bold rounded-lg transition shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isSubmittingReview ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Recording Determination...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Confirm Official Human Determination</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Confirmation Modal */}
              {showConfirmModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#D9DEE3] space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#D9DEE3]">
                      <div className="flex items-center space-x-2">
                        {reviewDecision === 'approved' ? (
                          <CheckCircle2 className="w-5 h-5 text-[#15803D]" />
                        ) : (
                          <XCircle className="w-5 h-5 text-[#DC3545]" />
                        )}
                        <h3 className="font-bold text-sm text-[#263746]">
                          Confirm AICTE Determination
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowConfirmModal(false)}
                        className="text-[#718096] hover:text-[#263746]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2 text-xs text-[#4A5568]">
                      <p>
                        You are about to record a permanent official determination for case{' '}
                        <strong className="text-[#263746] font-mono">{activeEvidence.complaint_no}</strong>:
                      </p>

                      <div className="p-3 rounded-lg bg-slate-50 border border-[#D9DEE3] space-y-1">
                        <div>
                          <strong>Decision:</strong>{' '}
                          <span
                            className={`font-bold ${
                              reviewDecision === 'approved' ? 'text-[#15803D]' : 'text-[#DC3545]'
                            }`}
                          >
                            {reviewDecision === 'approved'
                              ? 'Approve Resolution (Status -> Resolved)'
                              : 'Reject Evidence (Status -> Evidence Requested)'}
                          </span>
                        </div>
                        <div>
                          <strong>Officer Rationale:</strong> "{reviewNotes}"
                        </div>
                      </div>

                      <p className="text-[11px] text-[#718096]">
                        This action will be logged in the immutable AICTE audit trail under your credentials ({user?.name || user?.email || 'Officer'}).
                      </p>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowConfirmModal(false)}
                        className="px-3 py-1.5 text-xs text-[#718096] hover:bg-slate-100 rounded-lg transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmReview}
                        className={`px-4 py-2 text-xs font-bold text-white rounded-lg shadow-sm transition ${
                          reviewDecision === 'approved'
                            ? 'bg-[#15803D] hover:bg-[#116631]'
                            : 'bg-[#DC3545] hover:bg-[#B02A37]'
                        }`}
                      >
                        Confirm & Apply Determination
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Empty State */
            <div className="bg-white p-12 rounded-xl border border-dashed border-[#D9DEE3] text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 text-[#087F75] border border-teal-200 flex items-center justify-center mx-auto">
                <FileSearch className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-[#263746]">
                  No Evidence Document Selected
                </h3>
                <p className="text-xs text-[#718096] leading-relaxed">
                  Select a grievance case on the left, then upload the institution's resolution affidavit (PDF or DOCX) to run PyMuPDF parsing and calculate contextual relevance.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EvidenceChecker;