import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, Row, Col, Card, Form, Button, Alert, 
  ProgressBar, Modal, Tab, Tabs, Badge, Spinner
} from 'react-bootstrap';
import { 
  FaUser, FaIdCard, FaCamera, FaCheckCircle, 
  FaPhone, FaEnvelope, FaMapMarkerAlt, FaShieldAlt,
  FaFingerprint, FaGlobe, FaCity, FaHome, FaBirthdayCake,
  FaExclamationTriangle, FaCopy
} from 'react-icons/fa';
import FaceCapture from '../components/auth/facecapture.jsx';
import IDUpload from '../components/auth/id-upload.jsx';
import OTPVerification from '../components/auth/otp-verification.jsx';
import { voterAPI } from '../services/api';
import './RegisterPage.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [voterData, setVoterData] = useState({
    // Personal Information
    full_name: '',
    father_name: '',
    mother_name: '',
    gender: '',
    date_of_birth: '',
    place_of_birth: '',
    
    // Contact Information
    email: '',
    phone: '',
    alternate_phone: '',
    
    // Address Information
    address_line1: '',
    address_line2: '',
    pincode: '',
    village_city: '',
    district: '',
    state: '',
    country: 'India',
    
    // Identity Information
    national_id_type: 'aadhar',
    national_id_number: '',
    id_document: null,
    
    // Account Information
    password: '',
    confirm_password: '',
    security_question: '',
    security_answer: '',
    
    // Verification
    email_verified: false,
    phone_verified: false,
    id_verified: false,
    face_verified: false
  });
  
  const [voterId, setVoterId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpType, setOtpType] = useState('');
  const [uploadedID, setUploadedID] = useState(null);
  const [loading, setLoading] = useState(false);
  const [registrationProgress, setRegistrationProgress] = useState({
    personal: false,
    contact: false,
    id: false,
    face: false
  });

  // Debug useEffect
  useEffect(() => {
    console.log('Current voterId:', voterId);
    console.log('Current step:', step);
    console.log('Registration progress:', registrationProgress);
  }, [voterId, step, registrationProgress]);

  // Age validation function
  const validateAge = (dateString) => {
    if (!dateString) return { isValid: false, age: 0 };
    
    const birthDate = new Date(dateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return { 
      isValid: age >= 18, 
      age: age 
    };
  };

  // Enhanced stepper with icons
  const RegistrationStepper = ({ currentStep }) => {
    const steps = [
      { number: 1, label: 'Personal Info', icon: FaUser, completed: registrationProgress.personal },
      { number: 2, label: 'Contact & Address', icon: FaMapMarkerAlt, completed: registrationProgress.contact },
      { number: 3, label: 'ID Verification', icon: FaIdCard, completed: registrationProgress.id },
      { number: 4, label: 'Face Capture', icon: FaCamera, completed: registrationProgress.face },
      { number: 5, label: 'Complete', icon: FaCheckCircle }
    ];

    return (
      <div className="registration-stepper">
        <div className="stepper-progress">
          <ProgressBar 
            now={(currentStep / steps.length) * 100} 
            className="stepper-progress-bar"
          />
        </div>
        <div className="d-flex justify-content-between position-relative">
          {steps.map((stepItem, index) => {
            const IconComponent = stepItem.icon;
            const isCompleted = stepItem.completed || stepItem.number < currentStep;
            const isActive = stepItem.number === currentStep;
            
            return (
              <div key={stepItem.number} className="step-item text-center">
                <div className={`step-indicator ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                  {isCompleted ? (
                    <FaCheckCircle className="step-icon" />
                  ) : (
                    <IconComponent className="step-icon" />
                  )}
                  <span className="step-number">{stepItem.number}</span>
                </div>
                <div className="step-label">{stepItem.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setVoterData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle file upload
  const handleFileUpload = async (file, type) => {
    if (!voterId) {
      setMessage({ type: 'danger', text: 'Please complete personal information first' });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('id_document', file);
      formData.append('voter_id', voterId);

      const response = await voterAPI.uploadID(formData);
      
      if (response.success) {
        setVoterData(prev => ({
          ...prev,
          id_document: file,
          id_verified: true
        }));
        setUploadedID(URL.createObjectURL(file));
        setRegistrationProgress(prev => ({ ...prev, id: true }));
        setMessage({ type: 'success', text: 'ID document uploaded successfully!' });
        
        // Auto-proceed to next step after successful upload
        setTimeout(() => {
          setStep(4);
        }, 1000);
      } else {
        setMessage({ type: 'danger', text: response.message || 'ID upload failed' });
      }
    } catch (error) {
      console.error('ID upload error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to upload ID document. Please try again.';
      setMessage({ type: 'danger', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // OTP Verification handlers
  const handleSendOTP = async (type) => {
    if (!voterData[type]) {
      setMessage({ type: 'danger', text: `Please enter your ${type} first` });
      return;
    }

    if (!voterId) {
      setMessage({ type: 'danger', text: 'Please complete personal information first' });
      return;
    }

    setLoading(true);
    try {
      const response = await voterAPI.sendOTP({
        [type]: voterData[type],
        purpose: 'registration',
        voter_id: voterId
      });

      if (response.success) {
        setOtpType(type);
        setShowOTPModal(true);
        setMessage({ type: 'success', text: `OTP sent to your ${type}` });
      } else {
        setMessage({ type: 'danger', text: response.message || `Failed to send OTP to ${type}` });
      }
    } catch (error) {
      console.error('OTP send error:', error);
      const errorMessage = error.response?.data?.message || `Failed to send OTP to ${type}`;
      setMessage({ type: 'danger', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (otp) => {
    setLoading(true);
    try {
      const response = await voterAPI.verifyOTP({
        voter_id: voterId,
        otp_code: otp,
        purpose: 'registration',
        [otpType]: voterData[otpType]
      });

      if (response.success) {
        setVoterData(prev => ({
          ...prev,
          [`${otpType}_verified`]: true
        }));
        
        // Update registration progress
        if (otpType === 'email' || otpType === 'phone') {
          setRegistrationProgress(prev => ({ ...prev, contact: true }));
        }
        
        setShowOTPModal(false);
        setMessage({ type: 'success', text: `${otpType.toUpperCase()} verified successfully!` });
      } else {
        setMessage({ type: 'danger', text: response.message || 'Invalid OTP' });
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      const errorMessage = error.response?.data?.message || 'OTP verification failed';
      setMessage({ type: 'danger', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Validation functions
  const validateStep = (stepNumber) => {
    const errors = [];

    switch (stepNumber) {
      case 1:
        if (!voterData.full_name.trim()) errors.push('Full name is required');
        if (!voterData.father_name.trim()) errors.push("Father's name is required");
        if (!voterData.date_of_birth) errors.push('Date of birth is required');
        else {
          const ageValidation = validateAge(voterData.date_of_birth);
          if (!ageValidation.isValid) errors.push('You must be 18 years or older to register');
        }
        if (!voterData.gender) errors.push('Gender is required');
        break;
      
      case 2:
        if (!voterData.email.trim()) errors.push('Email is required');
        else if (!/\S+@\S+\.\S+/.test(voterData.email)) errors.push('Email is invalid');
        
        if (!voterData.phone.trim()) errors.push('Phone number is required');
        else if (!/^\d{10}$/.test(voterData.phone.replace(/\D/g, ''))) errors.push('Phone number must be 10 digits');
        
        if (!voterData.address_line1.trim()) errors.push('Address is required');
        if (!voterData.pincode.trim()) errors.push('Pincode is required');
        if (!voterData.village_city.trim()) errors.push('City/Village is required');
        if (!voterData.district.trim()) errors.push('District is required');
        if (!voterData.state.trim()) errors.push('State is required');
        break;
      
      case 3:
        if (!voterData.national_id_number.trim()) errors.push('National ID number is required');
        if (!voterData.id_document) errors.push('ID document upload is required');
        break;

      case 4:
        if (!voterData.face_verified) errors.push('Face verification is required');
        break;
    }

    if (errors.length > 0) {
      setMessage({ type: 'danger', text: errors.join(', ') });
      return false;
    }
    return true;
  };

  // Save personal information and get voter ID
  const savePersonalInfo = async () => {
    setLoading(true);
    setMessage({ type: 'info', text: 'Saving your information...' });
    
    try {
      console.log('Sending voter data to backend:', voterData);
      
      const response = await voterAPI.register(voterData);
      
      if (response.success) {
        setVoterId(response.voter_id);
        setRegistrationProgress(prev => ({ ...prev, personal: true }));
        setMessage({ 
          type: 'success', 
          text: `Personal information saved successfully! Your Voter ID: ${response.voter_id}` 
        });
        return true;
      } else {
        setMessage({ 
          type: 'danger', 
          text: response.message || 'Failed to save personal information' 
        });
        return false;
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Registration failed. Please check your connection and try again.';
      setMessage({ type: 'danger', text: errorMessage });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Navigation between steps
  const nextStep = async () => {
    if (validateStep(step)) {
      if (step === 1) {
        // For step 1, save data to backend first to get voter ID
        const success = await savePersonalInfo();
        if (success) {
          setStep(prev => prev + 1);
          setMessage({ type: '', text: '' });
        }
      } else {
        setStep(prev => prev + 1);
        setMessage({ type: '', text: '' });
      }
    }
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
    setMessage({ type: '', text: '' });
  };

  // Submit registration
  const submitRegistration = async () => {
    if (!validateStep(4)) return;
    
    setIsSubmitting(true);
    setMessage({ type: 'info', text: 'Finalizing your registration...' });
    
    try {
      const response = await voterAPI.completeRegistration(voterId);
      
      if (response.success) {
        // Use the voter_id from the response to ensure we have the latest
        const finalVoterId = response.voter_data?.voter_id || voterId;
        setVoterId(finalVoterId);
        setStep(5);
        setMessage({ 
          type: 'success', 
          text: 'Registration completed successfully!' 
        });
        
        // Store voter ID in local storage for login
        localStorage.setItem('voterId', finalVoterId);
        localStorage.setItem('voterData', JSON.stringify(response.voter_data));
      } else {
        setMessage({ 
          type: 'danger', 
          text: response.message || 'Registration completion failed.' 
        });
      }
    } catch (error) {
      console.error('Complete registration error:', error);
      const errorMessage = error.response?.data?.message || 
                          'Registration failed. Please try again.';
      setMessage({ 
        type: 'danger', 
        text: errorMessage 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle face capture
  const handleFaceCapture = async (imageData, success) => {
    if (success && voterId) {
      setLoading(true);
      try {
        const response = await voterAPI.registerFace({
          voter_id: voterId,
          image_data: imageData
        });

        if (response.success) {
          setVoterData(prev => ({ ...prev, face_verified: true }));
          setRegistrationProgress(prev => ({ ...prev, face: true }));
          setMessage({ type: 'success', text: 'Face registration successful!' });
          
          // Auto-proceed to complete registration after face verification
          setTimeout(() => {
            submitRegistration();
          }, 1500);
        } else {
          setMessage({ type: 'danger', text: response.message || 'Face registration failed' });
        }
      } catch (error) {
        console.error('Face registration error:', error);
        const errorMessage = error.response?.data?.message || 'Face registration failed. Please try again.';
        setMessage({ type: 'danger', text: errorMessage });
      } finally {
        setLoading(false);
      }
    } else {
      setMessage({ type: 'danger', text: 'Face registration failed. Please try again.' });
    }
  };

  // Copy voter ID to clipboard
  const copyVoterId = async () => {
    if (voterId) {
      try {
        await navigator.clipboard.writeText(voterId);
        setMessage({ type: 'success', text: 'Voter ID copied to clipboard!' });
      } catch (err) {
        setMessage({ type: 'danger', text: 'Failed to copy Voter ID' });
      }
    }
  };

  // Get age validation result
  const ageValidation = voterData.date_of_birth ? validateAge(voterData.date_of_birth) : { isValid: false, age: 0 };

  return (
    <div className="register-page-wrapper">
      <Container className="register-page py-5">
        <Row className="justify-content-center">
          <Col xl={10}>
            <Card className="registration-card">
              <Card.Header className="registration-header text-center">
                <div className="header-icon">
                  <FaShieldAlt />
                </div>
                <h2>Secure Voter Registration</h2>
                <p className="text-muted">Complete your registration in 5 simple steps</p>
                <RegistrationStepper currentStep={step} />
              </Card.Header>
              
              <Card.Body className="registration-body">
                {message.text && (
                  <Alert variant={message.type} className="alert-custom">
                    {message.text}
                    {loading && <Spinner animation="border" size="sm" className="ms-2" />}
                  </Alert>
                )}

                {/* Display Voter ID once generated */}
                {voterId && step > 1 && step < 5 && (
                  <Alert variant="info" className="text-center">
                    <strong>Your Voter ID: </strong>
                    <Badge bg="primary" className="ms-2 fs-6">{voterId}</Badge>
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      className="ms-2"
                      onClick={copyVoterId}
                    >
                      <FaCopy className="me-1" />
                      Copy
                    </Button>
                  </Alert>
                )}

                {/* Step 1: Personal Information */}
                {step === 1 && (
                  <div className="step-content">
                    <h4 className="step-title text-center">
                      <FaUser className="me-2" />
                      Personal Information
                    </h4>
                    
                    <Row className="justify-content-center">
                      <Col lg={8}>
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>
                                <FaUser className="me-2" />
                                Full Name *
                              </Form.Label>
                              <Form.Control
                                type="text"
                                name="full_name"
                                value={voterData.full_name}
                                onChange={handleInputChange}
                                placeholder="Enter your full name"
                                required
                                className="form-control-custom"
                                disabled={loading}
                              />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Gender *</Form.Label>
                              <Form.Select 
                                name="gender" 
                                value={voterData.gender} 
                                onChange={handleInputChange} 
                                required
                                className="form-control-custom"
                                disabled={loading}
                              >
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                              </Form.Select>
                            </Form.Group>
                          </Col>
                        </Row>

                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Father's Name *</Form.Label>
                              <Form.Control
                                type="text"
                                name="father_name"
                                value={voterData.father_name}
                                onChange={handleInputChange}
                                placeholder="Enter father's name"
                                required
                                className="form-control-custom"
                                disabled={loading}
                              />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Mother's Name</Form.Label>
                              <Form.Control
                                type="text"
                                name="mother_name"
                                value={voterData.mother_name}
                                onChange={handleInputChange}
                                placeholder="Enter mother's name"
                                className="form-control-custom"
                                disabled={loading}
                              />
                            </Form.Group>
                          </Col>
                        </Row>

                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>
                                <FaBirthdayCake className="me-2" />
                                Date of Birth *
                              </Form.Label>
                              <Form.Control
                                type="date"
                                name="date_of_birth"
                                value={voterData.date_of_birth}
                                onChange={(e) => {
                                  handleInputChange(e);
                                }}
                                max={new Date().toISOString().split('T')[0]}
                                required
                                className="form-control-custom"
                                disabled={loading}
                              />
                              {voterData.date_of_birth && (
                                <div className={`age-validation ${ageValidation.isValid ? 'valid' : 'invalid'}`}>
                                  {ageValidation.isValid ? (
                                    <span className="age-valid">
                                      <FaCheckCircle className="me-1" />
                                      Age: {ageValidation.age} years ✓ Eligible
                                    </span>
                                  ) : (
                                    <span className="age-invalid">
                                      <FaExclamationTriangle className="me-1" />
                                      Age: {ageValidation.age} years - Must be 18 or older to register
                                    </span>
                                  )}
                                </div>
                              )}
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Place of Birth</Form.Label>
                              <Form.Control
                                type="text"
                                name="place_of_birth"
                                value={voterData.place_of_birth}
                                onChange={handleInputChange}
                                placeholder="City/Town of birth"
                                className="form-control-custom"
                                disabled={loading}
                              />
                            </Form.Group>
                          </Col>
                        </Row>
                      </Col>
                    </Row>
                  </div>
                )}

                {/* Step 2: Contact & Address Information */}
                {step === 2 && (
                  <div className="step-content">
                    <h4 className="step-title text-center">
                      <FaMapMarkerAlt className="me-2" />
                      Contact & Address Information
                    </h4>

                    <div className="form-tabs-container">
                      <Tabs defaultActiveKey="contact" className="mb-4 justify-content-center">
                        <Tab eventKey="contact" title={
                          <span className="tab-title"><FaPhone className="me-1" />Contact</span>
                        }>
                          <Row className="justify-content-center">
                            <Col lg={8}>
                              <Row>
                                <Col md={6}>
                                  <Form.Group className="mb-3">
                                    <Form.Label>
                                      <FaEnvelope className="me-2" />
                                      Email Address *
                                    </Form.Label>
                                    <div className="d-flex">
                                      <Form.Control
                                        type="email"
                                        name="email"
                                        value={voterData.email}
                                        onChange={handleInputChange}
                                        placeholder="your@email.com"
                                        required
                                        className="form-control-custom"
                                        disabled={loading || voterData.email_verified}
                                      />
                                      <Button 
                                        variant={voterData.email_verified ? "success" : "outline-primary"}
                                        className="ms-2 verify-btn"
                                        onClick={() => handleSendOTP('email')}
                                        disabled={!voterData.email || loading || voterData.email_verified}
                                      >
                                        {loading ? <Spinner animation="border" size="sm" /> : 
                                         voterData.email_verified ? <FaCheckCircle /> : "Verify"}
                                      </Button>
                                    </div>
                                    {voterData.email_verified && (
                                      <Form.Text className="text-success">
                                        <FaCheckCircle className="me-1" />
                                        Email verified
                                      </Form.Text>
                                    )}
                                  </Form.Group>
                                </Col>
                                <Col md={6}>
                                  <Form.Group className="mb-3">
                                    <Form.Label>
                                      <FaPhone className="me-2" />
                                      Phone Number *
                                    </Form.Label>
                                    <div className="d-flex">
                                      <Form.Control
                                        type="tel"
                                        name="phone"
                                        value={voterData.phone}
                                        onChange={handleInputChange}
                                        placeholder="+91 XXXXXXXXXX"
                                        required
                                        className="form-control-custom"
                                        disabled={loading || voterData.phone_verified}
                                      />
                                      <Button 
                                        variant={voterData.phone_verified ? "success" : "outline-primary"}
                                        className="ms-2 verify-btn"
                                        onClick={() => handleSendOTP('phone')}
                                        disabled={!voterData.phone || loading || voterData.phone_verified}
                                      >
                                        {loading ? <Spinner animation="border" size="sm" /> : 
                                         voterData.phone_verified ? <FaCheckCircle /> : "Verify"}
                                      </Button>
                                    </div>
                                    {voterData.phone_verified && (
                                      <Form.Text className="text-success">
                                        <FaCheckCircle className="me-1" />
                                        Phone verified
                                      </Form.Text>
                                    )}
                                  </Form.Group>
                                </Col>
                              </Row>
                            </Col>
                          </Row>
                        </Tab>

                        <Tab eventKey="address" title={
                          <span className="tab-title"><FaHome className="me-1" />Address</span>
                        }>
                          <Row className="justify-content-center">
                            <Col lg={8}>
                              <Form.Group className="mb-3">
                                <Form.Label>Address Line 1 *</Form.Label>
                                <Form.Control
                                  type="text"
                                  name="address_line1"
                                  value={voterData.address_line1}
                                  onChange={handleInputChange}
                                  placeholder="Street address, P.O. Box"
                                  required
                                  className="form-control-custom"
                                  disabled={loading}
                                />
                              </Form.Group>

                              <Form.Group className="mb-3">
                                <Form.Label>Address Line 2</Form.Label>
                                <Form.Control
                                  type="text"
                                  name="address_line2"
                                  value={voterData.address_line2}
                                  onChange={handleInputChange}
                                  placeholder="Apartment, suite, unit"
                                  className="form-control-custom"
                                  disabled={loading}
                                />
                              </Form.Group>

                              <Row>
                                <Col md={3}>
                                  <Form.Group className="mb-3">
                                    <Form.Label>Pincode *</Form.Label>
                                    <Form.Control
                                      type="text"
                                      name="pincode"
                                      value={voterData.pincode}
                                      onChange={handleInputChange}
                                      required
                                      className="form-control-custom"
                                      disabled={loading}
                                    />
                                  </Form.Group>
                                </Col>
                                <Col md={9}>
                                  <Form.Group className="mb-3">
                                    <Form.Label>Village/City *</Form.Label>
                                    <Form.Control
                                      type="text"
                                      name="village_city"
                                      value={voterData.village_city}
                                      onChange={handleInputChange}
                                      required
                                      className="form-control-custom"
                                      disabled={loading}
                                    />
                                  </Form.Group>
                                </Col>
                              </Row>

                              <Row>
                                <Col md={6}>
                                  <Form.Group className="mb-3">
                                    <Form.Label>District *</Form.Label>
                                    <Form.Control
                                      type="text"
                                      name="district"
                                      value={voterData.district}
                                      onChange={handleInputChange}
                                      required
                                      className="form-control-custom"
                                      disabled={loading}
                                    />
                                  </Form.Group>
                                </Col>
                                <Col md={6}>
                                  <Form.Group className="mb-3">
                                    <Form.Label>State *</Form.Label>
                                    <Form.Control
                                      type="text"
                                      name="state"
                                      value={voterData.state}
                                      onChange={handleInputChange}
                                      required
                                      className="form-control-custom"
                                      disabled={loading}
                                    />
                                  </Form.Group>
                                </Col>
                              </Row>
                            </Col>
                          </Row>
                        </Tab>
                      </Tabs>
                    </div>
                  </div>
                )}

                {/* Step 3: ID Verification */}
                {step === 3 && (
                  <div className="step-content">
                    <h4 className="step-title text-center">
                      <FaIdCard className="me-2" />
                      Identity Verification
                    </h4>

                    <Row className="justify-content-center">
                      <Col lg={8}>
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>ID Type *</Form.Label>
                              <Form.Select 
                                name="national_id_type" 
                                value={voterData.national_id_type} 
                                onChange={handleInputChange}
                                className="form-control-custom"
                                disabled={loading}
                              >
                                <option value="aadhar">Aadhar Card</option>
                                <option value="passport">Passport</option>
                                <option value="driving">Driving License</option>
                                <option value="voter">Voter ID</option>
                                <option value="other">Other National ID</option>
                              </Form.Select>
                            </Form.Group>

                            <Form.Group className="mb-3">
                              <Form.Label>ID Number *</Form.Label>
                              <Form.Control
                                type="text"
                                name="national_id_number"
                                value={voterData.national_id_number}
                                onChange={handleInputChange}
                                placeholder={`Enter ${voterData.national_id_type} number`}
                                required
                                className="form-control-custom"
                                disabled={loading}
                              />
                            </Form.Group>

                            {voterData.id_verified && (
                              <Alert variant="success" className="mt-3">
                                <FaCheckCircle className="me-2" />
                                ID Document verified successfully
                              </Alert>
                            )}
                          </Col>
                          
                          <Col md={6}>
                            <IDUpload 
                              onUpload={handleFileUpload}
                              uploadedFile={uploadedID}
                              idType={voterData.national_id_type}
                              loading={loading}
                              disabled={loading}
                            />
                          </Col>
                        </Row>
                      </Col>
                    </Row>
                  </div>
                )}

                {/* Step 4: Face Capture */}
                {step === 4 && (
                  <div className="step-content">
                    <h4 className="step-title text-center">
                      <FaCamera className="me-2" />
                      Biometric Verification
                    </h4>
                    <div className="face-capture-container text-center">
                      <FaceCapture 
                        onCapture={handleFaceCapture}
                        mode="register"
                        voterId={voterId}
                        loading={loading}
                      />
                      {voterData.face_verified && (
                        <Alert variant="success" className="mt-3">
                          <FaCheckCircle className="me-2" />
                          Face verification completed successfully
                        </Alert>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 5: Completion */}
                {step === 5 && voterId && (
                  <div className="step-content text-center completion-content">
                    <div className="success-animation">
                      <FaCheckCircle className="success-icon" />
                    </div>
                    <h3>Registration Complete! 🎉</h3>
                    <div className="voter-id-badge">
                      <Badge bg="success" className="voter-id">
                        Your Voter ID: {voterId}
                      </Badge>
                    </div>
                    <div className="completion-details">
                      <p>Your voter registration has been successfully completed and verified.</p>
                      <Alert variant="info" className="mt-3">
                        <strong>Important:</strong> Your Date of Birth will be used as your password for login.
                        Please remember your Voter ID and Date of Birth for future logins.
                      </Alert>
                      <div className="verification-status">
                        <h5>Verification Status:</h5>
                        <ul className="list-unstyled">
                          <li><FaCheckCircle className="text-success me-2" />Personal Information</li>
                          <li><FaCheckCircle className="text-success me-2" />Contact Verification</li>
                          <li><FaCheckCircle className="text-success me-2" />ID Document</li>
                          <li><FaCheckCircle className="text-success me-2" />Face Biometrics</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                {step < 5 && (
                  <div className="navigation-buttons">
                    <div className="d-flex justify-content-between">
                      <Button 
                        variant="outline-secondary" 
                        onClick={prevStep}
                        disabled={step === 1 || loading}
                        className="nav-btn"
                      >
                        Previous
                      </Button>
                      
                      {step === 4 ? (
                        <Button 
                          variant="primary"
                          onClick={submitRegistration}
                          disabled={!voterData.face_verified || isSubmitting || loading}
                          className="nav-btn"
                        >
                          {isSubmitting ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-2" />
                              Finalizing...
                            </>
                          ) : 'Complete Registration'}
                        </Button>
                      ) : (
                        <Button 
                          variant="primary" 
                          onClick={nextStep} 
                          className="nav-btn"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-2" />
                              {step === 1 ? 'Saving...' : 'Loading...'}
                            </>
                          ) : 'Continue'}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {step === 5 && (
                  <div className="text-center">
                    <Button 
                      variant="success" 
                      size="lg"
                      onClick={() => navigate('/login')}
                      className="proceed-btn me-3"
                    >
                      Proceed to Login
                    </Button>
                    <Button 
                      variant="outline-primary" 
                      size="lg"
                      onClick={copyVoterId}
                      className="proceed-btn"
                    >
                      <FaCopy className="me-2" />
                      Copy Voter ID
                    </Button>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* OTP Verification Modal */}
      <Modal show={showOTPModal} onHide={() => !loading && setShowOTPModal(false)} centered>
        <Modal.Header closeButton={!loading}>
          <Modal.Title>Verify {otpType.toUpperCase()}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <OTPVerification 
            type={otpType}
            value={voterData[otpType]}
            onVerify={handleVerifyOTP}
            onResend={() => handleSendOTP(otpType)}
            loading={loading}
          />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default RegisterPage;