"""
database/group_operations.py
─────────────────────────────────────────────────────────────────────
Instagram-style group messaging:
  • Mutual followers → directly added (status='active')
  • Non-mutual      → invitation sent (status='pending')
  • Creator is always admin + active
─────────────────────────────────────────────────────────────────────
"""

import sys, os, json
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.db import get_db_connection
from mysql.connector import Error
from datetime import datetime
from typing import Dict, List, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def serialize_datetime(obj):
    if isinstance(obj, datetime):
        return obj.strftime('%Y-%m-%dT%H:%M:%S')
    elif isinstance(obj, dict):
        return {k: serialize_datetime(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [serialize_datetime(i) for i in obj]
    return obj


def _are_mutual_followers(user1_id: int, user2_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT 1 FROM followers WHERE follower_id=%s AND following_id=%s",
            (user1_id, user2_id)
        )
        a_follows_b = cursor.fetchone() is not None
        cursor.execute(
            "SELECT 1 FROM followers WHERE follower_id=%s AND following_id=%s",
            (user2_id, user1_id)
        )
        b_follows_a = cursor.fetchone() is not None
        return a_follows_b and b_follows_a
    except Error:
        return False
    finally:
        cursor.close()
        conn.close()


# =====================================================================
# CREATE GROUP
# =====================================================================

def create_group(creator_id: int, name: str, description: str = '',
                 member_ids: List[int] = None, avatar: str = None) -> Dict:
    """
    Create a group. Creator is automatically admin + active.
    Each invited member:
      - mutual follower with creator → status='active' (directly added)
      - not mutual                   → status='pending' (needs to accept)
    """
    if not name or not name.strip():
        return {"success": False, "message": "Group name is required"}

    member_ids = member_ids or []
    # Remove duplicates and creator from member list
    member_ids = list(set(m for m in member_ids if m != creator_id))

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Create the group
        cursor.execute(
            "INSERT INTO `groups` (name, description, avatar, created_by) VALUES (%s, %s, %s, %s)",
            (name.strip()[:100], description[:500] if description else '', avatar, creator_id)
        )
        group_id = cursor.lastrowid

        # Add creator as admin + active
        cursor.execute(
            """INSERT INTO group_members (group_id, user_id, role, status, invited_by, joined_at)
               VALUES (%s, %s, 'admin', 'active', %s, NOW())""",
            (group_id, creator_id, creator_id)
        )

        # Add each invited member
        directly_added = []
        pending_invited = []

        for uid in member_ids:
            is_mutual = _are_mutual_followers(creator_id, uid)
            status = 'active' if is_mutual else 'pending'
            joined_at = 'NOW()' if is_mutual else 'NULL'

            if is_mutual:
                cursor.execute(
                    """INSERT IGNORE INTO group_members
                       (group_id, user_id, role, status, invited_by, joined_at)
                       VALUES (%s, %s, 'member', 'active', %s, NOW())""",
                    (group_id, uid, creator_id)
                )
                directly_added.append(uid)
            else:
                cursor.execute(
                    """INSERT IGNORE INTO group_members
                       (group_id, user_id, role, status, invited_by, joined_at)
                       VALUES (%s, %s, 'member', 'pending', %s, NULL)""",
                    (group_id, uid, creator_id)
                )
                pending_invited.append(uid)

        conn.commit()

        # Send notifications (non-fatal)
        _notify_group_created(group_id, creator_id, name, directly_added, pending_invited)

        logger.info(f"✅ Group {group_id} created by user {creator_id} | direct={directly_added} | pending={pending_invited}")

        return {
            "success": True,
            "message": "Group created successfully",
            "group_id": group_id,
            "directly_added": directly_added,
            "pending_invited": pending_invited,
        }

    except Error as e:
        logger.error(f"create_group error: {e}")
        conn.rollback()
        return {"success": False, "message": str(e)}
    finally:
        cursor.close()
        conn.close()


def _notify_group_created(group_id, creator_id, group_name, directly_added, pending_invited):
    try:
        from database.notification_operations import create_notification
        for uid in directly_added:
            try:
                create_notification(
                    user_id=uid,
                    sender_id=creator_id,
                    notification_type='group_added',
                    message=f'You were added to the group "{group_name}"',
                    nav_url='messages.html'
                )
            except Exception:
                pass
        for uid in pending_invited:
            try:
                create_notification(
                    user_id=uid,
                    sender_id=creator_id,
                    notification_type='group_invite',
                    message=f'You have a group invitation to join "{group_name}"',
                    nav_url='messages.html'
                )
            except Exception:
                pass
    except Exception as e:
        logger.warning(f"Group notification failed (non-fatal): {e}")


# =====================================================================
# INVITE MEMBER TO EXISTING GROUP
# =====================================================================

def invite_member(group_id: int, inviter_id: int, invitee_id: int) -> Dict:
    """
    Admin invites a new member to an existing group.
    Same mutual-follower rules apply.
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Check inviter is admin
        cursor.execute(
            "SELECT role, status FROM group_members WHERE group_id=%s AND user_id=%s",
            (group_id, inviter_id)
        )
        inviter = cursor.fetchone()
        if not inviter or inviter['role'] != 'admin' or inviter['status'] != 'active':
            return {"success": False, "message": "Only group admins can invite members"}

        # Check if already a member
        cursor.execute(
            "SELECT status FROM group_members WHERE group_id=%s AND user_id=%s",
            (group_id, invitee_id)
        )
        existing = cursor.fetchone()
        if existing:
            if existing['status'] == 'active':
                return {"success": False, "message": "User is already in the group"}
            if existing['status'] == 'pending':
                return {"success": False, "message": "Invitation already sent"}
            if existing['status'] == 'rejected':
                # Re-invite
                is_mutual = _are_mutual_followers(inviter_id, invitee_id)
                status = 'active' if is_mutual else 'pending'
                cursor.execute(
                    """UPDATE group_members SET status=%s, invited_by=%s,
                       joined_at=%s WHERE group_id=%s AND user_id=%s""",
                    (status, inviter_id, datetime.now() if is_mutual else None, group_id, invitee_id)
                )
                conn.commit()
                return {"success": True, "message": f"Re-invited ({'added directly' if is_mutual else 'pending acceptance'})"}

        is_mutual = _are_mutual_followers(inviter_id, invitee_id)
        status = 'active' if is_mutual else 'pending'

        cursor.execute(
            """INSERT INTO group_members (group_id, user_id, role, status, invited_by, joined_at)
               VALUES (%s, %s, 'member', %s, %s, %s)""",
            (group_id, invitee_id, status, inviter_id, datetime.now() if is_mutual else None)
        )
        conn.commit()

        # Notify
        cursor.execute("SELECT name FROM `groups` WHERE group_id=%s", (group_id,))
        grp = cursor.fetchone()
        group_name = grp['name'] if grp else 'a group'

        _notify_group_created(group_id, inviter_id, group_name,
                              [invitee_id] if is_mutual else [],
                              [] if is_mutual else [invitee_id])
        return {
            "success": True,
            "message": "Added directly" if is_mutual else "Invitation sent",
            "status": status,
        }

    except Error as e:
        logger.error(f"invite_member error: {e}")
        conn.rollback()
        return {"success": False, "message": str(e)}
    finally:
        cursor.close()
        conn.close()


# =====================================================================
# ACCEPT / REJECT GROUP INVITATION
# =====================================================================

def respond_to_group_invite(group_id: int, user_id: int, accept: bool) -> Dict:
    """User accepts or rejects a group invitation."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT * FROM group_members WHERE group_id=%s AND user_id=%s AND status='pending'",
            (group_id, user_id)
        )
        invite = cursor.fetchone()
        if not invite:
            return {"success": False, "message": "No pending invitation found"}

        if accept:
            cursor.execute(
                """UPDATE group_members SET status='active', joined_at=NOW()
                   WHERE group_id=%s AND user_id=%s""",
                (group_id, user_id)
            )
            msg = "Joined group successfully"
        else:
            cursor.execute(
                "UPDATE group_members SET status='rejected' WHERE group_id=%s AND user_id=%s",
                (group_id, user_id)
            )
            msg = "Invitation declined"

        conn.commit()
        return {"success": True, "message": msg, "accepted": accept}

    except Error as e:
        logger.error(f"respond_to_group_invite error: {e}")
        conn.rollback()
        return {"success": False, "message": str(e)}
    finally:
        cursor.close()
        conn.close()


# =====================================================================
# GET USER'S GROUPS
# =====================================================================

def get_user_groups(user_id: int) -> Dict:
    """Get all active groups the user is a member of, with last message."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                g.group_id,
                g.name,
                g.description,
                g.avatar,
                g.created_by,
                g.updated_at,
                gm.role,
                gm.status AS member_status,
                (SELECT COUNT(*) FROM group_members gm2
                 WHERE gm2.group_id = g.group_id AND gm2.status = 'active') AS member_count,
                lmsg.message AS last_message_text,
                lmsg.sender_id AS last_message_sender_id,
                lmsg.created_at AS last_message_time,
                lu.full_name AS last_message_sender_name,
                (SELECT COUNT(*) FROM group_messages unread
                 LEFT JOIN group_message_reads gmr
                    ON gmr.message_id = unread.message_id AND gmr.user_id = %s
                 WHERE unread.group_id = g.group_id
                   AND unread.sender_id != %s
                   AND gmr.id IS NULL
                   AND unread.deleted_for_everyone = 0
                ) AS unread_count
            FROM `groups` g
            JOIN group_members gm ON g.group_id = gm.group_id AND gm.user_id = %s
            LEFT JOIN group_messages lmsg ON lmsg.message_id = (
                SELECT MAX(message_id) FROM group_messages
                WHERE group_id = g.group_id AND deleted_for_everyone = 0
            )
            LEFT JOIN users lu ON lmsg.sender_id = lu.id
            WHERE gm.status = 'active'
            ORDER BY COALESCE(lmsg.created_at, g.created_at) DESC
        """, (user_id, user_id, user_id))

        groups = [serialize_datetime(g) for g in cursor.fetchall()]
        return {"success": True, "groups": groups, "count": len(groups)}

    except Error as e:
        logger.error(f"get_user_groups error: {e}")
        return {"success": False, "message": str(e), "groups": []}
    finally:
        cursor.close()
        conn.close()


def get_pending_group_invites(user_id: int) -> Dict:
    """Get all pending group invitations for a user."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                g.group_id, g.name, g.description, g.avatar,
                gm.created_at AS invited_at,
                inviter.id AS inviter_id,
                inviter.full_name AS inviter_name,
                inviter.username AS inviter_username,
                inviter.profile_pic AS inviter_avatar,
                (SELECT COUNT(*) FROM group_members WHERE group_id=g.group_id AND status='active') AS member_count
            FROM group_members gm
            JOIN `groups` g ON g.group_id = gm.group_id
            LEFT JOIN users inviter ON inviter.id = gm.invited_by
            WHERE gm.user_id = %s AND gm.status = 'pending'
            ORDER BY gm.created_at DESC
        """, (user_id,))

        invites = [serialize_datetime(i) for i in cursor.fetchall()]
        return {"success": True, "invites": invites, "count": len(invites)}

    except Error as e:
        return {"success": False, "invites": [], "message": str(e)}
    finally:
        cursor.close()
        conn.close()


# =====================================================================
# GET GROUP MESSAGES
# =====================================================================

def get_group_messages(group_id: int, user_id: int,
                       limit: int = 50, offset: int = 0) -> Dict:
    """Get messages for a group (user must be active member)."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Verify membership
        cursor.execute(
            "SELECT status FROM group_members WHERE group_id=%s AND user_id=%s",
            (group_id, user_id)
        )
        member = cursor.fetchone()
        if not member or member['status'] != 'active':
            return {"success": False, "message": "You are not a member of this group"}

        cursor.execute("""
            SELECT
                gm.message_id, gm.group_id, gm.sender_id,
                gm.message, gm.media_url, gm.media_type,
                gm.deleted_for_everyone, gm.created_at,
                u.full_name AS sender_name,
                u.username AS sender_username,
                u.profile_pic AS sender_avatar
            FROM group_messages gm
            JOIN users u ON gm.sender_id = u.id
            LEFT JOIN group_message_deletions gmd
                ON gmd.message_id = gm.message_id AND gmd.user_id = %s
            WHERE gm.group_id = %s AND gmd.id IS NULL
            ORDER BY gm.created_at ASC
            LIMIT %s OFFSET %s
        """, (user_id, group_id, limit, offset))

        messages = cursor.fetchall()
        processed = []
        for msg in messages:
            msg = serialize_datetime(msg)
            if msg.get('deleted_for_everyone'):
                msg['message'] = None
                msg['media_url'] = None
                msg['is_deleted_for_everyone'] = True
            else:
                msg['is_deleted_for_everyone'] = False
            processed.append(msg)

        # Mark all as read
        for msg in processed:
            if msg['sender_id'] != user_id:
                try:
                    cursor.execute(
                        "INSERT IGNORE INTO group_message_reads (message_id, user_id) VALUES (%s, %s)",
                        (msg['message_id'], user_id)
                    )
                except Exception:
                    pass
        conn.commit()

        # Get group info
        cursor.execute("""
            SELECT g.*, 
                (SELECT COUNT(*) FROM group_members WHERE group_id=g.group_id AND status='active') AS member_count
            FROM `groups` g WHERE g.group_id = %s
        """, (group_id,))
        group_info = serialize_datetime(cursor.fetchone())

        return {
            "success": True,
            "messages": processed,
            "group": group_info,
            "count": len(processed)
        }

    except Error as e:
        logger.error(f"get_group_messages error: {e}")
        conn.rollback()
        return {"success": False, "message": str(e)}
    finally:
        cursor.close()
        conn.close()


# =====================================================================
# SEND GROUP MESSAGE
# =====================================================================

def send_group_message(group_id: int, sender_id: int, message: str,
                       media_url: str = None, media_type: str = None) -> Dict:
    """Send a message to a group. Sender must be active member."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT status FROM group_members WHERE group_id=%s AND user_id=%s",
            (group_id, sender_id)
        )
        member = cursor.fetchone()
        if not member or member['status'] != 'active':
            return {"success": False, "message": "You are not a member of this group"}

        cursor.execute(
            """INSERT INTO group_messages (group_id, sender_id, message, media_url, media_type)
               VALUES (%s, %s, %s, %s, %s)""",
            (group_id, sender_id, message, media_url, media_type)
        )
        message_id = cursor.lastrowid
        conn.commit()

        # Fetch full message
        cursor.execute("""
            SELECT gm.*, u.full_name AS sender_name, u.username AS sender_username,
                   u.profile_pic AS sender_avatar
            FROM group_messages gm
            JOIN users u ON gm.sender_id = u.id
            WHERE gm.message_id = %s
        """, (message_id,))
        msg_data = serialize_datetime(cursor.fetchone())

        return {"success": True, "message": "Message sent", "data": msg_data}

    except Error as e:
        logger.error(f"send_group_message error: {e}")
        conn.rollback()
        return {"success": False, "message": str(e)}
    finally:
        cursor.close()
        conn.close()


# =====================================================================
# DELETE GROUP MESSAGE
# =====================================================================

def delete_group_message_for_me(message_id: int, user_id: int) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT group_id FROM group_messages WHERE message_id=%s", (message_id,))
        msg = cursor.fetchone()
        if not msg:
            return {"success": False, "message": "Message not found"}
        cursor.execute(
            "SELECT status FROM group_members WHERE group_id=%s AND user_id=%s",
            (msg['group_id'], user_id)
        )
        if not cursor.fetchone():
            return {"success": False, "message": "Not a group member"}
        cursor.execute(
            "INSERT IGNORE INTO group_message_deletions (message_id, user_id) VALUES (%s, %s)",
            (message_id, user_id)
        )
        conn.commit()
        return {"success": True, "message": "Message deleted for you"}
    except Error as e:
        conn.rollback()
        return {"success": False, "message": str(e)}
    finally:
        cursor.close()
        conn.close()


def delete_group_message_for_everyone(message_id: int, user_id: int) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT sender_id FROM group_messages WHERE message_id=%s",
            (message_id,)
        )
        msg = cursor.fetchone()
        if not msg:
            return {"success": False, "message": "Message not found"}
        if msg['sender_id'] != user_id:
            return {"success": False, "message": "Only the sender can delete for everyone"}
        cursor.execute(
            "UPDATE group_messages SET deleted_for_everyone=1, message='', media_url='' WHERE message_id=%s",
            (message_id,)
        )
        conn.commit()
        return {"success": True, "message": "Message deleted for everyone"}
    except Error as e:
        conn.rollback()
        return {"success": False, "message": str(e)}
    finally:
        cursor.close()
        conn.close()


# =====================================================================
# GROUP MANAGEMENT
# =====================================================================

def get_group_members(group_id: int, user_id: int) -> Dict:
    """Get all members of a group (requester must be active member)."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT status FROM group_members WHERE group_id=%s AND user_id=%s",
            (group_id, user_id)
        )
        if not cursor.fetchone():
            return {"success": False, "message": "Not a group member"}

        cursor.execute("""
            SELECT gm.user_id, gm.role, gm.status, gm.joined_at,
                   u.full_name, u.username, u.profile_pic
            FROM group_members gm
            JOIN users u ON u.id = gm.user_id
            WHERE gm.group_id = %s
            ORDER BY gm.role DESC, gm.joined_at ASC
        """, (group_id,))
        members = [serialize_datetime(m) for m in cursor.fetchall()]
        return {"success": True, "members": members}
    except Error as e:
        return {"success": False, "message": str(e)}
    finally:
        cursor.close()
        conn.close()


def leave_group(group_id: int, user_id: int) -> Dict:
    """User leaves a group. If last admin, transfers admin or deletes group."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT role FROM group_members WHERE group_id=%s AND user_id=%s AND status='active'",
            (group_id, user_id)
        )
        member = cursor.fetchone()
        if not member:
            return {"success": False, "message": "Not an active group member"}

        if member['role'] == 'admin':
            # Check if there are other admins
            cursor.execute(
                "SELECT user_id FROM group_members WHERE group_id=%s AND role='admin' AND status='active' AND user_id!=%s LIMIT 1",
                (group_id, user_id)
            )
            other_admin = cursor.fetchone()

            if not other_admin:
                # Promote oldest active member to admin
                cursor.execute(
                    "SELECT user_id FROM group_members WHERE group_id=%s AND status='active' AND user_id!=%s ORDER BY joined_at ASC LIMIT 1",
                    (group_id, user_id)
                )
                new_admin = cursor.fetchone()
                if new_admin:
                    cursor.execute(
                        "UPDATE group_members SET role='admin' WHERE group_id=%s AND user_id=%s",
                        (group_id, new_admin['user_id'])
                    )
                else:
                    # No members left, delete group
                    cursor.execute("DELETE FROM `groups` WHERE group_id=%s", (group_id,))
                    conn.commit()
                    return {"success": True, "message": "Group deleted (no members left)"}

        cursor.execute(
            "DELETE FROM group_members WHERE group_id=%s AND user_id=%s",
            (group_id, user_id)
        )
        conn.commit()
        return {"success": True, "message": "Left group successfully"}

    except Error as e:
        conn.rollback()
        return {"success": False, "message": str(e)}
    finally:
        cursor.close()
        conn.close()


def remove_member(group_id: int, admin_id: int, target_user_id: int) -> Dict:
    """Admin removes a member from the group."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT role FROM group_members WHERE group_id=%s AND user_id=%s AND status='active'",
            (group_id, admin_id)
        )
        admin = cursor.fetchone()
        if not admin or admin['role'] != 'admin':
            return {"success": False, "message": "Only admins can remove members"}

        cursor.execute(
            "DELETE FROM group_members WHERE group_id=%s AND user_id=%s",
            (group_id, target_user_id)
        )
        conn.commit()
        return {"success": True, "message": "Member removed"}
    except Error as e:
        conn.rollback()
        return {"success": False, "message": str(e)}
    finally:
        cursor.close()
        conn.close()


def update_group(group_id: int, admin_id: int, name: str = None,
                 description: str = None, avatar: str = None) -> Dict:
    """Admin updates group info."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT role FROM group_members WHERE group_id=%s AND user_id=%s AND status='active'",
            (group_id, admin_id)
        )
        admin = cursor.fetchone()
        if not admin or admin['role'] != 'admin':
            return {"success": False, "message": "Only admins can update the group"}

        updates, params = [], []
        if name:
            updates.append("name=%s"); params.append(name[:100])
        if description is not None:
            updates.append("description=%s"); params.append(description[:500])
        if avatar is not None:
            updates.append("avatar=%s"); params.append(avatar)

        if not updates:
            return {"success": False, "message": "Nothing to update"}

        params.append(group_id)
        cursor.execute(f"UPDATE `groups` SET {', '.join(updates)} WHERE group_id=%s", params)
        conn.commit()
        return {"success": True, "message": "Group updated"}
    except Error as e:
        conn.rollback()
        return {"success": False, "message": str(e)}
    finally:
        cursor.close()
        conn.close()


def get_pending_invite_count(user_id: int) -> int:
    """Badge count for pending group invites."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT COUNT(*) FROM group_members WHERE user_id=%s AND status='pending'",
            (user_id,)
        )
        return cursor.fetchone()[0]
    except Error:
        return 0
    finally:
        cursor.close()
        conn.close()