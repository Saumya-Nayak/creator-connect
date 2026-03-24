"""
routes/delivery_routes.py  — BUG FIX PATCH
─────────────────────────────────────────────────────────────────────────────
Fixes applied:
  ✅ FIX 1: Add _is_valid_india_coords() — reject coords outside India bounds
             Prevents bad Nominatim results (e.g. foreign "380052" postal code)
             from being used as provider location → was causing ~4154 km bug
  ✅ FIX 2: estimate_delivery() — validate s_lat/s_lng before using cached value
             If DB-cached coords are outside India, re-geocode from pincode
  ✅ FIX 3: _geocode_and_cache() in upload_routes — also validates before saving
             (add the same bounds check there too — see note at bottom)
─────────────────────────────────────────────────────────────────────────────
"""

from flask import Blueprint, request, jsonify
from database.db import get_db_connection
from services.jwt_service import verify_token
import math
import urllib.request
import urllib.parse
import json
import time

delivery_bp = Blueprint('delivery', __name__)

_coord_cache = {}


# ─────────────────────────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _haversine_km(lat1, lon1, lat2, lon2):
    R    = 6371.0
    phi1 = math.radians(lat1); phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1); dlam = math.radians(lon2 - lon1)
    a    = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ─────────────────────────────────────────────────────────────────────────────
#  FIX 1: India bounds validator
#  India lat: 8.0 – 37.6   India lng: 68.1 – 97.4
#  Any coords outside this box are garbage (e.g. Nominatim matched a
#  non-Indian postal code with the same digits, or returned 0,0 on failure).
# ─────────────────────────────────────────────────────────────────────────────

def _is_valid_india_coords(lat, lng):
    """Return True only if coords are within India's geographic bounding box."""
    try:
        lat = float(lat); lng = float(lng)
        return 8.0 <= lat <= 37.6 and 68.1 <= lng <= 97.4
    except (TypeError, ValueError):
        return False


def _coords_from_pincode(pincode: str):
    """Pincode → (lat, lng) via Nominatim. Cached. Validates India bounds."""
    if not pincode or len(pincode) != 6 or not pincode.isdigit():
        return None
    if pincode in _coord_cache and isinstance(_coord_cache[pincode], tuple):
        print(f"📍 Pincode {pincode} from cache: {_coord_cache[pincode]}")
        return _coord_cache[pincode]

    for strategy, params in [
        ("postalcode", {"postalcode": pincode, "country": "IN", "format": "json", "limit": 1}),
        ("freetext",   {"q": f"{pincode}, India",              "format": "json", "limit": 1}),
    ]:
        try:
            url = f"https://nominatim.openstreetmap.org/search?{urllib.parse.urlencode(params)}"
            req = urllib.request.Request(url, headers={"User-Agent": "CreatorConnect/1.0"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read())
            if data:
                lat = float(data[0].get("lat", 0))
                lng = float(data[0].get("lon", 0))
                # ── FIX 1: reject non-India coords ──────────────────────────
                if lat and lng and _is_valid_india_coords(lat, lng):
                    _coord_cache[pincode] = (lat, lng)
                    print(f"📍 Nominatim ({strategy}) resolved {pincode} → ({lat:.4f}, {lng:.4f})")
                    return lat, lng
                elif lat and lng:
                    print(f"⚠️ Nominatim ({strategy}) returned non-India coords "
                          f"for {pincode}: ({lat:.4f}, {lng:.4f}) — skipping")
        except Exception as e:
            print(f"⚠️ Nominatim {strategy} failed for {pincode}: {e}")
        if strategy == "postalcode":
            time.sleep(0.2)

    print(f"❌ Could not resolve India coords for pincode {pincode}")
    return None


def _reverse_geocode(lat, lng):
    try:
        params = urllib.parse.urlencode({"lat": lat, "lon": lng, "format": "json",
                                         "addressdetails": 1, "zoom": 10})
        req = urllib.request.Request(
            f"https://nominatim.openstreetmap.org/reverse?{params}",
            headers={"User-Agent": "CreatorConnect/1.0"}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
        addr  = data.get("address", {})
        state = addr.get("state", "")
        city  = (addr.get("city") or addr.get("town") or addr.get("county")
                 or addr.get("district") or addr.get("suburb") or "")
        for sfx in [" Municipal Corporation", " City", " District", " Urban",
                    " Rural", " Tehsil", " Taluka"]:
            city  = city[:-len(sfx)]  if city.endswith(sfx)  else city
            state = state[:-len(sfx)] if state.endswith(sfx) else state
        if state.lower() == "uttaranchal":
            state = "Uttarakhand"
        return {"state": state.strip(), "city": city.strip()}
    except Exception as e:
        print(f"⚠️ Reverse geocode failed ({lat},{lng}): {e}")
        return {"state": "", "city": ""}


def _get_gst_rate(cursor, category_id, subcategory_id=None):
    if subcategory_id:
        cursor.execute(
            "SELECT gst_rate FROM gst_rates WHERE category_id=%s AND subcategory_id=%s AND is_active=1",
            (category_id, subcategory_id)
        )
        row = cursor.fetchone()
        if row: return float(row['gst_rate'])
    cursor.execute(
        "SELECT gst_rate FROM gst_rates WHERE category_id=%s AND subcategory_id IS NULL AND is_active=1",
        (category_id,)
    )
    row = cursor.fetchone()
    return float(row['gst_rate']) if row else 0.0


def _calculate_eta(distance_km, base_days):
    if base_days is None or base_days <= 0:
        base_days = 2
    distance_factor = int(distance_km // 200)
    if distance_km < 30:
        zone_buffer = 0; zone = "same city"
    elif distance_km < 500:
        zone_buffer = 1; zone = "regional"
    else:
        zone_buffer = 2; zone = "long haul"
    total = base_days + distance_factor + zone_buffer
    return {
        "estimated_days":  total,
        "base_days":       base_days,
        "distance_factor": distance_factor,
        "zone_buffer":     zone_buffer,
        "zone":            zone,
        "eta_label":       f"{total} day{'s' if total != 1 else ''}",
        "eta_detail":      f"Base {base_days}d + {distance_factor}d distance + {zone_buffer}d {zone} buffer",
    }


def _max_km_warning(charge_type, distance_km, max_km):
    if not max_km or max_km == 0:
        return None
    if distance_km > max_km:
        return (
            f"Seller prefers deliveries within {max_km} km. "
            f"Your location is {distance_km:.1f} km away. "
            f"Order may still be accepted — confirm with seller after placing."
        )
    return None


# ─────────────────────────────────────────────────────────────────────────────
#  PINCODE LOOKUP
# ─────────────────────────────────────────────────────────────────────────────

@delivery_bp.route('/pincode/lookup', methods=['GET'])
def lookup_pincode():
    pincode = request.args.get('pincode', '').strip()
    if not pincode or len(pincode) != 6 or not pincode.isdigit():
        return jsonify({'success': False, 'message': 'Enter a valid 6-digit pincode'}), 400

    cache_key = f"full_{pincode}"
    if cache_key in _coord_cache and isinstance(_coord_cache[cache_key], dict):
        return jsonify(_coord_cache[cache_key])

    coords = _coords_from_pincode(pincode)
    if not coords:
        return jsonify({'success': False, 'message': f'Could not resolve pincode {pincode}.'}), 404

    lat, lng  = coords
    location  = _reverse_geocode(lat, lng)
    result    = {
        'success': True, 'pincode': pincode,
        'state':   location.get("state", ""),
        'city':    location.get("city",  ""),
        'country': 'India',
        'lat': lat, 'lng': lng,
    }
    _coord_cache[cache_key] = result
    return jsonify(result)


# ─────────────────────────────────────────────────────────────────────────────
#  CALCULATE ORDER TOTAL
# ─────────────────────────────────────────────────────────────────────────────

@delivery_bp.route('/calculate-order-total', methods=['POST'])
def calculate_order_total():
    try:
        data          = request.get_json() or {}
        post_id       = int(data.get('post_id', 0))
        quantity      = max(int(data.get('quantity', 1)), 1)
        buyer_pincode = str(data.get('buyer_pincode', '')).strip()
        buyer_lat     = data.get('buyer_lat')
        buyer_lng     = data.get('buyer_lng')

        if not post_id:
            return jsonify({'success': False, 'message': 'post_id is required'}), 400

        connection = get_db_connection()
        cursor     = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT p.post_id, p.price, p.category_id, p.subcategory_id,
                   p.shipping_available, p.delivery_charge_type,
                   p.base_delivery_charge, p.per_km_rate,
                   p.delivery_max_km, p.seller_pincode,
                   p.seller_lat, p.seller_lng,
                   p.free_shipping_threshold, p.shipping_cost,
                   p.estimated_delivery_days, p.post_type
            FROM posts p
            WHERE p.post_id=%s AND p.is_deleted=FALSE AND p.is_active=1
        """, (post_id,))
        post = cursor.fetchone()

        if not post:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Product not found'}), 404
        if post['post_type'] != 'product':
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Not a product post'}), 400

        unit_price = float(post['price'] or 0)
        subtotal   = round(unit_price * quantity, 2)
        gst_rate   = _get_gst_rate(cursor, post['category_id'], post.get('subcategory_id'))
        gst_amount = round(subtotal * gst_rate / 100, 2)

        delivery_charge    = 0.0
        delivery_distance  = None
        delivery_available = bool(post.get('shipping_available'))
        delivery_error     = None
        delivery_warning   = None
        eta                = None
        distance_km        = None

        base_days = post.get('estimated_delivery_days') or 2
        max_km    = int(post.get('delivery_max_km') or 0)

        if delivery_available:
            charge_type = (post.get('delivery_charge_type') or 'flat').strip()

            b_lat = b_lng = None
            if buyer_lat and buyer_lng:
                try: b_lat, b_lng = float(buyer_lat), float(buyer_lng)
                except (ValueError, TypeError): pass
            if not (b_lat and b_lng) and buyer_pincode and len(buyer_pincode) == 6:
                coords = _coords_from_pincode(buyer_pincode)
                if coords:
                    b_lat, b_lng = coords

            # ── FIX 1 applied: validate seller coords before use ──────────
            raw_s_lat = post.get('seller_lat')
            raw_s_lng = post.get('seller_lng')
            s_lat = float(raw_s_lat) if raw_s_lat and _is_valid_india_coords(raw_s_lat, raw_s_lng) else None
            s_lng = float(raw_s_lng) if raw_s_lat and _is_valid_india_coords(raw_s_lat, raw_s_lng) else None

            if not (s_lat and s_lng) and post.get('seller_pincode'):
                coords = _coords_from_pincode(post['seller_pincode'])
                if coords:
                    s_lat, s_lng = coords
                    try:
                        cursor.execute(
                            "UPDATE posts SET seller_lat=%s, seller_lng=%s WHERE post_id=%s",
                            (s_lat, s_lng, post_id)
                        )
                        connection.commit()
                    except Exception:
                        pass

            if b_lat and b_lng and s_lat and s_lng:
                distance_km       = _haversine_km(s_lat, s_lng, b_lat, b_lng)
                delivery_distance = round(distance_km, 2)

            if charge_type == 'free':
                delivery_charge = 0.0
                if distance_km is not None:
                    delivery_warning = _max_km_warning('free', distance_km, max_km)
                    eta = _calculate_eta(distance_km, base_days)

            elif charge_type == 'flat':
                flat = float(post.get('base_delivery_charge') or post.get('shipping_cost') or 0)
                fst  = post.get('free_shipping_threshold')
                delivery_charge = 0.0 if (fst and subtotal >= float(fst)) else flat
                if distance_km is not None:
                    delivery_warning = _max_km_warning('flat', distance_km, max_km)
                    eta = _calculate_eta(distance_km, base_days)

            elif charge_type == 'per_km':
                base_charge = float(post.get('base_delivery_charge') or 0)
                per_km      = float(post.get('per_km_rate') or 0)
                if distance_km is not None:
                    if max_km and distance_km > max_km:
                        delivery_available = False
                        delivery_error     = (f"Delivery not available beyond {max_km} km. "
                                              f"Your location is {delivery_distance:.1f} km away.")
                        delivery_charge    = 0.0
                    else:
                        delivery_charge = round(base_charge + (distance_km * per_km), 2)
                        eta = _calculate_eta(distance_km, base_days)
                else:
                    delivery_charge = base_charge
                    delivery_error  = ("Could not calculate distance from your pincode. "
                                       "Base charge applied — actual charge may vary.")

        if distance_km is not None and eta is None and delivery_available:
            eta = _calculate_eta(distance_km, base_days)
        if eta is None and delivery_available:
            eta = {
                "estimated_days": base_days, "base_days": base_days,
                "distance_factor": 0, "zone_buffer": 0, "zone": "unknown",
                "eta_label": f"{base_days}+ days",
                "eta_detail": f"Base {base_days}d (enter pincode for accurate estimate)",
            }

        total_amount = round(subtotal + gst_amount + (delivery_charge if delivery_available else 0), 2)
        cursor.close(); connection.close()

        return jsonify({
            'success': True, 'post_id': post_id, 'quantity': quantity,
            'unit_price': unit_price, 'subtotal': subtotal,
            'gst_rate': gst_rate, 'gst_amount': gst_amount,
            'delivery_available': delivery_available,
            'delivery_charge': delivery_charge if delivery_available else 0.0,
            'delivery_distance_km': delivery_distance,
            'delivery_error': delivery_error,
            'delivery_warning': delivery_warning,
            'eta': eta,
            'total_amount': total_amount,
            'bill_breakdown': {
                'product_price': f"₹{unit_price:.2f} × {quantity}",
                'subtotal':      f"₹{subtotal:.2f}",
                'gst':           f"₹{gst_amount:.2f} ({gst_rate}%)",
                'delivery':      (f"₹{delivery_charge:.2f}" if delivery_available else "N/A"),
                'distance':      (f"{delivery_distance} km" if delivery_distance else "N/A"),
                'eta':           eta['eta_label'] if eta else "—",
                'total':         f"₹{total_amount:.2f}",
            }
        })

    except Exception as e:
        print(f"❌ calculate-order-total error: {e}")
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': 'Calculation failed. Please try again.'}), 500


# ─────────────────────────────────────────────────────────────────────────────
#  GET GST RATE FOR A POST
# ─────────────────────────────────────────────────────────────────────────────

@delivery_bp.route('/posts/<int:post_id>/gst', methods=['GET'])
def get_post_gst(post_id):
    try:
        connection = get_db_connection()
        cursor     = connection.cursor(dictionary=True)
        cursor.execute(
            "SELECT category_id, subcategory_id FROM posts WHERE post_id=%s AND is_deleted=FALSE",
            (post_id,)
        )
        post = cursor.fetchone()
        if not post:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Post not found'}), 404
        gst_rate = _get_gst_rate(cursor, post['category_id'], post.get('subcategory_id'))
        cursor.close(); connection.close()
        return jsonify({'success': True, 'post_id': post_id, 'gst_rate': gst_rate})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
#  ADMIN — GST RATES
# ─────────────────────────────────────────────────────────────────────────────

@delivery_bp.route('/admin/gst-rates', methods=['GET'])
def get_all_gst_rates():
    try:
        post_type = request.args.get('post_type', '')
        page      = max(int(request.args.get('page',  1)),   1)
        limit     = min(int(request.args.get('limit', 50)), 200)
        offset    = (page - 1) * limit
        connection = get_db_connection()
        cursor     = connection.cursor(dictionary=True)
        where, params = '', []
        if post_type in ('showcase', 'service', 'product'):
            where = 'WHERE c.post_type=%s'; params.append(post_type)
        cursor.execute(f"""
            SELECT g.id, g.category_id, g.subcategory_id,
                   g.gst_rate, g.hsn_sac_code, g.description, g.is_active,
                   c.category_name, c.post_type, c.icon AS category_icon,
                   s.subcategory_name
            FROM gst_rates g
            JOIN categories c ON c.category_id=g.category_id
            LEFT JOIN subcategories s ON s.subcategory_id=g.subcategory_id
            {where}
            ORDER BY c.post_type, c.category_name, s.subcategory_name
            LIMIT %s OFFSET %s
        """, params + [limit, offset])
        rows = cursor.fetchall()
        cursor.execute(f"""
            SELECT COUNT(*) AS cnt FROM gst_rates g
            JOIN categories c ON c.category_id=g.category_id {where}
        """, params)
        total = cursor.fetchone()['cnt']
        cursor.close(); connection.close()
        return jsonify({
            'success': True, 'gst_rates': rows,
            'total': total, 'page': page, 'limit': limit,
            'pages': (total + limit - 1) // limit
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@delivery_bp.route('/admin/gst-rates/<int:gst_id>', methods=['PUT'])
def update_gst_rate(gst_id):
    try:
        data = request.get_json() or {}
        fields, vals = [], []
        if 'gst_rate'     in data: fields.append('gst_rate=%s');     vals.append(float(data['gst_rate']))
        if 'hsn_sac_code' in data: fields.append('hsn_sac_code=%s'); vals.append(data['hsn_sac_code'] or None)
        if 'description'  in data: fields.append('description=%s');  vals.append(data['description'] or None)
        if 'is_active'    in data: fields.append('is_active=%s');     vals.append(int(bool(data['is_active'])))
        if not fields:
            return jsonify({'success': False, 'message': 'No fields to update'}), 400
        connection = get_db_connection()
        cursor     = connection.cursor()
        cursor.execute(f"UPDATE gst_rates SET {','.join(fields)} WHERE id=%s", vals + [gst_id])
        connection.commit(); cursor.close(); connection.close()
        return jsonify({'success': True, 'message': 'GST rate updated'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@delivery_bp.route('/admin/gst-rates/bulk-update', methods=['PUT'])
def bulk_update_gst_rates():
    try:
        data      = request.get_json() or {}
        post_type = data.get('post_type', '').strip()
        gst_rate  = float(data.get('gst_rate', 0))
        if post_type not in ('showcase', 'service', 'product'):
            return jsonify({'success': False, 'message': 'Invalid post_type'}), 400
        connection = get_db_connection()
        cursor     = connection.cursor()
        cursor.execute("""
            UPDATE gst_rates g
            JOIN categories c ON c.category_id=g.category_id
            SET g.gst_rate=%s WHERE c.post_type=%s
        """, (gst_rate, post_type))
        affected = cursor.rowcount
        connection.commit(); cursor.close(); connection.close()
        return jsonify({'success': True, 'updated': affected,
                        'message': f'{affected} rates updated to {gst_rate}%'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
#  DELIVERY ESTIMATE  (called by service-summary.js)
# ─────────────────────────────────────────────────────────────────────────────

@delivery_bp.route('/delivery/estimate', methods=['POST'])
def estimate_delivery():
    """
    POST { post_id, buyer_pincode, type: 'service'|'product' }
    Returns { success, distance_km, travel_fee, within_radius }
    """
    try:
        data      = request.get_json() or {}
        post_id   = data.get('post_id')
        buyer_pin = str(data.get('buyer_pincode', '')).strip()
        req_type  = data.get('type', 'service')

        if not post_id or not buyer_pin or len(buyer_pin) != 6 or not buyer_pin.isdigit():
            return jsonify({'success': False,
                            'message': 'post_id and valid 6-digit buyer_pincode required'}), 400

        connection = get_db_connection()
        cursor     = connection.cursor(dictionary=True)

        if req_type == 'service':
            cursor.execute("""
                SELECT service_pincode, service_lat, service_lng,
                       service_radius_km, doorstep_base_fee, doorstep_per_km
                FROM posts WHERE post_id = %s AND is_deleted = FALSE
            """, (post_id,))
            post = cursor.fetchone()
            if not post:
                cursor.close(); connection.close()
                return jsonify({'success': False, 'message': 'Post not found'}), 404

            # ── FIX 2: validate cached coords are within India before using ──
            raw_lat = post.get('service_lat')
            raw_lng = post.get('service_lng')
            if raw_lat and raw_lng and _is_valid_india_coords(raw_lat, raw_lng):
                s_lat = float(raw_lat)
                s_lng = float(raw_lng)
                print(f"📍 Using cached service coords: ({s_lat:.4f}, {s_lng:.4f})")
            else:
                # DB coords are NULL, 0.0, or outside India — re-geocode
                if raw_lat and not _is_valid_india_coords(raw_lat, raw_lng):
                    print(f"⚠️ DB service coords ({raw_lat},{raw_lng}) outside India — re-geocoding")
                s_lat = s_lng = None
                provider_pin = str(post.get('service_pincode') or '').strip()
                if provider_pin and len(provider_pin) == 6:
                    coords = _coords_from_pincode(provider_pin)
                    if coords:
                        s_lat, s_lng = coords
                        try:
                            cursor.execute(
                                "UPDATE posts SET service_lat=%s, service_lng=%s WHERE post_id=%s",
                                (s_lat, s_lng, post_id))
                            connection.commit()
                            print(f"📍 Fixed cached coords for post {post_id}: ({s_lat:.4f},{s_lng:.4f})")
                        except Exception as ce:
                            print(f"⚠️ Could not update coords: {ce}")

            base_fee  = float(post.get('doorstep_base_fee') or 0)
            per_km    = float(post.get('doorstep_per_km')   or 0)
            radius_km = int(post.get('service_radius_km')   or 0)

        else:  # product
            cursor.execute("""
                SELECT seller_pincode, seller_lat, seller_lng,
                       delivery_max_km, base_delivery_charge, per_km_rate
                FROM posts WHERE post_id = %s AND is_deleted = FALSE
            """, (post_id,))
            post = cursor.fetchone()
            if not post:
                cursor.close(); connection.close()
                return jsonify({'success': False, 'message': 'Post not found'}), 404

            raw_lat = post.get('seller_lat')
            raw_lng = post.get('seller_lng')
            if raw_lat and raw_lng and _is_valid_india_coords(raw_lat, raw_lng):
                s_lat = float(raw_lat)
                s_lng = float(raw_lng)
            else:
                if raw_lat and not _is_valid_india_coords(raw_lat, raw_lng):
                    print(f"⚠️ DB seller coords ({raw_lat},{raw_lng}) outside India — re-geocoding")
                s_lat = s_lng = None
                if post.get('seller_pincode'):
                    coords = _coords_from_pincode(str(post['seller_pincode']))
                    if coords:
                        s_lat, s_lng = coords
                        try:
                            cursor.execute(
                                "UPDATE posts SET seller_lat=%s, seller_lng=%s WHERE post_id=%s",
                                (s_lat, s_lng, post_id))
                            connection.commit()
                        except Exception:
                            pass

            base_fee  = float(post.get('base_delivery_charge') or 0)
            per_km    = float(post.get('per_km_rate')          or 0)
            radius_km = int(post.get('delivery_max_km')        or 0)

        cursor.close()
        connection.close()

        if not (s_lat and s_lng):
            return jsonify({
                'success': False,
                'message': (
                    'Provider location not available. '
                    'Please ensure the provider has set their pincode.'
                )
            }), 400

        buyer_coords = _coords_from_pincode(buyer_pin)
        if not buyer_coords:
            return jsonify({
                'success': False,
                'message': f'Could not resolve pincode {buyer_pin}. Please double-check.'
            }), 400

        dist_km    = _haversine_km(s_lat, s_lng, buyer_coords[0], buyer_coords[1])
        travel_fee = round(base_fee + dist_km * per_km, 2)
        in_radius  = (radius_km == 0) or (dist_km <= radius_km)

        print(f"✅ estimate: post={post_id} "
              f"provider=({s_lat:.4f},{s_lng:.4f}) "
              f"buyer=({buyer_coords[0]:.4f},{buyer_coords[1]:.4f}) "
              f"dist={dist_km:.1f}km fee=₹{travel_fee} "
              f"radius={radius_km}km within={in_radius}")

        return jsonify({
            'success':       True,
            'distance_km':   round(dist_km, 2),
            'travel_fee':    travel_fee,
            'within_radius': in_radius,
            'radius_km':     radius_km,
            'base_fee':      base_fee,
            'per_km':        per_km,
        }), 200

    except Exception as e:
        print(f"❌ delivery/estimate error: {e}")
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': f'Estimation failed: {str(e)}'}), 500


# ─────────────────────────────────────────────────────────────────────────────
#  NOTE: Also fix upload_routes.py _geocode_and_cache()
#  Add India bounds validation before saving to DB:
#
#  def _geocode_and_cache(post_id, pincode, lat_col, lng_col):
#      ...
#      coords = _coords_from_pincode(str(pincode))
#      if not coords:
#          return
#      # _coords_from_pincode now validates India bounds internally ✅
#      # so if it returns coords, they are already valid India coords
#      connection = get_db_connection()
#      ...save coords...
#
#  Since _coords_from_pincode() now rejects non-India coords,
#  _geocode_and_cache() automatically benefits — no code change needed there.
# ─────────────────────────────────────────────────────────────────────────────

print("✅ delivery_routes.py loaded — India bounds validation + estimate fix")