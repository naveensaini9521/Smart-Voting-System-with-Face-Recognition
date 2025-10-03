from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.user import User
from app.models.voter import Voter
from app.services.face_recognition import face_service
import cloudinary
import cloudinary.uploader
from PIL import Image
import io

face_bp = Blueprint('face', __name__)

@face_bp.route('/register-face', methods=['POST'])
@jwt_required()
def register_face():
    try:
        user_id = get_jwt_identity()
        
        if 'face_image' not in request.files:
            return jsonify({'error': 'No face image provided'}), 400
        
        face_image = request.files['face_image']
        
        if face_image.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Read image data
        image_data = face_image.read()
        
        # Validate face image
        validation_result = face_service.validate_face_image(image_data)
        if not validation_result['is_valid']:
            return jsonify({'error': validation_result['error']}), 400
        
        # Extract face encoding
        face_encoding = face_service.extract_face_encoding(image_data)
        
        # Upload image to Cloudinary
        upload_result = cloudinary.uploader.upload(
            io.BytesIO(image_data),
            folder="voter-faces",
            resource_type="image"
        )
        
        # Update voter with face data
        voter = Voter.query.filter_by(user_id=user_id).first()
        if not voter:
            return jsonify({'error': 'Voter profile not found'}), 404
        
        voter.set_face_encoding(face_encoding)
        voter.face_image_url = upload_result['secure_url']
        voter.is_face_verified = True
        
        db.session.commit()
        
        return jsonify({
            'message': 'Face registered successfully',
            'face_image_url': voter.face_image_url,
            'is_face_verified': voter.is_face_verified
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@face_bp.route('/verify-face', methods=['POST'])
@jwt_required()
def verify_face():
    try:
        user_id = get_jwt_identity()
        
        if 'face_image' not in request.files:
            return jsonify({'error': 'No face image provided'}), 400
        
        face_image = request.files['face_image']
        
        if face_image.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Get voter's stored face encoding
        voter = Voter.query.filter_by(user_id=user_id).first()
        if not voter or not voter.face_encoding:
            return jsonify({'error': 'Face data not found. Please register your face first.'}), 404
        
        # Read image data
        image_data = face_image.read()
        
        # Extract face encoding from live image
        live_encoding = face_service.extract_face_encoding(image_data)
        stored_encoding = voter.get_face_encoding()
        
        # Verify face match
        verification_result = face_service.verify_face(live_encoding, stored_encoding)
        
        return jsonify({
            'verification_result': verification_result,
            'is_verified': verification_result['is_match']
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@face_bp.route('/face-status', methods=['GET'])
@jwt_required()
def get_face_status():
    try:
        user_id = get_jwt_identity()
        voter = Voter.query.filter_by(user_id=user_id).first()
        
        if not voter:
            return jsonify({'error': 'Voter profile not found'}), 404
        
        return jsonify({
            'is_face_verified': voter.is_face_verified,
            'has_face_data': voter.face_encoding is not None,
            'face_image_url': voter.face_image_url
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500