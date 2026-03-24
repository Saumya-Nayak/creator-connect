from flask import Blueprint, request, jsonify
from database.db import get_db_connection
from services.jwt_service import verify_token

saved_bp = Blueprint('saved', __name__)

# ✅ Suspension filter — same pattern used across all routes
SUSPENSION_FILTER = "(u.account_locked_until IS NULL OR u.account_locked_until <= NOW())"

def verify_user_token(token):
    if not token:
        return None
    result = verify_token(token)
    if result['valid']:
        return result['user_id']
    return None


# ===== SAVE/UNSAVE POST =====
@saved_bp.route('/posts/<int:post_id>/save', methods=['POST'])
def toggle_save_post(post_id):
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_id = verify_user_token(auth_token)

        if not user_id:
            return jsonify({'success': False, 'message': 'Unauthorized. Please login first.'}), 401

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT post_id FROM posts WHERE post_id = %s AND is_deleted = FALSE", (post_id,))
        if not cursor.fetchone():
            cursor.close()
            connection.close()
            return jsonify({'success': False, 'message': 'Post not found'}), 404

        cursor.execute("""
            SELECT id FROM saved_posts WHERE user_id = %s AND post_id = %s
        """, (user_id, post_id))
        existing_save = cursor.fetchone()

        if existing_save:
            cursor.execute("DELETE FROM saved_posts WHERE user_id = %s AND post_id = %s", (user_id, post_id))
            connection.commit()
            cursor.close()
            connection.close()
            return jsonify({'success': True, 'saved': False, 'message': 'Post removed from saved'}), 200
        else:
            cursor.execute("INSERT INTO saved_posts (user_id, post_id) VALUES (%s, %s)", (user_id, post_id))
            connection.commit()
            cursor.close()
            connection.close()
            return jsonify({'success': True, 'saved': True, 'message': 'Post saved successfully'}), 200

    except Exception as e:
        print(f"❌ Error toggling save: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to save/unsave post'}), 500


# ===== GET SAVED POSTS =====
@saved_bp.route('/saved-posts', methods=['GET'])
def get_saved_posts():
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_id = verify_user_token(auth_token)

        if not user_id:
            return jsonify({
                'success': False,
                'message': 'Unauthorized. Please login first.',
                'posts': []
            }), 401

        limit  = int(request.args.get('limit', 20))
        offset = int(request.args.get('offset', 0))

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # ✅ Added suspension filter — posts from suspended users are excluded
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
            p.title,
            p.product_title,
            p.price,
            p.currency,
            p.short_description,
            p.likes_count,
            p.comments_count,
            p.shares_count,
            u.username,
            u.full_name,
            u.profile_pic,
            c.category_name,
            s.subcategory_name,
            sp.saved_at,
            EXISTS(
                SELECT 1 FROM post_likes
                WHERE post_id = p.post_id AND user_id = %s
            ) as user_liked
        FROM saved_posts sp
        INNER JOIN posts p ON sp.post_id = p.post_id
        INNER JOIN users u ON p.user_id = u.id
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN subcategories s ON p.subcategory_id = s.subcategory_id
        WHERE sp.user_id = %s
          AND p.is_deleted = FALSE
          AND {SUSPENSION_FILTER}
        ORDER BY sp.saved_at DESC
        LIMIT %s OFFSET %s
        """

        cursor.execute(query, (user_id, user_id, limit, offset))
        posts = cursor.fetchall()

        # ✅ Count also excludes suspended users' posts
        cursor.execute(f"""
            SELECT COUNT(*) as total
            FROM saved_posts sp
            INNER JOIN posts p ON sp.post_id = p.post_id
            INNER JOIN users u ON p.user_id = u.id
            WHERE sp.user_id = %s
              AND p.is_deleted = FALSE
              AND {SUSPENSION_FILTER}
        """, (user_id,))

        total = cursor.fetchone()['total']

        cursor.close()
        connection.close()

        return jsonify({
            'success': True,
            'posts': posts,
            'count': len(posts),
            'total': total,
            'has_more': (offset + len(posts)) < total
        }), 200

    except Exception as e:
        print(f"❌ Error fetching saved posts: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to fetch saved posts',
            'posts': []
        }), 500


# ===== CHECK IF POST IS SAVED =====
@saved_bp.route('/posts/<int:post_id>/is-saved', methods=['GET'])
def check_post_saved(post_id):
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_id = verify_user_token(auth_token)

        if not user_id:
            return jsonify({'success': False, 'saved': False}), 200

        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("""
            SELECT id FROM saved_posts WHERE user_id = %s AND post_id = %s
        """, (user_id, post_id))
        is_saved = cursor.fetchone() is not None

        cursor.close()
        connection.close()

        return jsonify({'success': True, 'saved': is_saved}), 200

    except Exception as e:
        print(f"❌ Error checking saved status: {e}")
        return jsonify({'success': False, 'saved': False}), 500