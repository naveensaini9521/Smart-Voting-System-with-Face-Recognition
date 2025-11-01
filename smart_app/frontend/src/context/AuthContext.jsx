import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { voterAPI } from '../services/api';

// Auth context
const AuthContext = createContext();

// Auth actions
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  UPDATE_USER: 'UPDATE_USER',
  SET_LOADING: 'SET_LOADING',
  CHECK_AUTH_START: 'CHECK_AUTH_START',
  CHECK_AUTH_SUCCESS: 'CHECK_AUTH_SUCCESS',
  CHECK_AUTH_FAILURE: 'CHECK_AUTH_FAILURE'
};

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  token: null
};

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };

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
        error: null // Don't show error for auth check failure
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

    default:
      return state;
  }
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing authentication on app start
  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.CHECK_AUTH_START });

      const token = localStorage.getItem('authToken');
      const voterData = localStorage.getItem('voterData');
      const isAuthenticated = localStorage.getItem('isAuthenticated');

      console.log('Checking existing auth:', { 
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
            console.log('Existing auth verified successfully');
          } else {
            console.log('Token verification failed, clearing auth data');
            clearAuthData();
            dispatch({ type: AUTH_ACTIONS.CHECK_AUTH_FAILURE });
          }
        } catch (error) {
          console.log('Token verification error, using local storage data:', error);
          // If token verification fails but we have local data, still consider authenticated
          const user = JSON.parse(voterData);
          dispatch({
            type: AUTH_ACTIONS.CHECK_AUTH_SUCCESS,
            payload: { user, token }
          });
        }
      } else {
        console.log('No valid auth data found');
        dispatch({ type: AUTH_ACTIONS.CHECK_AUTH_FAILURE });
      }
    } catch (error) {
      console.error('Error checking existing auth:', error);
      clearAuthData();
      dispatch({ type: AUTH_ACTIONS.CHECK_AUTH_FAILURE });
    }
  };

  // Clear authentication data from storage
  const clearAuthData = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('voterData');
    localStorage.removeItem('isAuthenticated');
  };

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
          payload: { user: tempUserData, token: null } // No token yet, need face verification
        });

        return { 
          success: true, 
          user: tempUserData,
          requiresFaceVerification: true
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
    console.log('Direct login with token for user:', userData.voter_id);
    
    // Store authentication data
    localStorage.setItem('authToken', token);
    localStorage.setItem('voterData', JSON.stringify(userData));
    localStorage.setItem('isAuthenticated', 'true');

    dispatch({
      type: AUTH_ACTIONS.LOGIN_SUCCESS,
      payload: { user: userData, token }
    });
  };

  // Logout function
  const logout = async () => {
    try {
      await voterAPI.logout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      clearAuthData();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  };

  // Update user profile
  const updateUser = (userData) => {
    const updatedUser = { ...state.user, ...userData };
    localStorage.setItem('voterData', JSON.stringify(updatedUser));
    dispatch({
      type: AUTH_ACTIONS.UPDATE_USER,
      payload: userData
    });
  };

  // Check if user is admin
  const isAdmin = () => {
    return state.user?.role === 'admin';
  };

  // Check authentication status (force refresh)
  const checkAuthStatus = async () => {
    return await checkExistingAuth();
  };

  // Get auth headers for API calls
  const getAuthHeaders = () => {
    const token = state.token || localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const value = {
    ...state,
    login,
    loginWithCredentials,
    completeLoginWithFace,
    logout,
    updateUser,
    isAdmin,
    checkAuthStatus,
    getAuthHeaders
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