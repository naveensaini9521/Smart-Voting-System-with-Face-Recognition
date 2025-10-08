from flask import Blueprint, request, jsonify
from smart_app.backend.extensions import db
from smart_app.backend.models import OTP
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
        
        if not otp_type or not value:
            return jsonify({'message': 'Type and value are required'}), 400
        
        # Generate OTP
        otp_code = generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        
        # Store OTP in database
        new_otp = OTP(
            phone=value if otp_type == 'phone' else None,
            email=value if otp_type == 'email' else None,
            otp=otp_code,
            expires_at=expires_at
        )
        
        db.session.add(new_otp)
        db.session.commit()
        
        # In production, integrate with SMS/Email service here
        # For demo, we'll return the OTP
        print(f"OTP for {value}: {otp_code}")  # Remove this in production
        
        return jsonify({
            'message': 'OTP sent successfully',
            'otp': otp_code  # Remove this in production
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to send OTP'}), 500

@otp_bp.route('/verify', methods=['POST'])
def verify_otp():
    try:
        data = request.get_json()
        value = data.get('value', '').strip()
        otp_code = data.get('otp', '').strip()
        
        if not value or not otp_code:
            return jsonify({'message': 'Value and OTP are required'}), 400
        
        # Find the most recent OTP for this value
        otp_record = OTP.query.filter(
            ((OTP.phone == value) | (OTP.email == value)) &
            (OTP.otp == otp_code) &
            (OTP.expires_at > datetime.utcnow()) &
            (OTP.is_verified == False)
        ).order_by(OTP.created_at.desc()).first()
        
        if not otp_record:
            return jsonify({'message': 'Invalid or expired OTP'}), 400
        
        # Mark OTP as verified
        otp_record.is_verified = True
        db.session.commit()
        
        return jsonify({'message': 'OTP verified successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'OTP verification failed'}), 500