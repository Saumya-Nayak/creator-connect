import random
import time

# Store OTPs temporarily (in-memory storage)
otp_store = {}

def generate_otp():
    """Generate a 6-digit OTP"""
    return str(random.randint(100000, 999999))

def store_otp(key, otp, expiry_minutes=10):
    """Store OTP with expiry time"""
    otp_store[key] = {
        'otp': otp,
        'expiry': time.time() + (expiry_minutes * 60),
        'attempts': 0
    }
    return True

def verify_otp(key, otp):
    """Verify OTP against stored value"""
    stored_data = otp_store.get(key)
    
    if not stored_data:
        return {
            'success': False,
            'message': 'OTP expired or not found. Please request a new one.'
        }
    
    # Check expiry
    if time.time() > stored_data['expiry']:
        del otp_store[key]
        return {
            'success': False,
            'message': 'OTP has expired. Please request a new one.'
        }
    
    # Check attempts
    if stored_data['attempts'] >= 3:
        del otp_store[key]
        return {
            'success': False,
            'message': 'Too many failed attempts. Please request a new OTP.'
        }
    
    # Verify OTP
    if stored_data['otp'] == otp:
        del otp_store[key]
        return {
            'success': True,
            'message': 'OTP verified successfully!'
        }
    else:
        stored_data['attempts'] += 1
        otp_store[key] = stored_data
        return {
            'success': False,
            'message': f"Invalid OTP. {3 - stored_data['attempts']} attempts remaining."
        }

def clear_otp(key):
    """Clear OTP from storage"""
    if key in otp_store:
        del otp_store[key]
    return True