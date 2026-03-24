"""
routes/slot_routes.py
─────────────────────────────────────────────────────────────────────────────
Endpoints:
  GET  /api/posts/<post_id>/slots           → provider's defined slots
  GET  /api/posts/<post_id>/booked-slots    → taken slots on a date

Register in app.py:
  from routes.slot_routes import slot_bp
  app.register_blueprint(slot_bp, url_prefix='/api')
─────────────────────────────────────────────────────────────────────────────
"""

from flask import Blueprint, request, jsonify
from database.db import get_db_connection

slot_bp = Blueprint("slots", __name__)


@slot_bp.route("/posts/<int:post_id>/slots", methods=["GET"])
def get_post_slots(post_id):
    """
    Returns active time slots defined by the provider for a service post.
    Response: { success, slots: [{slot_id, slot_label, slot_display, duration_mins}] }
    """
    try:
        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT slot_id, slot_label, slot_display, duration_mins
            FROM service_time_slots
            WHERE post_id = %s AND is_active = 1
            ORDER BY sort_order, slot_label
        """, (post_id,))
        slots = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify({"success": True, "slots": slots})
    except Exception as e:
        print(f"❌ get_post_slots error: {e}")
        return jsonify({"success": False, "message": str(e), "slots": []}), 500


@slot_bp.route("/posts/<int:post_id>/booked-slots", methods=["GET"])
def get_booked_slots(post_id):
    """
    Returns list of booked slot labels (HH:MM) for a given date.
    Query param: ?date=YYYY-MM-DD

    Response: { success, date, booked_slots: ["09:00", "14:00"] }
    Excludes cancelled/rejected bookings so those slots are freed up.
    """
    date_str = request.args.get("date", "").strip()
    if not date_str:
        return jsonify({"success": False, "message": "date parameter required"}), 400

    try:
        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                booked_slot,
                -- Fallback: if booked_slot not saved, use preferred_time (HH:MM format)
                CASE
                    WHEN booked_slot IS NOT NULL THEN booked_slot
                    WHEN preferred_time IS NOT NULL
                         THEN DATE_FORMAT(preferred_time, '%H:%i')
                    ELSE NULL
                END AS effective_slot
            FROM service_bookings
            WHERE post_id = %s
              AND preferred_start_date = %s
              AND (booked_slot IS NOT NULL OR preferred_time IS NOT NULL)
              AND status NOT IN ('cancelled', 'rejected')
        """, (post_id, date_str))
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        booked = [r["effective_slot"] for r in rows if r.get("effective_slot")]
        return jsonify({"success": True, "booked_slots": booked, "date": date_str})
    except Exception as e:
        print(f"❌ get_booked_slots error: {e}")
        return jsonify({"success": False, "message": str(e), "booked_slots": []}), 500


print("✅ slot_routes.py loaded")