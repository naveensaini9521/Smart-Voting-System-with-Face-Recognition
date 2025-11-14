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
    // DON'T add Authorization header to login endpoints
    const isLoginEndpoint = 
      config.url.includes('/auth/login') || 
      config.url.includes('/admin/auth/login') ||
      config.url.includes('/register') ||
      config.url.includes('/auth/admin/login');

    if (!isLoginEndpoint) {
      // Try to get admin token first, then voter token
      const adminToken = localStorage.getItem('adminToken');
      const voterToken = localStorage.getItem('authToken');
      
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`;
      } else if (voterToken) {
        config.headers.Authorization = `Bearer ${voterToken}`;
      }
    }
    
    // Remove Content-Type header for FormData (browser will set it automatically)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
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

  // ============ VOTING & ELECTIONS ENDPOINTS ============

  // Get active elections for voting
  getActiveElections: async () => {
    try {
      console.log('Fetching active elections...');
      const response = await api.get('/dashboard/elections/active');
      console.log('Active elections response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching active elections:', error);
      throw error.response?.data || { message: 'Failed to fetch active elections' };
    }
  },

  // Get election candidates
  getElectionCandidates: async (electionId) => {
    try {
      console.log(`Fetching candidates for election: ${electionId}`);
      const response = await api.get(`/dashboard/elections/${electionId}/candidates`);
      console.log('Candidates response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching candidates:', error);
      throw error.response?.data || { message: 'Failed to fetch election candidates' };
    }
  },

  // Cast vote in election
  castVote: async (electionId, candidateId) => {
    try {
      console.log(`Casting vote - Election: ${electionId}, Candidate: ${candidateId}`);
      const response = await api.post(`/dashboard/elections/${electionId}/vote`, {
        candidate_id: candidateId
      });
      console.log('Vote cast response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error casting vote:', error);
      throw error.response?.data || { message: 'Failed to cast vote' };
    }
  },

  // Get election results
  getElectionResults: async (electionId) => {
    try {
      console.log(`Fetching results for election: ${electionId}`);
      const response = await api.get(`/dashboard/elections/${electionId}/results`);
      console.log('Election results response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching election results:', error);
      throw error.response?.data || { message: 'Failed to fetch election results' };
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

  // Check voter eligibility for election
  checkVoterEligibility: async (electionId) => {
    try {
      console.log(`Checking eligibility for election: ${electionId}`);
      const response = await api.get(`/dashboard/elections/${electionId}/check-eligibility`);
      console.log('Eligibility check response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error checking eligibility:', error);
      throw error.response?.data || { message: 'Failed to check voter eligibility' };
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

  // ============ VOTING PAGE SPECIFIC ENDPOINTS ============

  // Get complete voting page data (election + candidates)
  getVotingPageData: async (electionId) => {
    try {
      console.log(`Loading voting page data for election: ${electionId}`);
      const response = await api.get(`/dashboard/elections/${electionId}/voting-page`);
      console.log('Voting page data response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error loading voting page data:', error);
      throw error.response?.data || { message: 'Failed to load voting page data' };
    }
  },

  // Verify voting session
  verifyVotingSession: async (electionId) => {
    try {
      console.log(`Verifying voting session for election: ${electionId}`);
      const response = await api.get(`/dashboard/elections/${electionId}/verify-session`);
      console.log('Voting session verification:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error verifying voting session:', error);
      throw error.response?.data || { message: 'Failed to verify voting session' };
    }
  },

  // Submit vote with enhanced validation
  submitVote: async (voteData) => {
    try {
      console.log('Submitting vote with enhanced validation:', voteData);
      const response = await api.post('/dashboard/vote/submit', voteData);
      console.log('Vote submission response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error submitting vote:', error);
      throw error.response?.data || { message: 'Failed to submit vote' };
    }
  },

  // Get vote confirmation details
  getVoteConfirmation: async (voteId) => {
    try {
      console.log(`Getting vote confirmation for: ${voteId}`);
      const response = await api.get(`/dashboard/vote/confirmation/${voteId}`);
      console.log('Vote confirmation response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error getting vote confirmation:', error);
      throw error.response?.data || { message: 'Failed to get vote confirmation' };
    }
  },

  // ============ DASHBOARD ENDPOINTS ============

  // Get dashboard data
  getDashboardData: async () => {
    try {
      console.log('Fetching dashboard data...');
      const response = await api.get('/dashboard/data');
      console.log('Dashboard data response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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

  // Get analytics data
  getAnalytics: async () => {
    try {
      const response = await api.get('/dashboard/analytics');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch analytics' };
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

  // ============ REAL-TIME DASHBOARD ENDPOINTS ============

  // Get live elections data
  getLiveElections: async () => {
    try {
      const response = await api.get('/dashboard/elections/live');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch live elections' };
    }
  },

  // Get real-time notifications
  getRealTimeNotifications: async () => {
    try {
      const response = await api.get('/dashboard/notifications/real-time');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch real-time notifications' };
    }
  },

  // Get live updates
  getLiveUpdates: async () => {
    try {
      const response = await api.get('/dashboard/live-updates');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch live updates' };
    }
  },

  // Get socket connection info
  getSocketInfo: async () => {
    try {
      const response = await api.get('/dashboard/socket-info');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch socket info' };
    }
  },

  // ============ REGISTRATION ENDPOINTS ============

  // Register new voter
  register: async (voterData) => {
    console.log('Sending registration data:', voterData);
    const response = await api.post('/register/register', voterData);
    console.log('Registration response:', response.data);
    return response.data;
  },

  // Complete registration
  completeRegistration: async (voterId) => {
    console.log('Completing registration for voter:', voterId);
    const response = await api.post(`/register/complete-registration/${voterId}`);
    console.log('Complete registration response:', response.data);
    return response.data;
  },

  // Register face
  registerFace: async (faceData) => {
    console.log('Registering face for voter:', faceData.voter_id);
    const response = await api.post(`/register/register-face/${faceData.voter_id}`, {
      image_data: faceData.image_data
    });
    console.log('Face registration response:', response.data);
    return response.data;
  },

  // Check voter status
  checkVoter: async (voterId) => {
    const response = await api.get(`/register/check-voter/${voterId}`);
    return response.data;
  },

  // ============ OTP ENDPOINTS ============

  // Send OTP
  sendOTP: async (otpData) => {
    console.log('Sending OTP for registration:', otpData);
    const response = await api.post('/register/send-otp', otpData);
    console.log('Send OTP response:', response.data);
    return response.data;
  },

  // Verify OTP
  verifyOTP: async (otpData) => {
    console.log('Verifying OTP for registration:', otpData);
    const response = await api.post('/register/verify-otp', otpData);
    console.log('Verify OTP response:', response.data);
    return response.data;
  },

  // ============ CONTACT VERIFICATION ENDPOINTS ============

  // Send verification OTP
  sendVerificationOTP: async (voterId, data) => {
    console.log(`Sending verification OTP for voter: ${voterId}, type: ${data.type}`);
    const response = await api.post(`/register/send-verification-otp/${voterId}`, data);
    return response.data;
  },

  // Verify contact
  verifyContact: async (voterId, data) => {
    console.log(`Verifying contact for voter: ${voterId}, type: ${data.type}`);
    const response = await api.post(`/register/verify-contact/${voterId}`, data);
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

  // ============ UTILITY ENDPOINTS ============

  // Get system stats
  getSystemStats: async () => {
    const response = await api.get('/system/stats');
    return response.data;
  },

  // Debug: Get all voters
  debugGetVoters: async () => {
    const response = await api.get('/auth/debug/voters');
    return response.data;
  },

  // Debug: Check authentication
  debugCheckAuth: async () => {
    const response = await api.get('/auth/debug/check-auth');
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
  },

  // ============ SOCKET CONFIGURATION ============

  // Socket connection helper
  getSocketConfig: () => {
    return {
      url: process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : window.location.origin,
      path: '/socket.io',
      transports: ['websocket', 'polling']
    };
  },

  // ============ VOTING SESSION MANAGEMENT ============

  // Start voting session
  startVotingSession: async (electionId) => {
    try {
      const response = await api.post(`/elections/${electionId}/start-voting`);
      return response.data;
    } catch (error) {
      console.error('Error starting voting session:', error);
      throw error;
    }
  },

  // End voting session
  endVotingSession: async (electionId) => {
    try {
      console.log(`Ending voting session for election: ${electionId}`);
      const response = await api.post(`/dashboard/elections/${electionId}/end-session`);
      console.log('Voting session ended:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error ending voting session:', error);
      throw error.response?.data || { message: 'Failed to end voting session' };
    }
  },

  // Get voting session status
  getVotingSessionStatus: async (electionId) => {
    try {
      console.log(`Getting voting session status for election: ${electionId}`);
      const response = await api.get(`/dashboard/elections/${electionId}/session-status`);
      console.log('Voting session status:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error getting voting session status:', error);
      throw error.response?.data || { message: 'Failed to get voting session status' };
    }
  }
};

// Admin API functions - CORRECTED ENDPOINTS
export const adminAPI = {
  // ============ ADMIN AUTHENTICATION ENDPOINTS ============

  // Admin login
  login: async (credentials) => {
    console.log('Admin login attempt:', { username: credentials.username });
    
    // Create a separate axios instance without interceptors for login
    const loginApi = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    
    const response = await loginApi.post('/auth/admin/login', credentials);
    console.log('Admin login response:', response.data);
    return response.data;
  },

  // Verify admin token
  verifyToken: async () => {
    const response = await api.get('/admin/auth/verify-token');
    return response.data;
  },

  // Admin logout
  logout: async () => {
    const response = await api.post('/admin/auth/logout');
    // Clear admin local storage on logout
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    localStorage.removeItem('isAdminAuthenticated');
    return response.data;
  },

  // ============ DASHBOARD & STATISTICS ============

  // Get dashboard statistics
  getDashboardStats: async () => {
    const response = await api.get('/admin/dashboard/stats');
    return response.data;
  },

  // Get system statistics
  getSystemStats: async () => {
    const response = await api.get('/admin/dashboard/stats');
    return response.data;
  },

  // ============ ELECTION MANAGEMENT ============

  // Get elections with pagination
  getElections: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.per_page) queryParams.append('per_page', params.per_page);
    if (params.status) queryParams.append('status', params.status);
    if (params.type) queryParams.append('type', params.type);
    
    const response = await api.get(`/admin/elections?${queryParams.toString()}`);
    return response.data;
  },

  // Create election with file upload support
  createElection: async (formData) => {
    const response = await api.post('/admin/elections', formData, {
      timeout: 60000 // 60 second timeout for file uploads
    });
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

  // Get election details
  getElectionDetails: async (electionId) => {
    const response = await api.get(`/admin/elections/${electionId}`);
    return response.data;
  },

  // Update election status
  updateElectionStatus: async (electionId, statusData) => {
    const response = await api.put(`/admin/elections/${electionId}/status`, statusData);
    return response.data;
  },

  // ============ VOTER MANAGEMENT ============

  // Get voters with pagination
  getVoters: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.per_page) queryParams.append('per_page', params.per_page);
    if (params.verification) queryParams.append('verification', params.verification);
    if (params.constituency) queryParams.append('constituency', params.constituency);
    
    const response = await api.get(`/admin/voters?${queryParams.toString()}`);
    return response.data;
  },

  // Get voter details
  getVoterDetails: async (voterId) => {
    const response = await api.get(`/admin/voters/${voterId}`);
    return response.data;
  },

  // Verify voter
  verifyVoter: async (voterId, verificationData) => {
    const response = await api.post(`/admin/voters/${voterId}/verify`, verificationData);
    return response.data;
  },

  // Update voter status
  updateVoterStatus: async (voterId, statusData) => {
    const response = await api.put(`/admin/voters/${voterId}/status`, statusData);
    return response.data;
  },

  // ============ CANDIDATE MANAGEMENT ============

  // Get candidates with pagination
  getCandidates: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.per_page) queryParams.append('per_page', params.per_page);
    if (params.election_id) queryParams.append('election_id', params.election_id);
    if (params.approval) queryParams.append('approval', params.approval);
    
    const response = await api.get(`/admin/candidates?${queryParams.toString()}`);
    return response.data;
  },

  // Create candidate with file upload support
  createCandidate: async (formData) => {
    const response = await api.post('/admin/candidates', formData, {
      timeout: 60000 // 60 second timeout for file uploads
    });
    return response.data;
  },

  // Approve candidate
  approveCandidate: async (candidateId) => {
    const response = await api.put(`/admin/candidates/${candidateId}/approve`);
    return response.data;
  },

  // Get candidate details
  getCandidateDetails: async (candidateId) => {
    const response = await api.get(`/admin/candidates/${candidateId}`);
    return response.data;
  },

  // ============ AUDIT LOGS ============

  // Get audit logs with pagination
  getAuditLogs: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.per_page) queryParams.append('per_page', params.per_page);
    if (params.action) queryParams.append('action', params.action);
    if (params.user_type) queryParams.append('user_type', params.user_type);
    
    const response = await api.get(`/admin/audit-logs?${queryParams.toString()}`);
    return response.data;
  },

  // ============ BROADCAST & SYSTEM ============

  // Broadcast message
  broadcastMessage: async (messageData) => {
    const response = await api.post('/admin/broadcast', messageData);
    return response.data;
  },

  // Get connected users
  getConnectedUsers: async () => {
    const response = await api.get('/admin/connected-users');
    return response.data;
  },

  // Health check
  healthCheck: async () => {
    const response = await api.get('/admin/health');
    return response.data;
  },

  // ============ REAL-TIME ADMIN ENDPOINTS ============

  // Update election with real-time broadcast
  updateElection: async (action, electionData) => {
    try {
      const response = await api.post('/dashboard/admin/update-election', {
        action,
        election_data: electionData
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update election' };
    }
  },

  // Update voter with real-time broadcast
  updateVoter: async (action, voterData) => {
    try {
      const response = await api.post('/dashboard/admin/update-voter', {
        action,
        voter_data: voterData
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update voter' };
    }
  },

  // Admin broadcast to all voters
  adminBroadcast: async (messageData) => {
    try {
      const response = await api.post('/dashboard/admin/broadcast', messageData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to send broadcast' };
    }
  },

  // Get connected users info
  getConnectedUsersInfo: async () => {
    try {
      const response = await api.get('/dashboard/admin/connected-users');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get connected users' };
    }
  },

  // ============ VOTE MANAGEMENT ============

  // Get election votes
  getElectionVotes: async (electionId) => {
    try {
      const response = await api.get(`/admin/elections/${electionId}/votes`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch election votes' };
    }
  },

  // Get vote statistics
  getVoteStatistics: async (electionId) => {
    try {
      const response = await api.get(`/admin/elections/${electionId}/vote-stats`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch vote statistics' };
    }
  },

  // Export election results
  exportElectionResults: async (electionId, format = 'csv') => {
    try {
      const response = await api.get(`/admin/elections/${electionId}/export-results?format=${format}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to export election results' };
    }
  },

  // ============ VOTING SESSION MANAGEMENT ============

  // Start voting session for election
  startVotingSession: async (electionId) => {
    try {
      console.log(`Admin starting voting session for election: ${electionId}`);
      const response = await api.post(`/admin/elections/${electionId}/start-voting`);
      console.log('Voting session started by admin:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error starting voting session:', error);
      throw error.response?.data || { message: 'Failed to start voting session' };
    }
  },

  // End voting session for election
  endVotingSession: async (electionId) => {
    try {
      console.log(`Admin ending voting session for election: ${electionId}`);
      const response = await api.post(`/admin/elections/${electionId}/end-voting`);
      console.log('Voting session ended by admin:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error ending voting session:', error);
      throw error.response?.data || { message: 'Failed to end voting session' };
    }
  },

  // Get voting session analytics
  getVotingAnalytics: async (electionId) => {
    try {
      console.log(`Getting voting analytics for election: ${electionId}`);
      const response = await api.get(`/admin/elections/${electionId}/voting-analytics`);
      console.log('Voting analytics:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error getting voting analytics:', error);
      throw error.response?.data || { message: 'Failed to get voting analytics' };
    }
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
  },

  // Voting-specific error handler
  handleVotingError: (error) => {
    const baseMessage = apiErrorHandler.handleError(error);
    
    // Add voting-specific context
    if (error.response?.status === 400) {
      const errorData = error.response.data;
      if (errorData.message?.includes('already voted')) {
        return 'You have already cast your vote in this election.';
      } else if (errorData.message?.includes('not eligible')) {
        return 'You are not eligible to vote in this election.';
      } else if (errorData.message?.includes('not active')) {
        return 'This election is not currently active for voting.';
      } else if (errorData.message?.includes('voting period')) {
        return 'The voting period for this election has ended.';
      }
    }
    
    return baseMessage;
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