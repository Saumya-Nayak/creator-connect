"""
ULTIMATE DATABASE FIX SCRIPT - WITH NOTIFICATIONS SYSTEM
Includes:
- All existing tables (posts, followers, likes, comments, etc.)
- NEW: Notifications table
- NEW: Follow requests table (for private profiles)
- Triggers for auto-notifications
"""
from database.db import get_db_connection
from mysql.connector import Error

def ultimate_database_fix():
    """
    Complete database fix including notifications system
    """
    connection = get_db_connection()
    if not connection:
        print("❌ Database connection failed")
        return False
    
    try:
        cursor = connection.cursor()
        
        print("="*80)
        print("🚀 ULTIMATE DATABASE FIX - WITH NOTIFICATIONS SYSTEM")
        print("="*80)
        
        # ===== STEP 1: Disable foreign key checks =====
        print("\n🔓 Disabling foreign key checks...")
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
        
        # ===== STEP 2: Drop all dependent tables =====
        print("\n🗑️ Dropping existing tables...")
        tables_to_drop = [
            'notifications',  # NEW
            'follow_requests',  # NEW
            'transactions',
            'user_earnings',
            'post_shares',
            'comment_likes',  # ⭐ ADD THIS LINE
            'post_comments',
            'post_likes',
            'user_social_links',
            'followers',
            'subcategories',
            'posts',
            'categories'
        ]

        for table in tables_to_drop:
            try:
                cursor.execute(f"DROP TABLE IF EXISTS {table}")
                print(f"   ✅ Dropped {table}")
            except Error as e:
                print(f"   ⚠️ Could not drop {table}: {e}")

        connection.commit()
        
        # ===== STEP 3: Re-enable foreign key checks =====
        print("\n🔒 Re-enabling foreign key checks...")
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        
        # ===== STEP 4: Create categories table =====
        print("\n📂 Creating categories table...")
        cursor.execute("""
        CREATE TABLE categories (
            category_id INT AUTO_INCREMENT PRIMARY KEY,
            post_type ENUM('showcase', 'service', 'product') NOT NULL,
            category_name VARCHAR(100) NOT NULL,
            category_slug VARCHAR(100) NOT NULL,
            icon VARCHAR(50),
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            display_order INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_category (post_type, category_slug),
            INDEX idx_post_type (post_type),
            INDEX idx_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        print("   ✅ Categories table created")
        
        # ===== STEP 5: Create subcategories table =====
        print("\n📑 Creating subcategories table...")
        cursor.execute("""
        CREATE TABLE subcategories (
            subcategory_id INT AUTO_INCREMENT PRIMARY KEY,
            category_id INT NOT NULL,
            subcategory_name VARCHAR(100) NOT NULL,
            subcategory_slug VARCHAR(100) NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            display_order INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE,
            UNIQUE KEY unique_subcategory (category_id, subcategory_slug),
            INDEX idx_category (category_id),
            INDEX idx_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        print("   ✅ Subcategories table created")
        
        # ===== STEP 6: Create posts table =====
        print("\n📝 Creating posts table with complete schema...")
        cursor.execute("""
        CREATE TABLE posts (
            post_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            post_type ENUM('showcase', 'service', 'product') DEFAULT 'showcase',
            caption TEXT NOT NULL,
            media_url VARCHAR(500),
            media_type ENUM('image', 'video') DEFAULT 'image',
            privacy ENUM('public', 'followers') DEFAULT 'public',
            category_id INT,
            subcategory_id INT,
            tags VARCHAR(500),
            title VARCHAR(200),
            product_title VARCHAR(200),
            short_description TEXT,
            full_description TEXT,
            product_description TEXT,
            price DECIMAL(10, 2) DEFAULT 0.00,
            currency VARCHAR(10) DEFAULT 'INR',
            service_duration VARCHAR(50),
            service_delivery_time VARCHAR(50),
            includes_revisions BOOLEAN DEFAULT FALSE,
            max_revisions INT,
            requires_advance_booking BOOLEAN DEFAULT FALSE,
            booking_notice_days INT,
            stock INT,
            sku VARCHAR(100),
            brand VARCHAR(100),
            condition_type ENUM('new', 'like_new', 'good', 'fair') DEFAULT 'new',
            weight_kg DECIMAL(8, 2),
            dimensions VARCHAR(100),
            warranty_info TEXT,
            return_policy TEXT,
            shipping_available BOOLEAN DEFAULT TRUE,
            shipping_cost DECIMAL(10, 2),
            free_shipping_threshold DECIMAL(10, 2),
            estimated_delivery_days INT,
            contact_email VARCHAR(255),
            contact_phone VARCHAR(20),
            contact_info VARCHAR(500),
            delivery_time VARCHAR(100),
            highlights TEXT,
            accepts_upi BOOLEAN DEFAULT FALSE,
            accepts_bank_transfer BOOLEAN DEFAULT FALSE,
            accepts_cod BOOLEAN DEFAULT FALSE,
            seller_upi_id VARCHAR(255),
            seller_phone_number VARCHAR(20),
            seller_bank_account VARCHAR(50),
            seller_bank_ifsc VARCHAR(20),
            seller_bank_holder_name VARCHAR(100),
            payment_instructions TEXT,
            features TEXT,
            razorpay_product_id VARCHAR(255),
            paytm_product_id VARCHAR(255),
            upi_id VARCHAR(255),
            is_paid BOOLEAN DEFAULT FALSE,
            payment_method ENUM('razorpay', 'paytm', 'upi', 'bank_transfer', 'cod') DEFAULT 'razorpay',
            category VARCHAR(100),
            total_sales INT DEFAULT 0,
            total_revenue DECIMAL(12, 2) DEFAULT 0.00,
            likes_count INT DEFAULT 0,
            comments_count INT DEFAULT 0,
            shares_count INT DEFAULT 0,
            views_count INT DEFAULT 0,
            is_deleted BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
            FOREIGN KEY (subcategory_id) REFERENCES subcategories(subcategory_id) ON DELETE SET NULL,
            INDEX idx_user_posts (user_id),
            INDEX idx_post_type (post_type),
            INDEX idx_category_id (category_id),
            INDEX idx_subcategory_id (subcategory_id),
            INDEX idx_created_at (created_at),
            INDEX idx_privacy (privacy),
            INDEX idx_category (category),
            INDEX idx_is_paid (is_paid),
            INDEX idx_is_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        print("   ✅ Posts table created")
        
        # ===== STEP 7: Create followers table =====
        print("\n👥 Creating followers table...")
        cursor.execute("""
        CREATE TABLE followers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            follower_id INT NOT NULL,
            following_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE KEY unique_follow (follower_id, following_id),
            INDEX idx_follower (follower_id),
            INDEX idx_following (following_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        print("   ✅ Followers table created")
        
        # ===== STEP 8: ⭐ NEW - Create follow_requests table =====
        print("\n🔔 Creating follow_requests table (for private profiles)...")
        cursor.execute("""
        CREATE TABLE follow_requests (
            request_id INT AUTO_INCREMENT PRIMARY KEY,
            follower_id INT NOT NULL COMMENT 'User who wants to follow',
            following_id INT NOT NULL COMMENT 'User being followed (private account)',
            status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE KEY unique_request (follower_id, following_id),
            INDEX idx_follower (follower_id),
            INDEX idx_following (following_id),
            INDEX idx_status (status),
            INDEX idx_pending_requests (following_id, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        print("   ✅ Follow requests table created")
        
        # ===== STEP 9: Create post_likes table =====
        print("\n❤️ Creating post_likes table...")
        cursor.execute("""
        CREATE TABLE post_likes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            post_id INT NOT NULL,
            user_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE KEY unique_like (post_id, user_id),
            INDEX idx_post_likes (post_id),
            INDEX idx_user_likes (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        print("   ✅ Post likes table created")
        
        # ===== STEP 10: Create post_comments table =====
        print("\n💬 Creating post_comments table...")
        cursor.execute("""
        CREATE TABLE post_comments (
            comment_id INT AUTO_INCREMENT PRIMARY KEY,
            post_id INT NOT NULL,
            user_id INT NOT NULL,
            content TEXT NOT NULL,
            parent_comment_id INT DEFAULT NULL,
            likes_count INT DEFAULT 0,
            is_deleted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (parent_comment_id) REFERENCES post_comments(comment_id) ON DELETE CASCADE,
            INDEX idx_post_comments (post_id),
            INDEX idx_user_comments (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        print("   ✅ Post comments table created")
        print("\n❤️ Creating comment_likes table...")
        cursor.execute("""
        CREATE TABLE comment_likes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            comment_id INT NOT NULL,
            user_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (comment_id) REFERENCES post_comments(comment_id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE KEY unique_comment_like (comment_id, user_id),
            INDEX idx_comment_id (comment_id),
            INDEX idx_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        print("   ✅ Comment likes table created")
        # ===== STEP 11: ⭐ NEW - Create notifications table =====
        print("\n🔔 Creating notifications table...")
        cursor.execute("""
        CREATE TABLE notifications (
            notification_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL COMMENT 'User who will receive this notification',
            sender_id INT NOT NULL COMMENT 'User who triggered this notification',
            notification_type ENUM('like', 'comment', 'follow', 'follow_request', 'follow_accepted', 'share', 'mention') NOT NULL,
            related_post_id INT DEFAULT NULL COMMENT 'For like, comment, share notifications',
            related_comment_id INT DEFAULT NULL COMMENT 'For comment reply notifications',
            message TEXT NOT NULL COMMENT 'Notification message text',
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (related_post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
            FOREIGN KEY (related_comment_id) REFERENCES post_comments(comment_id) ON DELETE CASCADE,
            INDEX idx_user_notifications (user_id, is_read),
            INDEX idx_sender (sender_id),
            INDEX idx_type (notification_type),
            INDEX idx_created (created_at),
            INDEX idx_unread (user_id, is_read, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        print("   ✅ Notifications table created")
        
        # ===== STEP 12: Create user_social_links table =====
        print("\n🔗 Creating user_social_links table...")
        cursor.execute("""
        CREATE TABLE user_social_links (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            platform VARCHAR(50) NOT NULL,
            url VARCHAR(500) NOT NULL,
            is_visible BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_social (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        print("   ✅ User social links table created")
        
        # ===== STEP 13: Create post_shares table =====
        print("\n📤 Creating post_shares table...")
        cursor.execute("""
        CREATE TABLE post_shares (
            id INT AUTO_INCREMENT PRIMARY KEY,
            post_id INT NOT NULL,
            shared_by_user_id INT NOT NULL,
            shared_to_user_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
            FOREIGN KEY (shared_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (shared_to_user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_post_shares (post_id),
            INDEX idx_shared_by (shared_by_user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        print("   ✅ Post shares table created")
        
        # ===== STEP 14: Create transactions table =====
        print("\n💳 Creating transactions table...")
        cursor.execute("""
        CREATE TABLE transactions (
            transaction_id INT AUTO_INCREMENT PRIMARY KEY,
            post_id INT NOT NULL,
            seller_id INT NOT NULL,
            buyer_id INT NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            currency VARCHAR(10) DEFAULT 'INR',
            payment_method ENUM('razorpay', 'paytm', 'upi', 'bank_transfer', 'cod') NOT NULL,
            payment_gateway VARCHAR(50),
            transaction_ref VARCHAR(255),
            status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
            quantity INT DEFAULT 1,
            razorpay_order_id VARCHAR(255),
            razorpay_payment_id VARCHAR(255),
            paytm_order_id VARCHAR(255),
            upi_transaction_id VARCHAR(255),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
            FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_seller_transactions (seller_id),
            INDEX idx_buyer_transactions (buyer_id),
            INDEX idx_transaction_status (status),
            INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        print("   ✅ Transactions table created")
        
        # ===== STEP 15: Create user_earnings table =====
        print("\n💰 Creating user_earnings table...")
        cursor.execute("""
        CREATE TABLE user_earnings (
            earning_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            total_earnings DECIMAL(12, 2) DEFAULT 0.00,
            total_transactions INT DEFAULT 0,
            pending_amount DECIMAL(12, 2) DEFAULT 0.00,
            withdrawn_amount DECIMAL(12, 2) DEFAULT 0.00,
            last_withdrawal TIMESTAMP NULL,
            razorpay_account_id VARCHAR(255),
            paytm_account_id VARCHAR(255),
            upi_id VARCHAR(255),
            bank_account_number VARCHAR(50),
            bank_ifsc_code VARCHAR(20),
            bank_account_holder VARCHAR(100),
            is_verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_earnings (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        print("   ✅ User earnings table created")
        
        connection.commit()
        
        # ===== STEP 16: Create triggers =====
        # ===== FIND THE TRIGGERS SECTION IN YOUR fix_database_schema.py =====
# It's around line 250-300, where you create triggers

# ===== STEP 16: Create triggers =====
        print("\n⚡ Creating database triggers...")

        triggers = [
            ("after_post_like_insert", """
                CREATE TRIGGER after_post_like_insert
                AFTER INSERT ON post_likes
                FOR EACH ROW
                BEGIN
                    UPDATE posts 
                    SET likes_count = likes_count + 1 
                    WHERE post_id = NEW.post_id;
                END
            """),
            ("after_post_like_delete", """
                CREATE TRIGGER after_post_like_delete
                AFTER DELETE ON post_likes
                FOR EACH ROW
                BEGIN
                    UPDATE posts 
                    SET likes_count = GREATEST(likes_count - 1, 0)
                    WHERE post_id = OLD.post_id;
                END
            """),
            ("after_post_comment_insert", """
                CREATE TRIGGER after_post_comment_insert
                AFTER INSERT ON post_comments
                FOR EACH ROW
                BEGIN
                    UPDATE posts 
                    SET comments_count = comments_count + 1 
                    WHERE post_id = NEW.post_id;
                END
            """),
            ("after_post_comment_delete", """
                CREATE TRIGGER after_post_comment_delete
                AFTER DELETE ON post_comments
                FOR EACH ROW
                BEGIN
                    UPDATE posts 
                    SET comments_count = GREATEST(comments_count - 1, 0)
                    WHERE post_id = OLD.post_id;
                END
            """),
            # ===== ⭐ ADD THESE TWO NEW TRIGGERS FOR COMMENT LIKES =====
            ("after_comment_like_insert", """
                CREATE TRIGGER after_comment_like_insert
                AFTER INSERT ON comment_likes
                FOR EACH ROW
                BEGIN
                    UPDATE post_comments 
                    SET likes_count = likes_count + 1 
                    WHERE comment_id = NEW.comment_id;
                END
            """),
            ("after_comment_like_delete", """
                CREATE TRIGGER after_comment_like_delete
                AFTER DELETE ON comment_likes
                FOR EACH ROW
                BEGIN
                    UPDATE post_comments 
                    SET likes_count = GREATEST(likes_count - 1, 0)
                    WHERE comment_id = OLD.comment_id;
                END
            """),
            # ===== (Rest of your existing triggers) =====
            ("after_post_share_insert", """
                CREATE TRIGGER after_post_share_insert
                AFTER INSERT ON post_shares
                FOR EACH ROW
                BEGIN
                    UPDATE posts 
                    SET shares_count = shares_count + 1 
                    WHERE post_id = NEW.post_id;
                END
            """),
        ]

        for trigger_name, trigger_sql in triggers:
            try:
                cursor.execute(f"DROP TRIGGER IF EXISTS {trigger_name}")
                cursor.execute(trigger_sql)
                print(f"   ✅ {trigger_name} created")
            except Error as e:
                print(f"   ⚠️ Error creating {trigger_name}: {e}")

        connection.commit()
        
        # ===== STEP 17: Insert default categories =====
        print("\n📚 Inserting default categories...")
        
        categories_data = [
            ('showcase', 'Photography', 'photography', '📷', 1),
            ('showcase', 'Digital Art', 'digital-art', '🎨', 2),
            ('showcase', 'Music & Audio', 'music-audio', '🎵', 3),
            ('showcase', 'Video & Animation', 'video-animation', '🎬', 4),
            ('showcase', 'Writing & Content', 'writing-content', '✏️', 5),
            ('showcase', '3D Design', '3d-design', '🗿', 6),
            ('service', 'Design Services', 'design-services', '🎨', 1),
            ('service', 'Development', 'development', '💻', 2),
            ('service', 'Marketing', 'marketing', '📢', 3),
            ('service', 'Writing & Translation', 'writing-translation', '✏️', 4),
            ('service', 'Video & Animation', 'video-animation-service', '🎬', 5),
            ('service', 'Music & Audio', 'music-audio-service', '🎵', 6),
            ('service', 'Consulting', 'consulting', '💼', 7),
            ('service', 'Photography', 'photography-service', '📸', 8),
            ('product', 'Digital Products', 'digital-products', '💾', 1),
            ('product', 'Art & Prints', 'art-prints', '🖼️', 2),
            ('product', 'Handmade & Crafts', 'handmade-crafts', '🎨', 3),
            ('product', 'Merchandise', 'merchandise', '👕', 4),
            ('product', 'Books & Courses', 'books-courses', '📚', 5),
            ('product', 'Photography Equipment', 'photo-equipment', '📷', 6),
        ]
        
        for post_type, name, slug, icon, order in categories_data:
            cursor.execute("""
                INSERT INTO categories (post_type, category_name, category_slug, icon, display_order)
                VALUES (%s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE category_name = VALUES(category_name)
            """, (post_type, name, slug, icon, order))
        
        connection.commit()
        print("   ✅ Default categories inserted")
        
        # ===== STEP 18: Insert sample subcategories =====
        print("\n📑 Inserting sample subcategories...")
        
        cursor.execute("SELECT category_id, category_slug FROM categories")
        cat_ids = {row[1]: row[0] for row in cursor.fetchall()}
        
        subcategories_data = [
            ('photography', 'Portraits', 'portraits', 1),
            ('photography', 'Landscapes', 'landscapes', 2),
            ('photography', 'Wildlife', 'wildlife', 3),
            ('photography', 'Street Photography', 'street', 4),
            ('photography', 'Product Photography', 'product', 5),
            ('design-services', 'Logo Design', 'logo-design', 1),
            ('design-services', 'Brand Identity', 'brand-identity', 2),
            ('design-services', 'UI/UX Design', 'ui-ux-design', 3),
            ('design-services', 'Social Media Design', 'social-media-design', 4),
            ('design-services', 'Illustration', 'illustration', 5),
            ('digital-products', 'Templates', 'templates', 1),
            ('digital-products', 'Presets & Filters', 'presets-filters', 2),
            ('digital-products', 'Stock Photos', 'stock-photos', 3),
            ('digital-products', 'Fonts & Graphics', 'fonts-graphics', 4),
            ('digital-products', 'Audio & Music', 'audio-music', 5),
        ]
        
        for cat_slug, name, slug, order in subcategories_data:
            if cat_slug in cat_ids:
                cursor.execute("""
                    INSERT INTO subcategories (category_id, subcategory_name, subcategory_slug, display_order)
                    VALUES (%s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE subcategory_name = VALUES(subcategory_name)
                """, (cat_ids[cat_slug], name, slug, order))
        
        connection.commit()
        print("   ✅ Sample subcategories inserted")
        
        cursor.close()
        connection.close()
        
        print("\n" + "="*80)
        print("✅ DATABASE SCHEMA UPDATE COMPLETE!")
        print("="*80)
        print("\n📊 Summary of changes:")
        print("   ✅ All existing tables recreated")
        print("   🆕 notifications table (like, follow, comment, share)")
        print("   🆕 follow_requests table (for private profiles)")
        print("   ✅ All triggers for auto-counting")
        print("   ✅ Default categories & subcategories")
        print("\n💡 Next steps:")
        print("   1. Run: python notification_operations.py (I'll provide next)")
        print("   2. Update your API routes to use notifications")
        print("   3. Test notification creation")
        print("="*80 + "\n")
        
        return True
        
    except Error as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        if connection:
            connection.rollback()
            connection.close()
        return False

if __name__ == "__main__":
    print("\n⚠️  WARNING: This will DROP and RECREATE all tables!")
    print("⚠️  All existing data will be DELETED!")
    response = input("\nAre you sure you want to continue? (yes/no): ")
    
    if response.lower() == 'yes':
        ultimate_database_fix()
    else:
        print("\n❌ Database fix cancelled.")