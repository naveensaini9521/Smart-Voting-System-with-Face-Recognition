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
  const { adminLogin, checkAuthStatus } = useAuth();
  
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [adminData, setAdminData] = useState(null);

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
    setLoading(true);
    setError('');
    setMessage('');

    try {
      console.log('Attempting admin login with:', { 
        username: loginData.username
      });
      
      const response = await adminAPI.login({
        username: loginData.username,
        password: loginData.password
      });

      if (response.success) {
        setAdminData(response.admin_data);
        setMessage('Admin credentials verified!');
        
        // Store admin authentication
        localStorage.setItem('adminToken', response.token);
        localStorage.setItem('adminData', JSON.stringify(response.admin_data));
        localStorage.setItem('isAdminAuthenticated', 'true');
        
        // Update auth context
        adminLogin(response.token, response.admin_data);
        
        setTimeout(() => {
          navigate('/admin/dashboard');
        }, 1000);
      } else {
        setError(response.message || 'Invalid admin credentials.');
      }
    } catch (err) {
      console.error('Admin login error:', err);
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Admin login failed. Please check your credentials.';
      setError(errorMessage);
    } finally {
      setLoading(false);
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

                {error && <Alert variant="danger" className="alert-custom">{error}</Alert>}
                {message && <Alert variant="info" className="alert-custom">{message}</Alert>}

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
                    />
                  </Form.Group>

                  <div className="d-grid gap-2">
                    <Button
                      variant="dark"
                      type="submit"
                      size="lg"
                      disabled={loading || !loginData.username || !loginData.password}
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
            <li className="mb-2">Multi-factor authentication</li>
            <li className="mb-2">Activity logging and monitoring</li>
            <li className="mb-2">IP address tracking</li>
            <li className="mb-2">Session timeout protection</li>
            <li className="mb-2">Role-based access control</li>
            <li className="mb-2">Encryption for all data transmission</li>
          </ul>
          <p className="text-muted small mb-0">
            Unauthorized access attempts will be logged and reported.
          </p>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default AdminLogin;