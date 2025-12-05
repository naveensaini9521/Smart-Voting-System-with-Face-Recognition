import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { voterAPI, adminAPI } from '../services/api.js';

// Auth context
const AuthContext = createContext();

// Auth actions
const AUTH_ACTIONS = {
  // Combined auth actions for simplicity
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  UPDATE_USER: 'UPDATE_USER',
  SET_LOADING: 'SET_LOADING',
  CHECK_AUTH_START: 'CHECK_AUTH_START',
  CHECK_AUTH_SUCCESS: 'CHECK_AUTH_SUCCESS',
  CHECK_AUTH_FAILURE: 'CHECK_AUTH_FAILURE',
  
  // Clear specific auth type
  CLEAR_VOTER_AUTH: 'CLEAR_VOTER_AUTH',
  CLEAR_ADMIN_AUTH: 'CLEAR_ADMIN_AUTH'
};

// Initial state - simplified to track both auth types under single user object
const initialState = {
  // Combined user state - can be either voter or admin
  user: null,
  isAuthenticated: false,
  token: null,
  userType: null, // 'voter' or 'admin'
  
  // Loading state
  loading: true,
  error: null
};

// Auth reducer
const authReducer = (state, action) => {
  console.log('Auth reducer:', action.type, action.payload);
  
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
        userType: action.payload.userType,
        isAuthenticated: true,
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.CHECK_AUTH_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        userType: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload || null
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
        userType: action.payload.userType,
        isAuthenticated: true,
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        userType: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        userType: null,
        isAuthenticated: false,
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };

    case AUTH_ACTIONS.CLEAR_VOTER_AUTH:
      // Only clear if current user is voter
      if (state.userType === 'voter') {
        return {
          ...state,
          user: null,
          token: null,
          userType: null,
          isAuthenticated: false,
          loading: false
        };
      }
      return state;

    case AUTH_ACTIONS.CLEAR_ADMIN_AUTH:
      // Only clear if current user is admin
      if (state.userType === 'admin') {
        return {
          ...state,
          user: null,
          token: null,
          userType: null,
          isAuthenticated: false,
          loading: false
        };
      }
      return state;

    default:
      return state;
  }
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Clear all authentication data
  const clearAllAuthData = useCallback(() => {
    console.log('🧹 Clearing all authentication data');
    localStorage.removeItem('authToken');
    localStorage.removeItem('voterData');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    localStorage.removeItem('isAdminAuthenticated');
  }, []);

  // Clear voter authentication data only
  const clearVoterAuthData = useCallback(() => {
    console.log('🧹 Clearing voter authentication data');
    localStorage.removeItem('authToken');
    localStorage.removeItem('voterData');
    localStorage.removeItem('isAuthenticated');
  }, []);

  // Clear admin authentication data only
  const clearAdminAuthData = useCallback(() => {
    console.log('🧹 Clearing admin authentication data');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    localStorage.removeItem('isAdminAuthenticated');
  }, []);

  // Check existing authentication (both voter and admin)
  const checkExistingAuth = useCallback(async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.CHECK_AUTH_START });

      console.log('🔍 Checking for existing authentication...');

      // Skip auth check on login pages to prevent infinite redirects
      const currentPath = window.location.pathname;
      if (currentPath.includes('/login') || currentPath.includes('/admin/login')) {
        console.log('🛑 Skipping auth check on login page');
        dispatch({ type: AUTH_ACTIONS.CHECK_AUTH_FAILURE, payload: 'On login page' });
        return;
      }

      // Check admin auth first (since admin overrides voter)
      const adminToken = localStorage.getItem('adminToken');
      const adminData = localStorage.getItem('adminData');
      const isAdminAuthenticated = localStorage.getItem('isAdminAuthenticated');

      console.log('📝 Admin auth check:', { 
        hasToken: !!adminToken, 
        hasData: !!adminData, 
        isAuthenticated: isAdminAuthenticated 
      });

      if (adminToken && adminData && isAdminAuthenticated === 'true') {
        try {
          console.log('🔑 Attempting admin token verification...');
          const response = await adminAPI.verifyToken();
          console.log('✅ Admin token verification response:', response);
          
          if (response.success) {
            const user = JSON.parse(adminData);
            dispatch({
              type: AUTH_ACTIONS.CHECK_AUTH_SUCCESS,
              payload: { 
                user, 
                token: adminToken,
                userType: 'admin'
              }
            });
            console.log('🎉 Admin auth verified successfully');
            return;
          } else {
            console.log('❌ Admin token verification failed:', response.message);
            clearAdminAuthData();
          }
        } catch (error) {
          console.log('❌ Admin token verification error:', error);
          // If verification fails, use local data for now but schedule a refresh
          if (adminData) {
            console.log('📋 Using cached admin data (verification failed)');
            const user = JSON.parse(adminData);
            dispatch({
              type: AUTH_ACTIONS.CHECK_AUTH_SUCCESS,
              payload: { 
                user, 
                token: adminToken,
                userType: 'admin'
              }
            });
            return;
          }
          clearAdminAuthData();
        }
      }

      // Check voter auth if no admin auth
      const voterToken = localStorage.getItem('authToken');
      const voterData = localStorage.getItem('voterData');
      const isVoterAuthenticated = localStorage.getItem('isAuthenticated');

      console.log('📝 Voter auth check:', { 
        hasToken: !!voterToken, 
        hasData: !!voterData, 
        isAuthenticated: isVoterAuthenticated 
      });

      if (voterToken && voterData && isVoterAuthenticated === 'true') {
        try {
          console.log('🔑 Attempting voter token verification...');
          const response = await voterAPI.verifyToken();
          console.log('✅ Voter token verification response:', response);
          
          if (response.success) {
            const user = JSON.parse(voterData);
            dispatch({
              type: AUTH_ACTIONS.CHECK_AUTH_SUCCESS,
              payload: { 
                user, 
                token: voterToken,
                userType: 'voter'
              }
            });
            console.log('🎉 Voter auth verified successfully');
            return;
          } else {
            console.log('❌ Voter token verification failed:', response.message);
            clearVoterAuthData();
          }
        } catch (error) {
          console.log('❌ Voter token verification error:', error);
          // If verification fails, use local data for now
          if (voterData) {
            console.log('📋 Using cached voter data (verification failed)');
            const user = JSON.parse(voterData);
            dispatch({
              type: AUTH_ACTIONS.CHECK_AUTH_SUCCESS,
              payload: { 
                user, 
                token: voterToken,
                userType: 'voter'
              }
            });
            return;
          }
          clearVoterAuthData();
        }
      }

      // If no valid auth found
      console.log('🚫 No valid authentication found');
      clearAllAuthData();
      dispatch({ type: AUTH_ACTIONS.CHECK_AUTH_FAILURE });
      
    } catch (error) {
      console.error('❌ Error checking existing auth:', error);
      clearAllAuthData();
      dispatch({ type: AUTH_ACTIONS.CHECK_AUTH_FAILURE, payload: error.message });
    }
  }, [clearAdminAuthData, clearVoterAuthData, clearAllAuthData]);

  // Check for existing authentication on app start
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔐 Initializing authentication...');
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
        
        await checkExistingAuth();
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    };

    initializeAuth();
  }, [checkExistingAuth]);

  // Voter authentication functions

  // Login with credentials (first step)
  const loginWithCredentials = async (credentials) => {
    console.log('🔐 Voter login with credentials:', credentials);
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });

    try {
      const response = await voterAPI.verifyCredentials(credentials);
      console.log('✅ Voter credentials verification response:', response);

      if (response.success) {
        // Store voter data temporarily for face verification
        const tempUserData = response.voter_data;
        
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { 
            user: tempUserData, 
            token: response.temp_token || null,
            userType: 'voter'
          }
        });

        return { 
          success: true, 
          user: tempUserData,
          temp_token: response.temp_token,
          requiresFaceVerification: response.requires_face_verification || true
        };
      } else {
        console.log('❌ Voter credentials verification failed:', response.message);
        dispatch({
          type: AUTH_ACTIONS.LOGIN_FAILURE,
          payload: response.message || 'Login failed'
        });
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
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
      console.log('📸 Completing login with face verification for:', faceData.voter_id);

      const response = await voterAPI.verifyFace(faceData);
      console.log('✅ Face verification response:', response);

      if (response.success) {
        // Store authentication data
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('voterData', JSON.stringify(response.voter_data));
        localStorage.setItem('isAuthenticated', 'true');

        console.log('💾 Voter auth data saved to localStorage');

        // Clear any existing admin auth
        clearAdminAuthData();

        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { 
            user: response.voter_data, 
            token: response.token,
            userType: 'voter'
          }
        });

        return { success: true, user: response.voter_data, token: response.token };
      } else {
        console.log('❌ Face verification failed:', response.message);
        dispatch({
          type: AUTH_ACTIONS.LOGIN_FAILURE,
          payload: response.message || 'Face verification failed'
        });
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('❌ Face verification error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Face verification failed';
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMsg
      });
      return { success: false, error: errorMsg };
    }
  };

  // Direct voter login with token and user data
  const login = (token, userData) => {
    console.log('🔑 Direct voter login with token for user:', userData?.voter_id);
    
    if (!token || !userData) {
      console.error('❌ Invalid login data provided');
      return;
    }
    
    // Store authentication data
    localStorage.setItem('authToken', token);
    localStorage.setItem('voterData', JSON.stringify(userData));
    localStorage.setItem('isAuthenticated', 'true');

    // Clear any existing admin auth
    clearAdminAuthData();

    dispatch({
      type: AUTH_ACTIONS.LOGIN_SUCCESS,
      payload: { 
        user: userData, 
        token: token,
        userType: 'voter'
      }
    });
  };

  // Admin authentication functions

  // Admin login
  const adminLogin = async (credentials) => {
    console.log('👑 Admin logging in with credentials:', credentials);
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });

    try {
      const response = await adminAPI.login(credentials);
      console.log('✅ Admin login response:', response);

      if (response.success) {
        // Store admin authentication data
        localStorage.setItem('adminToken', response.token);
        localStorage.setItem('adminData', JSON.stringify(response.admin_data));
        localStorage.setItem('isAdminAuthenticated', 'true');

        console.log('💾 Admin auth data saved to localStorage');

        // Clear any existing voter auth
        clearVoterAuthData();

        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { 
            user: response.admin_data, 
            token: response.token,
            userType: 'admin'
          }
        });

        return { success: true, user: response.admin_data, token: response.token };
      } else {
        console.log('❌ Admin login failed:', response.message);
        dispatch({
          type: AUTH_ACTIONS.LOGIN_FAILURE,
          payload: response.message || 'Admin login failed'
        });
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('❌ Admin login error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Admin login failed';
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMsg
      });
      return { success: false, error: errorMsg };
    }
  };

  // Direct admin login with token and admin data (for API login callback)
  const directAdminLogin = (token, adminData) => {
    console.log('🔑 Direct admin login with token for admin:', adminData?.username);
    
    if (!token || !adminData) {
      console.error('❌ Invalid admin login data provided');
      return;
    }
    
    // Store admin authentication data
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminData', JSON.stringify(adminData));
    localStorage.setItem('isAdminAuthenticated', 'true');

    // Clear any existing voter auth
    clearVoterAuthData();

    dispatch({
      type: AUTH_ACTIONS.LOGIN_SUCCESS,
      payload: { 
        user: adminData, 
        token: token,
        userType: 'admin'
      }
    });
  };

  // Logout function for both voter and admin
  const logout = async () => {
    try {
      console.log('🚪 Logging out user type:', state.userType);
      
      // Determine what type of user is logged in
      if (state.userType === 'voter') {
        console.log('👤 Logging out voter...');
        // Call voter logout API
        if (state.token) {
          await voterAPI.logout();
        }
        clearVoterAuthData();
        dispatch({ type: AUTH_ACTIONS.CLEAR_VOTER_AUTH });
      } else if (state.userType === 'admin') {
        console.log('👑 Logging out admin...');
        // Call admin logout API
        if (state.token) {
          await adminAPI.logout();
        }
        clearAdminAuthData();
        dispatch({ type: AUTH_ACTIONS.CLEAR_ADMIN_AUTH });
      } else {
        console.log('🤷 No user type specified, clearing all auth');
        clearAllAuthData();
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
      }
    } catch (error) {
      console.error('❌ Logout API error:', error);
      // Still clear local auth even if API fails
      clearAllAuthData();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  };

  // Alias for admin logout (for compatibility)
  const adminLogout = async () => {
    return logout();
  };

  // Update user profile
  const updateUser = (userData) => {
    if (!state.user) return;
    
    console.log('📝 Updating user profile:', userData);
    
    const updatedUser = { ...state.user, ...userData };
    
    // Update appropriate localStorage
    if (state.userType === 'voter') {
      localStorage.setItem('voterData', JSON.stringify(updatedUser));
    } else if (state.userType === 'admin') {
      localStorage.setItem('adminData', JSON.stringify(updatedUser));
    }
    
    dispatch({
      type: AUTH_ACTIONS.UPDATE_USER,
      payload: userData
    });
  };

  // Check if current user is admin
  const isAdmin = useCallback(() => {
    const adminStatus = state.userType === 'admin';
    console.log('👑 isAdmin check:', adminStatus, { userType: state.userType });
    return adminStatus;
  }, [state.userType]);

  // Check if current user is admin authenticated
  const isAdminAuthenticated = useCallback(() => {
    return state.isAuthenticated && state.userType === 'admin';
  }, [state.isAuthenticated, state.userType]);

  // Check if current user is voter authenticated
  const isVoterAuthenticated = useCallback(() => {
    return state.isAuthenticated && state.userType === 'voter';
  }, [state.isAuthenticated, state.userType]);

  // Check if current user is superadmin
  const isSuperAdmin = useCallback(() => {
    return state.user?.role === 'superadmin';
  }, [state.user]);

  // Check if current user has admin privileges
  const isAdminUser = useCallback(() => {
    return state.userType === 'admin';
  }, [state.userType]);

  // Check authentication status (force refresh)
  const checkAuthStatus = async () => {
    return await checkExistingAuth();
  };

  // Check admin authentication status (alias for compatibility)
  const checkAdminAuthStatus = async () => {
    return await checkExistingAuth();
  };

  // Get auth headers for API calls
  const getAuthHeaders = () => {
    const token = state.token || 
                 (state.userType === 'voter' ? localStorage.getItem('authToken') : null) ||
                 (state.userType === 'admin' ? localStorage.getItem('adminToken') : null);
    
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    console.log('📝 Auth headers:', headers);
    return headers;
  };

  // Get admin auth headers (alias for compatibility)
  const getAdminAuthHeaders = () => {
    return getAuthHeaders();
  };

  // Check if user can access admin features
  const canAccessAdmin = useCallback(() => {
    return state.userType === 'admin' && state.user?.is_active !== false;
  }, [state.userType, state.user]);

  // Check specific admin permissions
  const hasAdminPermission = useCallback((permission) => {
    if (state.userType !== 'admin') return false;
    
    // Superadmin has all permissions
    if (state.user?.role === 'superadmin') return true;
    
    // Check specific permissions
    return state.user?.permissions?.[permission] === true;
  }, [state.userType, state.user]);

  // Get user role for display in header
  const getUserRole = useCallback(() => {
    if (state.userType === 'admin') {
      return state.user?.role || 'admin';
    }
    return 'voter';
  }, [state.userType, state.user]);

  // Get user display name for header
  const getUserDisplayName = useCallback(() => {
    if (!state.user) return null;
    
    if (state.userType === 'admin') {
      return state.user?.full_name || state.user?.username || 'Admin';
    } else {
      return state.user?.full_name || state.user?.voter_id || 'Voter';
    }
  }, [state.user, state.userType]);

  // Get user ID for header
  const getUserId = useCallback(() => {
    if (!state.user) return null;
    
    if (state.userType === 'admin') {
      return state.user?.admin_id || state.user?.username || 'Admin';
    } else {
      return state.user?.voter_id || 'Voter';
    }
  }, [state.user, state.userType]);

  // Debug function to log current auth state
  const debugAuthState = () => {
    console.log('🔍 Current Auth State:', {
      isAuthenticated: state.isAuthenticated,
      userType: state.userType,
      user: state.user,
      loading: state.loading,
      localStorage: {
        authToken: localStorage.getItem('authToken') ? 'exists' : 'missing',
        voterData: localStorage.getItem('voterData') ? 'exists' : 'missing',
        isAuthenticated: localStorage.getItem('isAuthenticated'),
        adminToken: localStorage.getItem('adminToken') ? 'exists' : 'missing',
        adminData: localStorage.getItem('adminData') ? 'exists' : 'missing',
        isAdminAuthenticated: localStorage.getItem('isAdminAuthenticated')
      }
    });
  };

  const value = {
    // State - simplified interface
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    error: state.error,
    
    // Additional derived state - IMPORTANT: Added isAdminAuthenticated
    userType: state.userType,
    isAdmin: isAdmin(),
    isAdminAuthenticated: isAdminAuthenticated(),
    isVoterAuthenticated: isVoterAuthenticated(),
    isSuperAdmin: isSuperAdmin(),
    isAdminUser: isAdminUser(),
    
    // Auth functions
    login,
    loginWithCredentials,
    completeLoginWithFace,
    adminLogin,
    directAdminLogin,
    logout,
    adminLogout, // Alias
    updateUser,
    checkAuthStatus,
    checkAdminAuthStatus, // Alias
    getAuthHeaders,
    getAdminAuthHeaders, // Alias
    
    // Permission functions
    canAccessAdmin,
    hasAdminPermission,
    
    // Helper functions for header
    getUserRole,
    getUserDisplayName,
    getUserId,
    
    // Debug function
    debugAuthState
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