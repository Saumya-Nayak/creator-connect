import os
import cloudinary
import cloudinary.uploader
import cloudinary.api
from flask_mail import Mail

# Initialize mail object
mail = Mail()

def configure_app(app):
    """Configure Flask application settings"""
    
    # Security Configuration
    app.config['SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-this-in-production')
    app.config['JWT_EXPIRATION_HOURS'] = 24
    
    # Cloudinary Configuration
    cloudinary.config(
        cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME', 'ddmgpahse'),
        api_key=os.getenv('CLOUDINARY_API_KEY', '751795975689326'),
        api_secret=os.getenv('CLOUDINARY_API_SECRET', 'DBlLOaAIHfjP0OOx9i9txa9fM8M'),
        secure=True
    )
    
    # Email Configuration
    app.config['MAIL_SERVER'] = 'smtp.gmail.com'
    app.config['MAIL_PORT'] = 587
    app.config['MAIL_USE_TLS'] = True
    app.config['MAIL_USERNAME'] = os.getenv('EMAIL_USER')
    app.config['MAIL_PASSWORD'] = os.getenv('EMAIL_APP_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('EMAIL_USER')
    
    return app