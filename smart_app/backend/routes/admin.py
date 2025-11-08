from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import logging
from functools import wraps
import jwt

from smart_app.backend.mongo_models import Admin, Election, Voter, Vote, Candidate, AuditLog
from smart_app.backend.routes.dashboard import broadcast_election_update, broadcast_system_update

admin_bp = Blueprint('admin', __name__)
logger = logging.getLogger(__name__)

# JWT configuration (should match your auth.py)
JWT_SECRET = 'sUJbaMMUAKYojj0dFe94jO'
JWT_ALGORITHM = 'HS256'

# Helper function to check admin privileges
def admin_required(f):
    """Decorator to require admin privileges"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            token = request.headers.get('Authorization')
            
            if not token or not token.startswith('Bearer '):
                logger.error("No token provided")
                return jsonify({
                    'success': False,
                    'message': 'Admin authentication required'
                }), 401
            
            token = token.split(' ')[1]
            
            # Decode JWT token
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            
            # Check if user is admin
            if payload.get('user_type') != 'admin':
                logger.error(f"User type is not admin: {payload.get('user_type')}")
                return jsonify({
                    'success': False,
                    'message': 'Admin access required'
                }), 403
            
            # Verify admin exists and is active
            admin = Admin.find_by_admin_id(payload.get('admin_id'))
            if not admin or not admin.get('is_active', True):
                logger.error(f"Admin not found or inactive: {payload.get('admin_id')}")
                return jsonify({
                    'success': False,
                    'message': 'Admin account not found or inactive'
                }), 401
            
            # Add admin to request context
            request.admin = admin
            return f(*args, **kwargs)
            
        except jwt.ExpiredSignatureError:
            logger.error("Token expired")
            return jsonify({
                'success': False,
                'message': 'Token expired'
            }), 401
        except jwt.InvalidTokenError:
            logger.error("Invalid token")
            return jsonify({
                'success': False,
                'message': 'Invalid token'
            }), 401
        except Exception as e:
            logger.error(f"Admin auth error: {str(e)}")
            return jsonify({
                'success': False,
                'message': 'Authentication failed'
            }), 401
    return decorated_function

def log_admin_action(admin, action, details, resource_id=None):
    """Log admin actions for audit trail"""
    try:
        AuditLog.create_log(
            action=action,
            user_id=admin['admin_id'],
            user_type="admin",
            details=details,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
    except Exception as e:
        logger.error(f"Failed to log admin action: {str(e)}")

# Enhanced Dashboard Statistics
@admin_bp.route('/dashboard/stats', methods=['GET'])
@admin_required
def get_dashboard_stats():
    """Get enhanced admin dashboard statistics"""
    try:
        # Get total counts
        total_elections = Election.count()
        active_elections = Election.count({
            "status": "active",
            "is_active": True
        })
        upcoming_elections = Election.count({
            "status": "scheduled",
            "is_active": True,
            "voting_start": {"$gt": datetime.utcnow()}
        })
        total_voters = Voter.count({"is_active": True})
        total_votes = Vote.count({"is_verified": True})
        
        # Get verified voters count
        verified_voters = Voter.count({
            "email_verified": True,
            "phone_verified": True, 
            "id_verified": True,
            "face_verified": True,
            "is_active": True
        })
        
        # Get recent activity count (last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_votes = Vote.count({
            "vote_timestamp": {"$gte": week_ago},
            "is_verified": True
        })
        
        # Get pending verifications
        pending_verifications = Voter.count({
            "$or": [
                {"email_verified": False},
                {"phone_verified": False},
                {"id_verified": False},
                {"face_verified": False}
            ],
            "is_active": True
        })
        
        # Get today's votes
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_votes = Vote.count({
            "vote_timestamp": {"$gte": today_start},
            "is_verified": True
        })
        
        # Get total candidates
        total_candidates = Candidate.count({"is_active": True})
        
        # Calculate voter turnout
        voter_turnout = round((total_votes / total_voters * 100) if total_voters > 0 else 0, 1)
        
        stats = {
            'total_elections': total_elections,
            'active_elections': active_elections,
            'upcoming_elections': upcoming_elections,
            'total_voters': total_voters,
            'verified_voters': verified_voters,
            'total_votes': total_votes,
            'today_votes': today_votes,
            'recent_votes': recent_votes,
            'pending_verifications': pending_verifications,
            'total_candidates': total_candidates,
            'voter_turnout': voter_turnout,
            'system_health': 'optimal',
            'last_updated': datetime.utcnow().isoformat()
        }
        
        return jsonify({
            'success': True,
            'stats': stats
        })
        
    except Exception as e:
        logger.error(f"Dashboard stats error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load dashboard statistics'
        }), 500

# Enhanced Get elections with pagination and filtering
@admin_bp.route('/elections', methods=['GET'])
@admin_required
def get_elections():
    """Get elections with pagination and filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        status = request.args.get('status', 'all')
        election_type = request.args.get('type', 'all')
        
        # Build query based on filters
        query = {"is_active": True}
        
        if status != 'all':
            query["status"] = status
            
        if election_type != 'all':
            query["election_type"] = election_type
        
        # Get elections with pagination
        elections = Election.find_all(
            query=query,
            sort=[("created_at", -1)],
            limit=per_page
        )
        
        # Get total count for pagination
        total_elections = Election.count(query)
        
        # Format elections data
        elections_data = []
        for election in elections:
            # Get vote count for this election
            vote_count = Vote.count({"election_id": election.get('election_id'), "is_verified": True})
            
            # Get candidate count
            candidate_count = Candidate.count({
                "election_id": election.get('election_id'),
                "is_active": True
            })
            
            # Calculate time remaining
            time_remaining = None
            current_time = datetime.utcnow()
            voting_end = election.get('voting_end')
            
            if voting_end and isinstance(voting_end, datetime):
                if current_time < voting_end:
                    time_remaining = voting_end - current_time
                else:
                    time_remaining = timedelta(0)
            
            elections_data.append({
                'election_id': election.get('election_id'),
                'title': election.get('title'),
                'description': election.get('description'),
                'election_type': election.get('election_type'),
                'status': election.get('status', 'draft'),
                'voting_start': election.get('voting_start'),
                'voting_end': election.get('voting_end'),
                'registration_start': election.get('registration_start'),
                'registration_end': election.get('registration_end'),
                'constituency': election.get('constituency'),
                'district': election.get('district'),
                'state': election.get('state'),
                'country': election.get('country', 'India'),
                'max_candidates': election.get('max_candidates', 1),
                'require_face_verification': election.get('require_face_verification', True),
                'total_candidates': candidate_count,
                'total_votes': vote_count,
                'voter_turnout': election.get('voter_turnout', 0),
                'time_remaining': str(time_remaining) if time_remaining else None,
                'created_at': election.get('created_at'),
                'created_by': election.get('created_by'),
                'is_active': election.get('is_active', True)
            })
        
        return jsonify({
            'success': True,
            'elections': elections_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total_elections,
                'total_pages': (total_elections + per_page - 1) // per_page
            },
            'filters': {
                'status': status,
                'type': election_type
            }
        })
        
    except Exception as e:
        logger.error(f"Get elections error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load elections'
        }), 500

# Enhanced Create new election with real-time updates
# Enhanced Create new election with real-time updates
@admin_bp.route('/elections', methods=['POST'])
@admin_required
def create_election():
    """Create a new election with real-time broadcasting"""
    try:
        # Check content type and parse data accordingly
        if request.content_type.startswith('multipart/form-data'):
            # Handle form data
            data = {
                'title': request.form.get('title'),
                'description': request.form.get('description', ''),
                'election_type': request.form.get('election_type'),
                'constituency': request.form.get('constituency', ''),
                'district': request.form.get('district', ''),
                'state': request.form.get('state', ''),
                'voting_start': request.form.get('voting_start'),
                'voting_end': request.form.get('voting_end'),
                'registration_start': request.form.get('registration_start'),
                'registration_end': request.form.get('registration_end'),
                'max_candidates': request.form.get('max_candidates', 10, type=int),
                'require_face_verification': request.form.get('require_face_verification', 'true') == 'true',
                'minimum_voter_age': request.form.get('minimum_voter_age', 18, type=int),
                'results_visibility': request.form.get('results_visibility', 'after_end'),
                'election_rules': request.form.get('election_rules', ''),
                'is_featured': request.form.get('is_featured', 'false') == 'true'
            }
        else:
            # Handle JSON data
            data = request.get_json()
            if not data:
                return jsonify({
                    'success': False,
                    'message': 'No data provided'
                }), 400
        
        logger.info(f"Creating election with data: {data}")
        
        required_fields = ['title', 'election_type', 'voting_start', 'voting_end']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Parse datetime strings
        try:
            voting_start = datetime.fromisoformat(data['voting_start'].replace('Z', '+00:00'))
            voting_end = datetime.fromisoformat(data['voting_end'].replace('Z', '+00:00'))
            
            # Set registration dates if not provided
            registration_start = data.get('registration_start')
            registration_end = data.get('registration_end')
            
            if registration_start:
                registration_start = datetime.fromisoformat(registration_start.replace('Z', '+00:00'))
            else:
                registration_start = voting_start - timedelta(days=7)  # Default: 7 days before voting
                
            if registration_end:
                registration_end = datetime.fromisoformat(registration_end.replace('Z', '+00:00'))
            else:
                registration_end = voting_start  # Default: until voting starts
                
        except ValueError as e:
            logger.error(f"Date parsing error: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Invalid date format: {str(e)}'
            }), 400
        
        # Validate dates
        if voting_start >= voting_end:
            return jsonify({
                'success': False,
                'message': 'Voting start must be before voting end'
            }), 400
            
        if registration_start >= registration_end:
            return jsonify({
                'success': False,
                'message': 'Registration start must be before registration end'
            }), 400
        
        # Handle file uploads for form data
        election_logo = None
        election_banner = None
        
        if request.content_type.startswith('multipart/form-data'):
            if 'election_logo' in request.files:
                logo_file = request.files['election_logo']
                if logo_file and logo_file.filename:
                    # In a real implementation, you'd save this file and store the path
                    election_logo = f"/uploads/elections/logos/{logo_file.filename}"
            
            if 'election_banner' in request.files:
                banner_file = request.files['election_banner']
                if banner_file and banner_file.filename:
                    election_banner = f"/uploads/elections/banners/{banner_file.filename}"
        
        # Create election data
        election_data = {
            'title': data['title'],
            'description': data.get('description', ''),
            'election_type': data['election_type'],
            'constituency': data.get('constituency', ''),
            'district': data.get('district', ''),
            'state': data.get('state', ''),
            'country': data.get('country', 'India'),
            'registration_start': registration_start,
            'registration_end': registration_end,
            'voting_start': voting_start,
            'voting_end': voting_end,
            'results_publish': data.get('results_publish'),
            'status': data.get('status', 'scheduled'),
            'max_candidates': data.get('max_candidates', 10),
            'allow_write_ins': data.get('allow_write_ins', False),
            'require_face_verification': data.get('require_face_verification', True),
            'minimum_voter_age': data.get('minimum_voter_age', 18),
            'results_visibility': data.get('results_visibility', 'after_end'),
            'created_by': request.admin['admin_id'],
            'election_rules': data.get('election_rules', ''),
            'is_featured': data.get('is_featured', False),
            'election_logo': election_logo,
            'election_banner': election_banner
        }
        
        election_id = Election.create_election(election_data)
        election = Election.find_by_election_id(election_id)
        
        # Broadcast real-time update to all voters
        broadcast_election_update('create', {
            'election_id': election_id,
            'title': data['title'],
            'election_type': data['election_type'],
            'voting_start': voting_start.isoformat(),
            'voting_end': voting_end.isoformat(),
            'status': 'scheduled'
        }, request.admin['admin_id'])
        
        # Log the action
        log_admin_action(
            request.admin,
            "create_election",
            {
                "election_id": election_id,
                "title": data['title'],
                "type": data['election_type'],
                "voting_period": f"{voting_start} to {voting_end}"
            },
            election_id
        )
        
        return jsonify({
            'success': True,
            'message': 'Election created successfully',
            'election_id': election_id,
            'election': election,
            'broadcast_sent': True
        })
        
    except Exception as e:
        logger.error(f"Create election error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'Failed to create election: {str(e)}'
        }), 500

# Update election status
@admin_bp.route('/elections/<election_id>/status', methods=['PUT'])
@admin_required
def update_election_status(election_id):
    """Update election status with real-time updates"""
    try:
        data = request.get_json()
        status = data.get('status')
        
        valid_statuses = ['draft', 'scheduled', 'active', 'completed', 'cancelled']
        if status not in valid_statuses:
            return jsonify({
                'success': False,
                'message': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'
            }), 400
        
        election = Election.find_by_election_id(election_id)
        if not election:
            return jsonify({
                'success': False,
                'message': 'Election not found'
            }), 404
        
        # Update election status
        Election.update_one(
            {"election_id": election_id},
            {"status": status, "updated_at": datetime.utcnow()}
        )
        
        updated_election = Election.find_by_election_id(election_id)
        
        # Broadcast real-time update
        broadcast_election_update('status_update', {
            'election_id': election_id,
            'title': election['title'],
            'old_status': election.get('status'),
            'new_status': status
        }, request.admin['admin_id'])
        
        # Log the action
        log_admin_action(
            request.admin,
            "update_election_status",
            {
                "election_id": election_id,
                "old_status": election.get('status'),
                "new_status": status,
                "title": election['title']
            },
            election_id
        )
        
        return jsonify({
            'success': True,
            'message': f'Election status updated to {status}',
            'election': updated_election,
            'broadcast_sent': True
        })
        
    except Exception as e:
        logger.error(f"Update election status error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to update election status'
        }), 500

# Delete election (soft delete)
@admin_bp.route('/elections/<election_id>', methods=['DELETE'])
@admin_required
def delete_election(election_id):
    """Soft delete an election"""
    try:
        election = Election.find_by_election_id(election_id)
        if not election:
            return jsonify({
                'success': False,
                'message': 'Election not found'
            }), 404
        
        # Soft delete by setting is_active to False
        Election.update_one(
            {"election_id": election_id},
            {
                "is_active": False,
                "status": "cancelled",
                "updated_at": datetime.utcnow()
            }
        )
        
        # Broadcast real-time update
        broadcast_election_update('delete', {
            'election_id': election_id,
            'title': election['title']
        }, request.admin['admin_id'])
        
        # Log the action
        log_admin_action(
            request.admin,
            "delete_election",
            {
                "election_id": election_id,
                "title": election['title']
            },
            election_id
        )
        
        return jsonify({
            'success': True,
            'message': 'Election deleted successfully',
            'broadcast_sent': True
        })
        
    except Exception as e:
        logger.error(f"Delete election error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to delete election'
        }), 500

# Get election details with candidates and results
@admin_bp.route('/elections/<election_id>', methods=['GET'])
@admin_required
def get_election_details(election_id):
    """Get detailed election information with candidates and results"""
    try:
        election = Election.find_by_election_id(election_id)
        if not election:
            return jsonify({
                'success': False,
                'message': 'Election not found'
            }), 404
        
        # Get candidates for this election
        candidates = Candidate.find_all({
            "election_id": election_id,
            "is_active": True
        })
        
        # Get vote results
        pipeline = [
            {"$match": {"election_id": election_id, "is_verified": True}},
            {"$group": {
                "_id": "$candidate_id",
                "total_votes": {"$sum": 1}
            }},
            {"$sort": {"total_votes": -1}}
        ]
        
        vote_results = list(Vote.get_collection().aggregate(pipeline))
        
        # Calculate total votes
        total_votes = sum(result['total_votes'] for result in vote_results)
        
        # Prepare candidate data with vote counts
        candidates_data = []
        for candidate in candidates:
            candidate_votes = next(
                (result for result in vote_results if result['_id'] == candidate['candidate_id']),
                {'total_votes': 0}
            )
            
            vote_count = candidate_votes['total_votes']
            percentage = round((vote_count / total_votes * 100), 2) if total_votes > 0 else 0
            
            candidates_data.append({
                'candidate_id': candidate['candidate_id'],
                'full_name': candidate['full_name'],
                'party': candidate.get('party', 'Independent'),
                'photo': candidate.get('photo'),
                'biography': candidate.get('biography'),
                'is_approved': candidate.get('is_approved', False),
                'vote_count': vote_count,
                'percentage': percentage,
                'candidate_number': candidate.get('candidate_number'),
                'created_at': candidate.get('created_at')
            })
        
        # Sort candidates by vote count
        candidates_data.sort(key=lambda x: x['vote_count'], reverse=True)
        
        election_data = {
            'election_id': election['election_id'],
            'title': election['title'],
            'description': election.get('description'),
            'election_type': election.get('election_type'),
            'status': election.get('status'),
            'voting_start': election.get('voting_start'),
            'voting_end': election.get('voting_end'),
            'registration_start': election.get('registration_start'),
            'registration_end': election.get('registration_end'),
            'constituency': election.get('constituency'),
            'district': election.get('district'),
            'state': election.get('state'),
            'country': election.get('country', 'India'),
            'total_candidates': len(candidates_data),
            'total_votes': total_votes,
            'voter_turnout': election.get('voter_turnout', 0),
            'candidates': candidates_data,
            'created_at': election.get('created_at'),
            'created_by': election.get('created_by')
        }
        
        return jsonify({
            'success': True,
            'election': election_data
        })
        
    except Exception as e:
        logger.error(f"Get election details error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load election details'
        }), 500

# Enhanced Get voters with pagination and filtering
@admin_bp.route('/voters', methods=['GET'])
@admin_required
def get_voters():
    """Get voters with pagination and filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        verification_status = request.args.get('verification', 'all')
        constituency = request.args.get('constituency', 'all')
        
        # Build query based on filters
        query = {"is_active": True}
        
        if verification_status != 'all':
            if verification_status == 'verified':
                query.update({
                    "email_verified": True,
                    "phone_verified": True,
                    "id_verified": True
                })
            elif verification_status == 'pending':
                query["$or"] = [
                    {"email_verified": False},
                    {"phone_verified": False},
                    {"id_verified": False}
                ]
        
        if constituency != 'all':
            query["constituency"] = constituency
        
        # Get voters with pagination
        voters = Voter.find_all(
            query=query,
            sort=[("created_at", -1)],
            limit=per_page
        )
        
        total_voters = Voter.count(query)
        
        # Get unique constituencies for filter
        constituencies = Voter.get_collection().distinct("constituency", {"is_active": True})
        
        voters_data = []
        for voter in voters:
            # Calculate age
            age = Voter.calculate_age(voter.get('date_of_birth')) if voter.get('date_of_birth') else 0
            
            # Get vote count for this voter
            votes_cast = Vote.count({
                "voter_id": voter.get('voter_id'),
                "is_verified": True
            })
            
            voters_data.append({
                'voter_id': voter.get('voter_id'),
                'full_name': voter.get('full_name'),
                'email': voter.get('email'),
                'phone': voter.get('phone'),
                'gender': voter.get('gender'),
                'age': age,
                'date_of_birth': voter.get('date_of_birth'),
                'constituency': voter.get('constituency'),
                'district': voter.get('district'),
                'state': voter.get('state'),
                'polling_station': voter.get('polling_station'),
                'registration_status': voter.get('registration_status', 'pending'),
                'verification_status': {
                    'email_verified': voter.get('email_verified', False),
                    'phone_verified': voter.get('phone_verified', False),
                    'id_verified': voter.get('id_verified', False),
                    'face_verified': voter.get('face_verified', False)
                },
                'is_fully_verified': all([
                    voter.get('email_verified', False),
                    voter.get('phone_verified', False),
                    voter.get('id_verified', False)
                ]),
                'votes_cast': votes_cast,
                'is_active': voter.get('is_active', True),
                'created_at': voter.get('created_at'),
                'last_login': voter.get('last_login')
            })
        
        return jsonify({
            'success': True,
            'voters': voters_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total_voters,
                'total_pages': (total_voters + per_page - 1) // per_page
            },
            'filters': {
                'constituencies': constituencies,
                'verification_status': verification_status,
                'constituency': constituency
            }
        })
        
    except Exception as e:
        logger.error(f"Get voters error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load voters'
        }), 500

# Enhanced Verify voter with real-time updates
@admin_bp.route('/voters/<voter_id>/verify', methods=['POST'])
@admin_required
def verify_voter(voter_id):
    """Verify voter documents with real-time updates"""
    try:
        data = request.get_json()
        verification_type = data.get('type', 'all')  # 'email', 'phone', 'id', 'face', 'all'
        
        voter = Voter.find_by_voter_id(voter_id)
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Voter not found'
            }), 404
        
        update_data = {}
        if verification_type == 'all':
            update_data = {
                'email_verified': True,
                'phone_verified': True,
                'id_verified': True,
                'face_verified': True,
                'registration_status': 'verified',
                'verified_at': datetime.utcnow(),
                'verified_by': request.admin['admin_id']
            }
        elif verification_type == 'email':
            update_data = {'email_verified': True}
        elif verification_type == 'phone':
            update_data = {'phone_verified': True}
        elif verification_type == 'id':
            update_data = {'id_verified': True}
        elif verification_type == 'face':
            update_data = {'face_verified': True}
        else:
            return jsonify({
                'success': False,
                'message': 'Invalid verification type'
            }), 400
        
        # Update voter verification status
        Voter.update_one({"voter_id": voter_id}, update_data)
        
        updated_voter = Voter.find_by_voter_id(voter_id)
        
        # Broadcast real-time update to the specific voter
        from smart_app.backend.dashboard import broadcast_voter_update
        broadcast_voter_update('verify', {
            'voter_id': voter_id,
            'verification_type': verification_type,
            'full_name': voter['full_name']
        }, request.admin['admin_id'])
        
        # Log the action
        log_admin_action(
            request.admin,
            "verify_voter",
            {
                "voter_id": voter_id,
                "verification_type": verification_type,
                "voter_name": voter['full_name']
            },
            voter_id
        )
        
        return jsonify({
            'success': True,
            'message': f'Voter {verification_type} verification completed successfully',
            'voter': updated_voter,
            'notification_sent': True
        })
        
    except Exception as e:
        logger.error(f"Verify voter error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to verify voter'
        }), 500

# Enhanced Update voter status with real-time updates
@admin_bp.route('/voters/<voter_id>/status', methods=['PUT'])
@admin_required
def update_voter_status(voter_id):
    """Update voter status (active/inactive) with real-time updates"""
    try:
        data = request.get_json()
        status = data.get('status')  # 'active' or 'inactive'
        
        if status not in ['active', 'inactive']:
            return jsonify({
                'success': False,
                'message': 'Invalid status. Must be "active" or "inactive"'
            }), 400
        
        voter = Voter.find_by_voter_id(voter_id)
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Voter not found'
            }), 404
        
        is_active = status == 'active'
        
        # Update voter status
        Voter.update_one(
            {"voter_id": voter_id},
            {"is_active": is_active, "updated_at": datetime.utcnow()}
        )
        
        # Broadcast real-time update
        from smart_app.backend.dashboard import broadcast_voter_update
        broadcast_voter_update('status_update', {
            'voter_id': voter_id,
            'full_name': voter['full_name'],
            'new_status': status
        }, request.admin['admin_id'])
        
        # Log the action
        log_admin_action(
            request.admin,
            "update_voter_status",
            {
                "voter_id": voter_id,
                "old_status": 'active' if voter.get('is_active') else 'inactive',
                "new_status": status,
                "voter_name": voter['full_name']
            },
            voter_id
        )
        
        return jsonify({
            'success': True,
            'message': f'Voter status updated to {status}',
            'notification_sent': True
        })
        
    except Exception as e:
        logger.error(f"Update voter status error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to update voter status'
        }), 500

# Get voter details with voting history
@admin_bp.route('/voters/<voter_id>', methods=['GET'])
@admin_required
def get_voter_details(voter_id):
    """Get detailed voter information with voting history"""
    try:
        voter = Voter.find_by_voter_id(voter_id)
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Voter not found'
            }), 404
        
        # Get voting history
        votes = Vote.find_all({
            "voter_id": voter_id,
            "is_verified": True
        }, sort=[("vote_timestamp", -1)])
        
        voting_history = []
        for vote in votes:
            election = Election.find_by_election_id(vote['election_id'])
            candidate = Candidate.find_by_candidate_id(vote['candidate_id'])
            
            voting_history.append({
                'election_id': vote['election_id'],
                'election_title': election['title'] if election else 'Unknown Election',
                'candidate_name': candidate['full_name'] if candidate else 'Unknown Candidate',
                'party': candidate.get('party', 'Unknown') if candidate else 'Unknown',
                'vote_timestamp': vote.get('vote_timestamp'),
                'face_verified': vote.get('face_verified', False)
            })
        
        # Calculate age
        age = Voter.calculate_age(voter.get('date_of_birth')) if voter.get('date_of_birth') else 0
        
        voter_data = {
            'voter_id': voter['voter_id'],
            'full_name': voter['full_name'],
            'email': voter['email'],
            'phone': voter['phone'],
            'gender': voter['gender'],
            'age': age,
            'date_of_birth': voter.get('date_of_birth'),
            'address': {
                'address_line1': voter.get('address_line1'),
                'address_line2': voter.get('address_line2'),
                'village_city': voter.get('village_city'),
                'district': voter.get('district'),
                'state': voter.get('state'),
                'pincode': voter.get('pincode')
            },
            'constituency': voter.get('constituency'),
            'polling_station': voter.get('polling_station'),
            'national_id': {
                'type': voter.get('national_id_type'),
                'number': voter.get('national_id_number'),
                'verified': voter.get('id_verified', False)
            },
            'verification_status': {
                'email_verified': voter.get('email_verified', False),
                'phone_verified': voter.get('phone_verified', False),
                'id_verified': voter.get('id_verified', False),
                'face_verified': voter.get('face_verified', False)
            },
            'registration_status': voter.get('registration_status', 'pending'),
            'is_active': voter.get('is_active', True),
            'votes_cast': len(voting_history),
            'voting_history': voting_history,
            'created_at': voter.get('created_at'),
            'last_login': voter.get('last_login')
        }
        
        return jsonify({
            'success': True,
            'voter': voter_data
        })
        
    except Exception as e:
        logger.error(f"Get voter details error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load voter details'
        }), 500

# Enhanced Get audit logs with filtering
@admin_bp.route('/audit-logs', methods=['GET'])
@admin_required
def get_audit_logs():
    """Get audit logs with pagination and filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        action_type = request.args.get('action', 'all')
        user_type = request.args.get('user_type', 'all')
        
        # Build query based on filters
        query = {}
        
        if action_type != 'all':
            query["action"] = action_type
            
        if user_type != 'all':
            query["user_type"] = user_type
        
        # Get audit logs with pagination
        audit_logs = AuditLog.find_all(
            query=query,
            sort=[("timestamp", -1)],
            limit=per_page
        )
        
        total_logs = AuditLog.count(query)
        
        # Get unique actions and user types for filters
        actions = AuditLog.get_collection().distinct("action")
        user_types = AuditLog.get_collection().distinct("user_type")
        
        logs_data = []
        for log in audit_logs:
            logs_data.append({
                'log_id': log.get('log_id'),
                'action': log.get('action'),
                'user_id': log.get('user_id'),
                'user_type': log.get('user_type'),
                'details': log.get('details'),
                'ip_address': log.get('ip_address'),
                'user_agent': log.get('user_agent'),
                'timestamp': log.get('timestamp')
            })
        
        return jsonify({
            'success': True,
            'logs': logs_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total_logs,
                'total_pages': (total_logs + per_page - 1) // per_page
            },
            'filters': {
                'actions': actions,
                'user_types': user_types,
                'action': action_type,
                'user_type': user_type
            }
        })
        
    except Exception as e:
        logger.error(f"Get audit logs error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load audit logs'
        }), 500

# Enhanced Get candidates with filtering
@admin_bp.route('/candidates', methods=['GET'])
@admin_required
def get_candidates():
    """Get candidates with pagination and filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        approval_status = request.args.get('approval', 'all')
        election_id = request.args.get('election_id', 'all')
        
        # Build query based on filters
        query = {"is_active": True}
        
        if approval_status != 'all':
            query["is_approved"] = approval_status == 'approved'
            
        if election_id != 'all':
            query["election_id"] = election_id
        
        # Get candidates with pagination
        candidates = Candidate.find_all(
            query=query,
            sort=[("created_at", -1)],
            limit=per_page
        )
        
        total_candidates = Candidate.count(query)
        
        # Get elections for filter
        elections = Election.find_all({"is_active": True}, {"election_id": 1, "title": 1})
        
        candidates_data = []
        for candidate in candidates:
            # Get election title
            election = Election.find_by_election_id(candidate.get('election_id'))
            election_title = election['title'] if election else 'Unknown Election'
            
            # Get vote count
            vote_count = Vote.count({
                "candidate_id": candidate.get('candidate_id'),
                "is_verified": True
            })
            
            candidates_data.append({
                'candidate_id': candidate.get('candidate_id'),
                'election_id': candidate.get('election_id'),
                'election_title': election_title,
                'full_name': candidate.get('full_name'),
                'party': candidate.get('party'),
                'party_symbol': candidate.get('party_symbol'),
                'photo': candidate.get('photo'),
                'biography': candidate.get('biography'),
                'manifesto': candidate.get('manifesto'),
                'qualifications': candidate.get('qualifications'),
                'experience': candidate.get('experience'),
                'email': candidate.get('email'),
                'phone': candidate.get('phone'),
                'website': candidate.get('website'),
                'is_active': candidate.get('is_active', True),
                'is_approved': candidate.get('is_approved', False),
                'vote_count': vote_count,
                'candidate_number': candidate.get('candidate_number'),
                'created_at': candidate.get('created_at'),
                'nominated_by': candidate.get('nominated_by')
            })
        
        return jsonify({
            'success': True,
            'candidates': candidates_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total_candidates,
                'total_pages': (total_candidates + per_page - 1) // per_page
            },
            'filters': {
                'elections': [{'election_id': e['election_id'], 'title': e['title']} for e in elections],
                'approval_status': approval_status,
                'election_id': election_id
            }
        })
        
    except Exception as e:
        logger.error(f"Get candidates error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load candidates'
        }), 500

# Enhanced Approve candidate with real-time updates
@admin_bp.route('/candidates/<candidate_id>/approve', methods=['PUT'])
@admin_required
def approve_candidate(candidate_id):
    """Approve candidate with real-time updates"""
    try:
        candidate = Candidate.find_by_candidate_id(candidate_id)
        if not candidate:
            return jsonify({
                'success': False,
                'message': 'Candidate not found'
            }), 404
        
        # Update candidate approval status
        Candidate.update_one(
            {"candidate_id": candidate_id},
            {
                "is_approved": True,
                "approved_at": datetime.utcnow(),
                "approved_by": request.admin['admin_id']
            }
        )
        
        updated_candidate = Candidate.find_by_candidate_id(candidate_id)
        
        # Broadcast system update
        broadcast_system_update('candidate_approved', {
            'candidate_id': candidate_id,
            'candidate_name': candidate['full_name'],
            'election_id': candidate.get('election_id')
        }, request.admin['admin_id'])
        
        # Log the action
        log_admin_action(
            request.admin,
            "approve_candidate",
            {
                "candidate_id": candidate_id,
                "candidate_name": candidate['full_name'],
                "election_id": candidate.get('election_id')
            },
            candidate_id
        )
        
        return jsonify({
            'success': True,
            'message': 'Candidate approved successfully',
            'candidate': updated_candidate,
            'broadcast_sent': True
        })
        
    except Exception as e:
        logger.error(f"Approve candidate error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to approve candidate'
        }), 500

# Enhanced Create candidate
@admin_bp.route('/candidates', methods=['POST'])
@admin_required
def create_candidate():
    """Create a new candidate"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        required_fields = ['election_id', 'full_name']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Check if election exists
        election = Election.find_by_election_id(data['election_id'])
        if not election:
            return jsonify({
                'success': False,
                'message': 'Election not found'
            }), 404
        
        candidate_data = {
            'election_id': data['election_id'],
            'full_name': data['full_name'],
            'party': data.get('party', 'Independent'),
            'party_symbol': data.get('party_symbol'),
            'photo': data.get('photo'),
            'biography': data.get('biography', ''),
            'manifesto': data.get('manifesto', ''),
            'qualifications': data.get('qualifications', ''),
            'experience': data.get('experience', ''),
            'email': data.get('email'),
            'phone': data.get('phone'),
            'website': data.get('website'),
            'agenda': data.get('agenda', ''),
            'assets_declaration': data.get('assets_declaration'),
            'criminal_records': data.get('criminal_records', 'none'),
            'is_active': data.get('is_active', True),
            'is_approved': data.get('is_approved', True),
            'nominated_by': request.admin['username'],
            'candidate_number': data.get('candidate_number')
        }
        
        candidate_id = Candidate.create_candidate(candidate_data)
        candidate = Candidate.find_by_candidate_id(candidate_id)
        
        # Log the action
        log_admin_action(
            request.admin,
            "create_candidate",
            {
                "candidate_id": candidate_id,
                "candidate_name": data['full_name'],
                "election_id": data['election_id'],
                "party": data.get('party', 'Independent')
            },
            candidate_id
        )
        
        return jsonify({
            'success': True,
            'message': 'Candidate created successfully',
            'candidate_id': candidate_id,
            'candidate': candidate
        })
        
    except Exception as e:
        logger.error(f"Create candidate error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to create candidate'
        }), 500

# System broadcast message to all voters
@admin_bp.route('/broadcast', methods=['POST'])
@admin_required
def broadcast_message():
    """Broadcast message to all voters"""
    try:
        data = request.get_json()
        message = data.get('message')
        broadcast_type = data.get('type', 'info')  # info, warning, urgent
        
        if not message:
            return jsonify({
                'success': False,
                'message': 'Message is required'
            }), 400
        
        # Use SocketIO to broadcast
        from smart_app.backend.routes.dashboard import socketio
        socketio.emit('admin_broadcast', {
            'message': message,
            'type': broadcast_type,
            'admin_id': request.admin['admin_id'],
            'admin_name': request.admin.get('full_name', request.admin['username']),
            'timestamp': datetime.utcnow().isoformat(),
            'urgent': broadcast_type == 'urgent'
        }, room='all_voters', broadcast=True)
        
        # Log the broadcast
        log_admin_action(
            request.admin,
            "admin_broadcast",
            {
                "message": message,
                "type": broadcast_type,
                "recipients": "all_voters"
            }
        )
        
        return jsonify({
            'success': True,
            'message': 'Broadcast sent successfully',
            'broadcast_type': broadcast_type
        })
        
    except Exception as e:
        logger.error(f'Broadcast error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Failed to send broadcast'
        }), 500

# Health check for admin routes
@admin_bp.route('/health', methods=['GET'])
@admin_required
def admin_health_check():
    """Admin health check endpoint"""
    return jsonify({
        'success': True,
        'message': 'Admin API is healthy',
        'admin': {
            'username': request.admin['username'],
            'role': request.admin['role'],
            'full_name': request.admin.get('full_name'),
            'admin_id': request.admin['admin_id']
        },
        'timestamp': datetime.utcnow().isoformat(),
        'version': '2.0.0'
    })