import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Navbar, Nav, Container, Button, Dropdown, Badge } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import './Header.css'; // Create this CSS file for custom styles

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActiveRoute = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <Navbar 
      bg="dark" 
      variant="dark" 
      expand="lg" 
      fixed="top"
      className={`custom-navbar ${scrolled ? 'scrolled' : ''} shadow-lg`}
    >
      <Container fluid="lg">
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center brand-logo">
          <div className="logo-icon me-2">🗳️</div>
          <div>
            <span className="fw-bold brand-text">SmartVote</span>
            <small className="d-block brand-subtitle">Secure Digital Voting</small>
          </div>
        </Navbar.Brand>
        
        <Navbar.Toggle aria-controls="main-navbar" className="border-0">
          <span className="navbar-toggler-icon-custom"></span>
        </Navbar.Toggle>
        
        <Navbar.Collapse id="main-navbar">
          <Nav className="mx-auto">
            <Nav.Link 
              as={Link} 
              to="/" 
              className={`nav-link-custom ${isActiveRoute('/')}`}
            >
              <i className="bi bi-house me-1"></i>Home
            </Nav.Link>
            
            <Nav.Link 
              as={Link} 
              to="/elections"
              className={`nav-link-custom ${isActiveRoute('/elections')}`}
            >
              <i className="bi bi-calendar-event me-1"></i>Elections
            </Nav.Link>
            
            <Nav.Link 
              as={Link} 
              to="/results"
              className={`nav-link-custom ${isActiveRoute('/results')}`}
            >
              <i className="bi bi-graph-up me-1"></i>Results
            </Nav.Link>
            
            <Nav.Link 
              as={Link} 
              to="/help"
              className={`nav-link-custom ${isActiveRoute('/help')}`}
            >
              <i className="bi bi-question-circle me-1"></i>Help
            </Nav.Link>
          </Nav>
          
          <Nav className="align-items-lg-center">
            {isAuthenticated ? (
              <div className="d-flex align-items-center">
                <Dropdown align="end">
                  <Dropdown.Toggle 
                    variant="outline-light" 
                    id="user-dropdown"
                    className="d-flex align-items-center user-dropdown-toggle"
                  >
                    <div className="user-avatar me-2">
                      {user?.name?.charAt(0)?.toUpperCase() || user?.voterId?.charAt(0)}
                    </div>
                    <div className="d-none d-md-block">
                      <div className="small fw-bold">{user?.name || 'User'}</div>
                      <div className="x-small text-muted">{user?.voterId}</div>
                    </div>
                  </Dropdown.Toggle>

                  <Dropdown.Menu className="dropdown-menu-custom shadow">
                    <Dropdown.Header>
                      <div className="fw-bold">{user?.name}</div>
                      <div className="small text-muted">{user?.voterId}</div>
                      <Badge bg={user?.role === 'admin' ? 'warning' : 'primary'} className="mt-1">
                        {user?.role}
                      </Badge>
                    </Dropdown.Header>
                    
                    <Dropdown.Divider />
                    
                    <Dropdown.Item as={Link} to="/dashboard" className="dropdown-item-custom">
                      <i className="bi bi-speedometer2 me-2"></i>Dashboard
                    </Dropdown.Item>
                    
                    <Dropdown.Item as={Link} to="/profile" className="dropdown-item-custom">
                      <i className="bi bi-person me-2"></i>My Profile
                    </Dropdown.Item>
                    
                    {user?.role === 'admin' && (
                      <Dropdown.Item as={Link} to="/admin" className="dropdown-item-custom">
                        <i className="bi bi-shield-lock me-2"></i>Admin Panel
                      </Dropdown.Item>
                    )}
                    
                    <Dropdown.Divider />
                    
                    <Dropdown.Item 
                      onClick={handleLogout} 
                      className="dropdown-item-custom text-danger"
                    >
                      <i className="bi bi-box-arrow-right me-2"></i>Logout
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            ) : (
              <div className="d-flex gap-2">
                <Button 
                  as={Link} 
                  to="/login" 
                  variant="outline-light" 
                  className="btn-custom"
                >
                  <i className="bi bi-box-arrow-in-right me-1"></i>Login
                </Button>
                
                <Button 
                  as={Link} 
                  to="/register" 
                  variant="primary" 
                  className="btn-primary-custom"
                >
                  <i className="bi bi-person-plus me-1"></i>Register
                </Button>
              </div>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;