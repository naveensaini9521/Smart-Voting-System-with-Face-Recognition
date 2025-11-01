from flask import current_app
from smart_app.backend.extensions import mongo

def create_collections(app):
    """Create ALL MongoDB collections"""
    with app.app_context():
        try:
            # Test connection first
            mongo.db.command('ping')
            current_app.logger.info("MongoDB connection successful")
            
            # Get database instance
            db = mongo.db
            
            # List of ALL collections needed
            collections = [
                # Main application collections
                "users",
                "voters", 
                "elections",
                "candidates",
                "votes",
                "admins",
                "otps",
                "login_sessions",
                "voter_eligibility",
                "election_results",
                "system_stats",
                
                # Face recognition collections
                "user_face_encodings",
                "voter_face_encodings", 
                
                # Analytics collections
                "vote_transactions",
                "election_analytics",
                "system_analytics",
                "audit_logs",
                "security_events"
            ]
            
            created_collections = []
            existing_collections = []
            
            for collection_name in collections:
                if collection_name not in db.list_collection_names():
                    # Create collection
                    db.create_collection(collection_name)
                    created_collections.append(collection_name)
                    current_app.logger.info(f"Created MongoDB collection: {collection_name}")
                else:
                    existing_collections.append(collection_name)
            
            # Create indexes for better performance
            create_indexes(db)
            
            current_app.logger.info(f"MongoDB initialization complete.")
            current_app.logger.info(f"Created collections: {created_collections}")
            current_app.logger.info(f"Existing collections: {existing_collections}")
            
        except Exception as e:
            current_app.logger.error(f"Error creating MongoDB collections: {str(e)}")
            current_app.logger.warning("Continuing without MongoDB collections")

def create_indexes(db):
    """Create indexes for MongoDB collections"""
    try:
        # Users indexes
        db.users.create_index([("username", 1)], unique=True)
        db.users.create_index([("email", 1)], unique=True)
        
        # Voters indexes
        db.voters.create_index([("voter_id", 1)], unique=True)
        db.voters.create_index([("email", 1)], unique=True)
        db.voters.create_index([("phone", 1)], unique=True)
        db.voters.create_index([("national_id_number", 1)], unique=True)
        db.voters.create_index([("district", 1), ("state", 1)])
        
        # Elections indexes
        db.elections.create_index([("election_id", 1)], unique=True)
        db.elections.create_index([("status", 1)])
        db.elections.create_index([("voting_start", 1), ("voting_end", 1)])
        
        # Candidates indexes
        db.candidates.create_index([("candidate_id", 1)], unique=True)
        db.candidates.create_index([("election_id", 1)])
        
        # Votes indexes
        db.votes.create_index([("vote_id", 1)], unique=True)
        db.votes.create_index([("election_id", 1), ("voter_id", 1)], unique=True)
        db.votes.create_index([("election_id", 1)])
        
        # Admins indexes
        db.admins.create_index([("admin_id", 1)], unique=True)
        db.admins.create_index([("username", 1)], unique=True)
        db.admins.create_index([("email", 1)], unique=True)
        
        # OTP indexes
        db.otps.create_index([("email", 1)])
        db.otps.create_index([("phone", 1)])
        db.otps.create_index([("expires_at", 1)], expireAfterSeconds=3600)  # Auto-expire after 1 hour
        
        # Face encoding indexes
        db.user_face_encodings.create_index([("user_id", 1)], unique=True)
        db.voter_face_encodings.create_index([("voter_id", 1)], unique=True)
        
        current_app.logger.info("MongoDB indexes created successfully")
    except Exception as e:
        current_app.logger.error(f"Error creating MongoDB indexes: {str(e)}")