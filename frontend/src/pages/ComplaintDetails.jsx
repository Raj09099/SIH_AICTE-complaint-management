import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Globe,
  ArrowLeft,
  FileText,
  Calendar,
  Building2,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  ArrowRight,
  ShieldAlert,
  Share2,
  AlertCircle,
  Sparkles,
  Paperclip,
  Download,
  File,
  Image as ImageIcon,
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { complaintService } from '../services/complaints';
import { formatDate } from '../utils/formatters';
import { translateGrievance, detectLanguage } from '../utils/indicTranslation';
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
const BUREAU_OPTIONS = [
  'Approval Bureau',
  'Academic Bureau',
  'Administration Cell',
  'Finance Cell',
  'Grievance Cell',
  'Anti-Ragging Cell',
  'Public Grievance Redressal Cell (PGRC)',
  'Faculty & Staff Grievances Cell',
  'Finance & Scholarships Bureau',
];
const STATUS_OPTIONS = [
  'New',
  'Under Review',
  'Evidence Requested',
  'Transferred',
  'Escalated',
  'Resolved',
];
export function ComplaintDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const isInstitute =
    user?.role === 'institute' ||
    user?.role === 'INSTITUTE' ||
    user?.bureau?.toLowerCase().includes('apex') ||
    user?.email?.toLowerCase().includes('apex');
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  // Status Action Form State
  const [targetStatus, setTargetStatus] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [targetBureau, setTargetBureau] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null);
  const [actionErrorMessage, setActionErrorMessage] = useState(null);
  // Multilingual State: 'original' | 'en' | 'hi' | 'mr'
  const [viewingLanguage, setViewingLanguage] = useState(language || 'original');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(null);
  const [translationCache, setTranslationCache] = useState({});

  // Fast client-side translation engine using Indic model
  const getFallbackTranslation = (sub = '', desc = '', targetLang = 'en') => {
    const res = translateGrievance(sub, desc, targetLang);
    return {
      subject: res.subject,
      description: res.description,
    };
  };

  const handleSelectLanguage = async (targetLang) => {
    setViewingLanguage(targetLang);
    setTranslationError(null);

    if (targetLang === 'original') return;

    if (translationCache[targetLang]) {
      return;
    }

    // Check if complaint already has valid translated fields in that language
    if (targetLang === 'en' && complaint?.translated_subject && complaint?.translated_description) {
      setTranslationCache((prev) => ({
        ...prev,
        en: {
          subject: complaint.translated_subject,
          description: complaint.translated_description,
        },
      }));
      return;
    }

    setIsTranslating(true);
    let backendSuccess = false;
    const identifier = complaint?.complaint_no || complaint?.id || id;

    try {
      const res = await complaintService.translateComplaint(identifier, targetLang);
      if (res?.translated_subject && res?.translated_description) {
        setTranslationCache((prev) => ({
          ...prev,
          [targetLang]: {
            subject: res.translated_subject,
            description: res.translated_description,
          },
        }));
        if (res.detected_language) {
          setComplaint((prev) => ({ ...prev, detected_language: res.detected_language }));
        }
        backendSuccess = true;
      }
    } catch (err) {
      console.warn('Backend translate route unavailable, applying client Indic engine:', err);
    } finally {
      setIsTranslating(false);
    }

    if (!backendSuccess && complaint) {
      const localTrans = translateGrievance(complaint.subject || '', complaint.description || '', targetLang);
      setTranslationCache((prev) => ({
        ...prev,
        [targetLang]: {
          subject: localTrans.subject,
          description: localTrans.description,
        },
      }));
      if (localTrans.detectedLanguage && !complaint.detected_language) {
        setComplaint((prev) => ({ ...prev, detected_language: localTrans.detectedLanguage }));
      }
    }
  };

  // Sync viewing language when user changes global language selector in top navbar
  useEffect(() => {
    if (complaint && (language === 'hi' || language === 'mr' || language === 'en')) {
      handleSelectLanguage(language);
    }
  }, [language, complaint?.id]);
  const fetchComplaint = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await complaintService.getComplaintById(id);
      setComplaint(data);
      setTargetStatus(data.status || 'New');
      setTargetBureau(data.bureau || BUREAU_OPTIONS[0]);
      if (data.resolution_summary) {
        setResolutionSummary(data.resolution_summary);
      }
    } catch (err) {
      console.error('Failed to load complaint details:', err);
      setError(
        err.response?.data?.detail ||
        err.message ||
        `Unable to locate complaint record '${id}'.`
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [id]);
  useEffect(() => {
    fetchComplaint();
  }, [fetchComplaint]);
  const handleStatusTransition = async (e) => {
    e.preventDefault();
    if (!complaint) return;
    setIsSubmittingAction(true);
    setActionSuccessMessage(null);
    setActionErrorMessage(null);
    try {
      const payload = {
        status: targetStatus,
      };
      if (targetStatus === 'Resolved') {
        if (!resolutionSummary.trim()) {
          setActionErrorMessage('Resolution summary is required when marking a complaint as Resolved.');
          setIsSubmittingAction(false);
          return;
        }
        payload.resolution_summary = resolutionSummary.trim();
      }
      if (targetStatus === 'Transferred') {
        payload.bureau = targetBureau;
      }
      const updated = await complaintService.updateStatus(complaint.complaint_no, payload);
      setComplaint(updated);
      setActionSuccessMessage(
        `Complaint lifecycle status successfully transitioned to '${targetStatus}'. Changes persisted to PostgreSQL.`
      );
    } catch (err) {
      console.error('Failed to update complaint status:', err);
      setActionErrorMessage(
        err.response?.data?.detail ||
        err.message ||
        'Failed to transition complaint status.'
      );
    } finally {
      setIsSubmittingAction(false);
    }
  };
  // SLA calculations
  const deadlineDate = complaint?.deadline_date ? new Date(complaint.deadline_date) : null;
  let hoursRemaining = 0;
  if (deadlineDate && !isNaN(deadlineDate.getTime())) {
    hoursRemaining = Math.round((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60));
  }
  const isOverdue = hoursRemaining < 0 && complaint?.status !== 'Resolved';
  const isUrgentSla = hoursRemaining >= 0 && hoursRemaining <= 48 && complaint?.status !== 'Resolved';
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Link
            to="/complaints"
            className="p-2 rounded-lg bg-white border border-[#D9DEE3] text-[#718096] hover:text-[#263746] hover:bg-[#F5F7F7] transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#263746]">Loading Case Dossier...</h1>
            <p className="text-xs text-[#718096]">Fetching record #{id} from registry</p>
          </div>
        </div>
        <div className="bg-white p-16 rounded-2xl border border-[#D9DEE3] shadow-sm text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#087F75] mx-auto" />
          <p className="text-sm font-semibold text-[#263746]">Retrieving case metadata from FastAPI backend...</p>
        </div>
      </div>
    );
  }
  if (error || !complaint) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Link
            to="/complaints"
            className="p-2 rounded-lg bg-white border border-[#D9DEE3] text-[#718096] hover:text-[#263746] hover:bg-[#F5F7F7] transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#263746]">Complaint Not Found</h1>
            <p className="text-xs text-[#718096]">Case #{id}</p>
          </div>
        </div>
        <div className="bg-white p-12 rounded-2xl border border-[#DC3545]/30 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-[#DC3545]/10 text-[#DC3545] border border-[#DC3545]/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#263746]">Unable to Locate Case File</h2>
          <p className="text-xs text-[#718096] max-w-md mx-auto">{error}</p>
          <div className="pt-2">
            <Link
              to="/complaints"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#087F75] hover:bg-[#06635c] text-white text-xs font-semibold rounded-lg transition shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Complaints Registry</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="bg-white rounded-2xl p-5 border border-[#D9DEE3] shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            to="/complaints"
            className="p-2 rounded-xl bg-white border border-[#D9DEE3] text-[#718096] hover:text-[#087F75] hover:bg-[#F5F7F7] transition"
            title="Back to Registry"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-[#087F75] bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
                {complaint.complaint_no}
              </span>
              <StatusBadge status={complaint.status} />
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  complaint.priority === 'High' || complaint.priority === 'Critical' || complaint.priority === 'Urgent'
                    ? 'bg-[#DC3545]/10 text-[#DC3545] border-[#DC3545]/20'
                    : 'bg-[#F5F7F7] text-[#263746] border-[#D9DEE3]'
                }`}
              >
                {complaint.priority || 'Medium'} Priority
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#263746] mt-1.5">
              {viewingLanguage === 'original'
                ? complaint.subject
                : translationCache[viewingLanguage]?.subject || complaint.subject}
            </h1>
            <p className="text-xs text-[#718096] mt-0.5">
              {t('details.filedUnder', 'Filed under')} <span className="font-medium text-[#263746]">{complaint.bureau}</span> • {t('details.grievanceCategory', 'Grievance Category:')} <span className="font-medium text-[#263746]">{complaint.category}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchComplaint(true)}
            disabled={isRefreshing}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-[#F5F7F7] text-[#263746] rounded-lg text-xs font-medium border border-[#D9DEE3] transition shadow-xs"
            title="Refresh from PostgreSQL"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#087F75]' : 'text-[#718096]'}`} />
            <span>{t('details.reloadRecord', 'Reload Record')}</span>
          </button>
        </div>
      </div>
      {/* Main Grid: Details (Left 2 cols) & Action Panel (Right 1 col) */}
      <div className={`grid grid-cols-1 ${!isInstitute ? 'lg:grid-cols-3' : ''} gap-6`}>
        {/* Left Column: Case Metadata & Narrative */}
        <div className={`${!isInstitute ? 'lg:col-span-2' : 'w-full'} space-y-6`}>
          {/* Detailed Narrative Card with Multilingual Intelligence */}
          <div className="bg-white p-5 rounded-2xl border border-[#D9DEE3] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#D9DEE3] gap-2">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-[#087F75]" />
                <h2 className="text-sm font-bold text-[#263746] uppercase tracking-wider">
                  {t('details.officialStatement', 'Official Complainant Statement')}
                </h2>
              </div>

              {/* Language Toolbar & Analysis Mode Selector */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Detected Language Pill */}
                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-[#263746] font-mono text-[11px] font-semibold border border-slate-200">
                  <Globe className="w-3.5 h-3.5 text-[#087F75]" />
                  <span>
                    Detected:{' '}
                    <strong className="text-[#087F75]">
                      {complaint.detected_language === 'mr'
                        ? 'मराठी (mr)'
                        : complaint.detected_language === 'hi'
                        ? 'हिन्दी (hi)'
                        : /[\u0900-\u097F]/.test((complaint.subject || '') + ' ' + (complaint.description || ''))
                        ? 'मराठी (mr)'
                        : 'English (en)'}
                    </strong>
                  </span>
                </div>

                {/* 4-Way Language Selector Tabs */}
                <div className="inline-flex rounded-lg border border-[#D9DEE3] bg-[#F5F7F7] p-0.5 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => handleSelectLanguage('original')}
                    className={`px-2.5 py-1 rounded-md transition text-[11px] flex items-center space-x-1 ${
                      viewingLanguage === 'original'
                        ? 'bg-white text-[#263746] font-bold shadow-xs border border-[#D9DEE3]'
                        : 'text-[#718096] hover:text-[#263746]'
                    }`}
                  >
                    <span>Original Script</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectLanguage('en')}
                    disabled={isTranslating}
                    className={`px-2.5 py-1 rounded-md transition text-[11px] flex items-center space-x-1 ${
                      viewingLanguage === 'en'
                        ? 'bg-white text-[#087F75] font-bold shadow-xs border border-teal-200'
                        : 'text-[#718096] hover:text-[#263746]'
                    }`}
                  >
                    <span>English</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectLanguage('hi')}
                    disabled={isTranslating}
                    className={`px-2.5 py-1 rounded-md transition text-[11px] flex items-center space-x-1 ${
                      viewingLanguage === 'hi'
                        ? 'bg-white text-[#087F75] font-bold shadow-xs border border-teal-200'
                        : 'text-[#718096] hover:text-[#263746]'
                    }`}
                  >
                    <span>हिन्दी</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectLanguage('mr')}
                    disabled={isTranslating}
                    className={`px-2.5 py-1 rounded-md transition text-[11px] flex items-center space-x-1 ${
                      viewingLanguage === 'mr'
                        ? 'bg-white text-[#087F75] font-bold shadow-xs border border-teal-200'
                        : 'text-[#718096] hover:text-[#263746]'
                    }`}
                  >
                    <span>मराठी</span>
                  </button>
                </div>

                {isTranslating && (
                  <span className="inline-flex items-center space-x-1 text-[11px] text-[#087F75] font-semibold">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Translating...</span>
                  </span>
                )}
              </div>
            </div>

            {translationError && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#D97736]" />
                  <span>{translationError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectLanguage(viewingLanguage)}
                  className="text-[11px] font-bold text-[#087F75] underline hover:text-[#06635c]"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Display Mode Notice Banner */}
            {viewingLanguage === 'original' ? (
              <div className="p-2.5 rounded-lg bg-slate-100 border border-[#D9DEE3] text-[#4A5568] text-[11px] flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#087F75] shrink-0" />
                  <span>
                    <strong>Original Complainant Submission:</strong> Displaying the exact, unmodified statement submitted by the complainant. Preserved immutably in AICTE records.
                  </span>
                </div>
              </div>
            ) : viewingLanguage === 'en' ? (
              <div className="p-2.5 rounded-lg bg-teal-50/70 border border-teal-200 text-teal-900 text-[11px] flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#087F75] shrink-0" />
                  <span>
                    <strong>AI English Normalized Representation:</strong> Indexed for AI Case Overlap duplicate detection, Problem Pattern Clustering, and Recurrence Radar.
                  </span>
                </div>
              </div>
            ) : viewingLanguage === 'hi' ? (
              <div className="p-2.5 rounded-lg bg-teal-50/70 border border-teal-200 text-teal-900 text-[11px] flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#087F75] shrink-0" />
                  <span>
                    <strong>हिन्दी अनुवाद (Hindi):</strong> अधिकारी की समीक्षा और निर्णय हेतु अनुवादित। मूल शिकायत डेटाबेस में सुरक्षित है।
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-teal-50/70 border border-teal-200 text-teal-900 text-[11px] flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#087F75]" />
                  <span>
                    <strong>मराठी भाषांतर (Marathi):</strong> अधिकाऱ्यांच्या सोयीसाठी भाषांतरित. मूळ तक्रार नोंदीत सुरक्षित आहे.
                  </span>
                </div>
              </div>
            )}

            {/* Narrative Box */}
            {(() => {
              const activeSub =
                viewingLanguage === 'original'
                  ? complaint.subject
                  : translationCache[viewingLanguage]?.subject ||
                    (viewingLanguage === 'en' ? complaint.translated_subject : '') ||
                    complaint.subject;

              const activeDesc =
                viewingLanguage === 'original'
                  ? complaint.description
                  : translationCache[viewingLanguage]?.description ||
                    (viewingLanguage === 'en' ? complaint.translated_description : '') ||
                    complaint.description;

              return (
                <div className="p-4 rounded-xl bg-[#F5F7F7] border border-[#D9DEE3] text-xs text-[#263746] leading-relaxed space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                    <h3 className="font-bold text-sm text-[#263746]">
                      {activeSub}
                    </h3>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white text-[#718096] border border-[#D9DEE3]">
                      {viewingLanguage === 'original' ? (complaint.detected_language || 'orig') : viewingLanguage}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed text-[#263746]">
                    {activeDesc}
                  </p>
                </div>
              );
            })()}
          </div>
          {/* Key Parameters Matrix */}
          <div className="bg-white p-5 rounded-2xl border border-[#D9DEE3] shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-[#263746] uppercase tracking-wider border-b border-[#D9DEE3] pb-3">
              {t('details.caseRegistryParams', 'Case Registry Parameters')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F5F7F7] border border-[#D9DEE3] space-y-1">
                <span className="text-[#718096] flex items-center space-x-1.5 text-[11px]">
                  <Building2 className="w-3.5 h-3.5 text-[#087F75]" />
                  <span>{t('details.referencedInstitution', 'Referenced Institution')}</span>
                </span>
                <p className="font-semibold text-[#263746]">
                  Institution ID #{complaint.institution_id}
                </p>
                <p className="text-[11px] text-[#718096]">{t('details.aicteApprovedEntity', 'AICTE Approved Technical Entity')}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F5F7F7] border border-[#D9DEE3] space-y-1">
                <span className="text-[#718096] flex items-center space-x-1.5 text-[11px]">
                  <User className="w-3.5 h-3.5 text-[#087F75]" />
                  <span>{t('details.complainantAffiliation', 'Complainant Affiliation')}</span>
                </span>
                <p className="font-semibold text-[#263746]">
                  {complaint.complainant_type}
                </p>
                <p className="text-[11px] text-[#718096]">{t('details.authenticatedFiler', 'Authenticated Grievance Filer')}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F5F7F7] border border-[#D9DEE3] space-y-1">
                <span className="text-[#718096] flex items-center space-x-1.5 text-[11px]">
                  <Calendar className="w-3.5 h-3.5 text-[#087F75]" />
                  <span>{t('details.filingAndIncidentDates', 'Filing & Incident Dates')}</span>
                </span>
                <p className="font-semibold text-[#263746]">
                  Filed: {formatDate(complaint.filing_date)}
                </p>
                <p className="text-[11px] text-[#718096]">
                  Incident: {complaint.incident_date ? formatDate(complaint.incident_date) : 'Unspecified'}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F5F7F7] border border-[#D9DEE3] space-y-1">
                <span className="text-[#718096] flex items-center space-x-1.5 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-[#D97736]" />
                  <span>{t('details.statutorySlaDeadline', 'Statutory SLA Deadline')}</span>
                </span>
                <p className="font-semibold text-[#263746]">
                  {complaint.deadline_date ? formatDate(complaint.deadline_date) : 'Not specified'}
                </p>
                {isOverdue ? (
                  <span className="text-[#DC3545] text-[10px] font-bold flex items-center space-x-1 mt-0.5">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Overdue by {Math.abs(hoursRemaining)} hours</span>
                  </span>
                ) : isUrgentSla ? (
                  <span className="text-[#D97736] text-[10px] font-bold flex items-center space-x-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>{hoursRemaining} hours remaining before SLA lapse</span>
                  </span>
                ) : (
                  <span className="text-[#198754] text-[10px] font-medium">{t('details.withinStatutoryTimeframe', 'Within statutory timeframe')}</span>
                )}
              </div>
            </div>
          </div>
          {/* Attached Evidence & Supporting Documents Card */}
          <div className="bg-white p-5 rounded-2xl border border-[#D9DEE3] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#D9DEE3] pb-3">
              <div className="flex items-center space-x-2">
                <Paperclip className="w-4 h-4 text-[#087F75]" />
                <h2 className="text-sm font-bold text-[#263746] uppercase tracking-wider">
                  {t('details.evidenceAttachments', 'Attached Evidence & Documents')}
                </h2>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-teal-50 text-[#087F75] border border-teal-200 uppercase">
                {complaint.attachments?.length || 0} Document(s)
              </span>
            </div>
            {complaint.attachments && complaint.attachments.length > 0 ? (
              <div className="divide-y divide-[#D9DEE3]">
                {complaint.attachments.map((att) => (
                  <div key={att.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0 gap-3">
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className="p-2 rounded-lg bg-teal-50 text-[#087F75] border border-teal-200 shrink-0">
                        {att.file_name.match(/\.(jpg|jpeg|png)$/i) ? (
                          <ImageIcon className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#263746] truncate max-w-[200px] sm:max-w-md" title={att.file_name}>
                          {att.file_name}
                        </p>
                        <div className="flex items-center space-x-2 text-[10px] text-[#718096] mt-0.5">
                          <span className="px-1.5 py-0.5 rounded bg-[#F5F7F7] border border-[#D9DEE3] text-[#263746] font-medium">
                            {att.label || 'Supporting Evidence'}
                          </span>
                          <span>•</span>
                          <span>{formatFileSize(att.file_size)}</span>
                          {att.uploaded_at && (
                            <>
                              <span>•</span>
                              <span>{formatDate(att.uploaded_at)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <a
                      href={`http://localhost:8000/api/v1/complaints/${complaint.id}/attachments/${att.id}/file`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#087F75] text-xs font-semibold border border-teal-200 transition shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#F5F7F7] border border-[#D9DEE3] text-center text-xs text-[#718096]">
                {t('details.noEvidenceAttached', 'No official supporting documents or evidence files were attached to this case.')}
              </div>
            )}
          </div>
          {/* Official Resolution Summary (if resolved) */}
          {complaint.resolution_summary && (
            <div className="bg-white p-5 rounded-2xl border border-[#198754]/30 shadow-sm space-y-3">
              <div className="flex items-center space-x-2 text-[#198754] font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Statutory Resolution Dossier</span>
              </div>
              <p className="text-xs text-[#263746] leading-relaxed bg-[#F5F7F7] p-3.5 rounded-xl border border-[#D9DEE3]">
                {complaint.resolution_summary}
              </p>
            </div>
          )}
        </div>
        {/* Right Column: Authorized Lifecycle Actions Panel (AICTE Officers & Admin Only) */}
        {!isInstitute && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-[#D9DEE3] shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-[#D9DEE3] pb-3">
              <Sparkles className="w-4 h-4 text-[#087F75]" />
              <h2 className="text-sm font-bold text-[#263746] uppercase tracking-wider">
                {t('details.caseLifecycleAction', 'Case Lifecycle Action')}
              </h2>
            </div>
            <p className="text-xs text-[#718096]">
              {t('details.lifecycleActionSubtitle', 'Update statutory review status, record resolution affidavit summaries, or transfer bureau jurisdiction.')}
            </p>
            {actionSuccessMessage && (
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-[#087F75] text-xs flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#087F75]" />
                <span>{actionSuccessMessage}</span>
              </div>
            )}
            {actionErrorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[#DC3545] text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC3545]" />
                <span>{actionErrorMessage}</span>
              </div>
            )}
            <form onSubmit={handleStatusTransition} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#263746] font-semibold mb-1">
                  {t('details.targetStatus', 'Target Lifecycle Status')}
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D9DEE3] rounded-lg text-[#263746] focus:outline-none focus:ring-1 focus:ring-[#087F75] focus:border-[#087F75]"
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              {/* Bureau Selection if status is Transferred */}
              {targetStatus === 'Transferred' && (
                <div className="space-y-1 p-3 rounded-xl bg-teal-50/60 border border-teal-200">
                  <label className="block text-[#087F75] font-semibold">
                    {t('details.targetBureau', 'Target Bureau Jurisdiction')}
                  </label>
                  <select
                    value={targetBureau}
                    onChange={(e) => setTargetBureau(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-teal-300 rounded-lg text-[#263746] focus:outline-none focus:ring-1 focus:ring-[#087F75] focus:border-[#087F75]"
                  >
                    {BUREAU_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[#718096] mt-1">
                    {t('details.bureauRouteHint', "This case will be routed to the selected bureau's triage queue.")}
                  </p>
                </div>
              )}
              {/* Resolution Summary Textarea if status is Resolved */}
              {targetStatus === 'Resolved' && (
                <div className="space-y-1 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                  <label className="block text-[#198754] font-semibold">
                    Official Resolution Summary <span className="text-[#DC3545]">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter official inquiry outcome, compliance directives issued, or settlement notes..."
                    value={resolutionSummary}
                    onChange={(e) => setResolutionSummary(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-[#263746] placeholder-[#718096] focus:outline-none focus:ring-1 focus:ring-[#198754] focus:border-[#198754] text-xs"
                  />
                  <p className="text-[11px] text-[#718096]">
                    Required for formal closure under AICTE Redressal Grid guidelines.
                  </p>
                </div>
              )}
              <button
                type="submit"
                disabled={isSubmittingAction}
                className="w-full py-2.5 px-4 bg-[#087F75] hover:bg-[#06635c] text-white font-bold rounded-xl transition shadow-sm flex items-center justify-center space-x-2 disabled:opacity-60"
              >
                {isSubmittingAction ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Persisting Update...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{t('details.applyLifecycleUpdate', 'Apply Lifecycle Update')}</span>
                  </>
                )}
              </button>
            </form>
          </div>
          {/* Quick AI Modules Navigation Card */}
          <div className="bg-white p-5 rounded-2xl border border-[#D9DEE3] shadow-sm space-y-3 text-xs">
            <span className="text-[10px] font-mono font-bold text-[#087F75] uppercase tracking-wider block">
              {t('details.intelligenceActions', 'Intelligence Actions')}
            </span>
            <div className="space-y-2">
              <Link
                to="/case-overlap"
                className="block p-3 rounded-xl bg-[#F5F7F7] hover:bg-white border border-[#D9DEE3] hover:border-[#087F75] transition text-[#263746] group"
              >
                <div className="font-semibold flex items-center justify-between group-hover:text-[#087F75] transition-colors">
                  <span>{t('details.crossBureauOverlapCheck', 'Cross-Bureau Overlap Check')}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#718096] group-hover:text-[#087F75]" />
                </div>
                <p className="text-[11px] text-[#718096] mt-0.5">
                  {t('details.scanOverlapHint', 'Scan for identical claims filed across other AICTE bureaus.')}
                </p>
              </Link>
              <Link
                to="/evidence-checker"
                className="block p-3 rounded-xl bg-[#F5F7F7] hover:bg-white border border-[#D9DEE3] hover:border-[#087F75] transition text-[#263746] group"
              >
                <div className="font-semibold flex items-center justify-between group-hover:text-[#087F75] transition-colors">
                  <span>{t('details.verifyComplianceAffidavits', 'Verify Compliance Affidavits')}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#718096] group-hover:text-[#087F75]" />
                </div>
                <p className="text-[11px] text-[#718096] mt-0.5">
                  Check institutional PDF proof with PyMuPDF verifier.
                </p>
              </Link>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
export default ComplaintDetails;
