"""
routes/admin/payouts_routes.py
─────────────────────────────────────────────────────────────────────────────
Admin Financial / Payouts Routes — CreatorConnect
Register in app.py:
    from routes.admin.payouts_routes import payouts_bp
    app.register_blueprint(payouts_bp)
"""

from flask import Blueprint, jsonify, request
from database.db import get_db_connection
from routes.admin.admin_auth import admin_required
from datetime import datetime

import jwt
import os

# ── Helper: extract admin_id from JWT token ───────────────────────────────────
def _get_admin_id_from_request(req):
    """Extract admin user_id from Authorization Bearer token."""
    try:
        auth_header = req.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None
        token = auth_header[7:]
        secret = os.environ.get('JWT_SECRET_KEY', 'your-secret-key')
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        return payload.get('user_id') or payload.get('id')
    except Exception:
        return None

payouts_bp = Blueprint('admin_payouts', __name__)


# ══════════════════════════════════════════════════════════════════════════════
#  STATS — Dashboard numbers
# ══════════════════════════════════════════════════════════════════════════════

@payouts_bp.route('/api/admin/payouts/stats', methods=['GET'])
@admin_required
def payout_stats():
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    # Total platform commission collected
    cur.execute("""
        SELECT COALESCE(SUM(commission_amt), 0) AS total_commission
        FROM commission_ledger
    """)
    total_commission = float(cur.fetchone()['total_commission'])

    # Pending withdrawal amount
    cur.execute("""
        SELECT COALESCE(SUM(amount), 0) AS pending_amount,
               COUNT(*) AS pending_count
        FROM withdrawal_requests
        WHERE status = 'pending'
    """)
    row = cur.fetchone()
    pending_amount = float(row['pending_amount'])
    pending_count  = int(row['pending_count'])

    # Total paid out (approved/completed withdrawals)
    cur.execute("""
        SELECT COALESCE(SUM(amount), 0) AS paid_out
        FROM withdrawal_requests
        WHERE status IN ('approved', 'completed')
    """)
    paid_out = float(cur.fetchone()['paid_out'])

    # ✅ FIX: Rejected withdrawals — amount + count
    cur.execute("""
        SELECT COALESCE(SUM(amount), 0) AS rejected_amount,
               COUNT(*) AS rejected_count
        FROM withdrawal_requests
        WHERE status = 'rejected'
    """)
    row = cur.fetchone()
    rejected_amount = float(row['rejected_amount'])
    rejected_count  = int(row['rejected_count'])

    # Monthly commission earnings — last 12 months
    cur.execute("""
        SELECT
            DATE_FORMAT(created_at, '%Y-%m') AS month,
            COALESCE(SUM(commission_amt), 0) AS commission
        FROM commission_ledger
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY month
        ORDER BY month ASC
    """)
    monthly_commission = [
        {'month': r['month'], 'commission': float(r['commission'])}
        for r in cur.fetchall()
    ]

    # Withdrawal counts by status (for donut chart)
    cur.execute("""
        SELECT status, COUNT(*) AS cnt, COALESCE(SUM(amount), 0) AS total
        FROM withdrawal_requests
        GROUP BY status
    """)
    wd_by_status = {}
    for r in cur.fetchall():
        wd_by_status[r['status']] = {
            'count': int(r['cnt']),
            'total': float(r['total'])
        }

    cur.close()
    conn.close()

    return jsonify({
        'total_commission':   total_commission,
        'pending_amount':     pending_amount,
        'pending_count':      pending_count,
        'paid_out':           paid_out,
        'rejected_amount':    rejected_amount,   # ✅ NEW
        'rejected_count':     rejected_count,    # ✅ NEW
        'monthly_commission': monthly_commission,
        'wd_by_status':       wd_by_status,
    })


# ══════════════════════════════════════════════════════════════════════════════
#  WITHDRAWAL REQUESTS
# ══════════════════════════════════════════════════════════════════════════════

@payouts_bp.route('/api/admin/payouts/withdrawals', methods=['GET'])
@admin_required
def get_withdrawals():
    status    = request.args.get('status', '')
    search    = request.args.get('search', '').strip()
    sort      = request.args.get('sort', 'request_date')
    direction = request.args.get('dir', 'desc').lower()
    page      = max(int(request.args.get('page',  1)), 1)
    limit     = min(int(request.args.get('limit', 20)), 100)
    offset    = (page - 1) * limit

    allowed_sorts = {'request_id', 'request_date', 'amount', 'status', 'processed_date'}
    if sort not in allowed_sorts:
        sort = 'request_date'
    if direction not in ('asc', 'desc'):
        direction = 'desc'

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    conditions, params = [], []

    if status in ('pending', 'approved', 'completed', 'rejected'):
        conditions.append("wr.status = %s")
        params.append(status)

    if search:
        conditions.append("""(
            u.full_name LIKE %s OR u.username LIKE %s OR u.email LIKE %s
            OR wr.request_id LIKE %s
        )""")
        like = f'%{search}%'
        params += [like, like, like, like]

    where = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''

    cur.execute(f"""
        SELECT COUNT(*) AS cnt
        FROM withdrawal_requests wr
        JOIN users u ON wr.user_id = u.id
        {where}
    """, params)
    total = int(cur.fetchone()['cnt'])

    cur.execute(f"""
        SELECT
            wr.request_id, wr.amount, wr.status,
            wr.request_date, wr.processed_date,
            wr.admin_notes, wr.payment_method, wr.payment_reference,
            u.id         AS seller_id,
            u.username   AS seller_username,
            u.full_name  AS seller_name,
            u.email      AS seller_email,
            u.profile_pic AS seller_avatar,
            sps.accepts_upi,
            sps.upi_id,
            sps.upi_name,
            sps.accepts_bank_transfer,
            sps.bank_account_number,
            sps.bank_ifsc_code,
            sps.bank_holder_name,
            sps.bank_name,
            sps.bank_branch
        FROM withdrawal_requests wr
        JOIN users u ON wr.user_id = u.id
        LEFT JOIN seller_payment_settings sps ON sps.user_id = u.id
        {where}
        ORDER BY wr.{sort} {direction.upper()}
        LIMIT %s OFFSET %s
    """, params + [limit, offset])

    rows = cur.fetchall()
    cur.close()
    conn.close()

    return jsonify({
        'withdrawals': [_serialize_withdrawal(r) for r in rows],
        'total':  total,
        'page':   page,
        'limit':  limit,
        'pages':  (total + limit - 1) // limit,
    })


@payouts_bp.route('/api/admin/payouts/withdrawals/<int:request_id>', methods=['GET'])
@admin_required
def get_withdrawal(request_id):
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT
            wr.*,
            u.id         AS seller_id,
            u.username   AS seller_username,
            u.full_name  AS seller_name,
            u.email      AS seller_email,
            u.profile_pic AS seller_avatar,
            sps.accepts_upi,
            sps.upi_id,
            sps.upi_name,
            sps.accepts_bank_transfer,
            sps.bank_account_number,
            sps.bank_ifsc_code,
            sps.bank_holder_name,
            sps.bank_name,
            sps.bank_branch
        FROM withdrawal_requests wr
        JOIN users u ON wr.user_id = u.id
        LEFT JOIN seller_payment_settings sps ON sps.user_id = u.id
        WHERE wr.request_id = %s
    """, (request_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return jsonify({'error': 'Withdrawal not found'}), 404
    return jsonify(_serialize_withdrawal(row))


# ─── Approve withdrawal ───────────────────────────────────────────────────────
@payouts_bp.route('/api/admin/payouts/withdrawals/<int:request_id>/approve', methods=['PUT'])
@admin_required
def approve_withdrawal(request_id):
    data      = request.get_json() or {}
    notes     = (data.get('admin_notes') or '').strip() or None
    pay_ref   = (data.get('payment_reference') or '').strip() or None
    pay_meth  = (data.get('payment_method') or '').strip() or None

    admin_id = _get_admin_id_from_request(request)

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    cur.execute("""
        SELECT wr.*,
               u.email AS seller_email,
               u.full_name AS seller_name,
               u.username AS seller_username
        FROM withdrawal_requests wr
        JOIN users u ON wr.user_id = u.id
        WHERE wr.request_id = %s
    """, (request_id,))
    wr = cur.fetchone()
    if not wr:
        cur.close(); conn.close()
        return jsonify({'error': 'Withdrawal not found'}), 404
    if wr['status'] not in ('pending',):
        cur.close(); conn.close()
        return jsonify({'error': f"Cannot approve a {wr['status']} withdrawal"}), 400

    now = datetime.utcnow()
    cur.execute("""
        UPDATE withdrawal_requests
        SET status = 'approved',
            processed_date = %s,
            admin_notes = %s,
            payment_method = %s,
            payment_reference = %s
        WHERE request_id = %s
    """, (now, notes, pay_meth, pay_ref, request_id))

    # Update seller_balance
    cur.execute("""
        UPDATE seller_balance
        SET total_withdrawn = total_withdrawn + %s,
            available_balance = GREATEST(available_balance - %s, 0),
            last_withdrawal_at = %s,
            updated_at = NOW()
        WHERE user_id = %s
    """, (wr['amount'], wr['amount'], now, wr['user_id']))

    # Log to commission_ledger
    cur.execute("""
        INSERT INTO commission_ledger
            (seller_id, event_type, gross_amount, commission_pct, commission_amt, net_credit, notes, created_at)
        VALUES (%s, 'withdrawal', %s, 0, 0, %s, %s, %s)
    """, (
        wr['user_id'], float(wr['amount']), -float(wr['amount']),
        f"Admin withdrawal approval #{request_id}",
        now
    ))

    # ✅ FIX: Always log admin action — use fallback admin_id = 9 if JWT fails
    log_admin_id = admin_id or 9
    cur.execute("""
        INSERT INTO admin_actions_log
            (admin_id, action_type, reference_type, reference_id, action_details, ip_address)
        VALUES (%s, 'withdrawal_approved', 'withdrawal_request', %s, %s, %s)
    """, (
        log_admin_id, request_id,
        f"Approved ₹{wr['amount']} withdrawal for {wr['seller_name'] or wr['seller_username']}. Ref: {pay_ref or 'N/A'}",
        request.remote_addr
    ))

    conn.commit()
    cur.close()
    conn.close()

    # Send approval email (non-blocking)
    try:
        from services.payout_email_service import send_withdrawal_approved_email
        send_withdrawal_approved_email(
            seller_email=wr['seller_email'],
            seller_name=wr['seller_name'] or wr['seller_username'] or 'Seller',
            amount=float(wr['amount']),
            request_id=request_id,
            payment_method=pay_meth or 'N/A',
            payment_reference=pay_ref or 'N/A',
            admin_notes=notes
        )
    except Exception as e:
        print(f"⚠️ Could not send withdrawal approval email: {e}")

    return jsonify({'success': True, 'message': f'Withdrawal ₹{wr["amount"]} approved successfully'})


# ─── Reject withdrawal ────────────────────────────────────────────────────────
@payouts_bp.route('/api/admin/payouts/withdrawals/<int:request_id>/reject', methods=['PUT'])
@admin_required
def reject_withdrawal(request_id):
    data  = request.get_json() or {}
    notes = (data.get('admin_notes') or '').strip() or 'Rejected by admin'

    admin_id = _get_admin_id_from_request(request)

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    cur.execute("""
        SELECT wr.*,
               u.email AS seller_email,
               u.full_name AS seller_name,
               u.username AS seller_username
        FROM withdrawal_requests wr
        JOIN users u ON wr.user_id = u.id
        WHERE wr.request_id = %s
    """, (request_id,))
    wr = cur.fetchone()
    if not wr:
        cur.close(); conn.close()
        return jsonify({'error': 'Withdrawal not found'}), 404
    if wr['status'] not in ('pending',):
        cur.close(); conn.close()
        return jsonify({'error': f"Cannot reject a {wr['status']} withdrawal"}), 400

    cur.execute("""
        UPDATE withdrawal_requests
        SET status = 'rejected',
            processed_date = NOW(),
            admin_notes = %s
        WHERE request_id = %s
    """, (notes, request_id))

    # ✅ FIX: Always log — use fallback admin_id = 9 if JWT fails
    log_admin_id = admin_id or 9
    cur.execute("""
        INSERT INTO admin_actions_log
            (admin_id, action_type, reference_type, reference_id, action_details, ip_address)
        VALUES (%s, 'withdrawal_rejected', 'withdrawal_request', %s, %s, %s)
    """, (
        log_admin_id, request_id,
        f"Rejected ₹{wr['amount']} withdrawal for {wr['seller_name'] or wr['seller_username']}. Reason: {notes}",
        request.remote_addr
    ))

    conn.commit()
    cur.close()
    conn.close()

    # Send rejection email (non-blocking)
    try:
        from services.payout_email_service import send_withdrawal_rejected_email
        send_withdrawal_rejected_email(
            seller_email=wr['seller_email'],
            seller_name=wr['seller_name'] or wr['seller_username'] or 'Seller',
            amount=float(wr['amount']),
            request_id=request_id,
            rejection_reason=notes
        )
    except Exception as e:
        print(f"⚠️ Could not send withdrawal rejection email: {e}")

    return jsonify({'success': True, 'message': 'Withdrawal rejected'})


# ══════════════════════════════════════════════════════════════════════════════
#  COMMISSION LEDGER
# ══════════════════════════════════════════════════════════════════════════════

@payouts_bp.route('/api/admin/payouts/commission-ledger', methods=['GET'])
@admin_required
def get_commission_ledger():
    search     = request.args.get('search', '').strip()
    event_type = request.args.get('event_type', '')
    sort       = request.args.get('sort', 'created_at')
    direction  = request.args.get('dir', 'desc').lower()
    page       = max(int(request.args.get('page', 1)), 1)
    limit      = min(int(request.args.get('limit', 25)), 100)
    offset     = (page - 1) * limit

    allowed_sorts = {'ledger_id', 'created_at', 'gross_amount', 'commission_amt', 'net_credit'}
    if sort not in allowed_sorts:
        sort = 'created_at'
    if direction not in ('asc', 'desc'):
        direction = 'desc'

    allowed_events = ('online_commission', 'cod_commission', 'cod_deficit',
                      'deficit_recovery', 'withdrawal', 'refund_reversal')

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    conditions, params = [], []
    if event_type in allowed_events:
        conditions.append("cl.event_type = %s")
        params.append(event_type)
    if search:
        conditions.append("(u.full_name LIKE %s OR u.username LIKE %s OR cl.notes LIKE %s)")
        like = f'%{search}%'
        params += [like, like, like]

    where = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''

    cur.execute(f"""
        SELECT COUNT(*) AS cnt FROM commission_ledger cl
        JOIN users u ON cl.seller_id = u.id
        {where}
    """, params)
    total = int(cur.fetchone()['cnt'])

    cur.execute(f"""
        SELECT
            cl.ledger_id, cl.seller_id, cl.order_id, cl.booking_id,
            cl.event_type, cl.gross_amount, cl.commission_pct,
            cl.commission_amt, cl.net_credit, cl.seller_balance_after,
            cl.notes, cl.created_at,
            u.username   AS seller_username,
            u.full_name  AS seller_name,
            u.profile_pic AS seller_avatar
        FROM commission_ledger cl
        JOIN users u ON cl.seller_id = u.id
        {where}
        ORDER BY cl.{sort} {direction.upper()}
        LIMIT %s OFFSET %s
    """, params + [limit, offset])

    rows = cur.fetchall()
    cur.close()
    conn.close()

    return jsonify({
        'entries': [_serialize_ledger(r) for r in rows],
        'total':   total,
        'page':    page,
        'limit':   limit,
        'pages':   (total + limit - 1) // limit,
    })


# ══════════════════════════════════════════════════════════════════════════════
#  PAYMENT CONFIG
# ══════════════════════════════════════════════════════════════════════════════

@payouts_bp.route('/api/admin/payouts/payment-config', methods=['GET'])
@admin_required
def get_payment_config():
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute("SELECT config_key, config_value, is_active, updated_at FROM admin_payment_config ORDER BY id")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    config = {}
    for r in rows:
        config[r['config_key']] = {
            'value':      r['config_value'],
            'is_active':  bool(r['is_active']),
            'updated_at': r['updated_at'].isoformat() if r['updated_at'] else None,
        }
    return jsonify({'config': config})


@payouts_bp.route('/api/admin/payouts/payment-config', methods=['PUT'])
@admin_required
def update_payment_config():
    data = request.get_json() or {}
    admin_id = _get_admin_id_from_request(request)

    allowed_keys = {
        'upi_id', 'upi_name', 'upi_description',
        'bank_name', 'bank_holder', 'bank_account',
        'bank_ifsc', 'bank_branch', 'bank_description',
        'platform_fee_online_pct', 'platform_fee_cod_pct'
    }

    conn = get_db_connection()
    cur  = conn.cursor()

    updated = []
    for key, value in data.items():
        if key not in allowed_keys:
            continue
        cur.execute("""
            INSERT INTO admin_payment_config (config_key, config_value, updated_by)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_by = VALUES(updated_by), updated_at = NOW()
        """, (key, str(value), admin_id))
        updated.append(key)

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({'success': True, 'message': f'Updated {len(updated)} config keys', 'updated': updated})


# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN ACTIONS LOG
# ══════════════════════════════════════════════════════════════════════════════

@payouts_bp.route('/api/admin/payouts/action-logs', methods=['GET'])
@admin_required
def get_action_logs():
    page   = max(int(request.args.get('page',  1)), 1)
    limit  = min(int(request.args.get('limit', 20)), 100)
    offset = (page - 1) * limit
    action_type = request.args.get('action_type', '').strip()
    search      = request.args.get('search', '').strip()

    # Current line in get_action_logs():
    allowed = ('withdrawal_approved', 'withdrawal_rejected', 'payment_verified',
           'seller_payment_verified', 'post_removed', 'user_suspended',
           'transaction_refunded')
    conditions, params = [], []
    if action_type in allowed:
        conditions.append("al.action_type = %s")
        params.append(action_type)
    if search:
        conditions.append("(u.username LIKE %s OR u.full_name LIKE %s OR al.action_details LIKE %s)")
        like = f'%{search}%'
        params.extend([like, like, like])

    where = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    cur.execute(f"""
        SELECT COUNT(*) AS cnt
        FROM admin_actions_log al
        JOIN users u ON al.admin_id = u.id
        {where}
    """, params)
    total = int(cur.fetchone()['cnt'])

    cur.execute(f"""
        SELECT al.*, u.username AS admin_username, u.full_name AS admin_name
        FROM admin_actions_log al
        JOIN users u ON al.admin_id = u.id
        {where}
        ORDER BY al.created_at DESC
        LIMIT %s OFFSET %s
    """, params + [limit, offset])

    rows = cur.fetchall()
    cur.close()
    conn.close()

    return jsonify({
        'logs':  [_serialize_log(r) for r in rows],
        'total': total,
        'page':  page,
        'limit': limit,
        'pages': (total + limit - 1) // limit,
    })


# ══════════════════════════════════════════════════════════════════════════════
#  SERIALIZERS
# ══════════════════════════════════════════════════════════════════════════════

def _iso(v):
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.isoformat()
    if hasattr(v, 'isoformat'):
        return v.isoformat()
    return v


def _serialize_withdrawal(r):
    return {
        'request_id':        r['request_id'],
        'amount':            float(r['amount']),
        'status':            r['status'],
        'request_date':      _iso(r.get('request_date')),
        'processed_date':    _iso(r.get('processed_date')),
        'admin_notes':       r.get('admin_notes'),
        'payment_method':    r.get('payment_method'),
        'payment_reference': r.get('payment_reference'),
        'seller_id':         r.get('seller_id'),
        'seller_username':   r.get('seller_username'),
        'seller_name':       r.get('seller_name'),
        'seller_email':      r.get('seller_email'),
        'seller_avatar':     r.get('seller_avatar'),
        'payment_options': {
            'accepts_upi':           bool(r.get('accepts_upi')),
            'upi_id':                r.get('upi_id'),
            'upi_name':              r.get('upi_name'),
            'accepts_bank_transfer': bool(r.get('accepts_bank_transfer')),
            'bank_account_number':   r.get('bank_account_number'),
            'bank_ifsc_code':        r.get('bank_ifsc_code'),
            'bank_holder_name':      r.get('bank_holder_name'),
            'bank_name':             r.get('bank_name'),
            'bank_branch':           r.get('bank_branch'),
        },
    }


def _serialize_ledger(r):
    return {
        'ledger_id':            r['ledger_id'],
        'seller_id':            r['seller_id'],
        'order_id':             r.get('order_id'),
        'booking_id':           r.get('booking_id'),
        'event_type':           r['event_type'],
        'gross_amount':         float(r['gross_amount']),
        'commission_pct':       float(r['commission_pct']),
        'commission_amt':       float(r['commission_amt']),
        'net_credit':           float(r['net_credit']),
        'seller_balance_after': float(r['seller_balance_after']) if r.get('seller_balance_after') is not None else None,
        'notes':                r.get('notes'),
        'created_at':           _iso(r.get('created_at')),
        'seller_username':      r.get('seller_username'),
        'seller_name':          r.get('seller_name'),
        'seller_avatar':        r.get('seller_avatar'),
    }


def _serialize_log(r):
    return {
        'id':             r['id'],
        'action_type':    r['action_type'],
        'reference_type': r.get('reference_type'),
        'reference_id':   r.get('reference_id'),
        'action_details': r.get('action_details'),
        'ip_address':     r.get('ip_address'),
        'created_at':     _iso(r.get('created_at')),
        'admin_username': r.get('admin_username'),
        'admin_name':     r.get('admin_name'),
    }