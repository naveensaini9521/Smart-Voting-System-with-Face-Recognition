import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, ProgressBar, Modal, Badge } from 'react-bootstrap';

const RegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [recording, setRecording] = useState(false);
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [capturedPhotos, setCapturedPhotos] = useState({});
  const [captureProgress, setCaptureProgress] = useState(0);
  const [currentPose, setCurrentPose] = useState('front');
  const [bodyMarks, setBodyMarks] = useState([]);
  const [newBodyMark, setNewBodyMark] = useState({ type: '', location: '', description: '' });

  const videoRef = useRef(null);
  const photoCanvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const progressIntervalRef = useRef(null);
  const photoIntervalRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    idType: '',
    idNumber: '',
    
    // Address Information
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    
    // Additional Voter Information
    previousVoterId: '',
    constituency: '',
    pollingStation: '',
    
    // Biometric Data
    faceVideo: null,
    posePhotos: {
      front: null,
      left: null,
      right: null,
      up: null,
      down: null
    },
    bodyMarks: []
  });

  // ID Type options
  const idTypeOptions = [
    { value: 'aadhaar', label: 'Aadhaar Card' },
    { value: 'passport', label: 'Passport' },
    { value: 'driving_license', label: 'Driving License' },
    { value: 'pan_card', label: 'PAN Card' },
    { value: 'voter_id', label: 'Voter ID' },
    { value: 'other', label: 'Other' }
  ];

  // Body mark types
  const bodyMarkTypes = [
    'Birthmark', 'Scar', 'Tattoo', 'Mole', 'Freckles', 'Other'
  ];

  // Body locations
  const bodyLocations = [
    'Face', 'Neck', 'Left Arm', 'Right Arm', 'Left Hand', 'Right Hand',
    'Chest', 'Back', 'Left Leg', 'Right Leg', 'Left Foot', 'Right Foot', 'Other'
  ];

  // Background images for voting registration
  const backgroundImages = [
    'https://images.unsplash.com/photo-1555848969-2c6c707af528?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
    'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
    'https://images.unsplash.com/photo-1576086213369-97a306d36557?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80'
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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle body mark input changes
  const handleBodyMarkChange = (e) => {
    const { name, value } = e.target;
    setNewBodyMark(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add body mark
  const addBodyMark = () => {
    if (newBodyMark.type && newBodyMark.location) {
      const mark = {
        id: Date.now(),
        type: newBodyMark.type,
        location: newBodyMark.location,
        description: newBodyMark.description,
        timestamp: new Date().toLocaleString()
      };
      
      setBodyMarks(prev => [...prev, mark]);
      setNewBodyMark({ type: '', location: '', description: '' });
    }
  };

  // Remove body mark
  const removeBodyMark = (id) => {
    setBodyMarks(prev => prev.filter(mark => mark.id !== id));
  };

  // Handle face video capture
  const handleFaceVideoCapture = () => {
    setCurrentPose('front');
    setShowVideoModal(true);
  };

  // Handle photo capture
  const handlePhotoCapture = (pose) => {
    setCurrentPose(pose);
    setShowPhotoModal(true);
  };

  // Start video recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 },
        audio: true 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        
        setFormData(prev => ({
          ...prev,
          faceVideo: blob
        }));
        
        setRecordedVideo(videoUrl);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);

      // Start progress bar for 10 seconds (reduced from 20)
      setCaptureProgress(0);
      let progress = 0;
      progressIntervalRef.current = setInterval(() => {
        progress += 100 / 10; // 10 seconds total
        setCaptureProgress(progress);
        
        if (progress >= 100) {
          stopRecording();
        }
      }, 1000);

    } catch (err) {
      setError('Error accessing camera: ' + err.message);
    }
  };

  // Capture photo
  const capturePhoto = () => {
    if (videoRef.current && photoCanvasRef.current) {
      const video = videoRef.current;
      const canvas = photoCanvasRef.current;
      const context = canvas.getContext('2d');
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to blob
      canvas.toBlob((blob) => {
        const photoUrl = URL.createObjectURL(blob);
        
        setFormData(prev => ({
          ...prev,
          posePhotos: {
            ...prev.posePhotos,
            [currentPose]: blob
          }
        }));
        
        setCapturedPhotos(prev => ({
          ...prev,
          [currentPose]: photoUrl
        }));
        
        setCapturingPhoto(false);
      }, 'image/jpeg', 0.9);
    }
  };

  // Start photo capture session
  const startPhotoCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setCapturingPhoto(true);
      
      // Auto-capture photo after 3 seconds
      setTimeout(() => {
        capturePhoto();
      }, 3000);
      
    } catch (err) {
      setError('Error accessing camera: ' + err.message);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }
  };

  // Close modals
  const handleCloseVideoModal = () => {
    setShowVideoModal(false);
    setRecordedVideo(null);
    setCaptureProgress(0);
    if (recording) {
      stopRecording();
    }
  };

  const handleClosePhotoModal = () => {
    setShowPhotoModal(false);
    setCapturingPhoto(false);
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // Add body marks to form data
    const finalFormData = {
      ...formData,
      bodyMarks: bodyMarks
    };

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      setMessage('Voter registration submitted successfully!');
      setCurrentStep(1);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        idType: '',
        idNumber: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        previousVoterId: '',
        constituency: '',
        pollingStation: '',
        faceVideo: null,
        posePhotos: {
          front: null,
          left: null,
          right: null,
          up: null,
          down: null
        }
      });
      setBodyMarks([]);
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Next step
  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  // Previous step
  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  return (
    <div 
      className="min-vh-100 d-flex align-items-center justify-content-center py-5"
      style={{
        background: `linear-gradient(rgba(255,255,255,0.9), rgba(255,255,255,0.9)), url(${backgroundImages[currentBgIndex]})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        transition: 'background-image 1s ease-in-out'
      }}
    >
      <Container>
        <Row className="justify-content-center">
          <Col lg={10} xl={8}>
            <Card className="shadow-lg border-0 rounded-3">
              <Card.Header className="bg-dark text-white text-center py-4">
                <h2 className="mb-0">Voter Registration Portal</h2>
                <p className="mb-0 mt-2">Complete your voter registration in 4 simple steps</p>
              </Card.Header>
              
              <Card.Body className="p-4">
                {/* Progress Bar */}
                <div className="mb-4">
                  <ProgressBar now={(currentStep / 4) * 100} className="mb-3" />
                  <div className="d-flex justify-content-between">
                    <span className={currentStep >= 1 ? "fw-bold text-primary" : "text-muted"}>Personal Info</span>
                    <span className={currentStep >= 2 ? "fw-bold text-primary" : "text-muted"}>Address Info</span>
                    <span className={currentStep >= 3 ? "fw-bold text-primary" : "text-muted"}>Biometric Data</span>
                    <span className={currentStep >= 4 ? "fw-bold text-primary" : "text-muted"}>Review & Submit</span>
                  </div>
                </div>

                {message && <Alert variant="success">{message}</Alert>}
                {error && <Alert variant="danger">{error}</Alert>}

                <Form onSubmit={handleSubmit}>
                  {/* Step 1: Personal Information */}
                  {currentStep === 1 && (
                    <div>
                      <h4 className="mb-4 text-center">Personal Information</h4>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>First Name *</Form.Label>
                            <Form.Control
                              type="text"
                              name="firstName"
                              value={formData.firstName}
                              onChange={handleInputChange}
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Last Name *</Form.Label>
                            <Form.Control
                              type="text"
                              name="lastName"
                              value={formData.lastName}
                              onChange={handleInputChange}
                              required
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Email Address *</Form.Label>
                            <Form.Control
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Phone Number *</Form.Label>
                            <Form.Control
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                              required
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Row>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Date of Birth *</Form.Label>
                            <Form.Control
                              type="date"
                              name="dateOfBirth"
                              value={formData.dateOfBirth}
                              onChange={handleInputChange}
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Gender *</Form.Label>
                            <Form.Select
                              name="gender"
                              value={formData.gender}
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
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>ID Type *</Form.Label>
                            <Form.Select
                              name="idType"
                              value={formData.idType}
                              onChange={handleInputChange}
                              required
                            >
                              <option value="">Select ID Type</option>
                              {idTypeOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      </Row>

                      <Form.Group className="mb-3">
                        <Form.Label>ID Number *</Form.Label>
                        <Form.Control
                          type="text"
                          name="idNumber"
                          value={formData.idNumber}
                          onChange={handleInputChange}
                          required
                          placeholder={`Enter your ${idTypeOptions.find(opt => opt.value === formData.idType)?.label || 'ID'} number`}
                        />
                      </Form.Group>
                    </div>
                  )}

                  {/* Step 2: Address Information */}
                  {currentStep === 2 && (
                    <div>
                      <h4 className="mb-4 text-center">Address Information</h4>
                      <Form.Group className="mb-3">
                        <Form.Label>Address *</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          required
                        />
                      </Form.Group>

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>City *</Form.Label>
                            <Form.Control
                              type="text"
                              name="city"
                              value={formData.city}
                              onChange={handleInputChange}
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
                              value={formData.state}
                              onChange={handleInputChange}
                              required
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>ZIP Code *</Form.Label>
                            <Form.Control
                              type="text"
                              name="zipCode"
                              value={formData.zipCode}
                              onChange={handleInputChange}
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Country *</Form.Label>
                            <Form.Control
                              type="text"
                              name="country"
                              value={formData.country}
                              onChange={handleInputChange}
                              required
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </div>
                  )}

                  {/* Step 3: Voter Information & Biometric Data */}
                  {currentStep === 3 && (
                    <div>
                      <h4 className="mb-4 text-center">Voter Information & Biometric Data</h4>
                      
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Previous Voter ID (if any)</Form.Label>
                            <Form.Control
                              type="text"
                              name="previousVoterId"
                              value={formData.previousVoterId}
                              onChange={handleInputChange}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Constituency *</Form.Label>
                            <Form.Control
                              type="text"
                              name="constituency"
                              value={formData.constituency}
                              onChange={handleInputChange}
                              required
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Form.Group className="mb-4">
                        <Form.Label>Polling Station *</Form.Label>
                        <Form.Control
                          type="text"
                          name="pollingStation"
                          value={formData.pollingStation}
                          onChange={handleInputChange}
                          required
                        />
                      </Form.Group>

                      <hr className="my-4" />
                      
                      <h5 className="mb-3">Biometric Data Collection</h5>
                      
                      {/* Face Video Capture */}
                      <div className="mb-4 p-3 border rounded">
                        <h6>Front Face Video (10 seconds)</h6>
                        <p className="text-muted small">
                          Please look directly at the camera for 10 seconds. Ensure good lighting and keep your face clearly visible.
                        </p>
                        <Button 
                          variant={formData.faceVideo ? "success" : "primary"}
                          onClick={handleFaceVideoCapture}
                          className="me-2"
                        >
                          {formData.faceVideo ? "✓ Video Captured" : "Capture Face Video (10s)"}
                        </Button>
                      </div>

                      {/* Pose Photo Captures */}
                      <div className="mb-4 p-3 border rounded">
                        <h6>Pose Photos</h6>
                        <p className="text-muted small">
                          Capture photos from different angles for verification purposes.
                        </p>
                        <div className="d-flex flex-wrap gap-2 mb-3">
                          {['front', 'left', 'right', 'up', 'down'].map((pose) => (
                            <Button
                              key={pose}
                              variant={formData.posePhotos[pose] ? "success" : "outline-primary"}
                              onClick={() => handlePhotoCapture(pose)}
                              size="sm"
                            >
                              {formData.posePhotos[pose] ? "✓ " : ""}
                              {pose.charAt(0).toUpperCase() + pose.slice(1)} View
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Body Marks Section */}
                      <div className="p-3 border rounded">
                        <h6>Body Marks Identification</h6>
                        <p className="text-muted small">
                          Please identify any birthmarks, scars, tattoos, or other distinguishing marks.
                        </p>
                        
                        <Row className="mb-3">
                          <Col md={4}>
                            <Form.Group>
                              <Form.Label>Mark Type *</Form.Label>
                              <Form.Select
                                name="type"
                                value={newBodyMark.type}
                                onChange={handleBodyMarkChange}
                              >
                                <option value="">Select Type</option>
                                {bodyMarkTypes.map(type => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          <Col md={4}>
                            <Form.Group>
                              <Form.Label>Location *</Form.Label>
                              <Form.Select
                                name="location"
                                value={newBodyMark.location}
                                onChange={handleBodyMarkChange}
                              >
                                <option value="">Select Location</option>
                                {bodyLocations.map(location => (
                                  <option key={location} value={location}>{location}</option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          <Col md={4}>
                            <Form.Group>
                              <Form.Label>Description</Form.Label>
                              <Form.Control
                                type="text"
                                name="description"
                                value={newBodyMark.description}
                                onChange={handleBodyMarkChange}
                                placeholder="e.g., Size, color, shape"
                              />
                            </Form.Group>
                          </Col>
                        </Row>
                        
                        <Button 
                          variant="outline-primary" 
                          onClick={addBodyMark}
                          disabled={!newBodyMark.type || !newBodyMark.location}
                        >
                          Add Body Mark
                        </Button>

                        {/* Display added body marks */}
                        {bodyMarks.length > 0 && (
                          <div className="mt-3">
                            <h6>Added Body Marks:</h6>
                            {bodyMarks.map(mark => (
                              <Badge 
                                key={mark.id} 
                                bg="light" 
                                text="dark" 
                                className="me-2 mb-2 p-2"
                              >
                                {mark.type} on {mark.location}
                                {mark.description && ` (${mark.description})`}
                                <Button 
                                  variant="link" 
                                  size="sm" 
                                  className="text-danger p-0 ms-2"
                                  onClick={() => removeBodyMark(mark.id)}
                                >
                                  ×
                                </Button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 4: Review and Submit */}
                  {currentStep === 4 && (
                    <div>
                      <h4 className="mb-4 text-center">Review Your Information</h4>
                      
                      <Card className="mb-4">
                        <Card.Header>
                          <h5 className="mb-0">Personal Information</h5>
                        </Card.Header>
                        <Card.Body>
                          <Row>
                            <Col md={6}>
                              <p><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
                              <p><strong>Email:</strong> {formData.email}</p>
                              <p><strong>Phone:</strong> {formData.phone}</p>
                            </Col>
                            <Col md={6}>
                              <p><strong>Date of Birth:</strong> {formData.dateOfBirth}</p>
                              <p><strong>Gender:</strong> {formData.gender}</p>
                              <p><strong>ID Type:</strong> {idTypeOptions.find(opt => opt.value === formData.idType)?.label}</p>
                              <p><strong>ID Number:</strong> {formData.idNumber}</p>
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>

                      <Card className="mb-4">
                        <Card.Header>
                          <h5 className="mb-0">Address Information</h5>
                        </Card.Header>
                        <Card.Body>
                          <p><strong>Address:</strong> {formData.address}</p>
                          <p><strong>City:</strong> {formData.city}, <strong>State:</strong> {formData.state}</p>
                          <p><strong>ZIP Code:</strong> {formData.zipCode}, <strong>Country:</strong> {formData.country}</p>
                        </Card.Body>
                      </Card>

                      <Card className="mb-4">
                        <Card.Header>
                          <h5 className="mb-0">Voter Information</h5>
                        </Card.Header>
                        <Card.Body>
                          <p><strong>Constituency:</strong> {formData.constituency}</p>
                          <p><strong>Polling Station:</strong> {formData.pollingStation}</p>
                          {formData.previousVoterId && (
                            <p><strong>Previous Voter ID:</strong> {formData.previousVoterId}</p>
                          )}
                        </Card.Body>
                      </Card>

                      <Card className="mb-4">
                        <Card.Header>
                          <h5 className="mb-0">Biometric Data Status</h5>
                        </Card.Header>
                        <Card.Body>
                          <p>
                            <strong>Face Video:</strong> 
                            <span className={formData.faceVideo ? "text-success" : "text-danger"}>
                              {formData.faceVideo ? " ✓ Captured" : " ✗ Not Captured"}
                            </span>
                          </p>
                          <p><strong>Pose Photos:</strong></p>
                          <ul>
                            {Object.entries(formData.posePhotos).map(([pose, photo]) => (
                              <li key={pose}>
                                {pose.charAt(0).toUpperCase() + pose.slice(1)}: 
                                <span className={photo ? "text-success" : "text-danger"}>
                                  {photo ? " ✓ Captured" : " ✗ Not Captured"}
                                </span>
                              </li>
                            ))}
                          </ul>
                          
                          <p><strong>Body Marks:</strong> {bodyMarks.length} recorded</p>
                          {bodyMarks.length > 0 && (
                            <ul>
                              {bodyMarks.map(mark => (
                                <li key={mark.id}>
                                  {mark.type} on {mark.location}
                                  {mark.description && ` - ${mark.description}`}
                                </li>
                              ))}
                            </ul>
                          )}
                        </Card.Body>
                      </Card>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="d-flex justify-content-between mt-4">
                    <Button
                      variant="outline-secondary"
                      onClick={prevStep}
                      disabled={currentStep === 1}
                    >
                      Previous
                    </Button>
                    
                    {currentStep < 4 ? (
                      <Button
                        variant="primary"
                        onClick={nextStep}
                      >
                        Next
                      </Button>
                    ) : (
                      <Button
                        variant="success"
                        type="submit"
                        disabled={loading || !formData.faceVideo}
                      >
                        {loading ? <Spinner animation="border" size="sm" /> : 'Submit Registration'}
                      </Button>
                    )}
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Video Capture Modal */}
      <Modal show={showVideoModal} onHide={handleCloseVideoModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Capture Face Video (10 seconds)</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {!recordedVideo ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-100 border rounded mb-3"
                style={{ maxHeight: '400px' }}
              />
              
              <ProgressBar 
                now={captureProgress} 
                className="mb-3" 
                variant={recording ? "success" : "primary"}
              />
              
              <div className="d-flex justify-content-center gap-2">
                {!recording ? (
                  <Button variant="primary" onClick={startRecording}>
                    Start Recording (10 seconds)
                  </Button>
                ) : (
                  <Button variant="danger" onClick={stopRecording}>
                    Stop Recording ({Math.round(captureProgress/10)}s)
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <video
                src={recordedVideo}
                controls
                className="w-100 border rounded mb-3"
                style={{ maxHeight: '400px' }}
              />
              <div className="d-flex justify-content-center gap-2">
                <Button variant="outline-secondary" onClick={() => setRecordedVideo(null)}>
                  Retake Video
                </Button>
                <Button variant="success" onClick={handleCloseVideoModal}>
                  Use This Video
                </Button>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* Photo Capture Modal */}
      <Modal show={showPhotoModal} onHide={handleClosePhotoModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Capture {currentPose.charAt(0).toUpperCase() + currentPose.slice(1)} View Photo</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {!capturedPhotos[currentPose] ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-100 border rounded mb-3"
                style={{ maxHeight: '400px' }}
              />
              
              <canvas ref={photoCanvasRef} style={{ display: 'none' }} />
              
              <div className="d-flex justify-content-center gap-2">
                {!capturingPhoto ? (
                  <Button variant="primary" onClick={startPhotoCapture}>
                    Capture Photo (Auto in 3s)
                  </Button>
                ) : (
                  <div className="text-warning">
                    <Spinner animation="border" size="sm" className="me-2" />
                    Preparing to capture...
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <img
                src={capturedPhotos[currentPose]}
                alt={`${currentPose} view`}
                className="w-100 border rounded mb-3"
                style={{ maxHeight: '400px', objectFit: 'contain' }}
              />
              <div className="d-flex justify-content-center gap-2">
                <Button variant="outline-secondary" onClick={() => {
                  setCapturedPhotos(prev => {
                    const newPhotos = {...prev};
                    delete newPhotos[currentPose];
                    return newPhotos;
                  });
                }}>
                  Retake Photo
                </Button>
                <Button variant="success" onClick={handleClosePhotoModal}>
                  Use This Photo
                </Button>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default RegisterPage;