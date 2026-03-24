from flask_mail import Message
from config.app_config import mail
from flask import current_app

def send_otp_email(email, otp):
    """Send OTP verification email"""
    try:
        # Get sender from app config
        sender = current_app.config.get('MAIL_DEFAULT_SENDER', 'saumyan24@gmail.com')
        
        msg = Message(
            subject='Your Verification Code',
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
        mail.send(msg)
        print(f"✅ OTP email sent to {email}")
        return True
    except Exception as e:
        print(f"❌ Error sending OTP email: {str(e)}")
        return False

def send_password_reset_email(email, token, username):
    """Send password reset email with link"""
    try:
        base_url = get_server_url()
        reset_link = f"{base_url}/frontend/reset-password.html?token={token}"
        
        msg = Message(
            sender=("Creator_Connect", "saumyan24@gmail.com"),
            subject='Password Reset Request - Creator Connect',
            recipients=[email],
            html=f'''
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #e336cc;">🔐 Creator Connect - Password Reset</h2>
                <p>Hello <strong>{username}</strong>,</p>
                <p>We received a request to reset your password. Click the button below to reset it:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" 
                       style="background-color: #e336cc; 
                              color: white; 
                              padding: 15px 30px; 
                              text-decoration: none; 
                              border-radius: 5px; 
                              display: inline-block;
                              font-weight: bold;">
                        Reset Password
                    </a>
                </div>
                
                <p style="font-size: 13px; color: #666;">Or copy and paste this link into your browser:</p>
                <div style="background-color: #f4f4f4; padding: 12px; border-radius: 5px; word-break: break-all; font-size: 12px; font-family: monospace;">
                    {reset_link}
                </div>
                
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <p style="margin: 0; color: #856404; font-size: 13px;">
                        ⏱️ <strong>This link will expire in 15 minutes</strong>
                    </p>
                </div>
                
                <p style="color: #999; font-size: 12px; margin-top: 20px;">
                    If you didn't request this password reset, please ignore this email. 
                    Your password will remain unchanged.
                </p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                
                <p style="color: #999; font-size: 11px; text-align: center;">
                    © 2024 Creator Connect. All rights reserved.
                </p>
            </div>
            '''
        )
        mail.send(msg)
        return True
    except Exception as e:
        print(f"❌ Error sending password reset email: {str(e)}")
        return False

def send_registration_success_email(email, username):
    """Send a beautiful pink-themed registration success email"""
    try:
        msg = Message(
            sender=("Creator_Connect", "saumyan24@gmail.com"),
            subject="🎉 Welcome to Creator Connect!",
            recipients=[email],
            html=f"""
            <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; 
                        background: linear-gradient(135deg, #ffb6f3, #e336cc, #ff86d8); 
                        padding: 25px; border-radius: 15px; color: #fff;">
                
                <div style="background: #ffffff; border-radius: 12px; padding: 30px; color: #333;">
                    
                    <h1 style="text-align: center; color: #e336cc; margin-top: 0;">
                        🎀 Welcome, {username}! 🎀
                    </h1>

                    <p style="font-size: 15px; line-height: 1.7;">
                        We're excited to let you know that your 
                        <strong>Creator Connect</strong> account has been successfully created!  
                        Your journey in the creator community begins now. ✨
                    </p>

                    <div style="background: #ffe7fa; border-left: 4px solid #e336cc; 
                                padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; color: #e336cc; font-size: 14px;">
                            🌸 You can now log in and explore your dashboard, connect with creators, 
                            and start building your profile!
                        </p>
                    </div>

                    <div style="text-align:center; margin-top: 30px;">
                        <a href="{get_server_url()}/frontend/login.html"
                           style="background-color: #e336cc; padding: 14px 28px; 
                                  color: #fff; text-decoration: none; 
                                  font-weight: bold; border-radius: 6px;
                                  display: inline-block;">
                            Login to Your Account
                        </a>
                    </div>

                    <p style="font-size: 12px; color: #888; text-align: center; margin-top: 35px;">
                        If you did not create this account, please contact us immediately.
                    </p>

                    <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">

                    <p style="font-size: 11px; color: #aaa; text-align: center;">
                        © 2025 Creator Connect • All rights reserved.
                    </p>
                </div>
            </div>
            """
        )
        mail.send(msg)
        return True

    except Exception as e:
        print(f"❌ Error sending registration email: {str(e)}")
        return False


# ✅ NEW: Send account suspension notification email
def send_account_suspension_email(email, username, locked_until_str, reason='Admin action'):
    """Send email to user when their account is suspended by admin"""
    try:
        msg = Message(
            sender=("Creator_Connect", "saumyan24@gmail.com"),
            subject="⚠️ Your Creator Connect Account Has Been Suspended",
            recipients=[email],
            html=f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                
                <div style="background: #fff5f5; border: 2px solid #ef4444; border-radius: 12px; padding: 30px;">
                    
                    <h2 style="color: #ef4444; margin-top: 0; text-align: center;">
                        ⚠️ Account Suspended
                    </h2>

                    <p style="font-size: 15px;">Hello <strong>{username}</strong>,</p>

                    <p style="font-size: 14px; color: #444; line-height: 1.7;">
                        Your <strong>Creator Connect</strong> account has been temporarily suspended 
                        by our moderation team.
                    </p>

                    <div style="background: #fff; border-left: 4px solid #ef4444; padding: 15px; 
                                border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">
                            <strong>Reason:</strong> {reason}
                        </p>
                        <p style="margin: 0; font-size: 13px; color: #666;">
                            <strong>Suspended Until:</strong> {locked_until_str}
                        </p>
                    </div>

                    <p style="font-size: 13px; color: #555; line-height: 1.7;">
                        During this period, you will not be able to log in to your account 
                        or access any features. Your posts and profile will not be visible 
                        to other users.
                    </p>

                    <p style="font-size: 13px; color: #555; line-height: 1.7;">
                        If you believe this suspension was made in error, please reach out 
                        to our support team.
                    </p>

                    <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">

                    <p style="font-size: 11px; color: #aaa; text-align: center;">
                        © 2025 Creator Connect • All rights reserved.
                    </p>
                </div>
            </div>
            """
        )
        mail.send(msg)
        print(f"✅ Suspension email sent to {email}")
        return True
    except Exception as e:
        print(f"❌ Error sending suspension email: {str(e)}")
        return False


# ✅ NEW: Send account unlock notification email
def send_account_unlock_email(email, username):
    """Send email to user when their suspended account is unlocked by admin"""
    try:
        msg = Message(
            sender=("Creator_Connect", "saumyan24@gmail.com"),
            subject="✅ Your Creator Connect Account Has Been Restored",
            recipients=[email],
            html=f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                
                <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 30px;">
                    
                    <h2 style="color: #22c55e; margin-top: 0; text-align: center;">
                        ✅ Account Restored
                    </h2>

                    <p style="font-size: 15px;">Hello <strong>{username}</strong>,</p>

                    <p style="font-size: 14px; color: #444; line-height: 1.7;">
                        Great news! Your <strong>Creator Connect</strong> account has been 
                        restored and you can now log in again.
                    </p>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{get_server_url()}/frontend/login.html"
                           style="background-color: #22c55e; padding: 14px 28px; 
                                  color: #fff; text-decoration: none; 
                                  font-weight: bold; border-radius: 6px;
                                  display: inline-block;">
                            Login Now
                        </a>
                    </div>

                    <p style="font-size: 13px; color: #555; text-align: center;">
                        Please ensure you follow our community guidelines going forward.
                    </p>

                    <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">

                    <p style="font-size: 11px; color: #aaa; text-align: center;">
                        © 2025 Creator Connect • All rights reserved.
                    </p>
                </div>
            </div>
            """
        )
        mail.send(msg)
        print(f"✅ Unlock email sent to {email}")
        return True
    except Exception as e:
        print(f"❌ Error sending unlock email: {str(e)}")
        return False