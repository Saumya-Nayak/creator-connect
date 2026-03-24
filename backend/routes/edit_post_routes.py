"""
routes/edit_post_routes.py  — FIXED
─────────────────────────────────────────────────────────────────────
KEY FIXES vs previous version:
  1. Uses the SAME token_required decorator pattern as upload_routes.py
     (reads JWT_SECRET_KEY from env, same error handling)
  2. Added detailed print() logging so you can see exactly what happens
     in your Flask terminal when variants/slots are saved
  3. _verify_post_owner uses cursor(dictionary=True) so row['user_id']
     works instead of row[0] (avoids TypeError on dict cursor)
  4. Route names prefixed with 'editpost_' to avoid blueprint conflicts

Register in app.py (if not already done):
    from routes.edit_post_routes import edit_post_bp
    app.register_blueprint(edit_post_bp, url_prefix='/api')
─────────────────────────────────────────────────────────────────────
"""

from flask import Blueprint, request, jsonify
from database.db import get_db_connection
import os, jwt
from functools import wraps

edit_post_bp = Blueprint('edit_post', __name__)

# ── Token decorator — identical pattern to upload_routes.py ──────────────────

def _token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'success': False, 'message': 'Invalid token format'}), 401
        if not token:
            return jsonify({'success': False, 'message': 'Authentication token is missing'}), 401
        try:
            SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-here')
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            current_user = {
                'id': data['user_id'],
                'email': data.get('email'),
                'username': data.get('username')
            }
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({'success': False, 'message': f'Invalid token: {str(e)}'}), 401
        except Exception as e:
            return jsonify({'success': False, 'message': 'Token validation failed'}), 401
        return f(current_user, *args, **kwargs)
    return decorated


def _verify_post_owner(cursor, post_id: int, user_id: int) -> bool:
    """Returns True if user_id owns post_id and it's not deleted."""
    cursor.execute(
        "SELECT user_id FROM posts WHERE post_id = %s AND is_deleted = FALSE",
        (post_id,)
    )
    row = cursor.fetchone()
    if not row:
        return False
    # Works for both dict cursor and tuple cursor
    owner = row['user_id'] if isinstance(row, dict) else row[0]
    return owner == user_id


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/posts/<post_id>/slots — list active time slots
# ─────────────────────────────────────────────────────────────────────────────

@edit_post_bp.route('/posts/<int:post_id>/slots', methods=['GET'])
def get_post_slots(post_id):
    """Returns active time slots for a post (no auth needed — public read)."""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT slot_id, slot_label, slot_display, duration_mins, is_active, sort_order
            FROM service_time_slots
            WHERE post_id = %s AND is_active = 1
            ORDER BY sort_order, slot_label
        """, (post_id,))
        slots = cursor.fetchall()
        cursor.close()
        connection.close()
        print(f"📋 GET slots for post {post_id}: {len(slots)} found")
        return jsonify({'success': True, 'slots': slots})
    except Exception as e:
        print(f"❌ get_post_slots error: {e}")
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# PUT /api/posts/<post_id>/variants/update
# ─────────────────────────────────────────────────────────────────────────────

@edit_post_bp.route('/posts/<int:post_id>/variants/update', methods=['PUT'])
@_token_required
def update_post_variants(current_user, post_id):
    """
    Full-replace all price variants for a service post.
    Body: { "variants": [{"name": str, "price": float,
                           "description": str|null, "duration_hours": float|null}] }
    """
    print(f"\n{'='*60}")
    print(f"📦 UPDATE VARIANTS — post {post_id} by user {current_user['id']}")

    try:
        body = request.get_json() or {}
        variants = body.get('variants', [])
        print(f"   Incoming variants count: {len(variants)}")
        for i, v in enumerate(variants):
            print(f"   [{i}] name={v.get('name')!r} price={v.get('price')}")

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        if not _verify_post_owner(cursor, post_id, current_user['id']):
            cursor.close(); connection.close()
            print(f"❌ Ownership check failed for post {post_id} / user {current_user['id']}")
            return jsonify({'success': False, 'message': 'Post not found or access denied'}), 403

        # Delete all existing variants for this post
        cursor.execute("DELETE FROM service_price_variants WHERE post_id = %s", (post_id,))
        deleted = cursor.rowcount
        print(f"   🗑️  Deleted {deleted} old variant(s)")

        saved = 0
        for idx, v in enumerate(variants):
            name = str(v.get('name', '')).strip()
            if not name:
                print(f"   ⚠️  Skipping variant {idx} — empty name")
                continue

            price = v.get('price')
            try:
                price = float(price)
                if price < 0:
                    raise ValueError("negative price")
            except (TypeError, ValueError) as pe:
                print(f"   ⚠️  Skipping variant '{name}' — invalid price: {price} ({pe})")
                continue

            description    = str(v.get('description', '')).strip() or None
            duration_hours = v.get('duration_hours')
            try:
                duration_hours = float(duration_hours) if duration_hours else None
            except (TypeError, ValueError):
                duration_hours = None

            cursor.execute("""
                INSERT INTO service_price_variants
                    (post_id, variant_name, description, price, duration_hours, is_active, sort_order)
                VALUES (%s, %s, %s, %s, %s, 1, %s)
            """, (post_id, name, description, price, duration_hours, idx))
            saved += 1
            print(f"   ✅ Saved variant: name={name!r} price=₹{price}")

        connection.commit()
        cursor.close()
        connection.close()

        print(f"✅ Variants update complete: {saved} saved for post {post_id}")
        print('='*60 + '\n')
        return jsonify({'success': True, 'message': f'{saved} variant(s) saved', 'count': saved})

    except Exception as e:
        print(f"❌ update_post_variants error: {e}")
        import traceback; traceback.print_exc()
        try:
            connection.rollback()
            cursor.close()
            connection.close()
        except Exception:
            pass
        return jsonify({'success': False, 'message': str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# PUT /api/posts/<post_id>/slots/update
# ─────────────────────────────────────────────────────────────────────────────

@edit_post_bp.route('/posts/<int:post_id>/slots/update', methods=['PUT'])
@_token_required
def update_post_slots(current_user, post_id):
    """
    Full-replace all time slots for a service post.
    Body: { "slots": [{"slot_label": "09:00", "slot_display": "9:00 AM",
                        "duration_mins": 60}] }
    """
    print(f"\n{'='*60}")
    print(f"⏰ UPDATE SLOTS — post {post_id} by user {current_user['id']}")

    try:
        body = request.get_json() or {}
        slots = body.get('slots', [])
        print(f"   Incoming slots count: {len(slots)}")
        for i, s in enumerate(slots):
            print(f"   [{i}] label={s.get('slot_label')!r} display={s.get('slot_display')!r} dur={s.get('duration_mins')}")

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        if not _verify_post_owner(cursor, post_id, current_user['id']):
            cursor.close(); connection.close()
            print(f"❌ Ownership check failed for post {post_id} / user {current_user['id']}")
            return jsonify({'success': False, 'message': 'Post not found or access denied'}), 403

        # Delete all existing slots
        cursor.execute("DELETE FROM service_time_slots WHERE post_id = %s", (post_id,))
        deleted = cursor.rowcount
        print(f"   🗑️  Deleted {deleted} old slot(s)")

        saved = 0
        for idx, s in enumerate(slots):
            label   = str(s.get('slot_label', '')).strip()
            display = str(s.get('slot_display', '')).strip()

            if not label or ':' not in label:
                print(f"   ⚠️  Skipping slot {idx} — invalid label: {label!r}")
                continue

            dur = s.get('duration_mins', 60)
            try:
                dur = int(dur) if dur else 60
            except (TypeError, ValueError):
                dur = 60

            cursor.execute("""
                INSERT INTO service_time_slots
                    (post_id, slot_label, slot_display, duration_mins, is_active, sort_order)
                VALUES (%s, %s, %s, %s, 1, %s)
            """, (post_id, label, display or label, dur, idx))
            saved += 1
            print(f"   ✅ Saved slot: {label} ({display}) {dur}min")

        connection.commit()
        cursor.close()
        connection.close()

        print(f"✅ Slots update complete: {saved} saved for post {post_id}")
        print('='*60 + '\n')
        return jsonify({'success': True, 'message': f'{saved} slot(s) saved', 'count': saved})

    except Exception as e:
        print(f"❌ update_post_slots error: {e}")
        import traceback; traceback.print_exc()
        try:
            connection.rollback()
            cursor.close()
            connection.close()
        except Exception:
            pass
        return jsonify({'success': False, 'message': str(e)}), 500