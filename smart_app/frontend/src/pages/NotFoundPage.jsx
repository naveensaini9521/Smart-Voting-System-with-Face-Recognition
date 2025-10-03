import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <Container className="not-found-page py-5">
      <Row className="justify-content-center">
        <Col md={6} className="text-center">
          <Card>
            <Card.Body>
              <div style={{fontSize: '6rem'}}>🔍</div>
              <h1>404</h1>
              <h3>Page Not Found</h3>
              <p className="text-muted">
                The page you're looking for doesn't exist or has been moved.
              </p>
              <Button as={Link} to="/" variant="primary">
                Go Back Home
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default NotFoundPage;