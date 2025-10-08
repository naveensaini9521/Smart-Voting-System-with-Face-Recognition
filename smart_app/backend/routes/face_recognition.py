from flask import Blueprint, request, jsonify
import base64
import os
from smart_app.extensions import db
from smart_app.models import User, FaceData

face_bp = Blueprint('face', __name__)

@face_bp.route('/register', methods=['POST'])
def register_face():
    try:
        data = request.get_json()
        voter_id = data.get('voter_id')
        image_data = data.get('image')  # Base64 encoded image
        
        if not voter_id or not image_data:
            return jsonify({'message': 'Voter ID and image are required'}), 400
        
        # Find user
        user = User.query.get(voter_id)
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # In production, you would:
        # 1. Decode base64 image
        # 2. Process with face recognition library
        # 3. Extract face encodings
        # 4. Store encodings in database
        
        # For demo purposes, we'll simulate face registration
        face_encoding = "simulated_face_encoding_data"
        
        # Save face data
        face_data = FaceData(
            user_id=user.id,
            face_encoding=face_encoding
        )
        
        db.session.add(face_data)
        user.face_registered = True
        db.session.commit()
        
        return jsonify({
            'message': 'Face registered successfully',
            'face_id': face_data.id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Face registration failed'}), 500

@face_bp.route('/verify', methods=['POST'])
def verify_face():
    try:
        data = request.get_json()
        voter_id = data.get('voter_id')
        image_data = data.get('image')  # Base64 encoded image
        
        if not voter_id or not image_data:
            return jsonify({'message': 'Voter ID and image are required'}), 400
        
        # Find user and their face data
        user = User.query.get(voter_id)
        if not user or not user.face_registered:
            return jsonify({'message': 'Face not registered'}), 404
        
        # In production, you would:
        # 1. Decode base64 image
        # 2. Extract face encodings
        # 3. Compare with stored encodings
        # 4. Return match result
        
        # For demo, simulate successful verification
        return jsonify({
            'message': 'Face verified successfully',
            'match': True,
            'confidence': 0.95
        }), 200
        
    except Exception as e:
        return jsonify({'message': 'Face verification failed'}), 500