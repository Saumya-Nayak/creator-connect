# email_service.py — complete fixed version
from flask_mail import Message
from flask import current_app
from utils.network_utils import get_server_url

def _get_mail():
    """Get mail instance safely — avoids circular import timing issues"""
    from config.app_config import mail
    return mail

def send_otp_email(email, otp):
    """Send OTP verification email — synchronous for reliability"""
    try:
        mail = _get_mail()
        
        sender = current_app.config.get('MAIL_DEFAULT_SENDER') or \
                 current_app.config.get('MAIL_USERNAME')
        
        if not sender:
            print(f"❌ No sender configured — MAIL_DEFAULT_SENDER and MAIL_USERNAME are both None")
            return False
            
        if not current_app.config.get('MAIL_PASSWORD'):
            print(f"❌ MAIL_PASSWORD is not set")
            return False

        print(f"📧 Sending OTP to {email} from {sender}")

        msg = Message(
            subject='Your Verification Code - Creator Connect',
            sender=sender,
            recipients=[email],
            html=f'''
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
        )

        mail.send(msg)   # synchronous — no thread
        print(f"✅ OTP email sent successfully to {email}")
        return True

    except Exception as e:
        print(f"❌ Error sending OTP email: {str(e)}")
        import traceback
        traceback.print_exc()   # full stack trace in Railway logs
        return False


def send_password_reset_email(email, token, username):
    """Send password reset email"""
    try:
        mail = _get_mail()
        base_url = get_server_url()
        reset_link = f"{base_url}/frontend/reset-password.html?token={token}"
        sender = current_app.config.get('MAIL_DEFAULT_SENDER') or \
                 current_app.config.get('MAIL_USERNAME')

        msg = Message(
            sender=sender,
            subject='Password Reset Request - Creator Connect',
            recipients=[email],
            html=f'''
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #e336cc;">🔐 Creator Connect - Password Reset</h2>
                <p>Hello <strong>{username}</strong>,</p>
                <p>Click the button below to reset your password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" 
                       style="background-color: #e336cc; color: white; padding: 15px 30px; 
                              text-decoration: none; border-radius: 5px; display: inline-block;
                              font-weight: bold;">
                        Reset Password
                    </a>
                </div>
                <p style="color: #999; font-size: 12px; margin-top: 20px;">
                    This link expires in 15 minutes. If you didn't request this, ignore this email.
                </p>
            </div>
            '''
        )
        mail.send(msg)
        print(f"✅ Password reset email sent to {email}")
        return True

    except Exception as e:
        print(f"❌ Error sending password reset email: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def send_registration_success_email(email, username):
    """Send registration success email"""
    try:
        mail = _get_mail()
        base_url = get_server_url()
        sender = current_app.config.get('MAIL_DEFAULT_SENDER') or \
                 current_app.config.get('MAIL_USERNAME')

        msg = Message(
            sender=sender,
            subject="🎉 Welcome to Creator Connect!",
            recipients=[email],
            html=f"""
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
                           style="background-color: #e336cc; padding: 14px 28px; 
                                  color: #fff; text-decoration: none; 
                                  font-weight: bold; border-radius: 6px; display: inline-block;">
                            Login to Your Account
                        </a>
                    </div>
                    <p style="font-size: 11px; color: #aaa; text-align: center; margin-top: 25px;">
                        © 2025 Creator Connect • All rights reserved.
                    </p>
                </div>
            </div>
            """
        )
        mail.send(msg)
        print(f"✅ Registration email sent to {email}")
        return True

    except Exception as e:
        print(f"❌ Error sending registration email: {str(e)}")
        import traceback
        traceback.print_exc()
        return False