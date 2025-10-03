import React, { useState, useRef, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Modal, ProgressBar } from 'react-bootstrap';

const LoginPage = () => {
  const [loginData, setLoginData] = useState({
    voterId: '',
    dob: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [step, setStep] = useState(1); // 1: Credentials, 2: Face Verification, 3: Success
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [faceVerifying, setFaceVerifying] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [verificationResult, setVerificationResult] = useState(null);
  const [userData, setUserData] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Mock database of registered voters (in real app, this would be from API)
  const mockVotersDatabase = [
    {
      voterId: 'VOTE20240001',
      password: '1990-05-15', // DOB
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@email.com',
      faceData: 'mock_face_embedding_001', // In real app, this would be facial embeddings
      isVerified: true,
      constituency: 'North District',
      pollingStation: 'PS-101'
    },
    {
      voterId: 'VOTE20240002',
      password: '1985-12-20',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@email.com',
      faceData: 'mock_face_embedding_002',
      isVerified: true,
      constituency: 'South District',
      pollingStation: 'PS-205'
    }
  ];

  // Background images for login page
  const backgroundImages = [
    'https://images.unsplash.com/photo-1555848969-2c6c707af528?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
    'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80'
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
  };

  // Validate credentials
  const validateCredentials = () => {
    const voter = mockVotersDatabase.find(v => v.voterId === loginData.voterId);
    
    if (!voter) {
      setError('Voter ID not found. Please check your ID or register first.');
      return false;
    }

    if (voter.password !== loginData.dob) {
      setError('Date of Birth does not match our records.');
      return false;
    }

    if (!voter.isVerified) {
      setError('Your account is pending verification. Please contact support.');
      return false;
    }

    setUserData(voter);
    return true;
  };

  // Handle login form submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate credentials
      if (validateCredentials()) {
        setMessage('Credentials verified! Proceeding to face verification...');
        setTimeout(() => {
          setStep(2);
          setShowFaceModal(true);
          startFaceVerification();
        }, 1500);
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Start face verification process
  const startFaceVerification = async () => {
    try {
      // Access camera
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setFaceVerifying(true);
      simulateFaceVerification();

    } catch (err) {
      setError('Camera access denied. Please allow camera access for face verification.');
      setShowFaceModal(false);
    }
  };

  // Simulate face verification process (in real app, this would call your face recognition API)
  const simulateFaceVerification = () => {
    setVerificationProgress(0);
    setVerificationResult(null);

    const interval = setInterval(() => {
      setVerificationProgress(prev => {
        const newProgress = prev + 10;
        
        if (newProgress >= 100) {
          clearInterval(interval);
          completeFaceVerification();
          return 100;
        }
        
        return newProgress;
      });
    }, 500);
  };

  // Complete face verification
  const completeFaceVerification = () => {
    // Capture current frame for verification
    captureFaceImage();

    // Simulate API call delay
    setTimeout(() => {
      // Mock verification result (85% match in this case)
      const isVerified = Math.random() > 0.15; // 85% success rate for demo
      
      setVerificationResult(isVerified);
      setFaceVerifying(false);

      if (isVerified) {
        setMessage('Face verification successful! Logging you in...');
        setTimeout(() => {
          setStep(3);
          setShowFaceModal(false);
          // Here you would typically set authentication tokens, redirect, etc.
        }, 2000);
      } else {
        setError('Face verification failed. Please try again.');
        setTimeout(() => {
          setShowFaceModal(false);
          setStep(1);
        }, 3000);
      }

      // Clean up camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }, 1000);
  };

  // Capture face image for verification
  const captureFaceImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // In real app, you would send this image to your face verification API
      console.log('Face image captured for verification');
    }
  };

  // Retry face verification
  const retryFaceVerification = () => {
    setVerificationResult(null);
    setVerificationProgress(0);
    startFaceVerification();
  };

  // Close face modal
  const handleCloseFaceModal = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setShowFaceModal(false);
    setStep(1);
  };

  // Format Voter ID input
  const formatVoterId = (value) => {
    return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  };

  // Handle Voter ID input
  const handleVoterIdChange = (e) => {
    const formattedValue = formatVoterId(e.target.value);
    setLoginData(prev => ({
      ...prev,
      voterId: formattedValue
    }));
  };

  return (
    <div 
      className="min-vh-100 d-flex align-items-center justify-content-center py-5"
      style={{
        background: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${backgroundImages[currentBgIndex]})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        transition: 'background-image 1s ease-in-out'
      }}
    >
      <Container>
        <Row className="justify-content-center">
          <Col md={8} lg={6} xl={5}>
            <Card className="shadow-lg border-0 rounded-3">
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
                        <i className="fas fa-user-shield text-primary" style={{ fontSize: '2rem' }}></i>
                      </div>
                      <h4>Enter Your Voter Credentials</h4>
                      <p className="text-muted">Use your Voter ID and Date of Birth to login</p>
                    </div>

                    {error && <Alert variant="danger">{error}</Alert>}
                    {message && <Alert variant="info">{message}</Alert>}

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
                          placeholder="Enter your Voter ID (e.g., VOTE20240001)"
                          required
                          maxLength={20}
                          className="py-2"
                        />
                        <Form.Text className="text-muted">
                          Your unique Voter ID provided after registration
                        </Form.Text>
                      </Form.Group>

                      <Form.Group className="mb-4">
                        <Form.Label>
                          <strong>Date of Birth *</strong>
                        </Form.Label>
                        <Form.Control
                          type="date"
                          name="dob"
                          value={loginData.dob}
                          onChange={handleInputChange}
                          required
                          className="py-2"
                        />
                        <Form.Text className="text-muted">
                          Your Date of Birth acts as your password
                        </Form.Text>
                      </Form.Group>

                      <div className="d-grid">
                        <Button
                          variant="primary"
                          type="submit"
                          size="lg"
                          disabled={loading || !loginData.voterId || !loginData.dob}
                          className="py-2"
                        >
                          {loading ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-2" />
                              Verifying Credentials...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-sign-in-alt me-2"></i>
                              Verify & Continue to Face Check
                            </>
                          )}
                        </Button>
                      </div>
                    </Form>

                    <div className="text-center mt-4">
                      <p className="text-muted mb-2">
                        <i className="fas fa-shield-alt me-2 text-success"></i>
                        Your credentials are securely encrypted
                      </p>
                      <small className="text-muted">
                        Don't have a Voter ID? <a href="/register" className="text-decoration-none">Register here</a>
                      </small>
                    </div>
                  </div>
                )}

                {/* Step 3: Login Success */}
                {step === 3 && userData && (
                  <div className="text-center py-4">
                    <div className="bg-success rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                         style={{ width: '80px', height: '80px' }}>
                      <i className="fas fa-check text-white" style={{ fontSize: '2rem' }}></i>
                    </div>
                    
                    <h4 className="text-success mb-3">Authentication Successful!</h4>
                    
                    <Card className="bg-light border-0 mb-4">
                      <Card.Body>
                        <h5>Welcome, {userData.firstName} {userData.lastName}!</h5>
                        <p className="mb-2"><strong>Voter ID:</strong> {userData.voterId}</p>
                        <p className="mb-2"><strong>Constituency:</strong> {userData.constituency}</p>
                        <p className="mb-0"><strong>Polling Station:</strong> {userData.pollingStation}</p>
                      </Card.Body>
                    </Card>

                    <div className="d-grid gap-2">
                      <Button variant="success" size="lg" className="py-2">
                        <i className="fas fa-tachometer-alt me-2"></i>
                        Go to Voter Dashboard
                      </Button>
                      <Button variant="outline-secondary" size="lg" className="py-2">
                        <i className="fas fa-print me-2"></i>
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
      <Modal show={showFaceModal} onHide={handleCloseFaceModal} size="lg" centered backdrop="static">
        <Modal.Header closeButton={!faceVerifying && !verificationResult}>
          <Modal.Title>
            <i className="fas fa-camera me-2"></i>
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

              <div className="position-relative mb-4">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  className="w-100 border rounded"
                  style={{ maxHeight: '300px', transform: 'scaleX(-1)' }} // Mirror effect
                />
                {faceVerifying && (
                  <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center">
                    <div className="bg-dark bg-opacity-50 rounded p-3">
                      <Spinner animation="border" variant="light" className="me-2" />
                      <span className="text-white">Verifying face...</span>
                    </div>
                  </div>
                )}
              </div>

              <ProgressBar 
                now={verificationProgress} 
                variant="primary" 
                animated 
                className="mb-3"
                label={`${verificationProgress}%`}
              />

              {faceVerifying ? (
                <div className="text-info">
                  <i className="fas fa-sync fa-spin me-2"></i>
                  Analyzing facial features...
                </div>
              ) : (
                <Button variant="primary" onClick={startFaceVerification}>
                  <i className="fas fa-camera me-2"></i>
                  Start Face Verification
                </Button>
              )}
            </>
          ) : (
            <>
              {verificationResult ? (
                <div className="text-success">
                  <i className="fas fa-check-circle fa-3x mb-3"></i>
                  <h4>Face Verification Successful!</h4>
                  <p className="mb-3">Your identity has been confirmed.</p>
                  <div className="bg-success bg-opacity-10 p-3 rounded">
                    <p className="mb-1"><strong>Match Confidence:</strong> 94.7%</p>
                    <p className="mb-0"><strong>Verification Time:</strong> 3.2 seconds</p>
                  </div>
                </div>
              ) : (
                <div className="text-danger">
                  <i className="fas fa-times-circle fa-3x mb-3"></i>
                  <h4>Face Verification Failed</h4>
                  <p className="mb-3">We couldn't verify your identity. Please try again.</p>
                  <div className="d-grid gap-2">
                    <Button variant="primary" onClick={retryFaceVerification}>
                      <i className="fas fa-redo me-2"></i>
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
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </Modal>
    </div>
  );
};

export default LoginPage;