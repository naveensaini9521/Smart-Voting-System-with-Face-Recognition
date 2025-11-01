import React from 'react';
import { Card, Button, Badge, Row, Col } from 'react-bootstrap';
import { FaUser, FaEnvelope, FaPhone, FaIdCard, FaMapMarkerAlt, FaVoteYea, FaEdit, FaCheckCircle } from 'react-icons/fa';

const ProfileTab = ({ profileData }) => {
  const safeRender = (value, defaultValue = 'N/A') => {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    return value.toString();
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    try {
      return new Date(dateValue).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const VerifiedField = ({ label, value, verified, icon: Icon }) => (
    <div className="mb-3">
      <small className="text-muted d-block">{label}</small>
      <div className="d-flex align-items-center">
        <Icon className="text-primary me-2" />
        <span className="fw-semibold">{value}</span>
        {verified && <FaCheckCircle className="text-success ms-2" title="Verified" />}
      </div>
    </div>
  );

  const ProfileField = ({ label, value }) => (
    <div className="mb-3">
      <small className="text-muted d-block">{label}</small>
      <div className="fw-semibold">{value}</div>
    </div>
  );

  if (!profileData) {
    return (
      <Card className="shadow-sm border-0">
        <Card.Body className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading profile data...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-0">
      <Card.Header className="bg-white border-0">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0 d-flex align-items-center">
            <FaUser className="me-2 text-primary" />
            My Profile
          </h5>
          <Button variant="outline-primary" size="sm">
            <FaEdit className="me-1" />
            Edit Profile
          </Button>
        </div>
      </Card.Header>
      <Card.Body>
        {/* Profile Header */}
        <div className="text-center mb-4 py-4 bg-light rounded">
          <div className="bg-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
               style={{ width: '80px', height: '80px' }}>
            <FaUser className="text-white fs-3" />
          </div>
          <h4>{safeRender(profileData.full_name)}</h4>
          <p className="text-muted">Voter ID: {safeRender(profileData.voter_id)}</p>
          <div className="d-flex justify-content-center gap-2">
            <Badge bg="success">Verified Voter</Badge>
            <Badge bg="info">{safeRender(profileData.constituency)}</Badge>
          </div>
        </div>

        <Row>
          <Col lg={6}>
            <Card className="border-0 bg-light">
              <Card.Body>
                <h6 className="border-bottom pb-2 mb-3">
                  <FaUser className="me-2" />
                  Personal Information
                </h6>
                <ProfileField label="Full Name" value={safeRender(profileData.full_name)} />
                <ProfileField label="Father's Name" value={safeRender(profileData.father_name)} />
                <ProfileField label="Mother's Name" value={safeRender(profileData.mother_name)} />
                <ProfileField label="Gender" value={safeRender(profileData.gender)} />
                <ProfileField label="Date of Birth" value={formatDate(profileData.date_of_birth)} />
              </Card.Body>
            </Card>
          </Col>
          
          <Col lg={6}>
            <Card className="border-0 bg-light">
              <Card.Body>
                <h6 className="border-bottom pb-2 mb-3">
                  <FaEnvelope className="me-2" />
                  Contact Information
                </h6>
                <VerifiedField 
                  label="Email" 
                  value={safeRender(profileData.email)}
                  verified={profileData.verification_status?.email}
                  icon={FaEnvelope}
                />
                <VerifiedField 
                  label="Phone" 
                  value={safeRender(profileData.phone)}
                  verified={profileData.verification_status?.phone}
                  icon={FaPhone}
                />
                <VerifiedField 
                  label="National ID" 
                  value={`${safeRender(profileData.national_id?.number)} (${safeRender(profileData.national_id?.type)})`}
                  verified={profileData.verification_status?.id}
                  icon={FaIdCard}
                />
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="mt-3">
          <Col lg={8}>
            <Card className="border-0 bg-light">
              <Card.Body>
                <h6 className="border-bottom pb-2 mb-3">
                  <FaMapMarkerAlt className="me-2" />
                  Address Information
                </h6>
                <Row>
                  <Col md={6}>
                    <ProfileField label="Address Line 1" value={safeRender(profileData.address?.address_line1)} />
                    <ProfileField label="City/Village" value={safeRender(profileData.address?.village_city)} />
                    <ProfileField label="District" value={safeRender(profileData.address?.district)} />
                  </Col>
                  <Col md={6}>
                    <ProfileField label="State" value={safeRender(profileData.address?.state)} />
                    <ProfileField label="Pincode" value={safeRender(profileData.address?.pincode)} />
                    <ProfileField label="Country" value={safeRender(profileData.address?.country)} />
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
          
          <Col lg={4}>
            <Card className="border-0 bg-light">
              <Card.Body>
                <h6 className="border-bottom pb-2 mb-3">
                  <FaVoteYea className="me-2" />
                  Election Details
                </h6>
                <ProfileField label="Constituency" value={safeRender(profileData.constituency)} />
                <ProfileField label="Polling Station" value={safeRender(profileData.polling_station)} />
                <ProfileField label="Registration Date" value={formatDate(profileData.registration_date)} />
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default ProfileTab;