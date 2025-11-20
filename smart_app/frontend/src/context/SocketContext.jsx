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
  const { isAuthenticated, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const SOCKET_URL = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:5000' 
    : window.location.origin;

  useEffect(() => {
    if (isAuthenticated && user && !socket) {
      console.log('🔌 Initializing global Socket.IO connection...');
      
      const newSocket = io(SOCKET_URL, {
        path: '/socket.io',
        transports: ['polling'],
        upgrade: false,
        query: {
          voter_id: user.voter_id,
          user_type: 'voter',
          timestamp: Date.now()
        },
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5
      });

      newSocket.on('connect', () => {
        console.log('✅ Global Socket.IO connected');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('❌ Global Socket.IO disconnected');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('💥 Global Socket.IO connection error:', error);
        setIsConnected(false);
      });

      setSocket(newSocket);
    } else if (!isAuthenticated && socket) {
      console.log('🔌 Cleaning up global Socket.IO connection...');
      socket.close();
      setSocket(null);
      setIsConnected(false);
    }
  }, [isAuthenticated, user]);

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