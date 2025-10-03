import React, { useState } from 'react';
import { Container, Row, Col, Card, Accordion, Badge, Button, Modal } from 'react-bootstrap';
import { 
  FaUserPlus, 
  FaVoteYea, 
  FaCamera, 
  FaShieldAlt, 
  FaQuestionCircle, 
  FaLightbulb,
  FaHeadset,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa';

const HelpPage = () => {
  const [showContactModal, setShowContactModal] = useState(false);

  const helpSections = [
    {
      id: 1,
      title: "Voter Registration Process",
      icon: <FaUserPlus className="text-primary" />,
      badge: "Essential",
      items: [
        "Navigate to 'Register as Voter' from the homepage",
        "Complete the secure registration form with valid identification",
        "Undergo biometric face registration using your device camera",
        "Receive your unique Voter ID credentials",
        "Awrite email verification and approval"
      ],
      tips: [
        "Have government-issued ID ready for verification",
        "Ensure stable internet connection during registration",
        "Complete process in a well-lit environment"
      ]
    },
    {
      id: 2,
      title: "Casting Your Vote Securely",
      icon: <FaVoteYea className="text-success" />,
      badge: "Step-by-Step",
      items: [
        "Authenticate using Voter ID + Facial Recognition",
        "Access your personalized voting dashboard",
        "Select from available active elections",
        "Review candidate profiles and information",
        "Cast your vote with final confirmation"
      ],
      tips: [
        "Votes are encrypted and cannot be modified once cast",
        "Double-check your selection before confirming",
        "Keep your voting session private and secure"
      ]
    },
    {
      id: 3,
      title: "Biometric Authentication Guide",
      icon: <FaCamera className="text-warning" />,
      badge: "Technical",
      items: [
        "Ensure proper lighting - avoid backlighting",
        "Position face centrally in the camera frame",
        "Remove obstructions (hats, sunglasses, masks)",
        "Maintain neutral expression for accurate scanning",
        "Use HD camera for optimal performance"
      ],
      tips: [
        "Try Chrome or Firefox for best compatibility",
        "Allow camera permissions when prompted",
        "Reset facial data if significant appearance changes occur"
      ]
    },
    {
      id: 4,
      title: "Security & Privacy Assurance",
      icon: <FaShieldAlt className="text-info" />,
      badge: "Important",
      items: [
        "Military-grade encryption for all data transmission",
        "Biometric data is hashed and never stored raw",
        "Multi-factor authentication protocol",
        "Real-time fraud detection monitoring",
        "Complete audit trail for transparency"
      ],
      tips: [
        "Never share your Voter ID with others",
        "Log out after each session on shared devices",
        "Report suspicious activity immediately"
      ]
    }
  ];

  const stats = [
    { icon: <FaCheckCircle />, value: "99.9%", label: "System Uptime" },
    { icon: <FaClock />, value: "<2min", label: "Average Voting Time" },
    { icon: <FaShieldAlt />, value: "256-bit", label: "Encryption Standard" },
    { icon: <FaUserPlus />, value: "98%", label: "Success Rate" }
  ];

  return (
    <>
      {/* Hero Section */}
      <div className="help-hero bg-gradient-primary text-white py-5">
        <Container>
          <Row className="text-center py-4">
            <Col lg={8} className="mx-auto">
              <div className="hero-icon mb-3">
                <FaQuestionCircle size={60} />
              </div>
              <h1 className="display-5 fw-bold mb-3">Smart Voting Assistance Center</h1>
              <p className="lead mb-4">
                Comprehensive support for our cutting-edge facial recognition voting platform. 
                Your secure voting experience is our top priority.
              </p>
              <div className="d-flex gap-3 justify-content-center flex-wrap">
                <Button 
                  variant="light" 
                  size="lg"
                  onClick={() => setShowContactModal(true)}
                >
                  <FaHeadset className="me-2" />
                  Contact Support
                </Button>
                <Button variant="outline-light" size="lg">
                  Emergency Voting Help
                </Button>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Stats Section */}
      <Container className="py-4">
        <Row className="g-4">
          {stats.map((stat, index) => (
            <Col lg={3} md={6} key={index}>
              <Card className="stat-card text-center border-0 shadow-sm h-100">
                <Card.Body className="py-4">
                  <div className="stat-icon text-primary mb-3">
                    {stat.icon}
                  </div>
                  <h3 className="fw-bold text-dark">{stat.value}</h3>
                  <p className="text-muted mb-0">{stat.label}</p>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>

      {/* Main Help Content */}
      <Container className="py-5">
        <Row>
          <Col lg={10} className="mx-auto">
            <div className="text-center mb-5">
              <Badge bg="primary" className="mb-3 px-3 py-2">FAQ Knowledge Base</Badge>
              <h2 className="h1 fw-bold">Frequently Asked Questions</h2>
              <p className="text-muted">Quick answers to common questions about our smart voting system</p>
            </div>

            <Accordion defaultActiveKey="0" flush className="help-accordion">
              {helpSections.map((section, index) => (
                <Accordion.Item key={section.id} eventKey={index.toString()} className="mb-3 shadow-sm">
                  <Accordion.Header className="fw-semibold">
                    <div className="d-flex align-items-center">
                      <span className="me-3">{section.icon}</span>
                      {section.title}
                      <Badge bg="outline-primary" className="ms-2">{section.badge}</Badge>
                    </div>
                  </Accordion.Header>
                  <Accordion.Body className="py-4">
                    <Row>
                      <Col md={6}>
                        <h6 className="fw-bold mb-3">Process Steps:</h6>
                        <ol className="list-steps">
                          {section.items.map((item, idx) => (
                            <li key={idx} className="mb-2">{item}</li>
                          ))}
                        </ol>
                      </Col>
                      <Col md={6}>
                        <div className="tips-card bg-light rounded p-3">
                          <div className="d-flex align-items-center mb-2">
                            <FaLightbulb className="text-warning me-2" />
                            <h6 className="fw-bold mb-0">Pro Tips</h6>
                          </div>
                          <ul className="list-unstyled">
                            {section.tips.map((tip, idx) => (
                              <li key={idx} className="mb-1">
                                <small>• {tip}</small>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </Col>
                    </Row>
                  </Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
          </Col>
        </Row>
      </Container>

      {/* Emergency Help Section */}
      <div className="bg-light py-5">
        <Container>
          <Row>
            <Col lg={8} className="mx-auto text-center">
              <div className="emergency-card bg-white rounded shadow p-4">
                <FaExclamationTriangle className="text-warning mb-3" size={40} />
                <h4 className="fw-bold">Need Immediate Assistance?</h4>
                <p className="text-muted mb-4">
                  Our support team is available 24/7 during election periods to ensure your vote counts.
                </p>
                <div className="d-flex gap-3 justify-content-center flex-wrap">
                  <Button variant="primary" size="lg">
                    Live Chat Support
                  </Button>
                  <Button variant="outline-danger" size="lg">
                    Emergency Hotline
                  </Button>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Contact Modal */}
      <Modal show={showContactModal} onHide={() => setShowContactModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Contact Voting Support</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={6}>
              <h6>Support Channels</h6>
              <ul className="list-unstyled">
                <li className="mb-2">📞 Hotline: 1-800-VOTE-NOW</li>
                <li className="mb-2">✉️ Email: support@smartvote.gov</li>
                <li className="mb-2">💬 Live Chat: Available 24/7</li>
                <li className="mb-2">🏢 In-Person: Local Election Offices</li>
              </ul>
            </Col>
            <Col md={6}>
              <h6>Response Times</h6>
              <ul className="list-unstyled">
                <li className="mb-2">Emergency: <Badge bg="danger">Immediate</Badge></li>
                <li className="mb-2">Technical: <Badge bg="warning">Under 15min</Badge></li>
                <li className="mb-2">General: <Badge bg="success">Under 2 hours</Badge></li>
              </ul>
            </Col>
          </Row>
        </Modal.Body>
      </Modal>

      <style jsx>{`
        .help-hero {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .hero-icon {
          opacity: 0.9;
        }
        .stat-card {
          transition: transform 0.3s ease;
        }
        .stat-card:hover {
          transform: translateY(-5px);
        }
        .stat-icon {
          font-size: 2rem;
        }
        .help-accordion .accordion-button {
          font-weight: 600;
          padding: 1.5rem;
        }
        .help-accordion .accordion-button:not(.collapsed) {
          background-color: #f8f9fa;
          color: #495057;
        }
        .list-steps li {
          margin-bottom: 0.5rem;
          line-height: 1.5;
        }
        .tips-card {
          border-left: 4px solid #ffc107;
        }
        .emergency-card {
          border: 2px solid #ffc107;
        }
      `}</style>
    </>
  );
};

export default HelpPage;