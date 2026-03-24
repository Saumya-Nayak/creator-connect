"""
routes/upload_routes.py  — PHASE 1 + GEOCODING PATCH + FIX 5 (PICKUP SUPPORT) + FIX 6 (None.strip crash)
─────────────────────────────────────────────────────────────────────────────
FIX 6 Changes (on top of FIX 5):
  ✅ update_post_route: all pincode .strip() calls now use (val or '').strip()
     so None values (e.g. when mode=shipping clears pickup_pincode) no longer crash
─────────────────────────────────────────────────────────────────────────────
"""

from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import os
import json
from datetime import datetime
from flask import send_from_directory
import jwt
from functools import wraps
from database.post_operations import create_post
from database.db import get_db_connection

upload_bp = Blueprint('upload', __name__)

# ===== TOKEN VALIDATION DECORATOR =====
def token_required(f):
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
        except Exception:
            return jsonify({'success': False, 'message': 'Token validation failed'}), 401
        return f(current_user, *args, **kwargs)
    return decorated


def _save_time_slots(post_id: int, slots_json: str):
    """
    Parse time_slots JSON and insert rows into service_time_slots.
    Expected JSON shape: [{"label": "09:00", "display": "9:00 AM", "duration_mins": 60}, ...]
    Returns (saved_count, error_message_or_None)
    """
    if not slots_json:
        return 0, None

    try:
        slots = json.loads(slots_json)
    except (json.JSONDecodeError, TypeError) as e:
        return 0, f"Invalid slots JSON: {e}"

    if not isinstance(slots, list) or len(slots) == 0:
        return 0, None

    connection = get_db_connection()
    if not connection:
        return 0, "DB connection failed"

    try:
        cursor = connection.cursor()
        cursor.execute("DELETE FROM service_time_slots WHERE post_id = %s", (post_id,))

        saved = 0
        for idx, s in enumerate(slots):
            label   = str(s.get("label",   "")).strip()
            display = str(s.get("display", "")).strip()
            dur     = s.get("duration_mins", 60)
            try:
                duration_mins = int(dur) if dur else 60
            except (TypeError, ValueError):
                duration_mins = 60

            if not label or len(label) != 5 or ":" not in label:
                continue

            cursor.execute("""
                INSERT INTO service_time_slots
                    (post_id, slot_label, slot_display, duration_mins, is_active, sort_order)
                VALUES (%s, %s, %s, %s, 1, %s)
            """, (post_id, label, display or label, duration_mins, idx))
            saved += 1

        connection.commit()
        cursor.close()
        connection.close()
        print(f"✅ Saved {saved} time slot(s) for post {post_id}")
        return saved, None

    except Exception as e:
        print(f"❌ _save_time_slots error: {e}")
        import traceback; traceback.print_exc()
        if connection:
            connection.rollback()
            connection.close()
        return 0, str(e)


# ── Configuration ────────────────────────────────────────────────────────────
PROFILE_UPLOAD_FOLDER  = 'uploads/profile'
COVER_UPLOAD_FOLDER    = 'uploads/cover'
POST_UPLOAD_FOLDER     = 'uploads/posts'
PAYMENT_PROOF_FOLDER   = 'uploads/payment_proofs'

ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'webm', 'mov', 'avi'}
ALLOWED_EXTENSIONS       = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_VIDEO_EXTENSIONS

MAX_FILE_SIZE    = 50 * 1024 * 1024
PROFILE_MAX_SIZE =  5 * 1024 * 1024

for _d in (PROFILE_UPLOAD_FOLDER, COVER_UPLOAD_FOLDER,
           POST_UPLOAD_FOLDER, PAYMENT_PROOF_FOLDER):
    os.makedirs(_d, exist_ok=True)


def allowed_file(filename, allowed_exts=ALLOWED_EXTENSIONS):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_exts


# ─────────────────────────────────────────────────────────────────────────────
# HELPER: safe strip — never crashes on None
# ─────────────────────────────────────────────────────────────────────────────

def _safe_strip(val):
    """Return stripped string, or '' if val is None."""
    return (val or '').strip()


# ─────────────────────────────────────────────────────────────────────────────
# HELPER: geocode pincode and cache lat/lng on the post row
# ─────────────────────────────────────────────────────────────────────────────

def _geocode_and_cache(post_id: int, pincode: str, lat_col: str, lng_col: str):
    """
    Resolve a 6-digit Indian pincode → (lat, lng) then save into the post row.
    Silently ignores failures.
    """
    if not pincode or len(str(pincode)) != 6:
        return

    try:
        from routes.delivery_routes import _coords_from_pincode
        coords = _coords_from_pincode(str(pincode))
        if not coords:
            print(f"⚠️  Could not geocode pincode {pincode} for post {post_id}")
            return

        connection = get_db_connection()
        cursor     = connection.cursor()
        cursor.execute(
            f"UPDATE posts SET {lat_col} = %s, {lng_col} = %s WHERE post_id = %s",
            (coords[0], coords[1], post_id)
        )
        connection.commit()
        cursor.close()
        connection.close()
        print(f"📍 Geocoded post {post_id}: pincode {pincode} → ({coords[0]:.4f}, {coords[1]:.4f})")
    except Exception as e:
        print(f"⚠️  Geocoding skipped for post {post_id} / pincode {pincode}: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# HELPER: save price variants for a service post
# ─────────────────────────────────────────────────────────────────────────────

def _save_price_variants(post_id: int, variants_json: str):
    """
    Parse price_variants JSON and insert into service_price_variants.
    Returns (saved_count, error_message_or_None)
    """
    if not variants_json:
        return 0, None

    try:
        variants = json.loads(variants_json)
    except (json.JSONDecodeError, TypeError) as e:
        print(f"⚠️ price_variants JSON parse error: {e}")
        return 0, f"Invalid variants JSON: {e}"

    if not isinstance(variants, list) or len(variants) == 0:
        return 0, None

    connection = get_db_connection()
    if not connection:
        return 0, "DB connection failed"

    try:
        cursor = connection.cursor()
        saved  = 0
        for idx, v in enumerate(variants):
            name  = str(v.get('name', '')).strip()
            price = v.get('price')

            if not name:
                continue
            try:
                price = float(price)
                if price < 0:
                    raise ValueError()
            except (TypeError, ValueError):
                print(f"⚠️ Skipping variant '{name}' — invalid price: {price}")
                continue

            description    = str(v.get('description', '')).strip() or None
            duration_hours = v.get('duration_hours')
            try:
                duration_hours = float(duration_hours) if duration_hours else None
            except (TypeError, ValueError):
                duration_hours = None

            cursor.execute("""
                INSERT INTO service_price_variants
                    (post_id, variant_name, description, price, duration_hours,
                     is_active, sort_order)
                VALUES (%s, %s, %s, %s, %s, 1, %s)
            """, (post_id, name, description, price, duration_hours, idx))
            saved += 1

        connection.commit()
        cursor.close()
        connection.close()
        print(f"✅ Saved {saved} price variant(s) for post {post_id}")
        return saved, None

    except Exception as e:
        print(f"❌ _save_price_variants error: {e}")
        import traceback; traceback.print_exc()
        if connection:
            connection.rollback()
            connection.close()
        return 0, str(e)


# ─────────────────────────────────────────────────────────────────────────────
# GET VARIANTS FOR A POST (public)
# ─────────────────────────────────────────────────────────────────────────────

@upload_bp.route('/posts/<int:post_id>/variants', methods=['GET'])
def get_post_variants(post_id):
    """GET /api/posts/123/variants — returns active price variants"""
    try:
        connection = get_db_connection()
        cursor     = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT variant_id, variant_name, description, price, duration_hours
            FROM service_price_variants
            WHERE post_id = %s AND is_active = 1
            ORDER BY sort_order, variant_id
        """, (post_id,))
        variants = cursor.fetchall()
        cursor.close(); connection.close()
        return jsonify({'success': True, 'variants': variants})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# CREATE POST ROUTE
# ─────────────────────────────────────────────────────────────────────────────

@upload_bp.route('/create-post', methods=['POST'])
@token_required
def create_post_route(current_user):
    try:
        print("\n" + "=" * 80)
        print("📝 CREATE POST REQUEST RECEIVED")
        print("=" * 80)

        post_type = request.form.get('post_type')
        if not post_type or post_type not in ['showcase', 'service', 'product']:
            return jsonify({'success': False, 'message': f'Invalid post type: {post_type}'}), 400

        # ── Media file ────────────────────────────────────────────────────────
        if 'media' not in request.files:
            return jsonify({'success': False, 'message': 'Media file is required'}), 400
        media_file = request.files['media']
        if media_file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'}), 400
        if not allowed_file(media_file.filename):
            return jsonify({'success': False, 'message': 'Invalid file type'}), 400

        media_file.seek(0, os.SEEK_END)
        file_size = media_file.tell()
        media_file.seek(0)
        if file_size > MAX_FILE_SIZE:
            return jsonify({'success': False, 'message': 'File size exceeds 50MB limit'}), 400

        timestamp         = datetime.now().strftime('%Y%m%d_%H%M%S')
        original_filename = secure_filename(media_file.filename)
        filename          = f"{current_user['id']}_{timestamp}_{original_filename}"
        filepath          = os.path.join(POST_UPLOAD_FOLDER, filename)
        media_file.save(filepath)

        ext        = filename.rsplit('.', 1)[1].lower()
        media_type = 'video' if ext in ALLOWED_VIDEO_EXTENSIONS else 'image'

        # ── Caption & Category ────────────────────────────────────────────────
        caption = request.form.get('caption', '').strip()
        if not caption or len(caption) < 3:
            return jsonify({'success': False, 'message': 'Caption must be at least 3 characters'}), 400
        if len(caption) > 500:
            return jsonify({'success': False, 'message': 'Caption cannot exceed 500 characters'}), 400

        category_id = request.form.get('category_id')
        if not category_id:
            return jsonify({'success': False, 'message': 'Category is required'}), 400

        # ── Base post data ────────────────────────────────────────────────────
        post_data = {
            'user_id':        current_user['id'],
            'caption':        caption,
            'media_url':      f"uploads/posts/{filename}",
            'media_type':     media_type,
            'post_type':      post_type,
            'privacy':        request.form.get('privacy', 'public'),
            'category_id':    category_id,
            'subcategory_id': request.form.get('subcategory_id') or None,
        }

        # ── SHOWCASE ──────────────────────────────────────────────────────────
        if post_type == 'showcase':
            post_data['tags'] = request.form.get('tags')

        # ── SERVICE ───────────────────────────────────────────────────────────
        elif post_type == 'service':
            service_location_type_for_mode = request.form.get('service_location_type', 'online').strip()
            if service_location_type_for_mode in ('online',):
                service_mode = 'online'
            elif service_location_type_for_mode in ('at_provider', 'doorstep'):
                service_mode = 'offline'
            else:
                service_mode = 'both'

            title = request.form.get('title', '').strip()
            if not title:
                return jsonify({'success': False, 'message': 'Service title is required'}), 400

            price = request.form.get('price')
            try:
                price = float(price)
                if price < 0:
                    raise ValueError()
            except (TypeError, ValueError):
                return jsonify({'success': False,
                                'message': 'Valid price is required (0 = free / quote-based)'}), 400

            short_desc = request.form.get('short_description', '').strip()
            if not short_desc:
                return jsonify({'success': False, 'message': 'Short description is required'}), 400

            email = request.form.get('contact_email', '').strip()
            phone = request.form.get('contact_phone', '').strip()
            if not email or '@' not in email:
                return jsonify({'success': False, 'message': 'Valid contact email is required'}), 400
            if not phone or len(phone) < 10:
                return jsonify({'success': False, 'message': 'Valid contact phone is required'}), 400

            service_location_type = request.form.get('service_location_type', 'online').strip()
            if service_location_type not in ('online', 'doorstep', 'at_provider', 'both'):
                service_location_type = 'online'

            try:
                service_radius_km = int(request.form.get('service_radius_km', 0) or 0)
            except (TypeError, ValueError):
                service_radius_km = 0

            try:
                doorstep_base_fee = float(request.form.get('doorstep_base_fee', 0) or 0)
            except (TypeError, ValueError):
                doorstep_base_fee = 0.0

            try:
                doorstep_per_km = float(request.form.get('doorstep_per_km', 0) or 0)
            except (TypeError, ValueError):
                doorstep_per_km = 0.0

            service_pincode = _safe_strip(request.form.get('service_pincode')) or None

            post_data.update({
                'title':                    title,
                'price':                    price,
                'currency':                 'INR',
                'service_mode':             service_mode,
                'service_location_type':    service_location_type,
                'service_address':          _safe_strip(request.form.get('service_address')) or None,
                'service_city':             _safe_strip(request.form.get('service_city')) or None,
                'service_state':            _safe_strip(request.form.get('service_state')) or None,
                'service_pincode':          service_pincode,
                'service_radius_km':        service_radius_km,
                'doorstep_base_fee':        doorstep_base_fee,
                'doorstep_per_km':          doorstep_per_km,
                'service_duration':         request.form.get('service_duration'),
                'service_delivery_time':    request.form.get('service_delivery_time'),
                'includes_revisions':       request.form.get('includes_revisions') == 'true',
                'max_revisions':            int(request.form.get('max_revisions', 0))
                                            if request.form.get('max_revisions') else None,
                'requires_advance_booking': request.form.get('requires_advance_booking') == 'true',
                'booking_notice_days':      int(request.form.get('booking_notice_days', 0))
                                            if request.form.get('booking_notice_days') else None,
                'short_description':        short_desc,
                'full_description':         request.form.get('full_description'),
                'features':                 request.form.get('features'),
                'contact_email':            email,
                'contact_phone':            phone,
            })
            print(f"✅ Service: mode={service_mode}, loc={service_location_type}, "
                  f"address={post_data.get('service_address')}, pincode={service_pincode}, "
                  f"radius={service_radius_km}km")

        # ── PRODUCT ───────────────────────────────────────────────────────────
        elif post_type == 'product':
            title = _safe_strip(request.form.get('product_title'))
            if not title:
                return jsonify({'success': False, 'message': 'Product title is required'}), 400

            price = request.form.get('price')
            try:
                price = float(price)
                if price <= 0:
                    raise ValueError()
            except (TypeError, ValueError):
                return jsonify({'success': False, 'message': 'Valid price is required'}), 400

            stock = request.form.get('stock')
            try:
                stock = int(stock)
                if stock < 0:
                    raise ValueError()
            except (TypeError, ValueError):
                return jsonify({'success': False, 'message': 'Valid stock quantity is required'}), 400

            short_desc = _safe_strip(request.form.get('short_description'))
            if not short_desc:
                return jsonify({'success': False, 'message': 'Short description is required'}), 400

            shipping_available   = request.form.get('shipping_available') == 'true'

            delivery_charge_type = _safe_strip(request.form.get('delivery_charge_type')) or 'flat'
            if delivery_charge_type not in ('flat', 'per_km', 'free'):
                delivery_charge_type = 'flat'

            base_delivery_charge = 0.0
            per_km_rate          = 0.0
            delivery_max_km      = 0
            seller_pincode       = _safe_strip(request.form.get('seller_pincode')) or None

            if shipping_available:
                if delivery_charge_type == 'flat':
                    try:
                        base_delivery_charge = float(request.form.get('base_delivery_charge', 0) or 0)
                    except (TypeError, ValueError):
                        base_delivery_charge = 0.0
                elif delivery_charge_type == 'per_km':
                    try:
                        base_delivery_charge = float(
                            request.form.get('base_delivery_charge', 0) or
                            request.form.get('baseDeliveryChargeKm', 0) or 0
                        )
                    except (TypeError, ValueError):
                        base_delivery_charge = 0.0
                    try:
                        per_km_rate = float(request.form.get('per_km_rate', 0) or 0)
                    except (TypeError, ValueError):
                        per_km_rate = 0.0
                    try:
                        delivery_max_km = int(request.form.get('delivery_max_km', 0) or 0)
                    except (TypeError, ValueError):
                        delivery_max_km = 0
                elif delivery_charge_type == 'free':
                    base_delivery_charge = 0.0
                    per_km_rate          = 0.0

            legacy_shipping_cost = base_delivery_charge if delivery_charge_type == 'flat' else 0.0

            # Pickup address fields (always read, regardless of shipping mode)
            pickup_address = _safe_strip(request.form.get('pickup_address')) or None
            pickup_city    = _safe_strip(request.form.get('pickup_city'))    or None
            pickup_state   = _safe_strip(request.form.get('pickup_state'))   or None
            pickup_pincode = _safe_strip(request.form.get('pickup_pincode')) or None

            post_data.update({
                'product_title':           title,
                'price':                   price,
                'currency':                'INR',
                'stock':                   stock,
                'condition_type':          request.form.get('condition_type', 'new'),
                'brand':                   request.form.get('brand'),
                'sku':                     request.form.get('sku'),
                'short_description':       short_desc,
                'full_description':        request.form.get('full_description'),
                'features':                request.form.get('features'),
                'shipping_available':      shipping_available,
                'shipping_cost':           legacy_shipping_cost,
                'delivery_charge_type':    delivery_charge_type,
                'base_delivery_charge':    base_delivery_charge,
                'per_km_rate':             per_km_rate,
                'delivery_max_km':         delivery_max_km,
                'seller_pincode':          seller_pincode,
                'estimated_delivery_days': int(request.form.get('estimated_delivery_days', 0) or 0),
                'free_shipping_threshold': float(
                    request.form.get('free_shipping_threshold', 0) or 0) or None,
                'return_policy':           request.form.get('return_policy'),
                'accepts_cod':             request.form.get('accepts_cod') == 'true',
                'pickup_address':          pickup_address,
                'pickup_city':             pickup_city,
                'pickup_state':            pickup_state,
                'pickup_pincode':          pickup_pincode,
            })
            print(f"✅ Product: delivery={delivery_charge_type}, shipping={shipping_available}, "
                  f"base=₹{base_delivery_charge}, per_km=₹{per_km_rate}, "
                  f"max_km={delivery_max_km}, pincode={seller_pincode}, "
                  f"pickup_city={pickup_city}, pickup_pincode={pickup_pincode}")

        # ── Save to database ──────────────────────────────────────────────────
        print(f"\n💾 Saving {post_type.upper()} post to database...")
        result = create_post(post_data)

        if not result['success']:
            print(f"❌ DB ERROR: {result['message']}")
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({'success': False, 'message': result['message']}), 500

        post_id = result['post_id']
        print(f"✅ POST CREATED — ID: {post_id}")

        # ── Geocode at upload time ────────────────────────────────────────────
        if post_type == 'service':
            time_slots_json = request.form.get('time_slots', '')
            if time_slots_json:
                saved_slots, slots_err = _save_time_slots(post_id, time_slots_json)
                if slots_err:
                    print(f"⚠️ Slots warning: {slots_err}")
                else:
                    print(f"✅ {saved_slots} slot(s) saved for post {post_id}")
            svc_pin = post_data.get('service_pincode', '') or ''
            if svc_pin and len(svc_pin) == 6:
                _geocode_and_cache(post_id, svc_pin, 'service_lat', 'service_lng')

        elif post_type == 'product':
            sell_pin = post_data.get('seller_pincode', '') or ''
            if sell_pin and len(sell_pin) == 6:
                _geocode_and_cache(post_id, sell_pin, 'seller_lat', 'seller_lng')

            pick_pin = post_data.get('pickup_pincode', '') or ''
            if pick_pin and len(pick_pin) == 6:
                _geocode_and_cache(post_id, pick_pin, 'pickup_lat', 'pickup_lng')
                print(f"📍 Pickup pincode geocoded for post {post_id}: {pick_pin}")

        # ── Save price variants (service only) ────────────────────────────────
        variants_warning = None
        if post_type == 'service':
            variants_json = request.form.get('price_variants', '')
            if variants_json:
                saved_count, err = _save_price_variants(post_id, variants_json)
                if err:
                    variants_warning = f"Post created but variants could not be saved: {err}"
                    print(f"⚠️ {variants_warning}")
                else:
                    print(f"✅ {saved_count} variant(s) saved for post {post_id}")

        print("=" * 80 + "\n")
        resp = {'success': True, 'message': 'Post created successfully', 'post_id': post_id}
        if variants_warning:
            resp['variants_warning'] = variants_warning
        return jsonify(resp), 201

    except ValueError as e:
        return jsonify({'success': False, 'message': f'Invalid data format: {str(e)}'}), 400
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {str(e)}")
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to create post'}), 500


# ─────────────────────────────────────────────────────────────────────────────
# PROFILE PICTURE UPLOAD
# ─────────────────────────────────────────────────────────────────────────────

@upload_bp.route('/upload-profile-pic', methods=['POST'])
def upload_profile_pic():
    try:
        if 'profilePic' not in request.files:
            return jsonify({'success': False, 'message': 'No file provided'}), 400
        file = request.files['profilePic']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'}), 400
        if not allowed_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
            return jsonify({'success': False, 'message': 'Only PNG, JPG, JPEG, GIF, WEBP allowed'}), 400
        file.seek(0, os.SEEK_END); size = file.tell(); file.seek(0)
        if size > PROFILE_MAX_SIZE:
            return jsonify({'success': False, 'message': 'File size exceeds 5MB limit'}), 400
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename  = f"{timestamp}_{secure_filename(file.filename)}"
        file.save(os.path.join(PROFILE_UPLOAD_FOLDER, filename))
        return jsonify({
            'success':  True,
            'message':  'Profile picture uploaded',
            'filename': filename,
            'filepath': f"uploads/profile/{filename}"
        }), 200
    except Exception:
        return jsonify({'success': False, 'message': 'Failed to upload profile picture'}), 500


# ─────────────────────────────────────────────────────────────────────────────
# PAYMENT PROOF UPLOAD
# ─────────────────────────────────────────────────────────────────────────────

@upload_bp.route('/upload-payment-proof', methods=['POST'])
def upload_payment_proof():
    try:
        if 'paymentProof' not in request.files:
            return jsonify({'success': False, 'message': 'No file provided'}), 400
        file = request.files['paymentProof']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'}), 400
        if not allowed_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
            return jsonify({'success': False, 'message': 'Only image files allowed'}), 400
        file.seek(0, os.SEEK_END); size = file.tell(); file.seek(0)
        if size > PROFILE_MAX_SIZE:
            return jsonify({'success': False, 'message': 'File size exceeds 5MB limit'}), 400
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename  = f"proof_{timestamp}_{secure_filename(file.filename)}"
        file.save(os.path.join(PAYMENT_PROOF_FOLDER, filename))
        return jsonify({
            'success':  True,
            'message':  'Payment proof uploaded',
            'filename': filename,
            'filepath': f"uploads/payment_proofs/{filename}"
        }), 200
    except Exception:
        return jsonify({'success': False, 'message': 'Failed to upload payment proof'}), 500


print("✅ Upload routes initialized — Phase 1 + Geocoding + Fix 5 (pickup) + Fix 6 (None.strip)")


# ─────────────────────────────────────────────────────────────────────────────
# ROUTE 1: GET POST FOR EDITING
# ─────────────────────────────────────────────────────────────────────────────

@upload_bp.route('/posts/<int:post_id>/edit', methods=['GET'])
@token_required
def get_post_for_edit(current_user, post_id):
    """GET /api/posts/<post_id>/edit — Returns full post data for edit form (owner only)."""
    from database.post_operations import get_post_by_id
    result = get_post_by_id(post_id, user_id=current_user['id'])
    if not result['success']:
        return jsonify(result), 404
    return jsonify(result)


# ─────────────────────────────────────────────────────────────────────────────
# ROUTE 2: UPDATE POST DATA
# ─────────────────────────────────────────────────────────────────────────────

@upload_bp.route('/posts/<int:post_id>/update', methods=['PUT'])
@token_required
def update_post_route(current_user, post_id):
    """
    PUT /api/posts/<post_id>/update
    Updates editable fields. update_post() enforces per-type allowed lists.
    Also re-geocodes pincode when it changes.

    FIX 6: All pincode values use _safe_strip() so None never causes AttributeError.
    """
    from database.post_operations import update_post
    try:
        update_data = request.get_json() or {}
        if not update_data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400

        result = update_post(post_id, current_user['id'], update_data)

        if result['success']:
            # ── FIX 6: use _safe_strip() on ALL pincode values — never crashes on None ──

            # Re-geocode seller pincode if changed (product)
            new_seller_pin = _safe_strip(update_data.get('seller_pincode'))
            if new_seller_pin and len(new_seller_pin) == 6:
                try:
                    _geocode_and_cache(post_id, new_seller_pin, 'seller_lat', 'seller_lng')
                except Exception as ge:
                    print(f"⚠️ Geocode seller pincode failed (non-fatal): {ge}")

            # Re-geocode service pincode if changed (service)
            new_service_pin = _safe_strip(update_data.get('service_pincode'))
            if new_service_pin and len(new_service_pin) == 6:
                try:
                    _geocode_and_cache(post_id, new_service_pin, 'service_lat', 'service_lng')
                except Exception as ge:
                    print(f"⚠️ Geocode service pincode failed (non-fatal): {ge}")

            # Re-geocode pickup pincode if changed (product pickup/both mode)
            new_pickup_pin = _safe_strip(update_data.get('pickup_pincode'))
            if new_pickup_pin and len(new_pickup_pin) == 6:
                try:
                    _geocode_and_cache(post_id, new_pickup_pin, 'pickup_lat', 'pickup_lng')
                except Exception as ge:
                    print(f"⚠️ Geocode pickup pincode failed (non-fatal): {ge}")

            return jsonify(result)
        else:
            status = 404 if 'not found' in result.get('message', '').lower() else 400
            return jsonify(result), status

    except Exception as e:
        print(f"❌ update_post_route error: {e}")
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to update post'}), 500


# ─────────────────────────────────────────────────────────────────────────────
# ROUTE 3: UPDATE POST MEDIA (cropped image replace)
# ─────────────────────────────────────────────────────────────────────────────

@upload_bp.route('/posts/<int:post_id>/update-media', methods=['PUT'])
@token_required
def update_post_media(current_user, post_id):
    """
    PUT /api/posts/<post_id>/update-media
    Replaces media file. Accepts multipart with 'media' field.
    Deletes old file from disk, saves new one, updates DB.
    """
    try:
        if 'media' not in request.files:
            return jsonify({'success': False, 'message': 'No media file provided'}), 400

        media_file = request.files['media']
        if not media_file or not media_file.filename:
            return jsonify({'success': False, 'message': 'Empty file'}), 400

        if not allowed_file(media_file.filename):
            return jsonify({'success': False, 'message': 'Invalid file type'}), 400

        media_file.seek(0, os.SEEK_END)
        file_size = media_file.tell()
        media_file.seek(0)
        if file_size > MAX_FILE_SIZE:
            return jsonify({'success': False, 'message': 'File exceeds 50MB limit'}), 400

        connection = get_db_connection()
        cursor     = connection.cursor(dictionary=True)
        cursor.execute(
            "SELECT user_id, media_url FROM posts WHERE post_id = %s AND is_deleted = FALSE",
            (post_id,)
        )
        post = cursor.fetchone()

        if not post:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Post not found'}), 404

        if post['user_id'] != current_user['id']:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403

        timestamp  = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename   = f"{current_user['id']}_{timestamp}_{secure_filename(media_file.filename)}"
        filepath   = os.path.join(POST_UPLOAD_FOLDER, filename)
        media_file.save(filepath)

        ext        = filename.rsplit('.', 1)[1].lower()
        media_type = 'video' if ext in ALLOWED_VIDEO_EXTENSIONS else 'image'

        old_url = post.get('media_url') or ''
        if old_url:
            try:
                old_path = old_url if old_url.startswith('uploads/') \
                           else os.path.join(POST_UPLOAD_FOLDER, old_url.split('/')[-1])
                if os.path.exists(old_path):
                    os.remove(old_path)
                    print(f"🗑️  Deleted old media: {old_path}")
            except Exception as fe:
                print(f"⚠️ Could not delete old media (non-fatal): {fe}")

        new_url = f"uploads/posts/{filename}"
        cursor.execute(
            "UPDATE posts SET media_url = %s, media_type = %s, updated_at = NOW() WHERE post_id = %s",
            (new_url, media_type, post_id)
        )
        connection.commit()
        cursor.close()
        connection.close()

        print(f"✅ Media updated for post {post_id}: {new_url}")
        return jsonify({
            'success':    True,
            'message':    'Media updated successfully',
            'media_url':  new_url,
            'media_type': media_type,
        })

    except Exception as e:
        print(f"❌ update_post_media error: {e}")
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to update media'}), 500