import axios from "axios";

// Detect if running in development or production
const BASE_URL =
  process.env.NODE_ENV === "development" ? "http://localhost:5000/api" : "/api";

// Create Axios instance
const API = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Request interceptor to attach JWT token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("authToken");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API
// export const authAPI = {
//   login: (credentials) => API.post("/auth/login", credentials).then((res) => res.data),
//   register: (userData) => API.post("/auth/register", userData).then((res) => res.data),
//   logout: () => API.post("/auth/logout").then((res) => res.data),
//   getProfile: () => API.get("/auth/profile").then((res) => res.data),
// };

// Voter API
export const voterAPI = {
  // Registration endpoints
  register: async (voterData) => {
    console.log('Sending registration data:', voterData);
    const response = await api.post('/register/register', voterData);
    return response.data;
  },
  
  uploadID: async (formData) => {
    const response = await api.post('/register/upload-id', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  
  registerFace: async (faceData) => {
    const response = await api.post('/register/register-face', faceData);
    return response.data;
  },
  
  completeRegistration: async (voterId) => {
    const response = await api.post(`/register/complete-registration/${voterId}`);
    return response.data;
  },
  
  // OTP endpoints
  sendOTP: async (otpData) => {
    const response = await api.post('/otp/send', otpData);
    return response.data;
  },
  
  verifyOTP: async (otpData) => {
    const response = await api.post('/otp/verify', otpData);
    return response.data;
  },
};


// Admin API
export const adminAPI = {
  createElection: (electionData) => API.post("/admin/elections", electionData).then((res) => res.data),
  getStats: () => API.get("/admin/stats").then((res) => res.data),
  getUsers: () => API.get("/admin/users").then((res) => res.data),
};

// OTP API (optional, can also use voterAPI)
// export const otpAPI = {
//   sendOTP: (type, value) => API.post("/otp/send", { type, value }).then((res) => res.data),
//   verifyOTP: (value, otp) => API.post("/otp/verify", { value, otp }).then((res) => res.data),
// };

export default API;
