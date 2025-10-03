import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Button, Alert, Card, Spinner } from 'react-bootstrap';

const FaceCapture = ({ onCapture, mode = 'register', voterId = '' }) => {
  const webcamRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: "user"
  };

  // Start camera
  const startCamera = () => {
    setIsCapturing(true);
    setMessage({ type: '', text: '' });
  };

  // Stop camera
  const stopCamera = () => {
    setIsCapturing(false);
    setImgSrc(null);
  };

  // Capture image
  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setImgSrc(imageSrc);
      processImage(imageSrc);
    }
  }, [webcamRef]);

  // Process captured image
  const processImage = async (imageData) => {
    setIsLoading(true);
    setMessage({ type: 'info', text: 'Processing face...' });

    try {
      // Simulate face processing (will replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if face is detected (basic simulation)
      const hasFace = Math.random() > 0.2; // 80% success rate for demo
      
      if (hasFace) {
        setMessage({ type: 'success', text: 'Face detected successfully!' });
        onCapture(imageData, true);
      } else {
        setMessage({ type: 'danger', text: 'No face detected. Please try again.' });
        onCapture(null, false);
      }
    } catch (error) {
      setMessage({ type: 'danger', text: 'Error processing image: ' + error.message });
      onCapture(null, false);
    } finally {
      setIsLoading(false);
    }
  };

  // Retry capture
  const retryCapture = () => {
    setImgSrc(null);
    setMessage({ type: '', text: '' });
  };

  return (
    <Card className="face-capture-component">
      <Card.Header>
        <h5 className="mb-0">
          {mode === 'register' ? '📸 Face Registration' : '🔐 Face Verification'}
        </h5>
      </Card.Header>
      <Card.Body>
        {message.text && (
          <Alert variant={message.type || 'info'}>{message.text}</Alert>
        )}

        {!isCapturing ? (
          <div className="text-center">
            <div className="camera-placeholder mb-3">
              <div style={{fontSize: '4rem'}}>📷</div>
              <p>Camera is off</p>
            </div>
            <Button variant="primary" onClick={startCamera}>
              Start Camera
            </Button>
          </div>
        ) : (
          <>
            {!imgSrc ? (
              <div className="camera-active">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={videoConstraints}
                  className="camera-feed mb-3"
                />
                <div className="text-center">
                  <Button variant="success" onClick={capture} disabled={isLoading}>
                    {isLoading ? <Spinner animation="border" size="sm" /> : 'Capture Photo'}
                  </Button>
                  <Button variant="outline-secondary" onClick={stopCamera} className="ms-2">
                    Stop Camera
                  </Button>
                </div>
              </div>
            ) : (
              <div className="capture-review">
                <div className="text-center mb-3">
                  <h6>Captured Image</h6>
                  <img src={imgSrc} alt="Captured" className="captured-image" />
                </div>
                <div className="text-center">
                  <Button variant="outline-primary" onClick={retryCapture} className="me-2">
                    Retry Capture
                  </Button>
                  <Button variant="outline-secondary" onClick={stopCamera}>
                    Use Different Camera
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Instructions */}
        <div className="mt-4">
          <h6>Instructions:</h6>
          <ul className="small">
            <li>Ensure good lighting</li>
            <li>Look straight at the camera</li>
            <li>Keep a neutral expression</li>
            <li>Remove sunglasses/hats</li>
            <li>Maintain a distance of 1-2 feet</li>
          </ul>
        </div>
      </Card.Body>
    </Card>
  );
};

export default FaceCapture;