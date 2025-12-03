from datetime import datetime, date, timedelta
from bson import ObjectId
from flask import current_app
from smart_app.backend.extensions import mongo
import random
import string
import bcrypt
import uuid
import hashlib

class MongoBase:
    """Base class for MongoDB models"""
    
    collection_name = None
    
    @classmethod
    def get_collection(cls):
        if not cls.collection_name:
            raise ValueError("Collection name must be defined")
        return mongo.db[cls.collection_name]
    
    @classmethod
    def find_by_id(cls, doc_id):
        """Find document by MongoDB ObjectId"""
        if isinstance(doc_id, str):
            try:
                doc_id = ObjectId(doc_id)
            except:
                return None
        return cls.get_collection().find_one({"_id": doc_id})
    
    @classmethod
    def find_one(cls, query):
        """Find one document by query"""
        return cls.get_collection().find_one(query)
    
    @classmethod
    def find_all(cls, query=None, sort=None, limit=0):
        """Find all documents matching query"""
        cursor = cls.get_collection().find(query or {})
        if sort:
            cursor = cursor.sort(sort)
        if limit > 0:
            cursor = cursor.limit(limit)
        return list(cursor)
    
    @classmethod
    def create(cls, data):
        """Create new document"""
        if 'created_at' not in data:
            data['created_at'] = datetime.utcnow()
        if 'updated_at' not in data:
            data['updated_at'] = datetime.utcnow()
        result = cls.get_collection().insert_one(data)
        return str(result.inserted_id)
    
    @classmethod
    def update(cls, query, data):
        """Update documents matching query"""
        if '$set' not in data:
            data = {'$set': data}
        data['$set']['updated_at'] = datetime.utcnow()
        return cls.get_collection().update_many(query, data)
    
    @classmethod
    def update_one(cls, query, data):
        """Update one document matching query"""
        if '$set' not in data:
            data = {'$set': data}
        data['$set']['updated_at'] = datetime.utcnow()
        return cls.get_collection().update_one(query, data)
    
    @classmethod
    def delete(cls, query):
        """Delete documents matching query"""
        return cls.get_collection().delete_many(query)
    
    @classmethod
    def count(cls, query=None):
        """Count documents matching query"""
        return cls.get_collection().count_documents(query or {})
    
    @classmethod
    def aggregate(cls, pipeline):
        """Perform aggregation pipeline"""
        return list(cls.get_collection().aggregate(pipeline))

class Voter(MongoBase):
    collection_name = "voters"
    
    @classmethod
    def generate_unique_voter_id(cls, national_id_number, date_of_birth, full_name):
        """Generate unique 8-character alphanumeric voter ID based on user data"""
        # Create a unique hash from user data
        unique_string = f"{national_id_number}{date_of_birth}{full_name}{datetime.utcnow().microsecond}"
        hash_object = hashlib.sha256(unique_string.encode())
        hash_hex = hash_object.hexdigest()
        
        # Take first 8 characters and ensure alphanumeric
        base_id = hash_hex[:8].upper()
        
        # Ensure it contains both letters and numbers
        if not any(c.isalpha() for c in base_id):
            # Replace first digit with a letter
            letters = string.ascii_uppercase
            base_id = random.choice(letters) + base_id[1:]
        if not any(c.isdigit() for c in base_id):
            # Replace first letter with a digit
            base_id = random.choice(string.digits) + base_id[1:]
            
        voter_id = base_id
        
        # Ensure uniqueness in database
        counter = 1
        while cls.find_by_voter_id(voter_id):
            # If conflict, modify slightly and try again
            modifier = str(counter)
            voter_id = base_id[:8-len(modifier)] + modifier
            counter += 1
            if counter > 100:  # Safety limit
                # Fallback to timestamp-based ID
                timestamp = datetime.utcnow().strftime('%H%M%S')
                voter_id = timestamp + ''.join(random.choices(string.ascii_uppercase, k=2))
        
        return voter_id
    
    @classmethod
    def create_voter(cls, data):
        """Create a new voter with all required fields"""
        print(f"=== CREATING VOTER ===")
        print(f"Data received: {data}")
        
        # Check for existing records
        if cls.find_by_email(data['email']):
            raise ValueError("Email already registered")
        if cls.find_by_phone(data['phone']):
            raise ValueError("Phone number already registered")
        if cls.find_by_national_id(data['national_id_number']):
            raise ValueError("National ID already registered")
        
        # Generate unique voter ID
        voter_id = cls.generate_unique_voter_id(
            data['national_id_number'],
            data['date_of_birth'],
            data['full_name']
        )
        
        print(f"Generated Voter ID: {voter_id}")
        
        # Hash password - FIXED: Use provided password or generate random one
        password = data.get('password')
        if not password:
            # Generate random password if not provided
            password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
            print(f"Generated random password: {password}")
        
        # Use bcrypt for password hashing
        try:
            password_bytes = password.encode('utf-8')
            password_hash = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
            # Ensure it's stored as string
            if isinstance(password_hash, bytes):
                password_hash = password_hash.decode('utf-8')
        except Exception as e:
            print(f"Password hashing error: {str(e)}")
            raise ValueError("Failed to hash password")
        
        # Hash security answer if provided
        security_answer_hash = None
        if data.get('security_answer'):
            try:
                answer_bytes = data['security_answer'].lower().encode('utf-8')
                security_answer_hash = bcrypt.hashpw(answer_bytes, bcrypt.gensalt())
                if isinstance(security_answer_hash, bytes):
                    security_answer_hash = security_answer_hash.decode('utf-8')
            except Exception as e:
                print(f"Security answer hashing error: {str(e)}")
        
        # Convert date to datetime for MongoDB compatibility
        date_of_birth = data['date_of_birth']
        if isinstance(date_of_birth, str):
            try:
                date_of_birth = datetime.strptime(date_of_birth, '%Y-%m-%d')
            except ValueError:
                raise ValueError("Invalid date format. Use YYYY-MM-DD")
        elif isinstance(date_of_birth, date):
            date_of_birth = datetime.combine(date_of_birth, datetime.min.time())
        
        voter_data = {
            "voter_id": voter_id,
            "full_name": data['full_name'].strip().title(),
            "father_name": data['father_name'].strip().title(),
            "mother_name": data.get('mother_name', '').strip().title(),
            "gender": data['gender'],
            "date_of_birth": date_of_birth,
            "place_of_birth": data.get('place_of_birth', '').strip(),
            "email": data['email'].lower().strip(),
            "phone": data['phone'].strip(),
            "alternate_phone": data.get('alternate_phone', '').strip(),
            "address_line1": data['address_line1'].strip(),
            "address_line2": data.get('address_line2', '').strip(),
            "pincode": data['pincode'].strip(),
            "village_city": data['village_city'].strip().title(),
            "district": data['district'].strip().title(),
            "state": data['state'].strip().title(),
            "country": data.get('country', 'India').strip(),
            "national_id_type": data.get('national_id_type', 'aadhar'),
            "national_id_number": data['national_id_number'].strip(),
            "id_document_path": data.get('id_document_path'),
            "password_hash": password_hash,
            "security_question": data.get('security_question'),
            "security_answer_hash": security_answer_hash,
            "email_verified": data.get('email_verified', False),
            "phone_verified": data.get('phone_verified', False),
            "id_verified": data.get('id_verified', False),
            "face_verified": data.get('face_verified', False),
            "is_active": True,
            "face_encoding_id": None,
            "registration_status": "pending",
            "constituency": cls.generate_constituency(data['district'], data['state']),
            "polling_station": cls.generate_polling_station(data['pincode']),
            "registration_step": "personal_info",
            "notes": data.get('notes'),
            "verified_by": data.get('verified_by'),
            "verified_at": data.get('verified_at')
        }
        
        print(f"Voter data prepared for creation. Voter ID: {voter_id}")
        
        # Insert into MongoDB and return the MongoDB _id
        result = cls.get_collection().insert_one(voter_data)
        mongo_id = str(result.inserted_id)
        
        print(f"Voter created with MongoDB ID: {mongo_id}, Voter ID: {voter_id}")
        
        # Return both the MongoDB ID and the voter ID for reference
        return mongo_id
    
    @classmethod
    def generate_constituency(cls, district, state):
        """Generate constituency name"""
        return f"{district.title()} Constituency, {state.title()}"
    
    @classmethod
    def generate_polling_station(cls, pincode):
        """Generate polling station name"""
        return f"PS-{pincode}"
    
    @classmethod
    def find_by_voter_id(cls, voter_id):
        """Find voter by voter_id (the 8-character ID)"""
        print(f"Looking for voter with ID: {voter_id}")
        voter = cls.get_collection().find_one({"voter_id": voter_id})
        print(f"Voter found: {voter is not None}")
        return voter
    
    @classmethod
    def find_by_email(cls, email):
        return cls.get_collection().find_one({"email": email.lower().strip()})
    
    @classmethod
    def find_by_phone(cls, phone):
        return cls.get_collection().find_one({"phone": phone.strip()})
    
    @classmethod
    def find_by_national_id(cls, national_id):
        return cls.get_collection().find_one({"national_id_number": national_id.strip()})
    
    @classmethod
    def verify_password(cls, voter_doc, password):
        """Verify voter password"""
        if not voter_doc or 'password_hash' not in voter_doc:
            print("No voter document or password hash found")
            return False
        
        try:
            password_bytes = password.encode('utf-8')
            stored_hash = voter_doc['password_hash']
            
            # Handle both string and bytes stored hash
            if isinstance(stored_hash, str):
                stored_hash_bytes = stored_hash.encode('utf-8')
            else:
                stored_hash_bytes = stored_hash
                
            # Verify password
            result = bcrypt.checkpw(password_bytes, stored_hash_bytes)
            print(f"Password verification result: {result}")
            return result
            
        except Exception as e:
            print(f"Password verification error: {str(e)}")
            # Fallback for development: check if it's a simple string comparison
            if isinstance(stored_hash, str) and stored_hash == password:
                print("Using fallback password verification")
                return True
            return False
    
    @classmethod
    def calculate_age(cls, date_of_birth):
        """Calculate age from date of birth"""
        if isinstance(date_of_birth, str):
            date_of_birth = datetime.strptime(date_of_birth, '%Y-%m-%d').date()
        elif isinstance(date_of_birth, datetime):
            date_of_birth = date_of_birth.date()
        
        today = date.today()
        return today.year - date_of_birth.year - (
            (today.month, today.day) < (date_of_birth.month, date_of_birth.day)
        )
    
    @classmethod
    def update_verification_status(cls, voter_id, verification_type, status=True):
        """Update verification status for email, phone, id, or face"""
        field_map = {
            'email': 'email_verified',
            'phone': 'phone_verified',
            'id': 'id_verified',
            'face': 'face_verified'
        }
        
        if verification_type not in field_map:
            raise ValueError("Invalid verification type")
        
        update_data = {
            field_map[verification_type]: status,
            'updated_at': datetime.utcnow()
        }
        
        if status and verification_type == 'face':
            update_data['face_verified_at'] = datetime.utcnow()
        
        return cls.update_one({"voter_id": voter_id}, update_data)
    
    @classmethod
    def get_verification_status(cls, voter_id):
        """Get comprehensive verification status"""
        voter = cls.find_by_voter_id(voter_id)
        if not voter:
            return None
        
        return {
            'email_verified': voter.get('email_verified', False),
            'phone_verified': voter.get('phone_verified', False),
            'id_verified': voter.get('id_verified', False),
            'face_verified': voter.get('face_verified', False),
            'is_active': voter.get('is_active', True),
            'fully_verified': all([
                voter.get('email_verified', False),
                voter.get('phone_verified', False),
                voter.get('id_verified', False),
                voter.get('face_verified', False),
                voter.get('is_active', True)
            ]),
            'registration_status': voter.get('registration_status', 'pending'),
            'registration_step': voter.get('registration_step', 'personal_info')
        }

class OTP(MongoBase):
    collection_name = "otps"
    
    @classmethod
    def create_otp(cls, email=None, phone=None, purpose='verification', expires_in_minutes=10):
        """Create a new OTP"""
        otp_code = ''.join(random.choices(string.digits, k=6))
        expires_at = datetime.utcnow() + timedelta(minutes=expires_in_minutes)
        
        otp_data = {
            "otp_id": str(uuid.uuid4()),
            "email": email,
            "phone": phone,
            "otp_code": otp_code,
            "purpose": purpose,
            "expires_at": expires_at,
            "is_used": False,
            "attempts": 0
        }
        
        # Clean up old OTPs
        cls.get_collection().delete_many({
            "$or": [
                {"email": email},
                {"phone": phone}
            ],
            "purpose": purpose,
            "expires_at": {"$lt": datetime.utcnow()}
        })
        
        return cls.create(otp_data)
    
    @classmethod
    def verify_otp(cls, email=None, phone=None, otp_code=None, purpose='verification'):
        """Verify OTP code"""
        query = {
            "$or": [
                {"email": email},
                {"phone": phone}
            ],
            "otp_code": otp_code,
            "purpose": purpose,
            "is_used": False,
            "expires_at": {"$gt": datetime.utcnow()}
        }
        
        otp_record = cls.find_one(query)
        if not otp_record:
            return False
        
        # Mark OTP as used
        cls.update_one(
            {"_id": ObjectId(otp_record['_id'])},
            {"is_used": True, "used_at": datetime.utcnow()}
        )
        
        return True

class FaceEncoding(MongoBase):
    collection_name = "face_encodings"
    
    @classmethod
    def create_encoding(cls, voter_id, encoding_data, image_metadata=None):
        """Create face encoding record"""
        encoding_id = str(uuid.uuid4())
        
        encoding_doc = {
            "encoding_id": encoding_id,
            "voter_id": voter_id,
            "encoding_data": encoding_data,
            "image_metadata": image_metadata or {},
            "created_at": datetime.utcnow(),
            "is_active": True,
            "version": "1.0"
        }
        
        return cls.create(encoding_doc)
    
    @classmethod
    def find_by_voter_id(cls, voter_id):
        """Find face encoding by voter ID"""
        return cls.find_one({
            "voter_id": voter_id,
            "is_active": True
        })

# Helper functions
def calculate_age(date_of_birth):
    """Calculate age from date of birth"""
    if isinstance(date_of_birth, str):
        date_of_birth = datetime.strptime(date_of_birth, '%Y-%m-%d').date()
    elif isinstance(date_of_birth, datetime):
        date_of_birth = date_of_birth.date()
    
    today = date.today()
    return today.year - date_of_birth.year - (
        (today.month, today.day) < (date_of_birth.month, date_of_birth.day)
    )

class User(MongoBase):
    collection_name = "users"
    
    @classmethod
    def create_user(cls, username, email, password, first_name, last_name, **kwargs):
        """Create a new user with hashed password"""
        # Check if user already exists
        if cls.find_by_username(username):
            raise ValueError("Username already exists")
        if cls.find_by_email(email):
            raise ValueError("Email already exists")
        
        # Use bcrypt directly with proper encoding
        password_bytes = password.encode('utf-8')
        password_hash = bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode('utf-8')
        
        user_data = {
            "user_id": f"USER{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{''.join(random.choices(string.digits, k=4))}",
            "username": username,
            "email": email,
            "password_hash": password_hash,
            "first_name": first_name,
            "last_name": last_name,
            "student_id": kwargs.get('student_id'),
            "face_encoding_ref": kwargs.get('face_encoding_ref'),
            "is_admin": kwargs.get('is_admin', False),
            "is_verified": kwargs.get('is_verified', False),
            "last_login": kwargs.get('last_login'),
            "profile_picture": kwargs.get('profile_picture'),
            "phone": kwargs.get('phone'),
            "date_of_birth": kwargs.get('date_of_birth'),
            "gender": kwargs.get('gender'),
            "is_active": kwargs.get('is_active', True)
        }
        
        return cls.create(user_data)
    
    @classmethod
    def find_by_username(cls, username):
        return cls.get_collection().find_one({"username": username})
    
    @classmethod
    def find_by_email(cls, email):
        return cls.get_collection().find_one({"email": email})
    
    @classmethod
    def find_by_user_id(cls, user_id):
        return cls.get_collection().find_one({"user_id": user_id})
    
    @classmethod
    def verify_password(cls, user_doc, password):
        """Verify user password with proper bcrypt handling"""
        if not user_doc or 'password_hash' not in user_doc:
            print(f"No password hash found in user document")
            return False
        
        try:
            password_bytes = password.encode('utf-8')
            stored_hash = user_doc['password_hash']
            
            # Handle both string and bytes stored hash
            if isinstance(stored_hash, str):
                stored_hash_bytes = stored_hash.encode('utf-8')
            else:
                stored_hash_bytes = stored_hash
                
            # Verify password
            result = bcrypt.checkpw(password_bytes, stored_hash_bytes)
            print(f"Password verification result: {result}")
            return result
            
        except Exception as e:
            print(f"Password verification error: {str(e)}")
            return False
    
    @classmethod
    def update_last_login(cls, user_id):
        """Update user's last login timestamp"""
        return cls.update_one(
            {"user_id": user_id},
            {"last_login": datetime.utcnow()}
        )

class Election(MongoBase):
    collection_name = "elections"
    
    @classmethod
    def create_election(cls, data):
        """Create a new election"""
        election_id = cls.generate_election_id()
        
        election_data = {
            "election_id": election_id,
            "title": data['title'],
            "description": data.get('description'),
            "election_type": data['election_type'],  # national, state, local, organizational
            "constituency": data.get('constituency'),
            "district": data.get('district'),
            "state": data.get('state'),
            "country": data.get('country', 'India'),
            "registration_start": data['registration_start'],
            "registration_end": data['registration_end'],
            "voting_start": data['voting_start'],
            "voting_end": data['voting_end'],
            "results_publish": data.get('results_publish'),
            "status": data.get('status', 'draft'),  # draft, scheduled, active, completed, cancelled
            "max_candidates": data.get('max_candidates', 1),
            "allow_write_ins": data.get('allow_write_ins', False),
            "require_face_verification": data.get('require_face_verification', True),
            "results_visibility": data.get('results_visibility', 'after_end'),  # live, after_end, manual
            "encryption_key": data.get('encryption_key'),
            "is_encrypted": data.get('is_encrypted', True),
            "created_by": data.get('created_by'),
            "voter_turnout": 0,
            "total_votes": 0,
            "is_active": data.get('is_active', True),
            "eligibility_criteria": data.get('eligibility_criteria', {}),
            "timezone": data.get('timezone', 'UTC')
        }
        
        return cls.create(election_data)
    
    @classmethod
    def generate_election_id(cls):
        """Generate unique election ID"""
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
        random_str = ''.join(random.choices(string.digits, k=4))
        election_id = f'ELECT{timestamp}{random_str}'
        
        while cls.find_by_election_id(election_id):
            random_str = ''.join(random.choices(string.digits, k=4))
            election_id = f'ELECT{timestamp}{random_str}'
        
        return election_id
    
    @classmethod
    def find_by_election_id(cls, election_id):
        return cls.get_collection().find_one({"election_id": election_id})
    
    @classmethod
    def get_active_elections(cls):
        """Get all active elections"""
        return cls.find_all({
            "status": "active",
            "is_active": True
        })
    
    @classmethod
    def get_upcoming_elections(cls):
        """Get upcoming elections"""
        return cls.find_all({
            "status": "scheduled",
            "voting_start": {"$gt": datetime.utcnow()},
            "is_active": True
        })
    
    @classmethod
    def update_election_status(cls, election_id, status):
        """Update election status"""
        valid_statuses = ['draft', 'scheduled', 'active', 'completed', 'cancelled']
        if status not in valid_statuses:
            raise ValueError(f"Status must be one of {valid_statuses}")
        
        return cls.update_one(
            {"election_id": election_id},
            {"status": status}
        )

class Candidate(MongoBase):
    collection_name = "candidates"
    
    @classmethod
    def create_candidate(cls, data):
        """Create a new candidate"""
        candidate_id = cls.generate_candidate_id()
        
        candidate_data = {
            "candidate_id": candidate_id,
            "election_id": data['election_id'],
            "full_name": data['full_name'],
            "party": data.get('party'),
            "party_symbol": data.get('party_symbol'),
            "photo": data.get('photo'),
            "biography": data.get('biography'),
            "manifesto": data.get('manifesto'),
            "qualifications": data.get('qualifications'),
            "experience": data.get('experience'),
            "email": data.get('email'),
            "phone": data.get('phone'),
            "website": data.get('website'),
            "is_active": data.get('is_active', True),
            "is_approved": data.get('is_approved', False),
            "nominated_by": data.get('nominated_by'),
            "nomination_date": data.get('nomination_date', datetime.utcnow()),
            "vote_count": 0,
            "candidate_number": data.get('candidate_number'),
            "campaign_info": data.get('campaign_info', {})
        }
        
        return cls.create(candidate_data)
    
    @classmethod
    def generate_candidate_id(cls):
        """Generate unique candidate ID"""
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
        random_str = ''.join(random.choices(string.digits, k=4))
        return f'CAND{timestamp}{random_str}'
    
    @classmethod
    def find_by_election(cls, election_id):
        """Find all candidates for an election"""
        return cls.find_all({
            "election_id": election_id,
            "is_active": True
        })
    
    @classmethod
    def increment_vote_count(cls, candidate_id):
        """Increment candidate's vote count"""
        return cls.get_collection().update_one(
            {"candidate_id": candidate_id},
            {"$inc": {"vote_count": 1}}
        )

    # In mongo_models.py - Add to Candidate class
    @classmethod
    def find_by_candidate_id(cls, candidate_id):
        """Find candidate by candidate_id"""
        return cls.find_one({"candidate_id": candidate_id})
class Vote(MongoBase):
    collection_name = "votes"
    
    @classmethod
    def create_vote(cls, data):
        """Create a new vote record"""
        vote_id = cls.generate_vote_id()
        
        vote_data = {
            "vote_id": vote_id,
            "election_id": data['election_id'],
            "voter_id": data['voter_id'],
            "candidate_id": data['candidate_id'],
            "vote_data": data.get('vote_data'),
            "write_in_candidate": data.get('write_in_candidate'),
            "face_verified": data.get('face_verified', False),
            "ip_address": data.get('ip_address'),
            "user_agent": data.get('user_agent'),
            "vote_hash": data.get('vote_hash'),
            "is_verified": data.get('is_verified', True),
            "vote_timestamp": datetime.utcnow(),
            "location_data": data.get('location_data'),
            "device_fingerprint": data.get('device_fingerprint')
        }
        
        return cls.create(vote_data)
    
    @classmethod
    def generate_vote_id(cls):
        """Generate unique vote ID"""
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
        random_str = ''.join(random.choices(string.digits, k=4))
        return f'VOTE{timestamp}{random_str}'
    
    @classmethod
    def find_by_election_and_voter(cls, election_id, voter_id):
        """Find vote by election and voter"""
        return cls.find_one({
            "election_id": election_id,
            "voter_id": voter_id,
            "is_verified": True
        })
    
    @classmethod
    def has_voted(cls, election_id, voter_id):
        """Check if voter has already voted in this election"""
        vote = cls.find_by_election_and_voter(election_id, voter_id)
        return vote is not None
    
    @classmethod
    def get_election_results(cls, election_id):
        """Get election results with vote counts"""
        pipeline = [
            {"$match": {"election_id": election_id, "is_verified": True}},
            {"$group": {
                "_id": "$candidate_id",
                "total_votes": {"$sum": 1}
            }},
            {"$sort": {"total_votes": -1}}
        ]
        return cls.aggregate(pipeline)



class Admin(MongoBase):
    collection_name = "admins"
    
    @classmethod
    def create_admin(cls, data):
        """Create a new admin user"""
        if cls.find_by_username(data['username']):
            raise ValueError("Admin username already exists")
        if cls.find_by_email(data['email']):
            raise ValueError("Admin email already exists")
        
        admin_id = cls.generate_admin_id()
        
        # Use bcrypt directly with proper encoding
        password_bytes = data['password'].encode('utf-8')
        password_hash = bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode('utf-8')
        
        admin_data = {
            "admin_id": admin_id,
            "username": data['username'],
            "email": data['email'],
            "password_hash": password_hash,
            "full_name": data['full_name'],
            "role": data.get('role', 'moderator'),  # superadmin, admin, moderator
            "permissions": data.get('permissions', {}),
            "is_active": data.get('is_active', True),
            "last_login": data.get('last_login'),
            "profile_picture": data.get('profile_picture'),
            "phone": data.get('phone'),
            "department": data.get('department'),
            "access_level": data.get('access_level', 1),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        return cls.create(admin_data)
    
    @classmethod
    def generate_admin_id(cls):
        """Generate unique admin ID"""
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
        random_str = ''.join(random.choices(string.digits, k=4))
        return f'ADMIN{timestamp}{random_str}'
    
    @classmethod
    def find_by_username(cls, username):
        """Find admin by username"""
        print(f"🔍 Searching for admin with username: '{username}'")
        try:
            admin = cls.get_collection().find_one({"username": username})
            if admin:
                print(f"Admin found: {admin.get('username')} - {admin.get('admin_id')}")
            else:
                print(f"Admin NOT found with username: '{username}'")
                # Debug: List all usernames in admins collection
                all_admins = list(cls.get_collection().find({}, {'username': 1}))
                print(f"   📋 All available usernames: {[a.get('username') for a in all_admins]}")
            return admin
        except Exception as e:
            print(f"Error in find_by_username: {str(e)}")
            return None
    
    @classmethod
    def find_by_email(cls, email):
        return cls.get_collection().find_one({"email": email})
    
    @classmethod
    def find_by_admin_id(cls, admin_id):
        """Find admin by admin_id"""
        print(f"🔍 Searching for admin with admin_id: '{admin_id}'")
        try:
            admin = cls.get_collection().find_one({"admin_id": admin_id})
            if admin:
                print(f"Admin found by admin_id: {admin.get('username')} - {admin.get('admin_id')}")
            else:
                print(f"Admin NOT found with admin_id: '{admin_id}'")
            return admin
        except Exception as e:
            print(f"Error in find_by_admin_id: {str(e)}")
            return None
    
    @classmethod
    def verify_password(cls, admin_doc, password):
        """Verify admin password"""
        if not admin_doc or 'password_hash' not in admin_doc:
            print("No admin document or password hash found")
            return False
        
        try:
            # Use bcrypt directly with proper encoding
            password_bytes = password.encode('utf-8')
            stored_hash = admin_doc['password_hash']
            
            # Handle both string and bytes stored hash
            if isinstance(stored_hash, str):
                stored_hash_bytes = stored_hash.encode('utf-8')
            else:
                stored_hash_bytes = stored_hash
                
            # Verify password
            result = bcrypt.checkpw(password_bytes, stored_hash_bytes)
            print(f"🔐 Password verification result: {result}")
            return result
            
        except Exception as e:
            print(f"Password verification error: {str(e)}")
            return False
    
    @classmethod
    def get_all_admins(cls):
        """Get all admins"""
        return cls.find_all({}, {'password_hash': 0})
    
    @classmethod
    def update_last_login(cls, admin_id):
        """Update admin's last login timestamp"""
        return cls.update_one(
            {"admin_id": admin_id},
            {"last_login": datetime.utcnow()}
        )

class IDDocument(MongoBase):
    """Model for ID document storage and verification"""
    collection_name = "id_documents"
    
    @classmethod
    def create_document(cls, voter_id, document_data, document_type='aadhar'):
        """Create ID document record"""
        document_id = str(uuid.uuid4())
        
        document_doc = {
            "document_id": document_id,
            "voter_id": voter_id,
            "document_type": document_type,
            "document_data": document_data,  # Base64 encoded document or file path
            "uploaded_at": datetime.utcnow(),
            "verified": False,
            "verified_by": None,
            "verified_at": None,
            "verification_status": "pending",  # pending, approved, rejected
            "rejection_reason": None,
            "is_active": True
        }
        
        return cls.create(document_doc)
    
    @classmethod
    def find_by_voter_id(cls, voter_id):
        """Find ID document by voter ID"""
        return cls.find_one({
            "voter_id": voter_id,
            "is_active": True
        })
    
    @classmethod
    def verify_document(cls, document_id, verified_by, status='approved', rejection_reason=None):
        """Verify ID document"""
        update_data = {
            "verified": status == 'approved',
            "verified_by": verified_by,
            "verified_at": datetime.utcnow(),
            "verification_status": status,
            "rejection_reason": rejection_reason
        }
        
        return cls.update_one(
            {"document_id": document_id},
            update_data
        )

class AuditLog(MongoBase):
    collection_name = "audit_logs"
    
    @classmethod
    def create_log(cls, action, user_id, user_type, details, ip_address=None, user_agent=None):
        """Create audit log entry"""
        log_data = {
            "log_id": str(uuid.uuid4()),
            "action": action,  # login, vote, registration, update, delete
            "user_id": user_id,
            "user_type": user_type,  # voter, admin, system
            "details": details,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "timestamp": datetime.utcnow()
        }
        
        return cls.create(log_data)

# Additional specialized collections
class SystemStats(MongoBase):
    collection_name = "system_stats"
    
    @classmethod
    def update_stats(cls, stats_type, data):
        """Update system statistics"""
        return cls.update_one(
            {"stats_type": stats_type},
            {"$set": data, "$inc": {"update_count": 1}}
        )

class LoginSession(MongoBase):
    collection_name = "login_sessions"
    
    @classmethod
    def create_session(cls, user_id, user_type, session_token, expires_at):
        """Create login session"""
        session_data = {
            "session_id": str(uuid.uuid4()),
            "user_id": user_id,
            "user_type": user_type,
            "session_token": session_token,
            "expires_at": expires_at,
            "is_active": True,
            "created_at": datetime.utcnow()
        }
        
        return cls.create(session_data)

class VoterEligibility(MongoBase):
    collection_name = "voter_eligibility"
    
    @classmethod
    def check_eligibility(cls, voter_id, election_id):
        """Check if voter is eligible for an election"""
        return cls.find_one({
            "voter_id": voter_id,
            "election_id": election_id,
            "is_eligible": True
        })

class ElectionResult(MongoBase):
    collection_name = "election_results"
    
    @classmethod
    def find_by_election(cls, election_id):
        """Find results for an election"""
        return cls.find_one({
            "election_id": election_id
        }, sort=[("calculated_at", -1)])
    
    @classmethod
    def create_or_update_result(cls, election_id, results_data):
        """Create or update election results"""
        existing = cls.find_by_election(election_id)
        
        result_data = {
            "result_id": str(uuid.uuid4()),
            "election_id": election_id,
            "results_data": results_data,
            "calculated_at": datetime.utcnow(),
            "is_final": results_data.get('is_final', False),
            "total_votes": results_data.get('total_votes', 0),
            "voter_turnout": results_data.get('voter_turnout', 0)
        }
        
        if existing:
            return cls.update_one(
                {"_id": existing['_id']},
                result_data
            )
        else:
            result_data["result_id"] = str(uuid.uuid4())
            return cls.create(result_data)

# Helper functions
def generate_voter_id():
    """Generate unique voter ID"""
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    voter_id = f'VOTER{timestamp}{random_str}'
    
    # Ensure uniqueness
    while Voter.find_by_voter_id(voter_id):
        random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        voter_id = f'VOTER{timestamp}{random_str}'
    
    return voter_id

def calculate_age(date_of_birth):
    """Calculate age from date of birth"""
    if isinstance(date_of_birth, str):
        date_of_birth = datetime.strptime(date_of_birth, '%Y-%m-%d').date()
    elif isinstance(date_of_birth, datetime):
        date_of_birth = date_of_birth.date()
    
    today = date.today()
    return today.year - date_of_birth.year - (
        (today.month, today.day) < (date_of_birth.month, date_of_birth.day)
    )

def generate_unique_id(prefix, length=8):
    """Generate unique ID with prefix"""
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
    return f'{prefix}{timestamp}{random_str}'

def hash_data(data):
    """Hash sensitive data"""
    # Use bcrypt directly with proper encoding
    data_bytes = data.encode('utf-8')
    return bcrypt.hashpw(data_bytes, bcrypt.gensalt()).decode('utf-8')


def create_dashboard_indexes():
    """Create indexes for dashboard performance"""
    collections = mongo.db
    
    # Voter indexes
    collections.voters.create_index([("voter_id", 1)], unique=True)
    collections.voters.create_index([("email", 1)], unique=True)
    collections.voters.create_index([("constituency", 1)])
    
    # Election indexes
    collections.elections.create_index([("election_id", 1)], unique=True)
    collections.elections.create_index([("voting_start", 1)])
    collections.elections.create_index([("election_type", 1)])
    collections.elections.create_index([("status", 1)])
    
    # Vote indexes
    collections.votes.create_index([("voter_id", 1), ("election_id", 1)], unique=True)
    collections.votes.create_index([("vote_timestamp", -1)])
    
    # Candidate indexes
    collections.candidates.create_index([("election_id", 1)])
    
    # Audit log indexes
    collections.audit_logs.create_index([("user_id", 1)])
    collections.audit_logs.create_index([("timestamp", -1)])