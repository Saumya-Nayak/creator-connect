"""
Cleanup Script: Remove posts from database where media files don't exist
Run this once to clean up orphaned database records
"""

import os
import sys
from database.db import get_db_connection

def cleanup_orphaned_posts():
    """
    Find posts in database where the media file doesn't exist
    and delete them permanently
    """
    print("🔍 Starting cleanup of orphaned posts...")
    
    connection = get_db_connection()
    if not connection:
        print("❌ Database connection failed")
        return
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        # Get all posts with media URLs
        cursor.execute("""
            SELECT post_id, media_url, caption, created_at
            FROM posts
            WHERE media_url IS NOT NULL
            AND media_url != ''
        """)
        
        posts = cursor.fetchall()
        print(f"📊 Found {len(posts)} posts with media files in database")
        
        orphaned_posts = []
        
        # Check each post to see if file exists
        for post in posts:
            media_path = post['media_url']
            
            # Skip external URLs
            if media_path.startswith('http://') or media_path.startswith('https://'):
                continue
            
            # Get full file path
            file_path = os.path.join(os.getcwd(), media_path)
            
            # Check if file exists
            if not os.path.exists(file_path):
                orphaned_posts.append({
                    'post_id': post['post_id'],
                    'media_path': media_path,
                    'caption': post['caption'][:50] if post['caption'] else 'No caption',
                    'created_at': post['created_at']
                })
        
        print(f"\n🗑️  Found {len(orphaned_posts)} orphaned posts (file missing)")
        
        if len(orphaned_posts) == 0:
            print("✅ No orphaned posts found. Database is clean!")
            cursor.close()
            connection.close()
            return
        
        # Display orphaned posts
        print("\n📋 Orphaned posts to be deleted:")
        print("-" * 80)
        for post in orphaned_posts:
            print(f"Post ID: {post['post_id']}")
            print(f"  Caption: {post['caption']}")
            print(f"  Missing file: {post['media_path']}")
            print(f"  Created: {post['created_at']}")
            print()
        
        # Ask for confirmation
        response = input(f"\n⚠️  Delete these {len(orphaned_posts)} posts from database? (yes/no): ").strip().lower()
        
        if response not in ['yes', 'y']:
            print("❌ Cleanup cancelled")
            cursor.close()
            connection.close()
            return
        
        # Delete orphaned posts
        deleted_count = 0
        for post in orphaned_posts:
            post_id = post['post_id']
            
            try:
                # Delete related records first (check if tables exist)
                # Try to delete from each table, but continue if table doesn't exist
                try:
                    cursor.execute("DELETE FROM post_likes WHERE post_id = %s", (post_id,))
                except Exception as e:
                    if "doesn't exist" not in str(e):
                        raise
                
                try:
                    cursor.execute("DELETE FROM comments WHERE post_id = %s", (post_id,))
                except Exception as e:
                    if "doesn't exist" not in str(e):
                        raise
                
                try:
                    cursor.execute("DELETE FROM post_shares WHERE post_id = %s", (post_id,))
                except Exception as e:
                    if "doesn't exist" not in str(e):
                        raise
                
                try:
                    cursor.execute("DELETE FROM transactions WHERE post_id = %s", (post_id,))
                except Exception as e:
                    if "doesn't exist" not in str(e):
                        raise
                
                # Delete the post itself
                cursor.execute("DELETE FROM posts WHERE post_id = %s", (post_id,))
                connection.commit()
                
                print(f"✅ Deleted post {post_id}")
                deleted_count += 1
                
            except Exception as e:
                print(f"❌ Error deleting post {post_id}: {e}")
                connection.rollback()
        
        print(f"\n🎉 Successfully deleted {deleted_count} orphaned posts from database")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        import traceback
        traceback.print_exc()
        connection.rollback()
    
    finally:
        cursor.close()
        connection.close()
        print("\n✅ Cleanup complete")


if __name__ == "__main__":
    print("=" * 80)
    print("ORPHANED POSTS CLEANUP SCRIPT")
    print("=" * 80)
    print()
    print("This script will:")
    print("1. Find all posts in database where media files don't exist")
    print("2. Display them for your review")
    print("3. Delete them PERMANENTLY from database (with confirmation)")
    print()
    
    response = input("Continue? (yes/no): ").strip().lower()
    if response in ['yes', 'y']:
        cleanup_orphaned_posts()
    else:
        print("❌ Cleanup cancelled")