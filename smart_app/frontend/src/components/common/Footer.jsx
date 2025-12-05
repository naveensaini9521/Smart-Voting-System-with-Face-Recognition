import React, { useState } from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { 
  FaEnvelope, FaPhone, FaMapMarkerAlt, FaTwitter, 
  FaFacebook, FaLinkedin, FaGithub, FaShieldAlt,
  FaLock, FaUserLock, FaDatabase, FaPaperPlane
} from 'react-icons/fa';
import './Footer.css';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const currentYear = new Date().getFullYear();

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      // Simulate subscription
      setSubscribed(true);
      setTimeout(() => {
        setEmail('');
        setSubscribed(false);
      }, 3000);
    }
  };

  return (
    <footer className="custom-footer" style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      color: '#e0e0e0',
      borderTop: '1px solid rgba(255,255,255,0.1)'
    }}>
      <Container>
        <Row className="footer-content">
          {/* Brand Section */}
          <Col lg={4} md={6} className="mb-5">
            <div className="footer-brand">
              <div className="brand-logo mb-4">
                <span className="logo-icon" style={{ fontSize: '2.5rem' }}>🗳️</span>
                <span className="brand-text" style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>SmartVote</span>
              </div>
              <p className="brand-tagline" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                Revolutionizing democracy through secure, transparent, and accessible digital voting solutions 
                powered by facial recognition technology.
              </p>
              <div className="social-links mt-4">
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Twitter">
                  <FaTwitter />
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Facebook">
                  <FaFacebook />
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="LinkedIn">
                  <FaLinkedin />
                </a>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="GitHub">
                  <FaGithub />
                </a>
              </div>
            </div>
          </Col>

          {/* Quick Links */}
          <Col lg={2} md={6} className="mb-5">
            <h6 className="footer-title mb-4" style={{ color: '#fff', fontSize: '1.1rem' }}>Quick Links</h6>
            <ul className="footer-links list-unstyled">
              <li className="mb-2">
                <Link to="/" className="footer-link">Home</Link>
              </li>
              <li className="mb-2">
                <Link to="/elections" className="footer-link">Elections</Link>
              </li>
              <li className="mb-2">
                <Link to="/results" className="footer-link">Live Results</Link>
              </li>
              <li className="mb-2">
                <Link to="/register" className="footer-link">Register to Vote</Link>
              </li>
              <li className="mb-2">
                <Link to="/help" className="footer-link">Help Center</Link>
              </li>
            </ul>
          </Col>

          {/* Security & Resources */}
          <Col lg={3} md={6} className="mb-5">
            <h6 className="footer-title mb-4" style={{ color: '#fff', fontSize: '1.1rem' }}>Security & Resources</h6>
            <ul className="footer-links list-unstyled">
              <li className="mb-2">
                <Link to="/security" className="footer-link d-flex align-items-center">
                  <FaShieldAlt className="me-2" /> Security Features
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/privacy" className="footer-link d-flex align-items-center">
                  <FaLock className="me-2" /> Privacy Policy
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/terms" className="footer-link">Terms of Service</Link>
              </li>
              <li className="mb-2">
                <Link to="/faq" className="footer-link">FAQ</Link>
              </li>
              <li className="mb-2">
                <Link to="/documentation" className="footer-link">Documentation</Link>
              </li>
              <li className="mb-2">
                <Link to="/api-docs" className="footer-link d-flex align-items-center">
                  <FaDatabase className="me-2" /> API Documentation
                </Link>
              </li>
            </ul>
          </Col>

          {/* Contact & Newsletter */}
          <Col lg={3} md={6} className="mb-5">
            <h6 className="footer-title mb-4" style={{ color: '#fff', fontSize: '1.1rem' }}>Contact Info</h6>
            <div className="contact-info">
              <div className="contact-item d-flex mb-3">
                <FaMapMarkerAlt className="me-3 mt-1" style={{ color: '#667eea' }} />
                <span>Computer Science Department<br />University Campus<br />City, State 12345</span>
              </div>
              <div className="contact-item d-flex mb-3">
                <FaEnvelope className="me-3 mt-1" style={{ color: '#667eea' }} />
                <span>support@smartvote.edu</span>
              </div>
              <div className="contact-item d-flex mb-4">
                <FaPhone className="me-3 mt-1" style={{ color: '#667eea' }} />
                <span>+1 (555) 123-4567</span>
              </div>
            </div>
            
            <div className="newsletter">
              <h6 className="footer-title mb-3" style={{ color: '#fff', fontSize: '1.1rem' }}>Stay Updated</h6>
              <Form onSubmit={handleSubscribe} className="subscribe-form">
                <div className="input-group">
                  <Form.Control
                    type="email"
                    placeholder="Enter your email"
                    className="subscribe-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff'
                    }}
                  />
                  <Button 
                    type="submit" 
                    className="subscribe-btn"
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none'
                    }}
                  >
                    <FaPaperPlane />
                  </Button>
                </div>
                {subscribed && (
                  <div className="mt-2 text-success small">
                    Subscribed successfully! Check your email.
                  </div>
                )}
                <Form.Text className="text-muted mt-2 d-block" style={{ fontSize: '0.8rem' }}>
                  We'll send you project updates and security alerts
                </Form.Text>
              </Form>
            </div>
          </Col>
        </Row>
      </Container>

      {/* Bottom Bar */}
      <div className="footer-bottom py-4" style={{ 
        background: 'rgba(0,0,0,0.3)',
        borderTop: '1px solid rgba(255,255,255,0.1)'
      }}>
        <Container>
          <Row className="align-items-center">
            <Col md={6} className="text-center text-md-start mb-3 mb-md-0">
              <p className="mb-0" style={{ fontSize: '0.9rem' }}>
                © {currentYear} <strong style={{ color: '#fff' }}>SmartVote System</strong>. 
                <span className="d-none d-md-inline"> Final Year Computer Science Project</span>
              </p>
            </Col>
            <Col md={6} className="text-center text-md-end">
              <div className="footer-bottom-links">
                <Link to="/privacy" className="bottom-link me-3">Privacy Policy</Link>
                <Link to="/terms" className="bottom-link me-3">Terms of Service</Link>
                <Link to="/cookies" className="bottom-link">Cookie Policy</Link>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Security Badge */}
      <div className="security-badge py-3" style={{ 
        background: 'rgba(102, 126, 234, 0.1)',
        borderTop: '1px solid rgba(102, 126, 234, 0.2)'
      }}>
        <Container>
          <div className="text-center">
            <small className="security-text d-flex align-items-center justify-content-center">
              <FaUserLock className="me-2" />
              Secure demonstration project for educational purposes • Powered by Facial Recognition Technology
            </small>
          </div>
        </Container>
      </div>
    </footer>
  );
};

export default Footer;