import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, Row, Col, Card, Button, Alert, Spinner, Nav, Tab, 
  Badge, Modal, Form, ProgressBar, ListGroup, Dropdown, Carousel,
  Toast, ToastContainer
} from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  FaTrophy, FaChartLine, FaFilePdf, FaFileCsv, FaFileAlt,
  FaLightbulb, FaMedal, FaUserClock, FaUserEdit,
  FaLock, FaGlobe, FaCalendarCheck,
  FaPercentage, FaWrench,
  FaUserShield, FaKey, FaBug, FaNetworkWired,
  FaServer, FaDatabase, FaFingerprint,
  FaSignInAlt
} from 'react-icons/fa';
import { FaCircleCheck, FaCircleInfo, FaCircleXmark, FaClockRotateLeft, FaGear, FaLocationDot, FaShieldHalved, FaTriangleExclamation } from 'react-icons/fa6';

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
  const [showDigitalID, setShowDigitalID] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [electionType, setElectionType] = useState('all');
  const [realTimeUpdates, setRealTimeUpdates] = useState([]);
  const [liveStats, setLiveStats] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [hasVoted, setHasVoted] = useState({});
  const [completedElections, setCompletedElections] = useState([]);
  const [digitalID, setDigitalID] = useState(null);
  const [enhancedVotingHistory, setEnhancedVotingHistory] = useState(null);
  const [enhancedAnalytics, setEnhancedAnalytics] = useState(null);
  const [enhancedSecurity, setEnhancedSecurity] = useState(null);
  const [quickActions, setQuickActions] = useState([]);
  const [searchParams] = useSearchParams();
  const BroadcastIcon = FaSignal;

  // Enhanced socket event listeners
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
    on('results_published', handleResultsPublished);

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

  // Read the tab parameter from URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['overview', 'profile', 'elections', 'results', 'history', 'analytics', 'security'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Enhanced data loading functions
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

        // Generate quick actions
        generateQuickActions(sanitizedData, votedStatus);
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

  // Function to handle tab change 
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    // Update URL without reloading page
    navigate(`/dashboard?tab=${tabKey}`, { replace: true });
  };

  const generateQuickActions = (dashboardData, votedStatus) => {
    const actions = [];
    
    // Vote Now action
    const activeElections = dashboardData?.election_info?.active_elections || [];
    const eligibleElections = activeElections.filter(e => 
      e.can_vote && !votedStatus[e.election_id] && e.status === 'active'
    );
    
    if (eligibleElections.length > 0) {
      actions.push({
        id: 'vote_now',
        title: 'Vote Now',
        description: `Cast vote in ${eligibleElections.length} election${eligibleElections.length > 1 ? 's' : ''}`,
        icon: FaVoteYea,
        color: 'primary',
        variant: 'primary',
        onClick: () => {
          if (eligibleElections[0]) {
            handleStartVoting(eligibleElections[0]);
          }
        }
      });
    }

    // Profile completion
    const profileCompletion = calculateProfileCompletion(dashboardData?.voter_info);
    if (profileCompletion < 100) {
      actions.push({
        id: 'complete_profile',
        title: 'Complete Profile',
        description: `${profileCompletion}% completed`,
        icon: FaUserEdit,
        color: 'warning',
        variant: 'warning',
        onClick: () => setActiveTab('profile')
      });
    }

    // Security verification
    const verificationStatus = getVerificationStatus(dashboardData?.voter_info);
    if (verificationStatus !== 'Fully Verified') {
      actions.push({
        id: 'verify_account',
        title: 'Verify Account',
        description: 'Complete verification steps',
        icon: FaShieldAlt,
        color: 'info',
        variant: 'info',
        onClick: () => setActiveTab('security')
      });
    }

    // Digital ID
    actions.push({
      id: 'digital_id',
      title: 'Digital ID',
      description: 'Generate digital voter ID',
      icon: FaIdCard,
      color: 'success',
      variant: 'success',
      onClick: handleGenerateDigitalID
    });

    // Export Data
    actions.push({
      id: 'export_data',
      title: 'Export Data',
      description: 'Download your voter data',
      icon: FaDownload,
      color: 'secondary',
      variant: 'outline-secondary',
      onClick: () => setShowExportModal(true)
    });

    setQuickActions(actions);
  };

  const calculateProfileCompletion = (voterInfo) => {
    if (!voterInfo) return 0;
    const requiredFields = [
      'full_name', 'father_name', 'gender', 'date_of_birth', 'email', 
      'phone', 'address_line1', 'village_city', 'district', 'state', 
      'pincode', 'national_id_number'
    ];
    const completed = requiredFields.filter(field => voterInfo[field]).length;
    return Math.round((completed / requiredFields.length) * 100);
  };

  const getVerificationStatus = (voterInfo) => {
    if (!voterInfo) return 'Unknown';
    const verifications = [
      voterInfo.email_verified,
      voterInfo.phone_verified,
      voterInfo.id_verified,
      voterInfo.face_verified
    ];
    const verifiedCount = verifications.filter(v => v).length;
    if (verifiedCount === 4) return 'Fully Verified';
    if (verifiedCount >= 2) return 'Partially Verified';
    return 'Verification Pending';
  };

  // Enhanced refresh function
  const handleRefreshData = async () => {
    try {
      setLoading(true);
      const response = await voterAPI.refreshDashboardData();
      if (response.success) {
        setDashboardData(response.dashboard_data);
        setLastUpdate(response.last_updated);
        setRealTimeUpdates(prev => [{
          id: Date.now(),
          type: 'system',
          action: 'refresh',
          title: 'Data Refreshed',
          message: response.message || 'Dashboard data updated successfully',
          timestamp: new Date().toISOString(),
          urgent: false
        }, ...prev.slice(0, 9)]);
      }
    } catch (error) {
      setError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced export function
  const handleExportData = async (format) => {
    try {
      setLoading(true);
      const response = await voterAPI.exportData(format);
      
      if (response.success) {
        if (format === 'json') {
          // For JSON, download manually
          const dataStr = JSON.stringify(response.data, null, 2);
          const dataBlob = new Blob([dataStr], { type: 'application/json' });
          downloadBlob(dataBlob, `voter_data_${user?.voter_id}_${Date.now()}.json`);
        } else if (response.download_url) {
          // For PDF/CSV, open download URL
          window.open(response.download_url, '_blank');
        }
        
        setRealTimeUpdates(prev => [{
          id: Date.now(),
          type: 'system',
          action: 'export',
          title: 'Data Exported',
          message: `Data exported successfully as ${format.toUpperCase()}`,
          timestamp: new Date().toISOString(),
          urgent: false
        }, ...prev.slice(0, 9)]);
        
        setShowExportModal(false);
      }
    } catch (error) {
      setError(`Failed to export data as ${format}`);
    } finally {
      setLoading(false);
    }
  };

  // Digital ID generation
  const handleGenerateDigitalID = async () => {
    try {
      setLoading(true);
      const response = await voterAPI.generateDigitalID();
      if (response.success) {
        setDigitalID(response.digital_id);
        setShowDigitalID(true);
        
        setRealTimeUpdates(prev => [{
          id: Date.now(),
          type: 'system',
          action: 'digital_id',
          title: 'Digital ID Generated',
          message: 'Your digital ID has been generated successfully',
          timestamp: new Date().toISOString(),
          urgent: false
        }, ...prev.slice(0, 9)]);
      }
    } catch (error) {
      setError('Failed to generate digital ID');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced voting history
  const handleLoadEnhancedVotingHistory = async () => {
    try {
      setLoading(true);
      const response = await voterAPI.getEnhancedVotingHistory();
      if (response.success) {
        setEnhancedVotingHistory(response.voting_history);
        setActiveTab('history');
      }
    } catch (error) {
      setError('Failed to load voting history');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced analytics
  const handleLoadEnhancedAnalytics = async () => {
    try {
      setLoading(true);
      const response = await voterAPI.getEnhancedAnalytics();
      if (response.success) {
        setEnhancedAnalytics(response.analytics);
        setActiveTab('analytics');
      }
    } catch (error) {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced security
  const handleLoadEnhancedSecurity = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await voterAPI.getEnhancedSecurity();
      console.log('🔒 Enhanced security response:', response);
      
      if (response.success) {
        setEnhancedSecurity(response.security);
        setActiveTab('security');
      } else {
        // Handle specific error codes
        if (response.code === 'AUTH_REQUIRED') {
          setError('Please login again to access security information');
        } else if (response.code === 'ACCOUNT_INACTIVE') {
          setError('Your account is not active. Please contact support.');
        } else {
          setError(response.message || 'Failed to load security information');
        }
      }
    } catch (error) {
      console.error('❌ Error loading enhanced security:', error);
      
      // Handle different types of errors
      if (error.response?.status === 401) {
        setError('Authentication required. Please login again.');
        logout();
        navigate('/login');
      } else if (error.response?.status === 403) {
        setError('Access denied. You do not have permission to view security information.');
      } else if (error.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else {
        const errorMsg = error.response?.data?.message || 
                        error.message || 
                        'Failed to load security information';
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Utility function to download blobs
  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Load completed elections
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
        if (activeTab === 'elections' || activeTab === 'results') {
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
    loadCompletedElections();
  }, [isAuthenticated, authLoading, navigate]);

  // Socket event handlers
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

    if (activeTab === 'overview' || activeTab === 'elections' || activeTab === 'results') {
      loadCompletedElections();
      loadDashboardData();
    }
  }, [activeTab]);

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
          loadCompletedElections();
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

    if (activeTab === 'overview' || activeTab === 'elections' || activeTab === 'results') {
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

  // Helper functions
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

  // Enhanced voting session start
  const handleStartVoting = async (election) => {
    try {
      console.log(`🚀 Starting voting process for election: ${election.election_id}`);
      setLoading(true);
      setError('');

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

  // Function to handle viewing results
  const handleViewResults = async (election) => {
    try {
      console.log(`Viewing results for election: ${election.election_id}`);
      setLoading(true);
      setError('');
      
      const response = await voterAPI.getElectionResults(election.election_id);
      console.log('Results response:', response);
      
      if (response.success) {
        // Navigate to results page with data
        navigate(`/results/${election.election_id}`, {
          state: {
            results: response.results,
            election: response.election,
            accessInfo: response.access_info
          }
        });
      } else {
        setError(response.message || 'Failed to load results');
        
        // If access denied but election is completed, show a helpful message
        if (response.reason) {
          setError(`${response.message} (${response.reason})`);
        }
      }
    } catch (error) {
      console.error('❌ Error viewing results:', error);
      const errorMsg = error.response?.data?.message || 
                      error.message || 
                      'Failed to load election results';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Test SocketIO connection
  const testSocketConnection = () => {
    if (socket && isConnected) {
      socket.emit('ping', { message: 'Test from dashboard', timestamp: Date.now() });
      socket.emit('echo', { test: 'SocketIO connection test' });
    }
  };

  // Loading and authentication checks
  if (authLoading || loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-dark">
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
    <div className="d-flex flex-column min-vh-100">
      {/* Real-time Updates Toast */}
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

      {/* Header - Changed to dark theme */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow">
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
                <Dropdown.Item onClick={() => handleTabChange('profile')}>
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

      {/* Main Content */}
      <Container fluid className="py-4 flex-grow-1">
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
                onClick={handleRefreshData}
                disabled={loading}
                title="Refresh Data"
              >
                <FaSync className={loading ? 'spinner' : ''} />
              </Button>
            </small>
          </div>
        )}
        
        {dashboardData ? (
          <Tab.Container activeKey={activeTab} onSelect={handleTabChange}>
            <Row>
              {/* Enhanced Sidebar Navigation */}
              <Col lg={2} md={3} className="mb-4">
                <Card className="shadow-sm border-0 h-100 dashboard-sidebar">
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

                    {/* Main Navigation - Added Results tab */}
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
                      {/* NEW: Results Tab */}
                      <Nav.Item>
                        <Nav.Link eventKey="results" className="d-flex align-items-center py-3 border-bottom">
                          <FaChartBar className="me-3 fs-5" />
                          <span>Results</span>
                          <Badge bg="warning" pill className="ms-2">
                            {completedElections?.length || 0}
                          </Badge>
                        </Nav.Link>
                      </Nav.Item>
                      <Nav.Item>
                        <Nav.Link eventKey="history" className="d-flex align-items-center py-3 border-bottom" onClick={handleLoadEnhancedVotingHistory}>
                          <FaHistory className="me-3 fs-5" />
                          <span>Voting History</span>
                        </Nav.Link>
                      </Nav.Item>
                      <Nav.Item>
                        <Nav.Link eventKey="analytics" className="d-flex align-items-center py-3 border-bottom" onClick={handleLoadEnhancedAnalytics}>
                          <FaChartBar className="me-3 fs-5" />
                          <span>Analytics</span>
                        </Nav.Link>
                      </Nav.Item>
                      <Nav.Item>
                        <Nav.Link eventKey="security" className="d-flex align-items-center py-3 border-bottom" onClick={handleLoadEnhancedSecurity}>
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

                    {/* Enhanced Quick Actions */}
                    <div className="p-3 border-top">
                      <small className="text-muted mb-2 d-block">QUICK ACTIONS</small>
                      <div className="d-grid gap-2">
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          onClick={handleGenerateDigitalID}
                          className="dashboard-btn"
                        >
                          <FaQrcode className="me-1" />
                          Digital ID
                        </Button>
                        <Button 
                          variant="outline-success" 
                          size="sm"
                          onClick={() => setShowExportModal(true)}
                          className="dashboard-btn"
                        >
                          <FaDownload className="me-1" />
                          Export Data
                        </Button>
                        <Button 
                          variant="outline-info" 
                          size="sm"
                          onClick={handleRefreshData}
                          disabled={loading}
                          className="dashboard-btn"
                        >
                          <FaSync className={`me-1 ${loading ? 'spinner' : ''}`} />
                          Refresh Data
                        </Button>
                      </div>
                    </div>
                  </Card.Body>
                </Card>

                {/* Enhanced Voter Status Card */}
                <Card className="shadow-sm border-0 mt-3 stats-card">
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
                      {getVerificationStatus(dashboardData.voter_info)}
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
                  <Tab.Pane eventKey="overview">
                    <EnhancedOverview 
                      dashboardData={dashboardData}
                      liveStats={liveStats}
                      isConnected={isConnected}
                      onRefresh={handleRefreshData}
                      loading={loading}
                      BroadcastIcon={BroadcastIcon}
                      onStartVoting={handleStartVoting}
                      onViewResults={handleViewResults}
                      hasVoted={hasVoted}
                      completedElections={completedElections}
                      quickActions={quickActions}
                    />
                  </Tab.Pane>

                  <Tab.Pane eventKey="profile">
                    <EnhancedProfile 
                      profileData={profileData}
                      dashboardData={dashboardData}
                    />
                  </Tab.Pane>

                  <Tab.Pane eventKey="elections">
                    <EnhancedElections 
                      dashboardData={dashboardData}
                      voterId={user?.voter_id}
                      isConnected={isConnected}
                      BroadcastIcon={BroadcastIcon}
                      onStartVoting={handleStartVoting}
                      onViewResults={handleViewResults}
                      hasVoted={hasVoted}
                      completedElections={completedElections}
                    />
                  </Tab.Pane>

                  {/* NEW: Results Tab */}
                  <Tab.Pane eventKey="results">
                    <ResultsTab 
                      completedElections={completedElections}
                      onViewResults={handleViewResults}
                    />
                  </Tab.Pane>

                  <Tab.Pane eventKey="history">
                    <EnhancedVotingHistory 
                      voterId={user?.voter_id}
                      enhancedVotingHistory={enhancedVotingHistory}
                      onLoadEnhanced={handleLoadEnhancedVotingHistory}
                    />
                  </Tab.Pane>
                  
                  <Tab.Pane eventKey="analytics">
                    <EnhancedAnalytics 
                      dashboardData={dashboardData}
                      enhancedAnalytics={enhancedAnalytics}
                      onLoadEnhanced={handleLoadEnhancedAnalytics}
                    />
                  </Tab.Pane>
                  
                  <Tab.Pane eventKey="security">
                    <EnhancedSecurity 
                      voterId={user?.voter_id}
                      enhancedSecurity={enhancedSecurity}
                      onLoadEnhanced={handleLoadEnhancedSecurity}
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

      {/* Enhanced Notifications Modal */}
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

      {/* Digital ID Modal */}
      <Modal show={showDigitalID} onHide={() => setShowDigitalID(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaIdCard className="me-2" />
            Digital Voter ID
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {digitalID ? (
            <div className="text-center">
              <div className="border rounded p-4 mb-4">
                <img 
                  src={digitalID.qr_code} 
                  alt="Digital ID QR Code" 
                  className="img-fluid mb-3"
                  style={{ maxWidth: '200px' }}
                />
                <h4>{digitalID.full_name}</h4>
                <p className="text-muted">Voter ID: {digitalID.voter_id}</p>
                <Badge bg="success" className="mb-3">
                  {digitalID.verification_level} Verification
                </Badge>
                
                <Row className="text-start mt-4">
                  <Col md={6}>
                    <p><strong>Constituency:</strong> {digitalID.constituency}</p>
                    <p><strong>Polling Station:</strong> {digitalID.polling_station}</p>
                  </Col>
                  <Col md={6}>
                    <p><strong>Issued:</strong> {formatDate(digitalID.issue_date)}</p>
                    <p><strong>Expires:</strong> {formatDate(digitalID.expiry_date)}</p>
                  </Col>
                </Row>
              </div>
              <Button 
                variant="primary" 
                onClick={() => {
                  // Download QR code
                  const link = document.createElement('a');
                  link.href = digitalID.qr_code;
                  link.download = `voter_id_${digitalID.voter_id}.png`;
                  link.click();
                }}
              >
                <FaDownload className="me-1" />
                Download QR Code
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">Generating Digital ID...</p>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Export Data Modal */}
      <Modal show={showExportModal} onHide={() => setShowExportModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaDownload className="me-2" />
            Export Data
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Choose export format:</p>
          <div className="d-grid gap-2">
            <Button 
              variant="outline-danger" 
              size="lg"
              onClick={() => handleExportData('pdf')}
              disabled={loading}
              className="dashboard-btn"
            >
              <FaFilePdf className="me-2" />
              Export as PDF
            </Button>
            <Button 
              variant="outline-success" 
              size="lg"
              onClick={() => handleExportData('csv')}
              disabled={loading}
              className="dashboard-btn"
            >
              <FaFileCsv className="me-2" />
              Export as CSV
            </Button>
            <Button 
              variant="outline-info" 
              size="lg"
              onClick={() => handleExportData('json')}
              disabled={loading}
              className="dashboard-btn"
            >
              <FaFileAlt className="me-2" />
              Export as JSON
            </Button>
          </div>
          {loading && (
            <div className="text-center mt-3">
              <Spinner animation="border" size="sm" />
              <span className="ms-2">Exporting data...</span>
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

// Results Tab Component
const ResultsTab = ({ completedElections, onViewResults }) => {
  if (!completedElections || completedElections.length === 0) {
    return (
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white border-0">
          <h5 className="mb-0 d-flex align-items-center">
            <FaTrophy className="me-2 text-warning" />
            Election Results
          </h5>
        </Card.Header>
        <Card.Body className="text-center py-5">
          <FaTrophy className="text-muted fa-4x mb-3" />
          <h5 className="text-muted">No Election Results Available</h5>
          <p className="text-muted">
            Results will appear here once elections are completed and results are published.
          </p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">
            <FaTrophy className="me-2 text-warning" />
            Election Results
            <Badge bg="warning" className="ms-2">
              {completedElections.length} Completed
            </Badge>
          </h4>
          <p className="text-muted mb-0">
            View results of completed elections
          </p>
        </div>
      </div>

      <Row>
        {completedElections.map((election, index) => (
          <Col lg={6} key={election.election_id} className="mb-4">
            <Card className="border-0 shadow-sm h-100">
              <Card.Header className="bg-warning bg-opacity-10 border-0">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <FaTrophy className="text-warning me-2" />
                    <strong>Results Available</strong>
                  </div>
                  <Badge bg="warning">Completed</Badge>
                </div>
              </Card.Header>
              <Card.Body>
                <h5 className="mb-3">{election.title}</h5>
                <div className="mb-3">
                  <div className="d-flex align-items-center mb-2">
                    <FaCalendarAlt className="text-muted me-2" />
                    <small>
                      Ended: {new Date(election.voting_end).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </small>
                  </div>
                  <div className="d-flex align-items-center mb-2">
                    <FaMapMarkerAlt className="text-muted me-2" />
                    <small>{election.constituency}</small>
                  </div>
                  <div className="d-flex align-items-center">
                    <FaUsers className="text-muted me-2" />
                    <small>{election.candidates_count || 0} Candidates</small>
                  </div>
                </div>
                
                {election.winner && (
                  <div className="bg-light rounded p-3 mb-3">
                    <div className="d-flex align-items-center mb-2">
                      <FaMedal className="text-warning fs-4 me-2" />
                      <div>
                        <h6 className="mb-0">Winner</h6>
                        <strong>{election.winner.candidate_name}</strong>
                        <div className="small text-muted">{election.winner.party}</div>
                      </div>
                    </div>
                    <Badge bg="success" className="mt-1">
                      {election.winner.vote_percentage}% Votes
                    </Badge>
                  </div>
                )}
                
                <Button 
                  variant="warning" 
                  className="w-100"
                  onClick={() => onViewResults(election)}
                >
                  <FaChartBar className="me-2" />
                  View Full Results
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

// Enhanced Overview Component

const EnhancedOverview = ({ 
  dashboardData, 
  liveStats, 
  isConnected, 
  onRefresh, 
  loading, 
  BroadcastIcon, 
  onStartVoting, 
  onViewResults,
  hasVoted,
  completedElections,
  quickActions
}) => {
  const [securityAlert, setSecurityAlert] = useState(false);
  const [voteConfirmation, setVoteConfirmation] = useState(null);
  const [activeElections, setActiveElections] = useState([]);
  
  // Check for security alerts
  useEffect(() => {
    const checkSecurityAlerts = () => {
      const lastLogin = dashboardData?.voter_info?.last_login;
      if (lastLogin) {
        const lastLoginDate = new Date(lastLogin);
        const hoursSinceLogin = (new Date() - lastLoginDate) / (1000 * 60 * 60);
        if (hoursSinceLogin > 24) {
          setSecurityAlert(true);
        }
      }
    };
    
    if (dashboardData) {
      checkSecurityAlerts();
      // Extract active elections
      const active = dashboardData?.election_info?.active_elections || [];
      setActiveElections(active);
    }
  }, [dashboardData]);

  // Election status indicators
  const getElectionStatusIndicator = (election) => {
    const now = new Date();
    const start = new Date(election.voting_start);
    const end = new Date(election.voting_end);
    
    if (now < start) {
      return {
        type: 'upcoming',
        text: 'Starts Soon',
        color: 'warning',
        icon: FaClock
      };
    } else if (now >= start && now <= end) {
      return {
        type: 'active',
        text: 'Voting Now',
        color: 'success',
        icon: FaPlay
      };
    } else {
      return {
        type: 'ended',
        text: 'Voting Ended',
        color: 'secondary',
        icon: FaStop
      };
    }
  };

  // Render security card with enhanced features
  const renderSecurityCard = () => (
    <Card className="border-0 shadow-sm security-card">
      <Card.Header className="bg-primary bg-opacity-10 border-0">
        <div className="d-flex align-items-center justify-content-between">
          <h6 className="mb-0 d-flex align-items-center">
            <FaShieldAlt className="me-2 text-primary" />
            Security Status
          </h6>
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={() => window.dispatchEvent(new CustomEvent('setActiveTab', { detail: 'security' }))}
          >
            <FaWrench className="me-1" />
            Manage
          </Button>
        </div>
      </Card.Header>
      <Card.Body>
        <div className="mb-3">
          <div className="d-flex justify-content-between mb-2">
            <span>Security Score</span>
            <Badge bg={
              dashboardData?.security_status?.security_score >= 80 ? "success" :
              dashboardData?.security_status?.security_score >= 60 ? "warning" : "danger"
            }>
              {dashboardData?.security_status?.security_score || 0}/100
            </Badge>
          </div>
          <ProgressBar 
            now={dashboardData?.security_status?.security_score || 0}
            variant={
              dashboardData?.security_status?.security_score >= 80 ? "success" :
              dashboardData?.security_status?.security_score >= 60 ? "warning" : "danger"
            }
          />
        </div>
        
        <ListGroup variant="flush">
          <ListGroup.Item className="d-flex justify-content-between align-items-center border-0 px-0 py-2">
            <div className="d-flex align-items-center">
              <FaLock className="text-success me-2" />
              <span>Account Protection</span>
            </div>
            {dashboardData?.security_status?.two_factor_enabled ? 
              <FaCircleCheck className="text-success" /> : 
              <FaTimesCircle className="text-warning" />
            }
          </ListGroup.Item>
          <ListGroup.Item className="d-flex justify-content-between align-items-center border-0 px-0 py-2">
            <div className="d-flex align-items-center">
              <FaShieldHalved className="text-info me-2" />
              <span>Active Sessions</span>
            </div>
            <Badge bg="info">
              {dashboardData?.security_status?.active_sessions || 0}
            </Badge>
          </ListGroup.Item>
          <ListGroup.Item className="d-flex justify-content-between align-items-center border-0 px-0 py-2">
            <div className="d-flex align-items-center">
              <FaUserCheck className="text-primary me-2" />
              <span>Verified Devices</span>
            </div>
            <Badge bg="success">
              {dashboardData?.security_status?.trusted_devices || 0}
            </Badge>
          </ListGroup.Item>
          <ListGroup.Item className="d-flex justify-content-between align-items-center border-0 px-0 py-2">
            <div className="d-flex align-items-center">
              <FaBell className="text-warning me-2" />
              <span>Security Alerts</span>
            </div>
            <Badge bg={dashboardData?.security_status?.alerts_count > 0 ? "warning" : "secondary"}>
              {dashboardData?.security_status?.alerts_count || 0}
            </Badge>
          </ListGroup.Item>
        </ListGroup>
        
        <Button 
          variant="outline-primary" 
          size="sm" 
          className="w-100 mt-3"
          onClick={() => window.dispatchEvent(new CustomEvent('setActiveTab', { detail: 'security' }))}
        >
          <FaShieldAlt className="me-2" />
          Security Center
        </Button>
      </Card.Body>
    </Card>
  );

  // Enhanced results card
  const renderLiveResultsCard = () => {
    if (!completedElections || completedElections.length === 0) return null;
    
    return (
      <Card className="border-0 shadow-sm results-card">
        <Card.Header className="bg-warning bg-opacity-10 border-0">
          <div className="d-flex align-items-center justify-content-between">
            <h6 className="mb-0 d-flex align-items-center">
              <FaTrophy className="text-warning me-2" />
              Recent Results
            </h6>
            <Button 
              variant="outline-warning" 
              size="sm"
              onClick={() => window.dispatchEvent(new CustomEvent('setActiveTab', { detail: 'results' }))}
            >
              View All
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="results-list">
            {completedElections.slice(0, 3).map(election => (
              <div key={election.election_id} className="result-item mb-3 pb-3 border-bottom">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h6 className="mb-0">{election.title}</h6>
                  <Badge bg="warning">Results</Badge>
                </div>
                <p className="text-muted small mb-2">{election.constituency}</p>
                
                {election.winner && (
                  <div className="bg-light rounded p-2 mb-2">
                    <div className="d-flex align-items-center">
                      <FaMedal className="text-warning me-2" />
                      <div>
                        <strong className="d-block">{election.winner.candidate_name}</strong>
                        <small className="text-muted">{election.winner.party}</small>
                        <Badge bg="success" className="ms-2">
                          {election.winner.vote_percentage}% Votes
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    Ended: {new Date(election.voting_end).toLocaleDateString()}
                  </small>
                  <Button 
                    variant="outline-warning" 
                    size="sm"
                    onClick={() => onViewResults(election)}
                  >
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>
    );
  };

  // Enhanced stat card component
  const EnhancedStatCard = ({ title, value, icon: Icon, color = 'primary', subtitle = '', onClick = null }) => (
    <Card 
      className={`border-0 shadow-sm h-100 cursor-pointer ${onClick ? 'clickable-stat-card' : ''}`}
      onClick={onClick}
    >
      <Card.Body className="d-flex align-items-center p-3">
        <div className={`bg-${color} bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3`}
             style={{ width: '50px', height: '50px' }}>
          <Icon className={`text-${color} fs-4`} />
        </div>
        <div className="flex-grow-1">
          <h3 className="mb-1 fw-bold">{value}</h3>
          <p className="mb-0 text-muted small">{title}</p>
          {subtitle && <small className="opacity-75 d-block mt-1">{subtitle}</small>}
          {onClick && (
            <small className="text-primary d-block mt-2">
              Click to view details →
            </small>
          )}
        </div>
      </Card.Body>
    </Card>
  );

  // Enhanced election card
  const EnhancedElectionCard = ({ election, onStartVoting, onViewResults, compact = false, hasVoted }) => {
    const status = getElectionStatusIndicator(election);
    const StatusIcon = status.icon;
    
    return (
      <Card className="border-0 shadow-sm election-card h-100 hover-lift">
        <Card.Header className={`bg-${status.color} bg-opacity-10 border-0`}>
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <StatusIcon className={`text-${status.color} me-2`} />
              <strong>{status.text}</strong>
            </div>
            {isConnected && (
              <Badge bg="success" pill>
                <BroadcastIcon className="me-1" /> Live
              </Badge>
            )}
          </div>
        </Card.Header>
        <Card.Body>
          <h5 className="mb-2">{election.title}</h5>
          <div className="mb-3">
            <div className="d-flex align-items-center mb-1">
              <FaCalendarAlt className="text-muted me-2" size={12} />
              <small>
                {new Date(election.voting_start).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })} - {new Date(election.voting_end).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </small>
            </div>
            <div className="d-flex align-items-center mb-1">
              <FaMapMarkerAlt className="text-muted me-2" size={12} />
              <small>{election.constituency}</small>
            </div>
            <div className="d-flex align-items-center">
              <FaUsers className="text-muted me-2" size={12} />
              <small>{election.candidates_count || 0} Candidates</small>
            </div>
          </div>
          
          {status.type === 'active' && (
            <div className="mt-3">
              {hasVoted ? (
                <Alert variant="success" className="py-2 mb-2">
                  <div className="d-flex align-items-center">
                    <FaCheckCircle className="me-2" />
                    <div>
                      <strong>Vote Cast!</strong>
                      <div className="small">Your vote has been recorded</div>
                    </div>
                  </div>
                </Alert>
              ) : (
                <Button 
                  variant="primary" 
                  className="w-100"
                  onClick={() => onStartVoting(election)}
                >
                  <FaVoteYea className="me-2" />
                  Cast Your Vote
                </Button>
              )}
              
              {election.total_votes > 0 && (
                <div className="mt-2">
                  <ProgressBar 
                    now={(election.total_votes / 1000) * 100}
                    label={`${election.total_votes} votes`}
                    variant="info"
                    className="mb-1"
                  />
                  <small className="text-muted">Current Turnout</small>
                </div>
              )}
            </div>
          )}
          
          {status.type === 'ended' && election.results_available && (
            <Button 
              variant="warning" 
              className="w-100 mt-2"
              onClick={() => onViewResults(election)}
            >
              <FaChartBar className="me-2" />
              View Results
            </Button>
          )}
        </Card.Body>
        <Card.Footer className="bg-light border-0 py-2">
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">
              <FaLock className="me-1" />
              Secure Blockchain Verified
            </small>
            <Badge bg="light" text="dark" className="small">
              ID: {election.election_id?.substring(0, 8)}...
            </Badge>
          </div>
        </Card.Footer>
      </Card>
    );
  };

  // Quick action card
  const QuickActionCard = ({ action }) => (
    <Card 
      className="border-0 shadow-sm h-100 hover-shadow cursor-pointer"
      onClick={action.onClick}
      key={action.id}
    >
      <Card.Body className="text-center p-3">
        <div className={`bg-${action.color} bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3`}
             style={{ width: '50px', height: '50px' }}>
          <action.icon className={`text-${action.color} fs-4`} />
        </div>
        <h6 className="mb-2">{action.title}</h6>
        <p className="small text-muted mb-3">{action.description}</p>
        <small className="text-primary fw-semibold">
          Take Action →
        </small>
      </Card.Body>
    </Card>
  );

  return (
    <div className="election-dashboard">
      {/* Security Alert Banner */}
      {securityAlert && (
        <Alert variant="warning" className="d-flex align-items-center mb-4">
          <FaShieldHalved className="me-3 fs-4" />
          <div className="flex-grow-1">
            <strong>Security Notice</strong>
            <div className="small">It's been more than 24 hours since your last login. 
              Please verify your account activity.</div>
          </div>
          <Button 
            variant="outline-warning" 
            size="sm"
            onClick={() => setSecurityAlert(false)}
          >
            Dismiss
          </Button>
        </Alert>
      )}

      {/* Header Section */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1 fw-bold text-dark">
            Welcome back, {dashboardData?.voter_info?.full_name?.split(' ')[0] || 'Voter'}! 👋
            {isConnected && (
              <Badge bg="success" className="ms-2 align-middle">
                <BroadcastIcon className="me-1" />
                Live
              </Badge>
            )}
          </h4>
          <p className="text-muted mb-0">
            Dashboard • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="dashboard-btn d-flex align-items-center"
          >
            <FaSync className={`me-1 ${loading ? 'spinner' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <Row className="mb-4 g-3">
        <Col xl={3} lg={6}>
          <EnhancedStatCard
            title="Active Elections"
            value={activeElections.length || 0}
            icon={FaVoteYea}
            color="primary"
            subtitle="Open for voting"
            onClick={() => window.dispatchEvent(new CustomEvent('setActiveTab', { detail: 'elections' }))}
          />
        </Col>
        <Col xl={3} lg={6}>
          <EnhancedStatCard
            title="Your Votes"
            value={dashboardData?.quick_stats?.votes_cast || 0}
            icon={FaCheckCircle}
            color="success"
            subtitle="Total votes cast"
            onClick={() => window.dispatchEvent(new CustomEvent('setActiveTab', { detail: 'history' }))}
          />
        </Col>
        <Col xl={3} lg={6}>
          <EnhancedStatCard
            title="Participation"
            value={`${dashboardData?.quick_stats?.participation_rate || 0}%`}
            icon={FaPercentage}
            color="info"
            subtitle="Voting participation"
            onClick={() => window.dispatchEvent(new CustomEvent('setActiveTab', { detail: 'analytics' }))}
          />
        </Col>
        <Col xl={3} lg={6}>
          <EnhancedStatCard
            title="Security Score"
            value={`${dashboardData?.security_status?.security_score || 0}/100`}
            icon={FaShieldAlt}
            color={dashboardData?.security_status?.security_score >= 80 ? "success" : "warning"}
            subtitle="Account protection"
            onClick={() => window.dispatchEvent(new CustomEvent('setActiveTab', { detail: 'security' }))}
          />
        </Col>
      </Row>

      {/* Main Content Grid */}
      <Row className="g-4">
        {/* Left Column - Elections */}
        <Col lg={8}>
          {/* Active Elections Section */}
          <Card className="shadow-sm border-0 mb-4">
            <Card.Header className="bg-white border-0 d-flex justify-content-between align-items-center py-3">
              <h5 className="mb-0 d-flex align-items-center">
                <FaVoteYea className="me-2 text-primary" />
                Active Elections
                <Badge bg="primary" className="ms-2">
                  {activeElections.length || 0}
                </Badge>
              </h5>
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={() => window.dispatchEvent(new CustomEvent('setActiveTab', { detail: 'elections' }))}
                className="dashboard-btn"
              >
                View All
              </Button>
            </Card.Header>
            <Card.Body>
              {activeElections.length > 0 ? (
                <Row>
                  {activeElections.slice(0, 2).map(election => (
                    <Col lg={6} className="mb-3" key={election.election_id}>
                      <EnhancedElectionCard 
                        election={election} 
                        onStartVoting={onStartVoting}
                        onViewResults={onViewResults}
                        hasVoted={hasVoted[election.election_id]}
                      />
                    </Col>
                  ))}
                </Row>
              ) : (
                <div className="text-center py-5">
                  <FaVoteYea className="text-muted fs-1 mb-3 opacity-50" />
                  <h6 className="text-muted mb-2">No Active Elections</h6>
                  <p className="text-muted mb-4">Check back later for upcoming elections</p>
                  <Button 
                    variant="outline-primary"
                    onClick={() => window.dispatchEvent(new CustomEvent('setActiveTab', { detail: 'elections' }))}
                    className="dashboard-btn"
                  >
                    View Upcoming Elections
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Quick Actions */}
          {quickActions && quickActions.length > 0 && (
            <Card className="shadow-sm border-0 mb-4">
              <Card.Header className="bg-white border-0 py-3">
                <h5 className="mb-0 d-flex align-items-center">
                  <FaRocket className="me-2 text-success" />
                  Quick Actions
                </h5>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  {quickActions.slice(0, 4).map(action => (
                    <Col md={6} lg={3} key={action.id}>
                      <QuickActionCard action={action} />
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          )}

          {/* Voter Insights */}
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white border-0 py-3">
              <h5 className="mb-0 d-flex align-items-center">
                <FaLightbulb className="me-2 text-warning" />
                Your Voting Insights
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <div className="mb-4">
                    <h6 className="text-muted mb-3">Profile Completion</h6>
                    <div className="d-flex justify-content-between mb-1">
                      <small>Progress</small>
                      <small>{calculateProfileCompletion(dashboardData?.voter_info)}%</small>
                    </div>
                    <ProgressBar 
                      now={calculateProfileCompletion(dashboardData?.voter_info)}
                      variant="primary"
                      style={{ height: '8px' }}
                      className="rounded-pill"
                    />
                  </div>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span>Voting Streak</span>
                      <Badge bg="warning">
                        <FaFire className="me-1" />
                        {dashboardData?.quick_stats?.voting_streak || 0}
                      </Badge>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Constituency Rank</span>
                      <Badge bg="info">
                        #{dashboardData?.quick_stats?.constituency_rank || 'N/A'}
                      </Badge>
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <h6 className="text-muted mb-3">Verification Status</h6>
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {['email', 'phone', 'id', 'face'].map(type => (
                      <Card 
                        key={type}
                        className={`text-center p-2 ${dashboardData?.voter_info?.[`${type}_verified`] ? 'border-success' : 'border-secondary'}`}
                        style={{ width: '70px' }}
                      >
                        <div className={`fs-4 mb-1 ${dashboardData?.voter_info?.[`${type}_verified`] ? 'text-success' : 'text-secondary'}`}>
                          {type === 'email' && <FaEnvelope />}
                          {type === 'phone' && <FaPhone />}
                          {type === 'id' && <FaIdCard />}
                          {type === 'face' && <FaUserCheck />}
                        </div>
                        <small className="text-capitalize">{type}</small>
                      </Card>
                    ))}
                  </div>
                  <Button 
                    variant="outline-primary" 
                    size="sm" 
                    className="w-100"
                    onClick={() => window.dispatchEvent(new CustomEvent('setActiveTab', { detail: 'profile' }))}
                  >
                    <FaUserEdit className="me-2" />
                    Complete Profile
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        {/* Right Column - Sidebar */}
        <Col lg={4}>
          {/* Security Status */}
          {renderSecurityCard()}
          
          {/* Recent Results */}
          {renderLiveResultsCard()}
          
          {/* System Status */}
          <Card className="shadow-sm border-0 mt-4">
            <Card.Header className="bg-white border-0 py-3">
              <h6 className="mb-0 d-flex align-items-center">
                <FaServer className="me-2 text-info" />
                System Status
              </h6>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted">Real-time Updates</span>
                  <Badge bg={isConnected ? "success" : "warning"}>
                    {isConnected ? 'Connected' : 'Connecting...'}
                  </Badge>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted">Active Users</span>
                  <span className="fw-semibold">{liveStats?.connected_users || 0}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted">Uptime</span>
                  <Badge bg="success">99.9%</Badge>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted">Last Update</span>
                  <small className="text-muted">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </small>
                </div>
              </div>
              <Button 
                variant="outline-info" 
                size="sm" 
                className="w-100"
                onClick={() => window.location.reload()}
              >
                <FaSync className="me-2" />
                Refresh System
              </Button>
            </Card.Body>
          </Card>

          {/* Quick Tips */}
          <Card className="shadow-sm border-0 mt-4">
            <Card.Header className="bg-white border-0 py-3">
              <h6 className="mb-0 d-flex align-items-center">
                <FaCircleInfo className="me-2 text-success" />
                Quick Tips
              </h6>
            </Card.Header>
            <Card.Body className="p-0">
              <ListGroup variant="flush">
                <ListGroup.Item className="border-0 py-3">
                  <div className="d-flex">
                    <div className="bg-success bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3"
                         style={{ width: '30px', height: '30px' }}>
                      <FaCheckCircle className="text-success" />
                    </div>
                    <div>
                      <strong>Verify Your Account</strong>
                      <p className="small text-muted mb-0 mt-1">
                        Complete all verifications for full voting access
                      </p>
                    </div>
                  </div>
                </ListGroup.Item>
                <ListGroup.Item className="border-0 py-3">
                  <div className="d-flex">
                    <div className="bg-warning bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3"
                         style={{ width: '30px', height: '30px' }}>
                      <FaBell className="text-warning" />
                    </div>
                    <div>
                      <strong>Enable Notifications</strong>
                      <p className="small text-muted mb-0 mt-1">
                        Get alerts for election updates and results
                      </p>
                    </div>
                  </div>
                </ListGroup.Item>
                <ListGroup.Item className="border-0 py-3">
                  <div className="d-flex">
                    <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3"
                         style={{ width: '30px', height: '30px' }}>
                      <FaVoteYea className="text-primary" />
                    </div>
                    <div>
                      <strong>Vote Early</strong>
                      <p className="small text-muted mb-0 mt-1">
                        Cast your vote early to avoid last-minute congestion
                      </p>
                    </div>
                  </div>
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

// Enhanced Election Card Component
const EnhancedElectionCard = ({ 
  election, 
  onStartVoting, 
  compact = false, 
  filter = 'active', 
  hasVoted = false,
  onViewResults
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

  const voted = hasVoted !== undefined ? hasVoted : election.has_voted;
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

// Enhanced Elections Component
const EnhancedElections = ({ 
  dashboardData, 
  voterId, 
  isConnected, 
  BroadcastIcon, 
  onStartVoting, 
  onViewResults,
  hasVoted,
  completedElections
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

      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading {filter} elections...</p>
        </div>
      )}

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
                  onViewResults={onViewResults}
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
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (profileData) {
      setFormData({
        full_name: profileData.full_name || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        date_of_birth: profileData.date_of_birth || '',
        address_line1: profileData.address?.address_line1 || '',
        village_city: profileData.address?.village_city || '',
        state: profileData.address?.state || '',
        pincode: profileData.address?.pincode || ''
      });
    }
  }, [profileData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // API call to update profile
      const response = await voterAPI.updateProfile(formData);
      if (response.success) {
        setSuccess('Profile updated successfully');
        setEditMode(false);
        // Refresh profile data
        window.location.reload();
      } else {
        setError(response.message || 'Failed to update profile');
      }
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const ProfileField = ({ label, value, editName, type = 'text', required = false }) => (
    <div className="mb-3">
      <small className="text-muted d-block mb-1">{label}</small>
      {editMode ? (
        <Form.Control
          type={type}
          name={editName}
          value={formData[editName] || ''}
          onChange={handleInputChange}
          required={required}
          className="dashboard-input"
        />
      ) : (
        <div className="fw-semibold p-2 bg-light rounded">
          {value || 'Not provided'}
        </div>
      )}
    </div>
  );

  const VerifiedField = ({ label, value, verified, icon: Icon, onVerify }) => (
    <div className="mb-3">
      <small className="text-muted d-block mb-1">{label}</small>
      <div className="d-flex align-items-center justify-content-between p-2 bg-light rounded">
        <div className="d-flex align-items-center">
          <Icon className="text-primary me-2" />
          <span className="fw-semibold">{value}</span>
          {verified ? (
            <Badge bg="success" className="ms-2">
              <FaCheckCircle className="me-1" /> Verified
            </Badge>
          ) : (
            <Badge bg="warning" className="ms-2">
              <FaTimesCircle className="me-1" /> Pending
            </Badge>
          )}
        </div>
        {!verified && onVerify && (
          <Button variant="outline-primary" size="sm" onClick={onVerify}>
            Verify
          </Button>
        )}
      </div>
    </div>
  );

  const calculateProfileCompletion = (profile) => {
    if (!profile) return 0;
    const requiredFields = [
      'full_name', 'email', 'phone', 'date_of_birth',
      'address_line1', 'village_city', 'state', 'pincode'
    ];
    const completed = requiredFields.filter(field => {
      if (field.includes('address.')) {
        const fieldName = field.split('.')[1];
        return profile.address?.[fieldName];
      }
      return profile[field];
    }).length;
    return Math.round((completed / requiredFields.length) * 100);
  };

  return (
    <Card className="shadow-sm border-0">
      <Card.Header className="bg-white border-0">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0 d-flex align-items-center">
              <FaUser className="me-2 text-primary" />
              My Profile
            </h5>
            <small className="text-muted">
              Profile completion: {calculateProfileCompletion(profileData)}%
            </small>
          </div>
          <div className="d-flex gap-2">
            {editMode ? (
              <>
                <Button variant="outline-secondary" size="sm" onClick={() => setEditMode(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button variant="outline-primary" size="sm" onClick={() => setEditMode(true)}>
                <FaEdit className="me-1" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </Card.Header>
      <Card.Body>
        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess('')}>
            <FaCheckCircle className="me-2" />
            {success}
          </Alert>
        )}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            <FaExclamationTriangle className="me-2" />
            {error}
          </Alert>
        )}

        {/* Profile Header */}
        <div className="text-center mb-4 py-4 bg-gradient-primary text-white rounded">
          <div className="bg-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
               style={{ width: '80px', height: '80px' }}>
            <FaUser className="text-primary fs-3" />
          </div>
          <h4>{profileData?.full_name || 'User'}</h4>
          <p className="mb-2">Voter ID: {profileData?.voter_id || 'N/A'}</p>
          <div className="d-flex justify-content-center gap-2">
            <Badge bg="light" text="dark">
              {profileData?.constituency || 'General Constituency'}
            </Badge>
            <Badge bg={profileData?.verification_status?.overall ? "success" : "warning"}>
              {profileData?.verification_status?.overall ? "Verified" : "Verification Pending"}
            </Badge>
          </div>
        </div>

        <Row>
          {/* Personal Information */}
          <Col lg={6}>
            <Card className="border-0 bg-light mb-4">
              <Card.Header className="bg-transparent border-0">
                <h6 className="mb-0 d-flex align-items-center">
                  <FaUser className="me-2" />
                  Personal Information
                </h6>
              </Card.Header>
              <Card.Body>
                <ProfileField 
                  label="Full Name" 
                  value={profileData?.full_name} 
                  editName="full_name"
                  required
                />
                <ProfileField 
                  label="Date of Birth" 
                  value={profileData?.date_of_birth} 
                  editName="date_of_birth"
                  type="date"
                />
                <ProfileField 
                  label="Gender" 
                  value={profileData?.gender} 
                  editName="gender"
                />
                <ProfileField 
                  label="Father's Name" 
                  value={profileData?.father_name} 
                  editName="father_name"
                />
                <ProfileField 
                  label="Mother's Name" 
                  value={profileData?.mother_name} 
                  editName="mother_name"
                />
              </Card.Body>
            </Card>
          </Col>
          
          {/* Contact & Verification */}
          <Col lg={6}>
            <Card className="border-0 bg-light mb-4">
              <Card.Header className="bg-transparent border-0">
                <h6 className="mb-0 d-flex align-items-center">
                  <FaEnvelope className="me-2" />
                  Contact & Verification
                </h6>
              </Card.Header>
              <Card.Body>
                <VerifiedField 
                  label="Email Address" 
                  value={profileData?.email}
                  verified={profileData?.verification_status?.email}
                  icon={FaEnvelope}
                  onVerify={() => {/* Handle email verification */}}
                />
                <VerifiedField 
                  label="Phone Number" 
                  value={profileData?.phone}
                  verified={profileData?.verification_status?.phone}
                  icon={FaPhone}
                  onVerify={() => {/* Handle phone verification */}}
                />
                <VerifiedField 
                  label="National ID" 
                  value={`${profileData?.national_id?.number || 'N/A'} (${profileData?.national_id?.type || 'ID'})`}
                  verified={profileData?.verification_status?.id}
                  icon={FaIdCard}
                  onVerify={() => {/* Handle ID verification */}}
                />
                <VerifiedField 
                  label="Face Verification" 
                  value={profileData?.verification_status?.face ? "Completed" : "Pending"}
                  verified={profileData?.verification_status?.face}
                  icon={FaUserCheck}
                  onVerify={() => {/* Handle face verification */}}
                />
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Address Information */}
        <Card className="border-0 bg-light">
          <Card.Header className="bg-transparent border-0">
            <h6 className="mb-0 d-flex align-items-center">
              <FaMapMarkerAlt className="me-2" />
              Address Information
            </h6>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <ProfileField 
                  label="Address Line 1" 
                  value={profileData?.address?.address_line1} 
                  editName="address_line1"
                  required
                />
                <ProfileField 
                  label="Address Line 2" 
                  value={profileData?.address?.address_line2} 
                  editName="address_line2"
                />
              </Col>
              <Col md={6}>
                <ProfileField 
                  label="City/Village" 
                  value={profileData?.address?.village_city} 
                  editName="village_city"
                  required
                />
                <ProfileField 
                  label="District" 
                  value={profileData?.address?.district} 
                  editName="district"
                />
                <Row>
                  <Col md={6}>
                    <ProfileField 
                      label="State" 
                      value={profileData?.address?.state} 
                      editName="state"
                      required
                    />
                  </Col>
                  <Col md={6}>
                    <ProfileField 
                      label="Pincode" 
                      value={profileData?.address?.pincode} 
                      editName="pincode"
                      required
                    />
                  </Col>
                </Row>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Account Information */}
        <Card className="border-0 bg-light mt-4">
          <Card.Header className="bg-transparent border-0">
            <h6 className="mb-0 d-flex align-items-center">
              <FaInfoCircle className="me-2" />
              Account Information
            </h6>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <ProfileField 
                  label="Registration Date" 
                  value={profileData?.registration_date ? new Date(profileData.registration_date).toLocaleDateString() : 'N/A'}
                />
                <ProfileField 
                  label="Last Updated" 
                  value={profileData?.last_updated ? new Date(profileData.last_updated).toLocaleDateString() : 'N/A'}
                />
              </Col>
              <Col md={6}>
                <ProfileField 
                  label="Constituency" 
                  value={profileData?.constituency || 'General Constituency'}
                />
                <ProfileField 
                  label="Polling Station" 
                  value={profileData?.polling_station || 'Main Polling Station'}
                />
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Card.Body>
      {!editMode && (
        <Card.Footer className="bg-white border-0">
          <div className="d-flex justify-content-between">
            <small className="text-muted">
              Last login: {profileData?.last_login ? new Date(profileData.last_login).toLocaleString() : 'N/A'}
            </small>
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={() => window.dispatchEvent(new CustomEvent('setActiveTab', { detail: 'security' }))}
            >
              <FaShieldAlt className="me-1" />
              Security Settings
            </Button>
          </div>
        </Card.Footer>
      )}
    </Card>
  );
};

// Enhanced Voting History Component
const EnhancedVotingHistory = ({ voterId, enhancedVotingHistory, onLoadEnhanced }) => {
  const [loading, setLoading] = useState(!enhancedVotingHistory);

  useEffect(() => {
    if (!enhancedVotingHistory) {
      onLoadEnhanced();
    }
  }, [enhancedVotingHistory, onLoadEnhanced]);

  if (loading && !enhancedVotingHistory) {
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
          <p className="mt-2">Loading enhanced voting history...</p>
        </Card.Body>
      </Card>
    );
  }

  if (!enhancedVotingHistory) {
    return (
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white border-0">
          <h5 className="mb-0 d-flex align-items-center">
            <FaHistory className="me-2 text-primary" />
            Voting History
          </h5>
        </Card.Header>
        <Card.Body className="text-center py-5">
          <FaHistory className="text-muted fs-1 mb-3" />
          <h5 className="text-muted">No Voting History Available</h5>
          <p className="text-muted">Unable to load voting history data.</p>
        </Card.Body>
      </Card>
    );
  }

  const { votes, statistics, achievements, timeline } = enhancedVotingHistory;

  return (
    <div>
      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-0 bg-primary text-white">
            <Card.Body className="text-center">
              <h4>{statistics.total_votes}</h4>
              <p className="mb-0">Total Votes</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 bg-success text-white">
            <Card.Body className="text-center">
              <h4>{statistics.participation_rate}%</h4>
              <p className="mb-0">Participation Rate</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 bg-warning text-white">
            <Card.Body className="text-center">
              <h4>{statistics.voting_streak}</h4>
              <p className="mb-0">Voting Streak</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 bg-info text-white">
            <Card.Body className="text-center">
              <h4>#{statistics.constituency_ranking?.rank || 'N/A'}</h4>
              <p className="mb-0">Constituency Rank</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Achievements */}
      {achievements && achievements.length > 0 && (
        <Card className="shadow-sm border-0 mb-4">
          <Card.Header className="bg-white border-0">
            <h5 className="mb-0">Achievements</h5>
          </Card.Header>
          <Card.Body>
            <Row>
              {achievements.map((achievement, index) => (
                <Col md={6} lg={4} key={index} className="mb-3">
                  <Card className={`border-2 ${achievement.unlocked ? 'border-success' : 'border-secondary'}`}>
                    <Card.Body className="text-center">
                      <FaAward className={`fs-1 ${achievement.unlocked ? 'text-warning' : 'text-muted'}`} />
                      <h6 className="mt-2">{achievement.name}</h6>
                      <p className="small text-muted mb-0">{achievement.description}</p>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Election Type Breakdown */}
      {statistics.election_type_breakdown && (
        <Card className="shadow-sm border-0 mb-4">
          <Card.Header className="bg-white border-0">
            <h5 className="mb-0">Election Type Breakdown</h5>
          </Card.Header>
          <Card.Body>
            <Row>
              {Object.entries(statistics.election_type_breakdown).map(([type, count]) => (
                <Col md={6} key={type} className="mb-2">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-capitalize">{type}</span>
                    <Badge bg="primary">{count} votes</Badge>
                  </div>
                  <ProgressBar 
                    now={(count / statistics.total_votes) * 100} 
                    className="mt-1"
                    variant={type === 'general' ? 'success' : type === 'state' ? 'warning' : 'info'}
                  />
                </Col>
              ))}
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Detailed Voting History */}
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white border-0">
          <h5 className="mb-0">Vote Details</h5>
        </Card.Header>
        <Card.Body>
          {votes && votes.length > 0 ? (
            <ListGroup variant="flush">
              {votes.map((vote, index) => (
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
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

// Enhanced Analytics Component
const EnhancedSecurity = ({ voterId, enhancedSecurity, onLoadEnhanced }) => {
  const [loading, setLoading] = useState(!enhancedSecurity);
  const [securityData, setSecurityData] = useState(null);
  const [showManageDevices, setShowManageDevices] = useState(false);
  const [devices, setDevices] = useState([]);
  const [revokingDevice, setRevokingDevice] = useState(null);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  useEffect(() => {
    if (!enhancedSecurity) {
      onLoadEnhanced();
    } else {
      setSecurityData(enhancedSecurity);
      setLoading(false);
      // Load devices data
      loadDevices();
    }
  }, [enhancedSecurity, onLoadEnhanced]);

  const loadDevices = async () => {
    try {
      const response = await voterAPI.getTrustedDevices();
      if (response.success) {
        setDevices(response.devices || []);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  };

  const handleRevokeDevice = async (deviceId) => {
    setRevokingDevice(deviceId);
    try {
      const response = await voterAPI.revokeDevice(deviceId);
      if (response.success) {
        // Remove device from list
        setDevices(prev => prev.filter(device => device.device_id !== deviceId));
        // Show success message
        alert('Device access revoked successfully');
      } else {
        alert('Failed to revoke device access');
      }
    } catch (error) {
      console.error('Failed to revoke device:', error);
      alert('Failed to revoke device access');
    } finally {
      setRevokingDevice(null);
    }
  };

  const handleLogoutAllSessions = async () => {
    if (!window.confirm('Are you sure you want to log out all active sessions? You will need to log in again on all devices.')) {
      return;
    }

    setLoggingOutAll(true);
    try {
      const response = await voterAPI.logoutAllSessions();
      if (response.success) {
        alert('All sessions have been logged out successfully');
        // Refresh security data
        onLoadEnhanced();
        // Reload devices
        loadDevices();
      } else {
        alert('Failed to log out all sessions');
      }
    } catch (error) {
      console.error('Failed to logout all sessions:', error);
      alert('Failed to log out all sessions');
    } finally {
      setLoggingOutAll(false);
    }
  };

  const handleEnable2FA = async () => {
    try {
      const response = await voterAPI.enableTwoFactorAuth();
      if (response.success) {
        if (response.requires_setup) {
          // Show 2FA setup modal with QR code
          alert('2FA setup required. Please scan the QR code.');
          // In real app, show modal with QR code
        } else {
          alert('Two-factor authentication enabled successfully');
          // Refresh security data
          onLoadEnhanced();
        }
      } else {
        alert('Failed to enable 2FA');
      }
    } catch (error) {
      console.error('Failed to enable 2FA:', error);
      alert('Failed to enable 2FA');
    }
  };

  const handleDisable2FA = async () => {
    if (!window.confirm('Are you sure you want to disable two-factor authentication? This reduces your account security.')) {
      return;
    }

    try {
      const response = await voterAPI.disableTwoFactorAuth();
      if (response.success) {
        alert('Two-factor authentication disabled');
        // Refresh security data
        onLoadEnhanced();
      } else {
        alert('Failed to disable 2FA');
      }
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      alert('Failed to disable 2FA');
    }
  };

  const renderSecurityScore = (score) => {
    let color = 'danger';
    let label = 'Weak';
    
    if (score >= 80) {
      color = 'success';
      label = 'Excellent';
    } else if (score >= 60) {
      color = 'warning';
      label = 'Good';
    } else if (score >= 40) {
      color = 'info';
      label = 'Fair';
    }
    
    return (
      <div className="text-center">
        <div className="position-relative d-inline-block mb-3">
          <div className="circular-progress" style={{ width: '120px', height: '120px' }}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle 
                cx="60" 
                cy="60" 
                r="54" 
                fill="none" 
                stroke="#e9ecef" 
                strokeWidth="8"
              />
              <circle 
                cx="60" 
                cy="60" 
                r="54" 
                fill="none" 
                stroke={`var(--bs-${color})`} 
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${score * 3.39} 340`}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="position-absolute top-50 start-50 translate-middle">
              <h2 className="mb-0 fw-bold">{score}</h2>
              <small className="text-muted">/100</small>
            </div>
          </div>
        </div>
        <Badge bg={color} className="fs-6 px-3 py-2">
          {label} Security
        </Badge>
      </div>
    );
  };

  const renderDeviceCard = (device, index) => (
    <Card key={index} className="border-0 shadow-sm mb-2">
      <Card.Body className="py-2">
        <div className="d-flex align-items-center">
          <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3"
               style={{ width: '40px', height: '40px' }}>
            <FaDesktop className="text-primary" />
          </div>
          <div className="flex-grow-1">
            <h6 className="mb-0">{device.device_name}</h6>
            <small className="text-muted d-block">
              {device.browser} • {device.os}
            </small>
            <small className="text-muted">
              Last used: {device.last_used ? new Date(device.last_used).toLocaleDateString() : 'Unknown'}
            </small>
          </div>
          <div className="d-flex gap-1">
            <Badge bg={device.is_trusted ? "success" : "warning"}>
              {device.is_trusted ? 'Trusted' : 'New'}
            </Badge>
            {showManageDevices && (
              <Button 
                variant="outline-danger" 
                size="sm"
                onClick={() => handleRevokeDevice(device.device_id)}
                disabled={revokingDevice === device.device_id}
              >
                {revokingDevice === device.device_id ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  'Revoke'
                )}
              </Button>
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );

  const renderSessionCard = (session, index) => (
    <Card key={index} className="border-0 shadow-sm mb-2">
      <Card.Body className="py-2">
        <div className="d-flex align-items-center">
          <div className="bg-info bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3"
               style={{ width: '40px', height: '40px' }}>
            <FaGlobe className="text-info" />
          </div>
          <div className="flex-grow-1">
            <h6 className="mb-0">{session.ip_address}</h6>
            <small className="text-muted d-block">
              {session.device} • {session.location || 'Unknown location'}
            </small>
            <small className="text-muted">
              Active since: {session.started_at ? new Date(session.started_at).toLocaleTimeString() : 'Unknown'}
            </small>
          </div>
          <Badge bg="success">
            Active
          </Badge>
        </div>
      </Card.Body>
    </Card>
  );

  if (loading && !securityData) {
    return (
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white border-0">
          <h5 className="mb-0 d-flex align-items-center">
            <FaShieldAlt className="me-2 text-primary" />
            Security Center
          </h5>
        </Card.Header>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading security information...</p>
        </Card.Body>
      </Card>
    );
  }

  if (!securityData) {
    return (
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white border-0">
          <h5 className="mb-0 d-flex align-items-center">
            <FaShieldAlt className="me-2 text-primary" />
            Security Center
          </h5>
        </Card.Header>
        <Card.Body className="text-center py-5">
          <FaShieldAlt className="text-muted fs-1 mb-3" />
          <h5 className="text-muted">Security Information Unavailable</h5>
          <p className="text-muted">Unable to load security data at this time.</p>
          <Button variant="primary" onClick={onLoadEnhanced}>
            <FaSync className="me-2" />
            Try Again
          </Button>
        </Card.Body>
      </Card>
    );
  }

  const { account_security, session_security, device_security, privacy_settings } = securityData;

  return (
    <div className="security-dashboard">
      {/* Manage Devices Modal */}
      <Modal show={showManageDevices} onHide={() => setShowManageDevices(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaDesktop className="me-2" />
            Manage Trusted Devices
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted mb-4">
            Manage devices that are authorized to access your account. Revoke access for any device you don't recognize.
          </p>
          
          {devices.length > 0 ? (
            <div>
              {devices.map((device, index) => renderDeviceCard(device, index))}
            </div>
          ) : (
            <div className="text-center py-4">
              <FaDesktop className="text-muted fs-1 mb-3 opacity-50" />
              <p className="text-muted mb-0">No trusted devices found</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowManageDevices(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1 fw-bold">
            <FaShieldAlt className="me-2 text-primary" />
            Security Center
          </h4>
          <p className="text-muted mb-0">
            Monitor and manage your account security
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={handleLogoutAllSessions}
            disabled={loggingOutAll}
          >
            {loggingOutAll ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Logging Out...
              </>
            ) : (
              <>
                <FaSignOutAlt className="me-1" />
                Logout All Sessions
              </>
            )}
          </Button>
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={() => setShowManageDevices(true)}
          >
            <FaDesktop className="me-1" />
            Manage Devices
          </Button>
        </div>
      </div>

      {/* Security Overview */}
      <Card className="shadow-sm border-0 mb-4">
        <Card.Header className="bg-white border-0 py-3">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Security Overview</h5>
            <Badge bg={
              account_security?.security_score >= 80 ? 'success' :
              account_security?.security_score >= 60 ? 'warning' : 'danger'
            }>
              Score: {account_security?.security_score || 0}/100
            </Badge>
          </div>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col lg={4} className="mb-4 mb-lg-0">
              {renderSecurityScore(account_security?.security_score || 0)}
            </Col>
            <Col lg={8}>
              <Row>
                <Col md={6} className="mb-3">
                  <Card className="border-0 bg-light h-100">
                    <Card.Body>
                      <div className="d-flex align-items-center">
                        <FaClockRotateLeft className="text-info fs-4 me-3" />
                        <div>
                          <h6 className="mb-1">Account Age</h6>
                          <p className="mb-0 fw-bold">
                            {account_security?.account_age || 0} days
                          </p>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6} className="mb-3">
                  <Card className="border-0 bg-light h-100">
                    <Card.Body>
                      <div className="d-flex align-items-center">
                        <FaLock className="text-success fs-4 me-3" />
                        <div>
                          <h6 className="mb-1">2FA Status</h6>
                          <p className="mb-0">
                            <Badge bg={account_security?.two_factor_enabled ? "success" : "secondary"}>
                              {account_security?.two_factor_enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                            <div className="mt-2">
                              {account_security?.two_factor_enabled ? (
                                <Button 
                                  variant="outline-danger" 
                                  size="sm"
                                  onClick={handleDisable2FA}
                                >
                                  Disable 2FA
                                </Button>
                              ) : (
                                <Button 
                                  variant="outline-success" 
                                  size="sm"
                                  onClick={handleEnable2FA}
                                >
                                  Enable 2FA
                                </Button>
                              )}
                            </div>
                          </p>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6} className="mb-3">
                  <Card className="border-0 bg-light h-100">
                    <Card.Body>
                      <div className="d-flex align-items-center">
                        <FaShieldHalved className="text-warning fs-4 me-3" />
                        <div>
                          <h6 className="mb-1">Password Strength</h6>
                          <p className="mb-0">
                            <Badge bg={
                              account_security?.password_strength === 'Strong' ? 'success' :
                              account_security?.password_strength === 'Medium' ? 'warning' : 'danger'
                            }>
                              {account_security?.password_strength || 'Unknown'}
                            </Badge>
                          </p>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6} className="mb-3">
                  <Card className="border-0 bg-light h-100">
                    <Card.Body>
                      <div className="d-flex align-items-center">
                        <FaUserCheck className="text-primary fs-4 me-3" />
                        <div>
                          <h6 className="mb-1">Last Password Change</h6>
                          <p className="mb-0 fw-bold">
                            {account_security?.last_password_change ? 
                              new Date(account_security.last_password_change).toLocaleDateString() : 
                              'Never'}
                          </p>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Row className="g-4">
        {/* Left Column */}
        <Col lg={8}>
          {/* Verification Status */}
          <Card className="shadow-sm border-0 mb-4">
            <Card.Header className="bg-white border-0 py-3">
              <h5 className="mb-0">Verification Status</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                {['email', 'phone', 'id', 'face'].map((type) => {
                  const icons = {
                    email: FaEnvelope,
                    phone: FaPhone,
                    id: FaIdCard,
                    face: FaUserCheck
                  };
                  const Icon = icons[type];
                  const verified = account_security?.verification_status?.[type];
                  const labels = {
                    email: 'Email',
                    phone: 'Phone',
                    id: 'ID',
                    face: 'Face'
                  };
                  
                  return (
                    <Col md={6} key={type} className="mb-3">
                      <Card className={`border-2 ${verified ? 'border-success' : 'border-warning'} h-100`}>
                        <Card.Body className="text-center py-3">
                          <Icon className={`fs-2 mb-2 ${verified ? 'text-success' : 'text-warning'}`} />
                          <h6 className="mb-1">{labels[type]} Verification</h6>
                          <Badge bg={verified ? "success" : "warning"}>
                            {verified ? 'Verified' : 'Pending'}
                          </Badge>
                          {!verified && (
                            <Button 
                              variant="outline-primary" 
                              size="sm" 
                              className="mt-2"
                              onClick={() => {/* Handle verification */}}
                            >
                              Verify Now
                            </Button>
                          )}
                        </Card.Body>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </Card.Body>
          </Card>

          {/* Active Sessions */}
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white border-0 py-3 d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Active Sessions</h5>
              <Badge bg="success">
                {session_security?.active_sessions?.length || 0} active
              </Badge>
            </Card.Header>
            <Card.Body>
              {session_security?.active_sessions?.length > 0 ? (
                session_security.active_sessions.map((session, index) => 
                  renderSessionCard(session, index)
                )
              ) : (
                <div className="text-center py-4">
                  <FaGlobe className="text-muted fs-1 mb-3 opacity-50" />
                  <h6 className="text-muted">No Active Sessions</h6>
                  <p className="text-muted">Your account is not currently logged in anywhere</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Right Column */}
        <Col lg={4}>
          {/* Trusted Devices */}
          <Card className="shadow-sm border-0 mb-4">
            <Card.Header className="bg-white border-0 py-3">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Trusted Devices</h6>
                <Badge bg="primary">
                  {devices.length} devices
                </Badge>
              </div>
            </Card.Header>
            <Card.Body>
              {devices.length > 0 ? (
                devices.slice(0, 3).map((device, index) => 
                  renderDeviceCard(device, index)
                )
              ) : (
                <div className="text-center py-3">
                  <FaDesktop className="text-muted fs-1 mb-3 opacity-50" />
                  <p className="text-muted mb-0">No trusted devices yet</p>
                </div>
              )}
              <div className="mt-3">
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  className="w-100"
                  onClick={() => setShowManageDevices(true)}
                >
                  <FaWrench className="me-1" />
                  Manage All Devices
                </Button>
              </div>
            </Card.Body>
          </Card>

          {/* Security Actions */}
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white border-0 py-3">
              <h6 className="mb-0">Security Actions</h6>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button 
                  variant="outline-primary"
                  onClick={() => {/* Change password */}}
                >
                  <FaKey className="me-2" />
                  Change Password
                </Button>
                <Button 
                  variant="outline-success"
                  onClick={handleEnable2FA}
                  disabled={account_security?.two_factor_enabled}
                >
                  <FaLock className="me-2" />
                  {account_security?.two_factor_enabled ? '2FA Enabled' : 'Enable 2FA'}
                </Button>
                <Button 
                  variant="outline-danger"
                  onClick={handleLogoutAllSessions}
                  disabled={loggingOutAll}
                >
                  {loggingOutAll ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Logging Out...
                    </>
                  ) : (
                    <>
                      <FaSignOutAlt className="me-2" />
                      Logout All Sessions
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline-warning"
                  onClick={() => {/* View activity logs */}}
                >
                  <FaHistory className="me-2" />
                  View Activity Logs
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

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