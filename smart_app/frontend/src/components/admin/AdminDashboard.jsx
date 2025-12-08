import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Nav, 
  Button, 
  Table, 
  Badge,
  Modal,
  Form,
  Alert,
  Spinner,
  Pagination,
  Image,
  ProgressBar  // Added missing import
} from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminAPI } from '../../services/api';
import {
  FaTachometerAlt,
  FaUsers,
  FaVoteYea,
  FaUserCheck,
  FaChartBar,
  FaClipboardList,
  FaCog,
  FaSignOutAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaCheckCircle,
  FaTimesCircle,
  FaSync,
  FaSearch,
  FaFilter,
  FaUpload,
  FaImage,
  FaLandmark,
  FaUserTie,
  FaBullhorn,
  FaSave, 
  FaHeartbeat,
  FaFileExport,
  FaInfoCircle,
  FaClock
} from 'react-icons/fa';

const AdminDashboard = () => {
  const { admin, adminLogout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [elections, setElections] = useState([]);
  const [voters, setVoters] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [showElectionModal, setShowElectionModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [showElectionDetailModal, setShowElectionDetailModal] = useState(false);
  const [showEditElectionModal, setShowEditElectionModal] = useState(false);
  const [showEditCandidateModal, setShowEditCandidateModal] = useState(false);
  const [showVoterDetailModal, setShowVoterDetailModal] = useState(false);
  const [showCandidateDetailModal, setShowCandidateDetailModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Form states
  const [electionForm, setElectionForm] = useState({
    title: '',
    description: '',
    election_type: 'national',
    constituency: '',
    district: '',
    state: '',
    voting_start: '',
    voting_end: '',
    registration_start: '',
    registration_end: '',
    max_candidates: 10,
    require_face_verification: true,
    election_logo: null,
    election_banner: null,
    election_rules: '',
    results_visibility: 'after_end',
    minimum_voter_age: 18,
    allowed_voter_groups: ['all'],
    is_featured: false
  });
  
  const [candidateForm, setCandidateForm] = useState({
    election_id: '',
    full_name: '',
    party: '',
    party_logo: null,
    biography: '',
    email: '',
    phone: '',
    photo: null,
    candidate_id: '',
    agenda: '',
    qualifications: '',
    assets_declaration: '',
    criminal_records: 'none',
    election_symbol: null,
    symbol_name: '',
    is_approved: false
  });

  const [selectedElection, setSelectedElection] = useState(null);
  const [selectedVoter, setSelectedVoter] = useState(null);
  const [editingElection, setEditingElection] = useState(null);
  const [editingCandidate, setEditingCandidate] = useState(null);

  // Settings state
  const [settings, setSettings] = useState({
    system_name: 'Smart Voting System',
    voter_registration_open: true,
    require_face_verification: true,
    results_visibility: 'after_end',
    email_notifications: true,
    sms_notifications: true,
    maintenance_mode: false,
    max_file_size: 16,
    auto_verify_voters: false
  });

  const [broadcastMessage, setBroadcastMessage] = useState('');

  // Pagination states
  const [pagination, setPagination] = useState({
    voters: { page: 1, per_page: 10, total: 0 },
    elections: { page: 1, per_page: 10, total: 0 },
    audit: { page: 1, per_page: 10, total: 0 },
    candidates: { page: 1, per_page: 10, total: 0 }
  });

  // ===== NEW: Reports State (Moved outside renderReports) =====
  const [reports, setReports] = useState({
    dashboard: null,
    voterAnalytics: null,
    systemHealth: null,
    selectedElection: null
  });
  const [reportLoading, setReportLoading] = useState({
    dashboard: false,
    voter: false,
    system: false,
    export: false
  });
  const [activeReport, setActiveReport] = useState('dashboard');
  const [exportFormat, setExportFormat] = useState('json');

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'elections') {
      loadElections();
    } else if (activeTab === 'voters') {
      loadVoters();
    } else if (activeTab === 'audit') {
      loadAuditLogs();
    } else if (activeTab === 'candidates') {
      loadCandidates();
    } else if (activeTab === 'settings') {
      loadSettings();
    }
  }, [activeTab]);

  // ===== NEW: Reports useEffect =====
  useEffect(() => {
    if (activeTab === 'reports') {
      if (activeReport === 'dashboard') {
        loadDashboardReports();
      } else if (activeReport === 'voter') {
        loadVoterAnalytics();
      } else if (activeReport === 'system') {
        loadSystemHealth();
      }
    }
  }, [activeTab, activeReport]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      // Load system stats
      const statsResponse = await adminAPI.getSystemStats();
      if (statsResponse.success) {
        setStats(statsResponse.stats);
      }

      // Load recent elections
      const electionsResponse = await adminAPI.getElections({ per_page: 5 });
      if (electionsResponse.success) {
        setElections(electionsResponse.elections);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadElections = async (page = 1) => {
    setLoading(true);
    try {
      const response = await adminAPI.getElections({ page, per_page: pagination.elections.per_page });
      if (response.success) {
        setElections(response.elections);
        setPagination(prev => ({
          ...prev,
          elections: {
            ...response.pagination,
            page: response.pagination.page || page
          }
        }));
      }
    } catch (error) {
      console.error('Error loading elections:', error);
      setError('Failed to load elections');
    } finally {
      setLoading(false);
    }
  };

  const loadVoters = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      console.log(`📋 Loading voters - Page: ${page}, Per Page: ${pagination.voters.per_page}`);
      
      const response = await adminAPI.getVoters({ 
        page, 
        per_page: pagination.voters.per_page 
      });
      
      console.log('📊 Voters response:', response);
      
      if (response.success) {
        setVoters(response.voters || []);
        setPagination(prev => ({
          ...prev,
          voters: {
            page: response.pagination?.page || page,
            per_page: response.pagination?.per_page || pagination.voters.per_page,
            total: response.pagination?.total || 0,
            total_pages: response.pagination?.total_pages || 1
          }
        }));
        setSuccess(`Loaded ${response.voters?.length || 0} voters`);
      } else {
        setError(response.message || 'Failed to load voters');
        setVoters([]);
      }
    } catch (error) {
      console.error('❌ Error loading voters:', error);
      setError('Failed to load voters. Please check your connection and try again.');
      setVoters([]);
    } finally {
      setLoading(false);
    }
  };

  // Add this function for development dummy data
  const getDummyVoterData = () => {
    const dummyVoters = [];
    const names = ['John Doe', 'Jane Smith', 'Robert Johnson', 'Emily Davis', 'Michael Brown'];
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
    
    for (let i = 1; i <= 10; i++) {
      const name = names[Math.floor(Math.random() * names.length)];
      const domain = domains[Math.floor(Math.random() * domains.length)];
      const email = `${name.toLowerCase().replace(' ', '.')}@${domain}`;
      const phone = `+1-555-${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      dummyVoters.push({
        voter_id: `VOTER${String(i).padStart(6, '0')}`,
        full_name: name,
        email: email,
        phone: phone,
        gender: i % 2 === 0 ? 'Male' : 'Female',
        age: 20 + Math.floor(Math.random() * 40),
        created_at: new Date(Date.now() - Math.random() * 31536000000).toISOString(),
        is_active: Math.random() > 0.2,
        verification_status: {
          email_verified: Math.random() > 0.3,
          phone_verified: Math.random() > 0.3,
          id_verified: Math.random() > 0.4,
          face_verified: Math.random() > 0.5
        }
      });
    }
    
    return dummyVoters;
  };

  const loadCandidates = async (page = 1) => {
    setLoading(true);
    try {
      const response = await adminAPI.getCandidates({ page, per_page: pagination.candidates.per_page });
      if (response.success) {
        setCandidates(response.candidates);
        setPagination(prev => ({
          ...prev,
          candidates: {
            ...response.pagination,
            page: response.pagination.page || page
          }
        }));
      }
    } catch (error) {
      console.error('Error loading candidates:', error);
      setError('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async (page = 1) => {
    setLoading(true);
    try {
      const response = await adminAPI.getAuditLogs({ page, per_page: pagination.audit.per_page });
      if (response.success) {
        setAuditLogs(response.logs);
        setPagination(prev => ({
          ...prev,
          audit: {
            ...response.pagination,
            page: response.pagination.page || page
          }
        }));
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await adminAPI.getSystemSettings();
      if (response.success) {
        setSettings(response.settings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setError('Failed to load settings');
    }
  };

  // ===== NEW: Reports Functions (Moved outside renderReports) =====
  const loadDashboardReports = async () => {
    setReportLoading(prev => ({ ...prev, dashboard: true }));
    setError('');
    
    try {
      console.log('📊 Attempting to load dashboard reports...');
      
      // Try the real API endpoint first
      const response = await adminAPI.getDashboardReports();
      
      if (response.success) {
        console.log('✅ Dashboard reports loaded successfully');
        setReports(prev => ({ 
          ...prev, 
          dashboard: response.reports || response.data 
        }));
        setSuccess('Dashboard reports loaded');
      } else {
        console.warn('⚠️ API returned failure, using mock data');
        // Fall back to mock data
        setReports(prev => ({ 
          ...prev, 
          dashboard: generateMockDashboardReports() 
        }));
        setSuccess('Using sample dashboard reports data');
      }
    } catch (error) {
      console.error('❌ Error loading dashboard reports:', error);
      
      // Use mock data for development
      setReports(prev => ({ 
        ...prev, 
        dashboard: generateMockDashboardReports() 
      }));
      
      // Only show error in production, not in development
      if (process.env.NODE_ENV === 'production') {
        setError('Dashboard reports temporarily unavailable');
      } else {
        setSuccess('Loaded mock dashboard reports for development');
      }
    } finally {
      setReportLoading(prev => ({ ...prev, dashboard: false }));
    }
  };

  // Generate mock dashboard reports data
  const generateMockDashboardReports = () => {
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      return {
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 50) + 10
      };
    }).reverse();

    return {
      generated_at: new Date().toISOString(),
      daily_registrations: last7Days,
      gender_distribution: [
        { gender: 'Male', count: 450 },
        { gender: 'Female', count: 420 },
        { gender: 'Other', count: 30 }
      ],
      age_distribution: {
        '18-25': 120,
        '26-35': 250,
        '36-45': 300,
        '46-55': 180,
        '56+': 50
      },
      election_performance: [
        {
          election_id: 'ELEC001',
          title: 'National Presidential Election 2024',
          status: 'completed',
          total_votes: 85000,
          turnout: '75%',
          candidates: 5
        },
        {
          election_id: 'ELEC002',
          title: 'State Assembly Election',
          status: 'active',
          total_votes: 45000,
          turnout: '65%',
          candidates: 12
        },
        {
          election_id: 'ELEC003',
          title: 'Local Council Election',
          status: 'scheduled',
          total_votes: 0,
          turnout: '0%',
          candidates: 8
        }
      ],
      system_health: {
        database_connection: 'healthy',
        api_response_time: 'fast',
        server_uptime: '99.9%',
        active_sessions: 245,
        memory_usage: '65%',
        cpu_usage: '42%'
      },
      top_performing_elections: [
        { title: 'National Election', votes: 85000, turnout: '75%' },
        { title: 'State Election', votes: 45000, turnout: '65%' },
        { title: 'City Election', votes: 22000, turnout: '58%' }
      ],
      voter_growth: {
        this_month: 245,
        last_month: 198,
        growth_percentage: '23.7%'
      }
    };
  };


const loadVoterAnalytics = async () => {
  setReportLoading(prev => ({ ...prev, voter: true }));
  setError('');
  
  try {
    const response = await adminAPI.getVoterAnalytics();
    
    if (response.success) {
      setReports(prev => ({ 
        ...prev, 
        voterAnalytics: response.analytics || response.data 
      }));
    } else {
      // Fall back to mock data
      setReports(prev => ({ 
        ...prev, 
        voterAnalytics: generateMockVoterAnalytics() 
      }));
    }
  } catch (error) {
    console.error('Error loading voter analytics:', error);
    setReports(prev => ({ 
      ...prev, 
      voterAnalytics: generateMockVoterAnalytics() 
    }));
  } finally {
    setReportLoading(prev => ({ ...prev, voter: false }));
  }
};

const generateMockVoterAnalytics = () => {
  return {
    generated_at: new Date().toISOString(),
    total_voters: 900,
    verification_stats: {
      fully_verified: 650,
      partially_verified: 200,
      pending_verification: 50
    },
    activity_level: {
      active: 720,
      inactive: 180
    },
    registration_trend: Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 20) + 5
      };
    }),
    demographic_breakdown: {
      by_age: {
        '18-25': 180,
        '26-35': 270,
        '36-45': 220,
        '46-55': 150,
        '56+': 80
      },
      by_gender: {
        male: 450,
        female: 420,
        other: 30
      },
      by_region: {
        'North Region': 220,
        'South Region': 190,
        'East Region': 240,
        'West Region': 250
      }
    }
  };
};

const loadSystemHealth = async () => {
  setReportLoading(prev => ({ ...prev, system: true }));
  setError('');
  
  try {
    const response = await adminAPI.getSystemHealth();
    
    if (response.success) {
      setReports(prev => ({ 
        ...prev, 
        systemHealth: response.health || response.data 
      }));
    } else {
      // Fall back to mock data
      setReports(prev => ({ 
        ...prev, 
        systemHealth: generateMockSystemHealth() 
      }));
    }
  } catch (error) {
    console.error('Error loading system health:', error);
    setReports(prev => ({ 
      ...prev, 
      systemHealth: generateMockSystemHealth() 
    }));
  } finally {
    setReportLoading(prev => ({ ...prev, system: false }));
  }
};

const generateMockSystemHealth = () => {
  return {
    generated_at: new Date().toISOString(),
    status: 'healthy',
    uptime_hours: 720,
    recent_errors: 3,
    last_check: new Date().toISOString(),
    collection_counts: {
      voters: 900,
      elections: 15,
      candidates: 85,
      votes: 152000,
      audit_logs: 12500,
      admin_users: 8
    },
    performance_metrics: {
      api_response_time_ms: 45,
      database_query_time_ms: 12,
      server_load_percentage: 42,
      memory_usage_percentage: 65,
      disk_usage_percentage: 38
    },
    services_status: {
      api_server: 'online',
      database: 'online',
      file_storage: 'online',
      email_service: 'online',
      sms_gateway: 'online',
      face_recognition: 'online'
    }
  };
};

const handleExportReport = async (reportType) => {
  setReportLoading(prev => ({ ...prev, export: true }));
  setError('');
  
  try {
    console.log(`📤 Exporting ${reportType} report in ${exportFormat} format`);
    
    const response = await adminAPI.exportReport({
      type: reportType,
      format: exportFormat
    });
    
    if (response.success) {
      // For JSON format
      if (exportFormat === 'json') {
        let dataToExport;
        
        switch(reportType) {
          case 'voters':
            dataToExport = reports.voterAnalytics || generateMockVoterAnalytics();
            break;
          case 'elections':
            dataToExport = reports.dashboard || generateMockDashboardReports();
            break;
          case 'votes':
            dataToExport = {
              vote_statistics: {
                total_votes: 152000,
                average_turnout: '68%',
                busiest_election: 'National Presidential Election 2024',
                votes_today: 1245
              }
            };
            break;
          default:
            dataToExport = reports[reportType] || {};
        }
        
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
        const exportFileDefaultName = `${reportType}_report_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        document.body.appendChild(linkElement);
        linkElement.click();
        document.body.removeChild(linkElement);
      }
      
      setSuccess(`${reportType} report exported successfully as ${exportFormat.toUpperCase()}`);
    } else {
      // Mock successful export for development
      setSuccess(`Mock export: ${reportType} report would be exported as ${exportFormat.toUpperCase()}`);
      console.log(`Mock export completed for ${reportType}`);
    }
  } catch (error) {
    console.error('Error exporting report:', error);
    
    // Mock successful export for development
    if (process.env.NODE_ENV === 'development') {
      setSuccess(`[Development] ${reportType} report export simulated`);
      console.log('Mock export simulation completed');
    } else {
      setError('Export feature temporarily unavailable');
    }
  } finally {
    setReportLoading(prev => ({ ...prev, export: false }));
  }
};

  // ========== ELECTION HANDLERS ==========
  const handleCreateElection = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      
      Object.keys(electionForm).forEach(key => {
        if (key === 'election_logo' || key === 'election_banner') {
          if (electionForm[key]) {
            formData.append(key, electionForm[key]);
          }
        } else if (key === 'allowed_voter_groups') {
          formData.append(key, JSON.stringify(electionForm[key]));
        } else if (key === 'require_face_verification' || key === 'is_featured') {
          formData.append(key, electionForm[key].toString());
        } else {
          formData.append(key, electionForm[key] || '');
        }
      });

      console.log('Creating election with data:', Object.fromEntries(formData));
      
      const response = await adminAPI.createElection(formData);
      console.log('Election creation response:', response);
      
      if (response.success) {
        setSuccess(`Election created successfully! Status: ${response.status_message}`);
        setShowElectionModal(false);
        
        setElectionForm({
          title: '',
          description: '',
          election_type: 'national',
          constituency: '',
          district: '',
          state: '',
          voting_start: '',
          voting_end: '',
          registration_start: '',
          registration_end: '',
          max_candidates: 10,
          require_face_verification: true,
          election_logo: null,
          election_banner: null,
          election_rules: '',
          results_visibility: 'after_end',
          minimum_voter_age: 18,
          allowed_voter_groups: ['all'],
          is_featured: false
        });
        loadElections();
      } else {
        setError(response.message || 'Failed to create election');
      }
    } catch (error) {
      console.error('Error creating election:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to create election';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEditElection = async (election) => {
    setLoading(true);
    try {
      const response = await adminAPI.getElectionForEdit(election.election_id);
      if (response.success) {
        const electionData = response.election;
        
        const formatDateForInput = (dateString) => {
          if (!dateString) return '';
          const date = new Date(dateString);
          return date.toISOString().slice(0, 16);
        };
        
        setEditingElection(electionData);
        setElectionForm({
          title: electionData.title || '',
          description: electionData.description || '',
          election_type: electionData.election_type || 'national',
          constituency: electionData.constituency || '',
          district: electionData.district || '',
          state: electionData.state || '',
          voting_start: formatDateForInput(electionData.voting_start),
          voting_end: formatDateForInput(electionData.voting_end),
          registration_start: formatDateForInput(electionData.registration_start),
          registration_end: formatDateForInput(electionData.registration_end),
          max_candidates: electionData.max_candidates || 10,
          require_face_verification: electionData.require_face_verification !== false,
          election_logo: null,
          election_banner: null,
          election_rules: electionData.election_rules || '',
          results_visibility: electionData.results_visibility || 'after_end',
          minimum_voter_age: electionData.minimum_voter_age || 18,
          allowed_voter_groups: electionData.allowed_voter_groups || ['all'],
          is_featured: electionData.is_featured || false
        });
        setShowEditElectionModal(true);
      }
    } catch (error) {
      console.error('Error loading election for edit:', error);
      setError('Failed to load election details for editing');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateElection = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      
      Object.keys(electionForm).forEach(key => {
        if (key === 'election_logo' || key === 'election_banner') {
          if (electionForm[key]) {
            formData.append(key, electionForm[key]);
          }
        } else if (key === 'allowed_voter_groups') {
          formData.append(key, JSON.stringify(electionForm[key]));
        } else if (key === 'require_face_verification' || key === 'is_featured') {
          formData.append(key, electionForm[key].toString());
        } else {
          formData.append(key, electionForm[key] || '');
        }
      });

      const response = await adminAPI.updateElection(editingElection.election_id, formData);
      
      if (response.success) {
        setSuccess('Election updated successfully!');
        setShowEditElectionModal(false);
        setEditingElection(null);
        
        setElectionForm({
          title: '',
          description: '',
          election_type: 'national',
          constituency: '',
          district: '',
          state: '',
          voting_start: '',
          voting_end: '',
          registration_start: '',
          registration_end: '',
          max_candidates: 10,
          require_face_verification: true,
          election_logo: null,
          election_banner: null,
          election_rules: '',
          results_visibility: 'after_end',
          minimum_voter_age: 18,
          allowed_voter_groups: ['all'],
          is_featured: false
        });
        
        if (activeTab === 'dashboard') {
          loadDashboardData();
        } else if (activeTab === 'elections') {
          loadElections();
        }
      } else {
        setError(response.message || 'Failed to update election');
      }
    } catch (error) {
      console.error('Error updating election:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to update election';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteElection = async (electionId) => {
    if (window.confirm('Are you sure you want to delete this election? This action cannot be undone.')) {
      try {
        const response = await adminAPI.deleteElection(electionId);
        if (response.success) {
          setSuccess('Election deleted successfully');
          if (activeTab === 'dashboard') {
            loadDashboardData();
          } else if (activeTab === 'elections') {
            loadElections();
          }
        } else {
          setError(response.message || 'Failed to delete election');
        }
      } catch (error) {
        console.error('Error deleting election:', error);
        setError('Failed to delete election');
      }
    }
  };

  // ========== CANDIDATE HANDLERS ==========
  const handleCreateCandidate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      
      Object.keys(candidateForm).forEach(key => {
        if (key === 'photo' || key === 'party_logo' || key === 'election_symbol') {
          if (candidateForm[key]) {
            formData.append(key, candidateForm[key]);
          }
        } else {
          formData.append(key, candidateForm[key]);
        }
      });

      const response = await adminAPI.createCandidate(formData);
      if (response.success) {
        setSuccess('Candidate created successfully!');
        setShowCandidateModal(false);
        setCandidateForm({
          election_id: '',
          full_name: '',
          party: '',
          party_logo: null,
          biography: '',
          email: '',
          phone: '',
          photo: null,
          candidate_id: '',
          agenda: '',
          qualifications: '',
          assets_declaration: '',
          criminal_records: 'none',
          election_symbol: null,
          symbol_name: '',
          is_approved: false
        });
        loadCandidates();
      } else {
        setError(response.message || 'Failed to create candidate');
      }
    } catch (error) {
      console.error('Error creating candidate:', error);
      setError('Failed to create candidate');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCandidate = async (candidate) => {
    setLoading(true);
    try {
      const response = await adminAPI.getCandidateForEdit(candidate.candidate_id);
      if (response.success) {
        const candidateData = response.candidate;

        setEditingCandidate(candidateData);
        setCandidateForm({
          election_id: candidateData.election_id || '',
          full_name: candidateData.full_name || '',
          party: candidateData.party || '',
          party_logo: null,
          biography: candidateData.biography || '',
          email: candidateData.email || '',
          phone: candidateData.phone || '',
          photo: null,
          candidate_id: candidateData.candidate_id || '',
          agenda: candidateData.agenda || candidateData.manifesto || '',
          qualifications: candidateData.qualifications || '',
          assets_declaration: candidateData.assets_declaration || '',
          criminal_records: candidateData.criminal_records || 'none',
          election_symbol: null,
          symbol_name: candidateData.symbol_name || '',
          is_approved: candidateData.is_approved || false
        });
        setShowEditCandidateModal(true);
      }
    } catch (error) {
      console.error('Error loading candidate for edit:', error);
      setError('Failed to load candidate details for editing');
    } finally {
      setLoading(false);
    }
  };

  const handleViewCandidateDetails = (candidate) => {
    console.log('Viewing candidate details:', candidate);
    setSelectedCandidate(candidate);
    setShowCandidateDetailModal(true);
  };

  const handleUpdateCandidate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      
      Object.keys(candidateForm).forEach(key => {
        if (key === 'photo' || key === 'party_logo' || key === 'election_symbol') {
          if (candidateForm[key]) {
            formData.append(key, candidateForm[key]);
          }
        } else if (key === 'is_approved') {
          formData.append(key, candidateForm[key].toString());
        } else {
          formData.append(key, candidateForm[key] || '');
        }
      });

      const response = await adminAPI.updateCandidate(editingCandidate.candidate_id, formData);
      
      if (response.success) {
        setSuccess('Candidate updated successfully!');
        setShowEditCandidateModal(false);
        setEditingCandidate(null);
        
        setCandidateForm({
          election_id: '',
          full_name: '',
          party: '',
          party_logo: null,
          biography: '',
          email: '',
          phone: '',
          photo: null,
          candidate_id: '',
          agenda: '',
          qualifications: '',
          assets_declaration: '',
          criminal_records: 'none',
          election_symbol: null,
          symbol_name: '',
          is_approved: false
        });
        
        if (activeTab === 'candidates') {
          loadCandidates();
        }
      } else {
        setError(response.message || 'Failed to update candidate');
      }
    } catch (error) {
      console.error('Error updating candidate:', error);
      setError('Failed to update candidate');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCandidate = async (candidateId) => {
    if (window.confirm('Are you sure you want to delete this candidate?')) {
      try {
        const response = await adminAPI.deleteCandidate(candidateId);
        if (response.success) {
          setSuccess('Candidate deleted successfully');
          loadCandidates(pagination.candidates.page);
        } else {
          setError(response.message || 'Failed to delete candidate');
        }
      } catch (error) {
        console.error('Error deleting candidate:', error);
        setError('Failed to delete candidate');
      }
    }
  };

  const handleApproveCandidate = async (candidateId) => {
    try {
      const response = await adminAPI.approveCandidate(candidateId);
      if (response.success) {
        setSuccess('Candidate approved successfully');
        loadCandidates(pagination.candidates.page);
      } else {
        setError(response.message || 'Failed to approve candidate');
      }
    } catch (error) {
      console.error('Error approving candidate:', error);
      setError('Failed to approve candidate');
    }
  };

  // ========== VOTER HANDLERS ==========
  const handleVerifyVoter = async (voterId, verificationType) => {
    try {
      const response = await adminAPI.verifyVoter(voterId, { type: verificationType });
      if (response.success) {
        setSuccess(`Voter ${verificationType} verification completed`);
        loadVoters(pagination.voters.page);
      } else {
        setError(response.message || 'Failed to verify voter');
      }
    } catch (error) {
      console.error('Error verifying voter:', error);
      setError('Failed to verify voter. Please try again.');
    }
  };

  const handleUpdateVoterStatus = async (voterId, status) => {
    try {
      const response = await adminAPI.updateVoterStatus(voterId, { status });
      if (response.success) {
        setSuccess(`Voter status updated to ${status}`);
        loadVoters(pagination.voters.page);
      } else {
        setError(response.message || 'Failed to update voter status');
      }
    } catch (error) {
      console.error('Error updating voter status:', error);
      setError('Failed to update voter status');
    }
  };

  const handleDeleteVoter = async (voterId) => {
    if (window.confirm('Are you sure you want to delete this voter?')) {
      try {
        const response = await adminAPI.deleteVoter(voterId);
        if (response.success) {
          setSuccess('Voter deleted successfully');
          loadVoters(pagination.voters.page);
        } else {
          setError(response.message || 'Failed to delete voter');
        }
      } catch (error) {
        console.error('Error deleting voter:', error);
        setError('Failed to delete voter');
      }
    }
  };

  const handleViewVoterDetails = async (voter) => {
    setLoading(true);
    try {
      const response = await adminAPI.getVoterDetails(voter.voter_id);
      if (response.success) {
        setSelectedVoter(response.voter);
        setShowVoterDetailModal(true);
      } else {
        setError('Failed to load voter details');
      }
    } catch (error) {
      console.error('Error loading voter details:', error);
      setError('Failed to load voter details');
    } finally {
      setLoading(false);
    }
  };

  // ========== SETTINGS HANDLERS ==========
  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.updateSystemSettings(settings);
      if (response.success) {
        setSuccess('Settings saved successfully');
      } else {
        setError(response.message || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      setError('Please enter a message to broadcast');
      return;
    }

    setLoading(true);
    try {
      const response = await adminAPI.sendBroadcast({
        message: broadcastMessage,
        type: 'info'
      });
      if (response.success) {
        setSuccess('Broadcast sent successfully');
        setBroadcastMessage('');
      } else {
        setError(response.message || 'Failed to send broadcast');
      }
    } catch (error) {
      console.error('Error sending broadcast:', error);
      setError('Failed to send broadcast');
    } finally {
      setLoading(false);
    }
  };

  // ========== UTILITY FUNCTIONS ==========
  const handleViewElectionDetails = (election) => {
    setSelectedElection(election);
    setShowElectionDetailModal(true);
  };

  const handleFileUpload = (e, fieldName, formType) => {
    const file = e.target.files[0];
    if (file) {
      if (formType === 'election') {
        setElectionForm(prev => ({ ...prev, [fieldName]: file }));
      } else if (formType === 'candidate') {
        setCandidateForm(prev => ({ ...prev, [fieldName]: file }));
      }
    }
  };

  const handleUpdateElectionStatus = async (electionId, status) => {
    try {
      const response = await adminAPI.updateElectionStatus(electionId, { status });
      if (response.success) {
        setSuccess(`Election status updated to ${status}`);
        if (activeTab === 'dashboard') {
          loadDashboardData();
        } else if (activeTab === 'elections') {
          loadElections();
        }
        setShowElectionDetailModal(false);
      } else {
        setError(response.message || 'Failed to update election status');
      }
    } catch (error) {
      console.error('Error updating election status:', error);
      setError('Failed to update election status');
    }
  };

  const handleLogout = () => {
    adminLogout();
    window.location.href = '/admin/login';
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // ========== RENDER FUNCTIONS ==========
  const renderDashboard = () => (
    <Row>
      {/* Stats Cards */}
      <Col md={3} className="mb-4">
        <Card className="h-100 border-0 shadow-sm">
          <Card.Body className="text-center">
            <FaUsers className="text-primary fa-2x mb-3" />
            <h3>{stats.total_voters || 0}</h3>
            <p className="text-muted mb-0">Total Voters</p>
          </Card.Body>
        </Card>
      </Col>
      
      <Col md={3} className="mb-4">
        <Card className="h-100 border-0 shadow-sm">
          <Card.Body className="text-center">
            <FaUserCheck className="text-success fa-2x mb-3" />
            <h3>{stats.verified_voters || 0}</h3>
            <p className="text-muted mb-0">Verified Voters</p>
          </Card.Body>
        </Card>
      </Col>
      
      <Col md={3} className="mb-4">
        <Card className="h-100 border-0 shadow-sm">
          <Card.Body className="text-center">
            <FaVoteYea className="text-warning fa-2x mb-3" />
            <h3>{stats.active_elections || 0}</h3>
            <p className="text-muted mb-0">Active Elections</p>
          </Card.Body>
        </Card>
      </Col>
      
      <Col md={3} className="mb-4">
        <Card className="h-100 border-0 shadow-sm">
          <Card.Body className="text-center">
            <FaChartBar className="text-info fa-2x mb-3" />
            <h3>{stats.total_votes || 0}</h3>
            <p className="text-muted mb-0">Total Votes</p>
          </Card.Body>
        </Card>
      </Col>

      {/* Recent Elections */}
      <Col md={8}>
        <Card className="border-0 shadow-sm">
          <Card.Header className="bg-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Recent Elections</h5>
            <div>
              <Button size="sm" variant="outline-secondary" className="me-2" onClick={loadDashboardData}>
                <FaSync />
              </Button>
              <Button size="sm" variant="primary" onClick={() => setShowElectionModal(true)}>
                <FaPlus className="me-1" /> New Election
              </Button>
            </div>
          </Card.Header>
          <Card.Body>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Election</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Voting Period</th>
                  <th>Candidates</th>
                  <th>Votes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {elections.slice(0, 5).map(election => (
                  <tr key={election.election_id}>
                    <td>
                      <div className="d-flex align-items-center">
                        {election.election_logo && (
                          <Image 
                            src={election.election_logo} 
                            width={40} 
                            height={40} 
                            rounded 
                            className="me-3"
                          />
                        )}
                        <div>
                          <strong>{election.title}</strong>
                          <br />
                          <small className="text-muted">{election.election_id}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge bg="light" text="dark">
                        {election.election_type}
                      </Badge>
                    </td>
                    <td>
                      <Badge bg={
                        election.status === 'active' ? 'success' :
                        election.status === 'scheduled' ? 'warning' :
                        election.status === 'completed' ? 'secondary' : 'light'
                      }>
                        {election.status}
                      </Badge>
                    </td>
                    <td>
                      <small>
                        {new Date(election.voting_start).toLocaleDateString()} - {' '}
                        {new Date(election.voting_end).toLocaleDateString()}
                      </small>
                    </td>
                    <td>{election.total_candidates || 0}</td>
                    <td>{election.total_votes || 0}</td>
                    <td>
                      <Button 
                        size="sm" 
                        variant="outline-primary" 
                        title="View Details"
                        onClick={() => handleViewElectionDetails(election)}
                      >
                        <FaEye />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline-warning" 
                        className="ms-1"
                        title="Edit Election"
                        onClick={() => handleEditElection(election)}
                      >
                        <FaEdit />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </Col>

      {/* System Overview */}
      <Col md={4}>
        <Card className="border-0 shadow-sm">
          <Card.Header className="bg-white">
            <h5 className="mb-0">System Overview</h5>
          </Card.Header>
          <Card.Body>
            <div className="mb-3">
              <strong>Admin Role:</strong> 
              <Badge bg="dark" className="ms-2">{admin?.role}</Badge>
            </div>
            <div className="mb-3">
              <strong>Last Login:</strong> 
              <br />
              <small className="text-muted">
                {admin?.last_login ? new Date(admin.last_login).toLocaleString() : 'N/A'}
              </small>
            </div>
            <div className="mb-3">
              <strong>Access Level:</strong> {admin?.access_level}
            </div>
            <div className="mb-3">
              <strong>Department:</strong> {admin?.department || 'Administration'}
            </div>
            <div className="mt-4">
              <small className="text-muted">
                <FaSync className="me-1" />
                Last updated: {new Date().toLocaleTimeString()}
              </small>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  const renderElections = () => (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-white d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Manage Elections ({pagination.elections.total})</h5>
        <Button variant="primary" onClick={() => setShowElectionModal(true)}>
          <FaPlus className="me-1" /> Create Election
        </Button>
      </Card.Header>
      <Card.Body>
        {elections.length === 0 ? (
          <div className="text-center py-5">
            <FaVoteYea className="text-muted fa-3x mb-3" />
            <h5>No elections found</h5>
            <p className="text-muted">Create your first election to get started</p>
            <Button variant="primary" onClick={() => setShowElectionModal(true)}>
              <FaPlus className="me-1" /> Create Election
            </Button>
          </div>
        ) : (
          <>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Election</th>
                  <th>Type</th>
                  <th>Constituency</th>
                  <th>Status</th>
                  <th>Voting Period</th>
                  <th>Candidates</th>
                  <th>Votes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {elections.map(election => (
                  <tr key={election.election_id}>
                    <td>
                      <div className="d-flex align-items-center">
                        {election.election_logo && (
                          <Image 
                            src={election.election_logo} 
                            width={40} 
                            height={40} 
                            rounded 
                            className="me-3"
                          />
                        )}
                        <div>
                          <strong>{election.title}</strong>
                          <br />
                          <small className="text-muted">{election.election_id}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge bg="light" text="dark">
                        {election.election_type}
                      </Badge>
                    </td>
                    <td>{election.constituency || 'N/A'}</td>
                    <td>
                      <Badge bg={
                        election.status === 'active' ? 'success' :
                        election.status === 'scheduled' ? 'warning' :
                        election.status === 'completed' ? 'secondary' : 'light'
                      }>
                        {election.status}
                      </Badge>
                    </td>
                    <td>
                      <small>
                        {new Date(election.voting_start).toLocaleDateString()} - {' '}
                        {new Date(election.voting_end).toLocaleDateString()}
                      </small>
                    </td>
                    <td>{election.total_candidates || 0}</td>
                    <td>{election.total_votes || 0}</td>
                    <td>
                      <Button 
                        size="sm" 
                        variant="outline-primary" 
                        className="me-1" 
                        title="View Details"
                        onClick={() => handleViewElectionDetails(election)}
                      >
                        <FaEye />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline-warning" 
                        className="me-1" 
                        title="Edit"
                        onClick={() => handleEditElection(election)}
                      >
                        <FaEdit />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline-danger" 
                        title="Delete"
                        onClick={() => handleDeleteElection(election.election_id)}
                      >
                        <FaTrash />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            
            {/* Pagination */}
            {pagination.elections.total_pages > 1 && (
              <div className="d-flex justify-content-center mt-3">
                <Pagination>
                  <Pagination.Prev 
                    disabled={pagination.elections.page === 1}
                    onClick={() => loadElections(pagination.elections.page - 1)}
                  />
                  {[...Array(pagination.elections.total_pages)].map((_, i) => (
                    <Pagination.Item
                      key={i + 1}
                      active={i + 1 === pagination.elections.page}
                      onClick={() => loadElections(i + 1)}
                    >
                      {i + 1}
                    </Pagination.Item>
                  ))}
                  <Pagination.Next 
                    disabled={pagination.elections.page === pagination.elections.total_pages}
                    onClick={() => loadElections(pagination.elections.page + 1)}
                  />
                </Pagination>
              </div>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  );

  const renderVoters = () => (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-white d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Manage Voters ({pagination.voters.total || 0})</h5>
        <div>
          <Button 
            size="sm" 
            variant="outline-secondary" 
            className="me-2"
            onClick={() => loadVoters(pagination.voters.page)}
            disabled={loading}
          >
            <FaSync className={`me-1 ${loading ? 'fa-spin' : ''}`} /> Refresh
          </Button>
          <Button 
            size="sm" 
            variant="outline-secondary" 
            className="me-2"
            onClick={() => {
              // Open filter modal or show filter options
              alert('Filter feature coming soon');
            }}
          >
            <FaFilter className="me-1" /> Filter
          </Button>
          <Button 
            size="sm" 
            variant="outline-secondary"
            onClick={() => {
              // Open search modal or show search input
              alert('Search feature coming soon');
            }}
          >
            <FaSearch className="me-1" /> Search
          </Button>
        </div>
      </Card.Header>
      <Card.Body>
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">Loading voters...</p>
          </div>
        ) : error && voters.length === 0 ? (
          <div className="text-center py-5">
            <FaUsers className="text-danger fa-3x mb-3" />
            <h5>Error Loading Voters</h5>
            <p className="text-danger mb-3">{error}</p>
            <Button 
              variant="primary" 
              onClick={() => loadVoters(1)}
              disabled={loading}
            >
              <FaSync className="me-1" /> Try Again
            </Button>
          </div>
        ) : voters.length === 0 ? (
          <div className="text-center py-5">
            <FaUsers className="text-muted fa-3x mb-3" />
            <h5>No voters found</h5>
            <p className="text-muted">Voters will appear here once they register</p>
            <Button 
              variant="outline-primary" 
              onClick={() => loadVoters(1)}
              disabled={loading}
            >
              <FaSync className="me-1" /> Refresh
            </Button>
          </div>
        ) : (
          <>
            {/* Stats Summary */}
            <Alert variant="info" className="mb-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>Showing {voters.length} voters</strong>
                  <span className="text-muted ms-2">
                    • Page {pagination.voters.page} of {pagination.voters.total_pages}
                  </span>
                </div>
                <div>
                  <Badge bg="success" className="me-2">
                    Verified: {voters.filter(v => v.verification_status?.email_verified && v.verification_status?.phone_verified).length}
                  </Badge>
                  <Badge bg="warning">
                    Pending: {voters.filter(v => !v.verification_status?.email_verified || !v.verification_status?.phone_verified).length}
                  </Badge>
                </div>
              </div>
            </Alert>

            <Table responsive hover>
              <thead>
                <tr>
                  <th>Voter ID</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Verification Status</th>
                  <th>Registration Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {voters.map(voter => (
                  <tr key={voter.voter_id || voter._id}>
                    <td>
                      <code>{voter.voter_id || 'N/A'}</code>
                    </td>
                    <td>
                      <strong>{voter.full_name || 'Unknown'}</strong>
                      <br />
                      <small className="text-muted">
                        {voter.gender || 'N/A'} • {voter.age || 'N/A'} years
                      </small>
                    </td>
                    <td>
                      {voter.email || 'N/A'}
                      {voter.email && !voter.verification_status?.email_verified && (
                        <Badge bg="warning" className="ms-1" size="sm">!</Badge>
                      )}
                    </td>
                    <td>
                      {voter.phone || 'N/A'}
                      {voter.phone && !voter.verification_status?.phone_verified && (
                        <Badge bg="warning" className="ms-1" size="sm">!</Badge>
                      )}
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        <Badge 
                          bg={voter.verification_status?.email_verified ? 'success' : 'secondary'} 
                          className="d-flex align-items-center"
                          style={{ cursor: 'pointer' }}
                          title={voter.verification_status?.email_verified ? 'Email verified' : 'Email not verified'}
                          onClick={() => handleVerifyVoter(voter.voter_id || voter._id, 'email')}
                        >
                          <FaCheckCircle className="me-1" size={10} />
                          Email
                        </Badge>
                        <Badge 
                          bg={voter.verification_status?.phone_verified ? 'success' : 'secondary'} 
                          className="d-flex align-items-center"
                          style={{ cursor: 'pointer' }}
                          title={voter.verification_status?.phone_verified ? 'Phone verified' : 'Phone not verified'}
                          onClick={() => handleVerifyVoter(voter.voter_id || voter._id, 'phone')}
                        >
                          <FaCheckCircle className="me-1" size={10} />
                          Phone
                        </Badge>
                        <Badge 
                          bg={voter.verification_status?.id_verified ? 'success' : 'secondary'} 
                          className="d-flex align-items-center"
                          style={{ cursor: 'pointer' }}
                          title={voter.verification_status?.id_verified ? 'ID verified' : 'ID not verified'}
                          onClick={() => handleVerifyVoter(voter.voter_id || voter._id, 'id')}
                        >
                          <FaCheckCircle className="me-1" size={10} />
                          ID
                        </Badge>
                        <Badge 
                          bg={voter.verification_status?.face_verified ? 'success' : 'secondary'}
                          className="d-flex align-items-center"
                          style={{ cursor: 'pointer' }}
                          title={voter.verification_status?.face_verified ? 'Face verified' : 'Face not verified'}
                          onClick={() => handleVerifyVoter(voter.voter_id || voter._id, 'face')}
                        >
                          <FaCheckCircle className="me-1" size={10} />
                          Face
                        </Badge>
                      </div>
                      {(!voter.verification_status?.email_verified || 
                        !voter.verification_status?.phone_verified) && (
                        <small className="text-warning d-block mt-1">
                          Needs verification
                        </small>
                      )}
                    </td>
                    <td>
                      {voter.created_at ? new Date(voter.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td>
                      <div className="btn-group" role="group">
                        <Button 
                          size="sm" 
                          variant="outline-success" 
                          title="Verify All"
                          onClick={() => handleVerifyVoter(voter.voter_id || voter._id, 'all')}
                          disabled={loading}
                        >
                          <FaCheckCircle />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline-primary" 
                          title="View Details"
                          onClick={() => handleViewVoterDetails(voter)}
                          disabled={loading}
                        >
                          <FaEye />
                        </Button>
                        {voter.is_active !== false ? (
                          <Button 
                            size="sm" 
                            variant="outline-warning" 
                            title="Deactivate"
                            onClick={() => handleUpdateVoterStatus(voter.voter_id || voter._id, 'inactive')}
                            disabled={loading}
                          >
                            <FaTimesCircle />
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline-success" 
                            title="Activate"
                            onClick={() => handleUpdateVoterStatus(voter.voter_id || voter._id, 'active')}
                            disabled={loading}
                          >
                            <FaCheckCircle />
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline-danger" 
                          title="Delete"
                          onClick={() => handleDeleteVoter(voter.voter_id || voter._id)}
                          disabled={loading}
                        >
                          <FaTrash />
                        </Button>
                      </div>
                      {voter.is_active === false && (
                        <Badge bg="secondary" className="mt-1 d-block">Inactive</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            
            {/* Pagination */}
            {pagination.voters.total_pages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div>
                  <small className="text-muted">
                    Showing {(pagination.voters.page - 1) * pagination.voters.per_page + 1} to{' '}
                    {Math.min(pagination.voters.page * pagination.voters.per_page, pagination.voters.total)} of{' '}
                    {pagination.voters.total} voters
                  </small>
                </div>
                <Pagination className="mb-0">
                  <Pagination.First 
                    disabled={pagination.voters.page === 1}
                    onClick={() => loadVoters(1)}
                  />
                  <Pagination.Prev 
                    disabled={pagination.voters.page === 1}
                    onClick={() => loadVoters(pagination.voters.page - 1)}
                  />
                  
                  {/* Show limited page numbers */}
                  {(() => {
                    const pages = [];
                    const totalPages = pagination.voters.total_pages;
                    const currentPage = pagination.voters.page;
                    
                    // Always show first page
                    if (currentPage > 2) {
                      pages.push(1);
                      if (currentPage > 3) pages.push('...');
                    }
                    
                    // Show pages around current
                    for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages, currentPage + 1); i++) {
                      pages.push(i);
                    }
                    
                    // Always show last page
                    if (currentPage < totalPages - 1) {
                      if (currentPage < totalPages - 2) pages.push('...');
                      pages.push(totalPages);
                    }
                    
                    return pages.map((page, index) => (
                      page === '...' ? (
                        <Pagination.Ellipsis key={`ellipsis-${index}`} disabled />
                      ) : (
                        <Pagination.Item
                          key={page}
                          active={page === currentPage}
                          onClick={() => loadVoters(page)}
                        >
                          {page}
                        </Pagination.Item>
                      )
                    ));
                  })()}
                  
                  <Pagination.Next 
                    disabled={pagination.voters.page === pagination.voters.total_pages}
                    onClick={() => loadVoters(pagination.voters.page + 1)}
                  />
                  <Pagination.Last 
                    disabled={pagination.voters.page === pagination.voters.total_pages}
                    onClick={() => loadVoters(pagination.voters.total_pages)}
                  />
                </Pagination>
              </div>
            )}
          </>
        )}
      </Card.Body>
      {!loading && voters.length > 0 && (
        <Card.Footer className="bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">
              Last updated: {new Date().toLocaleTimeString()}
            </small>
            <div>
              <Button 
                size="sm" 
                variant="outline-secondary"
                onClick={() => {
                  // Export functionality
                  alert('Export feature coming soon');
                }}
              >
                <FaFileExport className="me-1" /> Export
              </Button>
            </div>
          </div>
        </Card.Footer>
      )}
    </Card>
  );

  const renderCandidates = () => (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-white d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Manage Candidates ({pagination.candidates.total})</h5>
        <Button variant="primary" onClick={() => setShowCandidateModal(true)}>
          <FaPlus className="me-1" /> Add Candidate
        </Button>
      </Card.Header>
      <Card.Body>
        {candidates.length === 0 ? (
          <div className="text-center py-5">
            <FaUserTie className="text-muted fa-3x mb-3" />
            <h5>No candidates found</h5>
            <p className="text-muted">Add candidates to participate in elections</p>
            <Button variant="primary" onClick={() => setShowCandidateModal(true)}>
              <FaPlus className="me-1" /> Add New Candidate
            </Button>
          </div>
        ) : (
          <>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Party</th>
                  <th>Election</th>
                  <th>Status</th>
                  <th>Contact</th>
                  <th>Approval</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map(candidate => (
                  <tr key={candidate.candidate_id}>
                    <td>
                      <div className="d-flex align-items-center">
                        {candidate.photo && (
                          <Image 
                            src={candidate.photo} 
                            width={40} 
                            height={40} 
                            rounded 
                            className="me-3"
                          />
                        )}
                        <div>
                          <strong>{candidate.full_name}</strong>
                          <br />
                          <small className="text-muted">{candidate.candidate_id}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        {candidate.party_logo && (
                          <Image 
                            src={candidate.party_logo} 
                            width={30} 
                            height={30} 
                            rounded 
                            className="me-2"
                          />
                        )}
                        <span>{candidate.party}</span>
                      </div>
                    </td>
                    <td>
                      <small>{candidate.election_title}</small>
                    </td>
                    <td>
                      <Badge bg={
                        candidate.is_approved ? 'success' : 'warning'
                      }>
                        {candidate.is_approved ? 'Approved' : 'Pending'}
                      </Badge>
                    </td>
                    <td>
                      <small>
                        {candidate.email}<br/>
                        {candidate.phone}
                      </small>
                    </td>
                    <td>
                      {!candidate.is_approved && (
                        <Button 
                          size="sm" 
                          variant="success" 
                          onClick={() => handleApproveCandidate(candidate.candidate_id)}
                        >
                          <FaCheckCircle className="me-1" /> Approve
                        </Button>
                      )}
                      {candidate.is_approved && (
                        <Badge bg="success">Approved</Badge>
                      )}
                    </td>
                    <td>
                      <Button 
                        size="sm" 
                        variant="outline-primary" 
                        className="me-1" 
                        title="View"
                        onClick={() => handleViewCandidateDetails(candidate)} // Add this onClick
                      >
                        <FaEye />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline-warning" 
                        className="me-1" 
                        title="Edit"
                        onClick={() => handleEditCandidate(candidate)}
                      >
                        <FaEdit />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline-danger" 
                        title="Delete"
                        onClick={() => handleDeleteCandidate(candidate.candidate_id)}
                      >
                        <FaTrash />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            
            {/* Pagination */}
            {pagination.candidates.total_pages > 1 && (
              <div className="d-flex justify-content-center mt-3">
                <Pagination>
                  <Pagination.Prev 
                    disabled={pagination.candidates.page === 1}
                    onClick={() => loadCandidates(pagination.candidates.page - 1)}
                  />
                  {[...Array(pagination.candidates.total_pages)].map((_, i) => (
                    <Pagination.Item
                      key={i + 1}
                      active={i + 1 === pagination.candidates.page}
                      onClick={() => loadCandidates(i + 1)}
                    >
                      {i + 1}
                    </Pagination.Item>
                  ))}
                  <Pagination.Next 
                    disabled={pagination.candidates.page === pagination.candidates.total_pages}
                    onClick={() => loadCandidates(pagination.candidates.page + 1)}
                  />
                </Pagination>
              </div>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  );

  const renderAuditLogs = () => (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-white">
        <h5 className="mb-0">Audit Logs ({pagination.audit.total})</h5>
      </Card.Header>
      <Card.Body>
        {auditLogs.length === 0 ? (
          <div className="text-center py-5">
            <FaClipboardList className="text-muted fa-3x mb-3" />
            <h5>No audit logs found</h5>
            <p className="text-muted">System activities will be logged here</p>
          </div>
        ) : (
          <>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Details</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.log_id}>
                    <td>
                      <small>{new Date(log.timestamp).toLocaleString()}</small>
                    </td>
                    <td>
                      <Badge bg={
                        log.action === 'login' ? 'success' :
                        log.action === 'logout' ? 'secondary' :
                        log.action === 'create' ? 'primary' :
                        log.action === 'update' ? 'warning' :
                        log.action === 'delete' ? 'danger' : 'info'
                      }>
                        {log.action}
                      </Badge>
                    </td>
                    <td>
                      <div>
                        <code>{log.user_id}</code>
                        <br />
                        <small className="text-muted">{log.user_type}</small>
                      </div>
                    </td>
                    <td>
                      {typeof log.details === 'string' ? (
                        log.details
                      ) : log.details && typeof log.details === 'object' ? (
                        <div>
                          {Object.entries(log.details).map(([key, value]) => (
                            <div key={key}>
                              <small>
                                <strong>{key}:</strong> {String(value)}
                              </small>
                            </div>
                          ))}
                        </div>
                      ) : (
                        'No details'
                      )}
                    </td>
                    <td>
                      <code>{log.ip_address || 'N/A'}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            
            {/* Pagination */}
            {pagination.audit.total_pages > 1 && (
              <div className="d-flex justify-content-center mt-3">
                <Pagination>
                  <Pagination.Prev 
                    disabled={pagination.audit.page === 1}
                    onClick={() => loadAuditLogs(pagination.audit.page - 1)}
                  />
                  {[...Array(pagination.audit.total_pages)].map((_, i) => (
                    <Pagination.Item
                      key={i + 1}
                      active={i + 1 === pagination.audit.page}
                      onClick={() => loadAuditLogs(i + 1)}
                    >
                      {i + 1}
                    </Pagination.Item>
                  ))}
                  <Pagination.Next 
                    disabled={pagination.audit.page === pagination.audit.total_pages}
                    onClick={() => loadAuditLogs(pagination.audit.page + 1)}
                  />
                </Pagination>
              </div>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  );

  // ========== UPDATED renderReports (No hooks inside) ==========
  const renderReports = () => {
    return (
      <div>
        {/* Report Navigation */}
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body className="p-2">
            <Nav variant="tabs" activeKey={activeReport} onSelect={setActiveReport}>
              <Nav.Item>
                <Nav.Link eventKey="dashboard">
                  <FaChartBar className="me-2" /> Dashboard Analytics
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="voter">
                  <FaUsers className="me-2" /> Voter Analytics
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="system">
                  <FaHeartbeat className="me-2" /> System Health
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="export">
                  <FaFileExport className="me-2" /> Export Reports
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </Card.Body>
        </Card>

        {/* Dashboard Analytics */}
        {activeReport === 'dashboard' && (
          <Row>
            <Col md={12}>
              <Card className="border-0 shadow-sm mb-4">
                <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Dashboard Analytics</h5>
                  <Button 
                    size="sm" 
                    variant="outline-secondary"
                    onClick={loadDashboardReports}
                    disabled={reportLoading.dashboard}
                  >
                    {reportLoading.dashboard ? <Spinner size="sm" /> : <FaSync />}
                  </Button>
                </Card.Header>
                <Card.Body>
                  {reportLoading.dashboard ? (
                    <div className="text-center py-5">
                      <Spinner animation="border" />
                      <p className="mt-2">Loading analytics data...</p>
                    </div>
                  ) : reports.dashboard ? (
                    <>
                      <Row>
                        {/* Daily Registrations Chart */}
                        <Col md={6} className="mb-4">
                          <Card>
                            <Card.Header>
                              <h6 className="mb-0">Daily Voter Registrations (Last 7 Days)</h6>
                            </Card.Header>
                            <Card.Body>
                              {reports.dashboard.daily_registrations && reports.dashboard.daily_registrations.length > 0 ? (
                                <div style={{ height: '250px' }}>
                                  <Table responsive size="sm">
                                    <thead>
                                      <tr>
                                        <th>Date</th>
                                        <th>Registrations</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {reports.dashboard.daily_registrations.map((item, index) => (
                                        <tr key={index}>
                                          <td>{new Date(item.date).toLocaleDateString()}</td>
                                          <td>
                                            <Badge bg="primary">{item.count}</Badge>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </Table>
                                </div>
                              ) : (
                                <div className="text-center py-3">
                                  <p className="text-muted">No registration data available</p>
                                </div>
                              )}
                            </Card.Body>
                          </Card>
                        </Col>

                        {/* Gender Distribution */}
                        <Col md={6} className="mb-4">
                          <Card>
                            <Card.Header>
                              <h6 className="mb-0">Gender Distribution</h6>
                            </Card.Header>
                            <Card.Body>
                              {reports.dashboard.gender_distribution && reports.dashboard.gender_distribution.length > 0 ? (
                                <div>
                                  {reports.dashboard.gender_distribution.map((item, index) => (
                                    <div key={index} className="mb-2">
                                      <div className="d-flex justify-content-between align-items-center">
                                        <span>{item.gender}</span>
                                        <Badge bg="info">{item.count}</Badge>
                                      </div>
                                      <ProgressBar 
                                        now={(item.count / reports.dashboard.gender_distribution.reduce((a, b) => a + b.count, 0)) * 100}
                                        className="mt-1"
                                      />
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-3">
                                  <p className="text-muted">No gender data available</p>
                                </div>
                              )}
                            </Card.Body>
                          </Card>
                        </Col>
                      </Row>

                      {/* Age Distribution */}
                      <Row>
                        <Col md={6} className="mb-4">
                          <Card>
                            <Card.Header>
                              <h6 className="mb-0">Age Group Distribution</h6>
                            </Card.Header>
                            <Card.Body>
                              {reports.dashboard.age_distribution ? (
                                <div>
                                  {Object.entries(reports.dashboard.age_distribution).map(([ageGroup, count]) => (
                                    <div key={ageGroup} className="mb-2">
                                      <div className="d-flex justify-content-between align-items-center">
                                        <span>{ageGroup}</span>
                                        <Badge bg="warning">{count}</Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-3">
                                  <p className="text-muted">No age distribution data available</p>
                                </div>
                              )}
                            </Card.Body>
                          </Card>
                        </Col>

                        {/* Election Performance */}
                        <Col md={6} className="mb-4">
                          <Card>
                            <Card.Header>
                              <h6 className="mb-0">Election Performance</h6>
                            </Card.Header>
                            <Card.Body>
                              {reports.dashboard.election_performance && reports.dashboard.election_performance.length > 0 ? (
                                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                  {reports.dashboard.election_performance.map((election, index) => (
                                    <div key={index} className="mb-3 pb-2 border-bottom">
                                      <div className="d-flex justify-content-between">
                                        <strong className="text-truncate" style={{ maxWidth: '70%' }}>
                                          {election.title}
                                        </strong>
                                        <Badge bg={
                                          election.status === 'active' ? 'success' :
                                          election.status === 'completed' ? 'secondary' : 'warning'
                                        }>
                                          {election.status}
                                        </Badge>
                                      </div>
                                      <div className="d-flex justify-content-between mt-1">
                                        <small>Votes: {election.total_votes}</small>
                                        <small>Turnout: {election.turnout}%</small>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-3">
                                  <p className="text-muted">No election data available</p>
                                </div>
                              )}
                            </Card.Body>
                          </Card>
                        </Col>
                      </Row>

                      {/* System Health */}
                      <Row>
                        <Col md={12}>
                          <Card>
                            <Card.Header>
                              <h6 className="mb-0">System Health Metrics</h6>
                            </Card.Header>
                            <Card.Body>
                              {reports.dashboard.system_health ? (
                                <Row>
                                  {Object.entries(reports.dashboard.system_health).map(([metric, value]) => (
                                    <Col md={2} sm={4} xs={6} key={metric} className="text-center mb-3">
                                      <Card className="h-100">
                                        <Card.Body>
                                          <h6 className="text-truncate" title={metric}>
                                            {metric.replace(/_/g, ' ')}
                                          </h6>
                                          <Badge bg={
                                            value === 'healthy' || value === 'fast' ? 'success' :
                                            value.includes('%') && parseInt(value) > 80 ? 'warning' : 'info'
                                          }>
                                            {value}
                                          </Badge>
                                        </Card.Body>
                                      </Card>
                                    </Col>
                                  ))}
                                </Row>
                              ) : (
                                <div className="text-center py-3">
                                  <p className="text-muted">No system health data available</p>
                                </div>
                              )}
                            </Card.Body>
                          </Card>
                        </Col>
                      </Row>
                    </>
                  ) : (
                    <div className="text-center py-5">
                      <FaChartBar className="text-muted fa-3x mb-3" />
                      <h5>No Analytics Data</h5>
                      <p className="text-muted">Click refresh to load dashboard analytics</p>
                      <Button variant="primary" onClick={loadDashboardReports}>
                        <FaSync className="me-1" /> Load Analytics
                      </Button>
                    </div>
                  )}
                </Card.Body>
                {reports.dashboard && (
                  <Card.Footer className="text-muted small">
                    Last updated: {new Date(reports.dashboard.generated_at).toLocaleString()}
                  </Card.Footer>
                )}
              </Card>
            </Col>
          </Row>
        )}

        {/* Voter Analytics */}
        {activeReport === 'voter' && (
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Voter Analytics</h5>
              <Button 
                size="sm" 
                variant="outline-secondary"
                onClick={loadVoterAnalytics}
                disabled={reportLoading.voter}
              >
                {reportLoading.voter ? <Spinner size="sm" /> : <FaSync />}
              </Button>
            </Card.Header>
            <Card.Body>
              {reportLoading.voter ? (
                <div className="text-center py-5">
                  <Spinner animation="border" />
                  <p className="mt-2">Loading voter analytics...</p>
                </div>
              ) : reports.voterAnalytics ? (
                <Row>
                  {/* Verification Stats */}
                  <Col md={4} className="mb-4">
                    <Card className="h-100">
                      <Card.Header>
                        <h6 className="mb-0">Verification Status</h6>
                      </Card.Header>
                      <Card.Body className="text-center">
                        <Row>
                          <Col md={12} className="mb-3">
                            <div className="display-4">
                              {reports.voterAnalytics.verification_stats.fully_verified}
                            </div>
                            <Badge bg="success">Fully Verified</Badge>
                          </Col>
                          <Col md={6}>
                            <div className="h5">
                              {reports.voterAnalytics.verification_stats.partially_verified}
                            </div>
                            <small>Partial</small>
                          </Col>
                          <Col md={6}>
                            <div className="h5">
                              {reports.voterAnalytics.verification_stats.pending_verification}
                            </div>
                            <small>Pending</small>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Activity Level */}
                  <Col md={4} className="mb-4">
                    <Card className="h-100">
                      <Card.Header>
                        <h6 className="mb-0">Activity Level (30 days)</h6>
                      </Card.Header>
                      <Card.Body className="text-center">
                        <Row>
                          <Col md={12} className="mb-3">
                            <div className="display-4 text-success">
                              {reports.voterAnalytics.activity_level.active}
                            </div>
                            <Badge bg="success">Active Voters</Badge>
                          </Col>
                          <Col md={12}>
                            <div className="h5 text-warning">
                              {reports.voterAnalytics.activity_level.inactive}
                            </div>
                            <small>Inactive Voters</small>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Total Voters */}
                  <Col md={4} className="mb-4">
                    <Card className="h-100">
                      <Card.Header>
                        <h6 className="mb-0">Total Voters</h6>
                      </Card.Header>
                      <Card.Body className="text-center">
                        <div className="display-1 text-primary">
                          {reports.voterAnalytics.total_voters}
                        </div>
                        <p className="text-muted">Registered Voters</p>
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Registration Trend */}
                  <Col md={12} className="mb-4">
                    <Card>
                      <Card.Header>
                        <h6 className="mb-0">Registration Trend (Last 30 Days)</h6>
                      </Card.Header>
                      <Card.Body>
                        {reports.voterAnalytics.registration_trend && reports.voterAnalytics.registration_trend.length > 0 ? (
                          <Table responsive hover size="sm">
                            <thead>
                              <tr>
                                <th>Date</th>
                                {reports.voterAnalytics.registration_trend.slice(-7).map((item, index) => (
                                  <th key={index} className="text-center">
                                    {new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>Registrations</td>
                                {reports.voterAnalytics.registration_trend.slice(-7).map((item, index) => (
                                  <td key={index} className="text-center">
                                    <Badge bg={item.count > 0 ? 'primary' : 'secondary'}>
                                      {item.count}
                                    </Badge>
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </Table>
                        ) : (
                          <div className="text-center py-3">
                            <p className="text-muted">No registration trend data available</p>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              ) : (
                <div className="text-center py-5">
                  <FaUsers className="text-muted fa-3x mb-3" />
                  <h5>No Voter Analytics Data</h5>
                  <p className="text-muted">Click refresh to load voter analytics</p>
                  <Button variant="primary" onClick={loadVoterAnalytics}>
                    <FaSync className="me-1" /> Load Voter Analytics
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        )}

        {/* System Health */}
        {activeReport === 'system' && (
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">System Health & Status</h5>
              <Button 
                size="sm" 
                variant="outline-secondary"
                onClick={loadSystemHealth}
                disabled={reportLoading.system}
              >
                {reportLoading.system ? <Spinner size="sm" /> : <FaSync />}
              </Button>
            </Card.Header>
            <Card.Body>
              {reportLoading.system ? (
                <div className="text-center py-5">
                  <Spinner animation="border" />
                  <p className="mt-2">Loading system health data...</p>
                </div>
              ) : reports.systemHealth ? (
                <Row>
                  {/* Collection Counts */}
                  <Col md={12} className="mb-4">
                    <Card>
                      <Card.Header>
                        <h6 className="mb-0">Database Collections</h6>
                      </Card.Header>
                      <Card.Body>
                        <Row>
                          {Object.entries(reports.systemHealth.collection_counts).map(([collection, count]) => (
                            <Col md={2} sm={4} xs={6} key={collection} className="mb-3">
                              <Card className="h-100 text-center">
                                <Card.Body>
                                  <div className="h4">{count}</div>
                                  <small className="text-truncate d-block" title={collection}>
                                    {collection}
                                  </small>
                                </Card.Body>
                              </Card>
                            </Col>
                          ))}
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* System Status */}
                  <Col md={6} className="mb-4">
                    <Card className="h-100">
                      <Card.Header>
                        <h6 className="mb-0">System Status</h6>
                      </Card.Header>
                      <Card.Body className="text-center">
                        <div className={`display-4 mb-3 ${reports.systemHealth.status === 'healthy' ? 'text-success' : 'text-warning'}`}>
                          <FaHeartbeat />
                        </div>
                        <Badge bg={reports.systemHealth.status === 'healthy' ? 'success' : 'warning'} className="fs-6">
                          {reports.systemHealth.status.toUpperCase()}
                        </Badge>
                        <div className="mt-3">
                          <small className="text-muted">Uptime: {reports.systemHealth.uptime_hours} hours</small>
                        </div>
                        <div>
                          <small className="text-muted">
                            Recent Errors: <Badge bg={reports.systemHealth.recent_errors > 0 ? 'danger' : 'success'}>
                              {reports.systemHealth.recent_errors}
                            </Badge>
                          </small>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Last Check */}
                  <Col md={6} className="mb-4">
                    <Card className="h-100">
                      <Card.Header>
                        <h6 className="mb-0">Last System Check</h6>
                      </Card.Header>
                      <Card.Body className="text-center">
                        <div className="display-1">
                          <FaClock className="text-info" />
                        </div>
                        <div className="mt-3">
                          {new Date(reports.systemHealth.last_check).toLocaleString()}
                        </div>
                        <div className="mt-2">
                          <Badge bg="info">Auto-refresh every 5 minutes</Badge>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              ) : (
                <div className="text-center py-5">
                  <FaHeartbeat className="text-muted fa-3x mb-3" />
                  <h5>No System Health Data</h5>
                  <p className="text-muted">Click refresh to load system health information</p>
                  <Button variant="primary" onClick={loadSystemHealth}>
                    <FaSync className="me-1" /> Load System Health
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Export Reports */}
        {activeReport === 'export' && (
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Export Reports</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4} className="mb-4">
                  <Card className="h-100">
                    <Card.Header>
                      <h6 className="mb-0">Export Voter Data</h6>
                    </Card.Header>
                    <Card.Body className="text-center">
                      <FaUsers className="text-primary fa-3x mb-3" />
                      <p>Export complete voter database with verification status</p>
                      <Form.Select 
                        className="mb-3" 
                        value={exportFormat}
                        onChange={(e) => setExportFormat(e.target.value)}
                      >
                        <option value="json">JSON Format</option>
                        <option value="csv">CSV Format</option>
                        <option value="pdf">PDF Format</option>
                      </Form.Select>
                      <Button 
                        variant="primary" 
                        className="w-100"
                        onClick={() => handleExportReport('voters')}
                        disabled={loading.export}
                      >
                        {loading.export ? <Spinner size="sm" /> : <FaFileExport className="me-1" />}
                        {loading.export ? 'Exporting...' : 'Export Voters'}
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={4} className="mb-4">
                  <Card className="h-100">
                    <Card.Header>
                      <h6 className="mb-0">Export Election Data</h6>
                    </Card.Header>
                    <Card.Body className="text-center">
                      <FaVoteYea className="text-warning fa-3x mb-3" />
                      <p>Export election results and performance metrics</p>
                      <Form.Select 
                        className="mb-3" 
                        value={exportFormat}
                        onChange={(e) => setExportFormat(e.target.value)}
                      >
                        <option value="json">JSON Format</option>
                        <option value="csv">CSV Format</option>
                        <option value="pdf">PDF Format</option>
                      </Form.Select>
                      <Button 
                        variant="warning" 
                        className="w-100"
                        onClick={() => handleExportReport('elections')}
                        disabled={loading.export}
                      >
                        {loading.export ? <Spinner size="sm" /> : <FaFileExport className="me-1" />}
                        {loading.export ? 'Exporting...' : 'Export Elections'}
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={4} className="mb-4">
                  <Card className="h-100">
                    <Card.Header>
                      <h6 className="mb-0">Export Vote Data</h6>
                    </Card.Header>
                    <Card.Body className="text-center">
                      <FaChartBar className="text-success fa-3x mb-3" />
                      <p>Export voting records and analytics data</p>
                      <Form.Select 
                        className="mb-3" 
                        value={exportFormat}
                        onChange={(e) => setExportFormat(e.target.value)}
                      >
                        <option value="json">JSON Format</option>
                        <option value="csv">CSV Format</option>
                        <option value="pdf">PDF Format</option>
                      </Form.Select>
                      <Button 
                        variant="success" 
                        className="w-100"
                        onClick={() => handleExportReport('votes')}
                        disabled={loading.export}
                      >
                        {loading.export ? <Spinner size="sm" /> : <FaFileExport className="me-1" />}
                        {loading.export ? 'Exporting...' : 'Export Votes'}
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <Card className="mt-4">
                <Card.Header>
                  <h6 className="mb-0">Export Information</h6>
                </Card.Header>
                <Card.Body>
                  <Alert variant="info">
                    <FaInfoCircle className="me-2" />
                    <strong>Note:</strong> Exported data includes all active records. Large datasets may take longer to process.
                    <br />
                    <small className="text-muted">
                      • JSON: Recommended for data analysis
                      <br />
                      • CSV: Recommended for spreadsheet applications
                      <br />
                      • PDF: Recommended for printable reports
                    </small>
                  </Alert>
                </Card.Body>
              </Card>
            </Card.Body>
          </Card>
        )}
      </div>
    );
  };

  const renderSettings = () => (
    <div>
      <Row>
        <Col md={8}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-white">
              <h5 className="mb-0">System Configuration</h5>
            </Card.Header>
            <Card.Body>
              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>System Name</Form.Label>
                      <Form.Control
                        type="text"
                        value={settings.system_name}
                        onChange={(e) => setSettings({...settings, system_name: e.target.value})}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Results Visibility</Form.Label>
                      <Form.Select
                        value={settings.results_visibility}
                        onChange={(e) => setSettings({...settings, results_visibility: e.target.value})}
                      >
                        <option value="after_end">After Voting Ends</option>
                        <option value="immediate">Immediate</option>
                        <option value="manual">Manual Release</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Max File Size (MB)</Form.Label>
                      <Form.Control
                        type="number"
                        value={settings.max_file_size}
                        onChange={(e) => setSettings({...settings, max_file_size: parseInt(e.target.value)})}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Check
                  type="checkbox"
                  label="Allow Voter Registration"
                  checked={settings.voter_registration_open}
                  onChange={(e) => setSettings({...settings, voter_registration_open: e.target.checked})}
                  className="mb-3"
                />

                <Form.Check
                  type="checkbox"
                  label="Require Face Verification"
                  checked={settings.require_face_verification}
                  onChange={(e) => setSettings({...settings, require_face_verification: e.target.checked})}
                  className="mb-3"
                />

                <Form.Check
                  type="checkbox"
                  label="Auto Verify Voters"
                  checked={settings.auto_verify_voters}
                  onChange={(e) => setSettings({...settings, auto_verify_voters: e.target.checked})}
                  className="mb-3"
                />

                <Form.Check
                  type="checkbox"
                  label="Email Notifications"
                  checked={settings.email_notifications}
                  onChange={(e) => setSettings({...settings, email_notifications: e.target.checked})}
                  className="mb-3"
                />

                <Form.Check
                  type="checkbox"
                  label="SMS Notifications"
                  checked={settings.sms_notifications}
                  onChange={(e) => setSettings({...settings, sms_notifications: e.target.checked})}
                  className="mb-3"
                />

                <Form.Check
                  type="checkbox"
                  label="Maintenance Mode"
                  checked={settings.maintenance_mode}
                  onChange={(e) => setSettings({...settings, maintenance_mode: e.target.checked})}
                  className="mb-3"
                />

                <Button 
                  variant="primary" 
                  onClick={handleSaveSettings}
                  disabled={loading}
                >
                  <FaSave className="me-1" />
                  {loading ? 'Saving...' : 'Save Settings'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Broadcast Message</h5>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Message to All Voters</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  placeholder="Enter broadcast message..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                />
              </Form.Group>
              <Button 
                variant="warning" 
                onClick={handleSendBroadcast}
                disabled={loading || !broadcastMessage.trim()}
                className="w-100"
              >
                <FaBullhorn className="me-1" /> {/* Replaced FaBroadcast with FaBullhorn */}
                {loading ? 'Sending...' : 'Send Broadcast'}
              </Button>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm mt-4">
            <Card.Header className="bg-white">
              <h5 className="mb-0">System Information</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-2">
                <strong>Admin Account:</strong> {admin?.username}
              </div>
              <div className="mb-2">
                <strong>Role:</strong> {admin?.role}
              </div>
              <div className="mb-2">
                <strong>Access Level:</strong> {admin?.access_level}
              </div>
              <div className="mb-2">
                <strong>Last Login:</strong> {admin?.last_login ? new Date(admin.last_login).toLocaleString() : 'N/A'}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <nav className="navbar navbar-dark bg-dark">
        <Container fluid>
          <span className="navbar-brand mb-0 h1">
            <FaTachometerAlt className="me-2" />
            Admin Dashboard
          </span>
          <div className="d-flex align-items-center">
            <span className="text-light me-3">
              Welcome, <strong>{admin?.full_name}</strong>
              <br />
              <small className="text-light opacity-75">{admin?.role}</small>
            </span>
            <Button variant="outline-light" size="sm" onClick={handleLogout}>
              <FaSignOutAlt className="me-1" /> Logout
            </Button>
          </div>
        </Container>
      </nav>

      <Container fluid className="mt-4">
        {/* Alerts */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Row>
          {/* Sidebar */}
          <Col md={3} lg={2}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-0">
                <Nav variant="pills" className="flex-column">
                  <Nav.Item>
                    <Nav.Link 
                      active={activeTab === 'dashboard'} 
                      onClick={() => setActiveTab('dashboard')}
                      className="d-flex align-items-center"
                    >
                      <FaTachometerAlt className="me-2" />
                      Dashboard
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link 
                      active={activeTab === 'elections'} 
                      onClick={() => setActiveTab('elections')}
                      className="d-flex align-items-center"
                    >
                      <FaVoteYea className="me-2" />
                      Elections
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link 
                      active={activeTab === 'voters'} 
                      onClick={() => setActiveTab('voters')}
                      className="d-flex align-items-center"
                    >
                      <FaUsers className="me-2" />
                      Voters
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link 
                      active={activeTab === 'candidates'} 
                      onClick={() => setActiveTab('candidates')}
                      className="d-flex align-items-center"
                    >
                      <FaUserTie className="me-2" />
                      Candidates
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link 
                      active={activeTab === 'reports'} 
                      onClick={() => setActiveTab('reports')}
                      className="d-flex align-items-center"
                    >
                      <FaChartBar className="me-2" />
                      Reports
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link 
                      active={activeTab === 'audit'} 
                      onClick={() => setActiveTab('audit')}
                      className="d-flex align-items-center"
                    >
                      <FaClipboardList className="me-2" />
                      Audit Logs
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link 
                      active={activeTab === 'settings'} 
                      onClick={() => setActiveTab('settings')}
                      className="d-flex align-items-center"
                    >
                      <FaCog className="me-2" />
                      Settings
                    </Nav.Link>
                  </Nav.Item>
                </Nav>
              </Card.Body>
            </Card>
          </Col>

          {/* Main Content */}
          <Col md={9} lg={10}>
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2">Loading dashboard data...</p>
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'elections' && renderElections()}
                {activeTab === 'voters' && renderVoters()}
                {activeTab === 'candidates' && renderCandidates()}
                {activeTab === 'reports' && renderReports()}
                {activeTab === 'audit' && renderAuditLogs()}
                {activeTab === 'settings' && renderSettings()}
              </>
            )}
          </Col>
        </Row>
      </Container>


      {/* Create Election Modal */}
      <Modal show={showElectionModal} onHide={() => setShowElectionModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create New Election</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateElection}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Election Title *</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="Enter election title"
                    value={electionForm.title}
                    onChange={(e) => setElectionForm({...electionForm, title: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Election Type *</Form.Label>
                  <Form.Select
                    value={electionForm.election_type}
                    onChange={(e) => setElectionForm({...electionForm, election_type: e.target.value})}
                  >
                    <option value="national">National</option>
                    <option value="state">State</option>
                    <option value="local">Local</option>
                    <option value="organizational">Organizational</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                placeholder="Enter election description"
                value={electionForm.description}
                onChange={(e) => setElectionForm({...electionForm, description: e.target.value})}
              />
            </Form.Group>

            {/* Election Logo and Banner */}
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Election Logo</Form.Label>
                  <Form.Control 
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'election_logo', 'election')}
                  />
                  <Form.Text className="text-muted">
                    Upload a logo for this election (recommended: 200x200px)
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Election Banner</Form.Label>
                  <Form.Control 
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'election_banner', 'election')}
                  />
                  <Form.Text className="text-muted">
                    Upload a banner image for this election (recommended: 1200x300px)
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Voting Start *</Form.Label>
                  <Form.Control 
                    type="datetime-local"
                    value={electionForm.voting_start}
                    onChange={(e) => setElectionForm({...electionForm, voting_start: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Voting End *</Form.Label>
                  <Form.Control 
                    type="datetime-local"
                    value={electionForm.voting_end}
                    onChange={(e) => setElectionForm({...electionForm, voting_end: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Constituency</Form.Label>
                  <Form.Control 
                    type="text"
                    placeholder="Enter constituency"
                    value={electionForm.constituency}
                    onChange={(e) => setElectionForm({...electionForm, constituency: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>District</Form.Label>
                  <Form.Control 
                    type="text"
                    placeholder="Enter district"
                    value={electionForm.district}
                    onChange={(e) => setElectionForm({...electionForm, district: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>State</Form.Label>
                  <Form.Control 
                    type="text"
                    placeholder="Enter state"
                    value={electionForm.state}
                    onChange={(e) => setElectionForm({...electionForm, state: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Results Visibility</Form.Label>
                  <Form.Select
                    value={electionForm.results_visibility}
                    onChange={(e) => setElectionForm({...electionForm, results_visibility: e.target.value})}
                  >
                    <option value="after_end">After Voting Period</option>
                    <option value="immediate">Immediate</option>
                    <option value="manual">Manual Release</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Minimum Voter Age</Form.Label>
                  <Form.Control 
                    type="number"
                    min="18"
                    max="100"
                    value={electionForm.minimum_voter_age}
                    onChange={(e) => setElectionForm({...electionForm, minimum_voter_age: parseInt(e.target.value)})}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Election Rules</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                placeholder="Enter election rules and guidelines"
                value={electionForm.election_rules}
                onChange={(e) => setElectionForm({...electionForm, election_rules: e.target.value})}
              />
            </Form.Group>

            <Form.Check
              type="checkbox"
              label="Require Face Verification"
              checked={electionForm.require_face_verification}
              onChange={(e) => setElectionForm({...electionForm, require_face_verification: e.target.checked})}
              className="mb-3"
            />

            <Form.Check
              type="checkbox"
              label="Feature this election"
              checked={electionForm.is_featured}
              onChange={(e) => setElectionForm({...electionForm, is_featured: e.target.checked})}
              className="mb-3"
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowElectionModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? <Spinner size="sm" /> : 'Create Election'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit Election Modal */}
      <Modal show={showEditElectionModal} onHide={() => setShowEditElectionModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Election: {editingElection?.title}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateElection}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Election Title *</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="Enter election title"
                    value={electionForm.title}
                    onChange={(e) => setElectionForm({...electionForm, title: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Election Type *</Form.Label>
                  <Form.Select
                    value={electionForm.election_type}
                    onChange={(e) => setElectionForm({...electionForm, election_type: e.target.value})}
                  >
                    <option value="national">National</option>
                    <option value="state">State</option>
                    <option value="local">Local</option>
                    <option value="organizational">Organizational</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                placeholder="Enter election description"
                value={electionForm.description}
                onChange={(e) => setElectionForm({...electionForm, description: e.target.value})}
              />
            </Form.Group>

            {/* Election Logo and Banner */}
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Election Logo</Form.Label>
                  <Form.Control 
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'election_logo', 'election')}
                  />
                  <Form.Text className="text-muted">
                    {editingElection?.election_logo ? 'Current logo uploaded. Upload new to replace.' : 'Upload a logo for this election'}
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Election Banner</Form.Label>
                  <Form.Control 
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'election_banner', 'election')}
                  />
                  <Form.Text className="text-muted">
                    {editingElection?.election_banner ? 'Current banner uploaded. Upload new to replace.' : 'Upload a banner image for this election'}
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Voting Start *</Form.Label>
                  <Form.Control 
                    type="datetime-local"
                    value={electionForm.voting_start}
                    onChange={(e) => setElectionForm({...electionForm, voting_start: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Voting End *</Form.Label>
                  <Form.Control 
                    type="datetime-local"
                    value={electionForm.voting_end}
                    onChange={(e) => setElectionForm({...electionForm, voting_end: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Constituency</Form.Label>
                  <Form.Control 
                    type="text"
                    placeholder="Enter constituency"
                    value={electionForm.constituency}
                    onChange={(e) => setElectionForm({...electionForm, constituency: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>District</Form.Label>
                  <Form.Control 
                    type="text"
                    placeholder="Enter district"
                    value={electionForm.district}
                    onChange={(e) => setElectionForm({...electionForm, district: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>State</Form.Label>
                  <Form.Control 
                    type="text"
                    placeholder="Enter state"
                    value={electionForm.state}
                    onChange={(e) => setElectionForm({...electionForm, state: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Results Visibility</Form.Label>
                  <Form.Select
                    value={electionForm.results_visibility}
                    onChange={(e) => setElectionForm({...electionForm, results_visibility: e.target.value})}
                  >
                    <option value="after_end">After Voting Period</option>
                    <option value="immediate">Immediate</option>
                    <option value="manual">Manual Release</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Minimum Voter Age</Form.Label>
                  <Form.Control 
                    type="number"
                    min="18"
                    max="100"
                    value={electionForm.minimum_voter_age}
                    onChange={(e) => setElectionForm({...electionForm, minimum_voter_age: parseInt(e.target.value)})}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Election Rules</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                placeholder="Enter election rules and guidelines"
                value={electionForm.election_rules}
                onChange={(e) => setElectionForm({...electionForm, election_rules: e.target.value})}
              />
            </Form.Group>

            <Form.Check
              type="checkbox"
              label="Require Face Verification"
              checked={electionForm.require_face_verification}
              onChange={(e) => setElectionForm({...electionForm, require_face_verification: e.target.checked})}
              className="mb-3"
            />

            <Form.Check
              type="checkbox"
              label="Feature this election"
              checked={electionForm.is_featured}
              onChange={(e) => setElectionForm({...electionForm, is_featured: e.target.checked})}
              className="mb-3"
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditElectionModal(false)}>
              Cancel
            </Button>
            <Button variant="warning" type="submit" disabled={loading}>
              {loading ? <Spinner size="sm" /> : 'Update Election'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Create Candidate Modal */}
      <Modal show={showCandidateModal} onHide={() => setShowCandidateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add New Candidate</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateCandidate}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Full Name *</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="Enter candidate's full name"
                    value={candidateForm.full_name}
                    onChange={(e) => setCandidateForm({...candidateForm, full_name: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Candidate ID *</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="Enter candidate ID"
                    value={candidateForm.candidate_id}
                    onChange={(e) => setCandidateForm({...candidateForm, candidate_id: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Election *</Form.Label>
                  <Form.Select
                    value={candidateForm.election_id}
                    onChange={(e) => setCandidateForm({...candidateForm, election_id: e.target.value})}
                    required
                  >
                    <option value="">Select Election</option>
                    {elections.map(election => (
                      <option key={election.election_id} value={election.election_id}>
                        {election.title}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Political Party *</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="Enter political party"
                    value={candidateForm.party}
                    onChange={(e) => setCandidateForm({...candidateForm, party: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Candidate Photo and Party Logo */}
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Candidate Photo</Form.Label>
                  <Form.Control 
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'photo', 'candidate')}
                  />
                  <Form.Text className="text-muted">
                    Upload candidate's photo (recommended: 300x300px)
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Party Logo</Form.Label>
                  <Form.Control 
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'party_logo', 'candidate')}
                  />
                  <Form.Text className="text-muted">
                    Upload party logo (recommended: 200x200px)
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email *</Form.Label>
                  <Form.Control 
                    type="email" 
                    placeholder="Enter email address"
                    value={candidateForm.email}
                    onChange={(e) => setCandidateForm({...candidateForm, email: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Phone *</Form.Label>
                  <Form.Control 
                    type="tel" 
                    placeholder="Enter phone number"
                    value={candidateForm.phone}
                    onChange={(e) => setCandidateForm({...candidateForm, phone: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Biography</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                placeholder="Enter candidate's biography"
                value={candidateForm.biography}
                onChange={(e) => setCandidateForm({...candidateForm, biography: e.target.value})}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Political Agenda</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                placeholder="Enter candidate's political agenda and promises"
                value={candidateForm.agenda}
                onChange={(e) => setCandidateForm({...candidateForm, agenda: e.target.value})}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Qualifications</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={2} 
                placeholder="Enter candidate's qualifications and experience"
                value={candidateForm.qualifications}
                onChange={(e) => setCandidateForm({...candidateForm, qualifications: e.target.value})}
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Assets Declaration</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="Enter declared assets"
                    value={candidateForm.assets_declaration}
                    onChange={(e) => setCandidateForm({...candidateForm, assets_declaration: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Criminal Records</Form.Label>
                  <Form.Select
                    value={candidateForm.criminal_records}
                    onChange={(e) => setCandidateForm({...candidateForm, criminal_records: e.target.value})}
                  >
                    <option value="none">No Criminal Records</option>
                    <option value="pending">Cases Pending</option>
                    <option value="convicted">Convicted</option>
                    <option value="acquitted">Acquitted</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {/* Election Symbol */}
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Election Symbol</Form.Label>
                  <Form.Control 
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'election_symbol', 'candidate')}
                  />
                  <Form.Text className="text-muted">
                    Upload election symbol (recommended: 100x100px)
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Symbol Name</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="Enter symbol name"
                    value={candidateForm.symbol_name}
                    onChange={(e) => setCandidateForm({...candidateForm, symbol_name: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCandidateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? <Spinner size="sm" /> : 'Add Candidate'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>


      {/* Candidate Detail Modal */}
      <Modal show={showCandidateDetailModal} onHide={() => setShowCandidateDetailModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Candidate Details: {selectedCandidate?.full_name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedCandidate && (
            <Row>
              <Col md={4}>
                {selectedCandidate.photo && (
                  <Image 
                    src={selectedCandidate.photo} 
                    fluid 
                    rounded 
                    className="mb-3"
                    style={{ maxHeight: '300px', objectFit: 'cover' }}
                  />
                )}
                <Card>
                  <Card.Body>
                    <h6>Quick Information</h6>
                    <div className="mb-2">
                      <strong>Candidate ID:</strong>
                      <br />
                      <code>{selectedCandidate.candidate_id}</code>
                    </div>
                    <div className="mb-2">
                      <strong>Status:</strong>
                      <br />
                      <Badge bg={selectedCandidate.is_approved ? 'success' : 'warning'}>
                        {selectedCandidate.is_approved ? 'Approved' : 'Pending Approval'}
                      </Badge>
                    </div>
                    <div className="mb-2">
                      <strong>Vote Count:</strong>
                      <br />
                      {selectedCandidate.vote_count || 0}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={8}>
                <h4>{selectedCandidate.full_name}</h4>
                <p className="text-muted">{selectedCandidate.party}</p>
                
                <Row className="mb-3">
                  <Col md={6}>
                    <strong>Election:</strong>
                    <br />
                    {selectedCandidate.election_title}
                  </Col>
                  <Col md={6}>
                    <strong>Contact:</strong>
                    <br />
                    {selectedCandidate.email}<br />
                    {selectedCandidate.phone}
                  </Col>
                </Row>

                {selectedCandidate.biography && (
                  <div className="mb-3">
                    <strong>Biography:</strong>
                    <br />
                    <p>{selectedCandidate.biography}</p>
                  </div>
                )}

                {selectedCandidate.qualifications && (
                  <div className="mb-3">
                    <strong>Qualifications:</strong>
                    <br />
                    <p>{selectedCandidate.qualifications}</p>
                  </div>
                )}

                {selectedCandidate.agenda && (
                  <div className="mb-3">
                    <strong>Political Agenda:</strong>
                    <br />
                    <p>{selectedCandidate.agenda}</p>
                  </div>
                )}

                <Row className="mb-3">
                  <Col md={6}>
                    <strong>Criminal Records:</strong>
                    <br />
                    <Badge bg={
                      selectedCandidate.criminal_records === 'none' ? 'success' :
                      selectedCandidate.criminal_records === 'pending' ? 'warning' :
                      selectedCandidate.criminal_records === 'convicted' ? 'danger' : 'info'
                    }>
                      {selectedCandidate.criminal_records || 'none'}
                    </Badge>
                  </Col>
                  <Col md={6}>
                    <strong>Assets Declaration:</strong>
                    <br />
                    {selectedCandidate.assets_declaration || 'Not declared'}
                  </Col>
                </Row>

                {selectedCandidate.symbol_name && (
                  <div className="mb-3">
                    <strong>Election Symbol:</strong>
                    <br />
                    {selectedCandidate.symbol_name}
                    {selectedCandidate.election_symbol && (
                      <div className="mt-2">
                        <small>Symbol Image Available</small>
                      </div>
                    )}
                  </div>
                )}

                {selectedCandidate.party_logo && (
                  <div className="mb-3">
                    <strong>Party Logo:</strong>
                    <br />
                    <Image 
                      src={selectedCandidate.party_logo} 
                      width={100} 
                      height={100} 
                      rounded 
                      className="mt-2"
                    />
                  </div>
                )}
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCandidateDetailModal(false)}>
            Close
          </Button>
          <Button 
            variant="warning" 
            onClick={() => {
              setShowCandidateDetailModal(false);
              handleEditCandidate(selectedCandidate);
            }}
          >
            <FaEdit className="me-1" /> Edit Candidate
          </Button>
          {!selectedCandidate?.is_approved && (
            <Button 
              variant="success" 
              onClick={() => {
                handleApproveCandidate(selectedCandidate.candidate_id);
                setShowCandidateDetailModal(false);
              }}
            >
              <FaCheckCircle className="me-1" /> Approve Candidate
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Edit Candidate Modal */}
      <Modal show={showEditCandidateModal} onHide={() => setShowEditCandidateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Candidate: {editingCandidate?.full_name}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateCandidate}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Full Name *</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="Enter candidate's full name"
                    value={candidateForm.full_name}
                    onChange={(e) => setCandidateForm({...candidateForm, full_name: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Candidate ID *</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="Enter candidate ID"
                    value={candidateForm.candidate_id}
                    onChange={(e) => setCandidateForm({...candidateForm, candidate_id: e.target.value})}
                    required
                    disabled
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Election *</Form.Label>
                  <Form.Select
                    value={candidateForm.election_id}
                    onChange={(e) => setCandidateForm({...candidateForm, election_id: e.target.value})}
                    required
                  >
                    <option value="">Select Election</option>
                    {elections.map(election => (
                      <option key={election.election_id} value={election.election_id}>
                        {election.title}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Political Party *</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="Enter political party"
                    value={candidateForm.party}
                    onChange={(e) => setCandidateForm({...candidateForm, party: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Candidate Photo and Party Logo */}
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Candidate Photo</Form.Label>
                  <Form.Control 
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'photo', 'candidate')}
                  />
                  <Form.Text className="text-muted">
                    {editingCandidate?.photo ? 'Current photo uploaded. Upload new to replace.' : 'Upload candidate\'s photo'}
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Party Logo</Form.Label>
                  <Form.Control 
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'party_logo', 'candidate')}
                  />
                  <Form.Text className="text-muted">
                    {editingCandidate?.party_logo ? 'Current logo uploaded. Upload new to replace.' : 'Upload party logo'}
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email *</Form.Label>
                  <Form.Control 
                    type="email" 
                    placeholder="Enter email address"
                    value={candidateForm.email}
                    onChange={(e) => setCandidateForm({...candidateForm, email: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Phone *</Form.Label>
                  <Form.Control 
                    type="tel" 
                    placeholder="Enter phone number"
                    value={candidateForm.phone}
                    onChange={(e) => setCandidateForm({...candidateForm, phone: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Biography</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                placeholder="Enter candidate's biography"
                value={candidateForm.biography}
                onChange={(e) => setCandidateForm({...candidateForm, biography: e.target.value})}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Political Agenda</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                placeholder="Enter candidate's political agenda and promises"
                value={candidateForm.agenda}
                onChange={(e) => setCandidateForm({...candidateForm, agenda: e.target.value})}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Qualifications</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={2} 
                placeholder="Enter candidate's qualifications and experience"
                value={candidateForm.qualifications}
                onChange={(e) => setCandidateForm({...candidateForm, qualifications: e.target.value})}
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Assets Declaration</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="Enter declared assets"
                    value={candidateForm.assets_declaration}
                    onChange={(e) => setCandidateForm({...candidateForm, assets_declaration: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Criminal Records</Form.Label>
                  <Form.Select
                    value={candidateForm.criminal_records}
                    onChange={(e) => setCandidateForm({...candidateForm, criminal_records: e.target.value})}
                  >
                    <option value="none">No Criminal Records</option>
                    <option value="pending">Cases Pending</option>
                    <option value="convicted">Convicted</option>
                    <option value="acquitted">Acquitted</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {/* Election Symbol */}
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Election Symbol</Form.Label>
                  <Form.Control 
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'election_symbol', 'candidate')}
                  />
                  <Form.Text className="text-muted">
                    {editingCandidate?.election_symbol ? 'Current symbol uploaded. Upload new to replace.' : 'Upload election symbol'}
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Symbol Name</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="Enter symbol name"
                    value={candidateForm.symbol_name}
                    onChange={(e) => setCandidateForm({...candidateForm, symbol_name: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Approval Toggle */}
            <Form.Check
              type="checkbox"
              label="Approved Candidate"
              checked={candidateForm.is_approved}
              onChange={(e) => setCandidateForm({...candidateForm, is_approved: e.target.checked})}
              className="mb-3"
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditCandidateModal(false)}>
              Cancel
            </Button>
            <Button variant="warning" type="submit" disabled={loading}>
              {loading ? <Spinner size="sm" /> : 'Update Candidate'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Election Detail Modal */}
      <Modal show={showElectionDetailModal} onHide={() => setShowElectionDetailModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Election Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedElection && (
            <Row>
              <Col md={4}>
                {selectedElection.election_logo && (
                  <Image 
                    src={selectedElection.election_logo} 
                    fluid 
                    rounded 
                    className="mb-3"
                  />
                )}
                <Card>
                  <Card.Body>
                    <h6>Quick Stats</h6>
                    <div className="mb-2">
                      <strong>Total Candidates:</strong> {selectedElection.total_candidates || 0}
                    </div>
                    <div className="mb-2">
                      <strong>Total Votes:</strong> {selectedElection.total_votes || 0}
                    </div>
                    <div className="mb-2">
                      <strong>Voter Turnout:</strong> {selectedElection.voter_turnout || 'N/A'}%
                    </div>
                    <div className="mb-2">
                      <strong>Featured:</strong> {selectedElection.is_featured ? 'Yes' : 'No'}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={8}>
                <h4>{selectedElection.title}</h4>
                <p className="text-muted">{selectedElection.description}</p>
                
                <Row className="mb-3">
                  <Col md={6}>
                    <strong>Election ID:</strong>
                    <br />
                    <code>{selectedElection.election_id}</code>
                  </Col>
                  <Col md={6}>
                    <strong>Type:</strong>
                    <br />
                    <Badge bg="light" text="dark">{selectedElection.election_type}</Badge>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <strong>Voting Period:</strong>
                    <br />
                    {new Date(selectedElection.voting_start).toLocaleString()} - {' '}
                    {new Date(selectedElection.voting_end).toLocaleString()}
                  </Col>
                  <Col md={6}>
                    <strong>Status:</strong>
                    <br />
                    <Badge bg={
                      selectedElection.status === 'active' ? 'success' :
                      selectedElection.status === 'scheduled' ? 'warning' :
                      selectedElection.status === 'completed' ? 'secondary' : 'light'
                    }>
                      {selectedElection.status}
                    </Badge>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <strong>Constituency:</strong>
                    <br />
                    {selectedElection.constituency || 'N/A'}
                  </Col>
                  <Col md={6}>
                    <strong>District:</strong>
                    <br />
                    {selectedElection.district || 'N/A'}
                  </Col>
                </Row>

                {selectedElection.election_rules && (
                  <div className="mb-3">
                    <strong>Election Rules:</strong>
                    <br />
                    {selectedElection.election_rules}
                  </div>
                )}

                {/* Status Management */}
                <Form.Group className="mb-3">
                  <Form.Label>Change Status</Form.Label>
                  <Form.Select
                    value={selectedElection.status}
                    onChange={(e) => handleUpdateElectionStatus(selectedElection.election_id, e.target.value)}
                  >
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowElectionDetailModal(false)}>
            Close
          </Button>
          <Button 
            variant="warning" 
            onClick={() => {
              setShowElectionDetailModal(false);
              handleEditElection(selectedElection);
            }}
          >
            <FaEdit className="me-1" /> Edit Election
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Voter Detail Modal */}
      <Modal show={showVoterDetailModal} onHide={() => setShowVoterDetailModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Voter Details: {selectedVoter?.full_name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedVoter && (
            <Row>
              <Col md={6}>
                <h6>Personal Information</h6>
                <div className="mb-2">
                  <strong>Voter ID:</strong> <code>{selectedVoter.voter_id}</code>
                </div>
                <div className="mb-2">
                  <strong>Full Name:</strong> {selectedVoter.full_name}
                </div>
                <div className="mb-2">
                  <strong>Email:</strong> {selectedVoter.email}
                </div>
                <div className="mb-2">
                  <strong>Phone:</strong> {selectedVoter.phone}
                </div>
                <div className="mb-2">
                  <strong>Gender:</strong> {selectedVoter.gender}
                </div>
                <div className="mb-2">
                  <strong>Age:</strong> {selectedVoter.age} years
                </div>
                <div className="mb-2">
                  <strong>Date of Birth:</strong> {new Date(selectedVoter.date_of_birth).toLocaleDateString()}
                </div>
              </Col>
              <Col md={6}>
                <h6>Address Information</h6>
                <div className="mb-2">
                  <strong>Constituency:</strong> {selectedVoter.constituency}
                </div>
                <div className="mb-2">
                  <strong>District:</strong> {selectedVoter.district}
                </div>
                <div className="mb-2">
                  <strong>State:</strong> {selectedVoter.state}
                </div>
                <div className="mb-2">
                  <strong>Polling Station:</strong> {selectedVoter.polling_station || 'Not assigned'}
                </div>

                <h6 className="mt-4">Verification Status</h6>
                <div className="mb-2">
                  <strong>Email:</strong> 
                  <Badge bg={selectedVoter.verification_status?.email_verified ? 'success' : 'secondary'} className="ms-2">
                    {selectedVoter.verification_status?.email_verified ? 'Verified' : 'Pending'}
                  </Badge>
                </div>
                <div className="mb-2">
                  <strong>Phone:</strong> 
                  <Badge bg={selectedVoter.verification_status?.phone_verified ? 'success' : 'secondary'} className="ms-2">
                    {selectedVoter.verification_status?.phone_verified ? 'Verified' : 'Pending'}
                  </Badge>
                </div>
                <div className="mb-2">
                  <strong>ID:</strong> 
                  <Badge bg={selectedVoter.verification_status?.id_verified ? 'success' : 'secondary'} className="ms-2">
                    {selectedVoter.verification_status?.id_verified ? 'Verified' : 'Pending'}
                  </Badge>
                </div>
                <div className="mb-2">
                  <strong>Face:</strong> 
                  <Badge bg={selectedVoter.verification_status?.face_verified ? 'success' : 'secondary'} className="ms-2">
                    {selectedVoter.verification_status?.face_verified ? 'Verified' : 'Pending'}
                  </Badge>
                </div>

                <h6 className="mt-4">Voting History</h6>
                <div className="mb-2">
                  <strong>Votes Cast:</strong> {selectedVoter.votes_cast || 0}
                </div>
                {selectedVoter.voting_history && selectedVoter.voting_history.length > 0 ? (
                  <div>
                    {selectedVoter.voting_history.slice(0, 3).map((vote, index) => (
                      <div key={index} className="small text-muted">
                        {vote.election_title} - {new Date(vote.vote_timestamp).toLocaleDateString()}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted">No voting history</div>
                )}
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowVoterDetailModal(false)}>
            Close
          </Button>
          <Button 
            variant="success"
            onClick={() => handleVerifyVoter(selectedVoter?.voter_id, 'all')}
          >
            <FaCheckCircle className="me-1" /> Verify All
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminDashboard;