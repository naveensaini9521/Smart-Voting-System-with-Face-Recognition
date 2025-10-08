const homeAPI = {
  // Get home statistics
  getStats: async () => {
    const response = await fetch('http://localhost:5000/api/home/stats');
    return response.json();
  },

  // Get features
  getFeatures: async () => {
    const response = await fetch('http://localhost:5000/api/home/features');
    return response.json();
  },

  // Get testimonials
  getTestimonials: async () => {
    const response = await fetch('http://localhost:5000/api/home/testimonials');
    return response.json();
  },

  // Get system info
  getSystemInfo: async () => {
    const response = await fetch('http://localhost:5000/api/home/system-info');
    return response.json();
  }
};

export default homeAPI;