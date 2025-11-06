import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, Row, Col, Card, Button, Alert, Spinner, Nav, Tab, 
  Badge, Modal, Form, ProgressBar, ListGroup, Dropdown, Carousel,
  Toast, ToastContainer
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { voterAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { 
  FaTachometerAlt, FaUser, FaVoteYea, FaHistory, FaSignOutAlt,
  FaCheckCircle, FaClock, FaMapMarkerAlt, FaIdCard, FaEnvelope,
  FaPhone, FaBell, FaCog, FaUsers, FaChartBar, FaUniversity,
  FaSchool, FaHome, FaCity, FaGlobeAmericas, FaCalendarAlt,
  FaSearch, FaFilter, FaDownload, FaShare, FaEye, FaEdit,
  FaShieldAlt, FaQrcode, FaMobileAlt, FaDesktop, FaSync,
  FaExclamationTriangle, FaInfoCircle, FaRocket,
  FaAward, FaFire, FaStar, FaUserCheck, FaSyncAlt,
  FaWifi, FaSatelliteDish, FaSignal
} from 'react-icons/fa';

// Socket connection
const SOCKET_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:5000' 
  : window.location.origin;

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
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [realTimeUpdates, setRealTimeUpdates] = useState([]);
  const [liveStats, setLiveStats] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Use FaSignal as alternative to FaBroadcast
  const BroadcastIcon = FaSignal;

  // Initialize Socket connection
  useEffect(() => {
    if (isAuthenticated && user) {
      const newSocket = io(SOCKET_URL, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        query: {
          voter_id: user.voter_id,
          user_type: 'voter'
        }
      });

      newSocket.on('connect', () => {
        console.log('Connected to real-time updates');
        setIsConnected(true);
        
        // Subscribe to election updates
        newSocket.emit('subscribe_elections', {
          voter_id: user.voter_id
        });
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from real-time updates');
        setIsConnected(false);
      });

      newSocket.on('election_update', (data) => {
        console.log('Received election update:', data);
        handleElectionUpdate(data);
      });

      newSocket.on('voter_update', (data) => {
        console.log('Received voter update:', data);
        handleVoterUpdate(data);
      });

      newSocket.on('system_update', (data) => {
        console.log('Received system update:', data);
        handleSystemUpdate(data);
      });

      newSocket.on('connection_established', (data) => {
        console.log('Socket connection established:', data);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [isAuthenticated, user]);

  // Real-time update handlers
  const handleElectionUpdate = useCallback((data) => {
    const { action, election, timestamp, admin_id } = data;
    
    setRealTimeUpdates(prev => [{
      id: Date.now(),
      type: 'election',
      action,
      title: election.title,
      message: `Election "${election.title}" has been ${action}d`,
      timestamp,
      admin_id
    }, ...prev.slice(0, 9)]); // Keep last 10 updates

    // Refresh dashboard data if this update affects the current view
    if (activeTab === 'overview' || activeTab === 'elections') {
      loadDashboardData();
    }
  }, [activeTab]);

  const handleVoterUpdate = useCallback((data) => {
    const { action, voter, timestamp, admin_id } = data;
    
    setRealTimeUpdates(prev => [{
      id: Date.now(),
      type: 'voter',
      action,
      title: 'Voter Status Update',
      message: `Voter status updated: ${action}`,
      timestamp,
      admin_id
    }, ...prev.slice(0, 9)]);

    // Refresh profile data if this is the current user
    if (voter.voter_id === user?.voter_id) {
      loadProfileData();
    }
  }, [user]);

  const handleSystemUpdate = useCallback((data) => {
    const { action, data: updateData, timestamp, admin_id } = data;
    
    setRealTimeUpdates(prev => [{
      id: Date.now(),
      type: 'system',
      action,
      title: 'System Update',
      message: `System configuration updated`,
      timestamp,
      admin_id
    }, ...prev.slice(0, 9)]);

    // Refresh dashboard data for system-wide updates
    loadDashboardData();
  }, []);

  // Enhanced data loading with real-time support
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [dashboardResponse, profileResponse, liveResponse] = await Promise.all([
        voterAPI.getDashboardData(),
        voterAPI.getProfile(),
        voterAPI.getLiveElections ? voterAPI.getLiveElections() : Promise.resolve({ success: false })
      ]);

      if (dashboardResponse.success) {
        const sanitizedData = sanitizeDashboardData(dashboardResponse.dashboard_data);
        setDashboardData(sanitizedData);
        setLastUpdate(dashboardResponse.last_updated);
      } else {
        setError(dashboardResponse.message || 'Failed to load dashboard data');
      }

      if (profileResponse.success) {
        setProfileData(sanitizeProfileData(profileResponse.profile_data));
      }

      if (liveResponse.success) {
        setLiveStats(liveResponse.elections_data?.live_stats);
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

  const loadProfileData = async () => {
    try {
      const response = await voterAPI.getProfile();
      if (response.success) {
        setProfileData(sanitizeProfileData(response.profile_data));
      }
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  };

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    if (isAuthenticated && !loading) {
      const interval = setInterval(() => {
        loadDashboardData();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, loading]);

  // Initial data load
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadDashboardData();
  }, [isAuthenticated, authLoading, navigate]);

  // Helper functions (keep your existing implementations)
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
    if (socket) {
      socket.close();
    }
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

  // Enhanced election types with real-time indicators
  const electionTypes = [
    { id: 'national', name: 'National Elections', icon: FaGlobeAmericas, color: 'primary', live: true },
    { id: 'state', name: 'State Elections', icon: FaCity, color: 'success', live: true },
    { id: 'local', name: 'Local Body Elections', icon: FaHome, color: 'info', live: false },
    { id: 'university', name: 'University Elections', icon: FaUniversity, color: 'warning', live: true },
    { id: 'college', name: 'College Elections', icon: FaUniversity, color: 'secondary', live: false },
    { id: 'school', name: 'School Elections', icon: FaSchool, color: 'light', live: false },
    { id: 'village', name: 'Village Council', icon: FaUsers, color: 'dark', live: true },
    { id: 'organization', name: 'Organization', icon: FaChartBar, color: 'danger', live: false }
  ];

  if (authLoading || loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-gradient-primary">
        <div className="text-center text-white">
          <Spinner animation="border" variant="light" style={{ width: '3rem', height: '3rem' }} />
          <div className="mt-3">
            <h5>{authLoading ? 'Checking Authentication...' : 'Loading Dashboard...'}</h5>
            <p className="opacity-75">
              {isConnected && <BroadcastIcon className="text-success me-2" />}
              {isConnected ? 'Real-time updates connected' : 'Connecting to live updates...'}
            </p>
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
      {/* Real-time Updates Toast */}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1050 }}>
        {realTimeUpdates.slice(0, 3).map(update => (
          <Toast key={update.id} autohide delay={5000}>
            <Toast.Header closeButton={false}>
              <BroadcastIcon className="text-primary me-2" />
              <strong className="me-auto">{update.title}</strong>
              <small>{new Date(update.timestamp).toLocaleTimeString()}</small>
            </Toast.Header>
            <Toast.Body>{update.message}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>

      {/* Enhanced Header with Connection Status */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-gradient-primary shadow">
        <Container fluid>
          <span className="navbar-brand d-flex align-items-center fw-bold">
            <FaTachometerAlt className="me-2 fs-4" />
            <span className="d-none d-sm-inline">Voter Portal</span>
            <span className="d-inline d-sm-none">Dashboard</span>
            {isConnected && (
              <Badge bg="success" className="ms-2">
                <BroadcastIcon className="me-1" />
                Live
              </Badge>
            )}
          </span>
          
          <div className="navbar-nav ms-auto align-items-center flex-row">
            {/* Connection Status */}
            <Badge 
              bg={isConnected ? "success" : "warning"} 
              className="me-2 d-none d-md-flex align-items-center"
            >
              {isConnected ? <BroadcastIcon /> : <FaSyncAlt className="spinner" />}
              <span className="ms-1">{isConnected ? 'Connected' : 'Connecting'}</span>
            </Badge>

            <Button 
              variant="outline-light" 
              size="sm" 
              className="me-2 position-relative"
              onClick={() => setShowNotifications(true)}
            >
              <FaBell />
              {realTimeUpdates.length > 0 && (
                <Badge bg="danger" pill className="position-absolute top-0 start-100 translate-middle">
                  {realTimeUpdates.length}
                </Badge>
              )}
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
        {/* Connection Status Alert */}
        {!isConnected && (
          <Alert variant="warning" className="d-flex align-items-center">
            <FaSyncAlt className="spinner me-2" />
            <div className="flex-grow-1">
              <strong>Connecting to live updates...</strong>
              <small className="d-block">Some features may be limited</small>
            </div>
            <Button variant="outline-warning" size="sm" onClick={() => window.location.reload()}>
              <FaSync className="me-1" />
              Retry
            </Button>
          </Alert>
        )}

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

        {/* Last Update Indicator */}
        {lastUpdate && (
          <div className="d-flex justify-content-end mb-3">
            <small className="text-muted">
              Last updated: {new Date(lastUpdate).toLocaleString()}
              <Button 
                variant="link" 
                size="sm" 
                className="p-0 ms-2"
                onClick={loadDashboardData}
                disabled={loading}
              >
                <FaSync className={loading ? 'spinner' : ''} />
              </Button>
            </small>
          </div>
        )}
        
        {dashboardData ? (
          <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
            <Row>
              {/* Enhanced Sidebar Navigation */}
              <Col lg={2} md={3} className="mb-4">
                <Card className="shadow-sm border-0 h-100">
                  <Card.Body className="p-0 d-flex flex-column">
                    {/* Connection Status */}
                    <div className="p-3 border-bottom bg-light">
                      <div className="d-flex align-items-center">
                        <div className={`rounded-circle me-2 ${isConnected ? 'bg-success' : 'bg-warning'}`} 
                             style={{ width: '8px', height: '8px' }}></div>
                        <small className={isConnected ? 'text-success' : 'text-warning'}>
                          {isConnected ? 'Live Connected' : 'Connecting...'}
                        </small>
                      </div>
                    </div>

                    {/* Main Navigation */}
                    <Nav variant="pills" className="flex-column flex-grow-1">
                      <Nav.Item>
                        <Nav.Link eventKey="overview" className="d-flex align-items-center py-3 border-bottom">
                          <FaTachometerAlt className="me-3 fs-5" />
                          <span>Overview</span>
                          {liveStats && (
                            <Badge bg="primary" pill className="ms-2">
                              <FaRocket />
                            </Badge>
                          )}
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
                          <Badge bg="primary" pill className="ms-2">
                            {dashboardData.election_info?.active_elections?.length || 0}
                          </Badge>
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

                    {/* Live Stats */}
                    {liveStats && (
                      <div className="p-3 border-top bg-light">
                        <small className="text-muted mb-2 d-block">LIVE STATS</small>
                        <div className="small">
                          <div className="d-flex justify-content-between">
                            <span>Active Elections:</span>
                            <Badge bg="primary">{liveStats.total_active}</Badge>
                          </div>
                          <div className="d-flex justify-content-between">
                            <span>Votes Today:</span>
                            <Badge bg="success">{liveStats.votes_cast_today}</Badge>
                          </div>
                          <div className="d-flex justify-content-between">
                            <span>Turnout:</span>
                            <Badge bg="info">{liveStats.voter_turnout}%</Badge>
                          </div>
                        </div>
                      </div>
                    )}

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
                        <Button 
                          variant="outline-info" 
                          size="sm"
                          onClick={loadDashboardData}
                          disabled={loading}
                        >
                          <FaSync className={`me-1 ${loading ? 'spinner' : ''}`} />
                          Refresh Data
                        </Button>
                      </div>
                    </div>
                  </Card.Body>
                </Card>

                {/* Enhanced Voter Status Card */}
                <Card className="shadow-sm border-0 mt-3">
                  <Card.Body className="text-center">
                    <div className="position-relative mb-3">
                      <div className="bg-primary rounded-circle d-inline-flex align-items-center justify-content-center" 
                           style={{ width: '60px', height: '60px' }}>
                        <FaIdCard className="text-white fs-4" />
                      </div>
                      {isConnected && (
                        <Badge bg="success" className="position-absolute top-0 start-100 translate-middle">
                          <BroadcastIcon />
                        </Badge>
                      )}
                    </div>
                    <h6 className="mb-1">{safeRender(dashboardData.voter_info?.full_name)}</h6>
                    <small className="text-muted d-block">Voter ID: {safeRender(dashboardData.voter_info?.voter_id)}</small>
                    <Badge bg="success" className="mt-2">
                      <FaUserCheck className="me-1" />
                      {safeRender(dashboardData.voter_info?.verification_status)}
                    </Badge>
                    {dashboardData.voter_info?.membership_duration && (
                      <div className="mt-2">
                        <small className="text-muted">
                          Member for {dashboardData.voter_info.membership_duration}
                        </small>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              {/* Main Content Area */}
              <Col lg={10} md={9}>
                <Tab.Content>
                  {/* Enhanced Overview Tab with Real-time Data */}
                  <Tab.Pane eventKey="overview">
                    <EnhancedOverview 
                      dashboardData={dashboardData}
                      liveStats={liveStats}
                      isConnected={isConnected}
                      onRefresh={loadDashboardData}
                      loading={loading}
                      BroadcastIcon={BroadcastIcon}
                    />
                  </Tab.Pane>

                  {/* Enhanced Profile Tab */}
                  <Tab.Pane eventKey="profile">
                    <EnhancedProfile 
                      profileData={profileData}
                      dashboardData={dashboardData}
                    />
                  </Tab.Pane>

                  {/* Enhanced Elections Tab with Real-time Updates */}
                  <Tab.Pane eventKey="elections">
                    <EnhancedElections 
                      dashboardData={dashboardData}
                      electionType={electionType}
                      setElectionType={setElectionType}
                      isConnected={isConnected}
                      BroadcastIcon={BroadcastIcon}
                    />
                  </Tab.Pane>

                  {/* Additional Tabs */}
                  <Tab.Pane eventKey="history">
                    <EnhancedVotingHistory 
                      voterId={user?.voter_id}
                    />
                  </Tab.Pane>
                  
                  <Tab.Pane eventKey="analytics">
                    <EnhancedAnalytics 
                      dashboardData={dashboardData}
                    />
                  </Tab.Pane>
                  
                  <Tab.Pane eventKey="security">
                    <EnhancedSecurity 
                      voterId={user?.voter_id}
                    />
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

      {/* Enhanced Notifications Modal with Real-time Updates */}
      <Modal show={showNotifications} onHide={() => setShowNotifications(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaBell className="me-2" />
            Notifications & Live Updates
            {realTimeUpdates.length > 0 && (
              <Badge bg="primary" className="ms-2">{realTimeUpdates.length}</Badge>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {realTimeUpdates.length > 0 ? (
            <ListGroup variant="flush">
              {realTimeUpdates.map(update => (
                <ListGroup.Item key={update.id} className="d-flex align-items-start">
                  <div className={`rounded-circle p-2 me-3 ${
                    update.type === 'election' ? 'bg-primary' : 
                    update.type === 'voter' ? 'bg-success' : 'bg-info'
                  }`}>
                    <BroadcastIcon className="text-white" />
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-start">
                      <strong>{update.title}</strong>
                      <small className="text-muted">
                        {new Date(update.timestamp).toLocaleTimeString()}
                      </small>
                    </div>
                    <p className="mb-1">{update.message}</p>
                    {update.admin_id && (
                      <small className="text-muted">
                        By Admin: {update.admin_id}
                      </small>
                    )}
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          ) : (
            <div className="text-center py-4">
              <FaBell className="text-muted fs-1 mb-3" />
              <h6 className="text-muted">No Recent Updates</h6>
              <p className="text-muted">System updates will appear here in real-time</p>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Settings Modal */}
      <Modal show={showSettings} onHide={() => setShowSettings(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaCog className="me-2" />
            Settings & Preferences
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <EnhancedSettings />
        </Modal.Body>
      </Modal>
    </div>
  );
};

// Enhanced Overview Component
const EnhancedOverview = ({ dashboardData, liveStats, isConnected, onRefresh, loading, BroadcastIcon }) => (
  <div>
    <div className="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 className="mb-1">
          Welcome back, {dashboardData?.voter_info?.full_name}! 👋
          {isConnected && <BroadcastIcon className="text-success ms-2 fs-6" />}
        </h4>
        <p className="text-muted mb-0">
          Real-time voting dashboard with live updates
          {liveStats && (
            <span className="ms-2">
              • Last refresh: {new Date(liveStats.last_updated).toLocaleTimeString()}
            </span>
          )}
        </p>
      </div>
      <div className="d-flex gap-2">
        <Button 
          variant="outline-primary" 
          size="sm"
          onClick={onRefresh}
          disabled={loading}
        >
          <FaSync className={`me-1 ${loading ? 'spinner' : ''}`} />
          Refresh
        </Button>
        <Button variant="primary" size="sm">
          <FaShare className="me-1" />
          Share
        </Button>
      </div>
    </div>

    {/* Live Stats Grid */}
    {liveStats && (
      <Row className="mb-4">
        <Col xl={3} lg={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100 bg-gradient-primary text-white">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h4 className="mb-1">{liveStats.total_active}</h4>
                <p className="mb-0 opacity-75">Active Elections</p>
              </div>
              <FaRocket className="fs-1 opacity-50" />
            </Card.Body>
          </Card>
        </Col>
        <Col xl={3} lg={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100 bg-gradient-success text-white">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h4 className="mb-1">{liveStats.votes_cast_today}</h4>
                <p className="mb-0 opacity-75">Votes Today</p>
              </div>
              <FaFire className="fs-1 opacity-50" />
            </Card.Body>
          </Card>
        </Col>
        <Col xl={3} lg={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100 bg-gradient-warning text-white">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h4 className="mb-1">{liveStats.voter_turnout}%</h4>
                <p className="mb-0 opacity-75">System Turnout</p>
              </div>
              <FaChartBar className="fs-1 opacity-50" />
            </Card.Body>
          </Card>
        </Col>
        <Col xl={3} lg={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100 bg-gradient-info text-white">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="mb-1">{dashboardData?.voter_info?.constituency}</h6>
                <p className="mb-0 opacity-75">Your Constituency</p>
              </div>
              <FaMapMarkerAlt className="fs-1 opacity-50" />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    )}

    {/* Rest of your overview content */}
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
                  <Dropdown.Item>All Types</Dropdown.Item>
                  <Dropdown.Divider />
                  {[
                    { id: 'national', name: 'National Elections' },
                    { id: 'state', name: 'State Elections' },
                    { id: 'local', name: 'Local Body Elections' },
                    { id: 'university', name: 'University Elections' }
                  ].map(type => (
                    <Dropdown.Item key={type.id}>
                      {type.name}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </Card.Header>
          <Card.Body>
            <Row>
              {[
                { id: 'national', name: 'National Elections', icon: FaGlobeAmericas, color: 'primary' },
                { id: 'state', name: 'State Elections', icon: FaCity, color: 'success' },
                { id: 'local', name: 'Local Body Elections', icon: FaHome, color: 'info' },
                { id: 'university', name: 'University Elections', icon: FaUniversity, color: 'warning' }
              ].map((type) => {
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
            {dashboardData?.election_info?.upcoming_elections?.length > 0 ? (
              <ListGroup variant="flush">
                {dashboardData.election_info.upcoming_elections.slice(0, 4).map(election => (
                  <ListGroup.Item key={election.id} className="border-0">
                    <div className="d-flex align-items-start">
                      <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-3" 
                           style={{ width: '40px', height: '40px' }}>
                        <FaVoteYea className="text-white" />
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="mb-1">{election.title}</h6>
                        <small className="text-muted">
                          <FaClock className="me-1" />
                          {election.date}
                        </small>
                      </div>
                      <Badge bg="primary">
                        {election.status}
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
      </Col>
    </Row>
  </div>
);

// Enhanced Elections Component
const EnhancedElections = ({ dashboardData, electionType, setElectionType, isConnected, BroadcastIcon }) => {
  const [elections, setElections] = useState(dashboardData?.election_info || {});

  return (
    <Card className="shadow-sm border-0">
      <Card.Header className="bg-white border-0">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0 d-flex align-items-center">
            <FaVoteYea className="me-2 text-primary" />
            Election Portal
            {isConnected && (
              <Badge bg="success" className="ms-2">
                <BroadcastIcon className="me-1" />
                Live
              </Badge>
            )}
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
        {/* Enhanced election content with real-time updates */}
        <Row>
          {[1, 2, 3].map(item => (
            <Col lg={4} md={6} className="mb-4" key={item}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Header className="bg-primary text-white">
                  <div className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">Sample Election {item}</h6>
                    <FaVoteYea className="fs-5" />
                  </div>
                </Card.Header>
                <Card.Body>
                  <div className="mb-3">
                    <small className="text-muted">Election Date</small>
                    <div className="d-flex align-items-center">
                      <FaCalendarAlt className="me-2 text-primary" />
                      {new Date().toLocaleDateString()}
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
  );
};

// Enhanced Profile Component
const EnhancedProfile = ({ profileData, dashboardData }) => {
  const safeRender = (value, defaultValue = 'N/A') => {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    return value.toString();
  };

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
          <h4>{safeRender(profileData?.full_name)}</h4>
          <p className="text-muted">Voter ID: {safeRender(profileData?.voter_id)}</p>
          <div className="d-flex justify-content-center gap-2">
            <Badge bg="success">Verified Voter</Badge>
            <Badge bg="info">{safeRender(profileData?.constituency)}</Badge>
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
                <ProfileField label="Full Name" value={safeRender(profileData?.full_name)} />
                <ProfileField label="Father's Name" value={safeRender(profileData?.father_name)} />
                <ProfileField label="Mother's Name" value={safeRender(profileData?.mother_name)} />
                <ProfileField label="Gender" value={safeRender(profileData?.gender)} />
                <ProfileField label="Date of Birth" value={safeRender(profileData?.date_of_birth)} />
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
                  value={safeRender(profileData?.email)}
                  verified={profileData?.verification_status?.email}
                  icon={FaEnvelope}
                />
                <VerifiedField 
                  label="Phone" 
                  value={safeRender(profileData?.phone)}
                  verified={profileData?.verification_status?.phone}
                  icon={FaPhone}
                />
                <VerifiedField 
                  label="National ID" 
                  value={`${safeRender(profileData?.national_id?.number)} (${safeRender(profileData?.national_id?.type)})`}
                  verified={profileData?.verification_status?.id}
                  icon={FaIdCard}
                />
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

// Keep all your existing helper components
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