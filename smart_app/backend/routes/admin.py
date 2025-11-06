from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import logging
from functools import wraps
import jwt

from smart_app.backend.mongo_models import Admin, Election, Voter, Vote, Candidate, AuditLog

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

# Dashboard Statistics
@admin_bp.route('/dashboard/stats', methods=['GET'])
@admin_required
def get_dashboard_stats():
    """Get admin dashboard statistics"""
    try:
        # Get total counts
        total_elections = Election.count()
        active_elections = Election.count({
            "status": "active",
            "is_active": True
        })
        total_voters = Voter.count({"is_active": True})
        total_votes = Vote.count()
        
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
            "vote_timestamp": {"$gte": week_ago}
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
        
        stats = {
            'total_elections': total_elections,
            'active_elections': active_elections,
            'total_voters': total_voters,
            'verified_voters': verified_voters,
            'total_votes': total_votes,
            'recent_votes': recent_votes,
            'pending_verifications': pending_verifications,
            'voter_turnout': round((total_votes / total_voters * 100) if total_voters > 0 else 0, 1)
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

# Get elections with pagination
@admin_bp.route('/elections', methods=['GET'])
@admin_required
def get_elections():
    """Get elections with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Calculate skip for pagination
        skip = (page - 1) * per_page
        
        # Get elections with pagination
        elections = Election.find_all(
            query={},
            sort=[("created_at", -1)],
            limit=per_page
        )
        
        # Get total count for pagination
        total_elections = Election.count()
        
        # Format elections data
        elections_data = []
        for election in elections:
            # Get vote count for this election
            vote_count = Vote.count({"election_id": election.get('election_id')})
            
            # Get candidate count
            candidate_count = Candidate.count({"election_id": election.get('election_id')})
            
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
                'created_at': election.get('created_at'),
                'created_by': election.get('created_by')
            })
        
        return jsonify({
            'success': True,
            'elections': elections_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total_elections,
                'total_pages': (total_elections + per_page - 1) // per_page
            }
        })
        
    except Exception as e:
        logger.error(f"Get elections error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load elections'
        }), 500

# Create new election
@admin_bp.route('/elections', methods=['POST'])
@admin_required
def create_election():
    """Create a new election"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        required_fields = ['title', 'election_type', 'voting_start', 'voting_end']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Create election
        election_data = {
            'title': data['title'],
            'description': data.get('description'),
            'election_type': data['election_type'],
            'constituency': data.get('constituency'),
            'district': data.get('district'),
            'state': data.get('state'),
            'country': data.get('country', 'India'),
            'registration_start': data.get('registration_start', data['voting_start']),
            'registration_end': data.get('registration_end', data['voting_end']),
            'voting_start': data['voting_start'],
            'voting_end': data['voting_end'],
            'results_publish': data.get('results_publish'),
            'status': data.get('status', 'draft'),
            'max_candidates': data.get('max_candidates', 1),
            'allow_write_ins': data.get('allow_write_ins', False),
            'require_face_verification': data.get('require_face_verification', True),
            'created_by': request.admin['admin_id']
        }
        
        election_id = Election.create_election(election_data)
        
        # Log the action
        log_admin_action(
            request.admin,
            "create_election",
            f"Created election: {data['title']}",
            election_id
        )
        
        return jsonify({
            'success': True,
            'message': 'Election created successfully',
            'election_id': election_id
        })
        
    except Exception as e:
        logger.error(f"Create election error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to create election'
        }), 500

# Get voters with pagination
@admin_bp.route('/voters', methods=['GET'])
@admin_required
def get_voters():
    """Get voters with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Calculate skip for pagination
        skip = (page - 1) * per_page
        
        # Get voters with pagination
        voters = Voter.find_all(
            query={"is_active": True},
            sort=[("created_at", -1)],
            limit=per_page
        )
        
        total_voters = Voter.count({"is_active": True})
        
        voters_data = []
        for voter in voters:
            # Calculate age
            age = Voter.calculate_age(voter.get('date_of_birth')) if voter.get('date_of_birth') else 0
            
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
            }
        })
        
    except Exception as e:
        logger.error(f"Get voters error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load voters'
        }), 500

# Verify voter
@admin_bp.route('/voters/<voter_id>/verify', methods=['POST'])
@admin_required
def verify_voter(voter_id):
    """Verify voter documents"""
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
        else:
            return jsonify({
                'success': False,
                'message': 'Invalid verification type'
            }), 400
        
        # Update voter verification status
        Voter.update_one({"voter_id": voter_id}, update_data)
        
        # Log the action
        log_admin_action(
            request.admin,
            "verify_voter",
            f"Verified voter {voter_id} - {verification_type}",
            voter_id
        )
        
        return jsonify({
            'success': True,
            'message': f'Voter {verification_type} verification completed successfully'
        })
        
    except Exception as e:
        logger.error(f"Verify voter error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to verify voter'
        }), 500

# Update voter status
@admin_bp.route('/voters/<voter_id>/status', methods=['PUT'])
@admin_required
def update_voter_status(voter_id):
    """Update voter status (active/inactive)"""
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
        
        # Update voter status
        Voter.update_one(
            {"voter_id": voter_id},
            {"is_active": status == 'active'}
        )
        
        # Log the action
        log_admin_action(
            request.admin,
            "update_voter_status",
            f"Updated voter {voter_id} status to {status}",
            voter_id
        )
        
        return jsonify({
            'success': True,
            'message': f'Voter status updated to {status}'
        })
        
    except Exception as e:
        logger.error(f"Update voter status error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to update voter status'
        }), 500

# Get audit logs
@admin_bp.route('/audit-logs', methods=['GET'])
@admin_required
def get_audit_logs():
    """Get audit logs with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Calculate skip for pagination
        skip = (page - 1) * per_page
        
        # Get audit logs with pagination
        audit_logs = AuditLog.find_all(
            query={},
            sort=[("timestamp", -1)],
            limit=per_page
        )
        
        total_logs = AuditLog.count()
        
        logs_data = []
        for log in audit_logs:
            logs_data.append({
                'log_id': log.get('log_id'),
                'action': log.get('action'),
                'user_id': log.get('user_id'),
                'user_type': log.get('user_type'),
                'details': log.get('details'),
                'ip_address': log.get('ip_address'),
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
            }
        })
        
    except Exception as e:
        logger.error(f"Get audit logs error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load audit logs'
        }), 500

# Get candidates
@admin_bp.route('/candidates', methods=['GET'])
@admin_required
def get_candidates():
    """Get candidates with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Calculate skip for pagination
        skip = (page - 1) * per_page
        
        # Get candidates with pagination
        candidates = Candidate.find_all(
            query={},
            sort=[("created_at", -1)],
            limit=per_page
        )
        
        total_candidates = Candidate.count()
        
        candidates_data = []
        for candidate in candidates:
            candidates_data.append({
                'candidate_id': candidate.get('candidate_id'),
                'election_id': candidate.get('election_id'),
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
                'vote_count': candidate.get('vote_count', 0),
                'candidate_number': candidate.get('candidate_number'),
                'created_at': candidate.get('created_at')
            })
        
        return jsonify({
            'success': True,
            'candidates': candidates_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total_candidates,
                'total_pages': (total_candidates + per_page - 1) // per_page
            }
        })
        
    except Exception as e:
        logger.error(f"Get candidates error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load candidates'
        }), 500

# Approve candidate
@admin_bp.route('/candidates/<candidate_id>/approve', methods=['PUT'])
@admin_required
def approve_candidate(candidate_id):
    """Approve candidate"""
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
            {"is_approved": True}
        )
        
        # Log the action
        log_admin_action(
            request.admin,
            "approve_candidate",
            f"Approved candidate: {candidate.get('full_name')}",
            candidate_id
        )
        
        return jsonify({
            'success': True,
            'message': 'Candidate approved successfully'
        })
        
    except Exception as e:
        logger.error(f"Approve candidate error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to approve candidate'
        }), 500

# Create candidate
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
            'party': data.get('party'),
            'party_symbol': data.get('party_symbol'),
            'photo': data.get('photo'),
            'biography': data.get('biography'),
            'manifesto': data.get('manifesto'),
            'qualifications': data.get('qualifications'),
            'experience': data.get('experience'),
            'email': data.get('email'),
            'phone': data.get('phone'),
            'website': data.get('website'),
            'is_active': data.get('is_active', True),
            'is_approved': data.get('is_approved', True),
            'nominated_by': request.admin['username']
        }
        
        candidate_id = Candidate.create_candidate(candidate_data)
        
        # Log the action
        log_admin_action(
            request.admin,
            "create_candidate",
            f"Created candidate: {data['full_name']} for election {data['election_id']}",
            candidate_id
        )
        
        return jsonify({
            'success': True,
            'message': 'Candidate created successfully',
            'candidate_id': candidate_id
        })
        
    except Exception as e:
        logger.error(f"Create candidate error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to create candidate'
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
            'role': request.admin['role']
        },
        'timestamp': datetime.utcnow().isoformat()
    })