# import os
# import json
# from datetime import datetime, date
# import enum
# from flask_login import UserMixin
# from werkzeug.security import generate_password_hash, check_password_hash
# from smart_app.backend.extensions import db, mongo
# import random
# import string
# import bcrypt
# from bson import ObjectId
# from flask import current_app

# class User(UserMixin, db.Model):
#     __tablename__ = 'users'
    
#     id = db.Column(db.Integer, primary_key=True)
#     username = db.Column(db.String(80), unique=True, nullable=False)
#     email = db.Column(db.String(120), unique=True, nullable=False)
#     password_hash = db.Column(db.String(255), nullable=False)
#     first_name = db.Column(db.String(100), nullable=False)
#     last_name = db.Column(db.String(100), nullable=False)
#     student_id = db.Column(db.String(50), unique=True)
#     face_encoding_ref = db.Column(db.String(100))
#     is_admin = db.Column(db.Boolean, default=False)
#     is_verified = db.Column(db.Boolean, default=False)
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)
#     last_login = db.Column(db.DateTime)
    
#     # Relationships
#     votes = db.relationship('Vote', backref='voter', lazy=True)
    
#     def set_password(self, password):
#         self.password_hash = generate_password_hash(password)
    
#     def check_password(self, password):
#         return check_password_hash(self.password_hash, password)

#     def store_face_encoding_mongo(self, encoding_data, image_metadata=None):
#         """Store face encoding in MongoDB and save reference"""
#         face_doc = {
#             "user_id": self.id,
#             "username": self.username,
#             "encoding_data": encoding_data.tolist() if hasattr(encoding_data, 'tolist') else encoding_data,
#             "image_metadata": image_metadata or {},
#             "created_at": datetime.utcnow(),
#             "updated_at": datetime.utcnow()
#         }
#         result = mongo.db.user_face_encodings.insert_one(face_doc)
#         self.face_encoding_ref = str(result.inserted_id)
#         return result.inserted_id

#     def get_face_encoding_mongo(self):
#         """Retrieve face encoding from MongoDB"""
#         if not self.face_encoding_ref:
#             return None
#         return mongo.db.user_face_encodings.find_one({"_id": ObjectId(self.face_encoding_ref)})
    
#     def to_dict(self):
#         return {
#             'id': self.id,
#             'username': self.username,
#             'email': self.email,
#             'first_name': self.first_name,
#             'last_name': self.last_name,
#             'student_id': self.student_id,
#             'is_admin': self.is_admin,
#             'is_verified': self.is_verified,
#             'created_at': self.created_at.isoformat() if self.created_at else None,
#             'last_login': self.last_login.isoformat() if self.last_login else None
#         }

# class UserStatus(enum.Enum):
#     PENDING = "pending"
#     VERIFIED = "verified"
#     REJECTED = "rejected"

# class Voter(db.Model):
#     __tablename__ = 'voters'
    
#     id = db.Column(db.Integer, primary_key=True)
#     voter_id = db.Column(db.String(20), unique=True, nullable=False)
    
#     # Personal Information
#     full_name = db.Column(db.String(100), nullable=False)
#     father_name = db.Column(db.String(100), nullable=False)
#     mother_name = db.Column(db.String(100))
#     gender = db.Column(db.String(10), nullable=False)
#     date_of_birth = db.Column(db.Date, nullable=False)
#     place_of_birth = db.Column(db.String(100))
    
#     # Contact Information
#     email = db.Column(db.String(120), unique=True, nullable=False)
#     phone = db.Column(db.String(15), unique=True, nullable=False)
#     alternate_phone = db.Column(db.String(15))
    
#     # Address Information
#     address_line1 = db.Column(db.String(200), nullable=False)
#     address_line2 = db.Column(db.String(200))
#     pincode = db.Column(db.String(10), nullable=False)
#     village_city = db.Column(db.String(100), nullable=False)
#     district = db.Column(db.String(100), nullable=False)
#     state = db.Column(db.String(100), nullable=False)
#     country = db.Column(db.String(100), default='India')
    
#     # Identity Information
#     national_id_type = db.Column(db.String(50), nullable=False)
#     national_id_number = db.Column(db.String(50), unique=True, nullable=False)
#     id_document_path = db.Column(db.String(500))
    
#     # Account Information
#     password_hash = db.Column(db.String(255), nullable=False)
#     security_question = db.Column(db.String(200))
#     security_answer_hash = db.Column(db.String(255))
    
#     # Verification Status
#     email_verified = db.Column(db.Boolean, default=False)
#     phone_verified = db.Column(db.Boolean, default=False)
#     id_verified = db.Column(db.Boolean, default=False)
#     face_verified = db.Column(db.Boolean, default=False)
#     is_active = db.Column(db.Boolean, default=True)
    
#     # Face Biometrics
#     face_encoding_path = db.Column(db.String(500))
    
#     # Timestamps
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)
#     updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
#     # Relationships
#     votes = db.relationship('Vote', backref='voter', lazy=True)
#     login_sessions = db.relationship('LoginSession', backref='voter', lazy=True)
#     eligibility = db.relationship('VoterEligibility', backref='voter', lazy=True)
#     nominated_candidates = db.relationship('Candidate', backref='nominator', lazy=True)

#     def generate_voter_id(self):
#         """Generate unique voter ID"""
#         timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
#         random_str = ''.join(random.choices(string.digits, k=4))
#         return f'VOTE{timestamp}{random_str}'

#     def set_password(self, password):
#         """Set password hash using bcrypt"""
#         self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
#     def check_password(self, password):
#         """Verify password using bcrypt"""
#         return bcrypt.check_password_hash(self.password_hash, password)
    
#     def set_security_answer(self, answer):
#         """Set security answer hash"""
#         self.security_answer_hash = bcrypt.generate_password_hash(answer).decode('utf-8')
    
#     def check_security_answer(self, answer):
#         """Verify security answer"""
#         if not self.security_answer_hash:
#             return False
#         return bcrypt.check_password_hash(self.security_answer_hash, answer)
    
#     def store_face_encoding_mongo(self, encoding_data, image_metadata=None):
#         """Store face encoding in MongoDB and save reference"""
#         try:
#             face_doc = {
#                 "voter_id": self.voter_id,
#                 "full_name": self.full_name,
#                 "encoding_data": encoding_data.tolist() if hasattr(encoding_data, 'tolist') else encoding_data,
#                 "image_metadata": image_metadata or {
#                     "captured_at": datetime.utcnow(),
#                     "voter_age": self.calculate_current_age(),
#                     "gender": self.gender
#                 },
#                 "created_at": datetime.utcnow(),
#                 "updated_at": datetime.utcnow(),
#                 "is_active": True
#             }
#             result = mongo.db.voter_face_encodings.insert_one(face_doc)
#             self.face_encoding_path = str(result.inserted_id)
#             return result.inserted_id
#         except Exception as e:
#             current_app.logger.error(f"Error storing face encoding: {str(e)}")
#             return None

#     def get_face_encoding_mongo(self):
#         """Retrieve face encoding from MongoDB"""
#         if not self.face_encoding_path:
#             return None
#         try:
#             return mongo.db.voter_face_encodings.find_one({"_id": ObjectId(self.face_encoding_path)})
#         except Exception as e:
#             current_app.logger.error(f"Error retrieving face encoding: {str(e)}")
#             return None

#     def delete_face_encoding_mongo(self):
#         """Delete face encoding from MongoDB"""
#         if not self.face_encoding_path:
#             return False
#         try:
#             result = mongo.db.voter_face_encodings.delete_one({"_id": ObjectId(self.face_encoding_path)})
#             self.face_encoding_path = None
#             return result.deleted_count > 0
#         except Exception as e:
#             current_app.logger.error(f"Error deleting face encoding: {str(e)}")
#             return False

#     def verify_age(self):
#         """Verify voter is 18+ years old"""
#         if not self.date_of_birth:
#             return False
#         return self.calculate_current_age() >= 18

#     def calculate_current_age(self):
#         """Calculate current age from date of birth"""
#         if not self.date_of_birth:
#             return 0
#         today = date.today()
#         age = today.year - self.date_of_birth.year - (
#             (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
#         )
#         return age

#     def is_fully_verified(self):
#         """Check if voter is fully verified"""
#         return all([
#             self.email_verified,
#             self.phone_verified, 
#             self.id_verified,
#             self.face_verified,
#             self.is_active
#         ])

#     def get_verification_status(self):
#         """Get detailed verification status"""
#         return {
#             'email_verified': self.email_verified,
#             'phone_verified': self.phone_verified,
#             'id_verified': self.id_verified,
#             'face_verified': self.face_verified,
#             'is_active': self.is_active,
#             'fully_verified': self.is_fully_verified(),
#             'pending_verifications': [
#                 field for field in ['email', 'phone', 'id', 'face'] 
#                 if not getattr(self, f'{field}_verified')
#             ]
#         }

#     def can_vote_in_election(self, election_id):
#         """Check if voter can vote in specific election"""
#         from .models import VoterEligibility
        
#         # Check basic eligibility
#         if not self.is_fully_verified():
#             return False, "Voter not fully verified"
        
#         # Check age requirement for election
#         eligibility = VoterEligibility.query.filter_by(
#             election_id=election_id,
#             voter_id=self.voter_id
#         ).first()
        
#         if eligibility and not eligibility.is_eligible:
#             return False, eligibility.eligibility_reason or "Not eligible for this election"
        
#         return True, "Eligible to vote"

#     def has_already_voted(self, election_id):
#         """Check if voter has already voted in election"""
#         from .models import Vote
#         vote = Vote.query.filter_by(
#             election_id=election_id,
#             voter_id=self.voter_id
#         ).first()
#         return vote is not None

#     def to_dict(self):
#         """Convert voter data to dictionary for API responses"""
#         return {
#             'voter_id': self.voter_id,
#             'full_name': self.full_name,
#             'email': self.email,
#             'phone': self.phone,
#             'gender': self.gender,
#             'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
#             'age': self.calculate_current_age(),
#             'address': {
#                 'address_line1': self.address_line1,
#                 'address_line2': self.address_line2,
#                 'village_city': self.village_city,
#                 'district': self.district,
#                 'state': self.state,
#                 'pincode': self.pincode,
#                 'country': self.country
#             },
#             'national_id': {
#                 'type': self.national_id_type,
#                 'number': self.national_id_number
#             },
#             'constituency': f"{self.district} District",
#             'polling_station': f"PS-{self.pincode}",
#             'verification_status': self.get_verification_status(),
#             'is_verified': self.is_fully_verified(),
#             'created_at': self.created_at.isoformat() if self.created_at else None,
#             'updated_at': self.updated_at.isoformat() if self.updated_at else None
#         }

#     def to_public_dict(self):
#         """Convert to public dictionary (excludes sensitive info)"""
#         return {
#             'voter_id': self.voter_id,
#             'full_name': self.full_name,
#             'gender': self.gender,
#             'age': self.calculate_current_age(),
#             'constituency': f"{self.district} District",
#             'polling_station': f"PS-{self.pincode}",
#             'is_verified': self.is_fully_verified()
#         }

#     def update_contact_info(self, email=None, phone=None, alternate_phone=None):
#         """Update contact information and reset verification if changed"""
#         if email and email != self.email:
#             self.email = email
#             self.email_verified = False
        
#         if phone and phone != self.phone:
#             self.phone = phone
#             self.phone_verified = False
        
#         if alternate_phone is not None:
#             self.alternate_phone = alternate_phone
        
#         self.updated_at = datetime.utcnow()

#     def update_address(self, address_data):
#         """Update address information"""
#         address_fields = [
#             'address_line1', 'address_line2', 'pincode', 
#             'village_city', 'district', 'state', 'country'
#         ]
        
#         for field in address_fields:
#             if field in address_data:
#                 setattr(self, field, address_data[field])
        
#         self.updated_at = datetime.utcnow()

#     def deactivate_account(self):
#         """Deactivate voter account"""
#         self.is_active = False
#         self.updated_at = datetime.utcnow()

#     def reactivate_account(self):
#         """Reactivate voter account"""
#         self.is_active = True
#         self.updated_at = datetime.utcnow()

#     def get_voting_history(self):
#         """Get voter's voting history"""
#         from .models import Vote, Election
        
#         votes = Vote.query.filter_by(voter_id=self.voter_id).all()
#         voting_history = []
        
#         for vote in votes:
#             election = Election.query.filter_by(election_id=vote.election_id).first()
#             if election:
#                 voting_history.append({
#                     'election_id': vote.election_id,
#                     'election_title': election.title,
#                     'voted_at': vote.voted_at.isoformat() if vote.voted_at else None,
#                     'face_verified': vote.face_verified
#                 })
        
#         return voting_history

#     def __repr__(self):
#         return f'<Voter {self.voter_id} - {self.full_name}>'

#     @classmethod
#     def find_by_email(cls, email):
#         """Find voter by email"""
#         return cls.query.filter_by(email=email).first()

#     @classmethod
#     def find_by_phone(cls, phone):
#         """Find voter by phone"""
#         return cls.query.filter_by(phone=phone).first()

#     @classmethod
#     def find_by_national_id(cls, national_id_number):
#         """Find voter by national ID"""
#         return cls.query.filter_by(national_id_number=national_id_number).first()

#     @classmethod
#     def get_voters_by_constituency(cls, district, state):
#         """Get all voters in a constituency"""
#         return cls.query.filter_by(district=district, state=state, is_active=True).all()

#     @classmethod
#     def get_statistics(cls):
#         """Get voter statistics"""
#         total_voters = cls.query.count()
#         active_voters = cls.query.filter_by(is_active=True).count()
#         verified_voters = cls.query.filter(
#             cls.email_verified == True,
#             cls.phone_verified == True,
#             cls.id_verified == True,
#             cls.face_verified == True,
#             cls.is_active == True
#         ).count()
        
#         return {
#             'total_voters': total_voters,
#             'active_voters': active_voters,
#             'verified_voters': verified_voters,
#             'pending_verification': active_voters - verified_voters
#         }

# class OTP(db.Model):
#     __tablename__ = 'otps'
    
#     id = db.Column(db.Integer, primary_key=True)
#     email = db.Column(db.String(120))
#     phone = db.Column(db.String(15))
#     otp_code = db.Column(db.String(6), nullable=False)
#     purpose = db.Column(db.String(50), nullable=False)
#     expires_at = db.Column(db.DateTime, nullable=False)
#     is_used = db.Column(db.Boolean, default=False)
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)

# class LoginSession(db.Model):
#     __tablename__ = 'login_sessions'
    
#     id = db.Column(db.Integer, primary_key=True)
#     # FIX: Reference the actual primary key column
#     voter_id = db.Column(db.Integer, db.ForeignKey('voters.id'), nullable=False)
#     session_token = db.Column(db.String(255), unique=True, nullable=False)
#     face_verified = db.Column(db.Boolean, default=False)
#     login_time = db.Column(db.DateTime, default=datetime.utcnow)
#     logout_time = db.Column(db.DateTime)
#     ip_address = db.Column(db.String(45))
#     user_agent = db.Column(db.Text)
#     is_active = db.Column(db.Boolean, default=True)
# class Election(db.Model):
#     __tablename__ = 'elections'
    
#     id = db.Column(db.Integer, primary_key=True)
#     election_id = db.Column(db.String(20), unique=True, nullable=False)
#     title = db.Column(db.String(200), nullable=False)
#     description = db.Column(db.Text)
    
#     # Election Type
#     election_type = db.Column(db.String(50), nullable=False)
    
#     # Election Scope
#     constituency = db.Column(db.String(100))
#     district = db.Column(db.String(100))
#     state = db.Column(db.String(100))
#     country = db.Column(db.String(100), default='India')
    
#     # Election Timeline
#     registration_start = db.Column(db.DateTime, nullable=False)
#     registration_end = db.Column(db.DateTime, nullable=False)
#     voting_start = db.Column(db.DateTime, nullable=False)
#     voting_end = db.Column(db.DateTime, nullable=False)
#     results_publish = db.Column(db.DateTime)
    
#     # Election Status
#     status = db.Column(db.String(20), default='draft')
    
#     # Election Configuration
#     max_candidates = db.Column(db.Integer, default=1)
#     allow_write_ins = db.Column(db.Boolean, default=False)
#     require_face_verification = db.Column(db.Boolean, default=True)
#     results_visibility = db.Column(db.String(20), default='after_end')
    
#     # Security
#     encryption_key = db.Column(db.String(255))
#     is_encrypted = db.Column(db.Boolean, default=True)
    
#     # Metadata
#     created_by = db.Column(db.String(20), db.ForeignKey('admins.admin_id'))
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)
#     updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
#     # Relationships
#     candidates = db.relationship('Candidate', backref='election', lazy=True, cascade='all, delete-orphan')
#     votes = db.relationship('Vote', backref='election', lazy=True)
#     voter_eligibility = db.relationship('VoterEligibility', backref='election', lazy=True, cascade='all, delete-orphan')
    
#     def to_dict(self):
#         return {
#             'election_id': self.election_id,
#             'title': self.title,
#             'description': self.description,
#             'election_type': self.election_type,
#             'constituency': self.constituency,
#             'district': self.district,
#             'state': self.state,
#             'country': self.country,
#             'registration_start': self.registration_start.isoformat(),
#             'registration_end': self.registration_end.isoformat(),
#             'voting_start': self.voting_start.isoformat(),
#             'voting_end': self.voting_end.isoformat(),
#             'results_publish': self.results_publish.isoformat() if self.results_publish else None,
#             'status': self.status,
#             'max_candidates': self.max_candidates,
#             'allow_write_ins': self.allow_write_ins,
#             'require_face_verification': self.require_face_verification,
#             'results_visibility': self.results_visibility,
#             'candidate_count': len(self.candidates),
#             'total_votes': len(self.votes),
#             'created_at': self.created_at.isoformat(),
#             'time_remaining': self.get_time_remaining(),
#             'is_active': self.is_active(),
#             'can_vote': self.can_vote_now()
#         }
    
#     def is_active(self):
#         """Check if election is currently active"""
#         now = datetime.utcnow()
#         return (self.status == 'voting' and 
#                 self.voting_start <= now <= self.voting_end)
    
#     def can_vote_now(self):
#         """Check if voting is currently allowed"""
#         now = datetime.utcnow()
#         return (self.status == 'voting' and 
#                 self.voting_start <= now <= self.voting_end)
    
#     def is_registration_open(self):
#         """Check if registration is currently open"""
#         now = datetime.utcnow()
#         return (self.status == 'registration' and 
#                 self.registration_start <= now <= self.registration_end)
    
#     def get_time_remaining(self):
#         """Get time remaining for voting"""
#         now = datetime.utcnow()
#         if now < self.voting_start:
#             return {'status': 'not_started', 'remaining': self.voting_start - now}
#         elif now <= self.voting_end:
#             return {'status': 'ongoing', 'remaining': self.voting_end - now}
#         else:
#             return {'status': 'ended', 'remaining': None}
    
#     def get_results_visibility(self):
#         """Check if results are visible"""
#         now = datetime.utcnow()
#         if self.results_visibility == 'live':
#             return True
#         elif self.results_visibility == 'after_end' and now > self.voting_end:
#             return True
#         return False

# class Candidate(db.Model):
#     __tablename__ = 'candidates'
    
#     id = db.Column(db.Integer, primary_key=True)
#     candidate_id = db.Column(db.String(20), unique=True, nullable=False)
#     election_id = db.Column(db.Integer, db.ForeignKey('elections.id'), nullable=False)
    
#     # Candidate Information
#     full_name = db.Column(db.String(100), nullable=False)
#     party = db.Column(db.String(100))
#     party_symbol = db.Column(db.String(500))
#     photo = db.Column(db.String(500))
    
#     # Candidate Profile
#     biography = db.Column(db.Text)
#     manifesto = db.Column(db.Text)
#     qualifications = db.Column(db.Text)
#     experience = db.Column(db.Text)
    
#     # Contact Information
#     email = db.Column(db.String(120))
#     phone = db.Column(db.String(15))
#     website = db.Column(db.String(200))
    
#     # Status
#     is_active = db.Column(db.Boolean, default=True)
#     is_approved = db.Column(db.Boolean, default=False)
    
#     # Metadata
#     nominated_by = db.Column(db.String(20), db.ForeignKey('voters.voter_id'))
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)
#     updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
#     # Relationships
#     votes = db.relationship('Vote', backref='candidate', lazy=True)
#     nominator = db.relationship('Voter', backref='nominated_candidates', lazy=True)
#     election_results = db.relationship('ElectionResult', backref='candidate', lazy=True)
    
#     def to_dict(self):
#         return {
#             'candidate_id': self.candidate_id,
#             'election_id': self.election_id,
#             'full_name': self.full_name,
#             'party': self.party,
#             'party_symbol': self.party_symbol,
#             'photo': self.photo,
#             'biography': self.biography,
#             'manifesto': self.manifesto,
#             'qualifications': self.qualifications,
#             'experience': self.experience,
#             'email': self.email,
#             'phone': self.phone,
#             'website': self.website,
#             'is_active': self.is_active,
#             'is_approved': self.is_approved,
#             'vote_count': len(self.votes),
#             'created_at': self.created_at.isoformat()
#         }

# class Vote(db.Model):
#     __tablename__ = 'voter'
    
#     id = db.Column(db.Integer, primary_key=True)
#     vote_id = db.Column(db.String(20), unique=True, nullable=False)
#     election_id = db.Column(db.Integer, db.ForeignKey('elections.id'), nullable=False)
#     voter_id = db.Column(db.Integer, db.ForeignKey('voters.id'), nullable=False)  # This references Voter.id
#     candidate_id = db.Column(db.Integer, db.ForeignKey('candidates.id'), nullable=False)
    
#     # Vote Data
#     vote_data = db.Column(db.Text)
#     write_in_candidate = db.Column(db.String(100))
    
#     # Verification
#     face_verified = db.Column(db.Boolean, default=False)
#     ip_address = db.Column(db.String(45))
#     user_agent = db.Column(db.Text)
    
#     # Security
#     vote_hash = db.Column(db.String(255), unique=True)
#     is_verified = db.Column(db.Boolean, default=True)
    
#     # Timestamps
#     voted_at = db.Column(db.DateTime, default=datetime.utcnow)
    
#     def to_dict(self):
#         return {
#             'vote_id': self.vote_id,
#             'election_id': self.election_id,
#             'voter_id': self.voter_id,
#             'candidate_id': self.candidate_id,
#             'write_in_candidate': self.write_in_candidate,
#             'face_verified': self.face_verified,
#             'voted_at': self.voted_at.isoformat(),
#             'is_verified': self.is_verified
#         }
        
# class VoterEligibility(db.Model):
#     __tablename__ = 'voter_eligibility'
    
#     id = db.Column(db.Integer, primary_key=True)
#     election_id = db.Column(db.Integer, db.ForeignKey('elections.id'), nullable=False)
#     voter_id = db.Column(db.Integer, db.ForeignKey('voters.id'), nullable=False)
    
#     # Eligibility Criteria
#     constituency = db.Column(db.String(100))
#     district = db.Column(db.String(100))
#     state = db.Column(db.String(100))
#     min_age = db.Column(db.Integer, default=18)
#     max_age = db.Column(db.Integer)
    
#     # Status
#     is_eligible = db.Column(db.Boolean, default=True)
#     eligibility_reason = db.Column(db.Text)
    
#     # Verification
#     verified_by = db.Column(db.String(20), db.ForeignKey('admins.admin_id'))
#     verified_at = db.Column(db.DateTime)
    
#     # Metadata
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)
#     updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
#     def to_dict(self):
#         return {
#             'election_id': self.election_id,
#             'voter_id': self.voter_id,
#             'constituency': self.constituency,
#             'district': self.district,
#             'state': self.state,
#             'min_age': self.min_age,
#             'max_age': self.max_age,
#             'is_eligible': self.is_eligible,
#             'eligibility_reason': self.eligibility_reason,
#             'verified_at': self.verified_at.isoformat() if self.verified_at else None,
#             'created_at': self.created_at.isoformat()
#         }

# class ElectionResult(db.Model):
#     __tablename__ = 'election_results'
    
#     id = db.Column(db.Integer, primary_key=True)
    
#     # Fixed foreign keys - make sure these match your actual database schema
#     election_id = db.Column(db.Integer, db.ForeignKey('elections.id'), nullable=False)
#     candidate_id = db.Column(db.Integer, db.ForeignKey('candidates.id'), nullable=False)
    
#     # Results
#     total_votes = db.Column(db.Integer, default=0)
#     percentage = db.Column(db.Float, default=0.0)
    
#     # Statistics
#     male_votes = db.Column(db.Integer, default=0)
#     female_votes = db.Column(db.Integer, default=0)
#     other_votes = db.Column(db.Integer, default=0)
    
#     # Age group statistics
#     age_18_25 = db.Column(db.Integer, default=0)
#     age_26_40 = db.Column(db.Integer, default=0)
#     age_41_60 = db.Column(db.Integer, default=0)
#     age_60_plus = db.Column(db.Integer, default=0)
    
#     # Regional statistics
#     constituency_breakdown = db.Column(db.JSON)
    
#     # Timestamps
#     calculated_at = db.Column(db.DateTime, default=datetime.utcnow)
#     updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
#     # Relationships
#     election = db.relationship('Election', backref='results')
#     candidate = db.relationship('Candidate', backref='election_results')
    
#     def to_dict(self):
#         return {
#             'election_id': self.election_id,
#             'candidate_id': self.candidate_id,
#             'candidate_name': self.candidate.full_name if self.candidate else None,
#             'party': self.candidate.party if self.candidate else None,
#             'total_votes': self.total_votes,
#             'percentage': self.percentage,
#             'male_votes': self.male_votes,
#             'female_votes': self.female_votes,
#             'other_votes': self.other_votes,
#             'age_18_25': self.age_18_25,
#             'age_26_40': self.age_26_40,
#             'age_41_60': self.age_41_60,
#             'age_60_plus': self.age_60_plus,
#             'constituency_breakdown': self.constituency_breakdown or {},
#             'calculated_at': self.calculated_at.isoformat()
#         }

# class Admin(db.Model):
#     __tablename__ = 'admins'
    
#     id = db.Column(db.Integer, primary_key=True)
#     admin_id = db.Column(db.String(20), unique=True, nullable=False)
#     username = db.Column(db.String(50), unique=True, nullable=False)
#     email = db.Column(db.String(120), unique=True, nullable=False)
#     password_hash = db.Column(db.String(255), nullable=False)
    
#     # Admin Information
#     full_name = db.Column(db.String(100), nullable=False)
#     role = db.Column(db.String(50), default='moderator')
#     permissions = db.Column(db.JSON)
    
#     # Status
#     is_active = db.Column(db.Boolean, default=True)
#     last_login = db.Column(db.DateTime)
    
#     # Timestamps
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)
#     updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
#     # Relationships
#     created_elections = db.relationship('Election', backref='creator', lazy=True)
    
#     def set_password(self, password):
#         self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
#     def check_password(self, password):
#         return bcrypt.check_password_hash(self.password_hash, password)
    
#     def to_dict(self):
#         return {
#             'admin_id': self.admin_id,
#             'username': self.username,
#             'email': self.email,
#             'full_name': self.full_name,
#             'role': self.role,
#             'permissions': self.permissions or {},
#             'is_active': self.is_active,
#             'last_login': self.last_login.isoformat() if self.last_login else None,
#             'created_at': self.created_at.isoformat()
#         }

# class SystemStats(db.Model):
#     __tablename__ = 'system_stats'
    
#     id = db.Column(db.Integer, primary_key=True)
#     date = db.Column(db.Date, nullable=False, unique=True, default=date.today)
    
#     # User Statistics
#     total_users = db.Column(db.Integer, default=0)
#     new_users_today = db.Column(db.Integer, default=0)
#     active_users_today = db.Column(db.Integer, default=0)
    
#     # Voter Statistics
#     total_voters = db.Column(db.Integer, default=0)
#     approved_voters = db.Column(db.Integer, default=0)
#     pending_voters = db.Column(db.Integer, default=0)
    
#     # Election Statistics
#     total_elections = db.Column(db.Integer, default=0)
#     active_elections = db.Column(db.Integer, default=0)
#     completed_elections = db.Column(db.Integer, default=0)
#     upcoming_elections = db.Column(db.Integer, default=0)
    
#     # Voting Statistics
#     total_votes = db.Column(db.Integer, default=0)
#     votes_today = db.Column(db.Integer, default=0)
#     average_votes_per_election = db.Column(db.Float, default=0.0)
    
#     # System Performance
#     system_uptime = db.Column(db.Float, default=100.0)
#     average_response_time = db.Column(db.Float, default=0.0)
#     error_rate = db.Column(db.Float, default=0.0)
    
#     # Face Recognition Statistics
#     face_verification_attempts = db.Column(db.Integer, default=0)
#     face_verification_success = db.Column(db.Integer, default=0)
#     face_verification_failure = db.Column(db.Integer, default=0)
    
#     # Security Statistics
#     failed_login_attempts = db.Column(db.Integer, default=0)
#     blocked_ips = db.Column(db.Integer, default=0)
#     security_incidents = db.Column(db.Integer, default=0)
    
#     # Storage Statistics
#     total_storage_used = db.Column(db.BigInteger, default=0)
#     image_storage_used = db.Column(db.BigInteger, default=0)
#     database_size = db.Column(db.BigInteger, default=0)
    
#     # Additional Metrics
#     peak_concurrent_users = db.Column(db.Integer, default=0)
#     api_requests_today = db.Column(db.Integer, default=0)
#     page_views_today = db.Column(db.Integer, default=0)
    
#     # System Status
#     system_status = db.Column(db.String(50), default='operational')
#     last_maintenance = db.Column(db.DateTime)
#     next_maintenance = db.Column(db.DateTime)
    
#     # Timestamps
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)
#     updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

#     def store_detailed_analytics_mongo(self):
#         """Store detailed analytics in MongoDB for better querying"""
#         analytics_doc = {
#             "date": self.date,
#             "system_stats_id": self.id,
#             "user_metrics": {
#                 "total_users": self.total_users,
#                 "new_users_today": self.new_users_today,
#                 "active_users_today": self.active_users_today,
#                 "growth_rate": self.calculate_user_growth_rate()
#             },
#             "voting_metrics": {
#                 "total_voters": self.total_voters,
#                 "approved_voters": self.approved_voters,
#                 "pending_voters": self.pending_voters,
#                 "total_votes": self.total_votes,
#                 "votes_today": self.votes_today,
#                 "turnout_rate": self.calculate_voter_turnout_rate()
#             },
#             "election_metrics": {
#                 "total_elections": self.total_elections,
#                 "active_elections": self.active_elections,
#                 "completed_elections": self.completed_elections,
#                 "upcoming_elections": self.upcoming_elections,
#                 "success_rate": self.calculate_election_success_rate()
#             },
#             "performance_metrics": {
#                 "system_uptime": self.system_uptime,
#                 "average_response_time": self.average_response_time,
#                 "error_rate": self.error_rate,
#                 "performance_grade": self.get_performance_grade()
#             },
#             "security_metrics": {
#                 "face_recognition_accuracy": self.calculate_face_recognition_accuracy(),
#                 "failed_login_attempts": self.failed_login_attempts,
#                 "blocked_ips": self.blocked_ips,
#                 "security_incidents": self.security_incidents,
#                 "security_score": self.calculate_security_score()
#             },
#             "created_at": datetime.utcnow()
#         }
#         return mongo.db.system_analytics.insert_one(analytics_doc)
    
#     def to_dict(self):
#         return {
#             'id': self.id,
#             'date': self.date.isoformat() if self.date else None,
#             'total_users': self.total_users,
#             'new_users_today': self.new_users_today,
#             'active_users_today': self.active_users_today,
#             'total_voters': self.total_voters,
#             'approved_voters': self.approved_voters,
#             'pending_voters': self.pending_voters,
#             'user_growth_rate': self.calculate_user_growth_rate(),
#             'total_elections': self.total_elections,
#             'active_elections': self.active_elections,
#             'completed_elections': self.completed_elections,
#             'upcoming_elections': self.upcoming_elections,
#             'election_success_rate': self.calculate_election_success_rate(),
#             'total_votes': self.total_votes,
#             'votes_today': self.votes_today,
#             'average_votes_per_election': self.average_votes_per_election,
#             'voter_turnout_rate': self.calculate_voter_turnout_rate(),
#             'system_uptime': self.system_uptime,
#             'average_response_time': self.average_response_time,
#             'error_rate': self.error_rate,
#             'performance_grade': self.get_performance_grade(),
#             'face_verification_attempts': self.face_verification_attempts,
#             'face_verification_success': self.face_verification_success,
#             'face_verification_failure': self.face_verification_failure,
#             'face_recognition_accuracy': self.calculate_face_recognition_accuracy(),
#             'failed_login_attempts': self.failed_login_attempts,
#             'blocked_ips': self.blocked_ips,
#             'security_incidents': self.security_incidents,
#             'security_score': self.calculate_security_score(),
#             'total_storage_used': self.total_storage_used,
#             'image_storage_used': self.image_storage_used,
#             'database_size': self.database_size,
#             'storage_usage_percentage': self.calculate_storage_usage(),
#             'peak_concurrent_users': self.peak_concurrent_users,
#             'api_requests_today': self.api_requests_today,
#             'page_views_today': self.page_views_today,
#             'system_status': self.system_status,
#             'last_maintenance': self.last_maintenance.isoformat() if self.last_maintenance else None,
#             'next_maintenance': self.next_maintenance.isoformat() if self.next_maintenance else None,
#             'created_at': self.created_at.isoformat() if self.created_at else None,
#             'updated_at': self.updated_at.isoformat() if self.updated_at else None
#         }
    
#     def calculate_user_growth_rate(self):
#         if self.total_users <= 0:
#             return 0.0
#         return round((self.new_users_today / max(1, self.total_users - self.new_users_today)) * 100, 2)
    
#     def calculate_election_success_rate(self):
#         if self.total_elections <= 0:
#             return 0.0
#         return round((self.completed_elections / self.total_elections) * 100, 2)
    
#     def calculate_voter_turnout_rate(self):
#         if self.total_voters <= 0 or self.total_votes <= 0:
#             return 0.0
#         return round((self.total_votes / (self.total_voters * max(1, self.completed_elections))) * 100, 2)
    
#     def calculate_face_recognition_accuracy(self):
#         if self.face_verification_attempts <= 0:
#             return 0.0
#         return round((self.face_verification_success / self.face_verification_attempts) * 100, 2)
    
#     def calculate_security_score(self):
#         base_score = 100
#         if self.security_incidents > 0:
#             base_score -= min(30, self.security_incidents * 5)
#         if self.failed_login_attempts > 100:
#             base_score -= min(20, (self.failed_login_attempts - 100) // 50)
#         return max(0, base_score)
    
#     def calculate_storage_usage(self):
#         total_available = 1024 * 1024 * 1024  # 1GB
#         if total_available <= 0:
#             return 0.0
#         return round((self.total_storage_used / total_available) * 100, 2)
    
#     def get_performance_grade(self):
#         if self.system_uptime >= 99.9 and self.average_response_time <= 100 and self.error_rate <= 0.1:
#             return 'A+'
#         elif self.system_uptime >= 99.5 and self.average_response_time <= 200 and self.error_rate <= 0.5:
#             return 'A'
#         elif self.system_uptime >= 99.0 and self.average_response_time <= 500 and self.error_rate <= 1.0:
#             return 'B'
#         else:
#             return 'C'
    
#     def __repr__(self):
#         return f'<SystemStats {self.date}>'

# # MongoDB-specific collections
# class MongoDBCollections:
#     USER_FACE_ENCODINGS = "user_face_encodings"
#     VOTER_FACE_ENCODINGS = "voter_face_encodings"
#     VOTE_TRANSACTIONS = "vote_transactions"
#     ELECTION_ANALYTICS = "election_analytics"
#     SYSTEM_ANALYTICS = "system_analytics"
#     AUDIT_LOGS = "audit_logs"
#     SECURITY_EVENTS = "security_events"
    
# # Add this to the end of your models.py file

# class MongoDBManager:
#     """Manager class for MongoDB operations"""
    
#     @staticmethod
#     def get_collection(collection_name):
#         """Get MongoDB collection"""
#         return mongo.db[collection_name]
    
#     @staticmethod
#     def get_database_stats():
#         """Get MongoDB database statistics"""
#         try:
#             return mongo.db.command("dbstats")
#         except Exception as e:
#             current_app.logger.error(f"Error getting database stats: {str(e)}")
#             return None
    
#     @staticmethod
#     def get_collection_stats(collection_name):
#         """Get collection statistics"""
#         try:
#             return mongo.db.command("collstats", collection_name)
#         except Exception as e:
#             current_app.logger.error(f"Error getting collection stats for {collection_name}: {str(e)}")
#             return None
    
#     @staticmethod
#     def backup_database(backup_path=None):
#         """Create database backup (conceptual - you'd use mongodump in production)"""
#         current_app.logger.info("Database backup triggered")
#         # In production, you'd call mongodump here
#         return True
    
#     @staticmethod
#     def cleanup_old_data(collection_name, days_old=30):
#         """Clean up data older than specified days"""
#         try:
#             from datetime import datetime, timedelta
#             cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            
#             result = mongo.db[collection_name].delete_many({
#                 "created_at": {"$lt": cutoff_date}
#             })
            
#             current_app.logger.info(f"Cleaned up {result.deleted_count} old documents from {collection_name}")
#             return result.deleted_count
#         except Exception as e:
#             current_app.logger.error(f"Error cleaning up old data: {str(e)}")
#             return 0

# # MongoDB-specific document models
# class FaceEncodingDocument:
#     """MongoDB document structure for face encodings"""
    
#     @staticmethod
#     def create_user_face_doc(user_id, username, encoding_data, image_metadata=None):
#         return {
#             "user_id": user_id,
#             "username": username,
#             "encoding_data": encoding_data.tolist() if hasattr(encoding_data, 'tolist') else encoding_data,
#             "image_metadata": image_metadata or {},
#             "created_at": datetime.utcnow(),
#             "updated_at": datetime.utcnow(),
#             "version": "1.0"
#         }
    
#     @staticmethod
#     def create_voter_face_doc(voter_id, full_name, encoding_data, image_metadata=None):
#         return {
#             "voter_id": voter_id,
#             "full_name": full_name,
#             "encoding_data": encoding_data.tolist() if hasattr(encoding_data, 'tolist') else encoding_data,
#             "image_metadata": image_metadata or {
#                 "captured_at": datetime.utcnow(),
#                 "quality_score": 0.95,
#                 "detection_confidence": 0.98
#             },
#             "created_at": datetime.utcnow(),
#             "updated_at": datetime.utcnow(),
#             "is_active": True,
#             "version": "1.0"
#         }

# # Enhanced Voter class with better MongoDB integration
# class Voter(db.Model):
#     # ... your existing Voter class code remains the same ...
    
#     def store_face_encoding_mongo_enhanced(self, encoding_data, image_metadata=None):
#         """Enhanced method to store face encoding in MongoDB"""
#         try:
#             face_doc = FaceEncodingDocument.create_voter_face_doc(
#                 self.voter_id, 
#                 self.full_name, 
#                 encoding_data, 
#                 image_metadata
#             )
            
#             result = mongo.db.voter_face_encodings.insert_one(face_doc)
#             self.face_encoding_path = str(result.inserted_id)
            
#             # Also update the document with the reference
#             mongo.db.voter_face_encodings.update_one(
#                 {"_id": result.inserted_id},
#                 {"$set": {"sql_reference_id": self.face_encoding_path}}
#             )
            
#             return result.inserted_id
#         except Exception as e:
#             current_app.logger.error(f"Error storing face encoding: {str(e)}")
#             return None

#     def get_all_face_encodings(self):
#         """Get all face encodings for this voter (if multiple entries exist)"""
#         try:
#             return list(mongo.db.voter_face_encodings.find({
#                 "voter_id": self.voter_id
#             }).sort("created_at", -1))
#         except Exception as e:
#             current_app.logger.error(f"Error retrieving face encodings: {str(e)}")
#             return []