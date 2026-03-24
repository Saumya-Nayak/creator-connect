from flask import Blueprint, request, jsonify
from database.db import get_db_connection
from services.jwt_service import verify_token
from mysql.connector import Error

explore_bp = Blueprint('explore', __name__)

# ✅ Suspension filter clause — reused across all queries
SUSPENSION_FILTER = "(u.account_locked_until IS NULL OR u.account_locked_until <= NOW())"

def verify_user_token(token):
    if not token:
        return None
    result = verify_token(token)
    if result['valid']:
        return result['user_id']
    return None


# ===== GET ALL CATEGORIES WITH POST COUNTS =====
@explore_bp.route('/explore/categories', methods=['GET'])
def get_categories():
    try:
        post_type = request.args.get('post_type', 'all')

        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500

        cursor = connection.cursor(dictionary=True)

        where_clause = "WHERE c.is_active = 1"
        params = []

        if post_type != 'all' and post_type in ['showcase', 'service', 'product']:
            where_clause += " AND c.post_type = %s"
            params.append(post_type)

        # ✅ Added suspension join to exclude counts from suspended users
        query = f"""
        SELECT
            c.category_id,
            c.post_type,
            c.category_name,
            c.category_slug,
            c.icon,
            c.description,
            c.display_order,
            COALESCE(COUNT(DISTINCT p.post_id), 0) as post_count
        FROM categories c
        LEFT JOIN posts p ON c.category_id = p.category_id
            AND p.is_deleted = FALSE
            AND p.is_active = 1
            AND p.privacy = 'public'
        LEFT JOIN users u ON p.user_id = u.id
            AND {SUSPENSION_FILTER}
        {where_clause}
        GROUP BY c.category_id
        ORDER BY c.post_type, c.display_order
        """

        cursor.execute(query, params)
        categories = cursor.fetchall()

        grouped = {'showcase': [], 'service': [], 'product': []}
        for cat in categories:
            grouped[cat['post_type']].append(cat)

        cursor.close()
        connection.close()

        return jsonify({
            'success': True,
            'categories': grouped if post_type == 'all' else grouped.get(post_type, []),
            'total': len(categories)
        }), 200

    except Exception as e:
        print(f"❌ Error fetching categories: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to fetch categories'}), 500


# ===== GET SUBCATEGORIES FOR A CATEGORY =====
@explore_bp.route('/explore/categories/<int:category_id>/subcategories', methods=['GET'])
def get_subcategories(category_id):
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500

        cursor = connection.cursor(dictionary=True)

        # ✅ Also exclude counts from suspended users here
        query = f"""
        SELECT
            s.subcategory_id,
            s.category_id,
            s.subcategory_name,
            s.subcategory_slug,
            s.description,
            s.display_order,
            COALESCE(COUNT(DISTINCT p.post_id), 0) as post_count
        FROM subcategories s
        LEFT JOIN posts p ON s.subcategory_id = p.subcategory_id
            AND p.is_deleted = FALSE
            AND p.is_active = 1
            AND p.privacy = 'public'
        LEFT JOIN users u ON p.user_id = u.id
            AND {SUSPENSION_FILTER}
        WHERE s.category_id = %s AND s.is_active = 1
        GROUP BY s.subcategory_id
        ORDER BY s.display_order
        """

        cursor.execute(query, (category_id,))
        subcategories = cursor.fetchall()

        cursor.close()
        connection.close()

        return jsonify({
            'success': True,
            'subcategories': subcategories,
            'count': len(subcategories)
        }), 200

    except Exception as e:
        print(f"❌ Error fetching subcategories: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to fetch subcategories'}), 500


# ===== EXPLORE POSTS WITH ADVANCED FILTERING =====
@explore_bp.route('/explore/posts', methods=['GET'])
def explore_posts():
    try:
        post_type     = request.args.get('post_type', 'all')
        category_id   = request.args.get('category_id')
        subcategory_id = request.args.get('subcategory_id')
        sort_by       = request.args.get('sort', 'latest')
        limit         = int(request.args.get('limit', 12))
        offset        = int(request.args.get('offset', 0))

        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header else None
        current_user_id = verify_user_token(token)

        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500

        cursor = connection.cursor(dictionary=True)

        # ✅ Suspension filter added to WHERE conditions
        where_conditions = [
            "p.is_deleted = FALSE",
            "p.is_active = 1",
            SUSPENSION_FILTER   # excludes posts from suspended users
        ]
        params = []

        if current_user_id:
            where_conditions.append("""
                (p.privacy = 'public'
                OR p.user_id = %s
                OR (p.privacy = 'followers' AND EXISTS (
                    SELECT 1 FROM followers f
                    WHERE f.follower_id = %s AND f.following_id = p.user_id
                )))
            """)
            params.extend([current_user_id, current_user_id])
        else:
            where_conditions.append("p.privacy = 'public'")

        if post_type != 'all' and post_type in ['showcase', 'service', 'product']:
            where_conditions.append("p.post_type = %s")
            params.append(post_type)

        if category_id:
            where_conditions.append("p.category_id = %s")
            params.append(int(category_id))

        if subcategory_id:
            where_conditions.append("p.subcategory_id = %s")
            params.append(int(subcategory_id))

        where_clause = " AND ".join(where_conditions)

        if sort_by == 'popular':
            order_clause = "p.likes_count DESC, p.created_at DESC"
        elif sort_by == 'trending':
            order_clause = "(p.likes_count + p.comments_count * 2 + p.shares_count * 3) DESC, p.created_at DESC"
        else:
            order_clause = "p.created_at DESC"

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
            p.stock,
            p.short_description,
            p.service_duration,
            p.contact_phone,
            c.category_name,
            c.category_slug,
            c.icon as category_icon,
            s.subcategory_name,
            s.subcategory_slug,
            u.username,
            u.full_name,
            u.profile_pic,
            COALESCE(p.likes_count, 0) as likes_count,
            COALESCE(p.comments_count, 0) as comments_count,
            COALESCE(p.shares_count, 0) as shares_count,
            COALESCE(p.views_count, 0) as views_count
        FROM posts p
        INNER JOIN users u ON p.user_id = u.id
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN subcategories s ON p.subcategory_id = s.subcategory_id
        WHERE {where_clause}
        ORDER BY {order_clause}
        LIMIT %s OFFSET %s
        """

        params.extend([limit, offset])
        cursor.execute(query, params)
        posts = cursor.fetchall()

        if current_user_id and posts:
            post_ids = [post['post_id'] for post in posts]
            placeholders = ','.join(['%s'] * len(post_ids))
            cursor.execute(f"""
                SELECT post_id FROM post_likes
                WHERE user_id = %s AND post_id IN ({placeholders})
            """, [current_user_id] + post_ids)
            liked_posts = {row['post_id'] for row in cursor.fetchall()}
            for post in posts:
                post['user_liked'] = post['post_id'] in liked_posts
        else:
            for post in posts:
                post['user_liked'] = False

        # Count query (same filters, no LIMIT/OFFSET)
        count_params = params[:-2]
        count_query = f"""
        SELECT COUNT(DISTINCT p.post_id) as total
        FROM posts p
        INNER JOIN users u ON p.user_id = u.id
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN subcategories s ON p.subcategory_id = s.subcategory_id
        WHERE {where_clause}
        """
        cursor.execute(count_query, count_params)
        total_result = cursor.fetchone()
        total_posts = total_result['total'] if total_result else 0

        cursor.close()
        connection.close()

        has_more = (offset + len(posts)) < total_posts

        return jsonify({
            'success': True,
            'posts': posts,
            'count': len(posts),
            'total': total_posts,
            'has_more': has_more,
            'filters': {
                'post_type': post_type,
                'category_id': category_id,
                'subcategory_id': subcategory_id,
                'sort': sort_by
            }
        }), 200

    except Exception as e:
        print(f"❌ Error exploring posts: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to fetch posts'}), 500


# ===== EXPLORE CREATORS =====
@explore_bp.route('/explore/creators', methods=['GET'])
def explore_creators():
    try:
        sort_by      = request.args.get('sort', 'followers')
        search_query = request.args.get('search', '').strip()
        limit        = int(request.args.get('limit', 12))
        offset       = int(request.args.get('offset', 0))

        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '') if auth_header else None
        current_user_id = verify_user_token(token)

        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500

        cursor = connection.cursor(dictionary=True)

        # ✅ Suspension filter: suspended creators are hidden from explore
        where_conditions = [
            "u.otp_verified = 1",
            SUSPENSION_FILTER
        ]
        params = []

        if search_query:
            where_conditions.append(
                "(LOWER(u.username) LIKE LOWER(%s) OR LOWER(u.full_name) LIKE LOWER(%s))"
            )
            search_param = f"%{search_query}%"
            params.extend([search_param, search_param])

        if sort_by == 'my_followers':
            if not current_user_id:
                return jsonify({'success': False, 'message': 'Login required to view your followers'}), 401
            where_conditions.append("""
                u.id IN (SELECT follower_id FROM followers WHERE following_id = %s)
            """)
            params.append(current_user_id)

        where_clause = " AND ".join(where_conditions)

        if sort_by in ('followers', 'my_followers'):
            order_clause = "followers_count DESC, u.created_at DESC"
        elif sort_by == 'active':
            order_clause = "posts_count DESC, u.created_at DESC"
        else:
            order_clause = "u.created_at DESC"

        query = f"""
        SELECT
            u.id,
            u.username,
            u.full_name,
            u.profile_pic,
            u.about_me,
            u.is_private,
            u.created_at,
            (SELECT COUNT(*) FROM followers WHERE following_id = u.id) as followers_count,
            (SELECT COUNT(*) FROM followers WHERE follower_id = u.id) as following_count,
            (SELECT COUNT(*) FROM posts WHERE user_id = u.id AND is_deleted = FALSE AND is_active = 1) as posts_count
        FROM users u
        WHERE {where_clause}
        ORDER BY {order_clause}
        LIMIT %s OFFSET %s
        """

        params.extend([limit, offset])
        cursor.execute(query, params)
        creators = cursor.fetchall()

        if current_user_id and creators:
            user_ids = [c['id'] for c in creators]
            placeholders = ','.join(['%s'] * len(user_ids))

            cursor.execute(f"""
                SELECT following_id FROM followers
                WHERE follower_id = %s AND following_id IN ({placeholders})
            """, [current_user_id] + user_ids)
            following_ids = {row['following_id'] for row in cursor.fetchall()}

            try:
                cursor.execute(f"""
                    SELECT following_id FROM follow_requests
                    WHERE follower_id = %s AND following_id IN ({placeholders}) AND status = 'pending'
                """, [current_user_id] + user_ids)
                pending_ids = {row['following_id'] for row in cursor.fetchall()}
            except Exception:
                pending_ids = set()

            for creator in creators:
                creator['is_following'] = creator['id'] in following_ids
                creator['is_pending']   = creator['id'] in pending_ids
                creator['is_self']      = creator['id'] == current_user_id
        else:
            for creator in creators:
                creator['is_following'] = False
                creator['is_pending']   = False
                creator['is_self']      = False

        count_query = f"""
        SELECT COUNT(*) as total FROM users u WHERE {where_clause}
        """
        cursor.execute(count_query, params[:-2])
        total_result = cursor.fetchone()
        total_creators = total_result['total'] if total_result else 0

        cursor.close()
        connection.close()

        has_more = (offset + len(creators)) < total_creators

        return jsonify({
            'success': True,
            'creators': creators,
            'count': len(creators),
            'total': total_creators,
            'has_more': has_more,
            'filters': {'sort': sort_by, 'search': search_query}
        }), 200

    except Exception as e:
        print(f"❌ Error exploring creators: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to fetch creators'}), 500


# ===== EXPLORE STATS =====
@explore_bp.route('/explore/stats', methods=['GET'])
def get_explore_stats():
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500

        cursor = connection.cursor(dictionary=True)

        # ✅ Stats also exclude suspended users
        cursor.execute(f"""
        SELECT
            COUNT(DISTINCT CASE WHEN p.post_type = 'showcase' THEN p.post_id END) as showcase_count,
            COUNT(DISTINCT CASE WHEN p.post_type = 'service'  THEN p.post_id END) as service_count,
            COUNT(DISTINCT CASE WHEN p.post_type = 'product'  THEN p.post_id END) as product_count,
            COUNT(DISTINCT p.category_id) as categories_count,
            COUNT(DISTINCT p.user_id) as creators_count
        FROM posts p
        INNER JOIN users u ON p.user_id = u.id
        WHERE p.is_deleted = FALSE
          AND p.is_active = 1
          AND p.privacy = 'public'
          AND {SUSPENSION_FILTER}
        """)

        stats = cursor.fetchone()
        cursor.close()
        connection.close()

        return jsonify({'success': True, 'stats': stats}), 200

    except Exception as e:
        print(f"❌ Error fetching stats: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch stats'}), 500