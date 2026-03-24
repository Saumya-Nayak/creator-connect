from database.db import get_db_connection
from mysql.connector import Error
import bcrypt
from datetime import datetime
import mysql
import os
def hash_password(password):
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password, hashed_password):
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def check_user_exists(email=None, username=None):
    """Check if user already exists by email or username"""
    connection = get_db_connection()
    if not connection:
        return {'exists': False, 'error': 'Database connection failed'}
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        if email:
            cursor.execute("SELECT id, email FROM users WHERE email = %s", (email,))
            result = cursor.fetchone()
            if result:
                return {'exists': True, 'field': 'email', 'message': 'Email already registered'}
        
        if username:
            cursor.execute("SELECT id, username FROM users WHERE username = %s", (username,))
            result = cursor.fetchone()
            if result:
                return {'exists': True, 'field': 'username', 'message': 'Username already taken'}
        
        cursor.close()
        connection.close()
        return {'exists': False}
        
    except Error as e:
        print(f"❌ Error checking user existence: {e}")
        return {'exists': False, 'error': str(e)}

def create_user(user_data):
    """Insert new user into database"""
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    
    try:
        # Check if user already exists
        exists = check_user_exists(
            email=user_data.get('email'),
            username=user_data.get('user_name')
        )
        
        if exists.get('exists'):
            return {
                'success': False,
                'message': exists.get('message'),
                'field': exists.get('field')
            }
        
        # Hash password
        hashed_password = hash_password(user_data['password'])
        
        # Parse date_of_birth if provided
        dob = None
        if user_data.get('date_of_birth'):
            try:
                dob = datetime.strptime(user_data['date_of_birth'], '%Y-%m-%d').date()
            except ValueError:
                pass
        
        # Convert is_private to boolean
        is_private = user_data.get('is_private', '0') == '1'
        
        cursor = connection.cursor()
        
        insert_query = """
        INSERT INTO users (
            email, username, password, full_name, phone, 
            profile_pic, country, state, city, gender, 
            date_of_birth, about_me, is_private, otp_verified, 
            verification_method
        ) VALUES (
            %s, %s, %s, %s, %s, 
            %s, %s, %s, %s, %s, 
            %s, %s, %s, %s, %s
        )
        """
        
        # ✅ UPDATED: Handle profile_pic correctly
        profile_pic = user_data.get("profile_pic")
        
        # If it's already a full path (Google URL or uploaded file path), use as-is
        # Otherwise, set to None
        if profile_pic:
            # Google URLs start with http:// or https://
            if profile_pic.startswith("http://") or profile_pic.startswith("https://"):
                # Keep Google URL as-is
                pass
            elif profile_pic.startswith("uploads/profile/"):
                # Already correct path from file upload
                pass
            else:
                # Invalid format
                profile_pic = None
        
        values = (
            user_data['email'],
            user_data['user_name'],
            hashed_password,
            user_data.get('full_name'),
            user_data.get('phone'),
            profile_pic,  # ✅ Now stores correct path
            user_data.get('country'),
            user_data.get('state'),
            user_data.get('city'),
            user_data.get('gender'),
            dob,
            user_data.get('about_me'),
            is_private,
            user_data.get('otp_verified', False),
            user_data.get('verification_method', 'email')
        )
        
        cursor.execute(insert_query, values)
        connection.commit()
        
        user_id = cursor.lastrowid
        print(f"✅ User created successfully with ID: {user_id}")
        
        cursor.close()
        connection.close()
        
        return {
            'success': True,
            'message': 'User registered successfully!',
            'user_id': user_id
        }
        
    except Error as e:
        print(f"❌ Error creating user: {e}")
        return {
            'success': False,
            'message': f'Registration failed: {str(e)}'
        }

def get_user_by_email(email):
    """Retrieve user by email"""
    connection = get_db_connection()
    if not connection:
        return None
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        return user
        
    except Error as e:
        print(f"❌ Error fetching user: {e}")
        return None

def get_user_by_username(username):
    """Retrieve user by username"""
    connection = get_db_connection()
    if not connection:
        return None
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        return user
        
    except Error as e:
        print(f"❌ Error fetching user: {e}")
        return None

def update_user(user_id, update_data):
    """Update user information"""
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    
    try:
        cursor = connection.cursor()
        
        # Build dynamic update query
        update_fields = []
        values = []
        
        allowed_fields = [
            'full_name', 'phone', 'profile_pic', 'country', 
            'state', 'city', 'gender', 'date_of_birth', 
            'about_me', 'is_private'
        ]
        
        for field in allowed_fields:
            if field in update_data:
                update_fields.append(f"{field} = %s")
                values.append(update_data[field])
        
        if not update_fields:
            return {'success': False, 'message': 'No fields to update'}
        
        values.append(user_id)
        
        update_query = f"""
        UPDATE users 
        SET {', '.join(update_fields)}
        WHERE id = %s
        """
        
        cursor.execute(update_query, values)
        connection.commit()
        
        cursor.close()
        connection.close()
        
        return {
            'success': True,
            'message': 'User updated successfully'
        }
        
    except Error as e:
        print(f"❌ Error updating user: {e}")
        return {
            'success': False,
            'message': f'Update failed: {str(e)}'
        }

def delete_user(user_id):
    """Delete user from database and clean up their profile picture"""
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # ✅ STEP 1: Get user's profile picture path BEFORE deletion
        cursor.execute("SELECT profile_pic FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            connection.close()
            return {
                'success': False,
                'message': 'User not found'
            }
        
        profile_pic_path = user.get('profile_pic')
        
        # ✅ STEP 2: Delete user from database
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        connection.commit()
        
        cursor.close()
        connection.close()
        
        # ✅ STEP 3: Delete profile picture file if it exists
        if profile_pic_path:
            # Check if it's a local file (not a Google URL)
            if profile_pic_path.startswith('uploads/profile/'):
                try:
                    # Construct full file path
                    if os.path.exists(profile_pic_path):
                        os.remove(profile_pic_path)
                        print(f"✅ Deleted profile picture: {profile_pic_path}")
                    else:
                        print(f"⚠️ Profile picture not found: {profile_pic_path}")
                except Exception as e:
                    print(f"⚠️ Failed to delete profile picture: {e}")
                    # Don't fail the entire operation if file deletion fails
            else:
                print(f"ℹ️ Profile picture is external URL (Google): {profile_pic_path}")
        
        print(f"✅ User {user_id} deleted successfully")
        
        return {
            'success': True,
            'message': 'User deleted successfully'
        }
        
    except Error as e:
        print(f"❌ Error deleting user: {e}")
        if connection:
            connection.rollback()
            connection.close()
        return {
            'success': False,
            'message': f'Deletion failed: {str(e)}'
        }


# ===== BONUS: Cleanup orphaned profile pictures =====
def cleanup_orphaned_profile_pictures():
    """
    Find and delete profile pictures that don't belong to any user.
    This is useful for cleaning up files from failed registrations or other issues.
    """
    connection = get_db_connection()
    if not connection:
        print("❌ Database connection failed")
        return
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Get all profile pictures from database
        cursor.execute("SELECT profile_pic FROM users WHERE profile_pic IS NOT NULL")
        users = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        # Extract local file paths (ignore Google URLs)
        db_profile_pics = set()
        for user in users:
            profile_pic = user['profile_pic']
            if profile_pic and profile_pic.startswith('uploads/profile/'):
                # Extract just the filename
                filename = profile_pic.split('/')[-1]
                db_profile_pics.add(filename)
        
        # Get all files in uploads/profile directory
        upload_dir = 'uploads/profile'
        if not os.path.exists(upload_dir):
            print(f"⚠️ Upload directory not found: {upload_dir}")
            return
        
        all_files = set(os.listdir(upload_dir))
        
        # Find orphaned files
        orphaned_files = all_files - db_profile_pics
        
        if not orphaned_files:
            print("✅ No orphaned profile pictures found")
            return
        
        print(f"🗑️ Found {len(orphaned_files)} orphaned profile pictures:")
        
        deleted_count = 0
        for filename in orphaned_files:
            filepath = os.path.join(upload_dir, filename)
            try:
                os.remove(filepath)
                print(f"   ✅ Deleted: {filename}")
                deleted_count += 1
            except Exception as e:
                print(f"   ❌ Failed to delete {filename}: {e}")
        
        print(f"✅ Cleanup complete: {deleted_count}/{len(orphaned_files)} files deleted")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")


# ===== BONUS: Update profile picture with old file cleanup =====
def update_profile_picture(user_id, new_profile_pic_path):
    """
    Update user's profile picture and delete the old one
    
    Args:
        user_id: User's ID
        new_profile_pic_path: Path to new profile picture
    
    Returns:
        dict with success status
    """
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Get old profile picture path
        cursor.execute("SELECT profile_pic FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            connection.close()
            return {'success': False, 'message': 'User not found'}
        
        old_profile_pic = user.get('profile_pic')
        
        # Update with new profile picture
        cursor.execute(
            "UPDATE users SET profile_pic = %s WHERE id = %s",
            (new_profile_pic_path, user_id)
        )
        connection.commit()
        
        cursor.close()
        connection.close()
        
        # Delete old profile picture if it exists and is a local file
        if old_profile_pic and old_profile_pic.startswith('uploads/profile/'):
            try:
                if os.path.exists(old_profile_pic):
                    os.remove(old_profile_pic)
                    print(f"✅ Deleted old profile picture: {old_profile_pic}")
            except Exception as e:
                print(f"⚠️ Failed to delete old profile picture: {e}")
        
        return {
            'success': True,
            'message': 'Profile picture updated successfully'
        }
        
    except Error as e:
        print(f"❌ Error updating profile picture: {e}")
        if connection:
            connection.rollback()
            connection.close()
        return {
            'success': False,
            'message': f'Update failed: {str(e)}'
        }
def authenticate_user(identifier, password):
    """
    Authenticate user with email/username and password.
    ✅ Now also blocks suspended users from logging in.
    """
    from database.db import get_db_connection
    from mysql.connector import Error
    from datetime import datetime

    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}

    try:
        cursor = connection.cursor(dictionary=True)

        if '@' in identifier:
            query = "SELECT * FROM users WHERE email = %s"
        else:
            query = "SELECT * FROM users WHERE username = %s"

        cursor.execute(query, (identifier,))
        user = cursor.fetchone()

        cursor.close()
        connection.close()

        if not user:
            return {
                'success': False,
                'message': 'Invalid email/username or password'
            }

        # ✅ Check if account is suspended
        locked_until = user.get('account_locked_until')
        if locked_until and locked_until > datetime.now():
            lock_str = locked_until.strftime('%b %d, %Y at %I:%M %p')
            return {
                'success': False,
                'message': f'Your account has been suspended until {lock_str}. Please contact support if you believe this is a mistake.',
                'is_suspended': True,
                'locked_until': locked_until.isoformat()
            }

        # Verify password
        if verify_password(password, user['password']):
            user.pop('password', None)
            return {
                'success': True,
                'message': 'Login successful',
                'user': user
            }
        else:
            return {
                'success': False,
                'message': 'Invalid email/username or password'
            }

    except Error as e:
        print(f"❌ Error authenticating user: {e}")
        return {
            'success': False,
            'message': 'Authentication failed. Please try again.'
        }
def update_last_login(user_id):
    connection = get_db_connection()
    if not connection:
        return False
    
    try:
        cursor = connection.cursor()
        cursor.execute(
            "UPDATE users SET last_login = NOW() WHERE id = %s",
            (user_id,)
        )
        connection.commit()
        cursor.close()
        connection.close()
        return True
        
    except Error as e:
        print(f"❌ Error updating last login: {e}")
        return False

def get_user_by_id(user_id):
    """Retrieve user by ID"""
    connection = get_db_connection()
    if not connection:
        return None
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        
        if user:
            user.pop('password', None)  # Remove password from response
        
        cursor.close()
        connection.close()
        
        return user
        
    except Error as e:
        print(f"❌ Error fetching user: {e}")
        return None
def get_user_by_email(email):
    cursor = mysql.connection.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
    return cursor.fetchone()

def create_password_reset_token(email):
    """Generate password reset token (for future forgot password feature)"""
    import secrets
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Check if user exists
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        
        if not user:
            # Return success even if user doesn't exist (security best practice)
            return {
                'success': True,
                'message': 'If the email exists, a reset link will be sent'
            }
        
        # Generate secure token
        token = secrets.token_urlsafe(32)
        
        # Store token (you'll need to create a password_reset_tokens table)
        # For now, just return the token
        
        cursor.close()
        connection.close()
        
        return {
            'success': True,
            'message': 'Password reset token generated',
            'token': token,
            'user_id': user['id']
        }
        
    except Error as e:
        print(f"❌ Error creating reset token: {e}")
        return {
            'success': False,
            'message': 'Failed to create reset token'
        }
def create_password_reset_token(email):
    """Generate password reset token and store in database"""
    import secrets
    from datetime import datetime, timedelta
    
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Check if user exists
        cursor.execute("SELECT id, username FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        
        if not user:
            # Return success even if user doesn't exist (security best practice)
            return {
                'success': True,
                'message': 'If the email exists, a reset link will be sent',
                'user_found': False
            }
        
        # Generate secure token
        token = secrets.token_urlsafe(32)
        expiry = datetime.now() + timedelta(hours=1)  # Token valid for 1 hour
        
        # Create password_reset_tokens table if it doesn't exist
        create_table_query = """
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            token VARCHAR(255) NOT NULL UNIQUE,
            expiry DATETIME NOT NULL,
            used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
        cursor.execute(create_table_query)
        
        # Delete any existing tokens for this user
        cursor.execute("DELETE FROM password_reset_tokens WHERE user_id = %s", (user['id'],))
        
        # Insert new token
        insert_query = """
        INSERT INTO password_reset_tokens (user_id, token, expiry)
        VALUES (%s, %s, %s)
        """
        cursor.execute(insert_query, (user['id'], token, expiry))
        connection.commit()
        
        cursor.close()
        connection.close()
        
        return {
            'success': True,
            'message': 'Password reset token generated',
            'token': token,
            'user_id': user['id'],
            'username': user['username'],
            'email': email,
            'user_found': True
        }
        
    except Error as e:
        print(f"❌ Error creating reset token: {e}")
        return {
            'success': False,
            'message': 'Failed to create reset token'
        }

def verify_reset_token(token):
    """Verify if reset token is valid and not expired"""
    from datetime import datetime
    
    connection = get_db_connection()
    if not connection:
        return {'valid': False, 'message': 'Database connection failed'}
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        query = """
        SELECT rt.*, u.email, u.username 
        FROM password_reset_tokens rt
        JOIN users u ON rt.user_id = u.id
        WHERE rt.token = %s AND rt.used = FALSE
        """
        
        cursor.execute(query, (token,))
        result = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        if not result:
            return {'valid': False, 'message': 'Invalid or already used token'}
        
        # Check if expired
        if datetime.now() > result['expiry']:
            return {'valid': False, 'message': 'Token has expired'}
        
        return {
            'valid': True,
            'user_id': result['user_id'],
            'email': result['email'],
            'username': result['username']
        }
        
    except Error as e:
        print(f"❌ Error verifying reset token: {e}")
        return {'valid': False, 'message': 'Error verifying token'}

def reset_password_with_token(token, new_password):
    """Reset password using valid token"""
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    
    try:
        # First verify token
        verification = verify_reset_token(token)
        if not verification['valid']:
            return {'success': False, 'message': verification['message']}
        
        user_id = verification['user_id']
        
        # Hash new password
        hashed_password = hash_password(new_password)
        
        cursor = connection.cursor()
        
        # Update password
        cursor.execute(
            "UPDATE users SET password = %s WHERE id = %s",
            (hashed_password, user_id)
        )
        
        # Mark token as used
        cursor.execute(
            "UPDATE password_reset_tokens SET used = TRUE WHERE token = %s",
            (token,)
        )
        
        connection.commit()
        cursor.close()
        connection.close()
        
        print(f"✅ Password reset successful for user ID: {user_id}")
        
        return {
            'success': True,
            'message': 'Password reset successfully'
        }
        
    except Error as e:
        print(f"❌ Error resetting password: {e}")
        return {
            'success': False,
            'message': 'Failed to reset password'
        }
def create_or_login_google_user(google_data):
    """
    Create new user or login existing user via Google OAuth
    google_data: dict with email, name, picture from Google
    """
    connection = get_db_connection()
    if not connection:
        return {'success': False, 'message': 'Database connection failed'}
    
    try:
        cursor = connection.cursor(dictionary=True)
        email = google_data.get('email')
        
        # Check if user already exists
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        existing_user = cursor.fetchone()
        
        if existing_user:
            # User exists - just login
            print(f"✅ Google user already exists: {email}")
            
            # Update last login
            cursor.execute(
                "UPDATE users SET last_login = NOW() WHERE id = %s" ,
                (existing_user['id'],)
            )
            connection.commit()
            
            # Remove password from response
            existing_user.pop('password', None)
            
            cursor.close()
            connection.close()
            
            return {
                'success': True,
                'message': 'Login successful',
                'user': existing_user,
                'is_new_user': False
            }
        
        else:
            # User doesn't exist - create new account
            print(f"✅ Creating new Google user: {email}")
            
            # Generate username from email
            base_username = email.split('@')[0]
            username = base_username
            
            # Check if username exists and make it unique
            counter = 1
            while True:
                cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
                if not cursor.fetchone():
                    break
                username = f"{base_username}{counter}"
                counter += 1
            
            # Extract full name from Google data
            full_name = google_data.get('name', '')
            profile_pic = google_data.get('picture', None)
            
            # Create random password (user won't use it, but DB requires it)
            import secrets
            random_password = secrets.token_urlsafe(32)
            hashed_password = hash_password(random_password)
            
            # Insert new user
            insert_query = """
            INSERT INTO users (
                email, username, password, full_name, profile_pic,
                otp_verified, verification_method
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            
            values = (
                email,
                username,
                hashed_password,
                full_name,
                profile_pic,
                True,  # Google accounts are pre-verified
                'google'
            )
            
            cursor.execute(insert_query, values)
            connection.commit()
            
            user_id = cursor.lastrowid
            
            # Fetch the newly created user
            cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            new_user = cursor.fetchone()
            new_user.pop('password', None)
            
            print(f"✅ New Google user created with ID: {user_id}")
            
            cursor.close()
            connection.close()
            
            return {
                'success': True,
                'message': 'Account created and logged in successfully!',
                'user': new_user,
                'is_new_user': True
            }
            
    except Error as e:
        print(f"❌ Error in Google OAuth: {e}")
        if connection:
            connection.close()
        return {
            'success': False,
            'message': f'Google login failed: {str(e)}'
        }
if __name__ == "__main__":
    cleanup_orphaned_profile_pictures()