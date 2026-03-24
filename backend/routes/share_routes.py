"""
routes/share_routes.py — FIXED
✅ search-users now returns ALL users (not just followed ones)
   so anyone can share posts with anyone
"""

from flask import Blueprint, request, jsonify
from services.jwt_service import verify_token
from database.db import get_db_connection
from datetime import datetime
import json

share_bp = Blueprint('share', __name__)


def verify_user_token(token):
    if not token:
        return None
    result = verify_token(token)
    return result['user_id'] if result['valid'] else None


@share_bp.route('/share/search-users', methods=['GET'])
def search_users_for_share():
    """
    ✅ FIXED: Returns ALL users (not just followed ones)
    so sharing works for everyone regardless of follow status
    """
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        current_user_id = verify_user_token(auth_token)

        if not current_user_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        query = request.args.get('query', '').strip()
        limit = int(request.args.get('limit', 50))

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        if query:
            search_pattern = f"%{query}%"
            cursor.execute("""
                SELECT
                    u.id as user_id,
                    u.username,
                    u.full_name,
                    u.profile_pic,
                    u.is_private
                FROM users u
                WHERE u.id != %s
                  AND (u.username LIKE %s OR u.full_name LIKE %s)
                ORDER BY
                    CASE
                        WHEN u.username LIKE %s THEN 1
                        WHEN u.full_name LIKE %s THEN 2
                        ELSE 3
                    END, u.full_name
                LIMIT %s
            """, (current_user_id, search_pattern, search_pattern,
                  f"{query}%", f"{query}%", limit))
        else:
            # ✅ Return ALL users (exclude self)
            cursor.execute("""
                SELECT
                    u.id as user_id,
                    u.username,
                    u.full_name,
                    u.profile_pic,
                    u.is_private
                FROM users u
                WHERE u.id != %s
                ORDER BY u.full_name
                LIMIT %s
            """, (current_user_id, limit))

        users = cursor.fetchall()
        cursor.close()
        connection.close()

        return jsonify({'success': True, 'users': users, 'count': len(users)}), 200

    except Exception as e:
        print(f"❌ Error searching users for share: {e}")
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to search users'}), 500


@share_bp.route('/share/post/<int:post_id>', methods=['POST'])
def share_post_via_message(post_id):
    """Share a post with selected users via message"""
    try:
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        sender_id = verify_user_token(auth_token)

        if not sender_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401

        data = request.get_json()
        recipient_ids = data.get('recipient_ids', [])

        if not recipient_ids:
            return jsonify({'success': False, 'message': 'No recipients selected'}), 400

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT p.post_id, p.user_id, p.caption, p.media_url, p.media_type,
                   p.post_type, p.product_title, p.title, p.price, p.currency,
                   u.username as author_username, u.full_name as author_name,
                   u.profile_pic as author_avatar
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.post_id = %s AND p.is_deleted = FALSE
        """, (post_id,))

        post = cursor.fetchone()
        if not post:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Post not found'}), 404

        share_data = {
            'type': 'shared_post',
            'post_id': int(post['post_id']),
            'post_type': post['post_type'],
            'caption': post['caption'] or '',
            'media_url': post['media_url'] or '',
            'media_type': post['media_type'] or '',
            'product_title': post['product_title'] or post['title'] or '',
            'price': float(post['price']) if post['price'] else None,
            'currency': post['currency'] or 'INR',
            'author': {
                'username': post['author_username'],
                'name': post['author_name'],
                'avatar': post['author_avatar']
            }
        }

        share_json = json.dumps(share_data)
        shared_count = 0
        failed_recipients = []

        for recipient_id in recipient_ids:
            try:
                cursor.execute("""
                    INSERT INTO messages (
                        sender_id, receiver_id, message,
                        media_url, media_type, is_delivered, created_at
                    ) VALUES (%s, %s, %s, %s, 'shared_post', 1, NOW())
                """, (sender_id, recipient_id, share_json, None))

                message_id = cursor.lastrowid

                cursor.execute("""
                    INSERT INTO conversations (user1_id, user2_id, last_message_id)
                    VALUES (%s, %s, %s)
                    ON DUPLICATE KEY UPDATE last_message_id = %s, updated_at = CURRENT_TIMESTAMP
                """, (min(sender_id, recipient_id), max(sender_id, recipient_id),
                      message_id, message_id))

                # Remove deletion records so conversation reappears
                cursor.execute("""
                    DELETE FROM conversation_deletions
                    WHERE conversation_id = (
                        SELECT conversation_id FROM conversations
                        WHERE user1_id = %s AND user2_id = %s
                    ) AND user_id IN (%s, %s)
                """, (min(sender_id, recipient_id), max(sender_id, recipient_id),
                      sender_id, recipient_id))

                shared_count += 1

            except Exception as e:
                print(f"❌ Error sharing with user {recipient_id}: {e}")
                failed_recipients.append({'user_id': recipient_id, 'reason': str(e)})

        connection.commit()

        # Log share action
        try:
            cursor.execute(
                "INSERT INTO post_shares (post_id, shared_by_user_id, created_at) VALUES (%s, %s, NOW())",
                (post_id, sender_id)
            )
            connection.commit()
        except Exception:
            pass

        cursor.close(); connection.close()
        print(f"✅ Successfully shared post to {shared_count} users")

        return jsonify({
            'success': True,
            'message': f'Post shared with {shared_count} user(s)',
            'shared_count': shared_count,
            'failed_count': len(failed_recipients),
        }), 200

    except Exception as e:
        print(f"❌ Error sharing post: {e}")
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to share post'}), 500


@share_bp.route('/share/stats/<int:post_id>', methods=['GET'])
def get_share_stats(post_id):
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT COUNT(*) as share_count FROM post_shares WHERE post_id = %s", (post_id,))
        result = cursor.fetchone()
        cursor.close(); connection.close()
        return jsonify({'success': True, 'share_count': result['share_count'] if result else 0}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': 'Failed to get share stats'}), 500