from flask import Blueprint, jsonify
from datetime import datetime
from database.db import get_db_connection
from utils.network_utils import get_local_ip, get_server_url

utility_bp = Blueprint('utility', __name__)

@utility_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    db_status = 'Connected' if get_db_connection() else 'Disconnected'
    
    return jsonify({
        'status': 'OK',
        'message': 'Server is running',
        'database': db_status,
        'server_ip': get_local_ip(),
        'server_url': get_server_url(),
        'timestamp': datetime.now().isoformat()
    })

@utility_bp.route('/test-db', methods=['GET'])
def test_database():
    """Test database connection"""
    connection = get_db_connection()
    if connection:
        connection.close()
        return jsonify({
            'success': True,
            'message': 'Database connection successful!'
        })
    else:
        return jsonify({
            'success': False,
            'message': 'Database connection failed'
        }), 500