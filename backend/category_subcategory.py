import mysql.connector
from datetime import datetime

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'creator_connect',
    'charset': 'utf8mb4'  # IMPORTANT: Use utf8mb4 for emoji support
}

def get_connection():
    return mysql.connector.connect(**DB_CONFIG)

def insert_categories_and_subcategories():
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # Set connection to use utf8mb4
        cursor.execute("SET NAMES utf8mb4")
        cursor.execute("SET CHARACTER SET utf8mb4")
        cursor.execute("SET character_set_connection=utf8mb4")
        
        # Categories with their subcategories
        # Using direct Unicode emojis - will work if MySQL is properly configured
        categories_data = {
            # SHOWCASE CATEGORIES
            'Photography': {
                'post_type': 'showcase',
                'icon': '📷',
                'subcategories': [
                    ('Portraits', 'portraits'),
                    ('Landscapes', 'landscapes'),
                    ('Wildlife', 'wildlife'),
                    ('Street Photography', 'street-photography'),
                    ('Macro Photography', 'macro-photography'),
                    ('Aerial Photography', 'aerial-photography'),
                    ('Black & White', 'black-white'),
                    ('Food Photography', 'food-photography'),
                    ('Fashion Photography', 'fashion-photography'),
                    ('Wedding Photography', 'wedding-photography'),
                    ('Product Photography', 'product-photography'),
                    ('Architectural Photography', 'architectural-photography')
                ]
            },
            'Digital Art': {
                'post_type': 'showcase',
                'icon': '🎨',
                'subcategories': [
                    ('Digital Painting', 'digital-painting'),
                    ('3D Art', '3d-art'),
                    ('Pixel Art', 'pixel-art'),
                    ('Vector Art', 'vector-art'),
                    ('Character Design', 'character-design'),
                    ('Concept Art', 'concept-art'),
                    ('Fan Art', 'fan-art'),
                    ('Abstract Art', 'abstract-art'),
                    ('Illustration', 'illustration'),
                    ('Comic Art', 'comic-art'),
                    ('Anime/Manga', 'anime-manga')
                ]
            },
            'Traditional Art': {
                'post_type': 'showcase',
                'icon': '🖌️',
                'subcategories': [
                    ('Oil Painting', 'oil-painting'),
                    ('Watercolor', 'watercolor'),
                    ('Acrylic Painting', 'acrylic-painting'),
                    ('Sketching', 'sketching'),
                    ('Charcoal Drawing', 'charcoal-drawing'),
                    ('Pastel Art', 'pastel-art'),
                    ('Mixed Media', 'mixed-media'),
                    ('Calligraphy', 'calligraphy'),
                    ('Ink Art', 'ink-art')
                ]
            },
            'Craft & Handmade': {
                'post_type': 'showcase',
                'icon': '✂️',
                'subcategories': [
                    ('Paper Craft', 'paper-craft'),
                    ('Origami', 'origami'),
                    ('Scrapbooking', 'scrapbooking'),
                    ('Jewelry Making', 'jewelry-making'),
                    ('Pottery & Ceramics', 'pottery-ceramics'),
                    ('Woodworking', 'woodworking'),
                    ('Knitting & Crochet', 'knitting-crochet'),
                    ('Embroidery', 'embroidery'),
                    ('Candle Making', 'candle-making'),
                    ('Soap Making', 'soap-making'),
                    ('Resin Art', 'resin-art'),
                    ('Macrame', 'macrame')
                ]
            },
            'Mehndi & Body Art': {
                'post_type': 'showcase',
                'icon': '🤲',
                'subcategories': [
                    ('Bridal Mehndi', 'bridal-mehndi'),
                    ('Arabic Mehndi', 'arabic-mehndi'),
                    ('Indian Mehndi', 'indian-mehndi'),
                    ('Pakistani Mehndi', 'pakistani-mehndi'),
                    ('Modern Mehndi', 'modern-mehndi'),
                    ('Minimalist Mehndi', 'minimalist-mehndi'),
                    ('Geometric Mehndi', 'geometric-mehndi'),
                    ('Festival Mehndi', 'festival-mehndi'),
                    ('Body Paint', 'body-paint'),
                    ('Temporary Tattoos', 'temporary-tattoos')
                ]
            },
            'Design': {
                'post_type': 'showcase',
                'icon': '🎯',
                'subcategories': [
                    ('Logo Design', 'logo-design'),
                    ('Brand Identity', 'brand-identity'),
                    ('UI/UX Design', 'ui-ux-design'),
                    ('Web Design', 'web-design'),
                    ('App Design', 'app-design'),
                    ('Graphic Design', 'graphic-design'),
                    ('Print Design', 'print-design'),
                    ('Packaging Design', 'packaging-design'),
                    ('Motion Graphics', 'motion-graphics'),
                    ('Infographic Design', 'infographic-design')
                ]
            },
            'Video & Animation': {
                'post_type': 'showcase',
                'icon': '🎬',
                'subcategories': [
                    ('2D Animation', '2d-animation'),
                    ('3D Animation', '3d-animation'),
                    ('Motion Design', 'motion-design'),
                    ('Video Editing', 'video-editing'),
                    ('VFX', 'vfx'),
                    ('Cinematography', 'cinematography'),
                    ('Stop Motion', 'stop-motion'),
                    ('Explainer Videos', 'explainer-videos'),
                    ('Music Videos', 'music-videos'),
                    ('Short Films', 'short-films')
                ]
            },
            'Music & Audio': {
                'post_type': 'showcase',
                'icon': '🎵',
                'subcategories': [
                    ('Music Production', 'music-production'),
                    ('Sound Design', 'sound-design'),
                    ('Podcast Production', 'podcast-production'),
                    ('Voice Over', 'voice-over'),
                    ('Audio Mixing', 'audio-mixing'),
                    ('Music Covers', 'music-covers'),
                    ('Original Compositions', 'original-compositions'),
                    ('Beat Making', 'beat-making')
                ]
            },
            'Writing & Content': {
                'post_type': 'showcase',
                'icon': '✍️',
                'subcategories': [
                    ('Creative Writing', 'creative-writing'),
                    ('Poetry', 'poetry'),
                    ('Blogging', 'blogging'),
                    ('Copywriting', 'copywriting'),
                    ('Technical Writing', 'technical-writing'),
                    ('Scriptwriting', 'scriptwriting'),
                    ('Content Writing', 'content-writing'),
                    ('Storytelling', 'storytelling')
                ]
            },
            'Fashion & Beauty': {
                'post_type': 'showcase',
                'icon': '👗',
                'subcategories': [
                    ('Fashion Design', 'fashion-design'),
                    ('Makeup Art', 'makeup-art'),
                    ('Hair Styling', 'hair-styling'),
                    ('Nail Art', 'nail-art'),
                    ('Fashion Illustration', 'fashion-illustration'),
                    ('Costume Design', 'costume-design'),
                    ('Accessories Design', 'accessories-design')
                ]
            },
            'Architecture & Interior': {
                'post_type': 'showcase',
                'icon': '🏛️',
                'subcategories': [
                    ('Architecture Design', 'architecture-design'),
                    ('Interior Design', 'interior-design'),
                    ('Landscape Design', 'landscape-design'),
                    ('3D Visualization', '3d-visualization'),
                    ('Space Planning', 'space-planning'),
                    ('Furniture Design', 'furniture-design')
                ]
            },
            
            # SERVICE CATEGORIES
            'Creative Services': {
                'post_type': 'service',
                'icon': '✨',
                'subcategories': [
                    ('Logo & Branding', 'logo-branding'),
                    ('Graphic Design', 'graphic-design-service'),
                    ('UI/UX Design', 'ui-ux-design-service'),
                    ('Video Editing', 'video-editing-service'),
                    ('Animation', 'animation-service'),
                    ('Illustration', 'illustration-service'),
                    ('3D Design', '3d-design-service')
                ]
            },
            'Digital Services': {
                'post_type': 'service',
                'icon': '💻',
                'subcategories': [
                    ('Web Development', 'web-development'),
                    ('App Development', 'app-development'),
                    ('Software Development', 'software-development'),
                    ('Game Development', 'game-development'),
                    ('WordPress', 'wordpress'),
                    ('E-commerce', 'ecommerce'),
                    ('SEO Services', 'seo-services')
                ]
            },
            'Marketing Services': {
                'post_type': 'service',
                'icon': '📢',
                'subcategories': [
                    ('Social Media Marketing', 'social-media-marketing'),
                    ('Digital Marketing', 'digital-marketing'),
                    ('Content Marketing', 'content-marketing'),
                    ('Email Marketing', 'email-marketing'),
                    ('Influencer Marketing', 'influencer-marketing'),
                    ('Brand Strategy', 'brand-strategy'),
                    ('Market Research', 'market-research')
                ]
            },
            'Content Services': {
                'post_type': 'service',
                'icon': '📝',
                'subcategories': [
                    ('Content Writing', 'content-writing-service'),
                    ('Copywriting', 'copywriting-service'),
                    ('Translation', 'translation'),
                    ('Transcription', 'transcription'),
                    ('Proofreading', 'proofreading'),
                    ('Resume Writing', 'resume-writing'),
                    ('Technical Writing', 'technical-writing-service')
                ]
            },
            'Photography Services': {
                'post_type': 'service',
                'icon': '📸',
                'subcategories': [
                    ('Wedding Photography', 'wedding-photography-service'),
                    ('Event Photography', 'event-photography'),
                    ('Product Photography', 'product-photography-service'),
                    ('Portrait Photography', 'portrait-photography'),
                    ('Real Estate Photography', 'real-estate-photography'),
                    ('Food Photography', 'food-photography-service'),
                    ('Photo Editing', 'photo-editing')
                ]
            },
            'Beauty Services': {
                'post_type': 'service',
                'icon': '💄',
                'subcategories': [
                    ('Mehndi Artist', 'mehndi-artist'),
                    ('Makeup Artist', 'makeup-artist'),
                    ('Hair Styling', 'hair-styling-service'),
                    ('Nail Art Service', 'nail-art-service'),
                    ('Bridal Makeup', 'bridal-makeup'),
                    ('Fashion Styling', 'fashion-styling')
                ]
            },
            'Event Services': {
                'post_type': 'service',
                'icon': '🎉',
                'subcategories': [
                    ('Event Planning', 'event-planning'),
                    ('Wedding Planning', 'wedding-planning'),
                    ('Decoration Services', 'decoration-services'),
                    ('Catering Services', 'catering-services'),
                    ('DJ Services', 'dj-services'),
                    ('Entertainment', 'entertainment')
                ]
            },
            'Consulting Services': {
                'post_type': 'service',
                'icon': '💼',
                'subcategories': [
                    ('Business Consulting', 'business-consulting'),
                    ('Financial Consulting', 'financial-consulting'),
                    ('Career Coaching', 'career-coaching'),
                    ('Life Coaching', 'life-coaching'),
                    ('Legal Consulting', 'legal-consulting'),
                    ('Marketing Consulting', 'marketing-consulting')
                ]
            },
            'Teaching & Tutoring': {
                'post_type': 'service',
                'icon': '📚',
                'subcategories': [
                    ('Academic Tutoring', 'academic-tutoring'),
                    ('Language Teaching', 'language-teaching'),
                    ('Music Lessons', 'music-lessons'),
                    ('Art Classes', 'art-classes'),
                    ('Online Courses', 'online-courses'),
                    ('Skill Training', 'skill-training')
                ]
            },
            
            # PRODUCT CATEGORIES
            'Art & Prints': {
                'post_type': 'product',
                'icon': '🖼️',
                'subcategories': [
                    ('Original Paintings', 'original-paintings'),
                    ('Art Prints', 'art-prints'),
                    ('Posters', 'posters'),
                    ('Canvas Prints', 'canvas-prints'),
                    ('Digital Downloads', 'digital-downloads'),
                    ('Framed Art', 'framed-art'),
                    ('Wall Art', 'wall-art')
                ]
            },
            'Handmade Crafts': {
                'post_type': 'product',
                'icon': '🎁',
                'subcategories': [
                    ('Handmade Jewelry', 'handmade-jewelry'),
                    ('Pottery Items', 'pottery-items'),
                    ('Wooden Crafts', 'wooden-crafts'),
                    ('Paper Crafts', 'paper-crafts'),
                    ('Textile Crafts', 'textile-crafts'),
                    ('Candles', 'candles'),
                    ('Soaps', 'soaps'),
                    ('Resin Products', 'resin-products')
                ]
            },
            'Fashion & Accessories': {
                'post_type': 'product',
                'icon': '👜',
                'subcategories': [
                    ('Clothing', 'clothing'),
                    ('Bags & Purses', 'bags-purses'),
                    ('Jewelry', 'jewelry'),
                    ('Scarves & Wraps', 'scarves-wraps'),
                    ('Hats & Caps', 'hats-caps'),
                    ('Belts', 'belts'),
                    ('Watches', 'watches'),
                    ('Sunglasses', 'sunglasses')
                ]
            },
            'Home Decor': {
                'post_type': 'product',
                'icon': '🏠',
                'subcategories': [
                    ('Wall Decor', 'wall-decor'),
                    ('Cushions & Pillows', 'cushions-pillows'),
                    ('Rugs & Carpets', 'rugs-carpets'),
                    ('Vases & Planters', 'vases-planters'),
                    ('Lighting', 'lighting'),
                    ('Mirrors', 'mirrors'),
                    ('Decorative Items', 'decorative-items')
                ]
            },
            'Digital Products': {
                'post_type': 'product',
                'icon': '💾',
                'subcategories': [
                    ('Templates', 'templates'),
                    ('Presets & Filters', 'presets-filters'),
                    ('Fonts', 'fonts'),
                    ('Graphics', 'graphics'),
                    ('Icons', 'icons'),
                    ('Brushes & Tools', 'brushes-tools'),
                    ('Stock Photos', 'stock-photos'),
                    ('Audio Files', 'audio-files'),
                    ('Video Templates', 'video-templates')
                ]
            },
            'Books & Courses': {
                'post_type': 'product',
                'icon': '📖',
                'subcategories': [
                    ('E-books', 'ebooks'),
                    ('Online Courses', 'online-courses-product'),
                    ('Workbooks', 'workbooks'),
                    ('Guides & Tutorials', 'guides-tutorials'),
                    ('Video Courses', 'video-courses'),
                    ('Audio Books', 'audio-books')
                ]
            },
            'Photography Equipment': {
                'post_type': 'product',
                'icon': '📷',
                'subcategories': [
                    ('Cameras', 'cameras'),
                    ('Lenses', 'lenses'),
                    ('Tripods & Stands', 'tripods-stands'),
                    ('Lighting Equipment', 'lighting-equipment'),
                    ('Camera Accessories', 'camera-accessories'),
                    ('Backdrops', 'backdrops')
                ]
            },
            'Art Supplies': {
                'post_type': 'product',
                'icon': '🎨',
                'subcategories': [
                    ('Paints & Colors', 'paints-colors'),
                    ('Brushes', 'brushes'),
                    ('Canvas & Paper', 'canvas-paper'),
                    ('Sketchbooks', 'sketchbooks'),
                    ('Drawing Tools', 'drawing-tools'),
                    ('Craft Supplies', 'craft-supplies')
                ]
            },
            'Beauty Products': {
                'post_type': 'product',
                'icon': '💅',
                'subcategories': [
                    ('Makeup Products', 'makeup-products'),
                    ('Skincare', 'skincare'),
                    ('Nail Products', 'nail-products'),
                    ('Hair Products', 'hair-products'),
                    ('Mehndi Cones', 'mehndi-cones'),
                    ('Beauty Tools', 'beauty-tools')
                ]
            },
            'Stationery & Paper Goods': {
                'post_type': 'product',
                'icon': '📎',
                'subcategories': [
                    ('Notebooks & Journals', 'notebooks-journals'),
                    ('Planners', 'planners'),
                    ('Greeting Cards', 'greeting-cards'),
                    ('Stickers', 'stickers'),
                    ('Washi Tape', 'washi-tape'),
                    ('Bookmarks', 'bookmarks')
                ]
            },
            'Toys & Games': {
                'post_type': 'product',
                'icon': '🧸',
                'subcategories': [
                    ('Handmade Toys', 'handmade-toys'),
                    ('Educational Toys', 'educational-toys'),
                    ('Puzzles', 'puzzles'),
                    ('Board Games', 'board-games'),
                    ('Soft Toys', 'soft-toys')
                ]
            },
            'Food & Beverages': {
                'post_type': 'product',
                'icon': '🍰',
                'subcategories': [
                    ('Homemade Food', 'homemade-food'),
                    ('Baked Goods', 'baked-goods'),
                    ('Preserves & Jams', 'preserves-jams'),
                    ('Spices & Herbs', 'spices-herbs'),
                    ('Beverages', 'beverages'),
                    ('Gift Hampers', 'gift-hampers')
                ]
            }
        }
        
        # Insert categories and subcategories
        category_order = 1
        for category_name, cat_data in categories_data.items():
            # Insert category
            category_query = """
                INSERT INTO categories (category_id, post_type, category_name, category_slug, icon, description, is_active, display_order, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            category_slug = category_name.lower().replace(' & ', '-').replace(' ', '-').replace('/', '-')
            category_id = category_order
            
            cursor.execute(category_query, (
                category_id,
                cat_data['post_type'],
                category_name,
                category_slug,
                cat_data['icon'],
                None,
                1,
                category_order,
                datetime.now()
            ))
            
            # Insert subcategories
            subcat_order = 1
            for subcat_name, subcat_slug in cat_data['subcategories']:
                subcategory_query = """
                    INSERT INTO subcategories (category_id, subcategory_name, subcategory_slug, description, is_active, display_order, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """
                
                cursor.execute(subcategory_query, (
                    category_id,
                    subcat_name,
                    subcat_slug,
                    None,
                    1,
                    subcat_order,
                    datetime.now()
                ))
                
                subcat_order += 1
            
            category_order += 1
            print(f"Inserted category: {category_name} ({cat_data['icon']}) with {len(cat_data['subcategories'])} subcategories")
        
        conn.commit()
        print(f"\n✅ Successfully inserted {len(categories_data)} categories with all subcategories!")
        print("📝 Emojis should now display correctly in MySQL!")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("Starting category and subcategory insertion with emoji support...")
    print("=" * 60)
    insert_categories_and_subcategories()