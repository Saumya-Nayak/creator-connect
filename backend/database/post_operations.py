"""
database/post_operations.py — PHASE 2 PATCH + FIX PICKUP FIELDS
─────────────────────────────────────────────────────────────────────────────
FIX: INSERT now includes pickup_address, pickup_city, pickup_state, pickup_pincode
     (these were missing → pickup address never stored in DB)
─────────────────────────────────────────────────────────────────────────────
"""

from database.db import get_db_connection
from mysql.connector import Error
import os


def create_post(post_data):
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}

    try:
        cursor = connection.cursor()

        post_type = post_data.get('post_type')
        if post_type not in ['showcase', 'service', 'product']:
            return {'success': False, 'message': f'Invalid post type: {post_type}'}

        insert_query = """
        INSERT INTO posts (
            user_id, caption, media_url, media_type, post_type, privacy,
            category_id, subcategory_id, tags,
            title, product_title, price, currency,
            stock, condition_type, brand, sku,
            short_description, full_description, features,

            -- service fields
            service_duration, service_delivery_time, service_mode,
            service_location_type,
            service_address,
            service_city, service_state, service_pincode,
            service_radius_km, doorstep_base_fee, doorstep_per_km,
            includes_revisions, max_revisions,
            requires_advance_booking, booking_notice_days,

            -- product shipping
            shipping_available, shipping_cost,
            delivery_charge_type, base_delivery_charge,
            per_km_rate, delivery_max_km, seller_pincode,
            estimated_delivery_days, free_shipping_threshold,
            return_policy,

            -- FIX: pickup address fields (were missing before)
            pickup_address, pickup_city, pickup_state, pickup_pincode,

            -- contact / payment
            contact_email, contact_phone,
            accepts_upi, accepts_bank_transfer, accepts_cod,

            created_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s,

            %s, %s, %s,
            %s,
            %s,
            %s, %s, %s,
            %s, %s, %s,
            %s, %s,
            %s, %s,

            %s, %s,
            %s, %s,
            %s, %s, %s,
            %s, %s,
            %s,

            %s, %s, %s, %s,

            %s, %s,
            %s, %s, %s,

            NOW()
        )
        """

        values = (
            # core
            post_data['user_id'],
            post_data['caption'],
            post_data['media_url'],
            post_data['media_type'],
            post_data['post_type'],
            post_data['privacy'],
            post_data.get('category_id'),
            post_data.get('subcategory_id'),
            post_data.get('tags'),

            # titles / price
            post_data.get('title'),
            post_data.get('product_title'),
            post_data.get('price'),
            post_data.get('currency', 'INR'),

            # product basics
            post_data.get('stock'),
            post_data.get('condition_type'),
            post_data.get('brand'),
            post_data.get('sku'),

            # descriptions
            post_data.get('short_description'),
            post_data.get('full_description'),
            post_data.get('features'),

            # service details
            post_data.get('service_duration'),
            post_data.get('service_delivery_time'),
            post_data.get('service_mode', 'online'),

            # service location type
            post_data.get('service_location_type', 'online'),

            # service address
            post_data.get('service_address'),

            post_data.get('service_city'),
            post_data.get('service_state'),
            post_data.get('service_pincode'),
            post_data.get('service_radius_km', 0),
            post_data.get('doorstep_base_fee', 0.0),
            post_data.get('doorstep_per_km', 0.0),

            post_data.get('includes_revisions', False),
            post_data.get('max_revisions'),
            post_data.get('requires_advance_booking', False),
            post_data.get('booking_notice_days'),

            # product shipping
            post_data.get('shipping_available', True),
            post_data.get('shipping_cost'),

            # delivery fields
            post_data.get('delivery_charge_type', 'flat'),
            post_data.get('base_delivery_charge', 0.0),
            post_data.get('per_km_rate', 0.0),
            post_data.get('delivery_max_km', 0),
            post_data.get('seller_pincode'),

            post_data.get('estimated_delivery_days'),
            post_data.get('free_shipping_threshold'),
            post_data.get('return_policy'),

            # FIX: pickup address fields
            post_data.get('pickup_address'),
            post_data.get('pickup_city'),
            post_data.get('pickup_state'),
            post_data.get('pickup_pincode'),

            # contact
            post_data.get('contact_email'),
            post_data.get('contact_phone'),

            # payment
            post_data.get('accepts_upi', False),
            post_data.get('accepts_bank_transfer', False),
            post_data.get('accepts_cod', False),
        )

        print(f"📝 Creating post: type={post_data['post_type']}, user_id={post_data['user_id']}")
        print(f"📍 Pickup: addr={post_data.get('pickup_address')}, city={post_data.get('pickup_city')}, "
              f"state={post_data.get('pickup_state')}, pin={post_data.get('pickup_pincode')}")
        cursor.execute(insert_query, values)
        connection.commit()

        post_id = cursor.lastrowid
        print(f"✅ Post created — ID: {post_id}")

        cursor.close()
        connection.close()
        return {'success': True, 'message': 'Post created successfully', 'post_id': post_id}

    except Error as e:
        print(f"❌ Error creating post: {e}")
        import traceback; traceback.print_exc()
        if connection:
            connection.rollback()
            connection.close()
        return {'success': False, 'message': f'Failed to create post: {str(e)}'}


# ─────────────────────────────────────────────────────────────────────────────
# get_user_posts  (unchanged)
# ─────────────────────────────────────────────────────────────────────────────

def get_user_posts(user_id, limit=20, offset=0, post_type='all'):
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'posts': []}
    try:
        cursor = connection.cursor(dictionary=True)
        where_clause = "WHERE p.user_id = %s AND p.is_deleted = FALSE"
        params = [user_id]
        if post_type != 'all' and post_type in ['showcase', 'service', 'product']:
            where_clause += " AND p.post_type = %s"
            params.append(post_type)

        query = f"""
        SELECT p.post_id, p.user_id, p.caption, p.media_url, p.media_type,
               p.post_type, p.likes_count, p.comments_count, p.shares_count,
               p.privacy, p.created_at,
               u.username, u.full_name, u.profile_pic,
               p.tags, p.title, p.product_title, p.price, p.currency, p.stock,
               p.short_description, p.full_description, p.contact_email, p.contact_phone,
               p.features, p.service_duration, p.service_delivery_time, p.service_mode,
               p.service_location_type, p.service_address,
               p.service_city, p.service_state,
               p.service_pincode, p.service_radius_km,
               p.doorstep_base_fee, p.doorstep_per_km,
               p.includes_revisions, p.max_revisions, p.return_policy,
               p.shipping_available, p.shipping_cost,
               p.delivery_charge_type, p.base_delivery_charge,
               p.per_km_rate, p.delivery_max_km, p.seller_pincode,
               p.pickup_address, p.pickup_city, p.pickup_state, p.pickup_pincode,
               p.pickup_lat, p.pickup_lng,
               p.accepts_upi, p.accepts_bank_transfer, p.accepts_cod,
               c.category_name, c.category_slug,
               s.subcategory_name, s.subcategory_slug
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN subcategories s ON p.subcategory_id = s.subcategory_id
        {where_clause}
        ORDER BY p.created_at DESC
        LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])
        cursor.execute(query, params)
        posts = cursor.fetchall()
        cursor.close(); connection.close()
        return {'success': True, 'posts': posts}
    except Error as e:
        print(f"❌ Error fetching posts: {e}")
        if connection: connection.close()
        return {'success': False, 'posts': []}


# ─────────────────────────────────────────────────────────────────────────────
# get_post_by_id  (unchanged)
# ─────────────────────────────────────────────────────────────────────────────

def get_post_by_id(post_id, user_id=None):
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'post': None, 'message': 'Database connection failed'}
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT p.*,
                   u.username, u.full_name, u.profile_pic, u.email as user_email,
                   c.category_name, c.category_slug, c.post_type as category_post_type,
                   s.subcategory_name, s.subcategory_slug
            FROM posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN categories c ON p.category_id = c.category_id
            LEFT JOIN subcategories s ON p.subcategory_id = s.subcategory_id
            WHERE p.post_id = %s AND p.is_deleted = FALSE
        """, (post_id,))
        post = cursor.fetchone()
        cursor.close(); connection.close()

        if not post:
            return {'success': False, 'post': None, 'message': 'Post not found'}
        if user_id and post['user_id'] != user_id:
            return {'success': False, 'post': None, 'message': 'You can only edit your own posts'}
        return {'success': True, 'post': post}
    except Error as e:
        print(f"❌ Error fetching post: {e}")
        if connection: connection.close()
        return {'success': False, 'post': None, 'message': f'Failed to fetch post: {str(e)}'}


def delete_post(post_id, user_id):
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT user_id FROM posts WHERE post_id = %s", (post_id,))
        post = cursor.fetchone()
        if not post:
            cursor.close(); connection.close()
            return {'success': False, 'message': 'Post not found'}
        if post[0] != user_id:
            cursor.close(); connection.close()
            return {'success': False, 'message': 'You can only delete your own posts'}
        cursor.execute("UPDATE posts SET is_deleted = TRUE WHERE post_id = %s", (post_id,))
        connection.commit()
        cursor.close(); connection.close()
        return {'success': True, 'message': 'Post deleted successfully'}
    except Error as e:
        if connection: connection.rollback(); connection.close()
        return {'success': False, 'message': f'Failed to delete post: {str(e)}'}


def hard_delete_post(post_id, user_id, uploads_folder='uploads'):
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT user_id, media_url FROM posts WHERE post_id = %s", (post_id,))
        post = cursor.fetchone()
        if not post:
            cursor.close(); connection.close()
            return {'success': False, 'message': 'Post not found'}
        if post['user_id'] != user_id:
            cursor.close(); connection.close()
            return {'success': False, 'message': 'You can only delete your own posts'}
        cursor.execute("DELETE FROM posts WHERE post_id = %s", (post_id,))
        connection.commit()
        media_deleted = False
        if post['media_url']:
            try:
                fp = post['media_url'] if post['media_url'].startswith('uploads/') \
                     else os.path.join(uploads_folder, post['media_url'].split('/')[-1])
                if os.path.exists(fp):
                    os.remove(fp)
                    media_deleted = True
            except Exception as fe:
                print(f"⚠️ Error deleting media: {fe}")
        cursor.close(); connection.close()
        msg = 'Post deleted' + (' (media removed)' if media_deleted else '')
        return {'success': True, 'message': msg}
    except Error as e:
        if connection: connection.rollback(); connection.close()
        return {'success': False, 'message': f'Failed to delete post: {str(e)}'}

def update_post(post_id: int, user_id: int, update_data: dict) -> dict:
    """Update allowed fields of a post owned by user_id."""
    import traceback
    from database.db import get_db_connection  # adjust import to your project
 
    # ── 1. Fetch post type and verify ownership ──────────────────────
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
 
        cursor.execute(
            "SELECT post_id, post_type, user_id FROM posts WHERE post_id = %s AND is_deleted = FALSE",
            (post_id,)
        )
        post = cursor.fetchone()
 
        if not post:
            cursor.close(); connection.close()
            return {'success': False, 'message': 'Post not found'}
 
        if post['user_id'] != user_id:
            cursor.close(); connection.close()
            return {'success': False, 'message': 'You do not have permission to edit this post'}
 
        post_type = post['post_type']
 
    except Exception as e:
        traceback.print_exc()
        return {'success': False, 'message': f'Database error: {str(e)}'}
 
    # ── 2. Select allowed fields by post type ────────────────────────
    _allowed_product = [
        'caption', 'privacy', 'tags',
        'product_title', 'price', 'stock', 'condition_type',
        'brand', 'sku', 'short_description', 'full_description',
        'features', 'return_policy',
        'accepts_upi', 'accepts_bank_transfer', 'accepts_cod',
        'shipping_available', 'delivery_charge_type',
        'seller_pincode', 'estimated_delivery_days',
        'shipping_cost', 'base_delivery_charge', 'per_km_rate',
        'delivery_max_km', 'free_shipping_threshold',
        'pickup_address', 'pickup_city', 'pickup_state', 'pickup_pincode',
    ]
    _allowed_service = [
        'caption', 'privacy',
        'title', 'price', 'short_description', 'full_description',
        'service_duration', 'service_delivery_time', 'features',
        'contact_email', 'contact_phone',
        'includes_revisions', 'max_revisions',
        'requires_advance_booking', 'booking_notice_days',
        'service_location_type',
        'service_address', 'service_city', 'service_state',
        'service_pincode', 'service_radius_km',
        'doorstep_base_fee', 'doorstep_per_km',
    ]
    _allowed_showcase = ['caption', 'privacy', 'tags']
 
    allowed_map = {
        'product':  _allowed_product,
        'service':  _allowed_service,
        'showcase': _allowed_showcase,
    }
    allowed_fields = allowed_map.get(post_type, [])
 
    # ── 3. Filter — only keep keys that are in the allowed list ──────
    filtered = {k: v for k, v in update_data.items() if k in allowed_fields}
 
    if not filtered:
        cursor.close(); connection.close()
        return {'success': False, 'message': 'No valid fields provided to update'}
 
    # ── 4. Build dynamic SET clause ──────────────────────────────────
    set_parts = [f"`{col}` = %s" for col in filtered.keys()]
    values    = list(filtered.values())
    values.append(post_id)   # for WHERE clause
 
    sql = f"UPDATE posts SET {', '.join(set_parts)} WHERE post_id = %s"
 
    # ── 5. Execute ───────────────────────────────────────────────────
    try:
        cursor.execute(sql, values)
        connection.commit()
 
        # Geocode pickup pincode if it changed (product posts)
        if post_type == 'product' and 'pickup_pincode' in filtered and filtered['pickup_pincode']:
            try:
                _geocode_and_cache_pickup(cursor, connection, post_id, filtered['pickup_pincode'])
            except Exception:
                pass  # geocoding failure must never block the save
 
        cursor.close()
        connection.close()
        return {'success': True, 'message': 'Post updated successfully'}
 
    except Exception as e:
        traceback.print_exc()
        try:
            connection.rollback()
            cursor.close()
            connection.close()
        except Exception:
            pass
        return {'success': False, 'message': f'Database error while saving: {str(e)}'}
 
 
def _geocode_and_cache_pickup(cursor, connection, post_id: int, pincode: str):
    """Geocode pickup_pincode → pickup_lat / pickup_lng (best-effort)."""
    import requests
    try:
        resp = requests.get(
            f"https://api.postalpincode.in/pincode/{pincode}",
            timeout=5
        )
        data = resp.json()
        if data and data[0].get('Status') == 'Success':
            po = data[0]['PostOffice'][0]
            lat = float(po.get('Latitude') or 0)
            lng = float(po.get('Longitude') or 0)
            if lat and lng:
                cursor.execute(
                    "UPDATE posts SET pickup_lat = %s, pickup_lng = %s WHERE post_id = %s",
                    (lat, lng, post_id)
                )
                connection.commit()
    except Exception:
        pass


def like_post(post_id, user_id):
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    try:
        cursor = connection.cursor()
        cursor.execute(
            "SELECT id FROM post_likes WHERE post_id = %s AND user_id = %s",
            (post_id, user_id)
        )
        if cursor.fetchone():
            cursor.close(); connection.close()
            return {'success': False, 'message': 'Already liked'}
        cursor.execute("INSERT INTO post_likes (post_id, user_id) VALUES (%s, %s)", (post_id, user_id))
        connection.commit()
        cursor.close(); connection.close()
        return {'success': True, 'message': 'Post liked'}
    except Error as e:
        if connection: connection.rollback(); connection.close()
        return {'success': False, 'message': 'Failed to like post'}


def unlike_post(post_id, user_id):
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    try:
        cursor = connection.cursor()
        cursor.execute(
            "DELETE FROM post_likes WHERE post_id = %s AND user_id = %s",
            (post_id, user_id)
        )
        if cursor.rowcount == 0:
            cursor.close(); connection.close()
            return {'success': False, 'message': 'Not liked yet'}
        connection.commit()
        cursor.close(); connection.close()
        return {'success': True, 'message': 'Post unliked'}
    except Error as e:
        if connection: connection.rollback(); connection.close()
        return {'success': False, 'message': 'Failed to unlike post'}