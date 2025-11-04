from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from bson import ObjectId
import logging
from functools import wraps

from smart_app.backend.extensions import mongo
from smart_app.backend.mongo_models import User, Election, Voter, Vote, Candidate, Admin, AuditLog

admin_bp = Blueprint('admin', __name__)
logger = logging.getLogger(__name__)

# Helper function to check admin privileges
def require_admin(f):
    """Decorator to require admin privileges"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            username = get_jwt_identity()
            admin = Admin.find_by_username(username)
            
            if not admin or not admin.get('is_active', True):
                return jsonify({
                    'success': False,
                    'message': 'Admin access required'
                }), 403
            
            # Check role-based access if needed
            required_role = getattr(f, '_required_role', None)
            if required_role and admin.get('role') != required_role:
                return jsonify({
                    'success': False,
                    'message': 'Insufficient privileges'
                }), 403
                
            return f(*args, **kwargs, admin_user=admin)
        except Exception as e:
            logger.error(f"Admin auth error: {str(e)}")
            return jsonify({
                'success': False,
                'message': 'Authentication failed'
            }), 401
    return decorated_function

def require_role(role):
    """Decorator to require specific admin role"""
    def decorator(f):
        f._required_role = role
        return f
    return decorator

# Helper functions
def format_election_data(election):
    """Format election data for API response"""
    candidates_count = Candidate.get_collection().count_documents({'election_id': election['election_id']})
    votes_count = Vote.get_collection().count_documents({'election_id': election['election_id']})
    
    return {
        'election_id': election['election_id'],
        'title': election['title'],
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
        'total_candidates': candidates_count,
        'total_votes': votes_count,
        'voter_turnout': election.get('voter_turnout', 0),
        'created_at': election.get('created_at'),
        'created_by': election.get('created_by')
    }

def format_voter_data(voter):
    """Format voter data for API response"""
    return {
        'voter_id': voter['voter_id'],
        'full_name': voter['full_name'],
        'email': voter['email'],
        'phone': voter['phone'],
        'gender': voter['gender'],
        'date_of_birth': voter.get('date_of_birth'),
        'age': Voter.calculate_age(voter.get('date_of_birth')) if voter.get('date_of_birth') else 0,
        'district': voter.get('district'),
        'state': voter.get('state'),
        'constituency': voter.get('constituency'),
        'polling_station': voter.get('polling_station'),
        'verification_status': {
            'email_verified': voter.get('email_verified', False),
            'phone_verified': voter.get('phone_verified', False),
            'id_verified': voter.get('id_verified', False),
            'face_verified': voter.get('face_verified', False),
            'fully_verified': all([
                voter.get('email_verified', False),
                voter.get('phone_verified', False),
                voter.get('id_verified', False),
                voter.get('face_verified', False)
            ])
        },
        'registration_status': voter.get('registration_status', 'pending'),
        'is_active': voter.get('is_active', True),
        'created_at': voter.get('created_at'),
        'last_login': voter.get('last_login')
    }

def format_candidate_data(candidate):
    """Format candidate data for API response"""
    return {
        'candidate_id': candidate['candidate_id'],
        'election_id': candidate['election_id'],
        'full_name': candidate['full_name'],
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
    }

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

# Election Management Routes
@admin_bp.route('/elections', methods=['POST'], endpoint='create_election')
@jwt_required()
@require_admin
def create_election_route(admin_user):
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
                    'message': f'{field} is required'
                }), 400
        
        # Validate dates
        try:
            voting_start = datetime.fromisoformat(data['voting_start'].replace('Z', '+00:00'))
            voting_end = datetime.fromisoformat(data['voting_end'].replace('Z', '+00:00'))
            
            if voting_end <= voting_start:
                return jsonify({
                    'success': False,
                    'message': 'Voting end must be after voting start'
                }), 400
                
            if voting_start <= datetime.utcnow():
                return jsonify({
                    'success': False,
                    'message': 'Voting start must be in the future'
                }), 400
                
        except ValueError:
            return jsonify({
                'success': False,
                'message': 'Invalid date format'
            }), 400
        
        # Create election
        election_data = {
            'title': data['title'],
            'description': data.get('description', ''),
            'election_type': data['election_type'],
            'constituency': data.get('constituency'),
            'district': data.get('district'),
            'state': data.get('state'),
            'country': data.get('country', 'India'),
            'registration_start': data.get('registration_start'),
            'registration_end': data.get('registration_end'),
            'voting_start': voting_start,
            'voting_end': voting_end,
            'results_publish': data.get('results_publish'),
            'status': data.get('status', 'draft'),
            'max_candidates': data.get('max_candidates', 1),
            'allow_write_ins': data.get('allow_write_ins', False),
            'require_face_verification': data.get('require_face_verification', True),
            'results_visibility': data.get('results_visibility', 'after_end'),
            'created_by': admin_user['username']
        }
        
        election_id = Election.create_election(election_data)
        election = Election.find_by_id(election_id)
        
        # Log the action
        log_admin_action(
            admin_user, 
            'create_election', 
            f"Created election: {data['title']}",
            election['election_id']
        )
        
        return jsonify({
            'success': True,
            'message': 'Election created successfully',
            'election_id': election['election_id'],
            'election': format_election_data(election)
        }), 201
        
    except Exception as e:
        logger.error(f'Election creation error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Failed to create election'
        }), 500

@admin_bp.route('/elections', methods=['GET'], endpoint='get_all_elections')
@jwt_required()
@require_admin
def get_all_elections_route(admin_user):
    try:
        # Get query parameters
        status = request.args.get('status')
        election_type = request.args.get('type')
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)  # Limit per_page to 100
        skip = (page - 1) * per_page
        
        # Build query
        query = {}
        if status:
            query['status'] = status
        if election_type:
            query['election_type'] = election_type
        
        # Get elections with pagination
        elections = list(Election.get_collection().find(query).sort('created_at', -1).skip(skip).limit(per_page))
        total_elections = Election.get_collection().count_documents(query)
        
        return jsonify({
            'success': True,
            'elections': [format_election_data(election) for election in elections],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total_elections': total_elections,
                'total_pages': (total_elections + per_page - 1) // per_page
            }
        }), 200
        
    except Exception as e:
        logger.error(f'Get elections error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve elections'
        }), 500

@admin_bp.route('/elections/<election_id>', methods=['PUT'], endpoint='update_election')
@jwt_required()
@require_admin
def update_election_route(admin_user, election_id):
    try:
        data = request.get_json()
        
        # Find election
        election = Election.find_by_election_id(election_id)
        if not election:
            return jsonify({
                'success': False,
                'message': 'Election not found'
            }), 404
        
        # Update election
        update_data = {}
        updatable_fields = [
            'title', 'description', 'status', 'max_candidates', 
            'allow_write_ins', 'require_face_verification', 'results_visibility'
        ]
        
        for field in updatable_fields:
            if field in data:
                update_data[field] = data[field]
        
        if update_data:
            Election.update_one(
                {'election_id': election_id},
                update_data
            )
            
            # Log the action
            log_admin_action(
                admin_user,
                'update_election',
                f"Updated election: {election['title']}",
                election_id
            )
        
        updated_election = Election.find_by_election_id(election_id)
        
        return jsonify({
            'success': True,
            'message': 'Election updated successfully',
            'election': format_election_data(updated_election)
        }), 200
        
    except Exception as e:
        logger.error(f'Election update error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Failed to update election'
        }), 500

@admin_bp.route('/elections/<election_id>', methods=['DELETE'], endpoint='delete_election')
@jwt_required()
@require_admin
def delete_election_route(admin_user, election_id):
    try:
        # Find election
        election = Election.find_by_election_id(election_id)
        if not election:
            return jsonify({
                'success': False,
                'message': 'Election not found'
            }), 404
        
        # Prevent deletion of active elections
        if election.get('status') == 'active':
            return jsonify({
                'success': False,
                'message': 'Cannot delete active election'
            }), 400
        
        # Delete election and related data
        Election.get_collection().delete_one({'election_id': election_id})
        Candidate.get_collection().delete_many({'election_id': election_id})
        Vote.get_collection().delete_many({'election_id': election_id})
        
        # Log the action
        log_admin_action(
            admin_user,
            'delete_election',
            f"Deleted election: {election['title']}",
            election_id
        )
        
        return jsonify({
            'success': True,
            'message': 'Election deleted successfully'
        }), 200
        
    except Exception as e:
        logger.error(f'Election deletion error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Failed to delete election'
        }), 500

# Voter Management Routes
@admin_bp.route('/voters', methods=['GET'], endpoint='get_all_voters')
@jwt_required()
@require_admin
def get_all_voters_route(admin_user):
    try:
        # Get query parameters
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)
        skip = (page - 1) * per_page
        
        status_filter = request.args.get('status')
        verified_only = request.args.get('verified') == 'true'
        search = request.args.get('search')
        
        # Build query
        query = {}
        if status_filter:
            query['registration_status'] = status_filter
        if verified_only:
            query.update({
                'email_verified': True,
                'phone_verified': True,
                'id_verified': True
            })
        if search:
            query['$or'] = [
                {'voter_id': {'$regex': search, '$options': 'i'}},
                {'full_name': {'$regex': search, '$options': 'i'}},
                {'email': {'$regex': search, '$options': 'i'}}
            ]
        
        # Get voters with pagination
        voters = list(Voter.get_collection().find(query).sort('created_at', -1).skip(skip).limit(per_page))
        total_voters = Voter.get_collection().count_documents(query)
        
        return jsonify({
            'success': True,
            'voters': [format_voter_data(voter) for voter in voters],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total_voters': total_voters,
                'total_pages': (total_voters + per_page - 1) // per_page
            }
        }), 200
        
    except Exception as e:
        logger.error(f'Get voters error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve voters'
        }), 500

@admin_bp.route('/voters/<voter_id>/verify', methods=['POST'], endpoint='verify_voter')
@jwt_required()
@require_admin
def verify_voter_route(admin_user, voter_id):
    try:
        data = request.get_json()
        verification_type = data.get('type')  # 'email', 'phone', 'id', 'face', 'all'
        
        voter = Voter.find_by_voter_id(voter_id)
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Voter not found'
            }), 404
        
        update_data = {}
        
        if verification_type == 'email':
            update_data['email_verified'] = True
        elif verification_type == 'phone':
            update_data['phone_verified'] = True
        elif verification_type == 'id':
            update_data['id_verified'] = True
        elif verification_type == 'face':
            update_data['face_verified'] = True
        elif verification_type == 'all':
            update_data.update({
                'email_verified': True,
                'phone_verified': True,
                'id_verified': True,
                'face_verified': True,
                'registration_status': 'verified'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Invalid verification type'
            }), 400
        
        Voter.update_one(
            {'voter_id': voter_id},
            update_data
        )
        
        # Log the action
        log_admin_action(
            admin_user,
            'verify_voter',
            f"Verified voter {voter_id} - {verification_type}",
            voter_id
        )
        
        updated_voter = Voter.find_by_voter_id(voter_id)
        
        return jsonify({
            'success': True,
            'message': f'Voter {verification_type} verification completed',
            'voter': format_voter_data(updated_voter)
        }), 200
        
    except Exception as e:
        logger.error(f'Voter verification error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Failed to verify voter'
        }), 500

@admin_bp.route('/voters/<voter_id>/status', methods=['PUT'], endpoint='update_voter_status')
@jwt_required()
@require_admin
def update_voter_status_route(admin_user, voter_id):
    try:
        data = request.get_json()
        status = data.get('status')  # 'active', 'inactive', 'suspended'
        
        if status not in ['active', 'inactive', 'suspended']:
            return jsonify({
                'success': False,
                'message': 'Invalid status'
            }), 400
        
        voter = Voter.find_by_voter_id(voter_id)
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Voter not found'
            }), 404
        
        Voter.update_one(
            {'voter_id': voter_id},
            {'is_active': status == 'active', 'registration_status': status}
        )
        
        # Log the action
        log_admin_action(
            admin_user,
            'update_voter_status',
            f"Updated voter {voter_id} status to {status}",
            voter_id
        )
        
        return jsonify({
            'success': True,
            'message': f'Voter status updated to {status}'
        }), 200
        
    except Exception as e:
        logger.error(f'Voter status update error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Failed to update voter status'
        }), 500

# Candidate Management Routes
@admin_bp.route('/candidates', methods=['POST'], endpoint='create_candidate')
@jwt_required()
@require_admin
def create_candidate_route(admin_user):
    try:
        data = request.get_json()
        
        required_fields = ['election_id', 'full_name']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'{field} is required'
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
            'nominated_by': data.get('nominated_by', admin_user['username'])
        }
        
        candidate_id = Candidate.create_candidate(candidate_data)
        candidate = Candidate.find_by_id(candidate_id)
        
        # Log the action
        log_admin_action(
            admin_user,
            'create_candidate',
            f"Created candidate: {data['full_name']} for election {data['election_id']}",
            candidate['candidate_id']
        )
        
        return jsonify({
            'success': True,
            'message': 'Candidate created successfully',
            'candidate_id': candidate['candidate_id'],
            'candidate': format_candidate_data(candidate)
        }), 201
        
    except Exception as e:
        logger.error(f'Candidate creation error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Failed to create candidate'
        }), 500

@admin_bp.route('/candidates/<candidate_id>/approve', methods=['PUT'], endpoint='approve_candidate')
@jwt_required()
@require_admin
def approve_candidate_route(admin_user, candidate_id):
    try:
        candidate = Candidate.find_by_candidate_id(candidate_id)
        if not candidate:
            return jsonify({
                'success': False,
                'message': 'Candidate not found'
            }), 404
        
        Candidate.update_one(
            {'candidate_id': candidate_id},
            {'is_approved': True}
        )
        
        # Log the action
        log_admin_action(
            admin_user,
            'approve_candidate',
            f"Approved candidate: {candidate['full_name']}",
            candidate_id
        )
        
        return jsonify({
            'success': True,
            'message': 'Candidate approved successfully'
        }), 200
        
    except Exception as e:
        logger.error(f'Candidate approval error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Failed to approve candidate'
        }), 500

# Dashboard and Analytics Routes
@admin_bp.route('/dashboard/stats', methods=['GET'], endpoint='get_admin_dashboard')
@jwt_required()
@require_admin
def get_admin_dashboard_route(admin_user):
    try:
        # Get statistics for dashboard
        total_voters = Voter.get_collection().count_documents({})
        total_elections = Election.get_collection().count_documents({})
        total_votes = Vote.get_collection().count_documents({})
        
        # Active elections
        active_elections = Election.get_collection().count_documents({'status': 'active'})
        
        # Verified voters
        verified_voters = Voter.get_collection().count_documents({
            'email_verified': True,
            'phone_verified': True,
            'id_verified': True,
            'face_verified': True
        })
        
        # Today's activity
        today = datetime.utcnow().date()
        today_start = datetime.combine(today, datetime.min.time())
        
        new_voters_today = Voter.get_collection().count_documents({
            'created_at': {'$gte': today_start}
        })
        
        votes_today = Vote.get_collection().count_documents({
            'vote_timestamp': {'$gte': today_start}
        })
        
        # Pending approvals
        pending_candidates = Candidate.get_collection().count_documents({
            'is_approved': False
        })
        
        # Recent activity (last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_voters = Voter.get_collection().count_documents({
            'created_at': {'$gte': week_ago}
        })
        
        return jsonify({
            'success': True,
            'stats': {
                'total_voters': total_voters,
                'verified_voters': verified_voters,
                'total_elections': total_elections,
                'active_elections': active_elections,
                'total_votes': total_votes,
                'new_voters_today': new_voters_today,
                'votes_today': votes_today,
                'pending_candidates': pending_candidates,
                'recent_voters': recent_voters
            }
        }), 200
        
    except Exception as e:
        logger.error(f'Dashboard stats error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve dashboard statistics'
        }), 500

@admin_bp.route('/analytics/election/<election_id>', methods=['GET'], endpoint='get_election_analytics')
@jwt_required()
@require_admin
def get_election_analytics_route(admin_user, election_id):
    try:
        election = Election.find_by_election_id(election_id)
        if not election:
            return jsonify({
                'success': False,
                'message': 'Election not found'
            }), 404
        
        # Get candidate results
        pipeline = [
            {'$match': {'election_id': election_id, 'is_verified': True}},
            {'$group': {
                '_id': '$candidate_id',
                'total_votes': {'$sum': 1}
            }},
            {'$sort': {'total_votes': -1}}
        ]
        
        vote_results = list(Vote.get_collection().aggregate(pipeline))
        
        # Get voter turnout
        total_eligible_voters = Voter.get_collection().count_documents({
            'constituency': election.get('constituency')
        })
        
        total_votes_cast = sum(result['total_votes'] for result in vote_results)
        voter_turnout = (total_votes_cast / total_eligible_voters * 100) if total_eligible_voters > 0 else 0
        
        # Format results with candidate details
        results_with_candidates = []
        for result in vote_results:
            candidate = Candidate.find_by_candidate_id(result['_id'])
            if candidate:
                results_with_candidates.append({
                    'candidate_id': candidate['candidate_id'],
                    'full_name': candidate['full_name'],
                    'party': candidate.get('party'),
                    'votes': result['total_votes'],
                    'percentage': (result['total_votes'] / total_votes_cast * 100) if total_votes_cast > 0 else 0
                })
        
        return jsonify({
            'success': True,
            'analytics': {
                'election': format_election_data(election),
                'results': results_with_candidates,
                'voter_turnout': round(voter_turnout, 2),
                'total_votes_cast': total_votes_cast,
                'total_eligible_voters': total_eligible_voters
            }
        }), 200
        
    except Exception as e:
        logger.error(f'Election analytics error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve election analytics'
        }), 500

# System Management Routes
@admin_bp.route('/system/audit-logs', methods=['GET'], endpoint='get_audit_logs')
@jwt_required()
@require_admin
def get_audit_logs_route(admin_user):
    try:
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)
        skip = (page - 1) * per_page
        
        action_filter = request.args.get('action')
        user_type_filter = request.args.get('user_type')
        
        query = {}
        if action_filter:
            query['action'] = action_filter
        if user_type_filter:
            query['user_type'] = user_type_filter
        
        logs = list(AuditLog.get_collection().find(query).sort('timestamp', -1).skip(skip).limit(per_page))
        total_logs = AuditLog.get_collection().count_documents(query)
        
        # Format logs for response
        formatted_logs = []
        for log in logs:
            formatted_logs.append({
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
            'logs': formatted_logs,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total_logs': total_logs,
                'total_pages': (total_logs + per_page - 1) // per_page
            }
        }), 200
        
    except Exception as e:
        logger.error(f'Audit logs error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve audit logs'
        }), 500

