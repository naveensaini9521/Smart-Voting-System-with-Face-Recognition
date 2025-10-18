import os
from datetime import timedelta
from dotenv import load_dotenv
from urllib.parse import quote_plus

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    # Security
    SECRET_KEY = os.getenv("APP_SECRET", "eb153fcfa5a755ae94a949f86fbbaa5c53cd2b7faf5c848ba09307d2f7acdce1")
    
    # MySQL Database Configuration
    DB_USERNAME = os.getenv('DB_USERNAME', 'root')
    DB_PASSWORD = quote_plus(os.getenv('DB_PASSWORD', 'Admin@123'))
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_NAME = os.getenv('DB_NAME', 'voting_system')
    
    MYSQL_URI = f"mysql+pymysql://{DB_USERNAME}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or MYSQL_URI
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # MongoDB Configuration
    # ----------------------------
    MONGO_URI = os.getenv(
        "MONGO_URI",
        "mongodb://admin:Admin123@localhost:27017/smart_voting_system?authSource=admin"
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

class DevelopmentConfig(Config):
    DEBUG = True
    # Use SQLite for development for easier setup
    SQLITE_PATH = os.path.join(BASE_DIR, 'smart_voting_dev.db')
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{SQLITE_PATH}"
    MONGO_URI = os.getenv(
        "MONGO_URI",
        "mongodb://admin:Admin123@localhost:27017/smart_voting_dev?authSource=admin"
    )
    
class ProductionConfig(Config):
    DEBUG = False
    # Use environment variables for production
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', Config.SQLALCHEMY_DATABASE_URI)
    MONGO_URI = os.getenv(
        "MONGO_URI",
        "mongodb://admin:Admin123@localhost:27017/smart_voting_system?authSource=admin"
    )
    
class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    MONGO_URI = "mongodb://admin:Admin123@localhost:27017/smart_voting_test?authSource=admin"

config_map = {
    'DEVELOPMENT': DevelopmentConfig,
    'PRODUCTION': ProductionConfig,
    'TESTING': TestingConfig,
    'default': DevelopmentConfig
}