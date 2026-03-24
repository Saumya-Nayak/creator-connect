"""
routes/admin/dashboard_routes.py
─────────────────────────────────────────────────────────────────────────────
Admin Dashboard API Routes — CreatorConnect
"""

from flask import Blueprint, jsonify
from database.db import get_db_connection
from routes.admin.admin_auth import admin_required

dashboard_bp = Blueprint('dashboard', __name__)


# ─── 1. STATS ────────────────────────────────────────────────────────────────

@dashboard_bp.route('/api/admin/dashboard/stats', methods=['GET'])
@admin_required
def dashboard_stats():
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)

    cur.execute("SELECT COUNT(*) AS cnt FROM users")
    total_users = cur.fetchone()['cnt']

    cur.execute("SELECT COUNT(*) AS cnt FROM posts WHERE is_deleted = 0 AND is_active = 1")
    total_posts = cur.fetchone()['cnt']

    cur.execute("SELECT COUNT(*) AS cnt FROM product_orders")
    total_orders = cur.fetchone()['cnt']

    cur.execute("SELECT COUNT(*) AS cnt FROM product_orders WHERE status = 'pending'")
    pending_orders = cur.fetchone()['cnt']

    cur.execute("SELECT COUNT(*) AS cnt FROM service_bookings")
    total_bookings = cur.fetchone()['cnt']

    cur.execute("SELECT COUNT(*) AS cnt FROM service_bookings WHERE status = 'pending'")
    pending_bookings = cur.fetchone()['cnt']

    cur.execute("SELECT COALESCE(SUM(commission_amt), 0) AS rev FROM commission_ledger")
    platform_revenue = float(cur.fetchone()['rev'])

    cur.execute("SELECT COUNT(*) AS cnt FROM support_tickets WHERE status = 'open'")
    open_tickets = cur.fetchone()['cnt']

    cur.close()
    conn.close()

    return jsonify({
        'total_users':      total_users,
        'total_posts':      total_posts,
        'total_orders':     total_orders,
        'pending_orders':   pending_orders,
        'total_bookings':   total_bookings,
        'pending_bookings': pending_bookings,
        'platform_revenue': platform_revenue,
        'open_tickets':     open_tickets,
    })


# ─── 2. REVENUE (line chart) ─────────────────────────────────────────────────
# ─── 2. REVENUE (weekly line chart) ──────────────────────────────────────────

@dashboard_bp.route('/api/admin/dashboard/revenue', methods=['GET'])
@admin_required
def dashboard_revenue():
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)

    cur.execute("""
        SELECT
            DATE_FORMAT(created_at, '%b %d')   AS week_label,
            DATE_FORMAT(created_at, '%Y-%u')   AS week_key,
            COALESCE(SUM(commission_amt), 0)   AS total
        FROM commission_ledger
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 8 WEEK)
        GROUP BY week_key, week_label
        ORDER BY week_key ASC
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    from datetime import date, timedelta
    today = date.today()

    # Build last 8 weeks dict keyed by %Y-%u (year-weeknum)
    weeks = {}
    for i in range(7, -1, -1):
        d = today - timedelta(weeks=i)
        # Use same format MySQL will use
        year_week = d.strftime('%Y-%U')   # %U = week starting Sunday
        # Label: show the Monday of that week
        monday = d - timedelta(days=d.weekday())
        label = monday.strftime('%b %d')
        weeks[year_week] = {'label': label, 'value': 0.0}

    for row in rows:
        key = row['week_key']
        if key in weeks:
            weeks[key]['value'] = float(row['total'])

    ordered = sorted(weeks.items())
    return jsonify({
        'labels': [v['label'] for _, v in ordered],
        'values': [v['value'] for _, v in ordered],
    })

# ─── 3. POST TYPES (donut chart) ─────────────────────────────────────────────

@dashboard_bp.route('/api/admin/dashboard/post-types', methods=['GET'])
@admin_required
def dashboard_post_types():
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)  # ← FIXED

    cur.execute("""
        SELECT post_type, COUNT(*) AS cnt
        FROM posts
        WHERE is_deleted = 0 AND is_active = 1
        GROUP BY post_type
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    result = {'showcase': 0, 'service': 0, 'product': 0}
    for row in rows:
        t = row['post_type']
        if t in result:
            result[t] = row['cnt']

    return jsonify(result)


# ─── 4. ORDER STATUS (donut chart) ───────────────────────────────────────────

@dashboard_bp.route('/api/admin/dashboard/order-status', methods=['GET'])
@admin_required
def dashboard_order_status():
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)  # ← FIXED

    cur.execute("""
        SELECT status, COUNT(*) AS cnt
        FROM product_orders
        GROUP BY status
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    keys = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery',
            'delivered', 'cancelled', 'return_requested', 'returned', 'refunded']
    result = {k: 0 for k in keys}
    for row in rows:
        s = row['status']
        if s in result:
            result[s] = row['cnt']

    return jsonify(result)


# ─── 5. USERS MONTHLY (bar chart) ────────────────────────────────────────────
# ─── 5. USERS MONTHLY (bar chart) ────────────────────────────────────────────

@dashboard_bp.route('/api/admin/dashboard/users-monthly', methods=['GET'])
@admin_required
def dashboard_users_monthly():
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)

    cur.execute("""
        SELECT
            DATE_FORMAT(MIN(created_at), '%b %d') AS week_label,
            YEARWEEK(created_at, 0)               AS week_key,
            COALESCE(SUM(commission_amt), 0)      AS total
        FROM commission_ledger
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 8 WEEK)
        GROUP BY week_key
        ORDER BY week_key ASC
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    from datetime import date, timedelta
    today = date.today()
    weeks = {}
    for i in range(7, -1, -1):
        d = today - timedelta(weeks=i)
        # YEARWEEK(date, 0) = same as MySQL YEARWEEK with mode 0
        # Calculate it manually: Sunday-based week
        sunday = d - timedelta(days=(d.weekday() + 1) % 7)
        year = sunday.isocalendar()[0]
        week_num = int(sunday.strftime('%U'))
        key = year * 100 + week_num        # matches YEARWEEK(date,0)
        label = sunday.strftime('%b %d')
        weeks[key] = {'label': label, 'value': 0.0}

    for row in rows:
        key = int(row['week_key'])
        if key in weeks:
            weeks[key]['value'] = float(row['total'])

    ordered = sorted(weeks.items())
    return jsonify({
        'labels': [v['label'] for _, v in ordered],
        'values': [v['value'] for _, v in ordered],
    })

# ─── 6. SELLER BALANCES (horizontal bar chart) ───────────────────────────────

@dashboard_bp.route('/api/admin/dashboard/seller-balances', methods=['GET'])
@admin_required
def dashboard_seller_balances():
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)  # ← FIXED

    cur.execute("""
        SELECT u.username, sb.available_balance
        FROM seller_balance sb
        JOIN users u ON u.id = sb.user_id
        ORDER BY sb.available_balance DESC
        LIMIT 5
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return jsonify({
        'labels': [row['username'] for row in rows],
        'values': [float(row['available_balance']) for row in rows],
    })


# ─── 7. RECENT ORDERS (table) ────────────────────────────────────────────────

@dashboard_bp.route('/api/admin/dashboard/recent-orders', methods=['GET'])
@admin_required
def dashboard_recent_orders():
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)  # ← FIXED

    cur.execute("""
        SELECT
            po.order_id,
            COALESCE(u.full_name, u.username) AS buyer,
            po.product_name,
            po.total_amount,
            po.payment_method,
            po.status
        FROM product_orders po
        JOIN users u ON u.id = po.buyer_id
        ORDER BY po.created_at DESC
        LIMIT 8
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return jsonify([{
        'order_id':       r['order_id'],
        'buyer':          r['buyer'],
        'product_name':   r['product_name'],
        'total_amount':   float(r['total_amount']),
        'payment_method': r['payment_method'],
        'status':         r['status'],
    } for r in rows])


# ─── 8. ACTIVITY FEED ────────────────────────────────────────────────────────

@dashboard_bp.route('/api/admin/dashboard/activity', methods=['GET'])
@admin_required
def dashboard_activity():
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)  # ← FIXED

    cur.execute("""
        SELECT
            al.action_type,
            al.action_details,
            al.created_at,
            COALESCE(u.full_name, u.username) AS admin_name
        FROM admin_activity_log al
        JOIN users u ON u.id = al.admin_id
        ORDER BY al.created_at DESC
        LIMIT 8
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    from datetime import datetime

    def time_ago(dt):
        if not dt:
            return '—'
        diff = datetime.now() - dt
        secs = int(diff.total_seconds())
        if secs < 60:   return 'just now'
        if secs < 3600: return f'{secs // 60}m ago'
        if secs < 86400: return f'{secs // 3600}h ago'
        return f'{secs // 86400}d ago'

    type_map = {
        'login':                   'login',
        'withdrawal_approved':     'payout',
        'withdrawal_rejected':     'payout',
        'payment_verified':        'payout',
        'seller_payment_verified': 'payout',
        'transaction_refunded':    'order',
        'user_suspended':          'login',
        'post_removed':            'post',
        'order':                   'order',
        'ticket':                  'ticket',
    }

    result = []
    for r in rows:
        action  = r['action_type']
        details = r['action_details'] or action.replace('_', ' ').title()
        result.append({
            'type': type_map.get(action, 'login'),
            'text': details,
            'time': time_ago(r['created_at']),
        })

    return jsonify(result)


# ─── 9. SIDEBAR BADGES ───────────────────────────────────────────────────────

@dashboard_bp.route('/api/admin/stats/badges', methods=['GET'])
@admin_required
def stats_badges():
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)  # ← FIXED

    cur.execute("SELECT COUNT(*) AS cnt FROM users")
    users = cur.fetchone()['cnt']

    cur.execute("SELECT COUNT(*) AS cnt FROM product_orders WHERE status = 'pending'")
    orders = cur.fetchone()['cnt']

    cur.execute("SELECT COUNT(*) AS cnt FROM service_bookings WHERE status = 'pending'")
    bookings = cur.fetchone()['cnt']

    cur.execute("SELECT COUNT(*) AS cnt FROM withdrawal_requests WHERE status = 'pending'")
    withdrawals = cur.fetchone()['cnt']

    cur.execute("SELECT COUNT(*) AS cnt FROM support_tickets WHERE status = 'open'")
    tickets = cur.fetchone()['cnt']

    cur.execute("SELECT COUNT(*) AS cnt FROM help_articles")
    articles = cur.fetchone()['cnt']

    cur.execute("SELECT COUNT(*) AS cnt FROM categories")
    categories = cur.fetchone()['cnt']

    cur.close()
    conn.close()

    return jsonify({
        'users':       users,
        'orders':      orders,
        'bookings':    bookings,
        'withdrawals': withdrawals,
        'tickets':     tickets,
        'articles':    articles,
        'categories':  categories,
    })