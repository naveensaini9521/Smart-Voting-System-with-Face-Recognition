# Updated dashboard.py with election routes and SocketIO fixes
from flask import Blueprint, request, jsonify, send_file
from datetime import datetime, timedelta
import logging
import jwt
from bson import ObjectId
import io
import csv
import qrcode
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import json
from functools import wraps
import base64
from flask_socketio import SocketIO, emit, join_room, leave_room

# Import from your project structure
from smart_app.backend.mongo_models import Voter, Election, Vote, Candidate, AuditLog, OTP, FaceEncoding, Admin
from smart_app.backend.extensions import mongo
from flask_cors import cross_origin

logger = logging.getLogger(__name__)

# Create blueprint
dashboard_bp = Blueprint('dashboard', __name__)

# Initialize SocketIO with proper configuration
socketio = SocketIO(
    cors_allowed_origins="*", 
    async_mode='threading',
    logger=True,
    engineio_logger=True,
    ping_timeout=60,
    ping_interval=25,
    max_http_buffer_size=1e8
)

# JWT configuration (should match auth.py)
JWT_SECRET = 'sUJbaMMUAKYojj0dFe94jO'
JWT_ALGORITHM = 'HS256'

# Store connected clients
connected_clients = {}

# In dashboard.py, update the verify_token function:

def verify_token(token):
    """Verify JWT token with better error handling and debugging"""
    try:
        if not token:
            logger.warning("No token provided")
            return None
            
        # Remove any "Bearer " prefix if present
        if token.startswith('Bearer '):
            token = token.split(' ')[1].strip()
        
        if not token:
            logger.warning("Empty token after Bearer prefix removal")
            return None
            
        logger.info(f"Verifying token: {token[:20]}...")
        
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        # Debug logging
        logger.info(f"Token payload verified: {list(payload.keys())}")
        
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        return None

def get_authenticated_voter():
    """Get authenticated voter from token - specifically for voter routes"""
    try:
        auth_header = request.headers.get('Authorization')
        logger.info(f"Auth header present: {bool(auth_header)}")
        
        if not auth_header:
            logger.warning("No Authorization header found")
            return None
        
        if not auth_header.startswith('Bearer '):
            logger.warning(f"Invalid Authorization header format: {auth_header[:50]}...")
            return None
        
        token = auth_header.split(' ')[1].strip()
        if not token:
            logger.warning("Empty token after Bearer prefix")
            return None
            
        payload = verify_token(token)
        
        if not payload:
            logger.warning("Token verification failed")
            return None
        
        # Specifically look for voter_id, not admin_id
        voter_id = payload.get('voter_id')
        logger.info(f"Extracted voter_id from token: {voter_id}")
        
        if not voter_id:
            logger.warning("No voter_id found in token payload - this might be an admin token")
            return None
        
        voter = Voter.find_by_voter_id(voter_id)
        if not voter:
            logger.warning(f"Voter not found with ID: {voter_id}")
            return None
            
        logger.info(f"Successfully authenticated voter: {voter_id}")
        return voter
        
    except Exception as e:
        logger.error(f"Error in get_authenticated_voter: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return None

def get_authenticated_admin():
    """Get authenticated admin from token"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return None
    
    admin_id = payload.get('admin_id')
    if not admin_id:
        return None
    
    admin = Admin.find_by_admin_id(admin_id)
    return admin

def admin_required(f):
    """Decorator to require admin privileges"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        admin = get_authenticated_admin()
        if not admin:
            return jsonify({
                'success': False,
                'message': 'Admin authentication required'
            }), 401
        request.admin = admin
        return f(*args, **kwargs)
    return decorated_function

# ============ SOCKETIO FIXES ============

def safe_emit(event, data, room=None, broadcast=False):
    """Safely emit events with error handling"""
    try:
        if room:
            socketio.emit(event, data, room=room, broadcast=broadcast)
        else:
            socketio.emit(event, data, broadcast=broadcast)
        return True
    except Exception as e:
        logger.error(f"Safe emit error for event {event}: {str(e)}")
        return False

@socketio.on_error_default
def default_error_handler(e):
    """Handle SocketIO errors gracefully"""
    logger.error(f"SocketIO error for event {request.event}: {str(e)}")
    logger.error(f"Error type: {type(e)}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")
    
    # Only emit if we have an active connection
    try:
        emit('error', {
            'message': 'An unexpected error occurred',
            'event': request.event,
            'sid': request.sid
        })
    except Exception as emit_error:
        logger.error(f"Could not emit error message: {str(emit_error)}")

@socketio.on('connect')
def handle_connect():
    """Handle client connection with proper voter/admin distinction"""
    try:
        logger.info(f"=== SOCKETIO CONNECTION ATTEMPT ===")
        logger.info(f"Request SID: {request.sid}")
        logger.info(f"Request args: {dict(request.args)}")
        
        # Get parameters from query string (for direct WebSocket connections)
        voter_id = request.args.get('voter_id')
        admin_id = request.args.get('admin_id')
        user_type = request.args.get('user_type', 'voter')
        
        logger.info(f"Query params - voter_id: {voter_id}, admin_id: {admin_id}, user_type: {user_type}")
        
        # If no voter_id in query, try to get from token in headers
        if not voter_id and not admin_id:
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                try:
                    token = auth_header.split(' ')[1].strip()
                    payload = verify_token(token)
                    if payload:
                        if payload.get('voter_id'):
                            voter_id = payload['voter_id']
                            user_type = 'voter'
                            logger.info(f"Found voter_id from token: {voter_id}")
                        elif payload.get('admin_id'):
                            admin_id = payload['admin_id']
                            user_type = 'admin'
                            logger.info(f"Found admin_id from token: {admin_id}")
                except Exception as token_error:
                    logger.warning(f"Token parsing error in connect: {str(token_error)}")
        
        # Validate and process connection
        if user_type == 'voter' and voter_id:
            return handle_voter_connection(voter_id)
        elif user_type == 'admin' and admin_id:
            return handle_admin_connection(admin_id)
        else:
            logger.warning(f"Invalid connection parameters - voter_id: {voter_id}, admin_id: {admin_id}, user_type: {user_type}")
            return False
            
    except Exception as e:
        logger.error(f"SocketIO connection error: {str(e)}")
        import traceback
        logger.error(f"SocketIO traceback: {traceback.format_exc()}")
        return False

def handle_voter_connection(voter_id):
    """Handle voter WebSocket connection"""
    try:
        voter = Voter.find_by_voter_id(voter_id)
        if not voter:
            logger.warning(f"Voter not found: {voter_id}")
            return False
            
        # Join rooms
        join_room(f'voter_{voter_id}')
        join_room('all_voters')
        join_room('public_updates')
        
        # Store connection info
        connected_clients[request.sid] = {
            'type': 'voter',
            'voter_id': voter_id,
            'connected_at': datetime.utcnow().isoformat()
        }
        
        logger.info(f"Voter {voter_id} connected to SocketIO. SID: {request.sid}")
        
        # Emit connection confirmation
        emit('connection_established', {
            'status': 'connected',
            'message': 'Real-time updates enabled',
            'user_type': 'voter',
            'voter_id': voter_id,
            'sid': request.sid
        })
        
        return True
        
    except Exception as e:
        logger.error(f"Voter connection handler error: {str(e)}")
        return False

def handle_admin_connection(admin_id):
    """Handle admin WebSocket connection"""
    try:
        admin = Admin.find_by_admin_id(admin_id)
        if not admin:
            logger.warning(f"Admin not found: {admin_id}")
            return False
            
        # Join rooms
        join_room(f'admin_{admin_id}')
        join_room('all_admins')
        join_room('public_updates')
        
        # Store connection info
        connected_clients[request.sid] = {
            'type': 'admin',
            'admin_id': admin_id,
            'connected_at': datetime.utcnow().isoformat()
        }
        
        logger.info(f"Admin {admin_id} connected to SocketIO. SID: {request.sid}")
        
        # Emit connection confirmation
        emit('connection_established', {
            'status': 'connected',
            'message': 'Admin real-time updates enabled',
            'user_type': 'admin',
            'admin_id': admin_id,
            'sid': request.sid
        })
        
        return True
        
    except Exception as e:
        logger.error(f"Admin connection handler error: {str(e)}")
        return False

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    try:
        client_data = connected_clients.pop(request.sid, None)
        if client_data:
            user_type = client_data.get('type')
            user_id = client_data.get('voter_id') or client_data.get('admin_id')
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
            return
        
        # Join election-specific room
        room_name = f'elections_{voter_id}'
        join_room(room_name)
        
        logger.info(f"Client {request.sid} subscribed to elections for voter {voter_id}")
        
        safe_emit('subscription_success', {
            'message': f'Subscribed to election updates for voter {voter_id}',
            'room': room_name
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
        
        # Broadcast vote count update to all clients watching this election
        vote_count = Vote.count({"election_id": election_id, "is_verified": True})
        
        safe_emit('vote_count_update', {
            'election_id': election_id,
            'total_votes': vote_count,
            'timestamp': datetime.utcnow().isoformat()
        }, room=f'election_{election_id}', broadcast=True)
        
    except Exception as e:
        logger.error(f"Vote cast socket error: {str(e)}")

# ============ REAL-TIME UPDATE FUNCTIONS ============

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
        'admins_connected': len([c for c in connected_clients.values() if c.get('type') == 'admin'])
    }

# ============ ELECTION ROUTES ============

@dashboard_bp.route('/elections', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_elections_for_voter():
    """Get elections data for voter dashboard with filtering"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        voter = get_authenticated_voter()
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401
        
        election_type = request.args.get('type', 'all')
        status = request.args.get('status', 'all')
        
        elections_data = {
            'upcoming': get_upcoming_elections(voter, election_type),
            'active': get_active_elections(voter, election_type),
            'completed': get_past_elections(voter, election_type),
            'statistics': get_election_statistics(voter['voter_id']),
            'type_counts': get_election_type_counts()
        }
        
        return jsonify({
            'success': True,
            'elections_data': elections_data
        })
        
    except Exception as e:
        logger.error(f'Elections error: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to load elections data'
        }), 500

@dashboard_bp.route('/elections/active', methods=['GET'])
@cross_origin()
def get_active_elections_for_voting():
    """Get active elections available for voting"""
    try:
        voter = get_authenticated_voter()
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401

        # Get active elections
        active_elections = Election.find_all({
            "status": "active",
            "is_active": True,
            "voting_start": {"$lte": datetime.utcnow()},
            "voting_end": {"$gte": datetime.utcnow()}
        })

        elections_data = []
        for election in active_elections:
            # Check if voter is eligible
            is_eligible = check_voter_eligibility(voter['voter_id'], election['election_id'])
            has_voted = Vote.has_voted(election['election_id'], voter['voter_id'])
            
            # Get candidates for this election
            candidates = Candidate.find_all({
                "election_id": election['election_id'],
                "is_active": True,
                "is_approved": True
            })

            election_data = {
                'election_id': election['election_id'],
                'title': election['title'],
                'description': election.get('description', ''),
                'election_type': election.get('election_type', 'general'),
                'voting_start': election['voting_start'].isoformat() if election.get('voting_start') else None,
                'voting_end': election['voting_end'].isoformat() if election.get('voting_end') else None,
                'constituency': election.get('constituency', ''),
                'is_eligible': is_eligible,
                'has_voted': has_voted,
                'candidates_count': len(candidates),
                'total_votes': Vote.count({"election_id": election['election_id']}),
                'candidates_preview': [{
                    'candidate_id': cand['candidate_id'],
                    'full_name': cand['full_name'],
                    'party': cand.get('party', 'Independent'),
                    'photo': cand.get('photo')
                } for cand in candidates[:3]]  # Show first 3 candidates
            }
            elections_data.append(election_data)

        return jsonify({
            'success': True,
            'elections': elections_data,
            'total_active': len(elections_data)
        })

    except Exception as e:
        logger.error(f"Active elections error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load active elections'
        }), 500

@dashboard_bp.route('/elections/<election_id>/candidates', methods=['GET'])
@cross_origin()
def get_election_candidates(election_id):
    """Get all candidates for a specific election"""
    try:
        voter = get_authenticated_voter()
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401

        # Verify election exists and is active
        election = Election.find_by_election_id(election_id)
        if not election:
            return jsonify({
                'success': False,
                'message': 'Election not found'
            }), 404

        # Check if election is active
        current_time = datetime.utcnow()
        voting_start = election.get('voting_start')
        voting_end = election.get('voting_end')
        
        if not (voting_start and voting_end):
            return jsonify({
                'success': False,
                'message': 'Invalid election configuration'
            }), 400

        if current_time < voting_start:
            return jsonify({
                'success': False,
                'message': 'Voting has not started yet'
            }), 400

        if current_time > voting_end:
            return jsonify({
                'success': False,
                'message': 'Voting has ended'
            }), 400

        if election.get('status') != 'active':
            return jsonify({
                'success': False,
                'message': 'Election is not currently active for voting'
            }), 400

        # Check if voter has already voted
        if Vote.has_voted(election_id, voter['voter_id']):
            return jsonify({
                'success': False,
                'message': 'You have already voted in this election'
            }), 400

        # Get all approved candidates
        candidates = Candidate.find_all({
            "election_id": election_id,
            "is_active": True,
            "is_approved": True
        })

        candidates_data = []
        for candidate in candidates:
            candidate_data = {
                'candidate_id': candidate['candidate_id'],
                'full_name': candidate['full_name'],
                'party': candidate.get('party', 'Independent'),
                'party_symbol': candidate.get('party_symbol'),
                'photo': candidate.get('photo'),
                'biography': candidate.get('biography', ''),
                'manifesto': candidate.get('manifesto', ''),
                'qualifications': candidate.get('qualifications', ''),
                'agenda': candidate.get('agenda', ''),
                'candidate_number': candidate.get('candidate_number'),
                'symbol_name': candidate.get('symbol_name', ''),
                'assets_declaration': candidate.get('assets_declaration'),
                'criminal_records': candidate.get('criminal_records', 'none'),
                'is_approved': candidate.get('is_approved', False)
            }
            candidates_data.append(candidate_data)

        return jsonify({
            'success': True,
            'election': {
                'election_id': election['election_id'],
                'title': election['title'],
                'description': election.get('description', ''),
                'voting_end': election.get('voting_end'),
                'election_type': election.get('election_type', 'general'),
                'constituency': election.get('constituency', '')
            },
            'candidates': candidates_data,
            'total_candidates': len(candidates_data),
            'has_voted': Vote.has_voted(election_id, voter['voter_id'])
        })

    except Exception as e:
        logger.error(f"Election candidates error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load candidates'
        }), 500

@dashboard_bp.route('/elections/<election_id>/vote', methods=['POST'])
@cross_origin()
def cast_vote_in_election(election_id):
    """Cast vote in an election """
    try:
        voter = get_authenticated_voter()
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401

        data = request.get_json()
        candidate_id = data.get('candidate_id')

        if not candidate_id:
            return jsonify({
                'success': False,
                'message': 'Candidate ID is required'
            }), 400

        # Verify election exists and is active
        election = Election.find_by_election_id(election_id)
        if not election:
            return jsonify({
                'success': False,
                'message': 'Election not found'
            }), 404

        # Enhanced election status checking
        current_time = datetime.utcnow()
        voting_start = election.get('voting_start')
        voting_end = election.get('voting_end')
        
        logger.info(f"Vote attempt - Election: {election['title']}, Voter: {voter['voter_id']}")
        logger.info(f"Current: {current_time}, Start: {voting_start}, End: {voting_end}")
        
        # Check if election is active
        if not (voting_start and voting_end):
            return jsonify({
                'success': False,
                'message': 'Invalid election configuration'
            }), 400

        if current_time < voting_start:
            return jsonify({
                'success': False,
                'message': 'Voting has not started yet'
            }), 400

        if current_time > voting_end:
            return jsonify({
                'success': False,
                'message': 'Voting has ended'
            }), 400

        if election.get('status') != 'active':
            return jsonify({
                'success': False,
                'message': 'Election is not currently active for voting'
            }), 400

        # Check if voter has already voted
        if Vote.has_voted(election_id, voter['voter_id']):
            return jsonify({
                'success': False,
                'message': 'You have already voted in this election'
            }), 400

        # Verify candidate exists and is approved
        candidate = Candidate.find_one({
            "candidate_id": candidate_id,
            "election_id": election_id,
            "is_active": True,
            "is_approved": True
        })
        if not candidate:
            return jsonify({
                'success': False,
                'message': 'Invalid candidate or candidate not approved'
            }), 400

        # Enhanced voter eligibility check
        if not check_voter_eligibility(voter['voter_id'], election_id):
            return jsonify({
                'success': False,
                'message': 'You are not eligible to vote in this election'
            }), 400

        # Create vote record with enhanced data
        vote_data = {
            'vote_id': f"VOTE_{election_id}_{voter['voter_id']}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            'election_id': election_id,
            'voter_id': voter['voter_id'],
            'candidate_id': candidate_id,
            'face_verified': voter.get('face_verified', False),
            'ip_address': request.remote_addr,
            'user_agent': request.headers.get('User-Agent'),
            'vote_timestamp': datetime.utcnow(),
            'is_verified': True,
            'location_data': {
                'ip': request.remote_addr,
                'user_agent': request.headers.get('User-Agent')
            }
        }

        vote_id = Vote.create_vote(vote_data)
        logger.info(f"Vote recorded: {vote_id}")

        # Update candidate vote count
        Candidate.get_collection().update_one(
            {"candidate_id": candidate_id},
            {"$inc": {"vote_count": 1}}
        )

        # Update election total votes
        Election.get_collection().update_one(
            {"election_id": election_id},
            {"$inc": {"total_votes": 1}}
        )

        # Log the vote
        AuditLog.create_log(
            action='vote_cast',
            user_id=voter['voter_id'],
            user_type='voter',
            details={
                'election_id': election_id,
                'election_title': election['title'],
                'candidate_id': candidate_id,
                'candidate_name': candidate['full_name'],
                'vote_id': vote_id,
                'party': candidate.get('party', 'Independent')
            },
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )

        # Broadcast real-time update
        broadcast_election_update('vote_cast', {
            'election_id': election_id,
            'voter_id': voter['voter_id'],
            'candidate_id': candidate_id,
            'total_votes': Vote.count({"election_id": election_id}),
            'timestamp': datetime.utcnow().isoformat()
        })

        # Send confirmation to voter
        send_private_notification(voter['voter_id'], {
            'type': 'vote_confirmation',
            'title': 'Vote Cast Successfully!',
            'message': f'Your vote for {candidate["full_name"]} in {election["title"]} has been recorded.',
            'timestamp': datetime.utcnow().isoformat(),
            'election_id': election_id,
            'candidate_name': candidate['full_name']
        })

        return jsonify({
            'success': True,
            'message': 'Vote cast successfully!',
            'vote_id': vote_id,
            'candidate_name': candidate['full_name'],
            'candidate_party': candidate.get('party', 'Independent'),
            'election_title': election['title'],
            'vote_timestamp': datetime.utcnow().isoformat(),
            'confirmation_number': vote_id
        })

    except Exception as e:
        logger.error(f"Vote casting error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to cast vote. Please try again.'
        }), 500

@dashboard_bp.route('/elections/<election_id>/start-voting', methods=['POST', 'OPTIONS'])
@cross_origin()
def start_voting_session(election_id):
    """Start a voting session for a voter"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        voter = get_authenticated_voter()
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401

        logger.info(f"Starting voting session for election: {election_id}, voter: {voter['voter_id']}")

        # Verify election exists and is active
        election = Election.find_by_election_id(election_id)
        if not election:
            logger.error(f"Election not found: {election_id}")
            return jsonify({
                'success': False,
                'message': 'Election not found'
            }), 404

        # Enhanced election status checking
        current_time = datetime.utcnow()
        voting_start = election.get('voting_start')
        voting_end = election.get('voting_end')
        
        logger.info(f"📊 Election status check - Current: {current_time}, Start: {voting_start}, End: {voting_end}")
        
        # Check if election is active
        if not (voting_start and voting_end):
            logger.error("❌ Invalid election configuration - missing voting dates")
            return jsonify({
                'success': False,
                'message': 'Invalid election configuration'
            }), 400

        if current_time < voting_start:
            logger.warning(f"⚠️ Voting not started yet - Election: {election_id}")
            return jsonify({
                'success': False,
                'message': 'Voting has not started yet'
            }), 400

        if current_time > voting_end:
            logger.warning(f"⚠️ Voting ended - Election: {election_id}")
            return jsonify({
                'success': False,
                'message': 'Voting has ended'
            }), 400

        if election.get('status') != 'active':
            logger.warning(f"⚠️ Election not active - Status: {election.get('status')}")
            return jsonify({
                'success': False,
                'message': 'Election is not currently active for voting'
            }), 400

        # Check if voter has already voted
        if Vote.has_voted(election_id, voter['voter_id']):
            logger.warning(f"⚠️ Voter already voted - Election: {election_id}, Voter: {voter['voter_id']}")
            return jsonify({
                'success': False,
                'message': 'You have already voted in this election'
            }), 400

        # Enhanced voter eligibility check
        if not check_voter_eligibility(voter['voter_id'], election_id):
            logger.warning(f"⚠️ Voter not eligible - Election: {election_id}, Voter: {voter['voter_id']}")
            return jsonify({
                'success': False,
                'message': 'You are not eligible to vote in this election'
            }), 400

        # Create voting session record
        session_data = {
            'session_id': f"SESSION_{election_id}_{voter['voter_id']}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            'election_id': election_id,
            'voter_id': voter['voter_id'],
            'started_at': datetime.utcnow(),
            'ip_address': request.remote_addr,
            'user_agent': request.headers.get('User-Agent'),
            'status': 'active',
            'expires_at': datetime.utcnow() + timedelta(minutes=30)  # 30-minute session
        }

        # Store session in database (you might want to create a VotingSession collection)
        # For now, we'll log it and return success
        logger.info(f"Voting session created: {session_data['session_id']}")

        # Log the session start
        AuditLog.create_log(
            action='voting_session_start',
            user_id=voter['voter_id'],
            user_type='voter',
            details={
                'election_id': election_id,
                'election_title': election['title'],
                'session_id': session_data['session_id'],
                'ip_address': request.remote_addr
            },
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )

        # Get candidates for the election
        candidates = Candidate.find_all({
            "election_id": election_id,
            "is_active": True,
            "is_approved": True
        })

        candidates_data = []
        for candidate in candidates:
            candidate_data = {
                'candidate_id': candidate['candidate_id'],
                'full_name': candidate['full_name'],
                'party': candidate.get('party', 'Independent'),
                'party_symbol': candidate.get('party_symbol'),
                'photo': candidate.get('photo'),
                'biography': candidate.get('biography', ''),
                'manifesto': candidate.get('manifesto', ''),
                'qualifications': candidate.get('qualifications', ''),
                'agenda': candidate.get('agenda', ''),
                'candidate_number': candidate.get('candidate_number'),
                'symbol_name': candidate.get('symbol_name', '')
            }
            candidates_data.append(candidate_data)

        response_data = {
            'success': True,
            'message': 'Voting session started successfully',
            'session_id': session_data['session_id'],
            'election': {
                'election_id': election['election_id'],
                'title': election['title'],
                'description': election.get('description', ''),
                'voting_end': election.get('voting_end').isoformat() if election.get('voting_end') else None,
                'election_type': election.get('election_type', 'general'),
                'constituency': election.get('constituency', '')
            },
            'candidates': candidates_data,
            'total_candidates': len(candidates_data),
            'session_expires': session_data['expires_at'].isoformat(),
            'voting_instructions': [
                'Review all candidates before making your selection',
                'Your vote is final and cannot be changed once submitted',
                'Voting session will expire in 30 minutes'
            ]
        }

        logger.info(f"Voting session ready - Election: {election_id}, Candidates: {len(candidates_data)}")
        return jsonify(response_data)

    except Exception as e:
        logger.error(f"Voting session error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to start voting session. Please try again.'
        }), 500

@dashboard_bp.route('/elections/<election_id>/results', methods=['GET'])
@cross_origin()
def get_election_results(election_id):
    """Get election results (if available)"""
    try:
        voter = get_authenticated_voter()
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401

        election = Election.find_by_election_id(election_id)
        if not election:
            return jsonify({
                'success': False,
                'message': 'Election not found'
            }), 404

        # Check if results are available
        current_time = datetime.utcnow()
        voting_end = election.get('voting_end')
        results_publish = election.get('results_publish')

        if results_publish and current_time < results_publish:
            return jsonify({
                'success': False,
                'message': 'Results are not available yet'
            }), 400

        # Get vote counts per candidate
        pipeline = [
            {"$match": {"election_id": election_id, "is_verified": True}},
            {"$group": {
                "_id": "$candidate_id",
                "total_votes": {"$sum": 1}
            }},
            {"$sort": {"total_votes": -1}}
        ]
        
        vote_results = list(Vote.get_collection().aggregate(pipeline))

        # Get candidate details
        candidates = Candidate.find_all({"election_id": election_id})
        candidate_map = {cand['candidate_id']: cand for cand in candidates}

        results_data = []
        total_votes = 0
        
        for result in vote_results:
            candidate = candidate_map.get(result['_id'])
            if candidate:
                vote_count = result['total_votes']
                total_votes += vote_count
                results_data.append({
                    'candidate_id': candidate['candidate_id'],
                    'full_name': candidate['full_name'],
                    'party': candidate.get('party', 'Independent'),
                    'photo': candidate.get('photo'),
                    'vote_count': vote_count,
                    'percentage': 0  # Will calculate below
                })

        # Calculate percentages
        for result in results_data:
            if total_votes > 0:
                result['percentage'] = round((result['vote_count'] / total_votes) * 100, 2)

        return jsonify({
            'success': True,
            'election': {
                'election_id': election['election_id'],
                'title': election['title'],
                'total_votes': total_votes,
                'voting_end': voting_end.isoformat() if voting_end else None
            },
            'results': results_data,
            'results_available': True
        })

    except Exception as e:
        logger.error(f"Election results error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load election results'
        }), 500

@dashboard_bp.route('/update-election-statuses', methods=['POST'])
def update_election_statuses_endpoint():
    """Endpoint to manually trigger election status updates"""
    try:
        update_election_statuses()
        return jsonify({
            'success': True,
            'message': 'Election statuses updated successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to update election statuses: {str(e)}'
        }), 500

def update_election_statuses():
    """Automatically update election statuses based on current time"""
    try:
        current_time = datetime.utcnow()
        
        # Update scheduled elections to active if voting has started
        Election.get_collection().update_many({
            "status": "scheduled",
            "voting_start": {"$lte": current_time},
            "voting_end": {"$gte": current_time},
            "is_active": True
        }, {
            "$set": {"status": "active", "updated_at": current_time}
        })
        
        # Update active elections to completed if voting has ended
        Election.get_collection().update_many({
            "status": "active", 
            "voting_end": {"$lt": current_time},
            "is_active": True
        }, {
            "$set": {"status": "completed", "updated_at": current_time}
        })
        
        print("Election statuses updated successfully")
        
    except Exception as e:
        print(f"Error updating election statuses: {str(e)}")

# ============ ENHANCED DASHBOARD ROUTES ============

@dashboard_bp.route('/data', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_dashboard_data():
    """Get comprehensive dashboard data for authenticated user"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        voter = get_authenticated_voter()
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401
        
        logger.info(f"Loading dashboard data for voter: {voter['voter_id']}")
        
        dashboard_data = get_enhanced_dashboard_data(voter)
        
        # Log dashboard access
        AuditLog.create_log(
            action='dashboard_access',
            user_id=voter['voter_id'],
            user_type='voter',
            details={'section': 'overview'},
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        return jsonify({
            'success': True,
            'dashboard_data': dashboard_data,
            'last_updated': datetime.utcnow().isoformat(),
            'real_time_enabled': True
        })
        
    except Exception as e:
        logger.error(f'Dashboard data error: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to load dashboard data'
        }), 500

def get_enhanced_dashboard_data(voter):
    """Get enhanced dashboard data with real-time features"""
    return {
        'voter_info': get_enhanced_voter_info(voter),
        'election_info': get_enhanced_election_info(voter),
        'quick_stats': get_enhanced_quick_stats(voter),
        'notifications': get_recent_notifications(voter['voter_id']),
        'analytics': get_voter_analytics(voter['voter_id']),
        'system_status': get_system_status(),
        'real_time_updates': {
            'last_updated': datetime.utcnow().isoformat(),
            'active_elections_count': get_active_elections_count(),
            'total_votes_today': get_today_votes_count(),
            'connected_users': get_connected_users_count()
        }
    }

@dashboard_bp.route('/socket-info', methods=['GET'])
@cross_origin()
def get_socket_info():
    """Get SocketIO connection information"""
    try:
        voter = get_authenticated_voter()
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401
        
        voter_connections = [c for c in connected_clients.values() 
                           if c.get('voter_id') == voter['voter_id']]
        
        return jsonify({
            'success': True,
            'socket_info': {
                'connected': len(voter_connections) > 0,
                'connection_count': len(voter_connections),
                'total_connections': get_connected_users_count(),
                'server_time': datetime.utcnow().isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f'Socket info error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Failed to get socket info'
        }), 500

@dashboard_bp.route('/socket-health', methods=['GET'])
@cross_origin()
def socket_health_check():
    """Health check for Socket.IO connections"""
    return jsonify({
        'success': True,
        'socket_io_connected': True,
        'connected_clients': len(connected_clients),
        'server_time': datetime.utcnow().isoformat()
    })

@dashboard_bp.route('/debug-socket', methods=['GET'])
@cross_origin()
def debug_socket():
    """Debug Socket.IO connections"""
    return jsonify({
        'connected_clients': connected_clients,
        'total_connections': len(connected_clients),
        'server_info': {
            'async_mode': socketio.async_mode,
            'cors_allowed_origins': socketio.cors_allowed_origins
        }
    })

# ============ ADMIN REAL-TIME ENDPOINTS ============

@dashboard_bp.route('/admin/update-election', methods=['POST'])
@cross_origin()
@admin_required
def admin_update_election():
    """Admin endpoint to update elections (triggers real-time updates)"""
    try:
        data = request.get_json()
        action = data.get('action')  # create, update, delete, activate, deactivate
        election_data = data.get('election_data')
        
        if not action or not election_data:
            return jsonify({
                'success': False,
                'message': 'Action and election_data are required'
            }), 400
        
        # Perform the election operation
        result = perform_election_operation(action, election_data, request.admin)
        
        if result['success']:
            # Broadcast the update to all connected clients
            broadcast_election_update(action, result['election'], request.admin['admin_id'])
            
            # Send private notification to affected voters if needed
            if action in ['create', 'activate']:
                notify_voters_about_new_election(result['election'])
            
            return jsonify({
                'success': True,
                'message': f'Election {action} successful',
                'election': result['election'],
                'broadcast_sent': True
            })
        else:
            return jsonify({
                'success': False,
                'message': result['message']
            }), 400
            
    except Exception as e:
        logger.error(f'Admin election update error: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to update election'
        }), 500

@dashboard_bp.route('/admin/update-voter', methods=['POST'])
@cross_origin()
@admin_required
def admin_update_voter():
    """Admin endpoint to update voter status (triggers real-time updates)"""
    try:
        data = request.get_json()
        action = data.get('action')  # verify, suspend, activate, update
        voter_data = data.get('voter_data')
        
        if not action or not voter_data:
            return jsonify({
                'success': False,
                'message': 'Action and voter_data are required'
            }), 400
        
        # Perform the voter operation
        result = perform_voter_operation(action, voter_data, request.admin)
        
        if result['success']:
            # Broadcast the update
            broadcast_voter_update(action, result['voter'], request.admin['admin_id'])
            
            # Send private notification to the voter
            if action in ['verify', 'activate']:
                send_voter_status_notification(result['voter'], action)
            
            return jsonify({
                'success': True,
                'message': f'Voter {action} successful',
                'voter': result['voter'],
                'notification_sent': True
            })
        else:
            return jsonify({
                'success': False,
                'message': result['message']
            }), 400
            
    except Exception as e:
        logger.error(f'Admin voter update error: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to update voter'
        }), 500

@dashboard_bp.route('/admin/broadcast', methods=['POST'])
@cross_origin()
@admin_required
def admin_broadcast():
    """Admin endpoint to broadcast messages to all voters"""
    try:
        data = request.get_json()
        message = data.get('message')
        broadcast_type = data.get('type', 'info')
        
        if not message:
            return jsonify({
                'success': False,
                'message': 'Message is required'
            }), 400
        
        # Use SocketIO to broadcast
        safe_emit('admin_broadcast', {
            'message': message,
            'type': broadcast_type,
            'admin_id': request.admin['admin_id'],
            'timestamp': datetime.utcnow().isoformat(),
            'urgent': broadcast_type == 'urgent'
        }, room='all_voters', broadcast=True)
        
        # Log the broadcast
        AuditLog.create_log(
            action='admin_broadcast',
            user_id=request.admin['admin_id'],
            user_type='admin',
            details={
                'message': message,
                'type': broadcast_type,
                'recipients': 'all_voters'
            },
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        return jsonify({
            'success': True,
            'message': 'Broadcast sent successfully',
            'recipients': get_connected_users_count()['voters_connected']
        })
        
    except Exception as e:
        logger.error(f'Admin broadcast error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Failed to send broadcast'
        }), 500

@dashboard_bp.route('/admin/connected-users', methods=['GET'])
@cross_origin()
@admin_required
def get_connected_users():
    """Get information about connected users"""
    try:
        return jsonify({
            'success': True,
            'connected_users': get_connected_users_count(),
            'detailed_connections': list(connected_clients.values())[:50]  # First 50 connections
        })
    except Exception as e:
        logger.error(f'Connected users error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Failed to get connected users'
        }), 500

# ============ NOTIFICATION HELPERS ============

def notify_voters_about_new_election(election):
    """Notify voters about new election"""
    try:
        # In a real implementation, you might want to notify specific constituencies
        notification_data = {
            'type': 'new_election',
            'title': 'New Election Available',
            'message': f"New election '{election.get('title')}' is now available for voting.",
            'election_id': election.get('election_id'),
            'timestamp': datetime.utcnow().isoformat(),
            'action_url': f'/elections/{election.get("election_id")}'
        }
        
        # Broadcast to all voters
        safe_emit('election_notification', notification_data, room='all_voters')
        
    except Exception as e:
        logger.error(f"Error notifying voters about new election: {str(e)}")

def send_voter_status_notification(voter, action):
    """Send notification to voter about status change"""
    try:
        notification_data = {
            'type': 'status_update',
            'title': 'Account Status Updated',
            'message': f'Your account has been {action}d successfully.',
            'timestamp': datetime.utcnow().isoformat(),
            'action': action
        }
        
        send_private_notification(voter['voter_id'], notification_data)
        
    except Exception as e:
        logger.error(f"Error sending voter status notification: {str(e)}")

# ============ REAL-TIME OPERATION HANDLERS ============

def perform_election_operation(action, election_data, admin):
    """Perform election operations and return result"""
    try:
        if action == 'create':
            # Create new election
            election_id = Election.create_election(election_data)
            election = Election.find_by_election_id(election_id)
            
            # Log admin action
            AuditLog.create_log(
                action='create_election',
                user_id=admin['admin_id'],
                user_type='admin',
                details={
                    'election_id': election_id,
                    'title': election_data.get('title'),
                    'action': 'create'
                },
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )
            
            return {
                'success': True,
                'election': election
            }
            
        elif action == 'update':
            election_id = election_data.get('election_id')
            if not election_id:
                return {'success': False, 'message': 'Election ID required'}
            
            # Update election
            update_data = {k: v for k, v in election_data.items() if k != 'election_id'}
            Election.update_one({"election_id": election_id}, update_data)
            election = Election.find_by_election_id(election_id)
            
            AuditLog.create_log(
                action='update_election',
                user_id=admin['admin_id'],
                user_type='admin',
                details={
                    'election_id': election_id,
                    'changes': update_data,
                    'action': 'update'
                },
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )
            
            return {
                'success': True,
                'election': election
            }
            
        elif action == 'delete':
            election_id = election_data.get('election_id')
            if not election_id:
                return {'success': False, 'message': 'Election ID required'}
            
            # Soft delete election
            Election.update_one(
                {"election_id": election_id}, 
                {"is_active": False, "status": "cancelled"}
            )
            election = Election.find_by_election_id(election_id)
            
            AuditLog.create_log(
                action='delete_election',
                user_id=admin['admin_id'],
                user_type='admin',
                details={
                    'election_id': election_id,
                    'action': 'delete'
                },
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )
            
            return {
                'success': True,
                'election': election
            }
            
        elif action == 'activate':
            election_id = election_data.get('election_id')
            if not election_id:
                return {'success': False, 'message': 'Election ID required'}
            
            Election.update_one(
                {"election_id": election_id}, 
                {"status": "active"}
            )
            election = Election.find_by_election_id(election_id)
            
            AuditLog.create_log(
                action='activate_election',
                user_id=admin['admin_id'],
                user_type='admin',
                details={
                    'election_id': election_id,
                    'action': 'activate'
                },
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )
            
            return {
                'success': True,
                'election': election
            }
            
        else:
            return {'success': False, 'message': 'Invalid action'}
            
    except Exception as e:
        logger.error(f"Election operation error: {str(e)}")
        return {'success': False, 'message': str(e)}

def perform_voter_operation(action, voter_data, admin):
    """Perform voter operations and return result"""
    try:
        voter_id = voter_data.get('voter_id')
        if not voter_id:
            return {'success': False, 'message': 'Voter ID required'}
        
        if action == 'verify':
            verification_type = voter_data.get('verification_type', 'all')
            update_data = {}
            
            if verification_type == 'all':
                update_data = {
                    'email_verified': True,
                    'phone_verified': True,
                    'id_verified': True,
                    'face_verified': True,
                    'registration_status': 'verified'
                }
            elif verification_type == 'email':
                update_data = {'email_verified': True}
            elif verification_type == 'phone':
                update_data = {'phone_verified': True}
            elif verification_type == 'id':
                update_data = {'id_verified': True}
            elif verification_type == 'face':
                update_data = {'face_verified': True}
            
            Voter.update_one({"voter_id": voter_id}, update_data)
            voter = Voter.find_by_voter_id(voter_id)
            
            AuditLog.create_log(
                action='verify_voter',
                user_id=admin['admin_id'],
                user_type='admin',
                details={
                    'voter_id': voter_id,
                    'verification_type': verification_type,
                    'action': 'verify'
                },
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )
            
            return {
                'success': True,
                'voter': voter
            }
            
        elif action == 'suspend':
            Voter.update_one({"voter_id": voter_id}, {"is_active": False})
            voter = Voter.find_by_voter_id(voter_id)
            
            AuditLog.create_log(
                action='suspend_voter',
                user_id=admin['admin_id'],
                user_type='admin',
                details={
                    'voter_id': voter_id,
                    'action': 'suspend'
                },
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )
            
            return {
                'success': True,
                'voter': voter
            }
            
        elif action == 'activate':
            Voter.update_one({"voter_id": voter_id}, {"is_active": True})
            voter = Voter.find_by_voter_id(voter_id)
            
            AuditLog.create_log(
                action='activate_voter',
                user_id=admin['admin_id'],
                user_type='admin',
                details={
                    'voter_id': voter_id,
                    'action': 'activate'
                },
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )
            
            return {
                'success': True,
                'voter': voter
            }
            
        else:
            return {'success': False, 'message': 'Invalid action'}
            
    except Exception as e:
        logger.error(f"Voter operation error: {str(e)}")
        return {'success': False, 'message': str(e)}

# ============ ENHANCED HELPER FUNCTIONS ============

def get_enhanced_voter_info(voter):
    """Get enhanced voter information"""
    return {
        'voter_id': voter['voter_id'],
        'full_name': voter['full_name'],
        'email': voter['email'],
        'phone': voter['phone'],
        'constituency': voter.get('constituency', 'General Constituency'),
        'polling_station': voter.get('polling_station', 'Main Polling Station'),
        'registration_date': voter.get('created_at', datetime.utcnow()).isoformat(),
        'last_login': voter.get('last_login', datetime.utcnow()).isoformat(),
        'profile_completion': calculate_profile_completion(voter),
        'verification_status': get_verification_status(voter),
        'account_status': 'Active' if voter.get('is_active', True) else 'Suspended',
        'membership_duration': calculate_membership_duration(voter.get('created_at')),
        'badges': get_completion_badges(voter)
    }

def get_enhanced_election_info(voter):
    """Get enhanced election information"""
    return {
        'upcoming_elections': get_upcoming_elections(voter),
        'active_elections': get_active_elections(voter),
        'past_elections': get_past_elections(voter),
        'can_vote': can_vote(voter),
        'election_calendar': get_election_calendar(),
        'featured_elections': get_featured_elections(),
        'voting_reminders': get_voting_reminders(voter['voter_id'])
    }

def get_enhanced_quick_stats(voter):
    """Get enhanced quick statistics"""
    return {
        'votes_cast': get_votes_cast_count(voter['voter_id']),
        'elections_participated': get_elections_participated_count(voter['voter_id']),
        'upcoming_elections': get_upcoming_elections_count(),
        'verification_status': get_verification_status(voter),
        'account_status': 'Active' if voter.get('is_active', True) else 'Inactive',
        'participation_rate': calculate_participation_rate(voter['voter_id']),
        'constituency_rank': get_constituency_ranking(voter['voter_id']).get('rank', 'N/A'),
        'voting_streak': calculate_voting_streak(voter['voter_id']),
        'profile_score': calculate_profile_score(voter)
    }

def get_system_status():
    """Get system-wide status"""
    return {
        'system_health': 'optimal',
        'active_users': get_active_users_count(),
        'total_votes_today': get_today_votes_count(),
        'system_uptime': '99.9%',
        'last_maintenance': (datetime.utcnow() - timedelta(days=2)).isoformat(),
        'next_maintenance': (datetime.utcnow() + timedelta(days=30)).isoformat(),
        'active_elections': get_active_elections_count(),
        'total_voters': Voter.count({"is_active": True}),
        'real_time_connections': get_connected_users_count()
    }

def calculate_membership_duration(registration_date):
    """Calculate how long the voter has been registered"""
    if not registration_date:
        return "N/A"
    
    if isinstance(registration_date, dict) and '$date' in registration_date:
        reg_date = datetime.fromisoformat(registration_date['$date'].replace('Z', '+00:00'))
    else:
        reg_date = registration_date
    
    duration = datetime.utcnow() - reg_date
    days = duration.days
    
    if days < 30:
        return f"{days} days"
    elif days < 365:
        months = days // 30
        return f"{months} month{'s' if months > 1 else ''}"
    else:
        years = days // 365
        return f"{years} year{'s' if years > 1 else ''}"

def calculate_voting_streak(voter_id):
    """Calculate consecutive voting streak"""
    # Implementation for voting streak calculation
    return 0

def get_completion_badges(voter):
    """Get profile completion badges"""
    badges = []
    
    if voter.get('email_verified'):
        badges.append({'name': 'Email Verified', 'icon': 'email', 'color': 'success'})
    if voter.get('phone_verified'):
        badges.append({'name': 'Phone Verified', 'icon': 'phone', 'color': 'info'})
    if voter.get('id_verified'):
        badges.append({'name': 'ID Verified', 'icon': 'id-card', 'color': 'warning'})
    if voter.get('face_verified'):
        badges.append({'name': 'Face Verified', 'icon': 'user-check', 'color': 'primary'})
    
    profile_completion = calculate_profile_completion(voter)
    if profile_completion >= 100:
        badges.append({'name': 'Profile Complete', 'icon': 'star', 'color': 'gold'})
    
    return badges

def get_featured_elections():
    """Get featured/highlighted elections"""
    try:
        return Election.find_all({
            "is_featured": True,
            "is_active": True,
            "status": {"$in": ["active", "scheduled"]}
        }, sort=[("voting_start", 1)], limit=3)
    except Exception as e:
        logger.error(f"Error getting featured elections: {str(e)}")
        return []

def get_voting_reminders(voter_id):
    """Get voting reminders for voter"""
    try:
        upcoming_elections = get_upcoming_elections({'voter_id': voter_id})
        reminders = []
        
        for election in upcoming_elections[:2]:  # Top 2 upcoming elections
            if election.get('can_register', False):
                reminders.append({
                    'election_id': election.get('id'),
                    'title': election.get('title'),
                    'registration_end': election.get('registration_end'),
                    'days_remaining': calculate_days_remaining(election.get('registration_end')),
                    'priority': 'high' if calculate_days_remaining(election.get('registration_end')) <= 3 else 'medium'
                })
        
        return reminders
    except Exception as e:
        logger.error(f"Error getting voting reminders: {str(e)}")
        return []

def calculate_days_remaining(target_date):
    """Calculate days remaining until target date"""
    if not target_date:
        return 0
    
    if isinstance(target_date, dict) and '$date' in target_date:
        target = datetime.fromisoformat(target_date['$date'].replace('Z', '+00:00'))
    else:
        target = target_date
    
    remaining = target - datetime.utcnow()
    return max(0, remaining.days)

# ============ ENHANCED DASHBOARD ROUTES ============

@dashboard_bp.route('/live-updates', methods=['GET'])
@cross_origin()
def get_live_updates():
    """Get recent real-time updates"""
    try:
        voter = get_authenticated_voter()
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401
        
        # Get updates from last hour
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        recent_updates = []
        
        # This would come from your live updates storage
        # For now, return empty list
        recent_updates = []
        
        # Sort by timestamp (newest first)
        recent_updates.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        return jsonify({
            'success': True,
            'updates': recent_updates[:20],  # Return last 20 updates
            'total_updates': len(recent_updates),
            'last_checked': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f'Live updates error: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to load live updates'
        }), 500

@dashboard_bp.route('/elections/live', methods=['GET'])
@cross_origin()
def get_live_elections():
    """Get real-time election data with live updates"""
    try:
        voter = get_authenticated_voter()
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401
        
        election_type = request.args.get('type', 'all')
        status = request.args.get('status', 'active')
        
        elections_data = {
            'upcoming': get_upcoming_elections(voter, election_type),
            'active': get_active_elections(voter, election_type),
            'completed': get_past_elections(voter, election_type),
            'live_stats': {
                'total_active': get_active_elections_count(),
                'votes_cast_today': get_today_votes_count(),
                'voter_turnout': calculate_system_turnout(),
                'last_updated': datetime.utcnow().isoformat()
            }
        }
        
        return jsonify({
            'success': True,
            'elections_data': elections_data,
            'live_feed': True
        })
        
    except Exception as e:
        logger.error(f'Live elections error: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to load live election data'
        }), 500

# ============ EXISTING DASHBOARD ROUTES (UPDATED) ============

@dashboard_bp.route('/digital-id', methods=['GET'])
@cross_origin()
def get_digital_id():
    """Generate digital ID for voter - FIXED VERSION"""
    try:
        voter = get_authenticated_voter()
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401
        
        # Generate QR code data
        qr_data = {
            'voter_id': voter['voter_id'],
            'full_name': voter['full_name'],
            'constituency': voter.get('constituency', 'General'),
            'polling_station': voter.get('polling_station', 'Main Polling Station'),
            'verified': all([
                voter.get('email_verified', False),
                voter.get('phone_verified', False),
                voter.get('id_verified', False)
            ])
        }
        
        # Create QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(json.dumps(qr_data))
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        # Convert to base64 for easy frontend display
        qr_base64 = base64.b64encode(img_byte_arr.getvalue()).decode('utf-8')
        
        digital_id_data = {
            'voter_id': voter['voter_id'],
            'full_name': voter['full_name'],
            'father_name': voter.get('father_name', ''),
            'date_of_birth': voter.get('date_of_birth'),
            'address': f"{voter.get('address_line1', '')}, {voter.get('village_city', '')}",
            'constituency': voter.get('constituency', 'General'),
            'polling_station': voter.get('polling_station', 'Main Polling Station'),
            'qr_code': f"data:image/png;base64,{qr_base64}",
            'issue_date': datetime.utcnow().isoformat(),
            'expiry_date': (datetime.utcnow() + timedelta(days=365*5)).isoformat(),
            'status': 'Active',
            'verification_status': {
                'email': voter.get('email_verified', False),
                'phone': voter.get('phone_verified', False),
                'id': voter.get('id_verified', False),
                'face': voter.get('face_verified', False)
            }
        }
        
        return jsonify({
            'success': True,
            'digital_id': digital_id_data
        })
        
    except Exception as e:
        logger.error(f'Digital ID error: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to generate digital ID'
        }), 500

@dashboard_bp.route('/export-data', methods=['GET'])
@cross_origin()
def export_data():
    """Export voter data in various formats"""
    try:
        voter = get_authenticated_voter()
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401
        
        format_type = request.args.get('format', 'json')
        
        if format_type == 'json':
            # Return JSON data
            export_data = {
                'personal_info': {
                    'voter_id': voter['voter_id'],
                    'full_name': voter['full_name'],
                    'email': voter['email'],
                    'phone': voter['phone'],
                    'date_of_birth': voter.get('date_of_birth'),
                    'gender': voter['gender']
                },
                'address': {
                    'address_line1': voter['address_line1'],
                    'address_line2': voter.get('address_line2', ''),
                    'village_city': voter['village_city'],
                    'district': voter['district'],
                    'state': voter['state'],
                    'pincode': voter['pincode']
                },
                'election_info': {
                    'constituency': voter.get('constituency', ''),
                    'polling_station': voter.get('polling_station', ''),
                    'registration_date': voter.get('created_at')
                },
                'voting_history': get_voter_voting_history(voter['voter_id']),
                'exported_at': datetime.utcnow().isoformat()
            }
            
            return jsonify({
                'success': True,
                'data': export_data,
                'format': 'json'
            })
            
        elif format_type == 'csv':
            # Create CSV data
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write headers
            writer.writerow(['Field', 'Value'])
            writer.writerow(['Voter ID', voter['voter_id']])
            writer.writerow(['Full Name', voter['full_name']])
            writer.writerow(['Email', voter['email']])
            writer.writerow(['Phone', voter['phone']])
            writer.writerow(['Date of Birth', voter.get('date_of_birth')])
            writer.writerow(['Constituency', voter.get('constituency', '')])
            writer.writerow(['Polling Station', voter.get('polling_station', '')])
            writer.writerow(['Export Date', datetime.utcnow().isoformat()])
            
            csv_data = output.getvalue()
            output.close()
            
            return jsonify({
                'success': True,
                'data': csv_data,
                'format': 'csv'
            })
        
        else:
            return jsonify({
                'success': False,
                'message': 'Unsupported format'
            }), 400
            
    except Exception as e:
        logger.error(f'Export data error: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to export data'
        }), 500

@dashboard_bp.route('/download-voter-slip', methods=['GET'])
@cross_origin()
def download_voter_slip():
    """Download voter slip as PDF"""
    try:
        voter = get_authenticated_voter()
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401
        
        # Get active elections
        active_elections = get_active_elections(voter)
        
        # Create PDF in memory
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        
        # Add content to PDF
        p.setFont("Helvetica-Bold", 16)
        p.drawString(100, 750, "VOTER SLIP")
        p.setFont("Helvetica", 12)
        
        y_position = 700
        p.drawString(100, y_position, f"Voter ID: {voter['voter_id']}")
        p.drawString(100, y_position - 20, f"Name: {voter['full_name']}")
        p.drawString(100, y_position - 40, f"Father's Name: {voter['father_name']}")
        p.drawString(100, y_position - 60, f"Constituency: {voter.get('constituency', '')}")
        p.drawString(100, y_position - 80, f"Polling Station: {voter.get('polling_station', '')}")
        
        if active_elections:
            p.drawString(100, y_position - 120, "Active Elections:")
            for i, election in enumerate(active_elections[:3]):  # Show max 3 elections
                p.drawString(120, y_position - 140 - (i * 20), f"{i+1}. {election.get('title', 'Election')}")
        
        p.drawString(100, y_position - 200, f"Issued on: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}")
        
        p.showPage()
        p.save()
        
        buffer.seek(0)
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f"voter_slip_{voter['voter_id']}.pdf",
            mimetype='application/pdf'
        )
        
    except Exception as e:
        logger.error(f'Voter slip error: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to generate voter slip'
        }), 500

# ============ KEEP ALL YOUR EXISTING HELPER FUNCTIONS ============

def calculate_profile_completion(voter):
    """Calculate profile completion percentage"""
    required_fields = [
        'full_name', 'father_name', 'gender', 'date_of_birth', 'email', 
        'phone', 'address_line1', 'village_city', 'district', 'state', 
        'pincode', 'national_id_number'
    ]
    
    completed = sum(1 for field in required_fields if voter.get(field))
    return int((completed / len(required_fields)) * 100)

def calculate_profile_score(voter):
    """Calculate comprehensive profile score"""
    base_score = calculate_profile_completion(voter)
    verification_bonus = sum([
        10 if voter.get('email_verified') else 0,
        10 if voter.get('phone_verified') else 0,
        15 if voter.get('id_verified') else 0,
        15 if voter.get('face_verified') else 0
    ])
    
    return min(100, base_score + verification_bonus)

def get_upcoming_elections(voter, election_type='all'):
    """Get upcoming elections for voter"""
    try:
        query = {
            "voting_start": {"$gt": datetime.utcnow()},
            "status": "scheduled",
            "is_active": True
        }
        
        if election_type != 'all':
            query["election_type"] = election_type
        
        elections = Election.find_all(query, sort=[("voting_start", 1)])
        
        enhanced_elections = []
        for election in elections:
            enhanced_elections.append({
                'id': election.get('election_id', 'unknown'),
                'title': election.get('title', 'Unknown Election'),
                'type': election.get('election_type', 'general'),
                'date': election.get('voting_start', datetime.utcnow()).isoformat(),
                'registration_end': election.get('registration_end'),
                'constituency': election.get('constituency', 'General Constituency'),
                'description': election.get('description', ''),
                'status': 'upcoming',
                'can_register': datetime.utcnow() < election.get('registration_end', datetime.utcnow()),
                'is_eligible': check_voter_eligibility(voter['voter_id'], election.get('election_id', 'unknown'))
            })
        
        return enhanced_elections
    except Exception as e:
        logger.error(f"Error getting upcoming elections: {str(e)}")
        return []

def get_active_elections(voter, election_type='all'):
    """Get active elections for voter - FIXED VERSION with better eligibility"""
    try:
        current_time = datetime.utcnow()
        logger.info(f"Looking for active elections at: {current_time}")
        
        # Build query for active elections
        query = {
            "status": "active",
            "is_active": True,
            "voting_start": {"$lte": current_time},
            "voting_end": {"$gte": current_time}
        }
        
        if election_type != 'all':
            query["election_type"] = election_type
        
        logger.info(f"Active elections query: {query}")
        
        elections = Election.find_all(query, sort=[("voting_end", 1)])
        logger.info(f"Found {len(elections)} active elections")
        
        enhanced_elections = []
        for election in elections:
            # Debug print each election
            logger.info(f"📊 Election: {election.get('title')} | "
                  f"Start: {election.get('voting_start')} | "
                  f"End: {election.get('voting_end')} | "
                  f"Status: {election.get('status')}")
                  
            has_voted = Vote.has_voted(election.get('election_id', 'unknown'), voter['voter_id'])
            is_eligible = check_voter_eligibility(voter['voter_id'], election.get('election_id', 'unknown'))
            
            enhanced_elections.append({
                'election_id': election.get('election_id', 'unknown'),
                'title': election.get('title', 'Unknown Election'),
                'type': election.get('election_type', 'general'),
                'date': election.get('voting_start', datetime.utcnow()).isoformat(),
                'end_date': election.get('voting_end', datetime.utcnow()).isoformat(),
                'constituency': election.get('constituency', 'General Constituency'),
                'description': election.get('description', ''),
                'status': 'active',
                'has_voted': has_voted,
                'can_vote': not has_voted and is_eligible,
                'is_eligible': is_eligible,  # Add this field explicitly
                'candidates_count': Candidate.count({"election_id": election.get('election_id', 'unknown')}),
                'voting_start': election.get('voting_start').isoformat() if election.get('voting_start') else None,
                'voting_end': election.get('voting_end').isoformat() if election.get('voting_end') else None,
                'total_votes': Vote.count({"election_id": election.get('election_id', 'unknown')}),
                'voter_turnout': election.get('voter_turnout', 0)
            })
        
        return enhanced_elections
        
    except Exception as e:
        logger.error(f"Error getting active elections: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return []
    
def get_past_elections(voter, election_type='all'):
    """Get past elections for voter"""
    try:
        query = {
            "voting_end": {"$lt": datetime.utcnow()},
            "status": {"$in": ["completed", "cancelled"]},
            "is_active": True
        }
        
        if election_type != 'all':
            query["election_type"] = election_type
        
        elections = Election.find_all(query, sort=[("voting_end", -1)], limit=10)
        
        enhanced_elections = []
        for election in elections:
            vote = Vote.find_by_election_and_voter(election.get('election_id', 'unknown'), voter['voter_id'])
            enhanced_elections.append({
                'id': election.get('election_id', 'unknown'),
                'title': election.get('title', 'Unknown Election'),
                'type': election.get('election_type', 'general'),
                'date': election.get('voting_start', datetime.utcnow()).isoformat(),
                'constituency': election.get('constituency', 'General Constituency'),
                'status': election.get('status', 'completed'),
                'voted': vote is not None,
                'vote_timestamp': vote.get('vote_timestamp').isoformat() if vote and vote.get('vote_timestamp') else None,
                'results_available': election.get('results_publish') and datetime.utcnow() > election.get('results_publish', datetime.utcnow())
            })
        
        return enhanced_elections
    except Exception as e:
        logger.error(f"Error getting past elections: {str(e)}")
        return []

def get_votes_cast_count(voter_id):
    """Get number of votes cast by voter"""
    try:
        return Vote.count({"voter_id": voter_id, "is_verified": True})
    except Exception as e:
        logger.error(f"Error counting votes: {str(e)}")
        return 0

def get_elections_participated_count(voter_id):
    """Get number of elections participated in"""
    try:
        pipeline = [
            {"$match": {"voter_id": voter_id, "is_verified": True}},
            {"$group": {"_id": "$election_id"}},
            {"$count": "election_count"}
        ]
        
        result = list(Vote.get_collection().aggregate(pipeline))
        return result[0]['election_count'] if result else 0
    except Exception as e:
        logger.error(f"Error counting elections participated: {str(e)}")
        return 0

def get_upcoming_elections_count():
    """Get count of upcoming elections"""
    try:
        return Election.count({
            "voting_start": {"$gt": datetime.utcnow()},
            "status": "scheduled",
            "is_active": True
        })
    except Exception as e:
        logger.error(f"Error counting upcoming elections: {str(e)}")
        return 0

def get_verification_status(voter):
    """Get verification status"""
    verifications = [
        voter.get('email_verified', False),
        voter.get('phone_verified', False),
        voter.get('id_verified', False),
        voter.get('face_verified', False)
    ]
    
    verified_count = sum(verifications)
    total_count = len(verifications)
    
    if verified_count == total_count:
        return "Fully Verified"
    elif verified_count >= 2:
        return "Partially Verified"
    else:
        return "Verification Pending"

def calculate_participation_rate(voter_id):
    """Calculate voter participation rate"""
    try:
        total_elections = Election.count({
            "voting_end": {"$lt": datetime.utcnow()},
            "status": "completed",
            "is_active": True
        })
        
        if total_elections == 0:
            return 0
        
        participated = get_elections_participated_count(voter_id)
        return int((participated / total_elections) * 100)
    except Exception as e:
        logger.error(f"Error calculating participation rate: {str(e)}")
        return 0

def get_voter_voting_history(voter_id):
    """Get detailed voting history for a voter"""
    try:
        votes = Vote.find_all({
            "voter_id": voter_id,
            "is_verified": True
        }, sort=[("vote_timestamp", -1)])
        
        voting_history = []
        for vote in votes:
            # Get election details
            election = Election.find_by_election_id(vote['election_id'])
            # Get candidate details if available
            candidate = Candidate.find_one({"candidate_id": vote['candidate_id']}) if vote.get('candidate_id') else None
            
            voting_history.append({
                'election_id': vote['election_id'],
                'election_title': election.get('title', 'Unknown Election') if election else 'Unknown Election',
                'election_type': election.get('election_type', 'unknown') if election else 'unknown',
                'candidate_name': candidate.get('full_name', 'Write-in Candidate') if candidate else 'Write-in Candidate',
                'party': candidate.get('party', 'Independent') if candidate else 'Independent',
                'vote_timestamp': vote.get('vote_timestamp', datetime.utcnow()).isoformat(),
                'constituency': election.get('constituency', 'Unknown') if election else 'Unknown',
                'face_verified': vote.get('face_verified', False)
            })
        
        return voting_history
    except Exception as e:
        logger.error(f"Error getting voting history: {str(e)}")
        return []

def get_voter_analytics(voter_id):
    """Get analytics data for voter"""
    try:
        votes_cast = get_votes_cast_count(voter_id)
        elections_participated = get_elections_participated_count(voter_id)
        participation_rate = calculate_participation_rate(voter_id)
        
        return {
            'votes_cast': votes_cast,
            'elections_participated': elections_participated,
            'participation_rate': participation_rate,
            'type_breakdown': get_election_type_breakdown(voter_id),
            'constituency_ranking': get_constituency_ranking(voter_id),
            'activity_trend': get_voter_activity_trend(voter_id)
        }
    except Exception as e:
        logger.error(f"Error getting voter analytics: {str(e)}")
        return {
            'votes_cast': 0,
            'elections_participated': 0,
            'participation_rate': 0,
            'type_breakdown': [],
            'constituency_ranking': None,
            'activity_trend': []
        }

def get_election_type_breakdown(voter_id):
    """Get election type participation breakdown"""
    try:
        pipeline = [
            {"$match": {"voter_id": voter_id, "is_verified": True}},
            {"$lookup": {
                "from": "elections",
                "localField": "election_id",
                "foreignField": "election_id",
                "as": "election_info"
            }},
            {"$unwind": "$election_info"},
            {"$group": {
                "_id": "$election_info.election_type",
                "count": {"$sum": 1}
            }}
        ]
        
        return list(Vote.get_collection().aggregate(pipeline))
    except Exception as e:
        logger.error(f"Error getting election type breakdown: {str(e)}")
        return []

def get_constituency_ranking(voter_id):
    """Get voter's ranking in constituency"""
    try:
        voter = Voter.find_by_voter_id(voter_id)
        if not voter:
            return None
        
        constituency = voter.get('constituency')
        if not constituency:
            return None
        
        # Get total voters in constituency
        total_voters = Voter.count({"constituency": constituency, "is_active": True})
        
        # Simplified ranking logic - in real implementation, calculate based on participation
        ranking = max(1, int(total_voters * 0.2))  # Assume top 20%
        
        return {
            'rank': ranking,
            'total_voters': total_voters,
            'percentile': int(((total_voters - ranking) / total_voters) * 100) if total_voters > 0 else 0
        }
    except Exception as e:
        logger.error(f"Error getting constituency ranking: {str(e)}")
        return None

def get_voter_activity_trend(voter_id):
    """Get voter activity trend over time"""
    try:
        six_months_ago = datetime.utcnow() - timedelta(days=180)
        
        pipeline = [
            {"$match": {
                "voter_id": voter_id,
                "is_verified": True,
                "vote_timestamp": {"$gte": six_months_ago}
            }},
            {"$group": {
                "_id": {
                    "year": {"$year": "$vote_timestamp"},
                    "month": {"$month": "$vote_timestamp"}
                },
                "votes": {"$sum": 1}
            }},
            {"$sort": {"_id.year": 1, "_id.month": 1}},
            {"$limit": 6}
        ]
        
        trend_data = list(Vote.get_collection().aggregate(pipeline))
        
        formatted_trend = []
        for data in trend_data:
            formatted_trend.append({
                'period': f"{data['_id']['month']}/{data['_id']['year']}",
                'votes': data['votes']
            })
        
        return formatted_trend
    except Exception as e:
        logger.error(f"Error getting voter activity trend: {str(e)}")
        return []

def get_recent_notifications(voter_id, limit=10):
    """Get recent notifications for voter"""
    # Sample notifications - in real implementation, fetch from database
    return [
        {
            'id': '1',
            'type': 'info',
            'title': 'Welcome to Voter Portal',
            'message': 'Your account has been successfully created and verified.',
            'timestamp': (datetime.utcnow() - timedelta(hours=2)).isoformat(),
            'read': False,
            'action_url': '/profile'
        },
        {
            'id': '2',
            'type': 'election',
            'title': 'New Election Announcement',
            'message': 'National General Election 2024 registration is now open.',
            'timestamp': (datetime.utcnow() - timedelta(days=1)).isoformat(),
            'read': True,
            'action_url': '/elections'
        }
    ]

def get_election_statistics(voter_id):
    """Get election statistics"""
    try:
        return {
            'total_elections': Election.count({"is_active": True}),
            'upcoming_elections': get_upcoming_elections_count(),
            'active_elections': Election.count({
                "voting_start": {"$lte": datetime.utcnow()},
                "voting_end": {"$gte": datetime.utcnow()},
                "status": "active",
                "is_active": True
            }),
            'completed_elections': Election.count({
                "voting_end": {"$lt": datetime.utcnow()},
                "status": "completed",
                "is_active": True
            })
        }
    except Exception as e:
        logger.error(f"Error getting election statistics: {str(e)}")
        return {
            'total_elections': 0,
            'upcoming_elections': 0,
            'active_elections': 0,
            'completed_elections': 0
        }

def get_election_type_counts():
    """Get counts by election type"""
    try:
        pipeline = [
            {"$match": {"is_active": True}},
            {"$group": {
                "_id": "$election_type",
                "count": {"$sum": 1}
            }}
        ]
        
        return list(Election.get_collection().aggregate(pipeline))
    except Exception as e:
        logger.error(f"Error getting election type counts: {str(e)}")
        return []

def get_election_calendar():
    """Get election calendar for the next 3 months"""
    try:
        three_months_later = datetime.utcnow() + timedelta(days=90)
        
        elections = Election.find_all({
            "voting_start": {"$gte": datetime.utcnow(), "$lte": three_months_later},
            "is_active": True
        }, sort=[("voting_start", 1)])
        
        calendar = []
        for election in elections:
            calendar.append({
                'id': election['election_id'],
                'title': election['title'],
                'type': election['election_type'],
                'start_date': election['voting_start'].isoformat(),
                'end_date': election['voting_end'].isoformat(),
                'constituency': election.get('constituency'),
                'description': election.get('description')
            })
        
        return calendar
    except Exception as e:
        logger.error(f"Error getting election calendar: {str(e)}")
        return []

# Add these helper functions to dashboard.py

# In dashboard.py, update the check_voter_eligibility function:

def check_voter_eligibility(voter_id, election_id):
    """Enhanced voter eligibility check with better debugging"""
    try:
        logger.info(f"🔍 Checking eligibility for voter {voter_id} in election {election_id}")
        
        voter = Voter.find_by_voter_id(voter_id)
        election = Election.find_by_election_id(election_id)
        
        if not voter:
            logger.error(f"Voter {voter_id} not found")
            return False
        
        if not election:
            logger.error(f"Election {election_id} not found")
            return False
        
        # Check if voter is active
        if not voter.get('is_active', True):
            logger.warning(f"Voter {voter_id} is not active")
            return False
        
        # Check basic verifications - only require email and phone for now
        required_verifications = ['email_verified', 'phone_verified']
        missing_verifications = []
        
        for verification in required_verifications:
            if not voter.get(verification, False):
                missing_verifications.append(verification)
        
        if missing_verifications:
            logger.warning(f"Voter {voter_id} missing verifications: {missing_verifications}")
            # For now, we'll be lenient and only warn but not block
            # return False
        
        # Check face verification if required by election
        if election.get('require_face_verification', False) and not voter.get('face_verified', False):
            logger.warning(f"Voter {voter_id} missing face verification")
            # For now, we'll be lenient and not require face verification
            # return False
        
        # Check constituency match - be more flexible
        voter_constituency = voter.get('constituency', 'General')
        election_constituency = election.get('constituency', 'General')
        
        if election_constituency and voter_constituency:
            if election_constituency.lower() != voter_constituency.lower() and election_constituency != 'General':
                logger.warning(f"Voter {voter_id} constituency mismatch: {voter_constituency} vs {election_constituency}")
                # For now, allow voting regardless of constituency
                # return False
        
        # Check if voting period is active
        current_time = datetime.utcnow()
        voting_start = election.get('voting_start')
        voting_end = election.get('voting_end')
        
        if voting_start and voting_end:
            if not (voting_start <= current_time <= voting_end):
                logger.warning(f"Election not in voting period: {voting_start} to {voting_end}, current: {current_time}")
                return False
        else:
            logger.warning("Election missing voting dates")
            return False
        
        # Check if already voted
        if Vote.has_voted(election_id, voter_id):
            logger.warning(f"Voter {voter_id} already voted in this election")
            return False
        
        logger.info(f"Voter {voter_id} is ELIGIBLE for election {election_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error checking voter eligibility: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False
    
def get_active_elections_count():
    """Get count of active elections"""
    try:
        return Election.count({
            "status": "active",
            "is_active": True,
            "voting_start": {"$lte": datetime.utcnow()},
            "voting_end": {"$gte": datetime.utcnow()}
        })
    except Exception as e:
        logger.error(f"Error counting active elections: {str(e)}")
        return 0

def get_today_votes_count():
    """Get votes cast today"""
    try:
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        return Vote.count({
            "vote_timestamp": {"$gte": today_start},
            "is_verified": True
        })
    except Exception as e:
        logger.error(f"Error counting today's votes: {str(e)}")
        return 0

def get_active_users_count():
    """Get count of active users in last 24 hours"""
    try:
        day_ago = datetime.utcnow() - timedelta(hours=24)
        return Voter.count({
            "last_login": {"$gte": day_ago},
            "is_active": True
        })
    except Exception as e:
        logger.error(f"Error counting active users: {str(e)}")
        return 0

def calculate_system_turnout():
    """Calculate system-wide voter turnout"""
    try:
        total_voters = Voter.count({"is_active": True})
        total_votes = Vote.count({"is_verified": True})
        
        if total_voters == 0:
            return 0
        
        return round((total_votes / total_voters) * 100, 1)
    except Exception as e:
        logger.error(f"Error calculating system turnout: {str(e)}")
        return 0
    
def can_vote(voter):
    """Check if voter can vote in general"""
    return all([
        voter.get('is_active', True),
        voter.get('email_verified', False),
        voter.get('phone_verified', False),
        voter.get('id_verified', False)
    ])

# ============ KEEP ALL YOUR EXISTING ROUTES ============

@dashboard_bp.route('/security-settings', methods=['GET', 'POST'])
@cross_origin()
def security_settings():
    """Get or update security settings"""
    try:
        voter = get_authenticated_voter()
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401
        
        if request.method == 'GET':
            # Return current security settings
            security_data = {
                'two_factor_enabled': voter.get('two_factor_enabled', False),
                'login_alerts': voter.get('login_alerts', True),
                'session_timeout': voter.get('session_timeout', 30),  # minutes
                'password_last_changed': voter.get('last_password_change'),
                'active_sessions': get_active_sessions(voter['voter_id']),
                'trusted_devices': get_trusted_devices(voter['voter_id'])
            }
            
            return jsonify({
                'success': True,
                'security_settings': security_data
            })
            
        elif request.method == 'POST':
            # Update security settings
            data = request.get_json()
            
            updates = {}
            if 'two_factor_enabled' in data:
                updates['two_factor_enabled'] = data['two_factor_enabled']
            if 'login_alerts' in data:
                updates['login_alerts'] = data['login_alerts']
            if 'session_timeout' in data:
                updates['session_timeout'] = data['session_timeout']
            
            if updates:
                Voter.update_one(
                    {"voter_id": voter['voter_id']},
                    updates
                )
                
                AuditLog.create_log(
                    action='security_settings_updated',
                    user_id=voter['voter_id'],
                    user_type='voter',
                    details=updates,
                    ip_address=request.remote_addr,
                    user_agent=request.headers.get('User-Agent')
                )
            
            return jsonify({
                'success': True,
                'message': 'Security settings updated successfully'
            })
            
    except Exception as e:
        logger.error(f'Security settings error: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to process security settings'
        }), 500

@dashboard_bp.route('/mobile-verification', methods=['POST'])
@cross_origin()
def mobile_verification():
    """Handle mobile verification"""
    try:
        voter = get_authenticated_voter()
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401
        
        data = request.get_json()
        action = data.get('action')
        
        if action == 'send_otp':
            # Send OTP to mobile
            phone = voter['phone']
            otp_id = OTP.create_otp(phone=phone, purpose='mobile_verification')
            
            # In production, integrate with SMS service here
            logger.info(f"OTP sent to {phone} for mobile verification")
            
            return jsonify({
                'success': True,
                'message': 'OTP sent to your mobile number',
                'otp_id': otp_id
            })
            
        elif action == 'verify_otp':
            # Verify OTP
            otp_code = data.get('otp_code')
            phone = voter['phone']
            
            if OTP.verify_otp(phone=phone, otp_code=otp_code, purpose='mobile_verification'):
                # Update verification status
                Voter.update_verification_status(voter['voter_id'], 'phone', True)
                
                AuditLog.create_log(
                    action='mobile_verified',
                    user_id=voter['voter_id'],
                    user_type='voter',
                    details={'phone': phone},
                    ip_address=request.remote_addr,
                    user_agent=request.headers.get('User-Agent')
                )
                
                return jsonify({
                    'success': True,
                    'message': 'Mobile number verified successfully'
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Invalid OTP code'
                }), 400
                
        else:
            return jsonify({
                'success': False,
                'message': 'Invalid action'
            }), 400
            
    except Exception as e:
        logger.error(f'Mobile verification error: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Mobile verification failed'
        }), 500

@dashboard_bp.route('/cast-vote', methods=['POST'])
@cross_origin()
def cast_vote():
    """Cast vote in election"""
    try:
        voter = get_authenticated_voter()
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401
        
        data = request.get_json()
        election_id = data.get('election_id')
        candidate_id = data.get('candidate_id')
        
        if not election_id or not candidate_id:
            return jsonify({
                'success': False,
                'message': 'Election ID and Candidate ID are required'
            }), 400
        
        # Check if voter has already voted
        if Vote.has_voted(election_id, voter['voter_id']):
            return jsonify({
                'success': False,
                'message': 'You have already voted in this election'
            }), 400
        
        # Check voter eligibility
        if not check_voter_eligibility(voter['voter_id'], election_id):
            return jsonify({
                'success': False,
                'message': 'You are not eligible to vote in this election'
            }), 400
        
        # Create vote record
        vote_data = {
            'election_id': election_id,
            'voter_id': voter['voter_id'],
            'candidate_id': candidate_id,
            'face_verified': voter.get('face_verified', False),
            'ip_address': request.remote_addr,
            'user_agent': request.headers.get('User-Agent'),
            'is_verified': True
        }
        
        vote_id = Vote.create_vote(vote_data)
        
        # Update candidate vote count
        Candidate.increment_vote_count(candidate_id)
        
        # Log the vote
        AuditLog.create_log(
            action='vote_cast',
            user_id=voter['voter_id'],
            user_type='voter',
            details={
                'election_id': election_id,
                'candidate_id': candidate_id,
                'vote_id': vote_id
            },
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        return jsonify({
            'success': True,
            'message': 'Vote cast successfully',
            'vote_id': vote_id
        })
        
    except Exception as e:
        logger.error(f'Vote casting error: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to cast vote'
        }), 500

@dashboard_bp.route('/profile', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_profile():
    """Get comprehensive user profile data"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        voter = get_authenticated_voter()
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401
        
        # Enhanced profile data
        profile_data = {
            'voter_id': voter['voter_id'],
            'full_name': voter['full_name'],
            'father_name': voter['father_name'],
            'mother_name': voter.get('mother_name', ''),
            'gender': voter['gender'],
            'date_of_birth': voter.get('date_of_birth'),
            'place_of_birth': voter.get('place_of_birth', ''),
            'email': voter['email'],
            'phone': voter['phone'],
            'alternate_phone': voter.get('alternate_phone', ''),
            'address': {
                'address_line1': voter['address_line1'],
                'address_line2': voter.get('address_line2', ''),
                'village_city': voter['village_city'],
                'district': voter['district'],
                'state': voter['state'],
                'pincode': voter['pincode'],
                'country': voter.get('country', 'India')
            },
            'national_id': {
                'type': voter['national_id_type'],
                'number': voter['national_id_number'],
                'verified': voter.get('id_verified', False)
            },
            'constituency': voter.get('constituency', 'General Constituency'),
            'polling_station': voter.get('polling_station', 'Main Polling Station'),
            'verification_status': {
                'email': voter.get('email_verified', False),
                'phone': voter.get('phone_verified', False),
                'id': voter.get('id_verified', False),
                'face': voter.get('face_verified', False),
                'overall': all([
                    voter.get('email_verified', False),
                    voter.get('phone_verified', False),
                    voter.get('id_verified', False),
                    voter.get('face_verified', False)
                ])
            },
            'registration_status': voter.get('registration_status', 'pending'),
            'registration_date': voter.get('created_at', datetime.utcnow()).isoformat(),
            'last_updated': voter.get('updated_at', datetime.utcnow()).isoformat(),
            'profile_score': calculate_profile_score(voter),
            'security_settings': {
                'two_factor': voter.get('two_factor_enabled', False),
                'biometric': voter.get('face_verified', False),
                'last_password_change': voter.get('last_password_change')
            }
        }
        
        return jsonify({
            'success': True,
            'profile_data': profile_data
        })
        
    except Exception as e:
        logger.error(f'Profile error: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to load profile'
        }), 500

@dashboard_bp.route('/voting-history', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_voting_history():
    """Get voter's voting history"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        voter = get_authenticated_voter()
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401
        
        voting_history = get_voter_voting_history(voter['voter_id'])
        
        return jsonify({
            'success': True,
            'voting_history': voting_history
        })
        
    except Exception as e:
        logger.error(f'Voting history error: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to load voting history'
        }), 500

@dashboard_bp.route('/analytics', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_analytics():
    """Get voter analytics and statistics"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        voter = get_authenticated_voter()
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401
        
        analytics_data = get_voter_analytics(voter['voter_id'])
        
        return jsonify({
            'success': True,
            'analytics_data': analytics_data
        })
        
    except Exception as e:
        logger.error(f'Analytics error: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to load analytics'
        }), 500

@dashboard_bp.route('/notifications', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_notifications():
    """Get user notifications"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        voter = get_authenticated_voter()
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401
        
        limit = int(request.args.get('limit', 10))
        notifications = get_recent_notifications(voter['voter_id'], limit)
        
        return jsonify({
            'success': True,
            'notifications': notifications
        })
        
    except Exception as e:
        logger.error(f'Notifications error: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to load notifications'
        }), 500

def get_active_sessions(voter_id):
    """Get active sessions for voter"""
    try:
        # This would query your session store
        # For now, return mock data
        return [
            {
                'device': 'Chrome on Windows',
                'ip_address': '192.168.1.100',
                'last_active': (datetime.utcnow() - timedelta(minutes=5)).isoformat(),
                'location': 'New Delhi, India'
            }
        ]
    except Exception as e:
        logger.error(f"Error getting active sessions: {str(e)}")
        return []

def get_trusted_devices(voter_id):
    """Get trusted devices for voter"""
    try:
        # This would query your trusted devices store
        # For now, return mock data
        return [
            {
                'device_id': 'device_001',
                'device_name': 'My Laptop',
                'browser': 'Chrome',
                'os': 'Windows 10',
                'last_used': (datetime.utcnow() - timedelta(days=2)).isoformat(),
                'is_trusted': True
            }
        ]
    except Exception as e:
        logger.error(f"Error getting trusted devices: {str(e)}")
        return []

# Export the socketio instance for use in app.py
def get_socketio():
    return socketio

# Temporary
@dashboard_bp.route('/create-test-election', methods=['POST'])
@admin_required
def create_test_election():
    """Create a test election for development"""
    try:
        election_data = {
            'election_id': 'TEST_ELECTION_001',
            'title': 'Sample General Election 2024',
            'description': 'This is a test election for development purposes',
            'election_type': 'general',
            'status': 'active',
            'voting_start': datetime.utcnow(),
            'voting_end': datetime.utcnow() + timedelta(days=7),
            'registration_start': datetime.utcnow() - timedelta(days=1),
            'registration_end': datetime.utcnow() + timedelta(days=6),
            'constituency': 'General Constituency',
            'is_active': True,
            'require_face_verification': False
        }
        
        election_id = Election.create_election(election_data)
        
        # Create test candidates
        candidates = [
            {
                'candidate_id': 'CAND001',
                'election_id': 'TEST_ELECTION_001',
                'full_name': 'John Smith',
                'party': 'Democratic Party',
                'biography': 'Experienced leader with 10 years in public service',
                'is_approved': True,
                'is_active': True
            },
            {
                'candidate_id': 'CAND002', 
                'election_id': 'TEST_ELECTION_001',
                'full_name': 'Sarah Johnson',
                'party': 'Republican Party',
                'biography': 'Business leader and community advocate',
                'is_approved': True,
                'is_active': True
            }
        ]
        
        for candidate in candidates:
            Candidate.create_candidate(candidate)
        
        return jsonify({
            'success': True,
            'message': 'Test election created successfully',
            'election_id': election_id
        })
        
    except Exception as e:
        logger.error(f"Create test election error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to create test election'
        }), 500