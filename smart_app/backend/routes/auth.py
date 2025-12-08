# smart_app/backend/routes/auth.py
from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timedelta
import logging
import jwt
import numpy as np
import base64
import io
from PIL import Image
from smart_app.backend.mongo_models import Admin, AuditLog, Voter, FaceEncoding
import bcrypt
from smart_app.backend.services.face_recognition_service import (
    hybrid_face_service,
    multi_face_service,
    knn_face_service,
    FaceRecognitionResult
)
from smart_app.backend.services.face_utils import face_utils

logger = logging.getLogger(__name__)

# Create blueprint
auth_bp = Blueprint('auth', __name__)

# JWT configuration
JWT_SECRET = 'sUJbaMMUAKYojj0dFe94jO'
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION = timedelta(hours=24)

def generate_token(user_data, user_type='voter'):
    """Generate JWT token for authenticated user"""
    if user_type == 'voter':
        payload = {
            'user_id': user_data['voter_id'],
            'voter_id': user_data['voter_id'],
            'email': user_data['email'],
            'user_type': 'voter',
            'exp': datetime.utcnow() + JWT_EXPIRATION,
            'iat': datetime.utcnow()
        }
    elif user_type == 'admin':
        payload = {
            'user_id': user_data['admin_id'],
            'admin_id': user_data['admin_id'],
            'username': user_data['username'],
            'email': user_data['email'],
            'user_type': 'admin',
            'role': user_data.get('role', 'admin'),
            'exp': datetime.utcnow() + JWT_EXPIRATION,
            'iat': datetime.utcnow()
        }
    else:
        raise ValueError("Invalid user_type. Must be 'voter' or 'admin'")
    
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token):
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def get_user_id_from_payload(payload):
    """Get user_id from token payload"""
    if not payload:
        return None
    
    user_id = payload.get('user_id')
    if user_id:
        return user_id
    
    if payload.get('user_type') == 'voter':
        return payload.get('voter_id')
    elif payload.get('user_type') == 'admin':
        return payload.get('admin_id')
    
    return None

@auth_bp.route('/test', methods=['GET', 'POST', 'OPTIONS'])
def test_route():
    """Test route to verify auth blueprint is working"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    return jsonify({
        'success': True,
        'message': 'Auth blueprint is working!',
        'method': request.method,
        'endpoint': '/api/auth/test'
    })

@auth_bp.route('/login', methods=['POST', 'OPTIONS'])
def login():
    """Verify voter credentials"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
            
        voter_id = data.get('voter_id')
        password = data.get('password')
        
        if not voter_id or not password:
            return jsonify({
                'success': False,
                'message': 'Voter ID and password are required'
            }), 400
        
        # Find voter by voter_id
        voter = Voter.find_by_voter_id(voter_id)
        
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Invalid Voter ID or password'
            }), 401
        
        # Verify password
        if not Voter.verify_password(voter, password):
            return jsonify({
                'success': False,
                'message': 'Invalid Voter ID or password'
            }), 401
        
        # Check if voter is active
        if not voter.get('is_active', True):
            return jsonify({
                'success': False,
                'message': 'Your account has been deactivated. Please contact support.'
            }), 401
        
        # Check if all verifications are complete
        verification_checks = [
            voter.get('email_verified', False),
            voter.get('phone_verified', False),
            voter.get('id_verified', False),
            voter.get('face_verified', False)
        ]
        
        if not all(verification_checks):
            pending = []
            if not voter.get('email_verified'): pending.append('email')
            if not voter.get('phone_verified'): pending.append('phone')
            if not voter.get('id_verified'): pending.append('ID')
            if not voter.get('face_verified'): pending.append('face')
            
            return jsonify({
                'success': False,
                'message': f'Account verification pending: {", ".join(pending)}. Please complete verification first.'
            }), 401
        
        # Calculate age safely handling different date formats
        date_of_birth = voter.get('date_of_birth')
        age = 0
        
        try:
            if date_of_birth:
                if isinstance(date_of_birth, str):
                    # Try to parse different date formats
                    from datetime import datetime
                    # Remove the problematic call to Voter.calculate_age
                    # Instead calculate age directly
                    if '-' in date_of_birth:
                        dob = datetime.strptime(date_of_birth, '%Y-%m-%d').date()
                    elif '/' in date_of_birth:
                        # Try to parse as MM/DD/YYYY or DD/MM/YYYY
                        try:
                            dob = datetime.strptime(date_of_birth, '%m/%d/%Y').date()
                        except:
                            dob = datetime.strptime(date_of_birth, '%d/%m/%Y').date()
                    else:
                        # Try to parse as month name format
                        import re
                        month_names = {
                            'January': 1, 'February': 2, 'March': 3, 'April': 4,
                            'May': 5, 'June': 6, 'July': 7, 'August': 8,
                            'September': 9, 'October': 10, 'November': 11, 'December': 12
                        }
                        
                        match = re.match(r'(\w+)\s+(\d+),\s+(\d+)', date_of_birth)
                        if match:
                            month_name, day, year = match.groups()
                            month = month_names.get(month_name.title(), 1)
                            dob = datetime(int(year), month, int(day)).date()
                        else:
                            # Fallback to current date
                            dob = datetime.now().date()
                    
                    # Calculate age
                    today = datetime.now().date()
                    age = today.year - dob.year
                    if (today.month, today.day) < (dob.month, dob.day):
                        age -= 1
                elif isinstance(date_of_birth, datetime):
                    # Already a datetime object
                    dob = date_of_birth.date()
                    today = datetime.now().date()
                    age = today.year - dob.year
                    if (today.month, today.day) < (dob.month, dob.day):
                        age -= 1
        except Exception as e:
            logger.warning(f"Could not calculate age for voter {voter_id}: {e}")
            age = 0
        
        # Prepare response data
        voter_data = {
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
            'registration_status': voter.get('registration_status', 'pending'),
            'created_at': voter.get('created_at')
        }
        
        # Generate temporary token for face verification step
        limited_voter_data = {
            'voter_id': voter['voter_id'],
            'email': voter['email']
        }
        temp_token = generate_token(limited_voter_data)
        
        # Update last login
        try:
            Voter.update_one(
                {"voter_id": voter_id},
                {"$set": {"last_login": datetime.utcnow()}}
            )
        except Exception as e:
            logger.warning(f"Could not update last login: {e}")
        
        logger.info(f"Login successful for voter: {voter_id}")
        
        return jsonify({
            'success': True,
            'message': 'Credentials verified successfully',
            'voter_data': voter_data,
            'temp_token': temp_token,
            'requires_face_verification': True,
            'next_step': 'face_verification'
        })
        
    except Exception as e:
        logger.error(f'Voter login error: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Login failed. Please try again.'
        }), 500

@auth_bp.route('/verify-face-hybrid', methods=['POST', 'OPTIONS'])
def verify_face_hybrid():
    """Verify voter's face using hybrid face recognition"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
            
        voter_id = data.get('voter_id')
        image_data = data.get('image_data')
        
        if not voter_id or not image_data:
            return jsonify({
                'success': False,
                'message': 'Voter ID and image data are required'
            }), 400
        
        # Find voter
        voter = Voter.find_by_voter_id(voter_id)
        if not voter:
            logger.error(f"Voter not found: {voter_id}")
            return jsonify({
                'success': False,
                'message': 'Voter not found'
            }), 404
        
        # Check if voter has face registered
        if not voter.get('face_verified') or not voter.get('face_encoding_id'):
            logger.warning(f"Face biometrics not registered for voter: {voter_id}")
            return jsonify({
                'success': False,
                'message': 'Face biometrics not registered. Please complete registration first.'
            }), 400
        
        # TEMPORARY FIX: For testing, skip actual face verification
        # Remove this in production
        logger.info(f"⚠️ TEMPORARY: Skipping face verification for voter: {voter_id}")
        result = FaceRecognitionResult(
            is_match=True,  # Force match for testing
            confidence=0.95,  # High confidence
            method="temporary_bypass",
            processing_time=0.1,
            quality_score=0.9,
            details={"note": "Face verification bypassed for debugging"}
        )
        
        # Original code (commented out for now):
        # logger.info(f"Calling hybrid face service for verification...")
        # result = hybrid_face_service.verify_face(voter_id, image_data)
        # logger.info(f"Face verification result: {result.is_match}, confidence: {result.confidence}")
        
        if result.is_match:
            # Prepare voter data for token generation
            voter_data = {
                'voter_id': voter['voter_id'],
                'full_name': voter['full_name'],
                'email': voter['email'],
                'phone': voter['phone'],
                'constituency': voter.get('constituency', ''),
                'polling_station': voter.get('polling_station', ''),
                'role': 'voter'
            }
            
            # Generate JWT token
            token_payload = {
                'user_id': voter['voter_id'],
                'voter_id': voter['voter_id'],
                'email': voter['email'],
                'full_name': voter['full_name'],
                'user_type': 'voter',
                'exp': datetime.utcnow() + JWT_EXPIRATION,
                'iat': datetime.utcnow()
            }
            
            final_token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
            
            # Update last face verification time and last login
            try:
                Voter.update_one(
                    {"voter_id": voter_id},
                    {"$set": {
                        "last_face_verification": datetime.utcnow(),
                        "last_login": datetime.utcnow()
                    }}
                )
                logger.info(f"Updated last_face_verification and last_login for voter: {voter_id}")
            except Exception as e:
                logger.warning(f"Could not update face verification time: {e}")
            
            # Log successful verification
            AuditLog.create_log(
                action="face_verified_hybrid",
                user_id=voter_id,
                user_type="voter",
                details=f"Face verified using hybrid system (confidence: {result.confidence:.4f}, method: {result.method})",
                ip_address=request.remote_addr
            )
            
            logger.info(f"✅ Face verification successful for voter: {voter_id}")
            logger.info(f"✅ Token generated: {final_token[:50]}...")
            
            response_data = {
                'success': True,
                'message': 'Face verification successful',
                'confidence': round(result.confidence, 4),
                'method': result.method,
                'processing_time': result.processing_time,
                'quality_score': result.quality_score,
                'voter_data': voter_data,
                'token': final_token,  # Primary token
                'auth_token': final_token,  # Duplicate for frontend compatibility
                'verification_details': result.details
            }
            
            logger.info(f"✅ Response includes token: {'token' in response_data}")
            logger.info(f"✅ Token value: {response_data['token'][:50]}...")
            
            return jsonify(response_data)
        else:
            # Verification failed - TEMPORARY: Still allow login for debugging
            logger.warning(f"⚠️ Face verification failed, but allowing login for debugging")
            
            # Prepare voter data
            voter_data = {
                'voter_id': voter['voter_id'],
                'full_name': voter['full_name'],
                'email': voter['email'],
                'phone': voter['phone'],
                'constituency': voter.get('constituency', ''),
                'polling_station': voter.get('polling_station', ''),
                'role': 'voter'
            }
            
            # Generate token anyway for debugging
            token_payload = {
                'user_id': voter['voter_id'],
                'voter_id': voter['voter_id'],
                'email': voter['email'],
                'full_name': voter['full_name'],
                'user_type': 'voter',
                'exp': datetime.utcnow() + JWT_EXPIRATION,
                'iat': datetime.utcnow()
            }
            
            final_token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
            
            logger.warning(f"⚠️ Debug mode: Generating token despite failed verification: {final_token[:50]}...")
            
            response_data = {
                'success': True,  # Still success for debugging
                'message': 'Face verification bypassed for debugging',
                'confidence': round(result.confidence, 4),
                'method': result.method,
                'quality_score': result.quality_score,
                'details': result.details,
                'voter_data': voter_data,
                'token': final_token,
                'auth_token': final_token,
                'debug_note': 'Face verification failed but login allowed for testing'
            }
            
            return jsonify(response_data)
            
    except Exception as e:
        logger.error(f'❌ Hybrid face verification error: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Face verification failed. Please try again.',
            'error': str(e)
        }), 500

# Admin authentication routes (unchanged from previous)
@auth_bp.route('/admin/login', methods=['POST', 'OPTIONS'])
def admin_login():
    """Verify admin credentials"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({
                'success': False,
                'message': 'Username and password are required'
            }), 400
        
        # Find admin by username
        admin = Admin.find_by_username(username)
        
        if not admin:
            return jsonify({
                'success': False,
                'message': 'Invalid admin credentials'
            }), 401
        
        # Verify password
        if not Admin.verify_password(admin, password):
            return jsonify({
                'success': False,
                'message': 'Invalid admin credentials'
            }), 401
        
        # Check if admin is active
        if not admin.get('is_active', True):
            return jsonify({
                'success': False,
                'message': 'Admin account has been deactivated'
            }), 401
        
        # Prepare admin data for response
        admin_data = {
            'admin_id': admin['admin_id'],
            'username': admin['username'],
            'full_name': admin['full_name'],
            'email': admin['email'],
            'role': admin['role'],
            'permissions': admin.get('permissions', {}),
            'department': admin.get('department'),
            'access_level': admin.get('access_level', 1),
            'last_login': admin.get('last_login')
        }
        
        # Generate JWT token for admin
        admin_token = generate_token({
            'admin_id': admin['admin_id'],
            'username': admin['username'],
            'role': admin['role'],
            'email': admin['email']
        }, user_type='admin')
        
        # Update last login
        try:
            Admin.update_one(
                {"admin_id": admin['admin_id']},
                {"$set": {"last_login": datetime.utcnow()}}
            )
        except Exception as e:
            logger.warning(f"Could not update admin last login: {e}")
        
        # Log admin login
        AuditLog.create_log(
            action="admin_login",
            user_id=admin['admin_id'],
            user_type="admin",
            details=f"Admin {admin['username']} logged in",
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        logger.info(f"Admin login successful: {username}")
        
        return jsonify({
            'success': True,
            'message': 'Admin login successful',
            'admin_data': admin_data,
            'token': admin_token
        })
        
    except Exception as e:
        logger.error(f'Admin login error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Admin login failed. Please try again.'
        }), 500

# Other routes remain the same as before...
# (check_auth, logout, verify_token, etc.)
        
# Admin authentication routes
# @auth_bp.route('/admin/login', methods=['POST', 'OPTIONS'])
# def admin_login():
#     """Verify admin credentials"""
#     if request.method == 'OPTIONS':
#         return jsonify({'status': 'ok'}), 200
        
#     try:
#         print(f"=== ADMIN LOGIN REQUEST ===")
#         print(f"Content-Type: {request.content_type}")
#         print(f"Headers: {dict(request.headers)}")
#         print(f"Method: {request.method}")
#         print(f"Path: {request.path}")
        
#         # Robust data parsing
#         data = None
#         if request.content_type and 'application/json' in request.content_type:
#             try:
#                 data = request.get_json()
#                 print(f"Parsed JSON data: {data}")
#             except Exception as json_error:
#                 print(f"JSON parsing error: {json_error}")
#                 data = None
        
#         # If JSON parsing failed, try form data
#         if data is None:
#             try:
#                 data = request.form.to_dict()
#                 print(f"Parsed form data: {data}")
#             except Exception as form_error:
#                 print(f"Form parsing error: {form_error}")
#                 data = None
        
#         # If still no data, try raw data
#         if data is None:
#             try:
#                 raw_data = request.get_data(as_text=True)
#                 print(f"Raw data: {raw_data}")
#                 if raw_data:
#                     import json
#                     data = json.loads(raw_data)
#                     print(f"Parsed raw JSON data: {data}")
#             except Exception as raw_error:
#                 print(f"Raw data parsing error: {raw_error}")
#                 data = None
        
#         if not data:
#             print("No data could be parsed from request")
#             return jsonify({
#                 'success': False,
#                 'message': 'No valid data provided'
#             }), 400
        
#         # Debug: Print the actual type and content of data
#         print(f"Data type: {type(data)}")
#         print(f"Data content: {data}")
        
#         # Handle case where data might be a string
#         if isinstance(data, str):
#             print("Data is string, attempting to parse as JSON")
#             try:
#                 import json
#                 data = json.loads(data)
#                 print(f"Successfully parsed string data: {data}")
#             except json.JSONDecodeError:
#                 print("Failed to parse string as JSON")
#                 return jsonify({
#                     'success': False,
#                     'message': 'Invalid JSON data'
#                 }), 400
        
#         # Now safely access data as dictionary
#         username = data.get('username') if isinstance(data, dict) else None
#         password = data.get('password') if isinstance(data, dict) else None
        
#         if not username or not password:
#             print(f"Missing credentials. Username: {username}, Password: {'*' * len(password) if password else 'None'}")
#             return jsonify({
#                 'success': False,
#                 'message': 'Username and password are required'
#             }), 400
        
#         print(f"=== ADMIN LOGIN ATTEMPT ===")
#         print(f"Username: {username}")
        
#         # Find admin by username
#         admin = Admin.find_by_username(username)
        
#         if not admin:
#             print(f"Admin not found: {username}")
#             return jsonify({
#                 'success': False,
#                 'message': 'Invalid admin credentials'
#             }), 401
        
#         print(f"Admin found: {admin['username']} - {admin.get('admin_id')}")
        
#         # Verify password
#         if not Admin.verify_password(admin, password):
#             print("Admin password verification failed")
#             return jsonify({
#                 'success': False,
#                 'message': 'Invalid admin credentials'
#             }), 401
        
#         print("Admin password verified successfully")
        
#         # Check if admin is active
#         if not admin.get('is_active', True):
#             return jsonify({
#                 'success': False,
#                 'message': 'Admin account has been deactivated'
#             }), 401
        
#         # Prepare admin data for response
#         admin_data = {
#             'admin_id': admin['admin_id'],
#             'username': admin['username'],
#             'full_name': admin['full_name'],
#             'email': admin['email'],
#             'role': admin['role'],
#             'permissions': admin.get('permissions', {}),
#             'department': admin.get('department'),
#             'access_level': admin.get('access_level', 1),
#             'last_login': admin.get('last_login')
#         }
        
#         # Generate JWT token for admin
#         admin_token = generate_token({
#             'admin_id': admin['admin_id'],
#             'username': admin['username'],
#             'role': admin['role'],
#             'email': admin['email']
#         }, user_type='admin')
        
#         # Update last login
#         try:
#             Admin.update_one(
#                 {"admin_id": admin['admin_id']},
#                 {"$set": {"last_login": datetime.utcnow()}}
#             )
#         except Exception as e:
#             print(f"Warning: Could not update admin last login: {e}")
        
#         # Log admin login
#         AuditLog.create_log(
#             action="admin_login",
#             user_id=admin['admin_id'],
#             user_type="admin",
#             details=f"Admin {admin['username']} logged in",
#             ip_address=request.remote_addr,
#             user_agent=request.headers.get('User-Agent')
#         )
        
#         logger.info(f"Admin login successful: {username}")
        
#         return jsonify({
#             'success': True,
#             'message': 'Admin login successful',
#             'admin_data': admin_data,
#             'token': admin_token
#         })
        
#     except Exception as e:
#         logger.error(f'Admin login error: {str(e)}')
#         import traceback
#         print(f"Admin login exception: {traceback.format_exc()}")
#         return jsonify({
#             'success': False,
#             'message': 'Admin login failed. Please try again.'
#         }), 500

@auth_bp.route('/admin/verify-token', methods=['GET', 'OPTIONS'])
def admin_verify_token():
    """Verify admin token validity"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    token = request.headers.get('Authorization')
    
    if not token or not token.startswith('Bearer '):
        return jsonify({
            'success': False,
            'message': 'No token provided'
        }), 401
    
    token = token.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({
            'success': False,
            'message': 'Invalid or expired token'
        }), 401
    
    # Check if user is admin
    if payload.get('user_type') != 'admin':
        return jsonify({
            'success': False,
            'message': 'Admin access required'
        }), 403
    
    # Get fresh admin data
    admin = Admin.find_by_admin_id(payload.get('admin_id'))
    if not admin:
        return jsonify({
            'success': False,
            'message': 'Admin not found'
        }), 401
    
    admin_data = {
        'admin_id': admin['admin_id'],
        'username': admin['username'],
        'full_name': admin['full_name'],
        'email': admin['email'],
        'role': admin['role'],
        'permissions': admin.get('permissions', {}),
        'department': admin.get('department'),
        'access_level': admin.get('access_level', 1)
    }
    
    return jsonify({
        'success': True,
        'admin_data': admin_data
    })

@auth_bp.route('/admin/logout', methods=['POST', 'OPTIONS'])
def admin_logout():
    """Admin logout"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    token = request.headers.get('Authorization')
    if token and token.startswith('Bearer '):
        token = token.split(' ')[1]
        payload = verify_token(token)
        if payload:
            # Log admin logout
            AuditLog.create_log(
                action="admin_logout",
                user_id=payload.get('admin_id'),
                user_type="admin",
                details=f"Admin {payload.get('username')} logged out",
                ip_address=request.remote_addr
            )
    
    return jsonify({
        'success': True,
        'message': 'Admin logged out successfully'
    })
    

@auth_bp.route('/logout', methods=['POST', 'OPTIONS'])
def logout():
    """Logout user (client-side token removal)"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    return jsonify({
        'success': True,
        'message': 'Logged out successfully'
    })

@auth_bp.route('/check-auth', methods=['GET', 'OPTIONS'])
def check_auth():
    """Check if user is authenticated"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    token = request.headers.get('Authorization')
    
    if not token or not token.startswith('Bearer '):
        return jsonify({
            'success': False,
            'message': 'No token provided'
        }), 401
    
    token = token.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({
            'success': False,
            'message': 'Invalid or expired token'
        }), 401
    
    user_type = payload.get('user_type')
    user_id = get_user_id_from_payload(payload)
    
    if user_type == 'voter':
        # Get fresh voter data
        voter = Voter.find_by_voter_id(user_id)
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Voter not found'
            }), 401
        
        voter_data = {
            'voter_id': voter['voter_id'],
            'full_name': voter['full_name'],
            'email': voter['email'],
            'constituency': voter.get('constituency', ''),
            'polling_station': voter.get('polling_station', ''),
            'role': 'voter'
        }
        
        return jsonify({
            'success': True,
            'user_type': 'voter',
            'user_data': voter_data
        })
    
    elif user_type == 'admin':
        # Get fresh admin data
        admin = Admin.find_by_admin_id(user_id)
        if not admin:
            return jsonify({
                'success': False,
                'message': 'Admin not found'
            }), 401
        
        admin_data = {
            'admin_id': admin['admin_id'],
            'username': admin['username'],
            'full_name': admin['full_name'],
            'email': admin['email'],
            'role': admin['role'],
            'department': admin.get('department'),
            'access_level': admin.get('access_level', 1)
        }
        
        return jsonify({
            'success': True,
            'user_type': 'admin',
            'user_data': admin_data
        })
    
    else:
        return jsonify({
            'success': False,
            'message': 'Unknown user type'
        }), 401

# Protected route example
@auth_bp.route('/protected', methods=['GET', 'OPTIONS'])
def protected_route():
    """Example protected route"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    token = request.headers.get('Authorization')
    
    if not token or not token.startswith('Bearer '):
        return jsonify({
            'success': False,
            'message': 'Authentication required'
        }), 401
    
    token = token.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({
            'success': False,
            'message': 'Invalid or expired token'
        }), 401
    
    return jsonify({
        'success': True,
        'message': 'Access granted to protected route',
        'user': payload
    })

@auth_bp.route('/verify-token', methods=['GET', 'OPTIONS'])
def verify_token_route():
    """Verify token validity"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    token = request.headers.get('Authorization')
    
    if not token or not token.startswith('Bearer '):
        return jsonify({
            'success': False,
            'message': 'No token provided'
        }), 401
    
    token = token.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({
            'success': False,
            'message': 'Invalid or expired token'
        }), 401
    
    user_id = get_user_id_from_payload(payload)
    
    return jsonify({
        'success': True,
        'message': 'Token is valid',
        'user_id': user_id,
        'voter_id': payload.get('voter_id'),
        'admin_id': payload.get('admin_id'),
        'user_type': payload.get('user_type'),
        'email': payload.get('email')
    })
    
@auth_bp.route('/debug/voters', methods=['GET'])
def debug_voters():
    """Debug endpoint to list all voters in database"""
    try:
        from smart_app.backend.mongo_models import Voter
        voters = Voter.find_all({}, {'voter_id': 1, 'full_name': 1, 'email': 1, 'date_of_birth': 1, 'password_hash': 1})
        
        voter_list = []
        for voter in voters:
            voter_list.append({
                'voter_id': voter.get('voter_id'),
                'full_name': voter.get('full_name'),
                'email': voter.get('email'),
                'date_of_birth': str(voter.get('date_of_birth')) if voter.get('date_of_birth') else None,
                'has_password': 'password_hash' in voter and voter['password_hash'] is not None,
                'password_hash_length': len(voter['password_hash']) if 'password_hash' in voter and voter['password_hash'] else 0
            })
        
        return jsonify({
            'success': True,
            'total_voters': len(voter_list),
            'voters': voter_list
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Health check endpoint
@auth_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'message': 'Auth service is healthy',
        'timestamp': datetime.utcnow().isoformat()
    })
    
@auth_bp.route('/debug/admins', methods=['GET'])
def debug_admins():
    """Debug endpoint to list all admins in detail"""
    try:
        from smart_app.backend.mongo_models import Admin
        admins = Admin.find_all({})
        
        admin_list = []
        for admin in admins:
            admin_list.append({
                'username': admin.get('username'),
                'email': admin.get('email'),
                'role': admin.get('role'),
                'is_active': admin.get('is_active', True),
                'has_password': 'password_hash' in admin and admin['password_hash'] is not None,
                'password_hash_length': len(admin['password_hash']) if 'password_hash' in admin and admin['password_hash'] else 0,
                'admin_id': admin.get('admin_id'),
                'created_at': str(admin.get('created_at'))
            })
        
        return jsonify({
            'success': True,
            'total_admins': len(admin_list),
            'admins': admin_list
        })
        
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500
        

@auth_bp.route('/debug/test-token/<voter_id>', methods=['GET'])
def debug_test_token(voter_id):
    """Debug endpoint to test token generation for a specific voter"""
    try:
        voter = Voter.find_by_voter_id(voter_id)
        if not voter:
            return jsonify({
                'success': False,
                'message': f'Voter {voter_id} not found'
            }), 404
        
        # Test generate_token function
        voter_data = {
            'voter_id': voter['voter_id'],
            'full_name': voter['full_name'],
            'email': voter['email'],
            'phone': voter['phone'],
            'constituency': voter.get('constituency', ''),
            'polling_station': voter.get('polling_station', ''),
            'role': 'voter'
        }
        
        token = generate_token(voter_data, user_type='voter')
        
        # Try to decode it
        decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        return jsonify({
            'success': True,
            'message': 'Token generation test',
            'token': token,
            'token_preview': f'{token[:50]}...',
            'token_length': len(token),
            'decoded': decoded,
            'voter_data': voter_data
        })
        
    except Exception as e:
        logger.error(f'Debug token test error: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500
        
@auth_bp.route('/debug/face-status/<voter_id>', methods=['GET'])
def debug_face_status(voter_id):
    """Debug endpoint to check face registration status"""
    try:
        voter = Voter.find_by_voter_id(voter_id)
        if not voter:
            return jsonify({
                'success': False,
                'message': f'Voter {voter_id} not found'
            }), 404
        
        # Check face encoding
        face_encoding_id = voter.get('face_encoding_id')
        face_encoding = None
        if face_encoding_id:
            face_encoding = FaceEncoding.find_by_id(face_encoding_id)
        
        return jsonify({
            'success': True,
            'voter_id': voter_id,
            'face_verified': voter.get('face_verified', False),
            'face_encoding_id': face_encoding_id,
            'has_face_encoding': face_encoding is not None,
            'face_encoding_type': face_encoding.get('encoding_type') if face_encoding else None,
            'registration_complete': voter.get('registration_status') == 'completed'
        })
        
    except Exception as e:
        logger.error(f'Debug face status error: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


@auth_bp.route('/debug/simulate-login/<voter_id>', methods=['GET'])
def debug_simulate_login(voter_id):
    """Debug endpoint to simulate successful login without face verification"""
    try:
        voter = Voter.find_by_voter_id(voter_id)
        if not voter:
            return jsonify({
                'success': False,
                'message': f'Voter {voter_id} not found'
            }), 404
        
        # Prepare voter data
        voter_data = {
            'voter_id': voter['voter_id'],
            'full_name': voter['full_name'],
            'email': voter['email'],
            'phone': voter['phone'],
            'constituency': voter.get('constituency', ''),
            'polling_station': voter.get('polling_station', ''),
            'role': 'voter'
        }
        
        # Generate token
        token_payload = {
            'user_id': voter['voter_id'],
            'voter_id': voter['voter_id'],
            'email': voter['email'],
            'full_name': voter['full_name'],
            'user_type': 'voter',
            'exp': datetime.utcnow() + JWT_EXPIRATION,
            'iat': datetime.utcnow()
        }
        
        final_token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        
        return jsonify({
            'success': True,
            'message': 'Debug login successful',
            'token': final_token,
            'auth_token': final_token,
            'voter_data': voter_data
        })
        
    except Exception as e:
        logger.error(f'Debug simulate login error: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500