import apiClient from './api';

export const complianceService = {
  /**
   * Fetch institutional compliance summary metrics (4 core stats).
   */
  getComplianceSummary: async () => {
    const response = await apiClient.get('/institute/compliance/summary');
    return response.data;
  },

  /**
   * Fetch statutory compliance deadlines for the authenticated institution.
   * @param {string} filterType - 'all', 'pending', 'completed', 'overdue', 'upcoming'
   */
  getComplianceDeadlines: async (filterType = 'all') => {
    const response = await apiClient.get('/institute/compliance/deadlines', {
      params: { filter_type: filterType },
    });
    return response.data;
  },

  /**
   * Upload an official compliance document against an assigned requirement.
   * @param {number|string} complianceId
   * @param {FormData} formData - Contains 'file' and optional 'remarks'
   */
  uploadComplianceDocument: async (complianceId, formData) => {
    const response = await apiClient.post(`/institute/compliance/${complianceId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Fetch submission history and audit trail of uploaded compliance documents.
   */
  getComplianceHistory: async () => {
    const response = await apiClient.get('/institute/compliance/history');
    return response.data;
  },

  /**
   * Fetch complaint status notifications and reminders for the authenticated institution.
   * Scenarios: Resolved, Transferred, Under Review, Additional Information Required.
   * @param {boolean} unreadOnly
   */
  getInstituteReminders: async (unreadOnly = false) => {
    const response = await apiClient.get('/institute/reminders', {
      params: { unread_only: unreadOnly },
    });
    return response.data;
  },

  /**
   * Mark a specific institute reminder/notification as read.
   * @param {number|string} reminderId
   */
  markReminderRead: async (reminderId) => {
    const response = await apiClient.patch(`/institute/reminders/${reminderId}/read`);
    return response.data;
  },

  /**
   * Mark all unread notifications as read for this institution.
   */
  markAllRemindersRead: async () => {
    const response = await apiClient.post('/institute/reminders/mark-all-read');
    return response.data;
  },

  /**
   * Helper to get full download URL for an uploaded compliance document.
   */
  getDocumentDownloadUrl: (documentId) => {
    const base = apiClient.defaults.baseURL || '/api/v1';
    return `${base}/institute/compliance/documents/${documentId}/download`;
  },

  /**
   * Securely download compliance document using authenticated apiClient and trigger browser download.
   */
  downloadDocument: async (documentId, fileName) => {
    const response = await apiClient.get(`/institute/compliance/documents/${documentId}/download`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'application/octet-stream',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName || `compliance-doc-${documentId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default complianceService;
