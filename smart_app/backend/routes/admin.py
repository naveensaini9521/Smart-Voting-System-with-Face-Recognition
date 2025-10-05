from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from smart_app.backend.extensions import db
from smart_app.backend.models import User, Election, Candidate


admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/elections', methods=['POST'])
@jwt_required()
def create_election():
    try:
        # Check if user is admin
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        
        required_fields = ['title', 'start_date', 'end_date']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        election = Election(
            title=data['title'],
            description=data.get('description', ''),
            start_date=datetime.fromisoformat(data['start_date']),
            end_date=datetime.fromisoformat(data['end_date']),
            is_public=data.get('is_public', True)
        )
        
        db.session.add(election)
        db.session.commit()
        
        return jsonify({
            'message': 'Election created successfully',
            'election': election.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/elections', methods=['GET'])
@jwt_required()
def get_all_elections():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        elections = Election.query.all()
        
        return jsonify({
            'elections': [election.to_dict() for election in elections]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500