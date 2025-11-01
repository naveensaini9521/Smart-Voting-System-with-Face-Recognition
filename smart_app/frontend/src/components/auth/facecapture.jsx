import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Button, Alert, Card, Spinner, ProgressBar, Badge } from 'react-bootstrap';
import { FaCamera, FaRedo, FaCheckCircle, FaExclamationTriangle, FaUser } from 'react-icons/fa';

const FaceCapture = ({ onCapture, mode = 'register', voterId = '', loading = false }) => {
  const webcamRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [captureCount, setCaptureCount] = useState(0);
  const [cameraError, setCameraError] = useState(null);

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: "user",
    frameRate: { ideal: 30, max: 60 }
  };

  // Reset component when mode changes
  useEffect(() => {
    if (mode === 'register') {
      resetCapture();
    }
  }, [mode]);

  // Handle camera errors
  const handleCameraError = useCallback((error) => {
    console.error('Camera error:', error);
    setCameraError('Unable to access camera. Please check permissions and try again.');
    setIsCapturing(false);
  }, []);

  // Start camera
  const startCamera = async () => {
    try {
      setCameraError(null);
      setMessage({ type: '', text: '' });
      
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access is not supported in this browser.');
        return;
      }

      // Test camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: videoConstraints 
      });
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());
      
      setIsCapturing(true);
      setMessage({ type: 'info', text: 'Camera started. Position your face in the frame.' });
      
    } catch (error) {
      console.error('Error starting camera:', error);
      handleCameraError(error);
    }
  };

  // Stop camera
  const stopCamera = () => {
    setIsCapturing(false);
    setImgSrc(null);
    setMessage({ type: 'info', text: 'Camera stopped.' });
  };

  // Reset capture
  const resetCapture = () => {
    setImgSrc(null);
    setMessage({ type: '', text: '' });
    setCaptureCount(0);
    setIsProcessing(false);
  };

  // Capture image
  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setImgSrc(imageSrc);
        processImage(imageSrc);
        setCaptureCount(prev => prev + 1);
      } else {
        setMessage({ type: 'danger', text: 'Failed to capture image. Please try again.' });
      }
    }
  }, [webcamRef]);

  // Process captured image
  const processImage = async (imageData) => {
    setIsProcessing(true);
    setMessage({ type: 'info', text: 'Analyzing face... Please wait.' });

    try {
      // Enhanced face detection simulation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // More realistic face detection simulation
      const hasFace = simulateFaceDetection(imageData);
      
      if (hasFace.detected) {
        setMessage({ 
          type: 'success', 
          text: `Face detected successfully! ${hasFace.message}` 
        });
        
        // Call the parent callback with success
        if (onCapture) {
          onCapture(imageData, true);
        }
      } else {
        setMessage({ 
          type: 'warning', 
          text: `Face detection issue: ${hasFace.message}` 
        });
        
        if (onCapture) {
          onCapture(null, false);
        }
      }
    } catch (error) {
      console.error('Image processing error:', error);
      setMessage({ 
        type: 'danger', 
        text: 'Error processing image. Please try again.' 
      });
      
      if (onCapture) {
        onCapture(null, false);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Simulate face detection with more realistic scenarios
  const simulateFaceDetection = (imageData) => {
    const random = Math.random();
    
    if (random > 0.7) {
      return { detected: true, message: 'Face is clear and well-positioned.' };
    } else if (random > 0.4) {
      return { 
        detected: false, 
        message: 'Face is blurry or poorly lit. Please ensure good lighting.' 
      };
    } else if (random > 0.2) {
      return { 
        detected: false, 
        message: 'Multiple faces detected. Please ensure only one face is visible.' 
      };
    } else {
      return { 
        detected: false, 
        message: 'No face detected. Please position your face in the center.' 
      };
    }
  };

  // Retry capture
  const retryCapture = () => {
    setImgSrc(null);
    setMessage({ type: 'info', text: 'Ready to capture new photo.' });
  };

  // Get status badge
  const getStatusBadge = () => {
    if (isProcessing) return <Badge bg="warning">Processing</Badge>;
    if (imgSrc) return <Badge bg="success">Captured</Badge>;
    if (isCapturing) return <Badge bg="primary">Live</Badge>;
    return <Badge bg="secondary">Ready</Badge>;
  };

  return (
    <Card className="face-capture-component">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">
            {mode === 'register' ? (
              <>
                <FaCamera className="me-2" />
                Face Registration
              </>
            ) : (
              <>
                <FaUser className="me-2" />
                Face Verification
              </>
            )}
          </h5>
          {voterId && (
            <small className="text-muted">Voter ID: {voterId}</small>
          )}
        </div>
        {getStatusBadge()}
      </Card.Header>
      
      <Card.Body>
        {/* Loading overlay */}
        {(loading || isProcessing) && (
          <div className="loading-overlay">
            <div className="loading-content text-center">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 mb-0">
                {isProcessing ? 'Processing face...' : 'Submitting...'}
              </p>
            </div>
          </div>
        )}

        {/* Messages */}
        {message.text && (
          <Alert 
            variant={message.type || 'info'} 
            className="alert-custom"
          >
            <div className="d-flex align-items-center">
              {message.type === 'success' && <FaCheckCircle className="me-2" />}
              {message.type === 'danger' && <FaExclamationTriangle className="me-2" />}
              {message.text}
            </div>
          </Alert>
        )}

        {/* Camera Error */}
        {cameraError && (
          <Alert variant="danger">
            <FaExclamationTriangle className="me-2" />
            {cameraError}
          </Alert>
        )}

        {/* Camera not started */}
        {!isCapturing && !cameraError && (
          <div className="text-center camera-setup">
            <div className="camera-placeholder mb-4">
              <div className="camera-icon">
                <FaCamera />
              </div>
              <p className="text-muted mt-3">Camera is ready to start</p>
            </div>
            
            <div className="d-grid gap-2">
              <Button 
                variant="primary" 
                size="lg"
                onClick={startCamera}
                disabled={loading}
              >
                <FaCamera className="me-2" />
                Start Camera
              </Button>
              
              {captureCount > 0 && (
                <Button 
                  variant="outline-secondary" 
                  onClick={resetCapture}
                >
                  <FaRedo className="me-2" />
                  Start Over
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Camera active */}
        {isCapturing && !cameraError && (
          <>
            {!imgSrc ? (
              <div className="camera-active">
                <div className="camera-feed-container mb-3">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={videoConstraints}
                    onUserMediaError={handleCameraError}
                    className="camera-feed"
                    mirrored={true}
                  />
                  <div className="face-guide"></div>
                </div>
                
                <div className="text-center">
                  <Button 
                    variant="success" 
                    size="lg"
                    onClick={capture} 
                    disabled={isProcessing || loading}
                    className="me-2"
                  >
                    {isProcessing ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FaCamera className="me-2" />
                        Capture Photo
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline-secondary" 
                    onClick={stopCamera}
                    disabled={isProcessing}
                  >
                    Stop Camera
                  </Button>
                </div>

                {/* Capture counter */}
                {captureCount > 0 && (
                  <div className="text-center mt-3">
                    <small className="text-muted">
                      Capture attempts: {captureCount}
                    </small>
                  </div>
                )}
              </div>
            ) : (
              <div className="capture-review">
                <div className="text-center mb-4">
                  <h6>Captured Image Preview</h6>
                  <div className="captured-image-container">
                    <img 
                      src={imgSrc} 
                      alt="Captured face" 
                      className="captured-image"
                    />
                  </div>
                  
                  {!isProcessing && (
                    <div className="mt-3">
                      <p className="text-muted">
                        {message.type === 'success' 
                          ? 'Face detected successfully!'
                          : 'Review your photo below'
                        }
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="text-center">
                  <div className="d-grid gap-2 d-md-block">
                    <Button 
                      variant="primary" 
                      onClick={retryCapture}
                      disabled={isProcessing}
                      className="me-2"
                    >
                      <FaRedo className="me-2" />
                      Retry Capture
                    </Button>
                    
                    <Button 
                      variant="outline-secondary" 
                      onClick={stopCamera}
                      disabled={isProcessing}
                    >
                      Use Different Camera
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Instructions */}
        <div className="mt-4 pt-3 border-top">
          <h6 className="mb-3">
            <FaCheckCircle className="me-2 text-success" />
            Capture Instructions:
          </h6>
          <div className="row">
            <div className="col-md-6">
              <ul className="list-unstyled small">
                <li className="mb-2">✅ Ensure good, even lighting</li>
                <li className="mb-2">✅ Look straight at the camera</li>
                <li className="mb-2">✅ Keep a neutral expression</li>
              </ul>
            </div>
            <div className="col-md-6">
              <ul className="list-unstyled small">
                <li className="mb-2">❌ Remove sunglasses/hats</li>
                <li className="mb-2">❌ Maintain 1-2 feet distance</li>
                <li className="mb-2">❌ Avoid shadows on face</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Progress indicator for registration mode */}
        {mode === 'register' && captureCount > 0 && (
          <div className="mt-3">
            <div className="d-flex justify-content-between small text-muted mb-1">
              <span>Registration Progress</span>
              <span>
                {imgSrc && message.type === 'success' ? 'Complete' : 'In Progress'}
              </span>
            </div>
            <ProgressBar 
              now={imgSrc && message.type === 'success' ? 100 : 50} 
              variant={imgSrc && message.type === 'success' ? 'success' : 'primary'}
              animated={!(imgSrc && message.type === 'success')}
            />
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default FaceCapture;