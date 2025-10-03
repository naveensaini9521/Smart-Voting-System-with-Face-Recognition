import re
from email_validator import validate_email, EmailNotValidError

def validate_email(email: str) -> bool:
    """Validate email format"""
    try:
        validate_email(email)
        return True
    except EmailNotValidError:
        return False

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