import apiClient from './api';

export const priorityService = {
  getDashboard: async (params = {}) => {
    const response = await apiClient.get('/priority/dashboard', { params });
    return response.data;
  },

  getComplaintPriority: async (complaintId) => {
    const response = await apiClient.get(`/priority/complaints/${complaintId}`);
    return response.data;
  },

  acceptRecommendation: async (complaintId, justification = null) => {
    const response = await apiClient.post(`/priority/complaints/${complaintId}/accept`, {
      justification,
    });
    return response.data;
  },

  overrideRecommendation: async (complaintId, newPriority, justification = null) => {
    const response = await apiClient.post(`/priority/complaints/${complaintId}/override`, {
      new_priority: newPriority,
      justification,
    });
    return response.data;
  },

  getPriorityHistory: async (complaintId) => {
    const response = await apiClient.get(`/priority/complaints/${complaintId}/history`);
    return response.data;
  },
};

export default priorityService;

