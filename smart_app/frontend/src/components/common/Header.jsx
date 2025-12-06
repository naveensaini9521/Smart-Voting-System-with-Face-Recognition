import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Navbar, Nav, Container, Button, Dropdown, Badge } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { 
  FaHome, FaVoteYea, FaChartBar, FaQuestionCircle, 
  FaUser, FaSignInAlt, FaUserPlus, FaCog, FaShieldAlt,
  FaLock, FaUsers, FaCalendarAlt, FaBell, FaTachometerAlt,
  FaBars, FaTimes
} from 'react-icons/fa';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, getUserRole, getUserDisplayName, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const navbarRef = useRef(null);

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close navbar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target)) {
        setExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close navbar when route changes
  useEffect(() => {
    setExpanded(false);
  }, [location.pathname]);

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.userType === 'admin';

  // Display user info
  const userDisplayName = getUserDisplayName?.() || user?.name || user?.username || 'User';
  const userRole = getUserRole?.() || user?.role || 'voter';
  
  const handleLogout = () => {
    logout();
    navigate('/');
    setExpanded(false);
  };

  const isActiveRoute = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    return location.pathname.startsWith(path);
  };

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  return (
    <Navbar 
      ref={navbarRef}
      bg="dark" 
      variant="dark" 
      expand="lg" 
      expanded={expanded}
      className={`custom-navbar ${scrolled ? 'scrolled' : ''} shadow-lg`}
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}
    >
      <Container fluid="lg">
        {/* Brand Logo */}
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center brand-logo">
          <div className="logo-icon me-2" style={{ fontSize: '1.8rem' }}>🗳️</div>
          <div>
            <span className="fw-bold brand-text" style={{ fontSize: '1.5rem' }}>SmartVote</span>
            <small className="d-block brand-subtitle">Secure Digital Voting</small>
          </div>
        </Navbar.Brand>
        
        {/* Mobile Toggle - Fixed icon */}
        <Navbar.Toggle 
          aria-controls="main-navbar" 
          className="border-0"
          onClick={handleToggle}
        >
          {expanded ? <FaTimes className="navbar-toggler-icon-custom" /> : <FaBars className="navbar-toggler-icon-custom" />}
        </Navbar.Toggle>
        
        <Navbar.Collapse id="main-navbar" in={expanded}>
          {/* Main Navigation */}
          <Nav className="mx-auto align-items-center">
            <Nav.Link 
              as={Link} 
              to="/" 
              className={`nav-link-custom ${isActiveRoute('/') ? 'active' : ''}`}
              onClick={() => setExpanded(false)}
            >
              <FaHome className="me-2" /> Home
            </Nav.Link>
            
            {/* Show elections and results only for voters */}
            {!isAdmin ? (
              <>
                <Nav.Link 
                  as={Link} 
                  to="/dashboard?tab=elections"
                  className={`nav-link-custom ${isActiveRoute('/dashboard') && location.search.includes('tab=elections') ? 'active' : ''}`}
                  onClick={() => setExpanded(false)}
                >
                  <FaVoteYea className="me-2" /> Elections
                </Nav.Link>

                <Nav.Link 
                  as={Link} 
                  to="/dashboard?tab=results"
                  className={`nav-link-custom ${isActiveRoute('/dashboard') && location.search.includes('tab=results') ? 'active' : ''}`}
                  onClick={() => setExpanded(false)}
                >
                  <FaChartBar className="me-2" /> Results
                </Nav.Link>
                
                <Nav.Link 
                  as={Link} 
                  to="/security"
                  className={`nav-link-custom ${isActiveRoute('/security') ? 'active' : ''}`}
                  onClick={() => setExpanded(false)}
                >
                  <FaShieldAlt className="me-2" /> Security
                </Nav.Link>
                
                <Nav.Link 
                  as={Link} 
                  to="/help"
                  className={`nav-link-custom ${isActiveRoute('/help') ? 'active' : ''}`}
                  onClick={() => setExpanded(false)}
                >
                  <FaQuestionCircle className="me-2" /> Help
                </Nav.Link>
              </>
            ) : (
              // Show admin-specific navigation
              <>
                <Nav.Link 
                  as={Link} 
                  to="/admin/dashboard"
                  className={`nav-link-custom ${isActiveRoute('/admin/dashboard') ? 'active' : ''}`}
                  onClick={() => setExpanded(false)}
                >
                  <FaTachometerAlt className="me-2" /> Dashboard
                </Nav.Link>
                
                <Nav.Link 
                  as={Link} 
                  to="/admin/elections"
                  className={`nav-link-custom ${isActiveRoute('/admin/elections') ? 'active' : ''}`}
                  onClick={() => setExpanded(false)}
                >
                  <FaCalendarAlt className="me-2" /> Elections
                </Nav.Link>
                
                <Nav.Link 
                  as={Link} 
                  to="/admin/voters"
                  className={`nav-link-custom ${isActiveRoute('/admin/voters') ? 'active' : ''}`}
                  onClick={() => setExpanded(false)}
                >
                  <FaUsers className="me-2" /> Voters
                </Nav.Link>
              </>
            )}
          </Nav>
          
          {/* Right Side Actions */}
          <Nav className="align-items-lg-center mt-3 mt-lg-0">
            {isAuthenticated ? (
              <div className="d-flex flex-column flex-lg-row align-items-center gap-3">
                {/* Notifications */}
                <Dropdown 
                  align="end" 
                  onToggle={(isOpen) => {
                    if (window.innerWidth < 992) {
                      // For mobile, we'll use a custom dropdown
                    }
                  }}
                >
                  <Dropdown.Toggle 
                    variant="outline-light" 
                    id="notifications-dropdown"
                    className="position-relative mobile-dropdown-toggle"
                    style={{ 
                      border: 'none', 
                      background: 'transparent',
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.75rem 1rem'
                    }}
                  >
                    <FaBell className="me-2" style={{ fontSize: '1.2rem' }} />
                    Notifications
                    {notifications > 0 && (
                      <Badge 
                        bg="danger" 
                        className="ms-2"
                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                      >
                        {notifications}
                      </Badge>
                    )}
                  </Dropdown.Toggle>

                  <Dropdown.Menu className="dropdown-menu-custom shadow-lg" style={{ minWidth: '300px' }}>
                    <Dropdown.Header className="text-center">
                      <strong>Notifications</strong>
                    </Dropdown.Header>
                    <Dropdown.Item href="#" className="dropdown-item-custom">
                      <div className="d-flex align-items-center">
                        <FaCalendarAlt className="me-2 text-primary" />
                        <div>
                          <small className="d-block">New election starting soon</small>
                          <small className="text-muted">2 hours ago</small>
                        </div>
                      </div>
                    </Dropdown.Item>
                    <Dropdown.Item href="#" className="dropdown-item-custom">
                      <div className="d-flex align-items-center">
                        <FaBell className="me-2 text-warning" />
                        <div>
                          <small className="d-block">Your vote has been verified</small>
                          <small className="text-muted">1 day ago</small>
                        </div>
                      </div>
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item href="#" className="dropdown-item-custom text-center">
                      <small>View All Notifications</small>
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>

                {/* User Dropdown */}
                <Dropdown align="end">
                  <Dropdown.Toggle 
                    variant="outline-light" 
                    id="user-dropdown"
                    className="d-flex align-items-center user-dropdown-toggle mobile-dropdown-toggle"
                    style={{ 
                      borderColor: 'rgba(255,255,255,0.3)',
                      background: 'rgba(255,255,255,0.05)',
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.75rem 1rem'
                    }}
                  >
                    <div className="user-avatar me-2 d-flex align-items-center justify-content-center">
                      {userDisplayName?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="d-flex flex-column">
                      <span className="fw-bold">{userDisplayName}</span>
                      <small className="text-muted">{userRole.toUpperCase()}</small>
                    </div>
                  </Dropdown.Toggle>

                  <Dropdown.Menu className="dropdown-menu-custom shadow-lg" style={{ minWidth: '250px' }}>
                    <Dropdown.Header className="text-center py-3">
                      <div className="user-avatar mx-auto mb-2" style={{ width: '50px', height: '50px' }}>
                        {userDisplayName?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="fw-bold">{userDisplayName}</div>
                      <div className="small text-muted">
                        {user?.voterId || user?.adminId || user?.username || 'User ID'}
                      </div>
                      <Badge 
                        bg={isAdmin ? 'warning' : 'primary'} 
                        className="mt-2"
                        style={{ fontSize: '0.75rem' }}
                      >
                        {userRole.toUpperCase()}
                      </Badge>
                    </Dropdown.Header>
                    
                    <Dropdown.Divider />
                    
                    {/* Navigation based on user role */}
                    {isAdmin ? (
                      <>
                        <Dropdown.Item 
                          as={Link} 
                          to="/admin/dashboard" 
                          className="dropdown-item-custom"
                          onClick={() => setExpanded(false)}
                        >
                          <FaTachometerAlt className="me-2" /> Admin Dashboard
                        </Dropdown.Item>
                        
                        <Dropdown.Item 
                          as={Link} 
                          to="/admin/elections" 
                          className="dropdown-item-custom"
                          onClick={() => setExpanded(false)}
                        >
                          <FaCalendarAlt className="me-2" /> Manage Elections
                        </Dropdown.Item>
                        
                        <Dropdown.Item 
                          as={Link} 
                          to="/admin/voters" 
                          className="dropdown-item-custom"
                          onClick={() => setExpanded(false)}
                        >
                          <FaUsers className="me-2" /> Manage Voters
                        </Dropdown.Item>
                        
                        <Dropdown.Item 
                          as={Link} 
                          to="/admin/settings" 
                          className="dropdown-item-custom"
                          onClick={() => setExpanded(false)}
                        >
                          <FaCog className="me-2" /> System Settings
                        </Dropdown.Item>
                      </>
                    ) : (
                      <>
                        <Dropdown.Item 
                          as={Link} 
                          to="/dashboard" 
                          className="dropdown-item-custom"
                          onClick={() => setExpanded(false)}
                        >
                          <FaTachometerAlt className="me-2" /> Dashboard
                        </Dropdown.Item>
                        
                        <Dropdown.Item 
                          as={Link} 
                          to="/profile" 
                          className="dropdown-item-custom"
                          onClick={() => setExpanded(false)}
                        >
                          <FaUser className="me-2" /> My Profile
                        </Dropdown.Item>
                        
                        <Dropdown.Item 
                          as={Link} 
                          to="/my-votes" 
                          className="dropdown-item-custom"
                          onClick={() => setExpanded(false)}
                        >
                          <FaVoteYea className="me-2" /> My Votes
                        </Dropdown.Item>
                        
                        <Dropdown.Item 
                          as={Link} 
                          to="/settings" 
                          className="dropdown-item-custom"
                          onClick={() => setExpanded(false)}
                        >
                          <FaCog className="me-2" /> Settings
                        </Dropdown.Item>
                      </>
                    )}
                    
                    <Dropdown.Divider />
                    
                    <Dropdown.Item 
                      onClick={handleLogout} 
                      className="dropdown-item-custom text-danger"
                    >
                      <FaSignInAlt className="me-2" /> Logout
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            ) : (
              // Only show login/register when NOT authenticated
              <div className="d-flex flex-column flex-lg-row gap-3 align-items-center">
                <Button 
                  as={Link} 
                  to="/login" 
                  variant="outline-light" 
                  className="btn-custom d-flex align-items-center justify-content-center"
                  style={{ 
                    borderColor: 'rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.05)',
                    width: '100%'
                  }}
                  onClick={() => setExpanded(false)}
                >
                  <FaSignInAlt className="me-2" /> Login
                </Button>
                
                <Button 
                  as={Link} 
                  to="/register" 
                  variant="primary" 
                  className="btn-primary-custom d-flex align-items-center justify-content-center"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    fontWeight: '500',
                    width: '100%'
                  }}
                  onClick={() => setExpanded(false)}
                >
                  <FaUserPlus className="me-2" /> Register
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