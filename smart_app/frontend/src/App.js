import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Container, Spinner } from 'react-bootstrap';
// Import Components
import Header from './components/common/Header.jsx';
import Footer from './components/common/Footer.jsx';
// Import Pages
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/registerpage.jsx';
import DashboardPage from './pages/Dashboard.jsx';
import VotingPage from './pages/VotingPage.jsx';
import ResultsPage from './pages/ResultsPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import HelpPage from './pages/HelpPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import VotingHistory from './pages/VotingHistory.jsx';
import Analytics from './pages/Analytics.jsx';
import Security from './pages/Security.jsx';
// Import Context and Styles
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = false }) => {
    const { isAuthenticated, user, loading } = useAuth();
    if (loading) {
        return (_jsx("div", { className: "d-flex justify-content-center align-items-center", style: { height: '50vh' }, children: _jsx(Spinner, { animation: "border", role: "status", variant: "primary", children: _jsx("span", { className: "visually-hidden", children: "Loading..." }) }) }));
    }
    if (!isAuthenticated) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    if (requireAdmin && user?.role !== 'admin') {
        return _jsx(Navigate, { to: "/dashboard", replace: true });
    }
    return children;
};
// Public Route Component (Redirect if already authenticated)
const PublicRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    if (loading) {
        return (_jsx("div", { className: "d-flex justify-content-center align-items-center", style: { height: '50vh' }, children: _jsx(Spinner, { animation: "border", role: "status", variant: "primary", children: _jsx("span", { className: "visually-hidden", children: "Loading..." }) }) }));
    }
    if (isAuthenticated) {
        return _jsx(Navigate, { to: "/dashboard", replace: true });
    }
    return children;
};
// Main App Component
function AppContent() {
    const { loading } = useAuth();
    if (loading) {
        return (_jsx("div", { className: "App d-flex flex-column min-vh-100", children: _jsxs("div", { className: "d-flex justify-content-center align-items-center flex-grow-1", children: [_jsx(Spinner, { animation: "border", variant: "primary", style: { width: '3rem', height: '3rem' }, children: _jsx("span", { className: "visually-hidden", children: "Loading Smart Voting System..." }) }), _jsx("span", { className: "ms-3 fs-5", children: "Loading Smart Voting System..." })] }) }));
    }
    return (_jsxs("div", { className: "App d-flex flex-column min-vh-100", children: [_jsx(Header, {}), _jsx("main", { className: "flex-grow-1", children: _jsx(Container, { fluid: true, className: "px-0", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(HomePage, {}) }), _jsx(Route, { path: "/help", element: _jsx(HelpPage, {}) }), _jsx(Route, { path: "/login", element: _jsx(PublicRoute, { children: _jsx(LoginPage, {}) }) }), _jsx(Route, { path: "/register", element: _jsx(PublicRoute, { children: _jsx(RegisterPage, {}) }) }), _jsx(Route, { path: "/dashboard/*", element: _jsx(ProtectedRoute, { children: _jsx(DashboardPage, {}) }) }), _jsx(Route, { path: "/profile", element: _jsx(ProtectedRoute, { children: _jsx(ProfilePage, {}) }) }), _jsx(Route, { path: "/voting-history", element: _jsx(ProtectedRoute, { children: _jsx(VotingHistory, {}) }) }), _jsx(Route, { path: "/analytics", element: _jsx(ProtectedRoute, { children: _jsx(Analytics, {}) }) }), _jsx(Route, { path: "/security", element: _jsx(ProtectedRoute, { children: _jsx(Security, {}) }) }), _jsx(Route, { path: "/voting/:electionId", element: _jsx(ProtectedRoute, { children: _jsx(VotingPage, {}) }) }), _jsx(Route, { path: "/results/:electionId?", element: _jsx(ProtectedRoute, { children: _jsx(ResultsPage, {}) }) }), _jsx(Route, { path: "/admin", element: _jsx(ProtectedRoute, { requireAdmin: true, children: _jsx(AdminPage, {}) }) }), _jsx(Route, { path: "/admin/*", element: _jsx(ProtectedRoute, { requireAdmin: true, children: _jsx(AdminPage, {}) }) }), _jsx(Route, { path: "/404", element: _jsx(NotFoundPage, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/404", replace: true }) })] }) }) }), _jsx(Footer, {})] }));
}
// Main App Wrapper
function App() {
    return (_jsx(AuthProvider, { children: _jsx(Router, { children: _jsx(AppContent, {}) }) }));
}
export default App;
