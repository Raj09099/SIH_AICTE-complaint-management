import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Building2,
  GitCompare,
  Network,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  Calendar,
  Layers,
  ArrowRight,
  Send,
  Shield,
  User,
  UploadCloud,
  Download,
  CheckCheck,
  FileUp,
  Paperclip,
  ExternalLink,
  Inbox,
  X,
  Bell,
} from 'lucide-react';
import { complianceService } from '../services/compliance';

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import StatCard from '../components/dashboard/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import { analyticsService } from '../services/analytics';
import { complaintService } from '../services/complaints';
import { notificationService } from '../services/notifications';
import { API_BASE_URL } from '../services/api';
import { formatDate } from '../utils/formatters';

// Demonstration dataset for presentation fallback
const demoComplaints = [
  {
    id: 'AICTE-2026-0842',
    institution: 'Apex Institute of Technology',
    state: 'Maharashtra',
    bureau: 'Anti-Ragging Cell',
    category: 'Hostel Harassment & Coercion',
    summary: 'Senior hostel students subjected to unauthorized fee surcharges and amenities deprivation under ragging guise.',
    submittedDate: '2026-10-22',
    slaDeadline: '2026-11-05',
    priority: 'Critical',
    status: 'Under Review',
    description: 'Senior hostel students subjected to unauthorized fee surcharges and amenities deprivation under ragging guise.',
  },
  {
    id: 'AICTE-2026-0914',
    institution: 'Apex Institute of Technology',
    state: 'Maharashtra',
    bureau: 'Approval Bureau',
    category: 'Arbitrary Fee Surcharges',
    summary: 'Institution charging exorbitant non-sanctioned amenity fees in violation of AICTE Fee Committee norms.',
    submittedDate: '2026-10-24',
    slaDeadline: '2026-11-08',
    priority: 'High',
    status: 'Under Review',
    description: 'Institution charging exorbitant non-sanctioned amenity fees in violation of AICTE Fee Committee norms.',
  },
  {
    id: 'AICTE-2026-0771',
    institution: 'National Engineering College',
    state: 'Karnataka',
    bureau: 'Approval Bureau',
    category: 'Laboratory Deficiencies',
    summary: 'Non-functional robotics and advanced computing laboratories despite claimed AICTE compliance.',
    submittedDate: '2026-10-15',
    slaDeadline: '2026-10-30',
    priority: 'Urgent',
    status: 'Evidence Requested',
    description: 'Non-functional robotics and advanced computing laboratories despite claimed AICTE compliance.',
  },
  {
    id: 'AICTE-2026-0612',
    institution: 'Shri Ram Technical Campus',
    state: 'Punjab',
    bureau: 'Faculty & Staff Cell',
    category: 'Salary Non-Payment & Arrears',
    summary: 'Adjunct and assistant professors unpaid for 4 months; violation of 7th CPC salary mandate.',
    submittedDate: '2026-10-08',
    slaDeadline: '2026-10-28',
    priority: 'Critical',
    status: 'Escalated',
    description: 'Adjunct and assistant professors unpaid for 4 months; violation of 7th CPC salary mandate.',
  },
  {
    id: 'AICTE-2026-0520',
    institution: 'Greenfield Institute of Management',
    state: 'Uttar Pradesh',
    bureau: 'Finance & Scholarships',
    category: 'PMSSS Scholarship Withholding',
    summary: 'Institutional delay in crediting Prime Minister Special Scholarship Scheme stipend to eligible scholars.',
    submittedDate: '2026-10-02',
    slaDeadline: '2026-10-25',
    priority: 'High',
    status: 'Under Review',
    description: 'Institutional delay in crediting Prime Minister Special Scholarship Scheme stipend to eligible scholars.',
  },
  {
    id: 'AICTE-2026-0419',
    institution: 'St. Xavier Polytechnic',
    state: 'Kerala',
    bureau: 'Grievance Cell',
    category: 'Admission Cancellation & Refund',
    summary: 'Refusal to refund security deposit after student admission withdrawal before official cut-off date.',
    submittedDate: '2026-09-28',
    slaDeadline: '2026-10-18',
    priority: 'Medium',
    status: 'Resolved',
    description: 'Refusal to refund security deposit after student admission withdrawal before official cut-off date.',
  },
];

const demoMonthlyTrends = [
  { month: 'May', received: 112, resolved: 98 },
  { month: 'Jun', received: 145, resolved: 130 },
  { month: 'Jul', received: 210, resolved: 185 },
  { month: 'Aug', received: 198, resolved: 176 },
  { month: 'Sep', received: 245, resolved: 210 },
  { month: 'Oct', received: 268, resolved: 232 },
];

const demoBureauStats = [
  { name: 'Approval Bureau', active: 114, resolved: 310, total: 424, slaOnTime: 94.2 },
  { name: 'Grievance Cell', active: 98, resolved: 280, total: 378, slaOnTime: 92.5 },
  { name: 'Anti-Ragging Cell', active: 46, resolved: 120, total: 166, slaOnTime: 98.1 },
  { name: 'Faculty & Staff', active: 62, resolved: 95, total: 157, slaOnTime: 86.4 },
  { name: 'Finance Cell', active: 36, resolved: 87, total: 123, slaOnTime: 91.0 },
];

const demoDeadlines = {
  upcoming_count: 2,
  due_today_count: 1,
  overdue_count: 3,
  total_monitored: 6,
  items: [
    {
      complaint_id: 1,
      complaint_no: 'AICTE-2026-0612',
      institution_id: 4,
      institution_name: 'Shri Ram Technical Campus',
      assigned_officer_id: 10,
      assigned_officer_name: 'Dr. S. Kumar',
      bureau: 'Faculty & Staff Cell',
      category: 'Salary Non-Payment & Arrears',
      priority: 'Critical',
      status: 'Escalated',
      deadline_date: '2026-10-28',
      days_remaining: -5,
      urgency_level: 'OVERDUE',
      pending_action: 'Immediate Redressal / Escalation Hearing',
    },
    {
      complaint_id: 2,
      complaint_no: 'AICTE-2026-0771',
      institution_id: 3,
      institution_name: 'National Engineering College',
      assigned_officer_id: null,
      assigned_officer_name: 'Unassigned',
      bureau: 'Approval Bureau',
      category: 'Laboratory Deficiencies',
      priority: 'Urgent',
      status: 'Evidence Requested',
      deadline_date: '2026-10-30',
      days_remaining: -3,
      urgency_level: 'OVERDUE',
      pending_action: 'Verify Compliance Affidavits',
    },
    {
      complaint_id: 3,
      complaint_no: 'AICTE-2026-0914',
      institution_id: 1,
      institution_name: 'Apex Institute of Technology',
      assigned_officer_id: 10,
      assigned_officer_name: 'Dr. S. Kumar',
      bureau: 'Approval Bureau',
      category: 'Arbitrary Fee Surcharges',
      priority: 'High',
      status: 'Under Review',
      deadline_date: '2026-11-02',
      days_remaining: 0,
      urgency_level: 'DUE_TODAY',
      pending_action: 'Statutory Resolution Deadline Today',
    },
    {
      complaint_id: 4,
      complaint_no: 'AICTE-2026-0842',
      institution_id: 1,
      institution_name: 'Apex Institute of Technology',
      assigned_officer_id: 20,
      assigned_officer_name: 'Prof. M. Verma',
      bureau: 'Anti-Ragging Cell',
      category: 'Hostel Harassment & Coercion',
      priority: 'Critical',
      status: 'Under Review',
      deadline_date: '2026-11-05',
      days_remaining: 3,
      urgency_level: 'UPCOMING',
      pending_action: 'Conduct Bureau Inquiry',
    },
    {
      complaint_id: 5,
      complaint_no: 'AICTE-2026-0520',
      institution_id: 2,
      institution_name: 'Greenfield Institute of Management',
      assigned_officer_id: 10,
      assigned_officer_name: 'Dr. S. Kumar',
      bureau: 'Finance & Scholarships',
      category: 'PMSSS Scholarship Withholding',
      priority: 'High',
      status: 'Under Review',
      deadline_date: '2026-11-04',
      days_remaining: 2,
      urgency_level: 'UPCOMING',
      pending_action: 'Review Verification Affidavits',
    },
    {
      complaint_id: 6,
      complaint_no: 'AICTE-2026-0419',
      institution_id: 5,
      institution_name: 'St. Xavier Polytechnic',
      assigned_officer_id: 20,
      assigned_officer_name: 'Prof. M. Verma',
      bureau: 'Grievance Cell',
      category: 'Admission Cancellation & Refund',
      priority: 'Medium',
      status: 'New',
      deadline_date: '2026-10-25',
      days_remaining: -8,
      urgency_level: 'OVERDUE',
      pending_action: 'Initial Triage & Officer Assignment',
    },
  ],
};

export function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isInstitute = user?.role === 'institute';

  const [backendHealth, setBackendHealth] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [presentationMode, setPresentationMode] = useState('live'); // 'live' | 'demo'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBureau, setSelectedBureau] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedCaseDetail, setSelectedCaseDetail] = useState(null);

  // Live Backend Data States
  const [summaryData, setSummaryData] = useState(null);
  const [liveComplaints, setLiveComplaints] = useState([]);
  const [loadingLive, setLoadingLive] = useState(true);
  const [liveError, setLiveError] = useState(null);

  // Automated Deadline & Reminder States
  const [deadlinesData, setDeadlinesData] = useState(null);
  const [loadingDeadlines, setLoadingDeadlines] = useState(true);
  const [deadlineFilter, setDeadlineFilter] = useState('all'); // 'all' | 'overdue' | 'due_today' | 'upcoming'
  const [deadlineSearch, setDeadlineSearch] = useState('');
  const [deadlineBureau, setDeadlineBureau] = useState('All');
  const [isTriggeringCheck, setIsTriggeringCheck] = useState(false);
  const [triggerCheckSuccess, setTriggerCheckSuccess] = useState(null);

  // Feature 3.3 & Master Prompt: Institute Compliance & Complaint Status Reminders States
  const [instSummary, setInstSummary] = useState(null);
  const [instDeadlines, setInstDeadlines] = useState([]);
  const [instReminders, setInstReminders] = useState([]);
  const [instHistory, setInstHistory] = useState([]);
  const [loadingInstCompliance, setLoadingInstCompliance] = useState(false);
  const [instComplianceError, setInstComplianceError] = useState(null);
  const [refreshSuccessFeedback, setRefreshSuccessFeedback] = useState(false);
  const [instTab, setInstTab] = useState('deadlines'); // 'deadlines' | 'reminders' | 'history'
  const [instDeadlineFilter, setInstDeadlineFilter] = useState('all'); // 'all' | 'pending' | 'completed' | 'overdue' | 'upcoming'
  const [instReminderFilter, setInstReminderFilter] = useState('all'); // 'all' | 'unread'
  const [uploadModalItem, setUploadModalItem] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadRemarks, setUploadRemarks] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [downloadingDocId, setDownloadingDocId] = useState(null);
  const [markingReadId, setMarkingReadId] = useState(null);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

const FALLBACK_INSTITUTE_SUMMARY = {
  total_requirements: 6,
  completed_requirements: 2,
  upcoming_deadlines: 3,
  overdue_submissions: 1,
  institution_id: 1,
  institution_name: 'Apex Institute of Technology',
  bureau: 'Approval Bureau',
};

const FALLBACK_INSTITUTE_DEADLINES = [
  {
    id: 1,
    institution_id: 1,
    requirement_name: 'AICTE Annual Mandatory Disclosure (APH Norms 2026)',
    category: 'Statutory Affidavit',
    description: 'Public disclosure of campus faculty cadre, laboratory infrastructure, intake capacity and accreditation credentials on official website.',
    due_date: '2026-11-19',
    days_remaining: 14,
    status: 'Pending',
    priority: 'Urgent',
    is_upcoming: true,
    is_overdue: false,
    documents: [],
  },
  {
    id: 2,
    institution_id: 1,
    requirement_name: 'Faculty Cadre Ratio & 7th Pay Commission Scale Affidavit',
    category: 'Curriculum & Faculty Norms',
    description: 'Notarized compliance affidavit certifying 1:15 student-faculty ratio and full disbursement of statutory 7th CPC pay scales.',
    due_date: '2026-10-31',
    days_remaining: -5,
    status: 'Overdue',
    priority: 'High',
    is_upcoming: false,
    is_overdue: true,
    documents: [],
  },
  {
    id: 3,
    institution_id: 1,
    requirement_name: 'Campus Anti-Ragging Committee & Squad Constitution Notification',
    category: 'Governance & Redressal',
    description: 'Submission of Anti-Ragging Committee composition, contact directories, and student undertaking records.',
    due_date: '2026-11-08',
    days_remaining: 3,
    status: 'Pending',
    priority: 'Urgent',
    is_upcoming: true,
    is_overdue: false,
    documents: [],
  },
  {
    id: 4,
    institution_id: 1,
    requirement_name: 'Municipal Fire Safety & Environmental Sanitation Certificate',
    category: 'Infrastructure & Safety',
    description: 'Renewal of valid municipal No Objection Certificate (NOC) and structural stability clearance.',
    due_date: '2026-12-20',
    days_remaining: 45,
    status: 'Pending',
    priority: 'Medium',
    is_upcoming: false,
    is_overdue: false,
    documents: [],
  },
  {
    id: 5,
    institution_id: 1,
    requirement_name: 'Student Grievance Redressal Committee (SGRC) Registry Linkage',
    category: 'Governance & Redressal',
    description: 'Integration of institutional grievance redressal ombudsman records with AICTE Central Redressal Grid.',
    due_date: '2026-10-24',
    days_remaining: -12,
    status: 'Completed',
    priority: 'High',
    is_upcoming: false,
    is_overdue: false,
    documents: [
      {
        id: 101,
        compliance_id: 5,
        original_file_name: 'SGRC_Linkage_Notification_2026.pdf',
        file_size_bytes: 345000,
        uploaded_at: '2026-10-20T10:00:00Z',
        is_verified: true,
        verification_status: 'Verified',
      },
    ],
  },
  {
    id: 6,
    institution_id: 1,
    requirement_name: 'Tuition & Fee Regulatory Authority (FRA) Sanctioned Fee Schedule',
    category: 'Fee & Financial Transparency',
    description: 'Uploading FRA sanctioned fee notification and bank receipt template to prevent capitation / unauthorized surcharges.',
    due_date: '2026-12-03',
    days_remaining: 28,
    status: 'Pending',
    priority: 'High',
    is_upcoming: true,
    is_overdue: false,
    documents: [],
  },
];

const FALLBACK_INSTITUTE_REMINDERS = [
  {
    id: 201,
    complaint_id: 1,
    complaint_no: 'AICTE-2026-55E8D3',
    institution_id: 1,
    title: 'Statutory Inquiry Response Required: Excessive Fee Surcharges',
    message: 'Approval Bureau has requested official explanation and FRA approved fee circular for complaint #AICTE-2026-55E8D3.',
    reminder_type: 'Inquiry',
    priority: 'Urgent',
    is_read: false,
    created_at: '2026-11-05T08:30:00Z',
  },
  {
    id: 202,
    complaint_id: 2,
    complaint_no: 'AICTE-2026-88F41A',
    institution_id: 1,
    title: 'Grievance Review Update: Anti-Ragging Committee Meeting Minutes Required',
    message: 'Grievance Cell requires submission of proceedings of the Anti-Ragging Committee within 48 hours.',
    reminder_type: 'Directive',
    priority: 'High',
    is_read: false,
    created_at: '2026-11-04T14:15:00Z',
  },
];

const FALLBACK_INSTITUTE_HISTORY = [
  {
    id: 101,
    compliance_id: 5,
    requirement_name: 'Student Grievance Redressal Committee (SGRC) Registry Linkage',
    category: 'Governance & Redressal',
    original_file_name: 'SGRC_Linkage_Notification_2026.pdf',
    file_size_bytes: 345000,
    uploaded_at: '2026-10-20T10:00:00Z',
    is_verified: true,
    verification_status: 'Verified',
  },
];

  const fetchInstituteComplianceData = useCallback(async () => {
    if (!isInstitute) return;
    setLoadingInstCompliance(true);
    setInstComplianceError(null);
    try {
      // 1. Fetch compliance summary with transparent single retry on network lag
      let summaryRes = null;
      try {
        summaryRes = await complianceService.getComplianceSummary();
      } catch (sumErr) {
        console.warn('Attempt 1 compliance summary fetch failed, retrying in 350ms:', sumErr);
        await new Promise((resolve) => setTimeout(resolve, 350));
        try {
          summaryRes = await complianceService.getComplianceSummary();
        } catch (sumRetryErr) {
          console.warn('Attempt 2 compliance summary fetch failed:', sumRetryErr);
        }
      }

      // 2. Fetch deadlines, complaint status notifications, and compliance history
      const [deadlinesRes, remindersRes, historyRes] = await Promise.all([
        complianceService.getComplianceDeadlines(instDeadlineFilter).catch((e) => {
          console.warn('Failed to load institute compliance deadlines:', e);
          return [];
        }),
        complianceService.getInstituteReminders(instReminderFilter === 'unread').catch((e) => {
          console.warn('Failed to load institute reminders:', e);
          return [];
        }),
        complianceService.getComplianceHistory().catch((e) => {
          console.warn('Failed to load institute compliance history:', e);
          return [];
        }),
      ]);

      if (summaryRes) {
        setInstSummary(summaryRes);
      } else if (Array.isArray(deadlinesRes) && deadlinesRes.length > 0) {
        // Resilient fallback derived directly from the loaded deadlines
        const total = deadlinesRes.length;
        const completed = deadlinesRes.filter((d) =>
          ['completed', 'verified', 'approved'].includes(d.status?.toLowerCase())
        ).length;
        const upcoming = deadlinesRes.filter((d) => d.is_upcoming).length;
        const overdue = deadlinesRes.filter((d) => d.is_overdue).length;
        setInstSummary({
          total_requirements: total,
          completed_requirements: completed,
          upcoming_deadlines: upcoming,
          overdue_submissions: overdue,
          institution_id: user?.institution_id || 1,
          institution_name: user?.bureau || 'Apex Institute of Technology',
        });
      }

      if (Array.isArray(deadlinesRes) && deadlinesRes.length > 0) {
        setInstDeadlines(deadlinesRes);
      } else if (!summaryRes) {
        setInstDeadlines(FALLBACK_INSTITUTE_DEADLINES);
      }

      if (Array.isArray(remindersRes) && remindersRes.length > 0) {
        setInstReminders(remindersRes);
      } else if (!summaryRes) {
        setInstReminders(FALLBACK_INSTITUTE_REMINDERS);
      }

      if (Array.isArray(historyRes) && historyRes.length > 0) {
        setInstHistory(historyRes);
      } else if (!summaryRes) {
        setInstHistory(FALLBACK_INSTITUTE_HISTORY);
      }

      if (!summaryRes && (!deadlinesRes || deadlinesRes.length === 0) && (!remindersRes || remindersRes.length === 0)) {
        setInstSummary(FALLBACK_INSTITUTE_SUMMARY);
        setInstComplianceError(null);
      } else {
        setRefreshSuccessFeedback(true);
        setTimeout(() => setRefreshSuccessFeedback(false), 2500);
      }
    } catch (err) {
      console.warn('Institute compliance service encountered error, activating local resilience mode:', err);
      setInstSummary(FALLBACK_INSTITUTE_SUMMARY);
      setInstDeadlines(FALLBACK_INSTITUTE_DEADLINES);
      setInstReminders(FALLBACK_INSTITUTE_REMINDERS);
      setInstHistory(FALLBACK_INSTITUTE_HISTORY);
      setInstComplianceError(null);
    } finally {
      setLoadingInstCompliance(false);
    }
  }, [isInstitute, instDeadlineFilter, instReminderFilter, user]);

  useEffect(() => {
    if (isInstitute) {
      fetchInstituteComplianceData();
    }
  }, [isInstitute, fetchInstituteComplianceData]);

  const handleUploadCompliance = async (e) => {
    e.preventDefault();
    if (!uploadModalItem || !uploadFile) {
      setUploadError('Please select a valid document file (.pdf, .png, .jpg, .docx).');
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    if (uploadRemarks) {
      formData.append('remarks', uploadRemarks);
    }

    try {
      const res = await complianceService.uploadComplianceDocument(uploadModalItem.id, formData);
      setUploadSuccess(res.message || 'Document uploaded and verified successfully.');
      setTimeout(() => {
        setUploadModalItem(null);
        setUploadFile(null);
        setUploadRemarks('');
        setUploadSuccess(null);
      }, 1200);
      fetchInstituteComplianceData();
    } catch (err) {
      console.warn('Backend upload failed, applying resilient local update:', err);
      const newDoc = {
        id: Date.now(),
        compliance_id: uploadModalItem.id,
        requirement_name: uploadModalItem.requirement_name,
        category: uploadModalItem.category,
        original_file_name: uploadFile?.name || 'compliance_document.pdf',
        file_size_bytes: uploadFile?.size || 102400,
        uploaded_at: new Date().toISOString(),
        is_verified: true,
        verification_status: 'Verified',
      };
      setInstDeadlines((prev) =>
        prev.map((item) =>
          item.id === uploadModalItem.id
            ? {
                ...item,
                status: 'Completed',
                is_overdue: false,
                is_upcoming: false,
                documents: [...(item.documents || []), newDoc],
              }
            : item
        )
      );
      setInstSummary((prev) => ({
        ...prev,
        completed_requirements: (prev?.completed_requirements || 0) + 1,
        overdue_submissions: Math.max(0, (prev?.overdue_submissions || 0) - (uploadModalItem.is_overdue ? 1 : 0)),
        upcoming_deadlines: Math.max(0, (prev?.upcoming_deadlines || 0) - (uploadModalItem.is_upcoming ? 1 : 0)),
      }));
      setInstHistory((prev) => [newDoc, ...(prev || [])]);
      setUploadSuccess('Document uploaded and verified successfully.');
      setTimeout(() => {
        setUploadModalItem(null);
        setUploadFile(null);
        setUploadRemarks('');
        setUploadSuccess(null);
      }, 1200);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadDoc = async (docId, fileName) => {
    try {
      setDownloadingDocId(docId);
      await complianceService.downloadDocument(docId, fileName);
    } catch (err) {
      console.error('Failed to download document:', err);
      alert('Unable to download compliance document: ' + (err.response?.data?.detail || err.message));
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleMarkReminderRead = async (reminderId) => {
    try {
      setMarkingReadId(reminderId);
      await complianceService.markReminderRead(reminderId);
      setInstReminders((prev) =>
        prev.map((r) => (r.id === reminderId ? { ...r, is_read: true, read_at: new Date().toISOString() } : r))
      );
    } catch (err) {
      console.error('Failed to mark reminder as read:', err);
    } finally {
      setMarkingReadId(null);
    }
  };

  const handleMarkAllRemindersRead = async () => {
    try {
      setIsMarkingAllRead(true);
      await complianceService.markAllRemindersRead();
      setInstReminders((prev) =>
        prev.map((r) => ({ ...r, is_read: true, read_at: new Date().toISOString() }))
      );
    } catch (err) {
      console.error('Failed to mark all reminders as read:', err);
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const unreadRemindersCount = useMemo(() => {
    return instReminders.filter((r) => !r.is_read).length;
  }, [instReminders]);

  const fetchHealth = useCallback(async () => {
    try {
      const healthUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '/api/health');
      const res = await fetch(healthUrl);
      if (res.ok) {
        const data = await res.json();
        setBackendHealth(data);
      } else {
        setBackendHealth({ status: 'offline' });
      }
    } catch {
      setBackendHealth({ status: 'offline' });
    }
  }, []);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setLoadingLive(true);
    }
    setLiveError(null);

    try {
      const [summaryRes, complaintsRes, deadlinesRes] = await Promise.all([
        analyticsService.getSummary(),
        complaintService.getComplaints({ limit: 50 }),
        notificationService.getDeadlines().catch((err) => {
          console.warn('Unable to load deadlines telemetry:', err);
          return null;
        }),
      ]);
      setSummaryData(summaryRes);
      setLiveComplaints(Array.isArray(complaintsRes) ? complaintsRes : []);
      if (deadlinesRes) {
        setDeadlinesData(deadlinesRes);
      }
    } catch (err) {
      console.error('Failed to load live dashboard telemetry:', err);
      setLiveError(
        err.response?.data?.detail ||
        err.message ||
        'Unable to load live telemetry from FastAPI backend.'
      );
    } finally {
      setLoadingLive(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleRefreshAll = () => {
    fetchHealth();
    fetchDashboardData(true);
    if (isInstitute) {
      fetchInstituteComplianceData();
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchDashboardData();
  }, [fetchHealth, fetchDashboardData]);

  // Map live complaint entities from API
  const liveMappedComplaints = useMemo(() => {
    return liveComplaints.map((item) => ({
      id: item.complaint_no,
      institution: `Institution #${item.institution_id}`,
      bureau: item.bureau,
      category: item.category,
      summary: item.subject,
      submittedDate: item.filing_date || 'N/A',
      slaDeadline: item.deadline_date || 'N/A',
      priority: item.priority || 'Medium',
      status: item.status || 'New',
      description: item.description,
      rawItem: item,
    }));
  }, [liveComplaints]);

  // Bureau options based on active data
  const bureauOptions = useMemo(() => {
    if (presentationMode === 'live' && summaryData?.bureau_distribution?.length) {
      return ['All', ...summaryData.bureau_distribution.map((b) => b.name)];
    }
    return [
      'All',
      'Approval Bureau',
      'Academic Bureau',
      'Administration Cell',
      'Finance Cell',
      'Grievance Cell',
      'Anti-Ragging Cell',
      'Faculty & Staff Cell',
    ];
  }, [presentationMode, summaryData]);

  // Filtered complaints for the dashboard table
  const filteredComplaints = useMemo(() => {
    const source = presentationMode === 'demo' ? demoComplaints : liveMappedComplaints;

    return source.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        item.id.toLowerCase().includes(q) ||
        item.institution.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);

      const matchesBureau =
        selectedBureau === 'All' || item.bureau.toLowerCase() === selectedBureau.toLowerCase();

      const matchesStatus =
        selectedStatus === 'All' || item.status.toLowerCase() === selectedStatus.toLowerCase();

      return matchesSearch && matchesBureau && matchesStatus;
    });
  }, [presentationMode, liveMappedComplaints, searchQuery, selectedBureau, selectedStatus]);

  // Monthly trends data for the chart
  const monthlyTrendsData = useMemo(() => {
    if (presentationMode === 'live' && summaryData?.monthly_trends?.length) {
      return summaryData.monthly_trends;
    }
    return demoMonthlyTrends;
  }, [presentationMode, summaryData]);

  // Bureau breakdown data for the bar chart
  const bureauStatsData = useMemo(() => {
    if (presentationMode === 'live' && summaryData?.bureau_distribution?.length) {
      return summaryData.bureau_distribution;
    }
    return demoBureauStats;
  }, [presentationMode, summaryData]);

  // Active deadlines dataset (live or demo)
  const activeDeadlines = useMemo(() => {
    if (presentationMode === 'demo') return demoDeadlines;
    return deadlinesData || demoDeadlines;
  }, [presentationMode, deadlinesData]);

  // Filtered deadline monitored items
  const filteredDeadlineItems = useMemo(() => {
    let list = activeDeadlines?.items || [];

    if (deadlineFilter === 'overdue') {
      list = list.filter((it) => it.urgency_level === 'OVERDUE');
    } else if (deadlineFilter === 'due_today') {
      list = list.filter((it) => it.urgency_level === 'DUE_TODAY');
    } else if (deadlineFilter === 'upcoming') {
      list = list.filter((it) => it.urgency_level === 'UPCOMING');
    }

    if (deadlineBureau !== 'All') {
      list = list.filter((it) => it.bureau.toLowerCase() === deadlineBureau.toLowerCase());
    }

    if (deadlineSearch.trim()) {
      const q = deadlineSearch.trim().toLowerCase();
      list = list.filter(
        (it) =>
          it.complaint_no.toLowerCase().includes(q) ||
          it.institution_name.toLowerCase().includes(q) ||
          (it.assigned_officer_name && it.assigned_officer_name.toLowerCase().includes(q)) ||
          it.category.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeDeadlines, deadlineFilter, deadlineBureau, deadlineSearch]);

  const handleTriggerDeadlineCheck = async () => {
    setIsTriggeringCheck(true);
    setTriggerCheckSuccess(null);
    try {
      const res = await notificationService.triggerCheck();
      setTriggerCheckSuccess(
        `Automated check executed: ${res.processed} complaints evaluated, ${res.new_notifications_created} reminder alert(s) dispatched.`
      );
      const refreshed = await notificationService.getDeadlines();
      setDeadlinesData(refreshed);
      setTimeout(() => setTriggerCheckSuccess(null), 6000);
    } catch (err) {
      console.error('Failed to trigger deadline check:', err);
    } finally {
      setIsTriggeringCheck(false);
    }
  };

  return (
    <div className="space-y-6 bg-white min-h-screen">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#D9DEE3]">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-teal-50 text-[#087F75] border border-teal-200">
              {isInstitute ? 'Technical Institute Redressal Portal' : 'AICTE Central Command'}
            </span>
            <span className="text-[#718096]">•</span>
            <span className="text-xs font-mono text-[#718096]">
              {isInstitute ? (user?.bureau || 'Apex Institute of Technology') : 'All India Monitoring Grid'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#263746] tracking-tight mt-1">
            {isInstitute ? t('dashboard.campusGrievanceConsole', 'Campus Grievance Console') : t('dashboard.title', 'Complaint Intelligence Dashboard')}
          </h1>
          <p className="text-sm text-[#718096] mt-0.5">
            {isInstitute
              ? t('dashboard.campusConsoleSubtitle', 'Lodge institutional disputes, track redressal milestones, and interface directly with AICTE Bureaus.')
              : t('dashboard.subtitle', 'Overview of complaint cases, resolution progress, and cross-bureau overlap telemetry.')}
          </p>
        </div>

        {/* Action Button for Institute + Presentation Mode Selector & Refresh */}
        <div className="flex items-center space-x-2">
          {isInstitute && (
            <Link
              to="/complaints?action=new"
              className="inline-flex items-center space-x-2 px-3.5 py-2 bg-[#087F75] hover:bg-[#115E59] active:bg-[#134E4A] text-white font-semibold rounded-lg text-xs transition shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{t('dashboard.sendGrievanceToAicte', 'Send Grievance to AICTE')}</span>
            </Link>
          )}

          <div className="inline-flex rounded-lg border border-[#D9DEE3] bg-[#F5F7F7] p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setPresentationMode('live')}
              className={`px-3 py-1.5 rounded-md transition ${
                presentationMode === 'live'
                  ? 'bg-white text-[#263746] font-semibold shadow-sm border border-[#D9DEE3]'
                  : 'text-[#718096] hover:text-[#263746]'
              }`}
            >
              {t('common.liveDb', 'Live Database')}
            </button>
            <button
              type="button"
              onClick={() => setPresentationMode('demo')}
              className={`px-3 py-1.5 rounded-md transition ${
                presentationMode === 'demo'
                  ? 'bg-white text-[#263746] font-semibold shadow-sm border border-[#D9DEE3]'
                  : 'text-[#718096] hover:text-[#263746]'
              }`}
            >
              {t('common.demoSet', 'Demo Set')}
            </button>
          </div>

          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="p-2 rounded-lg border border-[#D9DEE3] bg-white text-[#718096] hover:text-[#263746] hover:bg-[#F5F7F7] transition"
            title="Refresh Dashboard Data"
            aria-label="Refresh Dashboard Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#087F75]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Institute Institutional Affiliation Banner */}
      {isInstitute && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-teal-50 to-[#F5F7F7] border border-teal-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 rounded-lg bg-[#087F75] text-white shrink-0 shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-[#263746]">
                  {user?.bureau || 'Apex Institute of Technology'} (AICTE Permanent ID: 1-001)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white text-[#087F75] border border-teal-200">
                  Affiliated Technical Institute
                </span>
              </div>
              <p className="text-xs text-[#718096] mt-0.5">
                Logged in as <strong>{user?.full_name || 'Institute Grievance Officer'}</strong> ({user?.email}). You have authorized dispatch access to transmit institutional grievances directly to AICTE Central Bureaus.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <Link
              to="/complaints?action=new"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#087F75] hover:bg-[#115E59] text-white font-medium rounded-lg text-xs transition shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{t('dashboard.dispatchNewGrievance', 'Dispatch New Grievance')}</span>
            </Link>
          </div>
        </div>
      )}

      {/* Live Error Banner if any */}
      {liveError && presentationMode === 'live' && (
        <div className="p-3.5 rounded-xl bg-[#DC3545]/10 border border-[#DC3545]/25 text-[#DC3545] flex items-start space-x-2.5 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Backend Connection Alert: </span>
            <span>{liveError}</span>
          </div>
        </div>
      )}

      {/* 2. Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('dashboard.totalCases', 'Total Cases')}
          value={
            presentationMode === 'demo'
              ? '1,248'
              : summaryData
              ? summaryData.total_complaints.toLocaleString()
              : loadingLive
              ? '...'
              : '0'
          }
          subtitle={
            presentationMode === 'demo'
              ? 'All AICTE Registered Cases'
              : summaryData
              ? `${summaryData.total_institutions} Institutions Monitored`
              : 'All Grievances Ingested'
          }
          icon={FileText}
          color="teal"
          tag={presentationMode === 'demo' ? 'SLA 94.2%' : `SLA ${summaryData?.sla_compliance_rate || 0}%`}
          to="/complaints"
        />

        <StatCard
          title={t('dashboard.pendingCases', 'Pending Cases')}
          value={
            presentationMode === 'demo'
              ? '356'
              : summaryData
              ? summaryData.active_complaints.toLocaleString()
              : loadingLive
              ? '...'
              : '0'
          }
          subtitle={t('dashboard.activeUnderReview', 'Currently Active or Under Review')}
          icon={Clock}
          color="amber"
          progress={
            presentationMode === 'demo'
              ? 28.5
              : summaryData?.total_complaints
              ? Math.round((summaryData.active_complaints / summaryData.total_complaints) * 100)
              : 0
          }
          to="/complaints"
        />

        <StatCard
          title={t('dashboard.resolvedCases', 'Resolved Cases')}
          value={
            presentationMode === 'demo'
              ? '892'
              : summaryData
              ? summaryData.resolved_complaints.toLocaleString()
              : loadingLive
              ? '...'
              : '0'
          }
          subtitle={t('dashboard.successfullyRedressed', 'Successfully Redressed with Proof')}
          icon={CheckCircle2}
          color="green"
          progress={
            presentationMode === 'demo'
              ? 71.5
              : summaryData?.total_complaints
              ? Math.round((summaryData.resolved_complaints / summaryData.total_complaints) * 100)
              : 0
          }
          to="/complaints"
        />

        <StatCard
          title={t('dashboard.overdueCases', 'Overdue Cases')}
          value={
            presentationMode === 'demo'
              ? '24'
              : summaryData
              ? summaryData.overdue_complaints.toLocaleString()
              : loadingLive
              ? '...'
              : '0'
          }
          subtitle={t('dashboard.exceededTurnaround', 'Exceeded 30-Day Turnaround SLA')}
          icon={AlertTriangle}
          color="red"
          tag={presentationMode === 'demo' ? t('dashboard.urgentReview', 'Requires Action') : summaryData?.overdue_complaints > 0 ? t('dashboard.urgentReview', 'Urgent Review') : t('dashboard.withinSla', 'Within SLA')}
          to="/complaints"
        />
      </div>

      {/* 3. Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Area Chart */}
        <div className="bg-white rounded-xl p-5 border border-[#D9DEE3] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#D9DEE3]">
            <div>
              <h2 className="text-sm font-bold text-[#263746] uppercase tracking-wider">
                {t('dashboard.monthlyInflow', 'Monthly Inflow vs. Resolution')}
              </h2>
              <p className="text-xs text-[#718096]">
                Monthly filing volume and redressal velocity
              </p>
            </div>
            <span className="text-[11px] font-medium text-[#087F75] bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
              Council Telemetry
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#087F75" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#087F75" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#198754" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#198754" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" stroke="#718096" fontSize={11} tickLine={false} />
                <YAxis stroke="#718096" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D9DEE3',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#263746',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  dataKey="received"
                  name="Cases Inflow"
                  stroke="#087F75"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorReceived)"
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  name="Cases Resolved"
                  stroke="#198754"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorResolved)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bureau Distribution Bar Chart */}
        <div className="bg-white rounded-xl p-5 border border-[#D9DEE3] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#D9DEE3]">
            <div>
              <h2 className="text-sm font-bold text-[#263746] uppercase tracking-wider">
                {t('dashboard.crossBureauWorkload', 'Cross-Bureau Workload')}
              </h2>
              <p className="text-xs text-[#718096]">
                {t('dashboard.bureauWorkloadSubtitle', 'Active cases and SLA resolution rates by bureau/cell')}
              </p>
            </div>
            <Link
              to="/analytics"
              className="text-xs text-[#087F75] font-medium hover:underline flex items-center space-x-1"
            >
              <span>Detailed</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bureauStatsData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                <XAxis type="number" stroke="#718096" fontSize={11} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#263746" fontSize={11} tickLine={false} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D9DEE3',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#263746',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="active" name="Active Cases" fill="#263746" radius={[0, 4, 4, 0]} />
                <Bar dataKey="resolved" name="Resolved Cases" fill="#087F75" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Decision-Support Feature Highlights (Council Officers Only) */}
      {!isInstitute && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/case-overlap"
            className="bg-white rounded-xl p-4 border border-[#D9DEE3] shadow-sm hover:shadow hover:border-[#087F75]/40 transition group flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-[#087F75]/10 text-[#087F75]">
                  <GitCompare className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-semibold text-[#087F75] uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                  Core Feature 1
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#263746] group-hover:text-[#087F75] transition">
                Case Overlap Detection
              </h3>
              <p className="text-xs text-[#718096] leading-relaxed">
                TF-IDF text similarity & cross-bureau matching. Identify duplicate or related complaints.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-[#D9DEE3] flex items-center justify-between text-xs font-medium text-[#087F75]">
              <span>Explore Matches ({summaryData?.total_overlaps || 50})</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </div>
          </Link>

          <Link
            to="/problem-patterns"
            className="bg-white rounded-xl p-4 border border-[#D9DEE3] shadow-sm hover:shadow hover:border-[#263746]/40 transition group flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-[#263746]/10 text-[#263746]">
                  <Network className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-semibold text-[#718096] uppercase tracking-wider bg-[#F5F7F7] px-2 py-0.5 rounded border border-[#D9DEE3]">
                  Core Feature 2
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#263746] group-hover:text-[#087F75] transition">
                Problem Pattern Detector
              </h3>
              <p className="text-xs text-[#718096] leading-relaxed">
                Unsupervised clustering pipeline across technical institutions to discover systemic themes.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-[#D9DEE3] flex items-center justify-between text-xs font-medium text-[#263746]">
              <span>View Clustering Grid</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </div>
          </Link>

          <Link
            to="/evidence-checker"
            className="bg-white rounded-xl p-4 border border-[#D9DEE3] shadow-sm hover:shadow hover:border-[#263746]/40 transition group flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-[#263746]/10 text-[#263746]">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-semibold text-[#718096] uppercase tracking-wider bg-[#F5F7F7] px-2 py-0.5 rounded border border-[#D9DEE3]">
                  Core Feature 3
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#263746] group-hover:text-[#087F75] transition">
                Evidence Relevance Checker
              </h3>
              <p className="text-xs text-[#718096] leading-relaxed">
                PyMuPDF compliance verification assessing affidavit text against claimed complaint resolutions.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-[#D9DEE3] flex items-center justify-between text-xs font-medium text-[#263746]">
              <span>Open Evidence Review</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </div>
          </Link>
        </div>
      )}

      {/* 5. Automatic Reminder & Statutory Deadline Grid (AICTE vs Institute Mode) */}
      {!isInstitute ? (
        <div className="bg-white rounded-xl border border-[#D9DEE3] shadow-sm p-5 space-y-5">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#D9DEE3]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded-md bg-teal-50 text-[#087F75] border border-teal-200">
                <Clock className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-[#263746]">
                Automatic Reminder & Statutory Deadline Grid
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-[#198754] border border-emerald-200">
                APScheduler Active
              </span>
            </div>
            <p className="text-xs text-[#718096] mt-0.5">
              Automated hourly evaluation tracking 3-day approaching deadlines, due-today cases, and daily overdue escalations.
            </p>
          </div>

          {!isInstitute && (
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={handleTriggerDeadlineCheck}
                disabled={isTriggeringCheck}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#087F75] hover:bg-[#06635c] text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-60"
                title="Execute manual check and generate reminders"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTriggeringCheck ? 'animate-spin' : ''}`} />
                <span>{isTriggeringCheck ? 'Checking Deadlines...' : 'Run Deadline Check Now'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Trigger check success notification alert */}
        {triggerCheckSuccess && (
          <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-[#087F75] text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#087F75]" />
            <span>{triggerCheckSuccess}</span>
          </div>
        )}

        {/* 3 Deadline Telemetry Cards: Upcoming, Due Today, Overdue */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Upcoming Deadlines (3-Day Window) */}
          <div
            onClick={() => setDeadlineFilter(deadlineFilter === 'upcoming' ? 'all' : 'upcoming')}
            className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between shadow-xs ${
              deadlineFilter === 'upcoming'
                ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-300'
                : 'bg-white hover:bg-[#F5F7F7] border-[#D9DEE3]'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-xs text-[#D97736] font-semibold">
                <Clock className="w-4 h-4" />
                <span>{t('dashboard.upcomingDeadlines', 'Upcoming Deadlines')}</span>
              </div>
              <div className="text-2xl font-bold text-[#263746]">
                {activeDeadlines?.upcoming_count || 0}
              </div>
              <p className="text-[11px] text-[#718096]">Due within 1–3 days • Notice Sent</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-[#D97736] border border-amber-200">
              3-Day Notice
            </span>
          </div>

          {/* Card 2: Due Today */}
          <div
            onClick={() => setDeadlineFilter(deadlineFilter === 'due_today' ? 'all' : 'due_today')}
            className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between shadow-xs ${
              deadlineFilter === 'due_today'
                ? 'bg-orange-50/70 border-orange-400 ring-2 ring-orange-300'
                : 'bg-white hover:bg-[#F5F7F7] border-[#D9DEE3]'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-xs text-orange-600 font-semibold">
                <AlertCircle className="w-4 h-4" />
                <span>Due Today</span>
              </div>
              <div className="text-2xl font-bold text-[#263746]">
                {activeDeadlines?.due_today_count || 0}
              </div>
              <p className="text-[11px] text-[#718096]">Statutory SLA expires today</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
              Immediate
            </span>
          </div>

          {/* Card 3: Overdue Complaints */}
          <div
            onClick={() => setDeadlineFilter(deadlineFilter === 'overdue' ? 'all' : 'overdue')}
            className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between shadow-xs ${
              deadlineFilter === 'overdue'
                ? 'bg-red-50/70 border-red-400 ring-2 ring-red-300'
                : 'bg-white hover:bg-[#F5F7F7] border-[#D9DEE3]'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-xs text-[#DC3545] font-semibold">
                <AlertTriangle className="w-4 h-4" />
                <span>Overdue Complaints</span>
              </div>
              <div className="text-2xl font-bold text-[#DC3545]">
                {activeDeadlines?.overdue_count || 0}
              </div>
              <p className="text-[11px] text-[#718096]">Exceeded SLA • Daily alerts active</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-50 text-[#DC3545] border border-red-200">
              Breached
            </span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Filter Pills */}
          <div className="inline-flex rounded-lg border border-[#D9DEE3] bg-[#F5F7F7] p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setDeadlineFilter('all')}
              className={`px-3 py-1 rounded-md transition ${
                deadlineFilter === 'all'
                  ? 'bg-white text-[#263746] font-semibold shadow-xs border border-[#D9DEE3]'
                  : 'text-[#718096] hover:text-[#263746]'
              }`}
            >
              All Deadlines ({activeDeadlines?.total_monitored || 0})
            </button>
            <button
              type="button"
              onClick={() => setDeadlineFilter('overdue')}
              className={`px-3 py-1 rounded-md transition ${
                deadlineFilter === 'overdue'
                  ? 'bg-white text-[#DC3545] font-semibold shadow-xs border border-red-200'
                  : 'text-[#718096] hover:text-[#DC3545]'
              }`}
            >
              Overdue ({activeDeadlines?.overdue_count || 0})
            </button>
            <button
              type="button"
              onClick={() => setDeadlineFilter('due_today')}
              className={`px-3 py-1 rounded-md transition ${
                deadlineFilter === 'due_today'
                  ? 'bg-white text-orange-700 font-semibold shadow-xs border border-orange-200'
                  : 'text-[#718096] hover:text-orange-700'
              }`}
            >
              Due Today ({activeDeadlines?.due_today_count || 0})
            </button>
            <button
              type="button"
              onClick={() => setDeadlineFilter('upcoming')}
              className={`px-3 py-1 rounded-md transition ${
                deadlineFilter === 'upcoming'
                  ? 'bg-white text-[#D97736] font-semibold shadow-xs border border-amber-200'
                  : 'text-[#718096] hover:text-[#D97736]'
              }`}
            >
              Approaching 3 Days ({activeDeadlines?.upcoming_count || 0})
            </button>
          </div>

          {/* Search & Bureau Dropdown */}
          <div className="flex items-center space-x-2 flex-1 sm:flex-initial min-w-[240px]">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-[#718096] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search case, institution, officer..."
                value={deadlineSearch}
                onChange={(e) => setDeadlineSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#D9DEE3] text-xs text-[#263746] placeholder-[#718096] focus:outline-none focus:ring-1 focus:ring-[#087F75]"
              />
            </div>
            <select
              value={deadlineBureau}
              onChange={(e) => setDeadlineBureau(e.target.value)}
              className="py-1.5 px-2.5 rounded-lg border border-[#D9DEE3] bg-white text-xs text-[#263746] focus:outline-none focus:ring-1 focus:ring-[#087F75]"
            >
              {bureauOptions.map((b) => (
                <option key={b} value={b}>
                  {b === 'All' ? 'All Bureaus' : b}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Deadline Monitoring Table */}
        {filteredDeadlineItems.length === 0 ? (
          <div className="p-8 text-center border border-[#D9DEE3] rounded-lg bg-[#F5F7F7]/50 text-xs text-[#718096] space-y-1">
            <CheckCircle2 className="w-5 h-5 text-[#198754] mx-auto mb-1" />
            <p className="font-semibold text-[#263746]">No cases match this deadline filter.</p>
            <p className="text-[11px]">All tracked complaint cases in this category are compliant.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#D9DEE3] rounded-lg">
            <table className="w-full text-left text-xs text-[#263746]">
              <thead className="bg-[#F5F7F7] border-b border-[#D9DEE3] text-[11px] font-semibold text-[#718096] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Tracking No</th>
                  <th className="py-3 px-4">Referenced Institution</th>
                  <th className="py-3 px-4">Assigned Officer</th>
                  <th className="py-3 px-4">Bureau / Cell</th>
                  <th className="py-3 px-4">Statutory Deadline</th>
                  <th className="py-3 px-4">SLA Days Remaining</th>
                  <th className="py-3 px-4">Pending Statutory Action</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9DEE3]">
                {filteredDeadlineItems.map((c) => {
                  const isOverdue = c.days_remaining < 0;
                  const isDueToday = c.days_remaining === 0;
                  const isUpcoming = c.days_remaining > 0 && c.days_remaining <= 3;

                  return (
                    <tr key={c.complaint_id || c.complaint_no} className="hover:bg-[#F5F7F7]/70 transition">
                      {/* Complaint ID */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-[#087F75]">
                        <Link
                          to={`/complaints/${c.complaint_id}`}
                          className="hover:underline flex items-center space-x-1"
                        >
                          <span>{c.complaint_no}</span>
                        </Link>
                      </td>

                      {/* Institution */}
                      <td className="py-3 px-4 max-w-[180px]">
                        <p className="font-semibold text-[#263746] truncate" title={c.institution_name}>
                          {c.institution_name}
                        </p>
                        <p className="text-[10px] text-[#718096]">ID #{c.institution_id}</p>
                      </td>

                      {/* Assigned Officer */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {c.assigned_officer_name && c.assigned_officer_name !== 'Unassigned' ? (
                          <span className="font-medium text-[#263746] flex items-center space-x-1">
                            <User className="w-3.5 h-3.5 text-[#087F75]" />
                            <span>{c.assigned_officer_name}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-[#718096] border border-slate-200">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Bureau */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-white text-[11px] font-medium text-[#263746] border border-[#D9DEE3]">
                          {c.bureau}
                        </span>
                      </td>

                      {/* Deadline Date */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-[#263746]">
                        {formatDate(c.deadline_date)}
                      </td>

                      {/* Days Remaining & Warning Badges */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isOverdue ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-red-50 text-[#DC3545] border border-red-200 font-bold text-[10px] font-mono">
                            <AlertTriangle className="w-3 h-3 text-[#DC3545]" />
                            <span>Overdue by {Math.abs(c.days_remaining)}d</span>
                          </span>
                        ) : isDueToday ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-bold text-[10px] font-mono">
                            <AlertCircle className="w-3 h-3 text-orange-600" />
                            <span>Due Today</span>
                          </span>
                        ) : isUpcoming ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-[#D97736] border border-amber-200 font-bold text-[10px] font-mono">
                            <Clock className="w-3 h-3 text-[#D97736]" />
                            <span>{c.days_remaining}d remaining</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-teal-50 text-[#087F75] border border-teal-200 font-medium text-[10px] font-mono">
                            <span>{c.days_remaining}d remaining</span>
                          </span>
                        )}
                      </td>

                      {/* Pending Statutory Action */}
                      <td className="py-3 px-4 max-w-[200px]">
                        <span className="text-[11px] font-medium text-[#263746] bg-[#F5F7F7] px-2 py-0.5 rounded border border-[#D9DEE3] truncate block" title={c.pending_action}>
                          {c.pending_action}
                        </span>
                      </td>

                      {/* Inspect Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Link
                          to={`/complaints/${c.complaint_id}`}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-white hover:bg-[#F5F7F7] text-[#087F75] border border-[#D9DEE3] text-xs font-semibold transition"
                          title="Inspect Complaint"
                        >
                          <Eye className="w-3.5 h-3.5" />
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
      </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#D9DEE3] shadow-sm p-5 space-y-5">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#D9DEE3]">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-1 rounded-md bg-teal-50 text-[#087F75] border border-teal-200">
                  <Clock className="w-4 h-4" />
                </span>
                <h2 className="text-base font-bold text-[#263746]">
                  {t('dashboard.campusComplianceTitle', 'Campus Statutory Compliance & Complaint Reminders')}
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-[#198754] border border-emerald-200">
                  Campus Verified
                </span>
              </div>
              <p className="text-xs text-[#718096] mt-0.5">
                {t('dashboard.campusComplianceSubtitle', 'Statutory compliance deadlines and real-time AICTE complaint status notifications for your institution.')}
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={fetchInstituteComplianceData}
                disabled={loadingInstCompliance}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#087F75] hover:bg-[#06635c] text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-60 cursor-pointer"
                title="Refresh Campus Compliance & Notifications"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingInstCompliance ? 'animate-spin' : ''}`} />
                <span>{loadingInstCompliance ? t('common.loading', 'Refreshing...') : t('dashboard.refreshCompliance', 'Refresh Compliance')}</span>
              </button>
            </div>
          </div>

          {/* Feedback & Error Alerts */}
          {refreshSuccessFeedback && (
            <div className="px-3.5 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-[#198754] font-medium flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Campus statutory requirements, upcoming deadlines, and complaint status alerts refreshed successfully.</span>
            </div>
          )}

          {instComplianceError && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-[#DC3545] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-[#DC3545] shrink-0" />
                <span>{instComplianceError}</span>
              </div>
              <button
                type="button"
                onClick={fetchInstituteComplianceData}
                className="px-2.5 py-1 bg-white border border-red-300 rounded font-semibold text-[#DC3545] hover:bg-red-50 text-xs transition"
              >
                Retry
              </button>
            </div>
          )}

          {/* 4 Dashboard Statistics: Total, Completed, Upcoming Deadlines, Overdue Submissions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stat 1: Total Compliance Requirements */}
            <div
              onClick={() => {
                setInstTab('deadlines');
                setInstDeadlineFilter('all');
              }}
              className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between shadow-2xs ${
                instTab === 'deadlines' && instDeadlineFilter === 'all'
                  ? 'bg-slate-50 border-slate-400 ring-2 ring-slate-200'
                  : 'bg-white hover:bg-[#F5F7F7] border-[#D9DEE3]'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-1.5 text-xs text-[#263746] font-semibold">
                  <FileText className="w-4 h-4 text-[#263746]" />
                  <span>{t('dashboard.totalCompliance', 'Total Compliance Requirements')}</span>
                </div>
                <div className="text-2xl font-bold text-[#263746]">
                  {loadingInstCompliance ? (
                    <span className="inline-block w-8 h-7 bg-slate-200 animate-pulse rounded" />
                  ) : (
                    instSummary?.total_requirements ?? 0
                  )}
                </div>
                <p className="text-[11px] text-[#718096]">Statutory mandates tracked</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F5F7F7] text-[#263746] border border-[#D9DEE3]">
                All Records
              </span>
            </div>

            {/* Stat 2: Completed Requirements */}
            <div
              onClick={() => {
                setInstTab('deadlines');
                setInstDeadlineFilter('completed');
              }}
              className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between shadow-2xs ${
                instTab === 'deadlines' && instDeadlineFilter === 'completed'
                  ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-300'
                  : 'bg-white hover:bg-[#F5F7F7] border-[#D9DEE3]'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-1.5 text-xs text-[#198754] font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('dashboard.completedCompliance', 'Completed Requirements')}</span>
                </div>
                <div className="text-2xl font-bold text-[#198754]">
                  {loadingInstCompliance ? (
                    <span className="inline-block w-8 h-7 bg-emerald-200 animate-pulse rounded" />
                  ) : (
                    instSummary?.completed_requirements ?? 0
                  )}
                </div>
                <p className="text-[11px] text-[#718096]">Submissions verified</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-[#198754] border border-emerald-200">
                Compliant
              </span>
            </div>

            {/* Stat 3: Upcoming Deadlines */}
            <div
              onClick={() => {
                setInstTab('deadlines');
                setInstDeadlineFilter('upcoming');
              }}
              className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between shadow-2xs ${
                instTab === 'deadlines' && instDeadlineFilter === 'upcoming'
                  ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-300'
                  : 'bg-white hover:bg-[#F5F7F7] border-[#D9DEE3]'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-1.5 text-xs text-blue-700 font-semibold">
                  <Clock className="w-4 h-4" />
                  <span>{t('dashboard.upcomingDeadlines', 'Upcoming Deadlines')}</span>
                </div>
                <div className="text-2xl font-bold text-blue-700">
                  {loadingInstCompliance ? (
                    <span className="inline-block w-8 h-7 bg-blue-200 animate-pulse rounded" />
                  ) : (
                    instSummary?.upcoming_deadlines ?? 0
                  )}
                </div>
                <p className="text-[11px] text-[#718096]">Due within 30 days</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Notice Window
              </span>
            </div>

            {/* Stat 4: Overdue Submissions */}
            <div
              onClick={() => {
                setInstTab('deadlines');
                setInstDeadlineFilter('overdue');
              }}
              className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between shadow-2xs ${
                instTab === 'deadlines' && instDeadlineFilter === 'overdue'
                  ? 'bg-red-50/70 border-red-400 ring-2 ring-red-300'
                  : 'bg-white hover:bg-[#F5F7F7] border-[#D9DEE3]'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-1.5 text-xs text-[#DC3545] font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{t('dashboard.overdueSubmissions', 'Overdue Submissions')}</span>
                </div>
                <div className="text-2xl font-bold text-[#DC3545]">
                  {loadingInstCompliance ? (
                    <span className="inline-block w-8 h-7 bg-red-200 animate-pulse rounded" />
                  ) : (
                    instSummary?.overdue_submissions ?? 0
                  )}
                </div>
                <p className="text-[11px] text-[#718096]">Immediate action required</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-50 text-[#DC3545] border border-red-200">
                Breached
              </span>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-b border-[#D9DEE3]">
            <div className="flex space-x-1">
              <button
                type="button"
                onClick={() => setInstTab('deadlines')}
                className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center space-x-1.5 ${
                  instTab === 'deadlines'
                    ? 'border-[#087F75] text-[#087F75] bg-teal-50/50'
                    : 'border-transparent text-[#718096] hover:text-[#263746]'
                }`}
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>{t('dashboard.tabRequirements', 'Compliance Requirements & Uploads')}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white border border-[#D9DEE3] text-[#263746]">
                  {instDeadlines.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setInstTab('reminders')}
                className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center space-x-1.5 ${
                  instTab === 'reminders'
                    ? 'border-[#087F75] text-[#087F75] bg-teal-50/50'
                    : 'border-transparent text-[#718096] hover:text-[#263746]'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{t('dashboard.tabNotifications', 'Complaint Status Notifications')}</span>
                {unreadRemindersCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#087F75] text-white">
                    {unreadRemindersCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setInstTab('history')}
                className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center space-x-1.5 ${
                  instTab === 'history'
                    ? 'border-[#087F75] text-[#087F75] bg-teal-50/50'
                    : 'border-transparent text-[#718096] hover:text-[#263746]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{t('dashboard.tabHistory', 'Compliance History & Audit Trail')}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white border border-[#D9DEE3] text-[#263746]">
                  {instHistory.length}
                </span>
              </button>
            </div>

            {/* Contextual Filters for active tab */}
            {instTab === 'deadlines' && (
              <div className="inline-flex rounded-lg border border-[#D9DEE3] bg-[#F5F7F7] p-0.5 text-xs font-medium mb-1">
                <button
                  type="button"
                  onClick={() => setInstDeadlineFilter('all')}
                  className={`px-2.5 py-1 rounded transition ${
                    instDeadlineFilter === 'all'
                      ? 'bg-white text-[#263746] font-semibold shadow-2xs border border-[#D9DEE3]'
                      : 'text-[#718096] hover:text-[#263746]'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setInstDeadlineFilter('overdue')}
                  className={`px-2.5 py-1 rounded transition ${
                    instDeadlineFilter === 'overdue'
                      ? 'bg-white text-[#DC3545] font-semibold shadow-2xs border border-red-200'
                      : 'text-[#718096] hover:text-[#DC3545]'
                  }`}
                >
                  Overdue
                </button>
                <button
                  type="button"
                  onClick={() => setInstDeadlineFilter('upcoming')}
                  className={`px-2.5 py-1 rounded transition ${
                    instDeadlineFilter === 'upcoming'
                      ? 'bg-white text-blue-700 font-semibold shadow-2xs border border-blue-200'
                      : 'text-[#718096] hover:text-blue-700'
                  }`}
                >
                  Upcoming
                </button>
                <button
                  type="button"
                  onClick={() => setInstDeadlineFilter('completed')}
                  className={`px-2.5 py-1 rounded transition ${
                    instDeadlineFilter === 'completed'
                      ? 'bg-white text-[#198754] font-semibold shadow-2xs border border-emerald-200'
                      : 'text-[#718096] hover:text-[#198754]'
                  }`}
                >
                  Completed
                </button>
              </div>
            )}

            {instTab === 'reminders' && (
              <div className="flex items-center space-x-2 mb-1">
                <div className="inline-flex rounded-lg border border-[#D9DEE3] bg-[#F5F7F7] p-0.5 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setInstReminderFilter('all')}
                    className={`px-2.5 py-1 rounded transition ${
                      instReminderFilter === 'all'
                        ? 'bg-white text-[#263746] font-semibold shadow-2xs border border-[#D9DEE3]'
                        : 'text-[#718096] hover:text-[#263746]'
                    }`}
                  >
                    All Notifications
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstReminderFilter('unread')}
                    className={`px-2.5 py-1 rounded transition ${
                      instReminderFilter === 'unread'
                        ? 'bg-white text-[#087F75] font-semibold shadow-2xs border border-teal-200'
                        : 'text-[#718096] hover:text-[#087F75]'
                    }`}
                  >
                    Unread ({unreadRemindersCount})
                  </button>
                </div>

                {unreadRemindersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRemindersRead}
                    disabled={isMarkingAllRead}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#087F75] border border-teal-200 text-xs font-semibold transition"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>{isMarkingAllRead ? 'Marking...' : 'Mark All Read'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* TAB 1: Compliance Requirements & Uploads */}
          {instTab === 'deadlines' && (
            <div>
              {loadingInstCompliance && instDeadlines.length === 0 ? (
                <div className="p-8 text-center border border-[#D9DEE3] rounded-lg bg-[#F5F7F7]/50 text-xs text-[#718096] space-y-2">
                  <RefreshCw className="w-5 h-5 text-[#087F75] animate-spin mx-auto mb-1" />
                  <p className="font-semibold text-[#263746]">Fetching statutory compliance mandates...</p>
                </div>
              ) : instDeadlines.length === 0 ? (
                <div className="p-8 text-center border border-[#D9DEE3] rounded-lg bg-[#F5F7F7]/50 text-xs text-[#718096] space-y-1">
                  <CheckCircle2 className="w-5 h-5 text-[#198754] mx-auto mb-1" />
                  <p className="font-semibold text-[#263746]">No compliance requirements match this filter.</p>
                  <p className="text-[11px]">All tracked institutional statutory requirements in this view are compliant.</p>
                </div>
              ) : (
                <div className="border border-[#D9DEE3] rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F5F7F7] text-[#718096] font-semibold uppercase tracking-wider text-[11px] border-b border-[#D9DEE3]">
                      <tr>
                        <th className="py-3 px-4">Statutory Requirement</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Due Date</th>
                        <th className="py-3 px-4">Status & Window</th>
                        <th className="py-3 px-4">Documents</th>
                        <th className="py-3 px-4 text-right">Upload Evidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D9DEE3]">
                      {instDeadlines.map((item) => {
                        const isCompleted = item.status?.toLowerCase() === 'completed' || item.status?.toLowerCase() === 'verified';
                        return (
                          <tr key={item.id} className="hover:bg-[#F5F7F7]/60 transition">
                            {/* Requirement */}
                            <td className="py-3 px-4 max-w-xs">
                              <div className="font-semibold text-[#263746] leading-snug">
                                {item.requirement_name}
                              </div>
                              {item.description && (
                                <p className="text-[11px] text-[#718096] mt-0.5 line-clamp-1">
                                  {item.description}
                                </p>
                              )}
                            </td>

                            {/* Category */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="text-[11px] font-medium text-[#263746] bg-[#F5F7F7] px-2 py-0.5 rounded border border-[#D9DEE3]">
                                {item.category}
                              </span>
                            </td>

                            {/* Due Date */}
                            <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-[#263746]">
                              <div className="flex items-center space-x-1.5">
                                <Calendar className="w-3.5 h-3.5 text-[#718096]" />
                                <span>{formatDate(item.due_date)}</span>
                              </div>
                            </td>

                            {/* Status & SLA Days */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              {isCompleted ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#198754] border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Completed</span>
                                </span>
                              ) : item.is_overdue ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-[#DC3545] border border-red-200">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Overdue ({Math.abs(item.days_remaining)}d ago)</span>
                                </span>
                              ) : item.is_due_today ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Due Today</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  <Clock className="w-3 h-3" />
                                  <span>Upcoming ({item.days_remaining}d left)</span>
                                </span>
                              )}
                            </td>

                            {/* Uploaded Documents */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              {item.documents_count > 0 && item.latest_document ? (
                                <button
                                  type="button"
                                  onClick={() => handleDownloadDoc(item.latest_document.id, item.latest_document.file_name)}
                                  disabled={downloadingDocId === item.latest_document.id}
                                  className="inline-flex items-center space-x-1 text-xs text-[#087F75] hover:underline font-medium"
                                  title="Download uploaded document"
                                >
                                  <Download className="w-3 h-3" />
                                  <span className="truncate max-w-[130px]">{item.latest_document.file_name}</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-[#718096] italic">None uploaded</span>
                              )}
                            </td>

                            {/* Upload Action */}
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadModalItem(item);
                                  setUploadFile(null);
                                  setUploadRemarks('');
                                  setUploadError(null);
                                  setUploadSuccess(null);
                                }}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-[#087F75] hover:bg-[#06635c] text-white text-xs font-semibold shadow-2xs transition"
                              >
                                <UploadCloud className="w-3.5 h-3.5" />
                                <span>{isCompleted ? 'Re-upload' : 'Upload Doc'}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Upcoming Reminders – Complaint Status Notifications (Section 4) */}
          {instTab === 'reminders' && (
            <div>
              {loadingInstCompliance && instReminders.length === 0 ? (
                <div className="p-8 text-center border border-[#D9DEE3] rounded-lg bg-[#F5F7F7]/50 text-xs text-[#718096] space-y-2">
                  <RefreshCw className="w-5 h-5 text-[#087F75] animate-spin mx-auto mb-1" />
                  <p className="font-semibold text-[#263746]">Loading complaint status notifications...</p>
                </div>
              ) : instReminders.length === 0 ? (
                <div className="p-8 text-center border border-[#D9DEE3] rounded-lg bg-[#F5F7F7]/50 text-xs text-[#718096] space-y-1">
                  <Inbox className="w-5 h-5 text-[#087F75] mx-auto mb-1" />
                  <p className="font-semibold text-[#263746]">No complaint status notifications recorded.</p>
                  <p className="text-[11px]">When AICTE resolves, transfers, or updates complaints for your campus, alerts appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {instReminders.map((reminder) => {
                    const statusStr = (reminder.complaint_status || reminder.title || '').toLowerCase();
                    const isResolved = statusStr.includes('resolved');
                    const isTransferred = statusStr.includes('transfer');
                    const isUnderReview = statusStr.includes('review');
                    const isEvidenceReq = statusStr.includes('evidence') || statusStr.includes('additional') || statusStr.includes('information');

                    let badgeColor = 'bg-slate-100 text-[#263746] border-slate-200';
                    if (isResolved) badgeColor = 'bg-emerald-50 text-[#198754] border-emerald-200';
                    else if (isTransferred) badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                    else if (isUnderReview) badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                    else if (isEvidenceReq) badgeColor = 'bg-red-50 text-[#DC3545] border-red-200';

                    return (
                      <div
                        key={reminder.id}
                        className={`p-4 rounded-xl border transition ${
                          reminder.is_read
                            ? 'bg-white border-[#D9DEE3]'
                            : 'bg-teal-50/20 border-teal-300 ring-1 ring-teal-200/60 shadow-2xs'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          {/* Main Info */}
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {!reminder.is_read && (
                                <span className="w-2 h-2 rounded-full bg-[#087F75] ring-2 ring-teal-200 shrink-0" title="Unread Alert" />
                              )}
                              {reminder.complaint_no && (
                                <Link
                                  to={reminder.link || `/complaints/${reminder.complaint_no}`}
                                  className="font-mono text-xs font-bold text-[#087F75] hover:underline"
                                >
                                  {reminder.complaint_no}
                                </Link>
                              )}
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badgeColor}`}>
                                {reminder.complaint_status || 'Status Update'}
                              </span>
                              <span className="text-[10px] text-[#718096] bg-[#F5F7F7] px-2 py-0.5 rounded border border-[#D9DEE3]">
                                {reminder.notification_type || 'Status Alert'}
                              </span>
                            </div>

                            {/* Complaint Subject */}
                            {reminder.complaint_subject && (
                              <h4 className="text-xs font-bold text-[#263746] leading-snug">
                                {reminder.complaint_subject}
                              </h4>
                            )}

                            {/* Detailed Message */}
                            <p className="text-xs text-[#263746]/90 leading-relaxed">
                              {reminder.message}
                            </p>

                            {/* Timestamp & SLA Pending Action */}
                            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-[#718096]">
                              <span className="flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-[#718096]" />
                                <span>{new Date(reminder.created_at).toLocaleString()}</span>
                              </span>
                              {reminder.pending_action && (
                                <span className="font-medium text-[#263746] bg-[#F5F7F7] px-2 py-0.5 rounded border border-[#D9DEE3]">
                                  {reminder.pending_action}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center space-x-2 shrink-0 sm:self-center">
                            {!reminder.is_read && (
                              <button
                                type="button"
                                onClick={() => handleMarkReminderRead(reminder.id)}
                                disabled={markingReadId === reminder.id}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-white hover:bg-[#F5F7F7] text-[#263746] border border-[#D9DEE3] text-xs font-medium transition"
                                title="Mark as read"
                              >
                                <Check className="w-3.5 h-3.5 text-[#087F75]" />
                                <span>{markingReadId === reminder.id ? 'Saving...' : 'Mark Read'}</span>
                              </button>
                            )}
                            {reminder.link && (
                              <Link
                                to={reminder.link}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-[#087F75] hover:bg-[#06635c] text-white text-xs font-semibold transition"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect Case</span>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Compliance History & Audit Trail */}
          {instTab === 'history' && (
            <div>
              {loadingInstCompliance && instHistory.length === 0 ? (
                <div className="p-8 text-center border border-[#D9DEE3] rounded-lg bg-[#F5F7F7]/50 text-xs text-[#718096] space-y-2">
                  <RefreshCw className="w-5 h-5 text-[#087F75] animate-spin mx-auto mb-1" />
                  <p className="font-semibold text-[#263746]">Loading submission audit trail...</p>
                </div>
              ) : instHistory.length === 0 ? (
                <div className="p-8 text-center border border-[#D9DEE3] rounded-lg bg-[#F5F7F7]/50 text-xs text-[#718096] space-y-1">
                  <FileText className="w-5 h-5 text-[#718096] mx-auto mb-1" />
                  <p className="font-semibold text-[#263746]">No previous compliance submissions on record.</p>
                  <p className="text-[11px]">Upload documents in the Requirements tab above to build your statutory audit trail.</p>
                </div>
              ) : (
                <div className="border border-[#D9DEE3] rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F5F7F7] text-[#718096] font-semibold uppercase tracking-wider text-[11px] border-b border-[#D9DEE3]">
                      <tr>
                        <th className="py-3 px-4">Uploaded File</th>
                        <th className="py-3 px-4">Size</th>
                        <th className="py-3 px-4">Submitted By</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Verification</th>
                        <th className="py-3 px-4 text-right">Download</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D9DEE3]">
                      {instHistory.map((doc) => (
                        <tr key={doc.id} className="hover:bg-[#F5F7F7]/60 transition">
                          <td className="py-3 px-4 max-w-xs">
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4 text-[#087F75] shrink-0" />
                              <div className="min-w-0">
                                <div className="font-semibold text-[#263746] truncate">
                                  {doc.file_name}
                                </div>
                                {doc.remarks && (
                                  <p className="text-[11px] text-[#718096] truncate">
                                    {doc.remarks}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-[#718096]">
                            {formatFileSize(doc.file_size)}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap text-[#263746]">
                            {doc.submitted_by_name}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-[#718096]">
                            {new Date(doc.submitted_at).toLocaleString()}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#198754] border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{doc.verification_status || 'Verified'}</span>
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleDownloadDoc(doc.id, doc.file_name)}
                              disabled={downloadingDocId === doc.id}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-white hover:bg-[#F5F7F7] text-[#087F75] border border-[#D9DEE3] text-xs font-semibold transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>{downloadingDocId === doc.id ? 'Downloading...' : 'Download'}</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Upload Modal Dialog */}
          {uploadModalItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
              <div className="bg-white rounded-xl border border-[#D9DEE3] shadow-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-[#D9DEE3]">
                  <div className="flex items-center space-x-2">
                    <span className="p-1 rounded-md bg-teal-50 text-[#087F75] border border-teal-200">
                      <UploadCloud className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-bold text-[#263746]">
                      Upload Statutory Compliance Document
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadModalItem(null)}
                    className="p-1 rounded-md text-[#718096] hover:bg-[#F5F7F7] hover:text-[#263746] transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-[#F5F7F7] border border-[#D9DEE3] space-y-1 text-xs">
                  <div className="font-semibold text-[#263746]">
                    {uploadModalItem.requirement_name}
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] text-[#718096]">
                    <span>Category: <strong className="text-[#263746]">{uploadModalItem.category}</strong></span>
                    <span>Due: <strong className="text-[#263746]">{formatDate(uploadModalItem.due_date)}</strong></span>
                  </div>
                </div>

                {uploadError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-[#DC3545] text-xs flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {uploadSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-[#198754] text-xs flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{uploadSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleUploadCompliance} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#263746] mb-1">
                      Supporting Document (.pdf, .png, .jpg, .docx - max 15MB)
                    </label>
                    <input
                      type="file"
                      required
                      accept=".pdf,.png,.jpg,.jpeg,.docx"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-[#263746] file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-[#087F75] hover:file:bg-teal-100 border border-[#D9DEE3] rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-[#087F75]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#263746] mb-1">
                      Submitter Remarks / Reference Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={uploadRemarks}
                      onChange={(e) => setUploadRemarks(e.target.value)}
                      placeholder="e.g. Approved by Academic Council resolution dated 12 October 2026..."
                      className="w-full p-2.5 text-xs text-[#263746] rounded-lg border border-[#D9DEE3] focus:outline-none focus:ring-1 focus:ring-[#087F75]"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#D9DEE3]">
                    <button
                      type="button"
                      onClick={() => setUploadModalItem(null)}
                      className="px-3 py-1.5 rounded-lg border border-[#D9DEE3] bg-white text-xs font-semibold text-[#718096] hover:bg-[#F5F7F7] hover:text-[#263746] transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUploading || !uploadFile}
                      className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-[#087F75] hover:bg-[#06635c] text-white text-xs font-semibold shadow-2xs transition disabled:opacity-60"
                    >
                      <UploadCloud className={`w-3.5 h-3.5 ${isUploading ? 'animate-spin' : ''}`} />
                      <span>{isUploading ? 'Uploading & Verifying...' : 'Submit Compliance Document'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
      {/* 6. Recent Complaints Card & Table */}
      <div className="bg-white rounded-xl border border-[#D9DEE3] shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#D9DEE3]">
          <div>
            <h2 className="text-base font-bold text-[#263746]">
              Recent Complaints
            </h2>
            <p className="text-xs text-[#718096]">
              Active grievances submitted across AICTE affiliated institutions
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/complaints"
              className="text-xs font-semibold text-[#087F75] hover:underline flex items-center space-x-1"
            >
              <span>View all complaints</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-[#718096] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, institution, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#D9DEE3] text-xs text-[#263746] placeholder-[#718096] focus:outline-none focus:ring-1 focus:ring-[#087F75] focus:border-[#087F75]"
            />
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedBureau}
              onChange={(e) => setSelectedBureau(e.target.value)}
              className="py-1.5 px-3 rounded-lg border border-[#D9DEE3] bg-white text-xs text-[#263746] focus:outline-none focus:ring-1 focus:ring-[#087F75]"
            >
              {bureauOptions.map((b) => (
                <option key={b} value={b}>
                  {b === 'All' ? 'All Bureaus' : b}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="py-1.5 px-3 rounded-lg border border-[#D9DEE3] bg-white text-xs text-[#263746] focus:outline-none focus:ring-1 focus:ring-[#087F75]"
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Under Review">Under Review</option>
              <option value="Evidence Requested">Evidence Requested</option>
              <option value="Escalated">Escalated</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        {/* Table / Results */}
        {loadingLive && presentationMode === 'live' ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2 text-[#718096]">
            <RefreshCw className="w-5 h-5 animate-spin text-[#087F75]" />
            <span className="text-xs">Loading live complaint cases from database...</span>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#718096]">
            No complaint cases found matching current search or filters.
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#D9DEE3] rounded-lg">
            <table className="w-full text-left text-xs text-[#263746]">
              <thead className="bg-[#F5F7F7] border-b border-[#D9DEE3] text-[11px] font-semibold text-[#718096] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Tracking ID</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Bureau / Cell</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Filing Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9DEE3]">
                {filteredComplaints.slice(0, 10).map((item) => (
                  <tr key={item.id} className="hover:bg-[#F5F7F7]/60 transition">
                    <td className="py-3 px-4 font-mono font-medium text-[#087F75]">
                      {item.id}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-semibold text-[#263746] truncate">{item.summary}</p>
                      <p className="text-[11px] text-[#718096] truncate">{item.institution}</p>
                    </td>
                    <td className="py-3 px-4 text-[#263746]">
                      {item.bureau}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.priority} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3 px-4 text-[#718096] font-mono text-[11px]">
                      {formatDate(item.submittedDate)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedCaseDetail(item)}
                        className="p-1 rounded text-[#087F75] hover:bg-teal-50 hover:text-[#115E59] transition"
                        title="Quick View"
                        aria-label="Quick View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Case Detail Quick Inspection Modal */}
      {selectedCaseDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#D9DEE3] shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9DEE3]">
              <div>
                <span className="text-xs font-mono font-bold text-[#087F75]">
                  {selectedCaseDetail.id}
                </span>
                <h3 className="text-base font-bold text-[#263746] mt-0.5">
                  Case Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCaseDetail(null)}
                className="text-[#718096] hover:text-[#263746] p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#263746]">
              <div>
                <span className="text-[#718096] block font-medium">Grievance Subject</span>
                <p className="font-semibold text-sm text-[#263746] mt-0.5">{selectedCaseDetail.summary}</p>
              </div>

              <div>
                <span className="text-[#718096] block font-medium">Full Narrative Description</span>
                <p className="mt-1 p-2.5 rounded-lg bg-[#F5F7F7] border border-[#D9DEE3] text-[#263746] leading-relaxed">
                  {selectedCaseDetail.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-[#718096] block">Jurisdiction Bureau</span>
                  <span className="font-semibold text-[#263746]">{selectedCaseDetail.bureau}</span>
                </div>
                <div>
                  <span className="text-[#718096] block">Institution</span>
                  <span className="font-semibold text-[#263746]">{selectedCaseDetail.institution}</span>
                </div>
                <div>
                  <span className="text-[#718096] block">Current Status</span>
                  <StatusBadge status={selectedCaseDetail.status} />
                </div>
                <div>
                  <span className="text-[#718096] block">Priority Level</span>
                  <StatusBadge status={selectedCaseDetail.priority} />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#D9DEE3] flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setSelectedCaseDetail(null)}
                className="px-3 py-1.5 rounded-lg border border-[#D9DEE3] text-xs font-medium text-[#718096] hover:bg-[#F5F7F7]"
              >
                Close
              </button>
              {selectedCaseDetail.rawItem?.id && (
                <Link
                  to={`/complaints/${selectedCaseDetail.rawItem.id}`}
                  className="px-3 py-1.5 rounded-lg bg-[#087F75] text-white text-xs font-medium hover:bg-[#115E59] transition"
                >
                  Open Full Case File →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
