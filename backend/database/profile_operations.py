from database.db import get_db_connection
from mysql.connector import Error
import os

def get_user_profile_with_stats(user_id):
    """Get user profile with all statistics"""
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # ✅ FIXED: Added "AS user_id" to return user_id instead of id
        query = """
        SELECT 
            u.id AS user_id,
            u.email,
            u.username,
            u.full_name,
            u.profile_pic,
            u.about_me,
            u.website_url,
            u.phone,
            u.country,
            u.state,
            u.city,
            u.gender,
            u.date_of_birth,
            u.role,
            u.is_private,
            u.created_at,
            (SELECT COUNT(*) FROM posts WHERE user_id = u.id AND is_deleted = FALSE) as posts_count,
            (SELECT COUNT(*) FROM followers WHERE following_id = u.id) as followers_count,
            (SELECT COUNT(*) FROM followers WHERE follower_id = u.id) as following_count
        FROM users u
        WHERE u.id = %s
        """
        
        cursor.execute(query, (user_id,))
        profile = cursor.fetchone()
        
        if not profile:
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'User not found'}
        
        # ✅ FIX: Convert date_of_birth to string format for JSON
        if profile.get('date_of_birth'):
            profile['date_of_birth'] = profile['date_of_birth'].strftime('%Y-%m-%d')
        
        # Get social links
        cursor.execute("""
            SELECT platform, url, is_visible 
            FROM user_social_links 
            WHERE user_id = %s AND is_visible = TRUE
        """, (user_id,))
        
        social_links = cursor.fetchall()
        profile['social_links'] = social_links
        
        cursor.close()
        connection.close()
        
        print(f"✅ Profile fetched successfully for user_id: {profile['user_id']}")
        
        return {
            'success': True,
            'profile': profile
        }
        
    except Error as e:
        print(f"❌ Error fetching profile: {e}")
        import traceback
        traceback.print_exc()
        if connection:
            connection.close()
        return {
            'success': False,
            'message': f'Failed to fetch profile: {str(e)}'
        }

def update_user_profile(user_id, update_data):
    """Update user profile information - ✅ FIXED to handle NULL values properly"""
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    
    try:
        cursor = connection.cursor()
        
        # Build dynamic update query
        update_fields = []
        values = []
        
        allowed_fields = [
            'full_name', 'phone', 'about_me', 
            'website_url', 'country', 'state', 'city', 
            'gender', 'date_of_birth', 'is_private',
            'profile_pic'
        ]
        
        # ✅ FIX: Process ALL fields, including NULL values
        for field in allowed_fields:
            if field in update_data:
                # Allow NULL values - only skip if key doesn't exist
                update_fields.append(f"{field} = %s")
                values.append(update_data[field])  # This can be None/NULL
        
        if not update_fields:
            return {'success': False, 'message': 'No fields to update'}
        
        values.append(user_id)
        
        update_query = f"""
        UPDATE users 
        SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        """
        
        print(f"📝 Executing query: {update_query}")
        print(f"📝 With values: {values}")
        
        cursor.execute(update_query, values)
        connection.commit()
        
        cursor.close()
        connection.close()
        
        print(f"✅ Profile updated for user ID: {user_id}")
        
        return {
            'success': True,
            'message': 'Profile updated successfully'
        }
        
    except Error as e:
        print(f"❌ Error updating profile: {e}")
        if connection:
            connection.rollback()
            connection.close()
        return {
            'success': False,
            'message': f'Update failed: {str(e)}'
        }

def update_social_links(user_id, social_links):
    """Update user's social media links"""
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    
    try:
        cursor = connection.cursor()
        
        # Delete existing social links
        cursor.execute("DELETE FROM user_social_links WHERE user_id = %s", (user_id,))
        
        # Insert new social links
        if social_links:
            insert_query = """
            INSERT INTO user_social_links (user_id, platform, url, is_visible)
            VALUES (%s, %s, %s, %s)
            """
            
            for link in social_links:
                cursor.execute(insert_query, (
                    user_id,
                    link.get('platform'),
                    link.get('url'),
                    link.get('is_visible', True)
                ))
        
        connection.commit()
        cursor.close()
        connection.close()
        
        return {
            'success': True,
            'message': 'Social links updated successfully'
        }
        
    except Error as e:
        print(f"❌ Error updating social links: {e}")
        if connection:
            connection.rollback()
            connection.close()
        return {
            'success': False,
            'message': f'Failed to update social links: {str(e)}'
        }

def follow_user(follower_id, following_id):
    """Follow a user"""
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    
    try:
        cursor = connection.cursor()
        
        # Check if already following
        cursor.execute("""
            SELECT id FROM followers 
            WHERE follower_id = %s AND following_id = %s
        """, (follower_id, following_id))
        
        if cursor.fetchone():
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'Already following this user'}
        
        # Insert follow relationship
        cursor.execute("""
            INSERT INTO followers (follower_id, following_id)
            VALUES (%s, %s)
        """, (follower_id, following_id))
        
        connection.commit()
        cursor.close()
        connection.close()
        
        return {
            'success': True,
            'message': 'Successfully followed user'
        }
        
    except Error as e:
        print(f"❌ Error following user: {e}")
        if connection:
            connection.rollback()
            connection.close()
        return {
            'success': False,
            'message': 'Failed to follow user'
        }

def unfollow_user(follower_id, following_id):
    """
    Unfollow a user
    ✅ FIXED: Also cleans up any follow requests when unfollowing
    """
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    
    try:
        cursor = connection.cursor()
        
        # Delete follow relationship
        cursor.execute("""
            DELETE FROM followers 
            WHERE follower_id = %s AND following_id = %s
        """, (follower_id, following_id))
        
        if cursor.rowcount == 0:
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'Not following this user'}
        
        # ✅ NEW: Also delete any follow requests (accepted/rejected) so user can send fresh request
        cursor.execute("""
            DELETE FROM follow_requests 
            WHERE follower_id = %s AND following_id = %s
        """, (follower_id, following_id))
        
        deleted_requests = cursor.rowcount
        if deleted_requests > 0:
            print(f"🗑️ Cleaned up {deleted_requests} old follow request(s)")
        
        connection.commit()
        cursor.close()
        connection.close()
        
        print(f"✅ User {follower_id} unfollowed user {following_id}")
        
        return {
            'success': True,
            'message': 'Successfully unfollowed user'
        }
        
    except Error as e:
        print(f"❌ Error unfollowing user: {e}")
        if connection:
            connection.rollback()
            connection.close()
        return {
            'success': False,
            'message': 'Failed to unfollow user'
        }

def check_if_following(follower_id, following_id):
    """Check if user is following another user"""
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'is_following': False}
    
    try:
        cursor = connection.cursor()
        
        cursor.execute("""
            SELECT COUNT(*) > 0 as is_following
            FROM followers
            WHERE follower_id = %s AND following_id = %s
        """, (follower_id, following_id))
        
        result = cursor.fetchone()
        is_following = bool(result[0]) if result else False
        
        cursor.close()
        connection.close()
        
        return {
            'success': True,
            'is_following': is_following
        }
        
    except Error as e:
        print(f"❌ Error checking follow status: {e}")
        if connection:
            connection.close()
        return {
            'success': False,
            'is_following': False
        }

def get_user_followers(user_id, limit=20, offset=0):
    """
    Get list of followers
    ✅ FIXED: Now correctly fetches users who are FOLLOWING this user
    """
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'followers': []}
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # ✅ FIX: Query users who have this user_id in their "following_id"
        # This means: "Get all users who are following ME"
        cursor.execute("""
            SELECT 
                u.id, 
                u.username, 
                u.full_name, 
                u.profile_pic, 
                f.created_at
            FROM followers f
            JOIN users u ON f.follower_id = u.id
            WHERE f.following_id = %s
            ORDER BY f.created_at DESC
            LIMIT %s OFFSET %s
        """, (user_id, limit, offset))
        
        followers = cursor.fetchall()
        
        print(f"✅ Found {len(followers)} followers for user_id {user_id}")
        
        cursor.close()
        connection.close()
        
        return {
            'success': True,
            'followers': followers
        }
        
    except Error as e:
        print(f"❌ Error fetching followers: {e}")
        import traceback
        traceback.print_exc()
        if connection:
            connection.close()
        return {
            'success': False,
            'followers': []
        }
def get_user_following(user_id, limit=20, offset=0):
    """
    Get list of users being followed
    ✅ FIXED: Now correctly fetches users that THIS user is following
    """
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'following': []}
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # ✅ FIX: Query users who are in the "following_id" column where follower_id is this user
        # This means: "Get all users that I AM FOLLOWING"
        cursor.execute("""
            SELECT 
                u.id, 
                u.username, 
                u.full_name, 
                u.profile_pic, 
                f.created_at
            FROM followers f
            JOIN users u ON f.following_id = u.id
            WHERE f.follower_id = %s
            ORDER BY f.created_at DESC
            LIMIT %s OFFSET %s
        """, (user_id, limit, offset))
        
        following = cursor.fetchall()
        
        print(f"✅ Found {len(following)} following for user_id {user_id}")
        
        cursor.close()
        connection.close()
        
        return {
            'success': True,
            'following': following
        }
        
    except Error as e:
        print(f"❌ Error fetching following: {e}")
        import traceback
        traceback.print_exc()
        if connection:
            connection.close()
        return {
            'success': False,
            'following': []
        }
# Add this new function to your profile_operations.py file

def get_user_followers_with_follow_status(user_id, viewer_id=None, limit=20, offset=0):
    """
    Get user's followers list with follow status for each follower
    
    Args:
        user_id: The user whose followers to get
        viewer_id: The ID of the user viewing the list (to check follow status)
        limit: Number of results per page
        offset: Pagination offset
    
    Returns:
        dict with success status and followers list with follow status
    """
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'followers': []}
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Get followers with their profile info
        query = """
            SELECT 
                u.id,
                u.username,
                u.full_name,
                u.profile_pic,
                u.about_me,
                u.is_private,
                f.created_at as followed_at
            FROM followers f
            JOIN users u ON f.follower_id = u.id
            WHERE f.following_id = %s
            ORDER BY f.created_at DESC
            LIMIT %s OFFSET %s
        """
        
        cursor.execute(query, (user_id, limit, offset))
        followers = cursor.fetchall()
        
        # If viewer is provided, check follow status for each follower
        if viewer_id:
            for follower in followers:
                follower_id = follower['id']
                
                # Skip if viewing own profile
                if follower_id == viewer_id:
                    follower['is_self'] = True
                    follower['is_following'] = False
                    follower['is_pending'] = False
                    continue
                
                follower['is_self'] = False
                
                # Check if viewer follows this follower
                cursor.execute("""
                    SELECT id FROM followers 
                    WHERE follower_id = %s AND following_id = %s
                """, (viewer_id, follower_id))
                
                is_following = cursor.fetchone() is not None
                follower['is_following'] = is_following
                
                # If follower has private profile and viewer doesn't follow them,
                # check for pending request
                if follower['is_private'] and not is_following:
                    cursor.execute("""
                        SELECT request_id, status 
                        FROM follow_requests 
                        WHERE follower_id = %s AND following_id = %s
                        AND status = 'pending'
                    """, (viewer_id, follower_id))
                    
                    pending_request = cursor.fetchone()
                    follower['is_pending'] = pending_request is not None
                else:
                    follower['is_pending'] = False
        else:
            # No viewer - set all follow statuses to False
            for follower in followers:
                follower['is_self'] = False
                follower['is_following'] = False
                follower['is_pending'] = False
        
        cursor.close()
        connection.close()
        
        return {
            'success': True,
            'followers': followers,
            'count': len(followers)
        }
        
    except Exception as e:
        print(f"❌ Error getting followers with follow status: {str(e)}")
        if connection:
            connection.close()
        return {'success': False, 'followers': []}


def get_user_following_with_follow_status(user_id, viewer_id=None, limit=20, offset=0):
    """
    Get user's following list with follow-back status for each user
    
    Args:
        user_id: The user whose following list to get
        viewer_id: The ID of the user viewing the list (to check follow status)
        limit: Number of results per page
        offset: Pagination offset
    
    Returns:
        dict with success status and following list with follow status
    """
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'following': []}
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Get following list with their profile info
        query = """
            SELECT 
                u.id,
                u.username,
                u.full_name,
                u.profile_pic,
                u.about_me,
                u.is_private,
                f.created_at as followed_at
            FROM followers f
            JOIN users u ON f.following_id = u.id
            WHERE f.follower_id = %s
            ORDER BY f.created_at DESC
            LIMIT %s OFFSET %s
        """
        
        cursor.execute(query, (user_id, limit, offset))
        following = cursor.fetchall()
        
        # If viewer is provided, check follow status for each user
        if viewer_id:
            for user in following:
                following_user_id = user['id']
                
                # Skip if viewing own profile
                if following_user_id == viewer_id:
                    user['is_self'] = True
                    user['is_following'] = False
                    user['is_pending'] = False
                    continue
                
                user['is_self'] = False
                
                # Check if viewer follows this user
                cursor.execute("""
                    SELECT id FROM followers 
                    WHERE follower_id = %s AND following_id = %s
                """, (viewer_id, following_user_id))
                
                is_following = cursor.fetchone() is not None
                user['is_following'] = is_following
                
                # If user has private profile and viewer doesn't follow them,
                # check for pending request
                if user['is_private'] and not is_following:
                    cursor.execute("""
                        SELECT request_id, status 
                        FROM follow_requests 
                        WHERE follower_id = %s AND following_id = %s
                        AND status = 'pending'
                    """, (viewer_id, following_user_id))
                    
                    pending_request = cursor.fetchone()
                    user['is_pending'] = pending_request is not None
                else:
                    user['is_pending'] = False
        else:
            # No viewer - set all follow statuses to False
            for user in following:
                user['is_self'] = False
                user['is_following'] = False
                user['is_pending'] = False
        
        cursor.close()
        connection.close()
        
        return {
            'success': True,
            'following': following,
            'count': len(following)
        }
        
    except Exception as e:
        print(f"❌ Error getting following with follow status: {str(e)}")
        if connection:
            connection.close()
        return {'success': False, 'following': []}