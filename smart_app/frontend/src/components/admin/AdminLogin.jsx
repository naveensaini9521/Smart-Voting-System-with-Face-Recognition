import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../services/api';  
import { useAuth } from "../../context/AuthContext.jsx";
import { 
  FaUserShield, 
  FaSignInAlt, 
  FaShieldAlt, 
  FaCheck, 
  FaTachometerAlt,
  FaCog,
  FaUsers,
  FaVoteYea,
  FaChartBar,
  FaClipboardList
} from 'react-icons/fa';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { adminLogin, isAdminAuthenticated } = useAuth(); // Get isAdminAuthenticated from context
  
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Add this to prevent duplicate submissions

  // Redirect if already authenticated
  useEffect(() => {
    if (isAdminAuthenticated) {
      console.log('🔄 Redirecting to admin dashboard (already authenticated)');
      navigate('/admin/dashboard');
    }
  }, [isAdminAuthenticated, navigate]);

  // Background images for admin login
  const backgroundImages = [
    'https://images.unsplash.com/photo-1551135049-8a33b42738b4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
    'https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
    'https://images.unsplash.com/photo-1531058020387-3be344556be6?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80'
  ];

  const [currentBgIndex, setCurrentBgIndex] = useState(0);

  // Animate background images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLoginData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  // Handle admin login
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    
    // Prevent duplicate submissions
    if (isSubmitting || loading) {
      console.log('⏸️ Login already in progress, skipping duplicate request');
      return;
    }
    
    // Validate inputs
    if (!loginData.username.trim() || !loginData.password.trim()) {
      setError('Please enter both username and password');
      return;
    }
    
    setLoading(true);
    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      console.log('🔐 Attempting admin login with username:', loginData.username);
      
      // Clear any previous auth data to prevent conflicts
      localStorage.removeItem('authToken');
      localStorage.removeItem('voterData');
      localStorage.removeItem('isAuthenticated');
      
      // Call the API directly first to verify credentials
      const response = await adminAPI.login({
        username: loginData.username,
        password: loginData.password
      });

      console.log('✅ Admin login response:', response);

      if (response.success) {
        setMessage('✓ Admin credentials verified successfully!');
        
        // Use the auth context's adminLogin method which handles everything
        await adminLogin(response.token, response.admin_data);
        
        // Brief delay to show success message before redirect
        setTimeout(() => {
          console.log('🚀 Redirecting to admin dashboard');
          navigate('/admin/dashboard');
        }, 1000);
        
      } else {
        setError(response.message || 'Invalid admin credentials. Please try again.');
      }
    } catch (err) {
      console.error('❌ Admin login error:', err);
      
      // Enhanced error handling
      let errorMessage = 'Login failed. Please check your credentials.';
      
      if (err.response) {
        // Server responded with error
        const serverError = err.response.data;
        if (serverError && serverError.message) {
          errorMessage = serverError.message;
        } else if (err.response.status === 401) {
          errorMessage = 'Invalid username or password.';
        } else if (err.response.status === 403) {
          errorMessage = 'Access denied. Your account may be deactivated.';
        } else if (err.response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = 'Network error. Please check your connection.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
      // Reset submitting state after a delay to prevent immediate resubmission
      setTimeout(() => {
        setIsSubmitting(false);
      }, 1000);
    }
  };

  // Handle security modal
  const handleSecurityCheck = () => {
    setShowSecurityModal(true);
  };

  return (
    <div 
      className="min-vh-100 d-flex align-items-center justify-content-center py-5 admin-login-page"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url(${backgroundImages[currentBgIndex]})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
        transition: 'background-image 1s ease-in-out'
      }}
    >
      <Container>
        <Row className="justify-content-center">
          <Col md={6} lg={5}>
            <Card className="shadow-lg border-0 rounded-3 admin-login-card">
              <Card.Header className="bg-dark text-white text-center py-4">
                <h2 className="mb-1">
                  <FaUserShield className="me-2" />
                  Admin Control Panel
                </h2>
                <p className="mb-0 opacity-75">Smart Voting System Administration</p>
              </Card.Header>
              
              <Card.Body className="p-4">
                <div className="text-center mb-4">
                  <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                       style={{ width: '80px', height: '80px' }}>
                    <FaCog className="text-dark" style={{ fontSize: '2rem' }} />
                  </div>
                  <h4>Administrator Access</h4>
                  <p className="text-muted">Restricted access for authorized personnel only</p>
                </div>

                {error && (
                  <Alert variant="danger" className="alert-custom d-flex align-items-center">
                    <FaShieldAlt className="me-2" />
                    <span>{error}</span>
                  </Alert>
                )}
                
                {message && (
                  <Alert variant="success" className="alert-custom d-flex align-items-center">
                    <FaCheck className="me-2" />
                    <span>{message}</span>
                  </Alert>
                )}

                <Form onSubmit={handleAdminLogin}>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      <strong>Admin Username *</strong>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="username"
                      value={loginData.username}
                      onChange={handleInputChange}
                      placeholder="Enter admin username"
                      required
                      className="py-2 form-control-custom"
                      disabled={loading}
                      autoComplete="username"
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>
                      <strong>Password *</strong>
                    </Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      value={loginData.password}
                      onChange={handleInputChange}
                      placeholder="Enter admin password"
                      required
                      className="py-2 form-control-custom"
                      disabled={loading}
                      autoComplete="current-password"
                    />
                  </Form.Group>

                  <div className="d-grid gap-2">
                    <Button
                      variant="dark"
                      type="submit"
                      size="lg"
                      disabled={loading || isSubmitting || !loginData.username.trim() || !loginData.password.trim()}
                      className="py-2 login-button"
                    >
                      {loading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Verifying Admin Access...
                        </>
                      ) : (
                        <>
                          <FaSignInAlt className="me-2" />
                          Access Admin Panel
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={handleSecurityCheck}
                      disabled={loading}
                    >
                      <FaShieldAlt className="me-2" />
                      Security Protocols
                    </Button>
                  </div>
                </Form>

                <div className="text-center mt-4">
                  <p className="text-muted mb-2">
                    <FaShieldAlt className="me-2 text-warning" />
                    All activities are logged and monitored
                  </p>
                  <small className="text-muted">
                    Voter login? <a href="/login" className="text-decoration-none">Click here</a>
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Security Protocols Modal */}
      <Modal show={showSecurityModal} onHide={() => setShowSecurityModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaShieldAlt className="me-2" />
            Security Protocols
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h6>Admin Access Security Measures:</h6>
          <ul className="list-unstyled">
            <li className="mb-2 d-flex align-items-center">
              <FaCheck className="text-success me-2" size="12" />
              Multi-factor authentication
            </li>
            <li className="mb-2 d-flex align-items-center">
              <FaCheck className="text-success me-2" size="12" />
              Activity logging and monitoring
            </li>
            <li className="mb-2 d-flex align-items-center">
              <FaCheck className="text-success me-2" size="12" />
              IP address tracking
            </li>
            <li className="mb-2 d-flex align-items-center">
              <FaCheck className="text-success me-2" size="12" />
              Session timeout protection
            </li>
            <li className="mb-2 d-flex align-items-center">
              <FaCheck className="text-success me-2" size="12" />
              Role-based access control
            </li>
            <li className="mb-2 d-flex align-items-center">
              <FaCheck className="text-success me-2" size="12" />
              Encryption for all data transmission
            </li>
          </ul>
          <p className="text-muted small mb-0 mt-3">
            ⚠️ Unauthorized access attempts will be logged and reported.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSecurityModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        .admin-login-page {
          min-height: 100vh;
        }
        
        .admin-login-card {
          backdrop-filter: blur(10px);
          background-color: rgba(255, 255, 255, 0.95);
        }
        
        .form-control-custom {
          border-radius: 8px;
          border: 1px solid #dee2e6;
          transition: all 0.3s ease;
        }
        
        .form-control-custom:focus {
          border-color: #212529;
          box-shadow: 0 0 0 0.25rem rgba(33, 37, 41, 0.25);
        }
        
        .login-button {
          border-radius: 8px;
          font-weight: 600;
          letter-spacing: 0.5px;
          transition: all 0.3s ease;
        }
        
        .login-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }
        
        .login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .alert-custom {
          border-radius: 8px;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        @media (max-width: 768px) {
          .admin-login-card {
            margin: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminLogin;