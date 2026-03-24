# =====================================================
# PRODUCT ORDERS ROUTES
# Handle all product order operations
# =====================================================

from flask import Blueprint, request, jsonify
import jwt
import os
from database.db import get_db_connection
from datetime import datetime

product_order_routes = Blueprint('product_orders', __name__)

# ===== GET BUYER'S ORDERS =====
@product_order_routes.route('/buyer', methods=['GET'])
def get_buyer_orders():
    try:
        # Verify authentication
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'message': 'No token provided'}), 401
        
        token = token.replace('Bearer ', '')
        
        try:
            payload = jwt.decode(token, os.getenv('JWT_SECRET_KEY', 'your-secret-key'), algorithms=['HS256'])
            buyer_id = payload['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Get all orders for this buyer with seller and product details
        cursor.execute("""
            SELECT 
                po.*,
                u.username as seller_username,
                u.full_name as seller_name,
                u.profile_pic as seller_avatar,
                p.media_url as product_image,
                p.caption
            FROM product_orders po
            INNER JOIN users u ON po.seller_id = u.id
            LEFT JOIN posts p ON po.post_id = p.post_id
            WHERE po.buyer_id = %s
            ORDER BY po.order_date DESC
        """, (buyer_id,))
        
        orders = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'orders': orders
        })
        
    except Exception as e:
        print(f"❌ Error getting buyer orders: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

# ===== GET SELLER'S ORDERS =====
@product_order_routes.route('/seller', methods=['GET'])
def get_seller_orders():
    try:
        # Verify authentication
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'message': 'No token provided'}), 401
        
        token = token.replace('Bearer ', '')
        
        try:
            payload = jwt.decode(token, os.getenv('JWT_SECRET_KEY', 'your-secret-key'), algorithms=['HS256'])
            seller_id = payload['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Get all orders for this seller with buyer and product details
        cursor.execute("""
            SELECT 
                po.*,
                u.username as buyer_username,
                u.full_name as buyer_name,
                u.profile_pic as buyer_avatar,
                p.media_url as product_image,
                p.caption
            FROM product_orders po
            INNER JOIN users u ON po.buyer_id = u.id
            LEFT JOIN posts p ON po.post_id = p.post_id
            WHERE po.seller_id = %s
            ORDER BY po.order_date DESC
        """, (seller_id,))
        
        orders = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'orders': orders
        })
        
    except Exception as e:
        print(f"❌ Error getting seller orders: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

# ===== GET ORDER DETAILS =====
@product_order_routes.route('/<int:order_id>', methods=['GET'])
def get_order_details(order_id):
    try:
        # Verify authentication
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
        
        # Get order details - user must be buyer or seller
        cursor.execute("""
            SELECT 
                po.*,
                seller.username as seller_username,
                seller.full_name as seller_name,
                seller.profile_pic as seller_avatar,
                buyer.username as buyer_username,
                buyer.full_name as buyer_name,
                buyer.profile_pic as buyer_avatar,
                p.media_url as product_image,
                p.caption,
                p.product_title as service_name
            FROM product_orders po
            INNER JOIN users seller ON po.seller_id = seller.id
            INNER JOIN users buyer ON po.buyer_id = buyer.id
            LEFT JOIN posts p ON po.post_id = p.post_id
            WHERE po.order_id = %s
            AND (po.buyer_id = %s OR po.seller_id = %s)
        """, (order_id, user_id, user_id))
        
        order = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        if not order:
            return jsonify({'success': False, 'message': 'Order not found or access denied'}), 404
        
        return jsonify({
            'success': True,
            'order': order
        })
        
    except Exception as e:
        print(f"❌ Error getting order details: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

# ===== CONFIRM ORDER (SELLER) =====
@product_order_routes.route('/<int:order_id>/confirm', methods=['PUT'])
def confirm_order(order_id):
    try:
        # Verify authentication
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'message': 'No token provided'}), 401
        
        token = token.replace('Bearer ', '')
        
        try:
            payload = jwt.decode(token, os.getenv('JWT_SECRET_KEY', 'your-secret-key'), algorithms=['HS256'])
            seller_id = payload['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Verify seller owns this order
        cursor.execute("""
            SELECT order_id FROM product_orders
            WHERE order_id = %s AND seller_id = %s AND status = 'pending'
        """, (order_id, seller_id))
        
        if not cursor.fetchone():
            cursor.close()
            connection.close()
            return jsonify({'success': False, 'message': 'Order not found or cannot be confirmed'}), 404
        
        # Update order status
        cursor.execute("""
            UPDATE product_orders
            SET status = 'confirmed', confirmed_at = %s
            WHERE order_id = %s
        """, (datetime.now(), order_id))
        
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'message': 'Order confirmed successfully'
        })
        
    except Exception as e:
        print(f"❌ Error confirming order: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

# ===== UPDATE ORDER STATUS (SELLER) =====
@product_order_routes.route('/<int:order_id>/status', methods=['PUT'])
def update_order_status(order_id):
    try:
        # Verify authentication
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'message': 'No token provided'}), 401
        
        token = token.replace('Bearer ', '')
        
        try:
            payload = jwt.decode(token, os.getenv('JWT_SECRET_KEY', 'your-secret-key'), algorithms=['HS256'])
            seller_id = payload['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401
        
        data = request.get_json()
        new_status = data.get('status')
        seller_message = data.get('seller_message')
        
        if not new_status:
            return jsonify({'success': False, 'message': 'Status is required'}), 400
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Verify seller owns this order
        cursor.execute("""
            SELECT order_id FROM product_orders
            WHERE order_id = %s AND seller_id = %s
        """, (order_id, seller_id))
        
        if not cursor.fetchone():
            cursor.close()
            connection.close()
            return jsonify({'success': False, 'message': 'Order not found or access denied'}), 404
        
        # Update order status and message
        update_query = "UPDATE product_orders SET status = %s"
        params = [new_status]
        
        if seller_message:
            update_query += ", seller_message = %s"
            params.append(seller_message)
        
        # Set timestamp based on status
        if new_status == 'processing':
            update_query += ", processing_at = %s"
            params.append(datetime.now())
        elif new_status == 'shipped':
            update_query += ", shipped_at = %s"
            params.append(datetime.now())
        elif new_status == 'delivered':
            update_query += ", delivered_at = %s"
            params.append(datetime.now())
        
        update_query += " WHERE order_id = %s"
        params.append(order_id)
        
        cursor.execute(update_query, params)
        connection.commit()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'message': 'Order status updated successfully'
        })
        
    except Exception as e:
        print(f"❌ Error updating order status: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

# ===== CANCEL ORDER (BUYER) =====
@product_order_routes.route('/<int:order_id>/cancel', methods=['PUT'])
def cancel_order(order_id):
    try:
        # Verify authentication
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'message': 'No token provided'}), 401
        
        token = token.replace('Bearer ', '')
        
        try:
            payload = jwt.decode(token, os.getenv('JWT_SECRET_KEY', 'your-secret-key'), algorithms=['HS256'])
            buyer_id = payload['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Verify buyer owns this order and it can be cancelled
        cursor.execute("""
            SELECT order_id FROM product_orders
            WHERE order_id = %s AND buyer_id = %s AND status IN ('pending', 'confirmed')
        """, (order_id, buyer_id))
        
        if not cursor.fetchone():
            cursor.close()
            connection.close()
            return jsonify({'success': False, 'message': 'Order not found or cannot be cancelled'}), 404
        
        # Update order status
        cursor.execute("""
            UPDATE product_orders
            SET status = 'cancelled', cancelled_at = %s
            WHERE order_id = %s
        """, (datetime.now(), order_id))
        
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'message': 'Order cancelled successfully'
        })
        
    except Exception as e:
        print(f"❌ Error cancelling order: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

print("✅ Product Order Routes loaded")