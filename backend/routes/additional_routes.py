from flask import Blueprint, request, jsonify
from database.db import get_db_connection
from services.jwt_service import verify_token
from datetime import datetime, timedelta

# ✅ NEW: Import notification functions
from database.notification_operations import notify_post_like, notify_post_share

additional_bp = Blueprint('additional', __name__)

def verify_user_token(token):
    """Helper function to verify token and return user_id"""
    if not token:
        return None
    
    result = verify_token(token)
    
    if result['valid']:
        return result['user_id']
    return None

# ===== GET ALL PUBLIC POSTS =====
@additional_bp.route('/posts/public', methods=['GET'])
def get_public_posts():
    try:
        limit = int(request.args.get('limit', 20))
        offset = int(request.args.get('offset', 0))
        
        # Get viewer's ID if authenticated
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        viewer_id = verify_user_token(auth_token)
        
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed',
                'posts': []
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # ✅ UPDATED: Added filter to exclude posts from suspended users
        query = '''
        SELECT 
            p.post_id,
            p.user_id,
            p.caption,
            p.media_url,
            p.media_type,
            p.post_type,
            p.privacy,
            p.created_at,
            
            -- Common fields
            COALESCE(p.title, p.product_title) as title,
            p.product_title,
            p.price,
            p.currency,
            COALESCE(p.short_description, '') as short_description,
            
            -- Service fields (with defaults for NULL)
            COALESCE(p.service_mode, 'online') as service_mode,
            p.service_duration,
            p.service_delivery_time,
            COALESCE(p.includes_revisions, 0) as includes_revisions,
            p.max_revisions,
            COALESCE(p.requires_advance_booking, 0) as requires_advance_booking,
            p.booking_notice_days,
            COALESCE(p.contact_email, '') as contact_email,
            COALESCE(p.contact_phone, '') as contact_phone,
            
            -- Product fields (with defaults for NULL)
            COALESCE(p.stock, 0) as stock,
            COALESCE(p.condition_type, 'new') as condition_type,
            p.brand,
            p.sku,
            COALESCE(p.shipping_available, 1) as shipping_available,
            p.shipping_cost,
            p.estimated_delivery_days,
            p.free_shipping_threshold,
            p.return_policy,
            COALESCE(p.accepts_cod, 0) as accepts_cod,
            
            -- Other fields
            p.tags,
            p.full_description,
            p.features,
            
            -- Categories
            c.category_name,
            c.category_slug,
            s.subcategory_name,
            
            -- User info
            u.username,
            u.full_name,
            u.profile_pic,
            
            -- Engagement counts
            COALESCE(p.likes_count, 0) as likes_count,
            COALESCE(p.comments_count, 0) as comments_count,
            COALESCE(p.shares_count, 0) as shares_count,
            COALESCE(p.views_count, 0) as views_count
            
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN subcategories s ON p.subcategory_id = s.subcategory_id
        WHERE p.is_deleted = FALSE 
        AND p.is_active = 1
        AND p.privacy = 'public'
        AND (
            u.account_locked_until IS NULL 
            OR u.account_locked_until <= NOW()
        )
        ORDER BY p.created_at DESC
        LIMIT %s OFFSET %s
        '''
        
        cursor.execute(query, (limit, offset))
        posts = cursor.fetchall()
        
        # Check if viewer liked each post
        if viewer_id and posts:
            post_ids = [post['post_id'] for post in posts]
            placeholders = ','.join(['%s'] * len(post_ids))
            
            cursor.execute(f'''
                SELECT post_id
                FROM post_likes
                WHERE user_id = %s AND post_id IN ({placeholders})
            ''', [viewer_id] + post_ids)
            
            liked_posts = {row['post_id'] for row in cursor.fetchall()}
            
            for post in posts:
                post['user_liked'] = post['post_id'] in liked_posts
                post['is_owner'] = viewer_id == post['user_id']
        else:
            for post in posts:
                post['user_liked'] = False
                post['is_owner'] = False
        
        cursor.close()
        connection.close()
        
        print(f"✅ Fetched {len(posts)} public posts")
        
        return jsonify({
            'success': True,
            'posts': posts,
            'count': len(posts)
        }), 200
        
    except Exception as e:
        print(f"❌ Error fetching public posts: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to fetch posts',
            'posts': []
        }), 500

# ===== GET ALL USERS (for sharing) =====
@additional_bp.route('/users/all', methods=['GET'])
def get_all_users():
    """
    Get all users for sharing posts
    Returns basic user info
    """
    try:
        limit = int(request.args.get('limit', 20))
        
        # Get current user if authenticated (to exclude self)
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        current_user_id = verify_user_token(auth_token)
        
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed',
                'users': []
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Build query
        if current_user_id:
            # Exclude current user from list
            query = """
            SELECT 
                u.id as user_id,
                u.username,
                u.full_name,
                u.profile_pic,
                COALESCE(f.followers_count, 0) as followers_count
            FROM users u
            LEFT JOIN (
                SELECT following_id, COUNT(*) as followers_count
                FROM followers
                GROUP BY following_id
            ) f ON u.id = f.following_id
            WHERE u.id != %s
            ORDER BY f.followers_count DESC
            LIMIT %s
            """
            cursor.execute(query, (current_user_id, limit))
        else:
            # Show all users
            query = """
            SELECT 
                u.id as user_id,
                u.username,
                u.full_name,
                u.profile_pic,
                COALESCE(f.followers_count, 0) as followers_count
            FROM users u
            LEFT JOIN (
                SELECT following_id, COUNT(*) as followers_count
                FROM followers
                GROUP BY following_id
            ) f ON u.id = f.following_id
            ORDER BY f.followers_count DESC
            LIMIT %s
            """
            cursor.execute(query, (limit,))
        
        users = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'users': users,
            'count': len(users)
        }), 200
        
    except Exception as e:
        print(f"❌ Error fetching all users: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to fetch users',
            'users': []
        }), 500


# ===== SHARE POST WITH NOTIFICATION =====
@additional_bp.route('/posts/<int:post_id>/share', methods=['POST'])
def share_post(post_id):
    """
    Log when a user shares a post
    Increments share count
    ✅ NEW: Creates notification for post owner
    """
    try:
        # Verify authentication
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_id = verify_user_token(auth_token)
        
        if not user_id:
            return jsonify({
                'success': False,
                'message': 'Unauthorized. Please login first.'
            }), 401
        
        data = request.get_json()
        shared_with = data.get('shared_with')  # User ID who received the share
        
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Check if post exists
        cursor.execute("""
            SELECT post_id FROM posts
            WHERE post_id = %s AND is_deleted = FALSE
        """, (post_id,))
        
        if not cursor.fetchone():
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'Post not found'
            }), 404
        
        # Log the share
        if shared_with:
            cursor.execute("""
                INSERT INTO post_shares (post_id, shared_by_user_id, shared_to_user_id, created_at)
                VALUES (%s, %s, %s, NOW())
            """, (post_id, user_id, shared_with))
        else:
            # General share (not to specific user)
            cursor.execute("""
                INSERT INTO post_shares (post_id, shared_by_user_id, shared_to_user_id, created_at)
                VALUES (%s, %s, %s, NOW())
            """, (post_id, user_id, user_id))  # Use same user for general shares
        
        connection.commit()
        
        # Get updated share count
        cursor.execute("""
            SELECT COUNT(*) as shares_count
            FROM post_shares
            WHERE post_id = %s
        """, (post_id,))
        
        shares_count = cursor.fetchone()['shares_count']
        
        cursor.close()
        connection.close()
        
        # ✅ NEW: Create share notification
        try:
            notify_post_share(post_id, user_id)
            print(f"🔔 Share notification created for post {post_id}")
        except Exception as e:
            print(f"⚠️ Failed to create share notification: {e}")
            # Don't fail the request if notification fails
        
        return jsonify({
            'success': True,
            'message': 'Post shared successfully',
            'shares_count': shares_count
        }), 200
        
    except Exception as e:
        print(f"❌ Error sharing post: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to share post'
        }), 500

# ===== GET SUGGESTED USERS =====
@additional_bp.route('/users/suggested', methods=['GET'])
def get_suggested_users():
    """
    Get suggested users to follow
    Returns users the current user is NOT following
    """
    try:
        limit = int(request.args.get('limit', 10))
        
        # Get current user if authenticated
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        current_user_id = verify_user_token(auth_token)
        
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed',
                'users': []
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        if current_user_id:
            # Get users that current user is NOT following
            query = """
            SELECT 
                u.id as user_id,
                u.username,
                u.full_name,
                u.profile_pic,
                COALESCE(f.followers_count, 0) as followers_count,
                COALESCE(p.posts_count, 0) as posts_count
            FROM users u
            
            -- Count followers
            LEFT JOIN (
                SELECT following_id, COUNT(*) as followers_count
                FROM followers
                GROUP BY following_id
            ) f ON u.id = f.following_id
            
            -- Count posts
            LEFT JOIN (
                SELECT user_id, COUNT(*) as posts_count
                FROM posts
                WHERE is_deleted = FALSE
                GROUP BY user_id
            ) p ON u.id = p.user_id
            
            WHERE u.id != %s
            AND u.id NOT IN (
                SELECT following_id
                FROM followers
                WHERE follower_id = %s
            )
            ORDER BY f.followers_count DESC, p.posts_count DESC
            LIMIT %s
            """
            cursor.execute(query, (current_user_id, current_user_id, limit))
        else:
            # For non-authenticated users, show most popular users
            query = """
            SELECT 
                u.id as user_id,
                u.username,
                u.full_name,
                u.profile_pic,
                COALESCE(f.followers_count, 0) as followers_count,
                COALESCE(p.posts_count, 0) as posts_count
            FROM users u
            
            -- Count followers
            LEFT JOIN (
                SELECT following_id, COUNT(*) as followers_count
                FROM followers
                GROUP BY following_id
            ) f ON u.id = f.following_id
            
            -- Count posts
            LEFT JOIN (
                SELECT user_id, COUNT(*) as posts_count
                FROM posts
                WHERE is_deleted = FALSE
                GROUP BY user_id
            ) p ON u.id = p.user_id
            
            ORDER BY f.followers_count DESC, p.posts_count DESC
            LIMIT %s
            """
            cursor.execute(query, (limit,))
        
        users = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        print(f"✅ Found {len(users)} suggested users")
        
        return jsonify({
            'success': True,
            'users': users,
            'count': len(users)
        }), 200
        
    except Exception as e:
        print(f"❌ Error fetching suggested users: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to fetch suggested users',
            'users': []
        }), 500

# ===== GET PLATFORM STATISTICS =====
@additional_bp.route('/stats/platform', methods=['GET'])
def get_platform_stats():
    """
    Get platform-wide statistics
    - Total users
    - Posts today
    - Active users (posted in last 24 hours)
    """
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get total users
        cursor.execute("SELECT COUNT(*) as total FROM users")
        total_users = cursor.fetchone()['total']
        
        # Get posts created today
        cursor.execute("""
            SELECT COUNT(*) as total
            FROM posts
            WHERE DATE(created_at) = CURDATE()
            AND is_deleted = FALSE
        """)
        posts_today = cursor.fetchone()['total']
        
        # Get active users (users who posted in last 24 hours)
        cursor.execute("""
            SELECT COUNT(DISTINCT user_id) as total
            FROM posts
            WHERE created_at >= NOW() - INTERVAL 24 HOUR
            AND is_deleted = FALSE
        """)
        active_users = cursor.fetchone()['total']
        
        # Get total posts
        cursor.execute("""
            SELECT COUNT(*) as total
            FROM posts
            WHERE is_deleted = FALSE
        """)
        total_posts = cursor.fetchone()['total']
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'stats': {
                'total_users': total_users,
                'posts_today': posts_today,
                'active_users': active_users,
                'total_posts': total_posts
            }
        }), 200
        
    except Exception as e:
        print(f"❌ Error fetching platform stats: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to fetch statistics'
        }), 500

# ===== LIKE/UNLIKE POST WITH NOTIFICATION =====
@additional_bp.route('/posts/<int:post_id>/like', methods=['POST'])
def toggle_like_post(post_id):
    """
    Toggle like on a post
    If already liked, unlike it. If not liked, like it.
    ✅ NEW: Creates notification when liking a post
    """
    try:
        # Verify authentication
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_id = verify_user_token(auth_token)
        
        if not user_id:
            return jsonify({
                'success': False,
                'message': 'Unauthorized. Please login first.'
            }), 401
        
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Check if post exists
        cursor.execute("""
            SELECT post_id FROM posts
            WHERE post_id = %s AND is_deleted = FALSE
        """, (post_id,))
        
        if not cursor.fetchone():
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'Post not found'
            }), 404
        
        # Check if already liked
        cursor.execute("""
            SELECT id FROM post_likes
            WHERE post_id = %s AND user_id = %s
        """, (post_id, user_id))
        
        existing_like = cursor.fetchone()
        
        if existing_like:
            # Unlike - remove the like
            cursor.execute("""
                DELETE FROM post_likes
                WHERE post_id = %s AND user_id = %s
            """, (post_id, user_id))
            connection.commit()
            action = 'unliked'
            liked = False
        else:
            # Like - add the like
            cursor.execute("""
                INSERT INTO post_likes (post_id, user_id, created_at)
                VALUES (%s, %s, NOW())
            """, (post_id, user_id))
            connection.commit()
            action = 'liked'
            liked = True
            
            # ✅ NEW: Create like notification (only when liking, not unliking)
            try:
                notify_post_like(post_id, user_id)
                print(f"🔔 Like notification created for post {post_id}")
            except Exception as e:
                print(f"⚠️ Failed to create like notification: {e}")
                # Don't fail the request if notification fails
        
        # Get updated like count
        cursor.execute("""
            SELECT COUNT(*) as likes_count
            FROM post_likes
            WHERE post_id = %s
        """, (post_id,))
        
        likes_count = cursor.fetchone()['likes_count']
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'message': f'Post {action} successfully',
            'liked': liked,
            'likes_count': likes_count
        }), 200
        
    except Exception as e:
        print(f"❌ Error toggling like: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to like/unlike post'
        }), 500

# ===== FOLLOW/UNFOLLOW USER =====
@additional_bp.route('/users/<int:user_id>/follow', methods=['POST'])
def toggle_follow_user(user_id):
    """
    Toggle follow on a user
    If already following, unfollow. If not following, follow.
    ✅ FIXED: Now uses consistent column names (following_id instead of followed_id)
    """
    try:
        # Verify authentication
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        current_user_id = verify_user_token(auth_token)
        
        if not current_user_id:
            return jsonify({
                'success': False,
                'message': 'Unauthorized. Please login first.'
            }), 401
        
        # Can't follow yourself
        if current_user_id == user_id:
            return jsonify({
                'success': False,
                'message': 'You cannot follow yourself'
            }), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Check if user exists
        cursor.execute("""
            SELECT id FROM users WHERE id = %s
        """, (user_id,))
        
        if not cursor.fetchone():
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # ✅ FIX: Use "following_id" instead of "followed_id"
        cursor.execute("""
            SELECT id FROM followers
            WHERE follower_id = %s AND following_id = %s
        """, (current_user_id, user_id))
        
        existing_follow = cursor.fetchone()
        
        if existing_follow:
            # Unfollow
            cursor.execute("""
                DELETE FROM followers
                WHERE follower_id = %s AND following_id = %s
            """, (current_user_id, user_id))
            connection.commit()
            action = 'unfollowed'
            following = False
        else:
            # Follow
            cursor.execute("""
                INSERT INTO followers (follower_id, following_id, created_at)
                VALUES (%s, %s, NOW())
            """, (current_user_id, user_id))
            connection.commit()
            action = 'followed'
            following = True
        
        # Get updated followers count
        cursor.execute("""
            SELECT COUNT(*) as followers_count
            FROM followers
            WHERE following_id = %s
        """, (user_id,))
        
        followers_count = cursor.fetchone()['followers_count']
        
        cursor.close()
        connection.close()
        
        print(f"✅ User {current_user_id} {action} user {user_id}")
        
        return jsonify({
            'success': True,
            'message': f'User {action} successfully',
            'following': following,
            'followers_count': followers_count
        }), 200
        
    except Exception as e:
        print(f"❌ Error toggling follow: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to follow/unfollow user'
        }), 500

# ===== GET USER PROFILE INFO =====
@additional_bp.route('/users/<int:user_id>/profile', methods=['GET'])
def get_user_profile_info(user_id):
    """
    Get detailed profile information for a user
    Including followers, following, and post counts
    """
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get user info
        cursor.execute("""
            SELECT 
                u.id as user_id,
                u.username,
                u.full_name,
                u.email,
                u.profile_pic,
                u.cover_photo,
                u.bio,
                u.location,
                u.website,
                u.created_at,
                COALESCE(followers.count, 0) as followers_count,
                COALESCE(following.count, 0) as following_count,
                COALESCE(posts.count, 0) as posts_count
            FROM users u
            LEFT JOIN (
                SELECT following_id, COUNT(*) as count
                FROM followers
                GROUP BY following_id
            ) followers ON u.id = followers.following_id
            LEFT JOIN (
                SELECT follower_id, COUNT(*) as count
                FROM followers
                GROUP BY follower_id
            ) following ON u.id = following.follower_id
            LEFT JOIN (
                SELECT user_id, COUNT(*) as count
                FROM posts
                WHERE is_deleted = FALSE
                GROUP BY user_id
            ) posts ON u.id = posts.user_id
            WHERE u.id = %s
        """, (user_id,))
        
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Check if current user is following this user
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        current_user_id = verify_user_token(auth_token)
        
        if current_user_id:
            cursor.execute("""
                SELECT id FROM followers
                WHERE follower_id = %s AND following_id = %s
            """, (current_user_id, user_id))
            
            user['is_following'] = cursor.fetchone() is not None
            user['is_own_profile'] = current_user_id == user_id
        else:
            user['is_following'] = False
            user['is_own_profile'] = False
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'user': user
        }), 200
        
    except Exception as e:
        print(f"❌ Error fetching user profile: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to fetch user profile'
        }), 500