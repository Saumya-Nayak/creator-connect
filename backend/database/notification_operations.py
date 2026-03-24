"""
Notification Operations Module
✅ FIXED: Prevents duplicate message_reaction notifications
✅ NEW: Order and Booking notification functions
✅ COMPLETE: All email hooks wired in for reject/payment/cancel scenarios
"""
from database.db import get_db_connection
from mysql.connector import Error
from datetime import datetime
from services.deal_email_service import (
    on_order_placed, on_order_confirmed, on_order_rejected,
    on_order_status_update, on_payment_received,
    on_order_cancelled, on_booking_cancelled,  # ← NEW: cancellation emails
    on_booking_request, on_booking_accepted, on_booking_rejected,
)
# ===== CREATE NOTIFICATIONS =====

def create_notification(user_id, sender_id, notification_type, message, related_post_id=None, related_comment_id=None, related_message_id=None, nav_url=None):
    """
    Create a new notification
    ✅ FIXED: Prevents duplicate message_reaction notifications
    ✅ NEW: nav_url stored so frontend can navigate to right page
    """
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    
    try:
        cursor = connection.cursor()
        
        # Don't create notification if user is notifying themselves
        if user_id == sender_id:
            return {'success': False, 'message': 'Cannot notify yourself'}
        
        # FIX: For message_reaction notifications, delete old ones first
        if notification_type == 'message_reaction' and related_message_id:
            cursor.execute("""
                DELETE FROM notifications 
                WHERE user_id = %s 
                  AND sender_id = %s 
                  AND notification_type = 'message_reaction'
                  AND related_message_id = %s
            """, (user_id, sender_id, related_message_id))
            
            deleted_count = cursor.rowcount
            if deleted_count > 0:
                print(f"🗑️ Deleted {deleted_count} old message_reaction notification(s)")
        
        # Try to store nav_url in message field as JSON suffix, or use a dedicated column if available
        # We encode it as a special suffix that the frontend can parse
        stored_message = message
        if nav_url:
            stored_message = f"{message}||NAV:{nav_url}"
        
        insert_query = """
        INSERT INTO notifications (
            user_id, sender_id, notification_type, 
            message, related_post_id, related_comment_id, related_message_id, created_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
        """
        
        cursor.execute(insert_query, (
            user_id, sender_id, notification_type,
            stored_message, related_post_id, related_comment_id, related_message_id
        ))
        
        connection.commit()
        notification_id = cursor.lastrowid
        
        cursor.close()
        connection.close()
        
        print(f"🔔 Notification created: {notification_type} from user {sender_id} to user {user_id}")
        
        return {
            'success': True,
            'message': 'Notification created',
            'notification_id': notification_id
        }
        
    except Error as e:
        print(f"❌ Error creating notification: {e}")
        if connection:
            connection.rollback()
            connection.close()
        return {'success': False, 'message': f'Failed to create notification: {str(e)}'}


# =====================================================
# ✅ NEW: ORDER NOTIFICATION HELPERS
# =====================================================

def notify_order_placed(order_id, seller_id, buyer_id, product_name, total_amount):
    connection = get_db_connection()
    if not connection:
        return {'success': False}
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT username, full_name FROM users WHERE id = %s", (buyer_id,))
        buyer = cursor.fetchone()
        buyer_name = (buyer['full_name'] or buyer['username']) if buyer else 'A buyer'
        cursor.close(); connection.close()
    except Error as e:
        print(f"❌ Error fetching buyer: {e}")
        if connection: connection.close()
        buyer_name = 'A buyer'

    short_name = product_name[:40] + "..." if len(product_name) > 40 else product_name
    message = f"{buyer_name} placed an order for \"{short_name}\" — ₹{total_amount}"
    nav_url = "my-deals.html?role=seller&type=products&status=pending"

    # ✅ Send email to seller
    on_order_placed(order_id, seller_id, buyer_id, product_name, 1, total_amount)

    return create_notification(
        user_id=seller_id, sender_id=buyer_id,
        notification_type='order_request',
        message=message, nav_url=nav_url
    )


def notify_order_confirmed(order_id, buyer_id, seller_id, product_name):
    connection = get_db_connection()
    if not connection:
        return {'success': False}
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT username, full_name FROM users WHERE id = %s", (seller_id,))
        seller = cursor.fetchone()
        seller_name = (seller['full_name'] or seller['username']) if seller else 'The seller'

        # Fetch total_amount for the email
        cursor.execute("SELECT total_amount FROM product_orders WHERE order_id = %s", (order_id,))
        order_row = cursor.fetchone()
        total_amount = order_row['total_amount'] if order_row else 0

        cursor.close(); connection.close()
    except Error as e:
        print(f"❌ Error fetching seller: {e}")
        if connection: connection.close()
        seller_name = 'The seller'
        total_amount = 0

    short_name = product_name[:40] + "..." if len(product_name) > 40 else product_name
    message = f"{seller_name} confirmed your order for \"{short_name}\""
    nav_url = "my-deals.html?role=buyer&type=products&status=confirmed"

    # ✅ Send email to buyer
    on_order_confirmed(order_id, buyer_id, seller_id, product_name, total_amount)

    return create_notification(
        user_id=buyer_id, sender_id=seller_id,
        notification_type='order_accepted',
        message=message, nav_url=nav_url
    )


def notify_order_rejected(order_id, buyer_id, seller_id, product_name, reason=""):
    """
    Notify BUYER when seller rejects their order
    → In-app notification + EMAIL to buyer
    → Navigates buyer to: mydeals?role=buyer&type=products&status=cancelled
    """
    connection = get_db_connection()
    if not connection:
        return {'success': False}
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT username, full_name FROM users WHERE id = %s", (seller_id,))
        seller = cursor.fetchone()
        seller_name = (seller['full_name'] or seller['username']) if seller else 'The seller'
        
        # ✅ ADDED: Fetch total_amount for the email
        cursor.execute("SELECT total_amount FROM product_orders WHERE order_id = %s", (order_id,))
        order_row = cursor.fetchone()
        total_amount = order_row['total_amount'] if order_row else 0
        
        cursor.close()
        connection.close()
    except Error as e:
        print(f"❌ Error fetching seller: {e}")
        if connection:
            connection.close()
        seller_name = 'The seller'
        total_amount = 0

    short_name = product_name[:40] + "..." if len(product_name) > 40 else product_name
    message = f"{seller_name} rejected your order for \"{short_name}\""
    if reason:
        message += f": {reason[:60]}"
    nav_url = "my-deals.html?role=buyer&type=products&status=cancelled"

    # ✅ ADDED: Send email to buyer with rejection reason
    on_order_rejected(order_id, buyer_id, seller_id, product_name, total_amount, reason)

    return create_notification(
        user_id=buyer_id,
        sender_id=seller_id,
        notification_type='order_rejected',
        message=message,
        nav_url=nav_url
    )


def notify_order_cancelled_by_buyer(order_id, seller_id, buyer_id, product_name):
    """
    Notify SELLER when buyer cancels an order
    → In-app notification + EMAIL to seller
    → Navigates seller to: mydeals?role=seller&type=products&status=cancelled
    """
    connection = get_db_connection()
    if not connection:
        return {'success': False}
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT username, full_name FROM users WHERE id = %s", (buyer_id,))
        buyer = cursor.fetchone()
        buyer_name = (buyer['full_name'] or buyer['username']) if buyer else 'A buyer'
        
        # ✅ Fetch total_amount and cancellation_reason for the email
        cursor.execute(
            "SELECT total_amount, cancellation_reason FROM product_orders WHERE order_id = %s",
            (order_id,)
        )
        order_row = cursor.fetchone()
        total_amount = order_row['total_amount'] if order_row else 0
        reason = order_row['cancellation_reason'] if order_row else ""
        
        cursor.close()
        connection.close()
    except Error as e:
        print(f"❌ Error fetching buyer: {e}")
        if connection:
            connection.close()
        buyer_name = 'A buyer'
        total_amount = 0
        reason = ""

    short_name = product_name[:40] + "..." if len(product_name) > 40 else product_name
    message = f"{buyer_name} cancelled their order for \"{short_name}\""
    nav_url = "my-deals.html?role=seller&type=products&status=cancelled"

    # ✅ ADDED: Send email to seller
    on_order_cancelled(order_id, seller_id, buyer_id, product_name, total_amount, reason)

    return create_notification(
        user_id=seller_id,
        sender_id=buyer_id,
        notification_type='order_cancelled',
        message=message,
        nav_url=nav_url
    )


def notify_order_status_update(order_id, buyer_id, seller_id, product_name, new_status):
    connection = get_db_connection()
    if not connection:
        return {'success': False}
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT username, full_name FROM users WHERE id = %s", (seller_id,))
        seller = cursor.fetchone()
        seller_name = (seller['full_name'] or seller['username']) if seller else 'The seller'

        # Fetch tracking number for shipped emails
        cursor.execute(
            "SELECT tracking_number FROM product_orders WHERE order_id = %s", (order_id,)
        )
        order_row = cursor.fetchone()
        tracking_number = order_row['tracking_number'] if order_row else None

        cursor.close(); connection.close()
    except Error as e:
        print(f"❌ Error fetching seller: {e}")
        if connection: connection.close()
        seller_name = 'The seller'
        tracking_number = None

    status_labels = {
        'processing':       'is now being processed',
        'shipped':          'has been shipped',
        'out_for_delivery': 'is out for delivery',
        'delivered':        'has been delivered',
    }
    status_text = status_labels.get(new_status, f'status updated to {new_status}')
    short_name = product_name[:40] + "..." if len(product_name) > 40 else product_name
    message = f"Your order for \"{short_name}\" {status_text}"
    nav_url = "my-deals.html?role=buyer&type=products"

    # ✅ Send email to buyer
    on_order_status_update(order_id, buyer_id, seller_id, product_name,
                           new_status, tracking_number)

    return create_notification(
        user_id=buyer_id, sender_id=seller_id,
        notification_type='order_status_update',
        message=message, nav_url=nav_url
    )


def notify_payment_received(order_id, seller_id, buyer_id, product_name, amount):
    """
    Notify SELLER when buyer completes payment
    → In-app notification + EMAIL with withdraw CTA
    → Navigates seller to: mydeals?role=seller&type=products
    """
    connection = get_db_connection()
    if not connection:
        return {'success': False}
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT username, full_name FROM users WHERE id = %s", (buyer_id,))
        buyer = cursor.fetchone()
        buyer_name = (buyer['full_name'] or buyer['username']) if buyer else 'A buyer'
        cursor.close()
        connection.close()
    except Error as e:
        print(f"❌ Error fetching buyer: {e}")
        if connection:
            connection.close()
        buyer_name = 'A buyer'

    short_name = product_name[:40] + "..." if len(product_name) > 40 else product_name
    message = f"{buyer_name} completed payment of ₹{amount} for \"{short_name}\""
    nav_url = "my-deals.html?role=seller&type=products"

    # ✅ ADDED: Send email to seller with withdrawal CTA
    on_payment_received(order_id, seller_id, buyer_id, product_name, amount)

    return create_notification(
        user_id=seller_id,
        sender_id=buyer_id,
        notification_type='payment_received',
        message=message,
        nav_url=nav_url
    )


# =====================================================
# ✅ NEW: SERVICE BOOKING NOTIFICATION HELPERS
# =====================================================

def notify_booking_request(booking_id, provider_id, customer_id,
                            service_name, total_amount,
                            preferred_start_date=None, requirements=None):
    connection = get_db_connection()
    if not connection:
        return {'success': False}
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT username, full_name FROM users WHERE id = %s", (customer_id,))
        customer = cursor.fetchone()
        customer_name = (customer['full_name'] or customer['username']) if customer else 'A customer'
        cursor.close(); connection.close()
    except Error as e:
        print(f"❌ Error fetching customer: {e}")
        if connection: connection.close()
        customer_name = 'A customer'

    short_name = service_name[:40] + "..." if len(service_name) > 40 else service_name
    message = f"{customer_name} requested a booking for \"{short_name}\" — ₹{total_amount}"
    nav_url = "my-deals.html?role=seller&type=services&status=pending"

    # ✅ Send email to provider
    on_booking_request(
        booking_id, provider_id, customer_id,
        service_name, total_amount,
        preferred_start_date, requirements
    )

    return create_notification(
        user_id=provider_id, sender_id=customer_id,
        notification_type='booking_request',
        message=message, nav_url=nav_url
    )


def notify_booking_accepted(booking_id, customer_id, provider_id,
                             service_name, provider_message=""):
    connection = get_db_connection()
    if not connection:
        return {'success': False}
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT username, full_name FROM users WHERE id = %s", (provider_id,))
        provider = cursor.fetchone()
        provider_name = (provider['full_name'] or provider['username']) if provider else 'The provider'

        # Fetch total_amount for the email
        cursor.execute(
            "SELECT total_amount FROM service_bookings WHERE booking_id = %s", (booking_id,)
        )
        booking_row = cursor.fetchone()
        total_amount = booking_row['total_amount'] if booking_row else 0

        cursor.close(); connection.close()
    except Error as e:
        print(f"❌ Error fetching provider: {e}")
        if connection: connection.close()
        provider_name = 'The provider'
        total_amount = 0

    short_name = service_name[:40] + "..." if len(service_name) > 40 else service_name
    message = f"{provider_name} accepted your booking for \"{short_name}\" — they will contact you soon!"
    nav_url = "my-deals.html?role=buyer&type=services&status=accepted"

    # ✅ Send email to customer
    on_booking_accepted(booking_id, customer_id, provider_id,
                        service_name, total_amount, provider_message)

    return create_notification(
        user_id=customer_id, sender_id=provider_id,
        notification_type='booking_accepted',
        message=message, nav_url=nav_url
    )


def notify_booking_rejected(booking_id, customer_id, provider_id, service_name, reason=""):
    """
    Notify CUSTOMER when provider rejects their booking
    → In-app notification + EMAIL to customer
    → Navigates customer to: mydeals?role=buyer&type=services&status=rejected
    """
    connection = get_db_connection()
    if not connection:
        return {'success': False}
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT username, full_name FROM users WHERE id = %s", (provider_id,))
        provider = cursor.fetchone()
        provider_name = (provider['full_name'] or provider['username']) if provider else 'The provider'
        
        # ✅ ADDED: Fetch total_amount for the email
        cursor.execute("SELECT total_amount FROM service_bookings WHERE booking_id = %s", (booking_id,))
        booking_row = cursor.fetchone()
        total_amount = booking_row['total_amount'] if booking_row else 0
        
        cursor.close()
        connection.close()
    except Error as e:
        print(f"❌ Error fetching provider: {e}")
        if connection:
            connection.close()
        provider_name = 'The provider'
        total_amount = 0

    short_name = service_name[:40] + "..." if len(service_name) > 40 else service_name
    message = f"{provider_name} declined your booking for \"{short_name}\""
    if reason:
        message += f": {reason[:60]}"
    nav_url = "my-deals.html?role=buyer&type=services&status=rejected"

    # ✅ ADDED: Send email to customer with rejection reason
    on_booking_rejected(booking_id, customer_id, provider_id, service_name, total_amount, reason)

    return create_notification(
        user_id=customer_id,
        sender_id=provider_id,
        notification_type='booking_rejected',
        message=message,
        nav_url=nav_url
    )


def notify_booking_cancelled_by_customer(booking_id, provider_id, customer_id, service_name):
    """
    Notify SERVICE PROVIDER when customer cancels a booking
    → In-app notification + EMAIL to provider
    → Navigates provider to: mydeals?role=seller&type=services&status=cancelled
    """
    connection = get_db_connection()
    if not connection:
        return {'success': False}
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT username, full_name FROM users WHERE id = %s", (customer_id,))
        customer = cursor.fetchone()
        customer_name = (customer['full_name'] or customer['username']) if customer else 'A customer'
        
        # ✅ Fetch total_amount and cancellation_reason for the email
        cursor.execute(
            "SELECT total_amount, cancellation_reason FROM service_bookings WHERE booking_id = %s",
            (booking_id,)
        )
        booking_row = cursor.fetchone()
        total_amount = booking_row['total_amount'] if booking_row else 0
        reason = booking_row['cancellation_reason'] if booking_row else ""
        
        cursor.close()
        connection.close()
    except Error as e:
        print(f"❌ Error fetching customer: {e}")
        if connection:
            connection.close()
        customer_name = 'A customer'
        total_amount = 0
        reason = ""

    short_name = service_name[:40] + "..." if len(service_name) > 40 else service_name
    message = f"{customer_name} cancelled their booking for \"{short_name}\""
    nav_url = "my-deals.html?role=seller&type=services&status=cancelled"

    # ✅ ADDED: Send email to provider
    on_booking_cancelled(booking_id, provider_id, customer_id, service_name, total_amount, reason)

    return create_notification(
        user_id=provider_id,
        sender_id=customer_id,
        notification_type='booking_cancelled',
        message=message,
        nav_url=nav_url
    )


# =====================================================
# EXISTING NOTIFICATION HELPERS (unchanged)
# =====================================================

def notify_shared_post(receiver_id, sender_id, post_id, post_title):
    """Notify user when someone shares a post with them via message"""
    connection = get_db_connection()
    if not connection:
        return {'success': False}
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT username, full_name FROM users WHERE id = %s", (sender_id,))
        sender = cursor.fetchone()
        sender_name = (sender['full_name'] or sender['username']) if sender else 'Someone'
        cursor.close()
        connection.close()
    except Error as e:
        print(f"❌ Error creating shared post notification: {e}")
        if connection:
            connection.close()
        return {'success': False, 'message': str(e)}

    if receiver_id == sender_id:
        return {'success': False, 'message': 'Self-send'}

    title_preview = post_title[:40] + "..." if len(post_title) > 40 else post_title
    message = f"{sender_name} shared a post with you: \"{title_preview}\""

    return create_notification(
        user_id=receiver_id,
        sender_id=sender_id,
        notification_type='shared_post',
        message=message,
        related_post_id=post_id
    )


def notify_message_reaction(message_owner_id, reactor_id, message_id, reaction_type):
    """Notify user when someone reacts to their message — prevents duplicates"""
    connection = get_db_connection()
    if not connection:
        return {'success': False}
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT username, full_name FROM users WHERE id = %s", (reactor_id,))
        reactor = cursor.fetchone()
        reactor_name = (reactor['full_name'] or reactor['username']) if reactor else 'Someone'
        cursor.close()
        connection.close()
    except Error as e:
        print(f"❌ Error creating message reaction notification: {e}")
        if connection:
            connection.close()
        return {'success': False, 'message': str(e)}

    if message_owner_id == reactor_id:
        return {'success': False, 'message': 'Self-reaction'}

    reaction_emojis = {'like': '👍', 'love': '❤️', 'laugh': '😂', 'wow': '😮', 'sad': '😢', 'angry': '😠'}
    emoji = reaction_emojis.get(reaction_type, '👍')
    message = f"{reactor_name} reacted {emoji} to your message"

    return create_notification(
        user_id=message_owner_id,
        sender_id=reactor_id,
        notification_type='message_reaction',
        message=message,
        related_message_id=message_id
    )


def notify_post_like(post_id, liker_user_id):
    """Notify user when their post is liked"""
    connection = get_db_connection()
    if not connection:
        return {'success': False}
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT user_id, caption FROM posts WHERE post_id = %s AND is_deleted = FALSE", (post_id,))
        post = cursor.fetchone()
        if not post:
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'Post not found'}
        post_owner_id = post['user_id']
        cursor.execute("SELECT username, full_name FROM users WHERE id = %s", (liker_user_id,))
        liker = cursor.fetchone()
        liker_name = (liker['full_name'] or liker['username']) if liker else 'Someone'
        cursor.close()
        connection.close()
    except Error as e:
        print(f"❌ Error creating like notification: {e}")
        if connection:
            connection.close()
        return {'success': False, 'message': str(e)}

    if post_owner_id == liker_user_id:
        return {'success': False, 'message': 'Self-like'}

    return create_notification(
        user_id=post_owner_id,
        sender_id=liker_user_id,
        notification_type='like',
        message=f"{liker_name} liked your post",
        related_post_id=post_id
    )


def notify_post_comment(post_id, commenter_user_id, comment_content):
    """Notify user when their post receives a comment"""
    connection = get_db_connection()
    if not connection:
        return {'success': False}
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT user_id FROM posts WHERE post_id = %s AND is_deleted = FALSE", (post_id,))
        post = cursor.fetchone()
        if not post:
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'Post not found'}
        post_owner_id = post['user_id']
        cursor.execute("SELECT username, full_name FROM users WHERE id = %s", (commenter_user_id,))
        commenter = cursor.fetchone()
        commenter_name = (commenter['full_name'] or commenter['username']) if commenter else 'Someone'
        cursor.close()
        connection.close()
    except Error as e:
        print(f"❌ Error creating comment notification: {e}")
        if connection:
            connection.close()
        return {'success': False, 'message': str(e)}

    if post_owner_id == commenter_user_id:
        return {'success': False, 'message': 'Self-comment'}

    preview = comment_content[:50] + "..." if len(comment_content) > 50 else comment_content
    return create_notification(
        user_id=post_owner_id,
        sender_id=commenter_user_id,
        notification_type='comment',
        message=f"{commenter_name} commented: \"{preview}\"",
        related_post_id=post_id
    )


def notify_follow(followed_user_id, follower_user_id):
    """Notify user when someone follows them"""
    connection = get_db_connection()
    if not connection:
        return {'success': False}
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT username, full_name FROM users WHERE id = %s", (follower_user_id,))
        follower = cursor.fetchone()
        follower_name = (follower['full_name'] or follower['username']) if follower else 'Someone'
        cursor.close()
        connection.close()
    except Error as e:
        print(f"❌ Error creating follow notification: {e}")
        if connection:
            connection.close()
        return {'success': False, 'message': str(e)}

    return create_notification(
        user_id=followed_user_id,
        sender_id=follower_user_id,
        notification_type='follow',
        message=f"{follower_name} started following you"
    )


def notify_follow_request(requested_user_id, requester_user_id):
    """Notify user when someone requests to follow them"""
    connection = get_db_connection()
    if not connection:
        return {'success': False}
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT username, full_name FROM users WHERE id = %s", (requester_user_id,))
        requester = cursor.fetchone()
        requester_name = (requester['full_name'] or requester['username']) if requester else 'Someone'
        cursor.close()
        connection.close()
    except Error as e:
        print(f"❌ Error creating follow request notification: {e}")
        if connection:
            connection.close()
        return {'success': False, 'message': str(e)}

    return create_notification(
        user_id=requested_user_id,
        sender_id=requester_user_id,
        notification_type='follow_request',
        message=f"{requester_name} requested to follow you"
    )


def notify_follow_accepted(requester_user_id, accepter_user_id):
    """Notify user when their follow request is accepted"""
    connection = get_db_connection()
    if not connection:
        return {'success': False}
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT username, full_name FROM users WHERE id = %s", (accepter_user_id,))
        accepter = cursor.fetchone()
        accepter_name = (accepter['full_name'] or accepter['username']) if accepter else 'Someone'
        cursor.close()
        connection.close()
    except Error as e:
        print(f"❌ Error creating follow accepted notification: {e}")
        if connection:
            connection.close()
        return {'success': False, 'message': str(e)}

    return create_notification(
        user_id=requester_user_id,
        sender_id=accepter_user_id,
        notification_type='follow_accepted',
        message=f"{accepter_name} accepted your follow request"
    )


def notify_post_share(post_id, sharer_user_id):
    """Notify user when their post is shared"""
    connection = get_db_connection()
    if not connection:
        return {'success': False}
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT user_id FROM posts WHERE post_id = %s AND is_deleted = FALSE", (post_id,))
        post = cursor.fetchone()
        if not post:
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'Post not found'}
        post_owner_id = post['user_id']
        cursor.execute("SELECT username, full_name FROM users WHERE id = %s", (sharer_user_id,))
        sharer = cursor.fetchone()
        sharer_name = (sharer['full_name'] or sharer['username']) if sharer else 'Someone'
        cursor.close()
        connection.close()
    except Error as e:
        print(f"❌ Error creating share notification: {e}")
        if connection:
            connection.close()
        return {'success': False, 'message': str(e)}

    if post_owner_id == sharer_user_id:
        return {'success': False, 'message': 'Self-share'}

    return create_notification(
        user_id=post_owner_id,
        sender_id=sharer_user_id,
        notification_type='share',
        message=f"{sharer_name} shared your post",
        related_post_id=post_id
    )


def notify_new_message(receiver_id, sender_id, message_preview):
    """Notify user when they receive a new message"""
    connection = get_db_connection()
    if not connection:
        return {'success': False}
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT username, full_name FROM users WHERE id = %s", (sender_id,))
        sender = cursor.fetchone()
        sender_name = (sender['full_name'] or sender['username']) if sender else 'Someone'
        cursor.close()
        connection.close()
    except Error as e:
        print(f"❌ Error creating message notification: {e}")
        if connection:
            connection.close()
        return {'success': False, 'message': str(e)}

    if receiver_id == sender_id:
        return {'success': False, 'message': 'Self-message'}

    preview = message_preview[:50] + "..." if len(message_preview) > 50 else message_preview
    return create_notification(
        user_id=receiver_id,
        sender_id=sender_id,
        notification_type='message',
        message=f"{sender_name} sent you a message: \"{preview}\""
    )
def notify_message_request(receiver_id: int, sender_id: int, message_preview: str):
    """
    Notify receiver when someone sends them a message request.
    Appears in notification bell with envelope icon.
    Clicking navigates to messages.html (Requests tab).
    """
    if receiver_id == sender_id:
        return {'success': False, 'message': 'Self-notification blocked'}
 
    connection = get_db_connection()
    if not connection:
        return {'success': False}
 
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            "SELECT username, full_name FROM users WHERE id = %s", (sender_id,)
        )
        sender = cursor.fetchone()
        sender_name = (sender['full_name'] or sender['username']) if sender else 'Someone'
        cursor.close()
        connection.close()
    except Exception as e:
        print(f"❌ notify_message_request error: {e}")
        if connection:
            connection.close()
        sender_name = 'Someone'
 
    preview = message_preview[:60] + "..." if len(message_preview) > 60 else message_preview
    message  = f"{sender_name} sent you a message request: \"{preview}\""
    nav_url  = "messages.html"
 
    return create_notification(
        user_id=receiver_id,
        sender_id=sender_id,
        notification_type='message_request',
        message=message,
        nav_url=nav_url
    )

# =====================================================
# READ NOTIFICATIONS
# =====================================================

def get_user_notifications(user_id, limit=20, offset=0, unread_only=False):
    """Get user's notifications with pagination"""
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'notifications': []}
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        where_clause = "WHERE n.user_id = %s"
        params = [user_id]
        
        if unread_only:
            where_clause += " AND n.is_read = FALSE"
        
        query = f"""
        SELECT 
            n.notification_id,
            n.user_id,
            n.sender_id,
            n.notification_type,
            n.message,
            n.related_post_id,
            n.related_comment_id,
            n.related_message_id,
            n.is_read,
            n.created_at,
            u.username as sender_username,
            u.full_name as sender_name,
            u.profile_pic as sender_avatar
        FROM notifications n
        JOIN users u ON n.sender_id = u.id
        {where_clause}
        ORDER BY n.created_at DESC
        LIMIT %s OFFSET %s
        """
        
        params.extend([limit, offset])
        cursor.execute(query, params)
        notifications = cursor.fetchall()
        
        # Post-process: extract nav_url from message if encoded
        for notification in notifications:
            raw_message = notification['message'] or ''
            if '||NAV:' in raw_message:
                parts = raw_message.split('||NAV:', 1)
                notification['message'] = parts[0]
                notification['nav_url'] = parts[1]
            else:
                notification['nav_url'] = None

            if notification['notification_type'] == 'follow_request':
                cursor.execute("""
                    SELECT status 
                    FROM follow_requests 
                    WHERE follower_id = %s AND following_id = %s
                """, (notification['sender_id'], notification['user_id']))
                request_result = cursor.fetchone()
                if request_result:
                    notification['request_status'] = request_result['status']
                    notification['request_exists'] = True
                else:
                    notification['request_status'] = None
                    notification['request_exists'] = False
            else:
                notification['request_status'] = None
                notification['request_exists'] = False
        
        cursor.execute("""
            SELECT COUNT(*) as unread_count
            FROM notifications
            WHERE user_id = %s AND is_read = FALSE
        """, (user_id,))
        unread_result = cursor.fetchone()
        unread_count = unread_result['unread_count'] if unread_result else 0
        
        cursor.close()
        connection.close()
        
        return {
            'success': True,
            'notifications': notifications,
            'unread_count': unread_count,
            'total': len(notifications)
        }
        
    except Error as e:
        print(f"❌ Error fetching notifications: {e}")
        if connection:
            connection.close()
        return {'success': False, 'notifications': [], 'message': str(e)}


def get_unread_count(user_id):
    """Get count of unread notifications"""
    connection = get_db_connection()
    if not connection:
        return 0
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT COUNT(*) as count FROM notifications WHERE user_id = %s AND is_read = FALSE", (user_id,))
        result = cursor.fetchone()
        count = result['count'] if result else 0
        cursor.close()
        connection.close()
        return count
    except Error as e:
        print(f"❌ Error getting unread count: {e}")
        if connection:
            connection.close()
        return 0


def mark_notification_as_read(notification_id, user_id):
    """Mark a single notification as read"""
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    try:
        cursor = connection.cursor()
        cursor.execute("UPDATE notifications SET is_read = TRUE WHERE notification_id = %s AND user_id = %s", (notification_id, user_id))
        connection.commit()
        if cursor.rowcount == 0:
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'Notification not found or unauthorized'}
        cursor.close()
        connection.close()
        return {'success': True, 'message': 'Notification marked as read'}
    except Error as e:
        print(f"❌ Error marking notification as read: {e}")
        if connection:
            connection.rollback()
            connection.close()
        return {'success': False, 'message': str(e)}


def mark_all_as_read(user_id):
    """Mark all notifications as read"""
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    try:
        cursor = connection.cursor()
        cursor.execute("UPDATE notifications SET is_read = TRUE WHERE user_id = %s AND is_read = FALSE", (user_id,))
        connection.commit()
        updated_count = cursor.rowcount
        cursor.close()
        connection.close()
        return {'success': True, 'message': f'{updated_count} notifications marked as read', 'count': updated_count}
    except Error as e:
        print(f"❌ Error marking all as read: {e}")
        if connection:
            connection.rollback()
            connection.close()
        return {'success': False, 'message': str(e)}


def delete_notification(notification_id, user_id):
    """Delete a single notification"""
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    try:
        cursor = connection.cursor()
        cursor.execute("DELETE FROM notifications WHERE notification_id = %s AND user_id = %s", (notification_id, user_id))
        connection.commit()
        if cursor.rowcount == 0:
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'Notification not found or unauthorized'}
        cursor.close()
        connection.close()
        return {'success': True, 'message': 'Notification deleted'}
    except Error as e:
        print(f"❌ Error deleting notification: {e}")
        if connection:
            connection.rollback()
            connection.close()
        return {'success': False, 'message': str(e)}


def delete_all_notifications(user_id):
    """Delete all notifications for a user"""
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    try:
        cursor = connection.cursor()
        cursor.execute("DELETE FROM notifications WHERE user_id = %s", (user_id,))
        connection.commit()
        deleted_count = cursor.rowcount
        cursor.close()
        connection.close()
        return {'success': True, 'message': f'{deleted_count} notifications deleted', 'count': deleted_count}
    except Error as e:
        print(f"❌ Error deleting all notifications: {e}")
        if connection:
            connection.rollback()
            connection.close()
        return {'success': False, 'message': str(e)}


def cleanup_old_notifications(days=30):
    """Delete notifications older than specified days"""
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    try:
        cursor = connection.cursor()
        cursor.execute("DELETE FROM notifications WHERE created_at < DATE_SUB(NOW(), INTERVAL %s DAY)", (days,))
        connection.commit()
        deleted_count = cursor.rowcount
        cursor.close()
        connection.close()
        return {'success': True, 'message': f'Deleted {deleted_count} old notifications', 'count': deleted_count}
    except Error as e:
        print(f"❌ Error cleaning up notifications: {e}")
        if connection:
            connection.rollback()
            connection.close()
        return {'success': False, 'message': str(e)}


if __name__ == "__main__":
    print("✅ Notification operations module loaded")