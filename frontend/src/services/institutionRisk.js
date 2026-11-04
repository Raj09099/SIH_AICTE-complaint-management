import api from './api';

export const institutionRiskService = {
  /**
   * Fetch council-wide or campus-scoped institution risk analysis telemetry.
   */
  async getOverview(params = {}) {
    const response = await api.get('/institution-risk/overview', { params });
    return response.data;
  },

  /**
   * Fetch risk surveillance list of institutions with query filters.
   */
  async getInstitutions(params = {}) {
    const response = await api.get('/institution-risk/institutions', { params });
    return response.data;
  },

  /**
   * Fetch deep-dive risk profile and 5-factor scoring breakdown for a specific institution.
   */
  async getInstitutionDetail(institutionId) {
    const response = await api.get(`/institution-risk/institutions/${institutionId}`);
    return response.data;
  },
};

export default institutionRiskService;

