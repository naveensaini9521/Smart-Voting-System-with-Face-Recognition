import os
from datetime import timedelta
from dotenv import load_dotenv
from urllib.parse import quote_plus

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    # Security
    SECRET_KEY = os.getenv("APP_SECRET", "eb153fcfa5a755ae94a949f86fbbaa5c53cd2b7faf5c848ba09307d2f7acdce1")
    
    # MongoDB Configuration - Enhanced
    MONGO_USERNAME = os.getenv('MONGO_USERNAME', 'admin')
    MONGO_PASSWORD = quote_plus(os.getenv('MONGO_PASSWORD', 'Admin123'))
    MONGO_HOST = os.getenv('MONGO_HOST', 'localhost')
    MONGO_PORT = os.getenv('MONGO_PORT', '27017')
    MONGO_DB_NAME = os.getenv('MONGO_DB_NAME', 'smart_voting_system')
    
    # ----------------------------
    # Construct MongoDB URI
    MONGO_URI = os.getenv(
        "MONGO_URI",
        f"mongodb://{MONGO_USERNAME}:{MONGO_PASSWORD}@{MONGO_HOST}:{MONGO_PORT}/{MONGO_DB_NAME}?authSource=admin&retryWrites=true&w=majority"
    )
    
    # JWT Authentication
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'sUJbaMMUAKYojj0dFe94jO-ld2oc028u3qw2KU71Ui0'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    
    # File Upload Settings
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    UPLOAD_FOLDER = 'uploads'
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    
    # Face Recognition
    FACE_RECOGNITION_TOLERANCE = float(os.getenv("FACE_MATCH_THRESHOLD", 0.6))
    FACE_ENCODING_MODEL = 'hog'  # 'hog' for CPU, 'cnn' for GPU

    DASHBOARD_CACHE_TIMEOUT = 300  # 5 minutes
    MAX_DASHBOARD_RECORDS = 1000
class DevelopmentConfig(Config):
    DEBUG = True
    # Use SQLite for development for easier setup
    # SQLITE_PATH = os.path.join(BASE_DIR, 'smart_voting_dev.db')
    # SQLALCHEMY_DATABASE_URI = f"sqlite:///{SQLITE_PATH}"
    MONGO_URI = os.getenv(
        "MONGO_URI",
        f"mongodb://{Config.MONGO_USERNAME}:{Config.MONGO_PASSWORD}@{Config.MONGO_HOST}:{Config.MONGO_PORT}/smart_voting_dev?authSource=admin&retryWrites=true&w=majority"
    )
    
class ProductionConfig(Config):
    DEBUG = False
    # Use environment variables for production
    # SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', Config.SQLALCHEMY_DATABASE_URI)
    MONGO_URI = os.getenv(
        "MONGO_URI",
        f"mongodb://{Config.MONGO_USERNAME}:{Config.MONGO_PASSWORD}@{Config.MONGO_HOST}:{Config.MONGO_PORT}/smart_voting_system?authSource=admin&retryWrites=true&w=majority"
    )
    
class TestingConfig(Config):
    TESTING = True
    # SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    MONGO_URI = f"mongodb://{Config.MONGO_USERNAME}:{Config.MONGO_PASSWORD}@{Config.MONGO_HOST}:{Config.MONGO_PORT}/smart_voting_test?authSource=admin&retryWrites=true&w=majority"

config_map = {
    'DEVELOPMENT': DevelopmentConfig,
    'PRODUCTION': ProductionConfig,
    'TESTING': TestingConfig,
    'default': DevelopmentConfig
}