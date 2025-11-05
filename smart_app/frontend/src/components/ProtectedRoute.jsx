// src/components/common/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner, Container, Row, Col } from 'react-bootstrap';
import { authUtils } from '../services/api';

const ProtectedRoute = ({ children, role = 'user', redirectTo = null }) => {
  const [loading, setLoading] = React.useState(true);
  const [isAuth, setIsAuth] = React.useState(false);
  const [userData, setUserData] = React.useState(null);
  
  const location = useLocation();

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        const authStatus = authUtils.isAuthenticated();
        const user = authUtils.getCurrentUser();
        
        setIsAuth(authStatus);
        setUserData(user);
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuth(false);
        setUserData(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <Row>
          <Col className="text-center">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">Checking authentication...</p>
          </Col>
        </Row>
      </Container>
    );
  }

  // Determine redirect path
  let redirectPath = redirectTo;
  if (!redirectPath) {
    redirectPath = role === 'admin' ? '/admin/login' : '/login';
  }

  // For admin routes
  if (role === 'admin') {
    const isAdmin = authUtils.isAdminAuthenticated();
    if (!isAdmin) {
      console.log('Admin not authenticated, redirecting to:', redirectPath);
      return <Navigate to={redirectPath} replace state={{ from: location }} />;
    }
    return children;
  }

  // For user routes
  if (!isAuth) {
    console.log('User not authenticated, redirecting to:', redirectPath);
    return <Navigate to={redirectPath} replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;