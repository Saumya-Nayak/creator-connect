import jwt
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-this-in-production')
JWT_ALGORITHM = 'HS256'

# Session durations
REMEMBER_ME_DAYS = 7      # 7 days for "Remember Me"
SESSION_ONLY_HOURS = 24   # 24 hours for regular session

def generate_token(user_id, remember_me=False):
    """
    Generate JWT token for user authentication
    
    Args:
        user_id: User's database ID
        remember_me: If True, token lasts 7 days. If False, lasts 24 hours
    
    Returns:
        JWT token string
    """
    try:
        # Set expiration based on remember_me flag
        if remember_me:
            expiration = datetime.utcnow() + timedelta(days=REMEMBER_ME_DAYS)
            duration_msg = f"{REMEMBER_ME_DAYS} days"
        else:
            expiration = datetime.utcnow() + timedelta(hours=SESSION_ONLY_HOURS)
            duration_msg = f"{SESSION_ONLY_HOURS} hours"
        
        # Create token payload
        payload = {
            'user_id': user_id,
            'exp': expiration,
            'iat': datetime.utcnow(),
            'remember_me': remember_me
        }
        
        # Generate token
        token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        
        print(f"✅ JWT token generated for user {user_id} (expires in {duration_msg})")
        
        return token
        
    except Exception as e:
        print(f"❌ Error generating token: {e}")
        return None

def verify_token(token):
    """
    Verify and decode JWT token
    
    Args:
        token: JWT token string
    
    Returns:
        dict with 'valid' (bool), 'user_id' (if valid), 'message' (if invalid)
    """
    try:
        # Decode and verify token
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        
        user_id = payload.get('user_id')
        remember_me = payload.get('remember_me', False)
        exp = payload.get('exp')
        
        # Calculate remaining time
        if exp:
            remaining_seconds = exp - datetime.utcnow().timestamp()
            remaining_hours = remaining_seconds / 3600
            print(f"✅ Token valid for user {user_id} (expires in {remaining_hours:.1f} hours)")
        
        return {
            'valid': True,
            'user_id': user_id,
            'remember_me': remember_me,
            'expires_at': exp
        }
        
    except jwt.ExpiredSignatureError:
        print("❌ Token has expired")
        return {
            'valid': False,
            'message': 'Token has expired. Please login again.'
        }
        
    except jwt.InvalidTokenError as e:
        print(f"❌ Invalid token: {e}")
        return {
            'valid': False,
            'message': 'Invalid token. Please login again.'
        }
        
    except Exception as e:
        print(f"❌ Error verifying token: {e}")
        return {
            'valid': False,
            'message': 'Token verification failed.'
        }

def refresh_token(old_token):
    """
    Refresh an existing token (generate new one with same user_id)
    
    Args:
        old_token: Existing JWT token
    
    Returns:
        New JWT token or None if old token is invalid
    """
    try:
        # Verify old token (allow expired tokens for refresh)
        payload = jwt.decode(
            old_token, 
            JWT_SECRET_KEY, 
            algorithms=[JWT_ALGORITHM],
            options={"verify_exp": False}  # Don't verify expiration for refresh
        )
        
        user_id = payload.get('user_id')
        remember_me = payload.get('remember_me', False)
        
        # Generate new token with same remember_me setting
        new_token = generate_token(user_id, remember_me)
        
        print(f"✅ Token refreshed for user {user_id}")
        return new_token
        
    except Exception as e:
        print(f"❌ Error refreshing token: {e}")
        return None

def decode_token_without_verification(token):
    """
    Decode token without verification (useful for debugging)
    
    Args:
        token: JWT token string
    
    Returns:
        Decoded payload or None
    """
    try:
        payload = jwt.decode(
            token, 
            JWT_SECRET_KEY, 
            algorithms=[JWT_ALGORITHM],
            options={"verify_signature": False, "verify_exp": False}
        )
        return payload
    except Exception as e:
        print(f"❌ Error decoding token: {e}")
        return None

def get_token_expiry_time(token):
    """
    Get the expiration time of a token
    
    Args:
        token: JWT token string
    
    Returns:
        datetime object of expiration or None
    """
    try:
        payload = jwt.decode(
            token, 
            JWT_SECRET_KEY, 
            algorithms=[JWT_ALGORITHM],
            options={"verify_exp": False}
        )
        
        exp_timestamp = payload.get('exp')
        if exp_timestamp:
            return datetime.fromtimestamp(exp_timestamp)
        return None
        
    except Exception as e:
        print(f"❌ Error getting token expiry: {e}")
        return None