import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Button, Alert, Card, Spinner, ProgressBar, Badge } from 'react-bootstrap';
import { 
  FaCamera, 
  FaRedo, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaUser,
  FaShieldAlt,
  FaUserPlus,
  FaSignInAlt
} from 'react-icons/fa';

const FaceCapture = ({ 
  onCapture, 
  mode = 'register', // 'register' or 'verify'
  voterId = '', 
  loading = false,
  onReset = null 
}) => {
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

  // Reset when mode changes
  useEffect(() => {
    if (mode) {
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
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access is not supported in this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: videoConstraints 
      });
      
      // Store stream to stop it later
      if (webcamRef.current) {
        webcamRef.current.video.srcObject = stream;
      }
      
      setIsCapturing(true);
      setMessage({ 
        type: 'info', 
        text: mode === 'register' 
          ? 'Camera started. Position your face in the frame for registration.' 
          : 'Camera started. Position your face in the frame for verification.'
      });
      
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
    
    // Stop all video tracks
    if (webcamRef.current && webcamRef.current.video.srcObject) {
      const stream = webcamRef.current.video.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  // Reset capture
  const resetCapture = () => {
    setImgSrc(null);
    setMessage({ type: '', text: '' });
    setCaptureCount(0);
    setIsProcessing(false);
    
    // Call parent reset if provided
    if (onReset) {
      onReset();
    }
  };

  // Capture image
  const capture = useCallback(() => {
    if (webcamRef.current) {
      try {
        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
          console.log('📸 Captured image for', mode, 'mode');
          
          // Ensure consistent format
          let processedImage = imageSrc;
          if (!imageSrc.startsWith('data:image/jpeg;base64,')) {
            processedImage = `data:image/jpeg;base64,${imageSrc}`;
          }
          
          setImgSrc(processedImage);
          simulateFaceDetection(processedImage);
          setCaptureCount(prev => prev + 1);
        } else {
          setMessage({ type: 'danger', text: 'Failed to capture image. Please try again.' });
        }
      } catch (error) {
        console.error('Capture error:', error);
        setMessage({ type: 'danger', text: 'Error capturing image.' });
      }
    }
  }, [webcamRef, mode]);

  // Simulate face detection
  const simulateFaceDetection = async (imageData) => {
    setIsProcessing(true);
    setMessage({ type: 'info', text: 'Analyzing face...' });

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demo, always return success
      const hasFace = true;
      
      if (hasFace) {
        setMessage({ 
          type: 'success', 
          text: mode === 'register' 
            ? 'Face detected! Click "Register Face" to proceed.' 
            : 'Face detected! Click "Verify Face" to proceed.' 
        });
      } else {
        setMessage({ 
          type: 'warning', 
          text: 'Face not detected. Please ensure your face is clearly visible.' 
        });
      }
    } catch (error) {
      console.error('Image processing error:', error);
      setMessage({ 
        type: 'danger', 
        text: 'Error processing image. Please try again.' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle face action based on mode
  const handleFaceAction = () => {
      if (!imgSrc) {
        setMessage({ type: 'danger', text: 'Please capture a photo first.' });
        return;
      }
      
      setIsProcessing(true);
      
      if (mode === 'register') {
        setMessage({ type: 'info', text: 'Registering face...' });
      } else {
        setMessage({ type: 'info', text: 'Verifying face...' });
      }
      
      // Check if voterId is available for registration mode
      if (mode === 'register' && !voterId) {
        setMessage({ 
          type: 'danger', 
          text: 'Voter ID not available. Please restart registration.' 
        });
        setIsProcessing(false);
        return;
      }
      
      // Pass the image data to parent
      if (onCapture) {
        onCapture(imgSrc, true); // Pass true for success
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

  // Get button text based on mode
  const getActionButtonText = () => {
    if (isProcessing) {
      return mode === 'register' ? 'Registering...' : 'Verifying...';
    }
    return mode === 'register' ? 'Register Face' : 'Verify Face';
  };

  // Get title based on mode
  const getTitle = () => {
    return mode === 'register' ? 'Face Registration' : 'Face Verification';
  };

  // Get icon based on mode
  const getIcon = () => {
    return mode === 'register' ? <FaUserPlus className="me-2" /> : <FaSignInAlt className="me-2" />;
  };

  return (
    <Card className="face-capture-component">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">
            <FaCamera className="me-2" />
            {getTitle()}
          </h5>
          {voterId && (
            <small className="text-muted">Voter ID: {voterId}</small>
          )}
        </div>
        {getStatusBadge()}
      </Card.Header>
      
      <Card.Body>
        {(loading || isProcessing) && (
          <div className="loading-overlay">
            <div className="loading-content text-center">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 mb-0">
                {isProcessing 
                  ? (mode === 'register' ? 'Processing face...' : 'Verifying face...')
                  : 'Submitting...'
                }
              </p>
            </div>
          </div>
        )}

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

        {cameraError && (
          <Alert variant="danger">
            <FaExclamationTriangle className="me-2" />
            {cameraError}
          </Alert>
        )}

        {!isCapturing && !cameraError && (
          <div className="text-center camera-setup">
            <div className="camera-placeholder mb-4">
              <div className="camera-icon">
                <FaCamera />
              </div>
              <p className="text-muted mt-3">
                Camera is ready to start
              </p>
              {mode === 'register' ? (
                <p className="text-muted small">This will register your face for secure login</p>
              ) : (
                <p className="text-muted small">This will verify your identity for login</p>
              )}
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
                          ? mode === 'register'
                            ? 'Face detected! Click "Register Face" below.'
                            : 'Face detected! Click "Verify Face" below.'
                          : 'Review your photo'
                        }
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="text-center">
                  <div className="d-grid gap-2 d-md-block">
                    <Button 
                      variant="primary" 
                      onClick={handleFaceAction}
                      disabled={loading || isProcessing}
                      className="me-2"
                    >
                      {isProcessing ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          {mode === 'register' ? 'Registering...' : 'Verifying...'}
                        </>
                      ) : (
                        <>
                          {getIcon()}
                          {getActionButtonText()}
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline-secondary" 
                      onClick={retryCapture}
                      disabled={loading}
                      className="me-2"
                    >
                      <FaRedo className="me-2" />
                      Retry Capture
                    </Button>
                    
                    <Button 
                      variant="outline-secondary" 
                      onClick={stopCamera}
                      disabled={loading}
                    >
                      Use Different Camera
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-4 pt-3 border-top">
          <h6 className="mb-3">
            <FaCheckCircle className="me-2 text-success" />
            Instructions:
          </h6>
          <div className="row">
            <div className="col-md-6">
              <ul className="list-unstyled small">
                <li className="mb-2">✅ Ensure good lighting</li>
                <li className="mb-2">✅ Look straight at camera</li>
                <li className="mb-2">✅ Keep neutral expression</li>
                <li className="mb-2">✅ Keep face within frame</li>
              </ul>
            </div>
            <div className="col-md-6">
              <ul className="list-unstyled small">
                <li className="mb-2">❌ Remove sunglasses/hats</li>
                <li className="mb-2">❌ Avoid strong backlight</li>
                <li className="mb-2">❌ Maintain proper distance</li>
                <li className="mb-2">❌ Avoid shadows on face</li>
              </ul>
            </div>
          </div>
          
          {mode === 'register' && (
            <div className="alert alert-info mt-3">
              <FaShieldAlt className="me-2" />
              <strong>Registration Mode:</strong> Your face will be registered for secure future logins.
            </div>
          )}
          
          {mode === 'verify' && (
            <div className="alert alert-warning mt-3">
              <FaShieldAlt className="me-2" />
              <strong>Verification Mode:</strong> Your face will be compared with your registered face for authentication.
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default FaceCapture;