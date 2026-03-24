"""
routes/admin/bookings_routes.py — UPDATED
─────────────────────────────────────────────────────────────────────────────
Admin Service Bookings Routes — CreatorConnect
Now fetches ALL service_bookings fields including:
  variant_id, selected_variant_name, variant_price, final_price,
  location_type, buyer_address, buyer_pincode, buyer_lat, buyer_lng,
  distance_km, travel_fee, delivery_timeline,
  service_completed_at, buyer_confirmed_at, booked_slot, preferred_time
─────────────────────────────────────────────────────────────────────────────
"""

from flask import Blueprint, jsonify, request
from database.db import get_db_connection
from routes.admin.admin_auth import admin_required
from datetime import datetime

bookings_bp = Blueprint('admin_bookings', __name__)


# ══════════════════════════════════════════════════════════════════════════════
#  STATS
# ══════════════════════════════════════════════════════════════════════════════

@bookings_bp.route('/api/admin/bookings/stats', methods=['GET'])
@admin_required
def booking_stats():
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    cur.execute("SELECT status, COUNT(*) AS cnt FROM service_bookings GROUP BY status")
    by_status_rows = cur.fetchall()
    by_status = {r['status']: int(r['cnt']) for r in by_status_rows}

    cur.execute("SELECT COALESCE(SUM(total_amount), 0) AS total FROM service_bookings WHERE status = 'completed'")
    total_revenue = float(cur.fetchone()['total'])

    cur.execute("""
        SELECT
            DATE(DATE_SUB(booking_date, INTERVAL WEEKDAY(booking_date) DAY)) AS week_start,
            COUNT(*) AS cnt
        FROM service_bookings
        WHERE booking_date >= DATE_SUB(NOW(), INTERVAL 8 WEEK)
        GROUP BY week_start
        ORDER BY week_start ASC
    """)
    weekly_rows = cur.fetchall()
    weekly = [
        {'week_start': r['week_start'].isoformat() if r['week_start'] else None, 'cnt': int(r['cnt'])}
        for r in weekly_rows
    ]

    cur.execute("SELECT COUNT(*) AS cnt FROM service_contact_requests")
    contact_count = int(cur.fetchone()['cnt'])

    cur.close(); conn.close()
    return jsonify({'by_status': by_status, 'total_revenue': total_revenue, 'weekly': weekly, 'contact_count': contact_count})


# ══════════════════════════════════════════════════════════════════════════════
#  BOOKINGS LIST
# ══════════════════════════════════════════════════════════════════════════════

@bookings_bp.route('/api/admin/bookings', methods=['GET'])
@admin_required
def get_bookings():
    search         = request.args.get('search', '').strip()
    status         = request.args.get('status', '')
    payment_status = request.args.get('payment_status', '')
    sort           = request.args.get('sort', 'booking_date')
    direction      = request.args.get('dir', 'desc').lower()
    page           = max(int(request.args.get('page',  1)), 1)
    limit          = min(int(request.args.get('limit', 20)), 100)
    offset         = (page - 1) * limit

    allowed_sorts = {'booking_id', 'booking_date', 'total_amount', 'status', 'payment_status'}
    if sort not in allowed_sorts: sort = 'booking_date'
    if direction not in ('asc', 'desc'): direction = 'desc'

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    conditions, params = [], []
    if search:
        conditions.append("(sb.booking_id LIKE %s OR p.product_title LIKE %s OR cu.full_name LIKE %s OR cu.username LIKE %s OR pu.full_name LIKE %s OR pu.username LIKE %s)")
        like = f'%{search}%'
        params += [like, like, like, like, like, like]

    if status in ('pending','accepted','in_progress','revision_requested','completed','cancelled','rejected'):
        conditions.append("sb.status = %s"); params.append(status)

    if payment_status in ('pending','partial','completed','refunded','verification_pending','cod_pending','failed'):
        conditions.append("sb.payment_status = %s"); params.append(payment_status)

    where = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''

    cur.execute(f"""
        SELECT COUNT(*) AS cnt
        FROM service_bookings sb
        JOIN posts p  ON sb.post_id = p.post_id
        JOIN users cu ON sb.customer_id = cu.id
        JOIN users pu ON sb.service_provider_id = pu.id
        {where}
    """, params)
    total = int(cur.fetchone()['cnt'])

    sort_col = 'p.product_title' if sort == 'service_title' else f'sb.{sort}'

    cur.execute(f"""
        SELECT
            sb.booking_id, sb.booking_date, sb.preferred_start_date, sb.preferred_time,
            sb.booked_slot, sb.duration_days, sb.total_amount, sb.quoted_price,
            sb.additional_charges, sb.status, sb.payment_status, sb.payment_method,
            sb.currency, sb.contact_method, sb.customer_contact, sb.advance_paid,
            sb.accepted_at, sb.completed_at, sb.cancelled_at, sb.cancellation_reason,
            sb.provider_message, sb.customer_rating, sb.customer_review,
            sb.location_type, sb.travel_fee, sb.distance_km,
            sb.selected_variant_name, sb.variant_price, sb.final_price,
            COALESCE(p.product_title, p.title) AS service_title,
            p.media_url AS service_image,
            cu.id AS customer_id, cu.username AS customer_username,
            cu.full_name AS customer_name, cu.profile_pic AS customer_avatar,
            cu.email AS customer_email,
            pu.id AS provider_id, pu.username AS provider_username,
            pu.full_name AS provider_name, pu.profile_pic AS provider_avatar,
            pu.email AS provider_email
        FROM service_bookings sb
        JOIN posts p  ON sb.post_id = p.post_id
        JOIN users cu ON sb.customer_id = cu.id
        JOIN users pu ON sb.service_provider_id = pu.id
        {where}
        ORDER BY {sort_col} {direction.upper()}
        LIMIT %s OFFSET %s
    """, params + [limit, offset])

    rows = cur.fetchall()
    cur.close(); conn.close()

    return jsonify({
        'bookings': [_serialize_booking(r) for r in rows],
        'total': total, 'page': page, 'limit': limit,
        'pages': (total + limit - 1) // limit,
    })


# ══════════════════════════════════════════════════════════════════════════════
#  SINGLE BOOKING — fetches ALL fields
# ══════════════════════════════════════════════════════════════════════════════

@bookings_bp.route('/api/admin/bookings/<int:booking_id>', methods=['GET'])
@admin_required
def get_booking(booking_id):
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT
            sb.*,
            COALESCE(p.product_title, p.title) AS service_title,
            p.media_url AS service_image,
            cu.username AS customer_username, cu.full_name AS customer_name,
            cu.profile_pic AS customer_avatar, cu.email AS customer_email,
            pu.username AS provider_username, pu.full_name AS provider_name,
            pu.profile_pic AS provider_avatar, pu.email AS provider_email
        FROM service_bookings sb
        JOIN posts p  ON sb.post_id = p.post_id
        JOIN users cu ON sb.customer_id = cu.id
        JOIN users pu ON sb.service_provider_id = pu.id
        WHERE sb.booking_id = %s
    """, (booking_id,))
    row = cur.fetchone()
    cur.close(); conn.close()

    if not row:
        return jsonify({'error': 'Booking not found'}), 404
    return jsonify(_serialize_booking(row, full=True))


# ══════════════════════════════════════════════════════════════════════════════
#  UPDATE BOOKING STATUS
# ══════════════════════════════════════════════════════════════════════════════

@bookings_bp.route('/api/admin/bookings/<int:booking_id>/status', methods=['PUT'])
@admin_required
def update_booking_status(booking_id):
    data = request.get_json() or {}
    new_status    = (data.get('status') or '').strip()
    cancel_reason = (data.get('cancellation_reason') or '').strip() or None
    prov_message  = (data.get('provider_message') or '').strip() or None

    allowed = ('pending','accepted','in_progress','revision_requested','completed','cancelled','rejected')
    if new_status not in allowed:
        return jsonify({'error': 'Invalid status value'}), 400

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute("SELECT booking_id FROM service_bookings WHERE booking_id = %s", (booking_id,))
    if not cur.fetchone():
        cur.close(); conn.close()
        return jsonify({'error': 'Booking not found'}), 404

    fields, params = ['status = %s'], [new_status]
    if prov_message is not None:
        fields.append('provider_message = %s'); params.append(prov_message)

    now = datetime.utcnow()
    if new_status == 'accepted':   fields.append('accepted_at = %s');   params.append(now)
    elif new_status == 'completed':fields.append('completed_at = %s');  params.append(now)
    elif new_status == 'cancelled':
        fields.append('cancelled_at = %s'); params.append(now)
        fields.append('cancellation_reason = %s'); params.append(cancel_reason)
    elif new_status == 'rejected':
        fields.append('rejected_at = %s'); params.append(now)
        fields.append('cancellation_reason = %s'); params.append(cancel_reason)

    cur.execute(f"UPDATE service_bookings SET {', '.join(fields)} WHERE booking_id = %s", params + [booking_id])
    conn.commit(); cur.close(); conn.close()
    return jsonify({'success': True, 'message': f'Booking status updated to {new_status}'})


# ══════════════════════════════════════════════════════════════════════════════
#  BOOKING MESSAGES
# ══════════════════════════════════════════════════════════════════════════════

@bookings_bp.route('/api/admin/bookings/<int:booking_id>/messages', methods=['GET'])
@admin_required
def get_booking_messages(booking_id):
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT bm.*, u.full_name AS sender_name, u.username AS sender_username, u.profile_pic AS sender_avatar,
                CASE WHEN bm.sender_id = sb.service_provider_id THEN 'provider' ELSE 'customer' END AS sender_type
            FROM booking_messages bm
            JOIN service_bookings sb ON bm.booking_id = sb.booking_id
            JOIN users u ON bm.sender_id = u.id
            WHERE bm.booking_id = %s ORDER BY bm.sent_at ASC
        """, (booking_id,))
        messages = cur.fetchall()
        result = [_serialize_message(m) for m in messages]
    except Exception:
        result = []
    cur.close(); conn.close()
    return jsonify({'messages': result})


# ══════════════════════════════════════════════════════════════════════════════
#  SERVICE CONTACT REQUESTS
# ══════════════════════════════════════════════════════════════════════════════

@bookings_bp.route('/api/admin/service-contacts', methods=['GET'])
@admin_required
def get_service_contacts():
    search    = request.args.get('search', '').strip()
    status    = request.args.get('status', '')
    sort      = request.args.get('sort', 'requested_at')
    direction = request.args.get('dir', 'desc').lower()
    page      = max(int(request.args.get('page',  1)), 1)
    limit     = min(int(request.args.get('limit', 20)), 100)
    offset    = (page - 1) * limit

    allowed_sorts = {'id', 'requested_at', 'status', 'preferred_contact_method'}
    if sort not in allowed_sorts: sort = 'requested_at'
    if direction not in ('asc', 'desc'): direction = 'desc'

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    conditions, params = [], []
    if search:
        conditions.append("(scr.customer_name LIKE %s OR scr.customer_email LIKE %s OR scr.message LIKE %s OR pu.full_name LIKE %s OR pu.username LIKE %s)")
        like = f'%{search}%'; params += [like, like, like, like, like]
    if status in ('pending', 'responded', 'closed'):
        conditions.append("scr.status = %s"); params.append(status)

    where = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''

    cur.execute(f"""
        SELECT COUNT(*) AS cnt FROM service_contact_requests scr
        JOIN users pu ON scr.service_provider_id = pu.id {where}
    """, params)
    total = int(cur.fetchone()['cnt'])

    cur.execute(f"""
        SELECT scr.id, scr.customer_id, scr.contact_email, scr.contact_phone, scr.message,
               scr.status, scr.created_at, scr.updated_at,
               p.product_title AS service_title,
               pu.id AS provider_id, pu.username AS provider_username,
               pu.full_name AS provider_name, pu.profile_pic AS provider_avatar
        FROM service_contact_requests scr
        JOIN posts p  ON scr.post_id = p.post_id
        JOIN users pu ON scr.service_provider_id = pu.id
        {where}
        ORDER BY scr.{sort} {direction.upper()}
        LIMIT %s OFFSET %s
    """, params + [limit, offset])
    rows = cur.fetchall()
    cur.close(); conn.close()

    return jsonify({
        'contacts': [_serialize_contact(r) for r in rows],
        'total': total, 'page': page, 'limit': limit,
        'pages': (total + limit - 1) // limit,
    })


# ══════════════════════════════════════════════════════════════════════════════
#  SERIALIZERS
# ══════════════════════════════════════════════════════════════════════════════

def _iso(v):
    if v is None: return None
    if isinstance(v, datetime): return v.isoformat()
    if hasattr(v, 'isoformat'): return v.isoformat()
    return v


def _serialize_booking(r, full=False):
    base = {
        'booking_id':           r['booking_id'],
        'booking_date':         _iso(r['booking_date']),
        'preferred_start_date': _iso(r.get('preferred_start_date')),
        'preferred_time':       str(r['preferred_time']) if r.get('preferred_time') is not None else None,
        'booked_slot':          r.get('booked_slot'),
        'duration_days':        r.get('duration_days'),
        'total_amount':         float(r['total_amount']) if r.get('total_amount') is not None else None,
        'quoted_price':         float(r['quoted_price']) if r.get('quoted_price') is not None else None,
        'additional_charges':   float(r.get('additional_charges') or 0),
        'status':               r['status'],
        'payment_status':       r.get('payment_status'),
        'payment_method':       r.get('payment_method'),
        'currency':             r.get('currency'),
        'contact_method':       r.get('contact_method'),
        'customer_contact':     r.get('customer_contact'),
        'advance_paid':         float(r.get('advance_paid') or 0),
        'accepted_at':          _iso(r.get('accepted_at')),
        'completed_at':         _iso(r.get('completed_at')),
        'cancelled_at':         _iso(r.get('cancelled_at')),
        'rejected_at':          _iso(r.get('rejected_at')),
        'cancellation_reason':  r.get('cancellation_reason'),
        'provider_message':     r.get('provider_message'),
        'customer_rating':      r.get('customer_rating'),
        'customer_review':      r.get('customer_review'),
        'service_title':        r.get('service_title'),
        'service_image':        r.get('service_image'),
        # Variant
        'variant_id':           r.get('variant_id'),
        'selected_variant_name': r.get('selected_variant_name'),
        'variant_price':        float(r['variant_price']) if r.get('variant_price') is not None else None,
        'final_price':          float(r['final_price']) if r.get('final_price') is not None else None,
        # Location / doorstep
        'location_type':        r.get('location_type', 'online'),
        'travel_fee':           float(r.get('travel_fee') or 0),
        'distance_km':          float(r['distance_km']) if r.get('distance_km') is not None else None,
        # Customer
        'customer_id':          r.get('customer_id'),
        'customer_username':    r.get('customer_username'),
        'customer_name':        r.get('customer_name'),
        'customer_avatar':      r.get('customer_avatar'),
        'customer_email':       r.get('customer_email'),
        # Provider
        'provider_id':          r.get('provider_id'),
        'provider_username':    r.get('provider_username'),
        'provider_name':        r.get('provider_name'),
        'provider_avatar':      r.get('provider_avatar'),
        'provider_email':       r.get('provider_email'),
    }
    if full:
        base.update({
            'customer_requirements':  r.get('customer_requirements'),
            'reference_files':        r.get('reference_files'),
            'delivery_message':       r.get('delivery_message'),
            'delivery_files':         r.get('delivery_files'),
            'delivery_date':          _iso(r.get('delivery_date')),
            'delivery_timeline':      r.get('delivery_timeline'),
            'payment_reference':      r.get('payment_reference'),
            'advance_payment_date':   _iso(r.get('advance_payment_date')),
            'final_payment_date':     _iso(r.get('final_payment_date')),
            'review_date':            _iso(r.get('review_date')),
            'service_completed_at':   _iso(r.get('service_completed_at')),
            'buyer_confirmed_at':     _iso(r.get('buyer_confirmed_at')),
            # Doorstep fields
            'buyer_address':          r.get('buyer_address'),
            'buyer_pincode':          r.get('buyer_pincode'),
            'buyer_lat':              float(r['buyer_lat']) if r.get('buyer_lat') is not None else None,
            'buyer_lng':              float(r['buyer_lng']) if r.get('buyer_lng') is not None else None,
            'created_at':             _iso(r.get('created_at')),
            'updated_at':             _iso(r.get('updated_at')),
        })
    return base


def _serialize_contact(r, full=False):
    base = {
        'id':               r['id'],
        'customer_id':      r.get('customer_id'),
        'contact_email':    r.get('contact_email'),
        'contact_phone':    r.get('contact_phone'),
        'message':          r.get('message'),
        'status':           r.get('status'),
        'created_at':       _iso(r.get('created_at')),
        'updated_at':       _iso(r.get('updated_at')),
        'service_title':    r.get('service_title'),
        'provider_id':      r.get('provider_id'),
        'provider_username':r.get('provider_username'),
        'provider_name':    r.get('provider_name'),
        'provider_avatar':  r.get('provider_avatar'),
    }
    if full:
        base.update({'provider_email': r.get('provider_email')})
    return base


def _serialize_message(m):
    return {
        'message_id':  m.get('id') or m.get('message_id'),
        'booking_id':  m.get('booking_id'),
        'sender_id':   m.get('sender_id'),
        'sender_name': m.get('sender_name'),
        'sender_type': m.get('sender_type'),
        'message':     m.get('message'),
        'sent_at':     _iso(m.get('sent_at')),
        'is_read':     bool(m.get('is_read', False)),
    }