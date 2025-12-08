import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Table, 
  Badge, 
  Alert, 
  Spinner,
  Button,
  ProgressBar,
  Modal,
  Form,
  Tabs,
  Tab
} from 'react-bootstrap';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { voterAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  FaChartBar, 
  FaUsers, 
  FaTrophy, 
  FaDownload, 
  FaShare,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUserTie,
  FaLandmark,
  FaChartPie,
  FaArrowLeft,
  FaEye,
  FaPrint,
  FaFileExport,
  FaHome
} from 'react-icons/fa';

const ResultsPage = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [results, setResults] = useState(null);
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('results');
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    if (!electionId) {
      setError('Election ID is missing');
      setLoading(false);
      return;
    }
    
    loadResults();
  }, [electionId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await voterAPI.getElectionResults(electionId);
      
      if (response.success) {
        setResults(response.results);
        setElection(response.election);
      } else {
        setError(response.message || 'Failed to load results');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load results';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard?tab=results');
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <Spinner animation="border" variant="primary" size="lg" />
          <h4 className="mt-3">Loading Election Results...</h4>
        </div>
      </Container>
    );
  }

  if (error && !results) {
    return (
      <Container className="py-5">
        <Alert variant="danger" className="text-center">
          <FaExclamationTriangle className="me-2" />
          {error}
        </Alert>
        <div className="text-center mt-3">
          <Button variant="primary" onClick={handleBackToDashboard}>
            <FaArrowLeft className="me-2" />
            Back to Results
          </Button>
        </div>
      </Container>
    );
  }

  const getWinner = () => {
    if (!results || !results.candidates) return null;
    return results.candidates.reduce((prev, current) => 
      (prev.vote_count > current.vote_count) ? prev : current
    );
  };

  const winner = getWinner();

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Button 
              variant="outline-primary" 
              onClick={handleBackToDashboard}
              className="d-flex align-items-center"
            >
              <FaArrowLeft className="me-2" />
              Back to Results
            </Button>
            
            <div className="d-flex gap-2">
              <Button variant="outline-primary" onClick={() => window.print()}>
                <FaPrint className="me-2" />
                Print
              </Button>
            </div>
          </div>
          
          <div className="text-center">
            <h1 className="display-6 fw-bold text-primary">
              <FaChartBar className="me-3" />
              Election Results
            </h1>
            
            {election && (
              <div className="mt-3">
                <h3 className="text-dark">{election.title}</h3>
                <p className="lead text-muted">{election.description}</p>
                
                <div className="d-flex justify-content-center gap-3 flex-wrap">
                  <Badge bg="primary" className="fs-6 px-3 py-2">
                    <FaLandmark className="me-1" />
                    {election.election_type}
                  </Badge>
                  <Badge bg="info" className="fs-6 px-3 py-2">
                    <FaUsers className="me-1" />
                    {election.constituency}
                  </Badge>
                  <Badge bg="success" className="fs-6 px-3 py-2">
                    <FaClock className="me-1" />
                    Results Finalized
                  </Badge>
                  <Badge bg="secondary" className="fs-6 px-3 py-2">
                    Total Votes: {results?.total_votes || 0}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* Winner Announcement */}
      {winner && (
        <Card className="mb-4 border-success bg-success bg-opacity-10">
          <Card.Body className="text-center py-4">
            <FaTrophy className="text-warning fa-3x mb-3" />
            <h3 className="text-success">Election Winner</h3>
            <h4 className="text-dark">{winner.full_name}</h4>
            <p className="lead text-muted">{winner.party}</p>
            <div className="row justify-content-center">
              <div className="col-md-6">
                <div className="d-flex justify-content-between align-items-center">
                  <span>Votes:</span>
                  <strong>{winner.vote_count.toLocaleString()}</strong>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span>Percentage:</span>
                  <strong>{winner.percentage}%</strong>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Results Tabs */}
      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
        <Tab eventKey="results" title={
          <span>
            <FaChartBar className="me-1" />
            Results Summary
          </span>
        }>
          <ResultsSummary results={results} election={election} />
        </Tab>
        
        <Tab eventKey="candidates" title={
          <span>
            <FaUserTie className="me-1" />
            Candidates Details
          </span>
        }>
          <CandidatesDetails candidates={results?.candidates} />
        </Tab>
        
        <Tab eventKey="analytics" title={
          <span>
            <FaChartPie className="me-1" />
            Analytics
          </span>
        }>
          <ResultsAnalytics results={results} election={election} />
        </Tab>
      </Tabs>
    </Container>
  );
};

// Results Summary Component
const ResultsSummary = ({ results, election }) => {
  if (!results || !results.candidates) {
    return (
      <Alert variant="info">
        <FaExclamationTriangle className="me-2" />
        No results available yet.
      </Alert>
    );
  }

  const sortedCandidates = [...results.candidates].sort((a, b) => b.vote_count - a.vote_count);

  return (
    <Row>
      <Col lg={8}>
        <Card className="h-100">
          <Card.Header>
            <h5 className="mb-0">Vote Distribution</h5>
          </Card.Header>
          <Card.Body>
            {sortedCandidates.map((candidate, index) => (
              <div key={candidate.candidate_id} className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <div className="d-flex align-items-center">
                    {index === 0 && <FaTrophy className="text-warning me-2" />}
                    <span className="fw-semibold">
                      {candidate.full_name} ({candidate.party})
                    </span>
                  </div>
                  <div className="text-end">
                    <strong>{candidate.vote_count.toLocaleString()} votes</strong>
                    <br />
                    <small className="text-muted">{candidate.percentage}%</small>
                  </div>
                </div>
                <ProgressBar 
                  now={candidate.percentage} 
                  variant={
                    index === 0 ? 'success' :
                    index === 1 ? 'info' :
                    index === 2 ? 'warning' : 'secondary'
                  }
                  style={{ height: '12px' }}
                />
              </div>
            ))}
          </Card.Body>
        </Card>
      </Col>
      
      <Col lg={4}>
        <Card className="h-100">
          <Card.Header>
            <h5 className="mb-0">Quick Stats</h5>
          </Card.Header>
          <Card.Body>
            <div className="mb-3">
              <strong>Total Votes Cast:</strong>
              <div className="fs-4 text-primary">{results.total_votes?.toLocaleString() || 0}</div>
            </div>
            
            <div className="mb-3">
              <strong>Voter Turnout:</strong>
              <div className="fs-4 text-success">{election?.voter_turnout || 0}%</div>
            </div>
            
            <div className="mb-3">
              <strong>Number of Candidates:</strong>
              <div className="fs-4 text-info">{results.candidates.length}</div>
            </div>
            
            <div className="mb-3">
              <strong>Leading Candidate:</strong>
              <div className="text-success fw-semibold">
                {sortedCandidates[0]?.full_name}
              </div>
              <small className="text-muted">
                {sortedCandidates[0]?.party} • {sortedCandidates[0]?.vote_count.toLocaleString()} votes
              </small>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

// Candidates Details Component
const CandidatesDetails = ({ candidates }) => {
  if (!candidates || candidates.length === 0) {
    return (
      <Alert variant="info">
        <FaExclamationTriangle className="me-2" />
        No candidate data available.
      </Alert>
    );
  }

  const sortedCandidates = [...candidates].sort((a, b) => b.vote_count - a.vote_count);

  return (
    <Card>
      <Card.Header>
        <h5 className="mb-0">Candidates Performance</h5>
      </Card.Header>
      <Card.Body className="p-0">
        <Table responsive hover>
          <thead className="bg-light">
            <tr>
              <th>Rank</th>
              <th>Candidate</th>
              <th>Party</th>
              <th>Votes</th>
              <th>Percentage</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedCandidates.map((candidate, index) => (
              <tr key={candidate.candidate_id}>
                <td>
                  <Badge bg={
                    index === 0 ? 'success' :
                    index === 1 ? 'info' :
                    index === 2 ? 'warning' : 'secondary'
                  }>
                    #{index + 1}
                  </Badge>
                </td>
                <td>
                  <div className="d-flex align-items-center">
                    {candidate.photo && (
                      <img
                        src={candidate.photo}
                        className="rounded-circle me-3"
                        style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                        alt={candidate.full_name}
                      />
                    )}
                    <div>
                      <strong>{candidate.full_name}</strong>
                      {candidate.candidate_number && (
                        <small className="d-block text-muted">
                          Candidate #{candidate.candidate_number}
                        </small>
                      )}
                    </div>
                  </div>
                </td>
                <td>
                  <div className="d-flex align-items-center">
                    {candidate.party_symbol && (
                      <img
                        src={candidate.party_symbol}
                        className="rounded me-2"
                        style={{ width: '30px', height: '30px', objectFit: 'contain' }}
                        alt={candidate.party}
                      />
                    )}
                    <span>{candidate.party}</span>
                  </div>
                </td>
                <td>
                  <strong>{candidate.vote_count.toLocaleString()}</strong>
                </td>
                <td>
                  <div className="d-flex align-items-center">
                    <ProgressBar 
                      now={candidate.percentage} 
                      style={{ width: '60px', height: '8px' }}
                      className="me-2"
                    />
                    <span>{candidate.percentage}%</span>
                  </div>
                </td>
                <td>
                  <Badge bg={index === 0 ? 'success' : 'secondary'}>
                    {index === 0 ? 'Winner' : 'Contested'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
};

// Results Analytics Component
const ResultsAnalytics = ({ results, election }) => {
  if (!results) {
    return (
      <Alert variant="info">
        <FaExclamationTriangle className="me-2" />
        No analytics data available.
      </Alert>
    );
  }

  return (
    <Row>
      <Col md={6} className="mb-4">
        <Card className="h-100">
          <Card.Header>
            <h6 className="mb-0">Vote Distribution</h6>
          </Card.Header>
          <Card.Body>
            {results.candidates?.slice(0, 5).map((candidate, index) => (
              <div key={candidate.candidate_id} className="mb-2">
                <div className="d-flex justify-content-between">
                  <span>{candidate.full_name}</span>
                  <span>{candidate.percentage}%</span>
                </div>
                <ProgressBar 
                  now={candidate.percentage} 
                  variant={['success', 'info', 'warning', 'secondary', 'dark'][index]}
                />
              </div>
            ))}
          </Card.Body>
        </Card>
      </Col>
      
      <Col md={6} className="mb-4">
        <Card className="h-100">
          <Card.Header>
            <h6 className="mb-0">Election Statistics</h6>
          </Card.Header>
          <Card.Body>
            <div className="mb-3">
              <small className="text-muted">Total Eligible Voters</small>
              <div className="fs-5">{election?.total_voters?.toLocaleString() || 'N/A'}</div>
            </div>
            
            <div className="mb-3">
              <small className="text-muted">Votes Cast</small>
              <div className="fs-5 text-primary">{results.total_votes?.toLocaleString() || 0}</div>
            </div>
            
            <div className="mb-3">
              <small className="text-muted">Voter Turnout</small>
              <div className="fs-5 text-success">{election?.voter_turnout || 0}%</div>
            </div>
            
            <div className="mb-3">
              <small className="text-muted">Margin of Victory</small>
              <div className="fs-5 text-warning">
                {results.candidates && results.candidates.length > 1 ? 
                  `${(results.candidates[0].percentage - results.candidates[1].percentage).toFixed(2)}%` : 
                  'N/A'
                }
              </div>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default ResultsPage;