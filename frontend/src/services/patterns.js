import apiClient from './api';

/**
 * Service for Feature 2: Multi-Institution Problem Pattern Detector.
 */
export const patternService = {
  /**
   * Fetches problem patterns discovered across institutions with optional filtering.
   * @param {Object} params - Query parameters (threshold, min_institutions, category, bureau, limit)
   */
  getPatterns: async (params = {}) => {
    const response = await apiClient.get('/patterns', { params });
    return response.data;
  },

  /**
   * Triggers an on-demand clustering pipeline run with custom parameters.
   * Requires officer role ('admin', 'bureau_head', 'officer').
   * @param {Object} payload - Discovery configuration
   */
  runClustering: async (payload = {}) => {
    const response = await apiClient.post('/patterns/run-clustering', payload);
    return response.data;
  },

  /**
   * Fetches single problem pattern details by pattern code.
   * @param {string} patternCode - Pattern code (e.g., PAT-001)
   * @param {Object} params - Optional query params (threshold, min_institutions)
   */
  getPatternByCode: async (patternCode, params = {}) => {
    const response = await apiClient.get(`/patterns/${encodeURIComponent(patternCode)}`, { params });
    return response.data;
  },
};

export default patternService;

