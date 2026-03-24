"""
Run this Python script to update your database schema for the new post types
with dynamic categories and subcategories
"""

from database.db import get_db_connection
from mysql.connector import Error

def update_database_schema():
    """
    Update database schema for:
    1. Three post types: showcase, service, product
    2. Dynamic categories and subcategories from database
    3. Service-specific fields (booking, pricing, duration)
    4. Product-specific fields (inventory, shipping)
    """
    connection = get_db_connection()
    if not connection:
        print("❌ Database connection failed")
        return False
    
    try:
        cursor = connection.cursor()
        
        print("="*70)
        print("🔧 UPDATING DATABASE SCHEMA FOR NEW POST TYPES")
        print("="*70)
        
        # ===== STEP 1: Create categories table =====
        print("\n📂 Creating categories table...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS categories (
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
        
        # ===== STEP 2: Create subcategories table =====
        print("\n📁 Creating subcategories table...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS subcategories (
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
        
        # ===== STEP 3: Update posts table =====
        print("\n📝 Updating posts table structure...")
        
        # Disable foreign key checks temporarily
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
        
        # Drop existing posts table
        cursor.execute("DROP TABLE IF EXISTS posts")
        
        # Recreate with new structure
        cursor.execute("""
        CREATE TABLE posts (
            post_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            
            -- Post type: showcase, service, or product
            post_type ENUM('showcase', 'service', 'product') DEFAULT 'showcase',
            
            -- Common fields
            caption TEXT NOT NULL,
            media_url VARCHAR(500),
            media_type ENUM('image', 'video') DEFAULT 'image',
            privacy ENUM('public', 'followers') DEFAULT 'public',
            
            -- Category & Subcategory (FK to new tables)
            category_id INT,
            subcategory_id INT,
            
            -- Tags (for showcase posts)
            tags VARCHAR(500),
            
            -- Common selling fields (for both service & product)
            title VARCHAR(200),
            short_description TEXT,
            full_description TEXT,
            price DECIMAL(10, 2) DEFAULT 0.00,
            currency VARCHAR(10) DEFAULT 'INR',
            
            -- SERVICE specific fields
            service_duration VARCHAR(50),
            service_delivery_time VARCHAR(50),
            includes_revisions BOOLEAN DEFAULT FALSE,
            max_revisions INT,
            requires_advance_booking BOOLEAN DEFAULT FALSE,
            booking_notice_days INT,
            
            -- PRODUCT specific fields
            stock INT,
            sku VARCHAR(100),
            brand VARCHAR(100),
            condition_type ENUM('new', 'like_new', 'good', 'fair') DEFAULT 'new',
            weight_kg DECIMAL(8, 2),
            dimensions VARCHAR(100),
            warranty_info TEXT,
            return_policy TEXT,
            
            -- Shipping (for products)
            shipping_available BOOLEAN DEFAULT TRUE,
            shipping_cost DECIMAL(10, 2),
            free_shipping_threshold DECIMAL(10, 2),
            estimated_delivery_days INT,
            
            -- Contact & Payment (common)
            contact_email VARCHAR(255),
            contact_phone VARCHAR(20),
            
            -- Payment methods
            accepts_upi BOOLEAN DEFAULT FALSE,
            accepts_bank_transfer BOOLEAN DEFAULT FALSE,
            accepts_cod BOOLEAN DEFAULT FALSE,
            
            -- Payment details
            seller_upi_id VARCHAR(255),
            seller_phone_number VARCHAR(20),
            seller_bank_account VARCHAR(50),
            seller_bank_ifsc VARCHAR(20),
            seller_bank_holder_name VARCHAR(100),
            payment_instructions TEXT,
            
            -- Features/Highlights (common)
            features TEXT,
            
            -- Engagement metrics
            likes_count INT DEFAULT 0,
            comments_count INT DEFAULT 0,
            shares_count INT DEFAULT 0,
            views_count INT DEFAULT 0,
            
            -- Sales metrics (service & product)
            total_sales INT DEFAULT 0,
            total_revenue DECIMAL(12, 2) DEFAULT 0.00,
            
            -- Status
            is_deleted BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            -- Foreign Keys
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
            FOREIGN KEY (subcategory_id) REFERENCES subcategories(subcategory_id) ON DELETE SET NULL,
            
            -- Indexes
            INDEX idx_user_posts (user_id),
            INDEX idx_post_type (post_type),
            INDEX idx_category (category_id),
            INDEX idx_subcategory (subcategory_id),
            INDEX idx_created_at (created_at),
            INDEX idx_privacy (privacy),
            INDEX idx_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        print("   ✅ Posts table updated with new structure")
        
        # Re-enable foreign key checks
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        
        connection.commit()
        
        # ===== STEP 4: Insert default categories =====
        print("\n📚 Inserting default categories and subcategories...")
        
        # SHOWCASE CATEGORIES
        showcase_cats = [
            ('Photography', 'photography', '📷', 1),
            ('Digital Art', 'digital-art', '🎨', 2),
            ('Music & Audio', 'music-audio', '🎵', 3),
            ('Video & Animation', 'video-animation', '🎬', 4),
            ('Writing & Content', 'writing-content', '✍️', 5),
            ('3D Design', '3d-design', '🗿', 6)
        ]
        
        # SERVICE CATEGORIES
        service_cats = [
            ('Design Services', 'design-services', '🎨', 1),
            ('Development', 'development', '💻', 2),
            ('Marketing', 'marketing', '📢', 3),
            ('Writing & Translation', 'writing-translation', '✍️', 4),
            ('Video & Animation', 'video-animation-service', '🎬', 5),
            ('Music & Audio', 'music-audio-service', '🎵', 6),
            ('Consulting', 'consulting', '💼', 7),
            ('Photography', 'photography-service', '📸', 8)
        ]
        
        # PRODUCT CATEGORIES
        product_cats = [
            ('Digital Products', 'digital-products', '💾', 1),
            ('Art & Prints', 'art-prints', '🖼️', 2),
            ('Handmade & Crafts', 'handmade-crafts', '🎨', 3),
            ('Merchandise', 'merchandise', '👕', 4),
            ('Books & Courses', 'books-courses', '📚', 5),
            ('Photography Equipment', 'photo-equipment', '📷', 6)
        ]
        
        # Insert showcase categories
        for cat_name, slug, icon, order in showcase_cats:
            cursor.execute("""
                INSERT INTO categories (post_type, category_name, category_slug, icon, display_order)
                VALUES ('showcase', %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE category_name = VALUES(category_name)
            """, (cat_name, slug, icon, order))
        
        # Insert service categories
        for cat_name, slug, icon, order in service_cats:
            cursor.execute("""
                INSERT INTO categories (post_type, category_name, category_slug, icon, display_order)
                VALUES ('service', %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE category_name = VALUES(category_name)
            """, (cat_name, slug, icon, order))
        
        # Insert product categories
        for cat_name, slug, icon, order in product_cats:
            cursor.execute("""
                INSERT INTO categories (post_type, category_name, category_slug, icon, display_order)
                VALUES ('product', %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE category_name = VALUES(category_name)
            """, (cat_name, slug, icon, order))
        
        connection.commit()
        print("   ✅ Default categories inserted")
        
        # ===== STEP 5: Insert sample subcategories =====
        print("\n📂 Inserting sample subcategories...")
        
        # Get category IDs
        cursor.execute("SELECT category_id, category_slug FROM categories")
        cat_ids = {row[1]: row[0] for row in cursor.fetchall()}
        
        # Photography subcategories
        if 'photography' in cat_ids:
            photo_subs = [
                ('Portraits', 'portraits', 1),
                ('Landscapes', 'landscapes', 2),
                ('Wildlife', 'wildlife', 3),
                ('Street Photography', 'street', 4),
                ('Product Photography', 'product', 5)
            ]
            for name, slug, order in photo_subs:
                cursor.execute("""
                    INSERT INTO subcategories (category_id, subcategory_name, subcategory_slug, display_order)
                    VALUES (%s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE subcategory_name = VALUES(subcategory_name)
                """, (cat_ids['photography'], name, slug, order))
        
        # Design Services subcategories
        if 'design-services' in cat_ids:
            design_subs = [
                ('Logo Design', 'logo-design', 1),
                ('Brand Identity', 'brand-identity', 2),
                ('UI/UX Design', 'ui-ux-design', 3),
                ('Social Media Design', 'social-media-design', 4),
                ('Illustration', 'illustration', 5)
            ]
            for name, slug, order in design_subs:
                cursor.execute("""
                    INSERT INTO subcategories (category_id, subcategory_name, subcategory_slug, display_order)
                    VALUES (%s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE subcategory_name = VALUES(subcategory_name)
                """, (cat_ids['design-services'], name, slug, order))
        
        # Digital Products subcategories
        if 'digital-products' in cat_ids:
            digital_subs = [
                ('Templates', 'templates', 1),
                ('Presets & Filters', 'presets-filters', 2),
                ('Stock Photos', 'stock-photos', 3),
                ('Fonts & Graphics', 'fonts-graphics', 4),
                ('Audio & Music', 'audio-music', 5)
            ]
            for name, slug, order in digital_subs:
                cursor.execute("""
                    INSERT INTO subcategories (category_id, subcategory_name, subcategory_slug, display_order)
                    VALUES (%s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE subcategory_name = VALUES(subcategory_name)
                """, (cat_ids['digital-products'], name, slug, order))
        
        connection.commit()
        print("   ✅ Sample subcategories inserted")
        
        cursor.close()
        connection.close()
        
        print("\n" + "="*70)
        print("✅ DATABASE SCHEMA UPDATED SUCCESSFULLY!")
        print("="*70)
        print("\n📊 Summary:")
        print("   • Posts table updated with 3 types: showcase, service, product")
        print("   • Categories table created with dynamic categories")
        print("   • Subcategories table created with relationships")
        print("   • Default categories and subcategories inserted")
        print("   • Service-specific fields added (booking, revisions)")
        print("   • Product-specific fields added (stock, shipping)")
        print("="*70 + "\n")
        
        return True
        
    except Error as e:
        print(f"\n❌ Error updating schema: {e}")
        if connection:
            connection.rollback()
            connection.close()
        return False

if __name__ == "__main__":
    update_database_schema()