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
  Image
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
  FaUserTie
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
    max_candidates: 1,
    require_face_verification: true,
    election_logo: null,
    election_banner: null,
    election_rules: '',
    results_visibility: 'after_voting',
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
  const [editingElection, setEditingElection] = useState(null);
  const [editingCandidate, setEditingCandidate] = useState(null);

  // Pagination states
  const [pagination, setPagination] = useState({
    voters: { page: 1, per_page: 10, total: 0 },
    elections: { page: 1, per_page: 10, total: 0 },
    audit: { page: 1, per_page: 10, total: 0 },
    candidates: { page: 1, per_page: 10, total: 0 }
  });

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
    }
  }, [activeTab]);

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
    try {
      const response = await adminAPI.getVoters({ page, per_page: pagination.voters.per_page });
      if (response.success) {
        setVoters(response.voters);
        setPagination(prev => ({
          ...prev,
          voters: {
            ...response.pagination,
            page: response.pagination.page || page
          }
        }));
      }
    } catch (error) {
      console.error('Error loading voters:', error);
      setError('Failed to load voters');
    } finally {
      setLoading(false);
    }
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

  const handleCreateElection = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      
      // Append all election form fields to FormData
      Object.keys(electionForm).forEach(key => {
        if (key === 'election_logo' || key === 'election_banner') {
          if (electionForm[key]) {
            formData.append(key, electionForm[key]);
          }
        } else if (key === 'allowed_voter_groups') {
          // Handle array fields
          formData.append(key, JSON.stringify(electionForm[key]));
        } else if (key === 'require_face_verification' || key === 'is_featured') {
          // Handle boolean fields
          formData.append(key, electionForm[key].toString());
        } else {
          // Handle regular fields
          formData.append(key, electionForm[key] || '');
        }
      });

      console.log('Creating election with data:', Object.fromEntries(formData));
      
      const response = await adminAPI.createElection(formData);
      console.log('Election creation response:', response);
      
      if (response.success) {
        setSuccess(`Election created successfully! Status: ${response.status_message}`);
        setShowElectionModal(false);
        
        // Reset form
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

  const handleCreateCandidate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      
      // Append all candidate form fields to FormData
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

  // Edit Election Handler
  const handleEditElection = async (election) => {
    setLoading(true);
    try {
      const response = await adminAPI.getElectionForEdit(election.election_id);
      if (response.success) {
        const electionData = response.election;
        
        // Format dates for datetime-local input
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
          election_logo: null, // Don't pre-fill files
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

  // Update Election Handler
  const handleUpdateElection = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      
      // Append all election form fields to FormData
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
        
        // Reset form
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
        
        // Reload data
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

  // Edit Candidate Handler
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

  // Update Candidate Handler
  const handleUpdateCandidate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      
      // Append all candidate form fields to FormData
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
        
        // Reset form
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
        
        // Reload data
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
      setError('Failed to verify voter');
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
                      <Button size="sm" variant="outline-danger" title="Delete">
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
        <h5 className="mb-0">Manage Voters ({pagination.voters.total})</h5>
        <div>
          <Button size="sm" variant="outline-secondary" className="me-2">
            <FaFilter className="me-1" /> Filter
          </Button>
          <Button size="sm" variant="outline-secondary">
            <FaSearch className="me-1" /> Search
          </Button>
        </div>
      </Card.Header>
      <Card.Body>
        {voters.length === 0 ? (
          <div className="text-center py-5">
            <FaUsers className="text-muted fa-3x mb-3" />
            <h5>No voters found</h5>
            <p className="text-muted">Voters will appear here once they register</p>
          </div>
        ) : (
          <>
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
                  <tr key={voter.voter_id}>
                    <td>
                      <code>{voter.voter_id}</code>
                    </td>
                    <td>
                      <strong>{voter.full_name}</strong>
                      <br />
                      <small className="text-muted">{voter.gender} • {voter.age} years</small>
                    </td>
                    <td>{voter.email}</td>
                    <td>{voter.phone}</td>
                    <td>
                      <div>
                        <Badge bg={voter.verification_status.email_verified ? 'success' : 'secondary'} className="me-1">
                          Email
                        </Badge>
                        <Badge bg={voter.verification_status.phone_verified ? 'success' : 'secondary'} className="me-1">
                          Phone
                        </Badge>
                        <Badge bg={voter.verification_status.id_verified ? 'success' : 'secondary'} className="me-1">
                          ID
                        </Badge>
                        <Badge bg={voter.verification_status.face_verified ? 'success' : 'secondary'}>
                          Face
                        </Badge>
                      </div>
                    </td>
                    <td>
                      {new Date(voter.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="btn-group">
                        <Button 
                          size="sm" 
                          variant="outline-success" 
                          title="Verify All"
                          onClick={() => handleVerifyVoter(voter.voter_id, 'all')}
                        >
                          <FaCheckCircle />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline-primary" 
                          title="View Details"
                        >
                          <FaEye />
                        </Button>
                        {voter.is_active ? (
                          <Button 
                            size="sm" 
                            variant="outline-warning" 
                            title="Deactivate"
                            onClick={() => handleUpdateVoterStatus(voter.voter_id, 'inactive')}
                          >
                            <FaTimesCircle />
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline-success" 
                            title="Activate"
                            onClick={() => handleUpdateVoterStatus(voter.voter_id, 'active')}
                          >
                            <FaCheckCircle />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            
            {/* Pagination */}
            {pagination.voters.total_pages > 1 && (
              <div className="d-flex justify-content-center mt-3">
                <Pagination>
                  <Pagination.Prev 
                    disabled={pagination.voters.page === 1}
                    onClick={() => loadVoters(pagination.voters.page - 1)}
                  />
                  {[...Array(pagination.voters.total_pages)].map((_, i) => (
                    <Pagination.Item
                      key={i + 1}
                      active={i + 1 === pagination.voters.page}
                      onClick={() => loadVoters(i + 1)}
                    >
                      {i + 1}
                    </Pagination.Item>
                  ))}
                  <Pagination.Next 
                    disabled={pagination.voters.page === pagination.voters.total_pages}
                    onClick={() => loadVoters(pagination.voters.page + 1)}
                  />
                </Pagination>
              </div>
            )}
          </>
        )}
      </Card.Body>
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
                        candidate.status === 'approved' ? 'success' :
                        candidate.status === 'pending' ? 'warning' :
                        candidate.status === 'rejected' ? 'danger' : 'secondary'
                      }>
                        {candidate.status}
                      </Badge>
                    </td>
                    <td>
                      <small>
                        {candidate.email}<br/>
                        {candidate.phone}
                      </small>
                    </td>
                    <td>
                      {candidate.status === 'pending' && (
                        <Button 
                          size="sm" 
                          variant="success" 
                          onClick={() => handleApproveCandidate(candidate.candidate_id)}
                        >
                          <FaCheckCircle className="me-1" /> Approve
                        </Button>
                      )}
                      {candidate.status === 'approved' && (
                        <Badge bg="success">Approved</Badge>
                      )}
                    </td>
                    <td>
                      <Button size="sm" variant="outline-primary" className="me-1" title="View">
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
                      <Button size="sm" variant="outline-danger" title="Delete">
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
                  <th>Status</th>
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
                      {/* Safely render details - handle both string and object */}
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
                    <td>
                      <Badge bg={log.status === 'success' ? 'success' : 'danger'}>
                        {log.status || 'unknown'}
                      </Badge>
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

  const renderReports = () => (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-white">
        <h5 className="mb-0">Reports & Analytics</h5>
      </Card.Header>
      <Card.Body>
        <div className="text-center py-5">
          <FaChartBar className="text-muted fa-3x mb-3" />
          <h5>Analytics Dashboard</h5>
          <p className="text-muted">Detailed reports and analytics will be available here</p>
          <Row>
            <Col md={4} className="mb-3">
              <Card>
                <Card.Body className="text-center">
                  <h3>{stats.total_votes || 0}</h3>
                  <p className="text-muted mb-0">Total Votes</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-3">
              <Card>
                <Card.Body className="text-center">
                  <h3>{stats.verified_voters || 0}</h3>
                  <p className="text-muted mb-0">Verified Voters</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-3">
              <Card>
                <Card.Body className="text-center">
                  <h3>{stats.active_elections || 0}</h3>
                  <p className="text-muted mb-0">Active Elections</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
      </Card.Body>
    </Card>
  );

  const renderSettings = () => (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-white">
        <h5 className="mb-0">System Settings</h5>
      </Card.Header>
      <Card.Body>
        <div className="text-center py-5">
          <FaCog className="text-muted fa-3x mb-3" />
          <h5>System Configuration</h5>
          <p className="text-muted">System settings and configuration options</p>
          <Alert variant="info">
            <strong>Admin Account:</strong> {admin?.username}
            <br />
            <strong>Role:</strong> {admin?.role}
            <br />
            <strong>Access Level:</strong> {admin?.access_level}
          </Alert>
        </div>
      </Card.Body>
    </Card>
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
                    <option value="after_voting">After Voting Period</option>
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
                    <option value="after_voting">After Voting Period</option>
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
                    disabled // Usually candidate ID shouldn't be changed
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
    </div>
  );
};

export default AdminDashboard;