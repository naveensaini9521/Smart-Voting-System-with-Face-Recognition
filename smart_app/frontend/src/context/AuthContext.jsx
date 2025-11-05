import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { voterAPI, adminAPI } from '../services/api.js';

// Auth context
const AuthContext = createContext();

// Auth actions
const AUTH_ACTIONS = {
  // Voter actions
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  UPDATE_USER: 'UPDATE_USER',
  SET_LOADING: 'SET_LOADING',
  CHECK_AUTH_START: 'CHECK_AUTH_START',
  CHECK_AUTH_SUCCESS: 'CHECK_AUTH_SUCCESS',
  CHECK_AUTH_FAILURE: 'CHECK_AUTH_FAILURE',
  
  // Admin actions
  ADMIN_LOGIN_START: 'ADMIN_LOGIN_START',
  ADMIN_LOGIN_SUCCESS: 'ADMIN_LOGIN_SUCCESS',
  ADMIN_LOGIN_FAILURE: 'ADMIN_LOGIN_FAILURE',
  ADMIN_LOGOUT: 'ADMIN_LOGOUT',
  CHECK_ADMIN_AUTH_START: 'CHECK_ADMIN_AUTH_START',
  CHECK_ADMIN_AUTH_SUCCESS: 'CHECK_ADMIN_AUTH_SUCCESS',
  CHECK_ADMIN_AUTH_FAILURE: 'CHECK_ADMIN_AUTH_FAILURE'
};

// Initial state
const initialState = {
  // Voter auth state
  user: null,
  isAuthenticated: false,
  token: null,
  
  // Admin auth state
  admin: null,
  isAdminAuthenticated: false,
  adminToken: null,
  
  // Common state
  loading: true,
  error: null
};

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };

    // Voter authentication cases
    case AUTH_ACTIONS.CHECK_AUTH_START:
      return {
        ...state,
        loading: true,
        error: null
      };

    case AUTH_ACTIONS.CHECK_AUTH_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.CHECK_AUTH_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        loading: true,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };

    // Admin authentication cases
    case AUTH_ACTIONS.ADMIN_LOGIN_START:
      return {
        ...state,
        loading: true,
        error: null
      };

    case AUTH_ACTIONS.ADMIN_LOGIN_SUCCESS:
      return {
        ...state,
        admin: action.payload.admin,
        adminToken: action.payload.token,
        isAdminAuthenticated: true,
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.ADMIN_LOGIN_FAILURE:
      return {
        ...state,
        admin: null,
        adminToken: null,
        isAdminAuthenticated: false,
        loading: false,
        error: action.payload
      };

    case AUTH_ACTIONS.ADMIN_LOGOUT:
      return {
        ...state,
        admin: null,
        adminToken: null,
        isAdminAuthenticated: false,
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.CHECK_ADMIN_AUTH_START:
      return {
        ...state,
        loading: true,
        error: null
      };

    case AUTH_ACTIONS.CHECK_ADMIN_AUTH_SUCCESS:
      return {
        ...state,
        admin: action.payload.admin,
        adminToken: action.payload.token,
        isAdminAuthenticated: true,
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.CHECK_ADMIN_AUTH_FAILURE:
      return {
        ...state,
        admin: null,
        adminToken: null,
        isAdminAuthenticated: false,
        loading: false,
        error: null
      };

    default:
      return state;
  }
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing authentication on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      
      // Check both voter and admin auth simultaneously
      await Promise.all([checkExistingVoterAuth(), checkExistingAdminAuth()]);
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };

  // Check existing voter authentication
  const checkExistingVoterAuth = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.CHECK_AUTH_START });

      const token = localStorage.getItem('authToken');
      const voterData = localStorage.getItem('voterData');
      const isAuthenticated = localStorage.getItem('isAuthenticated');

      console.log('Checking existing voter auth:', { 
        token: !!token, 
        voterData: !!voterData, 
        isAuthenticated 
      });

      if (token && voterData && isAuthenticated === 'true') {
        try {
          // Verify token with backend
          const response = await voterAPI.verifyToken();
          if (response.success) {
            const user = JSON.parse(voterData);
            dispatch({
              type: AUTH_ACTIONS.CHECK_AUTH_SUCCESS,
              payload: { user, token }
            });
            console.log('Voter auth verified successfully');
          } else {
            console.log('Voter token verification failed, clearing auth data');
            clearVoterAuthData();
            dispatch({ type: AUTH_ACTIONS.CHECK_AUTH_FAILURE });
          }
        } catch (error) {
          console.log('Voter token verification error, using local storage data:', error);
          // If token verification fails but we have local data, still consider authenticated
          const user = JSON.parse(voterData);
          dispatch({
            type: AUTH_ACTIONS.CHECK_AUTH_SUCCESS,
            payload: { user, token }
          });
        }
      } else {
        console.log('No valid voter auth data found');
        dispatch({ type: AUTH_ACTIONS.CHECK_AUTH_FAILURE });
      }
    } catch (error) {
      console.error('Error checking existing voter auth:', error);
      clearVoterAuthData();
      dispatch({ type: AUTH_ACTIONS.CHECK_AUTH_FAILURE });
    }
  };

  // Check existing admin authentication
  const checkExistingAdminAuth = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.CHECK_ADMIN_AUTH_START });

      const adminToken = localStorage.getItem('adminToken');
      const adminData = localStorage.getItem('adminData');
      const isAdminAuthenticated = localStorage.getItem('isAdminAuthenticated');

      console.log('Checking existing admin auth:', { 
        adminToken: !!adminToken, 
        adminData: !!adminData, 
        isAdminAuthenticated 
      });

      if (adminToken && adminData && isAdminAuthenticated === 'true') {
        try {
          // Verify admin token with backend
          const response = await adminAPI.verifyToken();
          if (response.success) {
            const admin = JSON.parse(adminData);
            dispatch({
              type: AUTH_ACTIONS.CHECK_ADMIN_AUTH_SUCCESS,
              payload: { admin, token: adminToken }
            });
            console.log('Admin auth verified successfully');
          } else {
            console.log('Admin token verification failed, clearing auth data');
            clearAdminAuthData();
            dispatch({ type: AUTH_ACTIONS.CHECK_ADMIN_AUTH_FAILURE });
          }
        } catch (error) {
          console.log('Admin token verification error, using local storage data:', error);
          // If token verification fails but we have local data, still consider authenticated
          const admin = JSON.parse(adminData);
          dispatch({
            type: AUTH_ACTIONS.CHECK_ADMIN_AUTH_SUCCESS,
            payload: { admin, token: adminToken }
          });
        }
      } else {
        console.log('No valid admin auth data found');
        dispatch({ type: AUTH_ACTIONS.CHECK_ADMIN_AUTH_FAILURE });
      }
    } catch (error) {
      console.error('Error checking existing admin auth:', error);
      clearAdminAuthData();
      dispatch({ type: AUTH_ACTIONS.CHECK_ADMIN_AUTH_FAILURE });
    }
  };

  // Clear voter authentication data from storage
  const clearVoterAuthData = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('voterData');
    localStorage.removeItem('isAuthenticated');
  };

  // Clear admin authentication data from storage
  const clearAdminAuthData = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    localStorage.removeItem('isAdminAuthenticated');
  };

  // Voter authentication functions

  // Login with credentials (first step)
  const loginWithCredentials = async (credentials) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });

    try {
      console.log('Logging in with credentials:', { 
        voter_id: credentials.voter_id 
      });

      const response = await voterAPI.verifyCredentials(credentials);

      if (response.success) {
        // Store voter data temporarily for face verification
        const tempUserData = response.voter_data;
        
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { user: tempUserData, token: response.temp_token || null }
        });

        return { 
          success: true, 
          user: tempUserData,
          temp_token: response.temp_token,
          requiresFaceVerification: response.requires_face_verification || true
        };
      } else {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_FAILURE,
          payload: response.message || 'Login failed'
        });
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Login failed';
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMsg
      });
      return { success: false, error: errorMsg };
    }
  };

  // Complete login with face verification
  const completeLoginWithFace = async (faceData) => {
    try {
      console.log('Completing login with face verification for:', faceData.voter_id);

      const response = await voterAPI.verifyFace(faceData);

      if (response.success) {
        // Store authentication data
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('voterData', JSON.stringify(response.voter_data));
        localStorage.setItem('isAuthenticated', 'true');

        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { user: response.voter_data, token: response.token }
        });

        return { success: true, user: response.voter_data, token: response.token };
      } else {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_FAILURE,
          payload: response.message || 'Face verification failed'
        });
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('Face verification error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Face verification failed';
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMsg
      });
      return { success: false, error: errorMsg };
    }
  };

  // Direct login with token and user data (for external auth)
  const login = (token, userData) => {
    console.log('Direct voter login with token for user:', userData?.voter_id);
    
    if (!token || !userData) {
      console.error('Invalid login data provided');
      return;
    }
    
    // Store authentication data
    localStorage.setItem('authToken', token);
    localStorage.setItem('voterData', JSON.stringify(userData));
    localStorage.setItem('isAuthenticated', 'true');

    dispatch({
      type: AUTH_ACTIONS.LOGIN_SUCCESS,
      payload: { user: userData, token }
    });
  };

  // Voter logout function
  const logout = async () => {
    try {
      // Only call logout API if we have a token
      if (state.token) {
        await voterAPI.logout();
      }
    } catch (error) {
      console.error('Voter logout API error:', error);
    } finally {
      clearVoterAuthData();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  };

  // Update voter profile
  const updateUser = (userData) => {
    if (!state.user) return;
    
    const updatedUser = { ...state.user, ...userData };
    localStorage.setItem('voterData', JSON.stringify(updatedUser));
    dispatch({
      type: AUTH_ACTIONS.UPDATE_USER,
      payload: userData
    });
  };

  // Admin authentication functions

  // Admin login
  const adminLogin = async (credentials) => {
    dispatch({ type: AUTH_ACTIONS.ADMIN_LOGIN_START });

    try {
      console.log('Admin logging in with credentials:', { 
        username: credentials.username 
      });

      const response = await adminAPI.login(credentials);

      if (response.success) {
        // Store admin authentication data
        localStorage.setItem('adminToken', response.token);
        localStorage.setItem('adminData', JSON.stringify(response.admin_data));
        localStorage.setItem('isAdminAuthenticated', 'true');

        dispatch({
          type: AUTH_ACTIONS.ADMIN_LOGIN_SUCCESS,
          payload: { admin: response.admin_data, token: response.token }
        });

        return { success: true, admin: response.admin_data, token: response.token };
      } else {
        dispatch({
          type: AUTH_ACTIONS.ADMIN_LOGIN_FAILURE,
          payload: response.message || 'Admin login failed'
        });
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('Admin login error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Admin login failed';
      dispatch({
        type: AUTH_ACTIONS.ADMIN_LOGIN_FAILURE,
        payload: errorMsg
      });
      return { success: false, error: errorMsg };
    }
  };

  // Direct admin login with token and admin data
  const directAdminLogin = (token, adminData) => {
    console.log('Direct admin login with token for admin:', adminData?.username);
    
    if (!token || !adminData) {
      console.error('Invalid admin login data provided');
      return;
    }
    
    // Store admin authentication data
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminData', JSON.stringify(adminData));
    localStorage.setItem('isAdminAuthenticated', 'true');

    dispatch({
      type: AUTH_ACTIONS.ADMIN_LOGIN_SUCCESS,
      payload: { admin: adminData, token }
    });
  };

  // Admin logout function
  const adminLogout = async () => {
    try {
      // Only call logout API if we have an admin token
      if (state.adminToken) {
        await adminAPI.logout();
      }
    } catch (error) {
      console.error('Admin logout API error:', error);
    } finally {
      clearAdminAuthData();
      dispatch({ type: AUTH_ACTIONS.ADMIN_LOGOUT });
    }
  };

  // Check if user is admin (from voter perspective)
  const isAdmin = () => {
    return state.user?.role === 'admin';
  };

  // Check if current admin has superadmin privileges
  const isSuperAdmin = () => {
    return state.admin?.role === 'superadmin';
  };

  // Check if current admin has admin privileges (admin or superadmin)
  const isAdminUser = () => {
    return state.admin?.role === 'admin' || state.admin?.role === 'superadmin';
  };

  // Check voter authentication status (force refresh)
  const checkAuthStatus = async () => {
    return await checkExistingVoterAuth();
  };

  // Check admin authentication status (force refresh)
  const checkAdminAuthStatus = async () => {
    return await checkExistingAdminAuth();
  };

  // Get auth headers for voter API calls
  const getAuthHeaders = () => {
    const token = state.token || localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Get admin auth headers for admin API calls
  const getAdminAuthHeaders = () => {
    const adminToken = state.adminToken || localStorage.getItem('adminToken');
    return adminToken ? { Authorization: `Bearer ${adminToken}` } : {};
  };

  // Check if user can access admin features
  const canAccessAdmin = () => {
    return state.isAdminAuthenticated && state.admin?.is_active !== false;
  };

  // Check specific admin permissions
  const hasAdminPermission = (permission) => {
    if (!state.admin) return false;
    
    // Superadmin has all permissions
    if (state.admin.role === 'superadmin') return true;
    
    // Check specific permissions
    return state.admin.permissions?.[permission] === true;
  };

  const value = {
    // State
    ...state,
    
    // Voter auth functions
    login,
    loginWithCredentials,
    completeLoginWithFace,
    logout,
    updateUser,
    isAdmin,
    checkAuthStatus,
    getAuthHeaders,
    
    // Admin auth functions
    adminLogin,
    directAdminLogin,
    adminLogout,
    checkAdminAuthStatus,
    getAdminAuthHeaders,
    isSuperAdmin,
    isAdminUser,
    canAccessAdmin,
    hasAdminPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};