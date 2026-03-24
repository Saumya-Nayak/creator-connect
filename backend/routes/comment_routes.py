"""
Comment Routes Module
API endpoints for post comments functionality
"""
from flask import Blueprint, request, jsonify
from services.jwt_service import verify_token
from database.comment_operations import (
    add_comment,
    get_post_comments,
    update_comment,
    delete_comment,
    get_comment_count,
    like_comment
)

# ✅ NEW: Import notification function
from database.notification_operations import notify_post_comment

comment_bp = Blueprint('comments', __name__)


# ===== ADD COMMENT WITH NOTIFICATION =====
@comment_bp.route('/posts/<int:post_id>/comments', methods=['POST'])
def add_comment_to_post(post_id):
    """
    Add a comment to a post
    ✅ NEW: Creates notification for post owner
    
    Request body:
    {
        "content": "Comment text",
        "parent_comment_id": 123  // Optional - for replies
    }
    
    Headers:
        Authorization: Bearer <token>
    """
    # Verify authentication
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return jsonify({
            'success': False,
            'message': 'Authentication required'
        }), 401
    
    verification = verify_token(token)
    if not verification['valid']:
        return jsonify({
            'success': False,
            'message': 'Invalid or expired token'
        }), 401
    
    user_id = verification['user_id']
    
    # Get request data
    data = request.get_json()
    if not data:
        return jsonify({
            'success': False,
            'message': 'No data provided'
        }), 400
    
    content = data.get('content', '').strip()
    parent_comment_id = data.get('parent_comment_id')
    
    # Validate content
    if not content:
        return jsonify({
            'success': False,
            'message': 'Comment content is required'
        }), 400
    
    if len(content) > 1000:
        return jsonify({
            'success': False,
            'message': 'Comment too long (max 1000 characters)'
        }), 400
    
    # Add comment
    result = add_comment(post_id, user_id, content, parent_comment_id)
    
    if result['success']:
        # ✅ NEW: Create comment notification
        try:
            notify_post_comment(post_id, user_id, content)
            print(f"🔔 Comment notification created for post {post_id}")
        except Exception as e:
            print(f"⚠️ Failed to create comment notification: {e}")
            # Don't fail the request if notification fails
        
        return jsonify(result), 201
    else:
        return jsonify(result), 400


# ===== GET COMMENTS =====
@comment_bp.route('/posts/<int:post_id>/comments', methods=['GET'])
def get_comments_for_post(post_id):
    """
    Get comments for a post with pagination and sorting
    
    Query parameters:
        limit: Number of comments (default: 20, max: 50)
        offset: Pagination offset (default: 0)
        include_replies: Include nested replies (default: true)
        sort_by: Sort order - 'newest', 'oldest', 'most_liked' (default: newest)
    
    Headers (optional):
        Authorization: Bearer <token> - To mark owned comments
    """
    # Get query parameters
    try:
        limit = min(int(request.args.get('limit', 20)), 50)  # Max 50
        offset = int(request.args.get('offset', 0))
        include_replies = request.args.get('include_replies', 'true').lower() == 'true'
        sort_by = request.args.get('sort_by', 'newest')
        
        # Validate sort_by
        if sort_by not in ['newest', 'oldest', 'most_liked']:
            sort_by = 'newest'
            
    except ValueError:
        return jsonify({
            'success': False,
            'message': 'Invalid pagination parameters'
        }), 400
    
    # Check if user is authenticated (optional)
    user_id = None
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if token:
        verification = verify_token(token)
        if verification['valid']:
            user_id = verification['user_id']
    
    # Get comments
    result = get_post_comments(
        post_id=post_id,
        user_id=user_id,
        limit=limit,
        offset=offset,
        include_replies=include_replies,
        sort_by=sort_by
    )
    
    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 400


# ===== UPDATE COMMENT =====
@comment_bp.route('/comments/<int:comment_id>', methods=['PUT'])
def update_comment_endpoint(comment_id):
    """
    Update a comment (only by owner)
    
    Request body:
    {
        "content": "Updated comment text"
    }
    
    Headers:
        Authorization: Bearer <token>
    """
    # Verify authentication
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return jsonify({
            'success': False,
            'message': 'Authentication required'
        }), 401
    
    verification = verify_token(token)
    if not verification['valid']:
        return jsonify({
            'success': False,
            'message': 'Invalid or expired token'
        }), 401
    
    user_id = verification['user_id']
    
    # Get request data
    data = request.get_json()
    if not data:
        return jsonify({
            'success': False,
            'message': 'No data provided'
        }), 400
    
    new_content = data.get('content', '').strip()
    
    # Validate content
    if not new_content:
        return jsonify({
            'success': False,
            'message': 'Comment content is required'
        }), 400
    
    if len(new_content) > 1000:
        return jsonify({
            'success': False,
            'message': 'Comment too long (max 1000 characters)'
        }), 400
    
    # Update comment
    result = update_comment(comment_id, user_id, new_content)
    
    if result['success']:
        return jsonify(result), 200
    else:
        status_code = 403 if 'own comments' in result.get('message', '') else 400
        return jsonify(result), status_code


# ===== DELETE COMMENT =====
@comment_bp.route('/comments/<int:comment_id>', methods=['DELETE'])
def delete_comment_endpoint(comment_id):
    """
    Delete a comment (only by owner or admin)
    
    Headers:
        Authorization: Bearer <token>
    """
    # Verify authentication
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return jsonify({
            'success': False,
            'message': 'Authentication required'
        }), 401
    
    verification = verify_token(token)
    if not verification['valid']:
        return jsonify({
            'success': False,
            'message': 'Invalid or expired token'
        }), 401
    
    user_id = verification['user_id']
    is_admin = verification.get('role') == 1  # Admin role
    
    # Delete comment
    result = delete_comment(comment_id, user_id, is_admin)
    
    if result['success']:
        return jsonify(result), 200
    else:
        status_code = 403 if 'own comments' in result.get('message', '') else 400
        return jsonify(result), status_code


# ===== GET COMMENT COUNT =====
@comment_bp.route('/posts/<int:post_id>/comments/count', methods=['GET'])
def get_comment_count_endpoint(post_id):
    """
    Get total comment count for a post
    
    No authentication required
    """
    count = get_comment_count(post_id)
    
    return jsonify({
        'success': True,
        'post_id': post_id,
        'count': count
    }), 200


# ===== LIKE COMMENT =====
@comment_bp.route('/comments/<int:comment_id>/like', methods=['POST'])
def like_comment_endpoint(comment_id):
    """
    Like a comment
    
    Headers:
        Authorization: Bearer <token>
    """
    # Verify authentication
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return jsonify({
            'success': False,
            'message': 'Authentication required'
        }), 401
    
    verification = verify_token(token)
    if not verification['valid']:
        return jsonify({
            'success': False,
            'message': 'Invalid or expired token'
        }), 401
    
    user_id = verification['user_id']
    
    # Like comment
    result = like_comment(comment_id, user_id)
    
    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 400


# ===== GET SINGLE COMMENT (Optional - for editing UI) =====
@comment_bp.route('/comments/<int:comment_id>', methods=['GET'])
def get_single_comment(comment_id):
    """
    Get a single comment by ID
    
    Headers (optional):
        Authorization: Bearer <token> - To check ownership
    """
    from database.db import get_db_connection
    
    connection = get_db_connection()
    if not connection:
        return jsonify({
            'success': False,
            'message': 'Database connection failed'
        }), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                c.comment_id,
                c.post_id,
                c.user_id,
                c.content,
                c.parent_comment_id,
                c.likes_count,
                c.created_at,
                c.updated_at,
                c.is_deleted,
                u.username,
                u.full_name,
                u.profile_pic
            FROM post_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.comment_id = %s AND c.is_deleted = FALSE
        """, (comment_id,))
        
        comment = cursor.fetchone()
        
        if not comment:
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'Comment not found'
            }), 404
        
        # Check if user is authenticated and owns the comment
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if token:
            verification = verify_token(token)
            if verification['valid']:
                comment['is_owner'] = (comment['user_id'] == verification['user_id'])
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'comment': comment
        }), 200
        
    except Exception as e:
        print(f"❌ Error fetching comment: {e}")
        if connection:
            connection.close()
        return jsonify({
            'success': False,
            'message': 'Failed to fetch comment'
        }), 500


# ===== HEALTH CHECK =====
@comment_bp.route('/comments/health', methods=['GET'])
def comments_health():
    """Health check endpoint for comments API"""
    return jsonify({
        'success': True,
        'message': 'Comments API is running',
        'endpoints': {
            'add_comment': 'POST /api/posts/<post_id>/comments',
            'get_comments': 'GET /api/posts/<post_id>/comments?sort_by=newest|oldest|most_liked',
            'update_comment': 'PUT /api/comments/<comment_id>',
            'delete_comment': 'DELETE /api/comments/<comment_id>',
            'get_comment': 'GET /api/comments/<comment_id>',
            'like_comment': 'POST /api/comments/<comment_id>/like',
            'get_count': 'GET /api/posts/<post_id>/comments/count'
        }
    }), 200