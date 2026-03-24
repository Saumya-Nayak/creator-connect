"""
routes/payment_routes.py (COMPLETE FIXED v8)
=============================================
Real Payment Flow - Creator Connect Platform

BUGS FIXED:
  v7: Deficit recovery sign (-recover not +recover) 
  v8: COD commission display (-commission not 0)
"""

from flask import Blueprint, request, jsonify
from database.db import get_db_connection
import jwt, os, traceback
from routes.admin.admin_auth import admin_required
from services.payout_email_service import (
    send_payment_verified_email,
    send_payment_rejected_email,
)

payment_bp = Blueprint('payments', __name__)


def _verify_token(req):
    auth = req.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return None
    try:
        return jwt.decode(
            auth[7:],
            os.getenv('JWT_SECRET_KEY', 'your-secret-key'),
            algorithms=['HS256']
        )
    except Exception:
        return None


def _get_platform_fees(cur):
    cur.execute("""
        SELECT config_key, config_value FROM admin_payment_config
        WHERE config_key IN ('platform_fee_online_pct', 'platform_fee_cod_pct')
        AND is_active = 1
    """)
    rows = cur.fetchall()
    fees = {r['config_key']: float(r['config_value']) for r in rows}
    return (fees.get('platform_fee_online_pct', 5.0), fees.get('platform_fee_cod_pct', 2.0))


def _apply_commission_and_credit(cur, conn, order, commission_pct, event_type):
    """
    Apply commission and credit for orders.
    
    ONLINE: Credit net to balance, log deficit recovery as -recover
    COD: Deduct commission, log as -commission (v8 FIX)
    """
    seller_id  = order['seller_id']
    order_id   = order['order_id']
    gross      = float(order['total_amount'])
    commission = round(gross * commission_pct / 100, 2)
    net_credit = round(gross - commission, 2)
    is_cod = (event_type == 'cod_commission')

    cur.execute("""
        SELECT available_balance, total_earnings, total_sales,
               commission_deficit, is_withdrawal_blocked
        FROM seller_balance WHERE user_id = %s
    """, (seller_id,))
    bal = cur.fetchone()

    if not bal:
        cur.execute("""
            INSERT INTO seller_balance
            (user_id, total_earnings, available_balance, pending_clearance,
             total_sales, total_withdrawn, commission_deficit, is_withdrawal_blocked)
            VALUES (%s, 0, 0, 0, 0, 0, 0, 0)
        """, (seller_id,))
        conn.commit()
        cur.execute("SELECT * FROM seller_balance WHERE user_id = %s", (seller_id,))
        bal = cur.fetchone()

    prev_balance = float(bal['available_balance'])
    prev_deficit = float(bal['commission_deficit'])
    withdrawal_blocked = int(bal['is_withdrawal_blocked'])

    # COD PATH: DEDUCT only, never credit
    if is_cod:
        new_balance = prev_balance - commission
        new_deficit = prev_deficit
        new_is_blocked = withdrawal_blocked
        deficit_recovered = 0.0

        if new_balance < 0:
            new_deficit += abs(new_balance)
            new_is_blocked = 1
            cur.execute("""
                INSERT INTO commission_ledger
                (seller_id, order_id, event_type, gross_amount, commission_pct,
                 commission_amt, net_credit, notes, created_at)
                VALUES (%s, %s, 'cod_deficit', %s, %s, %s, %s, %s, NOW())
            """, (seller_id, order_id, gross, commission_pct, commission, new_balance,
                  f'COD commission ₹{commission:.2f} exceeded balance — deficit ₹{abs(new_balance):.2f}'))
            new_balance = 0.0

        if new_deficit <= 0:
            new_deficit = 0.0
            new_is_blocked = 0

        # ✅ FIX v8: Log as -commission (not 0) for display
        cur.execute("""
            INSERT INTO commission_ledger
            (seller_id, order_id, event_type, gross_amount, commission_pct,
             commission_amt, net_credit, seller_balance_after, notes, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        """, (seller_id, order_id, event_type, gross, commission_pct,
              commission, -commission, new_balance,
              f'Order #{order_id} — COD {commission_pct}% commission ₹{commission:.2f}'))

        cur.execute("""
            UPDATE seller_balance
            SET available_balance = %s, total_sales = total_sales + 1,
                commission_deficit = %s, is_withdrawal_blocked = %s, updated_at = NOW()
            WHERE user_id = %s
        """, (new_balance, new_deficit, new_is_blocked, seller_id))

        return {
            'gross': gross, 'commission_pct': commission_pct, 'commission_amt': commission,
            'net_credit': -commission, 'deficit_recovered': 0.0, 'new_balance': new_balance,
            'new_deficit': new_deficit, 'is_blocked': bool(new_is_blocked)
        }

    # ONLINE PATH: CREDIT (gross - commission)
    deficit_recovered = 0.0
    actual_net = net_credit

    if prev_deficit > 0:
        recover = min(net_credit, prev_deficit)
        deficit_recovered = recover
        actual_net = net_credit - recover
        new_deficit = max(prev_deficit - recover, 0.0)
        
        # ✅ FIX v7: Log as -recover for display
        cur.execute("""
            INSERT INTO commission_ledger
            (seller_id, order_id, event_type, gross_amount, commission_pct,
             commission_amt, net_credit, notes, created_at)
            VALUES (%s, %s, 'deficit_recovery', %s, 0, 0, %s, %s, NOW())
        """, (seller_id, order_id, recover, -recover,
              f'Recovered ₹{recover:.2f} deficit'))
    else:
        new_deficit = prev_deficit

    new_balance = prev_balance + actual_net
    new_is_blocked = withdrawal_blocked

    if new_deficit <= 0:
        new_deficit = 0.0
        new_is_blocked = 0

    cur.execute("""
        INSERT INTO commission_ledger
        (seller_id, order_id, event_type, gross_amount, commission_pct,
         commission_amt, net_credit, seller_balance_after, notes, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
    """, (seller_id, order_id, event_type, gross, commission_pct,
          commission, actual_net, new_balance,
          f'Order #{order_id} — {commission_pct}% commission ₹{commission:.2f}, net ₹{actual_net:.2f}'))

    cur.execute("""
        UPDATE seller_balance
        SET available_balance = %s, total_earnings = total_earnings + %s,
            total_sales = total_sales + 1, commission_deficit = %s,
            is_withdrawal_blocked = %s, updated_at = NOW()
        WHERE user_id = %s
    """, (new_balance, net_credit, new_deficit, new_is_blocked, seller_id))

    return {
        'gross': gross, 'commission_pct': commission_pct, 'commission_amt': commission,
        'net_credit': actual_net, 'deficit_recovered': deficit_recovered,
        'new_balance': new_balance, 'new_deficit': new_deficit, 'is_blocked': bool(new_is_blocked)
    }


@payment_bp.route('/payments/admin-config', methods=['GET'])
def get_admin_payment_config():
    payload = _verify_token(request)
    if not payload:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT config_key, config_value FROM admin_payment_config WHERE is_active = 1")
        rows = cur.fetchall()
        config = {r['config_key']: r['config_value'] for r in rows}
        return jsonify({'success': True, 'config': config})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@payment_bp.route('/payments/orders/<int:order_id>/submit', methods=['POST'])
def submit_payment(order_id):
    payload = _verify_token(request)
    if not payload:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    buyer_id = payload['user_id']
    data = request.get_json() or {}
    method = data.get('payment_method', 'upi')
    ref = (data.get('payment_reference_buyer') or '').strip()

    if method not in ('upi', 'bank_transfer', 'cod'):
        return jsonify({'success': False, 'message': 'Invalid payment method'}), 400

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT o.*, p.accepts_cod FROM product_orders o
            INNER JOIN posts p ON o.post_id = p.post_id
            WHERE o.order_id = %s AND o.buyer_id = %s
        """, (order_id, buyer_id))
        order = cur.fetchone()

        if not order:
            return jsonify({'success': False, 'message': 'Order not found'}), 404
        if method == 'cod' and not order.get('accepts_cod'):
            return jsonify({'success': False, 'message': 'COD unavailable'}), 400
        if order['payment_status'] == 'completed':
            return jsonify({'success': False, 'message': 'Already paid'}), 400
        if order['status'] in ('cancelled', 'delivered'):
            return jsonify({'success': False, 'message': 'Cannot pay for order'}), 400

        if method == 'cod':
            cur.execute("""
                UPDATE product_orders SET payment_method='cod', payment_status='cod_pending',
                payment_submitted_at=NOW(), updated_at=NOW() WHERE order_id=%s
            """, (order_id,))
            conn.commit()
            return jsonify({'success': True, 'message': 'COD selected', 'payment_status': 'cod_pending'})
        else:
            cur.execute("""
                UPDATE product_orders SET payment_method=%s, payment_status='verification_pending',
                payment_reference_buyer=%s, payment_submitted_at=NOW(), updated_at=NOW()
                WHERE order_id=%s
            """, (method, ref or None, order_id))
            conn.commit()
            return jsonify({'success': True, 'message': 'Payment submitted', 'payment_status': 'verification_pending'})

    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@payment_bp.route('/payments/orders/<int:order_id>/verify', methods=['PUT'])
@admin_required
def admin_verify_payment(order_id):
    data = request.get_json() or {}
    action = data.get('action', '').strip()
    admin_note = data.get('admin_note', '').strip()

    if action not in ('approve', 'reject'):
        return jsonify({'error': 'Invalid action'}), 400

    conn = get_db_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT po.order_id, po.seller_id, po.buyer_id, po.product_name, po.total_amount,
                   po.payment_status, u.full_name AS buyer_name, u.email AS buyer_email,
                   s.full_name AS seller_name
            FROM product_orders po
            JOIN users u ON u.id = po.buyer_id
            JOIN users s ON s.id = po.seller_id
            WHERE po.order_id = %s
        """, (order_id,))
        order = cur.fetchone()

        if not order:
            return jsonify({'error': 'Order not found'}), 404
        if order['payment_status'] != 'verification_pending':
            return jsonify({'error': f"Invalid status: {order['payment_status']}"}), 400

        amount = float(order['total_amount'] or 0)

        if action == 'approve':
            cur.execute("""
                UPDATE product_orders SET payment_status='completed',
                payment_verified_at=NOW(), payment_admin_note=%s, updated_at=NOW()
                WHERE order_id=%s
            """, (admin_note or None, order_id))
            conn.commit()

            try:
                online_pct, _ = _get_platform_fees(cur)
                _apply_commission_and_credit(cur, conn, order, online_pct, 'online_commission')
                conn.commit()
            except Exception as e:
                print(f"Commission error: {e}")

            try:
                send_payment_verified_email(
                    buyer_email=order['buyer_email'],
                    buyer_name=order['buyer_name'] or 'Customer',
                    order_id=order_id,
                    product_name=order['product_name'],
                    amount=amount,
                    seller_name=order['seller_name'],
                    admin_note=admin_note or None
                )
            except:
                pass

            return jsonify({'success': True, 'message': 'Approved', 'order_id': order_id, 'new_payment_status': 'completed'})

        else:
            cur.execute("""
                UPDATE product_orders SET payment_status='rejected',
                payment_admin_note=%s, updated_at=NOW() WHERE order_id=%s
            """, (admin_note or None, order_id))
            conn.commit()

            try:
                send_payment_rejected_email(
                    buyer_email=order['buyer_email'],
                    buyer_name=order['buyer_name'] or 'Customer',
                    order_id=order_id,
                    product_name=order['product_name'],
                    amount=amount,
                    rejection_reason=admin_note or None
                )
            except:
                pass

            return jsonify({'success': True, 'message': 'Rejected', 'order_id': order_id, 'new_payment_status': 'rejected'})

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@payment_bp.route('/payments/orders/<int:order_id>/cod-delivered', methods=['PUT'])
def cod_delivered(order_id):
    payload = _verify_token(request)
    if not payload:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    seller_id = payload['user_id']
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT * FROM product_orders WHERE order_id=%s AND seller_id=%s AND payment_method='cod'
        """, (order_id, seller_id))
        order = cur.fetchone()

        if not order:
            return jsonify({'success': False, 'message': 'Order not found'}), 404
        if order['payment_status'] == 'completed':
            return jsonify({'success': False, 'message': 'Already processed'}), 400

        _, cod_pct = _get_platform_fees(cur)
        credit_info = _apply_commission_and_credit(cur, conn, order, cod_pct, 'cod_commission')

        cur.execute("""
            UPDATE product_orders SET payment_status='completed', payment_date=NOW(),
            payment_admin_note=%s, updated_at=NOW() WHERE order_id=%s
        """, (f'COD {cod_pct}% deducted', order_id))
        conn.commit()

        msg = 'Processed'
        if credit_info['is_blocked']:
            msg += f" - Deficit ₹{credit_info['new_deficit']:.2f}"

        return jsonify({'success': True, 'message': msg, 'commission': credit_info})

    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@payment_bp.route('/payments/pending-verifications', methods=['GET'])
def get_pending_verifications():
    payload = _verify_token(request)
    if not payload:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT po.* FROM product_orders po
            WHERE po.payment_status='verification_pending'
            ORDER BY po.payment_submitted_at ASC
        """)
        orders = cur.fetchall()
        for o in orders:
            for k, v in o.items():
                if hasattr(v, 'isoformat'):
                    o[k] = v.isoformat()
        return jsonify({'success': True, 'orders': orders, 'count': len(orders)})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@payment_bp.route('/payments/my-commission-ledger', methods=['GET'])
def get_commission_ledger():
    payload = _verify_token(request)
    if not payload:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    seller_id = payload['user_id']
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT cl.* FROM commission_ledger cl
            WHERE cl.seller_id=%s ORDER BY cl.created_at DESC LIMIT 100
        """, (seller_id,))
        rows = cur.fetchall()
        for r in rows:
            for k, v in r.items():
                if hasattr(v, 'isoformat'):
                    r[k] = v.isoformat()

        cur.execute("""
            SELECT commission_deficit, is_withdrawal_blocked
            FROM seller_balance WHERE user_id=%s
        """, (seller_id,))
        bal = cur.fetchone() or {}

        return jsonify({
            'success': True, 'ledger': rows, 'count': len(rows),
            'commission_deficit': float(bal.get('commission_deficit') or 0),
            'is_withdrawal_blocked': bool(bal.get('is_withdrawal_blocked'))
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cur.close()
        conn.close()


print("✅ Payment routes loaded (COMPLETE FIXED v8)")