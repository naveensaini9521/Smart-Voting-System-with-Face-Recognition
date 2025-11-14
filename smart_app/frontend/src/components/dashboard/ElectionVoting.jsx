import React, { useState, useEffect } from 'react';
import {
  Container, Row, Col, Card, Button, Alert, Spinner,
  Modal, Badge, Form, ListGroup, ProgressBar, Image
} from 'react-bootstrap';
import { voterAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FaVoteYea, FaUsers, FaClock, FaCheckCircle, FaTimesCircle,
  FaArrowLeft, FaUserTie, FaLandmark, FaChartBar, FaEye
} from 'react-icons/fa';

const ElectionVoting = () => {
  const { user } = useAuth();
  const [activeElections, setActiveElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [castingVote, setCastingVote] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'candidates', 'results'

  useEffect(() => {
    loadActiveElections();
  }, []);

  const loadActiveElections = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await voterAPI.getActiveElections();
      if (response.success) {
        setActiveElections(response.elections);
      } else {
        setError(response.message || 'Failed to load elections');
      }
    } catch (err) {
      setError('Failed to load active elections');
      console.error('Error loading elections:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadElectionCandidates = async (electionId) => {
    setLoading(true);
    setError('');
    try {
      const response = await voterAPI.getElectionCandidates(electionId);
      if (response.success) {
        setCandidates(response.candidates);
        setViewMode('candidates');
      } else {
        setError(response.message || 'Failed to load candidates');
      }
    } catch (err) {
      setError('Failed to load candidates');
      console.error('Error loading candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewElection = (election) => {
    setSelectedElection(election);
    if (election.has_voted) {
      loadElectionResults(election.election_id);
    } else {
      loadElectionCandidates(election.election_id);
    }
  };

  const handleSelectCandidate = (candidate) => {
    setSelectedCandidate(candidate);
    setShowVoteModal(true);
  };

  const handleCastVote = async () => {
    if (!selectedCandidate || !selectedElection) return;

    setCastingVote(true);
    setError('');
    try {
      const response = await voterAPI.castVote(
        selectedElection.election_id,
        selectedCandidate.candidate_id
      );

      if (response.success) {
        setSuccess(`Your vote for ${selectedCandidate.full_name} has been cast successfully!`);
        setShowVoteModal(false);
        setSelectedCandidate(null);
        // Reload elections to update status
        loadActiveElections();
        setViewMode('list');
      } else {
        setError(response.message || 'Failed to cast vote');
      }
    } catch (err) {
      setError('Failed to cast vote. Please try again.');
      console.error('Error casting vote:', err);
    } finally {
      setCastingVote(false);
    }
  };

  const loadElectionResults = async (electionId) => {
    setLoading(true);
    try {
      const response = await voterAPI.getElectionResults(electionId);
      if (response.success) {
        setCandidates(response.results);
        setViewMode('results');
      }
    } catch (err) {
      console.error('Error loading results:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedElection(null);
    setCandidates([]);
  };

  const ElectionCard = ({ election }) => (
    <Card className="mb-4 shadow-sm border-0">
      <Card.Body>
        <Row className="align-items-center">
          <Col md={8}>
            <h5 className="mb-2">{election.title}</h5>
            <p className="text-muted mb-2">{election.description}</p>
            
            <div className="mb-2">
              <Badge bg="light" text="dark" className="me-2">
                <FaLandmark className="me-1" />
                {election.election_type}
              </Badge>
              <Badge bg="light" text="dark">
                <FaUsers className="me-1" />
                {election.candidates_count} Candidates
              </Badge>
            </div>

            <div className="small text-muted">
              <FaClock className="me-1" />
              Voting ends: {new Date(election.voting_end).toLocaleString()}
            </div>
          </Col>

          <Col md={4} className="text-end">
            {election.has_voted ? (
              <div>
                <Badge bg="success" className="mb-2">
                  <FaCheckCircle className="me-1" />
                  Voted
                </Badge>
                <div>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => loadElectionResults(election.election_id)}
                  >
                    <FaChartBar className="me-1" />
                    View Results
                  </Button>
                </div>
              </div>
            ) : election.is_eligible ? (
              <Button
                variant="primary"
                onClick={() => handleViewElection(election)}
              >
                <FaVoteYea className="me-1" />
                Vote Now
              </Button>
            ) : (
              <Badge bg="warning" text="dark">
                Not Eligible
              </Badge>
            )}
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );

  const CandidateCard = ({ candidate, showResults = false }) => (
    <Card className="mb-3 border-0 shadow-sm">
      <Card.Body>
        <Row className="align-items-center">
          <Col md={2}>
            {candidate.photo ? (
              <Image
                src={candidate.photo}
                roundedCircle
                fluid
                style={{ width: '80px', height: '80px', objectFit: 'cover' }}
              />
            ) : (
              <div
                className="bg-light rounded-circle d-flex align-items-center justify-content-center mx-auto"
                style={{ width: '80px', height: '80px' }}
              >
                <FaUserTie className="text-muted fa-2x" />
              </div>
            )}
          </Col>

          <Col md={6}>
            <h6 className="mb-1">{candidate.full_name}</h6>
            <p className="text-muted mb-1">
              <strong>Party:</strong> {candidate.party}
            </p>
            {candidate.agenda && (
              <p className="small text-muted mb-1">
                {candidate.agenda.substring(0, 100)}...
              </p>
            )}
            {candidate.qualifications && (
              <p className="small text-muted">
                <strong>Qualifications:</strong> {candidate.qualifications}
              </p>
            )}
          </Col>

          <Col md={4} className="text-end">
            {showResults ? (
              <div>
                <h5 className="text-primary">{candidate.vote_count} votes</h5>
                <ProgressBar
                  now={candidate.percentage}
                  label={`${candidate.percentage}%`}
                  className="mb-2"
                />
                <Badge bg="light" text="dark">
                  #{candidates.indexOf(candidate) + 1}
                </Badge>
              </div>
            ) : (
              <Button
                variant="outline-primary"
                onClick={() => handleSelectCandidate(candidate)}
              >
                <FaVoteYea className="me-1" />
                Select & Vote
              </Button>
            )}
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );

  return (
    <Container className="py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4>
            {viewMode === 'list' && 'Active Elections'}
            {viewMode === 'candidates' && `Vote in ${selectedElection?.title}`}
            {viewMode === 'results' && `Results - ${selectedElection?.title}`}
          </h4>
          <p className="text-muted mb-0">
            {viewMode === 'list' && 'Participate in ongoing elections'}
            {viewMode === 'candidates' && 'Select your preferred candidate'}
            {viewMode === 'results' && 'View election results'}
          </p>
        </div>

        {viewMode !== 'list' && (
          <Button variant="outline-secondary" onClick={handleBackToList}>
            <FaArrowLeft className="me-1" />
            Back to Elections
          </Button>
        )}
      </div>

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

      {/* Loading State */}
      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading...</p>
        </div>
      )}

      {/* Election List View */}
      {!loading && viewMode === 'list' && (
        <div>
          {activeElections.length === 0 ? (
            <Card className="text-center py-5 border-0 shadow-sm">
              <Card.Body>
                <FaVoteYea className="text-muted fa-4x mb-3" />
                <h5>No Active Elections</h5>
                <p className="text-muted">
                  There are no active elections at the moment. Please check back later.
                </p>
              </Card.Body>
            </Card>
          ) : (
            activeElections.map(election => (
              <ElectionCard key={election.election_id} election={election} />
            ))
          )}
        </div>
      )}

      {/* Candidates View */}
      {!loading && viewMode === 'candidates' && selectedElection && (
        <div>
          <Card className="mb-4 bg-light border-0">
            <Card.Body>
              <Row>
                <Col md={8}>
                  <h5>{selectedElection.title}</h5>
                  <p className="text-muted mb-2">{selectedElection.description}</p>
                  <div className="small text-muted">
                    <FaClock className="me-1" />
                    Voting ends: {new Date(selectedElection.voting_end).toLocaleString()}
                  </div>
                </Col>
                <Col md={4} className="text-end">
                  <Badge bg="primary" className="fs-6">
                    {candidates.length} Candidates
                  </Badge>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {candidates.length === 0 ? (
            <Card className="text-center py-5">
              <Card.Body>
                <FaUserTie className="text-muted fa-3x mb-3" />
                <h5>No Candidates</h5>
                <p className="text-muted">No candidates are contesting in this election.</p>
              </Card.Body>
            </Card>
          ) : (
            candidates.map(candidate => (
              <CandidateCard key={candidate.candidate_id} candidate={candidate} />
            ))
          )}
        </div>
      )}

      {/* Results View */}
      {!loading && viewMode === 'results' && selectedElection && (
        <div>
          <Card className="mb-4 bg-light border-0">
            <Card.Body className="text-center">
              <h4>Election Results</h4>
              <p className="text-muted mb-0">
                {selectedElection.title} - Final Results
              </p>
            </Card.Body>
          </Card>

          {candidates.length === 0 ? (
            <Card className="text-center py-5">
              <Card.Body>
                <FaChartBar className="text-muted fa-3x mb-3" />
                <h5>No Results Available</h5>
                <p className="text-muted">Results are not available yet.</p>
              </Card.Body>
            </Card>
          ) : (
            <div>
              {candidates.map((candidate, index) => (
                <CandidateCard 
                  key={candidate.candidate_id} 
                  candidate={candidate} 
                  showResults={true}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Vote Confirmation Modal */}
      <Modal show={showVoteModal} onHide={() => setShowVoteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Your Vote</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedCandidate && (
            <div className="text-center">
              <div className="mb-4">
                {selectedCandidate.photo ? (
                  <Image
                    src={selectedCandidate.photo}
                    roundedCircle
                    style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    className="bg-light rounded-circle d-flex align-items-center justify-content-center mx-auto"
                    style={{ width: '100px', height: '100px' }}
                  >
                    <FaUserTie className="text-muted fa-3x" />
                  </div>
                )}
              </div>

              <h5>{selectedCandidate.full_name}</h5>
              <p className="text-muted">{selectedCandidate.party}</p>

              <Alert variant="warning" className="text-center">
                <FaEye className="me-2" />
                <strong>Important:</strong> Your vote is final and cannot be changed
              </Alert>

              <p className="text-muted small">
                You are voting for <strong>{selectedCandidate.full_name}</strong> in the{' '}
                <strong>{selectedElection?.title}</strong> election.
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowVoteModal(false)}
            disabled={castingVote}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCastVote}
            disabled={castingVote}
          >
            {castingVote ? (
              <>
                <Spinner size="sm" className="me-2" />
                Casting Vote...
              </>
            ) : (
              <>
                <FaVoteYea className="me-1" />
                Confirm & Cast Vote
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ElectionVoting;