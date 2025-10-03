import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Table,
  Badge,
  Spinner,
  Alert,
  Modal,
  Form,
  Nav,
  Tabs,
  Tab
} from 'react-bootstrap';
import {
  Gear,
  People,
  Calendar,
  BarChart,
  ShieldCheck,
  Plus,
  Pencil,
  Trash,
  Eye,
  CheckCircle,
  XCircle,
  Clock
} from 'react-bootstrap-icons';
import { useAuth } from '../context/AuthContext';

// Admin Sub-components
const Dashboard = () => {
  const [stats, setStats] = useState({
    totalElections: 0,
    activeElections: 0,
    totalVoters: 0,
    totalVotes: 0
  });

  useEffect(() => {
    // Mock stats data
    setStats({
      totalElections: 12,
      activeElections: 3,
      totalVoters: 15600,
      totalVotes: 12450
    });
  }, []);

  return (
    <div>
      <h4 className="mb-4">Admin Dashboard</h4>
      
      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="text-center">
            <Card.Body>
              <Calendar size={24} className="text-primary mb-2" />
              <h3>{stats.totalElections}</h3>
              <p className="text-muted mb-0">Total Elections</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center">
            <Card.Body>
              <Clock size={24} className="text-warning mb-2" />
              <h3>{stats.activeElections}</h3>
              <p className="text-muted mb-0">Active Elections</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center">
            <Card.Body>
              <People size={24} className="text-success mb-2" />
              <h3>{stats.totalVoters.toLocaleString()}</h3>
              <p className="text-muted mb-0">Registered Voters</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center">
            <Card.Body>
              <BarChart size={24} className="text-info mb-2" />
              <h3>{stats.totalVotes.toLocaleString()}</h3>
              <p className="text-muted mb-0">Total Votes Cast</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Activity */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">Recent Activity</h5>
        </Card.Header>
        <Card.Body>
          <Table responsive>
            <thead>
              <tr>
                <th>Election</th>
                <th>Status</th>
                <th>Votes Cast</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Student Council Election 2024</td>
                <td><Badge bg="success">Completed</Badge></td>
                <td>1,256 / 1,500</td>
                <td>2 hours ago</td>
                <td>
                  <Button variant="outline-primary" size="sm">
                    <Eye className="me-1" /> View
                  </Button>
                </td>
              </tr>
              <tr>
                <td>Class Representative Election</td>
                <td><Badge bg="warning">Active</Badge></td>
                <td>456 / 800</td>
                <td>5 minutes ago</td>
                <td>
                  <Button variant="outline-primary" size="sm">
                    <Eye className="me-1" /> Monitor
                  </Button>
                </td>
              </tr>
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
};

const ElectionsManagement = () => {
  const [elections, setElections] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock elections data
    setTimeout(() => {
      setElections([
        {
          id: 1,
          title: 'Student Council Election 2024',
          category: 'Student Council',
          startDate: '2024-01-15',
          endDate: '2024-01-20',
          status: 'completed',
          totalVoters: 1500,
          votesCast: 1256,
          candidates: 8
        },
        {
          id: 2,
          title: 'Class Representative Election',
          category: 'Academic',
          startDate: '2024-02-01',
          endDate: '2024-02-05',
          status: 'active',
          totalVoters: 800,
          votesCast: 456,
          candidates: 12
        },
        {
          id: 3,
          title: 'Sports Committee Election',
          category: 'Sports',
          startDate: '2024-03-01',
          endDate: '2024-03-05',
          status: 'upcoming',
          totalVoters: 600,
          votesCast: 0,
          candidates: 6
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusVariant = (status) => {
    switch (status) {
      case 'active': return 'warning';
      case 'completed': return 'success';
      case 'upcoming': return 'info';
      default: return 'secondary';
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">Elections Management</h4>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="me-2" /> Create Election
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading elections...</p>
        </div>
      ) : (
        <Card>
          <Card.Body>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Election Title</th>
                  <th>Category</th>
                  <th>Dates</th>
                  <th>Status</th>
                  <th>Participation</th>
                  <th>Candidates</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {elections.map(election => (
                  <tr key={election.id}>
                    <td>
                      <strong>{election.title}</strong>
                    </td>
                    <td>{election.category}</td>
                    <td>
                      <small>
                        {election.startDate} to {election.endDate}
                      </small>
                    </td>
                    <td>
                      <Badge bg={getStatusVariant(election.status)}>
                        {election.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td>
                      <div>
                        {election.votesCast} / {election.totalVoters}
                        <div className="progress" style={{ height: '5px' }}>
                          <div 
                            className="progress-bar" 
                            style={{ width: `${(election.votesCast / election.totalVoters) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td>{election.candidates}</td>
                    <td>
                      <Button variant="outline-primary" size="sm" className="me-1">
                        <Pencil size={12} />
                      </Button>
                      <Button variant="outline-success" size="sm" className="me-1">
                        <Eye size={12} />
                      </Button>
                      <Button variant="outline-danger" size="sm">
                        <Trash size={12} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* Create Election Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create New Election</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Election Title</Form.Label>
                  <Form.Control type="text" placeholder="Enter election title" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Category</Form.Label>
                  <Form.Select>
                    <option>Student Council</option>
                    <option>Academic</option>
                    <option>Sports</option>
                    <option>Cultural</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control type="datetime-local" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>End Date</Form.Label>
                  <Form.Control type="datetime-local" />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={3} placeholder="Enter election description" />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => setShowCreateModal(false)}>
            Create Election
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

const VotersManagement = () => {
  const [voters, setVoters] = useState([]);

  useEffect(() => {
    // Mock voters data
    setVoters([
      { id: 1, name: 'John Doe', email: 'john@university.edu', status: 'verified', lastLogin: '2024-01-20' },
      { id: 2, name: 'Jane Smith', email: 'jane@university.edu', status: 'pending', lastLogin: '2024-01-19' },
      { id: 3, name: 'Mike Johnson', email: 'mike@university.edu', status: 'verified', lastLogin: '2024-01-18' },
    ]);
  }, []);

  return (
    <div>
      <h4 className="mb-4">Voters Management</h4>
      <Card>
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <span>Registered Voters</span>
            <Button variant="outline-primary" size="sm">
              <Plus className="me-1" /> Add Voter
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {voters.map(voter => (
                <tr key={voter.id}>
                  <td>{voter.name}</td>
                  <td>{voter.email}</td>
                  <td>
                    <Badge bg={voter.status === 'verified' ? 'success' : 'warning'}>
                      {voter.status}
                    </Badge>
                  </td>
                  <td>{voter.lastLogin}</td>
                  <td>
                    <Button variant="outline-primary" size="sm" className="me-1">
                      <Pencil size={12} />
                    </Button>
                    <Button variant="outline-danger" size="sm">
                      <Trash size={12} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
};

const SystemSettings = () => {
  const [settings, setSettings] = useState({
    faceVerification: true,
    resultVisibility: 'after_end',
    maxVotesPerElection: 1,
    voterRegistration: true
  });

  return (
    <div>
      <h4 className="mb-4">System Settings</h4>
      <Card>
        <Card.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                label="Enable Face Verification"
                checked={settings.faceVerification}
                onChange={(e) => setSettings({...settings, faceVerification: e.target.checked})}
              />
              <Form.Text className="text-muted">
                Require face verification for voting
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Result Visibility</Form.Label>
              <Form.Select value={settings.resultVisibility}>
                <option value="after_end">After Election Ends</option>
                <option value="immediate">Immediate</option>
                <option value="manual">Manual Release</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Maximum Votes Per Election</Form.Label>
              <Form.Control 
                type="number" 
                value={settings.maxVotesPerElection}
                min="1"
                max="10"
              />
            </Form.Group>

            <Button variant="primary">Save Settings</Button>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

// Main Admin Component
const AdminPage = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Redirect if not admin
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/admin/voters')) return 'voters';
    if (path.includes('/admin/settings')) return 'settings';
    return 'dashboard';
  };

  return (
    <Container fluid className="my-4">
      <Row>
        <Col md={3} lg={2}>
          {/* Sidebar Navigation */}
          <Card className="sticky-top" style={{ top: '100px' }}>
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">
                <Gear className="me-2" />
                Admin Panel
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              <Nav variant="pills" className="flex-column">
                <Nav.Item>
                  <Nav.Link 
                    as={Link} 
                    to="/admin" 
                    className="border-0 rounded-0"
                    active={getActiveTab() === 'dashboard'}
                  >
                    <BarChart className="me-2" />
                    Dashboard
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    as={Link} 
                    to="/admin/elections" 
                    className="border-0 rounded-0"
                    active={getActiveTab() === 'elections'}
                  >
                    <Calendar className="me-2" />
                    Elections
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    as={Link} 
                    to="/admin/voters" 
                    className="border-0 rounded-0"
                    active={getActiveTab() === 'voters'}
                  >
                    <People className="me-2" />
                    Voters
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    as={Link} 
                    to="/admin/settings" 
                    className="border-0 rounded-0"
                    active={getActiveTab() === 'settings'}
                  >
                    <ShieldCheck className="me-2" />
                    Settings
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </Card.Body>
          </Card>
        </Col>

        <Col md={9} lg={10}>
          {/* Admin Content */}
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/elections" element={<ElectionsManagement />} />
            <Route path="/voters" element={<VotersManagement />} />
            <Route path="/settings" element={<SystemSettings />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminPage;