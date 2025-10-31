from flask import Blueprint, send_from_directory, jsonify, request
import os

frontend_bp = Blueprint('frontend', __name__)

# Serve React App
@frontend_bp.route('/', defaults={'path': ''})
@frontend_bp.route('/<path:path>')
def serve_react_app(path):
    # Path to your React build directory
    react_build_path = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist')
    
    # If the path exists as a file, serve it
    if path != "" and os.path.exists(os.path.join(react_build_path, path)):
        return send_from_directory(react_build_path, path)
    else:
        # Otherwise serve the index.html
        return send_from_directory(react_build_path, 'index.html')

# Error handlers for frontend routes
@frontend_bp.errorhandler(404)
def not_found(error):
    # For frontend routes, serve React's index.html to handle client-side routing
    react_build_path = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist')
    return send_from_directory(react_build_path, 'index.html')

@frontend_bp.errorhandler(500)
def internal_error(error):
    return jsonify({'message': 'Internal server error'}), 500

# Test route to verify frontend is working
@frontend_bp.route('/api/test-frontend')
def test_frontend():
    return jsonify({'message': 'Frontend route is working!', 'status': 'success'})