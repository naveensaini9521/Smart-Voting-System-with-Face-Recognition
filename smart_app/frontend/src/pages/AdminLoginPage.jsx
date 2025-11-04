import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';
import { FaUserShield, FaSignInAlt, FaShieldAlt, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { adminLogin } = useAuth();
  
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Background images for admin login page
  const backgroundImages = [
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
    'https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
    'https://images.unsplash.com/photo-1535016120720-40c646be5580?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80'
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
    // Clear error when user starts typing
    if (error) setError('');
  };

  // Handle admin login form submission
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      console.log('Attempting admin login with:', { 
        username: loginData.username, 
        password: '***' 
      });
      
      // Call backend API to verify admin credentials
      const response = await adminAPI.login({
        username: loginData.username,
        password: loginData.password
      });

      if (response.success) {
        setMessage('Admin authentication successful! Redirecting...');
        
        // Store admin authentication data
        localStorage.setItem('adminToken', response.token);
        localStorage.setItem('adminData', JSON.stringify(response.admin_data));
        localStorage.setItem('isAdminAuthenticated', 'true');
        
        // Update auth context
        adminLogin(response.token, response.admin_data);
        
        // Redirect to admin dashboard
        setTimeout(() => {
          navigate('/admin/dashboard');
        }, 1500);
      } else {
        setError(response.message || 'Invalid admin credentials. Please try again.');
      }
    } catch (err) {
      console.error('Admin login error:', err);
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Admin login failed. Please check your connection and try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div 
      className="min-vh-100 d-flex align-items-center justify-content-center py-5 admin-login-page-wrapper"
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
          <Col md={6} lg={5} xl={4}>
            <Card className="shadow-lg border-0 rounded-3 admin-login-card">
              <Card.Header className="bg-dark text-white text-center py-4">
                <h2 className="mb-1">
                  <FaUserShield className="me-2" />
                  Admin Portal
                </h2>
                <p className="mb-0 opacity-75">Secure administrative access</p>
              </Card.Header>
              
              <Card.Body className="p-4">
                <div className="text-center mb-4">
                  <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                       style={{ width: '80px', height: '80px' }}>
                    <FaLock className="text-dark" style={{ fontSize: '2rem' }} />
                  </div>
                  <h4>Administrator Login</h4>
                  <p className="text-muted">Restricted access for authorized personnel only</p>
                </div>

                {error && <Alert variant="danger" className="alert-custom">{error}</Alert>}
                {message && <Alert variant="info" className="alert-custom">{message}</Alert>}

                <Form onSubmit={handleAdminLogin}>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      <strong>Username *</strong>
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
                    <Form.Text className="text-muted">
                      Your administrative username
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>
                      <strong>Password *</strong>
                    </Form.Label>
                    <div className="position-relative">
                      <Form.Control
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={loginData.password}
                        onChange={handleInputChange}
                        placeholder="Enter admin password"
                        required
                        className="py-2 form-control-custom pe-5"
                      />
                      <Button
                        variant="link"
                        className="position-absolute top-50 end-0 translate-middle-y text-muted"
                        onClick={togglePasswordVisibility}
                        style={{ border: 'none', background: 'none' }}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </Button>
                    </div>
                    <Form.Text className="text-muted">
                      Your secure admin password
                    </Form.Text>
                  </Form.Group>

                  <div className="d-grid">
                    <Button
                      variant="dark"
                      type="submit"
                      size="lg"
                      disabled={loading || !loginData.username || !loginData.password}
                      className="py-2 admin-login-button"
                    >
                      {loading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Authenticating...
                        </>
                      ) : (
                        <>
                          <FaSignInAlt className="me-2" />
                          Login to Admin Portal
                        </>
                      )}
                    </Button>
                  </div>
                </Form>

                <div className="text-center mt-4">
                  <p className="text-muted mb-2">
                    <FaShieldAlt className="me-2 text-warning" />
                    Enhanced security protocols active
                  </p>
                  <small className="text-muted">
                    Return to <a href="/login" className="text-decoration-none">Voter Login</a>
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default AdminLoginPage;