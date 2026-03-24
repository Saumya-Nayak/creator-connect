"""
routes/message_routes.py
─────────────────────────────────────────────────────────────────────
CHANGES:
  ✅ New endpoints for Instagram-style message requests:
       POST   /messages/request/send
       PUT    /messages/request/<id>/accept
       PUT    /messages/request/<id>/decline
       GET    /messages/requests           (pending inbox)
       GET    /messages/request-status/<user_id>
       GET    /messages/requests/count     (badge count)
  ✅ /can-message returns mode: 'direct'|'request'|'blocked'
─────────────────────────────────────────────────────────────────────
"""

import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from datetime import datetime

from flask import Blueprint, request, jsonify
from services.jwt_service import verify_token
from database.message_operations import (
    send_message,
    send_message_request,
    accept_message_request,
    decline_message_request,
    get_message_requests,
    get_request_status,
    get_pending_request_count,
    get_user_conversations,
    get_conversation_messages_with_reactions,
    mark_messages_as_read,
    delete_message_for_me,
    delete_message_for_everyone,
    delete_conversation,
    delete_message,
    get_unread_message_count,
    search_conversations,
    can_send_message,
    add_message_reaction,
    remove_message_reaction,
    get_message_reactions,
    get_message_reaction_summary,
)
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

message_routes = Blueprint('message_routes', __name__)


# ===== AUTH MIDDLEWARE =====

def require_auth(f):
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"success": False, "message": "Authentication required"}), 401
        token = auth_header.split(' ')[1]
        user_data = verify_token(token)
        if not user_data:
            return jsonify({"success": False, "message": "Invalid or expired token"}), 401
        request.user_id = user_data['user_id']
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

@message_routes.route('/delete-for-me/<int:message_id>', methods=['DELETE'])
@require_auth
def delete_msg_for_me(message_id):
    """
    DELETE /api/messages/delete-for-me/<message_id>
    Hides message only for the requesting user.
    Both sender and receiver can do this.
    """
    try:
        result = delete_message_for_me(message_id, request.user_id)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        logger.error(f"delete_msg_for_me error: {e}")
        return jsonify({"success": False, "message": "Internal server error"}), 500
@message_routes.route('/delete-for-everyone/<int:message_id>', methods=['DELETE'])
@require_auth
def delete_msg_for_everyone(message_id):
    """
    DELETE /api/messages/delete-for-everyone/<message_id>
    Marks message as deleted for all — only SENDER can do this.
    Message becomes '[This message was deleted]' placeholder.
    """
    try:
        result = delete_message_for_everyone(message_id, request.user_id)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        logger.error(f"delete_msg_for_everyone error: {e}")
        return jsonify({"success": False, "message": "Internal server error"}), 500
# ===== CONVERSATIONS =====

@message_routes.route('/conversations', methods=['GET'])
@require_auth
def get_conversations():
    try:
        limit = request.args.get('limit', 50, type=int)
        result = get_user_conversations(request.user_id, limit)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        logger.error(f"get_conversations error: {e}")
        return jsonify({"success": False, "message": "Internal server error"}), 500


# ===== GET MESSAGES =====

@message_routes.route('/messages/<int:other_user_id>', methods=['GET'])
@require_auth
def get_messages(other_user_id):
    try:
        limit  = request.args.get('limit',  50, type=int)
        offset = request.args.get('offset',  0, type=int)
        result = get_conversation_messages_with_reactions(request.user_id, other_user_id, limit, offset)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        logger.error(f"get_messages error: {e}")
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "message": "Internal server error"}), 500


# ===== SEND DIRECT MESSAGE =====

@message_routes.route('/send', methods=['POST'])
@require_auth
def send_new_message():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400

        receiver_id = data.get('receiver_id')
        message     = data.get('message')
        media_url   = data.get('media_url')
        media_type  = data.get('media_type')

        if not receiver_id:
            return jsonify({"success": False, "message": "Receiver ID is required"}), 400
        if not message and not media_url:
            return jsonify({"success": False, "message": "Message or media is required"}), 400

        result = send_message(request.user_id, receiver_id, message or "", media_url, media_type)

        # Frontend should detect needs_request flag and redirect to request flow
        status = 201 if result['success'] else (403 if result.get('needs_request') else 400)
        return jsonify(result), status

    except Exception as e:
        logger.error(f"send_message error: {e}")
        return jsonify({"success": False, "message": "Internal server error"}), 500


# =====================================================================
# MESSAGE REQUESTS (Instagram-style)
# =====================================================================

@message_routes.route('/request/send', methods=['POST'])
@require_auth
def send_request():
    """
    Send a message request to a user you follow (one-way).
    Body: { "receiver_id": int, "first_message": str }
    """
    try:
        data = request.get_json() or {}
        receiver_id   = data.get('receiver_id')
        first_message = (data.get('first_message') or '').strip()

        if not receiver_id:
            return jsonify({"success": False, "message": "receiver_id is required"}), 400
        if not first_message:
            return jsonify({"success": False, "message": "first_message is required"}), 400

        result = send_message_request(request.user_id, receiver_id, first_message)
        return jsonify(result), 200 if result['success'] else 400

    except Exception as e:
        logger.error(f"send_request error: {e}")
        return jsonify({"success": False, "message": "Internal server error"}), 500


@message_routes.route('/request/<int:request_id>/accept', methods=['PUT'])
@require_auth
def accept_request(request_id):
    """Accept a message request — opens the conversation."""
    try:
        result = accept_message_request(request_id, request.user_id)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        logger.error(f"accept_request error: {e}")
        return jsonify({"success": False, "message": "Internal server error"}), 500


@message_routes.route('/request/<int:request_id>/decline', methods=['PUT'])
@require_auth
def decline_request(request_id):
    """Decline a message request."""
    try:
        result = decline_message_request(request_id, request.user_id)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        logger.error(f"decline_request error: {e}")
        return jsonify({"success": False, "message": "Internal server error"}), 500


@message_routes.route('/requests', methods=['GET'])
@require_auth
def get_requests():
    """
    Get pending message requests for the current user.
    These appear in their 'Message Requests' inbox.
    """
    try:
        limit  = request.args.get('limit',  30, type=int)
        offset = request.args.get('offset',  0, type=int)
        result = get_message_requests(request.user_id, limit, offset)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        logger.error(f"get_requests error: {e}")
        return jsonify({"success": False, "message": "Internal server error"}), 500


@message_routes.route('/requests/count', methods=['GET'])
@require_auth
def requests_count():
    """Badge count for message requests tab."""
    try:
        count = get_pending_request_count(request.user_id)
        return jsonify({"success": True, "count": count}), 200
    except Exception as e:
        return jsonify({"success": False, "count": 0}), 500


@message_routes.route('/request-status/<int:other_user_id>', methods=['GET'])
@require_auth
def request_status(other_user_id):
    """
    Check messaging mode between current user and other_user_id.
    Returns: { mode, request_id, request_status }
    Frontend uses this to decide: show 'Message' button / 'Request sent' / 'Blocked'
    """
    try:
        result = get_request_status(request.user_id, other_user_id)
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"request_status error: {e}")
        return jsonify({"success": False, "message": "Internal server error"}), 500


# ===== MARK READ =====

@message_routes.route('/mark-read/<int:other_user_id>', methods=['PUT'])
@require_auth
def mark_read(other_user_id):
    try:
        result = mark_messages_as_read(request.user_id, other_user_id)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        return jsonify({"success": False, "message": "Internal server error"}), 500


# ===== DELETE =====
@message_routes.route('/delete/<int:message_id>', methods=['DELETE'])
@require_auth
def delete_msg(message_id):
    """Legacy endpoint — defaults to delete for me"""
    try:
        result = delete_message_for_me(message_id, request.user_id)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        return jsonify({"success": False, "message": "Internal server error"}), 500


@message_routes.route('/delete-conversation/<int:other_user_id>', methods=['DELETE', 'OPTIONS'])
@require_auth
def delete_conv(other_user_id):
    """
    DELETE /api/messages/delete-conversation/<other_user_id>
    Body: { "mode": "me" }   → hides from you only (default)
    Body: { "mode": "everyone" } → deletes for both users
    """
    if request.method == 'OPTIONS':
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Methods", "DELETE, OPTIONS")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        return response, 200
 
    try:
        data = request.get_json() or {}
        mode = data.get('mode', 'me')   # 'me' or 'everyone'
 
        result = delete_conversation(request.user_id, other_user_id, mode=mode)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        logger.error(f"delete_conv error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500  # Show real error


# ===== UNREAD =====

@message_routes.route('/unread-count', methods=['GET'])
@require_auth
def unread_count():
    try:
        count = get_unread_message_count(request.user_id)
        return jsonify({"success": True, "unread_count": count}), 200
    except Exception as e:
        return jsonify({"success": False, "message": "Internal server error"}), 500


# ===== SEARCH =====

@message_routes.route('/search', methods=['GET'])
@require_auth
def search():
    try:
        query = request.args.get('q', '')
        if not query or len(query) < 2:
            return jsonify({"success": False, "message": "Query must be at least 2 characters"}), 400
        result = search_conversations(request.user_id, query)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        return jsonify({"success": False, "message": "Internal server error"}), 500


# ===== CAN MESSAGE =====

@message_routes.route('/can-message/<int:other_user_id>', methods=['GET'])
@require_auth
def check_can_message(other_user_id):
    """
    Returns:
      { can_message, mode, reason }
      mode: 'direct' | 'request' | 'blocked' | 'self'
    Frontend uses mode to decide which button to show on profiles.
    """
    try:
        can_send, mode = can_send_message(request.user_id, other_user_id)
        mode_messages = {
            'direct':  'Can send messages directly',
            'request': 'Must send a message request first',
            'blocked': 'You must follow this user to message them',
            'self':    'Cannot message yourself',
        }
        return jsonify({
            "success":     True,
            "can_message": can_send,
            "mode":        mode,
            "reason":      mode_messages.get(mode, ''),
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": "Internal server error"}), 500


# ===== REACTIONS =====

@message_routes.route('/reactions/add', methods=['POST'])
@require_auth
def add_reaction():
    try:
        data = request.get_json() or {}
        message_id    = data.get('message_id')
        reaction_type = data.get('reaction_type')
        if not message_id or not reaction_type:
            return jsonify({"success": False, "message": "message_id and reaction_type required"}), 400
        result = add_message_reaction(message_id, request.user_id, reaction_type)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        return jsonify({"success": False, "message": "Internal server error"}), 500


@message_routes.route('/reactions/remove/<int:message_id>', methods=['DELETE'])
@require_auth
def remove_reaction(message_id):
    try:
        result = remove_message_reaction(message_id, request.user_id)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        return jsonify({"success": False, "message": "Internal server error"}), 500


@message_routes.route('/reactions/<int:message_id>', methods=['GET'])
@require_auth
def get_reactions(message_id):
    try:
        reactions = get_message_reactions(message_id)
        summary   = get_message_reaction_summary(message_id)
        return jsonify({"success": True, "reactions": reactions, "summary": summary}), 200
    except Exception as e:
        return jsonify({"success": False, "message": "Internal server error"}), 500


# ===== HEALTH =====

@message_routes.route('/health', methods=['GET'])
def health():
    return jsonify({"success": True, "message": "Message routes working", "timestamp": str(datetime.now())}), 200