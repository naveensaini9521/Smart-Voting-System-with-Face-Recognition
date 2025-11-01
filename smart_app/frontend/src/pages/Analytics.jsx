import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, ProgressBar, Badge, 
  Spinner, Alert, ListGroup 
} from 'react-bootstrap';
import { 
  FaChartBar, 
  FaVoteYea, 
  FaUsers, 
  FaCalendarAlt,
  FaTrophy,
  FaChartLine,
  FaMapMarkerAlt,
  FaUser
} from 'react-icons/fa';
import { voterAPI } from '../services/api';

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await voterAPI.getAnalytics();
      if (response.success) {
        setAnalyticsData(response.analytics_data);
      } else {
        setError(response.message || 'Failed to load analytics data');
      }
    } catch (err) {
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <div className="mt-3">
            <p>Loading analytics data...</p>
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
            <FaChartBar className="me-3 text-primary" />
            Voting Analytics
          </h2>
          <p className="text-muted">
            Insights into your voting patterns and participation
          </p>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger">
          {error}
        </Alert>
      )}

      {analyticsData && (
        <>
          {/* Key Metrics */}
          <Row className="mb-4">
            <Col lg={3} md={6} className="mb-3">
              <Card className="border-0 bg-primary text-white h-100">
                <Card.Body className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h4>{analyticsData.votes_cast || 0}</h4>
                    <p className="mb-0">Total Votes Cast</p>
                  </div>
                  <FaVoteYea className="fs-1 opacity-50" />
                </Card.Body>
              </Card>
            </Col>
            
            <Col lg={3} md={6} className="mb-3">
              <Card className="border-0 bg-success text-white h-100">
                <Card.Body className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h4>{analyticsData.elections_participated || 0}</h4>
                    <p className="mb-0">Elections Participated</p>
                  </div>
                  <FaUsers className="fs-1 opacity-50" />
                </Card.Body>
              </Card>
            </Col>
            
            <Col lg={3} md={6} className="mb-3">
              <Card className="border-0 bg-info text-white h-100">
                <Card.Body className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h4>{analyticsData.participation_rate || 0}%</h4>
                    <p className="mb-0">Participation Rate</p>
                  </div>
                  <FaChartLine className="fs-1 opacity-50" />
                </Card.Body>
              </Card>
            </Col>
            
            <Col lg={3} md={6} className="mb-3">
              <Card className="border-0 bg-warning text-white h-100">
                <Card.Body className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h4>#{analyticsData.constituency_ranking?.rank || 'N/A'}</h4>
                    <p className="mb-0">Constituency Rank</p>
                  </div>
                  <FaTrophy className="fs-1 opacity-50" />
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            {/* Participation Progress */}
            <Col lg={8} className="mb-4">
              <Card className="shadow-sm h-100">
                <Card.Header className="bg-white">
                  <h5 className="mb-0 d-flex align-items-center">
                    <FaChartLine className="me-2 text-primary" />
                    Participation Overview
                  </h5>
                </Card.Header>
                <Card.Body>
                  <div className="mb-4">
                    <div className="d-flex justify-content-between mb-2">
                      <span>Overall Participation Rate</span>
                      <span className="fw-bold">{analyticsData.participation_rate || 0}%</span>
                    </div>
                    <ProgressBar 
                      now={analyticsData.participation_rate || 0} 
                      variant="success"
                      style={{ height: '20px' }}
                    />
                  </div>

                  {/* Election Type Breakdown */}
                  <h6 className="mb-3">Participation by Election Type</h6>
                  {analyticsData.type_breakdown?.map((type, index) => (
                    <div key={index} className="mb-3">
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-capitalize">{type._id || 'Unknown'}</span>
                        <span className="fw-bold">{type.count} votes</span>
                      </div>
                      <ProgressBar 
                        now={(type.count / analyticsData.votes_cast) * 100} 
                        variant={index % 2 === 0 ? 'primary' : 'info'}
                      />
                    </div>
                  ))}

                  {(!analyticsData.type_breakdown || analyticsData.type_breakdown.length === 0) && (
                    <div className="text-center py-3 text-muted">
                      <FaChartLine className="fs-1 mb-2" />
                      <p>No participation data available</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* Ranking and Stats */}
            <Col lg={4} className="mb-4">
              <Card className="shadow-sm h-100">
                <Card.Header className="bg-white">
                  <h5 className="mb-0 d-flex align-items-center">
                    <FaTrophy className="me-2 text-warning" />
                    Your Ranking
                  </h5>
                </Card.Header>
                <Card.Body>
                  {analyticsData.constituency_ranking ? (
                    <>
                      <div className="text-center mb-4">
                        <div className="bg-warning rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                             style={{ width: '80px', height: '80px' }}>
                          <span className="text-white fw-bold fs-3">
                            #{analyticsData.constituency_ranking.rank}
                          </span>
                        </div>
                        <h5>Rank in Constituency</h5>
                        <p className="text-muted">
                          Out of {analyticsData.constituency_ranking.total_voters} voters
                        </p>
                      </div>

                      <div className="mb-3">
                        <div className="d-flex justify-content-between">
                          <span>Percentile</span>
                          <span className="fw-bold">
                            {analyticsData.constituency_ranking.percentile}%
                          </span>
                        </div>
                        <ProgressBar 
                          now={analyticsData.constituency_ranking.percentile} 
                          variant="warning"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4 text-muted">
                      <FaTrophy className="fs-1 mb-2" />
                      <p>Ranking data not available</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Activity Trend */}
          <Row>
            <Col lg={6} className="mb-4">
              <Card className="shadow-sm h-100">
                <Card.Header className="bg-white">
                  <h5 className="mb-0 d-flex align-items-center">
                    <FaCalendarAlt className="me-2 text-primary" />
                    Voting Activity Trend
                  </h5>
                </Card.Header>
                <Card.Body>
                  {analyticsData.activity_trend?.length > 0 ? (
                    <ListGroup variant="flush">
                      {analyticsData.activity_trend.map((period, index) => (
                        <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                          <span>{period.period}</span>
                          <Badge bg="primary" pill>
                            {period.votes} votes
                          </Badge>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  ) : (
                    <div className="text-center py-4 text-muted">
                      <FaCalendarAlt className="fs-1 mb-2" />
                      <p>No activity data available</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* Quick Stats */}
            <Col lg={6} className="mb-4">
              <Card className="shadow-sm h-100">
                <Card.Header className="bg-white">
                  <h5 className="mb-0 d-flex align-items-center">
                    <FaUser className="me-2 text-info" />
                    Voter Profile
                  </h5>
                </Card.Header>
                <Card.Body>
                  <ListGroup variant="flush">
                    <ListGroup.Item className="d-flex justify-content-between align-items-center">
                      <span>Voting Consistency</span>
                      <Badge bg={analyticsData.participation_rate > 70 ? 'success' : 'warning'}>
                        {analyticsData.participation_rate > 70 ? 'High' : 'Moderate'}
                      </Badge>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between align-items-center">
                      <span>Preferred Election Type</span>
                      <Badge bg="info">
                        {analyticsData.type_breakdown?.[0]?._id || 'N/A'}
                      </Badge>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between align-items-center">
                      <span>Last Vote</span>
                      <small className="text-muted">
                        {analyticsData.activity_trend?.[0]?.period || 'N/A'}
                      </small>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between align-items-center">
                      <span>Average Votes/Year</span>
                      <Badge bg="primary">
                        {Math.round(analyticsData.votes_cast / 3) || 0}
                      </Badge>
                    </ListGroup.Item>
                  </ListGroup>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Achievements */}
          <Card className="shadow-sm">
            <Card.Header className="bg-white">
              <h5 className="mb-0 d-flex align-items-center">
                <FaTrophy className="me-2 text-warning" />
                Achievements & Milestones
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4} className="text-center mb-3">
                  <div className={`rounded-circle d-inline-flex align-items-center justify-content-center mb-2 
                                ${analyticsData.votes_cast >= 1 ? 'bg-success' : 'bg-light'}`}
                       style={{ width: '60px', height: '60px' }}>
                    <FaVoteYea className={`fs-4 ${analyticsData.votes_cast >= 1 ? 'text-white' : 'text-muted'}`} />
                  </div>
                  <h6>First Vote</h6>
                  <small className="text-muted">
                    {analyticsData.votes_cast >= 1 ? 'Achieved' : 'Cast your first vote'}
                  </small>
                </Col>
                
                <Col md={4} className="text-center mb-3">
                  <div className={`rounded-circle d-inline-flex align-items-center justify-content-center mb-2 
                                ${analyticsData.votes_cast >= 5 ? 'bg-success' : 'bg-light'}`}
                       style={{ width: '60px', height: '60px' }}>
                    <FaUsers className={`fs-4 ${analyticsData.votes_cast >= 5 ? 'text-white' : 'text-muted'}`} />
                  </div>
                  <h6>Regular Voter</h6>
                  <small className="text-muted">
                    {analyticsData.votes_cast >= 5 ? '5+ votes cast' : 'Cast 5 votes'}
                  </small>
                </Col>
                
                <Col md={4} className="text-center mb-3">
                  <div className={`rounded-circle d-inline-flex align-items-center justify-content-center mb-2 
                                ${analyticsData.participation_rate >= 80 ? 'bg-success' : 'bg-light'}`}
                       style={{ width: '60px', height: '60px' }}>
                    <FaChartLine className={`fs-4 ${analyticsData.participation_rate >= 80 ? 'text-white' : 'text-muted'}`} />
                  </div>
                  <h6>Dedicated Citizen</h6>
                  <small className="text-muted">
                    {analyticsData.participation_rate >= 80 ? '80%+ participation' : 'Maintain 80% participation'}
                  </small>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </>
      )}
    </Container>
  );
};

export default Analytics;