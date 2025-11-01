import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Nav, Button, Badge, ProgressBar, Form, Dropdown, Alert, Spinner } from 'react-bootstrap';
import { FaVoteYea, FaFilter, FaSearch, FaCalendarAlt, FaEye, FaGlobeAmericas, FaCity, FaHome, FaUniversity } from 'react-icons/fa';
import { voterAPI } from '../../services/api';

const ElectionsTab = () => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [electionType, setElectionType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadElections();
  }, [electionType]);

  const loadElections = async () => {
    try {
      setLoading(true);
      const response = await voterAPI.getElections(electionType);
      
      if (response.success) {
        setElections(response.elections_data || []);
      } else {
        setError(response.message || 'Failed to load elections');
      }
    } catch (err) {
      setError('Failed to load elections data');
      console.error('Elections error:', err);
    } finally {
      setLoading(false);
    }
  };

  const electionTypes = [
    { id: 'national', name: 'National', icon: FaGlobeAmericas, color: 'primary' },
    { id: 'state', name: 'State', icon: FaCity, color: 'success' },
    { id: 'local', name: 'Local', icon: FaHome, color: 'info' },
    { id: 'university', name: 'University', icon: FaUniversity, color: 'warning' }
  ];

  const getElectionIcon = (type) => {
    const electionType = electionTypes.find(et => et.id === type);
    return electionType ? electionType.icon : FaVoteYea;
  };

  const getElectionColor = (type) => {
    const electionType = electionTypes.find(et => et.id === type);
    return electionType ? electionType.color : 'primary';
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <Card className="shadow-sm border-0">
      <Card.Header className="bg-white border-0">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0 d-flex align-items-center">
            <FaVoteYea className="me-2 text-primary" />
            Election Portal
          </h5>
          <div className="d-flex gap-2">
            <Form.Control 
              type="text" 
              placeholder="Search elections..." 
              size="sm"
              style={{ width: '200px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Dropdown>
              <Dropdown.Toggle variant="outline-secondary" size="sm">
                <FaFilter className="me-1" />
                Filter
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => setElectionType('all')}>All Elections</Dropdown.Item>
                <Dropdown.Item onClick={() => setElectionType('active')}>Active Elections</Dropdown.Item>
                <Dropdown.Item onClick={() => setElectionType('upcoming')}>Upcoming Elections</Dropdown.Item>
                <Dropdown.Item onClick={() => setElectionType('completed')}>Completed Elections</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </div>
      </Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}

        {/* Election Type Navigation */}
        <Nav variant="pills" className="mb-4 justify-content-center">
          {electionTypes.map(type => (
            <Nav.Item key={type.id}>
              <Nav.Link 
                eventKey={type.id}
                className="text-center mx-1"
                active={electionType === type.id}
                onClick={() => setElectionType(type.id)}
              >
                {React.createElement(type.icon, { className: 'mb-1 d-block mx-auto' })}
                <small>{type.name}</small>
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>

        {/* Election Cards */}
        <Row>
          {elections.upcoming && elections.upcoming.length > 0 ? (
            elections.upcoming.slice(0, 6).map(election => (
              <Col lg={4} md={6} className="mb-4" key={election.id}>
                <Card className="border-0 shadow-sm h-100">
                  <Card.Header className={`bg-${getElectionColor(election.type)} text-white`}>
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 className="mb-0">{election.title}</h6>
                      {React.createElement(getElectionIcon(election.type), { className: 'fs-5' })}
                    </div>
                  </Card.Header>
                  <Card.Body>
                    <div className="mb-3">
                      <small className="text-muted">Election Date</small>
                      <div className="d-flex align-items-center">
                        <FaCalendarAlt className="me-2 text-primary" />
                        {new Date(election.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted">Status</small>
                      <div>
                        <Badge bg="success" className="w-100">Registration Open</Badge>
                      </div>
                    </div>
                    <ProgressBar now={65} label={`65% Registered`} className="mb-3" />
                    <div className="d-grid gap-2">
                      <Button variant="primary" size="sm">
                        <FaEye className="me-1" />
                        View Details
                      </Button>
                      <Button variant="outline-primary" size="sm">
                        <FaVoteYea className="me-1" />
                        Cast Vote
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))
          ) : (
            <Col className="text-center py-5">
              <FaVoteYea className="text-muted fs-1 mb-3" />
              <h5 className="text-muted">No Elections Available</h5>
              <p className="text-muted">There are no {electionType} elections at the moment.</p>
            </Col>
          )}
        </Row>
      </Card.Body>
    </Card>
  );
};

export default ElectionsTab;