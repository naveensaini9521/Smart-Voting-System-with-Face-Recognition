import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/home';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for consistent error handling
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

const homeAPI = {
  // Test connection
  testConnection: () => apiClient.get('/test'),
  
  // System info
  getSystemInfo: () => apiClient.get('/system-info'),
  
  // Features
  getFeatures: () => apiClient.get('/features'),
  
  // Testimonials
  getTestimonials: () => apiClient.get('/testimonials'),
  
  // Stats
  getStats: () => apiClient.get('/stats'),
  
  // Process steps
  getProcessSteps: () => apiClient.get('/process-steps'),
  
  // Technologies
  getTechnologies: () => apiClient.get('/technologies'),
  
  // FAQs
  getFAQs: () => apiClient.get('/faqs'),
  
  // Health check
  getHealth: () => apiClient.get('/health'),
  
  // Project info
  getProjectInfo: () => apiClient.get('/project-info'),
  
  // Database stats
  getDatabaseStats: () => apiClient.get('/database-stats'),
  
  // Contact form submission
  submitContact: (data) => apiClient.post('/contact', data),
  
  // Newsletter subscription
  subscribeNewsletter: (email) => apiClient.post('/newsletter', { email }),
  
  // Demo request
  requestDemo: (data) => apiClient.post('/demo-request', data),
};

export default homeAPI;