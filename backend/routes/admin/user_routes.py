"""
routes/admin/user_routes.py
─────────────────────────────────────────────────────────────────────────────
Admin User Management Routes — CreatorConnect
"""

from flask import Blueprint, jsonify, request
from database.db import get_db_connection
from routes.admin.admin_auth import admin_required
from datetime import datetime, timedelta

user_mgmt_bp = Blueprint('user_mgmt', __name__)


# ─── 1. GET ALL USERS (with search + filter) ─────────────────────────────────

@user_mgmt_bp.route('/api/admin/users', methods=['GET'])
@admin_required
def get_all_users():
    search  = request.args.get('search', '').strip()
    role    = request.args.get('role', '')
    status  = request.args.get('status', '')
    page    = max(int(request.args.get('page', 1)), 1)
    limit   = min(int(request.args.get('limit', 20)), 100)
    offset  = (page - 1) * limit

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    conditions = ['1=1']
    params = []

    if search:
        conditions.append(
            "(u.username LIKE %s OR u.full_name LIKE %s OR u.email LIKE %s)"
        )
        like = f'%{search}%'
        params += [like, like, like]

    if role in ('0', '1'):
        conditions.append("u.role = %s")
        params.append(int(role))

    if status == 'locked':
        conditions.append(
            "(u.account_locked_until IS NOT NULL AND u.account_locked_until > NOW())"
        )
    elif status == 'active':
        conditions.append(
            "(u.account_locked_until IS NULL OR u.account_locked_until <= NOW())"
        )

    where = ' AND '.join(conditions)

    cur.execute(f"SELECT COUNT(*) AS cnt FROM users u WHERE {where}", params)
    total = cur.fetchone()['cnt']

    cur.execute(f"""
        SELECT
            u.id, u.username, u.full_name, u.email, u.role, r.role_name,
            u.profile_pic, u.phone, u.country, u.city, u.gender, u.about_me,
            u.is_private, u.otp_verified, u.login_attempts, u.account_locked_until,
            u.last_login, u.created_at, u.website_url,
            (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id AND p.is_deleted = 0) AS post_count,
            (SELECT COUNT(*) FROM followers f WHERE f.following_id = u.id) AS followers_count,
            (SELECT COUNT(*) FROM product_orders po WHERE po.buyer_id = u.id) AS order_count
        FROM users u
        JOIN roles r ON r.role_id = u.role
        WHERE {where}
        ORDER BY u.created_at DESC
        LIMIT %s OFFSET %s
    """, params + [limit, offset])

    rows = cur.fetchall()
    cur.close()
    conn.close()

    now = datetime.now()

    def serialize(u):
        locked_until = u['account_locked_until']
        is_locked = bool(locked_until and locked_until > now)
        return {
            'id':                  u['id'],
            'username':            u['username'],
            'full_name':           u['full_name'] or '',
            'email':               u['email'],
            'role':                u['role'],
            'role_name':           u['role_name'],
            'profile_pic':         u['profile_pic'],
            'phone':               u['phone'],
            'country':             u['country'],
            'city':                u['city'],
            'gender':              u['gender'],
            'about_me':            u['about_me'],
            'is_private':          bool(u['is_private']),
            'otp_verified':        bool(u['otp_verified']),
            'login_attempts':      u['login_attempts'],
            'account_locked_until': locked_until.isoformat() if locked_until else None,
            'is_locked':           is_locked,
            'last_login':          u['last_login'].isoformat() if u['last_login'] else None,
            'created_at':          u['created_at'].isoformat() if u['created_at'] else None,
            'website_url':         u['website_url'],
            'post_count':          u['post_count'],
            'followers_count':     u['followers_count'],
            'order_count':         u['order_count'],
        }

    return jsonify({
        'users': [serialize(u) for u in rows],
        'total': total,
        'page':  page,
        'limit': limit,
        'pages': (total + limit - 1) // limit,
    })


# ─── 2. GET SINGLE USER ───────────────────────────────────────────────────────

@user_mgmt_bp.route('/api/admin/users/<int:user_id>', methods=['GET'])
@admin_required
def get_user(user_id):
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    cur.execute("""
        SELECT u.*, r.role_name,
            (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id AND p.is_deleted = 0) AS post_count,
            (SELECT COUNT(*) FROM followers f WHERE f.following_id = u.id) AS followers_count,
            (SELECT COUNT(*) FROM followers f WHERE f.follower_id = u.id) AS following_count,
            (SELECT COUNT(*) FROM product_orders po WHERE po.buyer_id = u.id) AS order_count,
            (SELECT COUNT(*) FROM service_bookings sb WHERE sb.customer_id = u.id) AS booking_count
        FROM users u
        JOIN roles r ON r.role_id = u.role
        WHERE u.id = %s
    """, (user_id,))

    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        return jsonify({'error': 'User not found'}), 404

    now = datetime.now()
    locked_until = row['account_locked_until']
    is_locked = bool(locked_until and locked_until > now)
    row.pop('password', None)
    result = {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in row.items()}
    result['is_locked'] = is_locked
    return jsonify(result)


# ─── 3. USER STATS ────────────────────────────────────────────────────────────

@user_mgmt_bp.route('/api/admin/users/stats', methods=['GET'])
@admin_required
def user_stats():
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    cur.execute("SELECT COUNT(*) AS cnt FROM users")
    total = cur.fetchone()['cnt']
    cur.execute("SELECT COUNT(*) AS cnt FROM users WHERE role = 1")
    admins = cur.fetchone()['cnt']
    cur.execute("SELECT COUNT(*) AS cnt FROM users WHERE role = 0")
    creators = cur.fetchone()['cnt']
    cur.execute("SELECT COUNT(*) AS cnt FROM users WHERE account_locked_until IS NOT NULL AND account_locked_until > NOW()")
    locked = cur.fetchone()['cnt']
    cur.execute("SELECT COUNT(*) AS cnt FROM users WHERE last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY)")
    active_week = cur.fetchone()['cnt']
    cur.execute("SELECT COUNT(*) AS cnt FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")
    new_month = cur.fetchone()['cnt']

    cur.close()
    conn.close()

    return jsonify({
        'total':       total,
        'admins':      admins,
        'creators':    creators,
        'locked':      locked,
        'active_week': active_week,
        'new_month':   new_month,
    })


# ─── 4. SUSPEND USER ─────────────────────────────────────────────────────────

@user_mgmt_bp.route('/api/admin/users/<int:user_id>/suspend', methods=['POST'])
@admin_required
def suspend_user(user_id):
    data   = request.get_json() or {}
    hours  = int(data.get('hours', 24))
    reason = data.get('reason', 'Admin action')
    hours  = min(hours, 365 * 24)
    until  = datetime.now() + timedelta(hours=hours)
    # ✅ Extract admin ID from JWT
    import jwt, os
    admin_id = None
    try:
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
            secret = os.environ.get('JWT_SECRET_KEY', 'your-secret-key')
            payload = jwt.decode(token, secret, algorithms=['HS256'])
            admin_id = payload.get('user_id') or payload.get('id')
    except Exception:
        pass
    log_admin_id = admin_id or 9  # fallback

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    cur.execute("SELECT role, username, email FROM users WHERE id = %s", (user_id,))
    user = cur.fetchone()
    if not user:
        cur.close(); conn.close()
        return jsonify({'error': 'User not found'}), 404
    if user['role'] == 1:
        cur.close(); conn.close()
        return jsonify({'error': 'Cannot suspend an admin account'}), 403

    cur.execute(
        "UPDATE users SET account_locked_until = %s, login_attempts = 0 WHERE id = %s",
        (until, user_id)
    )

    # ✅ Log to admin_actions_log
    lock_str = until.strftime('%b %d, %Y at %I:%M %p')
    cur.execute("""
        INSERT INTO admin_actions_log
            (admin_id, action_type, reference_type, reference_id, action_details, ip_address)
        VALUES (%s, 'user_suspended', 'user', %s, %s, %s)
    """, (
        log_admin_id, user_id,
        f"User @{user['username']} suspended for {hours}h until {lock_str}. Reason: {reason}",
        request.remote_addr
    ))

    conn.commit()
    cur.close()
    conn.close()

    # ✅ Send suspension email to user
    try:
        from services.email_service import send_account_suspension_email
        lock_str = until.strftime('%b %d, %Y at %I:%M %p')
        send_account_suspension_email(user['email'], user['username'], lock_str, reason)
    except Exception as e:
        print(f"⚠️ Failed to send suspension email: {e}")

    return jsonify({
        'success': True,
        'message': f"User @{user['username']} suspended until {until.strftime('%b %d, %Y %H:%M')}",
        'locked_until': until.isoformat(),
    })


# ─── 5. UNLOCK USER ───────────────────────────────────────────────────────────

@user_mgmt_bp.route('/api/admin/users/<int:user_id>/unlock', methods=['POST'])
@admin_required
def unlock_user(user_id):
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    cur.execute("SELECT username, email FROM users WHERE id = %s", (user_id,))
    user = cur.fetchone()
    if not user:
        cur.close(); conn.close()
        return jsonify({'error': 'User not found'}), 404

    cur.execute(
        "UPDATE users SET account_locked_until = NULL, login_attempts = 0 WHERE id = %s",
        (user_id,)
    )
    conn.commit()
    cur.close()
    conn.close()

    # ✅ Send unlock email to user
    try:
        from services.email_service import send_account_unlock_email
        send_account_unlock_email(user['email'], user['username'])
    except Exception as e:
        print(f"⚠️ Failed to send unlock email: {e}")

    return jsonify({
        'success': True,
        'message': f"User @{user['username']} has been unlocked successfully.",
    })