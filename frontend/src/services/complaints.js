import apiClient from './api';

export const complaintService = {
  getComplaints: async (params = {}) => {
    const response = await apiClient.get('/complaints', { params });
    return response.data;
  },

  getComplaintById: async (id) => {
    const response = await apiClient.get(`/complaints/${id}`);
    return response.data;
  },

  createComplaint: async (complaintData) => {
    const response = await apiClient.post('/complaints', complaintData);
    return response.data;
  },

  updateStatus: async (id, statusData) => {
    const response = await apiClient.patch(`/complaints/${id}/status`, statusData);
    return response.data;
  },

  uploadAttachments: async (complaintId, formData) => {
    const response = await apiClient.post(`/complaints/${complaintId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getAttachments: async (complaintId) => {
    const response = await apiClient.get(`/complaints/${complaintId}/attachments`);
    return response.data;
  },
};

export default complaintService;
