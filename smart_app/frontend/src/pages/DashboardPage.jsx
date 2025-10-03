import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

const DashboardPage = () => {
  const { user } = useAuth();

  return (
    <Container className="dashboard-page py-5">
      <Row>
        <Col>
          <h2>Welcome back, {user?.fullName}!</h2>
          <p className="text-muted">Voter ID: {user?.voterId}</p>
        </Col>
      </Row>
      
      <Row className="mt-4">
        <Col md={6} className="mb-4">
          <Card>
            <Card.Body className="text-center">
              <h5>Active Elections</h5>
              <p className="display-6 text-primary">0</p>
              <small className="text-muted">No active elections</small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6} className="mb-4">
          <Card>
            <Card.Body className="text-center">
              <h5>Votes Cast</h5>
              <p className="display-6 text-success">0</p>
              <small className="text-muted">This election cycle</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DashboardPage;