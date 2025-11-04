import axios from 'axios';

// Detect if running in development or production
const BASE_URL =
  process.env.NODE_ENV === "development" ? "http://localhost:5000/api" : "/api";

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// Request interceptor to add auth token if available
api.interceptors.request.use(
  (config) => {
    // Try to get admin token first, then voter token
    const adminToken = localStorage.getItem('adminToken');
    const voterToken = localStorage.getItem('authToken');
    
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    } else if (voterToken) {
      config.headers.Authorization = `Bearer ${voterToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear authentication data on 401
      localStorage.removeItem('authToken');
      localStorage.removeItem('voterData');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
      localStorage.removeItem('isAdminAuthenticated');
      
      // Redirect to appropriate login based on current path
      const currentPath = window.location.pathname;
      if (currentPath.includes('/admin')) {
        window.location.href = '/admin/login';
      } else if (!currentPath.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    // Enhanced error logging
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    });
    
    return Promise.reject(error);
  }
);

// Voter API functions
export const voterAPI = {
  // ============ AUTHENTICATION ENDPOINTS ============
  
  // Verify voter credentials
  verifyCredentials: async (credentials) => {
    console.log('Verifying credentials:', { 
      voter_id: credentials.voter_id, 
      password: '***' // Don't log actual password
    });
    const response = await api.post('/auth/login', credentials);
    console.log('Login response:', response.data);
    return response.data;
  },

  // Verify face for login
  verifyFace: async (faceData) => {
    console.log('Verifying face for voter:', faceData.voter_id);
    const response = await api.post('/auth/verify-face', faceData);
    console.log('Face verification response:', response.data);
    return response.data;
  },

  // Logout user
  logout: async () => {
    const response = await api.post('/auth/logout');
    // Clear local storage on logout
    localStorage.removeItem('authToken');
    localStorage.removeItem('voterData');
    localStorage.removeItem('isAuthenticated');
    return response.data;
  },

  // Check authentication status
  checkAuth: async () => {
    const response = await api.get('/auth/check-auth');
    return response.data;
  },

  // Get protected data (example)
  getProtectedData: async () => {
    const response = await api.get('/auth/protected');
    return response.data;
  },

  // Verify token validity
  verifyToken: async () => {
    const response = await api.get('/auth/verify-token');
    return response.data;
  },

  // ============ REGISTRATION ENDPOINTS ============

  // Register new voter
  register: async (voterData) => {
    console.log('Sending registration data:', voterData);
    const response = await api.post('/auth/register', voterData);
    console.log('Registration response:', response.data);
    return response.data;
  },

  // Complete registration
  completeRegistration: async (voterId) => {
    console.log('Completing registration for voter:', voterId);
    const response = await api.post(`/auth/complete-registration/${voterId}`);
    console.log('Complete registration response:', response.data);
    return response.data;
  },

  // Register face
  registerFace: async (faceData) => {
    console.log('Registering face for voter:', faceData.voter_id);
    const response = await api.post(`/auth/register-face/${faceData.voter_id}`, {
      image_data: faceData.image_data
    });
    console.log('Face registration response:', response.data);
    return response.data;
  },

  // Check voter status
  checkVoter: async (voterId) => {
    const response = await api.get(`/auth/check-voter/${voterId}`);
    return response.data;
  },

  // ============ OTP ENDPOINTS ============

  // Send OTP
  sendOTP: async (otpData) => {
    const response = await api.post('/auth/send-otp', otpData);
    return response.data;
  },

  // Verify OTP
  verifyOTP: async (otpData) => {
    const response = await api.post('/auth/verify-otp', otpData);
    return response.data;
  },

  // ============ CONTACT VERIFICATION ENDPOINTS ============

  // Send verification OTP
  sendVerificationOTP: async (voterId, data) => {
    console.log(`Sending verification OTP for voter: ${voterId}, type: ${data.type}`);
    const response = await api.post(`/auth/send-verification-otp/${voterId}`, data);
    return response.data;
  },

  // Verify contact
  verifyContact: async (voterId, data) => {
    console.log(`Verifying contact for voter: ${voterId}, type: ${data.type}`);
    const response = await api.post(`/auth/verify-contact/${voterId}`, data);
    return response.data;
  },

  // ============ DOCUMENT UPLOAD ENDPOINTS ============

  // Upload ID document
  uploadID: async (formData) => {
    const response = await api.post('/auth/upload-id', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // ============ VOTER PROFILE ENDPOINTS ============

  // Get voter profile by ID
  getProfileById: async (voterId) => {
    const response = await api.get(`/auth/voter/${voterId}/profile`);
    return response.data;
  },

  // Update voter profile
  updateVoterProfile: async (voterId, updateData) => {
    const response = await api.put(`/auth/voter/${voterId}/profile`, updateData);
    return response.data;
  },

  // Change password
  changePassword: async (voterId, passwordData) => {
    const response = await api.post(`/auth/voter/${voterId}/change-password`, passwordData);
    return response.data;
  },

  // ============ DASHBOARD ENDPOINTS ============

  // Get dashboard data
  getDashboardData: async () => {
    try {
      const response = await api.get('/dashboard/data');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch dashboard data' };
    }
  },

  // Get user profile
  getProfile: async () => {
    try {
      const response = await api.get('/dashboard/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch profile' };
    }
  },

  // Get voting history
  getVotingHistory: async () => {
    try {
      const response = await api.get('/dashboard/voting-history');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch voting history' };
    }
  },

  // Get analytics data
  getAnalytics: async () => {
    try {
      const response = await api.get('/dashboard/analytics');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch analytics' };
    }
  },

  // Get elections with filtering
  getElections: async (type = 'all', status = 'all') => {
    try {
      const response = await api.get(`/dashboard/elections?type=${type}&status=${status}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch elections' };
    }
  },

  // Get notifications
  getNotifications: async (limit = 10) => {
    try {
      const response = await api.get(`/dashboard/notifications?limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch notifications' };
    }
  },

  // Update profile
  updateProfile: async (profileData) => {
    try {
      const response = await api.put('/dashboard/profile', profileData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update profile' };
    }
  },

  // ============ NEW DASHBOARD FUNCTIONALITY ============

  // Get digital ID
  getDigitalID: async () => {
    try {
      const response = await api.get('/dashboard/digital-id');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch digital ID' };
    }
  },

  // Export data
  exportData: async (format = 'json') => {
    try {
      const response = await api.get(`/dashboard/export-data?format=${format}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to export data' };
    }
  },

  // Download voter slip
  downloadVoterSlip: async () => {
    try {
      const response = await api.get('/dashboard/download-voter-slip', {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to download voter slip' };
    }
  },

  // Get security settings
  getSecuritySettings: async () => {
    try {
      const response = await api.get('/dashboard/security-settings');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch security settings' };
    }
  },

  // Update security settings
  updateSecuritySettings: async (settings) => {
    try {
      const response = await api.post('/dashboard/security-settings', settings);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update security settings' };
    }
  },

  // Send mobile verification OTP
  sendMobileVerificationOTP: async () => {
    try {
      const response = await api.post('/dashboard/mobile-verification', {
        action: 'send_otp'
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to send OTP' };
    }
  },

  // Verify mobile OTP
  verifyMobileOTP: async (otpCode) => {
    try {
      const response = await api.post('/dashboard/mobile-verification', {
        action: 'verify_otp',
        otp_code: otpCode
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to verify OTP' };
    }
  },

  // Cast vote
  castVote: async (electionId, candidateId) => {
    try {
      const response = await api.post('/dashboard/cast-vote', {
        election_id: electionId,
        candidate_id: candidateId
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to cast vote' };
    }
  },

  // ============ ELECTION ENDPOINTS ============

  // Get active elections
  getActiveElections: async () => {
    const response = await api.get('/elections/active');
    return response.data;
  },

  // Get election details
  getElectionDetails: async (electionId) => {
    const response = await api.get(`/elections/${electionId}`);
    return response.data;
  },

  // Get candidates for election
  getCandidates: async (electionId) => {
    const response = await api.get(`/elections/${electionId}/candidates`);
    return response.data;
  },

  // Check if already voted
  checkVoteStatus: async (electionId, voterId) => {
    const response = await api.get(`/vote/status/${electionId}/${voterId}`);
    return response.data;
  },

  // ============ UTILITY ENDPOINTS ============

  // Get system stats
  getSystemStats: async () => {
    const response = await api.get('/system/stats');
    return response.data;
  },

  // Debug: Get all voters
  debugGetVoters: async () => {
    const response = await api.get('/dashboard/debug/voters');
    return response.data;
  },

  // Debug: Check authentication
  debugCheckAuth: async () => {
    const response = await api.get('/dashboard/debug/check-auth');
    return response.data;
  },

  // ============ PASSWORD RECOVERY ENDPOINTS ============

  // Request password reset
  requestPasswordReset: async (emailOrVoterId) => {
    const response = await api.post('/auth/password/reset-request', emailOrVoterId);
    return response.data;
  },

  // Reset password with token
  resetPassword: async (resetData) => {
    const response = await api.post('/auth/password/reset', resetData);
    return response.data;
  },

  // ============ SECURITY ENDPOINTS ============

  // Get security questions
  getSecurityQuestions: async () => {
    const response = await api.get('/auth/security/questions');
    return response.data;
  },

  // Verify security answer
  verifySecurityAnswer: async (voterId, answerData) => {
    const response = await api.post(`/auth/security/verify-answer/${voterId}`, answerData);
    return response.data;
  }
};

// Admin API functions
export const adminAPI = {
  // ============ ADMIN AUTHENTICATION ENDPOINTS ============

  // Admin login
  login: async (credentials) => {
    console.log('Admin login attempt:', { username: credentials.username });
    const response = await api.post('/admin/login', credentials);
    console.log('Admin login response:', response.data);
    return response.data;
  },

  // Verify admin token
  verifyToken: async () => {
    const response = await api.get('/admin/verify-token');
    return response.data;
  },

  // Admin logout
  logout: async () => {
    const response = await api.post('/admin/logout');
    // Clear admin local storage on logout
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    localStorage.removeItem('isAdminAuthenticated');
    return response.data;
  },

  // ============ ELECTION MANAGEMENT ============

  // Create election
  createElection: async (electionData) => {
    console.log('Creating election:', electionData.title);
    const response = await api.post('/admin/elections', electionData);
    return response.data;
  },

  // Get elections
  getElections: async (params = {}) => {
    const response = await api.get('/admin/elections', { params });
    return response.data;
  },

  // Update election
  updateElection: async (electionId, updateData) => {
    const response = await api.put(`/admin/elections/${electionId}`, updateData);
    return response.data;
  },

  // Delete election
  deleteElection: async (electionId) => {
    const response = await api.delete(`/admin/elections/${electionId}`);
    return response.data;
  },

  // ============ VOTER MANAGEMENT ============

  // Get voters
  getVoters: async (params = {}) => {
    const response = await api.get('/admin/voters', { params });
    return response.data;
  },

  // Update voter status
  updateVoterStatus: async (voterId, statusData) => {
    const response = await api.put(`/admin/voters/${voterId}/status`, statusData);
    return response.data;
  },

  // Verify voter
  verifyVoter: async (voterId, verificationData) => {
    const response = await api.post(`/admin/voters/${voterId}/verify`, verificationData);
    return response.data;
  },

  // ============ CANDIDATE MANAGEMENT ============

  // Get candidates
  getCandidates: async (electionId = null) => {
    const params = electionId ? { election_id: electionId } : {};
    const response = await api.get('/admin/candidates', { params });
    return response.data;
  },

  // Approve candidate
  approveCandidate: async (candidateId) => {
    const response = await api.put(`/admin/candidates/${candidateId}/approve`, {});
    return response.data;
  },

  // Reject candidate
  rejectCandidate: async (candidateId, reason) => {
    const response = await api.put(`/admin/candidates/${candidateId}/reject`, { reason });
    return response.data;
  },

  // ============ RESULTS AND ANALYTICS ============

  // Get election results
  getElectionResults: async (electionId) => {
    const response = await api.get(`/admin/elections/${electionId}/results`);
    return response.data;
  },

  // Get system stats
  getSystemStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  // Get analytics
  getAnalytics: async () => {
    const response = await api.get('/admin/analytics');
    return response.data;
  },

  // ============ AUDIT LOGS ============

  // Get audit logs
  getAuditLogs: async (params = {}) => {
    const response = await api.get('/admin/audit-logs', { params });
    return response.data;
  },

  // ============ ADMIN MANAGEMENT ============

  // Get all admins
  getAdmins: async () => {
    const response = await api.get('/admin/admins');
    return response.data;
  },

  // Create admin
  createAdmin: async (adminData) => {
    const response = await api.post('/admin/admins', adminData);
    return response.data;
  },

  // Update admin
  updateAdmin: async (adminId, updateData) => {
    const response = await api.put(`/admin/admins/${adminId}`, updateData);
    return response.data;
  },

  // Delete admin
  deleteAdmin: async (adminId) => {
    const response = await api.delete(`/admin/admins/${adminId}`);
    return response.data;
  },

  // ============ SYSTEM SETTINGS ============

  // Get system settings
  getSystemSettings: async () => {
    const response = await api.get('/admin/system-settings');
    return response.data;
  },

  // Update system settings
  updateSystemSettings: async (settings) => {
    const response = await api.put('/admin/system-settings', settings);
    return response.data;
  }
};

// Utility functions for authentication
export const authUtils = {
  // Check if voter is authenticated
  isVoterAuthenticated: () => {
    const token = localStorage.getItem('authToken');
    const voterData = localStorage.getItem('voterData');
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    return !!(token && voterData && isAuthenticated === 'true');
  },

  // Check if admin is authenticated
  isAdminAuthenticated: () => {
    const adminToken = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminData');
    const isAdminAuthenticated = localStorage.getItem('isAdminAuthenticated');
    return !!(adminToken && adminData && isAdminAuthenticated === 'true');
  },

  // Get current voter data
  getCurrentVoter: () => {
    try {
      const voterData = localStorage.getItem('voterData');
      return voterData ? JSON.parse(voterData) : null;
    } catch (error) {
      console.error('Error parsing voter data:', error);
      return null;
    }
  },

  // Get current admin data
  getCurrentAdmin: () => {
    try {
      const adminData = localStorage.getItem('adminData');
      return adminData ? JSON.parse(adminData) : null;
    } catch (error) {
      console.error('Error parsing admin data:', error);
      return null;
    }
  },

  // Get voter auth token
  getVoterToken: () => {
    return localStorage.getItem('authToken');
  },

  // Get admin auth token
  getAdminToken: () => {
    return localStorage.getItem('adminToken');
  },

  // Set voter authentication data
  setVoterAuthData: (token, voterData) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('voterData', JSON.stringify(voterData));
    localStorage.setItem('isAuthenticated', 'true');
  },

  // Set admin authentication data
  setAdminAuthData: (token, adminData) => {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminData', JSON.stringify(adminData));
    localStorage.setItem('isAdminAuthenticated', 'true');
  },

  // Clear voter authentication data
  clearVoterAuthData: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('voterData');
    localStorage.removeItem('isAuthenticated');
  },

  // Clear admin authentication data
  clearAdminAuthData: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    localStorage.removeItem('isAdminAuthenticated');
  },

  // Clear all authentication data
  clearAllAuthData: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('voterData');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    localStorage.removeItem('isAdminAuthenticated');
  },

  // Check token expiration
  isTokenExpired: (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch (error) {
      return true;
    }
  },

  // Voter login function
  voterLogin: (token, voterData) => {
    authUtils.setVoterAuthData(token, voterData);
    window.dispatchEvent(new Event('authStateChange'));
  },

  // Admin login function
  adminLogin: (token, adminData) => {
    authUtils.setAdminAuthData(token, adminData);
    window.dispatchEvent(new Event('authStateChange'));
  },

  // Voter logout function
  voterLogout: () => {
    authUtils.clearVoterAuthData();
    window.dispatchEvent(new Event('authStateChange'));
  },

  // Admin logout function
  adminLogout: () => {
    authUtils.clearAdminAuthData();
    window.dispatchEvent(new Event('authStateChange'));
  }
};

// Enhanced error handler
export const apiErrorHandler = {
  handleError: (error, customMessage = null) => {
    let message = customMessage || 'An unexpected error occurred';
    
    if (error.response) {
      // Server responded with error status
      const serverMessage = error.response.data?.message;
      
      switch (error.response.status) {
        case 400:
          message = serverMessage || 'Bad request. Please check your input.';
          break;
        case 401:
          message = serverMessage || 'Authentication failed. Please login again.';
          authUtils.clearAllAuthData();
          break;
        case 403:
          message = serverMessage || 'Access denied. You do not have permission.';
          break;
        case 404:
          message = serverMessage || 'Resource not found.';
          break;
        case 409:
          message = serverMessage || 'Conflict. Resource already exists.';
          break;
        case 422:
          message = serverMessage || 'Validation error. Please check your input.';
          break;
        case 429:
          message = serverMessage || 'Too many requests. Please try again later.';
          break;
        case 500:
          message = serverMessage || 'Server error. Please try again later.';
          break;
        case 503:
          message = serverMessage || 'Service unavailable. Please try again later.';
          break;
        default:
          message = serverMessage || `Error: ${error.response.status}`;
      }
    } else if (error.request) {
      // Request made but no response received
      message = 'Network error. Please check your connection.';
    } else {
      // Something else happened
      message = error.message || 'An unexpected error occurred';
    }
    
    console.error('API Error Details:', {
      message,
      originalError: error
    });
    
    return message;
  }
};

// Request/Response logger (development only)
if (process.env.NODE_ENV === 'development') {
  api.interceptors.request.use(request => {
    console.log('API Request:', {
      url: request.url,
      method: request.method,
      data: request.data,
      headers: request.headers
    });
    return request;
  });

  api.interceptors.response.use(response => {
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  }, error => {
    console.log('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    return Promise.reject(error);
  });
}

export default api;