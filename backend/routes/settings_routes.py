# routes/settings_routes.py  ── v8 (COD TOTAL EARNINGS FIX) ─────────────────
#
# FIX 8 — _live_seller_stats: ADD COD order amounts to total_earnings.
#
#          ROOT CAUSE of the bug:
#          total_earn only summed online product orders (COD excluded via
#          COALESCE(payment_method, '') != 'cod') and service bookings.
#          COD orders are correctly excluded from available_balance (seller
#          collects cash directly — no platform deposit), but they were also
#          incorrectly excluded from total_earnings, so the seller's gross
#          revenue from COD sales was never counted.
#
#          FIX: Add a new query for COD delivered order amounts and include
#          that sum in total_earn. available_balance is NOT changed.
#
#          Example (Plant Shoppe):
#            Online order #19: ₹1499 × 95% = ₹1424.05 → total_earnings ✅
#            COD order #20:    ₹1499 × 98% = ₹1469.02 → now added       ✅
#            Expected total_earnings: ₹1424.05 + ₹1469.02 = ₹2893.07   ✅
#            Old (buggy) total_earnings: ₹1424.05                        ❌
#            available_balance unchanged: ₹1294.07                       ✅
#
# Previous fixes retained:
# FIX 1 — change_password: handles scrypt / Werkzeug AND bcrypt hashes
# FIX 2 — get_sessions:    inserts current token row → always shows ≥1 session
# FIX 3 — get_seller_balance: LIVE totals
# FIX 4 — COMMISSION: product online 5%, COD 2% deduct-only, service 0%
# FIX 5 — get_my_orders: includes product_image from posts table
# FIX 6 — _live_seller_stats: EXCLUDE COD orders from available_balance calculation
# FIX 7 — _live_seller_stats: SUBTRACT total COD commissions from available_balance

from flask import Blueprint, request, jsonify, Response
import jwt, os, bcrypt, json
from datetime import datetime, timedelta

settings_bp = Blueprint('settings', __name__)

try:
    from werkzeug.security import check_password_hash, generate_password_hash
    HAS_WERKZEUG = True
except ImportError:
    HAS_WERKZEUG = False

try:
    from database.db import get_db_connection
except ImportError:
    from database import get_db_connection


# ════════════════════════════ CONSTANTS ══════════════════════════════════════

PLATFORM_FEE_PCT     = 5.0    # 5% — applied to ONLINE product orders ONLY
SELLER_SHARE_PRODUCT = 0.95   # seller keeps 95% of online product order total


# ════════════════════════════ HELPERS ════════════════════════════════════════

def get_current_user(req):
    auth = req.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return None, jsonify({'success': False, 'message': 'Unauthorized'}), 401
    token = auth[7:]
    try:
        payload = jwt.decode(
            token,
            os.getenv('JWT_SECRET_KEY', 'your-secret-key'),
            algorithms=['HS256']
        )
        return payload['user_id'], None, None
    except jwt.ExpiredSignatureError:
        return None, jsonify({'success': False, 'message': 'Token expired'}), 401
    except jwt.InvalidTokenError:
        return None, jsonify({'success': False, 'message': 'Invalid token'}), 401


def get_raw_token(req):
    return req.headers.get('Authorization', '').replace('Bearer ', '').strip()


def safe_verify_password(plain: str, stored: str) -> bool:
    if not stored or not plain:
        return False
    try:
        if stored.startswith(('scrypt:', 'pbkdf2:', 'sha256$')):
            if HAS_WERKZEUG:
                return check_password_hash(stored, plain)
            return False
        if stored.startswith(('$2b$', '$2a$', '$2y$')):
            stored_b = stored.encode('utf-8') if isinstance(stored, str) else stored
            return bcrypt.checkpw(plain.encode('utf-8'), stored_b)
        print(f"⚠️  Unknown password format ({stored[:10]}…) — plain-text compare")
        return stored == plain
    except Exception as e:
        print(f"⚠️  safe_verify_password: {e}")
        return False


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def ensure_session(conn, user_id: int, token: str, ip: str, ua: str):
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT session_id FROM admin_sessions WHERE token = %s", (token,))
        if not cur.fetchone():
            expires = datetime.utcnow() + timedelta(days=1)
            cur.execute("""
                INSERT INTO admin_sessions
                    (user_id, token, ip_address, user_agent, created_at, expires_at, is_active)
                VALUES (%s, %s, %s, %s, NOW(), %s, 1)
                ON DUPLICATE KEY UPDATE is_active = 1, expires_at = VALUES(expires_at)
            """, (user_id, token, ip or '?', ua or '?', expires))
            conn.commit()
    except Exception as e:
        print(f"⚠️  ensure_session: {e}")
    finally:
        cur.close()


# ════════════════════════════ PROFILE ════════════════════════════════════════

@settings_bp.route('/settings/profile', methods=['GET'])
def get_profile_settings():
    user_id, err, code = get_current_user(request)
    if err: return err, code
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT id, email, username, full_name, phone, profile_pic,
                   country, state, city, gender, date_of_birth, about_me,
                   is_private, website_url, login_attempts,
                   account_locked_until, last_login
            FROM users WHERE id = %s
        """, (user_id,))
        user = cur.fetchone()
        cur.execute(
            "SELECT platform, url, is_visible FROM user_social_links WHERE user_id = %s ORDER BY id",
            (user_id,)
        )
        social = cur.fetchall()
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        for k in ('date_of_birth', 'last_login', 'account_locked_until'):
            if user.get(k) and hasattr(user[k], 'isoformat'):
                user[k] = user[k].isoformat()
        return jsonify({'success': True, 'user': user, 'social_links': social})
    except Exception as e:
        print(f'❌ get_profile_settings: {e}')
        return jsonify({'success': False, 'message': 'Server error'}), 500
    finally:
        cur.close(); conn.close()


@settings_bp.route('/settings/profile', methods=['PUT'])
def update_profile_settings():
    user_id, err, code = get_current_user(request)
    if err: return err, code
    data = request.get_json() or {}
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        if data.get('username'):
            cur.execute("SELECT id FROM users WHERE username=%s AND id!=%s", (data['username'], user_id))
            if cur.fetchone():
                return jsonify({'success': False, 'message': 'Username already taken'})
        cur.execute("""
            UPDATE users SET
                full_name=%s, username=%s, phone=%s,
                date_of_birth=%s, gender=%s, about_me=%s,
                country=%s, state=%s, city=%s,
                website_url=%s, updated_at=NOW()
            WHERE id=%s
        """, (
            data.get('full_name'), data.get('username'), data.get('phone'),
            data.get('date_of_birth') or None, data.get('gender'), data.get('about_me'),
            data.get('country'), data.get('state'), data.get('city'),
            data.get('website_url'), user_id
        ))
        if 'social_links' in data:
            cur.execute("DELETE FROM user_social_links WHERE user_id=%s", (user_id,))
            for lnk in data['social_links']:
                if lnk.get('platform') and lnk.get('url'):
                    cur.execute(
                        "INSERT INTO user_social_links (user_id, platform, url) VALUES (%s,%s,%s)",
                        (user_id, lnk['platform'], lnk['url'])
                    )
        conn.commit()
        return jsonify({'success': True, 'message': 'Profile updated'})
    except Exception as e:
        conn.rollback()
        print(f'❌ update_profile_settings: {e}')
        return jsonify({'success': False, 'message': 'Failed to update profile'}), 500
    finally:
        cur.close(); conn.close()


@settings_bp.route('/settings/check-username', methods=['GET'])
def check_username():
    username = request.args.get('username', '').strip()
    if not username: return jsonify({'available': False})
    conn = get_db_connection(); cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM users WHERE username=%s", (username,))
        return jsonify({'available': cur.fetchone() is None})
    finally:
        cur.close(); conn.close()


# ════════════════════════ SECURITY / PASSWORD ════════════════════════════════

@settings_bp.route('/settings/change-password', methods=['POST'])
def change_password():
    user_id, err, code = get_current_user(request)
    if err: return err, code
    data       = request.get_json() or {}
    current_pw = data.get('current_password', '').strip()
    new_pw     = data.get('new_password', '').strip()
    if not current_pw or not new_pw:
        return jsonify({'success': False, 'message': 'Both passwords are required'})
    if len(new_pw) < 8:
        return jsonify({'success': False, 'message': 'New password must be at least 8 characters'})
    conn = get_db_connection(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT password FROM users WHERE id=%s", (user_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({'success': False, 'message': 'User not found'})
        stored = row['password'] or ''
        if not safe_verify_password(current_pw, stored):
            if not any(stored.startswith(p) for p in
                       ('scrypt:', 'pbkdf2:', 'sha256$', '$2b$', '$2a$', '$2y$')):
                return jsonify({'success': False,
                                'message': 'This account uses Google Sign-In. Password cannot be changed here.'})
            return jsonify({'success': False, 'message': 'Current password is incorrect'})
        new_hash = hash_password(new_pw)
        cur.execute("UPDATE users SET password=%s, updated_at=NOW() WHERE id=%s", (new_hash, user_id))
        conn.commit()
        return jsonify({'success': True, 'message': 'Password changed successfully! 🎉'})
    except Exception as e:
        conn.rollback()
        print(f'❌ change_password: {e}')
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500
    finally:
        cur.close(); conn.close()


@settings_bp.route('/settings/security-status', methods=['GET'])
def get_security_status():
    user_id, err, code = get_current_user(request)
    if err: return err, code
    conn = get_db_connection(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "SELECT login_attempts, account_locked_until, last_login FROM users WHERE id=%s",
            (user_id,)
        )
        row = cur.fetchone()
        if not row: return jsonify({'success': False, 'message': 'User not found'}), 404
        now = datetime.now()
        return jsonify({'success': True, 'status': {
            'login_attempts': row['login_attempts'] or 0,
            'is_locked':      bool(row['account_locked_until'] and row['account_locked_until'] > now),
            'locked_until':   row['account_locked_until'].isoformat() if row['account_locked_until'] else None,
            'last_login':     row['last_login'].isoformat()           if row['last_login']            else None,
        }})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cur.close(); conn.close()


# ════════════════════════════ SESSIONS ═══════════════════════════════════════

@settings_bp.route('/settings/sessions', methods=['GET'])
def get_sessions():
    user_id, err, code = get_current_user(request)
    if err: return err, code
    current_token = get_raw_token(request)
    ip = request.remote_addr
    ua = request.headers.get('User-Agent', '')
    conn = get_db_connection()
    ensure_session(conn, user_id, current_token, ip, ua)
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT session_id, token, ip_address, user_agent, created_at, expires_at
            FROM admin_sessions
            WHERE user_id = %s AND is_active = 1
            ORDER BY created_at DESC
        """, (user_id,))
        sessions = cur.fetchall()
        result = []
        for s in sessions:
            ua_str  = s.get('user_agent') or ''
            device  = '📱 Mobile' if 'Mobile' in ua_str else ('📱 Tablet' if 'Tablet' in ua_str else '🖥️ Desktop')
            browser = ('Edge'    if 'Edg'     in ua_str else
                       'Chrome'  if 'Chrome'  in ua_str else
                       'Firefox' if 'Firefox' in ua_str else
                       'Safari'  if 'Safari'  in ua_str else 'Unknown')
            exp = s.get('expires_at')
            result.append({
                'session_id': s['session_id'],
                'ip_address': s.get('ip_address', '?'),
                'device':     device,
                'browser':    browser,
                'is_current': (s.get('token') or '') == current_token,
                'is_expired': bool(exp and exp < datetime.utcnow()),
                'created_at': s['created_at'].isoformat() if s.get('created_at') else None,
                'expires_at': exp.isoformat()              if exp                   else None,
            })
        return jsonify({'success': True, 'sessions': result})
    except Exception as e:
        print(f'❌ get_sessions: {e}')
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': 'Server error'}), 500
    finally:
        cur.close(); conn.close()


@settings_bp.route('/settings/logout-session/<int:session_id>', methods=['DELETE'])
def logout_session(session_id):
    user_id, err, code = get_current_user(request)
    if err: return err, code
    conn = get_db_connection(); cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE admin_sessions SET is_active=0 WHERE session_id=%s AND user_id=%s",
            (session_id, user_id)
        )
        conn.commit()
        return jsonify({'success': True, 'message': 'Session terminated'})
    except Exception as e:
        conn.rollback(); return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cur.close(); conn.close()


@settings_bp.route('/settings/logout-all-sessions', methods=['DELETE'])
def logout_all_sessions():
    user_id, err, code = get_current_user(request)
    if err: return err, code
    current_token = get_raw_token(request)
    conn = get_db_connection(); cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE admin_sessions SET is_active=0 WHERE user_id=%s AND token!=%s",
            (user_id, current_token)
        )
        conn.commit()
        return jsonify({'success': True, 'message': 'All other sessions logged out'})
    except Exception as e:
        conn.rollback(); return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cur.close(); conn.close()


# ══════════════ SELLER BALANCE — LIVE, COD-AWARE ═════════════════════════════

def _live_seller_stats(cur, user_id: int) -> dict:
    """
    Commission policy
    -----------------
    ✅  Online product orders (UPI / bank) → seller receives 95% (platform keeps 5%)
    ✅  COD product orders                 → seller already collected cash from buyer.
                                             Platform ONLY deducts 2% commission from
                                             seller_balance (handled by payment_routes).
                                             COD order amounts ARE included in total_earnings
                                             (FIX 8) but EXCLUDED from available_balance
                                             (no platform deposit was made).
    ✅  Service bookings                   → seller receives 100% (NO commission)

    total_earnings    = online_net_earnings + service_earnings + cod_order_totals  ← FIX 8
    available_balance = online_net_earnings + service_earnings
                        - withdrawn
                        - total_cod_commissions_paid   ← FIX 7
                        - outstanding_cod_commission_deficit
    """

    # ── ONLINE product orders ONLY (exclude COD) ────────────────────────────
    cur.execute("""
        SELECT COALESCE(SUM(total_amount * %s), 0) AS earn,
               COALESCE(COUNT(*), 0)               AS sales
        FROM product_orders
        WHERE seller_id = %s AND status = 'delivered'
          AND COALESCE(payment_method, '') != 'cod'
    """, (SELLER_SHARE_PRODUCT, user_id))
    p_earn = cur.fetchone()

    cur.execute("""
        SELECT COALESCE(SUM(total_amount * %s), 0) AS avail
        FROM product_orders
        WHERE seller_id = %s AND status = 'delivered'
          AND payment_status = 'completed'
          AND COALESCE(payment_method, '') != 'cod'
    """, (SELLER_SHARE_PRODUCT, user_id))
    p_avail = cur.fetchone()

    cur.execute("""
        SELECT COALESCE(SUM(total_amount * %s), 0) AS pend
        FROM product_orders
        WHERE seller_id = %s
          AND status IN ('confirmed', 'processing', 'shipped', 'out_for_delivery')
          AND COALESCE(payment_method, '') != 'cod'
    """, (SELLER_SHARE_PRODUCT, user_id))
    p_pend = cur.fetchone()

    cur.execute("""
        SELECT COALESCE(SUM(total_amount * %s), 0) AS fee
        FROM product_orders
        WHERE seller_id = %s AND status = 'delivered'
          AND payment_status = 'completed'
          AND COALESCE(payment_method, '') != 'cod'
    """, (PLATFORM_FEE_PCT / 100, user_id))
    p_fee = cur.fetchone()

    # ── FIX 8: COD delivered order totals for total_earnings ─────────────────
    # Seller collected cash from buyer but platform deducts 2% commission.
    # total_earnings should reflect the seller's NET from COD (98%), not gross.
    # This is NOT added to available_balance (no platform deposit was made).
    cur.execute("""
        SELECT COALESCE(SUM(total_amount * 0.98), 0) AS cod_earn,
               COALESCE(COUNT(*), 0)                 AS cod_sales
        FROM product_orders
        WHERE seller_id = %s AND status = 'delivered'
          AND payment_method = 'cod'
    """, (user_id,))
    cod_earn_row = cur.fetchone()

    # ── Service bookings (no commission) ────────────────────────────────────
    cur.execute("""
        SELECT COALESCE(SUM(total_amount), 0) AS earn,
               COALESCE(COUNT(*), 0)          AS sales
        FROM service_bookings
        WHERE service_provider_id = %s AND status = 'completed'
    """, (user_id,))
    s_earn = cur.fetchone()

    cur.execute("""
        SELECT COALESCE(SUM(total_amount), 0) AS avail
        FROM service_bookings
        WHERE service_provider_id = %s AND status = 'completed' AND payment_status = 'completed'
    """, (user_id,))
    s_avail = cur.fetchone()

    cur.execute("""
        SELECT COALESCE(SUM(total_amount), 0) AS pend
        FROM service_bookings
        WHERE service_provider_id = %s
          AND status IN ('accepted', 'in_progress', 'revision_requested')
    """, (user_id,))
    s_pend = cur.fetchone()

    # ── COD commission deficit (for withdrawal block status) ─────────────────
    cur.execute("""
        SELECT COALESCE(commission_deficit, 0)    AS deficit,
               COALESCE(is_withdrawal_blocked, 0) AS is_blocked
        FROM seller_balance WHERE user_id = %s
    """, (user_id,))
    cod_bal = cur.fetchone() or {'deficit': 0, 'is_blocked': 0}

    # ── FIX 7: Total COD commissions actually deducted (from ledger) ─────────
    cur.execute("""
        SELECT COALESCE(SUM(commission_amt), 0) AS total_cod_commission
        FROM commission_ledger
        WHERE seller_id = %s AND event_type = 'cod_commission'
    """, (user_id,))
    cod_comm_row = cur.fetchone()
    total_cod_commission = float(cod_comm_row['total_cod_commission'] if cod_comm_row else 0)

    # ── Withdrawals ──────────────────────────────────────────────────────────
    cur.execute("""
        SELECT COALESCE(SUM(amount), 0) AS wdn
        FROM withdrawal_requests
        WHERE user_id = %s AND status IN ('completed', 'approved')
    """, (user_id,))
    wdn = cur.fetchone()

    # FIX 8: include COD order totals in total_earnings
    total_earn  = float(p_earn['earn']) + float(s_earn['earn']) + float(cod_earn_row['cod_earn'])
    total_avail = float(p_avail['avail']) + float(s_avail['avail'])
    total_pend  = float(p_pend['pend'])   + float(s_pend['pend'])
    total_sales = int(p_earn['sales']) + int(s_earn['sales']) + int(cod_earn_row['cod_sales'])
    withdrawn   = float(wdn['wdn'] if wdn else 0)
    cod_deficit = float(cod_bal['deficit'])

    # available_balance: COD cash is NOT a platform deposit — excluded here
    available = max(total_avail - withdrawn - total_cod_commission - cod_deficit, 0.0)

    return {
        'total_earnings':              round(total_earn, 2),
        'available_balance':           round(available,  2),
        'pending_clearance':           round(total_pend, 2),
        'total_sales':                 total_sales,
        'total_withdrawn':             round(withdrawn,  2),
        'platform_fee_percentage':     PLATFORM_FEE_PCT,
        'product_platform_fee_earned': round(float(p_fee['fee']), 2),
        'commission_deficit':          round(cod_deficit, 2),
        'is_withdrawal_blocked':       bool(cod_bal['is_blocked']),
    }


@settings_bp.route('/settings/seller-balance', methods=['GET'])
def get_seller_balance():
    user_id, err, code = get_current_user(request)
    if err: return err, code
    conn = get_db_connection(); cur = conn.cursor(dictionary=True)
    try:
        stats = _live_seller_stats(cur, user_id)

        cur.execute("""
            INSERT INTO seller_balance
                (user_id, total_earnings, available_balance, pending_clearance,
                 total_sales, total_withdrawn, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
            ON DUPLICATE KEY UPDATE
                total_earnings    = VALUES(total_earnings),
                available_balance = VALUES(available_balance),
                pending_clearance = VALUES(pending_clearance),
                total_sales       = VALUES(total_sales),
                total_withdrawn   = VALUES(total_withdrawn),
                updated_at        = NOW()
        """, (
            user_id,
            stats['total_earnings'], stats['available_balance'],
            stats['pending_clearance'], stats['total_sales'],
            stats['total_withdrawn'],
        ))
        conn.commit()

        return jsonify({
            'success': True,
            'balance': {**stats, 'currency': 'INR', 'user_id': user_id}
        })
    except Exception as e:
        conn.rollback()
        print(f'❌ get_seller_balance: {e}')
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': 'Server error'}), 500
    finally:
        cur.close(); conn.close()


# ══════════════════════ SELLER PAYMENT SETTINGS ══════════════════════════════

@settings_bp.route('/settings/seller-payment', methods=['GET'])
def get_seller_payment():
    user_id, err, code = get_current_user(request)
    if err: return err, code
    conn = get_db_connection(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM seller_payment_settings WHERE user_id=%s", (user_id,))
        pay = cur.fetchone()
        if pay and pay.get('verified_at'):
            pay['verified_at'] = pay['verified_at'].isoformat()
        return jsonify({'success': True, 'payment': pay})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cur.close(); conn.close()


@settings_bp.route('/settings/seller-payment', methods=['PUT'])
def update_seller_payment():
    user_id, err, code = get_current_user(request)
    if err: return err, code
    data = request.get_json() or {}
    conn = get_db_connection(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id FROM seller_payment_settings WHERE user_id=%s", (user_id,))
        if cur.fetchone():
            cur.execute("""
                UPDATE seller_payment_settings SET
                    accepts_upi=%s, upi_id=%s, upi_name=%s,
                    accepts_bank_transfer=%s, bank_account_number=%s,
                    bank_ifsc_code=%s, bank_holder_name=%s,
                    bank_name=%s, bank_branch=%s, updated_at=NOW()
                WHERE user_id=%s
            """, (
                data.get('accepts_upi', 0), data.get('upi_id'), data.get('upi_name'),
                data.get('accepts_bank_transfer', 0), data.get('bank_account_number'),
                data.get('bank_ifsc_code'), data.get('bank_holder_name'),
                data.get('bank_name'), data.get('bank_branch'), user_id
            ))
        else:
            cur.execute("""
                INSERT INTO seller_payment_settings
                    (user_id, accepts_upi, upi_id, upi_name, accepts_bank_transfer,
                     bank_account_number, bank_ifsc_code, bank_holder_name, bank_name, bank_branch)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (
                user_id,
                data.get('accepts_upi', 0), data.get('upi_id'), data.get('upi_name'),
                data.get('accepts_bank_transfer', 0), data.get('bank_account_number'),
                data.get('bank_ifsc_code'), data.get('bank_holder_name'),
                data.get('bank_name'), data.get('bank_branch')
            ))
        conn.commit()
        return jsonify({'success': True, 'message': 'Payment settings saved'})
    except Exception as e:
        conn.rollback(); return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cur.close(); conn.close()


# ══════════════════════ WITHDRAWAL REQUESTS ═══════════════════════════════════

@settings_bp.route('/settings/withdrawal-requests', methods=['GET'])
def get_withdrawal_requests():
    user_id, err, code = get_current_user(request)
    if err: return err, code
    conn = get_db_connection(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT request_id, amount, status, request_date, processed_date,
                   admin_notes, payment_method, payment_reference
            FROM withdrawal_requests
            WHERE user_id=%s
            ORDER BY request_date DESC
        """, (user_id,))
        requests = cur.fetchall()
        for r in requests:
            if r.get('request_date'):   r['request_date']   = r['request_date'].isoformat()
            if r.get('processed_date'): r['processed_date'] = r['processed_date'].isoformat()
        return jsonify({'success': True, 'requests': requests})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cur.close(); conn.close()


@settings_bp.route('/settings/withdrawal-requests', methods=['POST'])
def create_withdrawal_request():
    user_id, err, code = get_current_user(request)
    if err: return err, code
    data   = request.get_json() or {}
    amount = float(data.get('amount', 0))
    if amount < 100:
        return jsonify({'success': False, 'message': 'Minimum withdrawal amount is ₹100'})
    conn = get_db_connection(); cur = conn.cursor(dictionary=True)
    try:
        stats     = _live_seller_stats(cur, user_id)
        available = stats['available_balance']

        # Block withdrawal if COD commission deficit exists
        if stats['is_withdrawal_blocked']:
            deficit = stats['commission_deficit']
            return jsonify({
                'success': False,
                'message': f'Withdrawals are blocked until your COD commission deficit of ₹{deficit:.2f} is cleared.'
            })

        if amount > available:
            return jsonify({'success': False,
                            'message': f'Insufficient balance. Available: ₹{available:.2f}'})
        cur.execute("SELECT id FROM seller_payment_settings WHERE user_id=%s", (user_id,))
        if not cur.fetchone():
            return jsonify({'success': False, 'message': 'Please set up payment details first'})
        cur.execute("""
            INSERT INTO withdrawal_requests (user_id, amount, status, request_date)
            VALUES (%s, %s, 'pending', NOW())
        """, (user_id, amount))
        conn.commit()
        return jsonify({'success': True,
                        'message': f'Withdrawal request for ₹{amount:.2f} submitted successfully'})
    except Exception as e:
        conn.rollback()
        print(f'❌ create_withdrawal_request: {e}')
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cur.close(); conn.close()


@settings_bp.route('/settings/withdrawal-requests/<int:request_id>/mock-approve', methods=['POST'])
def mock_approve_withdrawal(request_id):
    user_id, err, code = get_current_user(request)
    if err: return err, code
    conn = get_db_connection(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT amount, status FROM withdrawal_requests
            WHERE request_id=%s AND user_id=%s
        """, (request_id, user_id))
        req = cur.fetchone()
        if not req:
            return jsonify({'success': False, 'message': 'Request not found'})
        if req['status'] == 'completed':
            return jsonify({'success': False, 'message': 'Request already completed'})
        cur.execute("""
            UPDATE withdrawal_requests
            SET status='completed', processed_date=NOW(),
                admin_notes='Mock approval - payment completed',
                payment_method='Bank Transfer'
            WHERE request_id=%s
        """, (request_id,))
        conn.commit()
        return jsonify({'success': True,
                        'message': f'Withdrawal of ₹{req["amount"]:.2f} approved and paid!'})
    except Exception as e:
        conn.rollback()
        print(f'❌ mock_approve_withdrawal: {e}')
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cur.close(); conn.close()


# ════════════════════════ BILLING ADDRESS ════════════════════════════════════

@settings_bp.route('/settings/billing-address', methods=['GET'])
def get_billing_address():
    user_id, err, code = get_current_user(request)
    if err: return err, code
    conn = get_db_connection(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "SELECT full_name, address, city, pincode FROM billing_address WHERE user_id=%s",
            (user_id,)
        )
        addr = cur.fetchone()
        return jsonify({'success': True, 'address': addr or {}})
    except Exception:
        return jsonify({'success': True, 'address': {}})
    finally:
        cur.close(); conn.close()


@settings_bp.route('/settings/billing-address', methods=['PUT'])
def update_billing_address():
    user_id, err, code = get_current_user(request)
    if err: return err, code
    data = request.get_json() or {}
    conn = get_db_connection(); cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO billing_address (user_id, full_name, address, city, pincode)
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                full_name=VALUES(full_name), address=VALUES(address),
                city=VALUES(city), pincode=VALUES(pincode)
        """, (user_id, data.get('full_name'), data.get('address'),
              data.get('city'), data.get('pincode')))
        conn.commit()
        return jsonify({'success': True, 'message': 'Billing address saved'})
    except Exception as e:
        conn.rollback()
        print(f'❌ update_billing_address: {e}')
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cur.close(); conn.close()


# ═════════════════════════ MY ORDERS — with product image ════════════════════

@settings_bp.route('/settings/my-orders', methods=['GET'])
def get_my_orders():
    user_id, err, code = get_current_user(request)
    if err: return err, code
    conn = get_db_connection(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT po.order_id, po.product_name, po.quantity, po.total_amount,
                   po.order_date, po.status, po.currency,
                   'product' AS order_type,
                   p.media_url AS product_image
            FROM product_orders po
            LEFT JOIN posts p ON po.post_id = p.post_id
            WHERE po.buyer_id=%s AND po.status IN ('delivered', 'cancelled', 'refunded')
            ORDER BY po.order_date DESC
        """, (user_id,))
        product_orders = cur.fetchall()

        cur.execute("""
            SELECT sb.booking_id AS order_id,
                   p.product_title AS product_name,
                   1 AS quantity,
                   sb.total_amount,
                   sb.booking_date AS order_date,
                   sb.status,
                   sb.currency,
                   'service' AS order_type,
                   p.media_url AS product_image
            FROM service_bookings sb
            LEFT JOIN posts p ON sb.post_id = p.post_id
            WHERE sb.customer_id=%s AND sb.status IN ('completed', 'cancelled', 'rejected')
            ORDER BY sb.booking_date DESC
        """, (user_id,))
        service_orders = cur.fetchall()

        all_orders = product_orders + service_orders
        all_orders.sort(key=lambda x: x['order_date'], reverse=True)
        for o in all_orders:
            if o.get('order_date'): o['order_date'] = o['order_date'].isoformat()

        return jsonify({'success': True, 'orders': all_orders})
    except Exception as e:
        print(f'❌ get_my_orders: {e}')
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cur.close(); conn.close()


# ═══════════════════════════ PRIVACY ═════════════════════════════════════════

@settings_bp.route('/settings/privacy', methods=['GET'])
def get_privacy_settings():
    user_id, err, code = get_current_user(request)
    if err: return err, code
    conn = get_db_connection(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT is_private,
                   COALESCE(show_phone, 0) AS show_phone,
                   COALESCE(show_email, 0) AS show_email,
                   COALESCE(show_dob,   0) AS show_dob
            FROM users WHERE id=%s
        """, (user_id,))
        row = cur.fetchone()
        if not row: return jsonify({'success': False, 'message': 'User not found'}), 404
        return jsonify({'success': True, 'privacy': row})
    except Exception:
        return jsonify({'success': True, 'privacy': {
            'is_private': False, 'show_phone': False,
            'show_email': False, 'show_dob': False
        }})
    finally:
        cur.close(); conn.close()


@settings_bp.route('/settings/privacy', methods=['PUT'])
def update_privacy():
    user_id, err, code = get_current_user(request)
    if err: return err, code
    data = request.get_json() or {}
    conn = get_db_connection(); cur = conn.cursor()
    try:
        try:
            cur.execute(
                "UPDATE users SET is_private=%s, show_phone=%s, show_email=%s, show_dob=%s, updated_at=NOW() WHERE id=%s",
                (data.get('is_private', False), data.get('show_phone', False),
                 data.get('show_email', False), data.get('show_dob', False), user_id)
            )
        except Exception:
            conn.rollback()
            cur.execute(
                "UPDATE users SET is_private=%s, updated_at=NOW() WHERE id=%s",
                (data.get('is_private', False), user_id)
            )
        conn.commit()
        return jsonify({'success': True, 'message': 'Privacy settings saved'})
    except Exception as e:
        conn.rollback(); return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cur.close(); conn.close()


# ═══════════════════════ ACCOUNT ACTIONS ════════════════════════════════════

@settings_bp.route('/settings/remove-avatar', methods=['POST'])
def remove_avatar():
    user_id, err, code = get_current_user(request)
    if err: return err, code
    conn = get_db_connection(); cur = conn.cursor()
    try:
        cur.execute("UPDATE users SET profile_pic=NULL, updated_at=NOW() WHERE id=%s", (user_id,))
        conn.commit(); return jsonify({'success': True, 'message': 'Avatar removed'})
    except Exception as e:
        conn.rollback(); return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cur.close(); conn.close()


@settings_bp.route('/settings/deactivate', methods=['POST'])
def deactivate_account():
    user_id, err, code = get_current_user(request)
    if err: return err, code
    conn = get_db_connection(); cur = conn.cursor()
    try:
        cur.execute("UPDATE users SET otp_verified=0 WHERE id=%s", (user_id,))
        cur.execute("UPDATE admin_sessions SET is_active=0 WHERE user_id=%s", (user_id,))
        conn.commit(); return jsonify({'success': True, 'message': 'Account deactivated'})
    except Exception as e:
        conn.rollback(); return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cur.close(); conn.close()


@settings_bp.route('/settings/delete-account', methods=['DELETE'])
def delete_account():
    user_id, err, code = get_current_user(request)
    if err: return err, code
    data     = request.get_json() or {}
    password = data.get('password', '')
    if not password:
        return jsonify({'success': False, 'message': 'Password is required'})
    conn = get_db_connection(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT password FROM users WHERE id=%s", (user_id,))
        row = cur.fetchone()
        if not row: return jsonify({'success': False, 'message': 'User not found'})
        if not safe_verify_password(password, row['password'] or ''):
            return jsonify({'success': False, 'message': 'Incorrect password'})
        cur.execute("DELETE FROM users WHERE id=%s", (user_id,))
        conn.commit(); return jsonify({'success': True, 'message': 'Account deleted permanently'})
    except Exception as e:
        conn.rollback(); return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cur.close(); conn.close()


# ══════════════════════════ DATA EXPORT ══════════════════════════════════════

@settings_bp.route('/settings/download-data', methods=['GET'])
def download_data():
    user_id, err, code = get_current_user(request)
    if err: return err, code
    dtype = request.args.get('type', 'profile')
    conn  = get_db_connection(); cur = conn.cursor(dictionary=True)
    try:
        result = {}
        if dtype == 'profile':
            cur.execute(
                "SELECT id,email,username,full_name,phone,country,state,city,gender,"
                "date_of_birth,about_me,website_url,created_at FROM users WHERE id=%s",
                (user_id,)
            )
            u = cur.fetchone()
            if u:
                for k, v in u.items():
                    if hasattr(v, 'isoformat'): u[k] = v.isoformat()
            result = {'profile': u}
        elif dtype == 'orders':
            cur.execute(
                "SELECT order_id,product_name,quantity,total_amount,order_date,status "
                "FROM product_orders WHERE buyer_id=%s ORDER BY order_date DESC",
                (user_id,)
            )
            orders = cur.fetchall()
            for o in orders:
                if o.get('order_date'): o['order_date'] = o['order_date'].isoformat()
            result = {'orders': orders, 'count': len(orders)}
        elif dtype == 'posts':
            cur.execute(
                "SELECT post_id,post_type,caption,price,total_sales,created_at "
                "FROM posts WHERE user_id=%s AND is_deleted=0 ORDER BY created_at DESC",
                (user_id,)
            )
            posts = cur.fetchall()
            for p in posts:
                if p.get('created_at'): p['created_at'] = p['created_at'].isoformat()
            result = {'posts': posts, 'count': len(posts)}
        elif dtype == 'transactions':
            cur.execute(
                "SELECT order_id,product_name,total_amount,payment_status,payment_method,order_date "
                "FROM product_orders WHERE buyer_id=%s OR seller_id=%s ORDER BY order_date DESC",
                (user_id, user_id)
            )
            txns = cur.fetchall()
            for t in txns:
                if t.get('order_date'): t['order_date'] = t['order_date'].isoformat()
            result = {'transactions': txns, 'count': len(txns)}

        return jsonify({'exported_at': datetime.now().isoformat(), 'data': result, 'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cur.close(); conn.close()


@settings_bp.route('/settings/download-all-data', methods=['GET'])
def download_all_data():
    user_id, err, code = get_current_user(request)
    if err: return err, code
    conn = get_db_connection(); cur = conn.cursor(dictionary=True)
    try:
        result = {}

        cur.execute(
            "SELECT id,email,username,full_name,phone,country,state,city,gender,"
            "date_of_birth,about_me,website_url,created_at FROM users WHERE id=%s",
            (user_id,)
        )
        u = cur.fetchone()
        if u:
            for k, v in u.items():
                if hasattr(v, 'isoformat'): u[k] = v.isoformat()
        result['profile'] = u

        cur.execute("SELECT platform, url FROM user_social_links WHERE user_id=%s", (user_id,))
        result['social_links'] = cur.fetchall()

        cur.execute(
            "SELECT post_id,post_type,caption,price,total_sales,created_at "
            "FROM posts WHERE user_id=%s AND is_deleted=0 ORDER BY created_at DESC",
            (user_id,)
        )
        posts = cur.fetchall()
        for p in posts:
            if p.get('created_at'): p['created_at'] = p['created_at'].isoformat()
        result['posts'] = posts

        cur.execute(
            "SELECT order_id,product_name,quantity,total_amount,status,payment_status,order_date "
            "FROM product_orders WHERE buyer_id=%s ORDER BY order_date DESC",
            (user_id,)
        )
        orders = cur.fetchall()
        for o in orders:
            if o.get('order_date'): o['order_date'] = o['order_date'].isoformat()
        result['orders_as_buyer'] = orders

        cur.execute(
            "SELECT order_id,product_name,quantity,total_amount,status,payment_status,order_date "
            "FROM product_orders WHERE seller_id=%s ORDER BY order_date DESC",
            (user_id,)
        )
        sold = cur.fetchall()
        for o in sold:
            if o.get('order_date'): o['order_date'] = o['order_date'].isoformat()
        result['orders_as_seller'] = sold

        cur.execute(
            "SELECT booking_id,post_id,quoted_price,total_amount,status,booking_date "
            "FROM service_bookings WHERE customer_id=%s ORDER BY booking_date DESC",
            (user_id,)
        )
        bookings = cur.fetchall()
        for b in bookings:
            if b.get('booking_date'): b['booking_date'] = b['booking_date'].isoformat()
        result['service_bookings'] = bookings

        return jsonify({'exported_at': datetime.now().isoformat(), 'data': result, 'success': True})
    except Exception as e:
        print(f'❌ download_all_data: {e}')
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cur.close(); conn.close()