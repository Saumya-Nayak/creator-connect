"""
Comment Operations Module
Handles all CRUD operations for post comments
"""
from database.db import get_db_connection
from mysql.connector import Error
from datetime import datetime

def add_comment(post_id, user_id, content, parent_comment_id=None):
    """
    Add a comment to a post
    
    Args:
        post_id: ID of the post to comment on
        user_id: ID of the user adding the comment
        content: Comment text content
        parent_comment_id: Optional - ID of parent comment for replies
    
    Returns:
        Dictionary with success status, message, and comment data
    """
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Validate content
        if not content or not content.strip():
            return {'success': False, 'message': 'Comment content cannot be empty'}
        
        # Check if post exists
        cursor.execute("SELECT post_id FROM posts WHERE post_id = %s AND is_deleted = FALSE", (post_id,))
        if not cursor.fetchone():
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'Post not found'}
        
        # If replying to a comment, check if parent exists
        if parent_comment_id:
            cursor.execute("""
                SELECT comment_id FROM post_comments 
                WHERE comment_id = %s AND post_id = %s AND is_deleted = FALSE
            """, (parent_comment_id, post_id))
            if not cursor.fetchone():
                cursor.close()
                connection.close()
                return {'success': False, 'message': 'Parent comment not found'}
        
        # Insert comment
        insert_query = """
        INSERT INTO post_comments (post_id, user_id, content, parent_comment_id, created_at)
        VALUES (%s, %s, %s, %s, NOW())
        """
        
        cursor.execute(insert_query, (post_id, user_id, content.strip(), parent_comment_id))
        connection.commit()
        
        comment_id = cursor.lastrowid
        
        # Get the created comment with user details
        cursor.execute("""
            SELECT 
                c.comment_id,
                c.post_id,
                c.user_id,
                c.content,
                c.parent_comment_id,
                c.likes_count,
                c.created_at,
                c.updated_at,
                u.username,
                u.full_name,
                u.profile_pic
            FROM post_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.comment_id = %s
        """, (comment_id,))
        
        comment = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        print(f"✅ Comment {comment_id} added to post {post_id} by user {user_id}")
        
        return {
            'success': True,
            'message': 'Comment added successfully',
            'comment': comment
        }
        
    except Error as e:
        print(f"❌ Error adding comment: {e}")
        if connection:
            connection.rollback()
            connection.close()
        return {'success': False, 'message': f'Failed to add comment: {str(e)}'}


def get_post_comments(post_id, user_id=None, limit=20, offset=0, include_replies=True, sort_by='newest'):
    """
    Get comments for a post with pagination and sorting
    
    Args:
        post_id: ID of the post
        user_id: Optional - ID of requesting user (to check if they own comments)
        limit: Number of comments to retrieve
        offset: Pagination offset
        include_replies: Whether to include nested replies
        sort_by: Sort order - 'newest', 'oldest', or 'most_liked'
    
    Returns:
        Dictionary with success status and comments list
    """
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'comments': [], 'message': 'Database connection failed'}
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Determine sort order
        if sort_by == 'oldest':
            order_clause = "ORDER BY c.created_at ASC"
        elif sort_by == 'most_liked':
            order_clause = "ORDER BY c.likes_count DESC, c.created_at DESC"
        else:  # newest (default)
            order_clause = "ORDER BY c.created_at DESC"
        
        # Get top-level comments (no parent)
        query = f"""
        SELECT 
            c.comment_id,
            c.post_id,
            c.user_id,
            c.content,
            c.parent_comment_id,
            c.likes_count,
            c.created_at,
            c.updated_at,
            c.is_deleted,
            u.username,
            u.full_name,
            u.profile_pic
        FROM post_comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = %s 
        AND c.is_deleted = FALSE 
        AND c.parent_comment_id IS NULL
        {order_clause}
        LIMIT %s OFFSET %s
        """
        
        cursor.execute(query, (post_id, limit, offset))
        comments = cursor.fetchall()
        
        # If include_replies, get replies for each comment
        if include_replies and comments:
            comment_ids = [comment['comment_id'] for comment in comments]
            
            if comment_ids:
                placeholders = ','.join(['%s'] * len(comment_ids))
                replies_query = f"""
                SELECT 
                    c.comment_id,
                    c.post_id,
                    c.user_id,
                    c.content,
                    c.parent_comment_id,
                    c.likes_count,
                    c.created_at,
                    c.updated_at,
                    u.username,
                    u.full_name,
                    u.profile_pic
                FROM post_comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.parent_comment_id IN ({placeholders})
                AND c.is_deleted = FALSE
                ORDER BY c.created_at ASC
                """
                
                cursor.execute(replies_query, comment_ids)
                replies = cursor.fetchall()
                
                # Organize replies under their parent comments
                replies_dict = {}
                for reply in replies:
                    parent_id = reply['parent_comment_id']
                    if parent_id not in replies_dict:
                        replies_dict[parent_id] = []
                    replies_dict[parent_id].append(reply)
                
                # Add replies to comments
                for comment in comments:
                    comment['replies'] = replies_dict.get(comment['comment_id'], [])
                    comment['replies_count'] = len(comment['replies'])
        else:
            # Add empty replies array if not including replies
            for comment in comments:
                comment['replies'] = []
                comment['replies_count'] = 0
        
        # Add is_owner flag if user_id provided
        if user_id:
            for comment in comments:
                comment['is_owner'] = (comment['user_id'] == user_id)
                for reply in comment.get('replies', []):
                    reply['is_owner'] = (reply['user_id'] == user_id)
        
        # Get total count
        cursor.execute("""
            SELECT COUNT(*) as total 
            FROM post_comments 
            WHERE post_id = %s 
            AND parent_comment_id IS NULL 
            AND is_deleted = FALSE
        """, (post_id,))
        
        total_count = cursor.fetchone()['total']
        
        cursor.close()
        connection.close()
        
        return {
            'success': True,
            'comments': comments,
            'total_count': total_count,
            'has_more': (offset + len(comments)) < total_count,
            'sort_by': sort_by
        }
        
    except Error as e:
        print(f"❌ Error fetching comments: {e}")
        if connection:
            connection.close()
        return {'success': False, 'comments': [], 'message': f'Failed to fetch comments: {str(e)}'}


def update_comment(comment_id, user_id, new_content):
    """
    Update a comment (only by comment owner)
    
    Args:
        comment_id: ID of the comment to update
        user_id: ID of the user attempting update
        new_content: New comment text
    
    Returns:
        Dictionary with success status and message
    """
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Validate content
        if not new_content or not new_content.strip():
            return {'success': False, 'message': 'Comment content cannot be empty'}
        
        # Check if comment exists and user owns it
        cursor.execute("""
            SELECT user_id, is_deleted 
            FROM post_comments 
            WHERE comment_id = %s
        """, (comment_id,))
        
        comment = cursor.fetchone()
        
        if not comment:
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'Comment not found'}
        
        if comment['is_deleted']:
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'Comment has been deleted'}
        
        if comment['user_id'] != user_id:
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'You can only edit your own comments'}
        
        # Update comment
        cursor.execute("""
            UPDATE post_comments 
            SET content = %s, updated_at = NOW()
            WHERE comment_id = %s
        """, (new_content.strip(), comment_id))
        
        connection.commit()
        cursor.close()
        connection.close()
        
        print(f"✅ Comment {comment_id} updated by user {user_id}")
        
        return {
            'success': True,
            'message': 'Comment updated successfully'
        }
        
    except Error as e:
        print(f"❌ Error updating comment: {e}")
        if connection:
            connection.rollback()
            connection.close()
        return {'success': False, 'message': f'Failed to update comment: {str(e)}'}


def delete_comment(comment_id, user_id, is_admin=False):
    """
    Delete a comment (HARD DELETE - permanently removes from database)
    
    Args:
        comment_id: ID of the comment to delete
        user_id: ID of the user attempting deletion
        is_admin: Whether user is admin (can delete any comment)
    
    Returns:
        Dictionary with success status and message
    """
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Check if comment exists
        cursor.execute("""
            SELECT user_id, post_id, is_deleted 
            FROM post_comments 
            WHERE comment_id = %s
        """, (comment_id,))
        
        comment = cursor.fetchone()
        
        if not comment:
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'Comment not found'}
        
        if comment['is_deleted']:
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'Comment already deleted'}
        
        # Check permission (owner or admin)
        if not is_admin and comment['user_id'] != user_id:
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'You can only delete your own comments'}
        
        # ✅ HARD DELETE - Permanently remove from database
        # First, delete all replies to this comment
        cursor.execute("""
            DELETE FROM post_comments 
            WHERE parent_comment_id = %s
        """, (comment_id,))
        
        # Then delete the comment itself
        cursor.execute("""
            DELETE FROM post_comments 
            WHERE comment_id = %s
        """, (comment_id,))
        
        connection.commit()
        cursor.close()
        connection.close()
        
        print(f"✅ Comment {comment_id} permanently deleted by user {user_id}")
        
        return {
            'success': True,
            'message': 'Comment deleted successfully'
        }
        
    except Error as e:
        print(f"❌ Error deleting comment: {e}")
        if connection:
            connection.rollback()
            connection.close()
        return {'success': False, 'message': f'Failed to delete comment: {str(e)}'}


def get_comment_count(post_id):
    """
    Get total comment count for a post (including replies)
    
    Args:
        post_id: ID of the post
    
    Returns:
        Integer count of comments
    """
    connection = get_db_connection()
    if not connection:
        return 0
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM post_comments 
            WHERE post_id = %s AND is_deleted = FALSE
        """, (post_id,))
        
        result = cursor.fetchone()
        count = result['count'] if result else 0
        
        cursor.close()
        connection.close()
        
        return count
        
    except Error as e:
        print(f"❌ Error getting comment count: {e}")
        if connection:
            connection.close()
        return 0


"""
Comment Operations Module - Updated with Toggle Like
"""
from database.db import get_db_connection
from mysql.connector import Error

def like_comment(comment_id, user_id):
    """
    Toggle like on a comment (like if not liked, unlike if already liked)
    
    Args:
        comment_id: ID of the comment to like/unlike
        user_id: ID of the user toggling the like
    
    Returns:
        Dictionary with success status, liked status, and updated like count
    """
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Check if comment exists
        cursor.execute("""
            SELECT comment_id, likes_count 
            FROM post_comments 
            WHERE comment_id = %s AND is_deleted = FALSE
        """, (comment_id,))
        
        comment = cursor.fetchone()
        if not comment:
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'Comment not found'}
        
        # Check if user already liked this comment
        cursor.execute("""
            SELECT id FROM comment_likes 
            WHERE comment_id = %s AND user_id = %s
        """, (comment_id, user_id))
        
        existing_like = cursor.fetchone()
        
        if existing_like:
            # Unlike - Remove like
            cursor.execute("""
                DELETE FROM comment_likes 
                WHERE comment_id = %s AND user_id = %s
            """, (comment_id, user_id))
            
            # Decrement like count
            cursor.execute("""
                UPDATE post_comments 
                SET likes_count = GREATEST(likes_count - 1, 0)
                WHERE comment_id = %s
            """, (comment_id,))
            
            connection.commit()
            
            # Get updated count
            cursor.execute("""
                SELECT likes_count FROM post_comments WHERE comment_id = %s
            """, (comment_id,))
            
            updated_comment = cursor.fetchone()
            new_likes_count = updated_comment['likes_count'] if updated_comment else 0
            
            cursor.close()
            connection.close()
            
            print(f"💔 Comment {comment_id} unliked by user {user_id}")
            return {
                'success': True,
                'message': 'Comment unliked',
                'liked': False,
                'likes_count': new_likes_count
            }
        else:
            # Like - Add like
            cursor.execute("""
                INSERT INTO comment_likes (comment_id, user_id, created_at)
                VALUES (%s, %s, NOW())
            """, (comment_id, user_id))
            
            # Increment like count
            cursor.execute("""
                UPDATE post_comments 
                SET likes_count = likes_count + 1
                WHERE comment_id = %s
            """, (comment_id,))
            
            connection.commit()
            
            # Get updated count
            cursor.execute("""
                SELECT likes_count FROM post_comments WHERE comment_id = %s
            """, (comment_id,))
            
            updated_comment = cursor.fetchone()
            new_likes_count = updated_comment['likes_count'] if updated_comment else 0
            
            cursor.close()
            connection.close()
            
            print(f"❤️ Comment {comment_id} liked by user {user_id}")
            return {
                'success': True,
                'message': 'Comment liked',
                'liked': True,
                'likes_count': new_likes_count
            }
        
    except Error as e:
        print(f"❌ Error toggling comment like: {e}")
        if connection:
            connection.rollback()
            connection.close()
        return {'success': False, 'message': f'Failed to toggle like: {str(e)}'}