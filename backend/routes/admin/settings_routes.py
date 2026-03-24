"""
routes/admin/settings_routes.py
────────────────────────────────────────────────────────────────────────────
Admin Settings Routes — CreatorConnect

Covers:
  - GET  /api/admin/settings/profile                  → own admin profile
  - PUT  /api/admin/settings/profile                  → update own profile
  - PUT  /api/admin/settings/change-password          → change own password
  - GET  /api/admin/settings/sessions                 → paginated admin_sessions
  - DELETE /api/admin/settings/sessions/<id>/revoke   → revoke a session
  - GET  /api/admin/settings/admins                   → list all admin users
  - GET  /api/admin/settings/admins/search-users      → search regular users
  - POST /api/admin/settings/admins/assign            → promote user to admin
  - DELETE /api/admin/settings/admins/<id>/revoke     → remove admin role

401 FIX: _get_admin_id() validates the Bearer token directly against the
admin_sessions DB table — no JWT secret needed, no signature mismatch possible.
"""

import os
import jwt
from datetime import datetime
from flask import Blueprint, jsonify, request, g
from database.db import get_db_connection

try:
    from werkzeug.security import generate_password_hash, check_password_hash
except ImportError:
    import hashlib
    def generate_password_hash(pw): return hashlib.sha256(pw.encode()).hexdigest()
    def check_password_hash(stored, pw): return stored == hashlib.sha256(pw.encode()).hexdigest()

admin_settings_bp = Blueprint("admin_settings", __name__)

JWT_SECRET = (
    os.environ.get("JWT_SECRET_KEY")
    or os.environ.get("JWT_SECRET")
    or os.environ.get("SECRET_KEY")
    or "your-secret-key"
)


# ─── Helper: extract admin user_id ───────────────────────────────────────────
def _get_admin_id(req=None):
    # 1. flask.g set by app.py before_request
    for attr in ("admin_id", "current_user_id", "user_id", "current_admin_id"):
        val = getattr(g, attr, None)
        if val:
            return int(val)

    r = req or request
    auth = r.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:]

    # 2. DB session lookup — bypasses JWT secret entirely
    try:
        conn = get_db_connection()
        cur  = conn.cursor(dictionary=True)
        cur.execute(
            """
            SELECT user_id FROM admin_sessions
            WHERE token = %s AND is_active = 1 AND expires_at > NOW()
            LIMIT 1
            """,
            (token,),
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        if row:
            return int(row["user_id"])
    except Exception as e:
        print(f"⚠️  _get_admin_id DB lookup error: {e}")

    # 3. JWT decode fallback
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        for key in ("user_id", "id", "admin_id", "sub", "userId"):
            val = payload.get(key)
            if val:
                return int(val)
    except Exception as e:
        print(f"⚠️  _get_admin_id JWT decode error: {e}")

    return None


# ─── Helper: write to admin_activity_log ─────────────────────────────────────
def log_admin_activity(conn, admin_id, action_type, action_details=None):
    if not admin_id:
        return
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO admin_activity_log
                (admin_id, action_type, action_details, ip_address, user_agent, created_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
            """,
            (
                admin_id,
                action_type,
                action_details,
                request.remote_addr,
                request.headers.get("User-Agent", "")[:500],
            ),
        )
        cur.close()
    except Exception as e:
        print(f"⚠️  Could not write activity log: {e}")

_log_activity = log_admin_activity


# ─── Serialisers ──────────────────────────────────────────────────────────────
def _iso(v):
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.isoformat()
    if hasattr(v, "isoformat"):
        return v.isoformat()
    return v


def _serialize_session(r):
    now = datetime.utcnow()
    exp = r.get("expires_at")
    active = bool(r.get("is_active")) and (
        exp is None or (isinstance(exp, datetime) and exp > now)
    )
    token_raw = r.get("token") or ""
    return {
        "session_id":     r["session_id"],
        "user_id":        r["user_id"],
        "admin_username": r.get("admin_username"),
        "admin_name":     r.get("admin_name"),
        "ip_address":     r.get("ip_address"),
        "user_agent":     r.get("user_agent"),
        "created_at":     _iso(r.get("created_at")),
        "expires_at":     _iso(exp),
        "is_active":      bool(r.get("is_active")),
        "is_active_now":  active,
        "token_prefix":   token_raw[:16],
    }


# ════════════════════════════════════════════════════════════════════════════
#  PROFILE
# ════════════════════════════════════════════════════════════════════════════

@admin_settings_bp.route("/api/admin/settings/profile", methods=["GET"])
def get_profile():
    admin_id = _get_admin_id()
    if not admin_id:
        return jsonify({"error": "Unauthorised — invalid or missing token"}), 401
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT id, username, email, full_name, phone, profile_pic, website_url "
        "FROM users WHERE id = %s AND role >= 1",
        (admin_id,),
    )
    user = cur.fetchone()
    cur.close()
    conn.close()
    if not user:
        return jsonify({"error": "Admin not found"}), 404
    return jsonify({
        "user": {
            "id":          user["id"],
            "username":    user["username"],
            "email":       user["email"],
            "full_name":   user["full_name"],
            "phone":       user["phone"],
            "profile_pic": user["profile_pic"],
            "website_url": user["website_url"],
        }
    })


@admin_settings_bp.route("/api/admin/settings/profile", methods=["PUT"])
def update_profile():
    admin_id = _get_admin_id()
    if not admin_id:
        return jsonify({"error": "Unauthorised — invalid or missing token"}), 401

    data        = request.get_json() or {}
    full_name   = (data.get("full_name")   or "").strip() or None
    username    = (data.get("username")    or "").strip() or None
    email       = (data.get("email")       or "").strip()
    phone       = (data.get("phone")       or "").strip() or None
    website_url = (data.get("website_url") or "").strip() or None

    if not email:
        return jsonify({"error": "Email is required"}), 400

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    cur.execute("SELECT id FROM users WHERE email = %s AND id != %s", (email, admin_id))
    if cur.fetchone():
        cur.close(); conn.close()
        return jsonify({"error": "Email already in use by another account"}), 409

    if username:
        cur.execute("SELECT id FROM users WHERE username = %s AND id != %s", (username, admin_id))
        if cur.fetchone():
            cur.close(); conn.close()
            return jsonify({"error": "Username already taken"}), 409

    cur.execute(
        """
        UPDATE users
        SET full_name = %s, username = %s, email = %s, phone = %s, website_url = %s
        WHERE id = %s AND role >= 1
        """,
        (full_name, username, email, phone, website_url, admin_id),
    )
    _log_activity(conn, admin_id, "profile_update", f"Admin #{admin_id} updated their profile")
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"success": True, "message": "Profile updated"})


@admin_settings_bp.route("/api/admin/settings/change-password", methods=["PUT"])
def change_password():
    admin_id = _get_admin_id()
    if not admin_id:
        return jsonify({"error": "Unauthorised — invalid or missing token"}), 401

    data       = request.get_json() or {}
    current_pw = (data.get("current_password") or "").strip()
    new_pw     = (data.get("new_password")     or "").strip()

    if not current_pw or not new_pw:
        return jsonify({"error": "Both current and new password are required"}), 400
    if len(new_pw) < 8:
        return jsonify({"error": "New password must be at least 8 characters"}), 400

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute("SELECT password FROM users WHERE id = %s AND role >= 1", (admin_id,))
    row = cur.fetchone()
    if not row:
        cur.close(); conn.close()
        return jsonify({"error": "Admin not found"}), 404

    if not check_password_hash(row["password"], current_pw):
        cur.close(); conn.close()
        return jsonify({"error": "Current password is incorrect"}), 403

    cur.execute("UPDATE users SET password = %s WHERE id = %s", (generate_password_hash(new_pw), admin_id))
    cur.execute(
        "UPDATE admin_sessions SET is_active = 0 WHERE user_id = %s AND is_active = 1",
        (admin_id,),
    )
    _log_activity(conn, admin_id, "password_change", f"Admin #{admin_id} changed their password")
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"success": True, "message": "Password changed. Other sessions have been signed out."})


# ════════════════════════════════════════════════════════════════════════════
#  ADMIN SESSIONS
# ════════════════════════════════════════════════════════════════════════════

@admin_settings_bp.route("/api/admin/settings/sessions", methods=["GET"])
def get_sessions():
    page   = max(int(request.args.get("page",  1)), 1)
    limit  = min(int(request.args.get("limit", 20)), 100)
    offset = (page - 1) * limit
    search = request.args.get("search", "").strip()
    status = request.args.get("status", "").strip()

    conditions, params = [], []
    if status == "active":
        conditions.append("s.is_active = 1 AND s.expires_at > NOW()")
    elif status == "expired":
        conditions.append("(s.is_active = 0 OR s.expires_at <= NOW())")
    if search:
        conditions.append(
            "(u.username LIKE %s OR u.full_name LIKE %s OR s.ip_address LIKE %s)"
        )
        like = f"%{search}%"
        params += [like, like, like]

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        cur.execute(
            f"SELECT COUNT(*) AS cnt FROM admin_sessions s "
            f"JOIN users u ON s.user_id = u.id {where}",
            params,
        )
        total = int(cur.fetchone()["cnt"])
        cur.execute(
            f"""
            SELECT s.session_id, s.user_id, s.token, s.ip_address,
                   s.user_agent, s.created_at, s.expires_at, s.is_active,
                   u.username AS admin_username, u.full_name AS admin_name
            FROM admin_sessions s
            JOIN users u ON s.user_id = u.id
            {where}
            ORDER BY s.created_at DESC
            LIMIT %s OFFSET %s
            """,
            params + [limit, offset],
        )
        rows = cur.fetchall()
    except Exception as e:
        print(f"⚠️  Sessions query error: {e}")
        cur.close(); conn.close()
        return jsonify({"sessions": [], "total": 0, "page": page, "limit": limit, "pages": 1})

    cur.close()
    conn.close()
    return jsonify({
        "sessions": [_serialize_session(r) for r in rows],
        "total":    total,
        "page":     page,
        "limit":    limit,
        "pages":    max((total + limit - 1) // limit, 1),
    })


@admin_settings_bp.route("/api/admin/settings/sessions/<int:session_id>/revoke", methods=["DELETE"])
def revoke_session(session_id):
    admin_id = _get_admin_id()
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "SELECT s.*, u.username AS admin_username FROM admin_sessions s "
            "JOIN users u ON s.user_id = u.id WHERE s.session_id = %s",
            (session_id,),
        )
        sess = cur.fetchone()
        if not sess:
            cur.close(); conn.close()
            return jsonify({"error": "Session not found"}), 404
        if not sess["is_active"]:
            cur.close(); conn.close()
            return jsonify({"error": "Session is already inactive"}), 400

        cur.execute("UPDATE admin_sessions SET is_active = 0 WHERE session_id = %s", (session_id,))
        _log_activity(conn, admin_id, "settings_update",
                      f"Revoked session #{session_id} of @{sess['admin_username']}")
        conn.commit()
    except Exception as e:
        print(f"⚠️  Revoke session error: {e}")
        cur.close(); conn.close()
        return jsonify({"error": "Failed to revoke session"}), 500

    cur.close()
    conn.close()
    return jsonify({"success": True, "message": f"Session #{session_id} revoked"})


# ════════════════════════════════════════════════════════════════════════════
#  ADMIN MANAGEMENT
# ════════════════════════════════════════════════════════════════════════════

@admin_settings_bp.route("/api/admin/settings/admins", methods=["GET"])
def list_admins():
    """Return all users with role >= 1 (paginated + search)."""
    admin_id = _get_admin_id()
    if not admin_id:
        return jsonify({"error": "Unauthorised"}), 401

    page   = max(int(request.args.get("page",  1)), 1)
    limit  = min(int(request.args.get("limit", 20)), 100)
    offset = (page - 1) * limit
    search = request.args.get("search", "").strip()

    conditions = ["role >= 1"]
    params     = []
    if search:
        conditions.append("(username LIKE %s OR full_name LIKE %s OR email LIKE %s)")
        like = f"%{search}%"
        params += [like, like, like]

    where = "WHERE " + " AND ".join(conditions)

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        cur.execute(f"SELECT COUNT(*) AS cnt FROM users {where}", params)
        total = int(cur.fetchone()["cnt"])
        cur.execute(
            f"""
            SELECT id, username, full_name, email, phone, profile_pic,
                   role, created_at, last_login
            FROM users {where}
            ORDER BY role DESC, created_at ASC
            LIMIT %s OFFSET %s
            """,
            params + [limit, offset],
        )
        rows = cur.fetchall()
    except Exception as e:
        print(f"⚠️  List admins error: {e}")
        cur.close(); conn.close()
        return jsonify({"admins": [], "total": 0, "page": page, "pages": 1})

    cur.close()
    conn.close()
    return jsonify({
        "admins": [
            {
                "id":          r["id"],
                "username":    r["username"],
                "full_name":   r["full_name"],
                "email":       r["email"],
                "phone":       r["phone"],
                "profile_pic": r["profile_pic"],
                "role":        r["role"],
                "created_at":  _iso(r["created_at"]),
                "last_login":  _iso(r["last_login"]),
            }
            for r in rows
        ],
        "total": total,
        "page":  page,
        "limit": limit,
        "pages": max((total + limit - 1) // limit, 1),
    })


@admin_settings_bp.route("/api/admin/settings/admins/search-users", methods=["GET"])
def search_users_for_admin():
    """Search regular users (role = 0) to pick one to assign as admin."""
    admin_id = _get_admin_id()
    if not admin_id:
        return jsonify({"error": "Unauthorised"}), 401

    q = request.args.get("q", "").strip()
    if len(q) < 2:
        return jsonify({"users": []})

    like = f"%{q}%"
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        cur.execute(
            """
            SELECT id, username, full_name, email, profile_pic, created_at
            FROM users
            WHERE role = 0
              AND (username LIKE %s OR full_name LIKE %s OR email LIKE %s)
            ORDER BY username ASC
            LIMIT 10
            """,
            (like, like, like),
        )
        rows = cur.fetchall()
    except Exception as e:
        print(f"⚠️  Search users error: {e}")
        cur.close(); conn.close()
        return jsonify({"users": []})

    cur.close()
    conn.close()
    return jsonify({
        "users": [
            {
                "id":          r["id"],
                "username":    r["username"],
                "full_name":   r["full_name"],
                "email":       r["email"],
                "profile_pic": r["profile_pic"],
                "created_at":  _iso(r["created_at"]),
            }
            for r in rows
        ]
    })


@admin_settings_bp.route("/api/admin/settings/admins/assign", methods=["POST"])
def assign_admin():
    """Promote a regular user (role 0) to admin (role 1)."""
    actor_id = _get_admin_id()
    if not actor_id:
        return jsonify({"error": "Unauthorised"}), 401

    data    = request.get_json() or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "SELECT id, username, full_name, email, role FROM users WHERE id = %s",
            (user_id,),
        )
        user = cur.fetchone()
        if not user:
            cur.close(); conn.close()
            return jsonify({"error": "User not found"}), 404
        if user["role"] >= 1:
            cur.close(); conn.close()
            return jsonify({"error": "User is already an admin"}), 409

        cur.execute("UPDATE users SET role = 1 WHERE id = %s", (user_id,))
        _log_activity(conn, actor_id, "settings_update",
                      f"Assigned admin role to @{user['username']} (ID #{user_id})")
        conn.commit()
    except Exception as e:
        print(f"⚠️  Assign admin error: {e}")
        cur.close(); conn.close()
        return jsonify({"error": "Failed to assign admin role"}), 500

    cur.close()
    conn.close()
    return jsonify({
        "success": True,
        "message": f"@{user['username']} is now an admin",
        "user": {"id": user["id"], "username": user["username"], "email": user["email"]},
    })


@admin_settings_bp.route("/api/admin/settings/admins/<int:target_id>/revoke", methods=["DELETE"])
def revoke_admin(target_id):
    """Demote an admin back to regular user. Cannot demote yourself."""
    actor_id = _get_admin_id()
    if not actor_id:
        return jsonify({"error": "Unauthorised"}), 401
    if int(target_id) == int(actor_id):
        return jsonify({"error": "You cannot remove your own admin role"}), 403

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id, username, role FROM users WHERE id = %s", (target_id,))
        user = cur.fetchone()
        if not user:
            cur.close(); conn.close()
            return jsonify({"error": "User not found"}), 404
        if user["role"] < 1:
            cur.close(); conn.close()
            return jsonify({"error": "User is not an admin"}), 400

        cur.execute("UPDATE users SET role = 0 WHERE id = %s", (target_id,))
        # Invalidate all sessions of the ex-admin
        cur.execute(
            "UPDATE admin_sessions SET is_active = 0 WHERE user_id = %s",
            (target_id,),
        )
        _log_activity(conn, actor_id, "settings_update",
                      f"Removed admin role from @{user['username']} (ID #{target_id})")
        conn.commit()
    except Exception as e:
        print(f"⚠️  Revoke admin error: {e}")
        cur.close(); conn.close()
        return jsonify({"error": "Failed to remove admin role"}), 500

    cur.close()
    conn.close()
    return jsonify({"success": True, "message": f"@{user['username']} admin access removed"})