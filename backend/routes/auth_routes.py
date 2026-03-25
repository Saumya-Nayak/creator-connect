from flask import Blueprint, request, jsonify
from database.user_operations import (
    create_user, 
    check_user_exists, 
    authenticate_user,
    update_last_login,
    get_user_by_id,
    create_password_reset_token,
    verify_reset_token,
    reset_password_with_token,
    create_or_login_google_user
)
from database import user_operations
from services import jwt_service
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os
from services.otp_service import generate_otp, store_otp, verify_otp
from services.email_service import send_otp_email, send_password_reset_email, send_registration_success_email
from services.jwt_service import generate_token, verify_token
import re

auth_bp = Blueprint('auth', __name__)

# ===== REGISTRATION ENDPOINTS =====

@auth_bp.route('/register', methods=['POST'])
def register_user():
    """Handle user registration with file upload"""
    try:
        # Check if request has files (multipart/form-data) or JSON
        if request.content_type and 'multipart/form-data' in request.content_type:
            # Get form data
            data = {
                'email': request.form.get('email'),
                'user_name': request.form.get('user_name'),
                'password': request.form.get('password'),
                'full_name': request.form.get('full_name'),
                'phone': request.form.get('phone'),
                'country': request.form.get('country'),
                'state': request.form.get('state'),
                'city': request.form.get('city'),
                'gender': request.form.get('gender'),
                'date_of_birth': request.form.get('date_of_birth'),
                'about_me': request.form.get('about_me'),
                'is_private': request.form.get('is_private'),
                'otp_verified': request.form.get('otp_verified') == 'true',
                'verification_method': request.form.get('verification_method', 'email')
            }
            
            # Handle file upload
            # Handle file upload via Cloudinary
            profile_pic_path = None
            if 'profilePic' in request.files:
                file = request.files['profilePic']
                if file and file.filename != '':
                    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
                    if '.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS:
                        import cloudinary.uploader
                        result = cloudinary.uploader.upload(
                            file,
                            folder="profiles",
                            allowed_formats=["jpg", "jpeg", "png", "webp", "gif"],
                            transformation=[{"width": 400, "height": 400, "crop": "fill", "gravity": "face"}]
                        )
                        profile_pic_path = result['secure_url']
                        print(f"✅ Profile picture uploaded to Cloudinary: {profile_pic_path}")
            
            data['profile_pic'] = profile_pic_path
            
        else:
            # JSON request (for Google login or no file upload)
            data = request.get_json()
        
        # Validate required fields
        required_fields = ['email', 'user_name', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'message': f'{field} is required'
                }), 400
        
        if not data.get('otp_verified'):
            return jsonify({
                'success': False,
                'message': 'Please verify your email with OTP first'
            }), 400
        
        result = create_user(data)
        
        if result['success']:
            print(f"✅ New user registered: {data['email']}")

            # Send registration success email
            try:
                send_registration_success_email(
                    data['email'],
                    data['user_name']
                )
                print(f"📧 Registration success email sent to {data['email']}")
            except Exception as e:
                print(f"❌ Failed to send registration email: {e}")

            return jsonify(result), 201
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f"❌ Registration error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Registration failed. Please try again.'
        }), 500
@auth_bp.route('/check-availability', methods=['POST'])
def check_availability():
    """Check if email or username is available"""
    try:
        data = request.get_json()
        email = data.get('email')
        username = data.get('username')
        
        result = check_user_exists(email=email, username=username)
        
        if result.get('exists'):
            return jsonify({
                'available': False,
                'field': result.get('field'),
                'message': result.get('message')
            })
        else:
            return jsonify({
                'available': True,
                'message': 'Available'
            })
            
    except Exception as e:
        print(f"❌ Error checking availability: {str(e)}")
        return jsonify({
            'available': False,
            'message': 'Error checking availability'
        }), 500

# ===== OTP ENDPOINTS =====

@auth_bp.route('/send-otp', methods=['POST'])
def send_otp():
    """Send OTP to email"""
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({
                'success': False,
                'message': 'Email is required'
            }), 400
        
        otp = generate_otp()
        store_otp(email, otp)
        
        send_otp_email(email, otp)
        print(f"✅ OTP sent to email {email}: {otp}")
        
        return jsonify({
            'success': True,
            'message': 'OTP sent successfully to your email'
        })
        
    except Exception as e:
        print(f"❌ Error sending OTP: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to send OTP. Please try again.'
        }), 500

@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp_endpoint():
    """Verify OTP"""
    try:
        data = request.get_json()
        email = data.get('email')
        otp = data.get('otp')
        
        result = verify_otp(email, otp)
        
        if result['success']:
            print(f"✅ OTP verified successfully for {email}")
        else:
            print(f"❌ OTP verification failed for {email}")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Error verifying OTP: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error verifying OTP. Please try again.'
        }), 500

# ===== LOGIN ENDPOINTS =====

@auth_bp.route('/login', methods=['POST'])
def login():
    """Handle user login"""
    try:
        data = request.get_json()
        
        identifier = data.get('email')
        password = data.get('password')
        remember = data.get('remember', False)
        
        if not identifier or not password:
            return jsonify({
                'success': False,
                'message': 'Email/username and password are required'
            }), 400
        
        result = authenticate_user(identifier, password)
        
        if result['success']:
            user = result['user']
            update_last_login(user['id'])
            token = generate_token(user['id'], remember)
            
            print(f"✅ User logged in: {user['email']}")
            
            return jsonify({
                'success': True,
                'message': 'Login successful',
                'token': token,
                'user': {
                    'id': user['id'],
                    'email': user['email'],
                    'username': user['username'],
                    'full_name': user['full_name'],
                    'profile_pic': user['profile_pic'],
                    'role': user['role']
                }
            }), 200
        else:
            return jsonify(result), 401
            
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Login failed. Please try again.'
        }), 500

@auth_bp.route('/verify-token', methods=['POST'])
def verify_user_token():
    """Verify JWT token and return user info"""
    try:
        data = request.get_json()
        token = data.get('token')
        
        if not token:
            return jsonify({
                'success': False,
                'message': 'Token is required'
            }), 400
        
        result = verify_token(token)
        
        if result['valid']:
            user = get_user_by_id(result['user_id'])
            
            if user:
                return jsonify({
                    'success': True,
                    'user': {
                        'id': user['id'],
                        'email': user['email'],
                        'username': user['username'],
                        'full_name': user['full_name'],
                        'profile_pic': user['profile_pic'],
                        'role': user['role']
                    }
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'message': 'User not found'
                }), 404
        else:
            return jsonify({
                'success': False,
                'message': result['message']
            }), 401
            
    except Exception as e:
        print(f"❌ Token verification error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Token verification failed'
        }), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Handle user logout"""
    return jsonify({
        'success': True,
        'message': 'Logged out successfully'
    }), 200

# ===== PASSWORD RESET ENDPOINTS =====

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Handle forgot password request"""
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({
                'success': False,
                'message': 'Email is required'
            }), 400
        
        # Log the environment
        print(f"🌐 Environment: RAILWAY_STATIC_URL = {os.getenv('RAILWAY_STATIC_URL')}")
        print(f"📧 Forgot password request for: {email}")
        
        result = create_password_reset_token(email)
        
        if result['success'] and result.get('user_found'):
            # Log the generated token
            print(f"🔑 Generated reset token: {result['token'][:20]}...")
            
            email_sent = send_password_reset_email(
                email, 
                result['token'], 
                result['username']
            )
            
            if email_sent:
                print(f"✅ Password reset email sent to: {email}")
                return jsonify({
                    'success': True,
                    'message': '📧 Password reset link has been sent to your email.'
                }), 200
            else:
                print(f"❌ Failed to send email to: {email}")
                return jsonify({
                    'success': False,
                    'message': 'Failed to send email. Please try again.'
                }), 500
        else:
            # Don't reveal if user exists for security
            print(f"ℹ️ Forgot password request for non-existent email: {email}")
            return jsonify({
                'success': True,
                'message': '📧 If the email exists, a password reset link has been sent.'
            }), 200
            
    except Exception as e:
        print(f"❌ Forgot password error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to process request. Please try again.'
        }), 500
@auth_bp.route('/verify-reset-token', methods=['POST'])
def verify_reset_token_endpoint():
    """Verify if password reset token is valid"""
    try:
        data = request.get_json()
        token = data.get('token')
        
        if not token:
            return jsonify({
                'success': False,
                'message': 'Token is required'
            }), 400
        
        result = verify_reset_token(token)
        
        if result['valid']:
            return jsonify({
                'success': True,
                'message': 'Token is valid',
                'email': result['email']
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': result['message']
            }), 400
            
    except Exception as e:
        print(f"❌ Token verification error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error verifying token'
        }), 500
# ===== GOOGLE OAUTH LOGIN ENDPOINT =====

@auth_bp.route("/google-login", methods=["POST"])
def google_login():
    """Handle Google OAuth login - create or login user"""
    try:
        data = request.get_json()
        credential = data.get("credential")
        remember = data.get("remember", False)

        if not credential:
            return jsonify({
                "success": False, 
                "message": "Missing Google credential"
            }), 400

        # Verify Google token
        try:
            idinfo = id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                os.getenv("GOOGLE_CLIENT_ID")
            )
        except Exception as e:
            print(f"❌ Google token verification failed: {e}")
            return jsonify({
                "success": False,
                "message": "Invalid Google token"
            }), 400

        # Extract user info from Google
        google_data = {
            'email': idinfo.get('email'),
            'name': idinfo.get('name'),
            'picture': idinfo.get('picture'),
            'google_id': idinfo.get('sub')
        }

        print(f"🔍 Google login attempt for: {google_data['email']}")

        # Create or login user using the function from user_operations
        result = create_or_login_google_user(google_data)

        if result['success']:
            user = result['user']

            # ✅ Block suspended users from logging in via Google
            from datetime import datetime
            locked_until = user.get('account_locked_until')
            if locked_until and locked_until > datetime.now():
                lock_str = locked_until.strftime('%b %d, %Y at %I:%M %p')
                print(f"🚫 Google login blocked for suspended user: {user['email']}")
                return jsonify({
                    'success': False,
                    'message': f'Your account has been suspended until {lock_str}. Please contact support if you believe this is a mistake.',
                    'is_suspended': True
                }), 403

            # Generate JWT token
            token = generate_token(user['id'], remember)
            
            # Update last login
            update_last_login(user['id'])

            # If this is a NEW Google user → send welcome email
            if result['is_new_user']:
                try:
                    send_registration_success_email(
                        google_data['email'],
                        user['username']
                    )
                    print(f"📧 Welcome email sent to new Google user: {google_data['email']}")
                except Exception as e:
                    print(f"❌ Failed to send Google welcome email: {e}")

            response_message = (
                "Welcome! Your account has been created." 
                if result['is_new_user'] 
                else "Welcome back!"
            )
            
            print(f"✅ Google login successful: {user['email']} (New: {result['is_new_user']})")
            
            return jsonify({
                "success": True,
                "message": response_message,
                "token": token,
                "user": {
                    "id": user['id'],
                    "email": user['email'],
                    "username": user['username'],
                    "full_name": user['full_name'],
                    "profile_pic": user['profile_pic'],
                    "role": user.get('role', 'user')
                },
                "is_new_user": result['is_new_user']
            }), 200

        else:
            print(f"❌ Google login failed: {result['message']}")
            return jsonify({
                "success": False,
                "message": result['message']
            }), 400

    except Exception as e:
        print(f"❌ Google login error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": "Google authentication failed. Please try again."
        }), 500


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password with valid token"""
    try:
        data = request.get_json()
        token = data.get('token')
        new_password = data.get('password')
        
        if not token or not new_password:
            return jsonify({
                'success': False,
                'message': 'Token and new password are required'
            }), 400
        
        # Password validation
        if len(new_password) < 8 or len(new_password) > 50:
            return jsonify({
                'success': False,
                'message': 'Password must be between 8 and 50 characters long'
            }), 400
        
        # Check for spaces
        if ' ' in new_password:
            return jsonify({
                'success': False,
                'message': 'Password cannot contain spaces'
            }), 400
        
        # Check for at least one special character
        special_char_pattern = r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/;\'`~]'
        if not re.search(special_char_pattern, new_password):
            return jsonify({
                'success': False,
                'message': 'Password must contain at least one special character'
            }), 400
        
        result = reset_password_with_token(token, new_password)
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': '✅ Password has been reset successfully! Please login with your new password.',
                'redirect': '/home.html',
                'openLoginModal': True
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': result['message']
            }), 400
            
    except Exception as e:
        print(f"❌ Password reset error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to reset password. Please try again.'
        }), 500