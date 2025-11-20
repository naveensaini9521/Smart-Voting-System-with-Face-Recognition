import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, Row, Col, Card, Button, Alert, Spinner, Nav, Tab, 
  Badge, Modal, Form, ProgressBar, ListGroup, Dropdown, Carousel,
  Toast, ToastContainer
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { voterAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

import { 
  FaTachometerAlt, FaUser, FaVoteYea, FaHistory, FaSignOutAlt,
  FaCheckCircle, FaClock, FaMapMarkerAlt, FaIdCard, FaEnvelope,
  FaPhone, FaBell, FaCog, FaUsers, FaChartBar, FaUniversity,
  FaSchool, FaHome, FaCity, FaGlobeAmericas, FaCalendarAlt,
  FaSearch, FaFilter, FaDownload, FaShare, FaEye, FaEdit,
  FaShieldAlt, FaQrcode, FaMobileAlt, FaDesktop, FaSync,
  FaExclamationTriangle, FaInfoCircle, FaRocket,
  FaAward, FaFire, FaStar, FaUserCheck, FaSyncAlt,
  FaWifi, FaSatelliteDish, FaSignal, FaUserTie,
  FaLandmark, FaArrowLeft, FaChartPie, FaTimesCircle,
  FaPlay, FaPause, FaStop, FaHourglassHalf,
  FaTrophy, FaChartLine // Added new icons for results
} from 'react-icons/fa';

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout, user, loading: authLoading } = useAuth();
  const { socket, isConnected, on, off } = useSocket();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [electionType, setElectionType] = useState('all');
  const [realTimeUpdates, setRealTimeUpdates] = useState([]);
  const [liveStats, setLiveStats] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [hasVoted, setHasVoted] = useState({});
  const [completedElections, setCompletedElections] = useState([]); // New state for completed elections

  const BroadcastIcon = FaSignal;

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleElectionUpdate = (data) => {
      console.log('📢 Received election update:', data);
      handleElectionUpdateData(data);
    };

    const handleVoterUpdate = (data) => {
      console.log('📢 Received voter update:', data);
      handleVoterUpdateData(data);
    };

    const handleSystemUpdate = (data) => {
      console.log('📢 Received system update:', data);
      handleSystemUpdateData(data);
    };

    const handleAdminBroadcast = (data) => {
      console.log('📢 Received admin broadcast:', data);
      handleAdminBroadcastData(data);
    };

    const handleVotingSessionStarted = (data) => {
      console.log('🗳️ Voting session started:', data);
    };

    const handleVoteCountUpdate = (data) => {
      console.log('📊 Vote count update:', data);
      updateElectionStats(data);
    };

    const handleResultsPublished = (data) => {
      console.log('🏆 Results published:', data);
      handleResultsPublishedData(data);
    };

    // Register event listeners
    on('election_update', handleElectionUpdate);
    on('voter_update', handleVoterUpdate);
    on('system_update', handleSystemUpdate);
    on('admin_broadcast', handleAdminBroadcast);
    on('voting_session_started', handleVotingSessionStarted);
    on('vote_count_update', handleVoteCountUpdate);
    on('results_published', handleResultsPublished); // New event for results

    return () => {
      off('election_update', handleElectionUpdate);
      off('voter_update', handleVoterUpdate);
      off('system_update', handleSystemUpdate);
      off('admin_broadcast', handleAdminBroadcast);
      off('voting_session_started', handleVotingSessionStarted);
      off('vote_count_update', handleVoteCountUpdate);
      off('results_published', handleResultsPublished);
    };
  }, [socket, on, off]);

  // New handler for results publication
  const handleResultsPublishedData = useCallback((data) => {
    const { election_id, election_title, timestamp, admin_id } = data;
    
    setRealTimeUpdates(prev => [{
      id: Date.now(),
      type: 'results',
      action: 'published',
      title: 'Results Published',
      message: `Results for "${election_title}" are now available`,
      timestamp,
      admin_id,
      electionData: data,
      urgent: true
    }, ...prev.slice(0, 9)]);

    // Refresh completed elections when results are published
    if (activeTab === 'overview' || activeTab === 'elections') {
      loadCompletedElections();
      loadDashboardData();
    }
  }, [activeTab]);

  // Existing handlers remain the same...
  const handleElectionUpdateData = useCallback((data) => {
    const { action, data: electionData, timestamp, admin_id } = data;
    
    let message = '';
    let title = 'Election Update';
    
    switch(action) {
      case 'create':
        message = `New election "${electionData.title}" has been created`;
        title = 'New Election';
        break;
      case 'status_update':
        message = `Election "${electionData.title}" status changed to ${electionData.new_status}`;
        title = 'Election Status Update';
        if (electionData.new_status === 'completed') {
          loadCompletedElections(); // Load completed elections when status changes
        }
        break;
      case 'delete':
        message = `Election "${electionData.title}" has been cancelled`;
        title = 'Election Cancelled';
        break;
      default:
        message = `Election "${electionData.title}" has been updated`;
    }
    
    setRealTimeUpdates(prev => [{
      id: Date.now(),
      type: 'election',
      action,
      title,
      message,
      timestamp,
      admin_id,
      electionData,
      urgent: action === 'delete' || action === 'status_update'
    }, ...prev.slice(0, 9)]);

    if (activeTab === 'overview' || activeTab === 'elections') {
      loadDashboardData();
    }
  }, [activeTab]);

  const handleVoterUpdateData = useCallback((data) => {
    const { action, data: voterData, timestamp, admin_id } = data;
    
    setRealTimeUpdates(prev => [{
      id: Date.now(),
      type: 'voter',
      action,
      title: 'Account Status Update',
      message: `Your account verification status has been updated`,
      timestamp,
      admin_id,
      voterData,
      urgent: true
    }, ...prev.slice(0, 9)]);

    if (voterData.voter_id === user?.voter_id) {
      loadProfileData();
      loadDashboardData();
    }
  }, [user]);

  const handleSystemUpdateData = useCallback((data) => {
    const { action, data: updateData, timestamp, admin_id } = data;
    
    setRealTimeUpdates(prev => [{
      id: Date.now(),
      type: 'system',
      action,
      title: 'System Update',
      message: `System configuration has been updated`,
      timestamp,
      admin_id,
      updateData
    }, ...prev.slice(0, 9)]);

    loadDashboardData();
  }, []);

  const handleAdminBroadcastData = useCallback((data) => {
    const { message, type, admin_id, admin_name, timestamp } = data;
    
    setRealTimeUpdates(prev => [{
      id: Date.now(),
      type: 'broadcast',
      action: 'broadcast',
      title: `Message from ${admin_name || 'Administrator'}`,
      message,
      timestamp,
      admin_id,
      urgent: type === 'urgent'
    }, ...prev.slice(0, 9)]);
  }, []);

  const updateElectionStats = useCallback((data) => {
    setDashboardData(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        election_info: {
          ...prev.election_info,
          active_elections: prev.election_info?.active_elections?.map(election => 
            election.election_id === data.election_id 
              ? { ...election, total_votes: data.total_votes }
              : election
          ) || []
        }
      };
    });
  }, []);

  // Enhanced data loading with completed elections
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [dashboardResponse, profileResponse] = await Promise.all([
        voterAPI.getDashboardData(),
        voterAPI.getProfile()
      ]);

      if (dashboardResponse.success) {
        const sanitizedData = sanitizeDashboardData(dashboardResponse.dashboard_data);
        setDashboardData(sanitizedData);
        setLastUpdate(dashboardResponse.last_updated);
        
        const activeElections = sanitizedData.election_info?.active_elections || [];
        const liveStatsData = {
          total_active: activeElections.length,
          votes_cast_today: dashboardResponse.dashboard_data?.quick_stats?.today_votes || 0,
          voter_turnout: dashboardResponse.dashboard_data?.quick_stats?.participation_rate || 0,
          last_updated: new Date().toISOString()
        };
        setLiveStats(liveStatsData);

        const votedStatus = {};
        activeElections.forEach(election => {
          votedStatus[election.election_id] = election.has_voted || false;
        });
        setHasVoted(votedStatus);
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

  // New function to load completed elections
  const loadCompletedElections = async () => {
    try {
      const response = await voterAPI.getCompletedElections();
      if (response.success) {
        setCompletedElections(response.elections || []);
      }
    } catch (err) {
      console.error('Failed to load completed elections:', err);
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
    if (isAuthenticated && !loading && isConnected) {
      const interval = setInterval(() => {
        loadDashboardData();
        if (activeTab === 'elections') {
          loadCompletedElections();
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, loading, isConnected, activeTab]);

  // Initial data load
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadDashboardData();
    loadCompletedElections(); // Load completed elections on initial load
  }, [isAuthenticated, authLoading, navigate]);

  // Helper functions (remain the same)
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
        })),
        active_elections: (data.election_info?.active_elections || []).map(election => ({
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
    loadCompletedElections();
  };

  // Enhanced voting session start with better error handling
  const handleStartVoting = async (election) => {
    try {
      console.log(`🚀 Starting voting process for election: ${election.election_id}`);
      setLoading(true);
      setError('');

      voterAPI.clearVotingSession(election.election_id);

      const sessionResponse = await voterAPI.startVotingSession(election.election_id);
      console.log('📋 Session response:', sessionResponse);
      
      if (sessionResponse.success) {
        console.log('✅ Voting session started, navigating to voting page...');
        
        localStorage.setItem(`voting_session_${election.election_id}`, JSON.stringify({
          sessionId: sessionResponse.session_id,
          expires: sessionResponse.session_expires,
          election: sessionResponse.election,
          candidates: sessionResponse.candidates,
          startedAt: new Date().toISOString()
        }));
        
        setHasVoted(prev => ({
          ...prev,
          [election.election_id]: false
        }));

        navigate(`/voting/${election.election_id}`, { 
          state: { 
            votingSession: sessionResponse,
            electionData: sessionResponse.election,
            candidates: sessionResponse.candidates,
            fromDashboard: true
          }
        });

      } else {
        if (sessionResponse.has_voted) {
          setError('You have already voted in this election.');
          setHasVoted(prev => ({
            ...prev,
            [election.election_id]: true
          }));
        } else if (sessionResponse.message?.includes('not started')) {
          setError('Voting has not started yet for this election.');
        } else if (sessionResponse.message?.includes('ended')) {
          setError('Voting has ended for this election.');
        } else if (sessionResponse.message?.includes('not eligible')) {
          setError('You are not eligible to vote in this election.');
        } else {
          setError(sessionResponse.message || 'Failed to start voting session');
        }
      }
    } catch (error) {
      console.error('❌ Error starting voting session:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to start voting session';
      setError(errorMsg);
      
      if (errorMsg.includes('already voted')) {
        setHasVoted(prev => ({
          ...prev,
          [election.election_id]: true
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  // NEW: Function to handle viewing results
  const handleViewResults = (election) => {
    navigate(`/results/${election.election_id}`);
  };

  // NEW: Function to check if results are available
  const areResultsAvailable = (election) => {
    // Results are available if election is completed or if user has voted and wants to see live results
    return election.status === 'completed' || 
           (election.status === 'active' && hasVoted[election.election_id] && election.results_visibility === 'live');
  };

  // Test SocketIO connection
  const testSocketConnection = () => {
    if (socket && isConnected) {
      socket.emit('ping', { message: 'Test from dashboard', timestamp: Date.now() });
      socket.emit('echo', { test: 'SocketIO connection test' });
    }
  };

  // Loading and authentication checks remain the same...
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
            {!isConnected && (
              <Button 
                variant="outline-light" 
                size="sm" 
                className="mt-2"
                onClick={testSocketConnection}
              >
                <FaSync className="me-1" />
                Test Connection
              </Button>
            )}
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
      {/* Real-time Updates Toast - Updated for results notifications */}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1050 }}>
        {realTimeUpdates.slice(0, 3).map(update => (
          <Toast 
            key={update.id} 
            autohide 
            delay={update.urgent ? 10000 : 5000}
            bg={update.urgent ? 'warning' : undefined}
            onClose={() => {
              setRealTimeUpdates(prev => prev.filter(u => u.id !== update.id));
            }}
          >
            <Toast.Header closeButton className={update.urgent ? 'bg-warning text-dark' : ''}>
              <BroadcastIcon className={`me-2 ${update.urgent ? 'text-dark' : 'text-primary'}`} />
              <strong className="me-auto">{update.title}</strong>
              <small>{new Date(update.timestamp).toLocaleTimeString()}</small>
            </Toast.Header>
            <Toast.Body className={update.urgent ? 'bg-warning bg-opacity-10' : ''}>
              {update.message}
              {update.electionData && (
                <div className="mt-2">
                  <small className="text-muted">
                    Election: {update.electionData.title || update.electionData.election_title}
                  </small>
                  {/* Add quick action for results */}
                  {update.type === 'results' && (
                    <div className="mt-2">
                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={() => handleViewResults(update.electionData)}
                      >
                        <FaChartBar className="me-1" />
                        View Results
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>

      {/* Header remains the same */}
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
              className="me-2"
              onClick={testSocketConnection}
              disabled={!isConnected}
              title="Test SocketIO Connection"
            >
              <FaWifi />
            </Button>

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
              <small className="d-block">Some features may be limited. Data will refresh automatically when connection is restored.</small>
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
          <div className="d-flex justify-content-between align-items-center mb-3">
            <small className="text-muted">
              Real-time updates: 
              <Badge bg={isConnected ? "success" : "warning"} className="ms-2">
                {isConnected ? 'Active' : 'Offline'}
              </Badge>
            </small>
            <small className="text-muted">
              Last updated: {new Date(lastUpdate).toLocaleString()}
              <Button 
                variant="link" 
                size="sm" 
                className="p-0 ms-2"
                onClick={loadDashboardData}
                disabled={loading}
                title="Refresh Data"
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
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                          <div className={`rounded-circle me-2 ${isConnected ? 'bg-success' : 'bg-warning'}`} 
                               style={{ width: '8px', height: '8px' }}></div>
                          <small className={isConnected ? 'text-success' : 'text-warning'}>
                            {isConnected ? 'Live Connected' : 'Connecting...'}
                          </small>
                        </div>
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="p-0"
                          onClick={testSocketConnection}
                          disabled={!isConnected}
                          title="Test Connection"
                        >
                          <FaSync className="text-muted" />
                        </Button>
                      </div>
                    </div>

                    {/* Main Navigation */}
                    <Nav variant="pills" className="flex-column flex-grow-1">
                      <Nav.Item>
                        <Nav.Link eventKey="overview" className="d-flex align-items-center py-3 border-bottom">
                          <FaTachometerAlt className="me-3 fs-5" />
                          <span>Overview</span>
                          {liveStats && liveStats.total_active > 0 && (
                            <Badge bg="primary" pill className="ms-2">
                              {liveStats.total_active}
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
                  {/* Enhanced Overview Tab with Results Integration */}
                  <Tab.Pane eventKey="overview">
                    <EnhancedOverview 
                      dashboardData={dashboardData}
                      liveStats={liveStats}
                      isConnected={isConnected}
                      onRefresh={loadDashboardData}
                      loading={loading}
                      BroadcastIcon={BroadcastIcon}
                      onStartVoting={handleStartVoting}
                      onViewResults={handleViewResults} // NEW: Pass results handler
                      hasVoted={hasVoted}
                      completedElections={completedElections} // NEW: Pass completed elections
                    />
                  </Tab.Pane>

                  {/* Enhanced Profile Tab */}
                  <Tab.Pane eventKey="profile">
                    <EnhancedProfile 
                      profileData={profileData}
                      dashboardData={dashboardData}
                    />
                  </Tab.Pane>

                  {/* Enhanced Elections Tab with Results Integration */}
                  <Tab.Pane eventKey="elections">
                    <EnhancedElections 
                      dashboardData={dashboardData}
                      voterId={user?.voter_id}
                      isConnected={isConnected}
                      BroadcastIcon={BroadcastIcon}
                      onStartVoting={handleStartVoting}
                      onViewResults={handleViewResults} // NEW: Pass results handler
                      hasVoted={hasVoted}
                      completedElections={completedElections} // NEW: Pass completed elections
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
              <div className="d-flex gap-2 justify-content-center mt-3">
                <Button variant="warning" onClick={handleRetry}>
                  <FaSync className="me-1" />
                  Retry Loading
                </Button>
                <Button variant="outline-warning" onClick={testSocketConnection}>
                  <FaWifi className="me-1" />
                  Test Connection
                </Button>
              </div>
            </Alert>
          </div>
        )}
      </Container>

      {/* Enhanced Notifications Modal with Results Support */}
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
                <ListGroup.Item 
                  key={update.id} 
                  className={`d-flex align-items-start ${update.urgent ? 'bg-warning bg-opacity-10' : ''}`}
                >
                  <div className={`rounded-circle p-2 me-3 ${
                    update.type === 'election' ? 'bg-primary' : 
                    update.type === 'voter' ? 'bg-success' : 
                    update.type === 'broadcast' ? 'bg-info' : 
                    update.type === 'results' ? 'bg-warning' : 'bg-secondary'
                  }`}>
                    {update.type === 'results' ? <FaTrophy className="text-white" /> : <BroadcastIcon className="text-white" />}
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
                    {update.urgent && (
                      <Badge bg="warning" className="mt-1">Urgent</Badge>
                    )}
                    {/* Add action button for results */}
                    {update.type === 'results' && update.electionData && (
                      <div className="mt-2">
                        <Button 
                          variant="warning" 
                          size="sm"
                          onClick={() => {
                            handleViewResults(update.electionData);
                            setShowNotifications(false);
                          }}
                        >
                          <FaChartBar className="me-1" />
                          View Results
                        </Button>
                      </div>
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
              <div className="mt-3">
                <Badge bg={isConnected ? "success" : "warning"}>
                  {isConnected ? 'Connected to live updates' : 'Waiting for connection...'}
                </Badge>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setRealTimeUpdates([])}>
            Clear All
          </Button>
          <Button variant="primary" onClick={() => setShowNotifications(false)}>
            Close
          </Button>
        </Modal.Footer>
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

// Enhanced Overview Component with Results Integration
const EnhancedOverview = ({ 
  dashboardData, 
  liveStats, 
  isConnected, 
  onRefresh, 
  loading, 
  BroadcastIcon, 
  onStartVoting, 
  onViewResults, // NEW: Results handler
  hasVoted,
  completedElections // NEW: Completed elections data
}) => {
  // Get recent completed elections for display
  const recentCompletedElections = completedElections?.slice(0, 2) || [];

  return (
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

      {/* Live Stats Grid - Updated with Results Count */}
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
                  <h4 className="mb-1">{completedElections?.length || 0}</h4>
                  <p className="mb-0 opacity-75">Completed Elections</p>
                </div>
                <FaTrophy className="fs-1 opacity-50" />
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <Row>
        {/* Active Elections Section */}
        <Col lg={8}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-white border-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Active Elections</h5>
                <Badge bg="primary">
                  {dashboardData?.election_info?.active_elections?.length || 0} Available
                </Badge>
              </div>
            </Card.Header>
            <Card.Body>
              {dashboardData?.election_info?.active_elections?.length > 0 ? (
                <Row>
                  {dashboardData.election_info.active_elections.slice(0, 4).map(election => (
                    <Col lg={6} className="mb-3" key={election.election_id}>
                      <EnhancedElectionCard 
                        election={election} 
                        onStartVoting={onStartVoting}
                        onViewResults={onViewResults} // NEW: Pass results handler
                        compact={true}
                        hasVoted={hasVoted[election.election_id]}
                      />
                    </Col>
                  ))}
                </Row>
              ) : (
                <div className="text-center py-4">
                  <FaVoteYea className="text-muted fs-1 mb-3" />
                  <h6 className="text-muted">No Active Elections</h6>
                  <p className="text-muted">Check back later for upcoming elections</p>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* NEW: Recent Results Section */}
          {recentCompletedElections.length > 0 && (
            <Card className="shadow-sm border-0 mt-4">
              <Card.Header className="bg-white border-0">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 d-flex align-items-center">
                    <FaTrophy className="me-2 text-warning" />
                    Recent Results
                  </h5>
                  <Badge bg="warning">
                    {recentCompletedElections.length} Available
                  </Badge>
                </div>
              </Card.Header>
              <Card.Body>
                <Row>
                  {recentCompletedElections.map(election => (
                    <Col lg={6} className="mb-3" key={election.election_id}>
                      <Card className="border-warning border-2 h-100">
                        <Card.Body className="text-center">
                          <FaTrophy className="text-warning fa-2x mb-3" />
                          <h6>{election.title}</h6>
                          <p className="text-muted small mb-3">
                            {election.description}
                          </p>
                          <div className="mb-3">
                            <Badge bg="success" className="me-2">
                              {election.total_votes || 0} Votes
                            </Badge>
                            <Badge bg="info">
                              {election.voter_turnout || 0}% Turnout
                            </Badge>
                          </div>
                          <Button 
                            variant="warning" 
                            size="sm"
                            onClick={() => onViewResults(election)}
                            className="w-100"
                          >
                            <FaChartBar className="me-1" />
                            View Results
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          )}
        </Col>

        {/* Quick Actions & Upcoming Elections */}
        <Col lg={4}>
          <Card className="shadow-sm border-0 mb-4">
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

          {/* Quick Stats */}
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white border-0">
              <h5 className="mb-0">Your Voting Stats</h5>
            </Card.Header>
            <Card.Body>
              <div className="text-center">
                <h4 className="text-primary">{dashboardData?.quick_stats?.votes_cast || 0}</h4>
                <p className="text-muted mb-3">Total Votes Cast</p>
                
                <ProgressBar 
                  now={dashboardData?.quick_stats?.participation_rate || 0} 
                  label={`${dashboardData?.quick_stats?.participation_rate || 0}%`}
                  className="mb-3"
                  variant="success"
                />
                <small className="text-muted">Participation Rate</small>
                
                {/* NEW: Results Quick Access */}
                {completedElections?.length > 0 && (
                  <div className="mt-4 pt-3 border-top">
                    <Button 
                      variant="outline-warning" 
                      size="sm" 
                      className="w-100"
                      onClick={() => {
                        // Navigate to elections tab with completed filter
                        window.dispatchEvent(new CustomEvent('setActiveTab', { detail: 'elections' }));
                        window.dispatchEvent(new CustomEvent('setElectionFilter', { detail: 'completed' }));
                      }}
                    >
                      <FaTrophy className="me-1" />
                      View All Results ({completedElections.length})
                    </Button>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

// Enhanced Election Card Component with Results Integration
const EnhancedElectionCard = ({ 
  election, 
  onStartVoting, 
  compact = false, 
  filter = 'active', 
  hasVoted = false,
  onViewResults // NEW: Results handler
}) => {
  const navigate = useNavigate();
  
  const getStatusBadge = (status) => {
    switch(status) {
      case 'active':
        return <Badge bg="success"><FaPlay className="me-1" /> Active</Badge>;
      case 'scheduled':
        return <Badge bg="warning"><FaClock className="me-1" /> Scheduled</Badge>;
      case 'completed':
        return <Badge bg="secondary"><FaStop className="me-1" /> Completed</Badge>;
      case 'cancelled':
        return <Badge bg="danger"><FaTimesCircle className="me-1" /> Cancelled</Badge>;
      default:
        return <Badge bg="light" text="dark">{status}</Badge>;
    }
  };

  const getTimeRemaining = () => {
    if (!election.voting_end) return null;
    
    const endTime = new Date(election.voting_end);
    const now = new Date();
    const diffMs = endTime - now;
    
    if (diffMs <= 0) return 'Ended';
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) return `${diffDays}d ${diffHours}h left`;
    if (diffHours > 0) return `${diffHours}h left`;
    return 'Less than 1h left';
  };

  const handlePreviewElection = () => {
    navigate(`/elections/${election.election_id}`);
  };

  // Use hasVoted prop if available, otherwise fall back to election.has_voted
  const voted = hasVoted !== undefined ? hasVoted : election.has_voted;

  // NEW: Check if results are available
  const resultsAvailable = election.status === 'completed' || 
                          (election.status === 'active' && voted && election.results_visibility === 'live');

  if (compact) {
    return (
      <Card className="border-0 shadow-sm h-100">
        <Card.Header className={`${election.status === 'completed' ? 'bg-warning' : 'bg-primary'} text-white`}>
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0">{election.title}</h6>
            {election.status === 'completed' ? <FaTrophy /> : <FaVoteYea />}
          </div>
        </Card.Header>
        <Card.Body>
          <p className="text-muted small">{election.description}</p>
          <div className="mb-2">
            <small className="text-muted">
              {election.status === 'completed' ? 'Completed: ' : 'Voting Ends: '}
            </small>
            <div className="fw-semibold">
              {new Date(
                election.status === 'completed' ? election.voting_end : election.voting_end
              ).toLocaleString()}
            </div>
          </div>
          <div className="d-grid">
            {election.status === 'completed' ? (
              <Button 
                variant="warning" 
                size="sm"
                onClick={() => onViewResults(election)}
              >
                <FaChartBar className="me-1" />
                View Results
              </Button>
            ) : voted ? (
              <Button variant="success" size="sm" disabled>
                <FaCheckCircle className="me-1" />
                Already Voted
                {resultsAvailable && (
                  <span className="ms-1">
                    • <FaChartLine className="text-info" />
                  </span>
                )}
              </Button>
            ) : (
              <Button 
                variant="primary" 
                size="sm"
                onClick={() => onStartVoting(election)}
              >
                <FaVoteYea className="me-1" />
                Vote Now
              </Button>
            )}
          </div>
          {/* NEW: Quick results access for voted elections */}
          {voted && resultsAvailable && election.status === 'active' && (
            <div className="mt-2">
              <Button 
                variant="outline-info" 
                size="sm" 
                className="w-100"
                onClick={() => onViewResults(election)}
              >
                <FaChartLine className="me-1" />
                Live Results
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="mb-4 shadow-sm border-0 hover-shadow transition-all">
      <Card.Body>
        <Row className="align-items-center">
          <Col md={8}>
            <div className="d-flex align-items-start">
              {election.election_logo && (
                <img 
                  src={election.election_logo} 
                  className="rounded me-3"
                  style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                  alt={election.title}
                />
              )}
              <div className="flex-grow-1">
                <h5 className="mb-2 text-primary">{election.title}</h5>
                <p className="text-muted mb-2">{election.description}</p>
                
                <div className="mb-2">
                  <Badge bg="light" text="dark" className="me-2">
                    <FaLandmark className="me-1" />
                    {election.election_type}
                  </Badge>
                  <Badge bg="light" text="dark" className="me-2">
                    <FaUsers className="me-1" />
                    {election.candidates_count || 0} Candidates
                  </Badge>
                  {getStatusBadge(election.status)}
                  {resultsAvailable && (
                    <Badge bg="warning" className="ms-2">
                      <FaTrophy className="me-1" />
                      Results Available
                    </Badge>
                  )}
                </div>

                <div className="small text-muted">
                  <FaClock className="me-1" />
                  {election.status === 'scheduled' ? 'Starts: ' : 'Ends: '}
                  {new Date(
                    election.status === 'scheduled' ? election.voting_start : election.voting_end
                  ).toLocaleString()}
                  {election.status === 'active' && (
                    <span className="text-warning ms-2">
                      <FaHourglassHalf className="me-1" />
                      {getTimeRemaining()}
                    </span>
                  )}
                </div>
                
                {election.constituency && (
                  <div className="small text-muted">
                    <FaMapMarkerAlt className="me-1" />
                    {election.constituency}
                  </div>
                )}

                {/* Voting Progress Bar */}
                {election.total_votes > 0 && (
                  <div className="mt-2">
                    <div className="d-flex justify-content-between small text-muted">
                      <span>Total Votes: {election.total_votes}</span>
                      {election.voter_turnout && (
                        <span>Turnout: {election.voter_turnout}%</span>
                      )}
                    </div>
                    {election.voter_turnout && (
                      <ProgressBar 
                        now={election.voter_turnout} 
                        variant="success" 
                        className="mt-1"
                        style={{ height: '6px' }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </Col>

          <Col md={4} className="text-end">
            {filter === 'completed' ? (
              <div className="text-center">
                <Badge bg="warning" className="mb-2 p-2 fs-6">
                  <FaTrophy className="me-1" />
                  Results Ready
                </Badge>
                <div className="mt-2">
                  <Button
                    variant="warning"
                    onClick={() => onViewResults(election)}
                    className="w-100 mb-2 py-2"
                    size="lg"
                  >
                    <FaChartBar className="me-2" />
                    View Results
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={handlePreviewElection}
                    className="w-100"
                  >
                    <FaEye className="me-1" />
                    Election Details
                  </Button>
                </div>
              </div>
            ) : hasVoted ? (
              <div className="text-center">
                <Badge bg="success" className="mb-2 p-2 fs-6">
                  <FaCheckCircle className="me-1" />
                  Vote Cast ✓
                </Badge>
                <div className="mt-2">
                  {resultsAvailable ? (
                    <>
                      <Button
                        variant="warning"
                        onClick={() => onViewResults(election)}
                        className="w-100 mb-2 py-2"
                        size="lg"
                      >
                        <FaChartBar className="me-2" />
                        View Results
                      </Button>
                      <small className="text-muted d-block">
                        Live results available
                      </small>
                    </>
                  ) : (
                    <Button
                      variant="outline-success"
                      onClick={handlePreviewElection}
                      className="w-100 mb-1"
                    >
                      <FaEye className="me-1" />
                      Election Details
                    </Button>
                  )}
                </div>
              </div>
            ) : election.is_eligible ? (
              <div className="text-center">
                {election.status === 'active' ? (
                  <>
                    <Button
                      variant="primary"
                      onClick={() => onStartVoting(election)}
                      className="w-100 mb-2 py-2"
                      size="lg"
                    >
                      <FaVoteYea className="me-2" />
                      Cast Your Vote
                    </Button>
                    <div className="small text-muted">
                      {election.candidates_count || 0} candidates waiting
                    </div>
                  </>
                ) : election.status === 'scheduled' ? (
                  <>
                    <Badge bg="warning" text="dark" className="p-2 fs-6 mb-2">
                      <FaClock className="me-1" />
                      Coming Soon
                    </Badge>
                    <Button
                      variant="outline-secondary"
                      onClick={handlePreviewElection}
                      className="w-100"
                    >
                      <FaEye className="me-1" />
                      Preview Election
                    </Button>
                  </>
                ) : (
                  <Badge bg="secondary" className="p-2 fs-6">
                    <FaTimesCircle className="me-1" />
                    Election Closed
                  </Badge>
                )}
              </div>
            ) : (
              <div className="text-center">
                <Badge bg="warning" text="dark" className="p-2 fs-6 mb-2">
                  <FaExclamationTriangle className="me-1" />
                  Not Eligible
                </Badge>
                <div className="mt-2">
                  <Button
                    variant="outline-secondary"
                    onClick={handlePreviewElection}
                    className="w-100"
                  >
                    <FaEye className="me-1" />
                    View Election
                  </Button>
                </div>
              </div>
            )}
          </Col>
        </Row>

        {/* Election Status Bar */}
        {!compact && (
          <div className="mt-3 pt-3 border-top">
            <div className="row text-center">
              <div className="col">
                <small className="text-muted">Status</small>
                <div>
                  {getStatusBadge(election.status)}
                </div>
              </div>
              <div className="col">
                <small className="text-muted">Type</small>
                <div>
                  <Badge bg="info" text="dark">
                    {election.election_type}
                  </Badge>
                </div>
              </div>
              <div className="col">
                <small className="text-muted">Candidates</small>
                <div className="fw-bold">{election.candidates_count || 0}</div>
              </div>
              <div className="col">
                <small className="text-muted">Votes</small>
                <div className="fw-bold">{election.total_votes || 0}</div>
              </div>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

// Enhanced Elections Component with Results Integration
const EnhancedElections = ({ 
  dashboardData, 
  voterId, 
  isConnected, 
  BroadcastIcon, 
  onStartVoting, 
  onViewResults, // NEW: Results handler
  hasVoted,
  completedElections // NEW: Completed elections data
}) => {
  const [activeElections, setActiveElections] = useState([]);
  const [upcomingElections, setUpcomingElections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('active');

  useEffect(() => {
    loadElections();
  }, [filter]);

  const loadElections = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('Loading elections with filter:', filter);
      
      let response;
      switch (filter) {
        case 'active':
          response = await voterAPI.getActiveElections();
          if (response.success) {
            console.log(`Found ${response.elections.length} active elections`);
            setActiveElections(response.elections || []);
          }
          break;
        case 'upcoming':
          response = await voterAPI.getUpcomingElections();
          if (response.success) {
            setUpcomingElections(response.elections || []);
          }
          break;
        case 'completed':
          // Use the completedElections passed from parent
          setLoading(false);
          return;
        default:
          response = await voterAPI.getActiveElections();
          if (response.success) {
            setActiveElections(response.elections || []);
          }
      }
      
      if (!response.success) {
        setError(response.message || `Failed to load ${filter} elections`);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || `Failed to load ${filter} elections`;
      setError(errorMsg);
      console.error('Error loading elections:', err);
    } finally {
      setLoading(false);
    }
  };

  const getElectionsToDisplay = () => {
    switch (filter) {
      case 'active': return activeElections;
      case 'upcoming': return upcomingElections;
      case 'completed': return completedElections || [];
      default: return activeElections;
    }
  };

  const electionsToDisplay = getElectionsToDisplay();

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">
            <FaVoteYea className="me-2 text-primary" />
            Election Portal
            {isConnected && (
              <Badge bg="success" className="ms-2">
                <BroadcastIcon className="me-1" />
                Live
              </Badge>
            )}
          </h4>
          <p className="text-muted mb-0">
            Participate in ongoing elections and cast your vote securely
          </p>
        </div>

        <Button variant="outline-primary" size="sm" onClick={loadElections} disabled={loading}>
          <FaSync className={`me-1 ${loading ? 'spinner' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filter Tabs - Updated with Results Count */}
      <Card className="shadow-sm border-0 mb-4">
        <Card.Body className="py-3">
          <div className="d-flex gap-2 flex-wrap">
            <Button
              variant={filter === 'active' ? 'primary' : 'outline-primary'}
              size="sm"
              onClick={() => setFilter('active')}
            >
              <FaPlay className="me-1" />
              Active Elections
              <Badge bg="light" text="dark" className="ms-2">
                {activeElections.length}
              </Badge>
            </Button>
            <Button
              variant={filter === 'upcoming' ? 'warning' : 'outline-warning'}
              size="sm"
              onClick={() => setFilter('upcoming')}
            >
              <FaClock className="me-1" />
              Upcoming
              <Badge bg="light" text="dark" className="ms-2">
                {upcomingElections.length}
              </Badge>
            </Button>
            <Button
              variant={filter === 'completed' ? 'warning' : 'outline-warning'}
              size="sm"
              onClick={() => setFilter('completed')}
            >
              <FaTrophy className="me-1" />
              Results
              <Badge bg="light" text="dark" className="ms-2">
                {completedElections?.length || 0}
              </Badge>
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Alerts */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          <FaExclamationTriangle className="me-2" />
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')}>
          <FaCheckCircle className="me-2" />
          {success}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading {filter} elections...</p>
        </div>
      )}

      {/* Election List View */}
      {!loading && (
        <Card className="shadow-sm border-0">
          <Card.Header className="bg-white border-0">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                {filter === 'active' && 'Active Elections'}
                {filter === 'upcoming' && 'Upcoming Elections'}
                {filter === 'completed' && 'Election Results'}
                <Badge bg={
                  filter === 'active' ? 'success' : 
                  filter === 'upcoming' ? 'warning' : 'warning'
                } className="ms-2">
                  {electionsToDisplay.length} {filter}
                </Badge>
              </h5>
              <div className="d-flex gap-2">
                <Button variant="outline-secondary" size="sm">
                  <FaFilter className="me-1" />
                  Filter
                </Button>
                <Button variant="outline-secondary" size="sm">
                  <FaSearch className="me-1" />
                  Search
                </Button>
              </div>
            </div>
          </Card.Header>
          <Card.Body>
            {electionsToDisplay.length === 0 ? (
              <div className="text-center py-5">
                {filter === 'completed' ? (
                  <>
                    <FaTrophy className="text-muted fa-4x mb-3" />
                    <h5>No Election Results Available</h5>
                    <p className="text-muted">
                      Results will appear here once elections are completed and results are published.
                    </p>
                  </>
                ) : (
                  <>
                    <FaVoteYea className="text-muted fa-4x mb-3" />
                    <h5>No {filter} Elections</h5>
                    <p className="text-muted">
                      {filter === 'active' && 'There are no active elections at the moment. Please check back later.'}
                      {filter === 'upcoming' && 'There are no upcoming elections scheduled.'}
                      {filter === 'completed' && 'No completed elections found.'}
                    </p>
                  </>
                )}
                {filter !== 'active' && (
                  <Button variant="primary" onClick={() => setFilter('active')}>
                    View Active Elections
                  </Button>
                )}
              </div>
            ) : (
              electionsToDisplay.map(election => (
                <EnhancedElectionCard 
                  key={election.election_id} 
                  election={election}
                  onStartVoting={onStartVoting}
                  onViewResults={onViewResults} // NEW: Pass results handler
                  filter={filter}
                  hasVoted={hasVoted[election.election_id]}
                />
              ))
            )}
          </Card.Body>
        </Card>
      )}
    </div>
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
        {!verified && <FaTimesCircle className="text-danger ms-2" title="Not Verified" />}
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
            <Badge bg={profileData?.verification_status?.overall ? "success" : "warning"}>
              {profileData?.verification_status?.overall ? "Verified Voter" : "Verification Pending"}
            </Badge>
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
                  Contact & Verification
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
                <VerifiedField 
                  label="Face Verification" 
                  value={profileData?.verification_status?.face ? "Verified" : "Pending"}
                  verified={profileData?.verification_status?.face}
                  icon={FaUserCheck}
                />
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Address Information */}
        <Card className="border-0 bg-light mt-4">
          <Card.Body>
            <h6 className="border-bottom pb-2 mb-3">
              <FaMapMarkerAlt className="me-2" />
              Address Information
            </h6>
            <Row>
              <Col md={6}>
                <ProfileField label="Address Line 1" value={safeRender(profileData?.address?.address_line1)} />
                <ProfileField label="City/Village" value={safeRender(profileData?.address?.village_city)} />
                <ProfileField label="State" value={safeRender(profileData?.address?.state)} />
              </Col>
              <Col md={6}>
                <ProfileField label="Address Line 2" value={safeRender(profileData?.address?.address_line2)} />
                <ProfileField label="District" value={safeRender(profileData?.address?.district)} />
                <ProfileField label="Pincode" value={safeRender(profileData?.address?.pincode)} />
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Card.Body>
    </Card>
  );
};

// Enhanced Voting History Component
const EnhancedVotingHistory = ({ voterId }) => {
  const [votingHistory, setVotingHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVotingHistory();
  }, []);

  const loadVotingHistory = async () => {
    try {
      // This would typically come from an API call
      // For now, using mock data
      setTimeout(() => {
        setVotingHistory([
          {
            election_id: 'ELECT202412011200001',
            election_title: 'National General Election 2024',
            candidate_name: 'John Smith',
            party: 'Democratic Party',
            vote_timestamp: new Date('2024-01-15T10:30:00Z'),
            constituency: 'North District'
          },
          {
            election_id: 'ELECT202311201200001',
            election_title: 'State Assembly Election 2023',
            candidate_name: 'Sarah Johnson',
            party: 'Republican Party',
            vote_timestamp: new Date('2023-11-20T14:45:00Z'),
            constituency: 'Central District'
          }
        ]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error loading voting history:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white border-0">
          <h5 className="mb-0 d-flex align-items-center">
            <FaHistory className="me-2 text-primary" />
            Voting History
          </h5>
        </Card.Header>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading voting history...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-0">
      <Card.Header className="bg-white border-0">
        <h5 className="mb-0 d-flex align-items-center">
          <FaHistory className="me-2 text-primary" />
          Voting History
        </h5>
      </Card.Header>
      <Card.Body>
        {votingHistory.length > 0 ? (
          <ListGroup variant="flush">
            {votingHistory.map((vote, index) => (
              <ListGroup.Item key={index} className="border-0">
                <Row className="align-items-center">
                  <Col md={8}>
                    <h6 className="mb-1">{vote.election_title}</h6>
                    <p className="mb-1">
                      <strong>Candidate:</strong> {vote.candidate_name} ({vote.party})
                    </p>
                    <small className="text-muted">
                      <FaMapMarkerAlt className="me-1" />
                      {vote.constituency} • 
                      <FaClock className="me-1 ms-2" />
                      {new Date(vote.vote_timestamp).toLocaleString()}
                    </small>
                  </Col>
                  <Col md={4} className="text-end">
                    <Badge bg="success">Voted</Badge>
                  </Col>
                </Row>
              </ListGroup.Item>
            ))}
          </ListGroup>
        ) : (
          <div className="text-center py-5">
            <FaHistory className="text-muted fs-1 mb-3" />
            <h5 className="text-muted">No Voting History Yet</h5>
            <p className="text-muted mb-4">
              Your voting history will appear here once you participate in elections.
            </p>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Check for Active Elections
            </Button>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

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