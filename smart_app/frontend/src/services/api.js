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

// Voting session storage with expiration
const votingSessions = new Map();

// Request interceptor to add auth token if available
api.interceptors.request.use(
  (config) => {
    // DON'T add Authorization header to login endpoints
    const isLoginEndpoint = 
      config.url?.includes('/auth/login') || 
      config.url?.includes('/admin/auth/login') ||
      config.url?.includes('/register') ||
      config.url?.includes('/auth/admin/login');

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

// Helper function to get auth header
const getAuthHeader = () => {
  const adminToken = localStorage.getItem('adminToken');
  const voterToken = localStorage.getItem('authToken');
  
  if (adminToken) {
    return { Authorization: `Bearer ${adminToken}` };
  } else if (voterToken) {
    return { Authorization: `Bearer ${voterToken}` };
  }
  return {};
};

// Enhanced voting session management
const votingSessionManager = {
  // Store session with expiration
  storeSession: (electionId, sessionData) => {
    const enhancedSessionData = {
      ...sessionData,
      created_at: Date.now(),
      expires_at: Date.now() + (30 * 60 * 1000) // 30 minutes
    };
    
    // Store in both localStorage and memory
    localStorage.setItem(`voting_session_${electionId}`, JSON.stringify(enhancedSessionData));
    votingSessions.set(electionId, enhancedSessionData);
    
    console.log('💾 Voting session stored:', enhancedSessionData.session_id);
    return enhancedSessionData;
  },

  // Get session with validation
  getSession: (electionId) => {
    try {
      // Check memory cache first
      let session = votingSessions.get(electionId);
      
      // If not in memory, check localStorage
      if (!session) {
        const storedSession = localStorage.getItem(`voting_session_${electionId}`);
        if (storedSession) {
          session = JSON.parse(storedSession);
          votingSessions.set(electionId, session);
        }
      }
      
      if (!session) {
        console.log('❌ No voting session found for election:', electionId);
        return null;
      }
      
      // Check if session expired
      const now = Date.now();
      if (now > session.expires_at) {
        console.log('🕒 Voting session expired for election:', electionId);
        votingSessionManager.clearSession(electionId);
        return null;
      }
      
      console.log('✅ Voting session verified:', session.session_id);
      return session;
    } catch (error) {
      console.error('Error getting voting session:', error);
      votingSessionManager.clearSession(electionId);
      return null;
    }
  },

  // Clear session
  clearSession: (electionId) => {
    votingSessions.delete(electionId);
    localStorage.removeItem(`voting_session_${electionId}`);
    localStorage.removeItem(`voted_${electionId}`);
    console.log('🗑️ Cleared voting session data for election:', electionId);
  },

  // Refresh session
  refreshSession: (electionId) => {
    const session = votingSessionManager.getSession(electionId);
    if (session) {
      // Extend session by 30 minutes
      session.expires_at = Date.now() + (30 * 60 * 1000);
      localStorage.setItem(`voting_session_${electionId}`, JSON.stringify(session));
      votingSessions.set(electionId, session);
      console.log('🔄 Voting session refreshed');
      return true;
    }
    return false;
  }
};

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

  // ============ ELECTION RESULTS ENDPOINTS (FIXED) ============

  // Get election results - PRIMARY ENDPOINT FOR VOTERS
  getElectionResults: async (electionId) => {
    try {
      console.log(`📊 Voter fetching results for election: ${electionId}`);
      const response = await api.get(`/election/elections/${electionId}/results`);
      console.log('✅ Voter election results response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Voter error fetching election results:', error);
      
      // Enhanced error handling for results
      let errorMessage = 'Failed to load election results';
      let resultsNotAvailable = false;
      let reason = '';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        errorMessage = errorData.message || errorMessage;
        reason = errorData.reason || '';
        
        if (errorData.message?.includes('not available') || 
            errorData.message?.includes('not published') ||
            errorData.message?.includes('not ended')) {
          resultsNotAvailable = true;
          errorMessage = 'Results are not available yet. Please check back after the election ends.';
        } else if (errorData.message?.includes('not found')) {
          errorMessage = 'Election not found or results are not available.';
        }
      }
      
      throw {
        success: false,
        message: errorMessage,
        reason: reason,
        results_not_available: resultsNotAvailable,
        election_id: electionId
      };
    }
  },

  // ALTERNATIVE: Get results from dashboard endpoint
  getElectionResultsDashboard: async (electionId) => {
    try {
      console.log(`📊 Voter fetching results from dashboard: ${electionId}`);
      const response = await api.get(`/dashboard/elections/${electionId}/results`);
      console.log('✅ Dashboard election results response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching from dashboard:', error);
      // Fallback to main election endpoint
      return voterAPI.getElectionResults(electionId);
    }
  },

  // Check if election results are available
  checkResultsAvailability: async (electionId) => {
    try {
      console.log(`🔍 Checking results availability for election: ${electionId}`);
      const response = await api.get(`/election/elections/${electionId}/results/check`);
      console.log('✅ Results availability check:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error checking results availability:', error);
      throw error.response?.data || { message: 'Failed to check results availability' };
    }
  },

  // Get election details for results page
  getElectionDetailsForResults: async (electionId) => {
    try {
      console.log(`📋 Getting election details for results: ${electionId}`);
      const response = await api.get(`/election/elections/${electionId}`);
      console.log('✅ Election details for results response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching election details:', error);
      throw error.response?.data || { message: 'Failed to fetch election details' };
    }
  },

  // Get election results summary
  getElectionResultsSummary: async (electionId) => {
    try {
      console.log(`📈 Getting results summary for election: ${electionId}`);
      const response = await api.get(`/election/elections/${electionId}/results/summary`);
      console.log('✅ Results summary response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching results summary:', error);
      throw error.response?.data || { message: 'Failed to fetch results summary' };
    }
  },

  // Get my vote in election
  getMyVoteInElection: async (electionId) => {
    try {
      console.log(`🗳️ Getting my vote for election: ${electionId}`);
      const response = await api.get(`/dashboard/elections/${electionId}/my-vote`);
      console.log('✅ My vote response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching my vote:', error);
      throw error.response?.data || { message: 'Failed to fetch your vote information' };
    }
  },

  // ============ VOTING & ELECTIONS ENDPOINTS ============

  // Get active elections for voting
  getActiveElections: async () => {
    try {
      console.log('🔄 Fetching active elections...');
      const response = await api.get('/election/elections/active');
      console.log('✅ Active elections response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching active elections:', error);
      throw error.response?.data || { message: 'Failed to fetch active elections' };
    }
  },

  // Get upcoming elections
  getUpcomingElections: async () => {
    try {
      console.log('🔄 Fetching upcoming elections...');
      const response = await api.get('/election/elections/upcoming');
      console.log('✅ Upcoming elections response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching upcoming elections:', error);
      throw error.response?.data || { message: 'Failed to fetch upcoming elections' };
    }
  },

  // Get completed elections
  getCompletedElections: async () => {
    try {
      console.log('🔄 Fetching completed elections...');
      const response = await api.get('/election/elections/completed');
      console.log('✅ Completed elections response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching completed elections:', error);
      throw error.response?.data || { message: 'Failed to fetch completed elections' };
    }
  },

  // Get election candidates
  getElectionCandidates: async (electionId) => {
    try {
      console.log(`🔄 Fetching candidates for election: ${electionId}`);
      const response = await api.get(`/election/elections/${electionId}/candidates`);
      console.log('✅ Candidates response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching candidates:', error);
      throw error.response?.data || { message: 'Failed to fetch election candidates' };
    }
  },

  // Cast vote in election
  castVote: async (electionId, candidateId) => {
    try {
      console.log(`🗳️ Casting vote - Election: ${electionId}, Candidate: ${candidateId}`);
      
      // Verify session first using the enhanced session manager
      const session = votingSessionManager.getSession(electionId);
      if (!session) {
        throw new Error('No active voting session found. Please restart voting.');
      }
      
      const response = await api.post(`/election/elections/${electionId}/vote`, {
        candidate_id: candidateId
      });
      console.log('✅ Vote cast response:', response.data);
      
      // Clear session data after successful vote
      if (response.data.success) {
        votingSessionManager.clearSession(electionId);
        localStorage.setItem(`voted_${electionId}`, 'true');
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Error casting vote:', error);
      
      // Enhanced error handling
      let errorMessage = 'Failed to cast vote';
      let hasVoted = false;
      let sessionExpired = false;
      
      if (error.response?.data) {
        const errorData = error.response.data;
        errorMessage = errorData.message || errorMessage;
        
        if (errorData.message?.includes('already voted')) {
          errorMessage = 'You have already voted in this election.';
          hasVoted = true;
        } else if (errorData.message?.includes('session') || errorData.message?.includes('expired')) {
          errorMessage = 'Voting session has expired. Please start a new session.';
          sessionExpired = true;
        }
      } else if (error.message?.includes('session')) {
        errorMessage = 'Voting session issue. Please restart the voting process.';
        sessionExpired = true;
      }
      
      throw {
        success: false,
        message: errorMessage,
        has_voted: hasVoted,
        session_expired: sessionExpired
      };
    }
  },

  // ============ DASHBOARD ENDPOINTS ============

  // Get dashboard data
  getDashboardData: async () => {
    try {
      console.log('🏠 Fetching dashboard data...');
      const response = await api.get('/dashboard/data');
      console.log('✅ Dashboard data response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      throw error.response?.data || { message: 'Failed to fetch dashboard data' };
    }
  },

  // Get enhanced dashboard data
  getEnhancedDashboardData: async () => {
    try {
      console.log('📊 Fetching enhanced dashboard data...');
      const response = await api.get('/dashboard/data/enhanced');
      console.log('✅ Enhanced dashboard data response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching enhanced dashboard data:', error);
      throw error.response?.data || { message: 'Failed to fetch enhanced dashboard data' };
    }
  },

  // Get user profile
  getProfile: async () => {
    try {
      console.log('👤 Fetching user profile...');
      const response = await api.get('/dashboard/profile');
      console.log('✅ Profile response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching profile:', error);
      throw error.response?.data || { message: 'Failed to fetch profile' };
    }
  },

  // Get enhanced voting history
  getEnhancedVotingHistory: async () => {
    try {
      console.log('📜 Fetching enhanced voting history...');
      const response = await api.get('/dashboard/voting-history/enhanced');
      console.log('✅ Enhanced voting history response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching enhanced voting history:', error);
      throw error.response?.data || { message: 'Failed to fetch enhanced voting history' };
    }
  },

  // Get enhanced analytics
  getEnhancedAnalytics: async () => {
    try {
      console.log('📊 Fetching enhanced analytics...');
      const response = await api.get('/dashboard/analytics/enhanced');
      console.log('✅ Enhanced analytics response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching enhanced analytics:', error);
      throw error.response?.data || { message: 'Failed to fetch enhanced analytics' };
    }
  },

  // Get enhanced security information
  getEnhancedSecurity: async () => {
    try {
      console.log('🔒 Fetching enhanced security information...');
      const response = await api.get('/dashboard/security/enhanced');
      console.log('✅ Enhanced security response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching enhanced security:', error);
      throw error.response?.data || { message: 'Failed to fetch enhanced security information' };
    }
  },

  // Generate digital ID
  generateDigitalID: async () => {
    try {
      console.log('🆔 Generating digital ID...');
      const response = await api.get('/dashboard/digital-id/generate');
      console.log('✅ Digital ID generation response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error generating digital ID:', error);
      throw error.response?.data || { message: 'Failed to generate digital ID' };
    }
  },

  // Refresh dashboard data
  refreshDashboardData: async () => {
    try {
      console.log('🔄 Refreshing dashboard data...');
      const response = await api.post('/dashboard/refresh-data');
      console.log('✅ Dashboard refresh response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error refreshing dashboard data:', error);
      throw error.response?.data || { message: 'Failed to refresh dashboard data' };
    }
  },

  // Export data in specific format
  exportData: async (format) => {
    try {
      console.log(`📤 Exporting data in ${format} format...`);
      const response = await api.get(`/dashboard/export-data/${format}`);
      console.log('✅ Export data response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error exporting data:', error);
      throw error.response?.data || { message: 'Failed to export data' };
    }
  },

  // Get notifications
  getNotifications: async (limit = 10) => {
    try {
      console.log('🔔 Fetching notifications...');
      const response = await api.get(`/dashboard/notifications?limit=${limit}`);
      console.log('✅ Notifications response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      throw error.response?.data || { message: 'Failed to fetch notifications' };
    }
  },

  // Get analytics data
  getAnalytics: async () => {
    try {
      console.log('📈 Fetching analytics...');
      const response = await api.get('/dashboard/analytics');
      console.log('✅ Analytics response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching analytics:', error);
      throw error.response?.data || { message: 'Failed to fetch analytics' };
    }
  },

  // ============ REAL-TIME DASHBOARD ENDPOINTS ============

  // Get live elections data
  getLiveElections: async () => {
    try {
      console.log('📡 Fetching live elections data...');
      const response = await api.get('/dashboard/elections/live');
      console.log('✅ Live elections response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching live elections:', error);
      throw error.response?.data || { message: 'Failed to fetch live elections' };
    }
  },

  // Get live updates
  getLiveUpdates: async () => {
    try {
      console.log('🔄 Fetching live updates...');
      const response = await api.get('/dashboard/live-updates');
      console.log('✅ Live updates response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching live updates:', error);
      throw error.response?.data || { message: 'Failed to fetch live updates' };
    }
  },

  // Get socket connection info
  getSocketInfo: async () => {
    try {
      console.log('📡 Fetching socket info...');
      const response = await api.get('/dashboard/socket-info');
      console.log('✅ Socket info response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching socket info:', error);
      throw error.response?.data || { message: 'Failed to fetch socket info' };
    }
  },

  // ============ DIGITAL ID & EXPORT ENDPOINTS ============

  // Get digital ID
  getDigitalID: async () => {
    try {
      console.log('🆔 Fetching digital ID...');
      const response = await api.get('/dashboard/digital-id');
      console.log('✅ Digital ID response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching digital ID:', error);
      throw error.response?.data || { message: 'Failed to fetch digital ID' };
    }
  },

  // Download voter slip
  downloadVoterSlip: async () => {
    try {
      console.log('📄 Downloading voter slip...');
      const response = await api.get('/dashboard/download-voter-slip', {
        responseType: 'blob'
      });
      console.log('✅ Voter slip download response received');
      return response.data;
    } catch (error) {
      console.error('❌ Error downloading voter slip:', error);
      throw error.response?.data || { message: 'Failed to download voter slip' };
    }
  },

  // ============ SECURITY & SETTINGS ENDPOINTS ============

  // Get security settings
  getSecuritySettings: async () => {
    try {
      console.log('🔒 Fetching security settings...');
      const response = await api.get('/dashboard/security-settings');
      console.log('✅ Security settings response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching security settings:', error);
      throw error.response?.data || { message: 'Failed to fetch security settings' };
    }
  },

  // Update security settings
  updateSecuritySettings: async (settings) => {
    try {
      console.log('🔒 Updating security settings...');
      const response = await api.post('/dashboard/security-settings', settings);
      console.log('✅ Security settings updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error updating security settings:', error);
      throw error.response?.data || { message: 'Failed to update security settings' };
    }
  },

  // Send mobile verification OTP
  sendMobileVerificationOTP: async () => {
    try {
      console.log('📱 Sending mobile verification OTP...');
      const response = await api.post('/dashboard/mobile-verification', {
        action: 'send_otp'
      });
      console.log('✅ OTP sent:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error sending OTP:', error);
      throw error.response?.data || { message: 'Failed to send OTP' };
    }
  },

  // Verify mobile OTP
  verifyMobileOTP: async (otpCode) => {
    try {
      console.log('🔐 Verifying mobile OTP...');
      const response = await api.post('/dashboard/mobile-verification', {
        action: 'verify_otp',
        otp_code: otpCode
      });
      console.log('✅ OTP verified:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error verifying OTP:', error);
      throw error.response?.data || { message: 'Failed to verify OTP' };
    }
  },

  // ============ ENHANCED VOTING SESSION MANAGEMENT ============

  // Start voting session
  startVotingSession: async (electionId) => {
    try {
      console.log(`🚀 Starting voting session for election: ${electionId}`);
      
      // Clear any existing session data first
      votingSessionManager.clearSession(electionId);
      
      const response = await api.post(`/election/elections/${electionId}/start-voting`);
      console.log('✅ Voting session started:', response.data);
      
      // Store session data using enhanced session manager
      if (response.data.success) {
        const sessionData = votingSessionManager.storeSession(electionId, {
          sessionId: response.data.session_id,
          expires: response.data.session_expires,
          election: response.data.election,
          candidates: response.data.candidates,
          startedAt: new Date().toISOString(),
          votingInstructions: response.data.voting_instructions,
          securityInfo: response.data.security_info
        });
        
        console.log('💾 Enhanced voting session stored:', sessionData);
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Error starting voting session:', error);
      
      // Enhanced error handling with specific messages
      let errorMessage = 'Failed to start voting session';
      let hasVoted = false;
      let sessionExpired = false;
      
      if (error.response?.data) {
        const errorData = error.response.data;
        errorMessage = errorData.message || errorMessage;
        
        // Handle specific error cases
        if (errorData.message?.includes('already voted')) {
          errorMessage = 'You have already voted in this election.';
          hasVoted = true;
        } else if (errorData.message?.includes('not started')) {
          errorMessage = 'Voting has not started yet for this election.';
        } else if (errorData.message?.includes('ended')) {
          errorMessage = 'Voting has ended for this election.';
          sessionExpired = true;
        } else if (errorData.message?.includes('not eligible')) {
          errorMessage = 'You are not eligible to vote in this election.';
        } else if (errorData.message?.includes('not active')) {
          errorMessage = 'This election is not currently active for voting.';
        }
      }
      
      throw {
        success: false,
        message: errorMessage,
        has_voted: hasVoted,
        session_expired: sessionExpired,
        election_id: electionId
      };
    }
  },

  // Verify voting session
  verifyVotingSession: async (electionId) => {
    try {
      console.log(`🔒 Verifying voting session for election: ${electionId}`);
      
      const session = votingSessionManager.getSession(electionId);
      if (!session) {
        throw new Error('No active voting session found');
      }
      
      return {
        success: true,
        session_valid: true,
        session_data: session,
        time_remaining: Math.max(0, session.expires_at - Date.now()),
        expires_at: new Date(session.expires_at).toISOString()
      };
    } catch (error) {
      console.error('❌ Error verifying voting session:', error);
      throw { 
        success: false, 
        message: error.message || 'Failed to verify voting session',
        session_expired: error.message.includes('expired') || error.message.includes('No active')
      };
    }
  },

  // Get cached voting session data
  getCachedVotingSession: (electionId) => {
    return votingSessionManager.getSession(electionId);
  },

  // Clear voting session data
  clearVotingSession: (electionId) => {
    return votingSessionManager.clearSession(electionId);
  },

  // Refresh voting session
  refreshVotingSession: (electionId) => {
    return votingSessionManager.refreshSession(electionId);
  },

  // Check if user has voted in election
  hasVoted: (electionId) => {
    return localStorage.getItem(`voted_${electionId}`) === 'true';
  },

  // Check if voting session is active
  isVotingSessionActive: (electionId) => {
    return votingSessionManager.getSession(electionId) !== null;
  },

  // Get time remaining for voting session
  getVotingSessionTimeRemaining: (electionId) => {
    const session = votingSessionManager.getSession(electionId);
    if (!session) return 0;
    
    return Math.max(0, session.expires_at - Date.now());
  },

  // ============ ELECTION MANAGEMENT ENDPOINTS ============

  // Check voter eligibility for election
  checkVoterEligibility: async (electionId) => {
    try {
      console.log(`🔍 Checking eligibility for election: ${electionId}`);
      const response = await api.get(`/election/elections/${electionId}/check-eligibility`);
      console.log('✅ Eligibility check response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error checking eligibility:', error);
      throw error.response?.data || { message: 'Failed to check voter eligibility' };
    }
  },

  // Get voting history
  getVotingHistory: async () => {
    try {
      console.log('📜 Fetching voting history...');
      const response = await api.get('/dashboard/voting-history');
      console.log('✅ Voting history response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching voting history:', error);
      throw error.response?.data || { message: 'Failed to fetch voting history' };
    }
  },

  // ============ REGISTRATION ENDPOINTS ============

  // Register new voter
  register: async (voterData) => {
    console.log('📝 Sending registration data:', voterData);
    const response = await api.post('/register/register', voterData);
    console.log('✅ Registration response:', response.data);
    return response.data;
  },

  // Complete registration
  completeRegistration: async (voterId) => {
    console.log('✅ Completing registration for voter:', voterId);
    const response = await api.post(`/register/complete-registration/${voterId}`);
    console.log('✅ Complete registration response:', response.data);
    return response.data;
  },

  // Register face
  registerFace: async (faceData) => {
    console.log('👤 Registering face for voter:', faceData.voter_id);
    const response = await api.post(`/register/register-face/${faceData.voter_id}`, {
      image_data: faceData.image_data
    });
    console.log('✅ Face registration response:', response.data);
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
    console.log('📱 Sending OTP for registration:', otpData);
    const response = await api.post('/register/send-otp', otpData);
    console.log('✅ Send OTP response:', response.data);
    return response.data;
  },

  // Verify OTP
  verifyOTP: async (otpData) => {
    console.log('🔐 Verifying OTP for registration:', otpData);
    const response = await api.post('/register/verify-otp', otpData);
    console.log('✅ Verify OTP response:', response.data);
    return response.data;
  },

  // ============ CONTACT VERIFICATION ENDPOINTS ============

  // Send verification OTP
  sendVerificationOTP: async (voterId, data) => {
    console.log(`📱 Sending verification OTP for voter: ${voterId}, type: ${data.type}`);
    const response = await api.post(`/register/send-verification-otp/${voterId}`, data);
    return response.data;
  },

  // Verify contact
  verifyContact: async (voterId, data) => {
    console.log(`✅ Verifying contact for voter: ${voterId}, type: ${data.type}`);
    const response = await api.post(`/register/verify-contact/${voterId}`, data);
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

  // End voting session
  endVotingSession: async (electionId) => {
    try {
      console.log(`Ending voting session for election: ${electionId}`);
      const response = await api.post(`/election/elections/${electionId}/end-session`);
      console.log('Voting session ended:', response.data);
      
      // Clear session data
      votingSessionManager.clearSession(electionId);
      
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
      
      // Check enhanced session manager first
      const session = votingSessionManager.getSession(electionId);
      if (session) {
        const timeRemaining = Math.max(0, session.expires_at - Date.now());
        
        return {
          success: true,
          session_active: timeRemaining > 0,
          session_data: session,
          time_remaining: timeRemaining,
          expires_at: new Date(session.expires_at).toISOString()
        };
      }
      
      // If no local session, check with server
      const response = await api.get(`/election/elections/${electionId}/session-status`);
      console.log('Voting session status:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error getting voting session status:', error);
      throw error.response?.data || { message: 'Failed to get voting session status' };
    }
  },

  // ============ NAVIGATION HELPERS ============

  // Prepare voting navigation data
  prepareVotingNavigation: (electionId, sessionResponse) => {
    try {
      const navigationData = {
        electionId: electionId,
        sessionId: sessionResponse.session_id,
        election: sessionResponse.election,
        candidates: sessionResponse.candidates,
        expires: sessionResponse.session_expires,
        startedAt: new Date().toISOString()
      };
      
      // Store in both localStorage and sessionStorage for redundancy
      localStorage.setItem(`voting_nav_${electionId}`, JSON.stringify(navigationData));
      sessionStorage.setItem(`voting_nav_${electionId}`, JSON.stringify(navigationData));
      
      console.log('📍 Voting navigation data prepared:', navigationData);
      return navigationData;
    } catch (error) {
      console.error('Error preparing voting navigation:', error);
      return null;
    }
  },

  // Get voting navigation data
  getVotingNavigationData: (electionId) => {
    try {
      let navData = sessionStorage.getItem(`voting_nav_${electionId}`);
      if (!navData) {
        navData = localStorage.getItem(`voting_nav_${electionId}`);
      }
      
      if (navData) {
        return JSON.parse(navData);
      }
      return null;
    } catch (error) {
      console.error('Error getting voting navigation data:', error);
      return null;
    }
  },

  // Clear voting navigation data
  clearVotingNavigationData: (electionId) => {
    localStorage.removeItem(`voting_nav_${electionId}`);
    sessionStorage.removeItem(`voting_nav_${electionId}`);
  },

  // ============ VOTING PAGE SPECIFIC ENDPOINTS ============

  // Get complete voting page data (election + candidates)
  getVotingPageData: async (electionId) => {
    try {
      console.log(`📄 Loading voting page data for election: ${electionId}`);
      
      // First try to get session data from enhanced session manager
      const sessionData = votingSessionManager.getSession(electionId);
      if (sessionData) {
        console.log('✅ Using cached voting session data');
        return {
          success: true,
          session_data: sessionData,
          election: sessionData.election,
          candidates: sessionData.candidates,
          from_cache: true
        };
      }
      
      // If no cached data, start a new session
      console.log('🔄 No cached session found, starting new voting session...');
      const sessionResponse = await voterAPI.startVotingSession(electionId);
      return sessionResponse;
    } catch (error) {
      console.error('❌ Error loading voting page data:', error);
      throw error.response?.data || { message: 'Failed to load voting page data' };
    }
  },

  // ============ DEBUG ENDPOINTS ============

  // Debug voting flow
  debugVotingFlow: async (electionId) => {
    try {
      console.log('🔍 Debugging voting flow for election:', electionId);
      
      // Check authentication
      const authCheck = await voterAPI.checkAuth();
      console.log('Auth check:', authCheck);
      
      // Check active elections
      const activeElections = await voterAPI.getActiveElections();
      console.log('Active elections:', activeElections);
      
      // Check if election exists in active elections
      const targetElection = activeElections.elections?.find(e => e.election_id === electionId);
      console.log('Target election:', targetElection);
      
      // Try to start voting session
      const session = await voterAPI.startVotingSession(electionId);
      console.log('Voting session:', session);
      
      return {
        success: true,
        auth: authCheck,
        election: targetElection,
        session: session
      };
    } catch (error) {
      console.error('Debug error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // ============ ELECTION RESULTS UTILITIES ============

  // Check if election has ended and results are available
  isElectionResultsAvailable: async (electionId) => {
    try {
      console.log(`🔍 Checking if results are available for election: ${electionId}`);
      const response = await voterAPI.checkResultsAvailability(electionId);
      console.log('✅ Results availability check:', response);
      return response;
    } catch (error) {
      console.error('❌ Error checking results availability:', error);
      return {
        success: false,
        available: false,
        message: 'Unable to check results availability'
      };
    }
  }
};

// Admin API functions - COMPLETE AND CORRECTED
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
    const response = await api.get('/admin/verify-token', {
      headers: getAuthHeader()
    });
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

  // ============ ELECTION RESULTS ENDPOINTS (FIXED) ============

  // Get election results (admin version) - USE ADMIN ENDPOINTS
  getElectionResults: async (electionId) => {
    try {
      console.log(`📊 Admin fetching results for election: ${electionId}`);
      const response = await api.get(`/admin/elections/${electionId}/results`, {
        headers: getAuthHeader()
      });
      console.log('✅ Admin election results response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Admin error fetching election results:', error);
      throw error.response?.data || { message: 'Failed to fetch election results' };
    }
  },

  // Publish election results
  publishElectionResults: async (electionId) => {
    try {
      console.log(`📢 Publishing results for election: ${electionId}`);
      const response = await api.post(`/admin/elections/${electionId}/publish-results`, {}, {
        headers: getAuthHeader()
      });
      console.log('✅ Results published:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error publishing election results:', error);
      throw error.response?.data || { message: 'Failed to publish election results' };
    }
  },

  // Unpublish election results
  unpublishElectionResults: async (electionId) => {
    try {
      console.log(`🔒 Unpublishing results for election: ${electionId}`);
      const response = await api.post(`/admin/elections/${electionId}/unpublish-results`, {}, {
        headers: getAuthHeader()
      });
      console.log('✅ Results unpublished:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error unpublishing election results:', error);
      throw error.response?.data || { message: 'Failed to unpublish election results' };
    }
  },

  // Get election results with analytics
  getElectionResultsAnalytics: async (electionId) => {
    try {
      console.log(`📊 Admin fetching results analytics for election: ${electionId}`);
      const response = await api.get(`/admin/elections/${electionId}/results/analytics`, {
        headers: getAuthHeader()
      });
      console.log('✅ Admin results analytics response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Admin error fetching results analytics:', error);
      throw error.response?.data || { message: 'Failed to fetch results analytics' };
    }
  },

  // Get results for admin dashboard
  getElectionResultsDashboard: async (electionId) => {
    try {
      console.log(`📈 Admin fetching results dashboard for election: ${electionId}`);
      const response = await api.get(`/admin/elections/${electionId}/results/dashboard`, {
        headers: getAuthHeader()
      });
      console.log('✅ Admin results dashboard response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Admin error fetching results dashboard:', error);
      throw error.response?.data || { message: 'Failed to fetch results dashboard' };
    }
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
      headers: getAuthHeader(),
      timeout: 60000 // 60 second timeout for file uploads
    });
    return response.data;
  },

  // Update election
  updateElection: async (electionId, updateData) => {
    const response = await api.put(`/admin/elections/${electionId}`, updateData, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Delete election
  deleteElection: async (electionId) => {
    const response = await api.delete(`/admin/elections/${electionId}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Get election details
  getElectionDetails: async (electionId) => {
    const response = await api.get(`/admin/elections/${electionId}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Update election status
  updateElectionStatus: async (electionId, statusData) => {
    const response = await api.put(`/admin/elections/${electionId}/status`, statusData, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Get election for edit
  getElectionForEdit: async (electionId) => {
    const response = await api.get(`/admin/elections/${electionId}/edit`, {
      headers: getAuthHeader()
    });
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
    
    const response = await api.get(`/admin/voters?${queryParams.toString()}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Get voter details
  getVoterDetails: async (voterId) => {
    const response = await api.get(`/admin/voters/${voterId}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Verify voter
  verifyVoter: async (voterId, verificationData) => {
    const response = await api.post(`/admin/voters/${voterId}/verify`, verificationData, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Update voter status
  updateVoterStatus: async (voterId, statusData) => {
    const response = await api.put(`/admin/voters/${voterId}/status`, statusData, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Delete voter
  deleteVoter: async (voterId) => {
    const response = await api.delete(`/admin/voters/${voterId}`, {
      headers: getAuthHeader()
    });
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
    
    const response = await api.get(`/admin/candidates?${queryParams.toString()}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Create candidate with file upload support
  createCandidate: async (formData) => {
    const response = await api.post('/admin/candidates', formData, {
      headers: getAuthHeader(),
      timeout: 60000 // 60 second timeout for file uploads
    });
    return response.data;
  },

  // Update candidate
  updateCandidate: async (candidateId, updateData) => {
    const response = await api.put(`/admin/candidates/${candidateId}`, updateData, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Delete candidate
  deleteCandidate: async (candidateId) => {
    const response = await api.delete(`/admin/candidates/${candidateId}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Approve candidate
  approveCandidate: async (candidateId) => {
    const response = await api.put(`/admin/candidates/${candidateId}/approve`, {}, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Get candidate details
  getCandidateDetails: async (candidateId) => {
    const response = await api.get(`/admin/candidates/${candidateId}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Get candidate for edit
  getCandidateForEdit: async (candidateId) => {
    const response = await api.get(`/admin/candidates/${candidateId}/edit`, {
      headers: getAuthHeader()
    });
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
    
    const response = await api.get(`/admin/audit-logs?${queryParams.toString()}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // ============ SYSTEM SETTINGS ============

  // Get system settings
  getSystemSettings: async () => {
    const response = await api.get('/admin/settings', {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Update system settings
  updateSystemSettings: async (settings) => {
    const response = await api.put('/admin/settings', settings, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // ============ BROADCAST & SYSTEM ============

  // Broadcast message
  broadcastMessage: async (messageData) => {
    const response = await api.post('/admin/broadcast', messageData, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Send broadcast (alias for broadcastMessage)
  sendBroadcast: async (messageData) => {
    const response = await api.post('/admin/broadcast', messageData, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Get connected users
  getConnectedUsers: async () => {
    const response = await api.get('/admin/connected-users', {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Health check
  healthCheck: async () => {
    const response = await api.get('/admin/health', {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // ============ REAL-TIME ADMIN ENDPOINTS ============

  // Update election with real-time broadcast
  updateElectionRealTime: async (action, electionData) => {
    try {
      const response = await api.post('/dashboard/admin/update-election', {
        action,
        election_data: electionData
      }, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update election' };
    }
  },

  // Update voter with real-time broadcast
  updateVoterRealTime: async (action, voterData) => {
    try {
      const response = await api.post('/dashboard/admin/update-voter', {
        action,
        voter_data: voterData
      }, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update voter' };
    }
  },

  // Admin broadcast to all voters
  adminBroadcast: async (messageData) => {
    try {
      const response = await api.post('/dashboard/admin/broadcast', messageData, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to send broadcast' };
    }
  },

  // Get connected users info
  getConnectedUsersInfo: async () => {
    try {
      const response = await api.get('/dashboard/admin/connected-users', {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get connected users' };
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
      } else if (errorData.message?.includes('session')) {
        return 'Voting session issue. Please restart the voting process.';
      }
    }
    
    return baseMessage;
  },

  // Results-specific error handler
  handleResultsError: (error) => {
    const baseMessage = apiErrorHandler.handleError(error);
    
    // Add results-specific context
    if (error.response?.status === 403) {
      const errorData = error.response.data;
      if (errorData.message?.includes('not available') || 
          errorData.message?.includes('not published') ||
          errorData.message?.includes('not ended')) {
        return 'Election results are not available yet. Please check back after the election ends.';
      } else if (errorData.message?.includes('access denied')) {
        return 'Access denied. You may not have permission to view these results.';
      }
    } else if (error.response?.status === 404) {
      return 'Election results not found. The election may not exist or results may not be available.';
    }
    
    return baseMessage;
  },

  // Voter-specific results error handler
  handleVoterResultsError: (error) => {
    const message = apiErrorHandler.handleResultsError(error);
    const errorData = error.response?.data;
    
    return {
      message,
      reason: errorData?.reason || '',
      resultsNotAvailable: message.includes('not available'),
      election_id: errorData?.election_id
    };
  },

  // Admin-specific results error handler
  handleAdminResultsError: (error) => {
    const message = apiErrorHandler.handleResultsError(error);
    
    // Add admin-specific messaging
    if (message.includes('not available')) {
      return {
        message,
        action: 'You may need to publish the results first or check the election status.'
      };
    }
    
    return { message };
  }
};

// Results utility functions
export const resultsUtils = {
  // Check if voter can view results
  canVoterViewResults: async (electionId) => {
    try {
      const response = await voterAPI.getElectionResults(electionId);
      return response.success;
    } catch (error) {
      console.error('Error checking voter results access:', error);
      return false;
    }
  },

  // Check if admin can view results
  canAdminViewResults: async (electionId) => {
    try {
      const response = await adminAPI.getElectionResults(electionId);
      return response.success;
    } catch (error) {
      console.error('Error checking admin results access:', error);
      return false;
    }
  },

  // Get results access information
  getResultsAccessInfo: async (electionId, isAdmin = false) => {
    try {
      if (isAdmin) {
        const response = await adminAPI.getElectionResults(electionId);
        return {
          canView: response.success,
          accessLevel: 'admin',
          data: response.results
        };
      } else {
        const response = await voterAPI.getElectionResults(electionId);
        return {
          canView: response.success,
          accessLevel: 'voter',
          data: response.results,
          reason: response.access_info?.reason
        };
      }
    } catch (error) {
      console.error('Error getting results access info:', error);
      return {
        canView: false,
        accessLevel: isAdmin ? 'admin' : 'voter',
        error: error.message
      };
    }
  },

  // Format results for display
  formatResultsForDisplay: (resultsData) => {
    if (!resultsData || !resultsData.candidates) {
      return null;
    }

    const formattedResults = {
      ...resultsData,
      candidates: resultsData.candidates.map(candidate => ({
        ...candidate,
        formattedPercentage: `${candidate.percentage}%`,
        isWinner: candidate.rank === 1,
        colorClass: candidate.rank === 1 ? 'text-success' : 
                    candidate.rank === 2 ? 'text-warning' : 
                    candidate.rank === 3 ? 'text-info' : 'text-muted'
      }))
    };

    return formattedResults;
  },

  // Generate results summary text
  generateResultsSummary: (resultsData) => {
    if (!resultsData || !resultsData.candidates || resultsData.candidates.length === 0) {
      return 'No results available';
    }

    const winner = resultsData.candidates[0]; // First candidate after sorting
    const totalVotes = resultsData.total_votes;
    const turnout = resultsData.voter_turnout || 0;

    return `${winner.full_name} (${winner.party}) wins with ${winner.vote_count} votes (${winner.percentage}%) out of ${totalVotes} total votes. Voter turnout: ${turnout}%`;
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