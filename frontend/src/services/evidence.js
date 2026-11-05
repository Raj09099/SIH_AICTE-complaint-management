import apiClient from './api';

export const evidenceService = {
  /**
   * Upload an evidence document (PDF, DOCX, TXT) and trigger PyMuPDF parsing & relevance analysis.
   */
  uploadAndVerify: async (file, complaintId, officerNotes = '') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('complaint_id', complaintId);
    if (officerNotes) {
      formData.append('officer_notes', officerNotes);
    }

    const response = await apiClient.post('/evidence/upload-and-verify', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Retrieve all evidence verification dossiers for a specific complaint.
   */
  getByComplaint: async (complaintId) => {
    const response = await apiClient.get(`/evidence/complaint/${complaintId}`);
    return response.data;
  },

  /**
   * Retrieve single evidence verification dossier.
   */
  getDetail: async (evidenceId) => {
    const response = await apiClient.get(`/evidence/${evidenceId}`);
    return response.data;
  },

  /**
   * Submit official human review determination.
   */
  submitReview: async (evidenceId, reviewData) => {
    const response = await apiClient.post(`/evidence/${evidenceId}/review`, reviewData);
    return response.data;
  },

  /**
   * Retrieve candidate complaints available for evidence checking.
   */
  getCandidates: async (params = {}) => {
    const response = await apiClient.get('/evidence/candidates', { params });
    return response.data;
  },

  /**
   * Return document download URL.
   */
  getDownloadUrl: (evidenceId) => {
    const baseUrl = apiClient.defaults.baseURL || '/api/v1';
    return `${baseUrl}/evidence/document/${evidenceId}/download`;
  },
};

export default evidenceService;

