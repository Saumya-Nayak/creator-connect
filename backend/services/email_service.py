import requests
from flask import current_app
from utils.network_utils import get_server_url

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

def _send_via_brevo_api(to_email, subject, html_content):
    """Send email via Brevo HTTP API — bypasses blocked SMTP ports on Railway"""
    api_key = current_app.config.get('BREVO_API_KEY')
    sender_email = current_app.config.get('MAIL_DEFAULT_SENDER', 'saumyan24@gmail.com')
    
    if not api_key:
        print("❌ BREVO_API_KEY not set in config")
        return False

    payload = {
        "sender": {"name": "Creator Connect", "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content
    }

    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": api_key
    }

    try:
        response = requests.post(BREVO_API_URL, json=payload, headers=headers, timeout=10)
        if response.status_code in (200, 201):
            print(f"✅ Email sent via Brevo API to {to_email}")
            return True
        else:
            print(f"❌ Brevo API error {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Brevo API request failed: {e}")
        return False


def send_otp_email(email, otp):
    """Send OTP verification email"""
    html = f'''
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e336cc;">Creator Connect: Email Verification</h2>
        <p>Your verification code is:</p>
        <h1 style="background-color: #f4f4f4; padding: 20px; text-align: center; 
                   letter-spacing: 5px; color:#e336cc;">
            {otp}
        </h1>
        <p>This code will expire in 10 minutes.</p>
        <p style="color: #999; font-size: 12px;">
            If you didn't request this code, please ignore this email.
        </p>
    </div>
    '''
    return _send_via_brevo_api(email, "Your Verification Code - Creator Connect", html)


def send_password_reset_email(email, token, username):
    """Send password reset email"""
    try:
        base_url = get_server_url()
        reset_link = f"{base_url}/frontend/reset-password.html?token={token}"
        html = f'''
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #e336cc;">🔐 Creator Connect - Password Reset</h2>
            <p>Hello <strong>{username}</strong>,</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_link}" 
                   style="background-color: #e336cc; color: white; padding: 15px 30px; 
                          text-decoration: none; border-radius: 5px; display: inline-block;
                          font-weight: bold;">Reset Password</a>
            </div>
            <p style="color: #999; font-size: 12px;">
                This link expires in 15 minutes. If you didn't request this, ignore this email.
            </p>
        </div>
        '''
        return _send_via_brevo_api(email, "Password Reset Request - Creator Connect", html)
    except Exception as e:
        print(f"❌ Error sending password reset email: {e}")
        return False


def send_registration_success_email(email, username):
    """Send registration success email"""
    try:
        base_url = get_server_url()
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; 
                    background: linear-gradient(135deg, #ffb6f3, #e336cc, #ff86d8); 
                    padding: 25px; border-radius: 15px;">
            <div style="background: #ffffff; border-radius: 12px; padding: 30px; color: #333;">
                <h1 style="text-align: center; color: #e336cc; margin-top: 0;">
                    🎀 Welcome, {username}! 🎀
                </h1>
                <p style="font-size: 15px; line-height: 1.7;">
                    Your <strong>Creator Connect</strong> account has been successfully created! ✨
                </p>
                <div style="text-align:center; margin-top: 30px;">
                    <a href="{base_url}/login.html"
                       style="background-color: #e336cc; padding: 14px 28px; color: #fff; 
                              text-decoration: none; font-weight: bold; border-radius: 6px; 
                              display: inline-block;">
                        Login to Your Account
                    </a>
                </div>
                <p style="font-size: 11px; color: #aaa; text-align: center; margin-top: 25px;">
                    © 2025 Creator Connect • All rights reserved.
                </p>
            </div>
        </div>
        """
        return _send_via_brevo_api(email, "🎉 Welcome to Creator Connect!", html)
    except Exception as e:
        print(f"❌ Error sending registration email: {e}")
        return False