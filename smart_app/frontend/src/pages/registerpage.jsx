import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, Row, Col, Card, Form, Button, Alert, 
  ProgressBar, Modal, Tab, Tabs, Badge
} from 'react-bootstrap';
import { 
  FaUser, FaIdCard, FaCamera, FaCheckCircle, 
  FaPhone, FaEnvelope, FaMapMarkerAlt, FaShieldAlt,
  FaFingerprint, FaGlobe, FaCity, FaHome, FaBirthdayCake
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
      { number: 1, label: 'Personal Info', icon: FaUser },
      { number: 2, label: 'Contact & Address', icon: FaMapMarkerAlt },
      { number: 3, label: 'ID Verification', icon: FaIdCard },
      { number: 4, label: 'Face Capture', icon: FaCamera },
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
            const isCompleted = stepItem.number < currentStep;
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
  const handleFileUpload = (file, type) => {
    setVoterData(prev => ({
      ...prev,
      id_document: file
    }));
    setUploadedID(URL.createObjectURL(file));
  };

  // OTP Verification handlers
  const handleSendOTP = (type) => {
    setOtpType(type);
    setShowOTPModal(true);
    // API call to send OTP would go here
  };

  const handleVerifyOTP = (otp) => {
    // API call to verify OTP would go here
    setVoterData(prev => ({
      ...prev,
      [`${otpType}_verified`]: true
    }));
    setShowOTPModal(false);
    setMessage({ type: 'success', text: `${otpType.toUpperCase()} verified successfully!` });
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
        if (!voterData.phone.trim()) errors.push('Phone number is required');
        if (!voterData.address_line1.trim()) errors.push('Address is required');
        if (!voterData.pincode.trim()) errors.push('Pincode is required');
        break;
      
      case 3:
        if (!voterData.national_id_number.trim()) errors.push('National ID number is required');
        if (!voterData.id_document) errors.push('ID document upload is required');
        break;
    }

    if (errors.length > 0) {
      setMessage({ type: 'danger', text: errors.join(', ') });
      return false;
    }
    return true;
  };

  // Navigation between steps
  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
      setMessage({ type: '', text: '' });
    }
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
    setMessage({ type: '', text: '' });
  };

  // Submit registration
  const submitRegistration = async () => {
    setIsSubmitting(true);
    
    try {
      const response = await voterAPI.register(voterData);
      setVoterId(response.voter_id);
      setStep(5);
      setMessage({ type: 'success', text: 'Registration completed successfully!' });
    } catch (error) {
      setMessage({ 
        type: 'danger', 
        text: error.response?.data?.message || 'Registration failed. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle face capture
  const handleFaceCapture = (imageData, success) => {
    if (success) {
      setVoterData(prev => ({ ...prev, face_verified: true }));
      setMessage({ type: 'success', text: 'Face registration successful!' });
      setTimeout(nextStep, 1000);
    } else {
      setMessage({ type: 'danger', text: 'Face registration failed. Please try again.' });
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
                                  // Real-time age validation feedback is handled in the UI below
                                }}
                                max={new Date().toISOString().split('T')[0]}
                                required
                                className="form-control-custom"
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
                                      ❌ Age: {ageValidation.age} years - Must be 18 or older to register
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
                                      />
                                      <Button 
                                        variant={voterData.email_verified ? "success" : "outline-primary"}
                                        className="ms-2 verify-btn"
                                        onClick={() => handleSendOTP('email')}
                                        disabled={!voterData.email}
                                      >
                                        {voterData.email_verified ? <FaCheckCircle /> : "Verify"}
                                      </Button>
                                    </div>
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
                                      />
                                      <Button 
                                        variant={voterData.phone_verified ? "success" : "outline-primary"}
                                        className="ms-2 verify-btn"
                                        onClick={() => handleSendOTP('phone')}
                                        disabled={!voterData.phone}
                                      >
                                        {voterData.phone_verified ? <FaCheckCircle /> : "Verify"}
                                      </Button>
                                    </div>
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
                              />
                            </Form.Group>
                          </Col>
                          
                          <Col md={6}>
                            <IDUpload 
                              onUpload={handleFileUpload}
                              uploadedFile={uploadedID}
                              idType={voterData.national_id_type}
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
                      />
                    </div>
                  </div>
                )}

                {/* Step 5: Completion */}
                {step === 5 && (
                  <div className="step-content text-center completion-content">
                    <div className="success-animation">
                      <FaCheckCircle className="success-icon" />
                    </div>
                    <h3>Registration Complete! 🎉</h3>
                    <div className="voter-id-badge">
                      <Badge bg="success" className="voter-id">
                        Voter ID: {voterId}
                      </Badge>
                    </div>
                    <div className="completion-details">
                      <p>Your voter registration has been successfully completed.</p>
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
                        disabled={step === 1}
                        className="nav-btn"
                      >
                        Previous
                      </Button>
                      
                      {step === 4 ? (
                        <Button 
                          variant="primary"
                          onClick={submitRegistration}
                          disabled={!voterData.face_verified || isSubmitting}
                          className="nav-btn"
                        >
                          {isSubmitting ? 'Finalizing...' : 'Complete Registration'}
                        </Button>
                      ) : (
                        <Button variant="primary" onClick={nextStep} className="nav-btn">
                          Continue
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
                      className="proceed-btn"
                    >
                      Proceed to Login
                    </Button>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* OTP Verification Modal */}
      <Modal show={showOTPModal} onHide={() => setShowOTPModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Verify {otpType.toUpperCase()}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <OTPVerification 
            type={otpType}
            value={voterData[otpType]}
            onVerify={handleVerifyOTP}
            onResend={() => handleSendOTP(otpType)}
          />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default RegisterPage;