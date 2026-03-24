"""
routes/group_routes.py
─────────────────────────────────────────────────────────────────────
REST endpoints for group messaging.

Mount in app.py:
    from routes.group_routes import group_routes
    app.register_blueprint(group_routes, url_prefix='/api/groups')
─────────────────────────────────────────────────────────────────────
"""

import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Blueprint, request, jsonify
from services.jwt_service import verify_token
from database.group_operations import (
    create_group,
    invite_member,
    respond_to_group_invite,
    get_user_groups,
    get_pending_group_invites,
    get_group_messages,
    send_group_message,
    delete_group_message_for_me,
    delete_group_message_for_everyone,
    get_group_members,
    leave_group,
    remove_member,
    update_group,
    get_pending_invite_count,
)
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

group_routes = Blueprint('group_routes', __name__)


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


# =====================================================================
# GROUP CRUD
# =====================================================================

@group_routes.route('', methods=['POST'])
@require_auth
def create_new_group():
    """
    POST /api/groups
    Body: { name, description?, avatar?, member_ids: [int] }
    """
    try:
        data = request.get_json() or {}
        name = (data.get('name') or '').strip()
        if not name:
            return jsonify({"success": False, "message": "Group name is required"}), 400

        result = create_group(
            creator_id=request.user_id,
            name=name,
            description=data.get('description', ''),
            member_ids=data.get('member_ids', []),
            avatar=data.get('avatar'),
        )
        return jsonify(result), 201 if result['success'] else 400
    except Exception as e:
        logger.error(f"create_new_group error: {e}")
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500


@group_routes.route('', methods=['GET'])
@require_auth
def list_groups():
    """GET /api/groups — list all groups the user belongs to."""
    try:
        result = get_user_groups(request.user_id)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@group_routes.route('/<int:group_id>', methods=['PUT'])
@require_auth
def edit_group(group_id):
    """PUT /api/groups/<id> — update group name/description/avatar (admin only)."""
    try:
        data = request.get_json() or {}
        result = update_group(
            group_id=group_id,
            admin_id=request.user_id,
            name=data.get('name'),
            description=data.get('description'),
            avatar=data.get('avatar'),
        )
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# =====================================================================
# MEMBERS
# =====================================================================

@group_routes.route('/<int:group_id>/members', methods=['GET'])
@require_auth
def get_members(group_id):
    """GET /api/groups/<id>/members"""
    try:
        result = get_group_members(group_id, request.user_id)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@group_routes.route('/<int:group_id>/invite', methods=['POST'])
@require_auth
def invite(group_id):
    """
    POST /api/groups/<id>/invite
    Body: { user_id: int }
    """
    try:
        data = request.get_json() or {}
        invitee_id = data.get('user_id')
        if not invitee_id:
            return jsonify({"success": False, "message": "user_id is required"}), 400
        result = invite_member(group_id, request.user_id, invitee_id)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@group_routes.route('/<int:group_id>/respond', methods=['PUT'])
@require_auth
def respond_invite(group_id):
    """
    PUT /api/groups/<id>/respond
    Body: { accept: true/false }
    """
    try:
        data = request.get_json() or {}
        accept = data.get('accept', False)
        result = respond_to_group_invite(group_id, request.user_id, accept)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@group_routes.route('/<int:group_id>/leave', methods=['DELETE'])
@require_auth
def leave(group_id):
    """DELETE /api/groups/<id>/leave"""
    try:
        result = leave_group(group_id, request.user_id)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@group_routes.route('/<int:group_id>/members/<int:target_id>', methods=['DELETE'])
@require_auth
def kick_member(group_id, target_id):
    """DELETE /api/groups/<id>/members/<user_id> — admin removes a member."""
    try:
        result = remove_member(group_id, request.user_id, target_id)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# =====================================================================
# INVITATIONS
# =====================================================================

@group_routes.route('/invites', methods=['GET'])
@require_auth
def pending_invites():
    """GET /api/groups/invites — all pending group invitations for current user."""
    try:
        result = get_pending_group_invites(request.user_id)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@group_routes.route('/invites/count', methods=['GET'])
@require_auth
def invites_count():
    """GET /api/groups/invites/count — badge count."""
    try:
        count = get_pending_invite_count(request.user_id)
        return jsonify({"success": True, "count": count}), 200
    except Exception as e:
        return jsonify({"success": False, "count": 0}), 500


# =====================================================================
# MESSAGES
# =====================================================================

@group_routes.route('/<int:group_id>/messages', methods=['GET'])
@require_auth
def fetch_messages(group_id):
    """GET /api/groups/<id>/messages?limit=50&offset=0"""
    try:
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        result = get_group_messages(group_id, request.user_id, limit, offset)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500


@group_routes.route('/<int:group_id>/messages', methods=['POST'])
@require_auth
def post_message(group_id):
    """
    POST /api/groups/<id>/messages
    Body: { message, media_url?, media_type? }
    """
    try:
        data = request.get_json() or {}
        message = (data.get('message') or '').strip()
        media_url = data.get('media_url')
        media_type = data.get('media_type')
        if not message and not media_url:
            return jsonify({"success": False, "message": "Message or media required"}), 400
        result = send_group_message(group_id, request.user_id, message, media_url, media_type)
        return jsonify(result), 201 if result['success'] else 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@group_routes.route('/messages/delete-for-me/<int:message_id>', methods=['DELETE'])
@require_auth
def del_msg_for_me(message_id):
    try:
        result = delete_group_message_for_me(message_id, request.user_id)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@group_routes.route('/messages/delete-for-everyone/<int:message_id>', methods=['DELETE'])
@require_auth
def del_msg_for_everyone(message_id):
    try:
        result = delete_group_message_for_everyone(message_id, request.user_id)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# =====================================================================
# HEALTH
# =====================================================================

@group_routes.route('/health', methods=['GET'])
def health():
    from datetime import datetime
    return jsonify({"success": True, "message": "Group routes working", "timestamp": str(datetime.now())}), 200