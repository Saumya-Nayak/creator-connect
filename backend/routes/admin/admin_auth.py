# backend/routes/admin/admin_auth.py

from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash
import jwt
import datetime
from functools import wraps
import secrets
import bcrypt

from database.db import get_db_connection

admin_auth_bp = Blueprint('admin_auth', __name__, url_prefix='/api/admin')

SECRET_KEY = 'your-secret-key-here'  # TODO: Move to environment variable


# ===== HELPER: Verify password (supports both bcrypt and werkzeug) =====

def verify_password(stored_password, provided_password):
    """Supports bcrypt ($2b$/$2a$) and Werkzeug (scrypt/pbkdf2) hashes"""
    try:
        if stored_password.startswith('$2b$') or stored_password.startswith('$2a$'):
            return bcrypt.checkpw(provided_password.encode('utf-8'), stored_password.encode('utf-8'))
        else:
            return check_password_hash(stored_password, provided_password)
    except Exception as e:
        print(f"❌ Password verification error: {str(e)}")
        return False


# ===== DECORATORS =====

def admin_required(f):
    """Decorator to protect admin routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({
                'success': False,
                'message': 'Authentication token is missing'
            }), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            
            if data.get('role') != 1:
                return jsonify({
                    'success': False,
                    'message': 'Admin access required'
                }), 403
            
            request.admin_id = data.get('user_id')
            request.admin_email = data.get('email')
            
        except jwt.ExpiredSignatureError:
            return jsonify({
                'success': False,
                'message': 'Token has expired'
            }), 401
        except jwt.InvalidTokenError:
            return jsonify({
                'success': False,
                'message': 'Invalid token'
            }), 401
        
        return f(*args, **kwargs)
    
    return decorated_function


# ===== ADMIN LOGIN =====

@admin_auth_bp.route('/login', methods=['POST'])
def admin_login():
    """Admin login endpoint"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        remember_me = data.get('rememberMe', False)
        
        if not email or not password:
            return jsonify({
                'success': False,
                'message': 'Email and password are required'
            }), 400
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Check if account is locked
        cursor.execute("""
            SELECT account_locked_until 
            FROM users 
            WHERE email = %s AND role = 1
        """, (email,))
        
        locked_result = cursor.fetchone()
        
        if locked_result and locked_result['account_locked_until']:
            if locked_result['account_locked_until'] > datetime.datetime.now():
                time_remaining = (locked_result['account_locked_until'] - datetime.datetime.now()).seconds // 60
                return jsonify({
                    'success': False,
                    'message': f'Account is locked. Try again in {time_remaining} minutes.'
                }), 403
            else:
                cursor.execute("""
                    UPDATE users 
                    SET account_locked_until = NULL, login_attempts = 0 
                    WHERE email = %s
                """, (email,))
                conn.commit()
        
        # Get user data
        cursor.execute("""
            SELECT 
                id, email, username, password, full_name, 
                profile_pic, role, login_attempts, otp_verified
            FROM users 
            WHERE email = %s AND role = 1 AND otp_verified = 1
        """, (email,))
        
        user = cursor.fetchone()
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'Invalid credentials or insufficient permissions'
            }), 401
        
        # ✅ Verify password - supports both bcrypt and werkzeug hashes
        if not verify_password(user['password'], password):
            new_attempts = user['login_attempts'] + 1
            
            if new_attempts >= 5:
                lock_until = datetime.datetime.now() + datetime.timedelta(minutes=30)
                cursor.execute("""
                    UPDATE users 
                    SET login_attempts = %s, account_locked_until = %s 
                    WHERE id = %s
                """, (new_attempts, lock_until, user['id']))
                conn.commit()
                
                return jsonify({
                    'success': False,
                    'message': 'Too many failed attempts. Account locked for 30 minutes.'
                }), 403
            else:
                cursor.execute("""
                    UPDATE users 
                    SET login_attempts = %s 
                    WHERE id = %s
                """, (new_attempts, user['id']))
                conn.commit()
                
                attempts_left = 5 - new_attempts
                return jsonify({
                    'success': False,
                    'message': f'Invalid password. {attempts_left} attempts remaining.'
                }), 401
        
        # Successful login - reset attempts
        cursor.execute("""
            UPDATE users 
            SET login_attempts = 0, last_login = NOW() 
            WHERE id = %s
        """, (user['id'],))
        
        # Generate JWT token
        expiry = datetime.timedelta(days=30 if remember_me else 1)
        token_expiry = datetime.datetime.utcnow() + expiry
        
        token = jwt.encode({
            'user_id': user['id'],
            'email': user['email'],
            'role': user['role'],
            'exp': token_expiry
        }, SECRET_KEY, algorithm='HS256')
        
        # Create session record
        cursor.execute("""
            INSERT INTO admin_sessions 
            (user_id, token, ip_address, user_agent, expires_at) 
            VALUES (%s, %s, %s, %s, %s)
        """, (
            user['id'],
            token,
            request.remote_addr,
            request.headers.get('User-Agent', '')[:500],
            token_expiry
        ))
        
        # Log activity
        cursor.execute("""
            INSERT INTO admin_activity_log 
            (admin_id, action_type, action_details, ip_address, user_agent) 
            VALUES (%s, %s, %s, %s, %s)
        """, (
            user['id'],
            'login',
            'Admin logged in successfully',
            request.remote_addr,
            request.headers.get('User-Agent', '')[:500]
        ))
        
        conn.commit()
        
        admin_data = {
            'id': user['id'],
            'email': user['email'],
            'username': user['username'],
            'full_name': user['full_name'],
            'profile_pic': user['profile_pic'],
            'role': user['role']
        }
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'token': token,
            'admin': admin_data
        }), 200
        
    except Exception as e:
        print(f"❌ Admin login error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred during login'
        }), 500


# ===== VERIFY TOKEN =====

@admin_auth_bp.route('/verify', methods=['GET'])
@admin_required
def verify_token():
    """Verify if admin token is valid"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT id, email, username, full_name, profile_pic, role 
            FROM users 
            WHERE id = %s AND role = 1
        """, (request.admin_id,))
        
        admin = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not admin:
            return jsonify({
                'success': False,
                'message': 'Admin not found'
            }), 404
        
        return jsonify({
            'success': True,
            'admin': admin
        }), 200
        
    except Exception as e:
        print(f"❌ Verify token error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Token verification failed'
        }), 500


# ===== ADMIN LOGOUT =====

@admin_auth_bp.route('/logout', methods=['POST'])
@admin_required
def admin_logout():
    """Admin logout endpoint"""
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE admin_sessions 
            SET is_active = 0 
            WHERE user_id = %s AND token = %s
        """, (request.admin_id, token))
        
        cursor.execute("""
            INSERT INTO admin_activity_log 
            (admin_id, action_type, action_details, ip_address, user_agent) 
            VALUES (%s, %s, %s, %s, %s)
        """, (
            request.admin_id,
            'logout',
            'Admin logged out',
            request.remote_addr,
            request.headers.get('User-Agent', '')[:500]
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Logged out successfully'
        }), 200
        
    except Exception as e:
        print(f"❌ Logout error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Logout failed'
        }), 500


# ===== CHANGE PASSWORD =====

@admin_auth_bp.route('/change-password', methods=['POST'])
@admin_required
def change_password():
    """Change admin password"""
    try:
        from werkzeug.security import generate_password_hash
        
        data = request.get_json()
        current_password = data.get('currentPassword', '')
        new_password = data.get('newPassword', '')
        
        if not current_password or not new_password:
            return jsonify({
                'success': False,
                'message': 'Both passwords are required'
            }), 400
        
        if len(new_password) < 8:
            return jsonify({
                'success': False,
                'message': 'Password must be at least 8 characters'
            }), 400
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT password FROM users WHERE id = %s", (request.admin_id,))
        user = cursor.fetchone()
        
        # ✅ Also use dual verification for change password
        if not verify_password(user['password'], current_password):
            return jsonify({
                'success': False,
                'message': 'Current password is incorrect'
            }), 401
        
        # Always save new passwords as Werkzeug scrypt going forward
        hashed_password = generate_password_hash(new_password)
        cursor.execute("""
            UPDATE users 
            SET password = %s 
            WHERE id = %s
        """, (hashed_password, request.admin_id))
        
        cursor.execute("""
            INSERT INTO admin_activity_log 
            (admin_id, action_type, action_details, ip_address) 
            VALUES (%s, %s, %s, %s)
        """, (
            request.admin_id,
            'password_change',
            'Admin changed password',
            request.remote_addr
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        }), 200
        
    except Exception as e:
        print(f"❌ Change password error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to change password'
        }), 500