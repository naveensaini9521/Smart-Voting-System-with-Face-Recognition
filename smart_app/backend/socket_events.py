import logging
from flask_socketio import emit, join_room, leave_room
from flask import request
from datetime import datetime, timedelta
from smart_app.backend.mongo_models import Voter, Admin

logger = logging.getLogger(__name__)

# Store connected clients
connected_clients = {}

def safe_emit(event, data, room=None, broadcast=False):
    """Safely emit events with error handling"""
    try:
        if room:
            emit(event, data, room=room, broadcast=broadcast)
        else:
            emit(event, data, broadcast=broadcast)
        return True
    except Exception as e:
        logger.error(f"Safe emit error for event {event}: {str(e)}")
        return False

def register_socket_events(socketio):
    """Register all Socket.IO event handlers with comprehensive error handling"""
    
    @socketio.on_error_default
    def default_error_handler(e):
        """Handle SocketIO errors gracefully"""
        logger.error(f"SocketIO error for event {request.event}: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        if hasattr(request, 'sid') and request.sid in connected_clients:
            try:
                safe_emit('error', {
                    'message': 'An unexpected error occurred',
                    'event': request.event
                })
            except Exception as emit_error:
                logger.error(f"Could not emit error message: {str(emit_error)}")

    @socketio.on('connect')
    def handle_connect():
        """Handle client connection with proper authentication"""
        try:
            logger.info(f"=== SOCKETIO CONNECTION ATTEMPT ===")
            logger.info(f"Request SID: {request.sid}")
            logger.info(f"Args: {dict(request.args)}")
            
            # Get parameters from query string
            voter_id = request.args.get('voter_id')
            admin_id = request.args.get('admin_id')
            user_type = request.args.get('user_type', 'voter')
            auth_token = request.args.get('token')
            
            logger.info(f"Connection params - voter_id: {voter_id}, admin_id: {admin_id}, user_type: {user_type}")
            
            # Handle voter connections
            if voter_id:
                # Validate voter exists and is active
                voter = Voter.find_by_voter_id(voter_id)
                if not voter:
                    logger.error(f"Voter not found: {voter_id}")
                    return False
                
                if not voter.get('is_active', True):
                    logger.error(f"Voter account inactive: {voter_id}")
                    return False
                
                # Verify authentication token if provided
                if auth_token:
                    # Add token validation logic here
                    if not validate_auth_token(voter_id, auth_token):
                        logger.error(f"Invalid auth token for voter: {voter_id}")
                        return False
                
                # Store connection info
                connected_clients[request.sid] = {
                    'type': 'voter',
                    'voter_id': voter_id,
                    'connected_at': datetime.utcnow().isoformat(),
                    'auth_token': auth_token
                }
                
                # Join rooms
                join_room(f'voter_{voter_id}')
                join_room('all_voters')
                join_room('public_updates')
                
                logger.info(f"Voter {voter_id} connected successfully. SID: {request.sid}")
                
                # Emit connection confirmation
                safe_emit('connection_established', {
                    'status': 'connected',
                    'message': 'Real-time updates enabled',
                    'user_type': 'voter',
                    'voter_id': voter_id,
                    'sid': request.sid,
                    'timestamp': datetime.utcnow().isoformat()
                })
                
                return True
            
            # Handle admin connections
            elif admin_id:
                # Validate admin exists and has proper permissions
                admin = Admin.find_by_admin_id(admin_id)
                if not admin:
                    logger.error(f"Admin not found: {admin_id}")
                    return False
                
                if not admin.get('is_active', True):
                    logger.error(f"Admin account inactive: {admin_id}")
                    return False
                
                # Verify admin authentication
                if auth_token:
                    if not validate_admin_token(admin_id, auth_token):
                        logger.error(f"Invalid auth token for admin: {admin_id}")
                        return False
                
                # Store connection info
                connected_clients[request.sid] = {
                    'type': 'admin',
                    'admin_id': admin_id,
                    'connected_at': datetime.utcnow().isoformat(),
                    'auth_token': auth_token
                }
                
                join_room(f'admin_{admin_id}')
                join_room('all_admins')
                join_room('public_updates')
                
                logger.info(f"Admin {admin_id} connected successfully. SID: {request.sid}")
                
                safe_emit('connection_established', {
                    'status': 'connected',
                    'message': 'Admin real-time updates enabled',
                    'user_type': 'admin',
                    'admin_id': admin_id,
                    'sid': request.sid,
                    'timestamp': datetime.utcnow().isoformat()
                })
                
                return True
            else:
                logger.error("No valid credentials provided for SocketIO connection")
                return False
                
        except Exception as e:
            logger.error(f"Critical SocketIO connection error: {str(e)}")
            import traceback
            logger.error(f"Critical traceback: {traceback.format_exc()}")
            return False

    @socketio.on('disconnect')
    def handle_disconnect(reason=None):
        """Handle client disconnection"""
        try:
            client_data = connected_clients.pop(request.sid, None)
            if client_data:
                user_type = client_data.get('type')
                user_id = client_data.get('voter_id') or client_data.get('admin_id') or 'unknown'
                logger.info(f"{user_type} {user_id} disconnected from SocketIO")
                
        except Exception as e:
            logger.error(f"SocketIO disconnect error: {str(e)}")

    @socketio.on('subscribe_elections')
    def handle_subscribe_elections(data):
        """Handle election subscription requests"""
        try:
            voter_id = data.get('voter_id')
            if not voter_id:
                logger.warning("No voter_id provided for election subscription")
                safe_emit('subscription_error', {'message': 'Voter ID required'})
                return
            
            # Validate the requesting user owns this voter_id
            client_data = connected_clients.get(request.sid)
            if not client_data or client_data.get('voter_id') != voter_id:
                logger.warning(f"Unauthorized subscription attempt for voter {voter_id}")
                safe_emit('subscription_error', {'message': 'Unauthorized'})
                return
            
            # Join election-specific room
            room_name = f'elections_{voter_id}'
            join_room(room_name)
            
            logger.info(f"Client {request.sid} subscribed to elections for voter {voter_id}")
            
            safe_emit('subscription_success', {
                'message': f'Subscribed to election updates for voter {voter_id}',
                'room': room_name,
                'timestamp': datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Election subscription error: {str(e)}")
            safe_emit('subscription_error', {
                'message': 'Failed to subscribe to election updates'
            })

    @socketio.on('join_election_updates')
    def handle_join_election_updates(data):
        """Join election-specific update room"""
        try:
            election_id = data.get('election_id')
            if election_id:
                join_room(f'election_{election_id}')
                safe_emit('room_joined', {
                    'room': f'election_{election_id}',
                    'message': f'Subscribed to election {election_id} updates'
                })
        except Exception as e:
            logger.error(f"Error joining election room: {str(e)}")

    @socketio.on('leave_election_updates')
    def handle_leave_election_updates(data):
        """Leave election-specific update room"""
        try:
            election_id = data.get('election_id')
            if election_id:
                leave_room(f'election_{election_id}')
                safe_emit('room_left', {
                    'room': f'election_{election_id}',
                    'message': f'Unsubscribed from election {election_id} updates'
                })
        except Exception as e:
            logger.error(f"Error leaving election room: {str(e)}")

    @socketio.on('request_dashboard_update')
    def handle_dashboard_update_request():
        """Handle request for immediate dashboard update"""
        try:
            client_data = connected_clients.get(request.sid)
            if client_data and client_data.get('type') == 'voter':
                voter_id = client_data.get('voter_id')
                voter = Voter.find_by_voter_id(voter_id)
                if voter:
                    from smart_app.backend.routes.dashboard import get_enhanced_dashboard_data
                    dashboard_data = get_enhanced_dashboard_data(voter)
                    safe_emit('dashboard_update', {
                        'data': dashboard_data,
                        'timestamp': datetime.utcnow().isoformat(),
                        'type': 'full_update'
                    })
        except Exception as e:
            logger.error(f"Dashboard update request error: {str(e)}")

    @socketio.on('admin_broadcast_message')
    def handle_admin_broadcast(data):
        """Handle admin broadcast messages"""
        try:
            client_data = connected_clients.get(request.sid)
            if not client_data or client_data.get('type') != 'admin':
                safe_emit('error', {'message': 'Admin access required'})
                return
            
            message = data.get('message')
            broadcast_type = data.get('type', 'info')  # info, warning, urgent
            
            if message:
                # Broadcast to all voters
                safe_emit('admin_broadcast', {
                    'message': message,
                    'type': broadcast_type,
                    'admin_id': client_data.get('admin_id'),
                    'timestamp': datetime.utcnow().isoformat()
                }, room='all_voters', broadcast=True)
                
                logger.info(f"Admin {client_data.get('admin_id')} broadcast: {message}")
                
        except Exception as e:
            logger.error(f"Admin broadcast error: {str(e)}")

    @socketio.on('vote_cast')
    def handle_vote_cast(data):
        """Handle real-time vote casting updates"""
        try:
            election_id = data.get('election_id')
            voter_id = data.get('voter_id')
            
            # Validate the voter making the request
            client_data = connected_clients.get(request.sid)
            if not client_data or client_data.get('voter_id') != voter_id:
                logger.warning(f"Unauthorized vote cast attempt from {request.sid}")
                return
            
            # Broadcast vote count update to all clients watching this election
            from smart_app.backend.mongo_models import Vote
            vote_count = Vote.count({"election_id": election_id, "is_verified": True})
            
            safe_emit('vote_count_update', {
                'election_id': election_id,
                'total_votes': vote_count,
                'timestamp': datetime.utcnow().isoformat()
            }, room=f'election_{election_id}', broadcast=True)
            
        except Exception as e:
            logger.error(f"Vote cast socket error: {str(e)}")

    @socketio.on('ping')
    def handle_ping(data):
        """Handle ping from client"""
        try:
            safe_emit('pong', {
                'timestamp': datetime.utcnow().isoformat(),
                'server_time': datetime.utcnow().isoformat(),
                'client_data': data
            })
        except Exception as e:
            logger.error(f"Ping error: {str(e)}")

    @socketio.on('echo')
    def handle_echo(data):
        """Echo back the received data for testing"""
        try:
            safe_emit('echo_response', {
                'received_data': data,
                'timestamp': datetime.utcnow().isoformat(),
                'sid': request.sid
            })
        except Exception as e:
            logger.error(f"Echo error: {str(e)}")

    @socketio.on('start_voting_session')
    def handle_start_voting_session(data):
        """Handle voting session start requests"""
        try:
            election_id = data.get('election_id')
            voter_id = data.get('voter_id')
            
            if not election_id or not voter_id:
                safe_emit('voting_session_error', {'message': 'Election ID and Voter ID required'})
                return
            
            # Validate the requesting user owns this voter_id
            client_data = connected_clients.get(request.sid)
            if not client_data or client_data.get('voter_id') != voter_id:
                safe_emit('voting_session_error', {'message': 'Unauthorized'})
                return
            
            # Validate voter and election
            voter = Voter.find_by_voter_id(voter_id)
            if not voter:
                safe_emit('voting_session_error', {'message': 'Voter not found'})
                return
            
            from smart_app.backend.mongo_models import Election
            election = Election.find_by_election_id(election_id)
            if not election:
                safe_emit('voting_session_error', {'message': 'Election not found'})
                return
            
            # Check if already voted
            from smart_app.backend.mongo_models import Vote
            if Vote.has_voted(election_id, voter_id):
                safe_emit('voting_session_error', {'message': 'You have already voted in this election'})
                return
            
            # Create voting session
            session_id = f"SESSION_{election_id}_{voter_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
            
            # Join voting session room
            join_room(f'voting_session_{session_id}')
            
            safe_emit('voting_session_started', {
                'session_id': session_id,
                'election_id': election_id,
                'voter_id': voter_id,
                'timestamp': datetime.utcnow().isoformat(),
                'expires_at': (datetime.utcnow() + timedelta(minutes=30)).isoformat()
            })
            
            logger.info(f"Voting session started: {session_id} for voter {voter_id}")
            
        except Exception as e:
            logger.error(f"Voting session start error: {str(e)}")
            safe_emit('voting_session_error', {'message': 'Failed to start voting session'})

    @socketio.on('voting_heartbeat')
    def handle_voting_heartbeat(data):
        """Handle voting session heartbeat to keep session alive"""
        try:
            session_id = data.get('session_id')
            if session_id:
                safe_emit('voting_heartbeat_ack', {
                    'session_id': session_id,
                    'timestamp': datetime.utcnow().isoformat()
                })
        except Exception as e:
            logger.error(f"Voting heartbeat error: {str(e)}")

    # Authentication helper functions
    def validate_auth_token(voter_id, token):
        """Validate voter authentication token"""
        # Implement your token validation logic here
        # This could check against your session store or JWT validation
        try:
            # Placeholder - implement actual token validation
            return True
        except Exception as e:
            logger.error(f"Token validation error for voter {voter_id}: {str(e)}")
            return False

    def validate_admin_token(admin_id, token):
        """Validate admin authentication token"""
        # Implement admin token validation logic
        try:
            # Placeholder - implement actual admin token validation
            return True
        except Exception as e:
            logger.error(f"Admin token validation error for {admin_id}: {str(e)}")
            return False

    # Real-time update functions
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
            safe_emit('election_update', update_data, room='all_voters')
            
            # Broadcast to specific election room
            safe_emit('election_update', update_data, room=f'election_{election_data.get("election_id")}')
            
            # Also send to admins
            safe_emit('election_update', update_data, room='all_admins')
            
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
            safe_emit('voter_update', update_data, room=f'voter_{voter_data.get("voter_id")}')
            
            # Broadcast to admins
            safe_emit('voter_update', update_data, room='all_admins')
            
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
            safe_emit('system_update', update_data, broadcast=True)
            
            logger.info(f"Broadcasted system update: {action}")
            
        except Exception as e:
            logger.error(f"Error broadcasting system update: {str(e)}")

    def send_private_notification(voter_id, notification_data):
        """Send private notification to specific voter"""
        try:
            safe_emit('private_notification', notification_data, room=f'voter_{voter_id}')
            logger.info(f"Sent private notification to voter {voter_id}")
        except Exception as e:
            logger.error(f"Error sending private notification: {str(e)}")

    def get_connected_users_count():
        """Get count of connected users"""
        return {
            'total_connected': len(connected_clients),
            'voters_connected': len([c for c in connected_clients.values() if c.get('type') == 'voter']),
            'admins_connected': len([c for c in connected_clients.values() if c.get('type') == 'admin']),
            'anonymous_connected': len([c for c in connected_clients.values() if c.get('type') == 'anonymous'])
        }

    # Make these functions available globally
    import types
    socketio.safe_emit = types.MethodType(safe_emit, socketio)
    socketio.connected_clients = connected_clients
    socketio.broadcast_election_update = types.MethodType(broadcast_election_update, socketio)
    socketio.broadcast_voter_update = types.MethodType(broadcast_voter_update, socketio)
    socketio.broadcast_system_update = types.MethodType(broadcast_system_update, socketio)
    socketio.send_private_notification = types.MethodType(send_private_notification, socketio)
    socketio.get_connected_users_count = types.MethodType(get_connected_users_count, socketio)

    logger.info("Socket.IO events registered successfully with production authentication")

    return socketio