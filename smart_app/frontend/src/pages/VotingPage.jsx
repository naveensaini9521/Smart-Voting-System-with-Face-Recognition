import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Card, 
  Button, 
  Alert, 
  Spinner, 
  Row, 
  Col, 
  Modal,
  Form,
  ProgressBar,
  Badge,
  ListGroup
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { voterAPI } from '../services/api';
import { 
  CheckCircleFill, 
  XCircleFill, 
  Clock,
  PersonCheck,
  ShieldCheck,
  Eye,
  Calendar,
  GeoAlt,
  InfoCircle
} from 'react-bootstrap-icons';

const VotingPage = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [votingStatus, setVotingStatus] = useState('idle'); // 'idle', 'voted', 'closed', 'not_started', 'not_eligible'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [faceVerificationRequired, setFaceVerificationRequired] = useState(true);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [selectedCandidateDetails, setSelectedCandidateDetails] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchElectionData();
  }, [electionId, isAuthenticated, navigate]);

  const fetchElectionData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch election details
      const electionResponse = await voterAPI.getElectionDetails(electionId);
      
      if (electionResponse.success) {
        const electionData = electionResponse.election;
        setElection(electionData);
        setFaceVerificationRequired(electionData.require_face_verification !== false);

        // Check if election is active
        const now = new Date();
        const startDate = new Date(electionData.voting_start);
        const endDate = new Date(electionData.voting_end);

        if (now < startDate) {
          setVotingStatus('not_started');
        } else if (now > endDate) {
          setVotingStatus('closed');
        } else {
          // Check if user has already voted
          const voteStatusResponse = await voterAPI.checkVoteStatus(electionId, user.voter_id);
          if (voteStatusResponse.success && voteStatusResponse.has_voted) {
            setVotingStatus('voted');
          } else {
            setVotingStatus('idle');
          }
        }

        // Fetch candidates
        const candidatesResponse = await voterAPI.getCandidates(electionId);
        if (candidatesResponse.success) {
          setCandidates(candidatesResponse.candidates || []);
        } else {
          setError('Failed to load candidates');
        }
      } else {
        setError(electionResponse.message || 'Failed to load election data');
      }
    } catch (err) {
      console.error('Error fetching election data:', err);
      setError('Failed to load election data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCandidateSelect = (candidate) => {
    setSelectedCandidate(candidate.candidate_id);
    setError('');
  };

  const handleViewCandidateDetails = (candidate) => {
    setSelectedCandidateDetails(candidate);
    setShowCandidateModal(true);
  };

  const handleVoteSubmit = async () => {
    if (!selectedCandidate) {
      setError('Please select a candidate before voting');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Perform face verification if required
      let faceVerified = true;
      
      if (faceVerificationRequired) {
        try {
          // This would integrate with your face verification system
          const faceVerificationResponse = await voterAPI.verifyFace({
            voter_id: user.voter_id,
            election_id: electionId
          });
          
          faceVerified = faceVerificationResponse.success;
          
          if (!faceVerified) {
            setError('Face verification failed. Please try again or contact support.');
            setIsSubmitting(false);
            return;
          }
        } catch (faceError) {
          setError('Face verification service unavailable. Please try again later.');
          setIsSubmitting(false);
          return;
        }
      }

      // Submit the vote
      const voteResponse = await voterAPI.castVote(electionId, selectedCandidate);
      
      if (voteResponse.success) {
        setSuccess('Vote cast successfully!');
        setVotingStatus('voted');
        setShowConfirmModal(false);
        
        // Redirect to results after 2 seconds
        setTimeout(() => {
          navigate(`/results/${electionId}`);
        }, 2000);
      } else {
        setError(voteResponse.message || 'Failed to submit vote. Please try again.');
      }
    } catch (err) {
      console.error('Vote submission error:', err);
      setError('Failed to submit vote. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getElectionProgress = () => {
    if (!election) return 0;
    const totalVoters = election.total_voters || 1000;
    const votesCast = election.votes_cast || 0;
    return Math.round((votesCast / totalVoters) * 100);
  };

  const getTimeRemaining = () => {
    if (!election) return '';
    const end = new Date(election.voting_end);
    const now = new Date();
    const diff = end - now;
    
    if (diff <= 0) return 'Election ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" />
        <span className="ms-3">Loading election data...</span>
      </Container>
    );
  }

  if (!election) {
    return (
      <Container className="my-5">
        <Alert variant="danger">
          <h4>Election Not Found</h4>
          <p>The requested election could not be found or you don't have access to it.</p>
          <Button variant="primary" onClick={() => navigate('/elections')}>
            Back to Elections
          </Button>
        </Alert>
      </Container>
    );
  }

  if (votingStatus === 'voted') {
    return (
      <Container className="my-5">
        <Row className="justify-content-center">
          <Col md={8} lg={6}>
            <Card className="text-center shadow">
              <Card.Body className="py-5">
                <CheckCircleFill size={80} className="text-success mb-4" />
                <h3>Vote Cast Successfully!</h3>
                <p className="text-muted">
                  Thank you for participating in the {election.title}. 
                  Your vote has been recorded securely.
                </p>
                <div className="mt-4">
                  <Button 
                    variant="primary" 
                    onClick={() => navigate(`/results/${electionId}`)}
                    className="me-3"
                  >
                    View Results
                  </Button>
                  <Button 
                    variant="outline-secondary" 
                    onClick={() => navigate('/dashboard')}
                  >
                    Back to Dashboard
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  if (votingStatus === 'closed') {
    return (
      <Container className="my-5">
        <Row className="justify-content-center">
          <Col md={8} lg={6}>
            <Card className="text-center shadow">
              <Card.Body className="py-5">
                <XCircleFill size={80} className="text-danger mb-4" />
                <h3>Election Closed</h3>
                <p className="text-muted">
                  The {election.title} has ended on {formatDate(election.voting_end)}.
                  Voting is no longer available.
                </p>
                <div className="mt-4">
                  <Button 
                    variant="primary" 
                    onClick={() => navigate(`/results/${electionId}`)}
                    className="me-3"
                  >
                    View Results
                  </Button>
                  <Button 
                    variant="outline-secondary" 
                    onClick={() => navigate('/elections')}
                  >
                    View Other Elections
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  if (votingStatus === 'not_started') {
    return (
      <Container className="my-5">
        <Row className="justify-content-center">
          <Col md={8} lg={6}>
            <Card className="text-center shadow">
              <Card.Body className="py-5">
                <Clock size={80} className="text-warning mb-4" />
                <h3>Election Not Started</h3>
                <p className="text-muted">
                  The {election.title} will begin on {formatDate(election.voting_start)}.
                  Please check back then to cast your vote.
                </p>
                <div className="mt-4">
                  <Button 
                    variant="outline-secondary" 
                    onClick={() => navigate('/elections')}
                  >
                    View Other Elections
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container className="my-4">
      {/* Election Header */}
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Row className="align-items-center">
            <Col>
              <Badge bg="primary" className="mb-2 text-capitalize">
                {election.election_type || 'Election'}
              </Badge>
              <h2 className="h4 mb-2">{election.title}</h2>
              <p className="text-muted mb-3">{election.description}</p>
              
              <Row className="g-3">
                <Col md={6}>
                  <ListGroup variant="flush">
                    <ListGroup.Item className="px-0 py-1 d-flex align-items-center">
                      <Calendar size={16} className="me-2 text-muted" />
                      <small>Starts: {formatDateTime(election.voting_start)}</small>
                    </ListGroup.Item>
                    <ListGroup.Item className="px-0 py-1 d-flex align-items-center">
                      <Clock size={16} className="me-2 text-muted" />
                      <small>Ends: {formatDateTime(election.voting_end)}</small>
                    </ListGroup.Item>
                  </ListGroup>
                </Col>
                <Col md={6}>
                  <ListGroup variant="flush">
                    <ListGroup.Item className="px-0 py-1 d-flex align-items-center">
                      <GeoAlt size={16} className="me-2 text-muted" />
                      <small>{election.constituency || 'All Constituencies'}</small>
                    </ListGroup.Item>
                    <ListGroup.Item className="px-0 py-1 d-flex align-items-center">
                      <PersonCheck size={16} className="me-2 text-muted" />
                      <small>{election.votes_cast || 0} votes cast</small>
                    </ListGroup.Item>
                  </ListGroup>
                </Col>
              </Row>
            </Col>
          </Row>
          
          <div className="mt-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <small className="text-muted">Voter Participation</small>
              <small className="text-muted">{getElectionProgress()}%</small>
            </div>
            <ProgressBar 
              now={getElectionProgress()} 
              variant="success" 
            />
          </div>
        </Card.Body>
      </Card>

      {/* Error/Success Alerts */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          <Alert.Heading>Error</Alert.Heading>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')}>
          <Alert.Heading>Success</Alert.Heading>
          {success}
        </Alert>
      )}

      {/* Voting Instructions */}
      <Alert variant="info" className="mb-4">
        <InfoCircle size={20} className="me-2" />
        <strong>Voting Instructions:</strong> Select your preferred candidate below. 
        You can only vote once. After submission, your vote cannot be changed.
        {faceVerificationRequired && ' Face verification will be required before voting.'}
      </Alert>

      {/* Candidates List */}
      <Row>
        {candidates.length === 0 ? (
          <Col>
            <Card className="text-center py-5">
              <Card.Body>
                <PersonCheck size={48} className="text-muted mb-3" />
                <h5>No Candidates Available</h5>
                <p className="text-muted">
                  There are no candidates registered for this election yet.
                </p>
              </Card.Body>
            </Card>
          </Col>
        ) : (
          candidates.map((candidate) => (
            <Col key={candidate.candidate_id} lg={6} className="mb-4">
              <Card 
                className={`h-100 ${selectedCandidate === candidate.candidate_id ? 'border-primary shadow' : ''}`}
                style={{ 
                  cursor: 'pointer', 
                  transition: 'all 0.3s',
                  transform: selectedCandidate === candidate.candidate_id ? 'translateY(-2px)' : 'none'
                }}
              >
                <Card.Body>
                  <Row className="align-items-center">
                    <Col xs={3}>
                      <div 
                        className="rounded-circle bg-light d-flex align-items-center justify-content-center border"
                        style={{ width: '80px', height: '80px' }}
                      >
                        {selectedCandidate === candidate.candidate_id ? (
                          <CheckCircleFill size={30} className="text-primary" />
                        ) : (
                          <span className="text-muted fw-bold fs-5">
                            {candidate.full_name?.charAt(0) || 'C'}
                          </span>
                        )}
                      </div>
                    </Col>
                    <Col xs={9}>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <h5 className="mb-1">{candidate.full_name}</h5>
                          {candidate.party && (
                            <Badge bg="secondary" className="mb-2">
                              {candidate.party}
                            </Badge>
                          )}
                        </div>
                        {selectedCandidate === candidate.candidate_id && (
                          <Badge bg="primary">Selected</Badge>
                        )}
                      </div>
                      
                      {candidate.biography && (
                        <p className="small text-muted mb-2 line-clamp-2">
                          {candidate.biography}
                        </p>
                      )}
                      
                      <div className="d-flex gap-2">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewCandidateDetails(candidate);
                          }}
                        >
                          <Eye size={14} className="me-1" />
                          Details
                        </Button>
                        <Button
                          variant={selectedCandidate === candidate.candidate_id ? "primary" : "outline-secondary"}
                          size="sm"
                          onClick={() => handleCandidateSelect(candidate)}
                        >
                          {selectedCandidate === candidate.candidate_id ? 'Selected' : 'Select'}
                        </Button>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          ))
        )}
      </Row>

      {/* Voting Action */}
      {candidates.length > 0 && (
        <Card className="mt-4 sticky-bottom" style={{ bottom: '20px' }}>
          <Card.Body>
            <Row className="align-items-center">
              <Col>
                <h6 className="mb-1">
                  {selectedCandidate 
                    ? `Selected: ${candidates.find(c => c.candidate_id === selectedCandidate)?.full_name}`
                    : 'No candidate selected'
                  }
                </h6>
                {selectedCandidate && (
                  <small className="text-muted">
                    {candidates.find(c => c.candidate_id === selectedCandidate)?.party}
                  </small>
                )}
              </Col>
              <Col xs="auto">
                <Button
                  variant="primary"
                  size="lg"
                  disabled={!selectedCandidate || isSubmitting}
                  onClick={() => setShowConfirmModal(true)}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={20} className="me-2" />
                      Cast Vote
                    </>
                  )}
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Candidate Details Modal */}
      <Modal show={showCandidateModal} onHide={() => setShowCandidateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Candidate Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedCandidateDetails && (
            <Row>
              <Col md={4} className="text-center">
                <div 
                  className="rounded-circle bg-light d-flex align-items-center justify-content-center mx-auto border"
                  style={{ width: '120px', height: '120px' }}
                >
                  <span className="text-muted fw-bold fs-2">
                    {selectedCandidateDetails.full_name?.charAt(0) || 'C'}
                  </span>
                </div>
                <h5 className="mt-3">{selectedCandidateDetails.full_name}</h5>
                {selectedCandidateDetails.party && (
                  <Badge bg="primary" className="mb-2">
                    {selectedCandidateDetails.party}
                  </Badge>
                )}
              </Col>
              <Col md={8}>
                <h6>Biography</h6>
                <p className="text-muted">
                  {selectedCandidateDetails.biography || 'No biography provided.'}
                </p>
                
                {selectedCandidateDetails.manifesto && (
                  <>
                    <h6>Manifesto</h6>
                    <p className="text-muted">
                      {selectedCandidateDetails.manifesto}
                    </p>
                  </>
                )}
                
                {selectedCandidateDetails.qualifications && (
                  <>
                    <h6>Qualifications</h6>
                    <p className="text-muted">
                      {selectedCandidateDetails.qualifications}
                    </p>
                  </>
                )}
                
                {(selectedCandidateDetails.email || selectedCandidateDetails.website) && (
                  <>
                    <h6>Contact Information</h6>
                    <ListGroup variant="flush">
                      {selectedCandidateDetails.email && (
                        <ListGroup.Item className="px-0">
                          <small><strong>Email:</strong> {selectedCandidateDetails.email}</small>
                        </ListGroup.Item>
                      )}
                      {selectedCandidateDetails.website && (
                        <ListGroup.Item className="px-0">
                          <small><strong>Website:</strong> {selectedCandidateDetails.website}</small>
                        </ListGroup.Item>
                      )}
                    </ListGroup>
                  </>
                )}
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="outline-secondary" 
            onClick={() => setShowCandidateModal(false)}
          >
            Close
          </Button>
          <Button 
            variant="primary"
            onClick={() => {
              if (selectedCandidateDetails) {
                handleCandidateSelect(selectedCandidateDetails);
                setShowCandidateModal(false);
              }
            }}
          >
            Select This Candidate
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Confirmation Modal */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Your Vote</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>You are about to vote for:</p>
          <Card className="bg-light">
            <Card.Body>
              <h5>{candidates.find(c => c.candidate_id === selectedCandidate)?.full_name}</h5>
              <p className="text-muted mb-0">
                {candidates.find(c => c.candidate_id === selectedCandidate)?.party}
              </p>
            </Card.Body>
          </Card>
          
          <Alert variant="warning" className="mt-3">
            <Alert.Heading className="h6">
              <ShieldCheck size={16} className="me-2" />
              Important Notice
            </Alert.Heading>
            This action cannot be undone. Your vote will be final and securely recorded.
            {faceVerificationRequired && ' Face verification will be required to complete your vote.'}
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowConfirmModal(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleVoteSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {faceVerificationRequired ? 'Verifying & Voting...' : 'Processing Vote...'}
              </>
            ) : (
              <>
                <ShieldCheck size={16} className="me-2" />
                {faceVerificationRequired ? 'Confirm & Verify Face' : 'Confirm Vote'}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .sticky-bottom {
          position: sticky;
          z-index: 1020;
        }
      `}</style>
    </Container>
  );
};

export default VotingPage;