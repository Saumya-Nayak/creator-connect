"""
database/message_operations.py
─────────────────────────────────────────────────────────────────────
CHANGES IN THIS VERSION:
  ✅ FIX 1: can_send_message() — Instagram-style rules:
       • Mutual followers       → direct message (no request needed)
       • A follows B only       → A can send B a MESSAGE REQUEST
       • A doesn't follow B     → cannot send (same as before)
  ✅ FIX 2: send_message() — detects request-needed vs direct
  ✅ NEW:   send_message_request()  — create a message request
  ✅ NEW:   accept_message_request()
  ✅ NEW:   decline_message_request()
  ✅ NEW:   get_message_requests()   — receiver's pending inbox
  ✅ NEW:   get_request_status()     — check if request exists
  ✅ FIX 3: media_type 'shared_post' now in ENUM — no more 1265 error
─────────────────────────────────────────────────────────────────────
"""

import mysql.connector
import sys, os, json
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.db import get_db_connection
from mysql.connector import Error
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ===== DATETIME SERIALIZATION =====

def serialize_datetime(obj):
    if isinstance(obj, datetime):
        return obj.strftime('%Y-%m-%dT%H:%M:%S')
    elif isinstance(obj, dict):
        return {k: serialize_datetime(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [serialize_datetime(i) for i in obj]
    return obj


# =====================================================================
# INSTAGRAM-STYLE PERMISSION CHECK
# =====================================================================
def can_send_message(sender_id: int, receiver_id: int) -> Tuple[bool, str]:
    """
    Returns (allowed: bool, mode: str)
      'direct'  — mutual followers, send immediately
      'request' — one-way or no follow, must send request first
      'self'    — cannot message yourself
    """
    if sender_id == receiver_id:
        return False, "self"
 
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
 
    try:
        cursor.execute(
            "SELECT 1 FROM followers WHERE follower_id = %s AND following_id = %s",
            (sender_id, receiver_id)
        )
        sender_follows = cursor.fetchone() is not None
 
        cursor.execute(
            "SELECT 1 FROM followers WHERE follower_id = %s AND following_id = %s",
            (receiver_id, sender_id)
        )
        receiver_follows = cursor.fetchone() is not None
 
        if sender_follows and receiver_follows:
            return True, "direct"   # mutual → direct chat
        else:
            return True, "request"  # one-way or none → request flow
 
    except Error as e:
        logger.error(f"can_send_message error: {e}")
        return True, "request"      # on DB error, default to request
    finally:
        cursor.close()
        conn.close()
 
 
def get_message_mode(sender_id: int, receiver_id: int) -> str:
    if sender_id == receiver_id:
        return "self"
    _, mode = can_send_message(sender_id, receiver_id)
    return mode

# =====================================================================
# MESSAGE REQUESTS (Instagram-style)
# =====================================================================
def send_message_request(sender_id: int, receiver_id: int, first_message: str) -> dict:
    """
    Send a message request to a user.
    ✅ Now also sends a notification to the receiver.
    """
    if sender_id == receiver_id:
        return {"success": False, "message": "Cannot message yourself"}
 
    mode = get_message_mode(sender_id, receiver_id)
    if mode == "direct":
        return {"success": False, "message": "Use direct messaging (mutual followers)"}
 
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
 
    try:
        # Check if a request already exists
        cursor.execute(
            "SELECT request_id, status FROM message_requests "
            "WHERE sender_id = %s AND receiver_id = %s",
            (sender_id, receiver_id)
        )
        existing = cursor.fetchone()
 
        if existing:
            if existing['status'] == 'pending':
                cursor.close(); conn.close()
                return {
                    "success": False,
                    "message": "Message request already sent, waiting for acceptance"
                }
            if existing['status'] == 'accepted':
                cursor.close(); conn.close()
                return {
                    "success": False,
                    "message": "Request already accepted — use direct messaging"
                }
            if existing['status'] == 'declined':
                # Re-request: reset to pending with new message
                cursor.execute(
                    "UPDATE message_requests "
                    "SET status='pending', first_message=%s, updated_at=NOW() "
                    "WHERE request_id=%s",
                    (first_message[:500], existing['request_id'])
                )
                conn.commit()
                cursor.close(); conn.close()
 
                # ✅ Notify receiver of re-request
                try:
                    from database.notification_operations import notify_message_request
                    notify_message_request(receiver_id, sender_id, first_message)
                except Exception as e:
                    logger.warning(f"Re-request notification failed (non-fatal): {e}")
 
                return {
                    "success": True,
                    "message": "Message request re-sent",
                    "request_id": existing['request_id']
                }
 
        # Insert new request
        cursor.execute(
            "INSERT INTO message_requests (sender_id, receiver_id, first_message) "
            "VALUES (%s, %s, %s)",
            (sender_id, receiver_id, first_message[:500])
        )
        conn.commit()
        request_id = cursor.lastrowid
        cursor.close(); conn.close()
 
        logger.info(f"✅ Message request {request_id}: user {sender_id} → user {receiver_id}")
 
        # ✅ Send notification to receiver
        try:
            from database.notification_operations import notify_message_request
            notify_message_request(receiver_id, sender_id, first_message)
            logger.info(f"🔔 Message request notification sent to user {receiver_id}")
        except Exception as notif_err:
            logger.warning(f"Notification failed (non-fatal): {notif_err}")
 
        return {
            "success": True,
            "message": "Message request sent",
            "request_id": request_id
        }
 
    except Exception as e:
        logger.error(f"send_message_request error: {e}")
        try:
            conn.rollback()
            cursor.close()
            conn.close()
        except Exception:
            pass
        return {"success": False, "message": str(e)}


def accept_message_request(request_id: int, receiver_id: int) -> Dict:
    """
    Receiver accepts the message request.
    This creates a real conversation so both users can now chat directly.
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT * FROM message_requests WHERE request_id = %s AND receiver_id = %s",
            (request_id, receiver_id)
        )
        req = cursor.fetchone()

        if not req:
            return {"success": False, "message": "Request not found"}
        if req['status'] != 'pending':
            return {"success": False, "message": f"Request is already {req['status']}"}

        sender_id = req['sender_id']

        # Mark request accepted
        cursor.execute(
            "UPDATE message_requests SET status='accepted', updated_at=NOW() WHERE request_id=%s",
            (request_id,)
        )

        # Move the first message into the real messages table
        cursor.execute(
            """INSERT INTO messages (sender_id, receiver_id, message, is_delivered, created_at)
               VALUES (%s, %s, %s, 1, %s)""",
            (sender_id, receiver_id, req['first_message'], req['created_at'])
        )
        message_id = cursor.lastrowid

        # Create / update conversation
        cursor.execute(
            """INSERT INTO conversations (user1_id, user2_id, last_message_id)
               VALUES (%s, %s, %s)
               ON DUPLICATE KEY UPDATE last_message_id=%s, updated_at=NOW()""",
            (min(sender_id, receiver_id), max(sender_id, receiver_id), message_id, message_id)
        )

        conn.commit()
        logger.info(f"✅ Message request {request_id} accepted — conversation opened")
        return {"success": True, "message": "Request accepted, conversation started", "sender_id": sender_id}

    except Error as e:
        logger.error(f"accept_message_request error: {e}")
        conn.rollback()
        return {"success": False, "message": str(e)}
    finally:
        cursor.close()
        conn.close()


def decline_message_request(request_id: int, receiver_id: int) -> Dict:
    """Receiver declines the message request."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT request_id FROM message_requests WHERE request_id=%s AND receiver_id=%s AND status='pending'",
            (request_id, receiver_id)
        )
        if not cursor.fetchone():
            return {"success": False, "message": "Request not found or already handled"}

        cursor.execute(
            "UPDATE message_requests SET status='declined', updated_at=NOW() WHERE request_id=%s",
            (request_id,)
        )
        conn.commit()
        logger.info(f"✅ Message request {request_id} declined")
        return {"success": True, "message": "Request declined"}

    except Error as e:
        logger.error(f"decline_message_request error: {e}")
        conn.rollback()
        return {"success": False, "message": str(e)}
    finally:
        cursor.close()
        conn.close()


def get_message_requests(receiver_id: int, limit: int = 30, offset: int = 0) -> Dict:
    """Get all pending message requests for a user (their inbox of requests)."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                mr.request_id,
                mr.sender_id,
                mr.first_message,
                mr.status,
                mr.created_at,
                u.username      AS sender_username,
                u.full_name     AS sender_name,
                u.profile_pic   AS sender_avatar
            FROM message_requests mr
            JOIN users u ON mr.sender_id = u.id
            WHERE mr.receiver_id = %s AND mr.status = 'pending'
            ORDER BY mr.created_at DESC
            LIMIT %s OFFSET %s
        """, (receiver_id, limit, offset))

        requests = cursor.fetchall()
        requests = [serialize_datetime(r) for r in requests]

        cursor.execute(
            "SELECT COUNT(*) AS cnt FROM message_requests WHERE receiver_id=%s AND status='pending'",
            (receiver_id,)
        )
        total = cursor.fetchone()['cnt']

        return {"success": True, "requests": requests, "total": total}

    except Error as e:
        logger.error(f"get_message_requests error: {e}")
        return {"success": False, "requests": []}
    finally:
        cursor.close()
        conn.close()


def get_request_status(sender_id: int, receiver_id: int) -> Dict:
    """
    Check the message request status between two users.
    Useful for the frontend to decide which UI to show.
    Returns: { mode, request_id, request_status }
    """
    _, mode = can_send_message(sender_id, receiver_id)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT request_id, status FROM message_requests WHERE sender_id=%s AND receiver_id=%s",
            (sender_id, receiver_id)
        )
        row = cursor.fetchone()

        return {
            "success": True,
            "mode": mode,                                  # 'direct'|'request'|'blocked'|'self'
            "request_id": row['request_id'] if row else None,
            "request_status": row['status'] if row else None,  # 'pending'|'accepted'|'declined'|None
        }
    except Error as e:
        return {"success": False, "mode": mode, "request_id": None, "request_status": None}
    finally:
        cursor.close()
        conn.close()


def get_pending_request_count(receiver_id: int) -> int:
    """Returns number of pending message requests (for notification badge)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT COUNT(*) FROM message_requests WHERE receiver_id=%s AND status='pending'",
            (receiver_id,)
        )
        return cursor.fetchone()[0]
    except Error:
        return 0
    finally:
        cursor.close()
        conn.close()


# =====================================================================
# SEND MESSAGE  (direct only — mutual followers)
# =====================================================================

def send_message(sender_id: int, receiver_id: int, message: str,
                 media_url: Optional[str] = None,
                 media_type: Optional[str] = None) -> Dict:
    """
    Send a direct message.
    ✅ Now only allowed for mutual followers OR when a request has been accepted.
    ✅ media_type='shared_post' is now valid (ENUM was extended in migration SQL).
    """
    can_send, mode = can_send_message(sender_id, receiver_id)

    if not can_send:
        return {"success": False, "message": "You must follow this user to send messages"}

    if mode == "request":
        # One-way follower — check if request was already accepted
        conn_chk = get_db_connection()
        cur_chk = conn_chk.cursor(dictionary=True)
        try:
            cur_chk.execute(
                "SELECT status FROM message_requests WHERE sender_id=%s AND receiver_id=%s",
                (sender_id, receiver_id)
            )
            row = cur_chk.fetchone()
        finally:
            cur_chk.close()
            conn_chk.close()

        if not row or row['status'] != 'accepted':
            return {
                "success": False,
                "message": "Send a message request first. The user needs to accept before you can chat.",
                "needs_request": True
            }

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            INSERT INTO messages
                (sender_id, receiver_id, message, media_url, media_type, is_delivered)
            VALUES (%s, %s, %s, %s, %s, 1)
        """, (sender_id, receiver_id, message, media_url, media_type))

        message_id = cursor.lastrowid

        # Create / update conversation
        cursor.execute("""
            INSERT INTO conversations (user1_id, user2_id, last_message_id)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE last_message_id=%s, updated_at=CURRENT_TIMESTAMP
        """, (min(sender_id, receiver_id), max(sender_id, receiver_id), message_id, message_id))

        # Remove any conversation_deletions for both users
        cursor.execute("""
            DELETE FROM conversation_deletions
            WHERE conversation_id = (
                SELECT conversation_id FROM conversations
                WHERE user1_id = %s AND user2_id = %s
            ) AND user_id IN (%s, %s)
        """, (min(sender_id, receiver_id), max(sender_id, receiver_id), sender_id, receiver_id))

        conn.commit()

        # Handle shared_post notification
        if media_type == 'shared_post' and message:
            try:
                share_data = json.loads(message)
                if share_data.get('type') == 'shared_post':
                    from database.notification_operations import notify_shared_post
                    notify_shared_post(
                        receiver_id=receiver_id,
                        sender_id=sender_id,
                        post_id=share_data.get('post_id'),
                        post_title=share_data.get('caption') or share_data.get('product_title') or 'a post'
                    )
            except (json.JSONDecodeError, Exception) as e:
                logger.warning(f"Shared post notification failed (non-fatal): {e}")

        # Fetch full message data
        cursor.execute("""
            SELECT m.message_id, m.sender_id, m.receiver_id, m.message,
                   m.media_url, m.media_type, m.is_delivered, m.is_read,
                   m.created_at, m.read_at,
                   u.full_name AS sender_name, u.username AS sender_username,
                   u.profile_pic AS sender_avatar
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.message_id = %s
        """, (message_id,))

        message_data = serialize_datetime(cursor.fetchone())
        logger.info(f"✅ Message sent: ID={message_id}")

        return {"success": True, "message": "Message sent successfully", "data": message_data}

    except Error as e:
        logger.error(f"send_message error: {e}")
        conn.rollback()
        return {"success": False, "message": "Failed to send message"}
    finally:
        cursor.close()
        conn.close()


# =====================================================================
# CONVERSATIONS
# =====================================================================

def get_user_conversations(user_id: int, limit: int = 50) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT
                c.conversation_id, c.user1_id, c.user2_id, c.last_message_id, c.updated_at,
                CASE WHEN c.user1_id = %s THEN u2.id        ELSE u1.id        END AS other_user_id,
                CASE WHEN c.user1_id = %s THEN u2.full_name ELSE u1.full_name END AS other_user_name,
                CASE WHEN c.user1_id = %s THEN u2.username  ELSE u1.username  END AS other_username,
                CASE WHEN c.user1_id = %s THEN u2.profile_pic ELSE u1.profile_pic END AS other_user_avatar,
                CASE WHEN c.user1_id = %s THEN u2.is_private ELSE u1.is_private END AS other_user_private,
                lm.message          AS last_message_text,
                lm.media_url        AS last_message_media,
                lm.media_type       AS last_message_media_type,
                lm.sender_id        AS last_message_sender_id,
                lm.created_at       AS last_message_time,
                lm.is_read          AS last_message_read,
                (
                    SELECT COUNT(*) FROM messages m
                    WHERE m.receiver_id = %s
                      AND m.sender_id = CASE WHEN c.user1_id = %s THEN c.user2_id ELSE c.user1_id END
                      AND m.is_read = 0
                ) AS unread_count
            FROM conversations c
            LEFT JOIN users u1 ON c.user1_id = u1.id
            LEFT JOIN users u2 ON c.user2_id = u2.id
            LEFT JOIN messages lm ON c.last_message_id = lm.message_id
            LEFT JOIN conversation_deletions cd
                ON c.conversation_id = cd.conversation_id AND cd.user_id = %s
            WHERE (c.user1_id = %s OR c.user2_id = %s)
              AND cd.id IS NULL
            ORDER BY c.updated_at DESC
            LIMIT %s
        """, (user_id, user_id, user_id, user_id, user_id,
              user_id, user_id,
              user_id, user_id, user_id, limit))

        conversations = [serialize_datetime(c) for c in cursor.fetchall()]
        return {"success": True, "conversations": conversations, "count": len(conversations)}

    except Error as e:
        logger.error(f"get_user_conversations error: {e}")
        return {"success": False, "message": "Failed to load conversations"}
    finally:
        cursor.close()
        conn.close()


# =====================================================================
# GET MESSAGES
# =====================================================================
def get_conversation_messages(user_id: int, other_user_id: int,
                               limit: int = 50, offset: int = 0) -> dict:
    """
    Get messages between two users.
    ✅ Filters: deleted_for_everyone and delete_for_me messages
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT
                m.message_id,
                m.sender_id,
                m.receiver_id,
                m.message,
                m.media_url,
                m.media_type,
                m.is_delivered,
                m.is_read,
                m.created_at,
                m.read_at,
                m.deleted_for_everyone,
                u.full_name  AS sender_name,
                u.username   AS sender_username,
                u.profile_pic AS sender_avatar
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            -- Exclude messages deleted for everyone
            -- Exclude messages the current user deleted for themselves
            LEFT JOIN message_deletions md
                ON md.message_id = m.message_id AND md.user_id = %s
            WHERE (
                (m.sender_id = %s AND m.receiver_id = %s)
                OR
                (m.sender_id = %s AND m.receiver_id = %s)
            )
            AND md.id IS NULL          -- not deleted for me
            ORDER BY m.created_at ASC
            LIMIT %s OFFSET %s
        """, (user_id,
              user_id, other_user_id, other_user_id, user_id,
              limit, offset))
 
        messages = cursor.fetchall()
 
        # Serialize datetime + handle deleted_for_everyone placeholder
        processed = []
        for msg in messages:
            msg = serialize_datetime(msg)
            if msg.get('deleted_for_everyone'):
                msg['message']   = None
                msg['media_url'] = None
                msg['is_deleted_for_everyone'] = True
            else:
                msg['is_deleted_for_everyone'] = False
            processed.append(msg)
 
        # Mark messages as read
        cursor.execute("""
            UPDATE messages
            SET is_read = 1, read_at = CURRENT_TIMESTAMP
            WHERE sender_id = %s AND receiver_id = %s AND is_read = 0
        """, (other_user_id, user_id))
        conn.commit()
 
        cursor.execute(
            "SELECT id, full_name, username, profile_pic, is_private FROM users WHERE id = %s",
            (other_user_id,)
        )
        other_user = cursor.fetchone()
 
        return {
            "success": True,
            "messages": processed,
            "other_user": other_user,
            "count": len(processed)
        }
 
    except Error as e:
        logger.error(f"get_conversation_messages error: {e}")
        conn.rollback()
        return {"success": False, "message": "Failed to load messages"}
    finally:
        cursor.close()
        conn.close()


def get_conversation_messages_with_reactions(user_id: int, other_user_id: int,
                                              limit: int = 50, offset: int = 0) -> Dict:
    result = get_conversation_messages(user_id, other_user_id, limit, offset)
    if not result['success']:
        return result

    for msg in result.get('messages', []):
        mid = msg['message_id']
        msg['reactions']     = get_message_reactions(mid)
        msg['user_reaction'] = get_user_reaction_for_message(mid, user_id)

    return result


# =====================================================================
# MARK READ / DELETE
# =====================================================================

def mark_messages_as_read(user_id: int, other_user_id: int) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE messages SET is_read=1, read_at=CURRENT_TIMESTAMP
            WHERE sender_id=%s AND receiver_id=%s AND is_read=0
        """, (other_user_id, user_id))
        conn.commit()
        return {"success": True, "message": f"{cursor.rowcount} messages marked as read"}
    except Error as e:
        conn.rollback()
        return {"success": False, "message": str(e)}
    finally:
        cursor.close()
        conn.close()

def delete_message(message_id: int, user_id: int) -> dict:
    return delete_message_for_me(message_id, user_id)

def delete_message_for_me(message_id: int, user_id: int) -> dict:
    """
    Delete a message only for the requesting user.
    The other person still sees it.
    Works for both sender and receiver.
    Uses message_deletions table.
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Verify message exists and user is a participant
        cursor.execute(
            "SELECT sender_id, receiver_id FROM messages WHERE message_id = %s",
            (message_id,)
        )
        msg = cursor.fetchone()
        if not msg:
            return {"success": False, "message": "Message not found"}
        if user_id not in (msg['sender_id'], msg['receiver_id']):
            return {"success": False, "message": "You are not part of this conversation"}
 
        # Insert deletion record (ignore if already deleted)
        cursor.execute("""
            INSERT IGNORE INTO message_deletions (message_id, user_id)
            VALUES (%s, %s)
        """, (message_id, user_id))
        conn.commit()
 
        logger.info(f"✅ Message {message_id} deleted for user {user_id}")
        return {"success": True, "message": "Message deleted for you"}
 
    except Error as e:
        logger.error(f"delete_message_for_me error: {e}")
        conn.rollback()
        return {"success": False, "message": str(e)}
    finally:
        cursor.close()
        conn.close()
def delete_message_for_everyone(message_id: int, user_id: int) -> dict:
    """
    Delete a message for everyone in the conversation.
    Only the sender can do this.
    Sets deleted_for_everyone = 1 and clears content.
    The message remains as a '[This message was deleted]' placeholder.
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT sender_id, receiver_id FROM messages WHERE message_id = %s",
            (message_id,)
        )
        msg = cursor.fetchone()
        if not msg:
            return {"success": False, "message": "Message not found"}
        if msg['sender_id'] != user_id:
            return {"success": False, "message": "Only the sender can delete for everyone"}
 
        # Mark as deleted for everyone + clear content
        cursor.execute("""
            UPDATE messages
            SET deleted_for_everyone = 1,
                message = '',
                media_url = ''
            WHERE message_id = %s
        """, (message_id,))
        conn.commit()  # ← THIS LINE IS MISSING
 
        logger.info(f"✅ Message {message_id} deleted for everyone by user {user_id}")
        return {"success": True, "message": "Message deleted for everyone"}
 
    except Error as e:
        logger.error(f"delete_message_for_everyone error: {e}")
        conn.rollback()
        return {"success": False, "message": str(e)}
    finally:
        cursor.close()
        conn.close()

def delete_conversation(user_id: int, other_user_id: int,
                        mode: str = 'me') -> dict:
    """
    Delete a conversation.
    mode='me'       → adds to conversation_deletions (hides from you only)
    mode='everyone' → physically deletes all messages for both users
                      (both users lose the entire chat)
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Find the conversation
        cursor.execute("""
            SELECT conversation_id FROM conversations
            WHERE (user1_id = %s AND user2_id = %s)
               OR (user1_id = %s AND user2_id = %s)
        """, (min(user_id, other_user_id), max(user_id, other_user_id),
              min(user_id, other_user_id), max(user_id, other_user_id)))
 
        conv = cursor.fetchone()
        if not conv:
            return {"success": False, "message": "Conversation not found"}
 
        conversation_id = conv['conversation_id']
 
        if mode == 'everyone':
            # Hard delete all messages in this conversation for both users
            cursor.execute("""
                DELETE FROM messages
                WHERE (sender_id = %s AND receiver_id = %s)
                   OR (sender_id = %s AND receiver_id = %s)
            """, (user_id, other_user_id, other_user_id, user_id))
 
            # Delete the conversation record too
            cursor.execute(
                "DELETE FROM conversations WHERE conversation_id = %s",
                (conversation_id,)
            )
            conn.commit()
            logger.info(f"✅ Conversation {conversation_id} deleted for EVERYONE by user {user_id}")
            return {"success": True, "message": "Conversation deleted for everyone",
                    "mode": "everyone"}
 
        else:  # mode = 'me' (default)
            cursor.execute("""
                INSERT INTO conversation_deletions (conversation_id, user_id)
                VALUES (%s, %s)
                ON DUPLICATE KEY UPDATE deleted_at = CURRENT_TIMESTAMP
            """, (conversation_id, user_id))
            conn.commit()
            logger.info(f"✅ Conversation {conversation_id} deleted for user {user_id} only")
            return {"success": True, "message": "Conversation deleted for you",
                    "mode": "me"}
 
    except Error as e:
        logger.error(f"delete_conversation error: {e}")
        logger.error(f"  Code: {e.errno}, SQLState: {e.sqlstate}")  # ADD THIS
        conn.rollback()
        return {"success": False, "message": str(e)}  # Return actual error
    finally:
        cursor.close()
        conn.close()


# =====================================================================
# UNREAD / SEARCH
# =====================================================================

def get_unread_message_count(user_id: int) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT COUNT(*) FROM messages WHERE receiver_id=%s AND is_read=0", (user_id,))
        return cursor.fetchone()[0]
    except Error:
        return 0
    finally:
        cursor.close()
        conn.close()


def search_conversations(user_id: int, query: str) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        p = f"%{query}%"
        cursor.execute("""
            SELECT DISTINCT
                CASE WHEN c.user1_id=%s THEN u2.id        ELSE u1.id        END AS user_id,
                CASE WHEN c.user1_id=%s THEN u2.full_name ELSE u1.full_name END AS full_name,
                CASE WHEN c.user1_id=%s THEN u2.username  ELSE u1.username  END AS username,
                CASE WHEN c.user1_id=%s THEN u2.profile_pic ELSE u1.profile_pic END AS profile_pic
            FROM conversations c
            LEFT JOIN users u1 ON c.user1_id=u1.id
            LEFT JOIN users u2 ON c.user2_id=u2.id
            WHERE (c.user1_id=%s OR c.user2_id=%s)
              AND ((c.user1_id=%s AND (u2.full_name LIKE %s OR u2.username LIKE %s))
                OR (c.user2_id=%s AND (u1.full_name LIKE %s OR u1.username LIKE %s)))
            LIMIT 20
        """, (user_id,)*4 + (user_id, user_id, user_id, p, p, user_id, p, p))
        results = cursor.fetchall()
        return {"success": True, "results": results, "count": len(results)}
    except Error as e:
        return {"success": False, "message": str(e)}
    finally:
        cursor.close()
        conn.close()


# =====================================================================
# MESSAGE REACTIONS
# =====================================================================

def add_message_reaction(message_id: int, user_id: int, reaction_type: str) -> Dict:
    valid = ['like', 'love', 'laugh', 'wow', 'sad', 'angry']
    if reaction_type not in valid:
        return {"success": False, "message": f"Invalid reaction. Must be: {', '.join(valid)}"}

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT sender_id FROM messages WHERE message_id=%s", (message_id,))
        msg = cursor.fetchone()
        if not msg:
            return {"success": False, "message": "Message not found"}

        cursor.execute("""
            INSERT INTO message_reactions (message_id, user_id, reaction_type)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE reaction_type=VALUES(reaction_type), created_at=CURRENT_TIMESTAMP
        """, (message_id, user_id, reaction_type))
        conn.commit()

        if user_id != msg['sender_id']:
            try:
                from database.notification_operations import notify_message_reaction
                notify_message_reaction(msg['sender_id'], user_id, message_id, reaction_type)
            except Exception as e:
                logger.warning(f"Reaction notification failed: {e}")

        return {"success": True, "message": "Reaction added", "reactions": get_message_reactions(message_id)}
    except Error as e:
        conn.rollback()
        return {"success": False, "message": str(e)}
    finally:
        cursor.close()
        conn.close()


def remove_message_reaction(message_id: int, user_id: int) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM message_reactions WHERE message_id=%s AND user_id=%s", (message_id, user_id))
        conn.commit()
        if cursor.rowcount == 0:
            return {"success": False, "message": "No reaction to remove"}
        return {"success": True, "message": "Reaction removed", "reactions": get_message_reactions(message_id)}
    except Error as e:
        conn.rollback()
        return {"success": False, "message": str(e)}
    finally:
        cursor.close()
        conn.close()


def get_message_reactions(message_id: int) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT mr.reaction_id, mr.message_id, mr.user_id, mr.reaction_type, mr.created_at,
                   u.username, u.full_name, u.profile_pic
            FROM message_reactions mr
            JOIN users u ON mr.user_id = u.id
            WHERE mr.message_id = %s ORDER BY mr.created_at ASC
        """, (message_id,))
        return [serialize_datetime(r) for r in cursor.fetchall()]
    except Error:
        return []
    finally:
        cursor.close()
        conn.close()


def get_message_reaction_summary(message_id: int) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT reaction_type, COUNT(*) AS count, GROUP_CONCAT(u.username) AS users
            FROM message_reactions mr JOIN users u ON mr.user_id=u.id
            WHERE mr.message_id=%s GROUP BY reaction_type ORDER BY count DESC
        """, (message_id,))
        rows = cursor.fetchall()
        total = sum(r['count'] for r in rows)
        by_type = {r['reaction_type']: {'count': r['count'], 'users': (r['users'] or '').split(',')} for r in rows}
        return {'total_reactions': total, 'by_type': by_type}
    except Error:
        return {'total_reactions': 0, 'by_type': {}}
    finally:
        cursor.close()
        conn.close()


def get_user_reaction_for_message(message_id: int, user_id: int) -> Optional[str]:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT reaction_type FROM message_reactions WHERE message_id=%s AND user_id=%s",
            (message_id, user_id)
        )
        row = cursor.fetchone()
        return row['reaction_type'] if row else None
    except Error:
        return None
    finally:
        cursor.close()
        conn.close()