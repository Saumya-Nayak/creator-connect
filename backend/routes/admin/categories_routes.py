"""
routes/admin/categories_routes.py
─────────────────────────────────────────────────────────────────────────────
Admin Categories & Subcategories Routes — CreatorConnect
Register in app.py:
    from routes.admin.categories_routes import categories_bp
    app.register_blueprint(categories_bp)
"""

from flask import Blueprint, jsonify, request
from database.db import get_db_connection
from routes.admin.admin_auth import admin_required
from datetime import datetime

categories_bp = Blueprint('admin_categories', __name__)


# ══════════════════════════════════════════════════════════════════════════════
#  CATEGORIES
# ══════════════════════════════════════════════════════════════════════════════

# ─── 1. GET ALL CATEGORIES (search + filter + pagination) ────────────────────

@categories_bp.route('/api/admin/categories', methods=['GET'])
@admin_required
def get_categories():
    search    = request.args.get('search', '').strip()
    post_type = request.args.get('post_type', '')        # showcase|service|product
    status    = request.args.get('status', '')           # active|inactive
    sort      = request.args.get('sort', 'display_order')
    direction = request.args.get('dir', 'asc').lower()
    page      = max(int(request.args.get('page',  1)), 1)
    limit     = min(int(request.args.get('limit', 20)), 100)
    offset    = (page - 1) * limit

    # Whitelist sort columns to prevent SQL injection
    allowed_sorts = {'category_id', 'category_name', 'category_slug', 'post_type', 'display_order', 'created_at', 'is_active'}
    if sort not in allowed_sorts:
        sort = 'display_order'
    if direction not in ('asc', 'desc'):
        direction = 'asc'

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    conditions, params = [], []

    if search:
        conditions.append("(c.category_name LIKE %s OR c.category_slug LIKE %s OR c.description LIKE %s)")
        like = f'%{search}%'
        params += [like, like, like]

    if post_type in ('showcase', 'service', 'product'):
        conditions.append("c.post_type = %s")
        params.append(post_type)

    if status == 'active':
        conditions.append("c.is_active = 1")
    elif status == 'inactive':
        conditions.append("c.is_active = 0")

    where = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''

    # Total count
    cur.execute(f"SELECT COUNT(*) AS cnt FROM categories c {where}", params)
    total = cur.fetchone()['cnt']

    # Main query — join post count and subcat count
    cur.execute(f"""
        SELECT
            c.*,
            COUNT(DISTINCT p.post_id)         AS post_count,
            COUNT(DISTINCT sc.subcategory_id)  AS subcat_count
        FROM categories c
        LEFT JOIN posts p ON p.category_id = c.category_id AND p.is_deleted = 0
        LEFT JOIN subcategories sc ON sc.category_id = c.category_id
        {where}
        GROUP BY c.category_id
        ORDER BY c.{sort} {direction.upper()}
        LIMIT %s OFFSET %s
    """, params + [limit, offset])

    rows = cur.fetchall()
    cur.close()
    conn.close()

    def serialize(c):
        return {
            'category_id':   c['category_id'],
            'post_type':     c['post_type'],
            'category_name': c['category_name'],
            'category_slug': c['category_slug'],
            'icon':          c['icon'],
            'description':   c['description'],
            'is_active':     bool(c['is_active']),
            'display_order': c['display_order'],
            'created_at':    c['created_at'].isoformat() if c['created_at'] else None,
            'post_count':    c['post_count'],
            'subcat_count':  c['subcat_count'],
        }

    return jsonify({
        'categories': [serialize(c) for c in rows],
        'total': total,
        'page':  page,
        'limit': limit,
        'pages': (total + limit - 1) // limit,
    })


# ─── 2. GET SINGLE CATEGORY ───────────────────────────────────────────────────

@categories_bp.route('/api/admin/categories/<int:cat_id>', methods=['GET'])
@admin_required
def get_category(cat_id):
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT
            c.*,
            COUNT(DISTINCT p.post_id)         AS post_count,
            COUNT(DISTINCT sc.subcategory_id)  AS subcat_count
        FROM categories c
        LEFT JOIN posts p ON p.category_id = c.category_id AND p.is_deleted = 0
        LEFT JOIN subcategories sc ON sc.category_id = c.category_id
        WHERE c.category_id = %s
        GROUP BY c.category_id
    """, (cat_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        return jsonify({'error': 'Category not found'}), 404

    result = {}
    for k, v in row.items():
        if isinstance(v, datetime):
            result[k] = v.isoformat()
        else:
            result[k] = v
    result['is_active'] = bool(result['is_active'])
    return jsonify(result)


# ─── 3. CREATE CATEGORY ───────────────────────────────────────────────────────

@categories_bp.route('/api/admin/categories', methods=['POST'])
@admin_required
def create_category():
    data = request.get_json() or {}
    post_type     = data.get('post_type', '').strip()
    category_name = data.get('category_name', '').strip()
    category_slug = data.get('category_slug', '').strip()
    icon          = data.get('icon', '').strip() or None
    description   = data.get('description', '').strip() or None
    display_order = int(data.get('display_order', 0))
    is_active     = int(data.get('is_active', 1))

    if not all([post_type, category_name, category_slug]):
        return jsonify({'error': 'post_type, category_name, and category_slug are required'}), 400
    if post_type not in ('showcase', 'service', 'product'):
        return jsonify({'error': 'Invalid post_type'}), 400

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    # Check uniqueness
    cur.execute("SELECT category_id FROM categories WHERE post_type=%s AND category_slug=%s", (post_type, category_slug))
    if cur.fetchone():
        cur.close(); conn.close()
        return jsonify({'error': 'A category with this slug already exists for the given post_type'}), 409

    cur.execute("""
        INSERT INTO categories (post_type, category_name, category_slug, icon, description, is_active, display_order)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (post_type, category_name, category_slug, icon, description, is_active, display_order))
    new_id = cur.lastrowid
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({'success': True, 'category_id': new_id, 'message': 'Category created successfully'}), 201


# ─── 4. UPDATE CATEGORY ───────────────────────────────────────────────────────

@categories_bp.route('/api/admin/categories/<int:cat_id>', methods=['PUT'])
@admin_required
def update_category(cat_id):
    data = request.get_json() or {}
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    cur.execute("SELECT category_id FROM categories WHERE category_id=%s", (cat_id,))
    if not cur.fetchone():
        cur.close(); conn.close()
        return jsonify({'error': 'Category not found'}), 404

    fields, params = [], []

    if 'post_type' in data:
        if data['post_type'] not in ('showcase','service','product'):
            cur.close(); conn.close()
            return jsonify({'error': 'Invalid post_type'}), 400
        fields.append("post_type=%s"); params.append(data['post_type'])

    if 'category_name' in data:
        fields.append("category_name=%s"); params.append(data['category_name'].strip())

    if 'category_slug' in data:
        new_slug = data['category_slug'].strip()
        # Check uniqueness (excluding self)
        check_type = data.get('post_type', None)
        if check_type:
            cur.execute("SELECT category_id FROM categories WHERE post_type=%s AND category_slug=%s AND category_id!=%s", (check_type, new_slug, cat_id))
        else:
            cur.execute("SELECT category_id FROM categories WHERE category_slug=%s AND category_id!=%s", (new_slug, cat_id))
        if cur.fetchone():
            cur.close(); conn.close()
            return jsonify({'error': 'Slug already in use'}), 409
        fields.append("category_slug=%s"); params.append(new_slug)

    if 'icon' in data:
        fields.append("icon=%s"); params.append(data['icon'] or None)
    if 'description' in data:
        fields.append("description=%s"); params.append(data['description'] or None)
    if 'display_order' in data:
        fields.append("display_order=%s"); params.append(int(data['display_order']))
    if 'is_active' in data:
        fields.append("is_active=%s"); params.append(int(bool(data['is_active'])))

    if not fields:
        cur.close(); conn.close()
        return jsonify({'error': 'No fields to update'}), 400

    cur.execute(f"UPDATE categories SET {','.join(fields)} WHERE category_id=%s", params+[cat_id])
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True, 'message': 'Category updated successfully'})


# ─── 5. TOGGLE CATEGORY ACTIVE STATUS ────────────────────────────────────────

@categories_bp.route('/api/admin/categories/<int:cat_id>/toggle', methods=['POST'])
@admin_required
def toggle_category(cat_id):
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute("SELECT is_active FROM categories WHERE category_id=%s", (cat_id,))
    row = cur.fetchone()
    if not row:
        cur.close(); conn.close()
        return jsonify({'error': 'Category not found'}), 404

    new_state = 0 if row['is_active'] else 1
    cur.execute("UPDATE categories SET is_active=%s WHERE category_id=%s", (new_state, cat_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True, 'is_active': bool(new_state), 'message': f"Category {'activated' if new_state else 'deactivated'}"})


# ─── 6. DELETE CATEGORY ───────────────────────────────────────────────────────

@categories_bp.route('/api/admin/categories/<int:cat_id>', methods=['DELETE'])
@admin_required
def delete_category(cat_id):
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute("SELECT category_id FROM categories WHERE category_id=%s", (cat_id,))
    if not cur.fetchone():
        cur.close(); conn.close()
        return jsonify({'error': 'Category not found'}), 404

    # Nullify category_id on posts before deletion (FK allows NULL)
    try:
        cur.execute("UPDATE posts SET category_id=NULL, subcategory_id=NULL WHERE category_id=%s", (cat_id,))
    except Exception:
        pass  # If column not nullable, skip gracefully

    cur.execute("DELETE FROM categories WHERE category_id=%s", (cat_id,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True, 'message': 'Category deleted'})


# ─── 7. STATS ─────────────────────────────────────────────────────────────────

@categories_bp.route('/api/admin/categories/stats', methods=['GET'])
@admin_required
def category_stats():
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    cur.execute("SELECT COUNT(*) AS cnt FROM categories")
    total = cur.fetchone()['cnt']
    cur.execute("SELECT COUNT(*) AS cnt FROM categories WHERE post_type='showcase'")
    showcase = cur.fetchone()['cnt']
    cur.execute("SELECT COUNT(*) AS cnt FROM categories WHERE post_type='service'")
    service = cur.fetchone()['cnt']
    cur.execute("SELECT COUNT(*) AS cnt FROM categories WHERE post_type='product'")
    product = cur.fetchone()['cnt']
    cur.execute("SELECT COUNT(*) AS cnt FROM subcategories")
    subcategories = cur.fetchone()['cnt']

    cur.close()
    conn.close()
    return jsonify({
        'total':         total,
        'showcase':      showcase,
        'service':       service,
        'product':       product,
        'subcategories': subcategories,
    })


# ══════════════════════════════════════════════════════════════════════════════
#  SUBCATEGORIES
# ══════════════════════════════════════════════════════════════════════════════

# ─── 8. GET ALL SUBCATEGORIES ─────────────────────────────────────────────────

@categories_bp.route('/api/admin/subcategories', methods=['GET'])
@admin_required
def get_subcategories():
    search      = request.args.get('search', '').strip()
    category_id = request.args.get('category_id', '')
    post_type   = request.args.get('post_type', '')
    status      = request.args.get('status', '')
    page        = max(int(request.args.get('page',  1)), 1)
    limit       = min(int(request.args.get('limit', 20)), 100)
    offset      = (page - 1) * limit

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    conditions, params = [], []

    if search:
        conditions.append("(sc.subcategory_name LIKE %s OR sc.subcategory_slug LIKE %s)")
        like = f'%{search}%'
        params += [like, like]

    if category_id:
        conditions.append("sc.category_id = %s")
        params.append(int(category_id))

    if post_type in ('showcase', 'service', 'product'):
        conditions.append("c.post_type = %s")
        params.append(post_type)

    if status == 'active':
        conditions.append("sc.is_active = 1")
    elif status == 'inactive':
        conditions.append("sc.is_active = 0")

    where = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''

    cur.execute(f"""
        SELECT COUNT(*) AS cnt
        FROM subcategories sc
        JOIN categories c ON c.category_id = sc.category_id
        {where}
    """, params)
    total = cur.fetchone()['cnt']

    cur.execute(f"""
        SELECT
            sc.subcategory_id,
            sc.category_id,
            sc.subcategory_name,
            sc.subcategory_slug,
            sc.description,
            sc.is_active,
            sc.display_order,
            sc.created_at,
            c.category_name  AS parent_name,
            c.icon           AS parent_icon,
            c.post_type
        FROM subcategories sc
        JOIN categories c ON c.category_id = sc.category_id
        {where}
        ORDER BY c.post_type, sc.category_id, sc.display_order ASC
        LIMIT %s OFFSET %s
    """, params + [limit, offset])

    rows = cur.fetchall()
    cur.close()
    conn.close()

    def serialize_sub(s):
        return {
            'subcategory_id':   s['subcategory_id'],
            'category_id':      s['category_id'],
            'subcategory_name': s['subcategory_name'],
            'subcategory_slug': s['subcategory_slug'],
            'description':      s['description'],
            'is_active':        bool(s['is_active']),
            'display_order':    s['display_order'],
            'created_at':       s['created_at'].isoformat() if s['created_at'] else None,
            'parent_name':      s['parent_name'],
            'parent_icon':      s['parent_icon'],
            'post_type':        s['post_type'],
        }

    return jsonify({
        'subcategories': [serialize_sub(s) for s in rows],
        'total': total,
        'page':  page,
        'limit': limit,
        'pages': (total + limit - 1) // limit,
    })


# ─── 9. GET SINGLE SUBCATEGORY ────────────────────────────────────────────────

@categories_bp.route('/api/admin/subcategories/<int:sub_id>', methods=['GET'])
@admin_required
def get_subcategory(sub_id):
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT sc.*, c.category_name AS parent_name, c.icon AS parent_icon, c.post_type
        FROM subcategories sc
        JOIN categories c ON c.category_id = sc.category_id
        WHERE sc.subcategory_id = %s
    """, (sub_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return jsonify({'error': 'Subcategory not found'}), 404
    result = {}
    for k, v in row.items():
        if isinstance(v, datetime):
            result[k] = v.isoformat()
        else:
            result[k] = v
    result['is_active'] = bool(result['is_active'])
    return jsonify(result)


# ─── 10. CREATE SUBCATEGORY ───────────────────────────────────────────────────

@categories_bp.route('/api/admin/subcategories', methods=['POST'])
@admin_required
def create_subcategory():
    data = request.get_json() or {}
    category_id      = data.get('category_id')
    subcategory_name = data.get('subcategory_name', '').strip()
    subcategory_slug = data.get('subcategory_slug', '').strip()
    description      = data.get('description', '').strip() or None
    display_order    = int(data.get('display_order', 0))
    is_active        = int(data.get('is_active', 1))

    if not all([category_id, subcategory_name, subcategory_slug]):
        return jsonify({'error': 'category_id, subcategory_name, and subcategory_slug are required'}), 400

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    cur.execute("SELECT category_id FROM categories WHERE category_id=%s", (category_id,))
    if not cur.fetchone():
        cur.close(); conn.close()
        return jsonify({'error': 'Parent category not found'}), 404

    cur.execute("SELECT subcategory_id FROM subcategories WHERE category_id=%s AND subcategory_slug=%s", (category_id, subcategory_slug))
    if cur.fetchone():
        cur.close(); conn.close()
        return jsonify({'error': 'Slug already exists in this category'}), 409

    cur.execute("""
        INSERT INTO subcategories (category_id, subcategory_name, subcategory_slug, description, is_active, display_order)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (category_id, subcategory_name, subcategory_slug, description, is_active, display_order))
    new_id = cur.lastrowid
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True, 'subcategory_id': new_id, 'message': 'Subcategory created successfully'}), 201


# ─── 11. UPDATE SUBCATEGORY ───────────────────────────────────────────────────

@categories_bp.route('/api/admin/subcategories/<int:sub_id>', methods=['PUT'])
@admin_required
def update_subcategory(sub_id):
    data = request.get_json() or {}
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    cur.execute("SELECT subcategory_id, category_id FROM subcategories WHERE subcategory_id=%s", (sub_id,))
    existing = cur.fetchone()
    if not existing:
        cur.close(); conn.close()
        return jsonify({'error': 'Subcategory not found'}), 404

    fields, params = [], []

    if 'category_id' in data:
        new_cat_id = int(data['category_id'])
        cur.execute("SELECT category_id FROM categories WHERE category_id=%s", (new_cat_id,))
        if not cur.fetchone():
            cur.close(); conn.close()
            return jsonify({'error': 'Parent category not found'}), 404
        fields.append("category_id=%s"); params.append(new_cat_id)

    if 'subcategory_name' in data:
        fields.append("subcategory_name=%s"); params.append(data['subcategory_name'].strip())

    if 'subcategory_slug' in data:
        new_slug   = data['subcategory_slug'].strip()
        cat_id_chk = int(data.get('category_id', existing['category_id']))
        cur.execute("SELECT subcategory_id FROM subcategories WHERE category_id=%s AND subcategory_slug=%s AND subcategory_id!=%s", (cat_id_chk, new_slug, sub_id))
        if cur.fetchone():
            cur.close(); conn.close()
            return jsonify({'error': 'Slug already exists in this category'}), 409
        fields.append("subcategory_slug=%s"); params.append(new_slug)

    if 'description' in data:
        fields.append("description=%s"); params.append(data['description'] or None)
    if 'display_order' in data:
        fields.append("display_order=%s"); params.append(int(data['display_order']))
    if 'is_active' in data:
        fields.append("is_active=%s"); params.append(int(bool(data['is_active'])))

    if not fields:
        cur.close(); conn.close()
        return jsonify({'error': 'No fields to update'}), 400

    cur.execute(f"UPDATE subcategories SET {','.join(fields)} WHERE subcategory_id=%s", params+[sub_id])
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True, 'message': 'Subcategory updated successfully'})


# ─── 12. TOGGLE SUBCATEGORY ACTIVE ───────────────────────────────────────────

@categories_bp.route('/api/admin/subcategories/<int:sub_id>/toggle', methods=['POST'])
@admin_required
def toggle_subcategory(sub_id):
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute("SELECT is_active FROM subcategories WHERE subcategory_id=%s", (sub_id,))
    row = cur.fetchone()
    if not row:
        cur.close(); conn.close()
        return jsonify({'error': 'Subcategory not found'}), 404
    new_state = 0 if row['is_active'] else 1
    cur.execute("UPDATE subcategories SET is_active=%s WHERE subcategory_id=%s", (new_state, sub_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True, 'is_active': bool(new_state), 'message': f"Subcategory {'activated' if new_state else 'deactivated'}"})


# ─── 13. DELETE SUBCATEGORY ───────────────────────────────────────────────────

@categories_bp.route('/api/admin/subcategories/<int:sub_id>', methods=['DELETE'])
@admin_required
def delete_subcategory(sub_id):
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute("SELECT subcategory_id FROM subcategories WHERE subcategory_id=%s", (sub_id,))
    if not cur.fetchone():
        cur.close(); conn.close()
        return jsonify({'error': 'Subcategory not found'}), 404

    # Nullify on posts
    try:
        cur.execute("UPDATE posts SET subcategory_id=NULL WHERE subcategory_id=%s", (sub_id,))
    except Exception:
        pass

    cur.execute("DELETE FROM subcategories WHERE subcategory_id=%s", (sub_id,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True, 'message': 'Subcategory deleted'})