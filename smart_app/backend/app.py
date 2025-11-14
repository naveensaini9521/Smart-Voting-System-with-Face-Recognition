from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager
import os
from dotenv import load_dotenv
from config import config_map 
from smart_app.backend.extensions import mongo, jwt, mail, bcrypt, socketio
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
from smart_app.backend.routes.dashboard import dashboard_bp, get_socketio, socketio
from smart_app.backend.socket_io import socketio

# Import Socket.IO event handlers
from smart_app.backend.socket_events import register_socket_events

# Load environment variables
load_dotenv()

def create_app():
    # Flask app without static_folder; React handled by frontend_bp
    app = Flask(__name__, instance_relative_config=True)

    # Load configuration
    app.config.from_object(config_map[os.environ["ENVIRONMENT"]])
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB

    # Ensure uploads folder exists
    os.makedirs(app.config.get("UPLOAD_FOLDER", "uploads"), exist_ok=True)
    
    # Enable CORS for React dev server - FIXED CONFIGURATION
    # Enable CORS for all relevant origins
    CORS(app, 
        origins=[
            "http://localhost:5000", "http://127.0.0.1:5000", "http://localhost:3000", "http://127.0.0.1:3000",
            "http://localhost:5173",  # Vite dev server
            "http://127.0.0.1:5173"   # Vite dev server
        ],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
        supports_credentials=True)

    # Initialize extensions
    mongo.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    bcrypt.init_app(app)
    
    # Initialize Socket.IO with the app
    socketio.init_app(
        app, 
        cors_allowed_origins=[
            "http://localhost:5000", "http://127.0.0.1:5000", "http://localhost:3000", "http://127.0.0.1:3000",
            "http://localhost:5173", "http://127.0.0.1:5173"
        ],
        async_mode='threading',
        logger=True,
        engineio_logger=False
    )

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

    # Register Socket.IO event handlers
    register_socket_events(socketio)

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

    # Socket.IO test route
    @app.route('/api/socket-test')
    def socket_test():
        return jsonify({'message': 'Socket.IO is available!', 'status': 'success'})

    # Create tables
    with app.app_context():
        create_collections(app)
        collections = mongo.db.list_collection_names()
        print(f"Available collections: {collections}")

    return app, socketio