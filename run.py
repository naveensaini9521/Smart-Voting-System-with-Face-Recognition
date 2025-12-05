import os
import logging
from smart_app.backend.app import create_app

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app, socketio = create_app()

if __name__ == '__main__':
    try:
        print("=" * 50)
        print("Starting Flask-SocketIO server...")
        print("Server URL: http://127.0.0.1:5000")
        print("Socket.IO URL: ws://127.0.0.1:5000/socket.io/")
        print("API Test: http://127.0.0.1:5000/api/test")
        print("=" * 50)
        
        # Use simple run without complex async modes
        socketio.run(
            app,
            host="127.0.0.1",
            port=5000,
            debug=True,
            allow_unsafe_werkzeug=True
        )
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        print(f"Startup error: {str(e)}")
        import traceback
        traceback.print_exc()