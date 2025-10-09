from flask import Blueprint, request, jsonify
import base64
import numpy as np
import cv2
from services.face_recognition import FaceRecognitionService
from models.voter import Voter
from models.face_embedding import FaceEmbedding
from config.database import db
import os
from datetime import datetime

face_bp = Blueprint('face_verification', __name__)
face_service = FaceRecognitionService()

@face_bp.route('/verify', methods=['POST'])
def verify_face():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        voter_id = data.get('voter_id')
        image_data = data.get('image_data')  # Base64 encoded image
        
        if not voter_id or not image_data:
            return jsonify({'error': 'Voter ID and image data are required'}), 400
        
        # Find voter
        voter = Voter.query.filter_by(voter_id=voter_id).first()
        if not voter:
            return jsonify({'error': 'Voter not found'}), 404
        
        # Decode base64 image
        try:
            # Remove data URL prefix if present
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            
            image_bytes = base64.b64decode(image_data)
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return jsonify({'error': 'Invalid image data'}), 400
                
        except Exception as e:
            return jsonify({'error': 'Failed to process image'}), 400
        
        # Perform face verification
        result = face_service.verify_face(voter.id, image)
        
        if result['success']:
            if result['verified']:
                return jsonify({
                    'verified': True,
                    'confidence': result['confidence'],
                    'message': 'Face verification successful',
                    'voter': voter.to_dict()
                }), 200
            else:
                return jsonify({
                    'verified': False,
                    'confidence': result['confidence'],
                    'message': 'Face verification failed'
                }), 200
        else:
            return jsonify({'error': result['error']}), 400
            
    except Exception as e:
        return jsonify({'error': 'Face verification failed'}), 500

@face_bp.route('/enroll', methods=['POST'])
def enroll_face():
    try:
        data = request.get_json()
        
        voter_id = data.get('voter_id')
        image_data = data.get('image_data')
        
        if not voter_id or not image_data:
            return jsonify({'error': 'Voter ID and image data are required'}), 400
        
        # Find voter
        voter = Voter.query.filter_by(voter_id=voter_id).first()
        if not voter:
            return jsonify({'error': 'Voter not found'}), 404
        
        # Decode base64 image
        try:
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            
            image_bytes = base64.b64decode(image_data)
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return jsonify({'error': 'Invalid image data'}), 400
                
        except Exception as e:
            return jsonify({'error': 'Failed to process image'}), 400
        
        # Enroll face
        result = face_service.enroll_face(voter.id, image)
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': 'Face enrolled successfully',
                'embedding_id': result['embedding_id']
            }), 201
        else:
            return jsonify({'error': result['error']}), 400
            
    except Exception as e:
        return jsonify({'error': 'Face enrollment failed'}), 500

@face_bp.route('/status/<voter_id>', methods=['GET'])
def get_face_status(voter_id):
    """Check if voter has face data enrolled"""
    try:
        voter = Voter.query.filter_by(voter_id=voter_id).first()
        if not voter:
            return jsonify({'error': 'Voter not found'}), 404
        
        has_face_data = FaceEmbedding.query.filter_by(voter_id=voter.id).first() is not None
        
        return jsonify({
            'has_face_data': has_face_data,
            'voter_id': voter_id
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to check face status'}), 500