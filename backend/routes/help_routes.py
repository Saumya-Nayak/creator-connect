from flask import Blueprint, request, jsonify
from database.db import get_db_connection
from functools import wraps
import jwt
import os

help_bp = Blueprint('help', __name__)

# Authentication decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'success': False, 'message': 'Token is missing'}), 401
        
        try:
            payload = jwt.decode(token, os.getenv('JWT_SECRET_KEY', 'your-secret-key'), algorithms=['HS256'])
            request.user_id = payload['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401
        
        return f(*args, **kwargs)
    
    return decorated

# ===== GET HELP CATEGORIES =====
@help_bp.route('/help/categories', methods=['GET'])
def get_help_categories():
    """Get all help categories with article counts"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                hc.*,
                COUNT(ha.article_id) as article_count
            FROM help_categories hc
            LEFT JOIN help_articles ha ON hc.category_id = ha.category_id
            GROUP BY hc.category_id
            ORDER BY hc.display_order ASC
        """)
        
        categories = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'categories': categories
        })
        
    except Exception as e:
        print(f"❌ Error fetching categories: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to load categories'
        }), 500

# ===== GET FAQs =====
@help_bp.route('/help/faqs', methods=['GET'])
def get_faqs():
    """Get all FAQs with optional filtering"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Get filter parameter
        filter_type = request.args.get('filter', 'all')
        
        if filter_type == 'popular':
            cursor.execute("""
                SELECT f.*, hc.category_name
                FROM faqs f
                LEFT JOIN help_categories hc ON f.category_id = hc.category_id
                WHERE f.is_popular = TRUE
                ORDER BY f.display_order ASC
            """)
        else:
            cursor.execute("""
                SELECT f.*, hc.category_name
                FROM faqs f
                LEFT JOIN help_categories hc ON f.category_id = hc.category_id
                ORDER BY f.is_popular DESC, f.display_order ASC
            """)
        
        faqs = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'faqs': faqs
        })
        
    except Exception as e:
        print(f"❌ Error fetching FAQs: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to load FAQs'
        }), 500

# ===== GET ARTICLE BY ID =====
@help_bp.route('/help/article/<int:article_id>', methods=['GET'])
def get_article(article_id):
    """Get a specific help article by ID"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Get article
        cursor.execute("""
            SELECT ha.*, hc.category_name
            FROM help_articles ha
            LEFT JOIN help_categories hc ON ha.category_id = hc.category_id
            WHERE ha.article_id = %s
        """, (article_id,))
        
        article = cursor.fetchone()
        
        if not article:
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'Article not found'
            }), 404
        
        # Increment views
        cursor.execute("""
            UPDATE help_articles 
            SET views = views + 1 
            WHERE article_id = %s
        """, (article_id,))
        
        connection.commit()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'article': article
        })
        
    except Exception as e:
        print(f"❌ Error fetching article: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to load article'
        }), 500

# ===== SEARCH HELP CONTENT =====
@help_bp.route('/help/search', methods=['GET'])
def search_help():
    """Search help articles and FAQs"""
    try:
        query = request.args.get('q', '').strip()
        
        if not query or len(query) < 2:
            return jsonify({
                'success': False,
                'message': 'Search query must be at least 2 characters'
            }), 400
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        search_pattern = f"%{query}%"
        
        # Search articles
        cursor.execute("""
            SELECT 
                'article' as type,
                article_id as id,
                title,
                content as excerpt,
                category_id,
                views
            FROM help_articles
            WHERE title LIKE %s OR content LIKE %s
            LIMIT 10
        """, (search_pattern, search_pattern))
        
        articles = cursor.fetchall()
        
        # Search FAQs
        cursor.execute("""
            SELECT 
                'faq' as type,
                faq_id as id,
                question as title,
                answer as excerpt,
                category_id,
                0 as views
            FROM faqs
            WHERE question LIKE %s OR answer LIKE %s
            LIMIT 10
        """, (search_pattern, search_pattern))
        
        faqs = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        # Combine results
        results = articles + faqs
        
        return jsonify({
            'success': True,
            'results': results,
            'count': len(results)
        })
        
    except Exception as e:
        print(f"❌ Error searching help: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Search failed'
        }), 500

# ===== CREATE SUPPORT TICKET =====
@help_bp.route('/support/ticket', methods=['POST'])
@token_required
def create_support_ticket():
    """Create a new support ticket (requires authentication)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['subject', 'message', 'category', 'priority']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Insert ticket
        cursor.execute("""
            INSERT INTO support_tickets 
            (user_id, subject, message, priority, status, category)
            VALUES (%s, %s, %s, %s, 'open', %s)
        """, (
            request.user_id,
            data['subject'],
            data['message'],
            data['priority'],
            data['category']
        ))
        
        ticket_id = cursor.lastrowid
        
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'message': 'Support ticket created successfully',
            'ticket_id': ticket_id
        })
        
    except Exception as e:
        print(f"❌ Error creating ticket: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to create support ticket'
        }), 500

# ===== GET USER'S SUPPORT TICKETS =====
@help_bp.route('/support/tickets', methods=['GET'])
@token_required
def get_user_tickets():
    """Get all support tickets for the current user"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                ticket_id,
                subject,
                message,
                status,
                priority,
                category,
                created_at,
                updated_at
            FROM support_tickets
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (request.user_id,))
        
        tickets = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'tickets': tickets
        })
        
    except Exception as e:
        print(f"❌ Error fetching tickets: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to load tickets'
        }), 500

# ===== GET ARTICLES BY CATEGORY =====
@help_bp.route('/help/category/<int:category_id>/articles', methods=['GET'])
def get_category_articles(category_id):
    """Get all articles in a specific category"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                article_id,
                title,
                content,
                slug,
                views,
                is_featured,
                created_at,
                updated_at
            FROM help_articles
            WHERE category_id = %s
            ORDER BY is_featured DESC, created_at DESC
        """, (category_id,))
        
        articles = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'articles': articles
        })
        
    except Exception as e:
        print(f"❌ Error fetching category articles: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to load articles'
        }), 500

# ===== SUBMIT ARTICLE FEEDBACK =====
@help_bp.route('/help/article/<int:article_id>/feedback', methods=['POST'])
def submit_article_feedback(article_id):
    """Submit feedback for a help article (helpful/not helpful)"""
    try:
        data = request.get_json()
        is_helpful = data.get('is_helpful', False)
        
        # You can store this feedback in a separate table if needed
        # For now, just return success
        
        return jsonify({
            'success': True,
            'message': 'Thank you for your feedback!'
        })
        
    except Exception as e:
        print(f"❌ Error submitting feedback: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to submit feedback'
        }), 500