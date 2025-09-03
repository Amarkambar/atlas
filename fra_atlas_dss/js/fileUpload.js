// File Upload Handler
class FileUploadHandler {
  constructor(dropZoneId, fileInputId, progressId) {
    this.dropZone = document.getElementById(dropZoneId);
    this.fileInput = document.getElementById(fileInputId);
    this.progressContainer = document.getElementById(progressId);
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Drop zone click
    this.dropZone.addEventListener('click', () => {
      this.fileInput.click();
    });

    // File input change
    this.fileInput.addEventListener('change', (e) => {
      this.handleFiles(e.target.files);
    });

    // Drag and drop events
    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('border-primary', 'bg-primary-50');
    });

    this.dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('border-primary', 'bg-primary-50');
    });

    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('border-primary', 'bg-primary-50');
      this.handleFiles(e.dataTransfer.files);
    });
  }

  async handleFiles(files) {
    const validFiles = this.validateFiles(files);
    
    if (validFiles.length === 0) {
      this.showError('No valid files selected');
      return;
    }

    await this.uploadFiles(validFiles);
  }

  validateFiles(files) {
    const validFiles = [];
    const errors = [];

    Array.from(files).forEach(file => {
      // Check file size
      if (file.size > this.maxFileSize) {
        errors.push(`${file.name}: File too large (max 10MB)`);
        return;
      }

      // Check file type
      if (!this.allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      this.showError(errors.join('\n'));
    }

    return validFiles;
  }

  async uploadFiles(files) {
    try {
      // Get claim ID from current context
      const claimId = this.getCurrentClaimId();
      if (!claimId) {
        this.showError('No claim selected for document upload');
        return;
      }

      // Show progress
      this.showProgress(true);

      // Upload files
      const response = await window.api.uploadDocuments(claimId, files, 'general');
      
      this.showProgress(false);
      this.showSuccess(`${files.length} file(s) uploaded successfully`);
      
      // Refresh documents list
      await this.refreshDocumentsList(claimId);
      
    } catch (error) {
      this.showProgress(false);
      this.showError(error.message || 'Upload failed');
    }
  }

  getCurrentClaimId() {
    // Try to get claim ID from URL params or data attributes
    const urlParams = new URLSearchParams(window.location.search);
    const claimId = urlParams.get('claimId') || 
                   document.querySelector('[data-claim-id]')?.dataset.claimId ||
                   'claim-001'; // Fallback for demo
    
    return claimId;
  }

  async refreshDocumentsList(claimId) {
    try {
      const response = await window.api.getClaimDocuments(claimId);
      this.updateDocumentsList(response.documents);
    } catch (error) {
      console.error('Failed to refresh documents list:', error);
    }
  }

  updateDocumentsList(documents) {
    const container = document.querySelector('[data-documents-list]');
    if (!container) return;

    container.innerHTML = documents.map(doc => `
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-${this.getDocumentTypeColor(doc.document_type)}-100 rounded flex items-center justify-center">
            <svg class="w-4 h-4 text-${this.getDocumentTypeColor(doc.document_type)}" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h8c1.1 0 2-.9 2-2V8l-6-6z"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-text-primary">${doc.file_name}</p>
            <p class="text-xs text-text-secondary">${this.formatFileSize(doc.file_size)} • ${this.formatDate(doc.uploaded_at)}</p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          ${doc.verified ? 
            '<span class="status-success">Verified</span>' : 
            '<span class="status-warning">Pending</span>'
          }
          <button class="p-1 rounded hover:bg-gray-200 transition-colors" onclick="fileUpload.deleteDocument('${doc.id}')">
            <svg class="w-4 h-4 text-text-secondary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </div>
    `).join('');
  }

  async deleteDocument(documentId) {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await window.api.deleteDocument(documentId);
      this.showSuccess('Document deleted successfully');
      
      // Refresh documents list
      const claimId = this.getCurrentClaimId();
      await this.refreshDocumentsList(claimId);
    } catch (error) {
      this.showError(error.message || 'Failed to delete document');
    }
  }

  showProgress(show) {
    if (this.progressContainer) {
      this.progressContainer.classList.toggle('hidden', !show);
    }
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 bg-${type === 'error' ? 'error' : 'success'}-50 border border-${type === 'error' ? 'error' : 'success'}-200 text-${type === 'error' ? 'error' : 'success'} px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  // Utility methods
  getDocumentTypeColor(type) {
    const colorMap = {
      'identity': 'blue',
      'land': 'green',
      'survey': 'purple',
      'general': 'gray'
    };
    return colorMap[type] || 'gray';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
}

// Initialize file upload handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('dropZone')) {
    window.fileUpload = new FileUploadHandler('dropZone', 'fileInput', 'uploadProgress');
  }
});