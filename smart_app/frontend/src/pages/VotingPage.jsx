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
  Badge
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { 
  CheckCircleFill, 
  XCircleFill, 
  Clock,
  PersonCheck,
  ShieldCheck
} from 'react-bootstrap-icons';

const VotingPage = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [votingStatus, setVotingStatus] = useState('idle'); // 'idle', 'voted', 'closed', 'not_started'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Mock data - Replace with actual API calls
  useEffect(() => {
    const fetchElectionData = async () => {
      try {
        // Simulate API call
        setTimeout(() => {
          const mockElection = {
            id: electionId,
            title: 'Student Council Election 2024',
            description: 'Elect your student representatives for the academic year 2024-2025',
            startDate: '2024-01-15T00:00:00Z',
            endDate: '2024-01-20T23:59:59Z',
            status: 'active', // 'upcoming', 'active', 'completed'
            maxVotes: 1,
            category: 'Student Council',
            totalVoters: 1500,
            votesCast: 856
          };

          const mockCandidates = [
            {
              id: 1,
              name: 'Sarah Johnson',
              position: 'President',
              image: '/api/placeholder/150/150',
              bio: '3rd Year Computer Science. Former Class Representative.',
              manifesto: 'Focus on student welfare, better facilities, and career development programs.',
              party: 'Student Progressive Alliance'
            },
            {
              id: 2,
              name: 'Michael Chen',
              position: 'President',
              image: '/api/placeholder/150/150',
              bio: '2nd Year Business Administration. Sports Club President.',
              manifesto: 'Enhance sports facilities, international student support, and entrepreneurship programs.',
              party: 'Unity Student Party'
            },
            {
              id: 3,
              name: 'Emma Davis',
              position: 'Vice President',
              image: '/api/placeholder/150/150',
              bio: '3rd Year Political Science. Debate Society President.',
              manifesto: 'Improve academic resources, mental health support, and campus sustainability.',
              party: 'Student Progressive Alliance'
            },
            {
              id: 4,
              name: 'Alex Rodriguez',
              position: 'Vice President',
              image: '/api/placeholder/150/150',
              bio: '2nd Year Engineering. Tech Club Coordinator.',
              manifesto: 'Digital campus initiatives, STEM education support, and innovation hubs.',
              party: 'Unity Student Party'
            }
          ];

          setElection(mockElection);
          setCandidates(mockCandidates);
          
          // Check if user has already voted (mock)
          const hasVoted = false; // Replace with actual check
          setVotingStatus(hasVoted ? 'voted' : 'idle');
        }, 1000);
      } catch (err) {
        setError('Failed to load election data');
      }
    };

    fetchElectionData();
  }, [electionId]);

  const handleCandidateSelect = (candidateId) => {
    setSelectedCandidate(candidateId);
    setError('');
  };

  const handleVoteSubmit = async () => {
    if (!selectedCandidate) {
      setError('Please select a candidate before voting');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Simulate API call for face verification and voting
      setTimeout(() => {
        // Mock face verification success
        const faceVerified = true;
        
        if (faceVerified) {
          setSuccess('Vote cast successfully!');
          setVotingStatus('voted');
          setShowConfirmModal(false);
          
          // Redirect to results after 2 seconds
          setTimeout(() => {
            navigate(`/results/${electionId}`);
          }, 2000);
        } else {
          setError('Face verification failed. Please try again.');
        }
        
        setIsSubmitting(false);
      }, 2000);
    } catch (err) {
      setError('Failed to submit vote. Please try again.');
      setIsSubmitting(false);
    }
  };

  const getElectionProgress = () => {
    if (!election) return 0;
    return Math.round((election.votesCast / election.totalVoters) * 100);
  };

  const getTimeRemaining = () => {
    if (!election) return '';
    const end = new Date(election.endDate);
    const now = new Date();
    const diff = end - now;
    
    if (diff <= 0) return 'Election ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return `${days}d ${hours}h remaining`;
  };

  if (!election) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" />
        <span className="ms-3">Loading election data...</span>
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

  return (
    <Container className="my-4">
      {/* Election Header */}
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Row className="align-items-center">
            <Col>
              <Badge bg="primary" className="mb-2">{election.category}</Badge>
              <h2 className="h4 mb-2">{election.title}</h2>
              <p className="text-muted mb-3">{election.description}</p>
              
              <div className="d-flex flex-wrap gap-4">
                <div className="d-flex align-items-center">
                  <Clock size={16} className="me-2 text-muted" />
                  <small>{getTimeRemaining()}</small>
                </div>
                <div className="d-flex align-items-center">
                  <PersonCheck size={16} className="me-2 text-muted" />
                  <small>{election.votesCast} votes cast</small>
                </div>
                <div className="d-flex align-items-center">
                  <ShieldCheck size={16} className="me-2 text-muted" />
                  <small>Secure voting</small>
                </div>
              </div>
            </Col>
          </Row>
          
          <ProgressBar 
            now={getElectionProgress()} 
            variant="success" 
            className="mt-3" 
            label={`${getElectionProgress()}% participation`}
          />
        </Card.Body>
      </Card>

      {/* Error/Success Alerts */}
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Voting Instructions */}
      <Alert variant="info" className="mb-4">
        <strong>Voting Instructions:</strong> Select your preferred candidate below. 
        You can only vote once. After submission, your vote cannot be changed.
      </Alert>

      {/* Candidates List */}
      <Row>
        {candidates.map((candidate) => (
          <Col key={candidate.id} md={6} className="mb-4">
            <Card 
              className={`h-100 cursor-pointer ${selectedCandidate === candidate.id ? 'border-primary shadow' : ''}`}
              onClick={() => handleCandidateSelect(candidate.id)}
              style={{ cursor: 'pointer', transition: 'all 0.3s' }}
            >
              <Card.Body>
                <Row className="align-items-center">
                  <Col xs={3}>
                    <div 
                      className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                      style={{ width: '80px', height: '80px' }}
                    >
                      {selectedCandidate === candidate.id ? (
                        <CheckCircleFill size={30} className="text-primary" />
                      ) : (
                        <span className="text-muted">{candidate.name.charAt(0)}</span>
                      )}
                    </div>
                  </Col>
                  <Col xs={9}>
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h5 className="mb-1">{candidate.name}</h5>
                        <Badge bg="secondary" className="mb-2">{candidate.position}</Badge>
                        <p className="text-muted small mb-1">{candidate.party}</p>
                      </div>
                      {selectedCandidate === candidate.id && (
                        <Badge bg="primary">Selected</Badge>
                      )}
                    </div>
                    <p className="small text-muted mt-2">{candidate.bio}</p>
                  </Col>
                </Row>
                
                {/* Manifesto (collapsible) */}
                <div className="mt-3">
                  <details>
                    <summary className="small text-primary cursor-pointer">
                      View Manifesto
                    </summary>
                    <p className="small mt-2 text-muted">{candidate.manifesto}</p>
                  </details>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Voting Action */}
      <Card className="mt-4">
        <Card.Body>
          <Row className="align-items-center">
            <Col>
              <h6 className="mb-0">
                {selectedCandidate 
                  ? `Selected: ${candidates.find(c => c.id === selectedCandidate)?.name}`
                  : 'No candidate selected'
                }
              </h6>
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
                  'Cast Vote'
                )}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Confirmation Modal */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Your Vote</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>You are about to vote for:</p>
          <Card className="bg-light">
            <Card.Body>
              <h5>{candidates.find(c => c.id === selectedCandidate)?.name}</h5>
              <p className="text-muted mb-0">
                {candidates.find(c => c.id === selectedCandidate)?.position} - 
                {candidates.find(c => c.id === selectedCandidate)?.party}
              </p>
            </Card.Body>
          </Card>
          <Alert variant="warning" className="mt-3">
            <strong>Important:</strong> This action cannot be undone. Your vote will be final.
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
                Verifying & Voting...
              </>
            ) : (
              'Confirm & Verify Face'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default VotingPage;