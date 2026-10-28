import apiClient from './api';

export const analyticsService = {
  getSummary: async () => {
    const response = await apiClient.get('/analytics/summary');
    return response.data;
  },

  getBureauBreakdown: async () => {
    const response = await apiClient.get('/analytics/bureau-breakdown');
    return response.data;
  },
};

export default analyticsService;
