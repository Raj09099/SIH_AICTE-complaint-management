import apiClient from './api';

export const overlapService = {
  detectOverlaps: async (data = {}) => {
    const response = await apiClient.post('/overlap/detect', data);
    return response.data;
  },

  getFlaggedOverlaps: async (params = {}) => {
    const response = await apiClient.get('/overlap/flagged', { params });
    return response.data;
  },

  getOverlaps: async (params = {}) => {
    const response = await apiClient.get('/overlap', { params });
    return response.data;
  },

  getOverlapById: async (id) => {
    const response = await apiClient.get(`/overlap/${id}`);
    return response.data;
  },

  reviewOverlap: async (id, reviewData) => {
    const response = await apiClient.patch(`/overlap/${id}/review`, reviewData);
    return response.data;
  },
};

export default overlapService;

