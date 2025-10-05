from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
import os
from dotenv import load_dotenv
from database import db, init_db

# Load environment variables
load_dotenv()

def create_app():
    app = Flask(__name__, static_folder="../frontend/dist", static_url_path="/")

    # Config
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL", "sqlite:///db.sqlite3")
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv("SECRET_KEY", "supersecret")
    app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_KEY", "jwtsecret")
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 86400  # 24 hours

    # Initialize extensions
    from smart_app.backend.extensions import db, jwt, mail, migrate
    
    CORS(app)
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    mail.init_app(app)
    
    # Register Blueprints
    from smart_app.backend.routes.auth import auth_bp
    from smart_app.backend.routes.voters import voting_bp
    from smart_app.backend.routes.admin import admin_bp
    # from smart_app.backend.routes.face_recognition import face_bp
    from smart_app.backend.routes.otp import otp_bp
    from smart_app.backend.frontend import frontend_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(voting_bp, url_prefix="/api/voter")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    # app.register_blueprint(face_bp, url_prefix='/api/face')
    app.register_blueprint(otp_bp, url_prefix="/api/otp")
    app.register_blueprint(frontend_bp)


    # Create tables
    with app.app_context():
        db.create_all()
        
    return app