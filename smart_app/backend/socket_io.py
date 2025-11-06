from flask_socketio import SocketIO

# Create Socket.IO instance with explicit configuration
socketio = SocketIO(
    cors_allowed_origins=[
        "http://localhost:5000",
        "http://127.0.0.1:5000", 
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    async_mode='threading',
    logger=True,
    engineio_logger=False
)