"""
routes/deals_routes.py — COMPLETE UPDATED VERSION
─────────────────────────────────────────────────────────────────────────────
Changes from original:
  ✅ get_buyer_services()  — SELECT now includes all booking detail fields
  ✅ get_seller_services() — SELECT now includes all booking detail fields  
  ✅ get_buyer_products()  — SELECT now includes all order detail fields
  ✅ get_seller_products() — SELECT now includes all order detail fields
  ✅ All status update, payment, stats routes unchanged
─────────────────────────────────────────────────────────────────────────────
"""

from flask import Blueprint, request, jsonify
from database.db import get_db_connection
from datetime import datetime
import traceback
import jwt
import os
from routes.payment_routes import _apply_commission_and_credit, _get_platform_fees
from database.notification_operations import (
    notify_order_confirmed,
    notify_order_rejected,
    notify_order_cancelled_by_buyer,
    notify_order_status_update,
    notify_payment_received,
    notify_booking_accepted,
    notify_booking_rejected,
    notify_booking_cancelled_by_customer,
)

deals_bp = Blueprint('deals', __name__)


def verify_token(token):
    try:
        payload = jwt.decode(
            token,
            os.getenv('JWT_SECRET_KEY', 'your-secret-key'),
            algorithms=['HS256']
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def serialize_booking_data(bookings):
    """Convert timedelta and datetime objects to JSON-serializable formats"""
    for booking in bookings:
        for key, value in booking.items():
            if hasattr(value, 'days') and hasattr(value, 'seconds'):  # timedelta
                booking[key] = value.days
            elif isinstance(value, datetime):
                booking[key] = value.isoformat()
    return bookings


# =====================================================
# BUYER ROUTES
# =====================================================

@deals_bp.route('/deals/buyer/products', methods=['GET'])
def get_buyer_products():
    """Get all product orders for the logged-in buyer"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        payload = verify_token(auth_header.split(' ')[1])
        if not payload:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401

        buyer_id = payload['user_id']

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                po.*,
                p.title         AS product_title,
                p.media_url,
                p.media_type,
                p.accepts_cod,
                p.accepts_upi,
                p.accepts_bank_transfer,
                u.username      AS seller_username,
                u.full_name     AS seller_name,
                -- Shipping & delivery detail fields (for view-details modal)
                po.delivery_charge,
                po.gst_amount,
                po.gst_rate,
                po.delivery_distance_km,
                po.shipping_full_name,
                po.shipping_phone,
                po.shipping_address_line1,
                po.shipping_address_line2,
                po.shipping_city,
                po.shipping_state,
                po.shipping_pincode,
                po.shipping_landmark,
                po.buyer_notes,
                po.tracking_number,
                po.payment_reference,
                po.cancellation_reason,
                po.seller_message
            FROM product_orders po
            INNER JOIN posts p ON po.post_id = p.post_id
            INNER JOIN users u ON po.seller_id = u.id
            WHERE po.buyer_id = %s
            ORDER BY po.order_date DESC
        """, (buyer_id,))

        orders = cursor.fetchall()
        cursor.close()
        connection.close()

        return jsonify({'success': True, 'orders': orders, 'count': len(orders)})

    except Exception as e:
        print(f"❌ Error fetching buyer products: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'Error fetching orders'}), 500


@deals_bp.route('/deals/buyer/services', methods=['GET'])
def get_buyer_services():
    """Get all service bookings for the logged-in buyer"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        payload = verify_token(auth_header.split(' ')[1])
        if not payload:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401

        customer_id = payload['user_id']

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                sb.*,
                p.title          AS service_title,
                p.media_url,
                p.media_type,
                u.username       AS provider_username,
                u.full_name      AS provider_name,
                u.email          AS provider_email,
                -- All booking detail fields (for view-details modal)
                sb.selected_variant_name,
                sb.variant_id,
                sb.variant_price,
                sb.final_price,
                sb.travel_fee,
                sb.distance_km,
                sb.location_type,
                sb.buyer_address,
                sb.buyer_pincode,
                sb.booked_slot,
                sb.preferred_time,
                sb.delivery_timeline,
                sb.customer_contact,
                sb.contact_method,
                sb.customer_requirements,
                sb.provider_message,
                sb.cancellation_reason,
                sb.preferred_start_date,
                sb.quoted_price,
                sb.total_amount
            FROM service_bookings sb
            INNER JOIN posts p ON sb.post_id = p.post_id
            INNER JOIN users u ON sb.service_provider_id = u.id
            WHERE sb.customer_id = %s
            ORDER BY sb.booking_date DESC
        """, (customer_id,))

        bookings = serialize_booking_data(cursor.fetchall())
        cursor.close()
        connection.close()

        return jsonify({'success': True, 'bookings': bookings, 'count': len(bookings)})

    except Exception as e:
        print(f"❌ Error fetching buyer services: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'Error fetching bookings'}), 500


# =====================================================
# SELLER ROUTES
# =====================================================

@deals_bp.route('/deals/seller/products', methods=['GET'])
def get_seller_products():
    """Get all product orders for the logged-in seller"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        payload = verify_token(auth_header.split(' ')[1])
        if not payload:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401

        seller_id = payload['user_id']

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                po.*,
                p.title         AS product_title,
                p.media_url,
                p.media_type,
                u.username      AS buyer_username,
                u.full_name     AS buyer_name,
                -- Shipping & delivery detail fields (seller needs buyer's address)
                po.delivery_charge,
                po.gst_amount,
                po.gst_rate,
                po.delivery_distance_km,
                po.shipping_full_name,
                po.shipping_phone,
                po.shipping_address_line1,
                po.shipping_address_line2,
                po.shipping_city,
                po.shipping_state,
                po.shipping_pincode,
                po.shipping_landmark,
                po.buyer_notes,
                po.tracking_number,
                po.payment_reference,
                po.cancellation_reason,
                po.seller_message
            FROM product_orders po
            INNER JOIN posts p ON po.post_id = p.post_id
            INNER JOIN users u ON po.buyer_id = u.id
            WHERE po.seller_id = %s
            ORDER BY po.order_date DESC
        """, (seller_id,))

        orders = cursor.fetchall()
        cursor.close()
        connection.close()

        return jsonify({'success': True, 'orders': orders, 'count': len(orders)})

    except Exception as e:
        print(f"❌ Error fetching seller products: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'Error fetching orders'}), 500


@deals_bp.route('/deals/seller/services', methods=['GET'])
def get_seller_services():
    """Get all service bookings for the logged-in service provider"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        payload = verify_token(auth_header.split(' ')[1])
        if not payload:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401

        provider_id = payload['user_id']

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                sb.*,
                p.title          AS service_title,
                p.media_url,
                p.media_type,
                u.username       AS customer_username,
                u.full_name      AS customer_name,
                u.email          AS customer_email,
                -- All booking detail fields (for view-details modal)
                sb.selected_variant_name,
                sb.variant_id,
                sb.variant_price,
                sb.final_price,
                sb.travel_fee,
                sb.distance_km,
                sb.location_type,
                sb.buyer_address,
                sb.buyer_pincode,
                sb.booked_slot,
                sb.preferred_time,
                sb.delivery_timeline,
                sb.customer_contact,
                sb.contact_method,
                sb.customer_requirements,
                sb.provider_message,
                sb.cancellation_reason,
                sb.preferred_start_date,
                sb.quoted_price,
                sb.total_amount
            FROM service_bookings sb
            INNER JOIN posts p ON sb.post_id = p.post_id
            INNER JOIN users u ON sb.customer_id = u.id
            WHERE sb.service_provider_id = %s
            ORDER BY sb.booking_date DESC
        """, (provider_id,))

        bookings = serialize_booking_data(cursor.fetchall())
        cursor.close()
        connection.close()

        return jsonify({'success': True, 'bookings': bookings, 'count': len(bookings)})

    except Exception as e:
        print(f"❌ Error fetching seller services: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'Error fetching bookings'}), 500


# =====================================================
# UPDATE STATUS ROUTES
# =====================================================

@deals_bp.route('/deals/orders/<int:order_id>/status', methods=['PUT'])
def update_order_status(order_id):
    """Update the status of a product order"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        payload = verify_token(auth_header.split(' ')[1])
        if not payload:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401

        user_id = payload['user_id']
        data = request.get_json()
        new_status = data.get('status')

        if not new_status:
            return jsonify({'success': False, 'message': 'Status required'}), 400

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT po.*, p.title as product_name_fallback
            FROM product_orders po
            INNER JOIN posts p ON po.post_id = p.post_id
            WHERE po.order_id = %s
        """, (order_id,))
        order = cursor.fetchone()

        if not order:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Order not found'}), 404

        if user_id not in [order['buyer_id'], order['seller_id']]:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403

        # ── Block delivery if payment has not been set/submitted ──────────────
        if new_status == 'delivered' and user_id == order['seller_id']:
            payment_method = order.get('payment_method')
            payment_status = order.get('payment_status')

            if not payment_method:
                cursor.close(); connection.close()
                return jsonify({
                    'success': False,
                    'message': 'Cannot mark as delivered: buyer has not selected a payment method yet.'
                }), 400

            if payment_method != 'cod':
                allowed_statuses = ('completed', 'verification_pending')
                if payment_status not in allowed_statuses:
                    cursor.close(); connection.close()
                    return jsonify({
                        'success': False,
                        'message': 'Cannot mark as delivered: payment has not been submitted by the buyer yet.'
                    }), 400

        # Build update query
        update_fields = ['status = %s', 'updated_at = NOW()']
        params = [new_status]

        if new_status == 'confirmed':
            update_fields.append('confirmed_at = NOW()')
        elif new_status == 'processing':
            update_fields.append('processing_at = NOW()')
        elif new_status == 'shipped':
            update_fields.append('shipped_at = NOW()')
            if data.get('tracking_number'):
                update_fields.append('tracking_number = %s')
                params.append(data['tracking_number'])
        elif new_status == 'delivered':
            update_fields.append('delivered_at = NOW()')
        elif new_status == 'cancelled':
            update_fields.append('cancelled_at = NOW()')
            if data.get('cancellation_reason'):
                update_fields.append('cancellation_reason = %s')
                params.append(data['cancellation_reason'])

        params.append(order_id)
        cursor.execute(
            f"UPDATE product_orders SET {', '.join(update_fields)} WHERE order_id = %s",
            params
        )
        connection.commit()

        # ── COD commission: deduct 2% when seller marks delivered ─────────────
        if (new_status == 'delivered'
                and order.get('payment_method') == 'cod'
                and order.get('payment_status') in ('cod_pending', 'pending', None)
                and user_id == order['seller_id']):
            try:
                _, cod_pct = _get_platform_fees(cursor)
                _apply_commission_and_credit(cursor, connection, order, cod_pct, 'cod_commission')
                cursor.execute("""
                    UPDATE product_orders
                    SET payment_status     = 'completed',
                        payment_date       = NOW(),
                        payment_admin_note = %s,
                        updated_at         = NOW()
                    WHERE order_id = %s
                """, (f'COD collected — {cod_pct}% commission deducted', order_id))
                connection.commit()
            except Exception as cod_err:
                print(f'⚠️  COD commission error (non-fatal): {cod_err}')
                traceback.print_exc()

        cursor.close()
        connection.close()

        # ── Notifications ─────────────────────────────────────────────────────
        product_name = (
            order.get('product_name') or
            order.get('product_name_fallback') or
            'Product'
        )

        if new_status == 'cancelled':
            if user_id == order['buyer_id']:
                notify_order_cancelled_by_buyer(
                    order_id=order_id,
                    seller_id=order['seller_id'],
                    buyer_id=order['buyer_id'],
                    product_name=product_name
                )
            else:
                notify_order_rejected(
                    order_id=order_id,
                    buyer_id=order['buyer_id'],
                    seller_id=order['seller_id'],
                    product_name=product_name,
                    reason=data.get('cancellation_reason', '')
                )
        elif new_status == 'confirmed':
            notify_order_confirmed(
                order_id=order_id,
                buyer_id=order['buyer_id'],
                seller_id=order['seller_id'],
                product_name=product_name
            )
        elif new_status in ('processing', 'shipped', 'out_for_delivery', 'delivered'):
            notify_order_status_update(
                order_id=order_id,
                buyer_id=order['buyer_id'],
                seller_id=order['seller_id'],
                product_name=product_name,
                new_status=new_status
            )

        return jsonify({
            'success': True,
            'message': f'Order status updated to {new_status}'
        })

    except Exception as e:
        print(f'❌ Error updating order status: {e}')
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'Error updating order status'}), 500


@deals_bp.route('/deals/bookings/<int:booking_id>/status', methods=['PUT'])
def update_booking_status(booking_id):
    """Update the status of a service booking"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        payload = verify_token(auth_header.split(' ')[1])
        if not payload:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401

        user_id = payload['user_id']
        data = request.get_json()
        new_status = data.get('status')

        if not new_status:
            return jsonify({'success': False, 'message': 'Status required'}), 400

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT sb.*, p.title as service_name_fallback
            FROM service_bookings sb
            INNER JOIN posts p ON sb.post_id = p.post_id
            WHERE sb.booking_id = %s
        """, (booking_id,))
        booking = cursor.fetchone()

        if not booking:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Booking not found'}), 404

        if user_id not in [booking['customer_id'], booking['service_provider_id']]:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403

        update_fields = ['status = %s', 'updated_at = NOW()']
        params = [new_status]

        if new_status == 'accepted':
            update_fields.append('accepted_at = NOW()')
            if data.get('message'):
                update_fields.append('provider_message = %s')
                params.append(data['message'])
        elif new_status == 'rejected':
            update_fields.append('rejected_at = NOW()')
            if data.get('provider_message'):
                update_fields.append('provider_message = %s')
                params.append(data['provider_message'])
        elif new_status == 'completed':
            update_fields.append('completed_at = NOW()')
        elif new_status == 'cancelled':
            update_fields.append('cancelled_at = NOW()')
            if data.get('cancellation_reason'):
                update_fields.append('cancellation_reason = %s')
                params.append(data['cancellation_reason'])

        params.append(booking_id)
        cursor.execute(
            f"UPDATE service_bookings SET {', '.join(update_fields)} WHERE booking_id = %s",
            params
        )
        connection.commit()
        cursor.close(); connection.close()

        service_name = (
            booking.get('service_title') or
            booking.get('product_title') or
            booking.get('service_name_fallback') or
            'Service'
        )

        if new_status == 'accepted':
            notify_booking_accepted(
                booking_id=booking_id,
                customer_id=booking['customer_id'],
                provider_id=booking['service_provider_id'],
                service_name=service_name
            )
        elif new_status == 'rejected':
            notify_booking_rejected(
                booking_id=booking_id,
                customer_id=booking['customer_id'],
                provider_id=booking['service_provider_id'],
                service_name=service_name,
                reason=data.get('provider_message', '')
            )
        elif new_status == 'cancelled':
            if user_id == booking['customer_id']:
                notify_booking_cancelled_by_customer(
                    booking_id=booking_id,
                    provider_id=booking['service_provider_id'],
                    customer_id=booking['customer_id'],
                    service_name=service_name
                )

        return jsonify({'success': True, 'message': f'Booking status updated to {new_status}'})

    except Exception as e:
        print(f"❌ Error updating booking status: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'Error updating booking status'}), 500


# =====================================================
# UPDATE ORDER DETAILS (buyer only, pre-shipment)
# =====================================================

@deals_bp.route('/deals/orders/<int:order_id>/details', methods=['PUT'])
def update_order_details(order_id):
    """Update order shipping and buyer details (buyer only, not shipped yet)"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        payload = verify_token(auth_header.split(' ')[1])
        if not payload:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401

        user_id = payload['user_id']
        data = request.get_json()

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            "SELECT buyer_id, status FROM product_orders WHERE order_id = %s",
            (order_id,)
        )
        order = cursor.fetchone()

        if not order:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Order not found'}), 404

        if user_id != order['buyer_id']:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403

        if order['status'] in ['shipped', 'out_for_delivery', 'delivered', 'cancelled']:
            cursor.close(); connection.close()
            return jsonify({
                'success': False,
                'message': 'Cannot modify order details after shipping'
            }), 400

        update_fields = ['updated_at = NOW()']
        params = []

        allowed_fields = {
            'shipping_full_name', 'shipping_phone',
            'shipping_address_line1', 'shipping_address_line2',
            'shipping_city', 'shipping_state', 'shipping_pincode',
            'shipping_landmark', 'buyer_notes'
        }

        for field in allowed_fields:
            if field in data:
                update_fields.append(f'{field} = %s')
                params.append(data[field])

        if not params:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'No fields to update'}), 400

        params.append(order_id)
        cursor.execute(
            f"UPDATE product_orders SET {', '.join(update_fields)} WHERE order_id = %s",
            params
        )
        connection.commit()
        cursor.close(); connection.close()

        return jsonify({'success': True, 'message': 'Order details updated successfully'})

    except Exception as e:
        print(f"❌ Error updating order details: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'Error updating order details'}), 500


# =====================================================
# PAYMENT ROUTES
# =====================================================

@deals_bp.route('/deals/orders/<int:order_id>/payment', methods=['PUT'])
def update_order_payment(order_id):
    """Update payment status for a product order"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        payload = verify_token(auth_header.split(' ')[1])
        if not payload:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401

        user_id = payload['user_id']
        data = request.get_json()

        payment_status   = data.get('payment_status',   'completed')
        payment_method   = data.get('payment_method',   'upi')
        payment_reference = data.get(
            'payment_reference', f'FAKE_{datetime.now().timestamp()}'
        )

        if payment_method == 'cod':
            return jsonify({
                'success': False,
                'message': 'COD orders cannot be manually completed. '
                           'Commission is deducted when seller marks delivered.'
            }), 400

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT po.buyer_id, po.seller_id, po.total_amount,
                   COALESCE(po.product_name, p.title) as product_name
            FROM product_orders po
            INNER JOIN posts p ON po.post_id = p.post_id
            WHERE po.order_id = %s
        """, (order_id,))
        order = cursor.fetchone()

        if not order:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Order not found'}), 404

        if user_id != order['buyer_id']:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403

        cursor.execute("""
            UPDATE product_orders
            SET payment_status    = %s,
                payment_method    = %s,
                payment_reference = %s,
                payment_date      = NOW(),
                updated_at        = NOW()
            WHERE order_id = %s
        """, (payment_status, payment_method, payment_reference, order_id))
        connection.commit()
        cursor.close(); connection.close()

        if payment_status == 'completed':
            notify_payment_received(
                order_id=order_id,
                seller_id=order['seller_id'],
                buyer_id=order['buyer_id'],
                product_name=order['product_name'],
                amount=order['total_amount']
            )

        return jsonify({'success': True, 'message': 'Payment updated successfully'})

    except Exception as e:
        print(f"❌ Error updating payment: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'Error updating payment'}), 500


@deals_bp.route('/deals/bookings/<int:booking_id>/payment', methods=['PUT'])
def update_booking_payment(booking_id):
    """Update payment status for a service booking"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        payload = verify_token(auth_header.split(' ')[1])
        if not payload:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401

        user_id = payload['user_id']
        data = request.get_json()

        payment_status    = data.get('payment_status',    'completed')
        payment_method    = data.get('payment_method',    'upi')
        payment_reference = data.get(
            'payment_reference', f'FAKE_{datetime.now().timestamp()}'
        )

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT customer_id, service_provider_id
            FROM service_bookings WHERE booking_id = %s
        """, (booking_id,))
        booking = cursor.fetchone()

        if not booking:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Booking not found'}), 404

        if user_id != booking['customer_id']:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403

        cursor.execute("""
            UPDATE service_bookings
            SET payment_status    = %s,
                payment_method    = %s,
                payment_reference = %s,
                final_payment_date = NOW(),
                updated_at        = NOW()
            WHERE booking_id = %s
        """, (payment_status, payment_method, payment_reference, booking_id))
        connection.commit()
        cursor.close(); connection.close()

        return jsonify({'success': True, 'message': 'Payment updated successfully'})

    except Exception as e:
        print(f"❌ Error updating payment: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'Error updating payment'}), 500


# =====================================================
# STATISTICS ROUTES
# =====================================================

@deals_bp.route('/deals/stats', methods=['GET'])
def get_deals_stats():
    """Get statistics about user's deals"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        payload = verify_token(auth_header.split(' ')[1])
        if not payload:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401

        user_id = payload['user_id']

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT COUNT(*) as total_purchases,
                   SUM(total_amount) as total_spent,
                   SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as completed_purchases
            FROM product_orders WHERE buyer_id = %s
        """, (user_id,))
        buyer_product_stats = cursor.fetchone()

        cursor.execute("""
            SELECT COUNT(*) as total_bookings,
                   SUM(total_amount) as total_spent,
                   SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_bookings
            FROM service_bookings WHERE customer_id = %s
        """, (user_id,))
        buyer_service_stats = cursor.fetchone()

        cursor.execute("""
            SELECT COUNT(*) as total_sales,
                   SUM(total_amount) as total_revenue,
                   SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as completed_sales
            FROM product_orders WHERE seller_id = %s
        """, (user_id,))
        seller_product_stats = cursor.fetchone()

        cursor.execute("""
            SELECT COUNT(*) as total_bookings,
                   SUM(total_amount) as total_revenue,
                   SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_bookings
            FROM service_bookings WHERE service_provider_id = %s
        """, (user_id,))
        seller_service_stats = cursor.fetchone()

        cursor.close()
        connection.close()

        return jsonify({
            'success': True,
            'stats': {
                'buyer':  {'products': buyer_product_stats,  'services': buyer_service_stats},
                'seller': {'products': seller_product_stats, 'services': seller_service_stats}
            }
        })

    except Exception as e:
        print(f"❌ Error fetching deals stats: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'Error fetching statistics'}), 500