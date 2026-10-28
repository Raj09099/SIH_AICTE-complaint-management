import apiClient from './api';

export const authService = {
  /**
   * Authenticate officer with email and password.
   * Returns { access_token, token_type, user }
   */
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', {
      email: email.trim(),
      password,
    });
    return response.data;
  },

  /**
   * Fetch current authenticated officer profile.
   */
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

export default authService;

