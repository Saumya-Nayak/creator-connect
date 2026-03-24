from flask import Blueprint, request, jsonify
from database.profile_operations import (
    get_user_profile_with_stats,
    update_user_profile,
    update_social_links,
    follow_user,
    unfollow_user,
    check_if_following,
    get_user_followers,
    get_user_following,
    get_user_followers_with_follow_status,
    get_user_following_with_follow_status
)
from services.jwt_service import verify_token
from werkzeug.utils import secure_filename
import os
from datetime import datetime

# ✅ NEW: Import notification functions
from database.notification_operations import notify_follow
from database.follow_request_operations import create_follow_request
from database.db import get_db_connection

profile_bp = Blueprint('profile', __name__)

# Configuration for file uploads
os.makedirs(UPLOAD_FOLDER_PROFILE, exist_ok=True)
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

# Create upload directories
os.makedirs(UPLOAD_FOLDER_PROFILE, exist_ok=True)

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def verify_user_token(token):
    """Helper function to verify token and return user_id"""
    if not token:
        return None
    
    result = verify_token(token)
    if result['valid']:
        return result['user_id']
    return None

def is_user_suspended(user_id):
    """Check if a user's account is currently suspended"""
    try:
        connection = get_db_connection()
        if not connection:
            return False
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            "SELECT account_locked_until FROM users WHERE id = %s",
            (user_id,)
        )
        row = cursor.fetchone()
        cursor.close()
        connection.close()
        if not row:
            return False
        locked_until = row['account_locked_until']
        return bool(locked_until and locked_until > datetime.now())
    except Exception:
        return False

# ===== VIEW OTHER USER'S PROFILE (with suspension check) =====
@profile_bp.route('/profile/view/<int:user_id>', methods=['GET'])
def view_user_profile(user_id):
    """
    View another user's profile with privacy controls + suspension check
    """
    try:
        print(f"🔍 Profile view request for user_id: {user_id}")
        
        # Get viewer's ID (if authenticated)
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        viewer_id = verify_user_token(auth_token)
        
        print(f"👤 Viewer ID: {viewer_id or 'Guest'}")
        
        # ✅ NEW: Check if target user is suspended — return 403 to client
        if is_user_suspended(user_id):
            return jsonify({
                'success': False,
                'message': 'This account is currently suspended.',
                'is_suspended': True
            }), 403
        
        # Get the target user's profile
        result = get_user_profile_with_stats(user_id)
        
        print(f"📊 Profile fetch result: {result.get('success', False)}")
        
        if not result['success']:
            print(f"❌ Profile not found for user_id: {user_id}")
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        profile = result['profile']
        print(f"✅ Profile data loaded for: {profile.get('username', 'Unknown')}")
        # ✅ FIX: Always ensure follower/following counts exist
        # (get_user_profile_with_stats may not include these for non-own profiles)
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        if not profile.get('followers_count') and profile.get('followers_count') != 0:
            cursor.execute(
                "SELECT COUNT(*) as cnt FROM followers WHERE following_id = %s", (user_id,)
            )
            profile['followers_count'] = cursor.fetchone()['cnt']
        
        if not profile.get('following_count') and profile.get('following_count') != 0:
            cursor.execute(
                "SELECT COUNT(*) as cnt FROM followers WHERE follower_id = %s", (user_id,)
            )
            profile['following_count'] = cursor.fetchone()['cnt']
        
        # Check if viewer is viewing their own profile
        is_own_profile = viewer_id == user_id if viewer_id else False

        # ── rest of your existing view_user_profile logic continues unchanged ──
        # (privacy checks, follow status, etc.)
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        is_private = profile.get('is_private', False)
        is_following = False
        follow_request_pending = False

        if viewer_id and not is_own_profile:
            cursor.execute("""
                        SELECT id FROM followers
                        WHERE follower_id = %s AND following_id = %s
                    """, (viewer_id, user_id))
            is_following = cursor.fetchone() is not None

            if not is_following and is_private:
                try:
                    cursor.execute("""
                        SELECT id FROM follow_requests
                        WHERE follower_id = %s AND following_id = %s AND status = 'pending'
                    """, (viewer_id, user_id))
                    follow_request_pending = cursor.fetchone() is not None
                except Exception:
                    follow_request_pending = False

        cursor.close()
        connection.close()

        can_view_full = is_own_profile or not is_private or is_following

        # ✅ FIX: Embed into profile so frontend JS can read data.profile.X
        profile['is_following'] = is_following
        profile['is_pending'] = follow_request_pending
        profile['can_view_full'] = can_view_full
        profile['is_own_profile'] = is_own_profile

        return jsonify({
            'success': True,
            'profile': profile,
            'is_own_profile': is_own_profile,
            'is_following': is_following,
            'is_private': is_private,
            'can_view_full': can_view_full,
            'follow_request_pending': follow_request_pending,
            'is_suspended': False
        }), 200

    except Exception as e:
        print(f"❌ Error fetching profile: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to fetch profile'
        }), 500

# ===== GET PROFILE =====

@profile_bp.route('/profile/<int:user_id>', methods=['GET'])
def get_profile(user_id):
    """Get user profile with statistics"""
    try:
        result = get_user_profile_with_stats(user_id)
        
        if result['success']:
            # Check if requesting user is following this profile
            auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
            requesting_user_id = verify_user_token(auth_token)
            
            if requesting_user_id and requesting_user_id != user_id:
                follow_status = check_if_following(requesting_user_id, user_id)
                result['profile']['is_following'] = follow_status.get('is_following', False)
            else:
                result['profile']['is_following'] = False
            
            return jsonify(result), 200
        else:
            return jsonify(result), 404
            
    except Exception as e:
        print(f"❌ Error getting profile: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to fetch profile'
        }), 500

@profile_bp.route('/profile/me', methods=['GET'])
def get_my_profile():
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_id = verify_user_token(auth_token)

        if not user_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        result = get_user_profile_with_stats(user_id)
        if not result['success']:
            return jsonify({'success': False, 'message': 'Profile not found'}), 404

        return jsonify({'success': True, 'profile': result['profile']}), 200

    except Exception as e:
        print(f"❌ Error fetching own profile: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch profile'}), 500


# ===== UPDATE PROFILE =====
@profile_bp.route('/profile/update', methods=['PUT', 'POST'])
def update_profile():
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_id = verify_user_token(auth_token)

        if not user_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        if request.content_type and 'multipart/form-data' in request.content_type:
            update_data = {
                'full_name': request.form.get('full_name'),
                'phone': request.form.get('phone'),
                'country': request.form.get('country'),
                'state': request.form.get('state'),
                'city': request.form.get('city'),
                'gender': request.form.get('gender'),
                'about_me': request.form.get('about_me'),
                'is_private': request.form.get('is_private'),
                'website_url': request.form.get('website_url'),
            }
            update_data = {k: v for k, v in update_data.items() if v is not None}

            if 'profile_pic' in request.files:
                file = request.files['profile_pic']
                if file and file.filename and allowed_file(file.filename):
                    import cloudinary.uploader
                    result = cloudinary.uploader.upload(
                        file,
                        folder="profiles",
                        allowed_formats=["jpg", "jpeg", "png", "webp", "gif"],
                        transformation=[{"width": 400, "height": 400, "crop": "fill", "gravity": "face"}]
                    )
                    update_data['profile_pic'] = result['secure_url']
        else:
            update_data = request.get_json() or {}

        result = update_user_profile(user_id, update_data)
        if result['success']:
            return jsonify(result), 200
        return jsonify(result), 400

    except Exception as e:
        print(f"❌ Error updating profile: {e}")
        return jsonify({'success': False, 'message': 'Failed to update profile'}), 500
# ===== SOCIAL LINKS =====

@profile_bp.route('/profile/social-links', methods=['POST'])
def update_social_links_route():
    """Update social media links"""
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_id = verify_user_token(auth_token)
        
        if not user_id:
            return jsonify({
                'success': False,
                'message': 'Unauthorized'
            }), 401
        
        data = request.get_json()
        social_links = data.get('social_links', [])
        
        result = update_social_links(user_id, social_links)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f"❌ Error updating social links: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to update social links'
        }), 500


@profile_bp.route('/profile/<int:target_id>/follow', methods=['POST'])
def follow_user_route(target_id):
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        follower_id = verify_user_token(auth_token)

        if not follower_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        if follower_id == target_id:
            return jsonify({'success': False, 'message': 'Cannot follow yourself'}), 400

        if is_user_suspended(target_id):
            return jsonify({'success': False, 'message': 'Cannot follow a suspended account'}), 403

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # ✅ Check if already following FIRST
        cursor.execute("""
            SELECT id FROM followers
            WHERE follower_id = %s AND following_id = %s
        """, (follower_id, target_id))
        already_following = cursor.fetchone()

        if already_following:
            cursor.close()
            connection.close()
            # Return success=True so frontend treats it as "already following"
            return jsonify({
                'success': True,
                'message': 'Already following this user',
                'is_following': True,
                'already_following': True
            }), 200

        cursor.execute("SELECT is_private FROM users WHERE id = %s", (target_id,))
        target = cursor.fetchone()
        cursor.close()
        connection.close()

        if not target:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        if target['is_private']:
            result = create_follow_request(follower_id, target_id)
            if result['success']:
                return jsonify({
                    'success': True,
                    'message': 'Follow request sent',
                    'request_sent': True
                }), 200
            return jsonify(result), 400

        result = follow_user(follower_id, target_id)
        if result['success']:
            try:
                notify_follow(target_id, follower_id)
            except Exception:
                pass
            return jsonify({
                'success': True,
                'message': 'Following successfully',
                'is_following': True
            }), 200
        return jsonify(result), 400

    except Exception as e:
        print(f"❌ Error following user: {e}")
        return jsonify({'success': False, 'message': 'Failed to follow user'}), 500
@profile_bp.route('/profile/<int:target_id>/unfollow', methods=['POST'])
def unfollow_user_route(target_id):
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        follower_id = verify_user_token(auth_token)

        if not follower_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        result = unfollow_user(follower_id, target_id)
        if result['success']:
            return jsonify({'success': True, 'message': 'Unfollowed successfully', 'is_following': False}), 200
        return jsonify(result), 400

    except Exception as e:
        print(f"❌ Error unfollowing user: {e}")
        return jsonify({'success': False, 'message': 'Failed to unfollow user'}), 500

@profile_bp.route('/profile/following-status/<int:user_id>', methods=['GET'])
def check_following_status(user_id):
    """Check if current user is following another user"""
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        follower_id = verify_user_token(auth_token)
        
        if not follower_id:
            return jsonify({
                'success': False,
                'is_following': False
            }), 401
        
        result = check_if_following(follower_id, user_id)
        return jsonify(result), 200
            
    except Exception as e:
        print(f"❌ Error checking following status: {str(e)}")
        return jsonify({
            'success': False,
            'is_following': False
        }), 500

# ===== GET FOLLOWERS/FOLLOWING =====
# ===== GET FOLLOWERS/FOLLOWING =====
# Replace BOTH routes in profile_routes.py

@profile_bp.route('/profile/<int:user_id>/followers', methods=['GET'])
def get_followers(user_id):
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        viewer_id = verify_user_token(auth_token)

        if viewer_id:
            result = get_user_followers_with_follow_status(user_id, viewer_id)
        else:
            result = get_user_followers(user_id)

        # ✅ FIX: Extract the list from result dict (works for BOTH branches)
        followers_list = result.get('followers', [])

        return jsonify({'success': True, 'followers': followers_list}), 200

    except Exception as e:
        print(f"❌ Error fetching followers: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to fetch followers', 'followers': []}), 500


@profile_bp.route('/profile/<int:user_id>/following', methods=['GET'])
def get_following(user_id):
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        viewer_id = verify_user_token(auth_token)

        if viewer_id:
            result = get_user_following_with_follow_status(user_id, viewer_id)
        else:
            result = get_user_following(user_id)

        # ✅ FIX: Extract the list from result dict (works for BOTH branches)
        following_list = result.get('following', [])

        return jsonify({'success': True, 'following': following_list}), 200

    except Exception as e:
        print(f"❌ Error fetching following: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to fetch following', 'following': []}), 500
# ===== ADD THIS ROUTE TO YOUR profile_routes.py FILE =====

@profile_bp.route('/profile/remove-picture', methods=['DELETE'])
def remove_profile_picture():
    """
    Remove user's profile picture from database and delete file from server
    ✅ Complete implementation with file deletion
    """
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_id = verify_user_token(auth_token)
        
        if not user_id:
            return jsonify({
                'success': False,
                'message': 'Unauthorized'
            }), 401
        
        print(f"🗑️ Removing profile picture for user {user_id}")
        
        # Get current profile picture path from database
        from database.db import get_db_connection
        connection = get_db_connection()
        
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        try:
            cursor = connection.cursor(dictionary=True)
            
            # Get current profile picture
            cursor.execute("""
                SELECT profile_pic FROM users WHERE id = %s
            """, (user_id,))
            
            user = cursor.fetchone()
            
            if not user:
                cursor.close()
                connection.close()
                return jsonify({
                    'success': False,
                    'message': 'User not found'
                }), 404
            
            current_profile_pic = user.get('profile_pic')
            
            # Check if user has a profile picture
            if not current_profile_pic or current_profile_pic == 'default-avatar.png':
                cursor.close()
                connection.close()
                return jsonify({
                    'success': False,
                    'message': 'No profile picture to remove'
                }), 400
            
            # ✅ Delete file from server (if it exists and is not a URL)
            file_deleted = False
            if not current_profile_pic.startswith('http://') and not current_profile_pic.startswith('https://'):
                # Extract filename from path
                if current_profile_pic.startswith('uploads/profile/'):
                    filename = current_profile_pic.split('/')[-1]
                    file_path = os.path.join(UPLOAD_FOLDER_PROFILE, filename)
                    
                    # Delete file if it exists
                    if os.path.exists(file_path):
                        try:
                            os.remove(file_path)
                            file_deleted = True
                            print(f"✅ Deleted file: {file_path}")
                        except Exception as file_error:
                            print(f"⚠️ Failed to delete file: {file_error}")
                            # Don't fail the request if file deletion fails
                    else:
                        print(f"ℹ️ File not found on server: {file_path}")
            
            # ✅ Update database - set profile_pic to NULL
            cursor.execute("""
                UPDATE users 
                SET profile_pic = NULL, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (user_id,))
            
            connection.commit()
            
            cursor.close()
            connection.close()
            
            print(f"✅ Profile picture removed for user {user_id}")
            print(f"   - Database updated: ✅")
            print(f"   - File deleted: {'✅' if file_deleted else 'N/A'}")
            
            return jsonify({
                'success': True,
                'message': 'Profile picture removed successfully',
                'file_deleted': file_deleted
            }), 200
            
        except Exception as db_error:
            if connection:
                connection.rollback()
                connection.close()
            print(f"❌ Database error: {db_error}")
            import traceback
            traceback.print_exc()
            return jsonify({
                'success': False,
                'message': 'Database error while removing profile picture'
            }), 500
            
    except Exception as e:
        print(f"❌ Error removing profile picture: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to remove profile picture'
        }), 500