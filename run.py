import os
import logging
from smart_app.backend.app import create_app

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app, socketio = create_app()

if __name__ == '__main__':
    try:
        print("Starting Eventlet Flask-SocketIO server...")
        print("Server: http://127.0.0.1:5000")
        print("Socket: ws://127.0.0.1:5000/socket.io/")

        socketio.run(
            app,
            host="127.0.0.1",
            port=5000,
            debug=True
        )
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        print(f"Startup error: {str(e)}")
