from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from bson import ObjectId

from smart_app.backend.extensions import mongo
from smart_app.backend.mongo_models import Voter, Election, Candidate, Vote

voting_bp = Blueprint('voters', __name__)

@voting_bp.route('/vote', methods=['POST'])
@jwt_required()
def cast_vote():
    try:
        voter_id = get_jwt_identity()  # This should be voter_id from JWT
        data = request.get_json()
        
        required_fields = ['election_id', 'candidate_id']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Get voter from MongoDB
        voter = Voter.find_by_voter_id(voter_id)
        if not voter:
            return jsonify({'error': 'Voter profile not found'}), 404
        
        # Check if face is verified
        if not voter.get('face_verified', False):
            return jsonify({'error': 'Face verification required before voting'}), 403
        
        # Check if voter is fully verified
        if not is_voter_fully_verified(voter):
            return jsonify({'error': 'Complete all verifications before voting'}), 403
        
        # Check if voter has already voted in this election
        existing_vote = Vote.get_collection().find_one({
            'voter_id': voter_id,
            'election_id': data['election_id']
        })
        
        if existing_vote:
            return jsonify({'error': 'You have already voted in this election'}), 400
        
        # Check if election is active
        election = Election.find_by_election_id(data['election_id'])
        if not election:
            return jsonify({'error': 'Election not found'}), 404
        
        current_time = datetime.utcnow()
        voting_start = election.get('voting_start')
        voting_end = election.get('voting_end')
        
        if voting_start and current_time < voting_start:
            return jsonify({'error': 'Election has not started yet'}), 400
        
        if voting_end and current_time > voting_end:
            return jsonify({'error': 'Election has ended'}), 400
        
        # Check if election is active
        if election.get('status') != 'active':
            return jsonify({'error': 'Election is not active'}), 400
        
        # Check if candidate exists and belongs to election
        candidate = Candidate.get_collection().find_one({
            'candidate_id': data['candidate_id'],
            'election_id': data['election_id'],
            'is_active': True,
            'is_approved': True
        })
        
        if not candidate:
            return jsonify({'error': 'Candidate not found in this election'}), 404
        
        # Create vote in MongoDB
        vote_data = {
            'election_id': data['election_id'],
            'voter_id': voter_id,
            'candidate_id': data['candidate_id'],
            'face_verified': True,  # Since we checked face verification above
            'ip_address': request.remote_addr,
            'user_agent': request.headers.get('User-Agent'),
            'vote_hash': generate_vote_hash(voter_id, data['election_id']),
            'is_verified': True
        }
        
        vote_id = Vote.create_vote(vote_data)
        
        # Update candidate vote count
        Candidate.get_collection().update_one(
            {'candidate_id': data['candidate_id']},
            {'$inc': {'vote_count': 1}}
        )
        
        # Update election total votes
        Election.get_collection().update_one(
            {'election_id': data['election_id']},
            {'$inc': {'total_votes': 1}}
        )
        
        # Mark voter as having voted in this election
        Voter.get_collection().update_one(
            {'voter_id': voter_id},
            {
                '$addToSet': {'voted_elections': data['election_id']},
                '$set': {'updated_at': datetime.utcnow()}
            }
        )
        
        # Get the created vote
        vote = Vote.find_by_id(vote_id)
        
        return jsonify({
            'message': 'Vote cast successfully',
            'vote_id': vote['vote_id'],
            'election_id': vote['election_id'],
            'candidate_id': vote['candidate_id'],
            'voted_at': vote.get('created_at')
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@voting_bp.route('/voting-history', methods=['GET'])
@jwt_required()
def get_voting_history():
    try:
        voter_id = get_jwt_identity()
        voter = Voter.find_by_voter_id(voter_id)
        
        if not voter:
            return jsonify({'error': 'Voter profile not found'}), 404
        
        # Get all votes by this voter
        votes = list(Vote.get_collection().find({'voter_id': voter_id}).sort('created_at', -1))
        
        voting_history = []
        for vote in votes:
            election = Election.find_by_election_id(vote['election_id'])
            candidate = Candidate.get_collection().find_one({'candidate_id': vote['candidate_id']})
            
            voting_history.append({
                'vote_id': vote['vote_id'],
                'election_id': vote['election_id'],
                'election_title': election.get('title') if election else 'Unknown Election',
                'candidate_name': candidate.get('full_name') if candidate else 'Unknown Candidate',
                'candidate_party': candidate.get('party') if candidate else 'Unknown Party',
                'voted_at': vote.get('created_at'),
                'face_verified': vote.get('face_verified', False)
            })
        
        return jsonify({
            'voting_history': voting_history,
            'total_votes': len(voting_history)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@voting_bp.route('/elections', methods=['GET'])
@jwt_required()
def get_available_elections():
    try:
        current_time = datetime.utcnow()
        voter_id = get_jwt_identity()
        
        # Get active and upcoming elections
        elections = list(Election.get_collection().find({
            'voting_end': {'$gte': current_time},
            'status': {'$in': ['active', 'upcoming']}
        }).sort('voting_start', 1))
        
        voter = Voter.find_by_voter_id(voter_id)
        
        election_list = []
        for election in elections:
            # Check if voter has already voted in this election
            has_voted = False
            if voter:
                existing_vote = Vote.get_collection().find_one({
                    'voter_id': voter_id,
                    'election_id': election['election_id']
                })
                has_voted = existing_vote is not None
            
            # Get candidates for this election
            candidates = list(Candidate.get_collection().find({
                'election_id': election['election_id'],
                'is_active': True,
                'is_approved': True
            }))
            
            election_data = {
                'election_id': election['election_id'],
                'title': election['title'],
                'description': election.get('description'),
                'election_type': election.get('election_type'),
                'voting_start': election.get('voting_start'),
                'voting_end': election.get('voting_end'),
                'status': election.get('status'),
                'constituency': election.get('constituency'),
                'district': election.get('district'),
                'state': election.get('state'),
                'has_voted': has_voted,
                'candidates': [format_candidate_data(candidate) for candidate in candidates],
                'total_candidates': len(candidates),
                'total_votes': election.get('total_votes', 0)
            }
            
            election_list.append(election_data)
        
        return jsonify({
            'elections': election_list,
            'total_elections': len(election_list)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@voting_bp.route('/election/<election_id>', methods=['GET'])
@jwt_required()
def get_election_details(election_id):
    try:
        voter_id = get_jwt_identity()
        
        # Get election details
        election = Election.find_by_election_id(election_id)
        if not election:
            return jsonify({'error': 'Election not found'}), 404
        
        # Check if voter has already voted
        has_voted = False
        existing_vote = Vote.get_collection().find_one({
            'voter_id': voter_id,
            'election_id': election_id
        })
        has_voted = existing_vote is not None
        
        # Get candidates
        candidates = list(Candidate.get_collection().find({
            'election_id': election_id,
            'is_active': True,
            'is_approved': True
        }))
        
        election_data = {
            'election_id': election['election_id'],
            'title': election['title'],
            'description': election.get('description'),
            'election_type': election.get('election_type'),
            'registration_start': election.get('registration_start'),
            'registration_end': election.get('registration_end'),
            'voting_start': election.get('voting_start'),
            'voting_end': election.get('voting_end'),
            'status': election.get('status'),
            'constituency': election.get('constituency'),
            'district': election.get('district'),
            'state': election.get('state'),
            'max_candidates': election.get('max_candidates', 1),
            'require_face_verification': election.get('require_face_verification', True),
            'has_voted': has_voted,
            'candidates': [format_candidate_data(candidate) for candidate in candidates],
            'total_candidates': len(candidates),
            'total_votes': election.get('total_votes', 0)
        }
        
        return jsonify({
            'election': election_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@voting_bp.route('/verify-eligibility/<election_id>', methods=['GET'])
@jwt_required()
def verify_eligibility(election_id):
    try:
        voter_id = get_jwt_identity()
        
        voter = Voter.find_by_voter_id(voter_id)
        if not voter:
            return jsonify({'error': 'Voter not found'}), 404
        
        election = Election.find_by_election_id(election_id)
        if not election:
            return jsonify({'error': 'Election not found'}), 404
        
        # Check basic voter eligibility
        eligibility_checks = {
            'is_fully_verified': is_voter_fully_verified(voter),
            'is_active': voter.get('is_active', True),
            'age_eligible': is_voter_age_eligible(voter),
            'constituency_match': check_constituency_eligibility(voter, election),
            'has_not_voted': not has_voter_voted(voter_id, election_id)
        }
        
        is_eligible = all(eligibility_checks.values())
        
        return jsonify({
            'is_eligible': is_eligible,
            'eligibility_checks': eligibility_checks,
            'message': 'Eligible to vote' if is_eligible else 'Not eligible to vote'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Helper functions
def is_voter_fully_verified(voter):
    """Check if voter is fully verified"""
    return all([
        voter.get('email_verified', False),
        voter.get('phone_verified', False), 
        voter.get('id_verified', False),
        voter.get('face_verified', False),
        voter.get('is_active', True)
    ])

def is_voter_age_eligible(voter):
    """Check if voter meets age requirements"""
    if not voter.get('date_of_birth'):
        return False
    
    age = Voter.calculate_age(voter['date_of_birth'])
    return age >= 18

def check_constituency_eligibility(voter, election):
    """Check if voter is in the election constituency"""
    # Basic constituency matching - can be enhanced based on requirements
    voter_district = voter.get('district', '').lower()
    voter_state = voter.get('state', '').lower()
    
    election_district = election.get('district', '').lower()
    election_state = election.get('state', '').lower()
    
    return (voter_district == election_district and voter_state == election_state)

def has_voter_voted(voter_id, election_id):
    """Check if voter has already voted in this election"""
    existing_vote = Vote.get_collection().find_one({
        'voter_id': voter_id,
        'election_id': election_id
    })
    return existing_vote is not None

def generate_vote_hash(voter_id, election_id):
    """Generate a unique hash for the vote"""
    import hashlib
    import uuid
    
    unique_string = f"{voter_id}{election_id}{datetime.utcnow().isoformat()}{uuid.uuid4()}"
    return hashlib.sha256(unique_string.encode()).hexdigest()

def format_candidate_data(candidate):
    """Format candidate data for API response"""
    return {
        'candidate_id': candidate['candidate_id'],
        'full_name': candidate['full_name'],
        'party': candidate.get('party'),
        'party_symbol': candidate.get('party_symbol'),
        'photo': candidate.get('photo'),
        'biography': candidate.get('biography'),
        'manifesto': candidate.get('manifesto'),
        'qualifications': candidate.get('qualifications'),
        'experience': candidate.get('experience'),
        'vote_count': candidate.get('vote_count', 0)
    }