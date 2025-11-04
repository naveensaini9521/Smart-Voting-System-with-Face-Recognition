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
  Pagination
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
  FaFilter
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
    require_face_verification: true
  });
  
  const [candidateForm, setCandidateForm] = useState({
    election_id: '',
    full_name: '',
    party: '',
    biography: '',
    email: '',
    phone: ''
  });

  // Pagination states
  const [pagination, setPagination] = useState({
    voters: { page: 1, per_page: 10, total: 0 },
    elections: { page: 1, per_page: 10, total: 0 },
    audit: { page: 1, per_page: 10, total: 0 }
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
      const response = await adminAPI.createElection(electionForm);
      if (response.success) {
        setSuccess('Election created successfully!');
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
          max_candidates: 1,
          require_face_verification: true
        });
        loadElections();
      } else {
        setError(response.message || 'Failed to create election');
      }
    } catch (error) {
      console.error('Error creating election:', error);
      setError('Failed to create election');
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
        // Reload candidates if on candidates tab
      } else {
        setError(response.message || 'Failed to approve candidate');
      }
    } catch (error) {
      console.error('Error approving candidate:', error);
      setError('Failed to approve candidate');
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
                  <th>Title</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Voting Period</th>
                  <th>Candidates</th>
                  <th>Votes</th>
                </tr>
              </thead>
              <tbody>
                {elections.slice(0, 5).map(election => (
                  <tr key={election.election_id}>
                    <td>
                      <strong>{election.title}</strong>
                      <br />
                      <small className="text-muted">{election.election_id}</small>
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
                  <th>Title</th>
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
                      <strong>{election.title}</strong>
                      <br />
                      <small className="text-muted">{election.election_id}</small>
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
                      <Button size="sm" variant="outline-primary" className="me-1" title="View">
                        <FaEye />
                      </Button>
                      <Button size="sm" variant="outline-warning" className="me-1" title="Edit">
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
        <h5 className="mb-0">Manage Candidates</h5>
        <Button variant="primary" onClick={() => setShowCandidateModal(true)}>
          <FaPlus className="me-1" /> Add Candidate
        </Button>
      </Card.Header>
      <Card.Body>
        <div className="text-center py-5">
          <FaUserCheck className="text-muted fa-3x mb-3" />
          <h5>Candidate Management</h5>
          <p className="text-muted">Manage election candidates and their approvals</p>
          <Button variant="primary" onClick={() => setShowCandidateModal(true)}>
            <FaPlus className="me-1" /> Add New Candidate
          </Button>
        </div>
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
                      <Badge bg="info">{log.action}</Badge>
                    </td>
                    <td>
                      <code>{log.user_id}</code>
                      <br />
                      <small className="text-muted">{log.user_type}</small>
                    </td>
                    <td>{log.details}</td>
                    <td>
                      <code>{log.ip_address}</code>
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
                      <FaUserCheck className="me-2" />
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

            <Form.Check
              type="checkbox"
              label="Require Face Verification"
              checked={electionForm.require_face_verification}
              onChange={(e) => setElectionForm({...electionForm, require_face_verification: e.target.checked})}
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
    </div>
  );
};

export default AdminDashboard;