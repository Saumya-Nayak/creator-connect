"""
websocket_server.py — FIXED
─────────────────────────────────────────────────────────────────────
FIX: async_mode changed from 'threading' to 'eventlet'
     This matches app.py and stops the 500 WebSocket error:
     "AssertionError: write() before start_response"
─────────────────────────────────────────────────────────────────────
"""

from flask import request
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
import jwt
import os
from functools import wraps
import traceback
import sys
from datetime import datetime
import json

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

print(f"🔍 WebSocket server loading...")

# ✅ FIX: async_mode='eventlet' — must match app.py
socketio = SocketIO(
    cors_allowed_origins="*",
    async_mode='eventlet'   # ← was 'threading'
)

# Store active connections
active_users = {}
user_sessions = {}

print("✅ WebSocket server initialized (eventlet mode)")


# ===== DATETIME SERIALIZATION =====
def serialize_datetime(obj):
    if isinstance(obj, datetime):
        return obj.strftime('%Y-%m-%dT%H:%M:%S')
    elif isinstance(obj, dict):
        return {key: serialize_datetime(value) for key, value in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [serialize_datetime(item) for item in obj]
    return obj


def authenticated_only(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        token = request.args.get('token')
        if not token:
            emit('error', {'message': 'Authentication required'})
            disconnect()
            return
        try:
            payload = jwt.decode(
                token,
                os.getenv('JWT_SECRET_KEY', 'your-secret-key'),
                algorithms=['HS256']
            )
            user_id = payload['user_id']
            user_sessions[request.sid] = user_id
            return f(user_id, *args, **kwargs)
        except jwt.ExpiredSignatureError:
            emit('error', {'message': 'Token expired'})
            disconnect()
        except jwt.InvalidTokenError as e:
            emit('error', {'message': 'Invalid token'})
            disconnect()
        except Exception as e:
            traceback.print_exc()
            emit('error', {'message': 'Authentication failed'})
            disconnect()
    return wrapped


# ===== CONNECTION EVENTS =====

@socketio.on('connect')
def handle_connect():
    print(f"🔌 New connection: {request.sid}")
    emit('connection_success', {'sid': request.sid})


@socketio.on('disconnect')
def handle_disconnect():
    user_id = user_sessions.get(request.sid)
    if user_id:
        if user_id in active_users:
            if request.sid in active_users[user_id]:
                active_users[user_id].remove(request.sid)
            if not active_users[user_id]:
                del active_users[user_id]
        if request.sid in user_sessions:
            del user_sessions[request.sid]
        emit('user_status', {'user_id': user_id, 'status': 'offline'}, broadcast=True)
        print(f"🔌 Disconnected: User {user_id}")


# ===== USER PRESENCE =====

@socketio.on('user_online')
@authenticated_only
def handle_user_online(user_id):
    try:
        if user_id not in active_users:
            active_users[user_id] = []
        if request.sid not in active_users[user_id]:
            active_users[user_id].append(request.sid)
        join_room(f"user_{user_id}")
        emit('user_status', {'user_id': user_id, 'status': 'online'}, broadcast=True)
        print(f"✅ User {user_id} is online")
        emit('user_online_success', {'user_id': user_id})
    except Exception as e:
        traceback.print_exc()
        emit('error', {'message': 'Failed to mark user online'})


@socketio.on('get_online_users')
@authenticated_only
def handle_get_online_users(user_id):
    try:
        online_user_ids = list(active_users.keys())
        emit('online_users_list', {'users': online_user_ids})
    except Exception as e:
        emit('error', {'message': 'Failed to get online users'})


# ===== MESSAGING =====

@socketio.on('send_message')
@authenticated_only
def handle_send_message(sender_id, data):
    print("=" * 70)
    print("📤 SEND_MESSAGE EVENT")
    print(f"   Sender: {sender_id} | Data: {data}")
    print("=" * 70)

    try:
        if not data or not isinstance(data, dict):
            emit('message_error', {'error': 'Invalid data format'})
            return

        receiver_id = data.get('receiver_id')
        message_text = data.get('message', '')
        media_url = data.get('media_url')
        media_type = data.get('media_type')

        if not receiver_id:
            emit('message_error', {'error': 'Receiver ID is required'})
            return
        if not message_text and not media_url:
            emit('message_error', {'error': 'Message text or media is required'})
            return

        try:
            from database.message_operations import send_message as db_send_message
            from database.notification_operations import notify_new_message
        except ImportError as ie:
            emit('message_error', {'error': 'Server configuration error', 'details': str(ie)})
            return

        result = db_send_message(
            sender_id=sender_id,
            receiver_id=receiver_id,
            message=message_text,
            media_url=media_url,
            media_type=media_type
        )

        if result.get('success'):
            message_data = result.get('data')
            if not message_data:
                emit('message_error', {'error': 'Failed to save message'})
                return

            # Notification
            try:
                notify_new_message(
                    receiver_id=receiver_id,
                    sender_id=sender_id,
                    message_preview=message_text or "Sent a media file"
                )
            except Exception as notif_error:
                print(f"⚠️ Notification failed (non-fatal): {notif_error}")

            emit('message_sent', {'success': True, 'message': message_data})
            emit('new_message', {'message': message_data}, room=f"user_{receiver_id}")

            conversation_id = data.get('conversation_id')
            if conversation_id:
                emit('conversation_updated', {
                    'conversation_id': conversation_id,
                    'last_message': message_data
                }, room=f"user_{sender_id}")
                emit('conversation_updated', {
                    'conversation_id': conversation_id,
                    'last_message': message_data
                }, room=f"user_{receiver_id}")

            print(f"✅ Message delivered: ID={message_data.get('message_id')}")

        else:
            error_msg = result.get('message', 'Failed to send message')
            # ✅ If needs_request, tell frontend to show request panel
            if result.get('needs_request'):
                emit('message_error', {
                    'error': error_msg,
                    'needs_request': True,
                    'receiver_id': receiver_id
                })
            else:
                emit('message_error', {'error': error_msg})

    except Exception as e:
        traceback.print_exc()
        emit('message_error', {'error': 'Failed to send message', 'details': str(e)})


# ===== REACTIONS =====

@socketio.on('add_reaction')
@authenticated_only
def handle_add_reaction(user_id, data):
    try:
        message_id = data.get('message_id')
        reaction_type = data.get('reaction_type')
        other_user_id = data.get('other_user_id')
        if not message_id or not reaction_type:
            emit('error', {'message': 'message_id and reaction_type required'})
            return
        from database.message_operations import add_message_reaction
        result = add_message_reaction(message_id, user_id, reaction_type)
        if result.get('success'):
            for uid in [user_id, other_user_id]:
                if uid:
                    emit('reaction_added', {
                        'message_id': message_id,
                        'user_id': user_id,
                        'reaction_type': reaction_type,
                        'reactions': result.get('reactions', [])
                    }, room=f"user_{uid}")
    except Exception as e:
        traceback.print_exc()


@socketio.on('remove_reaction')
@authenticated_only
def handle_remove_reaction(user_id, data):
    try:
        message_id = data.get('message_id')
        other_user_id = data.get('other_user_id')
        if not message_id:
            emit('error', {'message': 'message_id required'})
            return
        from database.message_operations import remove_message_reaction
        result = remove_message_reaction(message_id, user_id)
        if result.get('success'):
            for uid in [user_id, other_user_id]:
                if uid:
                    emit('reaction_removed', {
                        'message_id': message_id,
                        'user_id': user_id,
                        'reactions': result.get('reactions', [])
                    }, room=f"user_{uid}")
    except Exception as e:
        traceback.print_exc()


# ===== DELETE FOR EVERYONE =====

@socketio.on('delete_for_everyone')
@authenticated_only
def handle_delete_for_everyone(user_id, data):
    try:
        message_id = data.get('message_id')
        other_user_id = data.get('other_user_id')
        if not message_id:
            emit('error', {'message': 'message_id required'})
            return
        from database.message_operations import delete_message_for_everyone
        result = delete_message_for_everyone(message_id, user_id)
        if result.get('success'):
            for uid in [user_id, other_user_id]:
                if uid:
                    emit('message_deleted_for_everyone',
                         {'message_id': message_id}, room=f"user_{uid}")
    except Exception as e:
        traceback.print_exc()


# ===== MARK AS READ =====

@socketio.on('mark_as_read')
@authenticated_only
def handle_mark_as_read(user_id, data):
    try:
        other_user_id = data.get('other_user_id')
        if not other_user_id:
            emit('error', {'message': 'other_user_id is required'})
            return
        from database.message_operations import mark_messages_as_read
        result = mark_messages_as_read(user_id, other_user_id)
        if result.get('success'):
            emit('messages_read', {
                'reader_id': user_id,
                'conversation_with': other_user_id
            }, room=f"user_{other_user_id}")
    except Exception as e:
        traceback.print_exc()


# ===== TYPING =====

@socketio.on('typing_start')
@authenticated_only
def handle_typing_start(user_id, data):
    try:
        receiver_id = data.get('receiver_id')
        if receiver_id:
            emit('user_typing', {'user_id': user_id, 'typing': True},
                 room=f"user_{receiver_id}")
    except Exception as e:
        print(f"❌ typing_start error: {e}")


@socketio.on('typing_stop')
@authenticated_only
def handle_typing_stop(user_id, data):
    try:
        receiver_id = data.get('receiver_id')
        if receiver_id:
            emit('user_typing', {'user_id': user_id, 'typing': False},
                 room=f"user_{receiver_id}")
    except Exception as e:
        print(f"❌ typing_stop error: {e}")


# ===== DELETE MESSAGE =====

@socketio.on('delete_message')
@authenticated_only
def handle_delete_message(user_id, data):
    try:
        message_id = data.get('message_id')
        other_user_id = data.get('other_user_id')
        if not message_id:
            emit('error', {'message': 'message_id is required'})
            return
        from database.message_operations import delete_message
        result = delete_message(message_id, user_id)
        if result.get('success'):
            for uid in [user_id, other_user_id]:
                if uid:
                    emit('message_deleted', {'message_id': message_id},
                         room=f"user_{uid}")
        else:
            emit('error', {'message': result.get('message', 'Failed to delete')})
    except Exception as e:
        traceback.print_exc()
        emit('error', {'message': 'Failed to delete message'})


# ===== CONVERSATION =====

@socketio.on('join_conversation')
@authenticated_only
def handle_join_conversation(user_id, data):
    try:
        other_user_id = data.get('other_user_id')
        if other_user_id:
            room_name = f"conversation_{min(user_id, other_user_id)}_{max(user_id, other_user_id)}"
            join_room(room_name)
            emit('joined_conversation', {'room': room_name})
    except Exception as e:
        print(f"❌ join_conversation error: {e}")


@socketio.on('leave_conversation')
@authenticated_only
def handle_leave_conversation(user_id, data):
    try:
        other_user_id = data.get('other_user_id')
        if other_user_id:
            room_name = f"conversation_{min(user_id, other_user_id)}_{max(user_id, other_user_id)}"
            leave_room(room_name)
    except Exception as e:
        print(f"❌ leave_conversation error: {e}")


# ===== HELPERS =====

def notify_new_message_websocket(receiver_id, message_data):
    if receiver_id in active_users:
        socketio.emit('new_message', {'message': message_data},
                      room=f"user_{receiver_id}")
        return True
    return False


def is_user_online(user_id):
    return user_id in active_users


def get_online_status(user_ids):
    return {uid: (uid in active_users) for uid in user_ids}

"""
WEBSOCKET HANDLERS FOR GROUP MESSAGING
Add these event handlers to your websocket_server.py file.
─────────────────────────────────────────────────────────────────────
"""

# =====================================================================
# ADD THESE IMPORTS at the top of websocket_server.py
# =====================================================================
# from database.group_operations import send_group_message, get_group_members


# =====================================================================
# ADD THESE EVENT HANDLERS to websocket_server.py
# Place them after the existing message handlers
# =====================================================================


@socketio.on('join_group')
@authenticated_only
def handle_join_group(user_id, data):
    """User joins a group room to receive real-time messages."""
    try:
        group_id = data.get('group_id')
        if not group_id:
            emit('error', {'message': 'group_id required'})
            return

        from database.group_operations import get_group_members
        result = get_group_members(group_id, user_id)
        if not result.get('success'):
            emit('error', {'message': 'Not a group member'})
            return

        room_name = f"group_{group_id}"
        join_room(room_name)
        emit('joined_group', {'group_id': group_id, 'room': room_name})
        print(f"✅ User {user_id} joined group room {room_name}")

    except Exception as e:
        print(f"❌ join_group error: {e}")
        import traceback; traceback.print_exc()


@socketio.on('leave_group_room')
@authenticated_only
def handle_leave_group_room(user_id, data):
    """User leaves the group socket room."""
    try:
        group_id = data.get('group_id')
        if group_id:
            room_name = f"group_{group_id}"
            leave_room(room_name)
    except Exception as e:
        print(f"❌ leave_group_room error: {e}")


@socketio.on('send_group_message')
@authenticated_only
def handle_send_group_message(user_id, data):
    """
    Send a message to a group.
    Emits 'new_group_message' to all members in the room.
    """
    print("=" * 70)
    print("📤 SEND_GROUP_MESSAGE EVENT")
    print(f"   Sender: {user_id} | Data: {data}")
    print("=" * 70)

    try:
        group_id = data.get('group_id')
        message_text = (data.get('message') or '').strip()
        media_url = data.get('media_url')
        media_type = data.get('media_type')

        if not group_id:
            emit('group_message_error', {'error': 'group_id required'})
            return
        if not message_text and not media_url:
            emit('group_message_error', {'error': 'Message or media required'})
            return

        from database.group_operations import send_group_message as db_send_group_message
        result = db_send_group_message(group_id, user_id, message_text, media_url, media_type)

        if result.get('success'):
            message_data = result['data']

            # Confirm to sender
            emit('group_message_sent', {'success': True, 'message': message_data})

            # Broadcast to all group members in room
            room_name = f"group_{group_id}"
            emit('new_group_message', {'message': message_data}, room=room_name, include_self=False)

            print(f"✅ Group message {message_data.get('message_id')} sent to room {room_name}")
        else:
            emit('group_message_error', {'error': result.get('message', 'Failed to send')})

    except Exception as e:
        import traceback; traceback.print_exc()
        emit('group_message_error', {'error': str(e)})


@socketio.on('group_typing_start')
@authenticated_only
def handle_group_typing_start(user_id, data):
    try:
        group_id = data.get('group_id')
        if group_id:
            emit('group_user_typing', {
                'group_id': group_id,
                'user_id': user_id,
                'typing': True
            }, room=f"group_{group_id}", include_self=False)
    except Exception as e:
        print(f"❌ group_typing_start error: {e}")


@socketio.on('group_typing_stop')
@authenticated_only
def handle_group_typing_stop(user_id, data):
    try:
        group_id = data.get('group_id')
        if group_id:
            emit('group_user_typing', {
                'group_id': group_id,
                'user_id': user_id,
                'typing': False
            }, room=f"group_{group_id}", include_self=False)
    except Exception as e:
        print(f"❌ group_typing_stop error: {e}")


@socketio.on('delete_group_message_for_everyone')
@authenticated_only
def handle_delete_group_msg_everyone(user_id, data):
    try:
        message_id = data.get('message_id')
        group_id = data.get('group_id')
        if not message_id:
            emit('error', {'message': 'message_id required'})
            return

        from database.group_operations import delete_group_message_for_everyone
        result = delete_group_message_for_everyone(message_id, user_id)

        if result.get('success'):
            emit('group_message_deleted_for_everyone',
                 {'message_id': message_id, 'group_id': group_id},
                 room=f"group_{group_id}")
    except Exception as e:
        import traceback; traceback.print_exc()
__all__ = ['socketio', 'notify_new_message_websocket', 'is_user_online', 'get_online_status']

print("✅ WebSocket server module loaded (eventlet mode)")