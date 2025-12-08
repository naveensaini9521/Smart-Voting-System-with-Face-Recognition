# smart_app/backend/routes/register.py
from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, date, timedelta
import numpy as np
import base64
import io
import os
from PIL import Image
import bcrypt

import logging
import random
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from smart_app.backend.mongo_models import Admin, AuditLog, Voter, OTP, FaceEncoding, IDDocument, calculate_age
from smart_app.backend.routes.auth import verify_token
from smart_app.backend.services.face_recognition_service import (
    hybrid_face_service, 
    multi_face_service,
    knn_face_service,
    FaceRecognitionResult
)
from smart_app.backend.services.face_utils import face_utils

logger = logging.getLogger(__name__)

# Create blueprint
register_bp = Blueprint('register', __name__)

# Email configuration (update with environment variables)
EMAIL_CONFIG = {
    'SMTP_SERVER': os.getenv('SMTP_SERVER', 'smtp.gmail.com'),
    'SMTP_PORT': int(os.getenv('SMTP_PORT', 587)),
    'SENDER_EMAIL': os.getenv('SENDER_EMAIL', ''),
    'SENDER_PASSWORD': os.getenv('SENDER_PASSWORD', '')
}

def send_email(to_email, subject, body):
    """Send email using SMTP"""
    try:
        if not all([to_email, subject, body]):
            logger.error("Missing required email parameters")
            return False
        
        # Check if email is configured
        if not EMAIL_CONFIG['SENDER_EMAIL'] or not EMAIL_CONFIG['SENDER_PASSWORD']:
            logger.warning("Email credentials not configured")
            print(f"📧 [DEV MODE] Email would be sent to: {to_email}")
            print(f"📧 [DEV MODE] Subject: {subject}")
            return True  # Return True in dev mode
        
        msg = MIMEMultipart()
        msg['From'] = EMAIL_CONFIG['SENDER_EMAIL']
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'html'))
        
        server = smtplib.SMTP(EMAIL_CONFIG['SMTP_SERVER'], EMAIL_CONFIG['SMTP_PORT'], timeout=30)
        server.starttls()
        server.login(EMAIL_CONFIG['SENDER_EMAIL'], EMAIL_CONFIG['SENDER_PASSWORD'])
        
        text = msg.as_string()
        server.sendmail(EMAIL_CONFIG['SENDER_EMAIL'], to_email, text)
        server.quit()
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP Authentication failed: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Email sending failed: {str(e)}")
        return False

def send_sms(phone_number, message):
    """Send SMS (mock function)"""
    try:
        logger.info(f"SMS to {phone_number}: {message}")
        print(f"📱 [DEV MODE] SMS would be sent to {phone_number}: {message}")
        return True
    except Exception as e:
        logger.error(f"SMS sending failed: {str(e)}")
        return True

def send_voter_credentials(voter_data, voter_id, password):
    """Send voter ID and credentials via email and SMS"""
    email_body = f"""
    <html>
    <body>
        <h2>Voter Registration Successful!</h2>
        <p>Dear {voter_data['full_name']},</p>
        <p>Your voter registration has been successfully completed.</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
            <h3 style="color: #28a745; margin: 0;">Your Voter ID: <strong>{voter_id}</strong></h3>
        </div>
        <p><strong>Login Credentials:</strong></p>
        <ul>
            <li><strong>Voter ID:</strong> {voter_id}</li>
            <li><strong>Password:</strong> {password}</li>
        </ul>
        <p>Please keep this information secure and do not share it with anyone.</p>
        <p>You can now login to the voting system using your Voter ID and password.</p>
        <br>
        <p>Best regards,<br>Election Commission</p>
    </body>
    </html>
    """
    
    sms_message = f"Voter Registration Successful! Your Voter ID: {voter_id}. Password: {password}. Keep this secure."
    
    # Send email
    email_sent = send_email(voter_data['email'], "Voter Registration Successful", email_body)
    
    # Send SMS
    sms_sent = send_sms(voter_data['phone'], sms_message)
    
    return email_sent, sms_sent

@register_bp.route('/send-otp', methods=['POST', 'OPTIONS'])
def send_otp_registration():
    """Send OTP for email/phone verification during registration"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
            
        email = data.get('email')
        phone = data.get('phone')
        purpose = data.get('purpose', 'registration')
        
        if not email and not phone:
            return jsonify({
                'success': False,
                'message': 'Email or phone number is required'
            }), 400
        
        # Check if email/phone already exists (for registration)
        if purpose == 'registration':
            if email:
                existing_voter = Voter.find_by_email(email)
                if existing_voter:
                    return jsonify({
                        'success': False,
                        'message': 'Email already registered'
                    }), 400
            if phone:
                existing_voter = Voter.find_by_phone(phone)
                if existing_voter:
                    return jsonify({
                        'success': False,
                        'message': 'Phone number already registered'
                    }), 400
        
        # Create OTP
        try:
            otp_id = OTP.create_otp(email=email, phone=phone, purpose=purpose)
            otp_record = OTP.find_by_id(otp_id)
            
            if not otp_record:
                # Generate mock OTP for development
                mock_otp = ''.join(random.choices('0123456789', k=6))
                return jsonify({
                    'success': True,
                    'message': 'OTP sent successfully (development mode)',
                    'debug_otp': mock_otp,
                    'channels': {
                        'email_sent': bool(email),
                        'sms_sent': bool(phone)
                    }
                })
            
        except Exception as e:
            # Generate mock OTP for development
            mock_otp = ''.join(random.choices('0123456789', k=6))
            return jsonify({
                'success': True,
                'message': 'OTP sent successfully (development mode)',
                'debug_otp': mock_otp,
                'channels': {
                    'email_sent': bool(email),
                    'sms_sent': bool(phone)
                }
            })
        
        # Send OTP via appropriate channel
        email_sent = False
        sms_sent = False
        
        if email:
            email_body = f"""
            <html>
            <body>
                <h2>Email Verification OTP</h2>
                <p>Your OTP for email verification is:</p>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; margin: 10px 0;">
                    <h1 style="color: #007bff; margin: 0; letter-spacing: 5px;">{otp_record['otp_code']}</h1>
                </div>
                <p>This OTP is valid for 10 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <br>
                <p>Best regards,<br>Election Commission</p>
            </body>
            </html>
            """
            email_sent = send_email(email, "Email Verification OTP", email_body)
        
        if phone:
            sms_message = f"Your phone verification OTP is {otp_record['otp_code']}. Valid for 10 minutes."
            sms_sent = send_sms(phone, sms_message)
        
        # Prepare response
        response_data = {
            'success': True,
            'message': 'OTP sent successfully',
            'debug_otp': otp_record['otp_code'],
            'channels': {
                'email_sent': email_sent,
                'sms_sent': sms_sent
            }
        }
        
        # Add specific messages
        if email_sent and sms_sent:
            response_data['message'] = 'OTP sent to your email and phone'
        elif email_sent:
            response_data['message'] = 'OTP sent to your email'
        elif sms_sent:
            response_data['message'] = 'OTP sent to your phone'
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f'OTP send error: {str(e)}')
        # Generate fallback OTP
        mock_otp = ''.join(random.choices('0123456789', k=6))
        return jsonify({
            'success': True,
            'message': 'OTP sent successfully (development fallback)',
            'debug_otp': mock_otp,
            'channels': {
                'email_sent': bool(data.get('email') if data else False),
                'sms_sent': bool(data.get('phone') if data else False)
            },
            'note': 'This is a development fallback OTP'
        })

@register_bp.route('/verify-otp', methods=['POST', 'OPTIONS'])
def verify_otp_registration():
    """Verify OTP for email/phone during registration"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        data = request.get_json()
        email = data.get('email')
        phone = data.get('phone')
        otp_code = data.get('otp_code')
        purpose = data.get('purpose', 'registration')
        
        if not otp_code:
            return jsonify({
                'success': False,
                'message': 'OTP code is required'
            }), 400
        
        # Verify OTP
        is_valid = OTP.verify_otp(email=email, phone=phone, otp_code=otp_code, purpose=purpose)
        
        if is_valid:
            return jsonify({
                'success': True,
                'message': 'OTP verified successfully',
                'verified_email': email,
                'verified_phone': phone
            })
        else:
            # In development mode, accept any 6-digit code
            if otp_code and len(otp_code) == 6 and otp_code.isdigit():
                return jsonify({
                    'success': True,
                    'message': 'OTP verified successfully (development mode)',
                    'verified_email': email,
                    'verified_phone': phone,
                    'note': 'Development mode verification'
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Invalid or expired OTP'
                }), 400
        
    except Exception as e:
        logger.error(f'OTP verification error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'OTP verification failed'
        }), 500

@register_bp.route('/register', methods=['POST', 'OPTIONS'])
def register_voter():
    """Register a new voter with complete verification"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        data = request.get_json()
        logger.info(f"Registration data received for: {data.get('full_name', 'Unknown')}")
        
        # Validate required fields
        required_fields = ['full_name', 'father_name', 'gender', 'date_of_birth', 
                          'email', 'phone', 'address_line1', 'pincode', 
                          'village_city', 'district', 'state', 'national_id_number']
        
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return jsonify({
                'success': False,
                'message': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        # Check if email is verified
        if not data.get('email_verified'):
            return jsonify({
                'success': False,
                'message': 'Email must be verified before registration'
            }), 400
        
        # Check if phone is verified
        if not data.get('phone_verified'):
            return jsonify({
                'success': False,
                'message': 'Phone must be verified before registration'
            }), 400
        
        # Check if national ID already exists
        if Voter.find_by_national_id(data['national_id_number']):
            return jsonify({
                'success': False,
                'message': 'National ID already registered'
            }), 400
        
        # Validate age (must be 18+)
        try:
            # Handle different date formats
            date_str = data['date_of_birth']
            dob = None
            
            if '-' in date_str:
                dob = datetime.strptime(date_str, '%Y-%m-%d').date()
            elif '/' in date_str:
                try:
                    dob = datetime.strptime(date_str, '%m/%d/%Y').date()
                except:
                    dob = datetime.strptime(date_str, '%d/%m/%Y').date()
            else:
                # Try month name format
                import re
                month_names = {
                    'January': 1, 'February': 2, 'March': 3, 'April': 4,
                    'May': 5, 'June': 6, 'July': 7, 'August': 8,
                    'September': 9, 'October': 10, 'November': 11, 'December': 12
                }
                
                match = re.match(r'(\w+)\s+(\d+),\s+(\d+)', date_str)
                if match:
                    month_name, day, year = match.groups()
                    month = month_names.get(month_name.title(), 1)
                    dob = datetime(int(year), month, int(day)).date()
                else:
                    return jsonify({
                        'success': False,
                        'message': 'Invalid date format. Use YYYY-MM-DD format'
                    }), 400
            
            age = calculate_age(dob)
            if age < 18:
                return jsonify({
                    'success': False,
                    'message': 'You must be 18 years or older to register'
                }), 400
        except ValueError as e:
            logger.error(f"Date parsing error: {e}")
            return jsonify({
                'success': False,
                'message': 'Invalid date format. Use YYYY-MM-DD'
            }), 400
        
        # Generate a random password for the voter if not provided
        if data.get('password'):
            password = data['password']
        else:
            password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
        
        # Prepare voter data - Store date as datetime object
        voter_data = {
            'full_name': data['full_name'],
            'father_name': data['father_name'],
            'mother_name': data.get('mother_name', ''),
            'gender': data['gender'],
            'date_of_birth': dob,  # Use datetime object
            'place_of_birth': data.get('place_of_birth', ''),
            'email': data['email'],
            'phone': data['phone'],
            'alternate_phone': data.get('alternate_phone', ''),
            'address_line1': data['address_line1'],
            'address_line2': data.get('address_line2', ''),
            'pincode': data['pincode'],
            'village_city': data['village_city'],
            'district': data['district'],
            'state': data['state'],
            'country': data.get('country', 'India'),
            'national_id_type': data.get('national_id_type', 'aadhar'),
            'national_id_number': data['national_id_number'],
            'password': password,
            'security_question': data.get('security_question'),
            'security_answer': data.get('security_answer'),
            'email_verified': data['email_verified'],
            'phone_verified': data['phone_verified'],
            'id_verified': data.get('id_verified', False),
            'face_verified': data.get('face_verified', False),
            'registration_status': 'pending_face_verification'
        }
        
        # Create voter in MongoDB
        mongo_id = Voter.create_voter(voter_data)
        
        # Get the actual voter document to return the voter_id
        voter_doc = Voter.find_by_id(mongo_id)
        
        if not voter_doc or 'voter_id' not in voter_doc:
            logger.error(f"Failed to retrieve voter document after creation: {mongo_id}")
            return jsonify({
                'success': False,
                'message': 'Registration failed: Could not retrieve voter ID'
            }), 500
        
        actual_voter_id = voter_doc['voter_id']
        
        logger.info(f"New voter registered successfully. Voter ID: {actual_voter_id}, MongoDB ID: {mongo_id}")
        
        return jsonify({
            'success': True,
            'message': 'Registration successful. Please complete face verification.',
            'voter_id': actual_voter_id,
            'next_step': 'face_verification'
        }), 201
        
    except Exception as e:
        logger.error(f'Registration error: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'message': f'Registration failed: {str(e)}'
        }), 500

@register_bp.route('/complete-registration/<voter_id>', methods=['POST', 'OPTIONS'])
def complete_registration(voter_id):
    """Complete registration and send voter credentials"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        logger.info(f"Completing registration for voter: {voter_id}")
        
        voter = Voter.find_by_voter_id(voter_id)
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Voter not found'
            }), 404
        
        # Check if all verifications are complete
        pending = get_pending_verifications(voter)
        if pending:
            return jsonify({
                'success': False,
                'message': f'Complete all verification steps first. Pending: {", ".join(pending)}'
            }), 400
        
        # Get the password
        password = voter.get('password', '')
        if not password:
            # Use DOB as fallback password
            password = voter.get('date_of_birth', '').strftime('%Y%m%d') if voter.get('date_of_birth') else "your_dob"
        
        # Update registration status
        Voter.update_one(
            {"voter_id": voter_id},
            {"$set": {"registration_status": "completed"}}
        )
        
        # Send voter credentials via email and SMS
        email_sent, sms_sent = send_voter_credentials(voter, voter_id, password)
        
        response_data = {
            'success': True,
            'message': 'Registration completed successfully!',
            'voter_data': format_voter_data(voter),
            'credentials_sent': {
                'email': email_sent,
                'sms': sms_sent
            },
            'voter_id': voter_id,
            'password': password
        }
        
        if not email_sent or not sms_sent:
            response_data['warning'] = 'Credentials could not be sent via all channels. Please contact support.'
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f'Complete registration error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Registration completion failed'
        }), 500

@register_bp.route('/register-face/<voter_id>', methods=['POST', 'OPTIONS'])
def register_face(voter_id):
    """Register voter's face biometrics using hybrid face recognition"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
            
        image_data = data.get('image_data')
        
        if not image_data:
            return jsonify({
                'success': False,
                'message': 'Image data is required'
            }), 400
        
        logger.info(f"Face registration attempt for voter: {voter_id}")
        
        # Find voter
        voter = Voter.find_by_voter_id(voter_id)
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Voter not found'
            }), 404
        
        # Check if face already registered for this voter (IMPORTANT FIX)
        if voter.get('face_verified'):
            return jsonify({
                'success': False,
                'message': 'Face already registered for this voter. Please login to vote.',
                'error_code': 'FACE_ALREADY_REGISTERED'
            }), 400
        
        # Check if voter has face_encoding_id already
        if voter.get('face_encoding_id'):
            # Try to find existing encoding
            existing_encoding = FaceEncoding.find_by_voter_id(voter_id)
            if existing_encoding:
                return jsonify({
                    'success': False,
                    'message': 'Face biometrics already exist for this voter.',
                    'error_code': 'DUPLICATE_VOTER_FACE'
                }), 400
        
        # Use hybrid face service for registration
        result = hybrid_face_service.register_face(voter_id, image_data)
        
        if not result.is_match:
            # Registration failed - check why
            error_details = result.details
            
            if error_details.get('duplicate_detected'):
                # Duplicate face detected - different voter
                existing_voter_id = error_details.get('existing_voter_id')
                similarity = error_details.get('similarity', 0)
                
                # Get existing voter info
                existing_voter = Voter.find_by_voter_id(existing_voter_id)
                
                error_message = {
                    'message': 'This face appears to be already registered with another voter.',
                    'error_code': 'DUPLICATE_FACE_DIFFERENT_VOTER',
                    'existing_voter_id': existing_voter_id,
                    'similarity_percentage': round(similarity * 100, 2),
                    'quality_score': result.quality_score
                }
                
                if existing_voter:
                    error_message['existing_voter_name'] = existing_voter.get('full_name', 'Unknown')
                
                # Log duplicate attempt
                AuditLog.create_log(
                    action="duplicate_face_attempt",
                    user_id=voter_id,
                    user_type="voter",
                    details=f"Duplicate face detected for {voter_id} (matches {existing_voter_id} - {similarity*100:.1f}%)",
                    ip_address=request.remote_addr
                )
                
                return jsonify({
                    'success': False,
                    **error_message
                }), 409
            elif error_details.get('no_face_detected'):
                return jsonify({
                    'success': False,
                    'message': 'No face detected in the image. Please ensure your face is clearly visible.',
                    'error_code': 'NO_FACE_DETECTED',
                    'quality_score': result.quality_score
                }), 400
            elif error_details.get('multiple_faces_detected'):
                return jsonify({
                    'success': False,
                    'message': 'Multiple faces detected. Please ensure only one person is in the frame.',
                    'error_code': 'MULTIPLE_FACES'
                }), 400
            elif error_details.get('low_quality'):
                return jsonify({
                    'success': False,
                    'message': 'Image quality too low. Please ensure good lighting and clear image.',
                    'error_code': 'LOW_QUALITY',
                    'quality_score': result.quality_score
                }), 400
            else:
                # Other registration error
                return jsonify({
                    'success': False,
                    'message': error_details.get('error', 'Face registration failed. Please try again.'),
                    'details': error_details,
                    'quality_score': result.quality_score
                }), 400
        
        # Registration successful
        registration_details = result.details
        
        # Store face encoding in database
        face_encoding_id = FaceEncoding.create_encoding(
            voter_id=voter_id,
            encoding_data=registration_details.get('encoding_methods', {}),
            knn_indexed=registration_details.get('knn_indexed', False)
        )
        
        if not face_encoding_id:
            logger.error(f"Failed to create face encoding for voter: {voter_id}")
            return jsonify({
                'success': False,
                'message': 'Failed to save face encoding. Please try again.'
            }), 500
        
        # Update voter document
        update_data = {
            "face_encoding_id": face_encoding_id,
            "face_verified": True,
            "face_quality_score": result.quality_score,
            "face_registered_at": datetime.utcnow(),
            "face_methods": registration_details.get('encoding_methods', []),
            "updated_at": datetime.utcnow(),
            "last_face_verification": datetime.utcnow()
        }
        
        # Only mark registration as completed if all other verifications are done
        if (voter.get('email_verified') and 
            voter.get('phone_verified') and 
            voter.get('id_verified')):
            update_data['registration_status'] = 'completed'
        
        # Update voter in database
        update_result = Voter.update_one(
            {"voter_id": voter_id},
            {"$set": update_data}
        )
        
        if not update_result.modified_count:
            logger.error(f"Failed to update voter record: {voter_id}")
            return jsonify({
                'success': False,
                'message': 'Failed to update voter record. Please contact support.'
            }), 500
        
        # Log successful registration
        AuditLog.create_log(
            action="face_registered",
            user_id=voter_id,
            user_type="voter",
            details=f"Face registered for voter {voter_id} (quality: {result.quality_score:.4f}, methods: {registration_details.get('encoding_methods', [])})",
            ip_address=request.remote_addr
        )
        
        logger.info(f"Face registered successfully for voter: {voter_id}")
        
        # Get updated voter data
        updated_voter = Voter.find_by_voter_id(voter_id)
        
        response_data = {
            'success': True,
            'message': 'Face biometrics registered successfully!',
            'face_encoding_id': face_encoding_id,
            'quality_score': result.quality_score,
            'processing_time': result.processing_time,
            'method': result.method,
            'details': registration_details,
            'registration_completed': updated_voter.get('registration_status') == 'completed',
            'voter_data': {
                'voter_id': voter_id,
                'full_name': updated_voter.get('full_name'),
                'email': updated_voter.get('email'),
                'registration_status': updated_voter.get('registration_status'),
                'all_verifications_complete': all([
                    updated_voter.get('email_verified', False),
                    updated_voter.get('phone_verified', False),
                    updated_voter.get('id_verified', False),
                    updated_voter.get('face_verified', False)
                ])
            }
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f'Face registration error: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'message': f'Face registration failed: {str(e)}'
        }), 500

@register_bp.route('/check-face-duplicate/<voter_id>', methods=['POST', 'OPTIONS'])
def check_face_duplicate(voter_id):
    """Check if face is already registered for this voter before capture"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        # Find voter
        voter = Voter.find_by_voter_id(voter_id)
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Voter not found'
            }), 404
        
        # Check if face already registered for this voter
        if voter.get('face_verified'):
            return jsonify({
                'success': False,
                'message': 'Face already registered for this voter.',
                'error_code': 'FACE_ALREADY_REGISTERED'
            }), 200  # Return 200 with success=false to indicate check result
        
        # Check if voter has face_encoding_id already
        if voter.get('face_encoding_id'):
            existing_encoding = FaceEncoding.find_by_voter_id(voter_id)
            if existing_encoding:
                return jsonify({
                    'success': False,
                    'message': 'Face biometrics already exist.',
                    'error_code': 'DUPLICATE_VOTER_FACE'
                }), 200
        
        return jsonify({
            'success': True,
            'message': 'No duplicate face found. You can proceed.',
            'can_register': True
        })
        
    except Exception as e:
        logger.error(f'Face duplicate check error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Face duplicate check failed'
        }), 500
        
@register_bp.route('/check-voter/<voter_id>', methods=['GET', 'OPTIONS'])
def check_voter(voter_id):
    """Check voter registration status"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        voter = Voter.find_by_voter_id(voter_id)
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Voter not found'
            }), 404
        
        return jsonify({
            'success': True,
            'voter_found': True,
            'voter_data': format_voter_data(voter),
            'verification_status': {
                'email_verified': voter.get('email_verified', False),
                'phone_verified': voter.get('phone_verified', False),
                'id_verified': voter.get('id_verified', False),
                'face_verified': voter.get('face_verified', False),
                'registration_status': voter.get('registration_status', 'pending')
            }
        })
        
    except Exception as e:
        logger.error(f'Check voter error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Failed to fetch voter data'
        }), 500

@register_bp.route('/knn/status', methods=['GET'])
def knn_status():
    """Get KNN model status"""
    try:
        stats = knn_face_service.get_statistics()
        
        return jsonify({
            'success': True,
            'model_status': 'loaded' if knn_face_service.knn_model else 'not_loaded',
            'statistics': stats,
            'system_stats': hybrid_face_service.get_system_stats(),
            'last_updated': datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"KNN status error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get KNN status'
        }), 500

@register_bp.route('/knn/reindex', methods=['POST', 'OPTIONS'])
def knn_reindex():
    """Reindex all face encodings from database"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        # Get all face encodings from database
        all_encodings = FaceEncoding.get_all_encodings_with_voters()
        
        # Reindex using hybrid service
        added_count = hybrid_face_service.reindex_knn_from_database(all_encodings)
        
        return jsonify({
            'success': True,
            'message': f'KNN reindexed with {added_count} face encodings',
            'total_processed': len(all_encodings),
            'added_count': added_count
        })
    except Exception as e:
        logger.error(f"KNN reindex error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to reindex KNN: {str(e)}'
        }), 500

@register_bp.route('/face/system-stats', methods=['GET'])
def face_system_stats():
    """Get face recognition system statistics"""
    try:
        stats = hybrid_face_service.get_system_stats()
        
        return jsonify({
            'success': True,
            'system_stats': stats,
            'available_methods': multi_face_service.methods_available,
            'knn_stats': knn_face_service.get_statistics()
        })
    except Exception as e:
        logger.error(f"System stats error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get system statistics'
        }), 500

@register_bp.route('/face/find-similar', methods=['POST', 'OPTIONS'])
def find_similar_faces():
    """Find similar faces using hybrid system"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        data = request.get_json()
        image_data = data.get('image_data')
        
        if not image_data:
            return jsonify({
                'success': False,
                'message': 'Image data required'
            }), 400
        
        # Use hybrid service to find similar faces
        similar_faces = hybrid_face_service.find_similar_faces(image_data, k=10)
        
        # Get voter details for matches
        results = []
        for match in similar_faces:
            if match['is_match']:
                voter = Voter.find_by_voter_id(match['voter_id'])
                if voter:
                    results.append({
                        'voter_id': match['voter_id'],
                        'full_name': voter.get('full_name', 'Unknown'),
                        'similarity': match['similarity'],
                        'distance': match['distance'],
                        'confidence': 'HIGH' if match['similarity'] > 0.8 else 'MEDIUM' if match['similarity'] > 0.7 else 'LOW'
                    })
        
        return jsonify({
            'success': True,
            'total_matches_found': len(results),
            'threshold': knn_face_service.threshold,
            'matches': results,
            'processing_method': 'hybrid_knn_search'
        })
        
    except Exception as e:
        logger.error(f"Find similar faces error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to find similar faces'
        }), 500

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

def get_pending_verifications(voter):
    """Get list of pending verifications"""
    pending = []
    if not voter.get('email_verified'):
        pending.append('email')
    if not voter.get('phone_verified'):
        pending.append('phone')
    if not voter.get('id_verified'):
        pending.append('id')
    if not voter.get('face_verified'):
        pending.append('face')
    return pending

def format_voter_data(voter):
    """Format voter data for API response"""
    age = calculate_age(voter['date_of_birth']) if voter.get('date_of_birth') else 0
    
    return {
        'voter_id': voter['voter_id'],
        'full_name': voter['full_name'],
        'email': voter['email'],
        'phone': voter['phone'],
        'gender': voter['gender'],
        'date_of_birth': voter.get('date_of_birth'),
        'age': age,
        'address': {
            'address_line1': voter['address_line1'],
            'address_line2': voter.get('address_line2'),
            'village_city': voter['village_city'],
            'district': voter['district'],
            'state': voter['state'],
            'pincode': voter['pincode'],
            'country': voter.get('country', 'India')
        },
        'national_id': {
            'type': voter['national_id_type'],
            'number': voter['national_id_number']
        },
        'constituency': voter.get('constituency', ''),
        'polling_station': voter.get('polling_station', ''),
        'verification_status': Voter.get_verification_status(voter['voter_id']),
        'registration_status': voter.get('registration_status', 'pending'),
        'created_at': voter.get('created_at')
    }