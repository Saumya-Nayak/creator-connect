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
    Returns complete URL with https:// for production
    """
    # Check for Railway production environment first
    railway_url = os.getenv('RAILWAY_STATIC_URL')
    
    if railway_url:
        # Ensure it has https:// prefix
        if not railway_url.startswith(('http://', 'https://')):
            railway_url = f"https://{railway_url}"
        return railway_url.rstrip('/')
    
    # Check if running in a request context
    try:
        from flask import current_app
        if current_app and request:
            host_url = request.host_url.rstrip('/')
            # In production, request.host_url should already have https://
            return host_url
    except (RuntimeError, ImportError):
        pass
    
    # Development fallback
    local_ip = get_local_ip()
    port = int(os.getenv('PORT', 5000))
    
    if local_ip != "localhost":
        return f"http://{local_ip}:{port}"
    return f"http://localhost:{port}"

def get_full_url(path):
    """
    Get full URL for a given path
    Ensures proper formatting with protocol
    """
    base_url = get_server_url()
    # Remove leading slash from path if present
    clean_path = path.lstrip('/')
    # Combine base URL and path
    full_url = f"{base_url}/{clean_path}"
    
    # Log the generated URL for debugging
    print(f"🔗 Generated URL: {full_url}")
    
    return full_url