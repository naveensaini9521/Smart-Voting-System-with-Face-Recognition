import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Button, Alert, Form, 
  Badge, ListGroup, Modal, Spinner 
} from 'react-bootstrap';
import { 
  FaShieldAlt, 
  FaMobileAlt, 
  FaDesktop, 
  FaCheckCircle, 
  FaTimesCircle,
  FaSync,
  FaBell,
  FaLock,
  FaKey,
  FaUserShield,
  FaExclamationTriangle
} from 'react-icons/fa';
import { voterAPI } from '../services/api';

const Security = () => {
  const [securitySettings, setSecuritySettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async () => {
    try {
      setLoading(true);
      const response = await voterAPI.getSecuritySettings();
      if (response.success) {
        setSecuritySettings(response.security_settings);
      } else {
        setError(response.message || 'Failed to load security settings');
      }
    } catch (err) {
      setError(err.message || 'Failed to load security settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = async (setting, value) => {
    try {
      setError('');
      setSuccess('');
      
      const updates = { [setting]: value };
      const response = await voterAPI.updateSecuritySettings(updates);
      
      if (response.success) {
        setSecuritySettings(prev => ({ ...prev, ...updates }));
        setSuccess('Security settings updated successfully');
        
        // Reload settings to get updated data
        setTimeout(() => loadSecuritySettings(), 1000);
      } else {
        setError(response.message || 'Failed to update settings');
      }
    } catch (err) {
      setError(err.message || 'Failed to update settings');
    }
  };

  const handleSendOTP = async () => {
    try {
      setOtpLoading(true);
      const response = await voterAPI.sendMobileVerificationOTP();
      if (response.success) {
        setShowOTPModal(true);
        setSuccess('OTP sent to your mobile number');
      } else {
        setError(response.message || 'Failed to send OTP');
      }
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    try {
      setOtpLoading(true);
      const response = await voterAPI.verifyMobileOTP(otpCode);
      if (response.success) {
        setSuccess('Mobile number verified successfully');
        setShowOTPModal(false);
        setOtpCode('');
        // Reload settings to get updated verification status
        loadSecuritySettings();
      } else {
        setError(response.message || 'Invalid OTP code');
      }
    } catch (err) {
      setError(err.message || 'Failed to verify OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <div className="mt-3">
            <p>Loading security settings...</p>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="d-flex align-items-center">
            <FaShieldAlt className="me-3 text-primary" />
            Security Center
          </h2>
          <p className="text-muted">
            Manage your account security and privacy settings
          </p>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" className="d-flex align-items-center">
          <FaExclamationTriangle className="me-2" />
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" className="d-flex align-items-center">
          <FaCheckCircle className="me-2" />
          {success}
        </Alert>
      )}

      <Row>
        {/* Two-Factor Authentication */}
        <Col lg={6} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-white">
              <h5 className="d-flex align-items-center mb-0">
                <FaMobileAlt className="me-2 text-primary" />
                Two-Factor Authentication
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h6>Mobile Verification</h6>
                  <small className="text-muted">
                    Add an extra layer of security to your account
                  </small>
                </div>
                <Badge 
                  bg={securitySettings?.two_factor_enabled ? 'success' : 'warning'}
                  className="fs-6"
                >
                  {securitySettings?.two_factor_enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              
              <Form>
                <Form.Check
                  type="switch"
                  id="2fa-switch"
                  label="Enable Two-Factor Authentication"
                  checked={securitySettings?.two_factor_enabled || false}
                  onChange={(e) => handleSettingChange('two_factor_enabled', e.target.checked)}
                  className="mb-3"
                />
              </Form>

              {!securitySettings?.two_factor_enabled && (
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={handleSendOTP}
                  disabled={otpLoading}
                >
                  {otpLoading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <FaMobileAlt className="me-1" />
                      Verify Mobile Number
                    </>
                  )}
                </Button>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Login Alerts */}
        <Col lg={6} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-white">
              <h5 className="d-flex align-items-center mb-0">
                <FaBell className="me-2 text-primary" />
                Login Alerts
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h6>Security Notifications</h6>
                  <small className="text-muted">
                    Get alerts for new logins and security events
                  </small>
                </div>
                <Badge 
                  bg={securitySettings?.login_alerts ? 'success' : 'secondary'}
                  className="fs-6"
                >
                  {securitySettings?.login_alerts ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              
              <Form>
                <Form.Check
                  type="switch"
                  id="alerts-switch"
                  label="Enable Login Alerts"
                  checked={securitySettings?.login_alerts || false}
                  onChange={(e) => handleSettingChange('login_alerts', e.target.checked)}
                />
              </Form>
            </Card.Body>
          </Card>
        </Col>

        {/* Session Management */}
        <Col lg={6} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-white">
              <h5 className="d-flex align-items-center mb-0">
                <FaDesktop className="me-2 text-primary" />
                Active Sessions
              </h5>
            </Card.Header>
            <Card.Body>
              <h6>Current Sessions</h6>
              <small className="text-muted mb-3 d-block">
                Devices that are currently logged into your account
              </small>
              
              <ListGroup variant="flush">
                {securitySettings?.active_sessions?.map((session, index) => (
                  <ListGroup.Item key={index} className="px-0">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-semibold">{session.device}</div>
                        <small className="text-muted">
                          {session.ip_address} • {session.location}
                        </small>
                        <br />
                        <small className="text-muted">
                          Last active: {new Date(session.last_active).toLocaleString()}
                        </small>
                      </div>
                      <Badge bg="success">
                        <FaCheckCircle className="me-1" />
                        Active
                      </Badge>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
              
              <Button variant="outline-danger" size="sm" className="mt-3">
                <FaTimesCircle className="me-1" />
                Logout All Other Sessions
              </Button>
            </Card.Body>
          </Card>
        </Col>

        {/* Security Preferences */}
        <Col lg={6} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-white">
              <h5 className="d-flex align-items-center mb-0">
                <FaUserShield className="me-2 text-primary" />
                Security Preferences
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <h6>Session Timeout</h6>
                <small className="text-muted">
                  Automatically logout after period of inactivity
                </small>
                <Form.Select 
                  value={securitySettings?.session_timeout || 30}
                  onChange={(e) => handleSettingChange('session_timeout', parseInt(e.target.value))}
                  className="mt-2"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                </Form.Select>
              </div>

              <div className="mb-3">
                <h6>Password Last Changed</h6>
                <small className="text-muted">
                  {securitySettings?.password_last_changed 
                    ? new Date(securitySettings.password_last_changed).toLocaleDateString()
                    : 'Never'
                  }
                </small>
              </div>

              <Button variant="outline-primary" size="sm">
                <FaLock className="me-1" />
                Change Password
              </Button>
            </Card.Body>
          </Card>
        </Col>

        {/* Trusted Devices */}
        <Col lg={12} className="mb-4">
          <Card className="shadow-sm">
            <Card.Header className="bg-white">
              <h5 className="d-flex align-items-center mb-0">
                <FaKey className="me-2 text-primary" />
                Trusted Devices
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                {securitySettings?.trusted_devices?.map((device, index) => (
                  <Col md={6} key={index} className="mb-3">
                    <Card className="border-0 bg-light">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h6 className="mb-1">{device.device_name}</h6>
                            <small className="text-muted d-block">
                              {device.browser} • {device.os}
                            </small>
                            <small className="text-muted">
                              Last used: {new Date(device.last_used).toLocaleDateString()}
                            </small>
                          </div>
                          <Badge bg={device.is_trusted ? 'success' : 'warning'}>
                            {device.is_trusted ? 'Trusted' : 'Pending'}
                          </Badge>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* OTP Verification Modal */}
      <Modal show={showOTPModal} onHide={() => setShowOTPModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Verify Mobile Number</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Enter the 6-digit OTP sent to your mobile number:</p>
          <Form.Group className="mb-3">
            <Form.Label>OTP Code</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter OTP"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              maxLength={6}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowOTPModal(false)}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleVerifyOTP}
            disabled={otpLoading || otpCode.length !== 6}
          >
            {otpLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Verifying...
              </>
            ) : (
              'Verify OTP'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Security;