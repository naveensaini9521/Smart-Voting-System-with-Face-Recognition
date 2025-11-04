import re
from email_validator import validate_email, EmailNotValidError

def validate_password(password: str) -> str:
    """Validate password strength"""
    if len(password) < 8:
        return "Password must be at least 8 characters long"
    
    if not re.search(r"[A-Z]", password):
        return "Password must contain at least one uppercase letter"
    
    if not re.search(r"[a-z]", password):
        return "Password must contain at least one lowercase letter"
    
    if not re.search(r"\d", password):
        return "Password must contain at least one digit"
    
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return "Password must contain at least one special character"
    
    return None

def validate_national_id(national_id: str) -> bool:
    """Validate national ID format (basic implementation)"""
    if not national_id or len(national_id) < 5:
        return False
    return national_id.isalnum()

from datetime import date, datetime
import re
from typing import Tuple, Dict

class ValidationError(Exception):
    def __init__(self, message, field=None):
        self.message = message
        self.field = field
        super().__init__(self.message)

def validate_age(date_of_birth: str) -> Tuple[bool, int]:
    """Validate that user is 18 years or older"""
    try:
        dob = datetime.strptime(date_of_birth, '%Y-%m-%d').date()
        today = date.today()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        
        if age < 18:
            return False, age
        return True, age
    except ValueError:
        raise ValidationError("Invalid date format. Use YYYY-MM-DD", "dateOfBirth")

def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        raise ValidationError("Invalid email format", "email")
    return True

def validate_phone(phone: str) -> bool:
    """Validate phone number (basic validation)"""
    if phone and not re.match(r'^\+?1?\d{9,15}$', phone):
        raise ValidationError("Invalid phone number format", "phone")
    return True

def validate_voter_data(data: Dict) -> Dict:
    """Validate all voter registration data"""
    required_fields = ['firstName', 'lastName', 'email', 'dateOfBirth', 'constituency', 'pollingStation']
    
    # Check required fields
    for field in required_fields:
        if not data.get(field):
            raise ValidationError(f"{field} is required", field)
    
    # Validate email
    validate_email(data['email'])
    
    # Validate age
    is_valid_age, age = validate_age(data['dateOfBirth'])
    if not is_valid_age:
        raise ValidationError(f"Must be 18 years or older. Current age: {age}", "dateOfBirth")
    
    # Validate phone if provided
    if data.get('phone'):
        validate_phone(data['phone'])
    
    return {**data, 'age': age}