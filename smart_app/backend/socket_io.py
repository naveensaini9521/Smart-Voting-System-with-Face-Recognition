from flask_socketio import SocketIO
import logging

logger = logging.getLogger(__name__)

# Create Socket.IO instance with comprehensive configuration
socketio = SocketIO(
    cors_allowed_origins="*",  # Allow all origins for development
    async_mode='threading',
    logger=False,  
    engineio_logger=False,  
    ping_timeout=60,
    ping_interval=25,
    max_http_buffer_size=1e8,
    always_connect=True, 
    allow_upgrades=True,  
    http_compression=True, 
    cookie=None,  
    manage_session=False  
)

logger.info("Socket.IO configured successfully")