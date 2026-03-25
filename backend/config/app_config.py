import os
import cloudinary
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
        cloud_name = "ddmgpahse", 
        api_key = "751795975689326", 
        api_secret = "DBlLOaAIHfjP0OOx9i9txa9fM8M",
        secure=True
    )

    # Email Configuration
    app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp-relay.brevo.com')
    app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
    app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
    app.config['MAIL_USE_SSL'] = os.getenv('MAIL_USE_SSL', 'False').lower() == 'true'
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER') or os.getenv('MAIL_USERNAME')

    return app  # ← must be inside the function, indented with 4 spaces