import apiClient from './api';

export const recurrenceService = {
  getOverview: async (params = {}) => {
    const response = await apiClient.get('/recurrence/overview', { params });
    return response.data;
  },

  getInstitutionRecurrence: async (institutionId) => {
    const response = await apiClient.get(`/recurrence/institution/${institutionId}`);
    return response.data;
  },
};

export default recurrenceService;

