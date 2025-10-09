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
export const authAPI = {
  login: (credentials) => API.post("/auth/login", credentials).then((res) => res.data),
  register: (userData) => API.post("/auth/register", userData).then((res) => res.data),
  logout: () => API.post("/auth/logout").then((res) => res.data),
  getProfile: () => API.get("/auth/profile").then((res) => res.data),
};

// Voter API
export const voterAPI = {
  register: (data) => API.post("/voter/register", data).then((res) => res.data),
  sendOTP: (type, value) => API.post("/otp/send", { type, value }).then((res) => res.data),
  verifyOTP: (value, otp) => API.post("/otp/verify", { value, otp }).then((res) => res.data),
  registerFace: (voterId, image) => API.post("/face/register", { voter_id: voterId, image }).then((res) => res.data),
  getElections: () => API.get("/voter/elections").then((res) => res.data),
  castVote: (voteData) => API.post("/voter/vote", voteData).then((res) => res.data),
};

// Admin API
export const adminAPI = {
  createElection: (electionData) => API.post("/admin/elections", electionData).then((res) => res.data),
  getStats: () => API.get("/admin/stats").then((res) => res.data),
  getUsers: () => API.get("/admin/users").then((res) => res.data),
};

// OTP API (optional, can also use voterAPI)
export const otpAPI = {
  sendOTP: (type, value) => API.post("/otp/send", { type, value }).then((res) => res.data),
  verifyOTP: (value, otp) => API.post("/otp/verify", { value, otp }).then((res) => res.data),
};

export default API;
