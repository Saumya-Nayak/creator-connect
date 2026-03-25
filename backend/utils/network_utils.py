import socket
import os

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
    """Get the base URL for the server (works on any device)"""
    local_ip = get_local_ip()
    port = int(os.getenv('FRONTEND_PORT', 5500))
    
    # Use IP address for network access
    if local_ip != "localhost":
        return f"http://{local_ip}:{port}"
    return f"http://localhost:{port}"