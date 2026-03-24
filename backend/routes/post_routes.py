from flask import Blueprint, request, jsonify
from database.db import get_db_connection
from database.post_operations import (
    create_post, 
    get_user_posts, 
    delete_post, 
    hard_delete_post,
    update_post,
    get_post_by_id
)
from services.jwt_service import verify_token
from werkzeug.utils import secure_filename
import os
from datetime import datetime

post_bp = Blueprint('post', __name__)

# Configuration
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'webm'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

# Create upload directory


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def verify_user_token(token):
    """Helper function to verify token and return user_id"""
    if not token:
        return None
    
    from services.jwt_service import verify_token
    result = verify_token(token)
    
    if result['valid']:
        return result['user_id']
    return None

# ===== 🆕 GET POST FOR EDITING =====
@post_bp.route('/posts/<int:post_id>/edit', methods=['GET'])
def get_post_for_edit(post_id):
    """
    Get post details for editing
    Only the post owner can access this
    """
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_id = verify_user_token(auth_token)
        
        if not user_id:
            return jsonify({
                'success': False,
                'message': 'Unauthorized. Please login first.'
            }), 401
        
        # Get post with ownership verification
        result = get_post_by_id(post_id, user_id)
        
        if not result['success']:
            return jsonify(result), 404 if result['message'] == 'Post not found' else 403
        
        print(f"✅ Fetched post {post_id} for editing by user {user_id}")
        
        return jsonify({
            'success': True,
            'post': result['post']
        }), 200
        
    except Exception as e:
        print(f"❌ Error fetching post for edit: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to fetch post'
        }), 500
# Add this new route to post_routes.py (around line 150, after existing routes)
# ===== PASTE THIS AFTER THE get_post_for_edit FUNCTION (around line 71) =====

# ===== UPDATE POST MEDIA (for cropping) =====
@post_bp.route('/posts/<int:post_id>/update-media', methods=['PUT'])
def update_post_media(post_id):
    """
    Update the media file for an existing post (used for cropped images)
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
        
        # Check if file is provided
        if 'media' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No media file provided'
            }), 400
        
        file = request.files['media']
        
        # Validate file
        if file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No file selected'
            }), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'message': 'Invalid file type'
            }), 400
        
        # Get the post and verify ownership
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT user_id, media_url, media_type
            FROM posts
            WHERE post_id = %s AND is_deleted = FALSE
        """, (post_id,))
        
        post = cursor.fetchone()
        
        if not post:
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'Post not found'
            }), 404
        
        if post['user_id'] != user_id:
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'You can only update your own posts'
            }), 403
        
        # Delete old media file if it exists
        # Delete old media from Cloudinary if it was a Cloudinary URL
        old_media_path = post['media_url']
        if old_media_path and '/upload/' in old_media_path:
            try:
                import cloudinary.uploader
                public_id = old_media_path.split('/upload/')[1].rsplit('.', 1)[0]
                cloudinary.uploader.destroy(public_id)
            except Exception as e:
                print(f"⚠️ Error deleting old Cloudinary media: {e}")

        # Upload new file to Cloudinary
        import cloudinary.uploader
        resource_type = 'video' if file.content_type.startswith('video') else 'image'
        upload_result = cloudinary.uploader.upload(
            file,
            folder="posts",
            resource_type=resource_type,
            allowed_formats=["jpg", "jpeg", "png", "webp", "gif", "mp4", "webm"]
        )
        new_media_url = upload_result['secure_url']
        
        cursor.execute("""
            UPDATE posts
            SET media_url = %s, updated_at = NOW()
            WHERE post_id = %s
        """, (new_media_url, post_id))
        
        connection.commit()
        cursor.close()
        connection.close()
        
        print(f"✅ Post {post_id} media updated successfully")
        
        return jsonify({
            'success': True,
            'message': 'Media updated successfully',
            'media_url': new_media_url
        }), 200
        
    except Exception as e:
        print(f"❌ Error updating post media: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to update media'
        }), 500
@post_bp.route('/posts/user/<int:user_id>/profile', methods=['GET'])
def get_user_posts_for_profile(user_id):
    """
    Get posts for PROFILE PAGE ONLY - uses only existing database columns
    This won't affect home feed, explore, or other pages
    """
    try:
        limit = int(request.args.get('limit', 20))
        offset = int(request.args.get('offset', 0))
        post_type = request.args.get('type', 'all')
        
        # Get viewer's ID (if authenticated)
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
        
        # Check if viewer is the owner
        is_own_profile = viewer_id == user_id if viewer_id else False
        
        # Check profile privacy
        cursor.execute("SELECT is_private FROM users WHERE id = %s", (user_id,))
        user_data = cursor.fetchone()
        
        if not user_data:
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'User not found',
                'posts': []
            }), 404
        
        is_private = user_data.get('is_private', False)
        
        # Check if viewer is following
        is_following = False
        if viewer_id and not is_own_profile and is_private:
            cursor.execute("""
                SELECT id FROM followers
                WHERE follower_id = %s AND following_id = %s
            """, (viewer_id, user_id))
            is_following = cursor.fetchone() is not None
        
        # Determine what posts to show
        can_view_posts = is_own_profile or not is_private or is_following
        
        if not can_view_posts:
            cursor.close()
            connection.close()
            return jsonify({
                'success': True,
                'posts': [],
                'message': 'This account is private',
                'can_view': False
            }), 200
        
        # ✅ FIX: Query ONLY columns that exist in your database
        # Remove service_mode and return_policy since they might not exist
        where_clause = "WHERE p.user_id = %s AND p.is_deleted = FALSE"
        params = [user_id]
        
        # Add privacy filter
        if not is_own_profile:
            where_clause += " AND p.privacy = 'public'"
        
        # Filter by post type
        if post_type != 'all' and post_type in ['showcase', 'service', 'product']:
            where_clause += " AND p.post_type = %s"
            params.append(post_type)
        
        # ✅ MINIMAL QUERY - only essential fields
        query = f"""
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
            p.title,
            p.product_title,
            p.price,
            p.currency,
            
            -- Stock for products
            p.stock,
            
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
        {where_clause}
        ORDER BY p.created_at DESC
        LIMIT %s OFFSET %s
        """
        
        params.extend([limit, offset])
        cursor.execute(query, params)
        posts = cursor.fetchall()
        
        # Check if viewer liked each post
        if viewer_id and posts:
            post_ids = [post['post_id'] for post in posts]
            placeholders = ','.join(['%s'] * len(post_ids))
            
            cursor.execute(f"""
                SELECT post_id
                FROM post_likes
                WHERE user_id = %s AND post_id IN ({placeholders})
            """, [viewer_id] + post_ids)
            
            liked_posts = {row['post_id'] for row in cursor.fetchall()}
            
            for post in posts:
                post['user_liked'] = post['post_id'] in liked_posts
                post['is_owner'] = is_own_profile
        else:
            for post in posts:
                post['user_liked'] = False
                post['is_owner'] = is_own_profile
        
        cursor.close()
        connection.close()
        
        print(f"✅ Fetched {len(posts)} posts for profile page (user {user_id})")
        
        return jsonify({
            'success': True,
            'posts': posts,
            'count': len(posts),
            'can_view': can_view_posts
        }), 200
        
    except Exception as e:
        print(f"❌ Error fetching profile posts: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to fetch posts',
            'posts': []
        }), 500

# ===== 🆕 UPDATE POST =====
@post_bp.route('/posts/<int:post_id>/update', methods=['PUT'])
def update_post_route(post_id):
    """
    Update post details
    Cannot change post_type or media
    """
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_id = verify_user_token(auth_token)
        
        if not user_id:
            return jsonify({
                'success': False,
                'message': 'Unauthorized. Please login first.'
            }), 401
        
        # Get JSON data
        update_data = request.get_json()
        
        if not update_data:
            return jsonify({
                'success': False,
                'message': 'No update data provided'
            }), 400
        
        # Validate caption if provided
        if 'caption' in update_data:
            caption = update_data['caption'].strip()
            if len(caption) < 3:
                return jsonify({
                    'success': False,
                    'message': 'Caption must be at least 3 characters'
                }), 400
            if len(caption) > 500:
                return jsonify({
                    'success': False,
                    'message': 'Caption cannot exceed 500 characters'
                }), 400
        
        # Validate price if provided
        if 'price' in update_data:
            try:
                price = float(update_data['price'])
                if price < 0:
                    return jsonify({
                        'success': False,
                        'message': 'Price cannot be negative'
                    }), 400
                update_data['price'] = price
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Invalid price format'
                }), 400
        
        # Validate stock if provided
        if 'stock' in update_data:
            try:
                stock = int(update_data['stock'])
                if stock < 0:
                    return jsonify({
                        'success': False,
                        'message': 'Stock cannot be negative'
                    }), 400
                update_data['stock'] = stock
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Invalid stock format'
                }), 400
        
        # Update the post
        result = update_post(post_id, user_id, update_data)
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': 'Post updated successfully'
            }), 200
        else:
            return jsonify(result), 400
        
    except Exception as e:
        print(f"❌ Error updating post: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to update post'
        }), 500

# ===== 🆕 HARD DELETE POST (with media file removal) =====
@post_bp.route('/posts/<int:post_id>/hard-delete', methods=['DELETE'])
def hard_delete_post_route(post_id):
    """
    Permanently delete post from database and remove media file
    """
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_id = verify_user_token(auth_token)
        
        if not user_id:
            return jsonify({
                'success': False,
                'message': 'Unauthorized. Please login first.'
            }), 401
        
        # Hard delete post with media file
        result = hard_delete_post(post_id, user_id)
        
        if result['success']:
            return jsonify(result), 200
        else:
            status_code = 404 if 'not found' in result['message'].lower() else 403
            return jsonify(result), status_code
        
    except Exception as e:
        print(f"❌ Error deleting post: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to delete post'
        }), 500

# ===== GET USER POSTS WITH PRIVACY CONTROLS =====
@post_bp.route('/posts/user/<int:user_id>', methods=['GET'])
def get_user_posts_route(user_id):
    """
    Get posts from a specific user with privacy controls
    - Returns all posts if viewer is the owner
    - Returns public posts if profile is public
    - Returns limited/no posts if profile is private and viewer is not following
    """
    try:
        limit = int(request.args.get('limit', 20))
        offset = int(request.args.get('offset', 0))
        post_type = request.args.get('type', 'all')
        
        # Get viewer's ID (if authenticated)
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
        
        # Check if viewer is the owner
        is_own_profile = viewer_id == user_id if viewer_id else False
        
        # Check profile privacy settings
        cursor.execute("""
            SELECT is_private FROM users WHERE id = %s
        """, (user_id,))
        
        user_data = cursor.fetchone()
        if not user_data:
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'User not found',
                'posts': []
            }), 404
        
        is_private = user_data.get('is_private', False)
        
        # Check if viewer is following this user (for private profiles)
        is_following = False
        if viewer_id and not is_own_profile and is_private:
            try:
                cursor.execute("""
                    SELECT id FROM followers
                    WHERE follower_id = %s AND following_id = %s
                """, (viewer_id, user_id))
                is_following = cursor.fetchone() is not None
            except Exception as e:
                print(f"⚠️ Trying alternate column name for followers check")
                try:
                    cursor.execute("""
                        SELECT id FROM followers
                        WHERE follower_id = %s AND followed_id = %s
                    """, (viewer_id, user_id))
                    is_following = cursor.fetchone() is not None
                except Exception as e2:
                    print(f"❌ Error checking follow status: {e2}")
                    is_following = False
        
        # Determine what posts to show
        can_view_posts = is_own_profile or not is_private or is_following
        
        if not can_view_posts:
            cursor.close()
            connection.close()
            return jsonify({
                'success': True,
                'posts': [],
                'message': 'This account is private. Follow to see their posts.',
                'is_private': True,
                'can_view': False
            }), 200
        
        # Build query for posts
        where_clause = "WHERE p.user_id = %s AND p.is_deleted = FALSE"
        params = [user_id]
        
        # If not own profile, only show public posts
        if not is_own_profile:
            where_clause += " AND p.privacy = 'public'"
        
        # Filter by post type if specified
        if post_type != 'all' and post_type in ['showcase', 'service', 'product']:
            where_clause += " AND p.post_type = %s"
            params.append(post_type)
        
        # Fetch posts with categories
        query = f"""
        SELECT 
            p.post_id,
            p.user_id,
            p.caption,
            p.media_url,
            p.media_type,
            p.post_type,
            p.privacy,
            p.created_at,
            p.tags,
            
            -- Common fields
            p.title,
            p.product_title,
            p.price,
            p.currency,
            p.short_description,
            
            -- Service fields
            p.service_duration,
            
            -- Product fields
            p.stock,
            p.condition_type,
            
            -- Contact & Payment
            p.contact_phone,
            p.seller_phone_number,
            
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
        {where_clause}
        ORDER BY p.created_at DESC
        LIMIT %s OFFSET %s
        """
        
        params.extend([limit, offset])
        cursor.execute(query, params)
        posts = cursor.fetchall()
        
        # Check if viewer liked each post (if authenticated)
        if viewer_id and posts:
            post_ids = [post['post_id'] for post in posts]
            placeholders = ','.join(['%s'] * len(post_ids))
            
            cursor.execute(f"""
                SELECT post_id
                FROM post_likes
                WHERE user_id = %s AND post_id IN ({placeholders})
            """, [viewer_id] + post_ids)
            
            liked_posts = {row['post_id'] for row in cursor.fetchall()}
            
            for post in posts:
                post['user_liked'] = post['post_id'] in liked_posts
                post['is_owner'] = is_own_profile
        else:
            for post in posts:
                post['user_liked'] = False
                post['is_owner'] = is_own_profile
        
        cursor.close()
        connection.close()
        
        print(f"✅ Fetched {len(posts)} posts for user {user_id} (viewer: {viewer_id or 'guest'})")
        
        return jsonify({
            'success': True,
            'posts': posts,
            'count': len(posts),
            'can_view': can_view_posts,
            'is_private': is_private,
            'is_own_profile': is_own_profile
        }), 200
        
    except Exception as e:
        print(f"❌ Error fetching user posts: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to fetch posts',
            'posts': []
        }), 500

# ===== CREATE POST (with direct P2P payment fields) =====
@post_bp.route('/create-post', methods=['POST'])
def create_post_route():
    """
    Create a new post (Showcase or Selling) with direct P2P payment support
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

        # Check if file is provided
        if 'media' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No media file provided'
            }), 400

        file = request.files['media']

        # Validate file
        if file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No file selected'
            }), 400

        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'message': 'Invalid file type. Allowed: JPG, PNG, GIF, WebP, MP4, WebM'
            }), 400

        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        if file_size > MAX_FILE_SIZE:
            return jsonify({
                'success': False,
                'message': 'File size exceeds 50MB limit'
            }), 400

        # Get required fields
        caption = request.form.get('caption', '').strip()
        post_type = request.form.get('post_type', 'showcase')
        privacy = request.form.get('privacy', 'public')

        # Validate caption
        if not caption or len(caption) < 3:
            return jsonify({
                'success': False,
                'message': 'Caption must be at least 3 characters'
            }), 400

        if len(caption) > 500:
            return jsonify({
                'success': False,
                'message': 'Caption cannot exceed 500 characters'
            }), 400

        # Validate post type
        if post_type not in ['showcase', 'selling']:
            return jsonify({
                'success': False,
                'message': 'Invalid post type'
            }), 400

        # Validate privacy
        if privacy not in ['public', 'followers']:
            return jsonify({
                'success': False,
                'message': 'Invalid privacy setting'
            }), 400

        # Generate unique filename
       # Upload to Cloudinary
        import cloudinary.uploader
        resource_type = 'video' if file.content_type.startswith('video') else 'image'
        upload_result = cloudinary.uploader.upload(
            file,
            folder="posts",
            resource_type=resource_type,
            allowed_formats=["jpg", "jpeg", "png", "webp", "gif", "mp4", "webm"]
        )
        media_url = upload_result['secure_url']

        # Prepare post data
        post_data = {
            'user_id': user_id,
            'caption': caption,
            'post_type': post_type,
            'privacy': privacy,
            'media_url': media_url,
            'media_type': resource_type
        }

        # Add showcase-specific data
        if post_type == 'showcase':
            tags = request.form.get('tags', '').strip()
            if tags:
                post_data['tags'] = tags

        # Add selling-specific data (with P2P payment details)
        elif post_type == 'selling':
            product_title = request.form.get('product_title', '').strip()
            price = request.form.get('price', '0')
            category = request.form.get('category', '').strip()
            stock = request.form.get('stock', '')
            short_description = request.form.get('short_description', '').strip()
            product_description = request.form.get('product_description', '').strip()
            contact_info = request.form.get('contact_info', '').strip()
            delivery_time = request.form.get('delivery_time', '').strip()
            highlights = request.form.get('highlights', '').strip()
            currency = request.form.get('currency', 'INR')
            
            # Direct P2P payment details
            accepts_upi = request.form.get('accepts_upi', 'false').lower() == 'true'
            accepts_bank_transfer = request.form.get('accepts_bank_transfer', 'false').lower() == 'true'
            accepts_cod = request.form.get('accepts_cod', 'false').lower() == 'true'
            seller_upi_id = request.form.get('seller_upi_id', '').strip()
            seller_phone_number = request.form.get('seller_phone_number', '').strip()
            seller_bank_account = request.form.get('seller_bank_account', '').strip()
            seller_bank_ifsc = request.form.get('seller_bank_ifsc', '').strip()
            seller_bank_holder_name = request.form.get('seller_bank_holder_name', '').strip()
            payment_instructions = request.form.get('payment_instructions', '').strip()

            # Validate selling fields
            if not product_title:
                return jsonify({
                    'success': False,
                    'message': 'Product title is required'
                }), 400

            try:
                price_float = float(price)
                if price_float < 0:
                    raise ValueError()
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Invalid price'
                }), 400

            if not category:
                return jsonify({
                    'success': False,
                    'message': 'Category is required'
                }), 400

            if not seller_phone_number:
                return jsonify({
                    'success': False,
                    'message': 'Phone number is required for buyer contact'
                }), 400

            # Validate at least one payment method is selected
            if not accepts_upi and not accepts_bank_transfer and not accepts_cod:
                return jsonify({
                    'success': False,
                    'message': 'Please select at least one payment method'
                }), 400

            # If UPI is accepted, UPI ID is required
            if accepts_upi and not seller_upi_id:
                return jsonify({
                    'success': False,
                    'message': 'UPI ID is required if you accept UPI payments'
                }), 400

            # If Bank Transfer is accepted, bank details are required
            if accepts_bank_transfer and (not seller_bank_account or not seller_bank_ifsc):
                return jsonify({
                    'success': False,
                    'message': 'Bank account details are required if you accept bank transfers'
                }), 400

            post_data['product_title'] = product_title
            post_data['price'] = price_float
            post_data['currency'] = currency
            post_data['category'] = category
            
            # Payment details
            post_data['accepts_upi'] = accepts_upi
            post_data['accepts_bank_transfer'] = accepts_bank_transfer
            post_data['accepts_cod'] = accepts_cod
            post_data['seller_upi_id'] = seller_upi_id if accepts_upi else None
            post_data['seller_phone_number'] = seller_phone_number
            post_data['seller_bank_account'] = seller_bank_account if accepts_bank_transfer else None
            post_data['seller_bank_ifsc'] = seller_bank_ifsc if accepts_bank_transfer else None
            post_data['seller_bank_holder_name'] = seller_bank_holder_name if accepts_bank_transfer else None
            post_data['payment_instructions'] = payment_instructions
            
            if stock:
                try:
                    post_data['stock'] = int(stock)
                except ValueError:
                    pass
            
            if short_description:
                post_data['short_description'] = short_description
            if product_description:
                post_data['product_description'] = product_description
            if contact_info:
                post_data['contact_info'] = contact_info
            if delivery_time:
                post_data['delivery_time'] = delivery_time
            if highlights:
                post_data['highlights'] = highlights

        # Create post in database
        result = create_post(post_data)

        if result['success']:
            print(f"✅ Post created successfully - ID: {result['post_id']}")
            return jsonify({
                'success': True,
                'message': 'Post published successfully!',
                'post_id': result['post_id']
            }), 201
        else:
            # Delete uploaded file if database insertion fails
            pass  # Cloudinary upload already done; log the DB failure
            return jsonify({
                'success': False,
                'message': result['message']
            }), 400

    except Exception as e:
        print(f"❌ Error creating post: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to create post. Please try again.'
        }), 500

# ===== GET SELLING POSTS (MARKETPLACE) =====
@post_bp.route('/posts/marketplace', methods=['GET'])
def get_marketplace_posts():
    """Get all selling posts for marketplace"""
    try:
        category = request.args.get('category', None)
        limit = int(request.args.get('limit', 20))
        offset = int(request.args.get('offset', 0))

        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'posts': []}), 500

        cursor = connection.cursor(dictionary=True)

        where_clause = "WHERE p.post_type = 'selling' AND p.is_deleted = FALSE AND p.privacy = 'public'"
        params = []

        if category:
            where_clause += " AND p.category = %s"
            params.append(category)

        query = f"""
        SELECT 
            p.post_id,
            p.user_id,
            p.caption,
            p.media_url,
            p.product_title,
            p.price,
            p.currency,
            p.category,
            p.stock,
            p.short_description,
            p.contact_info,
            p.delivery_time,
            p.accepts_upi,
            p.accepts_bank_transfer,
            p.accepts_cod,
            p.seller_upi_id,
            p.seller_phone_number,
            p.payment_instructions,
            p.total_sales,
            p.total_revenue,
            p.created_at,
            u.username,
            u.full_name,
            u.profile_pic
        FROM posts p
        JOIN users u ON p.user_id = u.id
        {where_clause}
        ORDER BY p.created_at DESC
        LIMIT %s OFFSET %s
        """

        params.extend([limit, offset])
        cursor.execute(query, params)
        posts = cursor.fetchall()

        cursor.close()
        connection.close()

        return jsonify({
            'success': True,
            'posts': posts
        }), 200

    except Exception as e:
        print(f"❌ Error fetching marketplace posts: {e}")
        return jsonify({
            'success': False,
            'posts': []
        }), 500

# ===== GET SINGLE POST BY ID =====
@post_bp.route('/posts/<int:post_id>', methods=['GET'])
def get_single_post(post_id):
    """
    Get single post with all details including categories and payment info
    """
    try:
        # Get current user if authenticated (to check if they liked the post)
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        current_user_id = verify_user_token(auth_token)
        
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500

        cursor = connection.cursor(dictionary=True)

        query = """
        SELECT 
            p.*,
            
            -- User info
            u.username,
            u.full_name,
            u.profile_pic,
            
            -- Category & Subcategory info
            c.category_name,
            c.category_slug,
            c.icon as category_icon,
            s.subcategory_name,
            s.subcategory_slug,
            
            -- Engagement counts
            COALESCE(p.likes_count, (SELECT COUNT(*) FROM post_likes WHERE post_id = p.post_id)) as likes_count,
            COALESCE(p.comments_count, (SELECT COUNT(*) FROM post_comments WHERE post_id = p.post_id)) as comments_count,
            COALESCE(p.shares_count, (SELECT COUNT(*) FROM post_shares WHERE post_id = p.post_id)) as shares_count
            
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN subcategories s ON p.subcategory_id = s.subcategory_id
        
        WHERE p.post_id = %s AND p.is_deleted = FALSE
        """

        cursor.execute(query, (post_id,))
        post = cursor.fetchone()

        if not post:
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'Post not found'
            }), 404
        
        # Check if current user liked this post
        if current_user_id:
            cursor.execute("""
                SELECT id FROM post_likes
                WHERE post_id = %s AND user_id = %s
            """, (post_id, current_user_id))
            
            post['user_liked'] = cursor.fetchone() is not None
            post['is_owner'] = current_user_id == post['user_id']
        else:
            post['user_liked'] = False
            post['is_owner'] = False
        
        # Get comments for this post
        cursor.execute("""
            SELECT 
                c.comment_id,
                c.content,
                c.created_at,
                c.likes_count,
                u.id as user_id,
                u.username,
                u.full_name,
                u.profile_pic
            FROM post_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = %s AND c.is_deleted = FALSE
            ORDER BY c.created_at DESC
            LIMIT 50
        """, (post_id,))
        
        post['comments'] = cursor.fetchall()
        
        # Increment view count
        if current_user_id and current_user_id != post['user_id']:
            try:
                cursor.execute("""
                    UPDATE posts
                    SET views_count = COALESCE(views_count, 0) + 1
                    WHERE post_id = %s
                """, (post_id,))
                connection.commit()
            except Exception as e:
                print(f"⚠️ Failed to increment view count: {e}")
        
        cursor.close()
        connection.close()
        
        print(f"✅ Fetched post {post_id} with categories")

        return jsonify({
            'success': True,
            'post': post
        }), 200

    except Exception as e:
        print(f"❌ Error fetching post: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to fetch post'
        }), 500

# ===== CREATE TRANSACTION (Direct P2P) =====
@post_bp.route('/transactions/create', methods=['POST'])
def create_transaction():
    """Create a transaction record for direct P2P payment"""
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        buyer_id = verify_user_token(auth_token)

        if not buyer_id:
            return jsonify({
                'success': False,
                'message': 'Unauthorized'
            }), 401

        data = request.get_json()
        post_id = data.get('post_id')
        quantity = int(data.get('quantity', 1))
        payment_method = data.get('payment_method')
        payment_proof_url = data.get('payment_proof_url', None)
        notes = data.get('notes', '')

        if not post_id or not payment_method:
            return jsonify({
                'success': False,
                'message': 'Post ID and payment method are required'
            }), 400

        valid_methods = ['upi', 'bank_transfer', 'cod', 'phonepe', 'gpay', 'paytm_wallet']
        if payment_method not in valid_methods:
            return jsonify({
                'success': False,
                'message': 'Invalid payment method'
            }), 400

        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database error'
            }), 500

        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT user_id, price, currency, stock, product_title
            FROM posts
            WHERE post_id = %s AND post_type = 'selling' AND is_deleted = FALSE
        """, (post_id,))

        post = cursor.fetchone()

        if not post:
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'Post not found'
            }), 404

        if post['stock'] and quantity > post['stock']:
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': f'Only {post["stock"]} items available'
            }), 400

        seller_id = post['user_id']
        amount = post['price'] * quantity

        try:
            cursor.execute("""
                INSERT INTO transactions 
                (post_id, seller_id, buyer_id, amount, currency, payment_method, 
                 status, quantity, payment_proof_url, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (post_id, seller_id, buyer_id, amount, post['currency'], 
                  payment_method, 'pending', quantity, payment_proof_url, notes))

            connection.commit()
            transaction_id = cursor.lastrowid

            print(f"✅ Transaction created - ID: {transaction_id}")

            cursor.close()
            connection.close()

            return jsonify({
                'success': True,
                'message': 'Transaction created. Seller will verify payment.',
                'transaction_id': transaction_id
            }), 201

        except Exception as e:
            connection.rollback()
            cursor.close()
            connection.close()
            print(f"❌ Error creating transaction: {e}")
            return jsonify({
                'success': False,
                'message': 'Failed to create transaction'
            }), 500

    except Exception as e:
        print(f"❌ Error in transaction creation: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to process transaction'
        }), 500

# ===== VERIFY TRANSACTION =====
@post_bp.route('/transactions/<int:transaction_id>/verify', methods=['POST'])
def verify_transaction(transaction_id):
    """Seller verifies that they received payment"""
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_id = verify_user_token(auth_token)

        if not user_id:
            return jsonify({
                'success': False,
                'message': 'Unauthorized'
            }), 401

        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database error'
            }), 500

        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT seller_id, status
            FROM transactions
            WHERE transaction_id = %s
        """, (transaction_id,))

        transaction = cursor.fetchone()

        if not transaction:
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'Transaction not found'
            }), 404

        if transaction['seller_id'] != user_id:
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'Only seller can verify transaction'
            }), 403

        if transaction['status'] == 'completed':
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'Transaction already verified'
            }), 400

        cursor.execute("""
            UPDATE transactions
            SET status = 'completed',
                payment_verified = TRUE,
                verified_by = %s,
                verification_date = NOW()
            WHERE transaction_id = %s
        """, (user_id, transaction_id))

        connection.commit()
        cursor.close()
        connection.close()

        print(f"✅ Transaction {transaction_id} verified by seller")

        return jsonify({
            'success': True,
            'message': 'Payment verified successfully'
        }), 200

    except Exception as e:
        print(f"❌ Error verifying transaction: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to verify transaction'
        }), 500

# ===== DELETE POST =====
@post_bp.route('/posts/<int:post_id>', methods=['DELETE'])
def delete_post_route(post_id):
    """Delete a post (soft delete)"""
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_id = verify_user_token(auth_token)

        if not user_id:
            return jsonify({
                'success': False,
                'message': 'Unauthorized'
            }), 401

        result = delete_post(post_id, user_id)

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400

    except Exception as e:
        print(f"❌ Error deleting post: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to delete post'
        }), 500
# ===== PASTE THIS to REPLACE the delete_post_with_file function in post_routes.py =====
# Find the route: @post_bp.route('/posts/<int:post_id>/delete', methods=['DELETE'])
# Replace the entire function body below

@post_bp.route('/posts/<int:post_id>/delete', methods=['DELETE'])
def delete_post_with_file(post_id):
    """Delete a post and its associated Cloudinary media - HARD DELETE"""
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_id = verify_user_token(auth_token)
        if not user_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500

        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT user_id, media_url, post_type
            FROM posts WHERE post_id = %s AND is_deleted = FALSE
        """, (post_id,))
        post = cursor.fetchone()

        if not post:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Post not found'}), 404

        if post['user_id'] != user_id:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'You can only delete your own posts'}), 403

        # Delete related records (handle missing tables gracefully)
        for table, col in [("post_likes","post_id"), ("post_comments","post_id"),
                           ("post_shares","post_id"), ("transactions","post_id")]:
            try:
                cursor.execute(f"DELETE FROM {table} WHERE {col} = %s", (post_id,))
            except Exception as e:
                if "doesn't exist" not in str(e):
                    raise

        cursor.execute("DELETE FROM posts WHERE post_id = %s", (post_id,))
        connection.commit()
        print(f"✅ Post {post_id} PERMANENTLY deleted from database")

        # ✅ CHANGED: Delete from Cloudinary instead of local disk
        media_url = post.get('media_url')
        if media_url and 'cloudinary.com' in media_url:
            try:
                import cloudinary.uploader
                parts = media_url.split('/')
                upload_idx = parts.index('upload')
                start = upload_idx + 1
                if start < len(parts) and parts[start].startswith('v') and parts[start][1:].isdigit():
                    start += 1
                public_id_with_ext = '/'.join(parts[start:])
                public_id = public_id_with_ext.rsplit('.', 1)[0]
                # Detect resource type from URL
                resource_type = 'video' if '/video/' in media_url else 'image'
                cloudinary.uploader.destroy(public_id, resource_type=resource_type)
                print(f"✅ Cloudinary media deleted: {public_id}")
            except Exception as e:
                print(f"⚠️ Error deleting Cloudinary media: {e}")

        cursor.close(); connection.close()
        return jsonify({'success': True, 'message': 'Post and media deleted permanently'}), 200

    except Exception as e:
        print(f"❌ Error deleting post: {e}")
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to delete post'}), 500

@post_bp.route('/posts/search', methods=['GET'])
def search_posts():
    """
    Search for posts by caption, title, tags, or category
    Works for both logged-in and guest users
    Respects privacy settings (only shows public posts or follower-only posts if user follows)
    """
    try:
        query = request.args.get('query', '').strip()
        limit = int(request.args.get('limit', 20))
        
        if not query or len(query) < 2:
            return jsonify({
                "success": False,
                "message": "Query must be at least 2 characters"
            }), 400
        
        # Try to get current user (optional - for logged-in users)
        current_user_id = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                import jwt
                import os
                payload = jwt.decode(token, os.getenv('JWT_SECRET_KEY', 'your-secret-key'), algorithms=['HS256'])
                current_user_id = payload['user_id']
            except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
                pass
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        search_pattern = f"%{query}%"
        
        if current_user_id:
            # Logged-in user - show public posts + follower-only posts from people they follow
            # Also show user's own posts regardless of privacy
            cursor.execute("""
                SELECT DISTINCT
                    p.post_id,
                    p.user_id,
                    p.caption,
                    p.media_url,
                    p.media_type,
                    p.post_type,
                    p.privacy,
                    p.created_at,
                    p.likes_count,
                    p.comments_count,
                    p.product_title,
                    p.title,
                    p.price,
                    p.tags,
                    u.username,
                    u.full_name,
                    u.profile_pic,
                    c.category_name,
                    c.category_slug,
                    s.subcategory_name
                FROM posts p
                INNER JOIN users u ON p.user_id = u.id
                LEFT JOIN categories c ON p.category_id = c.category_id
                LEFT JOIN subcategories s ON p.subcategory_id = s.subcategory_id
                WHERE p.is_deleted = FALSE
                AND (
                    p.privacy = 'public'
                    OR p.user_id = %s
                    OR (
                        p.privacy = 'followers'
                        AND EXISTS (
                            SELECT 1 FROM followers f
                            WHERE f.follower_id = %s
                            AND f.following_id = p.user_id
                        )
                    )
                )
                AND (
                    p.caption LIKE %s
                    OR p.product_title LIKE %s
                    OR p.title LIKE %s
                    OR p.tags LIKE %s
                    OR c.category_name LIKE %s
                    OR s.subcategory_name LIKE %s
                )
                ORDER BY 
                    CASE 
                        WHEN p.caption LIKE %s THEN 1
                        WHEN p.product_title LIKE %s THEN 2
                        WHEN p.title LIKE %s THEN 3
                        WHEN p.tags LIKE %s THEN 4
                        ELSE 5
                    END,
                    p.created_at DESC
                LIMIT %s
            """, (
                current_user_id,
                current_user_id,
                search_pattern, search_pattern, search_pattern, search_pattern,
                search_pattern, search_pattern,
                f"{query}%", f"{query}%", f"{query}%", f"{query}%",
                limit
            ))
        else:
            # Guest user - only show public posts
            cursor.execute("""
                SELECT DISTINCT
                    p.post_id,
                    p.user_id,
                    p.caption,
                    p.media_url,
                    p.media_type,
                    p.post_type,
                    p.privacy,
                    p.created_at,
                    p.likes_count,
                    p.comments_count,
                    p.product_title,
                    p.title,
                    p.price,
                    p.tags,
                    u.username,
                    u.full_name,
                    u.profile_pic,
                    c.category_name,
                    c.category_slug,
                    s.subcategory_name
                FROM posts p
                INNER JOIN users u ON p.user_id = u.id
                LEFT JOIN categories c ON p.category_id = c.category_id
                LEFT JOIN subcategories s ON p.subcategory_id = s.subcategory_id
                WHERE p.is_deleted = FALSE
                AND p.privacy = 'public'
                AND (
                    p.caption LIKE %s
                    OR p.product_title LIKE %s
                    OR p.title LIKE %s
                    OR p.tags LIKE %s
                    OR c.category_name LIKE %s
                    OR s.subcategory_name LIKE %s
                )
                ORDER BY 
                    CASE 
                        WHEN p.caption LIKE %s THEN 1
                        WHEN p.product_title LIKE %s THEN 2
                        WHEN p.title LIKE %s THEN 3
                        WHEN p.tags LIKE %s THEN 4
                        ELSE 5
                    END,
                    p.created_at DESC
                LIMIT %s
            """, (
                search_pattern, search_pattern, search_pattern, search_pattern,
                search_pattern, search_pattern,
                f"{query}%", f"{query}%", f"{query}%", f"{query}%",
                limit
            ))
        
        posts = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            "success": True,
            "posts": posts,
            "count": len(posts)
        })
        
    except Exception as e:
        print(f"❌ Error searching posts: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": "Error searching posts"
        }), 500