import apiClient from './api';

export const notificationService = {
  getNotifications: async (params = {}) => {
    const response = await apiClient.get('/notifications', { params });
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data;
  },

  markAsRead: async (id) => {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await apiClient.post('/notifications/mark-all-read');
    return response.data;
  },

  getDeadlines: async () => {
    const response = await apiClient.get('/notifications/deadlines');
    return response.data;
  },

  triggerCheck: async () => {
    const response = await apiClient.post('/notifications/check');
    return response.data;
  },
};

export default notificationService;
