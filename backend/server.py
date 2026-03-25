# ✅ FIX: eventlet monkey_patch MUST be the very first lines before ANY other import
import eventlet
eventlet.monkey_patch()

from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
from flask_mail import Mail
import os
from dotenv import load_dotenv
from config.app_config import configure_app, mail
from utils.network_utils import get_local_ip
from database.db import initialize_database, get_db_connection
# Import routes
from routes.auth_routes import auth_bp
from routes.utility_routes import utility_bp
from routes.upload_routes import upload_bp
from routes.profile_routes import profile_bp
from routes.post_routes import post_bp
from routes.additional_routes import additional_bp
from routes.category_routes import category_bp
from routes.comment_routes import comment_bp
from routes.notification_routes import notification_routes
from routes.message_routes import message_routes
from routes.explore_routes import explore_bp
from routes.saved_routes import saved_bp
from routes.help_routes import help_bp
from websocket_server import socketio
from routes.share_routes import share_bp
from routes.admin.admin_auth import admin_auth_bp
from routes.booking_routes import booking_routes
from routes.deals_routes import deals_bp
from routes.settings_routes import settings_bp
from routes.payment_routes import payment_bp
from routes.admin.dashboard_routes import dashboard_bp
from routes.admin.user_routes import user_mgmt_bp
from routes.admin.post_moderation_routes import post_mod_bp
from routes.admin.categories_routes import categories_bp
from routes.admin.orders_routes import orders_bp
from routes.admin.bookings_routes import bookings_bp
from routes.admin.payouts_routes import payouts_bp
from routes.admin.support_routes import support_bp
from routes.admin.knowledge_routes import knowledge_bp
from routes.admin.analytics_routes import analytics_bp
from routes.admin.settings_routes import admin_settings_bp
from routes.delivery_routes import delivery_bp
from routes.slot_routes import slot_bp
from routes.edit_post_routes import edit_post_bp
from routes.group_routes import group_routes

# ─────────────────────────────────────────────────────────────
# Suppress Windows WinError 10053 / 10054 log noise
# (browser closes media connections mid-stream — not real errors)
# ─────────────────────────────────────────────────────────────
import logging
import errno

class _SuppressWinStreamErrors(logging.Filter):
    """Silence ConnectionAbortedError / ConnectionResetError on Windows."""
    _SUPPRESS = {
        "ConnectionAbortedError",
        "ConnectionResetError",
        "WinError 10053",
        "WinError 10054",
        "An established connection was aborted",
        "An existing connection was forcibly closed",
    }

    def filter(self, record):
        msg = record.getMessage()
        return not any(s in msg for s in self._SUPPRESS)

for _logger_name in ("eventlet.wsgi", "eventlet.wsgi.server", "werkzeug"):
    _log = logging.getLogger(_logger_name)
    _log.addFilter(_SuppressWinStreamErrors())

import sys
_original_excepthook = sys.excepthook

def _quiet_excepthook(exc_type, exc_value, exc_tb):
    if exc_type in (ConnectionAbortedError, ConnectionResetError):
        return
    _original_excepthook(exc_type, exc_value, exc_tb)

sys.excepthook = _quiet_excepthook

# ─────────────────────────────────────────────────────────────
# Load environment variables
# ─────────────────────────────────────────────────────────────
load_dotenv()

# ─────────────────────────────────────────────────────────────
# Detect environment (Railway sets RAILWAY_ENVIRONMENT automatically)
# ─────────────────────────────────────────────────────────────
IS_PRODUCTION = os.getenv('RAILWAY_ENVIRONMENT') is not None

# ─────────────────────────────────────────────────────────────
# Paths — works on both localhost (Windows/Linux) and Railway
# ─────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Frontend folder: on Railway frontend is served from same repo
FRONTEND_DIR = os.path.join(BASE_DIR, '..', 'frontend')

# Uploads folder: Railway uses /app/uploads via Volume, localhost uses backend/uploads
UPLOAD_DIR = os.environ.get('UPLOAD_DIR', os.path.join(BASE_DIR, 'uploads'))

# ─────────────────────────────────────────────────────────────
# Initialize Flask app — serves frontend static files too
# ─────────────────────────────────────────────────────────────
app = Flask(
    __name__,
    static_folder=FRONTEND_DIR,   # serve your HTML/CSS/JS from here
    static_url_path=''
)

# ─────────────────────────────────────────────────────────────
# CORS — open in production (same domain), restricted on localhost
# ─────────────────────────────────────────────────────────────
CORS(app,
     resources={
         r"/api/*": {
             "origins": "*" if IS_PRODUCTION else [
                 "http://localhost:5500",
                 "http://127.0.0.1:5500",
                 "http://localhost:3000",
                 "http://127.0.0.1:3000"
             ],
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization"],
             "supports_credentials": True,
             "expose_headers": ["Content-Type"]
         }
     })

app.config['JSON_AS_ASCII'] = False
app.config['JSON_SORT_KEYS'] = False
app.json.ensure_ascii = False

# Configure app
configure_app(app)

# Initialize mail
mail.init_app(app)

# ✅ FIX: async_mode = 'eventlet'
socketio.init_app(app,
    cors_allowed_origins="*",
    async_mode='eventlet',
    logger=True,
    engineio_logger=True
)

# ─────────────────────────────────────────────────────────────
# Before/After request handlers
# ─────────────────────────────────────────────────────────────
@app.before_request
def handle_preflight_and_admin():
    """Handle CORS preflight OPTIONS requests AND admin route protection"""

    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        origin = request.headers.get("Origin")

        allowed_origins = [
            "http://localhost:5500",
            "http://127.0.0.1:5500",
            "http://localhost:3000",
            "http://127.0.0.1:3000"
        ]

        if IS_PRODUCTION or origin in allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin or "*"
        else:
            response.headers["Access-Control-Allow-Origin"] = "*"

        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Max-Age"] = "3600"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response, 200

    if request.path.startswith('/api/admin/'):
        if request.path in ['/api/admin/login', '/api/admin/verify']:
            return None
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({
                'success': False,
                'message': 'Authentication required for admin routes'
            }), 401

    return None


@app.after_request
def after_request(response):
    if response.content_type and 'application/json' in response.content_type:
        response.headers['Content-Type'] = 'application/json; charset=utf-8'

    origin = request.headers.get("Origin")
    allowed_origins = [
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

    if IS_PRODUCTION:
        response.headers['Access-Control-Allow-Origin'] = origin or "*"
        response.headers['Access-Control-Allow-Credentials'] = 'true'
    elif origin in allowed_origins:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
    else:
        response.headers['Access-Control-Allow-Origin'] = '*'

    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Expose-Headers'] = 'Content-Type'

    return response

# ─────────────────────────────────────────────────────────────
# Ensure upload directories exist (works on localhost + Railway volume)
# ─────────────────────────────────────────────────────────────


# ─────────────────────────────────────────────────────────────
# Register blueprints
# ─────────────────────────────────────────────────────────────
app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(utility_bp, url_prefix='/api')
app.register_blueprint(upload_bp, url_prefix='/api')
app.register_blueprint(profile_bp, url_prefix='/api')
app.register_blueprint(post_bp, url_prefix='/api')
app.register_blueprint(additional_bp, url_prefix='/api')
app.register_blueprint(category_bp, url_prefix='/api')
app.register_blueprint(comment_bp, url_prefix='/api')
app.register_blueprint(notification_routes, url_prefix='/api')
app.register_blueprint(message_routes, url_prefix='/api/messages')
app.register_blueprint(explore_bp, url_prefix='/api')
app.register_blueprint(saved_bp, url_prefix='/api')
app.register_blueprint(help_bp, url_prefix='/api')
app.register_blueprint(share_bp, url_prefix='/api')
app.register_blueprint(admin_auth_bp)
app.register_blueprint(booking_routes, url_prefix='/api')
app.register_blueprint(deals_bp, url_prefix='/api')
app.register_blueprint(settings_bp, url_prefix='/api')
app.register_blueprint(payment_bp, url_prefix='/api')
app.register_blueprint(dashboard_bp)
app.register_blueprint(user_mgmt_bp)
app.register_blueprint(post_mod_bp)
app.register_blueprint(categories_bp)
app.register_blueprint(orders_bp)
app.register_blueprint(bookings_bp)
app.register_blueprint(payouts_bp)
app.register_blueprint(support_bp)
app.register_blueprint(knowledge_bp)
app.register_blueprint(analytics_bp)
app.register_blueprint(admin_settings_bp)
app.register_blueprint(delivery_bp, url_prefix='/api')
app.register_blueprint(slot_bp, url_prefix='/api')
app.register_blueprint(edit_post_bp, url_prefix='/api')
app.register_blueprint(group_routes, url_prefix='/api/groups')

# ─────────────────────────────────────────────────────────────
# Static file routes for uploads





# ─────────────────────────────────────────────────────────────
# API routes defined directly in server.py
# ─────────────────────────────────────────────────────────────
@app.route('/api/stats/trending-categories', methods=['GET'])
def get_trending_categories():
    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT
                c.category_id,
                c.category_name,
                c.category_slug,
                c.icon,
                c.post_type,
                COUNT(p.post_id)                                        AS total_posts,
                SUM(CASE
                      WHEN p.created_at >= NOW() - INTERVAL 30 DAY THEN 2
                      ELSE 1
                    END)                                                 AS trend_score
            FROM categories c
            JOIN posts p
              ON p.category_id = c.category_id
             AND p.is_deleted  = FALSE
             AND p.privacy     = 'public'
            WHERE c.is_active = 1
            GROUP BY c.category_id, c.category_name, c.category_slug,
                     c.icon, c.post_type
            ORDER BY trend_score DESC, total_posts DESC
            LIMIT 8
        """)
        rows = cur.fetchall()
        return jsonify({'success': True, 'trending': rows})
    except Exception as e:
        print(f'❌ trending-categories: {e}')
        return jsonify({'success': False, 'trending': []}), 500
    finally:
        cur.close(); conn.close()


@app.route('/api/users/suggested', methods=['GET'])
def get_suggested_users():
    limit = int(request.args.get('limit', 5))
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("""
        SELECT id as user_id, username, full_name, profile_pic,
               (SELECT COUNT(*) FROM followers WHERE following_id = users.id) as followers_count
        FROM users
        ORDER BY RAND()
        LIMIT %s
    """, (limit,))
    users = cursor.fetchall()
    cursor.close()
    connection.close()
    return jsonify({"success": True, "users": users})


@app.route('/api/users/search', methods=['GET'])
def search_users():
    """Search users you follow"""
    import jwt
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"success": False, "message": "Unauthorized"}), 401
        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, os.getenv('JWT_SECRET_KEY', 'your-secret-key'), algorithms=['HS256'])
            current_user_id = payload['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({"success": False, "message": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"success": False, "message": "Invalid token"}), 401

        query = request.args.get('query', '').strip()
        if not query:
            return jsonify({"success": False, "message": "Query parameter required"}), 400

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        search_pattern = f"%{query}%"

        cursor.execute("""
            SELECT DISTINCT
                u.id,
                u.username,
                u.full_name,
                u.profile_pic,
                u.is_private,
                (SELECT COUNT(*) FROM followers WHERE following_id = u.id) as followers_count
            FROM users u
            WHERE u.id != %s
            AND (u.username LIKE %s OR u.full_name LIKE %s)
            ORDER BY 
                CASE 
                    WHEN u.username LIKE %s THEN 1
                    WHEN u.full_name LIKE %s THEN 2
                    ELSE 3
                END,
                u.full_name
            LIMIT 20
        """, (current_user_id, search_pattern, search_pattern,
              f"{query}%", f"{query}%"))

        users = cursor.fetchall()
        cursor.close()
        connection.close()
        return jsonify({"success": True, "users": users, "count": len(users)})

    except Exception as e:
        print(f"❌ Error searching users: {e}")
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "message": "Error searching users"}), 500


@app.route('/api/users/search-all', methods=['GET'])
def search_all_users():
    """Search for users by name or username - works for both logged-in and guest users"""
    try:
        query = request.args.get('query', '').strip()
        if not query:
            return jsonify({"success": False, "message": "Query parameter required"}), 400

        current_user_id = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                import jwt
                payload = jwt.decode(token, os.getenv('JWT_SECRET_KEY', 'your-secret-key'), algorithms=['HS256'])
                current_user_id = payload['user_id']
            except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
                pass

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        search_pattern = f"%{query}%"

        if current_user_id:
            cursor.execute("""
                SELECT u.id, u.username, u.full_name, u.profile_pic, u.is_private,
                       (SELECT COUNT(*) FROM followers WHERE following_id = u.id) as followers_count
                FROM users u
                WHERE u.id != %s AND (u.username LIKE %s OR u.full_name LIKE %s)
                ORDER BY CASE WHEN u.username LIKE %s THEN 1 WHEN u.full_name LIKE %s THEN 2 ELSE 3 END, u.full_name
                LIMIT 20
            """, (current_user_id, search_pattern, search_pattern, f"{query}%", f"{query}%"))
        else:
            cursor.execute("""
                SELECT u.id, u.username, u.full_name, u.profile_pic, u.is_private,
                       (SELECT COUNT(*) FROM followers WHERE following_id = u.id) as followers_count
                FROM users u
                WHERE (u.username LIKE %s OR u.full_name LIKE %s)
                ORDER BY CASE WHEN u.username LIKE %s THEN 1 WHEN u.full_name LIKE %s THEN 2 ELSE 3 END, u.full_name
                LIMIT 20
            """, (search_pattern, search_pattern, f"{query}%", f"{query}%"))

        users = cursor.fetchall()
        cursor.close()
        connection.close()
        return jsonify({"success": True, "users": users, "count": len(users)})

    except Exception as e:
        print(f"❌ Error searching all users: {e}")
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "message": "Error searching users"}), 500


@app.route('/api/debug/posts', methods=['GET'])
def debug_posts():
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT post_id, user_id, caption, media_url, post_type, created_at
            FROM posts WHERE is_deleted = FALSE LIMIT 10
        """)
        posts = cursor.fetchall()
        cursor.close()
        connection.close()
        for post in posts:
            if post.get('media_url'):
                post['media_url'] = post['media_url'].replace('\\', '/')
        return jsonify({"success": True, "count": len(posts), "posts": posts})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/debug/files', methods=['GET'])
def debug_files():
    try:
        result = {"profile": [], "posts": [], "cover": []}
        profile_dir = os.path.join(UPLOAD_DIR, 'profile')
        posts_dir   = os.path.join(UPLOAD_DIR, 'posts')
        cover_dir   = os.path.join(UPLOAD_DIR, 'cover')
        if os.path.exists(profile_dir):
            result["profile"] = os.listdir(profile_dir)
        if os.path.exists(posts_dir):
            result["posts"] = os.listdir(posts_dir)
        if os.path.exists(cover_dir):
            result["cover"] = os.listdir(cover_dir)
        return result
    except Exception as e:
        return {"error": str(e)}, 500

# ─────────────────────────────────────────────────────────────
# Frontend catch-all route — MUST be after all API routes
# On Railway: serves your HTML/CSS/JS files
# On localhost: you use Live Server (5500) so this won't interfere
# ─────────────────────────────────────────────────────────────
# Replace the frontend catch-all route section with this:

# ─────────────────────────────────────────────────────────────
# Frontend catch-all route — MUST be after all API routes
# ─────────────────────────────────────────────────────────────
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    # Don't catch socket.io or api calls
    if path.startswith('socket.io') or path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404
    
    # Log for debugging
    print(f"🔍 Requested: {path}")
    print(f"📁 Static folder: {app.static_folder}")
    
    # Try multiple possible frontend locations
    possible_frontends = []
    
    # Add FRONTEND_DIR (original)
    possible_frontends.append(FRONTEND_DIR)
    
    # Try parent directory (if frontend is at root level)
    possible_frontends.append(os.path.join(os.path.dirname(BASE_DIR), 'frontend'))
    
    # Try current directory
    possible_frontends.append(os.path.join(BASE_DIR, 'frontend'))
    
    # Try Railway default paths
    possible_frontends.append('/app/frontend')
    possible_frontends.append('/app/static')
    
    # Try to find the file
    for frontend_dir in possible_frontends:
        if os.path.exists(frontend_dir):
            print(f"✅ Found frontend at: {frontend_dir}")
            
            # If path is empty, serve home.html
            if not path:
                home_path = os.path.join(frontend_dir, 'home.html')
                if os.path.exists(home_path):
                    return send_from_directory(frontend_dir, 'home.html')
                continue
            
            # Try to serve the requested file
            full_path = os.path.join(frontend_dir, path)
            if os.path.exists(full_path) and os.path.isfile(full_path):
                return send_from_directory(frontend_dir, path)
            
            # Try with .html extension if it's a path without extension
            if '.' not in path:
                html_path = os.path.join(frontend_dir, f"{path}.html")
                if os.path.exists(html_path):
                    return send_from_directory(frontend_dir, f"{path}.html")
    
    # If we get here, try to serve home.html as fallback (SPA behavior)
    for frontend_dir in possible_frontends:
        if os.path.exists(frontend_dir):
            home_path = os.path.join(frontend_dir, 'home.html')
            if os.path.exists(home_path):
                return send_from_directory(frontend_dir, 'home.html')
    
    # Debug: List what's in the directory
    debug_info = {
        'error': 'Frontend not found',
        'requested_path': path,
        'FRONTEND_DIR': FRONTEND_DIR,
        'BASE_DIR': BASE_DIR,
        'exists': os.path.exists(FRONTEND_DIR),
        'files_in_frontend': os.listdir(FRONTEND_DIR) if os.path.exists(FRONTEND_DIR) else [],
        'cwd': os.getcwd(),
        'cwd_files': os.listdir(os.getcwd())
    }
    print(f"❌ Debug info: {debug_info}")
    return jsonify(debug_info), 404

# ─────────────────────────────────────────────────────────────
# Error handlers
# ─────────────────────────────────────────────────────────────
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Resource not found"}), 404

@app.route('/api/debug/paths', methods=['GET'])
def debug_paths():
    """Debug endpoint to check paths"""
    import os
    result = {
        'BASE_DIR': BASE_DIR,
        'FRONTEND_DIR': FRONTEND_DIR,
        'UPLOAD_DIR': UPLOAD_DIR,
        'cwd': os.getcwd(),
        'is_production': IS_PRODUCTION,
        'static_folder': app.static_folder,
        'static_folder_exists': os.path.exists(app.static_folder) if app.static_folder else False,
        'frontend_exists': os.path.exists(FRONTEND_DIR),
        'files_in_frontend': [],
        'files_in_cwd': os.listdir(os.getcwd()),
        'files_in_parent': os.listdir(os.path.dirname(os.getcwd())) if os.path.exists(os.path.dirname(os.getcwd())) else []
    }
    
    if os.path.exists(FRONTEND_DIR):
        result['files_in_frontend'] = os.listdir(FRONTEND_DIR)[:20]  # First 20 files
    
    # Also check for frontend in parent directory
    parent_frontend = os.path.join(os.path.dirname(BASE_DIR), 'frontend')
    result['parent_frontend_exists'] = os.path.exists(parent_frontend)
    if os.path.exists(parent_frontend):
        result['files_in_parent_frontend'] = os.listdir(parent_frontend)[:20]
    
    return jsonify(result)
@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

# ─────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────
if __name__ == '__main__':
    try:
        import jwt
    except ImportError:
        print("⚠️  PyJWT not installed. Installing...")
        import subprocess
        subprocess.check_call(['pip', 'install', 'PyJWT'])
        print("✅ PyJWT installed")

    PORT = int(os.getenv('PORT', 3000))
    local_ip = get_local_ip()
    frontend_port = int(os.getenv('FRONTEND_PORT', 5500))

    print("=" * 70)
    print("🚀 CREATOR CONNECT - SOCIAL MEDIA PLATFORM")
    print("=" * 70)
    print(f"   Environment : {'🌐 PRODUCTION (Railway)' if IS_PRODUCTION else '💻 LOCAL'}")
    print(f"   Upload Dir  : {UPLOAD_DIR}")
    print(f"   Frontend Dir: {FRONTEND_DIR}")

    print("\n📊 Initializing database...")
    initialize_database()

    print(f"\n✅ Backend API running on:")
    print(f"   • Local:   http://localhost:{PORT}")
    print(f"   • Network: http://{local_ip}:{PORT}")
    if not IS_PRODUCTION:
        print(f"\n🌐 Frontend (local): http://localhost:{frontend_port}")
    print(f"🔌 WebSocket: ✅ eventlet mode")
    print(f"🌐 CORS: ✅ Configured")
    print("\n" + "=" * 70 + "\n")

    # ✅ use_reloader=False required with eventlet
    socketio.run(
        app,
        debug=not IS_PRODUCTION,
        host='0.0.0.0',
        port=PORT,
        use_reloader=False
    )