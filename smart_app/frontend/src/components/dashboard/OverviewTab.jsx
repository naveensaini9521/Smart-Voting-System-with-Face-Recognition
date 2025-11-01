import React, { useState } from 'react';
import { Row, Col, Card, Button, Badge, ProgressBar, ListGroup, Dropdown, Form } from 'react-bootstrap';
import { 
  FaVoteYea, FaHistory, FaCalendarAlt, FaMapMarkerAlt, FaFilter,
  FaGlobeAmericas, FaCity, FaHome, FaUniversity, FaSchool, FaUsers, FaChartBar
} from 'react-icons/fa';

const OverviewTab = ({ dashboardData }) => {
  const [electionType, setElectionType] = useState('all');

  const safeRender = (value, defaultValue = 'N/A') => {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    return value.toString();
  };

  // Election types data
  const electionTypes = [
    { id: 'national', name: 'National Elections', icon: FaGlobeAmericas, color: 'primary' },
    { id: 'state', name: 'State Elections', icon: FaCity, color: 'success' },
    { id: 'local', name: 'Local Body Elections', icon: FaHome, color: 'info' },
    { id: 'university', name: 'University Elections', icon: FaUniversity, color: 'warning' },
    { id: 'college', name: 'College Elections', icon: FaUniversity, color: 'secondary' },
    { id: 'school', name: 'School Elections', icon: FaSchool, color: 'light' },
    { id: 'village', name: 'Village Council', icon: FaUsers, color: 'dark' },
    { id: 'organization', name: 'Organization', icon: FaChartBar, color: 'danger' }
  ];

  const getElectionIcon = (type) => {
    const electionType = electionTypes.find(et => et.id === type);
    return electionType ? electionType.icon : FaVoteYea;
  };

  const getElectionColor = (type) => {
    const electionType = electionTypes.find(et => et.id === type);
    return electionType ? electionType.color : 'primary';
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">Welcome back, {safeRender(dashboardData.voter_info?.full_name)}! 👋</h4>
          <p className="text-muted mb-0">
            Here's your complete voting dashboard and election management portal
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" size="sm">
            <FaFilter className="me-1" />
            Refresh
          </Button>
          <Button variant="primary" size="sm">
            Share
          </Button>
        </div>
      </div>

      {/* Enhanced Quick Stats */}
      <Row className="mb-4">
        <Col xl={3} lg={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100 bg-gradient-primary text-white">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h4 className="mb-1">{safeRender(dashboardData.quick_stats?.votes_cast, '0')}</h4>
                <p className="mb-0 opacity-75">Votes Cast</p>
              </div>
              <FaVoteYea className="fs-1 opacity-50" />
            </Card.Body>
          </Card>
        </Col>
        <Col xl={3} lg={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100 bg-gradient-success text-white">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h4 className="mb-1">{safeRender(dashboardData.quick_stats?.elections_participated, '0')}</h4>
                <p className="mb-0 opacity-75">Elections</p>
              </div>
              <FaHistory className="fs-1 opacity-50" />
            </Card.Body>
          </Card>
        </Col>
        <Col xl={3} lg={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100 bg-gradient-warning text-white">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h4 className="mb-1">{safeRender(dashboardData.quick_stats?.upcoming_elections, '0')}</h4>
                <p className="mb-0 opacity-75">Upcoming</p>
              </div>
              <FaCalendarAlt className="fs-1 opacity-50" />
            </Card.Body>
          </Card>
        </Col>
        <Col xl={3} lg={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100 bg-gradient-info text-white">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="mb-1">{safeRender(dashboardData.voter_info?.constituency)}</h6>
                <p className="mb-0 opacity-75">Constituency</p>
              </div>
              <FaMapMarkerAlt className="fs-1 opacity-50" />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Election Types Grid */}
        <Col lg={8}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-white border-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Available Election Types</h5>
                <Dropdown>
                  <Dropdown.Toggle variant="outline-secondary" size="sm">
                    <FaFilter className="me-1" />
                    Filter
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => setElectionType('all')}>All Types</Dropdown.Item>
                    <Dropdown.Divider />
                    {electionTypes.map(type => (
                      <Dropdown.Item key={type.id} onClick={() => setElectionType(type.id)}>
                        {type.name}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            </Card.Header>
            <Card.Body>
              <Row>
                {electionTypes.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <Col lg={6} className="mb-3" key={type.id}>
                      <Card className={`border-${type.color} h-100`}>
                        <Card.Body className="d-flex align-items-center">
                          <div className={`bg-${type.color} rounded-circle d-flex align-items-center justify-content-center me-3`} 
                               style={{ width: '50px', height: '50px' }}>
                            <IconComponent className="text-white" />
                          </div>
                          <div className="flex-grow-1">
                            <h6 className="mb-1">{type.name}</h6>
                            <small className="text-muted">Active elections available</small>
                          </div>
                          <Badge bg={type.color}>3</Badge>
                        </Card.Body>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </Card.Body>
          </Card>
        </Col>

        {/* Upcoming Elections Sidebar */}
        <Col lg={4}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white border-0">
              <h5 className="mb-0 d-flex align-items-center">
                <FaCalendarAlt className="me-2 text-primary" />
                Upcoming Elections
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              {dashboardData.election_info?.upcoming_elections?.length > 0 ? (
                <ListGroup variant="flush">
                  {dashboardData.election_info.upcoming_elections.slice(0, 4).map(election => (
                    <ListGroup.Item key={election.id} className="border-0">
                      <div className="d-flex align-items-start">
                        <div className={`bg-${getElectionColor(election.type)} rounded-circle d-flex align-items-center justify-content-center me-3`} 
                             style={{ width: '40px', height: '40px' }}>
                          {React.createElement(getElectionIcon(election.type), { className: 'text-white' })}
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="mb-1">{safeRender(election.title)}</h6>
                          <small className="text-muted">
                            <FaCalendarAlt className="me-1" />
                            {safeRender(election.date)}
                          </small>
                        </div>
                        <Badge bg={getElectionColor(election.type)}>
                          {safeRender(election.status)}
                        </Badge>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <div className="text-center py-4">
                  <FaCalendarAlt className="text-muted fs-1 mb-3" />
                  <h6 className="text-muted">No Upcoming Elections</h6>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Quick Access Card */}
          <Card className="shadow-sm border-0 mt-3">
            <Card.Header className="bg-white border-0">
              <h6 className="mb-0">Quick Access</h6>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button variant="outline-primary" size="sm">
                  <FaMapMarkerAlt className="me-2" />
                  Mobile Verification
                </Button>
                <Button variant="outline-success" size="sm">
                  <FaUsers className="me-2" />
                  Security Settings
                </Button>
                <Button variant="outline-info" size="sm">
                  <FaDownload className="me-2" />
                  Download Voter Slip
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OverviewTab;