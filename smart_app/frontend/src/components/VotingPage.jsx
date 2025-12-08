import React, { useState, useEffect, useRef } from 'react';
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
  ProgressBar,
  Tabs,
  Tab,
  Toast,
  ToastContainer
} from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { voterAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
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
  FaSync,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaPercentage,
  FaUserCheck,
  FaBullhorn,
  FaCertificate,
  FaBalanceScale,
  FaCrown,
  FaMedal,
  FaAward,
  FaSearch,
  FaFilter,
  FaVoteYea as FaVote
} from 'react-icons/fa';
import './VotingPage.css';

const VotingPage = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
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
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [voteConfetti, setVoteConfetti] = useState(false);
  const [showVoteAnimation, setShowVoteAnimation] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [showInstructions, setShowInstructions] = useState(true);
  const [selectedCandidateDetails, setSelectedCandidateDetails] = useState(null);
  const [sessionTime, setSessionTime] = useState(1800);

  const electionContainerRef = useRef(null);

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

  useEffect(() => {
    let timer;
    if (votingSession?.session_expires && !hasVoted) {
      const updateCountdown = () => {
        const expiresAt = new Date(votingSession.session_expires);
        const now = new Date();
        const diffMs = expiresAt - now;
        
        if (diffMs <= 0) {
          setSessionExpired(true);
          setToastMessage('Voting session has expired!');
          setShowToast(true);
          clearInterval(timer);
          return;
        }
        
        const minutes = Math.floor(diffMs / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        setSessionTime(Math.floor(diffMs / 1000));
      };
      
      updateCountdown();
      timer = setInterval(updateCountdown, 1000);
    }
    
    return () => clearInterval(timer);
  }, [votingSession, hasVoted]);

  useEffect(() => {
    let result = [...candidates];
    
    if (activeTab !== 'all') {
      result = result.filter(candidate => 
        candidate.party?.toLowerCase().includes(activeTab.toLowerCase())
      );
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(candidate =>
        candidate.full_name?.toLowerCase().includes(term) ||
        candidate.party?.toLowerCase().includes(term) ||
        candidate.agenda?.toLowerCase().includes(term)
      );
    }
    
    switch (sortBy) {
      case 'name':
        result.sort((a, b) => a.full_name.localeCompare(b.full_name));
        break;
      case 'party':
        result.sort((a, b) => (a.party || '').localeCompare(b.party || ''));
        break;
      case 'experience':
        result.sort((a, b) => (b.qualifications?.length || 0) - (a.qualifications?.length || 0));
        break;
      default:
        result.sort((a, b) => (a.candidate_number || 999) - (b.candidate_number || 999));
    }
    
    setFilteredCandidates(result);
  }, [candidates, activeTab, searchTerm, sortBy]);

  const startVotingSession = async () => {
    try {
      setLoading(true);
      setError('');
      
      const sessionResponse = await voterAPI.startVotingSession(electionId);
      
      if (sessionResponse.success) {
        setVotingSession(sessionResponse);
        await loadElectionData();
      } else {
        setError(sessionResponse.message || 'Failed to start voting session');
        setLoading(false);
        
        if (sessionResponse.message?.includes('already voted')) {
          setHasVoted(true);
        }
      }
    } catch (err) {
      console.error('Error starting voting session:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to start voting session';
      setError(errorMsg);
      
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
      const response = await voterAPI.getElectionCandidates(electionId);
      
      if (response.success) {
        setElection(response.election);
        setCandidates(response.candidates || []);
        setFilteredCandidates(response.candidates || []);
        
        if (response.has_voted) {
          setHasVoted(true);
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
      setToastMessage('You have already voted in this election.');
      setShowToast(true);
      return;
    }
    
    if (sessionExpired) {
      setToastMessage('Voting session has expired. Please refresh the page.');
      setShowToast(true);
      return;
    }
    
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
      const sessionData = voterAPI.getCachedVotingSession(electionId);
      if (!sessionData) {
        throw new Error('No active voting session found. Please restart voting.');
      }
      
      const response = await voterAPI.castVote(
        electionId,
        selectedCandidate.candidate_id
      );

      if (response.success) {
        setVoteDetails({
          candidateName: selectedCandidate.full_name,
          candidateParty: selectedCandidate.party,
          electionTitle: election.title,
          voteId: response.vote_id,
          timestamp: response.vote_timestamp,
          confirmationNumber: response.confirmation_number,
          candidatePhoto: selectedCandidate.photo,
          partySymbol: selectedCandidate.party_symbol
        });
        
        setShowConfirmModal(false);
        setShowVoteAnimation(true);
        setTimeout(() => {
          setShowVoteAnimation(false);
          setShowSuccessModal(true);
          setVoteConfetti(true);
        }, 2000);
        
        setSuccess('Vote cast successfully!');
        setHasVoted(true);
        
        localStorage.setItem(`voted_${electionId}`, 'true');
        voterAPI.clearVotingSession(electionId);
      } else {
        setError(response.message || 'Failed to cast vote');
        setToastMessage(response.message || 'Failed to cast vote');
        setShowToast(true);
      }
    } catch (err) {
      let errorMsg = 'Failed to cast vote';
      
      if (err.response?.data) {
        errorMsg = err.response.data.message || errorMsg;
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      if (errorMsg.includes('already voted')) {
        setHasVoted(true);
        errorMsg = 'You have already voted in this election.';
      } else if (errorMsg.includes('session') || errorMsg.includes('expired')) {
        setSessionExpired(true);
        errorMsg = 'Voting session has expired. Please restart the voting process.';
      }
      
      setError(errorMsg);
      setToastMessage(errorMsg);
      setShowToast(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetrySession = async () => {
    setError('');
    setSessionExpired(false);
    setSelectedCandidate(null);
    await startVotingSession();
  };

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

  const getElectionProgress = () => {
    if (!election) return 0;
    const totalVoters = election.total_voters || 1000;
    const votesCast = election.total_votes || 0;
    return Math.min(Math.round((votesCast / totalVoters) * 100), 100);
  };

  const getPartyList = () => {
    const parties = new Set();
    candidates.forEach(candidate => {
      if (candidate.party) {
        parties.add(candidate.party);
      }
    });
    return Array.from(parties);
  };

  const handleViewCandidateDetails = (candidate) => {
    setSelectedCandidateDetails(candidate);
  };

  if (loading) {
    return (
      <Container className="py-5 voting-loading-screen">
        <div className="text-center">
          <div className="voting-spinner-container">
            <Spinner animation="border" variant="primary" className="voting-spinner" />
            <div className="voting-spinner-ring"></div>
          </div>
          <h4 className="mt-4 text-primary">Preparing Your Voting Session</h4>
          <p className="text-muted">Verifying your identity and loading election data...</p>
          {votingSession && (
            <div className="mt-3">
              <Badge bg="info" className="p-2 session-badge">
                <FaShieldAlt className="me-1" />
                Secure Session ID: {votingSession.session_id?.substring(0, 12)}...
              </Badge>
            </div>
          )}
        </div>
      </Container>
    );
  }

  if (hasVoted && !showSuccessModal) {
    return (
      <Container className="py-5">
        <div className="text-center voted-already-container">
          <div className="voted-icon-circle">
            <FaCheckCircle className="text-success" />
          </div>
          <h2 className="text-success mt-4">Vote Successfully Cast!</h2>
          <p className="lead text-muted mb-4">
            You have already voted in the <strong>{election?.title}</strong> election.
            Your vote is secure and cannot be changed.
          </p>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <Button variant="primary" onClick={() => navigate(`/results/${electionId}`)} className="vote-action-btn">
              <FaChartBar className="me-2" />
              View Live Results
            </Button>
            <Button variant="outline-primary" onClick={() => navigate('/dashboard')} className="vote-action-btn">
              <FaArrowLeft className="me-2" />
              Back to Dashboard
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
          <div className="expired-icon-circle">
            <FaExclamationTriangle className="text-warning" />
          </div>
          <h2 className="text-warning mt-4">Session Expired</h2>
          <p className="lead text-muted mb-4">
            Your voting session has expired due to inactivity. 
            Please start a new session to continue voting securely.
          </p>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <Button variant="primary" onClick={handleRetrySession} className="vote-action-btn">
              <FaSync className="me-2" />
              Start New Voting Session
            </Button>
            <Button variant="outline-primary" onClick={() => navigate('/dashboard')} className="vote-action-btn">
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
        <Alert variant="danger" className="text-center error-alert">
          <FaExclamationTriangle className="me-2" />
          {error}
        </Alert>
        <div className="text-center mt-3">
          <Button variant="primary" onClick={() => navigate('/dashboard')} className="vote-action-btn">
            <FaArrowLeft className="me-2" />
            Back to Elections
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <div className="voting-page-wrapper" ref={electionContainerRef}>
      {showVoteAnimation && <VoteAnimation />}
      {voteConfetti && <ConfettiAnimation />}
      
      <ToastContainer position="top-end" className="p-3">
        <Toast show={showToast} onClose={() => setShowToast(false)} delay={5000} autohide>
          <Toast.Header>
            <FaInfoCircle className="me-2" />
            <strong className="me-auto">Voting System</strong>
          </Toast.Header>
          <Toast.Body>{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>

      <Container className="py-4">
        {/* Header with Election Info */}
        <Card className="election-header-card mb-4">
          <Card.Body className="p-4">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start mb-4">
              <div>
                <Button 
                  variant="outline-light" 
                  onClick={() => navigate('/dashboard')}
                  className="mb-3 back-btn"
                >
                  <FaArrowLeft className="me-2" />
                  Back to Elections
                </Button>
                
                <div className="d-flex align-items-center mb-2">
                  <div className="election-icon-circle me-3">
                    <FaVoteYea className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-white mb-1">Cast Your Vote</h1>
                    <p className="text-white-50 mb-0">Secure Digital Voting Platform</p>
                  </div>
                </div>
              </div>
              
              {votingSession && (
                <div className="session-timer">
                  <Badge bg="warning" className="p-3">
                    <FaClock className="me-2" />
                    <strong>Session: {countdown}</strong>
                  </Badge>
                </div>
              )}
            </div>

            {election && (
              <div className="election-info-grid">
                <div className="election-main-info">
                  <h2 className="text-white">{election.title}</h2>
                  <p className="text-white-75">{election.description}</p>
                </div>
                
                <div className="election-stats">
                  <div className="stat-item">
                    <FaCalendarAlt className="text-primary" />
                    <span>Ends: {new Date(election.voting_end).toLocaleDateString()}</span>
                  </div>
                  <div className="stat-item">
                    <FaMapMarkerAlt className="text-success" />
                    <span>{election.constituency}</span>
                  </div>
                  <div className="stat-item">
                    <FaUsers className="text-info" />
                    <span>{candidates.length} Candidates</span>
                  </div>
                  <div className="stat-item">
                    <FaPercentage className="text-warning" />
                    <span>{getElectionProgress()}% Turnout</span>
                  </div>
                </div>
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Alerts */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')} className="animated-alert">
            <FaExclamationTriangle className="me-2" />
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess('')} className="animated-alert">
            <FaCheckCircle className="me-2" />
            {success}
          </Alert>
        )}

        {/* Session Status */}
        {votingSession && !hasVoted && (
          <Card className="session-status-card mb-4">
            <Card.Body className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <div className="session-status-icon">
                  <FaShieldAlt className="text-success" />
                </div>
                <div className="ms-3">
                  <h6 className="mb-1">Secure Voting Session Active</h6>
                  <p className="mb-0 text-muted small">
                    Session ID: <code>{votingSession.session_id?.substring(0, 20)}...</code>
                  </p>
                </div>
              </div>
              <Badge bg="success" className="p-2">
                <FaUserCheck className="me-1" />
                Verified Voter
              </Badge>
            </Card.Body>
          </Card>
        )}

        {/* Instructions Panel */}
        {showInstructions && (
          <Card className="instructions-card mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <FaInfoCircle className="me-2 text-primary" />
                Voting Instructions
              </h5>
              <Button 
                variant="link" 
                size="sm" 
                onClick={() => setShowInstructions(false)}
                className="text-decoration-none"
              >
                Hide
              </Button>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4}>
                  <div className="instruction-item">
                    <div className="instruction-icon">
                      <FaEye />
                    </div>
                    <h6>Review Carefully</h6>
                    <p className="small">Examine all candidate profiles before selecting</p>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="instruction-item">
                    <div className="instruction-icon">
                      <FaShieldAlt />
                    </div>
                    <h6>Secure & Private</h6>
                    <p className="small">Your vote is anonymous and encrypted</p>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="instruction-item">
                    <div className="instruction-icon">
                      <FaCheckCircle />
                    </div>
                    <h6>One Vote Only</h6>
                    <p className="small">Your selection is final and cannot be changed</p>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}

        {/* Candidate Filtering & Search */}
        <Card className="candidate-filter-card mb-4">
          <Card.Body>
            <Row className="align-items-center">
              <Col md={4}>
                <div className="input-group">
                  <span className="input-group-text">
                    <FaSearch />
                  </span>
                  <Form.Control
                    type="text"
                    placeholder="Search candidates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </Col>
              <Col md={4}>
                <div className="input-group">
                  <span className="input-group-text">
                    <FaFilter />
                  </span>
                  <Form.Select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="default">Sort by Default</option>
                    <option value="name">Sort by Name</option>
                    <option value="party">Sort by Party</option>
                    <option value="experience">Sort by Experience</option>
                  </Form.Select>
                </div>
              </Col>
              <Col md={4}>
                <div className="d-flex justify-content-end">
                  <span className="me-2 align-self-center">Filter by Party:</span>
                  <div className="btn-group">
                    <Button
                      variant={activeTab === 'all' ? 'primary' : 'outline-primary'}
                      size="sm"
                      onClick={() => setActiveTab('all')}
                    >
                      All
                    </Button>
                    {getPartyList().slice(0, 3).map(party => (
                      <Button
                        key={party}
                        variant={activeTab === party ? 'primary' : 'outline-primary'}
                        size="sm"
                        onClick={() => setActiveTab(party)}
                      >
                        {party}
                      </Button>
                    ))}
                  </div>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Candidates Grid */}
        <div className="candidates-header mb-4">
          <h3 className="text-center">
            <FaUserTie className="me-2 text-primary" />
            Select Your Candidate ({filteredCandidates.length} Available)
          </h3>
          <p className="text-center text-muted">
            Click on a candidate to view details and cast your vote
          </p>
        </div>

        {filteredCandidates.length === 0 ? (
          <Card className="text-center py-5 no-candidates-card">
            <Card.Body>
              <FaUserTie className="text-muted fa-4x mb-3" />
              <h4>No Candidates Match Your Search</h4>
              <p className="text-muted">
                Try adjusting your filters or search terms
              </p>
              <Button 
                variant="outline-primary" 
                onClick={() => {
                  setSearchTerm('');
                  setActiveTab('all');
                  setSortBy('default');
                }}
              >
                Clear Filters
              </Button>
            </Card.Body>
          </Card>
        ) : (
          <Row className="g-4">
            {filteredCandidates.map((candidate, index) => (
              <Col key={candidate.candidate_id} lg={6} xl={4}>
                <EnhancedCandidateCard 
                  candidate={candidate}
                  index={index}
                  onSelect={handleSelectCandidate}
                  onViewDetails={handleViewCandidateDetails}
                  isSelected={selectedCandidate?.candidate_id === candidate.candidate_id}
                  disabled={hasVoted}
                  election={election}
                />
              </Col>
            ))}
          </Row>
        )}

        {/* Selected Candidate Preview */}
        {selectedCandidate && !hasVoted && (
          <Card className="mt-4 selected-candidate-preview">
            <Card.Body className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                {selectedCandidate.photo ? (
                  <img
                    src={selectedCandidate.photo}
                    className="rounded-circle me-3"
                    style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                    alt={selectedCandidate.full_name}
                  />
                ) : (
                  <div className="rounded-circle bg-light d-flex align-items-center justify-content-center me-3"
                       style={{ width: '60px', height: '60px' }}>
                    <FaUserTie className="text-muted" />
                  </div>
                )}
                <div>
                  <h6 className="mb-1">Selected Candidate</h6>
                  <h5 className="mb-0 text-primary">{selectedCandidate.full_name}</h5>
                  <small className="text-muted">{selectedCandidate.party}</small>
                </div>
              </div>
              <Button
                variant="primary"
                onClick={() => setShowConfirmModal(true)}
                className="px-4"
              >
                <FaVoteYea className="me-2" />
                Confirm Vote
              </Button>
            </Card.Body>
          </Card>
        )}

        {/* Vote Confirmation Modal */}
        <Modal 
          show={showConfirmModal} 
          onHide={() => setShowConfirmModal(false)} 
          centered 
          size="lg"
          className="vote-confirm-modal"
        >
          <Modal.Header closeButton className="bg-primary text-white">
            <Modal.Title className="d-flex align-items-center">
              <FaShieldAlt className="me-2" />
              Final Vote Confirmation
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedCandidate && (
              <div className="text-center">
                <div className="candidate-summary">
                  <div className="candidate-avatar-large">
                    {selectedCandidate.photo ? (
                      <img
                        src={selectedCandidate.photo}
                        alt={selectedCandidate.full_name}
                        className="img-fluid"
                      />
                    ) : (
                      <FaUserTie className="text-muted fa-4x" />
                    )}
                  </div>
                  
                  <h3 className="mt-3 text-primary">{selectedCandidate.full_name}</h3>
                  
                  <div className="party-info">
                    {selectedCandidate.party_symbol ? (
                      <img
                        src={selectedCandidate.party_symbol}
                        alt={selectedCandidate.party}
                        className="party-logo-medium me-2"
                      />
                    ) : null}
                    <span className="h5 text-muted">{selectedCandidate.party}</span>
                  </div>
                  
                  {selectedCandidate.candidate_number && (
                    <Badge bg="secondary" className="fs-6 mt-2">
                      Candidate #{selectedCandidate.candidate_number}
                    </Badge>
                  )}
                </div>

                <Alert variant="warning" className="mt-4">
                  <div className="d-flex">
                    <FaExclamationTriangle className="me-3 mt-1 fs-4" />
                    <div>
                      <h5>This is your final confirmation!</h5>
                      <ul className="mb-0">
                        <li>Your vote cannot be changed after submission</li>
                        <li>The selection will be recorded permanently</li>
                        <li>Your vote remains completely anonymous</li>
                      </ul>
                    </div>
                  </div>
                </Alert>

                <div className="voting-final-info mt-4">
                  <p className="lead">
                    You are voting for <strong className="text-primary">{selectedCandidate.full_name}</strong>
                  </p>
                  <p className="text-muted">
                    In the <strong>{election?.title}</strong> election
                  </p>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer className="justify-content-center">
            <Button
              variant="secondary"
              onClick={() => setShowConfirmModal(false)}
              disabled={submitting}
              className="px-5"
            >
              <FaTimesCircle className="me-1" />
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmVote}
              disabled={submitting}
              className="px-5"
            >
              {submitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Casting Your Vote...
                </>
              ) : (
                <>
                  <FaVoteYea className="me-1" />
                  Cast My Vote
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Success Modal */}
        <Modal 
          show={showSuccessModal} 
          onHide={() => setShowSuccessModal(false)} 
          centered
          className="success-modal"
        >
          <Modal.Body className="text-center p-5">
            <div className="success-icon">
              <FaCheckCircle />
            </div>
            <h3 className="text-success mt-4">Vote Successfully Cast!</h3>
            <p className="text-muted mb-4">
              Thank you for participating in the democratic process
            </p>
            
            {voteDetails && (
              <Card className="vote-receipt">
                <Card.Body>
                  <h5 className="mb-3">Vote Confirmation</h5>
                  <div className="receipt-details">
                    <div className="receipt-item">
                      <span>Candidate:</span>
                      <strong>{voteDetails.candidateName}</strong>
                    </div>
                    <div className="receipt-item">
                      <span>Party:</span>
                      <strong>{voteDetails.candidateParty}</strong>
                    </div>
                    <div className="receipt-item">
                      <span>Confirmation ID:</span>
                      <code>{voteDetails.confirmationNumber}</code>
                    </div>
                    <div className="receipt-item">
                      <span>Time:</span>
                      <span>{new Date(voteDetails.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            )}
            
            <Alert variant="info" className="mt-3 small">
              <FaInfoCircle className="me-2" />
              Your vote has been recorded securely. You can view results after voting ends.
            </Alert>
            
            <div className="d-grid gap-2 mt-4">
              <Button variant="primary" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
              <Button variant="outline-primary" onClick={() => navigate(`/results/${electionId}`)}>
                <FaChartBar className="me-2" />
                View Live Results
              </Button>
            </div>
          </Modal.Body>
        </Modal>

        {/* Candidate Details Modal */}
        <Modal 
          show={!!selectedCandidateDetails} 
          onHide={() => setSelectedCandidateDetails(null)} 
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>Candidate Profile</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedCandidateDetails && (
              <CandidateDetailsModal 
                candidate={selectedCandidateDetails}
                onSelect={() => {
                  setSelectedCandidate(selectedCandidateDetails);
                  setSelectedCandidateDetails(null);
                  setShowConfirmModal(true);
                }}
                disabled={hasVoted}
              />
            )}
          </Modal.Body>
        </Modal>
      </Container>
    </div>
  );
};

// Enhanced Candidate Card Component
const EnhancedCandidateCard = ({ candidate, index, onSelect, onViewDetails, isSelected, disabled, election }) => {
  const [hover, setHover] = useState(false);

  const getCandidateBadge = (index) => {
    if (index === 0) return { bg: 'warning', icon: <FaCrown />, text: 'Top' };
    if (index === 1) return { bg: 'secondary', icon: <FaMedal />, text: '2nd' };
    if (index === 2) return { bg: 'danger', icon: <FaAward />, text: '3rd' };
    return null;
  };

  const badge = getCandidateBadge(index);

  return (
    <Card 
      className={`candidate-card ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
      onMouseEnter={() => !disabled && setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => !disabled && onSelect(candidate)}
    >
      {badge && (
        <div className="candidate-badge" style={{ backgroundColor: badge.bg }}>
          {badge.icon}
          <span>{badge.text}</span>
        </div>
      )}
      
      {/* Vote Indicator */}
      <div className="vote-indicator">
        {isSelected ? <FaCheckCircle /> : <FaVoteYea />}
      </div>
      
      <div className="candidate-card-header">
        <div className="candidate-image-container">
          {candidate.photo ? (
            <img
              src={candidate.photo}
              className="candidate-image"
              alt={candidate.full_name}
            />
          ) : (
            <div className="candidate-image-placeholder">
              <FaUserTie />
            </div>
          )}
          
          {candidate.party_symbol && (
            <div className="party-logo">
              <img
                src={candidate.party_symbol}
                alt={candidate.party}
              />
            </div>
          )}
        </div>
      </div>

      <Card.Body>
        <div className="candidate-info">
          <h5 className="candidate-name">{candidate.full_name}</h5>
          <div className="candidate-party">
            {candidate.party || 'Independent'}
          </div>
          
          {candidate.candidate_number && (
            <Badge bg="light" text="dark" className="candidate-number">
              Candidate #{candidate.candidate_number}
            </Badge>
          )}
        </div>

        {candidate.agenda && (
          <div className="candidate-agenda">
            <h6><FaBullhorn className="me-1" /> Agenda</h6>
            <p className="small">{candidate.agenda.substring(0, 100)}...</p>
          </div>
        )}

        <div className="candidate-stats">
          {candidate.qualifications && (
            <div className="stat">
              <FaCertificate />
              <span className="small">Qualified</span>
            </div>
          )}
          {candidate.assets_declaration && (
            <div className="stat">
              <FaBalanceScale />
              <span className="small">Assets Declared</span>
            </div>
          )}
          {candidate.criminal_records === 'none' && (
            <div className="stat">
              <FaShieldAlt />
              <span className="small">Clean Record</span>
            </div>
          )}
        </div>
      </Card.Body>

      <Card.Footer>
        <div className="d-flex gap-2">
          <Button
            variant="outline-info"
            size="sm"
            className="flex-grow-1"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(candidate);
            }}
          >
            <FaEye className="me-1" />
            Details
          </Button>
          <Button
            variant={isSelected ? "success" : "primary"}
            size="sm"
            className="flex-grow-1"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(candidate);
            }}
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
      </Card.Footer>

      {/* Hover Tooltip */}
      {hover && !disabled && (
        <div className="hover-tooltip">
          Click to select this candidate
        </div>
      )}
    </Card>
  );
};

// Candidate Details Modal Component
const CandidateDetailsModal = ({ candidate, onSelect, disabled }) => {
  return (
    <div className="candidate-details">
      <Row>
        <Col md={4} className="text-center">
          <div className="candidate-profile-image mb-4">
            {candidate.photo ? (
              <img
                src={candidate.photo}
                className="img-fluid rounded-circle"
                alt={candidate.full_name}
              />
            ) : (
              <div className="profile-placeholder">
                <FaUserTie />
              </div>
            )}
          </div>
          
          <h3>{candidate.full_name}</h3>
          
          {candidate.party && (
            <div className="party-display mb-3">
              {candidate.party_symbol && (
                <img
                  src={candidate.party_symbol}
                  alt={candidate.party}
                  className="party-logo-large me-2"
                />
              )}
              <Badge bg="primary" className="fs-6">
                {candidate.party}
              </Badge>
            </div>
          )}
          
          {candidate.candidate_number && (
            <Badge bg="secondary" className="fs-6 mb-3">
              Candidate #{candidate.candidate_number}
            </Badge>
          )}
        </Col>
        
        <Col md={8}>
          <Tabs defaultActiveKey="profile" className="mb-3">
            <Tab eventKey="profile" title="Profile">
              {candidate.biography ? (
                <div className="mb-4">
                  <h6>Biography</h6>
                  <p className="text-muted">{candidate.biography}</p>
                </div>
              ) : null}
              
              {candidate.qualifications && (
                <div className="mb-4">
                  <h6><FaCertificate className="me-1" /> Qualifications</h6>
                  <p className="text-muted">{candidate.qualifications}</p>
                </div>
              )}
              
              <div className="row">
                {candidate.assets_declaration && (
                  <div className="col-md-6 mb-3">
                    <h6><FaBalanceScale className="me-1" /> Assets</h6>
                    <p className="text-muted small">{candidate.assets_declaration}</p>
                  </div>
                )}
                
                {candidate.criminal_records && (
                  <div className="col-md-6 mb-3">
                    <h6><FaShieldAlt className="me-1" /> Criminal Record</h6>
                    <Badge 
                      bg={candidate.criminal_records === 'none' ? 'success' : 'warning'}
                      className="p-2"
                    >
                      {candidate.criminal_records === 'none' ? 'Clean Record' : candidate.criminal_records}
                    </Badge>
                  </div>
                )}
              </div>
            </Tab>
            
            <Tab eventKey="agenda" title="Agenda">
              {candidate.agenda ? (
                <div className="mb-4">
                  <h6>Political Agenda</h6>
                  <p className="text-muted">{candidate.agenda}</p>
                </div>
              ) : (
                <p className="text-muted">No agenda information available</p>
              )}
              
              {candidate.manifesto && (
                <div className="mb-4">
                  <h6>Manifesto Highlights</h6>
                  <p className="text-muted">{candidate.manifesto}</p>
                </div>
              )}
            </Tab>
          </Tabs>
          
          {!disabled && (
            <div className="d-grid">
              <Button 
                variant="primary" 
                size="lg"
                onClick={onSelect}
              >
                <FaVoteYea className="me-2" />
                Vote for {candidate.full_name.split(' ')[0]}
              </Button>
            </div>
          )}
        </Col>
      </Row>
    </div>
  );
};

// Animation Components
const VoteAnimation = () => (
  <div className="vote-animation-overlay">
    <div className="vote-animation">
      <FaVoteYea className="vote-icon" />
      <div className="vote-particles">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="vote-particle" style={{
            animationDelay: `${i * 0.1}s`,
            left: `${Math.random() * 100}%`
          }} />
        ))}
      </div>
    </div>
  </div>
);

const ConfettiAnimation = () => (
  <div className="confetti-container">
    {[...Array(50)].map((_, i) => (
      <div 
        key={i}
        className="confetti"
        style={{
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 3}s`,
          backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'][i % 6]
        }}
      />
    ))}
  </div>
);

export default VotingPage;