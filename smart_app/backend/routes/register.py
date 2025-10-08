from flask import Blueprint, request, jsonify
from smart_app.backend.extensions import db
from smart_app.backend.models import User
import re
from datetime import datetime

register_bp = Blueprint('register', __name__)

def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_phone(phone):
    pattern = r'^\+?[1-9]\d{1,14}$'
    return re.match(pattern, phone) is not None

def validate_aadhar(aadhar):
    pattern = r'^\d{12}$'
    return re.match(pattern, aadhar) is not None

def validate_passport(passport):
    pattern = r'^[A-PR-WY][1-9]\d\s?\d{4}[1-9]$'
    return re.match(pattern, passport, re.IGNORECASE) is not None

@register_bp.route('/check-email', methods=['POST'])
def check_email():
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({'message': 'Email is required'}), 400
            
        if not validate_email(email):
            return jsonify({'message': 'Invalid email format'}), 400
        
        # Check if email already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'message': 'Email already registered'}), 409
            
        return jsonify({'message': 'Email available'}), 200
        
    except Exception as e:
        return jsonify({'message': 'Server error'}), 500

@register_bp.route('/check-id', methods=['POST'])
def check_id():
    try:
        data = request.get_json()
        id_type = data.get('id_type')
        id_number = data.get('id_number', '').strip()
        
        if not id_type or not id_number:
            return jsonify({'message': 'ID type and number are required'}), 400
        
        # Validate ID number based on type
        if id_type == 'aadhar' and not validate_aadhar(id_number):
            return jsonify({'message': 'Invalid Aadhar number'}), 400
        elif id_type == 'passport' and not validate_passport(id_number):
            return jsonify({'message': 'Invalid Passport number'}), 400
        
        # Check if ID already exists
        existing_user = User.query.filter_by(id_type=id_type, id_number=id_number).first()
        if existing_user:
            return jsonify({'message': f'{id_type.capitalize()} number already registered'}), 409
            
        return jsonify({'message': 'ID available'}), 200
        
    except Exception as e:
        return jsonify({'message': 'Server error'}), 500

@register_bp.route('/personal-info', methods=['POST'])
def personal_info():
    try:
        data = request.get_json()
        
        # Extract personal information
        name = data.get('name', '').strip()
        date_of_birth = data.get('date_of_birth')
        gender = data.get('gender')
        address = data.get('address', '').strip()
        state = data.get('state')
        constituency = data.get('constituency')
        
        # Validation
        if not all([name, date_of_birth, gender, address, state, constituency]):
            return jsonify({'message': 'All personal information fields are required'}), 400
        
        # Validate date
        try:
            dob = datetime.strptime(date_of_birth, '%Y-%m-%d').date()
            age = (datetime.now().date() - dob).days // 365
            if age < 18:
                return jsonify({'message': 'You must be at least 18 years old to register'}), 400
        except ValueError:
            return jsonify({'message': 'Invalid date format'}), 400
        
        return jsonify({
            'message': 'Personal information validated',
            'data': {
                'name': name,
                'date_of_birth': date_of_birth,
                'gender': gender,
                'address': address,
                'state': state,
                'constituency': constituency
            }
        }), 200
        
    except Exception as e:
        return jsonify({'message': 'Server error'}), 500

@register_bp.route('/complete', methods=['POST'])
def complete_registration():
    try:
        data = request.get_json()
        
        # Extract all registration data
        email = data.get('email', '').strip().lower()
        password = data.get('password')
        name = data.get('name', '').strip()
        phone = data.get('phone', '').strip()
        date_of_birth = data.get('date_of_birth')
        gender = data.get('gender')
        address = data.get('address', '').strip()
        state = data.get('state')
        constituency = data.get('constituency')
        id_type = data.get('id_type')
        id_number = data.get('id_number', '').strip()
        
        # Validate all fields
        if not all([email, password, name, phone, date_of_birth, gender, address, state, constituency, id_type, id_number]):
            return jsonify({'message': 'All fields are required'}), 400
        
        # Check if email already exists
        if User.query.filter_by(email=email).first():
            return jsonify({'message': 'Email already registered'}), 409
        
        # Check if ID already exists
        if User.query.filter_by(id_type=id_type, id_number=id_number).first():
            return jsonify({'message': f'{id_type.capitalize()} number already registered'}), 409
        
        # Create new user
        new_user = User(
            email=email,
            name=name,
            phone=phone,
            date_of_birth=datetime.strptime(date_of_birth, '%Y-%m-%d').date(),
            gender=gender,
            address=address,
            state=state,
            constituency=constituency,
            id_type=id_type,
            id_number=id_number
        )
        
        new_user.set_password(password)
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            'message': 'Registration successful',
            'user': new_user.to_dict(),
            'voter_id': new_user.id  # This will be used as voter ID
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Registration failed'}), 500