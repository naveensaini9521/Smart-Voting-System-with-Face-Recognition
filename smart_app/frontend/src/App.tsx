import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Container, Spinner } from 'react-bootstrap';

// Import Components
import Header from './components/common/Header.jsx';
import Footer from './components/common/Footer.jsx';
import VotingPage from './components/VotingPage.jsx';

// Import Pages
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/registerpage.jsx';
import DashboardPage from './pages/Dashboard.jsx';
import ResultsPage from './pages/ResultsPage.jsx';
import AdminLoginPage from './pages/AdminLoginPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import HelpPage from './pages/HelpPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import VotingHistory from './pages/VotingHistory.jsx';
import Analytics from './pages/Analytics.jsx';
import Security from './pages/Security.jsx';

// Import Admin Components
import AdminDashboard from './components/admin/AdminDashboard.jsx';

// Import Context and Styles
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx'; // NEW: Import Socket Context
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Protected Route Component for Voters
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Admin Protected Route Component
const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdminAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

// Public Route Component (Redirect if already authenticated as voter)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Admin Public Route Component (Redirect if already authenticated as admin)
const AdminPublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdminAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (isAdminAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

// Main App Component
function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="App d-flex flex-column min-vh-100">
        <div className="d-flex justify-content-center align-items-center flex-grow-1">
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading Smart Voting System...</span>
          </Spinner>
          <span className="ms-3 fs-5">Loading Smart Voting System...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="App d-flex flex-column min-vh-100">
      <Header />
      <main className="flex-grow-1">
        <Container fluid className="px-0">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/help" element={<HelpPage />} />
            
            {/* Voter Auth Routes - Only accessible when not logged in as voter */}
            <Route path="/login" element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            } />

            {/* Admin Auth Routes - Only accessible when not logged in as admin */}
            <Route path="/admin/login" element={
              <AdminPublicRoute>
                <AdminLoginPage />
              </AdminPublicRoute>
            } />

            {/* Protected Voter Routes - Require voter authentication */}
            <Route path="/dashboard/*" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/voting-history" element={
              <ProtectedRoute>
                <VotingHistory />
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="/security" element={
              <ProtectedRoute>
                <Security />
              </ProtectedRoute>
            } />
            <Route path="/voting/:electionId" element={
            <ProtectedRoute>
              <VotingPage />
            </ProtectedRoute>
            } />
            <Route path="/results/:electionId?" element={
              <ProtectedRoute>
                <ResultsPage />
              </ProtectedRoute>
            } />

            {/* Protected Admin Routes - Require admin authentication */}
            <Route path="/admin/dashboard/*" element={
              <AdminProtectedRoute>
                <AdminDashboard />
              </AdminProtectedRoute>
            } />
            
            {/* Legacy Admin Route (redirect to new admin dashboard) */}
            <Route path="/admin" element={
              <Navigate to="/admin/dashboard" replace />
            } />
            <Route path="/admin/*" element={
              <Navigate to="/admin/dashboard" replace />
            } />

            {/* Error Routes */}
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </Container>
      </main>
      <Footer />
    </div>
  );
}

// Main App Wrapper with Socket.IO Provider
function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <AppContent />
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;