import apiClient from './api';

export const institutionService = {
  getInstitutions: async (params = {}) => {
    const response = await apiClient.get('/institutions', { params });
    return response.data;
  },

  getInstitutionById: async (id) => {
    const response = await apiClient.get(`/institutions/${id}`);
    return response.data;
  },
};

export default institutionService;
