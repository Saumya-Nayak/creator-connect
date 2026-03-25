import requests
from flask import current_app
from utils.network_utils import get_full_url

# Define the Brevo API URL at the top
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
        
        # ✅ FIXED: Correct if statement syntax
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
    """Send password reset email with correct URL"""
    try:
        # Get the full URL with https://
        reset_link = get_full_url(f"frontend/reset-password.html?token={token}")
        
        # Log for debugging
        print(f"📧 Sending password reset email to: {email}")
        print(f"🔗 Reset link: {reset_link}")
        
        html = f'''
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <div style="text-align: center; padding: 20px 0;">
                    <h1 style="color: #e336cc; margin: 0;">Creator Connect</h1>
                    <p style="color: #666; font-size: 14px;">Password Reset Request</p>
                </div>
                
                <div style="padding: 20px;">
                    <p style="color: #333; font-size: 16px;">Hello <strong>{username}</strong>,</p>
                    <p style="color: #666; line-height: 1.6;">We received a request to reset your password. Click the button below to create a new password:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_link}" 
                           style="background-color: #e336cc; 
                                  color: white; 
                                  padding: 12px 30px; 
                                  text-decoration: none; 
                                  border-radius: 5px; 
                                  display: inline-block;
                                  font-weight: bold;
                                  font-size: 16px;">
                            Reset Password
                        </a>
                    </div>
                    
                    <p style="color: #666; font-size: 14px; line-height: 1.5;">
                        <strong>📝 Important:</strong> This link will expire in 15 minutes for security reasons.
                    </p>
                    
                    <p style="color: #999; font-size: 12px; margin-top: 20px; padding: 10px; background-color: #f9f9f9; border-left: 3px solid #e336cc; word-break: break-all;">
                        <strong>🔗 Direct link:</strong><br>
                        <a href="{reset_link}" style="color: #e336cc; text-decoration: none;">{reset_link}</a>
                    </p>
                    
                    <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
                    
                    <p style="color: #999; font-size: 12px;">
                        If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
                    </p>
                    
                    <p style="color: #999; font-size: 12px; margin-top: 20px;">
                        <strong>Security Tip:</strong> Never share this link with anyone. Creator Connect will never ask for your password.
                    </p>
                </div>
                
                <div style="text-align: center; padding: 20px 0 10px; border-top: 1px solid #eee; margin-top: 20px;">
                    <p style="color: #999; font-size: 11px;">
                        © 2025 Creator Connect • All rights reserved.<br>
                        This is an automated message, please do not reply.
                    </p>
                </div>
            </div>
        </body>
        </html>
        '''
        return _send_via_brevo_api(email, "Password Reset Request - Creator Connect", html)
    except Exception as e:
        print(f"❌ Error sending password reset email: {e}")
        import traceback
        traceback.print_exc()
        return False


def send_registration_success_email(email, username):
    """Send registration success email"""
    try:
        login_url = get_full_url("frontend/login.html")
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
            <div style="max-width: 650px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #ffb6f3, #e336cc, #ff86d8); padding: 25px; border-radius: 15px;">
                    <div style="background: #ffffff; border-radius: 12px; padding: 30px; color: #333;">
                        <h1 style="text-align: center; color: #e336cc; margin-top: 0;">
                            🎀 Welcome, {username}! 🎀
                        </h1>
                        <p style="font-size: 15px; line-height: 1.7;">
                            Your <strong>Creator Connect</strong> account has been successfully created! ✨
                        </p>
                        <div style="text-align:center; margin-top: 30px;">
                            <a href="{login_url}"
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
            </div>
        </body>
        </html>
        """
        return _send_via_brevo_api(email, "🎉 Welcome to Creator Connect!", html)
    except Exception as e:
        print(f"❌ Error sending registration email: {e}")
        return False