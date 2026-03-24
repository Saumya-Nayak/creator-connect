# =====================================================
# SERVICE BOOKINGS ROUTES
# Handle all service booking operations
# UPDATED: Added /create endpoint that saves booked_slot,
#          variant, travel_fee, location, buyer address
# =====================================================

from flask import Blueprint, request, jsonify
import jwt
import os
from database.db import get_db_connection
from datetime import datetime
import traceback

service_booking_routes = Blueprint('service_bookings', __name__)


# =====================================================
# CREATE BOOKING  ← NEW — called by service-summary.js
# POST /api/service-bookings/create
# =====================================================
@service_booking_routes.route('/create', methods=['POST'])
def create_booking():
    try:
        token = request.headers.get('Authorization', '')
        if not token:
            return jsonify({'success': False, 'message': 'No token provided'}), 401
        token = token.replace('Bearer ', '')
        try:
            payload = jwt.decode(token, os.getenv('JWT_SECRET_KEY', 'your-secret-key'), algorithms=['HS256'])
            customer_id = payload['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401

        data = request.get_json() or {}
        post_id = data.get('post_id')
        if not post_id:
            return jsonify({'success': False, 'message': 'post_id is required'}), 400

        # ── Load post to get provider & base price ────────────────────────
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT post_id, user_id, price, post_type
            FROM posts
            WHERE post_id = %s AND is_deleted = FALSE AND is_active = 1
        """, (post_id,))
        post = cursor.fetchone()

        if not post:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Service post not found'}), 404
        if post['post_type'] != 'service':
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Not a service post'}), 400
        if post['user_id'] == customer_id:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'You cannot book your own service'}), 400

        provider_id = post['user_id']

        # ── Time / slot ───────────────────────────────────────────────────
        # booked_slot = "10:00"  (HH:MM label from slot picker)
        # preferred_time stored as HH:MM:SS in MySQL TIME column
        booked_slot = data.get('booked_slot') or None

        raw_time = data.get('preferred_time') or booked_slot or None
        if raw_time:
            raw_time = str(raw_time).strip()
            if len(raw_time) == 5:          # "10:00" → "10:00:00"
                raw_time = raw_time + ":00"
        preferred_time = raw_time

        # ── Other fields ──────────────────────────────────────────────────
        preferred_start_date  = data.get('preferred_start_date')      or None
        customer_requirements = (data.get('customer_requirements') or '').strip()
        contact_method        = data.get('contact_method')             or 'email'
        customer_contact      = (data.get('customer_contact') or '').strip()

        # Variant / package
        variant_id            = data.get('variant_id')            or None
        selected_variant_name = data.get('selected_variant_name') or None
        variant_price_raw     = data.get('variant_price')         or None
        try:
            variant_price = float(variant_price_raw) if variant_price_raw else None
        except (TypeError, ValueError):
            variant_price = None

        # Pricing
        try:
            quoted_price = float(variant_price or post['price'] or 0)
        except (TypeError, ValueError):
            quoted_price = 0.0

        # Travel / location
        try:
            travel_fee = float(data.get('travel_fee_preview') or 0)
        except (TypeError, ValueError):
            travel_fee = 0.0

        location_type     = data.get('location_type')    or 'online'
        buyer_address     = data.get('buyer_address')    or None
        buyer_pincode     = data.get('buyer_pincode')    or None
        delivery_timeline = data.get('delivery_timeline') or None

        total_amount = round(quoted_price + travel_fee, 2)
        final_price  = total_amount

        # ── INSERT ────────────────────────────────────────────────────────
        cursor.execute("""
            INSERT INTO service_bookings (
                post_id, service_provider_id, customer_id,
                preferred_start_date, preferred_time, booked_slot,
                customer_requirements, contact_method, customer_contact,
                quoted_price, currency, total_amount, final_price,
                status, payment_status,
                variant_id, selected_variant_name, variant_price,
                travel_fee, location_type, buyer_address, buyer_pincode,
                delivery_timeline, booking_date, created_at, updated_at
            ) VALUES (
                %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s,
                %s, 'INR', %s, %s,
                'pending', 'pending',
                %s, %s, %s,
                %s, %s, %s, %s,
                %s, NOW(), NOW(), NOW()
            )
        """, (
            post_id, provider_id, customer_id,
            preferred_start_date, preferred_time, booked_slot,
            customer_requirements, contact_method, customer_contact,
            quoted_price, total_amount, final_price,
            variant_id, selected_variant_name, variant_price,
            travel_fee, location_type, buyer_address, buyer_pincode,
            delivery_timeline,
        ))
        connection.commit()

        booking_id = cursor.lastrowid
        print(f"✅ Booking #{booking_id} | post={post_id} | customer={customer_id} "
              f"| slot={booked_slot} | date={preferred_start_date} "
              f"| loc={location_type} | total=₹{total_amount}")

        cursor.close()
        connection.close()

        return jsonify({
            'success': True,
            'message': 'Booking request sent successfully!',
            'booking_id': booking_id,
        }), 201

    except Exception as e:
        print(f"❌ Error creating booking: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


# =====================================================
# GET CUSTOMER'S BOOKINGS
# =====================================================
@service_booking_routes.route('/customer', methods=['GET'])
def get_customer_bookings():
    try:
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'message': 'No token provided'}), 401
        token = token.replace('Bearer ', '')
        try:
            payload = jwt.decode(token, os.getenv('JWT_SECRET_KEY', 'your-secret-key'), algorithms=['HS256'])
            customer_id = payload['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT 
                sb.*,
                u.username as provider_username,
                u.full_name as provider_name,
                u.profile_pic as provider_avatar,
                u.email as provider_email,
                p.media_url as service_image,
                p.product_title as service_name,
                p.caption
            FROM service_bookings sb
            INNER JOIN users u ON sb.service_provider_id = u.id
            LEFT JOIN posts p ON sb.post_id = p.post_id
            WHERE sb.customer_id = %s
            ORDER BY sb.booking_date DESC
        """, (customer_id,))

        bookings = cursor.fetchall()
        cursor.close()
        connection.close()

        return jsonify({'success': True, 'bookings': bookings})

    except Exception as e:
        print(f"❌ Error getting customer bookings: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


# =====================================================
# GET PROVIDER'S BOOKINGS
# =====================================================
@service_booking_routes.route('/provider', methods=['GET'])
def get_provider_bookings():
    try:
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'message': 'No token provided'}), 401
        token = token.replace('Bearer ', '')
        try:
            payload = jwt.decode(token, os.getenv('JWT_SECRET_KEY', 'your-secret-key'), algorithms=['HS256'])
            provider_id = payload['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT 
                sb.*,
                u.username as customer_username,
                u.full_name as customer_name,
                u.profile_pic as customer_avatar,
                u.email as customer_email,
                p.media_url as service_image,
                p.product_title as service_name,
                p.caption
            FROM service_bookings sb
            INNER JOIN users u ON sb.customer_id = u.id
            LEFT JOIN posts p ON sb.post_id = p.post_id
            WHERE sb.service_provider_id = %s
            ORDER BY sb.booking_date DESC
        """, (provider_id,))

        bookings = cursor.fetchall()
        cursor.close()
        connection.close()

        return jsonify({'success': True, 'bookings': bookings})

    except Exception as e:
        print(f"❌ Error getting provider bookings: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


# =====================================================
# GET BOOKING DETAILS
# =====================================================
@service_booking_routes.route('/<int:booking_id>', methods=['GET'])
def get_booking_details(booking_id):
    try:
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'message': 'No token provided'}), 401
        token = token.replace('Bearer ', '')
        try:
            payload = jwt.decode(token, os.getenv('JWT_SECRET_KEY', 'your-secret-key'), algorithms=['HS256'])
            user_id = payload['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT 
                sb.*,
                provider.username as provider_username,
                provider.full_name as provider_name,
                provider.profile_pic as provider_avatar,
                provider.email as provider_email,
                customer.username as customer_username,
                customer.full_name as customer_name,
                customer.profile_pic as customer_avatar,
                customer.email as customer_email,
                p.media_url as service_image,
                p.product_title as service_name,
                p.caption
            FROM service_bookings sb
            INNER JOIN users provider ON sb.service_provider_id = provider.id
            INNER JOIN users customer ON sb.customer_id = customer.id
            LEFT JOIN posts p ON sb.post_id = p.post_id
            WHERE sb.booking_id = %s
            AND (sb.customer_id = %s OR sb.service_provider_id = %s)
        """, (booking_id, user_id, user_id))

        booking = cursor.fetchone()
        cursor.close()
        connection.close()

        if not booking:
            return jsonify({'success': False, 'message': 'Booking not found or access denied'}), 404

        return jsonify({'success': True, 'booking': booking})

    except Exception as e:
        print(f"❌ Error getting booking details: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


# =====================================================
# ACCEPT BOOKING (PROVIDER)
# =====================================================
@service_booking_routes.route('/<int:booking_id>/accept', methods=['PUT'])
def accept_booking(booking_id):
    try:
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'message': 'No token provided'}), 401
        token = token.replace('Bearer ', '')
        try:
            payload = jwt.decode(token, os.getenv('JWT_SECRET_KEY', 'your-secret-key'), algorithms=['HS256'])
            provider_id = payload['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT booking_id FROM service_bookings
            WHERE booking_id = %s AND service_provider_id = %s AND status = 'pending'
        """, (booking_id, provider_id))

        if not cursor.fetchone():
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Booking not found or cannot be accepted'}), 404

        cursor.execute("""
            UPDATE service_bookings
            SET status = 'accepted', accepted_at = %s
            WHERE booking_id = %s
        """, (datetime.now(), booking_id))

        connection.commit()
        cursor.close()
        connection.close()

        return jsonify({'success': True, 'message': 'Booking accepted successfully'})

    except Exception as e:
        print(f"❌ Error accepting booking: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


# =====================================================
# REJECT BOOKING (PROVIDER)
# =====================================================
@service_booking_routes.route('/<int:booking_id>/reject', methods=['PUT'])
def reject_booking(booking_id):
    try:
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'message': 'No token provided'}), 401
        token = token.replace('Bearer ', '')
        try:
            payload = jwt.decode(token, os.getenv('JWT_SECRET_KEY', 'your-secret-key'), algorithms=['HS256'])
            provider_id = payload['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401

        data = request.get_json()
        reason = data.get('reason', '')

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT booking_id FROM service_bookings
            WHERE booking_id = %s AND service_provider_id = %s AND status = 'pending'
        """, (booking_id, provider_id))

        if not cursor.fetchone():
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Booking not found or cannot be rejected'}), 404

        cursor.execute("""
            UPDATE service_bookings
            SET status = 'rejected', rejected_at = %s, cancellation_reason = %s
            WHERE booking_id = %s
        """, (datetime.now(), reason, booking_id))

        connection.commit()
        cursor.close()
        connection.close()

        return jsonify({'success': True, 'message': 'Booking rejected'})

    except Exception as e:
        print(f"❌ Error rejecting booking: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


# =====================================================
# UPDATE BOOKING STATUS (PROVIDER)
# =====================================================
@service_booking_routes.route('/<int:booking_id>/status', methods=['PUT'])
def update_booking_status(booking_id):
    try:
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'message': 'No token provided'}), 401
        token = token.replace('Bearer ', '')
        try:
            payload = jwt.decode(token, os.getenv('JWT_SECRET_KEY', 'your-secret-key'), algorithms=['HS256'])
            provider_id = payload['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401

        data = request.get_json()
        new_status = data.get('status')
        provider_message = data.get('provider_message')

        if not new_status:
            return jsonify({'success': False, 'message': 'Status is required'}), 400

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT booking_id FROM service_bookings
            WHERE booking_id = %s AND service_provider_id = %s
        """, (booking_id, provider_id))

        if not cursor.fetchone():
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Booking not found or access denied'}), 404

        update_query = "UPDATE service_bookings SET status = %s"
        params = [new_status]

        if provider_message:
            update_query += ", provider_message = %s"
            params.append(provider_message)

        if new_status == 'completed':
            update_query += ", completed_at = %s"
            params.append(datetime.now())

        update_query += " WHERE booking_id = %s"
        params.append(booking_id)

        cursor.execute(update_query, params)
        connection.commit()
        cursor.close()
        connection.close()

        return jsonify({'success': True, 'message': 'Booking status updated successfully'})

    except Exception as e:
        print(f"❌ Error updating booking status: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


# =====================================================
# CANCEL BOOKING (CUSTOMER)
# =====================================================
@service_booking_routes.route('/<int:booking_id>/cancel', methods=['PUT'])
def cancel_booking(booking_id):
    try:
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'message': 'No token provided'}), 401
        token = token.replace('Bearer ', '')
        try:
            payload = jwt.decode(token, os.getenv('JWT_SECRET_KEY', 'your-secret-key'), algorithms=['HS256'])
            customer_id = payload['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT booking_id FROM service_bookings
            WHERE booking_id = %s AND customer_id = %s AND status IN ('pending', 'accepted')
        """, (booking_id, customer_id))

        if not cursor.fetchone():
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Booking not found or cannot be cancelled'}), 404

        cursor.execute("""
            UPDATE service_bookings
            SET status = 'cancelled', cancelled_at = %s
            WHERE booking_id = %s
        """, (datetime.now(), booking_id))

        connection.commit()
        cursor.close()
        connection.close()

        return jsonify({'success': True, 'message': 'Booking cancelled successfully'})

    except Exception as e:
        print(f"❌ Error cancelling booking: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


print("✅ Service Booking Routes loaded")