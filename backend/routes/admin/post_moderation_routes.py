"""
routes/admin/post_moderation_routes.py
─────────────────────────────────────────────────────────────────────────────
Admin Post Moderation Routes — CreatorConnect
"""

from flask import Blueprint, jsonify, request
from database.db import get_db_connection
from routes.admin.admin_auth import admin_required
from datetime import datetime, timedelta

post_mod_bp = Blueprint('post_mod', __name__)


# ─── 1. GET ALL POSTS (with search + filter + pagination) ────────────────────

@post_mod_bp.route('/api/admin/posts', methods=['GET'])
@admin_required
def get_all_posts():
    search      = request.args.get('search', '').strip()
    post_type   = request.args.get('post_type', '')          # showcase | service | product
    privacy     = request.args.get('privacy', '')            # public | followers
    category_id = request.args.get('category_id', '')
    status      = request.args.get('status', '')             # active | inactive | deleted
    page        = max(int(request.args.get('page', 1)), 1)
    limit       = min(int(request.args.get('limit', 20)), 100)
    offset      = (page - 1) * limit

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    conditions = ['p.is_deleted = 0']
    params = []

    if search:
        conditions.append(
            "(p.caption LIKE %s OR p.product_title LIKE %s OR p.title LIKE %s "
            "OR u.username LIKE %s OR u.full_name LIKE %s)"
        )
        like = f'%{search}%'
        params += [like, like, like, like, like]

    if post_type in ('showcase', 'service', 'product'):
        conditions.append("p.post_type = %s")
        params.append(post_type)

    if privacy in ('public', 'followers'):
        conditions.append("p.privacy = %s")
        params.append(privacy)

    if category_id:
        conditions.append("p.category_id = %s")
        params.append(int(category_id))

    if status == 'inactive':
        conditions.append("p.is_active = 0")
    elif status == 'active':
        conditions.append("p.is_active = 1")

    where = ' AND '.join(conditions)

    cur.execute(f"""
        SELECT COUNT(*) AS cnt
        FROM posts p
        JOIN users u ON u.id = p.user_id
        WHERE {where}
    """, params)
    total = cur.fetchone()['cnt']

    cur.execute(f"""
        SELECT
            p.post_id, p.post_type, p.caption, p.media_url, p.media_type,
            p.privacy, p.is_active, p.is_deleted,
            p.title, p.product_title,
            p.price, p.currency,
            p.likes_count, p.comments_count, p.shares_count, p.views_count,
            p.created_at, p.updated_at,
            p.category_id, p.subcategory_id,
            c.category_name, c.icon AS category_icon,
            sc.subcategory_name,
            u.id AS user_id, u.username, u.full_name, u.profile_pic
        FROM posts p
        JOIN users u ON u.id = p.user_id
        LEFT JOIN categories c ON c.category_id = p.category_id
        LEFT JOIN subcategories sc ON sc.subcategory_id = p.subcategory_id
        WHERE {where}
        ORDER BY p.created_at DESC
        LIMIT %s OFFSET %s
    """, params + [limit, offset])

    rows = cur.fetchall()
    cur.close()
    conn.close()

    def serialize(p):
        return {
            'post_id':         p['post_id'],
            'post_type':       p['post_type'],
            'caption':         p['caption'],
            'media_url':       p['media_url'],
            'media_type':      p['media_type'],
            'privacy':         p['privacy'],
            'is_active':       bool(p['is_active']),
            'is_deleted':      bool(p['is_deleted']),
            'title':           p['product_title'] or p['title'] or '',
            'price':           float(p['price']) if p['price'] else None,
            'currency':        p['currency'],
            'likes_count':     p['likes_count'] or 0,
            'comments_count':  p['comments_count'] or 0,
            'shares_count':    p['shares_count'] or 0,
            'views_count':     p['views_count'] or 0,
            'created_at':      p['created_at'].isoformat() if p['created_at'] else None,
            'updated_at':      p['updated_at'].isoformat() if p['updated_at'] else None,
            'category_id':     p['category_id'],
            'category_name':   p['category_name'],
            'category_icon':   p['category_icon'],
            'subcategory_name': p['subcategory_name'],
            'user_id':         p['user_id'],
            'username':        p['username'],
            'full_name':       p['full_name'] or '',
            'profile_pic':     p['profile_pic'],
        }

    return jsonify({
        'posts': [serialize(p) for p in rows],
        'total': total,
        'page':  page,
        'limit': limit,
        'pages': (total + limit - 1) // limit,
    })


# ─── 2. GET SINGLE POST ───────────────────────────────────────────────────────

@post_mod_bp.route('/api/admin/posts/<int:post_id>', methods=['GET'])
@admin_required
def get_post(post_id):
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    cur.execute("""
        SELECT
            p.*,
            c.category_name, c.icon AS category_icon,
            sc.subcategory_name,
            u.id AS user_id, u.username, u.full_name, u.profile_pic, u.email
        FROM posts p
        JOIN users u ON u.id = p.user_id
        LEFT JOIN categories c ON c.category_id = p.category_id
        LEFT JOIN subcategories sc ON sc.subcategory_id = p.subcategory_id
        WHERE p.post_id = %s
    """, (post_id,))

    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        return jsonify({'error': 'Post not found'}), 404

    result = {}
    for k, v in row.items():
        if isinstance(v, datetime):
            result[k] = v.isoformat()
        elif hasattr(v, '__float__'):
            result[k] = float(v)
        else:
            result[k] = v

    return jsonify(result)


# ─── 3. POST STATS ────────────────────────────────────────────────────────────

@post_mod_bp.route('/api/admin/posts/stats', methods=['GET'])
@admin_required
def post_stats():
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    cur.execute("SELECT COUNT(*) AS cnt FROM posts WHERE is_deleted = 0")
    total = cur.fetchone()['cnt']

    cur.execute("SELECT COUNT(*) AS cnt FROM posts WHERE is_deleted = 0 AND post_type = 'showcase'")
    showcase = cur.fetchone()['cnt']

    cur.execute("SELECT COUNT(*) AS cnt FROM posts WHERE is_deleted = 0 AND post_type = 'service'")
    service = cur.fetchone()['cnt']

    cur.execute("SELECT COUNT(*) AS cnt FROM posts WHERE is_deleted = 0 AND post_type = 'product'")
    product = cur.fetchone()['cnt']

    cur.execute("SELECT COUNT(*) AS cnt FROM posts WHERE is_deleted = 0 AND is_active = 0")
    inactive = cur.fetchone()['cnt']

    cur.execute("SELECT COUNT(*) AS cnt FROM posts WHERE is_deleted = 0 AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")
    new_month = cur.fetchone()['cnt']

    # Posts per week for last 8 weeks
    cur.execute("""
        SELECT
            YEARWEEK(created_at, 1) AS yw,
            MIN(DATE(created_at)) AS week_start,
            COUNT(*) AS count
        FROM posts
        WHERE is_deleted = 0
          AND created_at >= DATE_SUB(NOW(), INTERVAL 8 WEEK)
        GROUP BY YEARWEEK(created_at, 1)
        ORDER BY yw ASC
    """)
    weekly = cur.fetchall()

    cur.close()
    conn.close()

    weekly_data = [
        {
            'week': row['week_start'].strftime('%b %d') if row['week_start'] else '',
            'count': row['count']
        }
        for row in weekly
    ]

    return jsonify({
        'total':     total,
        'showcase':  showcase,
        'service':   service,
        'product':   product,
        'inactive':  inactive,
        'new_month': new_month,
        'weekly':    weekly_data,
    })


# ─── 4. GET CATEGORIES (for filter dropdown) ──────────────────────────────────

@post_mod_bp.route('/api/admin/posts/categories', methods=['GET'])
@admin_required
def get_categories():
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT category_id, post_type, category_name, icon
        FROM categories
        WHERE is_active = 1
        ORDER BY post_type, display_order
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify({'categories': rows})


# ─── 5. DEACTIVATE / REACTIVATE POST ─────────────────────────────────────────

@post_mod_bp.route('/api/admin/posts/<int:post_id>/toggle-active', methods=['POST'])
@admin_required
def toggle_post_active(post_id):
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    cur.execute("SELECT post_id, is_active, post_type, user_id FROM posts WHERE post_id = %s AND is_deleted = 0", (post_id,))
    post = cur.fetchone()
    if not post:
        cur.close(); conn.close()
        return jsonify({'error': 'Post not found'}), 404

    new_state = 0 if post['is_active'] else 1
    cur.execute("UPDATE posts SET is_active = %s WHERE post_id = %s", (new_state, post_id))

    # Log action
    action = 'post_reactivated' if new_state else 'post_removed'
    try:
        cur.execute("""
            INSERT INTO admin_actions_log (admin_id, action_type, reference_type, reference_id, action_details, ip_address)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            request.admin_id,
            'post_removed',
            'post',
            post_id,
            f'Post {post_id} {"reactivated" if new_state else "deactivated"} by admin',
            request.remote_addr
        ))
    except Exception:
        pass  # Log table might not have reactivated enum value

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({
        'success':  True,
        'is_active': bool(new_state),
        'message':  f"Post {'reactivated' if new_state else 'deactivated'} successfully.",
    })


# ─── 6. DELETE POST (soft delete) ────────────────────────────────────────────

@post_mod_bp.route('/api/admin/posts/<int:post_id>/delete', methods=['DELETE'])
@admin_required
def delete_post(post_id):
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    cur.execute("SELECT post_id FROM posts WHERE post_id = %s", (post_id,))
    if not cur.fetchone():
        cur.close(); conn.close()
        return jsonify({'error': 'Post not found'}), 404

    cur.execute("UPDATE posts SET is_deleted = 1, is_active = 0 WHERE post_id = %s", (post_id,))

    try:
        cur.execute("""
            INSERT INTO admin_actions_log (admin_id, action_type, reference_type, reference_id, action_details, ip_address)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (request.admin_id, 'post_removed', 'post', post_id, f'Post {post_id} deleted by admin', request.remote_addr))
    except Exception:
        pass

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({'success': True, 'message': 'Post deleted successfully.'})
# ─── 7. GET COMMENTS FOR A POST ──────────────────────────────────────────────
# Add this route to routes/admin/post_moderation_routes.py

@post_mod_bp.route('/api/admin/posts/<int:post_id>/comments', methods=['GET'])
@admin_required
def get_post_comments(post_id):
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    cur.execute("""
        SELECT
            pc.comment_id,
            pc.content,
            pc.parent_comment_id,
            pc.likes_count,
            pc.is_deleted,
            pc.created_at,
            u.id AS user_id,
            u.username,
            u.full_name,
            u.profile_pic
        FROM post_comments pc
        JOIN users u ON u.id = pc.user_id
        WHERE pc.post_id = %s AND pc.is_deleted = 0
        ORDER BY pc.created_at ASC
    """, (post_id,))

    comments = cur.fetchall()
    cur.close()
    conn.close()

    def serialize_comment(c):
        return {
            'comment_id':       c['comment_id'],
            'content':          c['content'],
            'parent_comment_id': c['parent_comment_id'],
            'likes_count':      c['likes_count'] or 0,
            'created_at':       c['created_at'].isoformat() if c['created_at'] else None,
            'user_id':          c['user_id'],
            'username':         c['username'],
            'full_name':        c['full_name'] or '',
            'profile_pic':      c['profile_pic'],
        }

    return jsonify({
        'comments': [serialize_comment(c) for c in comments],
        'total':    len(comments),
    })