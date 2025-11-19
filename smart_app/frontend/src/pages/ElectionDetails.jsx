import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Button, Alert, Spinner, 
  Badge, Modal, Form, ListGroup, Image, ProgressBar
} from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { voterAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FaArrowLeft, FaVoteYea, FaUsers, FaClock, FaMapMarkerAlt,
  FaUserTie, FaLandmark, FaCheckCircle, FaExclamationTriangle,
  FaInfoCircle, FaPlay, FaStop, FaHourglassHalf
} from 'react-icons/fa';

const ElectionDetails = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [castingVote, setCastingVote] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadElectionDetails();
  }, [electionId, isAuthenticated]);

  const loadElectionDetails = async () => {
    try {
      setLoading(true);
      setError('');

      // Load election details
      const electionResponse = await voterAPI.getElectionDetails(electionId);
      if (electionResponse.success) {
        setElection(electionResponse.election);
      } else {
        setError(electionResponse.message || 'Failed to load election details');
        return;
      }

      // Load candidates
      const candidatesResponse = await voterAPI.getElectionCandidates(electionId);
      if (candidatesResponse.success) {
        setCandidates(candidatesResponse.candidates);
        setHasVoted(candidatesResponse.has_voted);
      } else {
        setError(candidatesResponse.message || 'Failed to load candidates');
      }

    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load election details';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleStartVoting = async () => {
    try {
      setError('');
      
      // Start voting session
      const sessionResponse = await voterAPI.startVotingSession(electionId);
      if (sessionResponse.success) {
        setShowVoteModal(true);
      } else {
        setError(sessionResponse.message || 'Failed to start voting session');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to start voting session';
      setError(errorMsg);
    }
  };

  const handleCastVote = async () => {
    if (!selectedCandidate) {
      setError('Please select a candidate to vote for');
      return;
    }

    try {
      setCastingVote(true);
      setError('');

      const voteResponse = await voterAPI.castVote(electionId, selectedCandidate.candidate_id);
      if (voteResponse.success) {
        setShowVoteModal(false);
        setHasVoted(true);
        // Reload election details to update vote count
        loadElectionDetails();
        
        // Show success message
        alert(`✅ Vote cast successfully for ${selectedCandidate.full_name}!`);
        
        // Navigate back to elections page
        navigate('/dashboard?tab=elections');
      } else {
        setError(voteResponse.message || 'Failed to cast vote');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to cast vote';
      setError(errorMsg);
    } finally {
      setCastingVote(false);
    }
  };

  const getTimeRemaining = () => {
    if (!election?.voting_end) return null;
    
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

  const getStatusBadge = (status) => {
    switch(status) {
      case 'active':
        return <Badge bg="success"><FaPlay className="me-1" /> Active</Badge>;
      case 'scheduled':
        return <Badge bg="warning"><FaClock className="me-1" /> Scheduled</Badge>;
      case 'completed':
        return <Badge bg="secondary"><FaStop className="me-1" /> Completed</Badge>;
      default:
        return <Badge bg="light" text="dark">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading election details...</p>
        </div>
      </Container>
    );
  }

  if (error && !election) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <FaExclamationTriangle className="me-2" />
          {error}
        </Alert>
        <Button variant="primary" onClick={() => navigate('/dashboard?tab=elections')}>
          <FaArrowLeft className="me-1" />
          Back to Elections
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      {/* Header */}
      <div className="d-flex align-items-center mb-4">
        <Button 
          variant="outline-primary" 
          onClick={() => navigate('/dashboard?tab=elections')}
          className="me-3"
        >
          <FaArrowLeft className="me-1" />
          Back
        </Button>
        <div>
          <h2 className="mb-1">{election?.title}</h2>
          <p className="text-muted mb-0">{election?.description}</p>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          <FaExclamationTriangle className="me-2" />
          {error}
        </Alert>
      )}

      {/* Election Info Card */}
      <Card className="shadow-sm border-0 mb-4">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={8}>
              <div className="d-flex align-items-start">
                {election?.election_logo && (
                  <Image 
                    src={election.election_logo} 
                    rounded 
                    className="me-4"
                    style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                  />
                )}
                <div className="flex-grow-1">
                  <h4 className="text-primary mb-2">{election?.title}</h4>
                  <p className="text-muted mb-3">{election?.description}</p>
                  
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {getStatusBadge(election?.status)}
                    <Badge bg="light" text="dark">
                      <FaLandmark className="me-1" />
                      {election?.election_type}
                    </Badge>
                    <Badge bg="light" text="dark">
                      <FaMapMarkerAlt className="me-1" />
                      {election?.constituency}
                    </Badge>
                    <Badge bg="light" text="dark">
                      <FaUsers className="me-1" />
                      {candidates.length} Candidates
                    </Badge>
                  </div>

                  <div className="row text-muted small">
                    <div className="col-auto">
                      <FaClock className="me-1" />
                      <strong>Starts:</strong> {new Date(election?.voting_start).toLocaleString()}
                    </div>
                    <div className="col-auto">
                      <FaClock className="me-1" />
                      <strong>Ends:</strong> {new Date(election?.voting_end).toLocaleString()}
                    </div>
                    {election?.status === 'active' && (
                      <div className="col-auto text-warning">
                        <FaHourglassHalf className="me-1" />
                        <strong>{getTimeRemaining()}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Col>
            
            <Col md={4} className="text-center">
              {hasVoted ? (
                <div>
                  <Badge bg="success" className="p-3 fs-6 mb-3">
                    <FaCheckCircle className="me-2" />
                    You Have Voted ✓
                  </Badge>
                  <div className="mt-2">
                    <Button variant="outline-secondary" onClick={() => navigate('/results/' + electionId)}>
                      View Results
                    </Button>
                  </div>
                </div>
              ) : election?.status === 'active' ? (
                <div>
                  <Button 
                    variant="primary" 
                    size="lg" 
                    className="px-4 py-3 mb-2"
                    onClick={handleStartVoting}
                  >
                    <FaVoteYea className="me-2" />
                    Cast Your Vote
                  </Button>
                  <p className="text-muted small">
                    {candidates.length} candidates waiting for your vote
                  </p>
                </div>
              ) : election?.status === 'scheduled' ? (
                <Badge bg="warning" text="dark" className="p-3 fs-6">
                  <FaClock className="me-2" />
                  Voting Starts Soon
                </Badge>
              ) : (
                <Badge bg="secondary" className="p-3 fs-6">
                  <FaStop className="me-2" />
                  Election Completed
                </Badge>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Candidates Section */}
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white">
          <h5 className="mb-0 d-flex align-items-center">
            <FaUserTie className="me-2 text-primary" />
            Candidates ({candidates.length})
          </h5>
        </Card.Header>
        <Card.Body>
          {candidates.length > 0 ? (
            <Row>
              {candidates.map(candidate => (
                <Col key={candidate.candidate_id} lg={6} className="mb-4">
                  <CandidateCard 
                    candidate={candidate} 
                    onSelect={setSelectedCandidate}
                    selected={selectedCandidate?.candidate_id === candidate.candidate_id}
                    showVoteButton={showVoteModal}
                  />
                </Col>
              ))}
            </Row>
          ) : (
            <div className="text-center py-5">
              <FaUserTie className="text-muted fs-1 mb-3" />
              <h5 className="text-muted">No Candidates Available</h5>
              <p className="text-muted">Candidates will be listed here once they are approved.</p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Voting Modal */}
      <Modal show={showVoteModal} onHide={() => setShowVoteModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaVoteYea className="me-2 text-primary" />
            Cast Your Vote - {election?.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="d-flex align-items-center">
            <FaInfoCircle className="me-2 fs-5" />
            <div>
              <strong>Important:</strong> Your vote is final and cannot be changed once submitted. 
              Please review your selection carefully.
            </div>
          </Alert>

          <h6 className="mb-3">Select your candidate:</h6>
          
          {selectedCandidate ? (
            <Card className="border-primary">
              <Card.Body>
                <div className="d-flex align-items-center">
                  {selectedCandidate.photo && (
                    <Image 
                      src={selectedCandidate.photo} 
                      rounded 
                      className="me-3"
                      style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                    />
                  )}
                  <div className="flex-grow-1">
                    <h6 className="mb-1">{selectedCandidate.full_name}</h6>
                    <p className="mb-1 text-muted">{selectedCandidate.party}</p>
                    {selectedCandidate.symbol_name && (
                      <Badge bg="light" text="dark">
                        Symbol: {selectedCandidate.symbol_name}
                      </Badge>
                    )}
                  </div>
                  <FaCheckCircle className="text-success fs-4" />
                </div>
              </Card.Body>
            </Card>
          ) : (
            <Alert variant="warning">
              Please select a candidate from the list above to cast your vote.
            </Alert>
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
            disabled={!selectedCandidate || castingVote}
          >
            {castingVote ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Casting Vote...
              </>
            ) : (
              <>
                <FaVoteYea className="me-2" />
                Confirm & Cast Vote
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

// Candidate Card Component
const CandidateCard = ({ candidate, onSelect, selected, showVoteButton }) => {
  return (
    <Card className={`h-100 border-0 shadow-sm ${selected ? 'border-primary border-2' : ''} transition-all`}>
      <Card.Body className="d-flex flex-column">
        <div className="d-flex align-items-start mb-3">
          {/* Candidate Photo */}
          {candidate.photo && (
            <Image 
              src={candidate.photo} 
              rounded 
              className="me-3 flex-shrink-0"
              style={{ width: '80px', height: '80px', objectFit: 'cover' }}
            />
          )}
          
          <div className="flex-grow-1">
            {/* Party Logo and Name */}
            <div className="d-flex align-items-center mb-2">
              {candidate.party_logo && (
                <Image 
                  src={candidate.party_logo} 
                  rounded 
                  className="me-2"
                  style={{ width: '30px', height: '30px', objectFit: 'cover' }}
                />
              )}
              <div>
                <h6 className="mb-0 text-primary">{candidate.full_name}</h6>
                <p className="mb-0 text-muted small">{candidate.party}</p>
              </div>
            </div>

            {/* Election Symbol */}
            {candidate.election_symbol && (
              <div className="d-flex align-items-center mb-2">
                <Image 
                  src={candidate.election_symbol} 
                  className="me-2"
                  style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                />
                <small className="text-muted">{candidate.symbol_name}</small>
              </div>
            )}

            {/* Candidate Number */}
            {candidate.candidate_number && (
              <Badge bg="light" text="dark" className="mb-2">
                Candidate #{candidate.candidate_number}
              </Badge>
            )}
          </div>
        </div>

        {/* Biography */}
        {candidate.biography && (
          <div className="mb-3">
            <small className="text-muted">{candidate.biography}</small>
          </div>
        )}

        {/* Agenda/Manifesto */}
        {candidate.agenda && (
          <div className="mb-3">
            <h6 className="small text-muted mb-1">Agenda:</h6>
            <small>{candidate.agenda}</small>
          </div>
        )}

        {/* Qualifications */}
        {candidate.qualifications && (
          <div className="mb-3">
            <h6 className="small text-muted mb-1">Qualifications:</h6>
            <small>{candidate.qualifications}</small>
          </div>
        )}

        {/* Additional Info */}
        <div className="mt-auto">
          <div className="row small text-muted">
            {candidate.assets_declaration && (
              <div className="col-12 mb-1">
                <strong>Assets:</strong> {candidate.assets_declaration}
              </div>
            )}
            {candidate.criminal_records && candidate.criminal_records !== 'none' && (
              <div className="col-12">
                <strong>Criminal Records:</strong> 
                <Badge bg="warning" text="dark" className="ms-1">
                  {candidate.criminal_records}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Vote Button */}
        {showVoteButton && (
          <div className="mt-3">
            <Button 
              variant={selected ? "primary" : "outline-primary"}
              className="w-100"
              onClick={() => onSelect(candidate)}
            >
              {selected ? (
                <>
                  <FaCheckCircle className="me-2" />
                  Selected
                </>
              ) : (
                <>
                  <FaVoteYea className="me-2" />
                  Select Candidate
                </>
              )}
            </Button>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default ElectionDetails;