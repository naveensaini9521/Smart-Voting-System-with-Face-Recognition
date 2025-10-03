import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="custom-footer">
      <Container>
        <Row className="footer-content">
          {/* Brand Section */}
          <Col lg={4} md={6} className="mb-4">
            <div className="footer-brand">
              <div className="brand-logo mb-3">
                <span className="logo-icon">🗳️</span>
                <span className="brand-text">SmartVote</span>
              </div>
              <p className="brand-tagline">
                Revolutionizing democracy through secure, transparent, and accessible digital voting solutions.
              </p>
              <div className="social-links">
                <a href="#twitter" className="social-link" aria-label="Twitter">
                  <i className="bi bi-twitter"></i>
                </a>
                <a href="#facebook" className="social-link" aria-label="Facebook">
                  <i className="bi bi-facebook"></i>
                </a>
                <a href="#linkedin" className="social-link" aria-label="LinkedIn">
                  <i className="bi bi-linkedin"></i>
                </a>
                <a href="#github" className="social-link" aria-label="GitHub">
                  <i className="bi bi-github"></i>
                </a>
              </div>
            </div>
          </Col>

          {/* Quick Links */}
          <Col lg={2} md={6} className="mb-4">
            <h6 className="footer-title">Quick Links</h6>
            <ul className="footer-links">
              <li><Link to="/" className="footer-link">Home</Link></li>
              <li><Link to="/elections" className="footer-link">Elections</Link></li>
              <li><Link to="/results" className="footer-link">Results</Link></li>
              <li><Link to="/help" className="footer-link">Help Center</Link></li>
            </ul>
          </Col>

          {/* Resources */}
          <Col lg={2} md={6} className="mb-4">
            <h6 className="footer-title">Resources</h6>
            <ul className="footer-links">
              <li><a href="#docs" className="footer-link">Documentation</a></li>
              <li><a href="#api" className="footer-link">API Docs</a></li>
              <li><a href="#security" className="footer-link">Security</a></li>
              <li><a href="#privacy" className="footer-link">Privacy Policy</a></li>
            </ul>
          </Col>

          {/* Contact & Info */}
          <Col lg={4} md={6} className="mb-4">
            <h6 className="footer-title">Contact Info</h6>
            <div className="contact-info">
              <div className="contact-item">
                <i className="bi bi-geo-alt"></i>
                <span>Computer Science Department<br />University Campus</span>
              </div>
              <div className="contact-item">
                <i className="bi bi-envelope"></i>
                <span>support@smartvote.edu</span>
              </div>
              <div className="contact-item">
                <i className="bi bi-telephone"></i>
                <span>+1 (555) 123-4567</span>
              </div>
            </div>
            
            <div className="newsletter mt-3">
              <h6 className="footer-title">Stay Updated</h6>
              <div className="subscribe-form">
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="subscribe-input"
                />
                <button className="subscribe-btn">
                  <i className="bi bi-send"></i>
                </button>
              </div>
            </div>
          </Col>
        </Row>
      </Container>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <Container>
          <Row className="align-items-center">
            <Col md={6} className="text-center text-md-start">
              <p className="mb-0">
                © {currentYear} <strong>SmartVote System</strong>. 
                <span className="d-none d-md-inline"> Final Year Project</span>
              </p>
            </Col>
            <Col md={6} className="text-center text-md-end">
              <div className="footer-bottom-links">
                <a href="#terms" className="bottom-link">Terms of Service</a>
                <span className="separator">•</span>
                <a href="#privacy" className="bottom-link">Privacy Policy</a>
                <span className="separator">•</span>
                <a href="#cookies" className="bottom-link">Cookie Policy</a>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Security Badge */}
      <div className="security-badge">
        <Container>
          <div className="text-center">
            <small className="security-text">
              <i className="bi bi-shield-check me-1"></i>
              Secure demonstration project for educational purposes
            </small>
          </div>
        </Container>
      </div>
    </footer>
  );
};

export default Footer;