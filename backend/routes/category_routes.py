"""
routes/category_routes.py
Handles fetching categories and subcategories dynamically.
Active-only categories for upload form; all categories for display on existing posts.
"""

from flask import Blueprint, request, jsonify
from database.db import get_db_connection

category_bp = Blueprint('category', __name__)

@category_bp.route('/categories', methods=['GET'])
def get_categories():
    """
    Get categories optionally filtered by post_type.
    Query params:
    - post_type: showcase, service, product (optional)
    - include_subcategories: true/false (default: false)
    - for_upload: true/false — if true, only return is_active=TRUE categories (default: true)
    """
    try:
        post_type    = request.args.get('post_type', None)
        include_subs = request.args.get('include_subcategories', 'false').lower() == 'true'
        # ✅ for_upload=true (default) → only active categories shown in upload dropdown
        # for_upload=false → all categories (used for display on existing posts)
        for_upload   = request.args.get('for_upload', 'true').lower() == 'true'

        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500

        cursor = connection.cursor(dictionary=True)

        active_clause = "AND is_active = TRUE" if for_upload else ""

        if post_type:
            query = f"""
            SELECT category_id, post_type, category_name, category_slug,
                   icon, description, display_order, is_active
            FROM categories
            WHERE post_type = %s {active_clause}
            ORDER BY display_order ASC, category_name ASC
            """
            cursor.execute(query, (post_type,))
        else:
            query = f"""
            SELECT category_id, post_type, category_name, category_slug,
                   icon, description, display_order, is_active
            FROM categories
            WHERE 1=1 {active_clause}
            ORDER BY post_type ASC, display_order ASC, category_name ASC
            """
            cursor.execute(query)

        categories = cursor.fetchall()

        if include_subs and categories:
            cat_ids = [cat['category_id'] for cat in categories]
            placeholders = ','.join(['%s'] * len(cat_ids))
            cursor.execute(f"""
                SELECT subcategory_id, category_id, subcategory_name,
                       subcategory_slug, description, display_order
                FROM subcategories
                WHERE category_id IN ({placeholders}) AND is_active = TRUE
                ORDER BY display_order ASC, subcategory_name ASC
            """, cat_ids)

            subcategories = cursor.fetchall()
            subs_by_cat = {}
            for sub in subcategories:
                cid = sub['category_id']
                subs_by_cat.setdefault(cid, []).append(sub)

            for cat in categories:
                cat['subcategories'] = subs_by_cat.get(cat['category_id'], [])

        cursor.close()
        connection.close()

        return jsonify({'success': True, 'categories': categories, 'count': len(categories)}), 200

    except Exception as e:
        print(f"❌ Error fetching categories: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to fetch categories'}), 500


@category_bp.route('/categories/<int:category_id>/subcategories', methods=['GET'])
def get_subcategories(category_id):
    """Get all active subcategories for a specific category"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500

        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT subcategory_id, category_id, subcategory_name,
                   subcategory_slug, description, display_order
            FROM subcategories
            WHERE category_id = %s AND is_active = TRUE
            ORDER BY display_order ASC, subcategory_name ASC
        """, (category_id,))
        subcategories = cursor.fetchall()
        cursor.close()
        connection.close()

        return jsonify({'success': True, 'subcategories': subcategories, 'count': len(subcategories)}), 200

    except Exception as e:
        print(f"❌ Error fetching subcategories: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch subcategories'}), 500


@category_bp.route('/categories/all-organized', methods=['GET'])
def get_all_organized():
    """
    Get all ACTIVE categories organized by post type with subcategories.
    Used for upload form dropdowns.
    """
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500

        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT category_id, post_type, category_name, category_slug,
                   icon, description, display_order
            FROM categories
            WHERE is_active = TRUE
            ORDER BY post_type ASC, display_order ASC, category_name ASC
        """)
        categories = cursor.fetchall()

        cursor.execute("""
            SELECT subcategory_id, category_id, subcategory_name,
                   subcategory_slug, description, display_order
            FROM subcategories
            WHERE is_active = TRUE
            ORDER BY display_order ASC, subcategory_name ASC
        """)
        subcategories = cursor.fetchall()
        cursor.close()
        connection.close()

        subs_by_cat = {}
        for sub in subcategories:
            subs_by_cat.setdefault(sub['category_id'], []).append(sub)

        organized = {'showcase': [], 'service': [], 'product': []}
        for cat in categories:
            cat['subcategories'] = subs_by_cat.get(cat['category_id'], [])
            if cat['post_type'] in organized:
                organized[cat['post_type']].append(cat)

        return jsonify({'success': True, 'categories': organized}), 200

    except Exception as e:
        print(f"❌ Error fetching organized categories: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to fetch categories'}), 500