import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Button, Alert, Spinner, Nav, Tab, 
  Badge, Modal, Form, ProgressBar, ListGroup, Dropdown, Carousel
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { voterAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  FaTachometerAlt, 
  FaUser, 
  FaVoteYea, 
  FaHistory, 
  FaSignOutAlt,
  FaCheckCircle,
  FaClock,
  FaMapMarkerAlt,
  FaIdCard,
  FaEnvelope,
  FaPhone,
  FaBell,
  FaCog,
  FaUsers,
  FaChartBar,
  FaUniversity,
  FaSchool,
  FaHome,
  FaCity,
  FaGlobeAmericas,
  FaCalendarAlt,
  FaSearch,
  FaFilter,
  FaDownload,
  FaShare,
  FaEye,
  FaEdit,
  FaShieldAlt,
  FaQrcode,
  FaMobileAlt,
  FaDesktop,
  FaSync,
  FaExclamationTriangle,
  FaInfoCircle
} from 'react-icons/fa';

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout, user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [electionType, setElectionType] = useState('all');

  // Helper function to safely format dates from MongoDB
  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    
    try {
      if (typeof dateValue === 'object' && dateValue.$date) {
        return new Date(dateValue.$date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      
      if (dateValue instanceof Date || typeof dateValue === 'string') {
        return new Date(dateValue).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      
      return 'Invalid Date';
    } catch (error) {
      console.error('Error formatting date:', dateValue, error);
      return 'Invalid Date';
    }
  };

  const formatDateTime = (dateValue) => {
    if (!dateValue) return 'N/A';
    
    try {
      if (typeof dateValue === 'object' && dateValue.$date) {
        return new Date(dateValue.$date).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      if (dateValue instanceof Date || typeof dateValue === 'string') {
        return new Date(dateValue).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      return 'Invalid Date';
    } catch (error) {
      console.error('Error formatting date-time:', dateValue, error);
      return 'Invalid Date';
    }
  };

  const safeRender = (value, defaultValue = 'N/A') => {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    
    if (typeof value === 'object' && value.$date) {
      return formatDate(value);
    }
    
    if (typeof value === 'object' && !(value instanceof Date)) {
      return '[Object]';
    }
    
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    return value.toString();
  };

  // Election types data
  const electionTypes = [
    { id: 'national', name: 'National Elections', icon: FaGlobeAmericas, color: 'primary' },
    { id: 'state', name: 'State Elections', icon: FaCity, color: 'success' },
    { id: 'local', name: 'Local Body Elections', icon: FaHome, color: 'info' },
    { id: 'university', name: 'University Elections', icon: FaUniversity, color: 'warning' },
    { id: 'college', name: 'College Elections', icon: FaUniversity, color: 'secondary' },
    { id: 'school', name: 'School Elections', icon: FaSchool, color: 'light' },
    { id: 'village', name: 'Village Council', icon: FaUsers, color: 'dark' },
    { id: 'organization', name: 'Organization', icon: FaChartBar, color: 'danger' }
  ];

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadDashboardData();
  }, [isAuthenticated, authLoading, navigate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [dashboardResponse, profileResponse] = await Promise.all([
        voterAPI.getDashboardData(),
        voterAPI.getProfile()
      ]);

      if (dashboardResponse.success) {
        setDashboardData(sanitizeDashboardData(dashboardResponse.dashboard_data));
      } else {
        setError(dashboardResponse.message || 'Failed to load dashboard data');
      }

      if (profileResponse.success) {
        setProfileData(sanitizeProfileData(profileResponse.profile_data));
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load dashboard data. Please try again.';
      setError(errorMsg);
      
      if (err.response?.status === 401) {
        logout();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const sanitizeDashboardData = (data) => {
    if (!data) return null;
    
    return {
      ...data,
      voter_info: {
        ...data.voter_info,
        registration_date: data.voter_info?.registration_date || 'N/A',
        last_login: data.voter_info?.last_login || 'N/A'
      },
      election_info: {
        ...data.election_info,
        upcoming_elections: (data.election_info?.upcoming_elections || []).map(election => ({
          ...election,
          date: election.date || 'N/A'
        }))
      },
      quick_stats: data.quick_stats || {}
    };
  };

  const sanitizeProfileData = (data) => {
    if (!data) return null;
    
    return {
      ...data,
      date_of_birth: data.date_of_birth || 'N/A',
      registration_date: data.registration_date || 'N/A',
      verification_status: data.verification_status || {},
      address: data.address || {},
      national_id: data.national_id || {}
    };
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleRetry = () => {
    loadDashboardData();
  };

  const getElectionIcon = (type) => {
    const electionType = electionTypes.find(et => et.id === type);
    return electionType ? electionType.icon : FaVoteYea;
  };

  const getElectionColor = (type) => {
    const electionType = electionTypes.find(et => et.id === type);
    return electionType ? electionType.color : 'primary';
  };

  if (authLoading || loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-gradient-primary">
        <div className="text-center text-white">
          <Spinner animation="border" variant="light" style={{ width: '3rem', height: '3rem' }} />
          <div className="mt-3">
            <h5>{authLoading ? 'Checking Authentication...' : 'Loading Dashboard...'}</h5>
            <p className="opacity-75">Please wait while we load your information</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <div className="mt-3">
            <p>Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* Enhanced Header */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-gradient-primary shadow">
        <Container fluid>
          <span className="navbar-brand d-flex align-items-center fw-bold">
            <FaTachometerAlt className="me-2 fs-4" />
            <span className="d-none d-sm-inline">Voter Portal</span>
            <span className="d-inline d-sm-none">Dashboard</span>
          </span>
          
          <div className="navbar-nav ms-auto align-items-center flex-row">
            <Button 
              variant="outline-light" 
              size="sm" 
              className="me-2 position-relative"
              onClick={() => setShowNotifications(true)}
            >
              <FaBell />
              <Badge bg="danger" pill className="position-absolute top-0 start-100 translate-middle">
                3
              </Badge>
            </Button>
            
            <Dropdown align="end">
              <Dropdown.Toggle variant="outline-light" size="sm" className="d-flex align-items-center">
                <FaUser className="me-1" />
                {safeRender(dashboardData?.voter_info?.full_name?.split(' ')[0])}
              </Dropdown.Toggle>
              
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => setActiveTab('profile')}>
                  <FaUser className="me-2" />
                  My Profile
                </Dropdown.Item>
                <Dropdown.Item onClick={() => setShowSettings(true)}>
                  <FaCog className="me-2" />
                  Settings
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout}>
                  <FaSignOutAlt className="me-2" />
                  Logout
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </Container>
      </nav>

      <Container fluid className="py-4">
        {error && (
          <Alert variant="danger" className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <FaExclamationTriangle className="me-2" />
              {error}
            </div>
            <Button variant="outline-danger" size="sm" onClick={handleRetry}>
              <FaSync className="me-1" />
              Retry
            </Button>
          </Alert>
        )}
        
        {dashboardData ? (
          <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
            <Row>
              {/* Enhanced Sidebar Navigation */}
              <Col lg={2} md={3} className="mb-4">
                <Card className="shadow-sm border-0 h-100">
                  <Card.Body className="p-0 d-flex flex-column">
                    {/* Main Navigation */}
                    <Nav variant="pills" className="flex-column flex-grow-1">
                      <Nav.Item>
                        <Nav.Link eventKey="overview" className="d-flex align-items-center py-3 border-bottom">
                          <FaTachometerAlt className="me-3 fs-5" />
                          <span>Overview</span>
                        </Nav.Link>
                      </Nav.Item>
                      <Nav.Item>
                        <Nav.Link eventKey="profile" className="d-flex align-items-center py-3 border-bottom">
                          <FaUser className="me-3 fs-5" />
                          <span>My Profile</span>
                        </Nav.Link>
                      </Nav.Item>
                      <Nav.Item>
                        <Nav.Link eventKey="elections" className="d-flex align-items-center py-3 border-bottom">
                          <FaVoteYea className="me-3 fs-5" />
                          <span>Elections</span>
                          <Badge bg="primary" pill className="ms-2">8</Badge>
                        </Nav.Link>
                      </Nav.Item>
                      <Nav.Item>
                        <Nav.Link eventKey="history" className="d-flex align-items-center py-3 border-bottom">
                          <FaHistory className="me-3 fs-5" />
                          <span>Voting History</span>
                        </Nav.Link>
                      </Nav.Item>
                      <Nav.Item>
                        <Nav.Link eventKey="analytics" className="d-flex align-items-center py-3 border-bottom">
                          <FaChartBar className="me-3 fs-5" />
                          <span>Analytics</span>
                        </Nav.Link>
                      </Nav.Item>
                      <Nav.Item>
                        <Nav.Link eventKey="security" className="d-flex align-items-center py-3 border-bottom">
                          <FaShieldAlt className="me-3 fs-5" />
                          <span>Security</span>
                        </Nav.Link>
                      </Nav.Item>
                    </Nav>

                    {/* Quick Actions */}
                    <div className="p-3 border-top">
                      <small className="text-muted mb-2 d-block">QUICK ACTIONS</small>
                      <div className="d-grid gap-2">
                        <Button variant="outline-primary" size="sm">
                          <FaQrcode className="me-1" />
                          Digital ID
                        </Button>
                        <Button variant="outline-success" size="sm">
                          <FaDownload className="me-1" />
                          Export Data
                        </Button>
                      </div>
                    </div>
                  </Card.Body>
                </Card>

                {/* Voter Status Card */}
                <Card className="shadow-sm border-0 mt-3">
                  <Card.Body className="text-center">
                    <div className="position-relative mb-3">
                      <div className="bg-primary rounded-circle d-inline-flex align-items-center justify-content-center" 
                           style={{ width: '60px', height: '60px' }}>
                        <FaIdCard className="text-white fs-4" />
                      </div>
                      <Badge bg="success" className="position-absolute top-0 start-100 translate-middle">
                        <FaCheckCircle />
                      </Badge>
                    </div>
                    <h6 className="mb-1">{safeRender(dashboardData.voter_info?.full_name)}</h6>
                    <small className="text-muted d-block">Voter ID: {safeRender(dashboardData.voter_info?.voter_id)}</small>
                    <Badge bg="success" className="mt-2">
                      {safeRender(dashboardData.quick_stats?.verification_status)}
                    </Badge>
                  </Card.Body>
                </Card>
              </Col>

              {/* Main Content Area */}
              <Col lg={10} md={9}>
                <Tab.Content>
                  {/* Enhanced Overview Tab */}
                  <Tab.Pane eventKey="overview">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <div>
                        <h4 className="mb-1">Welcome back, {safeRender(dashboardData.voter_info?.full_name)}! 👋</h4>
                        <p className="text-muted mb-0">
                          Here's your complete voting dashboard and election management portal
                        </p>
                      </div>
                      <div className="d-flex gap-2">
                        <Button variant="outline-primary" size="sm">
                          <FaSync className="me-1" />
                          Refresh
                        </Button>
                        <Button variant="primary" size="sm">
                          <FaShare className="me-1" />
                          Share
                        </Button>
                      </div>
                    </div>

                    {/* Enhanced Quick Stats */}
                    <Row className="mb-4">
                      <Col xl={3} lg={6} className="mb-3">
                        <Card className="border-0 shadow-sm h-100 bg-gradient-primary text-white">
                          <Card.Body className="d-flex align-items-center">
                            <div className="flex-grow-1">
                              <h4 className="mb-1">{safeRender(dashboardData.quick_stats?.votes_cast, '0')}</h4>
                              <p className="mb-0 opacity-75">Votes Cast</p>
                            </div>
                            <FaVoteYea className="fs-1 opacity-50" />
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col xl={3} lg={6} className="mb-3">
                        <Card className="border-0 shadow-sm h-100 bg-gradient-success text-white">
                          <Card.Body className="d-flex align-items-center">
                            <div className="flex-grow-1">
                              <h4 className="mb-1">{safeRender(dashboardData.quick_stats?.elections_participated, '0')}</h4>
                              <p className="mb-0 opacity-75">Elections</p>
                            </div>
                            <FaHistory className="fs-1 opacity-50" />
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col xl={3} lg={6} className="mb-3">
                        <Card className="border-0 shadow-sm h-100 bg-gradient-warning text-white">
                          <Card.Body className="d-flex align-items-center">
                            <div className="flex-grow-1">
                              <h4 className="mb-1">{safeRender(dashboardData.quick_stats?.upcoming_elections, '0')}</h4>
                              <p className="mb-0 opacity-75">Upcoming</p>
                            </div>
                            <FaCalendarAlt className="fs-1 opacity-50" />
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col xl={3} lg={6} className="mb-3">
                        <Card className="border-0 shadow-sm h-100 bg-gradient-info text-white">
                          <Card.Body className="d-flex align-items-center">
                            <div className="flex-grow-1">
                              <h6 className="mb-1">{safeRender(dashboardData.voter_info?.constituency)}</h6>
                              <p className="mb-0 opacity-75">Constituency</p>
                            </div>
                            <FaMapMarkerAlt className="fs-1 opacity-50" />
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    <Row>
                      {/* Election Types Grid */}
                      <Col lg={8}>
                        <Card className="shadow-sm border-0 h-100">
                          <Card.Header className="bg-white border-0">
                            <div className="d-flex justify-content-between align-items-center">
                              <h5 className="mb-0">Available Election Types</h5>
                              <Dropdown>
                                <Dropdown.Toggle variant="outline-secondary" size="sm">
                                  <FaFilter className="me-1" />
                                  Filter
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                  <Dropdown.Item onClick={() => setElectionType('all')}>All Types</Dropdown.Item>
                                  <Dropdown.Divider />
                                  {electionTypes.map(type => (
                                    <Dropdown.Item key={type.id} onClick={() => setElectionType(type.id)}>
                                      {type.name}
                                    </Dropdown.Item>
                                  ))}
                                </Dropdown.Menu>
                              </Dropdown>
                            </div>
                          </Card.Header>
                          <Card.Body>
                            <Row>
                              {electionTypes.map((type) => {
                                const IconComponent = type.icon;
                                return (
                                  <Col lg={6} className="mb-3" key={type.id}>
                                    <Card className={`border-${type.color} h-100`}>
                                      <Card.Body className="d-flex align-items-center">
                                        <div className={`bg-${type.color} rounded-circle d-flex align-items-center justify-content-center me-3`} 
                                             style={{ width: '50px', height: '50px' }}>
                                          <IconComponent className="text-white" />
                                        </div>
                                        <div className="flex-grow-1">
                                          <h6 className="mb-1">{type.name}</h6>
                                          <small className="text-muted">Active elections available</small>
                                        </div>
                                        <Badge bg={type.color}>3</Badge>
                                      </Card.Body>
                                    </Card>
                                  </Col>
                                );
                              })}
                            </Row>
                          </Card.Body>
                        </Card>
                      </Col>

                      {/* Upcoming Elections Sidebar */}
                      <Col lg={4}>
                        <Card className="shadow-sm border-0">
                          <Card.Header className="bg-white border-0">
                            <h5 className="mb-0 d-flex align-items-center">
                              <FaCalendarAlt className="me-2 text-primary" />
                              Upcoming Elections
                            </h5>
                          </Card.Header>
                          <Card.Body className="p-0">
                            {dashboardData.election_info?.upcoming_elections?.length > 0 ? (
                              <ListGroup variant="flush">
                                {dashboardData.election_info.upcoming_elections.slice(0, 4).map(election => (
                                  <ListGroup.Item key={election.id} className="border-0">
                                    <div className="d-flex align-items-start">
                                      <div className={`bg-${getElectionColor(election.type)} rounded-circle d-flex align-items-center justify-content-center me-3`} 
                                           style={{ width: '40px', height: '40px' }}>
                                        {React.createElement(getElectionIcon(election.type), { className: 'text-white' })}
                                      </div>
                                      <div className="flex-grow-1">
                                        <h6 className="mb-1">{safeRender(election.title)}</h6>
                                        <small className="text-muted">
                                          <FaClock className="me-1" />
                                          {safeRender(election.date)}
                                        </small>
                                      </div>
                                      <Badge bg={getElectionColor(election.type)}>
                                        {safeRender(election.status)}
                                      </Badge>
                                    </div>
                                  </ListGroup.Item>
                                ))}
                              </ListGroup>
                            ) : (
                              <div className="text-center py-4">
                                <FaCalendarAlt className="text-muted fs-1 mb-3" />
                                <h6 className="text-muted">No Upcoming Elections</h6>
                              </div>
                            )}
                          </Card.Body>
                        </Card>

                        {/* Quick Access Card */}
                        <Card className="shadow-sm border-0 mt-3">
                          <Card.Header className="bg-white border-0">
                            <h6 className="mb-0">Quick Access</h6>
                          </Card.Header>
                          <Card.Body>
                            <div className="d-grid gap-2">
                              <Button variant="outline-primary" size="sm">
                                <FaMobileAlt className="me-2" />
                                Mobile Verification
                              </Button>
                              <Button variant="outline-success" size="sm">
                                <FaShieldAlt className="me-2" />
                                Security Settings
                              </Button>
                              <Button variant="outline-info" size="sm">
                                <FaDownload className="me-2" />
                                Download Voter Slip
                              </Button>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  </Tab.Pane>

                  {/* Enhanced Profile Tab */}
                  <Tab.Pane eventKey="profile">
                    {profileData && (
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
                    )}
                  </Tab.Pane>

                  {/* Enhanced Elections Tab */}
                  <Tab.Pane eventKey="elections">
                    <Card className="shadow-sm border-0">
                      <Card.Header className="bg-white border-0">
                        <div className="d-flex justify-content-between align-items-center">
                          <h5 className="mb-0 d-flex align-items-center">
                            <FaVoteYea className="me-2 text-primary" />
                            Election Portal
                          </h5>
                          <div className="d-flex gap-2">
                            <Form.Control 
                              type="text" 
                              placeholder="Search elections..." 
                              size="sm"
                              style={{ width: '200px' }}
                            />
                            <Dropdown>
                              <Dropdown.Toggle variant="outline-secondary" size="sm">
                                <FaFilter className="me-1" />
                                Filter
                              </Dropdown.Toggle>
                              <Dropdown.Menu>
                                <Dropdown.Item>All Elections</Dropdown.Item>
                                <Dropdown.Item>Active Elections</Dropdown.Item>
                                <Dropdown.Item>Upcoming Elections</Dropdown.Item>
                                <Dropdown.Item>Completed Elections</Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
                          </div>
                        </div>
                      </Card.Header>
                      <Card.Body>
                        {/* Election Type Navigation */}
                        <Nav variant="pills" className="mb-4 justify-content-center">
                          {electionTypes.map(type => (
                            <Nav.Item key={type.id}>
                              <Nav.Link 
                                eventKey={type.id}
                                className="text-center mx-1"
                                active={electionType === type.id}
                                onClick={() => setElectionType(type.id)}
                              >
                                {React.createElement(type.icon, { className: 'mb-1 d-block mx-auto' })}
                                <small>{type.name.split(' ')[0]}</small>
                              </Nav.Link>
                            </Nav.Item>
                          ))}
                        </Nav>

                        {/* Election Cards */}
                        <Row>
                          {[1, 2, 3].map(item => (
                            <Col lg={4} md={6} className="mb-4" key={item}>
                              <Card className="border-0 shadow-sm h-100">
                                <Card.Header className={`bg-${getElectionColor(electionType)} text-white`}>
                                  <div className="d-flex justify-content-between align-items-center">
                                    <h6 className="mb-0">Sample {electionType.charAt(0).toUpperCase() + electionType.slice(1)} Election</h6>
                                    {React.createElement(getElectionIcon(electionType), { className: 'fs-5' })}
                                  </div>
                                </Card.Header>
                                <Card.Body>
                                  <div className="mb-3">
                                    <small className="text-muted">Election Date</small>
                                    <div className="d-flex align-items-center">
                                      <FaCalendarAlt className="me-2 text-primary" />
                                      {formatDate(new Date())}
                                    </div>
                                  </div>
                                  <div className="mb-3">
                                    <small className="text-muted">Status</small>
                                    <div>
                                      <Badge bg="success" className="w-100">Registration Open</Badge>
                                    </div>
                                  </div>
                                  <ProgressBar now={65} label={`65% Registered`} className="mb-3" />
                                  <div className="d-grid gap-2">
                                    <Button variant="primary" size="sm">
                                      <FaEye className="me-1" />
                                      View Details
                                    </Button>
                                    <Button variant="outline-primary" size="sm">
                                      <FaVoteYea className="me-1" />
                                      Cast Vote
                                    </Button>
                                  </div>
                                </Card.Body>
                              </Card>
                            </Col>
                          ))}
                        </Row>
                      </Card.Body>
                    </Card>
                  </Tab.Pane>

                  {/* Additional Tabs */}
                  <Tab.Pane eventKey="history">
                    <EnhancedVotingHistory />
                  </Tab.Pane>
                  
                  <Tab.Pane eventKey="analytics">
                    <EnhancedAnalytics />
                  </Tab.Pane>
                  
                  <Tab.Pane eventKey="security">
                    <EnhancedSecurity />
                  </Tab.Pane>
                </Tab.Content>
              </Col>
            </Row>
          </Tab.Container>
        ) : (
          <div className="text-center py-5">
            <Alert variant="warning" className="d-inline-block">
              <h5>Unable to load dashboard data</h5>
              <p>{error || 'Please check your connection and try again.'}</p>
              <Button variant="warning" onClick={handleRetry}>
                <FaSync className="me-1" />
                Retry Loading
              </Button>
            </Alert>
          </div>
        )}
      </Container>

      {/* Notifications Modal */}
      <Modal show={showNotifications} onHide={() => setShowNotifications(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaBell className="me-2" />
            Notifications
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ListGroup variant="flush">
            <ListGroup.Item className="d-flex align-items-center">
              <FaInfoCircle className="text-primary me-3" />
              <div>
                <strong>New election announced</strong>
                <small className="d-block text-muted">2 hours ago</small>
              </div>
            </ListGroup.Item>
            <ListGroup.Item className="d-flex align-items-center">
              <FaCheckCircle className="text-success me-3" />
              <div>
                <strong>Your vote has been recorded</strong>
                <small className="d-block text-muted">1 day ago</small>
              </div>
            </ListGroup.Item>
            <ListGroup.Item className="d-flex align-items-center">
              <FaShieldAlt className="text-warning me-3" />
              <div>
                <strong>Security update available</strong>
                <small className="d-block text-muted">2 days ago</small>
              </div>
            </ListGroup.Item>
          </ListGroup>
        </Modal.Body>
      </Modal>

      {/* Settings Modal */}
      <Modal show={showSettings} onHide={() => setShowSettings(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaCog className="me-2" />
            Settings
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <EnhancedSettings />
        </Modal.Body>
      </Modal>
    </div>
  );
};

// Helper Components
const ProfileField = ({ label, value }) => (
  <div className="mb-3">
    <small className="text-muted d-block">{label}</small>
    <div className="fw-semibold">{value}</div>
  </div>
);

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

// Enhanced Components for additional tabs
const EnhancedVotingHistory = () => (
  <Card className="shadow-sm border-0">
    <Card.Header className="bg-white border-0">
      <h5 className="mb-0 d-flex align-items-center">
        <FaHistory className="me-2 text-primary" />
        Voting History
      </h5>
    </Card.Header>
    <Card.Body>
      <div className="text-center py-5">
        <FaHistory className="text-muted fs-1 mb-3" />
        <h5 className="text-muted">No Voting History Yet</h5>
        <p className="text-muted mb-4">
          Your voting history will appear here once you participate in elections.
        </p>
      </div>
    </Card.Body>
  </Card>
);

const EnhancedAnalytics = () => (
  <Card className="shadow-sm border-0">
    <Card.Header className="bg-white border-0">
      <h5 className="mb-0 d-flex align-items-center">
        <FaChartBar className="me-2 text-primary" />
        Voting Analytics
      </h5>
    </Card.Header>
    <Card.Body>
      <Row>
        <Col md={6}>
          <Card className="border-0 bg-light">
            <Card.Body>
              <h6>Participation Rate</h6>
              <ProgressBar now={75} variant="success" className="mb-2" />
              <small className="text-muted">75% of eligible elections</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="border-0 bg-light">
            <Card.Body>
              <h6>Constituency Ranking</h6>
              <h4 className="text-primary">#12</h4>
              <small className="text-muted">Out of 150 voters</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Card.Body>
  </Card>
);

const EnhancedSecurity = () => (
  <Card className="shadow-sm border-0">
    <Card.Header className="bg-white border-0">
      <h5 className="mb-0 d-flex align-items-center">
        <FaShieldAlt className="me-2 text-primary" />
        Security Center
      </h5>
    </Card.Header>
    <Card.Body>
      <Row>
        <Col md={6}>
          <Card className="border-success border-2">
            <Card.Body>
              <h6 className="d-flex align-items-center">
                <FaCheckCircle className="text-success me-2" />
                Two-Factor Authentication
              </h6>
              <small className="text-muted">Enabled for extra security</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="border-warning border-2">
            <Card.Body>
              <h6 className="d-flex align-items-center">
                <FaExclamationTriangle className="text-warning me-2" />
                Session Management
              </h6>
              <small className="text-muted">3 active sessions</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Card.Body>
  </Card>
);

const EnhancedSettings = () => (
  <div>
    <h6>Notification Preferences</h6>
    <Form>
      <Form.Check type="switch" label="Email notifications" defaultChecked />
      <Form.Check type="switch" label="SMS notifications" defaultChecked />
      <Form.Check type="switch" label="Push notifications" />
    </Form>
  </div>
);

export default Dashboard;