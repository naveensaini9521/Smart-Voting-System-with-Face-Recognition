from smart_app.backend.extensions import db
from bcrypt import hashpw, gensalt, checkpw
from datetime import datetime
import json

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='voter')
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    voter = db.relationship('Voter', backref='user', uselist=False, cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = hashpw(password.encode('utf-8'), gensalt()).decode('utf-8')
    
    def check_password(self, password):
        return checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'role': self.role,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat()
        }
        
class Voter(db.Model):
    __tablename__ = 'voters'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    national_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    date_of_birth = db.Column(db.Date, nullable=False)
    
    # Address fields
    street = db.Column(db.String(200))
    city = db.Column(db.String(100))
    state = db.Column(db.String(100))
    zip_code = db.Column(db.String(20))
    
    # Face recognition data
    face_encoding = db.Column(db.Text)  # JSON string of face encoding
    face_image_url = db.Column(db.String(500))
    is_face_verified = db.Column(db.Boolean, default=False)
    has_voted = db.Column(db.Boolean, default=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    votes = db.relationship('Vote', backref='voter', cascade='all, delete-orphan')
    
    def set_face_encoding(self, encoding_list):
        self.face_encoding = json.dumps(encoding_list)
    
    def get_face_encoding(self):
        if self.face_encoding:
            return json.loads(self.face_encoding)
        return None
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'national_id': self.national_id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'address': {
                'street': self.street,
                'city': self.city,
                'state': self.state,
                'zip_code': self.zip_code
            },
            'is_face_verified': self.is_face_verified,
            'has_voted': self.has_voted,
            'created_at': self.created_at.isoformat()
        }

class Candidate(db.Model):
    __tablename__ = 'candidates'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    party = db.Column(db.String(100), nullable=False)
    position = db.Column(db.String(100), nullable=False)
    election_id = db.Column(db.Integer, db.ForeignKey('elections.id'), nullable=False)
    bio = db.Column(db.Text)
    image_url = db.Column(db.String(500))
    agenda = db.Column(db.Text)  # JSON string of agenda items
    vote_count = db.Column(db.Integer, default=0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    votes = db.relationship('Vote', backref='candidate', cascade='all, delete-orphan')
    
    def set_agenda(self, agenda_list):
        self.agenda = json.dumps(agenda_list)
    
    def get_agenda(self):
        if self.agenda:
            return json.loads(self.agenda)
        return []
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'party': self.party,
            'position': self.position,
            'election_id': self.election_id,
            'bio': self.bio,
            'image_url': self.image_url,
            'agenda': self.get_agenda(),
            'vote_count': self.vote_count,
            'created_at': self.created_at.isoformat()
        }
        
class Election(db.Model):
    __tablename__ = 'elections'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='upcoming')  # upcoming, active, completed
    is_public = db.Column(db.Boolean, default=True)
    total_votes = db.Column(db.Integer, default=0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    candidates = db.relationship('Candidate', backref='election', cascade='all, delete-orphan')
    votes = db.relationship('Vote', backref='election', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat(),
            'status': self.status,
            'is_public': self.is_public,
            'total_votes': self.total_votes,
            'created_at': self.created_at.isoformat()
        }
        
class Vote(db.Model):
    __tablename__ = 'votes'
    
    id = db.Column(db.Integer, primary_key=True)
    voter_id = db.Column(db.Integer, db.ForeignKey('voters.id'), nullable=False)
    election_id = db.Column(db.Integer, db.ForeignKey('elections.id'), nullable=False)
    candidate_id = db.Column(db.Integer, db.ForeignKey('candidates.id'), nullable=False)
    
    # Audit fields
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Unique constraint to prevent duplicate votes
    __table_args__ = (
        db.UniqueConstraint('voter_id', 'election_id', name='unique_voter_election'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'voter_id': self.voter_id,
            'election_id': self.election_id,
            'candidate_id': self.candidate_id,
            'timestamp': self.timestamp.isoformat()
        }