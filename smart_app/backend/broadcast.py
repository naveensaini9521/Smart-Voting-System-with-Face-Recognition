# broadcast.py - Broadcast functions to avoid circular imports
from flask_socketio import SocketIO
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Initialize SocketIO
socketio = SocketIO(cors_allowed_origins="*", async_mode='threading')

def broadcast_election_update(action, election_data, admin_id=None):
    """Broadcast election updates to all connected clients"""
    try:
        update_data = {
            'type': 'election',
            'action': action,
            'data': election_data,
            'timestamp': datetime.utcnow().isoformat(),
            'admin_id': admin_id
        }
        
        # Broadcast to all voters
        socketio.emit('election_update', update_data, room='all_voters')
        
        # Broadcast to specific election room
        socketio.emit('election_update', update_data, room=f'election_{election_data.get("election_id")}')
        
        # Also send to admins
        socketio.emit('election_update', update_data, room='all_admins')
        
        logger.info(f"Broadcasted election {action}: {election_data.get('election_id')}")
        
    except Exception as e:
        logger.error(f"Error broadcasting election update: {str(e)}")

def broadcast_voter_update(action, voter_data, admin_id=None):
    """Broadcast voter updates to all connected clients"""
    try:
        update_data = {
            'type': 'voter',
            'action': action,
            'data': voter_data,
            'timestamp': datetime.utcnow().isoformat(),
            'admin_id': admin_id
        }
        
        # Broadcast to specific voter
        socketio.emit('voter_update', update_data, room=f'voter_{voter_data.get("voter_id")}')
        
        # Broadcast to admins
        socketio.emit('voter_update', update_data, room='all_admins')
        
        logger.info(f"Broadcasted voter {action}: {voter_data.get('voter_id')}")
        
    except Exception as e:
        logger.error(f"Error broadcasting voter update: {str(e)}")

def broadcast_system_update(action, data, admin_id=None):
    """Broadcast system-wide updates"""
    try:
        update_data = {
            'type': 'system',
            'action': action,
            'data': data,
            'timestamp': datetime.utcnow().isoformat(),
            'admin_id': admin_id
        }
        
        # Broadcast to everyone
        socketio.emit('system_update', update_data, broadcast=True)
        
        logger.info(f"Broadcasted system update: {action}")
        
    except Exception as e:
        logger.error(f"Error broadcasting system update: {str(e)}")

def get_socketio():
    """Get socketio instance"""
    return socketio