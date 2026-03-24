"""
routes/admin/knowledge_routes.py
────────────────────────────────────────────────────────────────────────────
Admin Knowledge Base Routes — CreatorConnect
Register in app.py:
    from routes.admin.knowledge_routes import knowledge_bp
    app.register_blueprint(knowledge_bp)
"""

from flask import Blueprint, jsonify, request
from database.db import get_db_connection
from routes.admin.admin_auth import admin_required
from datetime import datetime
import re

knowledge_bp = Blueprint('admin_knowledge', __name__)


def _iso(v):
    if v is None: return None
    if isinstance(v, datetime): return v.isoformat()
    if hasattr(v, 'isoformat'): return v.isoformat()
    return v

def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text


# ═══════════════════════════════════════════════════════════════════════════════
#  STATS
# ═══════════════════════════════════════════════════════════════════════════════

@knowledge_bp.route('/api/admin/knowledge/stats', methods=['GET'])
@admin_required
def knowledge_stats():
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    cur.execute("SELECT COUNT(*) AS cnt FROM help_articles")
    total_articles = int(cur.fetchone()['cnt'])

    cur.execute("SELECT COUNT(*) AS cnt FROM help_articles WHERE is_featured = 1")
    featured_count = int(cur.fetchone()['cnt'])

    cur.execute("SELECT COUNT(*) AS cnt FROM faqs")
    total_faqs = int(cur.fetchone()['cnt'])

    cur.execute("SELECT COUNT(*) AS cnt FROM faqs WHERE is_popular = 1")
    popular_count = int(cur.fetchone()['cnt'])

    cur.execute("SELECT COUNT(*) AS cnt FROM help_categories")
    total_categories = int(cur.fetchone()['cnt'])

    cur.execute("SELECT title, views FROM help_articles ORDER BY views DESC LIMIT 1")
    top = cur.fetchone()
    most_viewed_title = top['title'] if top else None
    most_viewed_views = int(top['views']) if top else 0

    cur.close()
    conn.close()

    return jsonify({
        'total_articles':    total_articles,
        'featured_count':    featured_count,
        'total_faqs':        total_faqs,
        'popular_count':     popular_count,
        'total_categories':  total_categories,
        'most_viewed_title': most_viewed_title,
        'most_viewed_views': most_viewed_views,
    })


# ═══════════════════════════════════════════════════════════════════════════════
#  ARTICLES
# ═══════════════════════════════════════════════════════════════════════════════

@knowledge_bp.route('/api/admin/knowledge/articles', methods=['GET'])
@admin_required
def list_articles():
    search   = request.args.get('search',   '').strip()
    category = request.args.get('category', '').strip()
    featured = request.args.get('featured', '').strip()
    page     = max(int(request.args.get('page',  1)), 1)
    limit    = min(int(request.args.get('limit', 12)), 100)
    offset   = (page - 1) * limit

    conditions, params = [], []

    if category:
        conditions.append("a.category_id = %s")
        params.append(int(category))

    if featured != '':
        conditions.append("a.is_featured = %s")
        params.append(int(featured))

    if search:
        conditions.append("(a.title LIKE %s OR a.content LIKE %s)")
        like = f'%{search}%'
        params += [like, like]

    where = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    cur.execute(f"SELECT COUNT(*) AS cnt FROM help_articles a {where}", params)
    total = int(cur.fetchone()['cnt'])

    cur.execute(f"""
        SELECT a.article_id, a.category_id, a.title, a.content, a.slug,
               a.views, a.is_featured, a.created_at, a.updated_at,
               c.category_name
        FROM help_articles a
        LEFT JOIN help_categories c ON a.category_id = c.category_id
        {where}
        ORDER BY a.is_featured DESC, a.views DESC, a.created_at DESC
        LIMIT %s OFFSET %s
    """, params + [limit, offset])

    rows = cur.fetchall()
    cur.close()
    conn.close()

    return jsonify({
        'articles': [_ser_article(r) for r in rows],
        'total':    total,
        'page':     page,
        'limit':    limit,
        'pages':    max((total + limit - 1) // limit, 1),
    })


@knowledge_bp.route('/api/admin/knowledge/articles/<int:article_id>', methods=['GET'])
@admin_required
def get_article(article_id):
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT a.*, c.category_name
        FROM help_articles a
        LEFT JOIN help_categories c ON a.category_id = c.category_id
        WHERE a.article_id = %s
    """, (article_id,))
    row = cur.fetchone()
    cur.close(); conn.close()
    if not row:
        return jsonify({'error': 'Article not found'}), 404
    return jsonify(_ser_article(row))


@knowledge_bp.route('/api/admin/knowledge/articles', methods=['POST'])
@admin_required
def create_article():
    data    = request.get_json() or {}
    title   = (data.get('title') or '').strip()
    content = (data.get('content') or '').strip()
    if not title or not content:
        return jsonify({'error': 'Title and content are required'}), 400

    slug       = (data.get('slug') or _slugify(title)).strip()
    category_id = data.get('category_id') or None
    is_featured = int(data.get('is_featured', 0))

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    # Ensure unique slug
    base_slug, counter = slug, 1
    while True:
        cur.execute("SELECT article_id FROM help_articles WHERE slug = %s", (slug,))
        if not cur.fetchone(): break
        slug = f'{base_slug}-{counter}'; counter += 1

    cur.execute("""
        INSERT INTO help_articles (category_id, title, content, slug, is_featured)
        VALUES (%s, %s, %s, %s, %s)
    """, (category_id, title, content, slug, is_featured))
    new_id = cur.lastrowid
    conn.commit()
    cur.close(); conn.close()

    return jsonify({'success': True, 'article_id': new_id, 'message': 'Article created'}), 201


@knowledge_bp.route('/api/admin/knowledge/articles/<int:article_id>', methods=['PUT'])
@admin_required
def update_article(article_id):
    data    = request.get_json() or {}
    title   = (data.get('title') or '').strip()
    content = (data.get('content') or '').strip()
    if not title or not content:
        return jsonify({'error': 'Title and content are required'}), 400

    slug        = (data.get('slug') or _slugify(title)).strip()
    category_id = data.get('category_id') or None
    is_featured = int(data.get('is_featured', 0))

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    # Ensure unique slug (excluding self)
    base_slug, counter = slug, 1
    while True:
        cur.execute("SELECT article_id FROM help_articles WHERE slug = %s AND article_id != %s", (slug, article_id))
        if not cur.fetchone(): break
        slug = f'{base_slug}-{counter}'; counter += 1

    cur.execute("""
        UPDATE help_articles
        SET category_id=%s, title=%s, content=%s, slug=%s, is_featured=%s, updated_at=NOW()
        WHERE article_id=%s
    """, (category_id, title, content, slug, is_featured, article_id))
    affected = cur.rowcount
    conn.commit(); cur.close(); conn.close()

    if not affected:
        return jsonify({'error': 'Article not found'}), 404
    return jsonify({'success': True, 'message': 'Article updated'})


@knowledge_bp.route('/api/admin/knowledge/articles/<int:article_id>', methods=['DELETE'])
@admin_required
def delete_article(article_id):
    conn = get_db_connection()
    cur  = conn.cursor()
    cur.execute("DELETE FROM help_articles WHERE article_id = %s", (article_id,))
    affected = cur.rowcount
    conn.commit(); cur.close(); conn.close()
    if not affected:
        return jsonify({'error': 'Article not found'}), 404
    return jsonify({'success': True, 'message': 'Article deleted'})


@knowledge_bp.route('/api/admin/knowledge/articles/<int:article_id>/featured', methods=['PUT'])
@admin_required
def toggle_article_featured(article_id):
    data        = request.get_json() or {}
    is_featured = int(data.get('is_featured', 0))
    conn = get_db_connection()
    cur  = conn.cursor()
    cur.execute("UPDATE help_articles SET is_featured=%s, updated_at=NOW() WHERE article_id=%s", (is_featured, article_id))
    conn.commit(); cur.close(); conn.close()
    return jsonify({'success': True})


# ═══════════════════════════════════════════════════════════════════════════════
#  FAQs
# ═══════════════════════════════════════════════════════════════════════════════

@knowledge_bp.route('/api/admin/knowledge/faqs', methods=['GET'])
@admin_required
def list_faqs():
    search   = request.args.get('search',   '').strip()
    category = request.args.get('category', '').strip()
    popular  = request.args.get('popular',  '').strip()
    page     = max(int(request.args.get('page',  1)), 1)
    limit    = min(int(request.args.get('limit', 20)), 100)
    offset   = (page - 1) * limit

    conditions, params = [], []

    if category:
        conditions.append("f.category_id = %s")
        params.append(int(category))

    if popular != '':
        conditions.append("f.is_popular = %s")
        params.append(int(popular))

    if search:
        conditions.append("(f.question LIKE %s OR f.answer LIKE %s)")
        like = f'%{search}%'
        params += [like, like]

    where = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    cur.execute(f"SELECT COUNT(*) AS cnt FROM faqs f {where}", params)
    total = int(cur.fetchone()['cnt'])

    cur.execute(f"""
        SELECT f.faq_id, f.question, f.answer, f.category_id,
               f.display_order, f.is_popular, f.created_at,
               c.category_name
        FROM faqs f
        LEFT JOIN help_categories c ON f.category_id = c.category_id
        {where}
        ORDER BY f.display_order ASC, f.faq_id ASC
        LIMIT %s OFFSET %s
    """, params + [limit, offset])

    rows = cur.fetchall()
    cur.close(); conn.close()

    return jsonify({
        'faqs':  [_ser_faq(r) for r in rows],
        'total': total,
        'page':  page,
        'limit': limit,
        'pages': max((total + limit - 1) // limit, 1),
    })


@knowledge_bp.route('/api/admin/knowledge/faqs/<int:faq_id>', methods=['GET'])
@admin_required
def get_faq(faq_id):
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM faqs WHERE faq_id = %s", (faq_id,))
    row = cur.fetchone()
    cur.close(); conn.close()
    if not row:
        return jsonify({'error': 'FAQ not found'}), 404
    return jsonify(_ser_faq(row))


@knowledge_bp.route('/api/admin/knowledge/faqs', methods=['POST'])
@admin_required
def create_faq():
    data     = request.get_json() or {}
    question = (data.get('question') or '').strip()
    answer   = (data.get('answer')   or '').strip()
    if not question or not answer:
        return jsonify({'error': 'Question and answer are required'}), 400

    category_id   = data.get('category_id') or None
    display_order = int(data.get('display_order', 0))
    is_popular    = int(data.get('is_popular', 0))

    conn = get_db_connection()
    cur  = conn.cursor()
    cur.execute("""
        INSERT INTO faqs (question, answer, category_id, display_order, is_popular)
        VALUES (%s, %s, %s, %s, %s)
    """, (question, answer, category_id, display_order, is_popular))
    new_id = cur.lastrowid
    conn.commit(); cur.close(); conn.close()
    return jsonify({'success': True, 'faq_id': new_id, 'message': 'FAQ created'}), 201


@knowledge_bp.route('/api/admin/knowledge/faqs/<int:faq_id>', methods=['PUT'])
@admin_required
def update_faq(faq_id):
    data     = request.get_json() or {}
    question = (data.get('question') or '').strip()
    answer   = (data.get('answer')   or '').strip()
    if not question or not answer:
        return jsonify({'error': 'Question and answer are required'}), 400

    category_id   = data.get('category_id') or None
    display_order = int(data.get('display_order', 0))
    is_popular    = int(data.get('is_popular', 0))

    conn = get_db_connection()
    cur  = conn.cursor()
    cur.execute("""
        UPDATE faqs SET question=%s, answer=%s, category_id=%s,
               display_order=%s, is_popular=%s
        WHERE faq_id=%s
    """, (question, answer, category_id, display_order, is_popular, faq_id))
    affected = cur.rowcount
    conn.commit(); cur.close(); conn.close()
    if not affected:
        return jsonify({'error': 'FAQ not found'}), 404
    return jsonify({'success': True, 'message': 'FAQ updated'})


@knowledge_bp.route('/api/admin/knowledge/faqs/<int:faq_id>', methods=['DELETE'])
@admin_required
def delete_faq(faq_id):
    conn = get_db_connection()
    cur  = conn.cursor()
    cur.execute("DELETE FROM faqs WHERE faq_id = %s", (faq_id,))
    affected = cur.rowcount
    conn.commit(); cur.close(); conn.close()
    if not affected:
        return jsonify({'error': 'FAQ not found'}), 404
    return jsonify({'success': True, 'message': 'FAQ deleted'})


@knowledge_bp.route('/api/admin/knowledge/faqs/<int:faq_id>/popular', methods=['PUT'])
@admin_required
def toggle_faq_popular(faq_id):
    data       = request.get_json() or {}
    is_popular = int(data.get('is_popular', 0))
    conn = get_db_connection()
    cur  = conn.cursor()
    cur.execute("UPDATE faqs SET is_popular=%s WHERE faq_id=%s", (is_popular, faq_id))
    conn.commit(); cur.close(); conn.close()
    return jsonify({'success': True})


# ═══════════════════════════════════════════════════════════════════════════════
#  HELP CATEGORIES
# ═══════════════════════════════════════════════════════════════════════════════

@knowledge_bp.route('/api/admin/knowledge/categories', methods=['GET'])
@admin_required
def list_categories():
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT c.*,
               COUNT(a.article_id) AS article_count,
               COUNT(f.faq_id)     AS faq_count
        FROM help_categories c
        LEFT JOIN help_articles a ON a.category_id = c.category_id
        LEFT JOIN faqs f          ON f.category_id = c.category_id
        GROUP BY c.category_id
        ORDER BY c.display_order ASC, c.category_id ASC
    """)
    rows = cur.fetchall()
    cur.close(); conn.close()
    return jsonify({'categories': [_ser_category(r) for r in rows]})


@knowledge_bp.route('/api/admin/knowledge/categories/<int:category_id>', methods=['GET'])
@admin_required
def get_category(category_id):
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM help_categories WHERE category_id = %s", (category_id,))
    row = cur.fetchone()
    cur.close(); conn.close()
    if not row:
        return jsonify({'error': 'Category not found'}), 404
    return jsonify(_ser_category(row))


@knowledge_bp.route('/api/admin/knowledge/categories', methods=['POST'])
@admin_required
def create_category():
    data = request.get_json() or {}
    name = (data.get('category_name') or '').strip()
    if not name:
        return jsonify({'error': 'Category name is required'}), 400

    icon        = (data.get('category_icon') or 'fas fa-folder').strip()
    description = (data.get('category_description') or '').strip() or None
    order       = int(data.get('display_order', 0))

    conn = get_db_connection()
    cur  = conn.cursor()
    cur.execute("""
        INSERT INTO help_categories (category_name, category_icon, category_description, display_order)
        VALUES (%s, %s, %s, %s)
    """, (name, icon, description, order))
    new_id = cur.lastrowid
    conn.commit(); cur.close(); conn.close()
    return jsonify({'success': True, 'category_id': new_id, 'message': 'Category created'}), 201


@knowledge_bp.route('/api/admin/knowledge/categories/<int:category_id>', methods=['PUT'])
@admin_required
def update_category(category_id):
    data = request.get_json() or {}
    name = (data.get('category_name') or '').strip()
    if not name:
        return jsonify({'error': 'Category name is required'}), 400

    icon        = (data.get('category_icon') or 'fas fa-folder').strip()
    description = (data.get('category_description') or '').strip() or None
    order       = int(data.get('display_order', 0))

    conn = get_db_connection()
    cur  = conn.cursor()
    cur.execute("""
        UPDATE help_categories
        SET category_name=%s, category_icon=%s, category_description=%s, display_order=%s
        WHERE category_id=%s
    """, (name, icon, description, order, category_id))
    affected = cur.rowcount
    conn.commit(); cur.close(); conn.close()
    if not affected:
        return jsonify({'error': 'Category not found'}), 404
    return jsonify({'success': True, 'message': 'Category updated'})


@knowledge_bp.route('/api/admin/knowledge/categories/<int:category_id>', methods=['DELETE'])
@admin_required
def delete_category(category_id):
    conn = get_db_connection()
    cur  = conn.cursor()
    # Nullify articles using this category
    cur.execute("UPDATE help_articles SET category_id=NULL WHERE category_id=%s", (category_id,))
    cur.execute("UPDATE faqs SET category_id=NULL WHERE category_id=%s", (category_id,))
    cur.execute("DELETE FROM help_categories WHERE category_id=%s", (category_id,))
    affected = cur.rowcount
    conn.commit(); cur.close(); conn.close()
    if not affected:
        return jsonify({'error': 'Category not found'}), 404
    return jsonify({'success': True, 'message': 'Category deleted'})


# ═══════════════════════════════════════════════════════════════════════════════
#  SERIALIZERS
# ═══════════════════════════════════════════════════════════════════════════════

def _ser_article(r):
    return {
        'article_id':    r['article_id'],
        'category_id':   r.get('category_id'),
        'category_name': r.get('category_name'),
        'title':         r['title'],
        'content':       r['content'],
        'slug':          r.get('slug'),
        'views':         int(r.get('views') or 0),
        'is_featured':   bool(r.get('is_featured')),
        'created_at':    _iso(r.get('created_at')),
        'updated_at':    _iso(r.get('updated_at')),
    }

def _ser_faq(r):
    return {
        'faq_id':        r['faq_id'],
        'question':      r['question'],
        'answer':        r['answer'],
        'category_id':   r.get('category_id'),
        'category_name': r.get('category_name'),
        'display_order': int(r.get('display_order') or 0),
        'is_popular':    bool(r.get('is_popular')),
        'created_at':    _iso(r.get('created_at')),
    }

def _ser_category(r):
    return {
        'category_id':          r['category_id'],
        'category_name':        r['category_name'],
        'category_icon':        r.get('category_icon') or 'fas fa-folder',
        'category_description': r.get('category_description'),
        'display_order':        int(r.get('display_order') or 0),
        'article_count':        int(r.get('article_count') or 0),
        'faq_count':            int(r.get('faq_count') or 0),
        'created_at':           _iso(r.get('created_at')),
    }