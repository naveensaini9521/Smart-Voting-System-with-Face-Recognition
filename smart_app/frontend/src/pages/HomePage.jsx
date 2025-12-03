import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Container, Row, Col, Card, Button, Badge, 
  Modal, Accordion, Spinner, Alert, Form,
  ProgressBar, Tooltip, OverlayTrigger
} from 'react-bootstrap';
import { 
  FaRegUser, FaLock, FaBolt, FaChartBar, 
  FaGlobe, FaSearch, FaStar, FaPlay,
  FaEnvelope, FaNewspaper, FaVideo,
  FaDatabase, FaServer, FaShieldAlt,
  FaCheckCircle, FaClock, FaUsers,
  FaVoteYea, FaExclamationTriangle
} from 'react-icons/fa';
import homeAPI from '../services/homeAPI.js';

const HomePage = () => {
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showNewsletterModal, setShowNewsletterModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [backendStats, setBackendStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [systemInfo, setSystemInfo] = useState(null);
  const [dynamicFeatures, setDynamicFeatures] = useState([]);
  const [dynamicTestimonials, setDynamicTestimonials] = useState([]);
  const [dynamicFAQs, setDynamicFAQs] = useState([]);
  const [dynamicProcessSteps, setDynamicProcessSteps] = useState([]);
  const [dynamicTechnologies, setDynamicTechnologies] = useState([]);
  const [apiError, setApiError] = useState("");
  const [systemHealth, setSystemHealth] = useState(null);
  const [contactForm, setContactForm] = useState({ 
    name: '', 
    email: '', 
    subject: 'General Inquiry', 
    message: '' 
  });
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [demoRequest, setDemoRequest] = useState({ 
    name: '', 
    email: '', 
    organization: '', 
    message: '' 
  });
  const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });
  const [activeFaq, setActiveFaq] = useState('0');

  useEffect(() => {
    // Auto rotate features
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 5000);

    // Fetch data from Flask backend
    fetchBackendData();

    return () => clearInterval(interval);
  }, []);

  const fetchBackendData = async () => {
    try {
      setLoading(true);
      setApiError("");
      
      console.log('Fetching backend data...');
      
      // Test connection first
      try {
        const testData = await homeAPI.testConnection();
        console.log('Test connection:', testData);
      } catch (testError) {
        console.log('Test connection failed:', testError);
      }

      // Fetch all home data in parallel
      const [statsData, featuresData, testimonialsData, systemInfoData, faqsData, processStepsData, technologiesData, healthData] = await Promise.allSettled([
        homeAPI.getStats(),
        homeAPI.getFeatures(),
        homeAPI.getTestimonials(),
        homeAPI.getSystemInfo(),
        homeAPI.getFAQs(),
        homeAPI.getProcessSteps(),
        homeAPI.getTechnologies(),
        homeAPI.getHealth()
      ]);

      // Handle successful responses
      if (statsData.status === 'fulfilled' && statsData.value.success) {
        setBackendStats(statsData.value.stats);
        console.log('Stats loaded:', statsData.value.stats);
      }

      if (featuresData.status === 'fulfilled' && featuresData.value.success) {
        setDynamicFeatures(featuresData.value.features);
        console.log('Features loaded:', featuresData.value.features.length);
      }

      if (testimonialsData.status === 'fulfilled' && testimonialsData.value.success) {
        setDynamicTestimonials(testimonialsData.value.testimonials);
        console.log('Testimonials loaded:', testimonialsData.value.testimonials.length);
      }

      if (systemInfoData.status === 'fulfilled' && systemInfoData.value.success) {
        setSystemInfo(systemInfoData.value.system_info);
        console.log('System info loaded');
      }

      if (faqsData.status === 'fulfilled' && faqsData.value.success) {
        setDynamicFAQs(faqsData.value.faqs);
        console.log('FAQs loaded:', faqsData.value.faqs.length);
      }

      if (processStepsData.status === 'fulfilled' && processStepsData.value.success) {
        setDynamicProcessSteps(processStepsData.value.process_steps);
        console.log('Process steps loaded:', processStepsData.value.process_steps.length);
      }

      if (technologiesData.status === 'fulfilled' && technologiesData.value.success) {
        setDynamicTechnologies(technologiesData.value.technologies);
        console.log('Technologies loaded:', technologiesData.value.technologies.length);
      }

      if (healthData.status === 'fulfilled' && healthData.value.success) {
        setSystemHealth(healthData.value.health);
        console.log('System health loaded');
      }

      // Check if any API calls failed
      const promises = [statsData, featuresData, testimonialsData, systemInfoData, faqsData, processStepsData];
      const failedPromises = promises.filter(p => p.status === 'rejected');
      
      if (failedPromises.length > 0) {
        console.warn(`${failedPromises.length} API calls failed`);
        if (failedPromises.length === promises.length) {
          throw new Error('All API calls failed. Please check your Flask server.');
        }
      }

    } catch (error) {
      console.error('Failed to fetch backend data:', error);
      setApiError(`Backend connection error: ${error.message}. Make sure Flask server is running on port 5000.`);
      
      // Fallback to default data
      setBackendStats({
        total_users: 157,
        total_voters: 125,
        approved_voters: 115,
        total_elections: 8,
        active_elections: 3,
        completed_elections: 4,
        upcoming_elections: 1,
        total_votes: 462,
        new_users_today: 7,
        votes_today: 28,
        system_status: 'Demo Mode',
        system_uptime: '100%',
        face_verification_accuracy: 96.5,
        average_response_time: '50ms',
        last_updated: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle contact form submission
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setSubmitStatus({ type: 'info', message: 'Submitting your message...' });
    
    try {
      const response = await homeAPI.submitContact(contactForm);
      if (response.success) {
        setSubmitStatus({ 
          type: 'success', 
          message: `${response.message} Reference: ${response.submission_id}` 
        });
        setContactForm({ name: '', email: '', subject: 'General Inquiry', message: '' });
        setTimeout(() => {
          setShowContactModal(false);
          setSubmitStatus({ type: '', message: '' });
        }, 3000);
      }
    } catch (error) {
      setSubmitStatus({ 
        type: 'danger', 
        message: error.response?.data?.message || 'Failed to submit form. Please try again.' 
      });
    }
  };

  // Handle newsletter subscription
  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    setSubmitStatus({ type: 'info', message: 'Processing subscription...' });
    
    try {
      const response = await homeAPI.subscribeNewsletter(newsletterEmail);
      if (response.success) {
        setSubmitStatus({ 
          type: 'success', 
          message: `${response.message} Welcome to our newsletter!` 
        });
        setNewsletterEmail('');
        setTimeout(() => {
          setShowNewsletterModal(false);
          setSubmitStatus({ type: '', message: '' });
        }, 3000);
      }
    } catch (error) {
      setSubmitStatus({ 
        type: 'danger', 
        message: error.response?.data?.message || 'Failed to subscribe. Please try again.' 
      });
    }
  };

  // Handle demo request
  const handleDemoRequest = async (e) => {
    e.preventDefault();
    setSubmitStatus({ type: 'info', message: 'Submitting your demo request...' });
    
    try {
      const response = await homeAPI.requestDemo(demoRequest);
      if (response.success) {
        setSubmitStatus({ 
          type: 'success', 
          message: `${response.message} We'll contact you within 48 hours.` 
        });
        setDemoRequest({ name: '', email: '', organization: '', message: '' });
        setTimeout(() => {
          setShowDemoModal(false);
          setSubmitStatus({ type: '', message: '' });
        }, 3000);
      }
    } catch (error) {
      setSubmitStatus({ 
        type: 'danger', 
        message: error.response?.data?.message || 'Failed to submit request. Please try again.' 
      });
    }
  };

  // Use dynamic data or fallback to static data
  const features = dynamicFeatures.length > 0 ? dynamicFeatures : [
    {
      'id': 1,
      'icon': '👤',
      'title': 'Face Recognition',
      'description': 'Advanced facial recognition technology for secure voter identity verification',
      'color': '#667eea',
      'status': 'active',
      'category': 'authentication',
      'demo_available': true
    },
    {
      'id': 2,
      'icon': '🔒',
      'title': 'Secure Voting',
      'description': 'End-to-end encrypted voting process with blockchain-inspired security',
      'color': '#4ecdc4',
      'status': 'active',
      'category': 'security',
      'demo_available': true
    },
    {
      'id': 3,
      'icon': '⚡',
      'title': 'Fast Process',
      'description': 'Complete voting process in under 2 minutes with real-time verification',
      'color': '#ff6b6b',
      'status': 'active',
      'category': 'performance',
      'demo_available': true
    },
    {
      'id': 4,
      'icon': '📊',
      'title': 'Live Results',
      'description': 'Real-time voting results and comprehensive analytics dashboard',
      'color': '#764ba2',
      'status': 'active',
      'category': 'analytics',
      'demo_available': true
    },
    {
      'id': 5,
      'icon': '🌐',
      'title': 'Multi-Platform',
      'description': 'Fully responsive design accessible on all devices',
      'color': '#f093fb',
      'status': 'active',
      'category': 'accessibility',
      'demo_available': true
    },
    {
      'id': 6,
      'icon': '🔍',
      'title': 'Audit Trail',
      'description': 'Complete transaction history for transparency and verification',
      'color': '#4facfe',
      'status': 'active',
      'category': 'transparency',
      'demo_available': false
    }
  ];

  const testimonials = dynamicTestimonials.length > 0 ? dynamicTestimonials : [
    {
      'id': 1,
      'name': 'Sarah Johnson',
      'role': 'Computer Science Student',
      'content': 'The face recognition feature works incredibly well! Very impressive implementation for a final year project. The UI is smooth and intuitive.',
      'avatar': '👩‍🎓',
      'rating': 5,
      'date': '2024-01-15',
      'category': 'student',
      'featured': true
    },
    {
      'id': 2,
      'name': 'Mike Chen',
      'role': 'Software Engineering Student',
      'content': 'Love the modern UI and smooth voting process. The security features give me confidence in the system. Great work!',
      'avatar': '👨‍💻',
      'rating': 5,
      'date': '2024-01-10',
      'category': 'student',
      'featured': true
    },
    {
      'id': 3,
      'name': 'Dr. Emily Rodriguez',
      'role': 'Project Guide & Professor',
      'content': 'Excellent implementation of facial recognition and secure voting mechanisms. A standout final year project that demonstrates real technical expertise!',
      'avatar': '👩‍🏫',
      'rating': 5,
      'date': '2024-01-08',
      'category': 'faculty',
      'featured': true
    }
  ];

  const processSteps = dynamicProcessSteps.length > 0 ? dynamicProcessSteps : [
    {
      'step': 1,
      'title': 'Register',
      'description': 'Create your account with basic information',
      'icon': '📝',
      'duration': '1 minute',
      'requirements': ['Email', 'Student ID', 'Basic Info']
    },
    {
      'step': 2,
      'title': 'Face Verification',
      'description': 'Register your face for secure authentication',
      'icon': '✅',
      'duration': '2 minutes',
      'requirements': ['Webcam', 'Good Lighting', 'Clear Face View']
    },
    {
      'step': 3,
      'title': 'Vote',
      'description': 'Cast your vote in active elections',
      'icon': '🗳️',
      'duration': '1 minute',
      'requirements': ['Face Verification', 'Eligibility']
    },
    {
      'step': 4,
      'title': 'Confirm',
      'description': 'Receive voting confirmation and receipt',
      'icon': '📨',
      'duration': '30 seconds',
      'requirements': ['Successful Vote']
    }
  ];

  const technologies = dynamicTechnologies.length > 0 ? dynamicTechnologies : [
    {
      'name': 'React.js',
      'icon': '⚛️',
      'category': 'frontend',
      'description': 'Modern frontend framework for building user interfaces',
      'purpose': 'User Interface',
      'version': '18.x'
    },
    {
      'name': 'Flask',
      'icon': '🐍',
      'category': 'backend',
      'description': 'Lightweight Python web framework for API development',
      'purpose': 'Backend API',
      'version': '2.3.x'
    },
    {
      'name': 'MongoDB',
      'icon': '🍃',
      'category': 'database',
      'description': 'NoSQL database for flexible data storage and management',
      'purpose': 'Data Storage',
      'version': '6.x'
    },
    {
      'name': 'Face Recognition',
      'icon': '👁️',
      'category': 'ai_ml',
      'description': 'Computer vision algorithms for facial authentication',
      'purpose': 'Identity Verification',
      'version': '1.3.x'
    },
    {
      'name': 'Bootstrap',
      'icon': '🎨',
      'category': 'frontend',
      'description': 'CSS framework for responsive design',
      'purpose': 'Styling & Layout',
      'version': '5.3.x'
    },
    {
      'name': 'JWT',
      'icon': '🔐',
      'category': 'security',
      'description': 'JSON Web Tokens for secure authentication',
      'purpose': 'Authentication',
      'version': '4.5.x'
    }
  ];

  const faqs = dynamicFAQs.length > 0 ? dynamicFAQs : [
    {
      'id': 1,
      'question': 'Is this a real voting system?',
      'answer': 'No, this is a prototype developed as a final year project for educational purposes only. It demonstrates the potential of digital voting systems with facial recognition technology.',
      'category': 'general',
      'popular': true
    },
    {
      'id': 2,
      'question': 'How does the face recognition work?',
      'answer': 'We use computer vision algorithms to detect and verify faces from webcam images. The system captures facial features and matches them against registered voter profiles for secure authentication.',
      'category': 'technology',
      'popular': true
    },
    {
      'id': 3,
      'question': 'Can I use this code for my project?',
      'answer': 'Yes, this project is open for educational purposes. Feel free to learn from the implementation and adapt it for your academic projects. Please give proper attribution.',
      'category': 'usage',
      'popular': true
    },
    {
      'id': 4,
      'question': 'What technologies are used in this project?',
      'answer': 'The project uses React.js for frontend, Flask for backend, MongoDB for database, Face Recognition API for facial authentication, Bootstrap for styling, and JWT for security.',
      'category': 'technology',
      'popular': false
    },
    {
      'id': 5,
      'question': 'Is my data secure?',
      'answer': 'In this demo version, basic security measures are implemented including encryption, secure authentication, and data protection. For production use, additional security layers would be required.',
      'category': 'security',
      'popular': false
    },
    {
      'id': 6,
      'question': 'How can I test the system?',
      'answer': 'You can register as a new user, complete the face registration process, and participate in demo elections to experience the complete voting workflow from start to finish.',
      'category': 'usage',
      'popular': true
    }
  ];

  // Dynamic stats based on backend data
  const stats = backendStats ? [
    { 
      number: backendStats.total_users || '0', 
      label: 'Registered Users', 
      icon: <FaUsers />,
      description: 'Total system users',
      trend: backendStats.new_users_today ? `+${backendStats.new_users_today} today` : ''
    },
    { 
      number: backendStats.active_elections || '0', 
      label: 'Active Elections', 
      icon: <FaVoteYea />,
      description: 'Currently running elections',
      trend: backendStats.total_elections ? `${backendStats.total_elections} total` : ''
    },
    { 
      number: backendStats.total_votes || '0', 
      label: 'Votes Cast', 
      icon: <FaCheckCircle />,
      description: 'Total votes submitted',
      trend: backendStats.votes_today ? `+${backendStats.votes_today} today` : ''
    },
    { 
      number: backendStats.face_verification_accuracy ? `${backendStats.face_verification_accuracy}%` : 'Demo', 
      label: 'Face Accuracy', 
      icon: <FaShieldAlt />,
      description: 'Face recognition accuracy rate',
      trend: backendStats.system_status || 'Demo Mode'
    }
  ] : [
    { number: '157', label: 'Registered Users', icon: <FaUsers />, description: 'Total system users', trend: '+7 today' },
    { number: '3', label: 'Active Elections', icon: <FaVoteYea />, description: 'Currently running elections', trend: '8 total' },
    { number: '462', label: 'Votes Cast', icon: <FaCheckCircle />, description: 'Total votes submitted', trend: '+28 today' },
    { number: '96.5%', label: 'Face Accuracy', icon: <FaShieldAlt />, description: 'Face recognition accuracy rate', trend: 'Demo Mode' }
  ];

  const healthStatus = systemHealth || {
    status: 'healthy',
    services: {
      mongodb: 'connected',
      api: 'operational',
      face_recognition: 'operational',
      authentication: 'operational',
      voting_service: 'operational'
    },
    version: '1.0.0',
    uptime: '99.9%'
  };

  return (
    <div style={styles.homePage}>
      {/* API Error Alert */}
      {apiError && (
        <Alert variant="warning" style={styles.alert}>
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <FaExclamationTriangle className="me-2" />
              <strong>Connection Issue:</strong> {apiError}
            </div>
            <Button 
              variant="outline-danger" 
              size="sm" 
              onClick={fetchBackendData}
              style={styles.retryButton}
            >
              <FaBolt className="me-1" /> Retry Connection
            </Button>
          </div>
        </Alert>
      )}

      {/* System Health Banner */}
      {systemHealth && (
        <Alert 
          variant={systemHealth.status === 'healthy' ? 'success' : 'warning'} 
          style={styles.healthAlert}
        >
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <FaServer className="me-2" />
              System Status: <strong>{systemHealth.status.toUpperCase()}</strong> • 
              Uptime: {systemHealth.uptime} • Version: {systemHealth.version}
            </div>
            <Badge bg={systemHealth.status === 'healthy' ? 'success' : 'warning'}>
              {Object.values(systemHealth.services).filter(s => s === 'operational').length}/
              {Object.keys(systemHealth.services).length} Services OK
            </Badge>
          </div>
        </Alert>
      )}

      {/* Hero Section */}
      <section style={styles.heroSection}>
        <Container>
          <Row className="align-items-center" style={styles.heroRow}>
            <Col lg={6} style={styles.heroText}>
              <div style={styles.projectBadge}>
                <Badge bg="light" text="dark" style={styles.badge}>
                  {systemInfo ? `${systemInfo.name} v${systemInfo.version}` : 'Smart Voting System v1.0'}
                  {apiError && ' (Offline Mode)'}
                </Badge>
                <Badge bg="info" className="ms-2">
                  Final Year Project
                </Badge>
              </div>
              <h1 style={styles.heroTitle}>
                Smart Voting System
                <br />
                <span style={styles.heroSubtitle}>with Face Recognition</span>
              </h1>
              <p style={styles.heroDescription}>
                A secure digital voting platform with facial recognition authentication. 
                Developed as a final year computer science project. 
                {systemInfo && ` ${systemInfo.description}`}
              </p>
              
              {/* Live Stats */}
              <div style={styles.statsGrid}>
                <Row>
                  {stats.map((stat, index) => (
                    <Col key={index} xs={6} md={3} className="text-center mb-3">
                      <OverlayTrigger
                        placement="top"
                        overlay={
                          <Tooltip id={`tooltip-${index}`}>
                            {stat.description}
                          </Tooltip>
                        }
                      >
                        <div style={styles.statCard}>
                          <div style={styles.statIcon}>
                            {stat.icon}
                          </div>
                          <div style={styles.statNumber}>
                            {loading ? <Spinner animation="border" size="sm" /> : stat.number}
                          </div>
                          <div style={styles.statLabel}>
                            {stat.label}
                          </div>
                          {stat.trend && (
                            <div style={styles.statTrend}>
                              <small>{stat.trend}</small>
                            </div>
                          )}
                        </div>
                      </OverlayTrigger>
                    </Col>
                  ))}
                </Row>
              </div>

              {/* Action Buttons */}
              <div style={styles.heroButtons}>
                <Button 
                  as={Link} 
                  to="/register" 
                  style={styles.btnPrimary}
                  size="lg"
                >
                  <FaPlay className="me-2" /> Try Live Demo
                </Button>
                <Button 
                  style={styles.btnSecondary}
                  size="lg"
                  onClick={() => setShowVideoModal(true)}
                >
                  <FaVideo className="me-2" /> Watch Demo
                </Button>
                <Button 
                  as={Link} 
                  to="/login" 
                  style={styles.btnOutline}
                  size="lg"
                >
                  <FaLock className="me-2" /> Admin Login
                </Button>
              </div>

              {/* Quick Action Buttons */}
              <div style={styles.quickActions}>
                <Button 
                  variant="outline-light" 
                  size="sm"
                  onClick={() => setShowContactModal(true)}
                >
                  <FaEnvelope className="me-1" /> Contact
                </Button>
                <Button 
                  variant="outline-light" 
                  size="sm"
                  onClick={() => setShowNewsletterModal(true)}
                >
                  <FaNewspaper className="me-1" /> Newsletter
                </Button>
                <Button 
                  variant="outline-light" 
                  size="sm"
                  onClick={() => setShowDemoModal(true)}
                >
                  <FaVideo className="me-1" /> Request Demo
                </Button>
              </div>
            </Col>
            
            {/* Hero Visual - SIMPLE GRID LAYOUT (NO OVERLAP) */}
            <Col lg={6} style={styles.heroVisual}>
              <Row className="g-4 justify-content-center">
                <Col xs={6} md={4}>
                  <div style={styles.gridCard}>
                    <div style={styles.cardIcon}>👤</div>
                    <h6>Face Recognition</h6>
                    <span style={styles.statusBadge}>
                      <Badge bg="success">Active</Badge>
                    </span>
                    {backendStats?.face_verification_accuracy && (
                      <div style={styles.accuracyBadge}>
                        <ProgressBar 
                          now={backendStats.face_verification_accuracy} 
                          label={`${backendStats.face_verification_accuracy}%`} 
                          style={styles.accuracyBar}
                        />
                      </div>
                    )}
                  </div>
                </Col>
                <Col xs={6} md={4}>
                  <div style={styles.gridCard}>
                    <div style={styles.cardIcon}>🔒</div>
                    <h6>Secure Voting</h6>
                    <span style={styles.statusBadge}>
                      <Badge bg="success">Encrypted</Badge>
                    </span>
                    <div style={styles.securityInfo}>
                      <small>End-to-end encryption</small>
                    </div>
                  </div>
                </Col>
                <Col xs={6} md={4}>
                  <div style={styles.gridCard}>
                    <div style={styles.cardIcon}>⚡</div>
                    <h6>Fast Process</h6>
                    <span style={styles.statusBadge}>
                      <Badge bg="success">Quick</Badge>
                    </span>
                    {backendStats?.average_response_time && (
                      <div style={styles.speedInfo}>
                        <small>{backendStats.average_response_time} avg</small>
                      </div>
                    )}
                  </div>
                </Col>
              </Row>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Features Section */}
      <section style={styles.featuresSection}>
        <Container>
          <Row className="text-center" style={styles.sectionHeader}>
            <Col>
              <h2 style={styles.sectionTitle}>Core Features</h2>
              <p style={styles.sectionSubtitle}>Advanced features for secure digital voting</p>
            </Col>
          </Row>
          
          <Row style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <Col lg={4} md={6} key={feature.id || index} style={styles.featureCol}>
                <Card style={{
                  ...styles.featureCard,
                  borderLeft: `4px solid ${feature.color}`,
                  transform: activeFeature === index ? 'translateY(-5px) scale(1.02)' : 'none',
                  transition: 'all 0.3s ease'
                }}>
                  <Card.Body style={styles.featureCardBody}>
                    <div style={{...styles.featureIcon, color: feature.color}}>
                      <span style={{fontSize: '2.5rem'}}>{feature.icon}</span>
                    </div>
                    <Card.Title style={styles.featureTitle}>
                      {feature.title}
                      {feature.demo_available && (
                        <Badge bg="info" className="ms-2">Demo Available</Badge>
                      )}
                    </Card.Title>
                    <Card.Text style={styles.featureText}>{feature.description}</Card.Text>
                    <div style={styles.featureMeta}>
                      <Badge bg="light" text="dark">{feature.category}</Badge>
                      <Badge bg={feature.status === 'active' ? 'success' : 'warning'}>
                        {feature.status}
                      </Badge>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Process Section */}
      <section style={styles.processSection}>
        <Container>
          <Row className="text-center" style={styles.sectionHeader}>
            <Col>
              <h2 style={styles.sectionTitle}>Voting Process</h2>
              <p style={styles.sectionSubtitle}>Simple and secure voting in 4 easy steps</p>
            </Col>
          </Row>
          
          <Row style={styles.processSteps}>
            {processSteps.map((step, index) => (
              <Col lg={3} md={6} key={step.step || index} style={styles.stepCol}>
                <div style={styles.processStep}>
                  <div style={styles.stepNumber}>{step.step}</div>
                  <div style={styles.stepIcon}>
                    <span style={{fontSize: '2.5rem'}}>{step.icon}</span>
                  </div>
                  <h5 style={styles.stepTitle}>{step.title}</h5>
                  <p style={styles.stepDescription}>{step.description}</p>
                  <div style={styles.stepDetails}>
                    <small><FaClock className="me-1" /> {step.duration}</small>
                    <div style={styles.requirements}>
                      {step.requirements?.map((req, i) => (
                        <Badge key={i} bg="light" text="dark" className="me-1">{req}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Technology Stack Section */}
      <section style={styles.techSection}>
        <Container>
          <Row className="text-center" style={styles.sectionHeader}>
            <Col>
              <h2 style={styles.sectionTitle}>Technology Stack</h2>
              <p style={styles.sectionSubtitle}>Modern technologies powering this project</p>
            </Col>
          </Row>
          
          <Row style={styles.techGrid}>
            {technologies.map((tech, index) => (
              <Col lg={2} md={4} sm={6} key={index} style={styles.techItem}>
                <div style={styles.techCard}>
                  <div style={styles.techIcon}>
                    <span style={{fontSize: '2.5rem'}}>{tech.icon}</span>
                  </div>
                  <h6 style={styles.techTitle}>{tech.name}</h6>
                  <small style={styles.techCategory}>{tech.category}</small>
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Tooltip>
                        {tech.description}
                        <br />
                        <strong>Purpose:</strong> {tech.purpose}
                        <br />
                        <strong>Version:</strong> {tech.version}
                      </Tooltip>
                    }
                  >
                    <div style={styles.techInfo}>
                      <FaSearch />
                    </div>
                  </OverlayTrigger>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Testimonials Section */}
      <section style={styles.testimonialsSection}>
        <Container>
          <Row className="text-center" style={styles.sectionHeader}>
            <Col>
              <h2 style={styles.sectionTitle}>User Testimonials</h2>
              <p style={styles.sectionSubtitle}>What students and faculty are saying</p>
            </Col>
          </Row>
          
          <Row style={styles.testimonialsGrid}>
            {testimonials.map((testimonial, index) => (
              <Col lg={4} md={6} key={testimonial.id || index} style={styles.testimonialCol}>
                <Card style={styles.testimonialCard}>
                  <Card.Body style={styles.testimonialCardBody}>
                    <div style={styles.quote}>"</div>
                    <Card.Text style={styles.testimonialText}>
                      {testimonial.content}
                    </Card.Text>
                    <div style={styles.rating}>
                      {[...Array(5)].map((_, i) => (
                        <FaStar 
                          key={i} 
                          style={{ 
                            color: i < testimonial.rating ? '#ffc107' : '#e4e5e9',
                            marginRight: 2 
                          }} 
                        />
                      ))}
                    </div>
                    <div style={styles.testimonialAuthor}>
                      <div style={styles.authorAvatar}>
                        <span style={{fontSize: '2rem'}}>{testimonial.avatar}</span>
                      </div>
                      <div style={styles.authorInfo}>
                        <strong style={styles.authorName}>{testimonial.name}</strong>
                        <div style={styles.authorRole}>{testimonial.role}</div>
                        <div style={styles.authorCategory}>
                          <Badge bg="light" text="dark">{testimonial.category}</Badge>
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* FAQ Section */}
      <section style={styles.faqSection}>
        <Container>
          <Row className="text-center" style={styles.sectionHeader}>
            <Col>
              <h2 style={styles.sectionTitle}>Frequently Asked Questions</h2>
              <p style={styles.sectionSubtitle}>Common questions about this project</p>
            </Col>
          </Row>
          
          <Row>
            <Col lg={8} className="mx-auto">
              <Accordion activeKey={activeFaq} onSelect={(key) => setActiveFaq(key)}>
                {faqs.map((faq, index) => (
                  <Accordion.Item key={faq.id || index} eventKey={index.toString()}>
                    <Accordion.Header>
                      {faq.question}
                      {faq.popular && (
                        <Badge bg="info" className="ms-2">Popular</Badge>
                      )}
                    </Accordion.Header>
                    <Accordion.Body>
                      {faq.answer}
                      <div className="mt-2">
                        <Badge bg="light" text="dark">{faq.category}</Badge>
                      </div>
                    </Accordion.Body>
                  </Accordion.Item>
                ))}
              </Accordion>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Footer CTA */}
      <section style={styles.ctaSection}>
        <Container>
          <Row className="text-center">
            <Col>
              <h2 style={styles.ctaTitle}>Ready to Explore the Demo?</h2>
              <p style={styles.ctaSubtitle}>
                Experience the future of secure digital voting with facial recognition technology
              </p>
              
              <div style={styles.ctaStats}>
                <Row>
                  <Col md={3}>
                    <div style={styles.ctaStat}>
                      <h3 style={styles.ctaStatNumber}>{backendStats?.total_users || '157'}+</h3>
                      <p style={styles.ctaStatLabel}>Registered Users</p>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div style={styles.ctaStat}>
                      <h3 style={styles.ctaStatNumber}>{backendStats?.total_votes || '462'}+</h3>
                      <p style={styles.ctaStatLabel}>Votes Cast</p>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div style={styles.ctaStat}>
                      <h3 style={styles.ctaStatNumber}>{backendStats?.face_verification_accuracy || '96.5'}%</h3>
                      <p style={styles.ctaStatLabel}>Face Accuracy</p>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div style={styles.ctaStat}>
                      <h3 style={styles.ctaStatNumber}>24/7</h3>
                      <p style={styles.ctaStatLabel}>System Uptime</p>
                    </div>
                  </Col>
                </Row>
              </div>

              <div style={styles.ctaButtons}>
                <Button 
                  as={Link} 
                  to="/register" 
                  style={styles.btnPrimaryLarge}
                  size="lg"
                >
                  <FaPlay className="me-2" /> Start Live Demo
                </Button>
                <Button 
                  style={styles.btnOutlineLarge}
                  size="lg"
                  onClick={() => setShowDemoModal(true)}
                >
                  <FaVideo className="me-2" /> Request Private Demo
                </Button>
              </div>
              
              <div style={styles.projectInfo}>
                <p style={styles.projectInfoText}>
                  <FaStar className="me-2" />
                  Final Year Project • Computer Science • 2024
                </p>
                <p style={styles.projectInfoText}>
                  Developed by {systemInfo?.developers?.[0] || 'Your Name'} | 
                  Guided by {systemInfo?.guide || 'Professor Name'} | 
                  Department of {systemInfo?.department || 'Computer Science'}
                </p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Demo Video Modal */}
      <Modal 
        show={showVideoModal} 
        onHide={() => setShowVideoModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaVideo className="me-2" /> System Demonstration
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={styles.demoPlaceholder}>
            <div style={styles.demoIcon}>
              <FaVideo style={{fontSize: '4rem', color: '#667eea'}} />
            </div>
            <h5>System Demonstration</h5>
            <p>This would show a video demo of the voting system in action.</p>
            <div className="text-center">
              <Button variant="primary" className="me-2">
                <FaPlay className="me-2" /> Play Demo Video
              </Button>
              <Button 
                variant="outline-primary"
                onClick={() => setShowDemoModal(true)}
              >
                Request Full Demo
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      {/* Contact Modal */}
      <Modal show={showContactModal} onHide={() => setShowContactModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaEnvelope className="me-2" /> Contact Us
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleContactSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Name *</Form.Label>
              <Form.Control
                type="text"
                value={contactForm.name}
                onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                required
                placeholder="Enter your name"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Email *</Form.Label>
              <Form.Control
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                required
                placeholder="Enter your email"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Subject</Form.Label>
              <Form.Select
                value={contactForm.subject}
                onChange={(e) => setContactForm({...contactForm, subject: e.target.value})}
              >
                <option value="General Inquiry">General Inquiry</option>
                <option value="Technical Support">Technical Support</option>
                <option value="Project Inquiry">Project Inquiry</option>
                <option value="Collaboration">Collaboration</option>
                <option value="Other">Other</option>
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Message *</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={contactForm.message}
                onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                required
                placeholder="Enter your message..."
              />
            </Form.Group>
            
            {submitStatus.message && (
              <Alert variant={submitStatus.type} className="mt-3">
                {submitStatus.message}
              </Alert>
            )}
            
            <div className="d-grid gap-2">
              <Button variant="primary" type="submit" disabled={submitStatus.type === 'info'}>
                {submitStatus.type === 'info' ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Sending...
                  </>
                ) : (
                  'Send Message'
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Newsletter Modal */}
      <Modal show={showNewsletterModal} onHide={() => setShowNewsletterModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaNewspaper className="me-2" /> Subscribe to Newsletter
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleNewsletterSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Email Address *</Form.Label>
              <Form.Control
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Enter your email address"
                required
              />
              <Form.Text className="text-muted">
                We'll send you updates about the project and new features.
              </Form.Text>
            </Form.Group>
            
            {submitStatus.message && (
              <Alert variant={submitStatus.type} className="mt-3">
                {submitStatus.message}
              </Alert>
            )}
            
            <div className="d-grid gap-2">
              <Button variant="primary" type="submit" disabled={submitStatus.type === 'info'}>
                {submitStatus.type === 'info' ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Subscribing...
                  </>
                ) : (
                  'Subscribe Now'
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Demo Request Modal */}
      <Modal show={showDemoModal} onHide={() => setShowDemoModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaVideo className="me-2" /> Request a Demo
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleDemoRequest}>
            <Form.Group className="mb-3">
              <Form.Label>Name *</Form.Label>
              <Form.Control
                type="text"
                value={demoRequest.name}
                onChange={(e) => setDemoRequest({...demoRequest, name: e.target.value})}
                required
                placeholder="Enter your full name"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Email *</Form.Label>
              <Form.Control
                type="email"
                value={demoRequest.email}
                onChange={(e) => setDemoRequest({...demoRequest, email: e.target.value})}
                required
                placeholder="Enter your email"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Organization *</Form.Label>
              <Form.Control
                type="text"
                value={demoRequest.organization}
                onChange={(e) => setDemoRequest({...demoRequest, organization: e.target.value})}
                required
                placeholder="Enter your organization/college"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Additional Message (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={demoRequest.message}
                onChange={(e) => setDemoRequest({...demoRequest, message: e.target.value})}
                placeholder="Any specific requirements or questions?"
              />
            </Form.Group>
            
            {submitStatus.message && (
              <Alert variant={submitStatus.type} className="mt-3">
                {submitStatus.message}
              </Alert>
            )}
            
            <div className="d-grid gap-2">
              <Button variant="primary" type="submit" disabled={submitStatus.type === 'info'}>
                {submitStatus.type === 'info' ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Submitting...
                  </>
                ) : (
                  'Request Demo'
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        /*.floating {
          animation: float 3s ease-in-out infinite;
        } */
        
        .stat-card:hover {
          transform: translateY(-5px);
          transition: transform 0.3s ease;
        }
        
        .feature-card:hover {
          box-shadow: 0 15px 35px rgba(0,0,0,0.1) !important;
        }
      `}</style>
    </div>
  );
};

// All styles moved to JavaScript object
const styles = {
  homePage: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    overflowX: 'hidden' // Prevent horizontal scroll
  },
  
  alert: {
    margin: 0,
    borderRadius: 0,
    padding: '15px 20px',
    border: 'none'
  },
  
  retryButton: {
    minWidth: '150px'
  },
  
  healthAlert: {
    margin: 0,
    borderRadius: 0,
    padding: '10px 20px',
    fontSize: '0.9rem'
  },
  
  // Hero Section Styles - Updated for better layout
  heroSection: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '80px 0 80px', // Increased bottom padding
    position: 'relative',
    overflow: 'hidden'
  },
  
  heroRow: {
    minHeight: 'auto',
    position: 'relative',
    zIndex: 2
  },
  
  heroText: {
    padding: '40px 0'
  },
  
  projectBadge: {
    marginBottom: '30px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap'
  },
  
  badge: {
    fontSize: '0.9rem',
    padding: '8px 16px',
    fontWeight: '500'
  },
  
  heroTitle: {
    fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
    fontWeight: '800',
    marginBottom: '20px',
    lineHeight: '1.2'
  },
  
  heroSubtitle: {
    fontSize: 'clamp(1.5rem, 3vw, 2rem)',
    fontWeight: '300',
    opacity: 0.9
  },
  
  heroDescription: {
    fontSize: '1.1rem',
    marginBottom: '40px',
    opacity: 0.9,
    maxWidth: '90%'
  },
  
  statsGrid: {
    margin: '40px 0',
    padding: '20px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '15px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  },
  
  statCard: {
    padding: '15px',
    borderRadius: '10px',
    background: 'rgba(255, 255, 255, 0.15)',
    transition: 'all 0.3s ease',
    height: '100%',
    cursor: 'pointer'
  },
  
  statIcon: {
    fontSize: '1.5rem',
    marginBottom: '10px',
    opacity: 0.8
  },
  
  statNumber: {
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '5px',
    minHeight: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  statLabel: {
    fontSize: '0.9rem',
    opacity: 0.9,
    marginBottom: '5px'
  },
  
  statTrend: {
    fontSize: '0.8rem',
    opacity: 0.7
  },
  
  heroButtons: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap',
    marginBottom: '20px'
  },
  
  quickActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  
  btnPrimary: {
    background: '#ff6b6b',
    border: 'none',
    padding: '15px 30px',
    borderRadius: '10px',
    fontWeight: '600',
    fontSize: '1rem',
    transition: 'all 0.3s ease',
    '&:hover': {
      background: '#ff5252',
      transform: 'translateY(-2px)'
    }
  },
  
  btnSecondary: {
    background: '#4ecdc4',
    border: 'none',
    padding: '15px 30px',
    borderRadius: '10px',
    fontWeight: '600',
    fontSize: '1rem',
    transition: 'all 0.3s ease',
    '&:hover': {
      background: '#3dbbb3',
      transform: 'translateY(-2px)'
    }
  },
  
  btnOutline: {
    background: 'transparent',
    border: '2px solid rgba(255, 255, 255, 0.5)',
    color: 'white',
    padding: '15px 30px',
    borderRadius: '10px',
    fontWeight: '600',
    fontSize: '1rem',
    transition: 'all 0.3s ease',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'white',
      transform: 'translateY(-2px)'
    }
  },
  
  // Hero Visual Styles - COMPLETELY FIXED to prevent overlap
  heroVisual: {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: '20px',
  padding: '20px 0'
  },

  gridCard: {
    background: 'white',
    color: '#333',
    padding: '25px 15px',
    borderRadius: '15px',
    textAlign: 'center',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    transition: 'all 0.3s ease',
    height: '100%',
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-10px)',
      boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
    }
  },

  cardIcon: {
    fontSize: '2.5rem',
    marginBottom: '15px'
  },

  statusBadge: {
    marginTop: '10px',
    display: 'block'
  },

  accuracyBadge: {
    marginTop: '15px'
  },

  accuracyBar: {
    height: '8px',
    borderRadius: '4px'
  },

  securityInfo: {
    marginTop: '10px',
    fontSize: '0.8rem',
    color: '#666'
  },

  speedInfo: {
    marginTop: '10px',
    fontSize: '0.8rem',
    color: '#666'
  },
    
  cardIcon: {
    fontSize: '2.5rem',
    marginBottom: '15px'
  },
  
  statusBadge: {
    marginTop: '10px',
    display: 'block'
  },
  
  accuracyBadge: {
    marginTop: '15px'
  },
  
  accuracyBar: {
    height: '8px',
    borderRadius: '4px'
  },
  
  securityInfo: {
    marginTop: '10px',
    fontSize: '0.8rem',
    color: '#666'
  },
  
  speedInfo: {
    marginTop: '10px',
    fontSize: '0.8rem',
    color: '#666'
  },
  
  // Section Common Styles
  sectionHeader: {
    marginBottom: '60px'
  },
  
  sectionTitle: {
    fontSize: '2.8rem',
    fontWeight: '700',
    marginBottom: '15px',
    color: '#333',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  
  sectionSubtitle: {
    fontSize: '1.2rem',
    color: '#666',
    maxWidth: '600px',
    margin: '0 auto'
  },
  
  // Features Section
  featuresSection: {
    padding: '100px 0',
    background: '#f8fafc'
  },
  
  featuresGrid: {
    margin: '0 -15px'
  },
  
  featureCol: {
    marginBottom: '30px'
  },
  
  featureCard: {
    border: 'none',
    borderRadius: '15px',
    transition: 'all 0.3s ease',
    height: '100%',
    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
    '&:hover': {
      transform: 'translateY(-10px)',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
    }
  },
  
  featureCardBody: {
    padding: '35px 25px',
    textAlign: 'center'
  },
  
  featureIcon: {
    marginBottom: '25px',
    fontSize: '2.5rem'
  },
  
  featureTitle: {
    color: '#333',
    marginBottom: '15px',
    fontSize: '1.3rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  featureText: {
    color: '#666',
    lineHeight: 1.6,
    fontSize: '0.95rem',
    marginBottom: '20px'
  },
  
  featureMeta: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginTop: '15px'
  },
  
  // Process Section
  processSection: {
    padding: '100px 0',
    background: 'white'
  },
  
  processSteps: {
    margin: '0 -15px'
  },
  
  stepCol: {
    marginBottom: '30px'
  },
  
  processStep: {
    textAlign: 'center',
    padding: '30px 20px',
    background: '#f8fafc',
    borderRadius: '15px',
    height: '100%',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: '0 15px 30px rgba(0,0,0,0.08)'
    }
  },
  
  stepNumber: {
    width: '40px',
    height: '40px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    margin: '0 auto 20px',
    fontSize: '1.1rem'
  },
  
  stepIcon: {
    marginBottom: '20px'
  },
  
  stepTitle: {
    color: '#333',
    marginBottom: '15px',
    fontWeight: '600'
  },
  
  stepDescription: {
    color: '#666',
    marginBottom: '15px',
    fontSize: '0.95rem'
  },
  
  stepDetails: {
    marginTop: '20px',
    paddingTop: '15px',
    borderTop: '1px solid #eee'
  },
  
  requirements: {
    marginTop: '10px',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '5px'
  },
  
  // Technology Section
  techSection: {
    padding: '100px 0',
    background: '#f8fafc'
  },
  
  techGrid: {
    margin: '0 -10px'
  },
  
  techItem: {
    marginBottom: '30px',
    padding: '0 10px'
  },
  
  techCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px 15px',
    textAlign: 'center',
    boxShadow: '0 5px 15px rgba(0,0,0,0.05)',
    transition: 'all 0.3s ease',
    height: '100%',
    position: 'relative',
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
    }
  },
  
  techIcon: {
    marginBottom: '15px'
  },
  
  techTitle: {
    color: '#333',
    marginBottom: '5px',
    fontWeight: '600'
  },
  
  techCategory: {
    color: '#667eea',
    fontSize: '0.8rem',
    fontWeight: '500'
  },
  
  techInfo: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    color: '#999',
    cursor: 'help',
    fontSize: '0.9rem'
  },
  
  // Testimonials Section
  testimonialsSection: {
    padding: '100px 0',
    background: 'white'
  },
  
  testimonialsGrid: {
    margin: '0 -15px'
  },
  
  testimonialCol: {
    marginBottom: '30px'
  },
  
  testimonialCard: {
    border: 'none',
    borderRadius: '15px',
    boxShadow: '0 15px 35px rgba(0,0,0,0.08)',
    height: '100%',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: '0 20px 40px rgba(0,0,0,0.12)'
    }
  },
  
  testimonialCardBody: {
    padding: '35px 30px',
    position: 'relative'
  },
  
  quote: {
    fontSize: '4rem',
    color: '#667eea',
    marginBottom: '20px',
    opacity: 0.2,
    lineHeight: 1
  },
  
  testimonialText: {
    fontStyle: 'italic',
    color: '#333',
    lineHeight: 1.6,
    fontSize: '0.95rem',
    marginBottom: '20px'
  },
  
  rating: {
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'center'
  },
  
  testimonialAuthor: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '25px'
  },
  
  authorAvatar: {
    marginRight: '15px'
  },
  
  authorInfo: {
    textAlign: 'left'
  },
  
  authorName: {
    color: '#333',
    fontWeight: '600'
  },
  
  authorRole: {
    color: '#666',
    fontSize: '0.9rem',
    marginBottom: '5px'
  },
  
  authorCategory: {
    fontSize: '0.8rem'
  },
  
  // FAQ Section
  faqSection: {
    padding: '100px 0',
    background: '#f8fafc'
  },
  
  // CTA Section
  ctaSection: {
    padding: '100px 0',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    textAlign: 'center'
  },
  
  ctaTitle: {
    fontSize: '3rem',
    marginBottom: '15px',
    fontWeight: '700'
  },
  
  ctaSubtitle: {
    fontSize: '1.3rem',
    marginBottom: '50px',
    opacity: 0.9,
    maxWidth: '700px',
    margin: '0 auto 50px'
  },
  
  ctaStats: {
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '15px',
    padding: '30px',
    margin: '40px auto',
    maxWidth: '800px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  },
  
  ctaStat: {
    padding: '15px'
  },
  
  ctaStatNumber: {
    fontSize: '2.5rem',
    fontWeight: '700',
    marginBottom: '5px'
  },
  
  ctaStatLabel: {
    opacity: 0.8,
    fontSize: '0.9rem'
  },
  
  ctaButtons: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: '40px'
  },
  
  btnPrimaryLarge: {
    background: '#ff6b6b',
    border: 'none',
    padding: '18px 35px',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: '1.1rem',
    transition: 'all 0.3s ease',
    '&:hover': {
      background: '#ff5252',
      transform: 'translateY(-2px)'
    }
  },
  
  btnOutlineLarge: {
    background: 'transparent',
    border: '2px solid rgba(255, 255, 255, 0.5)',
    color: 'white',
    padding: '18px 35px',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: '1.1rem',
    transition: 'all 0.3s ease',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'white',
      transform: 'translateY(-2px)'
    }
  },
  
  projectInfo: {
    borderTop: '1px solid rgba(255,255,255,0.3)',
    paddingTop: '30px',
    marginTop: '30px',
    opacity: 0.8
  },
  
  projectInfoText: { 
    marginBottom: '10px',
    fontSize: '0.95rem'
  },
  
  // Demo Modal
  demoPlaceholder: {
    textAlign: 'center',
    padding: '40px 20px'
  },
  
  demoIcon: {
    marginBottom: '20px'
  }
};

export default HomePage;