from flask import request
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_socketio import emit, join_room, leave_room
import json
from datetime import datetime

def register_socket_events(socketio):
    
    @socketio.on('connect')
    def handle_connect():
        """Handle client connection"""
        print(f"Client connected: {request.sid}")
        emit('connection_established', {
            'message': 'Successfully connected to real-time updates',
            'sid': request.sid,
            'timestamp': datetime.utcnow().isoformat()
        })

    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection"""
        print(f"Client disconnected: {request.sid}")

    @socketio.on('subscribe_elections')
    def handle_subscribe_elections(data):
        """Subscribe to election updates"""
        try:
            voter_id = data.get('voter_id')
            if voter_id:
                room_name = f'elections_{voter_id}'
                join_room(room_name)
                print(f"Client {request.sid} subscribed to elections for voter {voter_id}")
                emit('subscription_success', {
                    'room': room_name,
                    'message': 'Subscribed to election updates'
                })
        except Exception as e:
            print(f"Error in subscribe_elections: {e}")
            emit('subscription_error', {'error': str(e)})

    @socketio.on('unsubscribe_elections')
    def handle_unsubscribe_elections(data):
        """Unsubscribe from election updates"""
        try:
            voter_id = data.get('voter_id')
            if voter_id:
                room_name = f'elections_{voter_id}'
                leave_room(room_name)
                print(f"Client {request.sid} unsubscribed from elections for voter {voter_id}")
        except Exception as e:
            print(f"Error in unsubscribe_elections: {e}")

    @socketio.on('subscribe_admin')
    def handle_subscribe_admin(data):
        """Subscribe to admin updates"""
        try:
            admin_id = data.get('admin_id')
            if admin_id:
                room_name = f'admin_{admin_id}'
                join_room(room_name)
                print(f"Client {request.sid} subscribed to admin updates for {admin_id}")
                emit('admin_subscription_success', {
                    'room': room_name,
                    'message': 'Subscribed to admin updates'
                })
        except Exception as e:
            print(f"Error in subscribe_admin: {e}")
            emit('subscription_error', {'error': str(e)})

    @socketio.on('join_election_room')
    def handle_join_election_room(data):
        """Join a specific election room"""
        try:
            election_id = data.get('election_id')
            if election_id:
                room_name = f'election_{election_id}'
                join_room(room_name)
                print(f"Client {request.sid} joined election room: {election_id}")
        except Exception as e:
            print(f"Error joining election room: {e}")

    @socketio.on('leave_election_room')
    def handle_leave_election_room(data):
        """Leave a specific election room"""
        try:
            election_id = data.get('election_id')
            if election_id:
                room_name = f'election_{election_id}'
                leave_room(room_name)
                print(f"Client {request.sid} left election room: {election_id}")
        except Exception as e:
            print(f"Error leaving election room: {e}")

    # Real-time update methods that can be called from other parts of the application
    def send_election_update(action, election_data, admin_id=None):
        """Send election update to all subscribed clients"""
        try:
            update_data = {
                'action': action,
                'election': election_data,
                'timestamp': datetime.utcnow().isoformat(),
                'admin_id': admin_id
            }
            socketio.emit('election_update', update_data, room=f'elections_{election_data.get("voter_id", "all")}')
            print(f"Sent election update: {action} for election {election_data.get('_id')}")
        except Exception as e:
            print(f"Error sending election update: {e}")

    def send_voter_update(action, voter_data, admin_id=None):
        """Send voter update to specific voter and admin"""
        try:
            update_data = {
                'action': action,
                'voter': voter_data,
                'timestamp': datetime.utcnow().isoformat(),
                'admin_id': admin_id
            }
            # Send to specific voter
            socketio.emit('voter_update', update_data, room=f'elections_{voter_data.get("voter_id")}')
            # Send to admin room if admin_id provided
            if admin_id:
                socketio.emit('voter_update', update_data, room=f'admin_{admin_id}')
            print(f"Sent voter update: {action} for voter {voter_data.get('voter_id')}")
        except Exception as e:
            print(f"Error sending voter update: {e}")

    def send_system_update(action, update_data, admin_id=None):
        """Send system-wide update"""
        try:
            system_data = {
                'action': action,
                'data': update_data,
                'timestamp': datetime.utcnow().isoformat(),
                'admin_id': admin_id
            }
            socketio.emit('system_update', system_data, broadcast=True)
            print(f"Sent system update: {action}")
        except Exception as e:
            print(f"Error sending system update: {e}")

    def send_live_stats(stats_data):
        """Send live statistics to all connected clients"""
        try:
            socketio.emit('live_stats_update', {
                'stats': stats_data,
                'timestamp': datetime.utcnow().isoformat()
            }, broadcast=True)
        except Exception as e:
            print(f"Error sending live stats: {e}")

    # Make these functions available to the socketio instance
    socketio.send_election_update = send_election_update
    socketio.send_voter_update = send_voter_update
    socketio.send_system_update = send_system_update
    socketio.send_live_stats = send_live_stats