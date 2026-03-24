"""
Follow Request Operations Module
Handles follow requests for private profiles
"""
from database.db import get_db_connection
from mysql.connector import Error
from database.notification_operations import notify_follow_request, notify_follow_accepted

# ===== CREATE FOLLOW REQUEST =====

def create_follow_request(follower_id, following_id):
    """
    Create a follow request for a private profile
    
    Args:
        follower_id: User who wants to follow
        following_id: User being followed (must be private)
    
    Returns:
        Dictionary with success status and request_id
    """
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Check if trying to follow yourself
        if follower_id == following_id:
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'Cannot follow yourself'}
        
        # Check if target user is private
        cursor.execute("SELECT is_private FROM users WHERE id = %s", (following_id,))
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'User not found'}
        
        if not user['is_private']:
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'User profile is not private'}
        
        # Check if already following
        cursor.execute("""
            SELECT id FROM followers 
            WHERE follower_id = %s AND following_id = %s
        """, (follower_id, following_id))
        
        if cursor.fetchone():
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'Already following this user'}
        
        # Check if request already exists
        cursor.execute("""
            SELECT request_id, status FROM follow_requests 
            WHERE follower_id = %s AND following_id = %s
        """, (follower_id, following_id))
        
        existing_request = cursor.fetchone()
        
        if existing_request:
            if existing_request['status'] == 'pending':
                cursor.close()
                connection.close()
                return {'success': False, 'message': 'Follow request already pending'}
            elif existing_request['status'] == 'rejected':
                # Update rejected request to pending
                cursor.execute("""
                    UPDATE follow_requests 
                    SET status = 'pending', updated_at = NOW()
                    WHERE request_id = %s
                """, (existing_request['request_id'],))
                connection.commit()
                
                # Create notification
                notify_follow_request(following_id, follower_id)
                
                cursor.close()
                connection.close()
                
                print(f"🔄 Follow request re-sent from user {follower_id} to user {following_id}")
                return {
                    'success': True,
                    'message': 'Follow request sent',
                    'request_id': existing_request['request_id']
                }
        
        # Create new follow request
        cursor.execute("""
            INSERT INTO follow_requests (follower_id, following_id, status)
            VALUES (%s, %s, 'pending')
        """, (follower_id, following_id))
        
        connection.commit()
        request_id = cursor.lastrowid
        
        cursor.close()
        connection.close()
        
        # Create notification
        notify_follow_request(following_id, follower_id)
        
        print(f"📨 Follow request created from user {follower_id} to user {following_id}")
        
        return {
            'success': True,
            'message': 'Follow request sent',
            'request_id': request_id
        }
        
    except Error as e:
        print(f"❌ Error creating follow request: {e}")
        if connection:
            connection.rollback()
            connection.close()
        return {'success': False, 'message': f'Failed to send follow request: {str(e)}'}


# ===== ACCEPT FOLLOW REQUEST =====

def accept_follow_request(request_id, user_id):
    """
    Accept a follow request (only by the user being followed)
    
    Args:
        request_id: ID of the follow request
        user_id: ID of user accepting (must be the following_id)
    
    Returns:
        Dictionary with success status
    """
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Get request details
        cursor.execute("""
            SELECT follower_id, following_id, status 
            FROM follow_requests 
            WHERE request_id = %s
        """, (request_id,))
        
        request = cursor.fetchone()
        
        if not request:
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'Follow request not found'}
        
        # Verify user is the one being followed
        if request['following_id'] != user_id:
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'Unauthorized to accept this request'}
        
        # Check if already accepted
        if request['status'] == 'accepted':
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'Request already accepted'}
        
        follower_id = request['follower_id']
        following_id = request['following_id']
        
        # Update request status to accepted
        cursor.execute("""
            UPDATE follow_requests 
            SET status = 'accepted', updated_at = NOW()
            WHERE request_id = %s
        """, (request_id,))
        
        # Add to followers table
        cursor.execute("""
            INSERT INTO followers (follower_id, following_id)
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE created_at = created_at
        """, (follower_id, following_id))
        
        connection.commit()
        
        cursor.close()
        connection.close()
        
        # Create notification for requester
        notify_follow_accepted(follower_id, following_id)
        
        print(f"✅ Follow request accepted: user {follower_id} now follows user {following_id}")
        
        return {
            'success': True,
            'message': 'Follow request accepted'
        }
        
    except Error as e:
        print(f"❌ Error accepting follow request: {e}")
        if connection:
            connection.rollback()
            connection.close()
        return {'success': False, 'message': f'Failed to accept request: {str(e)}'}


# ===== REJECT FOLLOW REQUEST =====

def reject_follow_request(request_id, user_id):
    """
    Reject a follow request (only by the user being followed)
    
    Args:
        request_id: ID of the follow request
        user_id: ID of user rejecting (must be the following_id)
    
    Returns:
        Dictionary with success status
    """
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Get request details
        cursor.execute("""
            SELECT follower_id, following_id, status 
            FROM follow_requests 
            WHERE request_id = %s
        """, (request_id,))
        
        request = cursor.fetchone()
        
        if not request:
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'Follow request not found'}
        
        # Verify user is the one being followed
        if request['following_id'] != user_id:
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'Unauthorized to reject this request'}
        
        # Update request status to rejected
        cursor.execute("""
            UPDATE follow_requests 
            SET status = 'rejected', updated_at = NOW()
            WHERE request_id = %s
        """, (request_id,))
        
        connection.commit()
        
        cursor.close()
        connection.close()
        
        print(f"❌ Follow request rejected: request_id {request_id}")
        
        return {
            'success': True,
            'message': 'Follow request rejected'
        }
        
    except Error as e:
        print(f"❌ Error rejecting follow request: {e}")
        if connection:
            connection.rollback()
            connection.close()
        return {'success': False, 'message': f'Failed to reject request: {str(e)}'}


# ===== CANCEL FOLLOW REQUEST =====

def cancel_follow_request(request_id, user_id):
    """
    Cancel a follow request (only by the requester)
    
    Args:
        request_id: ID of the follow request
        user_id: ID of user canceling (must be the follower_id)
    
    Returns:
        Dictionary with success status
    """
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Get request details
        cursor.execute("""
            SELECT follower_id, following_id, status 
            FROM follow_requests 
            WHERE request_id = %s
        """, (request_id,))
        
        request = cursor.fetchone()
        
        if not request:
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'Follow request not found'}
        
        # Verify user is the requester
        if request['follower_id'] != user_id:
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'Unauthorized to cancel this request'}
        
        # Delete the request
        cursor.execute("DELETE FROM follow_requests WHERE request_id = %s", (request_id,))
        
        connection.commit()
        
        cursor.close()
        connection.close()
        
        print(f"🗑️ Follow request cancelled: request_id {request_id}")
        
        return {
            'success': True,
            'message': 'Follow request cancelled'
        }
        
    except Error as e:
        print(f"❌ Error cancelling follow request: {e}")
        if connection:
            connection.rollback()
            connection.close()
        return {'success': False, 'message': f'Failed to cancel request: {str(e)}'}


# ===== GET PENDING REQUESTS =====

def get_pending_follow_requests(user_id, limit=20, offset=0):
    """
    Get pending follow requests for a user (requests they need to accept/reject)
    
    Args:
        user_id: ID of user (the one being followed)
        limit: Number of requests to fetch
        offset: Pagination offset
    
    Returns:
        Dictionary with requests list
    """
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'requests': []}
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        query = """
        SELECT 
            fr.request_id,
            fr.follower_id,
            fr.following_id,
            fr.status,
            fr.created_at,
            u.username,
            u.full_name,
            u.profile_pic
        FROM follow_requests fr
        JOIN users u ON fr.follower_id = u.id
        WHERE fr.following_id = %s AND fr.status = 'pending'
        ORDER BY fr.created_at DESC
        LIMIT %s OFFSET %s
        """
        
        cursor.execute(query, (user_id, limit, offset))
        requests = cursor.fetchall()
        
        # Get total count
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM follow_requests 
            WHERE following_id = %s AND status = 'pending'
        """, (user_id,))
        
        count_result = cursor.fetchone()
        total_count = count_result['count'] if count_result else 0
        
        cursor.close()
        connection.close()
        
        return {
            'success': True,
            'requests': requests,
            'total_count': total_count
        }
        
    except Error as e:
        print(f"❌ Error fetching pending requests: {e}")
        if connection:
            connection.close()
        return {'success': False, 'requests': [], 'message': str(e)}


# ===== GET SENT REQUESTS =====

def get_sent_follow_requests(user_id, limit=20, offset=0):
    """
    Get follow requests sent by a user (requests they're waiting on)
    
    Args:
        user_id: ID of user (the requester)
        limit: Number of requests to fetch
        offset: Pagination offset
    
    Returns:
        Dictionary with requests list
    """
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'requests': []}
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        query = """
        SELECT 
            fr.request_id,
            fr.follower_id,
            fr.following_id,
            fr.status,
            fr.created_at,
            u.username,
            u.full_name,
            u.profile_pic
        FROM follow_requests fr
        JOIN users u ON fr.following_id = u.id
        WHERE fr.follower_id = %s AND fr.status = 'pending'
        ORDER BY fr.created_at DESC
        LIMIT %s OFFSET %s
        """
        
        cursor.execute(query, (user_id, limit, offset))
        requests = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return {
            'success': True,
            'requests': requests,
            'total': len(requests)
        }
        
    except Error as e:
        print(f"❌ Error fetching sent requests: {e}")
        if connection:
            connection.close()
        return {'success': False, 'requests': [], 'message': str(e)}


# ===== CHECK REQUEST STATUS =====

def check_follow_request_status(follower_id, following_id):
    """
    Check if there's a follow request between two users and its status
    
    Args:
        follower_id: User who wants to follow
        following_id: User being followed
    
    Returns:
        Dictionary with status info
    """
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'has_request': False}
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT request_id, status, created_at 
            FROM follow_requests 
            WHERE follower_id = %s AND following_id = %s
        """, (follower_id, following_id))
        
        request = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        if request:
            return {
                'success': True,
                'has_request': True,
                'request_id': request['request_id'],
                'status': request['status'],
                'created_at': request['created_at']
            }
        else:
            return {
                'success': True,
                'has_request': False,
                'status': None
            }
        
    except Error as e:
        print(f"❌ Error checking request status: {e}")
        if connection:
            connection.close()
        return {'success': False, 'has_request': False, 'message': str(e)}


# ===== CLEANUP OLD REJECTED REQUESTS =====

def cleanup_rejected_requests(days=30):
    """
    Delete rejected follow requests older than specified days
    
    Args:
        days: Delete rejected requests older than this many days
    
    Returns:
        Dictionary with success status and count
    """
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    
    try:
        cursor = connection.cursor()
        
        cursor.execute("""
            DELETE FROM follow_requests 
            WHERE status = 'rejected' 
            AND updated_at < DATE_SUB(NOW(), INTERVAL %s DAY)
        """, (days,))
        
        connection.commit()
        deleted_count = cursor.rowcount
        
        cursor.close()
        connection.close()
        
        print(f"🧹 Cleaned up {deleted_count} old rejected requests (older than {days} days)")
        
        return {
            'success': True,
            'message': f'Deleted {deleted_count} old rejected requests',
            'count': deleted_count
        }
        
    except Error as e:
        print(f"❌ Error cleaning up rejected requests: {e}")
        if connection:
            connection.rollback()
            connection.close()
        return {'success': False, 'message': str(e)}


if __name__ == "__main__":
    print("✅ Follow request operations module loaded successfully")
    print("📋 Available functions:")
    print("   - create_follow_request()")
    print("   - accept_follow_request()")
    print("   - reject_follow_request()")
    print("   - cancel_follow_request()")
    print("   - get_pending_follow_requests()")
    print("   - get_sent_follow_requests()")
    print("   - check_follow_request_status()")
    print("   - cleanup_rejected_requests()")