from flask import Blueprint, jsonify
from smart_app.backend.extensions import mongo
from flask import current_app
from bson import ObjectId
from datetime import datetime

mongodb_bp = Blueprint('mongodb', __name__)

@mongodb_bp.route('/test-connection')
def test_mongodb_connection():
    """Test MongoDB connection"""
    try:
        # Test connection by listing collections
        collections = mongo.db.list_collection_names()
        db_stats = mongo.db.command("dbstats")
        
        return jsonify({
            'status': 'success',
            'message': 'MongoDB connection successful',
            'database': mongo.db.name,
            'collections': collections,
            'stats': {
                'collections': db_stats.get('collections', 0),
                'objects': db_stats.get('objects', 0),
                'dataSize': db_stats.get('dataSize', 0)
            }
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'MongoDB connection failed: {str(e)}'
        }), 500

@mongodb_bp.route('/collections')
def list_collections():
    """List all collections with stats"""
    try:
        collections = []
        for collection_name in mongo.db.list_collection_names():
            stats = mongo.db.command("collstats", collection_name)
            collections.append({
                'name': collection_name,
                'count': stats.get('count', 0),
                'size': stats.get('size', 0),
                'storageSize': stats.get('storageSize', 0)
            })
        
        return jsonify({
            'status': 'success',
            'collections': collections
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Error listing collections: {str(e)}'
        }), 500

@mongodb_bp.route('/create-sample-data')
def create_sample_data():
    """Create sample data in MongoDB collections"""
    try:
        # Sample face encoding data
        sample_face_data = {
            "user_id": 1,
            "username": "test_user",
            "encoding_data": [0.1, 0.2, 0.3, 0.4, 0.5],  # Simplified sample data
            "image_metadata": {
                "captured_at": datetime.utcnow(),
                "quality_score": 0.95
            },
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "is_active": True
        }
        
        # Insert sample data
        result = mongo.db.user_face_encodings.insert_one(sample_face_data)
        
        return jsonify({
            'status': 'success',
            'message': 'Sample data created successfully',
            'inserted_id': str(result.inserted_id)
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Error creating sample data: {str(e)}'
        }), 500