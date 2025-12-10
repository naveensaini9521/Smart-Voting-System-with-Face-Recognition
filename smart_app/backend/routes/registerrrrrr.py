# from flask import Blueprint, request, jsonify, current_app
# from datetime import datetime, date, timedelta
# import numpy as np
# import base64
# import io
# import os
# from PIL import Image
# import bcrypt

# import logging
# import random
# import string
# import smtplib
# from email.mime.text import MIMEText
# from email.mime.multipart import MIMEMultipart

# from smart_app.backend.mongo_models import Admin, AuditLog, Voter, OTP, FaceEncoding, IDDocument, calculate_age
# from smart_app.backend.routes.auth import verify_token
# from smart_app.backend.services.face_recognition_service import face_service
# from smart_app.backend.services.face_utils import face_utils

# logger = logging.getLogger(__name__)

# # Create blueprint
# register_bp = Blueprint('register', __name__)

# # Email configuration
# EMAIL_CONFIG = {
#     'SMTP_SERVER': os.getenv('SMTP_SERVER', 'smtp.gmail.com'),
#     'SMTP_PORT': int(os.getenv('SMTP_PORT', 587)),
#     'SENDER_EMAIL': os.getenv('SENDER_EMAIL', 'ns3120824@gmail.com'),
#     'SENDER_PASSWORD': os.getenv('SENDER_PASSWORD', 'Naveen@123') 
# }

# # In register.py - Update EMAIL_CONFIG and send_email function
# import os
# import smtplib
# from email.mime.text import MIMEText
# from email.mime.multipart import MIMEMultipart
# import logging

# logger = logging.getLogger(__name__)

# # Updated Email configuration with environment variables
# EMAIL_CONFIG = {
#     'SMTP_SERVER': os.getenv('SMTP_SERVER', 'smtp.gmail.com'),
#     'SMTP_PORT': int(os.getenv('SMTP_PORT', 587)),
#     'SENDER_EMAIL': os.getenv('SENDER_EMAIL', 'ns3120824@gmail.com'),
#     'SENDER_PASSWORD': os.getenv('SENDER_PASSWORD', '')  # Remove hardcoded password
# }

# def send_email(to_email, subject, body):
#     """Send email using SMTP with better error handling"""
#     try:
#         # Validate email parameters
#         if not all([to_email, subject, body]):
#             logger.error("Missing required email parameters")
#             return False
        
#         # Validate sender credentials
#         if not EMAIL_CONFIG['SENDER_EMAIL'] or not EMAIL_CONFIG['SENDER_PASSWORD']:
#             logger.error("Email sender credentials not configured")
#             # For development, log this but don't fail
#             print(f"📧 [DEV MODE] Would send email to: {to_email}")
#             print(f"📧 [DEV MODE] Subject: {subject}")
#             print(f"📧 [DEV MODE] Body preview: {body[:100]}...")
#             return True  # Return True in dev mode to continue
        
#         msg = MIMEMultipart()
#         msg['From'] = EMAIL_CONFIG['SENDER_EMAIL']
#         msg['To'] = to_email
#         msg['Subject'] = subject
        
#         msg.attach(MIMEText(body, 'html'))
        
#         # Create SMTP connection with timeout
#         server = smtplib.SMTP(EMAIL_CONFIG['SMTP_SERVER'], EMAIL_CONFIG['SMTP_PORT'], timeout=30)
#         server.starttls()  # Enable security
        
#         # Login with error handling
#         server.login(EMAIL_CONFIG['SENDER_EMAIL'], EMAIL_CONFIG['SENDER_PASSWORD'])
        
#         # Send email
#         text = msg.as_string()
#         server.sendmail(EMAIL_CONFIG['SENDER_EMAIL'], to_email, text)
#         server.quit()
        
#         print(f"Email sent successfully to {to_email}")
#         logger.info(f"Email sent successfully to {to_email}")
#         return True
        
#     except smtplib.SMTPAuthenticationError as e:
#         logger.error(f"SMTP Authentication failed: {str(e)}")
#         print(f"SMTP Authentication failed. Check email credentials.")
#         return False
#     except smtplib.SMTPException as e:
#         logger.error(f"SMTP error occurred: {str(e)}")
#         print(f"SMTP error: {str(e)}")
#         return False
#     except Exception as e:
#         logger.error(f"Email sending failed: {str(e)}")
#         print(f"Email sending failed: {str(e)}")
#         return False

# def send_sms(phone_number, message):
#     """Send SMS (mock function with better logging)"""
#     try:
#         logger.info(f"SMS to {phone_number}: {message}")
#         print(f"📱 [DEV MODE] SMS would be sent to {phone_number}: {message}")
#         # For development, always return True
#         return True
#     except Exception as e:
#         logger.error(f"SMS sending failed: {str(e)}")
#         print(f"SMS sending failed: {str(e)}")
#         return True  

# def send_sms(phone_number, message):
#     """Send SMS (mock function)"""
#     try:
#         logger.info(f"SMS to {phone_number}: {message}")
#         print(f"📱 SMS sent to {phone_number}: {message}")
#         return True
#     except Exception as e:
#         logger.error(f"SMS sending failed: {str(e)}")
#         return False

# def send_voter_credentials(voter_data, voter_id, password):
#     """Send voter ID and credentials via email and SMS"""
#     email_body = f"""
#     <html>
#     <body>
#         <h2>Voter Registration Successful!</h2>
#         <p>Dear {voter_data['full_name']},</p>
#         <p>Your voter registration has been successfully completed.</p>
#         <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
#             <h3 style="color: #28a745; margin: 0;">Your Voter ID: <strong>{voter_id}</strong></h3>
#         </div>
#         <p><strong>Login Credentials:</strong></p>
#         <ul>
#             <li><strong>Voter ID:</strong> {voter_id}</li>
#             <li><strong>Password:</strong> {password}</li>
#         </ul>
#         <p>Please keep this information secure and do not share it with anyone.</p>
#         <p>You can now login to the voting system using your Voter ID and password.</p>
#         <br>
#         <p>Best regards,<br>Election Commission</p>
#     </body>
#     </html>
#     """
    
#     sms_message = f"Voter Registration Successful! Your Voter ID: {voter_id}. Password: {password}. Keep this secure."
    
#     # Send email
#     email_sent = send_email(voter_data['email'], "Voter Registration Successful", email_body)
    
#     # Send SMS
#     sms_sent = send_sms(voter_data['phone'], sms_message)
    
#     return email_sent, sms_sent

# @register_bp.route('/send-otp', methods=['POST', 'OPTIONS'])
# def send_otp_registration():
#     """Send OTP for email/phone verification during registration"""
#     if request.method == 'OPTIONS':
#         return jsonify({'status': 'ok'}), 200
        
#     try:
#         print(f"=== SEND OTP REQUEST ===")
#         data = request.get_json()
        
#         if not data:
#             print("No data received in request")
#             return jsonify({
#                 'success': False,
#                 'message': 'No data provided'
#             }), 400
            
#         email = data.get('email')
#         phone = data.get('phone')
#         purpose = data.get('purpose', 'registration')
        
#         print(f"📧 Email: {email}")
#         print(f"📱 Phone: {phone}")
#         print(f"🎯 Purpose: {purpose}")
        
#         if not email and not phone:
#             print("No email or phone provided")
#             return jsonify({
#                 'success': False,
#                 'message': 'Email or phone number is required'
#             }), 400
        
#         # Check if email/phone already exists (only for registration purpose)
#         if purpose == 'registration':
#             if email:
#                 existing_voter = Voter.find_by_email(email)
#                 print(f"Checking if email exists: {email} -> {existing_voter is not None}")
#                 if existing_voter:
#                     return jsonify({
#                         'success': False,
#                         'message': 'Email already registered'
#                     }), 400
#             if phone:
#                 existing_voter = Voter.find_by_phone(phone)
#                 print(f"Checking if phone exists: {phone} -> {existing_voter is not None}")
#                 if existing_voter:
#                     return jsonify({
#                         'success': False,
#                         'message': 'Phone number already registered'
#                     }), 400
        
#         # Create OTP
#         print("Creating OTP...")
#         try:
#             otp_id = OTP.create_otp(email=email, phone=phone, purpose=purpose)
#             print(f"OTP created with ID: {otp_id}")
#         except Exception as e:
#             print(f"OTP creation failed: {str(e)}")
#             # Generate a mock OTP for development
#             mock_otp = ''.join(random.choices('0123456789', k=6))
#             print(f"Using mock OTP: {mock_otp}")
#             return jsonify({
#                 'success': True,
#                 'message': 'OTP sent successfully (development mode)',
#                 'debug_otp': mock_otp,
#                 'channels': {
#                     'email_sent': bool(email),
#                     'sms_sent': bool(phone)
#                 }
#             })
        
#         otp_record = OTP.find_by_id(otp_id)
        
#         if not otp_record:
#             print(f"OTP record not found for ID: {otp_id}")
#             # Generate a mock OTP for development
#             mock_otp = ''.join(random.choices('0123456789', k=6))
#             print(f"Using mock OTP: {mock_otp}")
#             return jsonify({
#                 'success': True,
#                 'message': 'OTP sent successfully (development mode)',
#                 'debug_otp': mock_otp,
#                 'channels': {
#                     'email_sent': bool(email),
#                     'sms_sent': bool(phone)
#                 }
#             })
        
#         print(f"OTP created successfully: {otp_record['otp_code']}")
        
#         # Send OTP via appropriate channel
#         email_sent = False
#         sms_sent = False
        
#         if email:
#             print(f"📧 Sending email to: {email}")
#             email_body = f"""
#             <html>
#             <body>
#                 <h2>Email Verification OTP</h2>
#                 <p>Your OTP for email verification is:</p>
#                 <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; margin: 10px 0;">
#                     <h1 style="color: #007bff; margin: 0; letter-spacing: 5px;">{otp_record['otp_code']}</h1>
#                 </div>
#                 <p>This OTP is valid for 10 minutes.</p>
#                 <p>If you didn't request this, please ignore this email.</p>
#                 <br>
#                 <p>Best regards,<br>Election Commission</p>
#             </body>
#             </html>
#             """
#             email_sent = send_email(email, "Email Verification OTP", email_body)
#             if email_sent:
#                 print(f"Email sent successfully to {email}")
#             else:
#                 print(f"Email sending failed for {email}")
        
#         if phone:
#             print(f"📱 Sending SMS to: {phone}")
#             sms_message = f"Your phone verification OTP is {otp_record['otp_code']}. Valid for 10 minutes."
#             sms_sent = send_sms(phone, sms_message)
#             if sms_sent:
#                 print(f"SMS sent successfully to {phone}")
#             else:
#                 print(f"SMS sending failed for {phone}")
        
#         # Prepare success response
#         response_data = {
#             'success': True,
#             'message': 'OTP sent successfully',
#             'debug_otp': otp_record['otp_code'],
#             'channels': {
#                 'email_sent': email_sent,
#                 'sms_sent': sms_sent
#             }
#         }
        
#         # Add specific messages based on what was sent
#         if email_sent and sms_sent:
#             response_data['message'] = 'OTP sent to your email and phone'
#         elif email_sent:
#             response_data['message'] = 'OTP sent to your email'
#         elif sms_sent:
#             response_data['message'] = 'OTP sent to your phone'
        
#         print(f"OTP process completed successfully")
#         return jsonify(response_data)
        
#     except Exception as e:
#         logger.error(f'OTP send error: {str(e)}')
#         print(f"OTP send exception: {str(e)}")
#         import traceback
#         print(f"Full traceback: {traceback.format_exc()}")
        
#         # Generate a mock OTP as fallback for development
#         mock_otp = ''.join(random.choices('0123456789', k=6))
#         print(f"Using fallback mock OTP: {mock_otp}")
        
#         return jsonify({
#             'success': True,
#             'message': 'OTP sent successfully (development fallback)',
#             'debug_otp': mock_otp,
#             'channels': {
#                 'email_sent': bool(data.get('email') if data else False),
#                 'sms_sent': bool(data.get('phone') if data else False)
#             },
#             'note': 'This is a development fallback OTP'
#         })

# @register_bp.route('/verify-otp', methods=['POST', 'OPTIONS'])
# def verify_otp_registration():
#     """Verify OTP for email/phone during registration"""
#     if request.method == 'OPTIONS':
#         return jsonify({'status': 'ok'}), 200
        
#     try:
#         data = request.get_json()
#         print(f"=== VERIFY OTP REQUEST ===")
#         print(f"Request data: {data}")
        
#         email = data.get('email')
#         phone = data.get('phone')
#         otp_code = data.get('otp_code')
#         purpose = data.get('purpose', 'registration')
        
#         if not otp_code:
#             print("No OTP code provided")
#             return jsonify({
#                 'success': False,
#                 'message': 'OTP code is required'
#             }), 400
        
#         print(f"Verifying OTP: {otp_code} for email: {email}, phone: {phone}, purpose: {purpose}")
        
#         # Verify OTP
#         is_valid = OTP.verify_otp(email=email, phone=phone, otp_code=otp_code, purpose=purpose)
        
#         print(f"OTP verification result: {is_valid}")
        
#         if is_valid:
#             return jsonify({
#                 'success': True,
#                 'message': 'OTP verified successfully',
#                 'verified_email': email,
#                 'verified_phone': phone
#             })
#         else:
#             print("Invalid or expired OTP")
#             # In development mode, accept any 6-digit code
#             if otp_code and len(otp_code) == 6 and otp_code.isdigit():
#                 print("Development mode: Accepting any 6-digit OTP")
#                 return jsonify({
#                     'success': True,
#                     'message': 'OTP verified successfully (development mode)',
#                     'verified_email': email,
#                     'verified_phone': phone,
#                     'note': 'Development mode verification'
#                 })
#             else:
#                 return jsonify({
#                     'success': False,
#                     'message': 'Invalid or expired OTP'
#                 }), 400
        
#     except Exception as e:
#         logger.error(f'OTP verification error: {str(e)}')
#         print(f"OTP verification exception: {str(e)}")
#         return jsonify({
#             'success': False,
#             'message': 'OTP verification failed'
#         }), 500

# @register_bp.route('/register', methods=['POST', 'OPTIONS'])
# def register_voter():
#     """Register a new voter with complete verification"""
#     if request.method == 'OPTIONS':
#         return jsonify({'status': 'ok'}), 200
        
#     try:
#         data = request.get_json()
#         logger.info(f"Registration data received: {data}")
        
#         # Validate required fields
#         required_fields = ['full_name', 'father_name', 'gender', 'date_of_birth', 
#                           'email', 'phone', 'address_line1', 'pincode', 
#                           'village_city', 'district', 'state', 'national_id_number']
        
#         missing_fields = [field for field in required_fields if not data.get(field)]
#         if missing_fields:
#             return jsonify({
#                 'success': False,
#                 'message': f'Missing required fields: {", ".join(missing_fields)}'
#             }), 400
        
#         # Check if email is verified
#         if not data.get('email_verified'):
#             return jsonify({
#                 'success': False,
#                 'message': 'Email must be verified before registration'
#             }), 400
        
#         # Check if phone is verified
#         if not data.get('phone_verified'):
#             return jsonify({
#                 'success': False,
#                 'message': 'Phone must be verified before registration'
#             }), 400
        
#         # Check if national ID already exists
#         if Voter.find_by_national_id(data['national_id_number']):
#             return jsonify({
#                 'success': False,
#                 'message': 'National ID already registered'
#             }), 400
        
#         # Validate age (must be 18+)
#         try:
#             dob = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
#             age = calculate_age(dob)
#             if age < 18:
#                 return jsonify({
#                     'success': False,
#                     'message': 'You must be 18 years or older to register'
#                 }), 400
#         except ValueError:
#             return jsonify({
#                 'success': False,
#                 'message': 'Invalid date format. Use YYYY-MM-DD'
#             }), 400
        
#         # Generate a random password for the voter if not provided
#         if data.get('password'):
#             password = data['password']
#         else:
#             password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
        
#         # Prepare voter data
#         voter_data = {
#             'full_name': data['full_name'],
#             'father_name': data['father_name'],
#             'mother_name': data.get('mother_name', ''),
#             'gender': data['gender'],
#             'date_of_birth': dob,
#             'place_of_birth': data.get('place_of_birth', ''),
#             'email': data['email'],
#             'phone': data['phone'],
#             'alternate_phone': data.get('alternate_phone', ''),
#             'address_line1': data['address_line1'],
#             'address_line2': data.get('address_line2', ''),
#             'pincode': data['pincode'],
#             'village_city': data['village_city'],
#             'district': data['district'],
#             'state': data['state'],
#             'country': data.get('country', 'India'),
#             'national_id_type': data.get('national_id_type', 'aadhar'),
#             'national_id_number': data['national_id_number'],
#             'password': password,
#             'security_question': data.get('security_question'),
#             'security_answer': data.get('security_answer'),
#             'email_verified': data['email_verified'],
#             'phone_verified': data['phone_verified'],
#             'id_verified': data.get('id_verified', False),
#             'face_verified': data.get('face_verified', False)
#         }
        
#         # Create voter in MongoDB
#         mongo_id = Voter.create_voter(voter_data)
        
#         # Get the actual voter document to return the 8-character voter_id
#         voter_doc = Voter.find_by_id(mongo_id)
        
#         if not voter_doc or 'voter_id' not in voter_doc:
#             logger.error(f"Failed to retrieve voter document after creation: {mongo_id}")
#             return jsonify({
#                 'success': False,
#                 'message': 'Registration failed: Could not retrieve voter ID'
#             }), 500
        
#         actual_voter_id = voter_doc['voter_id']
        
#         logger.info(f"New voter registered successfully. Voter ID: {actual_voter_id}, MongoDB ID: {mongo_id}")
        
#         return jsonify({
#             'success': True,
#             'message': 'Registration successful. Please complete face verification.',
#             'voter_id': actual_voter_id,  # Return the 8-character voter_id
#             'next_step': 'face_verification'
#         }), 201
        
#     except Exception as e:
#         logger.error(f'Registration error: {str(e)}')
#         return jsonify({
#             'success': False,
#             'message': f'Registration failed: {str(e)}'
#         }), 500
        

# @register_bp.route('/complete-registration/<voter_id>', methods=['POST', 'OPTIONS'])
# def complete_registration(voter_id):
#     """Complete registration and send voter credentials"""
#     if request.method == 'OPTIONS':
#         return jsonify({'status': 'ok'}), 200
        
#     try:
#         print(f"=== COMPLETE REGISTRATION ===")
#         print(f"Looking for voter with ID: {voter_id}")
        
#         voter = Voter.find_by_voter_id(voter_id)
#         if not voter:
#             print(f"Voter not found with ID: {voter_id}")
#             return jsonify({
#                 'success': False,
#                 'message': 'Voter not found'
#             }), 404
        
#         print(f"Found voter: {voter['full_name']}")
        
#         # Check if all verifications are complete
#         if not is_voter_fully_verified(voter):
#             pending = get_pending_verifications(voter)
#             return jsonify({
#                 'success': False,
#                 'message': f'Complete all verification steps first. Pending: {", ".join(pending)}'
#             }), 400
        
#         # Get the password (use DOB as fallback)
#         password = voter.get('date_of_birth', '').strftime('%Y%m%d') if voter.get('date_of_birth') else "your_dob"
        
#         # Update registration status
#         Voter.update_one(
#             {"voter_id": voter_id},
#             {"registration_status": "completed"}
#         )
        
#         # Send voter credentials via email and SMS
#         email_sent, sms_sent = send_voter_credentials(voter, voter_id, password)
        
#         response_data = {
#             'success': True,
#             'message': 'Registration completed successfully!',
#             'voter_data': format_voter_data(voter),
#             'credentials_sent': {
#                 'email': email_sent,
#                 'sms': sms_sent
#             },
#             'voter_id': voter_id,
#             'password': password
#         }
        
#         if not email_sent or not sms_sent:
#             response_data['warning'] = 'Credentials could not be sent via all channels. Please contact support.'
        
#         return jsonify(response_data)
        
#     except Exception as e:
#         logger.error(f'Complete registration error: {str(e)}')
#         return jsonify({
#             'success': False,
#             'message': 'Registration completion failed'
#         }), 500


# # Update the register_face function in register.py
# @register_bp.route('/register-face/<voter_id>', methods=['POST', 'OPTIONS'])
# def register_face(voter_id):
#     """Register voter's face biometrics using OpenCV"""
#     if request.method == 'OPTIONS':
#         return jsonify({'status': 'ok'}), 200
        
#     try:
#         data = request.get_json()
#         if not data:
#             return jsonify({
#                 'success': False,
#                 'message': 'No data provided'
#             }), 400
            
#         image_data = data.get('image_data')
        
#         if not image_data:
#             return jsonify({
#                 'success': False,
#                 'message': 'Image data is required'
#             }), 400
        
#         print(f"=== FACE REGISTRATION ===")
#         print(f"Looking for voter with ID: {voter_id}")
        
#         voter = Voter.find_by_voter_id(voter_id)
#         if not voter:
#             return jsonify({
#                 'success': False,
#                 'message': 'Voter not found'
#             }), 404
        
#         print(f"Found voter: {voter['full_name']}")
        
#         # Process image using OpenCV service
#         try:
#             # Convert base64 to image
#             image_array = face_service.base64_to_image(image_data)
            
#             # Preprocess image
#             image_array = face_service.preprocess_image(image_array)
            
#             # Validate face image
#             is_valid, validation_message = face_service.validate_face_image(image_array)
#             if not is_valid:
#                 return jsonify({
#                     'success': False,
#                     'message': f'Face validation failed: {validation_message}'
#                 }), 400
            
#             # Extract face encoding
#             face_encoding = face_service.extract_face_encoding(image_array)
#             if not face_encoding:
#                 return jsonify({
#                     'success': False,
#                     'message': 'Could not extract face features. Please try again with a clearer image.'
#                 }), 400
            
#             # Detect faces for quality assessment
#             faces = face_service.detect_faces(image_array)
#             if faces:
#                 quality_score = face_utils.calculate_face_quality_score(image_array, faces[0])
#                 print(f"Face quality score: {quality_score:.4f}")
                
#                 if quality_score < 0.5:
#                     return jsonify({
#                         'success': False,
#                         'message': 'Low image quality. Please ensure good lighting and clear face visibility.'
#                     }), 400
            
#         except Exception as e:
#             logger.error(f"Image processing error: {str(e)}")
#             return jsonify({
#                 'success': False,
#                 'message': 'Invalid image data or processing error'
#             }), 400
        
#         # Store face encoding
#         face_encoding_id = FaceEncoding.create_encoding(voter_id, face_encoding)
#         print(f"Face encoding stored: {face_encoding_id}")
        
#         # Update voter document with face verification status
#         update_result = Voter.update_one(
#             {"voter_id": voter_id},
#             {
#                 "face_encoding_id": face_encoding_id,
#                 "face_verified": True,
#                 "updated_at": datetime.utcnow()
#             }
#         )
        
#         print(f"Voter face verification status updated.")
        
#         logger.info(f"Face registered successfully for voter: {voter_id}")
        
#         return jsonify({
#             'success': True,
#             'message': 'Face biometrics registered successfully',
#             'face_encoding_id': face_encoding_id,
#             'quality_score': quality_score if 'quality_score' in locals() else 0.0
#         })
        
#     except Exception as e:
#         logger.error(f'Face registration error: {str(e)}')
#         return jsonify({
#             'success': False,
#             'message': f'Face registration failed: {str(e)}'
#         }), 500

# @register_bp.route('/check-voter/<voter_id>', methods=['GET'])
# def check_voter(voter_id):
#     """Check voter registration status"""
#     try:
#         voter = Voter.find_by_voter_id(voter_id)
#         if not voter:
#             return jsonify({
#                 'success': False,
#                 'message': 'Voter not found'
#             }), 404
        
#         return jsonify({
#             'success': True,
#             'voter_data': format_voter_data(voter),
#             'verification_status': Voter.get_verification_status(voter_id)
#         })
        
#     except Exception as e:
#         logger.error(f'Check voter error: {str(e)}')
#         return jsonify({
#             'success': False,
#             'message': 'Failed to fetch voter data'
#         }), 500



# @register_bp.route('/send-verification-otp/<voter_id>', methods=['POST', 'OPTIONS'])
# def send_verification_otp(voter_id):
#     """Send OTP for email/mobile verification"""
#     if request.method == 'OPTIONS':
#         return jsonify({'status': 'ok'}), 200
        
#     try:
#         data = request.get_json()
#         verification_type = data.get('type')  # 'email' or 'phone'
        
#         print(f"=== SEND VERIFICATION OTP ===")
#         print(f"Looking for voter with ID: {voter_id}")
#         print(f"Verification type: {verification_type}")
        
#         voter = Voter.find_by_voter_id(voter_id)
#         if not voter:
#             print(f"Voter not found with ID: {voter_id}")
#             return jsonify({
#                 'success': False,
#                 'message': 'Voter not found'
#             }), 404
        
#         print(f"Found voter: {voter['full_name']}")
#         print(f"Email: {voter.get('email')}")
#         print(f"Phone: {voter.get('phone')}")
        
#         if verification_type == 'email':
#             contact_info = voter['email']
#             purpose = 'email_verification'
#         elif verification_type == 'phone':
#             contact_info = voter['phone']
#             purpose = 'phone_verification'
#         else:
#             return jsonify({
#                 'success': False,
#                 'message': 'Invalid verification type'
#             }), 400
        
#         # Create OTP
#         otp_data = {
#             'email': voter['email'] if verification_type == 'email' else None,
#             'phone': voter['phone'] if verification_type == 'phone' else None,
#             'purpose': purpose
#         }
        
#         print(f"Creating OTP with data: {otp_data}")
        
#         otp_id = OTP.create_otp(**otp_data)
#         otp_record = OTP.find_by_id(otp_id)
        
#         print(f"OTP created: {otp_record['otp_code']}")
        
#         # Send OTP via appropriate channel
#         if verification_type == 'email':
#             email_body = f"""
#             <html>
#             <body>
#                 <h2>Email Verification OTP</h2>
#                 <p>Dear {voter['full_name']},</p>
#                 <p>Your OTP for email verification is:</p>
#                 <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; margin: 10px 0;">
#                     <h1 style="color: #007bff; margin: 0; letter-spacing: 5px;">{otp_record['otp_code']}</h1>
#                 </div>
#                 <p>This OTP is valid for 10 minutes.</p>
#                 <p>If you didn't request this, please ignore this email.</p>
#                 <br>
#                 <p>Best regards,<br>Election Commission</p>
#             </body>
#             </html>
#             """
#             email_sent = send_email(voter['email'], "Email Verification OTP", email_body)
#             if not email_sent:
#                 logger.warning(f"Failed to send email to {voter['email']}")
#         else:
#             sms_message = f"Your phone verification OTP is {otp_record['otp_code']}. Valid for 10 minutes."
#             sms_sent = send_sms(voter['phone'], sms_message)
#             if not sms_sent:
#                 logger.warning(f"Failed to send SMS to {voter['phone']}")
        
#         return jsonify({
#             'success': True,
#             'message': f'OTP sent to your {verification_type}',
#             'debug_otp': otp_record['otp_code']  # Remove in production
#         })
        
#     except Exception as e:
#         logger.error(f'Verification OTP send error: {str(e)}')
#         return jsonify({
#             'success': False,
#             'message': f'Failed to send OTP: {str(e)}'
#         }), 500

# @register_bp.route('/verify-contact/<voter_id>', methods=['POST', 'OPTIONS'])
# def verify_contact(voter_id):
#     """Verify email or phone using OTP"""
#     if request.method == 'OPTIONS':
#         return jsonify({'status': 'ok'}), 200
        
#     try:
#         data = request.get_json()
#         verification_type = data.get('type')  # 'email' or 'phone'
#         otp_code = data.get('otp_code')
        
#         if not otp_code:
#             return jsonify({
#                 'success': False,
#                 'message': 'OTP code is required'
#             }), 400
        
#         print(f"=== VERIFY CONTACT ===")
#         print(f"Looking for voter with ID: {voter_id} for {verification_type} verification")
#         print(f"OTP code: {otp_code}")
        
#         voter = Voter.find_by_voter_id(voter_id)
#         if not voter:
#             print(f"Voter not found with ID: {voter_id}")
#             return jsonify({
#                 'success': False,
#                 'message': 'Voter not found'
#             }), 404
        
#         print(f"Found voter: {voter['full_name']}")
        
#         # Verify OTP
#         purpose = f'{verification_type}_verification'
#         is_valid = OTP.verify_otp(
#             email=voter['email'] if verification_type == 'email' else None,
#             phone=voter['phone'] if verification_type == 'phone' else None,
#             otp_code=otp_code,
#             purpose=purpose
#         )
        
#         if is_valid:
#             # Update verification status
#             Voter.update_verification_status(voter_id, verification_type, True)
            
#             print(f"{verification_type} verified successfully for voter: {voter_id}")
            
#             return jsonify({
#                 'success': True,
#                 'message': f'{verification_type.title()} verified successfully'
#             })
#         else:
#             print(f"Invalid OTP for voter: {voter_id}")
#             return jsonify({
#                 'success': False,
#                 'message': 'Invalid or expired OTP'
#             }), 400
        
#     except Exception as e:
#         logger.error(f'Contact verification error: {str(e)}')
#         return jsonify({
#             'success': False,
#             'message': f'Verification failed: {str(e)}'
#         }), 500

   

# @register_bp.route('/send-otp', methods=['POST'])
# def send_otp():
#     """Send OTP for verification"""
#     try:
#         data = request.get_json()
#         email = data.get('email')
#         phone = data.get('phone')
#         purpose = data.get('purpose', 'verification')
        
#         if not email and not phone:
#             return jsonify({
#                 'success': False,
#                 'message': 'Email or phone number is required'
#             }), 400
        
#         # Create OTP
#         otp_id = OTP.create_otp(email=email, phone=phone, purpose=purpose)
        
#         # In production, send OTP via email/SMS
#         # For development, return the OTP
#         otp_record = OTP.find_by_id(otp_id)
        
#         return jsonify({
#             'success': True,
#             'message': 'OTP sent successfully',
#             'debug_otp': otp_record['otp_code']  # Remove in production
#         })
        
#     except Exception as e:
#         logger.error(f'OTP send error: {str(e)}')
#         return jsonify({
#             'success': False,
#             'message': 'Failed to send OTP'
#         }), 500

# @register_bp.route('/verify-otp', methods=['POST'])
# def verify_otp():
#     """Verify OTP"""
#     try:
#         data = request.get_json()
#         email = data.get('email')
#         phone = data.get('phone')
#         otp_code = data.get('otp_code')
#         purpose = data.get('purpose', 'verification')
        
#         if not otp_code:
#             return jsonify({
#                 'success': False,
#                 'message': 'OTP code is required'
#             }), 400
        
#         # Verify OTP
#         is_valid = OTP.verify_otp(email=email, phone=phone, otp_code=otp_code, purpose=purpose)
        
#         if is_valid:
#             return jsonify({
#                 'success': True,
#                 'message': 'OTP verified successfully'
#             })
#         else:
#             return jsonify({
#                 'success': False,
#                 'message': 'Invalid or expired OTP'
#             }), 400
        
#     except Exception as e:
#         logger.error(f'OTP verification error: {str(e)}')
#         return jsonify({
#             'success': False,
#             'message': 'OTP verification failed'
#         }), 500

# # Add this to your existing auth.py file after the admin login route

# @register_bp.route('/admin/register', methods=['POST', 'OPTIONS'])
# def admin_register():
#     """Register a new admin (only accessible by superadmin)"""
#     if request.method == 'OPTIONS':
#         return jsonify({'status': 'ok'}), 200
        
#     try:
#         # Verify the requesting admin has permission
#         token = request.headers.get('Authorization')
#         if not token or not token.startswith('Bearer '):
#             return jsonify({
#                 'success': False,
#                 'message': 'Authentication required'
#             }), 401
        
#         token = token.split(' ')[1]
#         payload = verify_token(token)
        
#         if not payload:
#             return jsonify({
#                 'success': False,
#                 'message': 'Invalid or expired token'
#             }), 401
        
#         # Check if requesting admin has superadmin privileges
#         requesting_admin = Admin.find_by_username(payload['username'])
#         if not requesting_admin or requesting_admin.get('role') != 'superadmin':
#             return jsonify({
#                 'success': False,
#                 'message': 'Insufficient permissions. Only superadmin can register new admins.'
#             }), 403
        
#         data = request.get_json()
#         if not data:
#             return jsonify({
#                 'success': False,
#                 'message': 'No data provided'
#             }), 400
            
#         required_fields = ['username', 'email', 'password', 'full_name', 'role']
#         for field in required_fields:
#             if not data.get(field):
#                 return jsonify({
#                     'success': False,
#                     'message': f'{field} is required'
#                 }), 400
        
#         # Validate role
#         valid_roles = ['superadmin', 'admin', 'moderator']
#         if data['role'] not in valid_roles:
#             return jsonify({
#                 'success': False,
#                 'message': f'Role must be one of: {", ".join(valid_roles)}'
#             }), 400
        
#         # Create new admin
#         admin_data = {
#             'username': data['username'],
#             'email': data['email'],
#             'password': data['password'],
#             'full_name': data['full_name'],
#             'role': data['role'],
#             'department': data.get('department'),
#             'phone': data.get('phone'),
#             'permissions': data.get('permissions', {}),
#             'access_level': data.get('access_level', 1),
#             'is_active': data.get('is_active', True)
#         }
        
#         admin_id = Admin.create_admin(admin_data)
        
#         # Log the admin creation
#         AuditLog.create_log(
#             action="admin_created",
#             user_id=requesting_admin['admin_id'],
#             user_type="admin",
#             details=f"Admin {data['username']} created by {requesting_admin['username']}",
#             ip_address=request.remote_addr,
#             user_agent=request.headers.get('User-Agent')
#         )
        
#         logger.info(f"New admin created: {data['username']} by {requesting_admin['username']}")
        
#         return jsonify({
#             'success': True,
#             'message': 'Admin created successfully',
#             'admin_id': admin_id
#         })
        
#     except ValueError as e:
#         return jsonify({
#             'success': False,
#             'message': str(e)
#         }), 400
#     except Exception as e:
#         logger.error(f'Admin registration error: {str(e)}')
#         return jsonify({
#             'success': False,
#             'message': 'Admin registration failed. Please try again.'
#         }), 500

# @register_bp.route('/admin/list', methods=['GET', 'OPTIONS'])
# def admin_list():
#     """Get list of all admins (only accessible by superadmin)"""
#     if request.method == 'OPTIONS':
#         return jsonify({'status': 'ok'}), 200
        
#     try:
#         # Verify the requesting admin has permission
#         token = request.headers.get('Authorization')
#         if not token or not token.startswith('Bearer '):
#             return jsonify({
#                 'success': False,
#                 'message': 'Authentication required'
#             }), 401
        
#         token = token.split(' ')[1]
#         payload = verify_token(token)
        
#         if not payload:
#             return jsonify({
#                 'success': False,
#                 'message': 'Invalid or expired token'
#             }), 401
        
#         # Check if requesting admin has admin privileges
#         requesting_admin = Admin.find_by_username(payload['username'])
#         if not requesting_admin or requesting_admin.get('role') not in ['superadmin', 'admin']:
#             return jsonify({
#                 'success': False,
#                 'message': 'Insufficient permissions'
#             }), 403
        
#         # Get all admins (exclude password hashes)
#         admins = Admin.find_all({}, {
#             'password_hash': 0,
#             'security_answer_hash': 0
#         })
        
#         # Format admin data for response
#         admin_list = []
#         for admin in admins:
#             admin_list.append({
#                 'admin_id': admin.get('admin_id'),
#                 'username': admin.get('username'),
#                 'email': admin.get('email'),
#                 'full_name': admin.get('full_name'),
#                 'role': admin.get('role'),
#                 'department': admin.get('department'),
#                 'is_active': admin.get('is_active', True),
#                 'last_login': admin.get('last_login'),
#                 'created_at': admin.get('created_at'),
#                 'access_level': admin.get('access_level', 1)
#             })
        
#         return jsonify({
#             'success': True,
#             'admins': admin_list,
#             'total_count': len(admin_list)
#         })
        
#     except Exception as e:
#         logger.error(f'Admin list error: {str(e)}')
#         return jsonify({
#             'success': False,
#             'message': 'Failed to fetch admin list'
#         }), 500

# @register_bp.route('/admin/update/<admin_id>', methods=['PUT', 'OPTIONS'])
# def admin_update(admin_id):
#     """Update admin details (only accessible by superadmin)"""
#     if request.method == 'OPTIONS':
#         return jsonify({'status': 'ok'}), 200
        
#     try:
#         # Verify the requesting admin has permission
#         token = request.headers.get('Authorization')
#         if not token or not token.startswith('Bearer '):
#             return jsonify({
#                 'success': False,
#                 'message': 'Authentication required'
#             }), 401
        
#         token = token.split(' ')[1]
#         payload = verify_token(token)
        
#         if not payload:
#             return jsonify({
#                 'success': False,
#                 'message': 'Invalid or expired token'
#             }), 401
        
#         # Check if requesting admin has superadmin privileges
#         requesting_admin = Admin.find_by_username(payload['username'])
#         if not requesting_admin or requesting_admin.get('role') != 'superadmin':
#             return jsonify({
#                 'success': False,
#                 'message': 'Insufficient permissions. Only superadmin can update admins.'
#             }), 403
        
#         data = request.get_json()
#         if not data:
#             return jsonify({
#                 'success': False,
#                 'message': 'No data provided'
#             }), 400
        
#         # Find the admin to update
#         target_admin = Admin.find_one({"admin_id": admin_id})
#         if not target_admin:
#             return jsonify({
#                 'success': False,
#                 'message': 'Admin not found'
#             }), 404
        
#         # Prepare update data
#         update_data = {}
#         allowed_fields = ['full_name', 'email', 'role', 'department', 'phone', 
#                          'permissions', 'access_level', 'is_active']
        
#         for field in allowed_fields:
#             if field in data:
#                 update_data[field] = data[field]
        
#         # Update password if provided
#         if 'password' in data and data['password']:
#             password_bytes = data['password'].encode('utf-8')
#             password_hash = bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode('utf-8')
#             update_data['password_hash'] = password_hash
        
#         # Perform update
#         Admin.update_one(
#             {"admin_id": admin_id},
#             update_data
#         )
        
#         # Log the admin update
#         AuditLog.create_log(
#             action="admin_updated",
#             user_id=requesting_admin['admin_id'],
#             user_type="admin",
#             details=f"Admin {target_admin['username']} updated by {requesting_admin['username']}",
#             ip_address=request.remote_addr,
#             user_agent=request.headers.get('User-Agent')
#         )
        
#         logger.info(f"Admin updated: {target_admin['username']} by {requesting_admin['username']}")
        
#         return jsonify({
#             'success': True,
#             'message': 'Admin updated successfully'
#         })
        
#     except Exception as e:
#         logger.error(f'Admin update error: {str(e)}')
#         return jsonify({
#             'success': False,
#             'message': 'Failed to update admin'
#         }), 500

# #
# # Helper functions
# def is_voter_fully_verified(voter):
#     """Check if voter is fully verified"""
#     return all([
#         voter.get('email_verified', False),
#         voter.get('phone_verified', False), 
#         voter.get('id_verified', False),
#         voter.get('face_verified', False),
#         voter.get('is_active', True)
#     ])

# def get_pending_verifications(voter):
#     """Get list of pending verifications"""
#     pending = []
#     if not voter.get('email_verified'):
#         pending.append('email')
#     if not voter.get('phone_verified'):
#         pending.append('phone')
#     if not voter.get('id_verified'):
#         pending.append('id')
#     if not voter.get('face_verified'):
#         pending.append('face')
#     return pending


# def format_voter_data(voter):
#     """Format voter data for API response"""
#     age = calculate_age(voter['date_of_birth']) if voter.get('date_of_birth') else 0
    
#     return {
#         'voter_id': voter['voter_id'],
#         'full_name': voter['full_name'],
#         'email': voter['email'],
#         'phone': voter['phone'],
#         'gender': voter['gender'],
#         'date_of_birth': voter.get('date_of_birth'),
#         'age': age,
#         'address': {
#             'address_line1': voter['address_line1'],
#             'address_line2': voter.get('address_line2'),
#             'village_city': voter['village_city'],
#             'district': voter['district'],
#             'state': voter['state'],
#             'pincode': voter['pincode'],
#             'country': voter.get('country', 'India')
#         },
#         'national_id': {
#             'type': voter['national_id_type'],
#             'number': voter['national_id_number']
#         },
#         'constituency': voter.get('constituency', ''),
#         'polling_station': voter.get('polling_station', ''),
#         'verification_status': Voter.get_verification_status(voter['voter_id']),
#         'registration_status': voter.get('registration_status', 'pending'),
#         'created_at': voter.get('created_at')
#     }