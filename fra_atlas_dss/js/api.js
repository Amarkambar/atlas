// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Storage for auth token
let authToken = localStorage.getItem('authToken');

// API Client class
class APIClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Set authentication token
  setToken(token) {
    authToken = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  // Get authentication headers
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    return headers;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Authentication methods
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    this.setToken(data.token);
    return data;
  }

  async register(userData) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    
    this.setToken(data.token);
    return data;
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  async updateProfile(profileData) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  // Claims methods
  async getClaims(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/claims${queryParams ? `?${queryParams}` : ''}`);
  }

  async getClaim(claimId) {
    return this.request(`/claims/${claimId}`);
  }

  async createClaim(claimData) {
    return this.request('/claims', {
      method: 'POST',
      body: JSON.stringify(claimData)
    });
  }

  async updateClaimStatus(claimId, statusData) {
    return this.request(`/claims/${claimId}/status`, {
      method: 'PUT',
      body: JSON.stringify(statusData)
    });
  }

  // Documents methods
  async uploadDocuments(claimId, files, documentType) {
    const formData = new FormData();
    formData.append('claimId', claimId);
    formData.append('documentType', documentType);
    
    for (let i = 0; i < files.length; i++) {
      formData.append('documents', files[i]);
    }

    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${this.baseURL}/documents/upload`, {
      method: 'POST',
      headers,
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    return data;
  }

  async getClaimDocuments(claimId) {
    return this.request(`/documents/claim/${claimId}`);
  }

  async deleteDocument(documentId) {
    return this.request(`/documents/${documentId}`, {
      method: 'DELETE'
    });
  }

  // Analytics methods
  async getDashboardAnalytics() {
    return this.request('/analytics/dashboard');
  }

  async getSystemAlerts() {
    return this.request('/analytics/alerts');
  }

  async resolveAlert(alertId) {
    return this.request(`/analytics/alerts/${alertId}/resolve`, {
      method: 'PUT'
    });
  }

  // Community methods
  async submitFeedback(feedbackData) {
    return this.request('/community/feedback', {
      method: 'POST',
      body: JSON.stringify(feedbackData)
    });
  }

  async getFeedback() {
    return this.request('/community/feedback');
  }

  async getNotifications() {
    return this.request('/community/notifications');
  }

  // Utility methods
  logout() {
    this.setToken(null);
    window.location.href = '/pages/login.html';
  }

  isAuthenticated() {
    return !!authToken;
  }
}

// Create global API client instance
window.api = new APIClient();

// Auto-redirect to login if not authenticated (except on login/register pages)
document.addEventListener('DOMContentLoaded', () => {
  const currentPage = window.location.pathname;
  const publicPages = ['/pages/login.html', '/pages/register.html', '/index.html', '/'];
  
  if (!window.api.isAuthenticated() && !publicPages.includes(currentPage)) {
    window.location.href = '/pages/login.html';
  }
});