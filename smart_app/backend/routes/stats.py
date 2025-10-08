from flask import Blueprint, jsonify

stats_bp = Blueprint('stats', __name__)

@stats_bp.route('/stats', methods=['GET'])
def get_stats():
    # Dummy stats for frontend
    data = {
        "users": 120,
        "votes_cast": 450,
        "active_elections": 3
    }
    return jsonify(data)
