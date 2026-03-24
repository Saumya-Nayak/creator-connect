import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv
load_dotenv()
def get_db_connection():
    """Create and return a database connection"""
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=int(os.getenv('DB_PORT', 3306)),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'Creator_Connect'),
            charset='utf8mb4',  # ✅ CRITICAL: Add this
            collation='utf8mb4_unicode_ci',  # ✅ CRITICAL: Add this
            use_unicode=True  # ✅ CRITICAL: Add this
        )
        
        if connection.is_connected():
            cursor = connection.cursor()
            cursor.execute("SET NAMES utf8mb4")
            cursor.execute("SET CHARACTER SET utf8mb4")
            cursor.execute("SET character_set_connection=utf8mb4")
            cursor.close()
            print("✅ Successfully connected to MySQL database with UTF-8 support")
            print("✅ Successfully connected to MySQL database")
            return connection
            
    except Error as e:
        print(f"❌ Error connecting to MySQL: {e}")
        return None

def create_database():
    """Create database if it doesn't exist"""
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=int(os.getenv('DB_PORT', 3306)),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            charset='utf8mb4',  
            collation='utf8mb4_unicode_ci'
        )
        
        if connection.is_connected():
            cursor = connection.cursor()
            db_name = os.getenv('DB_NAME', 'Creator_Connect')
            
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
            print(f"✅ Database '{db_name}' created or already exists")
            
            cursor.close()
            connection.close()
            
    except Error as e:
        print(f"❌ Error creating database: {e}")

def create_roles_table():
    """Create roles table to define role types"""
    connection = get_db_connection()
    if not connection:
        return False
    
    try:
        cursor = connection.cursor()
        
        # Create roles table
        create_table_query = """
        CREATE TABLE IF NOT EXISTS roles (
            role_id INT PRIMARY KEY,
            role_name VARCHAR(50) UNIQUE NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        
        cursor.execute(create_table_query)
        
        # Insert default roles
        insert_roles_query = """
        INSERT INTO roles (role_id, role_name, description) 
        VALUES 
            (0, 'Creator', 'Content creator with standard permissions'),
            (1, 'Admin', 'Administrator with full system access')
        ON DUPLICATE KEY UPDATE role_name = VALUES(role_name);
        """
        
        cursor.execute(insert_roles_query)
        connection.commit()
        print("✅ Roles table created and populated successfully")
        
        cursor.close()
        connection.close()
        return True
        
    except Error as e:
        print(f"❌ Error creating roles table: {e}")
        return False

def create_users_table():
    """Create users table with all registration fields including role"""
    connection = get_db_connection()
    if not connection:
        return False
    
    try:
        cursor = connection.cursor()
        
        create_table_query = """
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            full_name VARCHAR(100),
            phone VARCHAR(20),
            profile_pic VARCHAR(255),
            country VARCHAR(100),
            state VARCHAR(100),
            city VARCHAR(100),
            gender ENUM('Male', 'Female', 'Other'),
            date_of_birth DATE,
            about_me TEXT,
            website_url VARCHAR(255) DEFAULT NULL,
            role INT DEFAULT 0 NOT NULL,
            is_private BOOLEAN DEFAULT FALSE,
            otp_verified BOOLEAN DEFAULT FALSE,
            verification_method VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_email (email),
            INDEX idx_username (username),
            INDEX idx_role (role),
            FOREIGN KEY (role) REFERENCES roles(role_id) ON DELETE RESTRICT ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        
        cursor.execute(create_table_query)
        connection.commit()
        print("✅ Users table created successfully")
        
        cursor.close()
        connection.close()
        return True
        
    except Error as e:
        print(f"❌ Error creating users table: {e}")
        return False

def initialize_database():
    """Initialize database and tables"""
    print("🔧 Initializing database...")
    create_database()
    create_roles_table()  # Create roles table first
    create_users_table()  # Then create users table with foreign key
    
    # Add these lines to create posts-related tables
    #from database import create_posts_tables, create_profile_tables
    #create_posts_tables.create_posts_tables()
    #create_profile_tables.create_profile_tables()
    
    print("✅ Database initialization complete!")

if __name__ == "__main__":
    initialize_database()