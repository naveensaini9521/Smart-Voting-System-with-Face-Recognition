import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Button, 
  Modal, 
  Alert, 
  Spinner,
  Badge,
  Form,
  ProgressBar
} from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { voterAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  FaVoteYea, 
  FaUserTie, 
  FaLandmark, 
  FaCheckCircle, 
  FaTimesCircle,
  FaArrowLeft,
  FaExclamationTriangle,
  FaInfoCircle,
  FaShieldAlt,
  FaClock,
  FaUsers,
  FaChartBar,
  FaEye,
  FaSync
} from 'react-icons/fa';

const VotingPage = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [voteDetails, setVoteDetails] = useState(null);
  const [votingSession, setVotingSession] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    if (!electionId) {
      setError('Election ID is missing');
      setLoading(false);
      return;
    }
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    // Check if we already have a valid session
    const checkExistingSession = async () => {
      try {
        const existingSession = voterAPI.getCachedVotingSession(electionId);
        if (existingSession) {
          console.log('🔄 Using existing voting session');
          setVotingSession(existingSession);
          await loadElectionData();
        } else {
          await startVotingSession();
        }
      } catch (error) {
        console.log('🔄 No valid session found, starting new one');
        await startVotingSession();
      }
    };
    
    checkExistingSession();
  }, [electionId, isAuthenticated, navigate]);

  // Add session refresh on user activity
  useEffect(() => {
    const refreshSession = () => {
      if (votingSession && electionId) {
        console.log('🔄 Refreshing voting session on user activity');
        // Extend session in localStorage
        const sessionData = voterAPI.getCachedVotingSession(electionId);
        if (sessionData) {
          const newExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
          sessionData.expires = newExpires.toISOString();
          localStorage.setItem(`voting_session_${electionId}`, JSON.stringify(sessionData));
          setVotingSession(sessionData);
        }
      }
    };

    // Refresh every 5 minutes
    const refreshInterval = setInterval(refreshSession, 5 * 60 * 1000);

    // Also refresh on user interactions
    window.addEventListener('click', refreshSession);
    window.addEventListener('keypress', refreshSession);

    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('click', refreshSession);
      window.removeEventListener('keypress', refreshSession);
    };
  }, [votingSession, electionId]);

  const startVotingSession = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🚀 Starting voting session for election:', electionId);
      
      // Start voting session first
      const sessionResponse = await voterAPI.startVotingSession(electionId);
      console.log('Session response:', sessionResponse);
      
      if (sessionResponse.success) {
        setVotingSession(sessionResponse);
        
        // Then load election data
        await loadElectionData();
      } else {
        setError(sessionResponse.message || 'Failed to start voting session');
        setLoading(false);
        
        // Check if user has already voted
        if (sessionResponse.message?.includes('already voted')) {
          setHasVoted(true);
        }
      }
    } catch (err) {
      console.error('Error starting voting session:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to start voting session';
      setError(errorMsg);
      
      // Check for specific error cases
      if (errorMsg.includes('already voted')) {
        setHasVoted(true);
      }
      if (errorMsg.includes('expired') || errorMsg.includes('ended')) {
        setSessionExpired(true);
      }
      
      setLoading(false);
    }
  };

  const loadElectionData = async () => {
    try {
      // Fetch election details and candidates
      const response = await voterAPI.getElectionCandidates(electionId);
      
      if (response.success) {
        setElection(response.election);
        setCandidates(response.candidates || []);
        
        if (response.has_voted) {
          setHasVoted(true);
          setError('You have already voted in this election.');
        }
      } else {
        setError(response.message || 'Failed to load election data');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load election data';
      setError(errorMsg);
      
      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCandidate = (candidate) => {
    if (hasVoted) {
      setError('You have already voted in this election.');
      return;
    }
    
    if (sessionExpired) {
      setError('Voting session has expired. Please refresh the page.');
      return;
    }
    
    // Verify session is still active before allowing selection
    const sessionData = voterAPI.getCachedVotingSession(electionId);
    if (!sessionData) {
      setError('Voting session has expired. Please restart voting.');
      setSessionExpired(true);
      return;
    }
    
    setSelectedCandidate(candidate);
    setShowConfirmModal(true);
  };

  const handleConfirmVote = async () => {
    if (!selectedCandidate) return;

    setSubmitting(true);
    setError('');
    
    try {
      console.log('🗳️ Submitting vote for candidate:', selectedCandidate.candidate_id);
      console.log('📋 Vote details:', {
        electionId,
        candidateId: selectedCandidate.candidate_id,
        candidateName: selectedCandidate.full_name
      });
      
      // Verify session is still valid before casting vote
      const sessionData = voterAPI.getCachedVotingSession(electionId);
      if (!sessionData) {
        throw new Error('No active voting session found. Please restart voting.');
      }
      
      const response = await voterAPI.castVote(
        electionId,
        selectedCandidate.candidate_id
      );

      console.log('📨 Vote response:', response);

      if (response.success) {
        console.log('✅ Vote cast successfully!');
        setVoteDetails({
          candidateName: selectedCandidate.full_name,
          candidateParty: selectedCandidate.party,
          electionTitle: election.title,
          voteId: response.vote_id,
          timestamp: response.vote_timestamp,
          confirmationNumber: response.confirmation_number
        });
        setShowConfirmModal(false);
        setShowSuccessModal(true);
        setSuccess('Vote cast successfully!');
        setHasVoted(true);
        
        // Update local storage to reflect the vote
        localStorage.setItem(`voted_${electionId}`, 'true');
        
        // Clear the voting session after successful vote
        voterAPI.clearVotingSession(electionId);
      } else {
        console.error('❌ Vote failed:', response.message);
        setError(response.message || 'Failed to cast vote');
      }
    } catch (err) {
      console.error('💥 Vote submission error:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      let errorMsg = 'Failed to cast vote';
      
      if (err.response?.data) {
        errorMsg = err.response.data.message || errorMsg;
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      // Handle specific error cases
      if (errorMsg.includes('already voted')) {
        setHasVoted(true);
        setError('You have already voted in this election.');
      } else if (errorMsg.includes('session') || errorMsg.includes('expired')) {
        setSessionExpired(true);
        setError('Voting session has expired. Please restart the voting process.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToElections = () => {
    navigate('/dashboard');
  };

  const handleViewResults = () => {
    navigate(`/results/${electionId}`);
  };

  const handleRetrySession = async () => {
    setError('');
    setSessionExpired(false);
    setSelectedCandidate(null);
    await startVotingSession();
  };

  const handleViewElectionDetails = () => {
    navigate(`/elections/${electionId}`);
  };

  // Calculate time remaining for the election
  const getTimeRemaining = () => {
    if (!election?.voting_end) return '';
    
    const endTime = new Date(election.voting_end);
    const now = new Date();
    const diffMs = endTime - now;
    
    if (diffMs <= 0) return 'Election ended';
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) return `${diffDays}d ${diffHours}h ${diffMinutes}m remaining`;
    if (diffHours > 0) return `${diffHours}h ${diffMinutes}m remaining`;
    return `${diffMinutes}m remaining`;
  };

  // Calculate time remaining for voting session
  const getSessionTimeRemaining = () => {
    if (!votingSession?.session_expires) return '';
    
    const expiresAt = new Date(votingSession.session_expires);
    const now = new Date();
    const diffMs = expiresAt - now;
    
    if (diffMs <= 0) return 'Session expired';
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    return `${diffMinutes}m ${diffSeconds}s remaining`;
  };

  // Get election progress
  const getElectionProgress = () => {
    if (!election) return 0;
    const totalVoters = election.total_voters || 1000;
    const votesCast = election.total_votes || 0;
    return Math.min(Math.round((votesCast / totalVoters) * 100), 100);
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <Spinner animation="border" variant="primary" size="lg" />
          <h4 className="mt-3">Starting Voting Session...</h4>
          <p>Please wait while we prepare your voting session</p>
          {votingSession && (
            <div className="mt-3">
              <Badge bg="info" className="p-2">
                <FaShieldAlt className="me-1" />
                Session ID: {votingSession.session_id}
              </Badge>
            </div>
          )}
        </div>
      </Container>
    );
  }

  // Show different states based on voting status
  if (hasVoted && !showSuccessModal) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <FaCheckCircle className="text-success fa-5x mb-4" />
          <h2 className="text-success">Vote Already Cast</h2>
          <p className="lead text-muted mb-4">
            You have already voted in the <strong>{election?.title}</strong> election.
          </p>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <Button variant="primary" onClick={handleViewResults}>
              <FaChartBar className="me-2" />
              View Results
            </Button>
            <Button variant="outline-primary" onClick={handleBackToElections}>
              <FaArrowLeft className="me-2" />
              Back to Elections
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  if (sessionExpired) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <FaExclamationTriangle className="text-warning fa-5x mb-4" />
          <h2 className="text-warning">Session Expired</h2>
          <p className="lead text-muted mb-4">
            Your voting session has expired. Please start a new session to continue voting.
          </p>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <Button variant="primary" onClick={handleRetrySession}>
              <FaSync className="me-2" />
              Start New Session
            </Button>
            <Button variant="outline-primary" onClick={handleBackToElections}>
              <FaArrowLeft className="me-2" />
              Back to Elections
            </Button>
          </div>
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
          <FaVoteYea className="me-3" />
          Cast Your Vote
        </h1>
        
        {election && (
          <div className="mt-3">
            <h3 className="text-dark">{election.title}</h3>
            <p className="lead text-muted">{election.description}</p>
            
            {/* Election Progress */}
            <div className="row justify-content-center mb-3">
              <div className="col-md-8">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <small className="text-muted">Voter Participation</small>
                  <small className="text-muted">{getElectionProgress()}%</small>
                </div>
                <ProgressBar 
                  now={getElectionProgress()} 
                  variant="success" 
                  style={{ height: '8px' }}
                />
              </div>
            </div>
            
            <div className="d-flex justify-content-center gap-3 flex-wrap">
              <Badge bg="primary" className="fs-6">
                <FaLandmark className="me-1" />
                {election.election_type}
              </Badge>
              <Badge bg="info" className="fs-6">
                <FaUsers className="me-1" />
                {election.constituency}
              </Badge>
              <Badge bg="warning" className="fs-6">
                <FaClock className="me-1" />
                {getTimeRemaining()}
              </Badge>
              <Badge bg="secondary" className="fs-6">
                {candidates.length} Candidates
              </Badge>
            </div>
          </div>
        )}
      </div>

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

      {/* Session Info */}
      {votingSession && (
        <Alert variant="info" className="d-flex align-items-center">
          <FaShieldAlt className="me-2 fs-5" />
          <div className="flex-grow-1">
            <strong>Secure Voting Session Active</strong>
            <div className="small">
              Session expires: {new Date(votingSession.session_expires).toLocaleTimeString()} 
              ({getSessionTimeRemaining()})
            </div>
          </div>
          <Badge bg="success">Live</Badge>
        </Alert>
      )}

      {/* Voting Instructions */}
      <Card className="mb-4 border-warning">
        <Card.Header className="bg-warning text-dark">
          <h5 className="mb-0">
            <FaInfoCircle className="me-2" />
            Important Voting Instructions
          </h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <ul className="mb-0">
                <li>Review all candidates carefully before making your selection</li>
                <li>Your vote is final and cannot be changed once submitted</li>
                <li>Voting is anonymous and secure</li>
              </ul>
            </Col>
            <Col md={6}>
              <ul className="mb-0">
                <li>Ensure you have stable internet connection</li>
                <li>Do not refresh the page during voting</li>
                <li>Session will expire after 30 minutes of inactivity</li>
              </ul>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Candidates Grid */}
      <Row>
        <Col>
          <h3 className="text-center mb-4">
            Select Your Candidate ({candidates.length} Candidates)
          </h3>
        </Col>
      </Row>

      {candidates.length === 0 ? (
        <div className="text-center py-5">
          <FaUserTie className="text-muted fa-4x mb-3" />
          <h4>No Candidates Available</h4>
          <p className="text-muted">
            There are no candidates contesting in this election at the moment.
          </p>
          <Button variant="outline-primary" onClick={handleViewElectionDetails}>
            <FaEye className="me-2" />
            View Election Details
          </Button>
        </div>
      ) : (
        <Row className="g-4">
          {candidates.map((candidate, index) => (
            <Col key={candidate.candidate_id} lg={6} xl={4}>
              <CandidateCard 
                candidate={candidate}
                index={index}
                onSelect={handleSelectCandidate}
                isSelected={selectedCandidate?.candidate_id === candidate.candidate_id}
                disabled={hasVoted}
              />
            </Col>
          ))}
        </Row>
      )}

      {/* Vote Confirmation Modal */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered size="lg">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="d-flex align-items-center">
            <FaShieldAlt className="me-2 text-primary" />
            Confirm Your Vote
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedCandidate && (
            <div className="text-center">
              <div className="mb-4">
                {selectedCandidate.photo ? (
                  <img
                    src={selectedCandidate.photo}
                    className="rounded-circle border"
                    style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                    alt={selectedCandidate.full_name}
                  />
                ) : (
                  <div
                    className="bg-light rounded-circle d-flex align-items-center justify-content-center mx-auto"
                    style={{ width: '120px', height: '120px' }}
                  >
                    <FaUserTie className="text-muted fa-3x" />
                  </div>
                )}
              </div>

              <h3 className="text-primary">{selectedCandidate.full_name}</h3>
              
              <div className="mb-3">
                {selectedCandidate.party_symbol ? (
                  <div className="d-flex align-items-center justify-content-center">
                    <img
                      src={selectedCandidate.party_symbol}
                      className="rounded me-3"
                      style={{ width: '50px', height: '50px', objectFit: 'contain' }}
                      alt={selectedCandidate.party}
                    />
                    <h5 className="text-muted mb-0">{selectedCandidate.party}</h5>
                  </div>
                ) : (
                  <h5 className="text-muted">{selectedCandidate.party}</h5>
                )}
              </div>

              {selectedCandidate.symbol_name && (
                <Badge bg="secondary" className="fs-6 mb-3">
                  Symbol: {selectedCandidate.symbol_name}
                </Badge>
              )}

              {selectedCandidate.agenda && (
                <Card className="mb-3">
                  <Card.Body>
                    <h6>Agenda & Promises:</h6>
                    <p className="mb-0 text-muted">{selectedCandidate.agenda}</p>
                  </Card.Body>
                </Card>
              )}

              <Alert variant="warning" className="text-start">
                <FaExclamationTriangle className="me-2" />
                <strong>This action cannot be undone!</strong>
                <ul className="mb-0 mt-2">
                  <li>Your vote is final and cannot be changed</li>
                  <li>This selection will be recorded permanently</li>
                  <li>Your vote remains anonymous and secure</li>
                </ul>
              </Alert>

              <p className="text-muted">
                You are about to vote for <strong>{selectedCandidate.full_name}</strong> from{' '}
                <strong>{selectedCandidate.party}</strong> in the{' '}
                <strong>{election?.title}</strong> election.
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowConfirmModal(false)}
            disabled={submitting}
            className="px-4"
          >
            <FaTimesCircle className="me-1" />
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmVote}
            disabled={submitting}
            className="px-4"
          >
            {submitting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
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

      {/* Vote Success Modal */}
      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered>
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title className="d-flex align-items-center">
            <FaCheckCircle className="me-2" />
            Vote Cast Successfully!
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {voteDetails && (
            <div>
              <div className="mb-4">
                <FaCheckCircle className="text-success fa-4x mb-3" />
                <h4 className="text-success">Thank You for Voting!</h4>
              </div>
              
              <Card className="mb-3">
                <Card.Body>
                  <h6>Vote Confirmation Details:</h6>
                  <p className="mb-1">
                    <strong>Candidate:</strong> {voteDetails.candidateName}
                  </p>
                  <p className="mb-1">
                    <strong>Party:</strong> {voteDetails.candidateParty}
                  </p>
                  <p className="mb-1">
                    <strong>Election:</strong> {voteDetails.electionTitle}
                  </p>
                  <p className="mb-1">
                    <strong>Vote ID:</strong> <code>{voteDetails.voteId}</code>
                  </p>
                  <p className="mb-0">
                    <strong>Time:</strong> {new Date(voteDetails.timestamp).toLocaleString()}
                  </p>
                </Card.Body>
              </Card>
              
              <Alert variant="info" className="small">
                <FaInfoCircle className="me-2" />
                Your vote has been recorded securely. You can view the results after the voting period ends.
              </Alert>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button variant="primary" onClick={handleBackToElections}>
            Back to Dashboard
          </Button>
          <Button variant="outline-primary" onClick={handleViewResults}>
            <FaChartBar className="me-2" />
            View Results
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

// Enhanced Candidate Card Component
const CandidateCard = ({ candidate, index, onSelect, isSelected, disabled }) => {
  const [showDetails, setShowDetails] = useState(false);

  const handleCardClick = () => {
    if (!disabled) {
      onSelect(candidate);
    }
  };

  const handleViewDetails = (e) => {
    e.stopPropagation();
    setShowDetails(true);
  };

  return (
    <>
      <Card 
        className={`h-100 shadow-sm border-2 transition-all ${
          isSelected ? 'border-primary bg-primary bg-opacity-10' : 'border-light'
        } ${disabled ? 'opacity-75' : ''}`}
        style={{ 
          cursor: disabled ? 'not-allowed' : 'pointer',
          transform: isSelected ? 'translateY(-2px)' : 'none'
        }}
        onClick={handleCardClick}
      >
        <Card.Body className="d-flex flex-column">
          {/* Candidate Header */}
          <div className="d-flex align-items-start mb-3">
            {/* Candidate Photo */}
            <div className="flex-shrink-0">
              {candidate.photo ? (
                <img
                  src={candidate.photo}
                  className="rounded-circle border"
                  style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                  alt={candidate.full_name}
                />
              ) : (
                <div
                  className="bg-light rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: '80px', height: '80px' }}
                >
                  <FaUserTie className="text-muted fa-2x" />
                </div>
              )}
            </div>
            
            {/* Candidate Info */}
            <div className="flex-grow-1 ms-3">
              <h5 className="mb-1">{candidate.full_name}</h5>
              
              {/* Party Info with Logo */}
              <div className="d-flex align-items-center mb-2">
                {candidate.party_symbol && (
                  <img
                    src={candidate.party_symbol}
                    className="rounded me-2"
                    style={{ width: '30px', height: '30px', objectFit: 'contain' }}
                    alt={candidate.party}
                  />
                )}
                <span className="fw-semibold text-muted">{candidate.party}</span>
              </div>
              
              {/* Candidate Number */}
              {candidate.candidate_number && (
                <Badge bg="secondary" className="mb-2">
                  Candidate #{candidate.candidate_number}
                </Badge>
              )}
            </div>
          </div>

          {/* Election Symbol */}
          {candidate.symbol_name && (
            <div className="text-center mb-3 p-2 bg-light rounded">
              <small className="text-muted">
                <strong>Election Symbol:</strong> {candidate.symbol_name}
              </small>
            </div>
          )}

          {/* Agenda/Manifesto Preview */}
          {candidate.agenda && (
            <div className="mb-3">
              <h6 className="text-primary">Agenda:</h6>
              <p className="small text-muted mb-0 line-clamp-3">
                {candidate.agenda.length > 120 
                  ? `${candidate.agenda.substring(0, 120)}...` 
                  : candidate.agenda
                }
              </p>
            </div>
          )}

          {/* Qualifications */}
          {candidate.qualifications && (
            <div className="mb-3">
              <h6 className="text-primary">Qualifications:</h6>
              <p className="small text-muted mb-0">
                {candidate.qualifications.length > 100
                  ? `${candidate.qualifications.substring(0, 100)}...`
                  : candidate.qualifications
                }
              </p>
            </div>
          )}

          {/* Additional Information */}
          <div className="mt-auto">
            <div className="row small text-muted">
              {candidate.assets_declaration && (
                <div className="col-12 mb-1">
                  <strong>Assets:</strong> {candidate.assets_declaration}
                </div>
              )}
              {candidate.criminal_records && candidate.criminal_records !== 'none' && (
                <div className="col-12">
                  <strong>Criminal Record:</strong>{' '}
                  <Badge bg={candidate.criminal_records === 'none' ? 'success' : 'warning'} className="ms-1">
                    {candidate.criminal_records}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-3 d-flex gap-2">
            <Button
              variant="outline-info"
              size="sm"
              className="flex-grow-1"
              onClick={handleViewDetails}
            >
              <FaEye className="me-1" />
              Details
            </Button>
            <Button
              variant={isSelected ? "success" : "primary"}
              size="sm"
              className="flex-grow-1"
              disabled={disabled}
            >
              {isSelected ? (
                <>
                  <FaCheckCircle className="me-1" />
                  Selected
                </>
              ) : (
                <>
                  <FaVoteYea className="me-1" />
                  Select
                </>
              )}
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Candidate Details Modal */}
      <Modal show={showDetails} onHide={() => setShowDetails(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Candidate Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={4} className="text-center">
              {candidate.photo ? (
                <img
                  src={candidate.photo}
                  className="rounded-circle border mb-3"
                  style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                  alt={candidate.full_name}
                />
              ) : (
                <div
                  className="bg-light rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ width: '150px', height: '150px' }}
                >
                  <FaUserTie className="text-muted fa-4x" />
                </div>
              )}
              <h4>{candidate.full_name}</h4>
              {candidate.party && (
                <Badge bg="primary" className="fs-6">
                  {candidate.party}
                </Badge>
              )}
            </Col>
            <Col md={8}>
              {candidate.biography && (
                <div className="mb-3">
                  <h6>Biography</h6>
                  <p className="text-muted">{candidate.biography}</p>
                </div>
              )}
              
              {candidate.manifesto && (
                <div className="mb-3">
                  <h6>Manifesto</h6>
                  <p className="text-muted">{candidate.manifesto}</p>
                </div>
              )}
              
              {candidate.qualifications && (
                <div className="mb-3">
                  <h6>Qualifications</h6>
                  <p className="text-muted">{candidate.qualifications}</p>
                </div>
              )}
              
              {candidate.agenda && (
                <div className="mb-3">
                  <h6>Political Agenda</h6>
                  <p className="text-muted">{candidate.agenda}</p>
                </div>
              )}
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetails(false)}>
            Close
          </Button>
          {!disabled && (
            <Button variant="primary" onClick={() => {
              setShowDetails(false);
              onSelect(candidate);
            }}>
              <FaVoteYea className="me-1" />
              Select This Candidate
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default VotingPage;