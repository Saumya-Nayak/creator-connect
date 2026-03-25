import socket
import os
from flask import request

def get_local_ip():
    """Get the local IP address of the machine"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "localhost"

def get_server_url():
    """
    Get the base URL for the server
    Works in both development and production (Railway) environments
    """
    # Check for Railway production environment first
    railway_url = os.getenv('RAILWAY_STATIC_URL')
    if railway_url:
        # Remove trailing slash if present
        return railway_url.rstrip('/')
    
    # Check if running in a request context (Flask app)
    try:
        from flask import current_app
        if current_app:
            # Use the request's host URL if available
            if request and request.host_url:
                return request.host_url.rstrip('/')
    except (RuntimeError, ImportError):
        pass
    
    # Development fallback - use local IP
    local_ip = get_local_ip()
    port = int(os.getenv('PORT', 5000))  # Use Railway's PORT or default to 5000
    
    if local_ip != "localhost":
        return f"http://{local_ip}:{port}"
    return f"http://localhost:{port}"

def get_full_url(path):
    """
    Get full URL for a given path
    Ensures proper URL formatting without double slashes
    """
    base_url = get_server_url()
    # Remove leading slash from path if present
    clean_path = path.lstrip('/')
    # Combine base URL and path
    return f"{base_url}/{clean_path}"