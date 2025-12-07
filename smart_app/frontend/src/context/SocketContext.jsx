// contexts/SocketContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { isAuthenticated, user, userType } = useAuth(); // Add userType to useAuth
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const SOCKET_URL = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:5000' 
    : window.location.origin;

  useEffect(() => {
    if (isAuthenticated && user && !socket) {
      console.log(`Initializing global Socket.IO connection for ${userType}...`);
      
      // Prepare connection parameters based on user type
      let queryParams = {
        timestamp: Date.now()
      };
      
      if (userType === 'voter') {
        queryParams = {
          ...queryParams,
          voter_id: user.voter_id,
          user_type: 'voter',
          email: user.email
        };
      } else if (userType === 'admin') {
        queryParams = {
          ...queryParams,
          admin_id: user.admin_id,
          user_type: 'admin',
          username: user.username,
          role: user.role
        };
      }
      
      const newSocket = io(SOCKET_URL, {
        path: '/socket.io',
        transports: ['polling'],
        upgrade: false,
        query: queryParams,
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      });

      newSocket.on('connect', () => {
        console.log(`Global Socket.IO connected for ${userType}: ${userType === 'voter' ? user.voter_id : user.admin_id}`);
        setIsConnected(true);
      });

      newSocket.on('disconnect', (reason) => {
        console.log(`Global Socket.IO disconnected: ${reason}`);
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Global Socket.IO connection error:', error);
        setIsConnected(false);
      });

      setSocket(newSocket);
    } else if (!isAuthenticated && socket) {
      console.log('Cleaning up global Socket.IO connection...');
      socket.close();
      setSocket(null);
      setIsConnected(false);
    }
  }, [isAuthenticated, user, userType]);

  const value = {
    socket,
    isConnected,
    emit: (event, data) => {
      if (socket && isConnected) {
        socket.emit(event, data);
      }
    },
    on: (event, callback) => {
      if (socket) {
        socket.on(event, callback);
      }
    },
    off: (event, callback) => {
      if (socket) {
        socket.off(event, callback);
      }
    }
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};