"""
routes/admin/orders_routes.py
─────────────────────────────────────────────────────────────────────────────
Admin Product Orders Routes — CreatorConnect
Register in app.py:
    from routes.admin.orders_routes import orders_bp
    app.register_blueprint(orders_bp)
"""

from flask import Blueprint, jsonify, request
from database.db import get_db_connection
from routes.admin.admin_auth import admin_required
from datetime import datetime

orders_bp = Blueprint('admin_orders', __name__)

# ══════════════════════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════════════════════

VALID_STATUSES = (
    'pending', 'confirmed', 'processing', 'shipped',
    'out_for_delivery', 'delivered', 'cancelled',
    'return_requested', 'returned', 'refunded'
)

# ★ Valid payment_status values the frontend can filter by
VALID_PAYMENT_STATUSES = (
    'pending', 'verification_pending', 'completed',
    'rejected', 'failed', 'cod_pending'
)

def _serialize(o):
    """Convert a row-dict to JSON-safe dict."""
    result = {}
    for k, v in o.items():
        if isinstance(v, datetime):
            result[k] = v.isoformat()
        elif hasattr(v, 'isoformat'):          # date objects
            result[k] = v.isoformat()
        else:
            result[k] = v
    return result


# ══════════════════════════════════════════════════════════════════════════════
#  1. STATS
# ══════════════════════════════════════════════════════════════════════════════

@orders_bp.route('/api/admin/orders/stats', methods=['GET'])
@admin_required
def order_stats():
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    # Orders by status
    cur.execute("""
        SELECT status, COUNT(*) AS cnt
        FROM product_orders
        GROUP BY status
    """)
    status_rows = cur.fetchall()
    by_status = {r['status']: r['cnt'] for r in status_rows}

    # Total revenue (delivered + refunded excluded from refunded)
    cur.execute("""
        SELECT
            COALESCE(SUM(total_amount), 0) AS total_revenue,
            COUNT(*) AS total_orders
        FROM product_orders
        WHERE status NOT IN ('cancelled', 'returned')
    """)
    rev = cur.fetchone()

    # Revenue per week (last 8 weeks)
    cur.execute("""
        SELECT
            YEARWEEK(order_date, 1) AS yw,
            MIN(DATE(order_date)) AS week_start,
            COALESCE(SUM(total_amount), 0) AS revenue,
            COUNT(*) AS orders
        FROM product_orders
        WHERE status NOT IN ('cancelled', 'returned')
          AND order_date >= DATE_SUB(NOW(), INTERVAL 8 WEEK)
        GROUP BY YEARWEEK(order_date, 1)
        ORDER BY yw ASC
    """)
    weekly = cur.fetchall()
    for row in weekly:
        if hasattr(row.get('week_start'), 'isoformat'):
            row['week_start'] = row['week_start'].isoformat()

    # COD vs Online split
    cur.execute("""
        SELECT
            CASE
                WHEN LOWER(payment_method) = 'cod' THEN 'cod'
                ELSE 'online'
            END AS method_type,
            COUNT(*) AS cnt,
            COALESCE(SUM(total_amount), 0) AS revenue
        FROM product_orders
        WHERE status NOT IN ('cancelled', 'returned')
        GROUP BY method_type
    """)
    payment_split = cur.fetchall()

    cur.close()
    conn.close()

    return jsonify({
        'by_status':     by_status,
        'total_revenue': float(rev['total_revenue']),
        'total_orders':  rev['total_orders'],
        'weekly':        weekly,
        'payment_split': payment_split,
    })


# ══════════════════════════════════════════════════════════════════════════════
#  2. LIST ORDERS (search + filter + pagination)
# ══════════════════════════════════════════════════════════════════════════════

@orders_bp.route('/api/admin/orders', methods=['GET'])
@admin_required
def list_orders():
    search          = request.args.get('search', '').strip()
    status          = request.args.get('status', '')
    method          = request.args.get('payment_method', '')
    # ★ payment_status filter — was accepted but NEVER applied before this fix
    payment_status  = request.args.get('payment_status', '').strip()
    date_from       = request.args.get('date_from', '')
    date_to         = request.args.get('date_to', '')
    sort            = request.args.get('sort', 'order_date')
    direction       = request.args.get('dir', 'desc').lower()
    page            = max(int(request.args.get('page', 1)), 1)
    limit           = min(int(request.args.get('limit', 20)), 100)
    offset          = (page - 1) * limit

    # Whitelist sort columns
    allowed_sorts = {
        'order_id', 'order_date', 'total_amount', 'status',
        'payment_method', 'buyer_name', 'seller_name', 'product_name'
    }
    if sort not in allowed_sorts:
        sort = 'order_date'
    if direction not in ('asc', 'desc'):
        direction = 'desc'

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    conditions, params = [], []

    if search:
        like = f'%{search}%'
        conditions.append("""(
            po.order_id LIKE %s OR po.product_name LIKE %s
            OR buyer.full_name LIKE %s OR buyer.username LIKE %s
            OR seller.full_name LIKE %s OR seller.username LIKE %s
            OR po.payment_reference LIKE %s
        )""")
        params += [like, like, like, like, like, like, like]

    if status in VALID_STATUSES:
        conditions.append("po.status = %s")
        params.append(status)

    if method:
        conditions.append("po.payment_method = %s")
        params.append(method)

    # ★ FIX: actually apply the payment_status filter in SQL
    if payment_status in VALID_PAYMENT_STATUSES:
        conditions.append("po.payment_status = %s")
        params.append(payment_status)

    if date_from:
        conditions.append("DATE(po.order_date) >= %s")
        params.append(date_from)

    if date_to:
        conditions.append("DATE(po.order_date) <= %s")
        params.append(date_to)

    where = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''

    base_join = """
        FROM product_orders po
        JOIN users buyer  ON buyer.id  = po.buyer_id
        JOIN users seller ON seller.id = po.seller_id
        LEFT JOIN posts p ON p.post_id = po.post_id
    """

    # Count
    cur.execute(f"SELECT COUNT(*) AS cnt {base_join} {where}", params)
    total = cur.fetchone()['cnt']

    # Data
    cur.execute(f"""
        SELECT
            po.order_id,
            po.order_date,
            po.product_name,
            po.quantity,
            po.total_amount,
            po.currency,
            po.status,
            po.payment_method,
            po.payment_status,
            po.payment_reference,
            po.payment_reference_buyer,
            po.payment_submitted_at,
            po.cancellation_reason,
            po.tracking_number,
            po.shipping_carrier,
            po.created_at,
            po.updated_at,
            buyer.id         AS buyer_id,
            buyer.full_name  AS buyer_name,
            buyer.username   AS buyer_username,
            buyer.profile_pic AS buyer_avatar,
            seller.id        AS seller_id,
            seller.full_name AS seller_name,
            seller.username  AS seller_username,
            seller.profile_pic AS seller_avatar,
            p.media_url      AS product_image
        {base_join}
        {where}
        ORDER BY po.{sort} {direction.upper()}
        LIMIT %s OFFSET %s
    """, params + [limit, offset])

    rows = cur.fetchall()
    cur.close()
    conn.close()

    return jsonify({
        'orders': [_serialize(r) for r in rows],
        'total':  total,
        'page':   page,
        'limit':  limit,
        'pages':  (total + limit - 1) // limit,
    })


# ══════════════════════════════════════════════════════════════════════════════
#  3. GET SINGLE ORDER (full detail)
# ══════════════════════════════════════════════════════════════════════════════

@orders_bp.route('/api/admin/orders/<int:order_id>', methods=['GET'])
@admin_required
def get_order(order_id):
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT
            po.*,
            buyer.full_name  AS buyer_name,
            buyer.username   AS buyer_username,
            buyer.email      AS buyer_email,
            buyer.profile_pic AS buyer_avatar,
            seller.full_name AS seller_name,
            seller.username  AS seller_username,
            seller.email     AS seller_email,
            seller.profile_pic AS seller_avatar,
            p.media_url      AS product_image,
            p.product_title  AS product_title_post
        FROM product_orders po
        JOIN users buyer  ON buyer.id  = po.buyer_id
        JOIN users seller ON seller.id = po.seller_id
        LEFT JOIN posts p ON p.post_id = po.post_id
        WHERE po.order_id = %s
    """, (order_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        return jsonify({'error': 'Order not found'}), 404
    return jsonify(_serialize(row))


# ══════════════════════════════════════════════════════════════════════════════
#  4. UPDATE ORDER STATUS
# ══════════════════════════════════════════════════════════════════════════════

@orders_bp.route('/api/admin/orders/<int:order_id>/status', methods=['PUT'])
@admin_required
def update_order_status(order_id):
    data   = request.get_json() or {}
    status = data.get('status', '').strip()

    if status not in VALID_STATUSES:
        return jsonify({'error': f'Invalid status. Must be one of: {", ".join(VALID_STATUSES)}'}), 400

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    cur.execute("SELECT order_id, status FROM product_orders WHERE order_id = %s", (order_id,))
    order = cur.fetchone()
    if not order:
        cur.close(); conn.close()
        return jsonify({'error': 'Order not found'}), 404

    ts_map = {
        'confirmed':      'confirmed_at',
        'processing':     'processing_at',
        'shipped':        'shipped_at',
        'out_for_delivery': None,
        'delivered':      'delivered_at',
        'cancelled':      'cancelled_at',
        'returned':       None,
        'refunded':       None,
    }

    extra_fields, extra_vals = [], []

    ts_col = ts_map.get(status)
    if ts_col:
        extra_fields.append(f"{ts_col} = NOW()")

    if 'cancellation_reason' in data and status == 'cancelled':
        extra_fields.append("cancellation_reason = %s")
        extra_vals.append(data['cancellation_reason'])
    if 'tracking_number' in data:
        extra_fields.append("tracking_number = %s")
        extra_vals.append(data['tracking_number'] or None)
    if 'shipping_carrier' in data:
        extra_fields.append("shipping_carrier = %s")
        extra_vals.append(data['shipping_carrier'] or None)
    if 'seller_message' in data:
        extra_fields.append("seller_message = %s")
        extra_vals.append(data['seller_message'] or None)

    set_clause = ', '.join([f"status = %s"] + extra_fields)
    cur.execute(
        f"UPDATE product_orders SET {set_clause}, updated_at = NOW() WHERE order_id = %s",
        [status] + extra_vals + [order_id]
    )
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True, 'message': f'Order status updated to {status}'})


# ══════════════════════════════════════════════════════════════════════════════
#  5. REFUND ORDER
# ══════════════════════════════════════════════════════════════════════════════

@orders_bp.route('/api/admin/orders/<int:order_id>/refund', methods=['POST'])
@admin_required
def refund_order(order_id):
    data = request.get_json() or {}
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    cur.execute("SELECT order_id, status, total_amount FROM product_orders WHERE order_id = %s", (order_id,))
    order = cur.fetchone()
    if not order:
        cur.close(); conn.close()
        return jsonify({'error': 'Order not found'}), 404

    if order['status'] == 'refunded':
        cur.close(); conn.close()
        return jsonify({'error': 'Order is already refunded'}), 409

    refund_note = data.get('note', '').strip() or 'Admin issued refund'

    cur.execute("""
        UPDATE product_orders
        SET status = 'refunded',
            payment_admin_note = %s,
            updated_at = NOW()
        WHERE order_id = %s
    """, (refund_note, order_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({
        'success': True,
        'message': f'Order #{order_id} marked as refunded',
        'amount':  float(order['total_amount']),
    })


# ══════════════════════════════════════════════════════════════════════════════
#  6. BULK STATUS UPDATE
# ══════════════════════════════════════════════════════════════════════════════

@orders_bp.route('/api/admin/orders/bulk-status', methods=['PUT'])
@admin_required
def bulk_update_status():
    data       = request.get_json() or {}
    order_ids  = data.get('order_ids', [])
    new_status = data.get('status', '').strip()

    if not order_ids or not isinstance(order_ids, list):
        return jsonify({'error': 'order_ids array required'}), 400
    if new_status not in VALID_STATUSES:
        return jsonify({'error': 'Invalid status'}), 400

    placeholders = ','.join(['%s'] * len(order_ids))
    conn = get_db_connection()
    cur  = conn.cursor()
    cur.execute(
        f"UPDATE product_orders SET status = %s, updated_at = NOW() WHERE order_id IN ({placeholders})",
        [new_status] + order_ids
    )
    affected = cur.rowcount
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True, 'updated': affected, 'message': f'{affected} orders updated to {new_status}'})