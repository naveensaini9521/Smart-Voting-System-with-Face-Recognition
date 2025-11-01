from flask import Blueprint, request, jsonify
from smart_app.backend.extensions import mongo
from smart_app.backend.mongo_models import OTP
import random
from datetime import datetime, timedelta

otp_bp = Blueprint('otp', __name__)

def generate_otp():
    return str(random.randint(100000, 999999))

@otp_bp.route('/send', methods=['POST'])
def send_otp():
    try:
        data = request.get_json()
        otp_type = data.get('type')  # 'phone' or 'email'
        value = data.get('value', '').strip()
        purpose = data.get('purpose', 'verification')
        
        if not otp_type or not value:
            return jsonify({'message': 'Type and value are required'}), 400
        
        # Generate OTP
        otp_code = generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        
        # Store OTP in MongoDB
        otp_data = {
            'email': value if otp_type == 'email' else None,
            'phone': value if otp_type == 'phone' else None,
            'otp_code': otp_code,
            'purpose': purpose,
            'expires_at': expires_at,
            'is_used': False
        }
        
        otp_id = OTP.create(otp_data)
        
        # In production, integrate with SMS/Email service here
        # For demo, we'll return the OTP
        print(f"OTP for {value}: {otp_code}")  # Remove this in production
        
        return jsonify({
            'message': 'OTP sent successfully',
            'otp_id': str(otp_id),
            'otp': otp_code  # Remove this in production
        }), 200
        
    except Exception as e:
        return jsonify({'message': 'Failed to send OTP'}), 500

@otp_bp.route('/verify', methods=['POST'])
def verify_otp():
    try:
        data = request.get_json()
        value = data.get('value', '').strip()
        otp_code = data.get('otp', '').strip()
        purpose = data.get('purpose', 'verification')
        
        if not value or not otp_code:
            return jsonify({'message': 'Value and OTP are required'}), 400
        
        # Find the most recent OTP for this value
        otp_record = OTP.get_collection().find_one({
            '$or': [{'email': value}, {'phone': value}],
            'otp_code': otp_code,
            'purpose': purpose,
            'expires_at': {'$gt': datetime.utcnow()},
            'is_used': False
        }, sort=[('created_at', -1)])
        
        if not otp_record:
            return jsonify({'message': 'Invalid or expired OTP'}), 400
        
        # Mark OTP as verified
        OTP.get_collection().update_one(
            {'_id': otp_record['_id']},
            {'$set': {'is_used': True, 'updated_at': datetime.utcnow()}}
        )
        
        return jsonify({'message': 'OTP verified successfully'}), 200
        
    except Exception as e:
        return jsonify({'message': 'OTP verification failed'}), 500

@otp_bp.route('/resend', methods=['POST'])
def resend_otp():
    try:
        data = request.get_json()
        otp_type = data.get('type')
        value = data.get('value', '').strip()
        purpose = data.get('purpose', 'verification')
        
        if not otp_type or not value:
            return jsonify({'message': 'Type and value are required'}), 400
        
        # Generate new OTP
        otp_code = generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        
        # Store new OTP in MongoDB
        otp_data = {
            'email': value if otp_type == 'email' else None,
            'phone': value if otp_type == 'phone' else None,
            'otp_code': otp_code,
            'purpose': purpose,
            'expires_at': expires_at,
            'is_used': False
        }
        
        otp_id = OTP.create(otp_data)
        
        print(f"Resent OTP for {value}: {otp_code}")  # Remove this in production
        
        return jsonify({
            'message': 'OTP resent successfully',
            'otp_id': str(otp_id),
            'otp': otp_code  # Remove this in production
        }), 200
        
    except Exception as e:
        return jsonify({'message': 'Failed to resend OTP'}), 500

@otp_bp.route('/cleanup-expired', methods=['POST'])
def cleanup_expired_otps():
    """Clean up expired OTPs (admin function)"""
    try:
        result = OTP.get_collection().delete_many({
            'expires_at': {'$lt': datetime.utcnow()}
        })
        
        return jsonify({
            'message': f'Cleaned up {result.deleted_count} expired OTPs',
            'deleted_count': result.deleted_count
        }), 200
        
    except Exception as e:
        return jsonify({'message': 'Failed to cleanup OTPs'}), 500