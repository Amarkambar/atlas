// Dashboard functionality
class Dashboard {
  constructor() {
    this.charts = {};
    this.refreshInterval = null;
    this.init();
  }

  async init() {
    await this.loadUserProfile();
    await this.loadDashboardData();
    this.setupEventListeners();
    this.startAutoRefresh();
  }

  async loadUserProfile() {
    try {
      const response = await window.api.getProfile();
      this.updateUserProfile(response.user);
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  }

  updateUserProfile(user) {
    // Update user name in sidebar
    const userNameElements = document.querySelectorAll('[data-user-name]');
    userNameElements.forEach(element => {
      element.textContent = user.full_name;
    });

    // Update user role
    const userRoleElements = document.querySelectorAll('[data-user-role]');
    userRoleElements.forEach(element => {
      element.textContent = user.role === 'citizen' ? 'Community Member' : 
                           user.role === 'officer' ? 'Forest Officer' : 'Administrator';
    });
  }

  async loadDashboardData() {
    try {
      // Load different data based on current page
      const currentPage = window.location.pathname;

      if (currentPage.includes('ai_insights_dashboard')) {
        await this.loadAnalytics();
      } else if (currentPage.includes('community_input_portal')) {
        await this.loadCommunityData();
      } else if (currentPage.includes('claims_management_dashboard')) {
        await this.loadClaimsData();
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      this.showError('Failed to load dashboard data');
    }
  }

  async loadAnalytics() {
    try {
      const analytics = await window.api.getDashboardAnalytics();
      this.updateKPIs(analytics.kpis);
      this.updateCharts(analytics.trends, analytics.predictions);
      
      const alerts = await window.api.getSystemAlerts();
      this.updateAlerts(alerts.alerts);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  }

  async loadCommunityData() {
    try {
      // Load user's claims
      const claimsResponse = await window.api.getClaims();
      this.updateClaimStatus(claimsResponse.claims[0]); // Show first claim

      // Load notifications
      const notifications = await window.api.getNotifications();
      this.updateNotifications(notifications.notifications);

      // Load feedback history
      const feedback = await window.api.getFeedback();
      this.updateFeedbackHistory(feedback.feedback);
    } catch (error) {
      console.error('Failed to load community data:', error);
    }
  }

  async loadClaimsData() {
    try {
      const claimsResponse = await window.api.getClaims();
      this.updateClaimsTable(claimsResponse.claims);
      
      const analytics = await window.api.getDashboardAnalytics();
      this.updateKPIs(analytics.kpis);
    } catch (error) {
      console.error('Failed to load claims data:', error);
    }
  }

  updateKPIs(kpis) {
    // Update KPI cards
    const kpiElements = {
      totalClaims: document.querySelector('[data-kpi="total-claims"]'),
      approvalRate: document.querySelector('[data-kpi="approval-rate"]'),
      avgProcessingTime: document.querySelector('[data-kpi="processing-time"]'),
      riskScore: document.querySelector('[data-kpi="risk-score"]')
    };

    if (kpiElements.totalClaims) {
      kpiElements.totalClaims.textContent = kpis.totalClaims.toLocaleString();
    }
    if (kpiElements.approvalRate) {
      kpiElements.approvalRate.textContent = `${kpis.approvalRate}%`;
    }
    if (kpiElements.avgProcessingTime) {
      kpiElements.avgProcessingTime.textContent = `${kpis.avgProcessingTime} days`;
    }
    if (kpiElements.riskScore) {
      kpiElements.riskScore.textContent = `${kpis.riskScore}/10`;
    }
  }

  updateClaimStatus(claim) {
    if (!claim) return;

    const statusElements = {
      claimId: document.querySelector('[data-claim="id"]'),
      status: document.querySelector('[data-claim="status"]'),
      progress: document.querySelector('[data-claim="progress"]'),
      progressBar: document.querySelector('[data-claim="progress-bar"]')
    };

    if (statusElements.claimId) {
      statusElements.claimId.textContent = claim.claim_number;
    }
    
    if (statusElements.status) {
      statusElements.status.textContent = this.formatStatus(claim.status);
      statusElements.status.className = `status-${this.getStatusClass(claim.status)}`;
    }

    // Calculate progress percentage
    const progress = this.calculateProgress(claim.status);
    if (statusElements.progress) {
      statusElements.progress.textContent = `${progress}%`;
    }
    if (statusElements.progressBar) {
      statusElements.progressBar.style.width = `${progress}%`;
    }
  }

  updateNotifications(notifications) {
    const container = document.querySelector('[data-notifications]');
    if (!container || !notifications) return;

    container.innerHTML = notifications.slice(0, 5).map(notification => `
      <div class="flex items-start space-x-3">
        <div class="w-2 h-2 bg-${this.getNotificationColor(notification.type)} rounded-full mt-2 flex-shrink-0"></div>
        <div>
          <p class="text-sm text-text-primary">${notification.message}</p>
          <p class="text-xs text-text-secondary">${this.formatDate(notification.timestamp)}</p>
        </div>
      </div>
    `).join('');
  }

  updateAlerts(alerts) {
    const container = document.querySelector('[data-alerts]');
    if (!container || !alerts) return;

    container.innerHTML = alerts.map(alert => `
      <div class="flex items-start space-x-4 p-4 border border-${alert.severity === 'high' ? 'error' : alert.severity === 'medium' ? 'warning' : 'primary'}-200 bg-${alert.severity === 'high' ? 'error' : alert.severity === 'medium' ? 'warning' : 'primary'}-50 rounded-lg">
        <div class="w-8 h-8 bg-${alert.severity === 'high' ? 'error' : alert.severity === 'medium' ? 'warning' : 'primary'} rounded-lg flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
          </svg>
        </div>
        <div class="flex-1">
          <h4 class="text-sm font-medium text-text-primary">${alert.title}</h4>
          <p class="text-sm text-text-secondary mt-1">${alert.description}</p>
          <div class="flex items-center space-x-4 mt-2">
            <span class="text-xs text-${alert.severity === 'high' ? 'error' : alert.severity === 'medium' ? 'warning' : 'primary'} font-medium">Severity: ${alert.severity.toUpperCase()}</span>
            <button class="text-xs text-primary hover:underline" onclick="dashboard.resolveAlert('${alert.id}')">Resolve</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  async resolveAlert(alertId) {
    try {
      await window.api.resolveAlert(alertId);
      await this.loadAnalytics(); // Refresh alerts
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      this.showError('Failed to resolve alert');
    }
  }

  setupEventListeners() {
    // Logout functionality
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="logout"]')) {
        e.preventDefault();
        this.logout();
      }
    });

    // Refresh data
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="refresh"]')) {
        e.preventDefault();
        this.loadDashboardData();
      }
    });
  }

  startAutoRefresh() {
    // Refresh data every 5 minutes
    this.refreshInterval = setInterval(() => {
      this.loadDashboardData();
    }, 5 * 60 * 1000);
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  logout() {
    this.stopAutoRefresh();
    window.api.logout();
  }

  // Utility methods
  formatStatus(status) {
    const statusMap = {
      'submitted': 'Submitted',
      'under_review': 'Under Review',
      'approved': 'Approved',
      'rejected': 'Rejected',
      'pending_documents': 'Pending Documents'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status) {
    const classMap = {
      'submitted': 'warning',
      'under_review': 'warning',
      'approved': 'success',
      'rejected': 'error',
      'pending_documents': 'warning'
    };
    return classMap[status] || 'warning';
  }

  calculateProgress(status) {
    const progressMap = {
      'submitted': 25,
      'under_review': 65,
      'approved': 100,
      'rejected': 100,
      'pending_documents': 45
    };
    return progressMap[status] || 0;
  }

  getNotificationColor(type) {
    const colorMap = {
      'claim_update': 'primary',
      'feedback_response': 'success',
      'document_request': 'warning',
      'system_alert': 'error'
    };
    return colorMap[type] || 'primary';
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  }

  showError(message) {
    // Create or update error notification
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-error-50 border border-error-200 text-error px-4 py-3 rounded-lg shadow-lg z-50';
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  showSuccess(message) {
    // Create or update success notification
    const successDiv = document.createElement('div');
    successDiv.className = 'fixed top-4 right-4 bg-success-50 border border-success-200 text-success px-4 py-3 rounded-lg shadow-lg z-50';
    successDiv.textContent = message;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
      successDiv.remove();
    }, 5000);
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new Dashboard();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.dashboard) {
    window.dashboard.stopAutoRefresh();
  }
});