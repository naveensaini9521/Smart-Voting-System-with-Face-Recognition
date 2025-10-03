import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';

const OTPVerification = ({ type, value, onVerify, onResend }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    if (timer > 0) {
      const countdown = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(countdown);
    }
  }, [timer]);

  const handleOtpChange = (index, value) => {
    if (/^\d?$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto-focus next input
      if (value && index < 5) {
        document.getElementById(`otp-${index + 1}`)?.focus();
      }
    }
  };

  const handleSubmit = () => {
    onVerify(otp.join(''));
  };

  const handleResend = () => {
    setTimer(60);
    onResend();
  };

  return (
    <div>
      <p>Enter the 6-digit code sent to your {type}: {value}</p>
      
      <Row className="justify-content-center mb-3">
        {otp.map((digit, index) => (
          <Col key={index} xs={2} className="px-1">
            <Form.Control
              id={`otp-${index}`}
              type="text"
              maxLength="1"
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              className="text-center otp-input"
            />
          </Col>
        ))}
      </Row>

      <div className="d-grid gap-2">
        <Button 
          variant="primary" 
          onClick={handleSubmit}
          disabled={otp.some(digit => !digit)}
        >
          Verify OTP
        </Button>
        
        <Button 
          variant="outline-secondary" 
          onClick={handleResend}
          disabled={timer > 0}
        >
          {timer > 0 ? `Resend in ${timer}s` : 'Resend OTP'}
        </Button>
      </div>
    </div>
  );
};

export default OTPVerification;