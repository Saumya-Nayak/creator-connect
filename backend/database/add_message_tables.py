"""
Creator Connect - Add Message Tables
Run this ONCE to add messaging tables to your existing database
"""

import sys
import os
# Add parent directory to path so we can import from database module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.db import get_db_connection
from mysql.connector import Error


def create_message_tables():
    """Create all tables required for messaging"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        print("🔨 Creating message tables...")
        
        # ===== MESSAGES TABLE =====
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                message_id INT AUTO_INCREMENT PRIMARY KEY,
                sender_id INT NOT NULL,
                receiver_id INT NOT NULL,
                message TEXT NOT NULL,
                media_url VARCHAR(500) DEFAULT NULL,
                media_type ENUM('image', 'video', 'audio', 'file') DEFAULT NULL,
                is_delivered TINYINT(1) DEFAULT 0,
                is_read TINYINT(1) DEFAULT 0,
                read_at TIMESTAMP NULL DEFAULT NULL,
                is_deleted TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
                
                INDEX idx_sender (sender_id),
                INDEX idx_receiver (receiver_id),
                INDEX idx_conversation (sender_id, receiver_id),
                INDEX idx_created (created_at),
                INDEX idx_unread (receiver_id, is_read)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        print("✅ Messages table created")
        
        # ===== CONVERSATIONS TABLE =====
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                conversation_id INT AUTO_INCREMENT PRIMARY KEY,
                user1_id INT NOT NULL COMMENT 'Lower user ID',
                user2_id INT NOT NULL COMMENT 'Higher user ID',
                last_message_id INT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (last_message_id) REFERENCES messages(message_id) ON DELETE SET NULL,
                
                UNIQUE KEY unique_conversation (user1_id, user2_id),
                INDEX idx_user1 (user1_id),
                INDEX idx_user2 (user2_id),
                INDEX idx_updated (updated_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        print("✅ Conversations table created")
        
        # ===== TYPING INDICATORS TABLE (Optional - for real-time) =====
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS typing_indicators (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                conversation_with INT NOT NULL,
                is_typing TINYINT(1) DEFAULT 1,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (conversation_with) REFERENCES users(id) ON DELETE CASCADE,
                
                UNIQUE KEY unique_typing (user_id, conversation_with),
                INDEX idx_conversation_with (conversation_with),
                INDEX idx_last_updated (last_updated)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        print("✅ Typing indicators table created")
        
        conn.commit()
        print("\n✅ All message tables created successfully!")
        print("\n📊 Tables created:")
        print("   1. messages - Stores all messages")
        print("   2. conversations - Tracks conversations between users")
        print("   3. typing_indicators - Real-time typing status (optional)")
        
    except Error as err:
        print(f"❌ Error creating tables: {err}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


def verify_tables():
    """Verify that all tables were created"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        print("\n🔍 Verifying tables...")
        
        tables = ['messages', 'conversations', 'typing_indicators']
        
        for table in tables:
            cursor.execute(f"SHOW TABLES LIKE '{table}'")
            result = cursor.fetchone()
            
            if result:
                print(f"✅ {table} table exists")
                
                # Show column count
                cursor.execute(f"SHOW COLUMNS FROM {table}")
                columns = cursor.fetchall()
                print(f"   └─ {len(columns)} columns")
            else:
                print(f"❌ {table} table NOT found")
        
        print("\n✅ Verification complete!")
        
    except Error as err:
        print(f"❌ Error verifying tables: {err}")
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    print("=" * 60)
    print("Creator Connect - Message Tables Setup")
    print("=" * 60)
    print("\n⚠️  WARNING: This will create new tables in your database")
    print("⚠️  Make sure to backup your database first!")
    
    confirm = input("\nProceed? (yes/no): ")
    
    if confirm.lower() in ['yes', 'y']:
        try:
            create_message_tables()
            verify_tables()
            
            print("\n" + "=" * 60)
            print("✅ Setup Complete!")
            print("=" * 60)
            print("\n📝 Next steps:")
            print("   1. Register message_routes in server.py")
            print("   2. Add messages link to your sidebar")
            print("   3. Test the messaging functionality")
            print("\n💡 Tip: Check the message_routes.py file for all available endpoints")
            
        except Exception as e:
            print(f"\n❌ Setup failed: {e}")
            print("Please check the error message and try again.")
    else:
        print("\n❌ Setup cancelled")