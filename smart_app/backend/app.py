from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_app():
    app = Flask(__name__)

    # Config
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL", "sqlite:///db.sqlite3")
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv("SECRET_KEY", "supersecret")
    app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_KEY", "jwtsecret")
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 86400  # 24 hours

    # Initialize extensions
    from backend.extensions import db, jwt, mail, migrate
    
    CORS(app)
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    mail.init_app(app)
    
    # Register Blueprints
    from backend.routes.auth import auth_bp
    from backend.routes.voting import voting_bp
    from backend.routes.admin import admin_bp
    from backend.routes.face_recognition import face_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(voting_bp, url_prefix="/api/voting")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(face_bp, url_prefix='/api/face')

    # Create tables
    with app.app_context():
        db.create_all()
        
    return app