import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Tab, Tabs, Button, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { 
    Trophy, ArrowLeft, Download, Share, CheckCircle, XCircle, Clock,
    People,  // Correct icon name
    Award 
} from 'react-bootstrap-icons';
import { useAuth } from '../context/AuthContext';

const ResultsPage = () => {
    const { electionId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [election, setElection] = useState(null);
    const [results, setResults] = useState([]);
    const [voterTurnout, setVoterTurnout] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [exportModal, setExportModal] = useState(false);
    const [exportFormat, setExportFormat] = useState('pdf');

    // Mock data - Replace with actual API calls
    useEffect(() => {
        const fetchResults = async () => {
            try {
                // Simulate API call
                setTimeout(() => {
                    setElection({
                        id: electionId || '1',
                        title: 'Student Council Election 2024',
                        description: 'Annual student council election',
                        startDate: '2024-01-01',
                        endDate: '2024-01-31',
                        status: 'completed'
                    });

                    setResults([
                        { candidate: 'John Doe', votes: 1500, percentage: 45 },
                        { candidate: 'Jane Smith', votes: 1200, percentage: 36 },
                        { candidate: 'Mike Johnson', votes: 650, percentage: 19 }
                    ]);

                    setVoterTurnout(78.5);
                    setLoading(false);
                }, 1000);
            } catch (error) {
                console.error('Error fetching results:', error);
                setLoading(false);
            }
        };

        fetchResults();
    }, [electionId]);

    if (loading) {
        return (
            <Container className="py-5">
                <div className="text-center">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2">Loading election results...</p>
                </div>
            </Container>
        );
    }

    return (
        <Container className="py-4">
            <Row>
                <Col>
                    <div className="d-flex align-items-center mb-4">
                        <Button variant="outline-primary" onClick={() => navigate(-1)} className="me-3">
                            <ArrowLeft className="me-2" />
                            Back
                        </Button>
                        <h2 className="mb-0">
                            <Trophy className="me-2" />
                            Election Results
                        </h2>
                    </div>

                    {election && (
                        <Card className="mb-4">
                            <Card.Header>
                                <h5 className="mb-0">{election.title}</h5>
                            </Card.Header>
                            <Card.Body>
                                <p>{election.description}</p>
                                <div className="d-flex gap-4 text-muted">
                                    <span><Clock className="me-1" /> {election.startDate} to {election.endDate}</span>
                                    <span><People className="me-1" /> {voterTurnout}% Voter Turnout</span>
                                </div>
                            </Card.Body>
                        </Card>
                    )}

                    <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
                        <Tab eventKey="overview" title="Overview">
                            <Row>
                                <Col md={8}>
                                    <Card>
                                        <Card.Header>
                                            <h6>Vote Distribution</h6>
                                        </Card.Header>
                                        <Card.Body>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart data={results}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="candidate" />
                                                    <YAxis />
                                                    <Tooltip />
                                                    <Legend />
                                                    <Bar dataKey="votes" fill="#8884d8" name="Votes" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={4}>
                                    <Card>
                                        <Card.Header>
                                            <h6>Results Summary</h6>
                                        </Card.Header>
                                        <Card.Body>
                                            {results.map((result, index) => (
                                                <div key={index} className="mb-3">
                                                    <div className="d-flex justify-content-between">
                                                        <span>{result.candidate}</span>
                                                        <strong>{result.votes} votes</strong>
                                                    </div>
                                                    <div className="progress" style={{ height: '8px' }}>
                                                        <div 
                                                            className="progress-bar" 
                                                            style={{ width: `${result.percentage}%` }}
                                                        ></div>
                                                    </div>
                                                    <small className="text-muted">{result.percentage}%</small>
                                                </div>
                                            ))}
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </Tab>
                    </Tabs>

                    <div className="text-center">
                        <Button variant="outline-primary" onClick={() => setExportModal(true)}>
                            <Download className="me-2" />
                            Export Results
                        </Button>
                    </div>
                </Col>
            </Row>

            {/* Export Modal */}
            <Modal show={exportModal} onHide={() => setExportModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Export Results</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group>
                            <Form.Label>Select Format</Form.Label>
                            <Form.Select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                                <option value="pdf">PDF</option>
                                <option value="csv">CSV</option>
                                <option value="excel">Excel</option>
                            </Form.Select>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setExportModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={() => setExportModal(false)}>
                        <Download className="me-2" />
                        Export
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default ResultsPage;