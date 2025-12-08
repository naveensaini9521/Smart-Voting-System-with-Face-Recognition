import React, { useState, useRef, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Modal, ProgressBar } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { voterAPI } from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';
import FaceCapture from '../components/auth/facecapture.jsx';
import { FaUserShield, FaSignInAlt, FaShieldAlt, FaCheck, FaCamera, FaTachometerAlt, FaPrint, FaSync, FaCheckCircle, FaTimesCircle, FaRedo, FaUserCog } from 'react-icons/fa';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, checkAuthStatus } = useAuth();
  
  const [loginData, setLoginData] = useState({
    voterId: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [step, setStep] = useState(1);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [faceVerifying, setFaceVerifying] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [verificationResult, setVerificationResult] = useState(null);
  const [userData, setUserData] = useState(null);

  // Background images
  const backgroundImages = [
    'https://images.unsplash.com/photo-1555848969-2c6c707af528?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
    'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80'
  ];
  const [currentBgIndex, setCurrentBgIndex] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
        const token = localStorage.getItem('authToken');
        
        if (isAuthenticated && token) {
          const response = await voterAPI.verifyToken();
          if (response.success) {
            navigate('/dashboard');
          } else {
            localStorage.removeItem('authToken');
            localStorage.removeItem('voterData');
            localStorage.removeItem('isAuthenticated');
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('voterData');
        localStorage.removeItem('isAuthenticated');
      }
    };
    
    checkAuth();
  }, [navigate]);

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

  // Format Voter ID
  const formatVoterId = (value) => {
    return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  };

  const handleVoterIdChange = (e) => {
    const formattedValue = formatVoterId(e.target.value);
    setLoginData(prev => ({
      ...prev,
      voterId: formattedValue
    }));
  };

  // Simple image utility functions
  const prepareImageData = (base64Data) => {
    if (!base64Data) {
      console.error('❌ No image data provided');
      return null;
    }
    
    // If it's already base64 without data URL prefix
    if (!base64Data.startsWith('data:image/')) {
      return base64Data;
    }
    
    // Extract base64 part from data URL
    const commaIndex = base64Data.indexOf(',');
    if (commaIndex === -1) {
      console.error('❌ Invalid data URL format');
      return null;
    }
    
    return base64Data.substring(commaIndex + 1);
  };

  // ✅ Handle login form submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      console.log('Attempting login with:', { 
        voter_id: loginData.voterId, 
        password: '***' 
      });
      
      const response = await voterAPI.verifyCredentials({
        voter_id: loginData.voterId,
        password: loginData.password
      });

      if (response.success) {
        setUserData(response.voter_data);
        setMessage('Credentials verified! Proceeding to face verification...');
        
        setTimeout(() => {
          setStep(2);
          setShowFaceModal(true);
        }, 1500);
      } else {
        setError(response.message || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Login failed. Please check your connection and try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle face capture
  const handleFaceCapture = async (imageData) => {
    console.log('=== FACE VERIFICATION START ===');
    
    if (!imageData) {
      console.error('❌ No image data received');
      setError('No image data received from camera');
      return;
    }
    
    if (!userData?.voter_id) {
      console.error('❌ No user data found');
      setError('User data not found. Please restart login process.');
      return;
    }
    
    setFaceVerifying(true);
    setVerificationProgress(0);

    try {
      console.log('🔄 Starting face verification...');
      
      // Prepare image data
      const preparedImageData = prepareImageData(imageData);
      
      if (!preparedImageData) {
        throw new Error('Failed to prepare image data');
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setVerificationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 30;
        });
      }, 500);

      // Call API
      const response = await voterAPI.verifyFaceHybrid({
        voter_id: userData.voter_id,
        image_data: preparedImageData
      });

      clearInterval(progressInterval);
      setVerificationProgress(100);

      console.log('✅ API Response:', response);
      
      const token = response.token || response.auth_token;
      
      if (response.success && token) {
        console.log('🎉 Face verification successful!');
        
        // Store auth data
        localStorage.setItem('authToken', token);
        localStorage.setItem('voterData', JSON.stringify(response.voter_data || userData));
        localStorage.setItem('isAuthenticated', 'true');
        
        // Update auth context
        login(token, response.voter_data || userData);
        
        // Navigate to dashboard
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1000);
        
      } else {
        throw new Error(response.message || 'Face verification failed');
      }
      
    } catch (error) {
      console.error('❌ Face verification error:', error.message);
      setError(error.message);
      setVerificationResult(false);
    } finally {
      setVerificationProgress(0);
      setFaceVerifying(false);
    }
  };

  // Other handlers
  const retryFaceVerification = () => {
    setVerificationResult(null);
    setVerificationProgress(0);
  };

  const handleCloseFaceModal = () => {
    setShowFaceModal(false);
    if (step === 2) {
      setStep(1);
    }
  };

  const handleGoToDashboard = () => {
    console.log('Navigating to dashboard...');
    checkAuthStatus();
    navigate('/dashboard');
  };

  const handlePrintVoterSlip = () => {
    window.print();
  };

  const handleAdminLogin = () => {
    navigate('/admin/login');
  };

  const testAPI = async () => {
    console.log('🧪 Testing API connection...');
    try {
      const testResponse = await fetch('/api/auth/test');
      const data = await testResponse.json();
      console.log('API test response:', data);
      return data;
    } catch (error) {
      console.error('API test failed:', error);
      return null;
    }
  };

  // ✅ Add this debug statement to check if function exists
  console.log('🔍 handleLoginSubmit exists:', typeof handleLoginSubmit);

  return (
    <div 
      className="min-vh-100 d-flex align-items-center justify-content-center py-5 login-page-wrapper"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${backgroundImages[currentBgIndex]})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
        transition: 'background-image 1s ease-in-out'
      }}
    >
      <Container>
        <Row className="justify-content-center">
          <Col md={8} lg={6} xl={5}>
            <Card className="shadow-lg border-0 rounded-3 login-card">
              <Card.Header className="bg-primary text-white text-center py-4">
                <h2 className="mb-1">Voter Login Portal</h2>
                <p className="mb-0 opacity-75">Secure authentication with face verification</p>
              </Card.Header>
              
              <Card.Body className="p-4">
                {/* Step 1: Credentials Login */}
                {step === 1 && (
                  <div>
                    <div className="text-center mb-4">
                      <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                           style={{ width: '80px', height: '80px' }}>
                        <FaUserShield className="text-primary" style={{ fontSize: '2rem' }} />
                      </div>
                      <h4>Enter Your Voter Credentials</h4>
                      <p className="text-muted">Use your Voter ID and Password to login</p>
                    </div>

                    {error && <Alert variant="danger" className="alert-custom">{error}</Alert>}
                    {message && <Alert variant="info" className="alert-custom">{message}</Alert>}

                    {/* ✅ This Form uses handleLoginSubmit */}
                    <Form onSubmit={handleLoginSubmit}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          <strong>Voter ID *</strong>
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="voterId"
                          value={loginData.voterId}
                          onChange={handleVoterIdChange}
                          placeholder="Enter your Voter ID (e.g., A1B2C3D4)"
                          required
                          maxLength={20}
                          className="py-2 form-control-custom"
                        />
                        <Form.Text className="text-muted">
                          Your unique 8-character Voter ID provided after registration
                        </Form.Text>
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
                          placeholder="Enter your password"
                          required
                          className="py-2 form-control-custom"
                        />
                        <Form.Text className="text-muted">
                          Use the password sent to your email after registration
                        </Form.Text>
                      </Form.Group>

                      <div className="d-grid">
                        <Button
                          variant="primary"
                          type="submit"
                          size="lg"
                          disabled={loading || !loginData.voterId || !loginData.password}
                          className="py-2 login-button"
                        >
                          {loading ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-2" />
                              Verifying Credentials...
                            </>
                          ) : (
                            <>
                              <FaSignInAlt className="me-2" />
                              Verify & Continue to Face Check
                            </>
                          )}
                        </Button>
                      </div>
                    </Form>

                    <div className="text-center mt-4">
                      <p className="text-muted mb-2">
                        <FaShieldAlt className="me-2 text-success" />
                        Your credentials are securely encrypted
                      </p>
                      <small className="text-muted">
                        Don't have a Voter ID? <a href="/register" className="text-decoration-none">Register here</a>
                      </small>
                    </div>

                    {/* Admin Access Section */}
                    <div className="text-center mt-4 pt-3 border-top">
                      <p className="text-muted mb-2">Administrator Access</p>
                      <Button 
                        variant="outline-dark" 
                        size="sm"
                        onClick={handleAdminLogin}
                        className="admin-access-btn"
                      >
                        <FaUserCog className="me-2" />
                        Admin Login
                      </Button>
                    </div>
                    
                    {/* Debug button */}
                    <div className="text-center mt-3 pt-3 border-top">
                      <Button 
                        variant="outline-info" 
                        size="sm"
                        onClick={testAPI}
                        className="debug-btn"
                      >
                        Test API Connection
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 3: Login Success */}
                {step === 3 && userData && (
                  <div className="text-center py-4">
                    <div className="bg-success rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                         style={{ width: '80px', height: '80px' }}>
                      <FaCheck className="text-white" style={{ fontSize: '2rem' }} />
                    </div>
                    
                    <h4 className="text-success mb-3">Authentication Successful!</h4>
                    
                    <Card className="bg-light border-0 mb-4">
                      <Card.Body>
                        <h5>Welcome, {userData.full_name}!</h5>
                        <p className="mb-2"><strong>Voter ID:</strong> {userData.voter_id}</p>
                        <p className="mb-2"><strong>Constituency:</strong> {userData.constituency}</p>
                        <p className="mb-0"><strong>Polling Station:</strong> {userData.polling_station}</p>
                      </Card.Body>
                    </Card>

                    <div className="d-grid gap-2">
                      <Button 
                        variant="success" 
                        size="lg" 
                        className="py-2"
                        onClick={handleGoToDashboard}
                      >
                        <FaTachometerAlt className="me-2" />
                        Go to Voter Dashboard
                      </Button>
                      <Button 
                        variant="outline-secondary" 
                        size="lg" 
                        className="py-2"
                        onClick={handlePrintVoterSlip}
                      >
                        <FaPrint className="me-2" />
                        Print Voter Slip
                      </Button>
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Face Verification Modal */}
      <Modal 
        show={showFaceModal} 
        onHide={handleCloseFaceModal} 
        size="lg" 
        centered 
        backdrop="static"
        className="face-verification-modal"
      >
        <Modal.Header closeButton={!faceVerifying && !verificationResult}>
          <Modal.Title>
            <FaCamera className="me-2" />
            Face Verification Required
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {!verificationResult ? (
            <>
              <div className="mb-4">
                <p className="mb-2">Please look directly at the camera for face verification</p>
                <small className="text-muted">
                  Ensure good lighting and keep your face clearly visible
                </small>
              </div>

              <FaceCapture 
                onCapture={handleFaceCapture}
                mode="verify"
                voterId={userData?.voter_id}
                loading={faceVerifying}
              />

              {faceVerifying && (
                <div className="mt-3">
                  <ProgressBar 
                    now={verificationProgress} 
                    variant="primary" 
                    animated 
                    className="mb-3"
                    label={`${verificationProgress}%`}
                  />
                  <div className="text-info">
                    <FaSync className="fa-spin me-2" />
                    Analyzing facial features...
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {verificationResult ? (
                <div className="text-success">
                  <FaCheckCircle className="fa-3x mb-3" />
                  <h4>Face Verification Successful!</h4>
                  <p className="mb-3">Your identity has been confirmed.</p>
                  <div className="bg-success bg-opacity-10 p-3 rounded">
                    <p className="mb-1"><strong>Match Confidence:</strong> 94.7%</p>
                    <p className="mb-0"><strong>Verification Time:</strong> 3.2 seconds</p>
                  </div>
                </div>
              ) : (
                <div className="text-danger">
                  <FaTimesCircle className="fa-3x mb-3" />
                  <h4>Face Verification Failed</h4>
                  <p className="mb-3">We couldn't verify your identity. Please try again.</p>
                  <div className="d-grid gap-2">
                    <Button variant="primary" onClick={retryFaceVerification}>
                      <FaRedo className="me-2" />
                      Try Again
                    </Button>
                    <Button variant="outline-secondary" onClick={handleCloseFaceModal}>
                      Use Different Account
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default LoginPage;