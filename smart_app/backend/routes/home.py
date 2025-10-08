from flask import Blueprint, jsonify
from smart_app.backend.extensions import db
from smart_app.backend.models import User, Election, Vote
from sqlalchemy import func

home_bp = Blueprint('home', __name__)

@home_bp.route('/test')
def test_home():
    """Test route to verify home blueprint is working"""
    return jsonify({
        'success': True,
        'message': 'Home blueprint is working!',
        'endpoints': {
            'stats': '/api/home/stats',
            'features': '/api/home/features',
            'testimonials': '/api/home/testimonials',
            'system_info': '/api/home/system-info'
        }
    })

@home_bp.route('/stats', methods=['GET'])
def get_home_stats():
    """Get statistics for homepage display"""
    try:
        # Get total users count - using try/except for safety
        try:
            total_users = User.query.count()
        except:
            total_users = 0
            
        # Get total elections count
        try:
            total_elections = Election.query.count()
        except:
            total_elections = 0
            
        # Get active elections count
        try:
            active_elections = Election.query.filter_by(is_active=True).count()
        except:
            active_elections = 0
            
        # Get total votes cast
        try:
            total_votes = Vote.query.count()
        except:
            total_votes = 0
        
        stats = {
            'total_users': total_users,
            'total_elections': total_elections,
            'active_elections': active_elections,
            'total_votes': total_votes,
            'system_status': 'Operational',
            'version': '1.0.0',
            'last_updated': '2024-01-01'
        }
        
        return jsonify({
            'success': True,
            'stats': stats,
            'message': 'Home statistics retrieved successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error retrieving statistics: {str(e)}'
        }), 500

@home_bp.route('/features', methods=['GET'])
def get_features():
    """Get system features for homepage"""
    features = [
        {
            'id': 1,
            'icon': '👤',
            'title': 'Face Recognition',
            'description': 'Secure voter authentication using facial recognition technology',
            'status': 'active'
        },
        {
            'id': 2,
            'icon': '🔒',
            'title': 'Blockchain Security',
            'description': 'Immutable vote storage using blockchain technology',
            'status': 'active'
        },
        {
            'id': 3,
            'icon': '⚡',
            'title': 'Real-time Results',
            'description': 'Live voting results and analytics dashboard',
            'status': 'active'
        },
        {
            'id': 4,
            'icon': '📱',
            'title': 'Mobile Friendly',
            'description': 'Responsive design works on all devices',
            'status': 'active'
        }
    ]
    
    return jsonify({
        'success': True,
        'features': features
    }), 200

@home_bp.route('/testimonials', methods=['GET'])
def get_testimonials():
    """Get testimonials for homepage"""
    testimonials = [
        {
            'id': 1,
            'name': 'University Student',
            'role': 'Computer Science',
            'content': 'This system made voting so much easier and secure!',
            'avatar': '👩‍🎓',
            'rating': 5
        },
        {
            'id': 2,
            'name': 'Project Guide',
            'role': 'Professor',
            'content': 'Impressive implementation of modern voting technology.',
            'avatar': '👨‍🏫',
            'rating': 5
        },
        {
            'id': 3,
            'name': 'System Admin',
            'role': 'Technical Head',
            'content': 'The admin dashboard provides excellent oversight and control.',
            'avatar': '👨‍💻',
            'rating': 4
        }
    ]
    
    return jsonify({
        'success': True,
        'testimonials': testimonials
    }), 200

@home_bp.route('/system-info', methods=['GET'])
def get_system_info():
    """Get system information"""
    system_info = {
        'name': 'Smart Voting System',
        'version': '1.0.0',
        'description': 'A secure digital voting platform with facial recognition',
        'purpose': 'Academic Project',
        'status': 'Demo',
        'technologies': ['React.js', 'Flask', 'PostgreSQL', 'Face Recognition API'],
        'developers': ['Your Name'],
        'institution': 'Your University'
    }
    
    return jsonify({
        'success': True,
        'system_info': system_info
    }), 200