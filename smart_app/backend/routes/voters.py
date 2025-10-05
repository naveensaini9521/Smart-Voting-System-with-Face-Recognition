from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from smart_app.backend.extensions import db
from smart_app.backend.models import Voter, Vote, Election, Candidate


voting_bp = Blueprint('voters', __name__)

@voting_bp.route('/vote', methods=['POST'])
@jwt_required()
def cast_vote():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        required_fields = ['election_id', 'candidate_id']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Get voter
        voter = Voter.query.filter_by(user_id=user_id).first()
        if not voter:
            return jsonify({'error': 'Voter profile not found'}), 404
        
        # Check if face is verified
        if not voter.is_face_verified:
            return jsonify({'error': 'Face verification required before voting'}), 403
        
        # Check if voter has already voted in this election
        existing_vote = Vote.query.filter_by(
            voter_id=voter.id, 
            election_id=data['election_id']
        ).first()
        
        if existing_vote:
            return jsonify({'error': 'You have already voted in this election'}), 400
        
        # Check if election is active
        election = Election.query.get(data['election_id'])
        if not election:
            return jsonify({'error': 'Election not found'}), 404
        
        from datetime import datetime
        current_time = datetime.utcnow()
        
        if current_time < election.start_date:
            return jsonify({'error': 'Election has not started yet'}), 400
        
        if current_time > election.end_date:
            return jsonify({'error': 'Election has ended'}), 400
        
        # Check if candidate exists and belongs to election
        candidate = Candidate.query.filter_by(
            id=data['candidate_id'], 
            election_id=data['election_id']
        ).first()
        
        if not candidate:
            return jsonify({'error': 'Candidate not found in this election'}), 404
        
        # Create vote
        vote = Vote(
            voter_id=voter.id,
            election_id=data['election_id'],
            candidate_id=data['candidate_id'],
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        # Update vote counts
        candidate.vote_count += 1
        election.total_votes += 1
        voter.has_voted = True
        
        db.session.add(vote)
        db.session.commit()
        
        return jsonify({
            'message': 'Vote cast successfully',
            'vote': vote.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@voting_bp.route('/voting-history', methods=['GET'])
@jwt_required()
def get_voting_history():
    try:
        user_id = get_jwt_identity()
        voter = Voter.query.filter_by(user_id=user_id).first()
        
        if not voter:
            return jsonify({'error': 'Voter profile not found'}), 404
        
        votes = Vote.query.filter_by(voter_id=voter.id).all()
        
        voting_history = []
        for vote in votes:
            election = Election.query.get(vote.election_id)
            candidate = Candidate.query.get(vote.candidate_id)
            
            voting_history.append({
                'vote': vote.to_dict(),
                'election': election.to_dict() if election else None,
                'candidate': candidate.to_dict() if candidate else None
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
        from datetime import datetime
        current_time = datetime.utcnow()
        
        # Get active and upcoming elections
        elections = Election.query.filter(
            Election.end_date >= current_time,
            Election.is_public == True
        ).order_by(Election.start_date).all()
        
        user_id = get_jwt_identity()
        voter = Voter.query.filter_by(user_id=user_id).first()
        
        election_list = []
        for election in elections:
            # Check if voter has already voted in this election
            has_voted = False
            if voter:
                has_voted = Vote.query.filter_by(
                    voter_id=voter.id, 
                    election_id=election.id
                ).first() is not None
            
            election_data = election.to_dict()
            election_data['has_voted'] = has_voted
            election_data['candidates'] = [c.to_dict() for c in election.candidates]
            
            election_list.append(election_data)
        
        return jsonify({
            'elections': election_list
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500