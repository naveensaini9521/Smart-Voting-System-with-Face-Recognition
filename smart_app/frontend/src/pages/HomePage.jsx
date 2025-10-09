import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Badge, Modal, Accordion, Spinner, Alert } from 'react-bootstrap';
import homeAPI from '../services/homeAPI.js';

const HomePage = () => {
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [backendStats, setBackendStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [systemInfo, setSystemInfo] = useState(null);
  const [dynamicFeatures, setDynamicFeatures] = useState([]);
  const [dynamicTestimonials, setDynamicTestimonials] = useState([]);
  const [apiError, setApiError] = useState("");

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
        const testResponse = await fetch('http://localhost:5000/api/home/test');
        const testData = await testResponse.json();
        console.log('Test connection:', testData);
      } catch (testError) {
        console.log('Test connection failed, continuing with other endpoints...');
      }

      // Fetch all home data in parallel
      const [statsResponse, featuresResponse, testimonialsResponse, systemInfoResponse] = await Promise.all([
        homeAPI.getStats(),
        homeAPI.getFeatures(),
        homeAPI.getTestimonials(),
        homeAPI.getSystemInfo()
      ]);

      console.log('API Responses:', {
        stats: statsResponse,
        features: featuresResponse,
        testimonials: testimonialsResponse,
        systemInfo: systemInfoResponse
      });

      if (statsResponse.success) {
        setBackendStats(statsResponse.stats);
      } else {
        throw new Error(statsResponse.message || 'Failed to fetch stats');
      }

      if (featuresResponse.success) {
        setDynamicFeatures(featuresResponse.features);
      }

      if (testimonialsResponse.success) {
        setDynamicTestimonials(testimonialsResponse.testimonials);
      }

      if (systemInfoResponse.success) {
        setSystemInfo(systemInfoResponse.system_info);
      }

    } catch (error) {
      console.error('Failed to fetch backend data:', error);
      setApiError(`Backend connection failed: ${error.message}. Make sure Flask server is running on port 5000.`);
      
      // Fallback to default data
      setBackendStats({
        total_users: 0,
        total_elections: 0,
        active_elections: 0,
        total_votes: 0,
        system_status: 'Demo'
      });
    } finally {
      setLoading(false);
    }
  };

  // Use dynamic data or fallback to static data
  const features = dynamicFeatures.length > 0 ? dynamicFeatures : [
    {
      icon: '👤',
      title: 'Face Recognition',
      description: 'Verify voter identity using facial recognition technology',
      color: '#667eea'
    },
    {
      icon: '🔒',
      title: 'Secure Voting',
      description: 'Your vote is encrypted and stored securely',
      color: '#4ecdc4'
    },
    {
      icon: '⚡',
      title: 'Fast Process',
      description: 'Complete voting in just a few minutes',
      color: '#ff6b6b'
    },
    {
      icon: '📊',
      title: 'Live Results',
      description: 'See real-time voting results and analytics',
      color: '#764ba2'
    }
  ];

  const testimonials = dynamicTestimonials.length > 0 ? dynamicTestimonials : [
    {
      name: "Student User 1",
      role: "University Student",
      content: "Very easy to use and understand. Great project!",
      avatar: "👩‍🎓"
    },
    {
      name: "Student User 2",
      role: "College Student",
      content: "The face recognition works surprisingly well.",
      avatar: "👨‍🎓"
    },
    {
      name: "Project Guide",
      role: "Professor",
      content: "Impressive implementation for a final year project.",
      avatar: "👨‍🏫"
    }
  ];

  // Dynamic stats based on backend data
  const stats = backendStats ? [
    { number: backendStats.total_users || '0', label: 'Registered Users', icon: '👥' },
    { number: backendStats.active_elections || '0', label: 'Active Elections', icon: '🗳️' },
    { number: backendStats.total_votes || '0', label: 'Votes Cast', icon: '✅' },
    { number: backendStats.system_status || 'Demo', label: 'System Status', icon: '🔧' }
  ] : [
    { number: '0', label: 'Registered Users', icon: '👥' },
    { number: '0', label: 'Active Elections', icon: '🗳️' },
    { number: '0', label: 'Votes Cast', icon: '✅' },
    { number: 'Demo', label: 'System Status', icon: '🔧' }
  ];

  const processSteps = [
    { step: 1, title: 'Register', description: 'Create your account', icon: '📝' },
    { step: 2, title: 'Verify', description: 'Face verification', icon: '✅' },
    { step: 3, title: 'Vote', description: 'Cast your vote', icon: '🗳️' },
    { step: 4, title: 'Confirm', description: 'Get confirmation', icon: '📨' }
  ];

  return (
    <div style={styles.homePage}>
      {/* API Error Alert */}
      {apiError && (
        <Alert variant="warning" style={styles.alert}>
          <strong>Connection Issue:</strong> {apiError}
          <div>
            <Button variant="outline-danger" size="sm" onClick={fetchBackendData} className="mt-2">
              Retry Connection
            </Button>
          </div>
        </Alert>
      )}

      {/* Hero Section */}
      <section style={styles.heroSection}>
        <Container>
          <Row className="align-items-center" style={styles.heroRow}>
            <Col lg={6} style={styles.heroText}>
              <div style={styles.projectBadge}>
                {systemInfo ? `${systemInfo.name} v${systemInfo.version}` : 'Smart Voting System v1.0'}
                {apiError && ' (Offline Mode)'}
              </div>
              <h1 style={styles.heroTitle}>
                Smart Voting System
              </h1>
              <p style={styles.heroDescription}>
                A secure digital voting platform with facial recognition authentication. 
                Developed as a final year computer science project.
              </p>
              
              <div style={styles.statsGrid}>
                <Row>
                  {stats.map((stat, index) => (
                    <Col key={index} className="text-center">
                      <div style={styles.statNumber}>
                        {loading ? <Spinner animation="border" size="sm" /> : stat.number}
                      </div>
                      <div style={styles.statLabel}>
                        <span style={styles.statIcon}>{stat.icon}</span>
                        {stat.label}
                      </div>
                    </Col>
                  ))}
                </Row>
              </div>

              <div style={styles.heroButtons}>
                <Button 
                  as={Link} 
                  to="/register" 
                  style={styles.btnPrimary}
                >
                  🚀 Try Demo
                </Button>
                <Button 
                  style={styles.btnSecondary}
                  onClick={() => setShowVideoModal(true)}
                >
                  📺 See Demo
                </Button>
                <Button 
                  as={Link} 
                  to="/login" 
                  style={styles.btnOutline}
                >
                  🔑 Admin Login
                </Button>
              </div>
            </Col>
            
            <Col lg={6} style={styles.heroVisual}>
              <div style={styles.mainVisual}>
                <div style={{...styles.visualCard, ...styles.card1}}>
                  <div style={styles.cardIcon}>👤</div>
                  <h6>Face Login</h6>
                  <span style={styles.statusBadge}>Active</span>
                </div>
                <div style={{...styles.visualCard, ...styles.card2}}>
                  <div style={styles.cardIcon}>🔒</div>
                  <h6>Secure</h6>
                  <span style={styles.statusBadge}>Encrypted</span>
                </div>
                <div style={{...styles.visualCard, ...styles.card3}}>
                  <div style={styles.cardIcon}>⚡</div>
                  <h6>Fast</h6>
                  <span style={styles.statusBadge}>Quick</span>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Features Section */}
      <section style={styles.featuresSection}>
        <Container>
          <Row className="text-center" style={styles.sectionHeader}>
            <Col>
              <h2 style={styles.sectionTitle}>How It Works</h2>
              <p style={styles.sectionSubtitle}>Simple and secure voting process</p>
            </Col>
          </Row>
          
          <Row style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <Col lg={3} md={6} key={index} style={styles.featureCol}>
                <Card style={{
                  ...styles.featureCard,
                  transform: activeFeature === index ? 'translateY(-5px)' : 'none',
                  boxShadow: activeFeature === index ? '0 10px 25px rgba(0,0,0,0.15)' : '0 5px 15px rgba(0,0,0,0.08)'
                }}>
                  <Card.Body style={styles.featureCardBody}>
                    <div style={{...styles.featureIcon, backgroundColor: `${feature.color || '#667eea'}20`}}>
                      {feature.icon}
                    </div>
                    <Card.Title style={styles.featureTitle}>{feature.title}</Card.Title>
                    <Card.Text style={styles.featureText}>{feature.description}</Card.Text>
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
              <p style={styles.sectionSubtitle}>Four simple steps to cast your vote</p>
            </Col>
          </Row>
          
          <Row style={styles.processSteps}>
            {processSteps.map((step, index) => (
              <Col lg={3} md={6} key={index} style={styles.stepCol}>
                <div style={styles.processStep}>
                  <div style={styles.stepNumber}>{step.step}</div>
                  <div style={styles.stepIcon}>{step.icon}</div>
                  <h5 style={styles.stepTitle}>{step.title}</h5>
                  <p style={styles.stepDescription}>{step.description}</p>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Technology Section */}
      <section style={styles.techSection}>
        <Container>
          <Row className="text-center" style={styles.sectionHeader}>
            <Col>
              <h2 style={styles.sectionTitle}>Technologies Used</h2>
              <p style={styles.sectionSubtitle}>Modern web technologies implemented in this project</p>
            </Col>
          </Row>
          
          <Row style={styles.techGrid}>
            <Col md={4} style={styles.techItem}>
              <div style={styles.techIcon}>⚛️</div>
              <h5 style={styles.techTitle}>React.js</h5>
              <p style={styles.techDescription}>Frontend framework for building user interfaces</p>
            </Col>
            <Col md={4} style={styles.techItem}>
              <div style={styles.techIcon}>🎨</div>
              <h5 style={styles.techTitle}>Bootstrap</h5>
              <p style={styles.techDescription}>CSS framework for responsive design</p>
            </Col>
            <Col md={4} style={styles.techItem}>
              <div style={styles.techIcon}>🔐</div>
              <h5 style={styles.techTitle}>Face API</h5>
              <p style={styles.techDescription}>Facial recognition for authentication</p>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Testimonials */}
      <section style={styles.testimonialsSection}>
        <Container>
          <Row className="text-center" style={styles.sectionHeader}>
            <Col>
              <h2 style={styles.sectionTitle}>What Users Say</h2>
              <p style={styles.sectionSubtitle}>Feedback from test users and guides</p>
            </Col>
          </Row>
          
          <Row style={styles.testimonialsGrid}>
            {testimonials.map((testimonial, index) => (
              <Col lg={4} key={index} style={styles.testimonialCol}>
                <Card style={styles.testimonialCard}>
                  <Card.Body style={styles.testimonialCardBody}>
                    <div style={styles.quote}>"</div>
                    <Card.Text style={styles.testimonialText}>{testimonial.content}</Card.Text>
                    <div style={styles.testimonialAuthor}>
                      <div style={styles.authorAvatar}>{testimonial.avatar}</div>
                      <div style={styles.authorInfo}>
                        <strong style={styles.authorName}>{testimonial.name}</strong>
                        <div style={styles.authorRole}>{testimonial.role}</div>
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
              <Accordion>
                <Accordion.Item eventKey="0">
                  <Accordion.Header>Is this a real voting system?</Accordion.Header>
                  <Accordion.Body>
                    No, this is a prototype developed as a final year project for educational purposes only.
                  </Accordion.Body>
                </Accordion.Item>
                
                <Accordion.Item eventKey="1">
                  <Accordion.Header>How does the face recognition work?</Accordion.Header>
                  <Accordion.Body>
                    We use computer vision algorithms to detect and verify faces from webcam images.
                  </Accordion.Body>
                </Accordion.Item>
                
                <Accordion.Item eventKey="2">
                  <Accordion.Header>Can I use this code for my project?</Accordion.Header>
                  <Accordion.Body>
                    Yes, this is open for educational purposes. Feel free to learn from the implementation.
                  </Accordion.Body>
                </Accordion.Item>
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
              <p style={styles.ctaSubtitle}>Test the voting system prototype</p>
              <div style={styles.ctaButtons}>
                <Button 
                  as={Link} 
                  to="/register" 
                  style={styles.btnPrimaryLarge}
                >
                  🚀 Start Demo
                </Button>
                <Button 
                  style={styles.btnOutlineLarge}
                  onClick={() => setShowVideoModal(true)}
                >
                  📖 View Documentation
                </Button>
              </div>
              <div style={styles.projectInfo}>
                <p>Final Year Project • Computer Science • 2024</p>
                <p>Developed by {systemInfo?.developers?.[0] || 'Your Name'} | Guided by Professor Name</p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Demo Modal */}
      <Modal show={showVideoModal} onHide={() => setShowVideoModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Project Demo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={styles.demoPlaceholder}>
            <div style={styles.demoIcon}>📹</div>
            <h5>System Demonstration</h5>
            <p>This would show a video demo of the voting system in action.</p>
            <Button variant="primary">
              ▶ Play Demo Video
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .floating {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

// All styles moved to JavaScript object
const styles = {
  homePage: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  
  alert: {
    margin: 0,
    borderRadius: 0,
    textAlign: 'center',
    padding: '15px'
  },
  
  // Hero Section Styles
  heroSection: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '60px 0',
    minHeight: '80vh',
    display: 'flex',
    alignItems: 'center'
  },
  
  heroRow: {
    minHeight: '60vh'
  },
  
  heroText: {
    padding: '20px 0'
  },
  
  projectBadge: {
    background: 'rgba(255, 255, 255, 0.2)',
    padding: '8px 16px',
    borderRadius: '20px',
    display: 'inline-block',
    marginBottom: '20px',
    fontSize: '14px',
    backdropFilter: 'blur(10px)'
  },
  
  heroTitle: {
    fontSize: '3rem',
    fontWeight: 'bold',
    marginBottom: '20px'
  },
  
  heroDescription: {
    fontSize: '1.2rem',
    marginBottom: '30px',
    opacity: 0.9
  },
  
  statsGrid: {
    margin: '30px 0'
  },
  
  statNumber: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    marginBottom: '5px',
    minHeight: '45px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  statLabel: {
    fontSize: '0.9rem',
    opacity: 0.8
  },
  
  statIcon: {
    marginRight: '5px'
  },
  
  heroButtons: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap'
  },
  
  btnPrimary: {
    background: '#ff6b6b',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: 600
  },
  
  btnSecondary: {
    background: '#4ecdc4',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: 600
  },
  
  btnOutline: {
    background: 'transparent',
    border: '2px solid white',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: 600
  },
  
  // Hero Visual Styles
  heroVisual: {
    position: 'relative',
    height: '400px'
  },
  
  mainVisual: {
    position: 'relative',
    height: '100%'
  },
  
  visualCard: {
    position: 'absolute',
    background: 'white',
    color: '#333',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
    animation: 'float 3s ease-in-out infinite'
  },
  
  card1: {
    top: '20%',
    left: '10%',
    animationDelay: '0s'
  },
  
  card2: {
    top: '50%',
    right: '10%',
    animationDelay: '1s'
  },
  
  card3: {
    bottom: '10%',
    left: '30%',
    animationDelay: '2s'
  },
  
  cardIcon: {
    fontSize: '2.5rem',
    marginBottom: '10px'
  },
  
  statusBadge: {
    background: '#4ecdc4',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '0.8rem'
  },
  
  // Section Common Styles
  sectionHeader: {
    marginBottom: '50px'
  },
  
  sectionTitle: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: '#333'
  },
  
  sectionSubtitle: {
    fontSize: '1.1rem',
    color: '#666'
  },
  
  // Features Section
  featuresSection: {
    padding: '80px 0',
    background: '#f8f9fa'
  },
  
  featuresGrid: {
    margin: '0 -15px'
  },
  
  featureCol: {
    marginBottom: '30px'
  },
  
  featureCard: {
    border: 'none',
    borderRadius: '12px',
    transition: 'all 0.3s ease',
    height: '100%',
    textAlign: 'center'
  },
  
  featureCardBody: {
    padding: '30px 20px'
  },
  
  featureIcon: {
    fontSize: '3rem',
    marginBottom: '20px',
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px'
  },
  
  featureTitle: {
    color: '#333',
    marginBottom: '15px',
    fontSize: '1.25rem'
  },
  
  featureText: {
    color: '#666',
    lineHeight: 1.6
  },
  
  // Process Section
  processSection: {
    padding: '80px 0',
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
    padding: '30px 20px'
  },
  
  stepNumber: {
    width: '50px',
    height: '50px',
    background: '#667eea',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    margin: '0 auto 20px'
  },
  
  stepIcon: {
    fontSize: '3rem',
    marginBottom: '20px'
  },
  
  stepTitle: {
    color: '#333',
    marginBottom: '15px'
  },
  
  stepDescription: {
    color: '#666'
  },
  
  // Technology Section
  techSection: {
    padding: '80px 0',
    background: '#f8f9fa'
  },
  
  techGrid: {
    margin: '0 -15px'
  },
  
  techItem: {
    textAlign: 'center',
    padding: '30px 20px'
  },
  
  techIcon: {
    fontSize: '3rem',
    marginBottom: '20px'
  },
  
  techTitle: {
    color: '#333',
    marginBottom: '15px'
  },
  
  techDescription: {
    color: '#666'
  },
  
  // Testimonials Section
  testimonialsSection: {
    padding: '80px 0',
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
    borderRadius: '12px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.08)',
    height: '100%'
  },
  
  testimonialCardBody: {
    padding: '30px',
    position: 'relative'
  },
  
  quote: {
    fontSize: '3rem',
    color: '#667eea',
    marginBottom: '20px',
    opacity: 0.5
  },
  
  testimonialText: {
    fontStyle: 'italic',
    color: '#333',
    lineHeight: 1.6
  },
  
  testimonialAuthor: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '20px'
  },
  
  authorAvatar: {
    fontSize: '2rem',
    marginRight: '15px'
  },
  
  authorInfo: {
    textAlign: 'left'
  },
  
  authorName: {
    color: '#333'
  },
  
  authorRole: {
    color: '#666',
    fontSize: '0.9rem'
  },
  
  // FAQ Section
  faqSection: {
    padding: '80px 0',
    background: '#f8f9fa'
  },
  
  // CTA Section
  ctaSection: {
    padding: '80px 0',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    textAlign: 'center'
  },
  
  ctaTitle: {
    fontSize: '2.5rem',
    marginBottom: '15px'
  },
  
  ctaSubtitle: {
    fontSize: '1.2rem',
    marginBottom: '30px',
    opacity: 0.9
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
    padding: '15px 30px',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '1.1rem'
  },
  
  btnOutlineLarge: {
    background: 'transparent',
    border: '2px solid white',
    color: 'white',
    padding: '15px 30px',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '1.1rem'
  },
  
  projectInfo: {
    borderTop: '1px solid rgba(255,255,255,0.3)',
    paddingTop: '20px'
  },
  
  // Demo Modal
  demoPlaceholder: {
    textAlign: 'center',
    padding: '20px'
  },
  
  demoIcon: {
    fontSize: '4rem',
    marginBottom: '20px'
  }
};

export default HomePage;