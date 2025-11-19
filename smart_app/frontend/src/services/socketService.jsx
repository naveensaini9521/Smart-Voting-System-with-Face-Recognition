// socketService.js - Enhanced version
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.eventCallbacks = new Map();
  }

  connect(voterId) {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔌 Connecting to SocketIO...');
        
        // Close existing connection if any
        if (this.socket) {
          this.socket.close();
        }

        const SOCKET_URL = process.env.NODE_ENV === 'development' 
          ? 'http://localhost:5000' 
          : window.location.origin;

        this.socket = io(SOCKET_URL, {
          path: '/socket.io',
          transports: ['websocket', 'polling'],
          upgrade: true,
          rememberUpgrade: true,
          query: {
            voter_id: voterId,
            user_type: 'voter',
            timestamp: Date.now()
          },
          timeout: 10000,
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000
        });

        // Connection successful
        this.socket.on('connect', () => {
          console.log('SocketIO connected successfully');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve(this.socket);
        });

        // Connection failed
        this.socket.on('connect_error', (error) => {
          console.error('💥 SocketIO connection error:', error);
          this.isConnected = false;
          this.reconnectAttempts++;
          reject(error);
        });

        // Handle other events
        this.socket.on('disconnect', (reason) => {
          console.log(`❌ SocketIO disconnected: ${reason}`);
          this.isConnected = false;
        });

        this.socket.on('connection_established', (data) => {
          console.log('✅ SocketIO connection confirmed:', data);
        });

        // Set up all registered event listeners
        this.setupEventListeners();

      } catch (error) {
        console.error('💥 Error setting up SocketIO connection:', error);
        reject(error);
      }
    });
  }

  // Register event callback
  on(event, callback) {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event).push(callback);
    
    // If socket is already connected, set up the listener immediately
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Set up all registered event listeners
  setupEventListeners() {
    for (const [event, callbacks] of this.eventCallbacks) {
      callbacks.forEach(callback => {
        this.socket.on(event, callback);
      });
    }
  }

  // Emit event
  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('⚠️ Socket not connected, cannot emit event:', event);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
      console.log('🔌 SocketIO disconnected');
    }
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

export default new SocketService();