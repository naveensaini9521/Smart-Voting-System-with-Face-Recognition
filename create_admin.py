# create_admin_simple.py
import sys
import os
import bcrypt
from datetime import datetime

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def create_admin_simple():
    try:
        print("=== SIMPLE ADMIN CREATION ===")
        
        # Import pymongo directly
        import pymongo
        from bson import ObjectId
        
        # Connect to MongoDB
        client = pymongo.MongoClient('localhost', 27017)
        db = client.smart_voting  # or your database name
        admins_collection = db.admins
        
        print("1. Connected to MongoDB")
        
        # Check if admin exists
        existing = admins_collection.find_one({"username": "admin"})
        if existing:
            print("Admin already exists!")
            print(f"   Username: {existing.get('username')}")
            return
        
        print("2. Creating new admin...")
        
        # Generate admin ID
        import random
        import string
        
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        random_str = ''.join(random.choices(string.digits, k=4))
        admin_id = f'ADMIN{timestamp}{random_str}'
        
        # Hash password
        password = "admin123"
        password_bytes = password.encode('utf-8')
        password_hash = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
        if isinstance(password_hash, bytes):
            password_hash = password_hash.decode('utf-8')
        
        # Create admin document
        admin_doc = {
            "admin_id": admin_id,
            "username": "admin",
            "email": "admin@votingsystem.com",
            "password_hash": password_hash,
            "full_name": "System Administrator",
            "role": "superadmin",
            "permissions": {
                "manage_elections": True,
                "manage_voters": True,
                "manage_candidates": True,
                "view_analytics": True,
                "system_settings": True
            },
            "is_active": True,
            "department": "Administration",
            "access_level": 10,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "last_login": None
        }
        
        # Insert into database
        result = admins_collection.insert_one(admin_doc)
        
        print("Admin user created successfully!")
        print(f"   Username: admin")
        print(f"   Password: admin123")
        print(f"   Email: admin@votingsystem.com")
        print(f"   MongoDB ID: {result.inserted_id}")
        print(f"   Admin ID: {admin_id}")
        
        # Close connection
        client.close()
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    create_admin_simple()