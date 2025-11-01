import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Table, Badge, 
  Spinner, Alert, Form, Button 
} from 'react-bootstrap';
import { 
  FaHistory, 
  FaFilter, 
  FaDownload, 
  FaSearch,
  FaCheckCircle,
  FaTimesCircle,
  FaCalendarAlt,
  FaUser
} from 'react-icons/fa';
import { voterAPI } from '../services/api';

const VotingHistory = () => {
  const [votingHistory, setVotingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadVotingHistory();
  }, []);

  const loadVotingHistory = async () => {
    try {
      setLoading(true);
      const response = await voterAPI.getVotingHistory();
      if (response.success) {
        setVotingHistory(response.voting_history || []);
      } else {
        setError(response.message || 'Failed to load voting history');
      }
    } catch (err) {
      setError(err.message || 'Failed to load voting history');
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = votingHistory.filter(record => {
    const matchesFilter = filter === 'all' || 
      (filter === 'voted' && record.voted) ||
      (filter === 'not_voted' && !record.voted);
    
    const matchesSearch = record.election_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.constituency?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (record) => {
    if (record.voted) {
      return <Badge bg="success"><FaCheckCircle className="me-1" />Voted</Badge>;
    } else if (record.status === 'cancelled') {
      return <Badge bg="secondary">Cancelled</Badge>;
    } else {
      return <Badge bg="warning"><FaTimesCircle className="me-1" />Not Voted</Badge>;
    }
  };

  const getElectionTypeBadge = (type) => {
    const typeColors = {
      national: 'primary',
      state: 'success',
      local: 'info',
      university: 'warning',
      college: 'secondary'
    };
    
    return (
      <Badge bg={typeColors[type] || 'light'} text={typeColors[type] ? 'white' : 'dark'}>
        {type?.toUpperCase() || 'UNKNOWN'}
      </Badge>
    );
  };

  const exportHistory = () => {
    const exportData = filteredHistory.map(record => ({
      'Election Title': record.election_title,
      'Type': record.election_type,
      'Date': record.vote_timestamp ? new Date(record.vote_timestamp).toLocaleDateString() : 'N/A',
      'Status': record.voted ? 'Voted' : 'Not Voted',
      'Constituency': record.constituency,
      'Candidate': record.candidate_name || 'N/A'
    }));

    const csvContent = [
      Object.keys(exportData[0] || {}).join(','),
      ...exportData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'voting_history.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <div className="mt-3">
            <p>Loading voting history...</p>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="d-flex align-items-center">
            <FaHistory className="me-3 text-primary" />
            Voting History
          </h2>
          <p className="text-muted">
            Track your participation in past elections
          </p>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger">
          {error}
        </Alert>
      )}

      {/* Filters and Search */}
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Filter by Status</Form.Label>
                <Form.Select 
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All Elections</option>
                  <option value="voted">Voted</option>
                  <option value="not_voted">Not Voted</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Search Elections</Form.Label>
                <div className="input-group">
                  <span className="input-group-text">
                    <FaSearch />
                  </span>
                  <Form.Control
                    type="text"
                    placeholder="Search by election or constituency..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Statistics */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center border-0 bg-primary text-white">
            <Card.Body>
              <h4>{votingHistory.length}</h4>
              <p className="mb-0">Total Elections</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-0 bg-success text-white">
            <Card.Body>
              <h4>{votingHistory.filter(r => r.voted).length}</h4>
              <p className="mb-0">Elections Voted</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-0 bg-info text-white">
            <Card.Body>
              <h4>
                {votingHistory.length > 0 
                  ? Math.round((votingHistory.filter(r => r.voted).length / votingHistory.length) * 100)
                  : 0
                }%
              </h4>
              <p className="mb-0">Participation Rate</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-0 bg-warning text-white">
            <Card.Body>
              <Button 
                variant="outline-light" 
                size="sm"
                onClick={exportHistory}
                disabled={filteredHistory.length === 0}
              >
                <FaDownload className="me-1" />
                Export CSV
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Voting History Table */}
      <Card className="shadow-sm">
        <Card.Header className="bg-white">
          <h5 className="mb-0">Election History</h5>
        </Card.Header>
        <Card.Body className="p-0">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-5">
              <FaHistory className="text-muted fs-1 mb-3" />
              <h5 className="text-muted">No Voting History Found</h5>
              <p className="text-muted">
                {votingHistory.length === 0 
                  ? "You haven't participated in any elections yet."
                  : "No elections match your current filters."
                }
              </p>
            </div>
          ) : (
            <Table responsive hover className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Election</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Constituency</th>
                  <th>Candidate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((record, index) => (
                  <tr key={index}>
                    <td>
                      <div className="fw-semibold">{record.election_title}</div>
                      <small className="text-muted">
                        {record.election_id}
                      </small>
                    </td>
                    <td>
                      {getElectionTypeBadge(record.election_type)}
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <FaCalendarAlt className="me-2 text-muted" />
                        {record.vote_timestamp 
                          ? new Date(record.vote_timestamp).toLocaleDateString()
                          : 'N/A'
                        }
                      </div>
                      {record.vote_timestamp && (
                        <small className="text-muted">
                          {new Date(record.vote_timestamp).toLocaleTimeString()}
                        </small>
                      )}
                    </td>
                    <td>{record.constituency}</td>
                    <td>
                      {record.candidate_name ? (
                        <div className="d-flex align-items-center">
                          <FaUser className="me-2 text-muted" />
                          {record.candidate_name}
                          {record.party && (
                            <Badge bg="light" text="dark" className="ms-2">
                              {record.party}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted">Not Available</span>
                      )}
                    </td>
                    <td>
                      {getStatusBadge(record)}
                      {record.face_verified && (
                        <Badge bg="info" className="ms-1">
                          Face Verified
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Legend */}
      <Card className="mt-4 shadow-sm">
        <Card.Body>
          <h6>Status Legend</h6>
          <div className="d-flex flex-wrap gap-3">
            <div className="d-flex align-items-center">
              <Badge bg="success" className="me-2">
                <FaCheckCircle />
              </Badge>
              <small>Voted - Successfully cast your vote</small>
            </div>
            <div className="d-flex align-items-center">
              <Badge bg="warning" className="me-2">
                <FaTimesCircle />
              </Badge>
              <small>Not Voted - Eligible but didn't vote</small>
            </div>
            <div className="d-flex align-items-center">
              <Badge bg="info" className="me-2">
                Face
              </Badge>
              <small>Face Verified - Biometric authentication used</small>
            </div>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default VotingHistory;