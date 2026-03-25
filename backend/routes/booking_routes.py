from flask import Blueprint, request, jsonify
from database.db import get_db_connection
from services.jwt_service import verify_token
from datetime import datetime, timedelta

# ✅ RESTORED: All notification imports uncommented
from database.notification_operations import (
    notify_order_placed,
    notify_order_confirmed,
    notify_order_rejected,
    notify_order_cancelled_by_buyer,
    notify_order_status_update,
    notify_payment_received,
    notify_booking_request,
    notify_booking_accepted,
    notify_booking_rejected,
    notify_booking_cancelled_by_customer,
)

from routes.delivery_routes import _get_gst_rate, _haversine_km, _coords_from_pincode
try:
    from services.deal_email_service import (
        send_booking_request_email,
        send_booking_accepted_email,
        send_booking_rejected_email,
        send_booking_cancelled_email,
        send_order_placed_email,
        send_order_confirmed_email,
        send_order_rejected_email,
        send_order_cancelled_email,
        send_order_status_email,
        send_payment_received_email,
    )
    _EMAILS_ENABLED = True
except ImportError as _e:
    print(f"⚠️ deal_email_service not found: {_e} — emails disabled")
    _EMAILS_ENABLED = False
booking_routes = Blueprint('booking_routes', __name__)

PLATFORM_FEE_PCT     = 5.0
SELLER_SHARE_PRODUCT = 0.95


def verify_user_token(token):
    if not token:
        return None
    result = verify_token(token)
    if result['valid']:
        return result['user_id']
    return None


def _record_product_commission(connection, order_id: int, seller_id: int,
                                post_id: int, gross_amount: float):
    platform_fee = round(gross_amount * PLATFORM_FEE_PCT / 100, 2)
    net_amount   = round(gross_amount - platform_fee, 2)
    try:
        cur = connection.cursor()
        cur.execute("""
            INSERT INTO sales_summary
                (seller_id, post_id, gross_amount, platform_fee, net_amount,
                 clearance_status, sale_date)
            VALUES (%s, %s, %s, %s, %s, 'pending', NOW())
            ON DUPLICATE KEY UPDATE
                gross_amount      = VALUES(gross_amount),
                platform_fee      = VALUES(platform_fee),
                net_amount        = VALUES(net_amount),
                clearance_status  = VALUES(clearance_status)
        """, (seller_id, post_id, gross_amount, platform_fee, net_amount))
        connection.commit()
        cur.close()
        print(f"✅ Commission recorded — order #{order_id}: "
              f"gross=₹{gross_amount}, fee=₹{platform_fee}, net=₹{net_amount}")
    except Exception as e:
        print(f"⚠️  Could not insert sales_summary for order #{order_id}: {e}")


# =====================================================
# SERVICE BOOKING ROUTES
# =====================================================

@booking_routes.route('/service-bookings/create', methods=['POST'])
def create_service_booking():
    """
    Create a new service booking.
    When service_location_type = 'both', buyer MUST pass location_type
    as either 'at_provider' or 'doorstep' — not 'both'.
    """
    try:
        auth_token  = request.headers.get('Authorization', '').replace('Bearer ', '')
        customer_id = verify_user_token(auth_token)
        if not customer_id:
            return jsonify({'success': False, 'message': 'Please login to book services'}), 401

        data = request.get_json()

        if not data.get('post_id'):
            return jsonify({'success': False, 'message': 'Missing required field: post_id'}), 400
        if not data.get('customer_requirements'):
            return jsonify({'success': False, 'message': 'Missing required field: customer_requirements'}), 400

        post_id    = int(data['post_id'])
        connection = get_db_connection()
        cursor     = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT user_id, post_type, price, product_title, title,
                   service_location_type, service_radius_km,
                   service_pincode, service_lat, service_lng,
                   doorstep_base_fee, doorstep_per_km
            FROM posts WHERE post_id = %s AND is_deleted = FALSE
        """, (post_id,))
        post = cursor.fetchone()

        if not post:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Service not found'}), 404
        if post['post_type'] != 'service':
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'This post is not a service'}), 400
        if post['user_id'] == customer_id:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'You cannot book your own service'}), 400

        # ── Resolve location type ──────────────────────────────────────────
        service_loc_type = post.get('service_location_type') or 'online'
        buyer_loc_choice = data.get('location_type', '').strip()

        if service_loc_type == 'both':
            if buyer_loc_choice not in ('at_provider', 'doorstep'):
                cursor.close(); connection.close()
                return jsonify({
                    'success': False,
                    'message': 'Please choose whether you will visit the provider or need doorstep service.'
                }), 400
            loc_type = buyer_loc_choice
        elif service_loc_type in ('online', 'at_provider', 'doorstep'):
            loc_type = service_loc_type
        else:
            loc_type = 'online'

        # ── Doorstep: radius check + travel fee ───────────────────────────
        travel_fee = 0.0

        if loc_type == 'doorstep' and data.get('buyer_pincode'):
            buyer_coords  = _coords_from_pincode(str(data['buyer_pincode']))
            seller_coords = None

            if post.get('service_lat') and post.get('service_lng'):
                seller_coords = (float(post['service_lat']), float(post['service_lng']))
            elif post.get('service_pincode'):
                seller_coords = _coords_from_pincode(str(post['service_pincode']))

            if buyer_coords and seller_coords:
                dist_km   = _haversine_km(seller_coords[0], seller_coords[1],
                                          buyer_coords[0],  buyer_coords[1])
                radius_km = int(post.get('service_radius_km') or 0)

                if radius_km > 0 and dist_km > radius_km:
                    cursor.close(); connection.close()
                    return jsonify({
                        'success': False,
                        'message': (
                            f'Service not available at your location. '
                            f'Provider travels within {radius_km} km. '
                            f'Your distance: {dist_km:.1f} km.'
                        )
                    }), 400

                base_fee   = float(post.get('doorstep_base_fee') or 0)
                per_km_fee = float(post.get('doorstep_per_km')   or 0)
                travel_fee = round(base_fee + (dist_km * per_km_fee), 2)
                print(f"🚗 Travel fee: ₹{base_fee} base + {dist_km:.1f}km × ₹{per_km_fee} = ₹{travel_fee}")

        # ── Pricing ───────────────────────────────────────────────────────
        variant_price = None
        raw_vp = data.get('variant_price')
        if raw_vp is not None:
            try:
                vp = float(raw_vp)
                if vp > 0:
                    variant_price = vp
            except (TypeError, ValueError):
                pass

        final_price  = variant_price if variant_price is not None else float(post['price'] or 0)
        total_amount = round(final_price + travel_fee, 2)

        cursor.execute("""
            INSERT INTO service_bookings (
                post_id, service_provider_id, customer_id,
                preferred_start_date, preferred_time, duration_days,
                customer_requirements, contact_method, customer_contact,
                quoted_price, currency, total_amount,
                variant_id, selected_variant_name, variant_price, final_price,
                location_type, buyer_address, buyer_pincode,
                travel_fee, delivery_timeline,
                status
            ) VALUES (
                %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s,
                'pending'
            )
        """, (
            post_id, post['user_id'], customer_id,
            data.get('preferred_start_date') or None,
            data.get('preferred_time')        or None,
            data.get('duration_days', 1),
            data['customer_requirements'],
            data.get('contact_method', 'email'),
            data.get('customer_contact'),
            float(post['price'] or 0),
            data.get('currency', 'INR'),
            total_amount,
            data.get('variant_id')             or None,
            data.get('selected_variant_name')  or None,
            variant_price,
            final_price,
            loc_type,
            data.get('buyer_address')          or None,
            data.get('buyer_pincode')           or None,
            travel_fee,
            data.get('delivery_timeline')       or None,
        ))
        connection.commit()
        booking_id   = cursor.lastrowid
        service_name = post['product_title'] or post['title'] or 'Service'
        provider_id  = post['user_id']
        cursor.close()
        connection.close()

        print(f"✅ Booking #{booking_id} created for service '{service_name}'")

        # ✅ RESTORED: Notify provider of new booking request
        try:
            notify_booking_request(
                booking_id   = booking_id,
                provider_id  = provider_id,
                customer_id  = customer_id,
                service_name = service_name,
                total_amount = total_amount,
                preferred_start_date = data.get('preferred_start_date'),
                requirements         = data.get('customer_requirements')
            )
            print(f"🔔 Booking request notification sent to provider {provider_id}")
        except Exception as e:
            print(f"⚠️ Failed to send booking notification (non-fatal): {e}")
        if _EMAILS_ENABLED:
            try:
                send_booking_request_email(
                    booking_id=booking_id, provider_id=provider_id, customer_id=customer_id,
                    service_name=service_name, total_amount=total_amount,
                    preferred_start_date=data.get('preferred_start_date'),
                    requirements=data.get('customer_requirements')
                )
            except Exception as _e: print(f"⚠️ Booking request email (non-fatal): {_e}")
        return jsonify({
            'success':      True,
            'message':      'Booking request sent successfully!',
            'booking_id':   booking_id,
            'total_amount': total_amount,
            'travel_fee':   travel_fee,
        }), 201

    except Exception as e:
        print(f"❌ Error creating service booking: {e}")
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to create booking'}), 500


@booking_routes.route('/service-bookings/<int:booking_id>', methods=['GET'])
def get_booking_details(booking_id):
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_id    = verify_user_token(auth_token)
        if not user_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        connection = get_db_connection()
        cursor     = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT sb.*, p.product_title AS service_title, p.media_url AS service_image,
                   p.short_description,
                   provider.username AS provider_username, provider.full_name AS provider_name,
                   provider.profile_pic AS provider_avatar, provider.email AS provider_email,
                   customer.username AS customer_username, customer.full_name AS customer_name,
                   customer.profile_pic AS customer_avatar, customer.email AS customer_email
            FROM service_bookings sb
            JOIN posts p ON sb.post_id = p.post_id
            JOIN users provider ON sb.service_provider_id = provider.id
            JOIN users customer ON sb.customer_id = customer.id
            WHERE sb.booking_id = %s
        """, (booking_id,))
        booking = cursor.fetchone()

        if not booking:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Booking not found'}), 404
        if booking['service_provider_id'] != user_id and booking['customer_id'] != user_id:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'You do not have access to this booking'}), 403

        cursor.close(); connection.close()
        return jsonify({'success': True, 'booking': booking}), 200

    except Exception as e:
        print(f"❌ Error fetching booking: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch booking details'}), 500


@booking_routes.route('/service-bookings/<int:booking_id>/respond', methods=['PUT'])
def respond_to_booking(booking_id):
    try:
        auth_token  = request.headers.get('Authorization', '').replace('Bearer ', '')
        provider_id = verify_user_token(auth_token)
        if not provider_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        data             = request.get_json()
        action           = data.get('action')
        provider_message = data.get('message', '')

        if action not in ['accept', 'reject']:
            return jsonify({'success': False, 'message': 'Invalid action. Must be accept or reject'}), 400

        connection = get_db_connection()
        cursor     = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT sb.*, p.product_title, p.title
            FROM service_bookings sb
            JOIN posts p ON sb.post_id = p.post_id
            WHERE sb.booking_id = %s
        """, (booking_id,))
        booking = cursor.fetchone()

        if not booking:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Booking not found'}), 404
        if booking['service_provider_id'] != provider_id:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Only the service provider can respond'}), 403
        if booking['status'] != 'pending':
            cursor.close(); connection.close()
            return jsonify({'success': False,
                            'message': f'Cannot respond to booking with status: {booking["status"]}'}), 400

        if action == 'accept':
            cursor.execute("""
                UPDATE service_bookings
                SET status = 'accepted', provider_message = %s,
                    accepted_at = NOW(), updated_at = NOW()
                WHERE booking_id = %s
            """, (provider_message, booking_id))
        else:
            cursor.execute("""
                UPDATE service_bookings
                SET status = 'rejected', provider_message = %s,
                    rejected_at = NOW(), updated_at = NOW()
                WHERE booking_id = %s
            """, (provider_message, booking_id))

        connection.commit()
        service_name = booking.get('product_title') or booking.get('title') or 'Service'
        customer_id  = booking['customer_id']
        cursor.close(); connection.close()

        print(f"✅ Booking #{booking_id} {action}ed by provider")

        # ✅ RESTORED: Notify customer of accept/reject
        try:
            if action == 'accept':
                notify_booking_accepted(
                    booking_id       = booking_id,
                    customer_id      = customer_id,
                    provider_id      = provider_id,
                    service_name     = service_name,
                    provider_message = provider_message
                )
                print(f"🔔 Booking accepted notification sent to customer {customer_id}")
            else:
                notify_booking_rejected(
                    booking_id  = booking_id,
                    customer_id = customer_id,
                    provider_id = provider_id,
                    service_name= service_name,
                    reason      = provider_message
                )
                print(f"🔔 Booking rejected notification sent to customer {customer_id}")
        except Exception as e:
            print(f"⚠️ Failed to send booking response notification (non-fatal): {e}")
        if _EMAILS_ENABLED and action == 'accept':
            try:
                send_booking_accepted_email(
                    booking_id=booking_id, customer_id=customer_id, provider_id=provider_id,
                    service_name=service_name, provider_message=provider_message
                )
            except Exception as _e: print(f"⚠️ Booking accepted email (non-fatal): {_e}")
        elif _EMAILS_ENABLED and action == 'reject':
            try:
                send_booking_rejected_email(
                    booking_id=booking_id, customer_id=customer_id, provider_id=provider_id,
                    service_name=service_name, reason=provider_message
                )
            except Exception as _e: print(f"⚠️ Booking rejected email (non-fatal): {_e}")
        return jsonify({'success': True, 'message': f'Booking {action}ed successfully'}), 200

    except Exception as e:
        print(f"❌ Error responding to booking: {e}")
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to respond to booking'}), 500


@booking_routes.route('/service-bookings/<int:booking_id>/cancel', methods=['PUT'])
def cancel_booking_by_customer(booking_id):
    try:
        auth_token  = request.headers.get('Authorization', '').replace('Bearer ', '')
        customer_id = verify_user_token(auth_token)
        if not customer_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        data                = request.get_json() or {}
        cancellation_reason = data.get('reason', '')

        connection = get_db_connection()
        cursor     = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT sb.*, p.product_title, p.title
            FROM service_bookings sb
            JOIN posts p ON sb.post_id = p.post_id
            WHERE sb.booking_id = %s
        """, (booking_id,))
        booking = cursor.fetchone()

        if not booking:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Booking not found'}), 404
        if booking['customer_id'] != customer_id:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Only the customer can cancel this booking'}), 403
        if booking['status'] not in ('pending', 'accepted'):
            cursor.close(); connection.close()
            return jsonify({'success': False,
                            'message': f'Cannot cancel booking with status: {booking["status"]}'}), 400

        cursor.execute("""
            UPDATE service_bookings
            SET status = 'cancelled', cancellation_reason = %s,
                cancelled_at = NOW(), updated_at = NOW()
            WHERE booking_id = %s
        """, (cancellation_reason, booking_id))
        connection.commit()
        service_name = booking.get('product_title') or booking.get('title') or 'Service'
        provider_id  = booking['service_provider_id']
        cursor.close(); connection.close()

        print(f"✅ Booking #{booking_id} cancelled by customer")

        # ✅ RESTORED: Notify provider of cancellation
        try:
            notify_booking_cancelled_by_customer(
                booking_id  = booking_id,
                provider_id = provider_id,
                customer_id = customer_id,
                service_name= service_name
            )
            print(f"🔔 Booking cancellation notification sent to provider {provider_id}")
        except Exception as e:
            print(f"⚠️ Failed to send booking cancellation notification (non-fatal): {e}")
        if _EMAILS_ENABLED:
            try:
                send_booking_cancelled_email(
                    booking_id=booking_id, provider_id=provider_id,
                    customer_id=customer_id, service_name=service_name
                )
            except Exception as _e: print(f"⚠️ Booking cancelled email (non-fatal): {_e}")
        return jsonify({'success': True, 'message': 'Booking cancelled successfully'}), 200

    except Exception as e:
        print(f"❌ Error cancelling booking: {e}")
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to cancel booking'}), 500


# =====================================================
# PRODUCT ORDER ROUTES
# =====================================================

@booking_routes.route('/product-orders/create', methods=['POST'])
def create_product_order():
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        buyer_id   = verify_user_token(auth_token)
        if not buyer_id:
            return jsonify({'success': False, 'message': 'Please login to place orders'}), 401

        data = request.get_json()

        for field in ['post_id', 'quantity']:
            if field not in data:
                return jsonify({'success': False, 'message': f'Missing required field: {field}'}), 400

        is_pickup = bool(data.get('is_pickup', False))

        if not is_pickup and 'shipping_address' not in data:
            return jsonify({'success': False, 'message': 'Missing required field: shipping_address'}), 400

        post_id       = int(data['post_id'])
        quantity      = max(int(data['quantity']), 1)
        buyer_pincode = str(data.get('buyer_pincode', '')).strip()
        buyer_lat     = data.get('buyer_lat')
        buyer_lng     = data.get('buyer_lng')

        connection = get_db_connection()
        cursor     = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT p.post_id, p.user_id, p.post_type, p.price,
                   p.product_title, p.stock,
                   p.category_id, p.subcategory_id,
                   p.shipping_available,
                   p.delivery_charge_type,
                   p.base_delivery_charge,
                   p.per_km_rate,
                   p.delivery_max_km,
                   p.seller_pincode,
                   p.seller_lat, p.seller_lng,
                   p.free_shipping_threshold,
                   p.shipping_cost,
                   p.pickup_address, p.pickup_city, p.pickup_state,
                   p.pickup_pincode, p.pickup_lat, p.pickup_lng
            FROM posts p
            WHERE p.post_id = %s AND p.is_deleted = FALSE
        """, (post_id,))
        post = cursor.fetchone()

        if not post:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Product not found'}), 404
        if post['post_type'] != 'product':
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'This post is not a product'}), 400
        if post['user_id'] == buyer_id:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'You cannot buy your own product'}), 400
        if post['stock'] is not None and quantity > post['stock']:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': f'Only {post["stock"]} items available'}), 400

        shipping_available = bool(post.get('shipping_available'))
        if not shipping_available:
            is_pickup = True

        unit_price = float(post['price'])
        subtotal   = round(unit_price * quantity, 2)

        gst_rate   = _get_gst_rate(cursor, post['category_id'], post.get('subcategory_id'))
        gst_amount = round(subtotal * gst_rate / 100, 2)

        delivery_charge   = 0.0
        delivery_distance = None

        if not is_pickup and shipping_available:
            charge_type = post.get('delivery_charge_type') or 'flat'

            if charge_type == 'free':
                delivery_charge = 0.0

            elif charge_type == 'flat':
                delivery_charge = float(post.get('base_delivery_charge') or post.get('shipping_cost') or 0)
                fst = post.get('free_shipping_threshold')
                if fst and subtotal >= float(fst):
                    delivery_charge = 0.0

            elif charge_type == 'per_km':
                base_charge = float(post.get('base_delivery_charge') or 0)
                per_km      = float(post.get('per_km_rate') or 0)
                max_km      = int(post.get('delivery_max_km') or 0)

                b_lat, b_lng = None, None
                if buyer_lat and buyer_lng:
                    try:
                        b_lat, b_lng = float(buyer_lat), float(buyer_lng)
                    except (ValueError, TypeError):
                        pass
                if not (b_lat and b_lng) and buyer_pincode and len(buyer_pincode) == 6:
                    coords = _coords_from_pincode(buyer_pincode)
                    if coords:
                        b_lat, b_lng = coords

                s_lat = float(post['seller_lat']) if post.get('seller_lat') else None
                s_lng = float(post['seller_lng']) if post.get('seller_lng') else None
                if not (s_lat and s_lng) and post.get('seller_pincode'):
                    coords = _coords_from_pincode(post['seller_pincode'])
                    if coords:
                        s_lat, s_lng = coords
                        cursor.execute(
                            "UPDATE posts SET seller_lat=%s, seller_lng=%s WHERE post_id=%s",
                            (s_lat, s_lng, post_id)
                        )
                        connection.commit()

                if b_lat and b_lng and s_lat and s_lng:
                    dist = _haversine_km(s_lat, s_lng, b_lat, b_lng)
                    delivery_distance = round(dist, 2)
                    if max_km and dist > max_km:
                        cursor.close(); connection.close()
                        return jsonify({
                            'success': False,
                            'message': f'Delivery not available. Your location is {delivery_distance:.1f} km from seller. Max: {max_km} km.'
                        }), 400
                    delivery_charge = round(base_charge + (dist * per_km), 2)
                else:
                    delivery_charge = base_charge

        total_amount = round(subtotal + gst_amount + delivery_charge, 2)

        addr = data.get('shipping_address') or {}

        cursor.execute("""
            INSERT INTO product_orders (
                post_id, seller_id, buyer_id, quantity,
                product_name, product_price, currency,
                subtotal, shipping_cost, tax_amount, gst_rate, gst_amount,
                delivery_charge, delivery_distance_km,
                buyer_lat, buyer_lng, buyer_pincode_delivery,
                discount_amount, total_amount,
                shipping_full_name, shipping_phone,
                shipping_address_line1, shipping_address_line2,
                shipping_city, shipping_state, shipping_pincode, shipping_country,
                shipping_landmark, buyer_notes,
                is_pickup,
                status, payment_status
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s,
                %s, %s, %s,
                %s, %s,
                %s, %s,
                %s, %s,
                %s, %s, %s, %s,
                %s, %s,
                %s,
                'pending', 'pending'
            )
        """, (
            post_id, post['user_id'], buyer_id, quantity,
            post['product_title'], post['price'], data.get('currency', 'INR'),
            subtotal, delivery_charge, gst_amount, gst_rate, gst_amount,
            delivery_charge, delivery_distance,
            buyer_lat, buyer_lng, buyer_pincode or None,
            0, total_amount,
            addr.get('full_name') if addr else None,
            addr.get('phone') if addr else None,
            addr.get('address_line1') if addr else None,
            addr.get('address_line2') if addr else None,
            addr.get('city') if addr else None,
            addr.get('state') if addr else None,
            addr.get('pincode') if addr else None,
            addr.get('country', 'India') if addr else 'India',
            addr.get('landmark') if addr else None,
            data.get('buyer_notes', ''),
            1 if is_pickup else 0,
        ))
        connection.commit()
        order_id     = cursor.lastrowid
        seller_id    = post['user_id']
        product_name = post['product_title']
        cursor.close(); connection.close()

        print(f"✅ Order #{order_id} placed for product: {product_name}")

        # ✅ RESTORED: Notify seller of new order
        try:
            notify_order_placed(
                order_id     = order_id,
                seller_id    = seller_id,
                buyer_id     = buyer_id,
                product_name = product_name,
                total_amount = total_amount
            )
            print(f"🔔 Order placed notification sent to seller {seller_id}")
        except Exception as e:
            print(f"⚠️ Failed to send order placed notification (non-fatal): {e}")
        if _EMAILS_ENABLED:
            try:
                send_order_placed_email(
                    order_id=order_id, seller_id=seller_id, buyer_id=buyer_id,
                    product_name=product_name, quantity=quantity, total_amount=total_amount
                )
            except Exception as _e: print(f"⚠️ Order placed email (non-fatal): {_e}")

        return jsonify({
            'success':              True,
            'message':              'Order placed successfully!',
            'order_id':             order_id,
            'is_pickup':            is_pickup,
            'subtotal':             subtotal,
            'gst_rate':             gst_rate,
            'gst_amount':           gst_amount,
            'delivery_charge':      delivery_charge,
            'delivery_distance_km': delivery_distance,
            'total_amount':         total_amount
        }), 201

    except Exception as e:
        print(f"❌ Error creating product order: {e}")
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to place order'}), 500
    

@booking_routes.route('/product-orders/<int:order_id>', methods=['GET'])
def get_order_details(order_id):
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_id    = verify_user_token(auth_token)
        if not user_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        connection = get_db_connection()
        cursor     = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT po.*, p.product_title, p.media_url AS product_image, p.short_description,
                   seller.username AS seller_username, seller.full_name AS seller_name,
                   seller.profile_pic AS seller_avatar, seller.email AS seller_email,
                   buyer.username AS buyer_username, buyer.full_name AS buyer_name,
                   buyer.profile_pic AS buyer_avatar, buyer.email AS buyer_email
            FROM product_orders po
            JOIN posts p ON po.post_id = p.post_id
            JOIN users seller ON po.seller_id = seller.id
            JOIN users buyer ON po.buyer_id = buyer.id
            WHERE po.order_id = %s
        """, (order_id,))
        order = cursor.fetchone()

        if not order:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Order not found'}), 404
        if order['seller_id'] != user_id and order['buyer_id'] != user_id:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'You do not have access to this order'}), 403

        cursor.close(); connection.close()
        return jsonify({'success': True, 'order': order}), 200

    except Exception as e:
        print(f"❌ Error fetching order: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch order details'}), 500


@booking_routes.route('/product-orders/<int:order_id>/confirm', methods=['PUT'])
def confirm_order(order_id):
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        seller_id  = verify_user_token(auth_token)
        if not seller_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        data           = request.get_json()
        seller_message = data.get('message', '')

        connection = get_db_connection()
        cursor     = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM product_orders WHERE order_id = %s", (order_id,))
        order = cursor.fetchone()

        if not order:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Order not found'}), 404
        if order['seller_id'] != seller_id:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Only the seller can confirm this order'}), 403
        if order['status'] != 'pending':
            cursor.close(); connection.close()
            return jsonify({'success': False,
                            'message': f'Cannot confirm order with status: {order["status"]}'}), 400

        cursor.execute("""
            UPDATE product_orders
            SET status = 'confirmed', seller_message = %s,
                confirmed_at = NOW(), updated_at = NOW()
            WHERE order_id = %s
        """, (seller_message, order_id))
        connection.commit()

        buyer_id     = order['buyer_id']
        product_name = order['product_name'] or order['product_title']
        cursor.close(); connection.close()

        print(f"✅ Order #{order_id} confirmed by seller")

        # ✅ RESTORED: Notify buyer of confirmation
        try:
            notify_order_confirmed(
                order_id     = order_id,
                buyer_id     = buyer_id,
                seller_id    = seller_id,
                product_name = product_name
            )
            print(f"🔔 Order confirmed notification sent to buyer {buyer_id}")
        except Exception as e:
            print(f"⚠️ Failed to send order confirmed notification (non-fatal): {e}")
        if _EMAILS_ENABLED:
            try:
                send_order_confirmed_email(
                    order_id=order_id, buyer_id=buyer_id, seller_id=seller_id,
                    product_name=product_name, total_amount=float(order.get('total_amount', 0))
                )
            except Exception as _e: print(f"⚠️ Order confirmed email (non-fatal): {_e}")
        return jsonify({'success': True, 'message': 'Order confirmed successfully'}), 200

    except Exception as e:
        print(f"❌ Error confirming order: {e}")
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to confirm order'}), 500


@booking_routes.route('/product-orders/<int:order_id>/reject', methods=['PUT'])
def reject_order(order_id):
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        seller_id  = verify_user_token(auth_token)
        if not seller_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        data   = request.get_json() or {}
        reason = data.get('reason', '')

        connection = get_db_connection()
        cursor     = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM product_orders WHERE order_id = %s", (order_id,))
        order = cursor.fetchone()

        if not order:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Order not found'}), 404
        if order['seller_id'] != seller_id:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Only the seller can reject this order'}), 403
        if order['status'] != 'pending':
            cursor.close(); connection.close()
            return jsonify({'success': False,
                            'message': f'Cannot reject order with status: {order["status"]}'}), 400

        cursor.execute("""
            UPDATE product_orders
            SET status = 'cancelled', seller_message = %s,
                cancelled_at = NOW(), updated_at = NOW()
            WHERE order_id = %s
        """, (reason, order_id))
        connection.commit()

        buyer_id     = order['buyer_id']
        product_name = order['product_name'] or order['product_title']
        cursor.close(); connection.close()

        print(f"❌ Order #{order_id} rejected by seller")

        # ✅ RESTORED: Notify buyer of rejection
        try:
            notify_order_rejected(
                order_id     = order_id,
                buyer_id     = buyer_id,
                seller_id    = seller_id,
                product_name = product_name,
                reason       = reason
            )
            print(f"🔔 Order rejected notification sent to buyer {buyer_id}")
        except Exception as e:
            print(f"⚠️ Failed to send order rejected notification (non-fatal): {e}")
        if _EMAILS_ENABLED:
            try:
                send_order_rejected_email(
                    order_id=order_id, buyer_id=buyer_id, seller_id=seller_id,
                    product_name=product_name, reason=reason
                )
            except Exception as _e: print(f"⚠️ Order rejected email (non-fatal): {_e}")
        return jsonify({'success': True, 'message': 'Order rejected'}), 200
        
    except Exception as e:
        print(f"❌ Error rejecting order: {e}")
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to reject order'}), 500


@booking_routes.route('/product-orders/<int:order_id>/cancel', methods=['PUT'])
def cancel_order_by_buyer(order_id):
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        buyer_id   = verify_user_token(auth_token)
        if not buyer_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        data   = request.get_json() or {}
        reason = data.get('reason', '')

        connection = get_db_connection()
        cursor     = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM product_orders WHERE order_id = %s", (order_id,))
        order = cursor.fetchone()

        if not order:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Order not found'}), 404
        if order['buyer_id'] != buyer_id:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Only the buyer can cancel this order'}), 403
        if order['status'] not in ('pending', 'confirmed'):
            cursor.close(); connection.close()
            return jsonify({'success': False,
                            'message': f'Cannot cancel order with status: {order["status"]}'}), 400

        cursor.execute("""
            UPDATE product_orders
            SET status = 'cancelled', cancellation_reason = %s,
                cancelled_at = NOW(), updated_at = NOW()
            WHERE order_id = %s
        """, (reason, order_id))
        connection.commit()

        seller_id    = order['seller_id']
        product_name = order['product_name'] or order['product_title']
        cursor.close(); connection.close()

        print(f"❌ Order #{order_id} cancelled by buyer")

        # ✅ RESTORED: Notify seller of cancellation
        try:
            notify_order_cancelled_by_buyer(
                order_id     = order_id,
                seller_id    = seller_id,
                buyer_id     = buyer_id,
                product_name = product_name
            )
            print(f"🔔 Order cancellation notification sent to seller {seller_id}")
        except Exception as e:
            print(f"⚠️ Failed to send order cancelled notification (non-fatal): {e}")
        if _EMAILS_ENABLED:
            try:
                send_order_cancelled_email(
                    order_id=order_id, seller_id=seller_id,
                    buyer_id=buyer_id, product_name=product_name
                )
            except Exception as _e: print(f"⚠️ Order cancelled email (non-fatal): {_e}")
        return jsonify({'success': True, 'message': 'Order cancelled successfully'}), 200

    except Exception as e:
        print(f"❌ Error cancelling order: {e}")
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to cancel order'}), 500


@booking_routes.route('/product-orders/<int:order_id>/status', methods=['PUT'])
def update_order_status(order_id):
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        seller_id  = verify_user_token(auth_token)
        if not seller_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        data            = request.get_json() or {}
        new_status      = data.get('status')
        tracking_number = data.get('tracking_number', '')
        carrier         = data.get('carrier', '')

        VALID = ('processing', 'shipped', 'out_for_delivery', 'delivered')
        if new_status not in VALID:
            return jsonify({'success': False,
                            'message': f'Invalid status. Must be one of: {", ".join(VALID)}'}), 400

        connection = get_db_connection()
        cursor     = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM product_orders WHERE order_id = %s", (order_id,))
        order = cursor.fetchone()

        if not order:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Order not found'}), 404
        if order['seller_id'] != seller_id:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Only the seller can update this order'}), 403

        is_pickup = bool(order.get('is_pickup', 0))

        ts_col = {
            'processing':       'processing_at',
            'shipped':          'shipped_at',
            'out_for_delivery': 'shipped_at',
            'delivered':        'delivered_at'
        }
        set_parts  = [f"status = %s", f"{ts_col[new_status]} = NOW()", "updated_at = NOW()"]
        set_values = [new_status]

        if tracking_number:
            set_parts.append("tracking_number = %s")
            set_values.append(tracking_number)
        if carrier:
            set_parts.append("shipping_carrier = %s")
            set_values.append(carrier)
        if is_pickup and new_status == 'delivered':
            set_parts.append("pickup_confirmed_at = NOW()")

        query = f"UPDATE product_orders SET {', '.join(set_parts)} WHERE order_id = %s"
        cursor.execute(query, set_values + [order_id])
        connection.commit()

        buyer_id     = order['buyer_id']
        product_name = order['product_name'] or order['product_title']
        cursor.close(); connection.close()

        print(f"📦 Order #{order_id} status updated to: {new_status}")

        # ✅ RESTORED: Notify buyer of status change
        try:
            notify_order_status_update(
                order_id     = order_id,
                buyer_id     = buyer_id,
                seller_id    = seller_id,
                product_name = product_name,
                new_status   = new_status
            )
            print(f"🔔 Order status update notification sent to buyer {buyer_id}")
        except Exception as e:
            print(f"⚠️ Failed to send order status notification (non-fatal): {e}")
        if _EMAILS_ENABLED:
            try:
                send_order_status_email(
                    order_id=order_id, buyer_id=buyer_id, seller_id=seller_id,
                    product_name=product_name, new_status=new_status,
                    tracking_number=tracking_number, carrier=carrier
                )
            except Exception as _e: print(f"⚠️ Order status email (non-fatal): {_e}")
        return jsonify({'success': True, 'message': f'Order status updated to {new_status}'}), 200

    except Exception as e:
        print(f"❌ Error updating order status: {e}")
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to update order status'}), 500


@booking_routes.route('/product-orders/<int:order_id>/payment', methods=['PUT'])
def mark_payment_received(order_id):
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        seller_id  = verify_user_token(auth_token)
        if not seller_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        data           = request.get_json() or {}
        payment_method = data.get('payment_method', 'manual')
        payment_ref    = data.get('payment_reference', '')

        connection = get_db_connection()
        cursor     = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM product_orders WHERE order_id = %s", (order_id,))
        order = cursor.fetchone()

        if not order:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Order not found'}), 404
        if order['seller_id'] != seller_id:
            cursor.close(); connection.close()
            return jsonify({'success': False,
                            'message': 'Only the seller can mark payment for this order'}), 403

        cursor.execute("""
            UPDATE product_orders
            SET payment_status = 'completed', payment_method = %s,
                payment_reference = %s, payment_date = NOW(), updated_at = NOW()
            WHERE order_id = %s
        """, (payment_method, payment_ref, order_id))
        connection.commit()
        cursor.close()

        buyer_id     = order['buyer_id']
        product_name = order['product_name'] or order['product_title']
        total_amount = float(order['total_amount'])

        _record_product_commission(
            connection   = connection,
            order_id     = order_id,
            seller_id    = order['seller_id'],
            post_id      = order['post_id'],
            gross_amount = total_amount
        )
        connection.close()

        print(f"💰 Payment received for order #{order_id}: ₹{total_amount}")

        # ✅ RESTORED: Notify seller of payment received
        try:
            notify_payment_received(
                order_id     = order_id,
                seller_id    = seller_id,
                buyer_id     = buyer_id,
                product_name = product_name,
                amount       = total_amount
            )
            print(f"🔔 Payment received notification sent to seller {seller_id}")
        except Exception as e:
            print(f"⚠️ Failed to send payment notification (non-fatal): {e}")
        if _EMAILS_ENABLED:
            try:
                net = round(total_amount * 0.95, 2)
                send_payment_received_email(
                    order_id=order_id, seller_id=seller_id, buyer_id=buyer_id,
                    net_amount=net, product_name=product_name
                )
            except Exception as _e: print(f"⚠️ Payment email (non-fatal): {_e}")
        return jsonify({'success': True, 'message': 'Payment marked as received'}), 200

    except Exception as e:
        print(f"❌ Error marking payment: {e}")
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to mark payment'}), 500


# =====================================================
# MY DEALS
# =====================================================

@booking_routes.route('/my-deals', methods=['GET'])
def get_my_deals():
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_id    = verify_user_token(auth_token)
        if not user_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        deal_type  = request.args.get('type', 'all')
        connection = get_db_connection()
        cursor     = connection.cursor(dictionary=True)

        deals = {
            'service_bookings': {'as_provider': [], 'as_customer': []},
            'product_orders':   {'as_seller':   [], 'as_buyer':   []}
        }

        if deal_type in ['all', 'selling']:
            cursor.execute("""
                SELECT sb.*, p.product_title AS service_title, p.media_url AS service_image,
                       customer.username AS customer_username, customer.full_name AS customer_name,
                       customer.profile_pic AS customer_avatar, customer.email AS customer_email
                FROM service_bookings sb
                JOIN posts p ON sb.post_id = p.post_id
                JOIN users customer ON sb.customer_id = customer.id
                WHERE sb.service_provider_id = %s ORDER BY sb.created_at DESC
            """, (user_id,))
            deals['service_bookings']['as_provider'] = cursor.fetchall()

        if deal_type in ['all', 'buying']:
            cursor.execute("""
                SELECT sb.*, p.product_title AS service_title, p.media_url AS service_image,
                       provider.username AS provider_username, provider.full_name AS provider_name,
                       provider.profile_pic AS provider_avatar, provider.email AS provider_email
                FROM service_bookings sb
                JOIN posts p ON sb.post_id = p.post_id
                JOIN users provider ON sb.service_provider_id = provider.id
                WHERE sb.customer_id = %s ORDER BY sb.created_at DESC
            """, (user_id,))
            deals['service_bookings']['as_customer'] = cursor.fetchall()

        if deal_type in ['all', 'selling']:
            cursor.execute("""
                SELECT po.*, p.product_title, p.media_url AS product_image,
                       buyer.username AS buyer_username, buyer.full_name AS buyer_name,
                       buyer.profile_pic AS buyer_avatar
                FROM product_orders po
                JOIN posts p ON po.post_id = p.post_id
                JOIN users buyer ON po.buyer_id = buyer.id
                WHERE po.seller_id = %s ORDER BY po.created_at DESC
            """, (user_id,))
            deals['product_orders']['as_seller'] = cursor.fetchall()

        if deal_type in ['all', 'buying']:
            cursor.execute("""
                SELECT po.*, p.product_title, p.media_url AS product_image,
                       seller.username AS seller_username, seller.full_name AS seller_name,
                       seller.profile_pic AS seller_avatar
                FROM product_orders po
                JOIN posts p ON po.post_id = p.post_id
                JOIN users seller ON po.seller_id = seller.id
                WHERE po.buyer_id = %s ORDER BY po.created_at DESC
            """, (user_id,))
            deals['product_orders']['as_buyer'] = cursor.fetchall()

        cursor.close(); connection.close()
        return jsonify({'success': True, 'deals': deals}), 200

    except Exception as e:
        print(f"❌ Error fetching my deals: {e}")
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to fetch deals'}), 500


print("✅ Booking Routes loaded — notifications restored for all actions")