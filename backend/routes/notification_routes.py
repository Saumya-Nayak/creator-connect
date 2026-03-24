"""
Notification Routes
API endpoints for notifications and follow requests
"""
from flask import Blueprint, request, jsonify
from services.jwt_service import verify_token
from database.notification_operations import (
    get_user_notifications,
    get_unread_count,
    mark_notification_as_read,
    mark_all_as_read,
    delete_notification,
    delete_all_notifications
)
from database.follow_request_operations import (
    create_follow_request,
    accept_follow_request,
    reject_follow_request,
    cancel_follow_request,
    get_pending_follow_requests,
    get_sent_follow_requests,
    check_follow_request_status
)

notification_routes = Blueprint('notification_routes', __name__)

# ===== HELPER: Get user from token =====
def get_user_from_token():
    """Extract user_id from JWT token"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header.split(' ')[1]
    result = verify_token(token)
    
    if result['valid']:
        return result['user_id']
    return None


# ==========================================
# NOTIFICATION ENDPOINTS
# ==========================================

@notification_routes.route('/notifications', methods=['GET'])
def get_notifications():
    """
    Get user's notifications with pagination
    Query params:
        - limit: number of notifications (default: 20)
        - offset: pagination offset (default: 0)
        - unread_only: true/false (default: false)
    """
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        limit = int(request.args.get('limit', 20))
        offset = int(request.args.get('offset', 0))
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        
        result = get_user_notifications(user_id, limit, offset, unread_only)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid parameters'}), 400
    except Exception as e:
        print(f"❌ Error in get_notifications: {e}")
        return jsonify({'success': False, 'message': 'Internal server error'}), 500


@notification_routes.route('/notifications/unread-count', methods=['GET'])
def get_unread_notification_count():
    """Get count of unread notifications"""
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        count = get_unread_count(user_id)
        return jsonify({
            'success': True,
            'unread_count': count
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_unread_count: {e}")
        return jsonify({'success': False, 'message': 'Internal server error'}), 500


@notification_routes.route('/notifications/<int:notification_id>/read', methods=['PUT'])
def mark_notification_read(notification_id):
    """Mark a single notification as read"""
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        result = mark_notification_as_read(notification_id, user_id)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f"❌ Error in mark_notification_read: {e}")
        return jsonify({'success': False, 'message': 'Internal server error'}), 500


@notification_routes.route('/notifications/mark-all-read', methods=['PUT'])
def mark_all_notifications_read():
    """Mark all notifications as read"""
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        result = mark_all_as_read(user_id)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f"❌ Error in mark_all_read: {e}")
        return jsonify({'success': False, 'message': 'Internal server error'}), 500


@notification_routes.route('/notifications/<int:notification_id>', methods=['DELETE'])
def delete_single_notification(notification_id):
    """Delete a single notification"""
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        result = delete_notification(notification_id, user_id)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f"❌ Error in delete_notification: {e}")
        return jsonify({'success': False, 'message': 'Internal server error'}), 500


@notification_routes.route('/notifications/clear-all', methods=['DELETE'])
def clear_all_notifications():
    """Delete all notifications for user"""
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        result = delete_all_notifications(user_id)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f"❌ Error in clear_all_notifications: {e}")
        return jsonify({'success': False, 'message': 'Internal server error'}), 500


# ==========================================
# FOLLOW REQUEST ENDPOINTS
# ==========================================

@notification_routes.route('/follow-requests/send', methods=['POST'])
def send_follow_request():
    """
    Send a follow request to a private profile
    Body: { "following_id": <user_id> }
    """
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        data = request.get_json()
        following_id = data.get('following_id')
        
        if not following_id:
            return jsonify({'success': False, 'message': 'following_id is required'}), 400
        
        result = create_follow_request(user_id, following_id)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f"❌ Error in send_follow_request: {e}")
        return jsonify({'success': False, 'message': 'Internal server error'}), 500


@notification_routes.route('/follow-requests/<int:request_id>/accept', methods=['PUT'])
def accept_request(request_id):
    """Accept a follow request"""
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        result = accept_follow_request(request_id, user_id)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f"❌ Error in accept_request: {e}")
        return jsonify({'success': False, 'message': 'Internal server error'}), 500


@notification_routes.route('/follow-requests/<int:request_id>/reject', methods=['PUT'])
def reject_request(request_id):
    """Reject a follow request"""
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        result = reject_follow_request(request_id, user_id)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f"❌ Error in reject_request: {e}")
        return jsonify({'success': False, 'message': 'Internal server error'}), 500


@notification_routes.route('/follow-requests/<int:request_id>/cancel', methods=['DELETE'])
def cancel_request(request_id):
    """Cancel a sent follow request"""
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        result = cancel_follow_request(request_id, user_id)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f"❌ Error in cancel_request: {e}")
        return jsonify({'success': False, 'message': 'Internal server error'}), 500


@notification_routes.route('/follow-requests/pending', methods=['GET'])
def get_pending_requests():
    """
    Get pending follow requests (requests to accept/reject)
    Query params: limit, offset
    """
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        limit = int(request.args.get('limit', 20))
        offset = int(request.args.get('offset', 0))
        
        result = get_pending_follow_requests(user_id, limit, offset)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid parameters'}), 400
    except Exception as e:
        print(f"❌ Error in get_pending_requests: {e}")
        return jsonify({'success': False, 'message': 'Internal server error'}), 500


@notification_routes.route('/follow-requests/sent', methods=['GET'])
def get_sent_requests():
    """
    Get sent follow requests (requests you're waiting on)
    Query params: limit, offset
    """
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        limit = int(request.args.get('limit', 20))
        offset = int(request.args.get('offset', 0))
        
        result = get_sent_follow_requests(user_id, limit, offset)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid parameters'}), 400
    except Exception as e:
        print(f"❌ Error in get_sent_requests: {e}")
        return jsonify({'success': False, 'message': 'Internal server error'}), 500


@notification_routes.route('/follow-requests/check/<int:target_user_id>', methods=['GET'])
def check_request_status(target_user_id):
    """Check if there's a follow request between current user and target user"""
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    try:
        result = check_follow_request_status(user_id, target_user_id)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f"❌ Error in check_request_status: {e}")
        return jsonify({'success': False, 'message': 'Internal server error'}), 500


# ==========================================
# HEALTH CHECK
# ==========================================

@notification_routes.route('/notifications/health', methods=['GET'])
def notifications_health():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'message': 'Notification routes are working',
        'endpoints': {
            'notifications': [
                'GET /api/notifications',
                'GET /api/notifications/unread-count',
                'PUT /api/notifications/<id>/read',
                'PUT /api/notifications/mark-all-read',
                'DELETE /api/notifications/<id>',
                'DELETE /api/notifications/clear-all'
            ],
            'follow_requests': [
                'POST /api/follow-requests/send',
                'PUT /api/follow-requests/<id>/accept',
                'PUT /api/follow-requests/<id>/reject',
                'DELETE /api/follow-requests/<id>/cancel',
                'GET /api/follow-requests/pending',
                'GET /api/follow-requests/sent',
                'GET /api/follow-requests/check/<user_id>'
            ]
        }
    }), 200


if __name__ == "__main__":
    print("✅ Notification routes loaded")