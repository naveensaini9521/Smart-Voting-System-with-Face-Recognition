import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Voter API methods
export const voterAPI = {
  // Register new voter
  register: async (voterData) => {
    const response = await api.post('/voters/register', voterData);
    return response.data;
  },

  // Login voter
  login: async (credentials) => {
    const response = await api.post('/voters/login', credentials);
    return response.data;
  },

  // Verify face
  verifyFace: async (faceData, voterId) => {
    const response = await api.post('/voters/verify-face', {
      face_data: faceData,
      voter_id: voterId
    });
    return response.data;
  },

  // Register face
  registerFace: async (faceData, voterId) => {
    const response = await api.post('/voters/register-face', {
      face_data: faceData,
      voter_id: voterId
    });
    return response.data;
  },

  // Get voter profile
  getProfile: async (voterId) => {
    const response = await api.get(`/voters/profile/${voterId}`);
    return response.data;
  },

  // Update voter profile
  updateProfile: async (voterId, updateData) => {
    const response = await api.put(`/voters/profile/${voterId}`, updateData);
    return response.data;
  }
};

// Election API methods
export const electionAPI = {
  // Get all elections
  getElections: async () => {
    const response = await api.get('/elections');
    return response.data;
  },

  // Get specific election
  getElection: async (electionId) => {
    const response = await api.get(`/elections/${electionId}`);
    return response.data;
  },

  // Cast vote
  castVote: async (voteData) => {
    const response = await api.post('/elections/vote', voteData);
    return response.data;
  },

  // Get election results
  getResults: async (electionId) => {
    const response = await api.get(`/elections/results/${electionId}`);
    return response.data;
  }
};

// Admin API methods
export const adminAPI = {
  // Admin login
  login: async (credentials) => {
    const response = await api.post('/admin/login', credentials);
    return response.data;
  },

  // Create election
  createElection: async (electionData) => {
    const response = await api.post('/admin/elections', electionData);
    return response.data;
  },

  // Get all voters
  getVoters: async () => {
    const response = await api.get('/admin/voters');
    return response.data;
  },

  // Get election statistics
  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  }
};

export default api;