from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager
import os
from dotenv import load_dotenv
from config import config_map 
from smart_app.backend.extensions import mongo, jwt, mail, bcrypt
from smart_app.backend.create_mongo_collections import create_collections

# Register Blueprints
from smart_app.backend.routes.auth import auth_bp
from smart_app.backend.routes.voters import voting_bp
from smart_app.backend.routes.admin import admin_bp
from smart_app.backend.routes.otp import otp_bp
from smart_app.backend.frontend import frontend_bp  # Serve React SPA
from smart_app.backend.routes.register import register_bp
from smart_app.backend.routes.stats import stats_bp
from smart_app.backend.routes.home import home_bp  
from smart_app.backend.routes.test_mongodb import mongodb_bp 
from smart_app.backend.routes.dashboard import dashboard_bp
# Load environment variables
load_dotenv()

def create_app():
    # Flask app without static_folder; React handled by frontend_bp
    app = Flask(__name__, instance_relative_config=True)

    # Load configuration
    app.config.from_object(config_map[os.environ["ENVIRONMENT"]])

    # Ensure uploads folder exists
    os.makedirs(app.config.get("UPLOAD_FOLDER", "uploads"), exist_ok=True)
    
    
    # Enable CORS for React dev server - FIXED CONFIGURATION
    # Enable CORS for all relevant origins
    CORS(app, 
        origins=["http://localhost:5000", "http://127.0.0.1:5000", "http://localhost:3000", "http://127.0.0.1:3000"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
        supports_credentials=True)    # Enable CORS for React dev server
    

    # Initialize extensions
    mongo.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    bcrypt.init_app(app)

    # Register API Blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(voting_bp, url_prefix="/api/voter")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(otp_bp, url_prefix="/api/otp")
    app.register_blueprint(register_bp, url_prefix='/api/register')
    app.register_blueprint(stats_bp, url_prefix="/api")
    app.register_blueprint(home_bp, url_prefix="/api/home")
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(mongodb_bp, url_prefix="/api/mongodb")

    # Register React frontend last
    app.register_blueprint(frontend_bp)

    # Global error handlers (for API routes)
    @app.errorhandler(404)
    def api_not_found(error):
        if request.path.startswith('/api/'):
            return jsonify({'message': 'API resource not found'}), 404
        # For non-API 404s, the frontend_bp will handle them

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'message': 'Internal server error'}), 500

    # Test route to verify API is working
    @app.route('/api/test')
    def test_api():
        return jsonify({'message': 'API is working!', 'status': 'success'})

    # Create tables
    with app.app_context():
        create_collections(app)
        collections = mongo.db.list_collection_names()


    return app