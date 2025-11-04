import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from smart_app.backend.mongo_models import Admin

def create_superadmin():
    """Create initial superadmin account"""
    
    superadmin_data = {
        'username': 'superadmin',
        'email': 'superadmin@evoting.system',
        'password': 'Admin123!',  # Change this in production!
        'full_name': 'System Super Administrator',
        'role': 'superadmin',
        'department': 'System Administration',
        'phone': '+910000000000',
        'permissions': {
            'manage_admins': True,
            'manage_elections': True,
            'manage_voters': True,
            'view_analytics': True,
            'system_config': True
        },
        'access_level': 10,
        'is_active': True
    }
    
    try:
        # Check if superadmin already exists
        existing_admin = Admin.find_by_username('superadmin')
        if existing_admin:
            print("Superadmin already exists. Skipping creation.")
            return False
        
        # Create superadmin
        admin_id = Admin.create_admin(superadmin_data)
        print(f"Superadmin created successfully!")
        print(f"Username: superadmin")
        print(f"Password: Admin123!")
        print(f"Admin ID: {admin_id}")
        print("\n⚠️  IMPORTANT: Change the default password immediately after first login!")
        return True
        
    except Exception as e:
        print(f"Error creating superadmin: {str(e)}")
        return False

if __name__ == "__main__":
    create_superadmin()