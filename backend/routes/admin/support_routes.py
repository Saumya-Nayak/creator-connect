"""
routes/admin/support_routes.py
────────────────────────────────────────────────────────────────────────────
Admin Support / Help-Desk Routes — CreatorConnect
Register in app.py:
    from routes.admin.support_routes import support_bp
    app.register_blueprint(support_bp)
"""

from flask import Blueprint, jsonify, request
from database.db import get_db_connection
from routes.admin.admin_auth import admin_required
from flask_mail import Message
from config.app_config import mail
from datetime import datetime, timedelta

support_bp = Blueprint('admin_support', __name__)

BRAND   = "#e336cc"
ACCENT  = "#9b27af"
GRAD    = "linear-gradient(135deg,#e336cc 0%,#9b27af 100%)"
FROM    = ("Creator Connect", "saumyan24@gmail.com")

# ── Email layout (reuses same template style as deal_email_service) ──────────
def _wrap_email(body: str, preview: str = "") -> str:
    pre = f'<div style="display:none;max-height:0;overflow:hidden;">{preview}&nbsp;</div>' if preview else ""
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Creator Connect Support</title></head>
<body style="margin:0;padding:0;background:#f0e8f8;font-family:'Segoe UI',Arial,sans-serif;">
{pre}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0e8f8;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0"
  style="max-width:600px;width:100%;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(227,54,204,.18);">
  <tr>
    <td style="background:{GRAD};padding:28px 40px 22px;text-align:center;">
      <p style="margin:0;font-size:27px;font-weight:800;color:#fff;letter-spacing:-.5px;">Creator Connect</p>
      <p style="margin:5px 0 0;font-size:11px;color:rgba(255,255,255,.75);letter-spacing:2px;text-transform:uppercase;">Support Center</p>
    </td>
  </tr>
  <tr><td style="padding:36px 40px 28px;">{body}</td></tr>
  <tr>
    <td style="background:#f8e8fb;padding:18px 40px;text-align:center;border-top:1px solid #f0d0f0;">
      <p style="margin:0;font-size:12px;color:#aaa;">&copy; 2025 Creator Connect &middot; All rights reserved</p>
      <p style="margin:4px 0 0;font-size:11px;color:#ccc;">You received this because you have an open support ticket.</p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body></html>"""


def _send_support_email(subject: str, to_email: str, html: str) -> bool:
    try:
        mail.send(Message(subject=subject, sender=FROM, recipients=[to_email], html=html))
        print(f"✅ Support email → {to_email} | {subject}")
        return True
    except Exception as e:
        print(f"❌ Support email FAILED → {to_email} | {e}")
        return False


def send_ticket_reply_email(user_email: str, user_name: str, ticket_id: int,
                             subject: str, admin_reply: str, new_status: str = None) -> bool:
    """Send reply acknowledgement email to user."""
    status_block = ""
    if new_status:
        status_colors = {
            "open":        ("#eab308", "🟡"),
            "in_progress": ("#3b82f6", "🔵"),
            "resolved":    ("#22c55e", "🟢"),
            "closed":      ("#888",    "⚫"),
        }
        color, dot = status_colors.get(new_status, ("#888", "•"))
        status_label = new_status.replace("_", " ").title()
        status_block = f"""
<div style="background:#f8e8fb;border-left:4px solid {BRAND};padding:12px 16px;border-radius:8px;margin-bottom:20px;">
  <p style="margin:0;font-size:12px;color:{ACCENT};font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Ticket Status Updated</p>
  <p style="margin:6px 0 0;font-size:14px;font-weight:800;color:{color};">{dot} {status_label}</p>
</div>"""

    body = f"""
<div style="text-align:center;margin-bottom:28px;">
  <div style="font-size:48px;margin-bottom:10px;">💬</div>
  <h2 style="margin:0 0 8px;font-size:22px;color:#1a1a2e;font-weight:800;">We've responded to your ticket</h2>
  <p style="margin:0;font-size:14px;color:#888;">Hi <strong>{user_name}</strong>, here's an update on your support request.</p>
</div>

<table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;margin-bottom:20px;">
  <tr>
    <td style="padding:10px 14px;font-size:13px;color:#777;background:#f8e8fb;border-bottom:1px solid #f0dff5;width:42%;">🎫&nbsp;Ticket ID</td>
    <td style="padding:10px 14px;font-size:13px;color:#1a1a2e;font-weight:700;background:#f8e8fb;border-bottom:1px solid #f0dff5;">#{ticket_id}</td>
  </tr>
  <tr>
    <td style="padding:10px 14px;font-size:13px;color:#777;background:#f8e8fb;border-bottom:1px solid #f0dff5;">📋&nbsp;Subject</td>
    <td style="padding:10px 14px;font-size:13px;color:#1a1a2e;font-weight:700;background:#f8e8fb;border-bottom:1px solid #f0dff5;">{subject}</td>
  </tr>
  <tr>
    <td style="padding:10px 14px;font-size:13px;color:#777;background:#f8e8fb;">📅&nbsp;Date</td>
    <td style="padding:10px 14px;font-size:13px;color:#1a1a2e;font-weight:700;background:#f8e8fb;">{datetime.utcnow().strftime('%d %b %Y, %H:%M UTC')}</td>
  </tr>
</table>

{status_block}

<div style="margin-bottom:24px;">
  <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.5px;">💬 Admin Reply</p>
  <div style="background:#f8f0ff;border:1px solid #e8d8f8;border-radius:12px;padding:18px 20px;font-size:14px;color:#333;line-height:1.75;white-space:pre-wrap;">{admin_reply}</div>
</div>

<div style="background:#fff8e1;border-left:4px solid #ffca28;padding:14px 18px;border-radius:8px;margin-bottom:24px;">
  <p style="margin:0;font-size:13px;color:#7a5f00;font-weight:700;">💡 Need more help?</p>
  <p style="margin:6px 0 0;font-size:13px;color:#7a5f00;line-height:1.65;">
    If you need further assistance, reply to this email or log back in and submit another ticket.
    Our team typically responds within 24 hours.
  </p>
</div>
"""
    html = _wrap_email(body, f"Support update on ticket #{ticket_id}: {subject}")
    return _send_support_email(
        f"[Support #T{ticket_id:04d}] {subject} — Creator Connect",
        user_email, html
    )


def send_ticket_ack_email(user_email: str, user_name: str, ticket_id: int,
                           subject: str, category: str) -> bool:
    """Send auto-acknowledgement when a new ticket is created by user (optional hook)."""
    body = f"""
<div style="text-align:center;margin-bottom:28px;">
  <div style="font-size:48px;margin-bottom:10px;">🎫</div>
  <h2 style="margin:0 0 8px;font-size:22px;color:#1a1a2e;font-weight:800;">We received your support request</h2>
  <p style="margin:0;font-size:14px;color:#888;">Hi <strong>{user_name}</strong>, your ticket has been submitted successfully.</p>
</div>
<table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;margin-bottom:20px;">
  <tr>
    <td style="padding:10px 14px;font-size:13px;color:#777;background:#f8e8fb;border-bottom:1px solid #f0dff5;width:42%;">🎫&nbsp;Ticket ID</td>
    <td style="padding:10px 14px;font-size:13px;color:#1a1a2e;font-weight:700;background:#f8e8fb;border-bottom:1px solid #f0dff5;">#{ticket_id}</td>
  </tr>
  <tr>
    <td style="padding:10px 14px;font-size:13px;color:#777;background:#f8e8fb;border-bottom:1px solid #f0dff5;">📋&nbsp;Subject</td>
    <td style="padding:10px 14px;font-size:13px;color:#1a1a2e;font-weight:700;background:#f8e8fb;border-bottom:1px solid #f0dff5;">{subject}</td>
  </tr>
  <tr>
    <td style="padding:10px 14px;font-size:13px;color:#777;background:#f8e8fb;">🏷️&nbsp;Category</td>
    <td style="padding:10px 14px;font-size:13px;color:#1a1a2e;font-weight:700;background:#f8e8fb;">{category.title()}</td>
  </tr>
</table>
<div style="background:#e8f5e9;border-left:4px solid #4caf50;padding:14px 18px;border-radius:8px;margin-bottom:24px;">
  <p style="margin:0;font-size:13px;color:#2e7d32;font-weight:700;">✅ What happens next?</p>
  <p style="margin:6px 0 0;font-size:13px;color:#2e7d32;line-height:1.65;">
    Our support team will review your request and respond within <strong>24–48 hours</strong>.
    You'll receive an email when we reply.
  </p>
</div>
"""
    html = _wrap_email(body, f"Support ticket #{ticket_id} received — we'll be in touch!")
    return _send_support_email(
        f"[Support #T{ticket_id:04d}] Ticket Received — {subject}",
        user_email, html
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  STATS
# ═══════════════════════════════════════════════════════════════════════════════

@support_bp.route('/api/admin/support/stats', methods=['GET'])
@admin_required
def support_stats():
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    # Count by status
    cur.execute("""
        SELECT status, COUNT(*) AS cnt
        FROM support_tickets
        GROUP BY status
    """)
    by_status = {r['status']: r['cnt'] for r in cur.fetchall()}

    # Count by priority
    cur.execute("""
        SELECT COUNT(*) AS cnt FROM support_tickets WHERE priority = 'high'
    """)
    high_priority = int(cur.fetchone()['cnt'])

    # Weekly ticket count — last 8 weeks
    cur.execute("""
        SELECT
            YEARWEEK(created_at, 1)        AS yw,
            DATE_FORMAT(MIN(created_at), '%%d %%b') AS week_label,
            COUNT(*) AS cnt
        FROM support_tickets
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 8 WEEK)
        GROUP BY yw
        ORDER BY yw ASC
    """)
    weekly = [{'week': r['yw'], 'week_label': r['week_label'], 'count': int(r['cnt'])} for r in cur.fetchall()]

    cur.close()
    conn.close()

    return jsonify({
        'open':          by_status.get('open', 0),
        'in_progress':   by_status.get('in_progress', 0),
        'resolved':      by_status.get('resolved', 0),
        'closed':        by_status.get('closed', 0),
        'high_priority': high_priority,
        'by_status':     by_status,
        'weekly':        weekly,
    })


# ═══════════════════════════════════════════════════════════════════════════════
#  LIST TICKETS
# ═══════════════════════════════════════════════════════════════════════════════

@support_bp.route('/api/admin/support/tickets', methods=['GET'])
@admin_required
def list_tickets():
    search   = request.args.get('search',   '').strip()
    status   = request.args.get('status',   '').strip()
    priority = request.args.get('priority', '').strip()
    category = request.args.get('category', '').strip()
    page     = max(int(request.args.get('page',  1)), 1)
    limit    = min(int(request.args.get('limit', 18)), 100)
    offset   = (page - 1) * limit

    valid_statuses   = ('open', 'in_progress', 'resolved', 'closed')
    valid_priorities = ('low', 'medium', 'high')
    valid_categories = ('technical', 'account', 'billing', 'content', 'other')

    conditions, params = [], []

    if status in valid_statuses:
        conditions.append("st.status = %s")
        params.append(status)

    if priority in valid_priorities:
        conditions.append("st.priority = %s")
        params.append(priority)

    if category in valid_categories:
        conditions.append("st.category = %s")
        params.append(category)

    if search:
        conditions.append("(st.subject LIKE %s OR st.message LIKE %s OR u.full_name LIKE %s OR u.username LIKE %s OR u.email LIKE %s)")
        like = f'%{search}%'
        params += [like, like, like, like, like]

    where = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    cur.execute(f"""
        SELECT COUNT(*) AS cnt
        FROM support_tickets st
        LEFT JOIN users u ON st.user_id = u.id
        {where}
    """, params)
    total = int(cur.fetchone()['cnt'])

    cur.execute(f"""
        SELECT
            st.ticket_id, st.subject, st.message, st.category,
            st.status, st.priority, st.created_at, st.updated_at,
            u.id         AS user_id,
            u.username   AS user_username,
            u.full_name  AS user_name,
            u.email      AS user_email,
            u.profile_pic AS user_avatar
        FROM support_tickets st
        LEFT JOIN users u ON st.user_id = u.id
        {where}
        ORDER BY
            CASE st.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
            CASE st.status WHEN 'open' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END,
            st.created_at DESC
        LIMIT %s OFFSET %s
    """, params + [limit, offset])

    rows = cur.fetchall()
    cur.close()
    conn.close()

    return jsonify({
        'tickets': [_serialize_ticket(r) for r in rows],
        'total':   total,
        'page':    page,
        'limit':   limit,
        'pages':   (total + limit - 1) // limit if total else 1,
    })


# ═══════════════════════════════════════════════════════════════════════════════
#  GET SINGLE TICKET
# ═══════════════════════════════════════════════════════════════════════════════

@support_bp.route('/api/admin/support/tickets/<int:ticket_id>', methods=['GET'])
@admin_required
def get_ticket(ticket_id):
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT
            st.ticket_id, st.subject, st.message, st.category,
            st.status, st.priority, st.created_at, st.updated_at,
            u.id         AS user_id,
            u.username   AS user_username,
            u.full_name  AS user_name,
            u.email      AS user_email,
            u.profile_pic AS user_avatar
        FROM support_tickets st
        LEFT JOIN users u ON st.user_id = u.id
        WHERE st.ticket_id = %s
    """, (ticket_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return jsonify({'error': 'Ticket not found'}), 404
    return jsonify(_serialize_ticket(row))


# ═══════════════════════════════════════════════════════════════════════════════
#  REPLY TO TICKET  (sends email)
# ═══════════════════════════════════════════════════════════════════════════════

@support_bp.route('/api/admin/support/tickets/<int:ticket_id>/reply', methods=['POST'])
@admin_required
def reply_ticket(ticket_id):
    data  = request.get_json() or {}
    reply = (data.get('reply') or '').strip()
    new_status = (data.get('status') or '').strip() or None

    if not reply:
        return jsonify({'error': 'Reply message is required'}), 400

    valid_statuses = ('open', 'in_progress', 'resolved', 'closed')
    if new_status and new_status not in valid_statuses:
        return jsonify({'error': 'Invalid status'}), 400

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    cur.execute("""
        SELECT st.*, u.email AS user_email, u.full_name AS user_name, u.username AS user_username
        FROM support_tickets st
        LEFT JOIN users u ON st.user_id = u.id
        WHERE st.ticket_id = %s
    """, (ticket_id,))
    ticket = cur.fetchone()
    if not ticket:
        cur.close(); conn.close()
        return jsonify({'error': 'Ticket not found'}), 404

    # Update status if provided
    if new_status:
        cur.execute("""
            UPDATE support_tickets SET status = %s, updated_at = NOW()
            WHERE ticket_id = %s
        """, (new_status, ticket_id))
    else:
        # At minimum update updated_at to mark as replied
        cur.execute("""
            UPDATE support_tickets SET updated_at = NOW()
            WHERE ticket_id = %s
        """, (ticket_id,))

    conn.commit()
    cur.close()
    conn.close()

    # Send acknowledgement email
    user_email = ticket.get('user_email')
    user_name  = ticket.get('user_name') or ticket.get('user_username') or 'User'
    email_sent = False
    if user_email:
        email_sent = send_ticket_reply_email(
            user_email  = user_email,
            user_name   = user_name,
            ticket_id   = ticket_id,
            subject     = ticket['subject'],
            admin_reply = reply,
            new_status  = new_status,
        )

    return jsonify({
        'success':    True,
        'email_sent': email_sent,
        'message':    f'Reply sent{"" if not new_status else f" and status updated to {new_status}"}.' +
                      (f' Email delivered to {user_email}.' if email_sent else ' Note: email could not be sent.'),
    })


# ═══════════════════════════════════════════════════════════════════════════════
#  CHANGE STATUS ONLY
# ═══════════════════════════════════════════════════════════════════════════════

@support_bp.route('/api/admin/support/tickets/<int:ticket_id>/status', methods=['PUT'])
@admin_required
def update_ticket_status(ticket_id):
    data   = request.get_json() or {}
    status = (data.get('status') or '').strip()
    valid  = ('open', 'in_progress', 'resolved', 'closed')
    if status not in valid:
        return jsonify({'error': 'Invalid status. Must be one of: ' + ', '.join(valid)}), 400

    conn = get_db_connection()
    cur  = conn.cursor()
    cur.execute("""
        UPDATE support_tickets SET status = %s, updated_at = NOW()
        WHERE ticket_id = %s
    """, (status, ticket_id))
    affected = cur.rowcount
    conn.commit()
    cur.close()
    conn.close()

    if not affected:
        return jsonify({'error': 'Ticket not found'}), 404

    return jsonify({'success': True, 'message': f'Status updated to {status}'})


# ═══════════════════════════════════════════════════════════════════════════════
#  SERIALIZER
# ═══════════════════════════════════════════════════════════════════════════════

def _iso(v):
    if v is None: return None
    if isinstance(v, datetime): return v.isoformat()
    if hasattr(v, 'isoformat'): return v.isoformat()
    return v

def _serialize_ticket(r):
    return {
        'ticket_id':      r['ticket_id'],
        'subject':        r['subject'],
        'message':        r['message'],
        'category':       r['category'],
        'status':         r['status'],
        'priority':       r['priority'],
        'created_at':     _iso(r.get('created_at')),
        'updated_at':     _iso(r.get('updated_at')),
        'user_id':        r.get('user_id'),
        'user_username':  r.get('user_username'),
        'user_name':      r.get('user_name'),
        'user_email':     r.get('user_email'),
        'user_avatar':    r.get('user_avatar'),
    }