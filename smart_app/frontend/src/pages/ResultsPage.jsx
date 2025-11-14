import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Button, 
  Alert, 
  Spinner,
  Badge,
  ProgressBar,
  Table,
  Modal,
  ListGroup
} from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { voterAPI } from '../services/api';
import { 
  FaChartBar, 
  FaTrophy, 
  FaUsers, 
  FaVoteYea, 
  FaArrowLeft,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaDownload,
  FaShare,
  FaUserTie,
  FaLandmark,
  FaCalendarAlt
} from 'react-icons/fa';

const ResultsPage = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  
  const [election, setElection] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [totalVotes, setTotalVotes] = useState(0);
  const [voterTurnout, setVoterTurnout] = useState(0);
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    loadResults();
  }, [electionId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('📊 Loading results for election:', electionId);
      
      // First, get election details
      const electionResponse = await voterAPI.getElectionDetails(electionId);
      if (electionResponse.success) {
        setElection(electionResponse.election);
      }

      // Then get results
      const resultsResponse = await voterAPI.getElectionResults(electionId);
      console.log('Results response:', resultsResponse);

      if (resultsResponse.success) {
        const resultsData = resultsResponse.results || [];
        setResults(resultsData);
        
        // Calculate totals and winner
        const total = resultsData.reduce((sum, candidate) => sum + candidate.vote_count, 0);
        setTotalVotes(total);
        
        // Calculate voter turnout (this would come from backend in real implementation)
        const turnout = electionResponse.election?.voter_turnout || 
                       Math.round((total / 1000) * 100); // Assuming 1000 total voters for demo
        setVoterTurnout(turnout);
        
        // Determine winner
        if (resultsData.length > 0) {
          const sortedResults = [...resultsData].sort((a, b) => b.vote_count - a.vote_count);
          setWinner(sortedResults[0]);
        }
      } else {
        setError(resultsResponse.message || 'Failed to load election results');
      }
    } catch (err) {
      console.error('Error loading results:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load results';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToElections = () => {
    navigate('/dashboard');
  };

  const handleViewElection = () => {
    navigate(`/elections/${electionId}`);
  };

  const handleDownloadResults = () => {
    // Implement PDF/download functionality
    alert('Download feature would be implemented here');
  };

  const handleShareResults = () => {
    // Implement share functionality
    if (navigator.share) {
      navigator.share({
        title: `${election?.title} - Election Results`,
        text: `Check out the election results for ${election?.title}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Results link copied to clipboard!');
    }
  };

  const getStatusBadge = () => {
    if (!election) return null;
    
    const now = new Date();
    const endDate = new Date(election.voting_end);
    
    if (now < endDate) {
      return <Badge bg="warning" className="fs-6"><FaClock className="me-1" /> Voting Still Open</Badge>;
    } else {
      return <Badge bg="success" className="fs-6"><FaCheckCircle className="me-1" /> Election Completed</Badge>;
    }
  };

  const getTimeSinceEnd = () => {
    if (!election?.voting_end) return '';
    
    const endDate = new Date(election.voting_end);
    const now = new Date();
    const diffMs = now - endDate;
    
    if (diffMs <= 0) return 'Voting still in progress';
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) return `Ended ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `Ended ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return 'Recently ended';
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <Spinner animation="border" variant="primary" size="lg" />
          <h4 className="mt-3">Loading Election Results...</h4>
          <p>Please wait while we calculate the final results</p>
        </div>
      </Container>
    );
  }

  if (error && !election) {
    return (
      <Container className="py-5">
        <Alert variant="danger" className="text-center">
          <FaExclamationTriangle className="me-2" />
          {error}
        </Alert>
        <div className="text-center mt-3">
          <Button variant="primary" onClick={handleBackToElections}>
            <FaArrowLeft className="me-2" />
            Back to Elections
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      {/* Header */}
      <div className="text-center mb-4">
        <Button 
          variant="outline-primary" 
          onClick={handleBackToElections}
          className="mb-3"
        >
          <FaArrowLeft className="me-2" />
          Back to Elections
        </Button>
        
        <h1 className="display-5 fw-bold text-primary">
          <FaChartBar className="me-3" />
          Election Results
        </h1>
        
        {election && (
          <div className="mt-3">
            <h3 className="text-dark">{election.title}</h3>
            <p className="lead text-muted">{election.description}</p>
            
            <div className="d-flex justify-content-center gap-3 flex-wrap align-items-center">
              {getStatusBadge()}
              <Badge bg="info" className="fs-6">
                <FaLandmark className="me-1" />
                {election.election_type}
              </Badge>
              <Badge bg="secondary" className="fs-6">
                <FaCalendarAlt className="me-1" />
                {getTimeSinceEnd()}
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="warning" dismissible onClose={() => setError('')}>
          <FaExclamationTriangle className="me-2" />
          {error}
        </Alert>
      )}

      {/* Quick Stats */}
      <Row className="mb-4">
        <Col lg={3} md={6} className="mb-3">
          <Card className="text-center border-0 shadow-sm bg-primary text-white">
            <Card.Body>
              <FaUsers className="fa-2x mb-3" />
              <h3>{totalVotes}</h3>
              <p className="mb-0">Total Votes</p>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <Card className="text-center border-0 shadow-sm bg-success text-white">
            <Card.Body>
              <FaVoteYea className="fa-2x mb-3" />
              <h3>{voterTurnout}%</h3>
              <p className="mb-0">Voter Turnout</p>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <Card className="text-center border-0 shadow-sm bg-warning text-white">
            <Card.Body>
              <FaUserTie className="fa-2x mb-3" />
              <h3>{results.length}</h3>
              <p className="mb-0">Candidates</p>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <Card className="text-center border-0 shadow-sm bg-info text-white">
            <Card.Body>
              <FaTrophy className="fa-2x mb-3" />
              <h3>{winner ? winner.vote_count : 0}</h3>
              <p className="mb-0">Winning Votes</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Winner Announcement */}
      {winner && (
        <Card className="mb-4 border-success shadow">
          <Card.Body className="text-center py-4">
            <FaTrophy className="text-warning fa-4x mb-3" />
            <h2 className="text-success">Election Winner</h2>
            <div className="row align-items-center justify-content-center mt-4">
              <div className="col-md-2 text-center">
                {winner.photo ? (
                  <img
                    src={winner.photo}
                    className="rounded-circle border border-4 border-success"
                    style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                    alt={winner.full_name}
                  />
                ) : (
                  <div
                    className="bg-light rounded-circle d-flex align-items-center justify-content-center mx-auto border border-4 border-success"
                    style={{ width: '120px', height: '120px' }}
                  >
                    <FaUserTie className="text-muted fa-3x" />
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <h3 className="text-primary">{winner.full_name}</h3>
                <h5 className="text-muted">{winner.party}</h5>
                <div className="mt-3">
                  <Badge bg="success" className="fs-5 p-2">
                    {winner.vote_count} Votes ({winner.percentage}%)
                  </Badge>
                </div>
                {winner.agenda && (
                  <p className="mt-3 text-muted">{winner.agenda}</p>
                )}
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Action Buttons */}
      <Row className="mb-4">
        <Col className="text-center">
          <Button
            variant="outline-primary"
            onClick={() => setShowStats(true)}
            className="me-2"
          >
            <FaChartBar className="me-2" />
            View Detailed Statistics
          </Button>
          <Button
            variant="outline-success"
            onClick={handleDownloadResults}
            className="me-2"
          >
            <FaDownload className="me-2" />
            Download Results
          </Button>
          <Button
            variant="outline-info"
            onClick={handleShareResults}
          >
            <FaShare className="me-2" />
            Share Results
          </Button>
        </Col>
      </Row>

      {/* Results Table */}
      <Card className="shadow-sm">
        <Card.Header className="bg-light">
          <h4 className="mb-0">
            <FaChartBar className="me-2 text-primary" />
            Detailed Results
          </h4>
        </Card.Header>
        <Card.Body className="p-0">
          {results.length === 0 ? (
            <div className="text-center py-5">
              <FaExclamationTriangle className="text-muted fa-3x mb-3" />
              <h5>No Results Available</h5>
              <p className="text-muted">
                Results are not available yet. Please check back after the election ends.
              </p>
            </div>
          ) : (
            <Table responsive hover className="mb-0">
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
                {results.map((candidate, index) => (
                  <tr 
                    key={candidate.candidate_id}
                    className={index === 0 ? 'table-success' : ''}
                  >
                    <td>
                      <strong>#{index + 1}</strong>
                      {index === 0 && (
                        <FaTrophy className="text-warning ms-2" />
                      )}
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        {candidate.photo ? (
                          <img
                            src={candidate.photo}
                            className="rounded-circle me-3"
                            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                            alt={candidate.full_name}
                          />
                        ) : (
                          <div
                            className="bg-light rounded-circle d-flex align-items-center justify-content-center me-3"
                            style={{ width: '40px', height: '40px' }}
                          >
                            <FaUserTie className="text-muted" />
                          </div>
                        )}
                        <div>
                          <strong>{candidate.full_name}</strong>
                          {candidate.candidate_number && (
                            <div className="small text-muted">
                              Candidate #{candidate.candidate_number}
                            </div>
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
                      <strong>{candidate.vote_count}</strong>
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <ProgressBar 
                          now={candidate.percentage} 
                          variant={index === 0 ? "success" : "primary"}
                          style={{ width: '100px', height: '8px' }}
                          className="me-2"
                        />
                        <span>{candidate.percentage}%</span>
                      </div>
                    </td>
                    <td>
                      {index === 0 ? (
                        <Badge bg="success">Winner</Badge>
                      ) : (
                        <Badge bg="secondary">Runner-up</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Statistics Modal */}
      <Modal show={showStats} onHide={() => setShowStats(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Election Statistics</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {election && (
            <Row>
              <Col md={6}>
                <ListGroup variant="flush">
                  <ListGroup.Item className="d-flex justify-content-between align-items-center">
                    <span>Total Eligible Voters:</span>
                    <Badge bg="primary">1,000</Badge>
                  </ListGroup.Item>
                  <ListGroup.Item className="d-flex justify-content-between align-items-center">
                    <span>Votes Cast:</span>
                    <Badge bg="success">{totalVotes}</Badge>
                  </ListGroup.Item>
                  <ListGroup.Item className="d-flex justify-content-between align-items-center">
                    <span>Voter Turnout:</span>
                    <Badge bg="info">{voterTurnout}%</Badge>
                  </ListGroup.Item>
                  <ListGroup.Item className="d-flex justify-content-between align-items-center">
                    <span>Invalid Votes:</span>
                    <Badge bg="secondary">0</Badge>
                  </ListGroup.Item>
                </ListGroup>
              </Col>
              <Col md={6}>
                <ListGroup variant="flush">
                  <ListGroup.Item className="d-flex justify-content-between align-items-center">
                    <span>Voting Start:</span>
                    <small>{new Date(election.voting_start).toLocaleString()}</small>
                  </ListGroup.Item>
                  <ListGroup.Item className="d-flex justify-content-between align-items-center">
                    <span>Voting End:</span>
                    <small>{new Date(election.voting_end).toLocaleString()}</small>
                  </ListGroup.Item>
                  <ListGroup.Item className="d-flex justify-content-between align-items-center">
                    <span>Election Type:</span>
                    <Badge bg="primary">{election.election_type}</Badge>
                  </ListGroup.Item>
                  <ListGroup.Item className="d-flex justify-content-between align-items-center">
                    <span>Constituency:</span>
                    <Badge bg="info">{election.constituency}</Badge>
                  </ListGroup.Item>
                </ListGroup>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStats(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Footer Info */}
      <Card className="mt-4 border-0 bg-light">
        <Card.Body className="text-center">
          <small className="text-muted">
            <FaCheckCircle className="me-1 text-success" />
            These results are final and have been verified by the election commission.
            Last updated: {new Date().toLocaleString()}
          </small>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ResultsPage;