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
  FaExclamationTriangle, FaCopy, FaArrowLeft, FaArrowRight
} from 'react-icons/fa';
import FaceCapture from '../components/auth/facecapture.jsx';
import IDUpload from '../components/auth/id-upload.jsx';
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
  const [uploadedID, setUploadedID] = useState(null);
  const [loading, setLoading] = useState(false);
  const [registrationProgress, setRegistrationProgress] = useState({
    personal: false,
    contact: false,
    id: false,
    face: false
  });
  
  // OTP Verification states
  const [otpData, setOtpData] = useState({
    email: { sent: false, verified: false, loading: false },
    phone: { sent: false, verified: false, loading: false }
  });
  const [otpInput, setOtpInput] = useState({
    email: '',
    phone: ''
  });

  // Debug useEffect
  useEffect(() => {
    console.log('Current voterData:', voterData);
    console.log('Current voterId:', voterId);
    console.log('Current step:', step);
    console.log('OTP Data:', otpData);
  }, [voterData, voterId, step, otpData]);

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
    setLoading(true);
    try {
      // Convert file to base64 for demo purposes
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result;
        
        // For now, just mark as uploaded without API call since we don't have voterId yet
        setVoterData(prev => ({
          ...prev,
          id_document: file,
          id_verified: true
        }));
        setUploadedID(URL.createObjectURL(file));
        setRegistrationProgress(prev => ({ ...prev, id: true }));
        setMessage({ type: 'success', text: 'ID document uploaded successfully!' });
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('ID upload error:', error);
      const errorMessage = 'Failed to upload ID document. Please try again.';
      setMessage({ type: 'danger', text: errorMessage });
      setLoading(false);
    }
  };

  // OTP Verification handlers
  const handleSendOTP = async (type) => {
    setOtpData(prev => ({
      ...prev,
      [type]: { ...prev[type], loading: true }
    }));

    try {
      const otpData = {
        [type]: voterData[type],
        purpose: 'registration'
      };

      const response = await voterAPI.sendOTP(otpData);

      if (response.success) {
        setOtpData(prev => ({
          ...prev,
          [type]: { ...prev[type], sent: true, loading: false }
        }));
        setMessage({ 
          type: 'success', 
          text: `OTP sent to your ${type}. ${response.debug_otp ? `Debug OTP: ${response.debug_otp}` : ''}` 
        });
      } else {
        setMessage({ type: 'danger', text: response.message || `Failed to send OTP to ${type}` });
        setOtpData(prev => ({
          ...prev,
          [type]: { ...prev[type], loading: false }
        }));
      }
    } catch (error) {
      console.error('OTP send error:', error);
      const errorMessage = error.response?.data?.message || `Failed to send OTP to ${type}`;
      setMessage({ type: 'danger', text: errorMessage });
      setOtpData(prev => ({
        ...prev,
        [type]: { ...prev[type], loading: false }
      }));
    }
  };

  const handleVerifyOTP = async (type) => {
    setOtpData(prev => ({
      ...prev,
      [type]: { ...prev[type], loading: true }
    }));

    try {
      const otpData = {
        [type]: voterData[type],
        otp_code: otpInput[type],
        purpose: 'registration'
      };

      const response = await voterAPI.verifyOTP(otpData);

      if (response.success) {
        setOtpData(prev => ({
          ...prev,
          [type]: { ...prev[type], verified: true, loading: false }
        }));
        setMessage({ type: 'success', text: `${type.charAt(0).toUpperCase() + type.slice(1)} verified successfully!` });
        
        // Update voterData verification status
        setVoterData(prev => ({
          ...prev,
          [`${type}_verified`]: true
        }));
      } else {
        setMessage({ type: 'danger', text: response.message || 'Invalid OTP' });
        setOtpData(prev => ({
          ...prev,
          [type]: { ...prev[type], loading: false }
        }));
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      const errorMessage = error.response?.data?.message || 'OTP verification failed';
      setMessage({ type: 'danger', text: errorMessage });
      setOtpData(prev => ({
        ...prev,
        [type]: { ...prev[type], loading: false }
      }));
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

        // Check OTP verification
        if (!otpData.email.verified) errors.push('Email must be verified with OTP');
        if (!otpData.phone.verified) errors.push('Phone must be verified with OTP');
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

  // Prepare data for backend - ALL STEPS DATA
  const prepareRegistrationData = () => {
    const registrationData = {
      // Personal Information (Step 1)
      full_name: voterData.full_name,
      father_name: voterData.father_name,
      mother_name: voterData.mother_name,
      gender: voterData.gender,
      date_of_birth: voterData.date_of_birth,
      place_of_birth: voterData.place_of_birth,
      
      // Contact Information (Step 2)
      email: voterData.email,
      phone: voterData.phone,
      alternate_phone: voterData.alternate_phone,
      
      // Address Information (Step 2)
      address_line1: voterData.address_line1,
      address_line2: voterData.address_line2,
      pincode: voterData.pincode,
      village_city: voterData.village_city,
      district: voterData.district,
      state: voterData.state,
      country: voterData.country,
      
      // Identity Information (Step 3)
      national_id_type: voterData.national_id_type,
      national_id_number: voterData.national_id_number,
      
      // Verification Status
      email_verified: otpData.email.verified,
      phone_verified: otpData.phone.verified,
      id_verified: voterData.id_verified,
      face_verified: voterData.face_verified,
      
      // Security Information
      security_question: voterData.security_question,
      security_answer: voterData.security_answer
    };

    console.log('=== PREPARED REGISTRATION DATA ===');
    console.log(registrationData);
    console.log('================================');

    return registrationData;
  };

  // Save ALL information and get voter ID
  const saveAllInformation = async () => {
    setLoading(true);
    setMessage({ type: 'info', text: 'Saving your information...' });
    
    try {
      // Validate ALL required fields before sending
      const requiredFields = ['email', 'phone', 'address_line1', 'pincode', 'village_city', 'district', 'state', 'national_id_number'];
      const missingFields = requiredFields.filter(field => !voterData[field] || voterData[field].toString().trim() === '');
      
      if (missingFields.length > 0) {
        setMessage({ 
          type: 'danger', 
          text: `Please complete all steps first. Missing: ${missingFields.join(', ')}` 
        });
        setLoading(false);
        return false;
      }

      const registrationData = prepareRegistrationData();
      console.log('Sending COMPLETE registration data to backend:', registrationData);
      
      const response = await voterAPI.register(registrationData);
      
      if (response.success) {
        setVoterId(response.voter_id);
        setRegistrationProgress(prev => ({ 
          ...prev, 
          personal: true,
          contact: true,
          id: true 
        }));
        setMessage({ 
          type: 'success', 
          text: `Registration successful! Your Voter ID: ${response.voter_id}` 
        });
        return true;
      } else {
        setMessage({ 
          type: 'danger', 
          text: response.message || 'Failed to save information' 
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
      if (step === 3) {
        // When moving from step 3 to 4, save ALL data first
        const success = await saveAllInformation();
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

  // Handle face capture - MODIFIED to complete registration
  const handleFaceCapture = async (imageData, success) => {
    if (success && voterId) {
      setLoading(true);
      try {
        console.log(`Registering face for voter: ${voterId}`);
        
        const response = await voterAPI.registerFace({
          voter_id: voterId,
          image_data: imageData
        });

        if (response.success) {
          setVoterData(prev => ({ ...prev, face_verified: true }));
          setRegistrationProgress(prev => ({ ...prev, face: true }));
          setMessage({ type: 'success', text: 'Face registration successful!' });
          
          // Complete registration after face verification
          setTimeout(() => {
            completeRegistration();
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

  // Complete registration and show success page
  const completeRegistration = async () => {
    setIsSubmitting(true);
    setMessage({ type: 'info', text: 'Finalizing your registration...' });
    
    try {
      const response = await voterAPI.completeRegistration(voterId);
      
      if (response.success) {
        const finalVoterId = response.voter_data?.voter_id || voterId;
        const password = response.password || 'your_dob';
        
        setVoterId(finalVoterId);
        setStep(5);
        setMessage({ 
          type: 'success', 
          text: `Registration completed successfully! Check your email and phone for credentials.` 
        });
        
        // Store voter ID in local storage for login
        localStorage.setItem('voterId', finalVoterId);
        localStorage.setItem('voterData', JSON.stringify(response.voter_data));
        
        // Show credentials on success page
        setVoterData(prev => ({
          ...prev,
          credentials: {
            voterId: finalVoterId,
            password: password
          }
        }));
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

  // Copy credentials to clipboard
  const copyCredentials = async () => {
    if (voterData.credentials) {
      const credentials = `Voter ID: ${voterData.credentials.voterId}\nPassword: ${voterData.credentials.password}`;
      try {
        await navigator.clipboard.writeText(credentials);
        setMessage({ type: 'success', text: 'Credentials copied to clipboard!' });
      } catch (err) {
        setMessage({ type: 'danger', text: 'Failed to copy credentials' });
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
                <p className="text-muted">Complete all steps to register</p>
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
                              <Form.Label>Full Name *</Form.Label>
                              <Form.Control
                                type="text"
                                name="full_name"
                                value={voterData.full_name}
                                onChange={handleInputChange}
                                placeholder="Enter your full name"
                                required
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
                              />
                            </Form.Group>
                          </Col>
                        </Row>

                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Date of Birth *</Form.Label>
                              <Form.Control
                                type="date"
                                name="date_of_birth"
                                value={voterData.date_of_birth}
                                onChange={handleInputChange}
                                max={new Date().toISOString().split('T')[0]}
                                required
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
                                      Age: {ageValidation.age} years - Must be 18 or older
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
                              />
                            </Form.Group>
                          </Col>
                        </Row>
                      </Col>
                    </Row>
                  </div>
                )}

                {/* Step 2: Contact & Address Information with OTP Verification */}
                {step === 2 && (
                  <div className="step-content">
                    <h4 className="step-title text-center">
                      <FaMapMarkerAlt className="me-2" />
                      Contact & Address Information
                    </h4>

                    <Row className="justify-content-center">
                      <Col lg={8}>
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Email Address *</Form.Label>
                              <div className="d-flex gap-2">
                                <Form.Control
                                  type="email"
                                  name="email"
                                  value={voterData.email}
                                  onChange={handleInputChange}
                                  placeholder="your@email.com"
                                  required
                                  disabled={otpData.email.verified}
                                />
                                {!otpData.email.verified ? (
                                  <Button 
                                    variant={otpData.email.sent ? "outline-success" : "primary"}
                                    onClick={() => handleSendOTP('email')}
                                    disabled={otpData.email.loading || !voterData.email}
                                    style={{ minWidth: '100px' }}
                                  >
                                    {otpData.email.loading ? (
                                      <Spinner animation="border" size="sm" />
                                    ) : otpData.email.sent ? (
                                      "Verify"
                                    ) : (
                                      "Send OTP"
                                    )}
                                  </Button>
                                ) : (
                                  <Button variant="success" disabled style={{ minWidth: '100px' }}>
                                    <FaCheckCircle /> Verified
                                  </Button>
                                )}
                              </div>
                              {otpData.email.sent && !otpData.email.verified && (
                                <div className="mt-2">
                                  <Form.Control
                                    type="text"
                                    placeholder="Enter OTP"
                                    value={otpInput.email}
                                    onChange={(e) => setOtpInput(prev => ({ ...prev, email: e.target.value }))}
                                    className="mb-2"
                                  />
                                  <Button 
                                    variant="success" 
                                    size="sm"
                                    onClick={() => handleVerifyOTP('email')}
                                    disabled={otpData.email.loading || !otpInput.email}
                                  >
                                    {otpData.email.loading ? (
                                      <Spinner animation="border" size="sm" />
                                    ) : (
                                      "Verify OTP"
                                    )}
                                  </Button>
                                </div>
                              )}
                            </Form.Group>
                          </Col>
                          
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Phone Number *</Form.Label>
                              <div className="d-flex gap-2">
                                <Form.Control
                                  type="tel"
                                  name="phone"
                                  value={voterData.phone}
                                  onChange={handleInputChange}
                                  placeholder="9876543210"
                                  required
                                  disabled={otpData.phone.verified}
                                />
                                {!otpData.phone.verified ? (
                                  <Button 
                                    variant={otpData.phone.sent ? "outline-success" : "primary"}
                                    onClick={() => handleSendOTP('phone')}
                                    disabled={otpData.phone.loading || !voterData.phone}
                                    style={{ minWidth: '100px' }}
                                  >
                                    {otpData.phone.loading ? (
                                      <Spinner animation="border" size="sm" />
                                    ) : otpData.phone.sent ? (
                                      "Verify"
                                    ) : (
                                      "Send OTP"
                                    )}
                                  </Button>
                                ) : (
                                  <Button variant="success" disabled style={{ minWidth: '100px' }}>
                                    <FaCheckCircle /> Verified
                                  </Button>
                                )}
                              </div>
                              {otpData.phone.sent && !otpData.phone.verified && (
                                <div className="mt-2">
                                  <Form.Control
                                    type="text"
                                    placeholder="Enter OTP"
                                    value={otpInput.phone}
                                    onChange={(e) => setOtpInput(prev => ({ ...prev, phone: e.target.value }))}
                                    className="mb-2"
                                  />
                                  <Button 
                                    variant="success" 
                                    size="sm"
                                    onClick={() => handleVerifyOTP('phone')}
                                    disabled={otpData.phone.loading || !otpInput.phone}
                                  >
                                    {otpData.phone.loading ? (
                                      <Spinner animation="border" size="sm" />
                                    ) : (
                                      "Verify OTP"
                                    )}
                                  </Button>
                                </div>
                              )}
                            </Form.Group>
                          </Col>
                        </Row>

                        <Form.Group className="mb-3">
                          <Form.Label>Address Line 1 *</Form.Label>
                          <Form.Control
                            type="text"
                            name="address_line1"
                            value={voterData.address_line1}
                            onChange={handleInputChange}
                            placeholder="Street address, P.O. Box"
                            required
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
                                placeholder="110001"
                                required
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
                                placeholder="Enter your city or village"
                                required
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
                                placeholder="Enter your district"
                                required
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
                                placeholder="Enter your state"
                                required
                              />
                            </Form.Group>
                          </Col>
                        </Row>

                        {/* Verification Status */}
                        <Alert variant="info" className="mt-3">
                          <h6>Verification Status:</h6>
                          <div className="d-flex justify-content-between">
                            <span>
                              <FaEnvelope className="me-2" />
                              Email: {otpData.email.verified ? 'Verified' : 'Pending'}
                            </span>
                            <span>
                              <FaPhone className="me-2" />
                              Phone: {otpData.phone.verified ? 'Verified' : 'Pending'}
                            </span>
                          </div>
                        </Alert>
                      </Col>
                    </Row>
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
                              />
                            </Form.Group>

                            <Alert variant="info">
                              <strong>Note:</strong> Complete all information above before proceeding to face verification.
                            </Alert>
                          </Col>
                          
                          <Col md={6}>
                            <IDUpload 
                              onUpload={handleFileUpload}
                              uploadedFile={uploadedID}
                              idType={voterData.national_id_type}
                              loading={loading}
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
                          Face verification completed successfully! Finalizing registration...
                        </Alert>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 5: Completion Page */}
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
                      
                      {/* Credentials Display */}
                      {voterData.credentials && (
                        <Alert variant="success" className="mt-3">
                          <h5>Your Login Credentials:</h5>
                          <div className="credentials-display">
                            <p><strong>Voter ID:</strong> {voterData.credentials.voterId}</p>
                            <p><strong>Password:</strong> {voterData.credentials.password}</p>
                          </div>
                          <Button 
                            variant="outline-success" 
                            size="sm"
                            onClick={copyCredentials}
                            className="mt-2"
                          >
                            <FaCopy className="me-2" />
                            Copy Credentials
                          </Button>
                        </Alert>
                      )}
                      
                      <Alert variant="info" className="mt-3">
                        <strong>Important:</strong> Your credentials have been sent to your email and phone. 
                        Please keep this information secure and do not share it with anyone.
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
                      >
                        <FaArrowLeft className="me-2" />
                        Previous
                      </Button>
                      
                      <Button 
                        variant="primary" 
                        onClick={nextStep} 
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            {step === 3 ? 'Submitting...' : 'Loading...'}
                          </>
                        ) : (
                          <>
                            {step === 3 ? 'Submit & Continue to Face Verification' : 'Continue'}
                            <FaArrowRight className="ms-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {step === 5 && (
                  <div className="text-center">
                    <Button 
                      variant="success" 
                      size="lg"
                      onClick={() => navigate('/login')}
                      className="me-3"
                    >
                      Proceed to Login
                    </Button>
                    <Button 
                      variant="outline-primary" 
                      size="lg"
                      onClick={copyVoterId}
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
    </div>
  );
};

export default RegisterPage;