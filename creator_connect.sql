-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               8.4.3 - MySQL Community Server - GPL
-- Server OS:                    Win64
-- HeidiSQL Version:             12.8.0.6908
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for creator_connect
CREATE DATABASE IF NOT EXISTS `creator_connect` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `creator_connect`;

-- Dumping structure for table creator_connect.admin_actions_log
CREATE TABLE IF NOT EXISTS `admin_actions_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL,
  `action_type` enum('withdrawal_approved','withdrawal_rejected','payment_verified','seller_payment_verified','transaction_refunded','user_suspended','post_removed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `action_details` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin_actions` (`admin_id`),
  KEY `idx_action_type` (`action_type`),
  CONSTRAINT `admin_actions_log_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.admin_actions_log: ~10 rows (approximately)
INSERT INTO `admin_actions_log` (`id`, `admin_id`, `action_type`, `reference_type`, `reference_id`, `action_details`, `ip_address`, `created_at`) VALUES
	(1, 9, 'withdrawal_approved', 'withdrawal_request', 1, 'Approved ₹100.00 withdrawal for Jiral Bavishi. Ref: 22', '127.0.0.1', '2026-02-25 03:25:59'),
	(2, 1, 'post_removed', 'post', 4, 'Post 4 deactivated by admin', '127.0.0.1', '2026-02-25 03:29:04'),
	(3, 1, 'post_removed', 'post', 4, 'Post 4 reactivated by admin', '127.0.0.1', '2026-02-25 03:29:12'),
	(4, 9, 'withdrawal_approved', 'withdrawal_request', 3, 'Approved ₹100.00 withdrawal for Jiral Bavishi. Ref: 2222222222222', '127.0.0.1', '2026-02-25 04:45:16'),
	(5, 9, 'user_suspended', 'user', 9, 'User @Twinkal suspended for 24h until Feb 26, 2026 at 10:33 AM. Reason: Violet', '127.0.0.1', '2026-02-25 05:03:33'),
	(6, 9, 'withdrawal_approved', 'withdrawal_request', 4, 'Approved ₹200.00 withdrawal for Jiral Bavishi. Ref: 2300002', '127.0.0.1', '2026-02-28 13:35:23'),
	(7, 9, 'withdrawal_rejected', 'withdrawal_request', 2, 'Rejected ₹200.00 withdrawal for Twinkle Nai. Reason: Order issue arise', '127.0.0.1', '2026-02-28 13:35:56'),
	(8, 9, 'withdrawal_approved', 'withdrawal_request', 5, 'Approved ₹600.00 withdrawal for Art World. Ref: 2222222222222', '127.0.0.1', '2026-03-03 16:48:57'),
	(9, 9, 'withdrawal_approved', 'withdrawal_request', 6, 'Approved ₹234.00 withdrawal for Art World. Ref: 2222222222222', '127.0.0.1', '2026-03-03 17:15:03'),
	(10, 9, 'withdrawal_approved', 'withdrawal_request', 7, 'Approved ₹5700.00 withdrawal for Art World. Ref: 2222222222222', '127.0.0.1', '2026-03-03 17:15:31'),
	(11, 9, 'withdrawal_approved', 'withdrawal_request', 8, 'Approved ₹200.00 withdrawal for Jiral Bavishi. Ref: 2222222222222', '127.0.0.1', '2026-03-03 17:16:13'),
	(12, 9, 'withdrawal_approved', 'withdrawal_request', 9, 'Approved ₹100.00 withdrawal for Jiral Bavishi. Ref: 2222222222222', '127.0.0.1', '2026-03-03 17:20:51'),
	(13, 9, 'withdrawal_approved', 'withdrawal_request', 10, 'Approved ₹100.00 withdrawal for Plant Shoppe. Ref: 2222222222222', '127.0.0.1', '2026-03-08 11:25:52'),
	(14, 9, 'user_suspended', 'user', 2, 'User @Saumya suspended for 168h until Mar 16, 2026 at 12:56 AM. Reason: Violation of Community Rule', '127.0.0.1', '2026-03-08 19:26:21'),
	(15, 9, 'withdrawal_approved', 'withdrawal_request', 11, 'Approved ₹10000.00 withdrawal for Soham Jain. Ref: 2222222222222', '127.0.0.1', '2026-03-09 06:47:23'),
	(16, 9, 'withdrawal_approved', 'withdrawal_request', 12, 'Approved ₹100.00 withdrawal for Lucky Kasturi. Ref: 2222222222222', '127.0.0.1', '2026-03-10 10:52:24'),
	(17, 9, 'withdrawal_approved', 'withdrawal_request', 13, 'Approved ₹200.00 withdrawal for Jiral Bavishi. Ref: 2222222222222', '127.0.0.1', '2026-03-11 08:14:41');

-- Dumping structure for table creator_connect.admin_activity_log
CREATE TABLE IF NOT EXISTS `admin_activity_log` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL,
  `action_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_details` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `idx_admin_id` (`admin_id`),
  KEY `idx_action_type` (`action_type`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `admin_activity_log_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.admin_activity_log: ~8 rows (approximately)
INSERT INTO `admin_activity_log` (`log_id`, `admin_id`, `action_type`, `action_details`, `ip_address`, `user_agent`, `created_at`) VALUES
	(1, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-24 16:56:15'),
	(2, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-25 00:53:05'),
	(3, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-25 02:49:35'),
	(4, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-25 04:39:13'),
	(5, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-25 07:19:39'),
	(6, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-26 08:03:52'),
	(7, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-27 11:52:10'),
	(8, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-27 12:13:17'),
	(9, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-28 02:37:38'),
	(10, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-28 03:11:44'),
	(11, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-28 11:14:17'),
	(12, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-03 08:09:38'),
	(13, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-03 16:10:35'),
	(14, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-08 09:48:47'),
	(15, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-08 15:44:51'),
	(16, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-08 17:55:29'),
	(17, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-08 19:15:42'),
	(18, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-09 02:56:25'),
	(19, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-09 06:38:50'),
	(20, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-10 09:31:29'),
	(21, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-10 15:15:43'),
	(22, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-11 04:56:36'),
	(23, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-11 07:01:28'),
	(24, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-20 11:19:05'),
	(25, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-21 05:25:39'),
	(26, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-21 10:13:09'),
	(27, 1, 'login', 'Admin logged in successfully', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-22 02:39:42');

-- Dumping structure for table creator_connect.admin_payment_config
CREATE TABLE IF NOT EXISTS `admin_payment_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_key` varchar(60) NOT NULL,
  `config_value` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `config_key` (`config_key`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table creator_connect.admin_payment_config: ~18 rows (approximately)
INSERT INTO `admin_payment_config` (`id`, `config_key`, `config_value`, `is_active`, `updated_at`, `updated_by`) VALUES
	(1, 'upi_id', '9316574722@ptyes', 1, '2026-02-28 08:26:55', NULL),
	(2, 'upi_name', 'Creator Connect', 1, '2026-02-28 08:26:55', NULL),
	(3, 'upi_description', 'Send to the UPI ID above and click I Have Paid.', 1, '2026-02-28 08:26:55', NULL),
	(4, 'bank_name', 'State Bank of India', 1, '2026-02-28 08:26:55', NULL),
	(5, 'bank_holder', 'Creator Connect Platform', 1, '2026-02-28 08:26:55', NULL),
	(6, 'bank_account', '00000000000000', 1, '2026-02-28 08:26:55', NULL),
	(7, 'bank_ifsc', 'SBIN0001234', 1, '2026-02-28 08:26:55', NULL),
	(8, 'bank_branch', 'Your Branch Name', 1, '2026-02-28 08:26:55', NULL),
	(9, 'bank_description', 'Transfer via NEFT/IMPS and click I Have Paid.', 1, '2026-02-28 08:26:55', NULL),
	(10, 'platform_fee_online_pct', '5', 1, '2026-02-28 08:26:55', NULL),
	(11, 'platform_fee_cod_pct', '2', 1, '2026-02-28 08:26:55', NULL),
	(34, 'default_gst_showcase', '0', 1, '2026-03-20 18:38:06', NULL),
	(35, 'default_gst_service', '18', 1, '2026-03-20 18:38:06', NULL),
	(36, 'default_gst_product', '12', 1, '2026-03-20 18:38:06', NULL),
	(37, 'pincode_api_enabled', '1', 1, '2026-03-20 18:38:06', NULL),
	(38, 'delivery_base_charge_default', '40', 1, '2026-03-20 18:38:06', NULL),
	(39, 'delivery_per_km_rate_default', '5', 1, '2026-03-20 18:38:06', NULL),
	(40, 'delivery_free_above_amount', '0', 1, '2026-03-20 18:38:06', NULL);

-- Dumping structure for table creator_connect.admin_permissions
CREATE TABLE IF NOT EXISTS `admin_permissions` (
  `permission_id` int NOT NULL AUTO_INCREMENT,
  `permission_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `permission_key` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`permission_id`),
  UNIQUE KEY `unique_permission_key` (`permission_key`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.admin_permissions: ~7 rows (approximately)
INSERT INTO `admin_permissions` (`permission_id`, `permission_name`, `permission_key`, `description`, `created_at`) VALUES
	(1, 'View Dashboard', 'view_dashboard', 'Access to admin dashboard', '2026-02-24 16:54:35'),
	(2, 'Manage Users', 'manage_users', 'Create, edit, delete users', '2026-02-24 16:54:35'),
	(3, 'Manage Posts', 'manage_posts', 'Moderate and manage posts', '2026-02-24 16:54:35'),
	(4, 'Manage Orders', 'manage_orders', 'View and manage orders', '2026-02-24 16:54:35'),
	(5, 'Manage Payouts', 'manage_payouts', 'Process and manage payouts', '2026-02-24 16:54:35'),
	(6, 'View Reports', 'view_reports', 'Access analytics and reports', '2026-02-24 16:54:35'),
	(7, 'Manage Settings', 'manage_settings', 'Modify system settings', '2026-02-24 16:54:35');

-- Dumping structure for table creator_connect.admin_sessions
CREATE TABLE IF NOT EXISTS `admin_sessions` (
  `session_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`session_id`),
  KEY `idx_token` (`token`(255)),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.admin_sessions: ~52 rows (approximately)
INSERT INTO `admin_sessions` (`session_id`, `user_id`, `token`, `ip_address`, `user_agent`, `created_at`, `expires_at`, `is_active`) VALUES
	(1, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3MjAzODU3NX0.MFX6BaqivId6Mrzd5Z27lKzDw6f1XaSOkmDtl0jFcBg', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-24 16:56:15', '2026-02-25 11:26:15', 1),
	(2, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3MjA2NzE4NX0.g-QSV1ghRj7aYDWteZwkxhYAPuTlxnGdrcB-mirqQNk', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-25 00:53:05', '2026-02-25 19:23:05', 1),
	(3, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3MjA3NDE3NX0.9EoYXq7o70EX0GpUCV57Zp5vqDrariqM3N1Shp3SUGc', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-25 02:49:35', '2026-02-25 21:19:35', 1),
	(4, 8, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo4LCJleHAiOjE3NzIwNzU5ODYsImlhdCI6MTc3MTk4OTU4NiwicmVtZW1iZXJfbWUiOmZhbHNlfQ.mVnkFMzSb2ddGEqWBPrO8KkvIAvcJYe0MFWS-KKMXbY', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-25 03:25:05', '2026-02-25 21:55:05', 1),
	(5, 9, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo5LCJleHAiOjE3NzIwNzcyNDUsImlhdCI6MTc3MTk5MDg0NSwicmVtZW1iZXJfbWUiOmZhbHNlfQ.D2D6QZGVCxebW9pZuzNtLd86UGWdJsNV5bif_NO-iwo', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-25 03:41:42', '2026-02-25 22:11:43', 1),
	(6, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3MjA4MDc1M30.0RLBa0Lzfw9w3s8Bo5STAla_uVH-HKRR_RN3bfQNjU4', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-25 04:39:13', '2026-02-25 23:09:13', 1),
	(7, 8, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo4LCJleHAiOjE3NzIwODA4MTAsImlhdCI6MTc3MTk5NDQxMCwicmVtZW1iZXJfbWUiOmZhbHNlfQ.xA4PScRPytlQkW37Y4jMF_JOMD38GDc92M1DIb4I4a8', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-25 04:43:13', '2026-02-25 23:13:14', 1),
	(8, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3MjA5MDM3OX0.WSQZpL2ovGsqkfoGk-LL1uRWeyy8f1tc8HahhGGOvyk', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-25 07:19:39', '2026-02-26 01:49:39', 1),
	(9, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3MjE3OTQzMn0.wNnUr8dweWqTCg1A4uP6vu1onwUzcnZDF5kti3V5Gik', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-26 08:03:52', '2026-02-27 02:33:53', 1),
	(10, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3MjI3OTUzMH0.XanIVpI48EMY5lV3KKt7QZb5uoxuUUv7z3JfDriz744', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-27 11:52:10', '2026-02-28 06:22:11', 1),
	(11, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyLCJleHAiOjE3NzIyNzc3NzMsImlhdCI6MTc3MjE5MTM3MywicmVtZW1iZXJfbWUiOmZhbHNlfQ.vQrp7uFqy8gWv07DFtG8eUvOZZInV5fxhQYluyZYiwE', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-27 11:53:59', '2026-02-28 06:23:59', 1),
	(12, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3MjI4MDc5N30.TvyQfKMaVl3aXczInm1ggZMQyHV5MHt-fvDng4z-Odk', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-27 12:13:17', '2026-02-28 06:43:18', 1),
	(13, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3MjMzMjY1OH0.YlQKOOiwXgEXW2zCAfkIxXF934M2tsjYm6kNDr_bWJQ', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-28 02:37:38', '2026-02-28 21:07:39', 1),
	(14, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3MjMzNDcwNH0.0y2SNIeVwO4AfKoTSb9X0PHrEYmCAkqCcK_vgIkiNLc', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-28 03:11:44', '2026-02-28 21:41:45', 1),
	(15, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3MjM2MzY1Nn0.W35mWpWqRdCxN14T5nYwULRf8pHAYhAmdElqrzUSajU', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-28 11:14:16', '2026-03-01 05:44:17', 1),
	(16, 30, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozMCwiZXhwIjoxNzcyMzcxNTU1LCJpYXQiOjE3NzIyODUxNTUsInJlbWVtYmVyX21lIjpmYWxzZX0.Hta6CWWBgSU9l5rNMAekyjQwGXMni_ZBOBlvm4LYNvc', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-28 13:26:40', '2026-03-01 07:56:41', 1),
	(17, 8, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo4LCJleHAiOjE3NzIzNzE1NzgsImlhdCI6MTc3MjI4NTE3OCwicmVtZW1iZXJfbWUiOmZhbHNlfQ.caDZZ9KyoSt5DeDYKsQw2f9sn3-ypIEja4R1ve8EcUU', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-02-28 13:29:44', '2026-03-01 07:59:45', 1),
	(18, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3MjYxMTc3OH0.GopIDxdIoZ_WSqTrF1WqyJQ6wkYtj0_FnGA--fY367w', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-03 08:09:38', '2026-03-04 02:39:39', 1),
	(19, 8, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo4LCJleHAiOjE3NzI2MTE2NTIsImlhdCI6MTc3MjUyNTI1MiwicmVtZW1iZXJfbWUiOmZhbHNlfQ.BYOn-ZyB_QClbJ6fjR7JX8OwZ5tznuaAuZi6B1I5GlY', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-03 08:43:13', '2026-03-04 03:13:13', 1),
	(20, 9, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo5LCJleHAiOjE3NzI2MTM5MjIsImlhdCI6MTc3MjUyNzUyMiwicmVtZW1iZXJfbWUiOmZhbHNlfQ.NBUFdclWcpZqyPVCoxdGJ4K_MCk34_X8XzCFr9DPF9M', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-03 08:45:39', '2026-03-04 03:15:40', 1),
	(21, 14, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxNCwiZXhwIjoxNzcyNjE0MzEzLCJpYXQiOjE3NzI1Mjc5MTMsInJlbWVtYmVyX21lIjpmYWxzZX0.MsSv8TBx1aXRA-HBPeRpNHkXVv2Saaft2C8YVSeoLzA', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-03 08:51:56', '2026-03-04 03:21:57', 1),
	(22, 8, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo4LCJleHAiOjE3NzI2MTU1MjcsImlhdCI6MTc3MjUyOTEyNywicmVtZW1iZXJfbWUiOmZhbHNlfQ.oufk7hijCroGcv5tS6KR98HtZVS1YSzlRUaD97ImEJU', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-03 09:12:10', '2026-03-04 03:42:10', 1),
	(23, 14, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxNCwiZXhwIjoxNzcyNjE2MjE3LCJpYXQiOjE3NzI1Mjk4MTcsInJlbWVtYmVyX21lIjpmYWxzZX0.Bm3Qp995_wmA4KmYKMY8j_oWaVN5WJ_dD9wxLe6jg2g', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-03 09:23:40', '2026-03-04 03:53:41', 1),
	(24, 5, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo1LCJleHAiOjE3NzI2MTY2NjUsImlhdCI6MTc3MjUzMDI2NSwicmVtZW1iZXJfbWUiOmZhbHNlfQ.yfTL7gKEc_5mM8hfDFZNnX151HSHcppXcQD-aBHaI9E', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-03 09:31:12', '2026-03-04 04:01:13', 1),
	(25, 8, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo4LCJleHAiOjE3NzI2Mzk2ODYsImlhdCI6MTc3MjU1MzI4NiwicmVtZW1iZXJfbWUiOmZhbHNlfQ.dILpWPHJpl086D7Vb-jOyzvXqCpZ_sS_RNg99loOfDg', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-03 15:55:01', '2026-03-04 10:25:02', 1),
	(26, 14, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxNCwiZXhwIjoxNzcyNjM5NzM4LCJpYXQiOjE3NzI1NTMzMzgsInJlbWVtYmVyX21lIjpmYWxzZX0.MBK8W2gsEcs7WjbhlAceTujiXvu9ABLD8K4-bhuFEDo', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-03 15:55:42', '2026-03-04 10:25:42', 1),
	(27, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3MjY0MDYzNX0.ZK9Pjl7CDt_SiDIRln_uqXP9hzZ-hNkHord_m_Pd26A', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-03 16:10:35', '2026-03-04 10:40:35', 1),
	(28, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3MzA0OTcyN30.AqMmK-y65FYr7i_3QfRrgz7giEGaTGJPyoHVEXlXhaU', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-08 09:48:47', '2026-03-09 04:18:48', 1),
	(29, 29, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyOSwiZXhwIjoxNzczMDUwMTc5LCJpYXQiOjE3NzI5NjM3NzksInJlbWVtYmVyX21lIjpmYWxzZX0._g7s_JwfWPxbUvOCyuCocDSM6YZWtPgsi9Ct_mT_NtE', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-08 11:11:08', '2026-03-09 05:41:08', 1),
	(30, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyLCJleHAiOjE3NzMwNTAxNDksImlhdCI6MTc3Mjk2Mzc0OSwicmVtZW1iZXJfbWUiOmZhbHNlfQ.9EobrQa3nJW95E-3UPsNlNMOo_gM6sd6gfc5smAHXg4', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-08 11:12:34', '2026-03-09 05:42:35', 1),
	(31, 27, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyNywiZXhwIjoxNzczMDUwMjg1LCJpYXQiOjE3NzI5NjM4ODUsInJlbWVtYmVyX21lIjpmYWxzZX0.8FviFYOD5TAoHax-5qkfq9yfnKfPLzAaveyR3rnexwo', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-08 11:23:45', '2026-03-09 05:53:46', 1),
	(32, 9, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo5LCJleHAiOjE3NzMwNjEyMDAsImlhdCI6MTc3Mjk3NDgwMCwicmVtZW1iZXJfbWUiOmZhbHNlfQ.wMJA2JwshwYBF3v8dCMmTq-1Vl8YSQS2MBRne6bk7wc', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-08 13:00:07', '2026-03-09 07:30:07', 1),
	(33, 4, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo0LCJleHAiOjE3NzMwNjA2MjEsImlhdCI6MTc3Mjk3NDIyMSwicmVtZW1iZXJfbWUiOmZhbHNlfQ.kRmW8wUwTzeRwLf4ZEwcvvfxG7YvdUPKnm5u4Gr2GlY', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-08 13:05:32', '2026-03-09 07:35:32', 1),
	(34, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3MzA3MTA5MX0.XccO6CCGGyBP9rfdKrRMHN9ZhVZhHgK5f3PErZ22SeQ', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-08 15:44:51', '2026-03-09 10:14:51', 1),
	(35, 8, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo4LCJleHAiOjE3NzMwNzExMzEsImlhdCI6MTc3Mjk4NDczMSwicmVtZW1iZXJfbWUiOmZhbHNlfQ.3CZ5Wb_0HS6gJKkVH4oaZSTfgHwDQwD_cdwNuwpKzuE', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-08 15:46:03', '2026-03-09 10:16:04', 1),
	(36, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3MzA3ODkyOX0.NxlEVtBWaMttjLvY_E9cIEwn_y6CX53F7GpGHnckeWs', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-08 17:55:29', '2026-03-09 12:25:29', 1),
	(37, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3MzA4Mzc0Mn0.QX1xWSSyadZKulWGrOS85Vtl-u7AxSUvhc_VFUqsmyY', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-08 19:15:42', '2026-03-09 13:45:42', 1),
	(38, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3MzExMTM4NX0.9o_4fcQsQk5r5-2wXXJRftQ0bNNr3QUI0m1T8vuR3Z4', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-09 02:56:25', '2026-03-09 21:26:25', 1),
	(39, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3MzEyNDczMH0.snLRZZFnjVuMFo7CMn-_ll5DYSG581UQbAsFQs7H6wU', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-09 06:38:50', '2026-03-10 01:08:50', 1),
	(40, 24, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyNCwiZXhwIjoxNzczMTI0NzE0LCJpYXQiOjE3NzMwMzgzMTQsInJlbWVtYmVyX21lIjpmYWxzZX0.-3FypxA1zjcnpQ33Ot8qL9yNsHWEoUn-YbYjWqvj8is', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-09 06:39:02', '2026-03-10 01:09:02', 1),
	(41, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3MzIyMTQ4OX0.e4gnYSL--8kyT5s4PxS0p4o1tgTUALV7aS4g-6O7bLU', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-10 09:31:29', '2026-03-11 04:01:29', 1),
	(42, 28, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyOCwiZXhwIjoxNzczMjI1MjAxLCJpYXQiOjE3NzMxMzg4MDEsInJlbWVtYmVyX21lIjpmYWxzZX0.o0JUDXaJu1d3VdNrIy4UuEsyWwXAR6Y6s0mN_OF52so', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-10 10:34:12', '2026-03-11 05:04:13', 1),
	(43, 31, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozMSwiZXhwIjoxNzczMjI1ODIwLCJpYXQiOjE3NzMxMzk0MjAsInJlbWVtYmVyX21lIjpmYWxzZX0.zKe8plSG59G9jcVWh0TU-ABgLxqAfSZvI_sciMyoiXA', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-10 10:43:44', '2026-03-11 05:13:44', 1),
	(44, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyLCJleHAiOjE3NzMyNDExMzksImlhdCI6MTc3MzE1NDczOSwicmVtZW1iZXJfbWUiOmZhbHNlfQ.vsqO4XPUUZwAqBpl8QYj8rCRygMe1e5JleZjLCdLItw', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-10 15:12:33', '2026-03-11 09:42:34', 1),
	(45, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3MzI0MjE0M30.7q6cTcpVPTNbmD9v1lP18Zx8mP1gKsqyQZV3Mj7-IC4', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-10 15:15:43', '2026-03-11 09:45:44', 1),
	(46, 8, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo4LCJleHAiOjE3NzMyNDE2ODMsImlhdCI6MTc3MzE1NTI4MywicmVtZW1iZXJfbWUiOmZhbHNlfQ.0Thaw_jADmGzVt_zRL9cVLnB_S8dANPrDRKEftVhSoY', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-10 16:09:26', '2026-03-11 10:39:27', 1),
	(47, 32, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozMiwiZXhwIjoxNzczMjQ4NTE3LCJpYXQiOjE3NzMxNjIxMTcsInJlbWVtYmVyX21lIjpmYWxzZX0.gsOY7ex5ZX6TRal28g6eNxGJEn2G1tLXAXubYQ_Cnpw', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-10 17:02:07', '2026-03-11 11:32:08', 1),
	(48, 2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyLCJleHAiOjE3NzMyOTEwNjUsImlhdCI6MTc3MzIwNDY2NSwicmVtZW1iZXJfbWUiOmZhbHNlfQ.Zcm1LpafTK4zIY698VAWGAW_R6mKXWvUSqk47BglPxk', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-11 04:51:13', '2026-03-11 23:21:14', 1),
	(49, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3MzI5MTM5Nn0.Emow1HRoftCXbdq3Xkp9ORlZeVAeO8O6ZHsJhuT7pug', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-11 04:56:36', '2026-03-11 23:26:36', 1),
	(50, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3MzI5ODg4OH0.rpyUf9KbrTa6_bipyrDSY54VJYjgskxHx2COzdmk1pI', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-11 07:01:28', '2026-03-12 01:31:29', 1),
	(51, 31, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozMSwiZXhwIjoxNzczMjk4ODUyLCJpYXQiOjE3NzMyMTI0NTIsInJlbWVtYmVyX21lIjpmYWxzZX0.Z67WJgeGSfuGNIJsAmrfC-099JMcbbVtl189S_lSvBQ', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-11 07:11:39', '2026-03-12 01:41:40', 1),
	(52, 33, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozMywiZXhwIjoxNzczMzAyMTE3LCJpYXQiOjE3NzMyMTU3MTcsInJlbWVtYmVyX21lIjpmYWxzZX0.U0RCkWkxTBxO4AWt6K8eY2JeifTA0avT1pi4uwteX5Y', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-11 08:08:08', '2026-03-12 02:38:08', 1),
	(53, 8, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo4LCJleHAiOjE3NzMzMDMwMDAsImlhdCI6MTc3MzIxNjYwMCwicmVtZW1iZXJfbWUiOmZhbHNlfQ.z0RW3CutMYABOhtA9Heuz0_psTvZUObYbq2RY7VkDqE', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-11 08:10:06', '2026-03-12 02:40:06', 1),
	(54, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3NDA5MTk0NX0.vjffPNkNsfe05dZcSQrKgW5DwhX-1tQ1EshbLd9JprM', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-20 11:19:05', '2026-03-21 05:49:06', 1),
	(55, 33, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozMywiZXhwIjoxNzc0MDkxODg4LCJpYXQiOjE3NzQwMDU0ODgsInJlbWVtYmVyX21lIjpmYWxzZX0.5Fv5l2tTt09mO25lK7Atqm3FJ4Gt7EldVdkGdmDdddE', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-20 11:27:29', '2026-03-21 05:57:30', 1),
	(56, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3NDE1NzEzOX0.BewfS0V9fK_pCzTtzQCbWwVv1puB9TTqbUFSAHY4x34', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-21 05:25:39', '2026-03-21 23:55:40', 1),
	(57, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3NDE3NDM4OX0.J0V1m07RuzaRAmpuzsYLGxk0EcY196-mLUxZGLamm54', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-21 10:13:09', '2026-03-22 04:43:09', 1),
	(58, 33, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozMywiZXhwIjoxNzc0MTc0NDA1LCJpYXQiOjE3NzQwODgwMDUsInJlbWVtYmVyX21lIjpmYWxzZX0.mNJAnSpsmd2RnTKh4a8oP4ViWmA2NnVKLEGwoiSnez8', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-21 10:46:07', '2026-03-22 05:16:07', 1),
	(59, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjEsImV4cCI6MTc3NDIzMzU4Mn0.dWI4kffY3fTec_p8KK2Eq2xQXp69IS83w4AjU9oyA20', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-22 02:39:42', '2026-03-22 21:09:42', 1),
	(60, 21, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyMSwiZXhwIjoxNzc0MjQwMTE5LCJpYXQiOjE3NzQxNTM3MTksInJlbWVtYmVyX21lIjpmYWxzZX0.CyZ1PA8c4DJ4En_F5DbO1t31cAjxIscp530RuvyqgpU', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-22 11:39:55', '2026-03-23 06:09:55', 1);

-- Dumping structure for table creator_connect.billing_address
CREATE TABLE IF NOT EXISTS `billing_address` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `full_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pincode` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_billing` (`user_id`),
  CONSTRAINT `billing_address_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.billing_address: ~0 rows (approximately)
INSERT INTO `billing_address` (`id`, `user_id`, `full_name`, `address`, `city`, `pincode`, `created_at`, `updated_at`) VALUES
	(1, 30, 'Vidhi Shah', 'Aroma Colony, beside Ganpat University', 'Ahmedabad', '380063', '2026-02-28 13:27:42', '2026-02-28 13:27:42');

-- Dumping structure for table creator_connect.booking_messages
CREATE TABLE IF NOT EXISTS `booking_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `sender_id` int NOT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `message_type` enum('text','image','file') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'text',
  `file_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_booking_id` (`booking_id`),
  KEY `idx_sender_id` (`sender_id`),
  CONSTRAINT `booking_messages_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `service_bookings` (`booking_id`) ON DELETE CASCADE,
  CONSTRAINT `booking_messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.booking_messages: ~0 rows (approximately)

-- Dumping structure for table creator_connect.categories
CREATE TABLE IF NOT EXISTS `categories` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `post_type` enum('showcase','service','product') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_slug` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `display_order` int DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `unique_category` (`post_type`,`category_slug`),
  KEY `idx_post_type` (`post_type`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.categories: ~30 rows (approximately)
INSERT INTO `categories` (`category_id`, `post_type`, `category_name`, `category_slug`, `icon`, `description`, `is_active`, `display_order`, `created_at`) VALUES
	(1, 'showcase', 'Dance & Performance', 'dance-performance', '💃', 'Classical, folk, western and fusion dance performances', 1, 1, '2026-02-25 03:22:31'),
	(2, 'showcase', 'Music & Singing', 'music-singing', '🎵', 'Vocals, instruments, classical ragas and modern music', 1, 2, '2026-02-25 03:22:31'),
	(3, 'showcase', 'Art & Drawing', 'art-drawing', '🎨', 'Paintings, sketches, rangoli, warli and folk art', 1, 3, '2026-02-25 03:22:31'),
	(4, 'showcase', 'Photography', 'photography', '📷', 'Portrait, wedding, product and street photography', 1, 4, '2026-02-25 03:22:31'),
	(5, 'showcase', 'Mehndi & Body Art', 'mehndi-body-art', '🌿', 'Bridal mehndi, arabic, rajasthani and indo-western designs', 1, 5, '2026-02-25 03:22:31'),
	(6, 'showcase', 'Fashion & Styling', 'fashion-styling', '👗', 'Traditional, fusion and western fashion looks', 1, 6, '2026-02-25 03:22:31'),
	(7, 'showcase', 'Cooking & Food Art', 'cooking-food-art', '🍽️', 'Recipe videos, food plating, cake decoration and baking', 1, 7, '2026-02-25 03:22:31'),
	(8, 'showcase', 'Craft & DIY', 'craft-diy', '✂️', 'Handmade crafts, upcycling, embroidery and sewing projects', 1, 8, '2026-02-25 03:22:31'),
	(9, 'showcase', 'Comedy & Skits', 'comedy-skits', '😂', 'Short skits, stand-up comedy and humour content', 1, 9, '2026-02-25 03:22:31'),
	(10, 'showcase', 'Fitness & Yoga', 'fitness-yoga', '🧘', 'Yoga, zumba, aerobics and wellness routines', 1, 10, '2026-02-25 03:22:31'),
	(11, 'product', 'Handmade & Crafts', 'handmade-crafts', '🪡', 'Handmade jewellery, décor, toys and gifting items', 1, 1, '2026-02-25 03:22:31'),
	(12, 'product', 'Food & Homemade Eats', 'food-homemade-eats', '🍱', 'Pickles, sweets, snacks, masalas and home-cooked food', 1, 2, '2026-02-25 03:22:31'),
	(13, 'product', 'Clothing & Apparel', 'clothing-apparel', '👕', 'Traditional, western, kids wear and ethnic collections', 1, 3, '2026-02-25 03:22:31'),
	(14, 'product', 'Furniture & Home Décor', 'furniture-home-decor', '🪑', 'Wooden furniture, cushions, wall art and home décor', 1, 4, '2026-02-25 03:22:31'),
	(15, 'product', 'Electronics & Gadgets', 'electronics-gadgets', '📱', 'Mobile accessories, second-hand electronics and gadgets', 1, 5, '2026-02-25 03:22:31'),
	(16, 'product', 'Beauty & Skincare', 'beauty-skincare', '💄', 'Herbal, ayurvedic and organic beauty products', 1, 6, '2026-02-25 03:22:31'),
	(17, 'product', 'Art & Paintings', 'art-paintings', '🖼️', 'Original paintings, prints, posters and wall art', 1, 7, '2026-02-25 03:22:31'),
	(18, 'product', 'Books & Stationery', 'books-stationery', '📚', 'Books, notebooks, hand-lettered stationery and prints', 1, 8, '2026-02-25 03:22:31'),
	(19, 'product', 'Plants & Gardening', 'plants-gardening', '🌱', 'Indoor plants, seeds, pots, fertilizers and tools', 1, 9, '2026-02-25 03:22:31'),
	(20, 'product', 'Plastic & Utility Items', 'plastic-utility', '🪣', 'Plastic containers, storage, kitchen and utility items', 1, 10, '2026-02-25 03:22:31'),
	(21, 'service', 'Mehndi & Makeup', 'mehndi-makeup', '💅', 'Bridal mehndi, party makeup and beauty services', 1, 1, '2026-02-25 03:22:31'),
	(22, 'service', 'Tailoring & Stitching', 'tailoring-stitching', '🧵', 'Blouse, suit, lehenga stitching and alterations', 1, 2, '2026-02-25 03:22:31'),
	(23, 'service', 'Catering & Tiffin', 'catering-tiffin', '🍛', 'Home tiffin service, event catering and meal prep', 1, 3, '2026-02-25 03:22:31'),
	(24, 'service', 'Rent Clothes', 'rent-clothes', '👘', 'Rent bridal, party, ethnic and costume wear', 1, 4, '2026-02-25 03:22:31'),
	(25, 'service', 'Laundry & Dry Cleaning', 'laundry-dry-cleaning', '👚', 'Pickup & delivery laundry, ironing and dry cleaning', 1, 5, '2026-02-25 03:22:31'),
	(26, 'service', 'Tutoring & Classes', 'tutoring-classes', '📖', 'Home tuition, spoken English, dance and music classes', 1, 6, '2026-02-25 03:22:31'),
	(27, 'service', 'Event Planning & Decor', 'event-planning-decor', '🎊', 'Birthday, wedding décor, balloon art and event setup', 1, 7, '2026-02-25 03:22:31'),
	(28, 'service', 'Photography & Video', 'photography-video', '🎬', 'Wedding, maternity, product and event photography', 1, 8, '2026-02-25 03:22:31'),
	(29, 'service', 'Home Services', 'home-services', '🏠', 'House cleaning, cooking, babysitting and elderly care', 1, 9, '2026-02-25 03:22:31'),
	(30, 'service', 'Graphic & Digital', 'graphic-digital', '💻', 'Logo design, social media posts, reels editing and more', 1, 10, '2026-02-25 03:22:31');

-- Dumping structure for table creator_connect.comment_likes
CREATE TABLE IF NOT EXISTS `comment_likes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `comment_id` int NOT NULL,
  `user_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_comment_like` (`comment_id`,`user_id`),
  KEY `idx_comment_id` (`comment_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `comment_likes_ibfk_1` FOREIGN KEY (`comment_id`) REFERENCES `post_comments` (`comment_id`) ON DELETE CASCADE,
  CONSTRAINT `comment_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.comment_likes: ~1 rows (approximately)

-- Dumping structure for table creator_connect.commission_ledger
CREATE TABLE IF NOT EXISTS `commission_ledger` (
  `ledger_id` int NOT NULL AUTO_INCREMENT,
  `seller_id` int NOT NULL,
  `order_id` int DEFAULT NULL,
  `booking_id` int DEFAULT NULL,
  `event_type` enum('online_commission','cod_commission','cod_deficit','deficit_recovery','withdrawal','refund_reversal') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `gross_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `commission_pct` decimal(5,2) NOT NULL DEFAULT '0.00',
  `commission_amt` decimal(12,2) NOT NULL DEFAULT '0.00',
  `net_credit` decimal(12,2) NOT NULL DEFAULT '0.00',
  `seller_balance_after` decimal(12,2) DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ledger_id`),
  KEY `idx_seller_id` (`seller_id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_booking_id` (`booking_id`),
  KEY `idx_event_type` (`event_type`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.commission_ledger: ~34 rows (approximately)
INSERT INTO `commission_ledger` (`ledger_id`, `seller_id`, `order_id`, `booking_id`, `event_type`, `gross_amount`, `commission_pct`, `commission_amt`, `net_credit`, `seller_balance_after`, `notes`, `created_at`) VALUES
	(1, 8, NULL, NULL, 'withdrawal', 100.00, 0.00, 0.00, -100.00, NULL, 'Admin withdrawal approval #1', '2026-02-24 21:56:00'),
	(2, 8, 1, NULL, 'online_commission', 699.00, 5.00, 34.95, 664.05, 664.05, 'Backfilled: Order #1 — 5% commission = ₹34.95, net ₹664.05', '2026-02-25 03:33:59'),
	(3, 9, 2, NULL, 'online_commission', 2949.00, 5.00, 147.45, 2801.55, 2801.55, 'Order #2 — 5.0% commission = ₹147.45, net ₹2801.55', '2026-02-25 03:41:30'),
	(4, 8, 3, NULL, 'online_commission', 699.00, 5.00, 34.95, 664.05, 1328.10, 'Order #3 — 5.0% commission = ₹34.95, net ₹664.05', '2026-02-25 04:41:53'),
	(5, 8, NULL, NULL, 'withdrawal', 100.00, 0.00, 0.00, -100.00, NULL, 'Admin withdrawal approval #3', '2026-02-24 23:15:17'),
	(6, 8, 5, NULL, 'online_commission', 5199.00, 5.00, 259.95, 4939.05, 6267.15, 'Order #5 — 5.0% commission = ₹259.95, net ₹4939.05', '2026-02-28 13:32:05'),
	(7, 8, NULL, NULL, 'withdrawal', 200.00, 0.00, 0.00, -200.00, NULL, 'Admin withdrawal approval #4', '2026-02-28 08:05:23'),
	(8, 8, 6, NULL, 'cod_commission', 5199.00, 2.00, 103.98, 0.00, 11162.17, 'Order #6 — 2.0% commission = ₹103.98, net ₹5095.02 [CORRECTED: COD credit reversed, only commission deducted] [CORRECTED v2: phantom COD credit reversed] [CORRECTED v2: phantom COD credit reversed]', '2026-03-03 08:43:05'),
	(9, 9, 7, NULL, 'cod_commission', 2949.00, 2.00, 58.98, 0.00, 5691.57, 'Order #7 — 2.0% commission = ₹58.98, net ₹2890.02 [CORRECTED: COD credit reversed, only commission deducted] [CORRECTED v2: phantom COD credit reversed] [CORRECTED v2: phantom COD credit reversed]', '2026-03-03 08:46:20'),
	(10, 14, 8, NULL, 'cod_deficit', 3000.00, 2.00, 60.00, -60.00, NULL, 'COD commission ₹60.00 exceeded balance — deficit ₹60.00 carried forward', '2026-03-03 08:53:44'),
	(11, 14, 8, NULL, 'cod_commission', 3000.00, 2.00, 60.00, 0.00, 0.00, 'Order #8 — COD 2.0% commission = ₹60.00 deducted from balance (seller collected cash directly) [CORRECTED v2: phantom COD credit reversed] [CORRECTED v2: phantom COD credit reversed]', '2026-03-03 08:53:44'),
	(12, 14, 9, NULL, 'cod_commission', 3000.00, 2.00, 60.00, 0.00, 2790.00, 'Order #9 — COD 2.0% commission = ₹60.00 deducted from balance (seller collected cash directly) [CORRECTED v2: phantom COD credit reversed] [CORRECTED v2: phantom COD credit reversed]', '2026-03-03 09:05:49'),
	(13, 14, 9, NULL, 'cod_deficit', 3000.00, 2.00, 60.00, -60.00, NULL, 'COD commission ₹60.00 exceeded balance — deficit ₹60.00 carried forward [CORRECTION v2]', '2026-03-03 09:11:05'),
	(14, 8, 10, NULL, 'cod_commission', 5199.00, 2.00, 103.98, 0.00, 11102.22, 'Order #10 — COD 2.0% commission = ₹103.98 deducted from balance (seller collected cash directly)', '2026-03-03 09:12:51'),
	(15, 14, 11, NULL, 'cod_deficit', 3000.00, 2.00, 60.00, -60.00, NULL, 'COD commission ₹60.00 exceeded balance — deficit ₹60.00 carried forward', '2026-03-03 09:25:04'),
	(16, 14, 11, NULL, 'cod_commission', 3000.00, 2.00, 60.00, 0.00, 0.00, 'Order #11 — COD 2.0% commission = ₹60.00 deducted from balance (seller collected cash directly)', '2026-03-03 09:25:04'),
	(17, 14, 12, NULL, 'deficit_recovery', 180.00, 0.00, 0.00, 180.00, NULL, 'Recovered ₹180.00 deficit from previous COD commission', '2026-03-03 09:26:25'),
	(18, 14, 12, NULL, 'online_commission', 3000.00, 5.00, 150.00, 2670.00, 2670.00, 'Order #12 — 5.0% commission = ₹150.00, net ₹2670.00 credited', '2026-03-03 09:26:25'),
	(19, 8, 13, NULL, 'cod_commission', 5199.00, 2.00, 103.98, 0.00, 6163.17, 'Order #13 — COD 2.0% commission = ₹103.98 deducted from balance (seller collected cash directly)', '2026-03-03 16:29:51'),
	(20, 14, 14, NULL, 'online_commission', 3000.00, 5.00, 150.00, 2850.00, 5700.00, 'Order #14 — 5.0% commission = ₹150.00, net ₹2850.00 credited', '2026-03-03 16:34:50'),
	(21, 14, 15, NULL, 'cod_commission', 3000.00, 2.00, 60.00, -60.00, 5640.00, 'Order #15 — COD 2.0% commission ₹60.00', '2026-03-03 16:42:29'),
	(22, 8, 16, NULL, 'online_commission', 5199.00, 5.00, 259.95, 4939.05, 11206.20, 'Order #16 — 5.0% commission ₹259.95, net ₹4939.05', '2026-03-03 16:44:28'),
	(23, 14, NULL, NULL, 'withdrawal', 600.00, 0.00, 0.00, -600.00, NULL, 'Admin withdrawal approval #5', '2026-03-03 11:18:58'),
	(24, 14, 17, NULL, 'cod_commission', 3000.00, 2.00, 60.00, -60.00, 5640.00, 'Order #17 — COD 2.0% commission ₹60.00', '2026-03-03 16:52:38'),
	(25, 14, 18, NULL, 'cod_commission', 3000.00, 2.00, 60.00, -60.00, 5640.00, 'Order #18 — COD 2.0% commission ₹60.00', '2026-03-03 17:13:52'),
	(26, 14, NULL, NULL, 'withdrawal', 234.00, 0.00, 0.00, -234.00, NULL, 'Admin withdrawal approval #6', '2026-03-03 11:45:03'),
	(27, 14, NULL, NULL, 'withdrawal', 5700.00, 0.00, 0.00, -5700.00, NULL, 'Admin withdrawal approval #7', '2026-03-03 11:45:31'),
	(28, 8, NULL, NULL, 'withdrawal', 200.00, 0.00, 0.00, -200.00, NULL, 'Admin withdrawal approval #8', '2026-03-03 11:46:14'),
	(29, 8, NULL, NULL, 'withdrawal', 100.00, 0.00, 0.00, -100.00, NULL, 'Admin withdrawal approval #9', '2026-03-03 11:50:51'),
	(30, 27, 19, NULL, 'online_commission', 1499.00, 5.00, 74.95, 1424.05, 1424.05, 'Order #19 — 5.0% commission ₹74.95, net ₹1424.05', '2026-03-08 11:23:08'),
	(31, 27, NULL, NULL, 'withdrawal', 100.00, 0.00, 0.00, -100.00, NULL, 'Admin withdrawal approval #10', '2026-03-08 05:55:52'),
	(32, 27, 20, NULL, 'cod_commission', 1499.00, 2.00, 29.98, -29.98, 1294.07, 'Order #20 — COD 2.0% commission ₹29.98', '2026-03-08 11:31:21'),
	(33, 27, 21, NULL, 'online_commission', 1499.00, 5.00, 74.95, 1424.05, 2718.12, 'Order #21 — 5.0% commission ₹74.95, net ₹1424.05', '2026-03-08 12:51:55'),
	(34, 27, 22, NULL, 'cod_commission', 1499.00, 2.00, 29.98, -29.98, 2688.14, 'Order #22 — COD 2.0% commission ₹29.98', '2026-03-08 12:54:46'),
	(35, 24, 24, NULL, 'online_commission', 53190.00, 5.00, 2659.50, 50530.50, 50530.50, 'Order #24 — 5.0% commission ₹2659.50, net ₹50530.50', '2026-03-09 06:44:44'),
	(36, 24, NULL, NULL, 'withdrawal', 10000.00, 0.00, 0.00, -10000.00, NULL, 'Admin withdrawal approval #11', '2026-03-09 01:17:24'),
	(37, 28, 26, NULL, 'online_commission', 378.00, 5.00, 18.90, 359.10, 359.10, 'Order #26 — 5.0% commission ₹18.90, net ₹359.10', '2026-03-10 10:41:50'),
	(38, 28, NULL, NULL, 'withdrawal', 100.00, 0.00, 0.00, -100.00, NULL, 'Admin withdrawal approval #12', '2026-03-10 05:22:24'),
	(39, 33, 28, NULL, 'online_commission', 35.00, 5.00, 1.75, 33.25, 33.25, 'Order #28 — 5.0% commission ₹1.75, net ₹33.25', '2026-03-11 08:07:12'),
	(40, 8, NULL, NULL, 'withdrawal', 200.00, 0.00, 0.00, -200.00, NULL, 'Admin withdrawal approval #13', '2026-03-11 02:44:41'),
	(41, 33, 29, NULL, 'online_commission', 146.57, 5.00, 7.33, 139.24, 139.24, 'Order #29 — 5.0% commission ₹7.33, net ₹139.24', '2026-03-20 15:40:56'),
	(42, 33, 31, NULL, 'cod_commission', 152.32, 2.00, 3.05, -3.05, 136.19, 'Order #31 — COD 2.0% commission ₹3.05', '2026-03-21 10:46:00'),
	(43, 21, 34, NULL, 'online_commission', 356.00, 5.00, 17.80, 338.20, 338.20, 'Order #34 — 5.0% commission ₹17.80, net ₹338.20', '2026-03-22 11:39:42'),
	(44, 21, 35, NULL, 'cod_commission', 336.00, 2.00, 6.72, -6.72, 331.48, 'Order #35 — COD 2.0% commission ₹6.72', '2026-03-22 11:41:24');

-- Dumping structure for table creator_connect.conversations
CREATE TABLE IF NOT EXISTS `conversations` (
  `conversation_id` int NOT NULL AUTO_INCREMENT,
  `user1_id` int NOT NULL,
  `user2_id` int NOT NULL,
  `last_message_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`conversation_id`),
  UNIQUE KEY `unique_conversation` (`user1_id`,`user2_id`),
  KEY `idx_user1` (`user1_id`),
  KEY `idx_user2` (`user2_id`),
  KEY `idx_updated` (`updated_at`),
  KEY `conversations_ibfk_3` (`last_message_id`),
  CONSTRAINT `conversations_ibfk_1` FOREIGN KEY (`user1_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `conversations_ibfk_2` FOREIGN KEY (`user2_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `conversations_ibfk_3` FOREIGN KEY (`last_message_id`) REFERENCES `messages` (`message_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.conversations: ~4 rows (approximately)
INSERT INTO `conversations` (`conversation_id`, `user1_id`, `user2_id`, `last_message_id`, `created_at`, `updated_at`) VALUES
	(6, 8, 31, 7, '2026-03-10 09:20:46', '2026-03-10 09:21:22'),
	(10, 8, 33, 14, '2026-03-11 08:26:29', '2026-03-22 16:31:18'),
	(11, 3, 33, 13, '2026-03-22 16:22:08', '2026-03-22 16:31:07'),
	(15, 3, 14, 18, '2026-03-22 16:37:20', '2026-03-22 17:29:39');

-- Dumping structure for table creator_connect.conversation_deletions
CREATE TABLE IF NOT EXISTS `conversation_deletions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `conversation_id` int NOT NULL,
  `user_id` int NOT NULL,
  `deleted_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_deletion` (`conversation_id`,`user_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `conversation_deletions_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`conversation_id`) ON DELETE CASCADE,
  CONSTRAINT `conversation_deletions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.conversation_deletions: ~0 rows (approximately)

-- Dumping structure for table creator_connect.deal_reviews
CREATE TABLE IF NOT EXISTS `deal_reviews` (
  `review_id` int NOT NULL AUTO_INCREMENT,
  `reviewer_id` int NOT NULL,
  `reviewee_id` int NOT NULL,
  `order_id` int DEFAULT NULL,
  `booking_id` int DEFAULT NULL,
  `rating` tinyint NOT NULL,
  `review_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `review_type` enum('product','service') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`review_id`),
  KEY `idx_reviewer` (`reviewer_id`),
  KEY `idx_reviewee` (`reviewee_id`),
  CONSTRAINT `fk_review_reviewee` FOREIGN KEY (`reviewee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_review_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `deal_reviews_chk_1` CHECK (((`rating` >= 1) and (`rating` <= 5)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.deal_reviews: ~0 rows (approximately)

-- Dumping structure for table creator_connect.faqs
CREATE TABLE IF NOT EXISTS `faqs` (
  `faq_id` int NOT NULL AUTO_INCREMENT,
  `question` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `answer` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` int DEFAULT NULL,
  `display_order` int DEFAULT '0',
  `is_popular` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`faq_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `faqs_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `help_categories` (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.faqs: ~27 rows (approximately)
INSERT INTO `faqs` (`faq_id`, `question`, `answer`, `category_id`, `display_order`, `is_popular`, `created_at`) VALUES
	(7, 'How do I create a Creator Connect account?', 'Click Sign Up on the homepage, fill in your name, email, and password (or use Google Sign-In), then verify your email address. Your account is ready immediately after verification.', 1, 1, 1, '2026-03-08 13:20:03'),
	(8, 'Can I sign up with Google?', 'Yes! Click "Continue with Google" on the sign-up page and your account will be created instantly using your Google profile. No password is required.', 1, 2, 1, '2026-03-08 13:20:03'),
	(9, 'Is Creator Connect free to join?', 'Completely free! There are no subscription fees. Creator Connect only earns a small commission (5% on online product sales, 2% on COD orders). Services are commission-free.', 1, 3, 1, '2026-03-08 13:20:03'),
	(10, 'Can I use Creator Connect on mobile?', 'Yes. Creator Connect is fully responsive and works on all modern mobile browsers. A dedicated mobile app is planned for the future.', 1, 4, 0, '2026-03-08 13:20:03'),
	(11, 'Can I change my username after signing up?', 'Your username can be changed within the first 30 days of creating your account. After that, it becomes permanent. Go to Settings → Profile to update it while it is still changeable.', 2, 1, 1, '2026-03-08 13:20:03'),
	(12, 'How do I reset my forgotten password?', 'Click "Forgot Password" on the login page, enter your registered email, and follow the reset link sent to your inbox. The link expires in 1 hour.', 2, 2, 1, '2026-03-08 13:20:03'),
	(13, 'How do I upload or change my profile picture?', 'Go to Settings → Profile, click on your current avatar or the camera icon, choose an image from your device (JPG or PNG, max 5 MB), and save.', 2, 3, 0, '2026-03-08 13:20:03'),
	(14, 'Why is my account showing as suspended?', 'Accounts may be temporarily suspended for policy violations. You should receive a notification with the reason and duration. If you believe this is a mistake, please contact support.', 2, 4, 0, '2026-03-08 13:20:03'),
	(15, 'What types of posts can I create?', 'You can create three types: Showcase (share your creative work), Service (offer a bookable service), and Product (sell physical or handmade items). Each type has its own setup fields.', 3, 1, 1, '2026-03-08 13:20:03'),
	(16, 'How do I edit or delete a post I already published?', 'Go to your profile, find the post, click the ⋮ menu on it, and select Edit or Delete. Deleting a post with active orders is not recommended — contact support first.', 3, 2, 1, '2026-03-08 13:20:03'),
	(17, 'What is the maximum video size I can upload?', 'Videos must be under 100 MB and in MP4, MOV, or WEBM format. For best quality, use 1080p resolution and keep videos under 3 minutes.', 3, 3, 0, '2026-03-08 13:20:03'),
	(18, 'Why was my post removed by the admin?', 'Posts are removed if they violate community guidelines — such as inappropriate content, misleading descriptions, or copyright infringement. You will receive a notification with the reason.', 3, 4, 0, '2026-03-08 13:20:03'),
	(19, 'How do I withdraw my earnings?', 'Go to Settings → Seller tab → Request Withdrawal. Minimum amount is ₹120. You need a saved UPI ID or bank account. Withdrawals are processed within 1–3 business days after admin approval.', 4, 1, 1, '2026-03-08 13:20:03'),
	(20, 'What is the platform commission on product sales?', 'For online payments (UPI/bank transfer): 5% commission, you receive 95%. For COD orders: 2% commission deducted from your wallet, you keep 100% of the cash you collect. Services have 0% commission.', 4, 2, 1, '2026-03-08 13:20:03'),
	(21, 'How does COD commission work?', 'For COD orders, you collect the full payment in cash from the buyer. The platform deducts its 2% commission from your wallet balance. If your wallet balance is insufficient, the deficit is recovered from future earnings.', 4, 3, 1, '2026-03-08 13:20:03'),
	(22, 'When does my wallet balance update after a sale?', 'For online payments, your wallet updates as soon as the payment is verified. For COD, the commission is deducted once you mark the order as delivered.', 4, 4, 0, '2026-03-08 13:20:03'),
	(23, 'What happens if my wallet has a negative balance?', 'A negative balance (deficit) occurs when COD commission exceeds your wallet balance. Withdrawals are blocked until the deficit is cleared. It is automatically recovered from your next online payment earnings.', 4, 5, 1, '2026-03-08 13:20:03'),
	(24, 'Can I offer Cash on Delivery for my products?', 'Yes! When creating a product post, enable the COD option. Buyers in your area can then choose COD at checkout. You collect cash at delivery and the platform deducts 2% from your wallet.', 4, 6, 0, '2026-03-08 13:20:03'),
	(25, 'How do I track my order?', 'Go to My Deals → Buyer → Products to see real-time status for all your orders — Pending, Confirmed, Processing, Shipped, or Delivered.', 5, 1, 1, '2026-03-08 13:20:03'),
	(26, 'Can I cancel an order after placing it?', 'Orders can only be cancelled while they are still in Pending status. Once the seller confirms your order, cancellation must be requested through the seller directly or via support.', 5, 2, 1, '2026-03-08 13:20:03'),
	(27, 'How do I contact the seller about my order?', 'Go to My Deals, find your order, and use the in-app messaging feature to contact the seller directly. Alternatively, the seller\'s contact details are available on their profile.', 5, 3, 0, '2026-03-08 13:20:03'),
	(28, 'What happens after a seller accepts my service booking?', 'You will receive a notification confirming acceptance. The provider will reach out via your preferred contact method (email, phone, or WhatsApp) to coordinate details.', 5, 4, 1, '2026-03-08 13:20:03'),
	(29, 'Can I leave a review after a completed order?', 'Yes! After an order is marked as delivered or a service is completed, you can leave a star rating (1–5) and a written review from the My Deals page.', 5, 5, 0, '2026-03-08 13:20:03'),
	(30, 'Is my personal information safe on Creator Connect?', 'Yes. We encrypt all sensitive data and never share your personal information with third parties. Payment details are stored securely and only used for processing withdrawals.', 6, 1, 1, '2026-03-08 13:20:03'),
	(31, 'How do I make my account private?', 'Go to Settings → Account tab and toggle on "Private Account". Only approved followers will see your posts, but your Bazaar listings remain public so buyers can still find you.', 6, 2, 1, '2026-03-08 13:20:03'),
	(32, 'How do I block another user?', 'Visit the user\'s profile, click the ⋮ menu, and select Block. Blocked users cannot see your posts, message you, or follow you.', 6, 3, 0, '2026-03-08 13:20:03'),
	(33, 'What should I do if I receive a scam message?', 'Do not send any money or share personal details. Report the message using the flag icon in the chat. Our team will investigate and take action within 24 hours.', 6, 4, 1, '2026-03-08 13:20:03');

-- Dumping structure for table creator_connect.followers
CREATE TABLE IF NOT EXISTS `followers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `follower_id` int NOT NULL,
  `following_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_follow` (`follower_id`,`following_id`),
  KEY `idx_follower` (`follower_id`),
  KEY `idx_following` (`following_id`),
  CONSTRAINT `followers_ibfk_1` FOREIGN KEY (`follower_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `followers_ibfk_2` FOREIGN KEY (`following_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.followers: ~10 rows (approximately)
INSERT INTO `followers` (`id`, `follower_id`, `following_id`, `created_at`) VALUES
	(12, 4, 9, '2026-03-08 13:41:43'),
	(13, 9, 4, '2026-03-08 13:41:53'),
	(14, 9, 8, '2026-03-08 13:42:25'),
	(15, 31, 8, '2026-03-10 09:20:17'),
	(16, 8, 31, '2026-03-10 09:20:38'),
	(18, 8, 9, '2026-03-10 10:14:16'),
	(19, 31, 10, '2026-03-11 07:10:57'),
	(20, 10, 31, '2026-03-11 07:11:14'),
	(21, 8, 33, '2026-03-11 08:25:48'),
	(22, 33, 8, '2026-03-11 08:26:20'),
	(27, 8, 14, '2026-03-22 17:32:04');

-- Dumping structure for table creator_connect.follow_requests
CREATE TABLE IF NOT EXISTS `follow_requests` (
  `request_id` int NOT NULL AUTO_INCREMENT,
  `follower_id` int NOT NULL,
  `following_id` int NOT NULL,
  `status` enum('pending','accepted','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`request_id`),
  UNIQUE KEY `unique_follow_request` (`follower_id`,`following_id`),
  KEY `idx_follower` (`follower_id`),
  KEY `idx_following` (`following_id`),
  CONSTRAINT `follow_requests_ibfk_1` FOREIGN KEY (`follower_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `follow_requests_ibfk_2` FOREIGN KEY (`following_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.follow_requests: ~0 rows (approximately)

-- Dumping structure for table creator_connect.groups
CREATE TABLE IF NOT EXISTS `groups` (
  `group_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`group_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `groups_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.groups: ~0 rows (approximately)
INSERT INTO `groups` (`group_id`, `name`, `description`, `avatar`, `created_by`, `created_at`, `updated_at`) VALUES
	(1, 'Fire House', 'For college discussion', NULL, 14, '2026-03-22 17:50:39', '2026-03-22 17:50:39');

-- Dumping structure for table creator_connect.group_members
CREATE TABLE IF NOT EXISTS `group_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` enum('admin','member') COLLATE utf8mb4_unicode_ci DEFAULT 'member',
  `status` enum('active','pending','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `invited_by` int DEFAULT NULL,
  `joined_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_group_member` (`group_id`,`user_id`),
  KEY `user_id` (`user_id`),
  KEY `invited_by` (`invited_by`),
  CONSTRAINT `group_members_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `groups` (`group_id`) ON DELETE CASCADE,
  CONSTRAINT `group_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `group_members_ibfk_3` FOREIGN KEY (`invited_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.group_members: ~0 rows (approximately)
INSERT INTO `group_members` (`id`, `group_id`, `user_id`, `role`, `status`, `invited_by`, `joined_at`, `created_at`) VALUES
	(5, 1, 8, 'member', 'pending', 3, NULL, '2026-03-22 17:56:38'),
	(7, 1, 33, 'admin', 'active', 3, '2026-03-22 18:29:47', '2026-03-22 18:26:38'),
	(8, 1, 7, 'member', 'pending', 33, NULL, '2026-03-22 18:30:42'),
	(9, 1, 6, 'member', 'pending', 33, NULL, '2026-03-22 18:30:48'),
	(10, 1, 3, 'member', 'pending', 33, NULL, '2026-03-22 18:30:54'),
	(11, 1, 4, 'member', 'pending', 33, NULL, '2026-03-22 18:31:00'),
	(12, 1, 9, 'member', 'pending', 33, NULL, '2026-03-22 18:31:07'),
	(13, 1, 5, 'member', 'pending', 33, NULL, '2026-03-22 18:31:19'),
	(14, 1, 10, 'member', 'active', 33, '2026-03-23 03:20:07', '2026-03-23 03:18:52');

-- Dumping structure for table creator_connect.group_messages
CREATE TABLE IF NOT EXISTS `group_messages` (
  `message_id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `sender_id` int NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `media_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `media_type` enum('image','video','audio','file','shared_post') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_for_everyone` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`message_id`),
  KEY `group_id` (`group_id`),
  KEY `sender_id` (`sender_id`),
  CONSTRAINT `group_messages_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `groups` (`group_id`) ON DELETE CASCADE,
  CONSTRAINT `group_messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.group_messages: ~0 rows (approximately)
INSERT INTO `group_messages` (`message_id`, `group_id`, `sender_id`, `message`, `media_url`, `media_type`, `deleted_for_everyone`, `created_at`, `updated_at`) VALUES
	(1, 1, 14, 'hy', NULL, NULL, 0, '2026-03-22 18:11:48', '2026-03-22 18:11:48');

-- Dumping structure for table creator_connect.group_message_deletions
CREATE TABLE IF NOT EXISTS `group_message_deletions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `message_id` int NOT NULL,
  `user_id` int NOT NULL,
  `deleted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_gmsg_user` (`message_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `group_message_deletions_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `group_messages` (`message_id`) ON DELETE CASCADE,
  CONSTRAINT `group_message_deletions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.group_message_deletions: ~0 rows (approximately)

-- Dumping structure for table creator_connect.group_message_reads
CREATE TABLE IF NOT EXISTS `group_message_reads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `message_id` int NOT NULL,
  `user_id` int NOT NULL,
  `read_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_gmsg_read` (`message_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `group_message_reads_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `group_messages` (`message_id`) ON DELETE CASCADE,
  CONSTRAINT `group_message_reads_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.group_message_reads: ~0 rows (approximately)
INSERT INTO `group_message_reads` (`id`, `message_id`, `user_id`, `read_at`) VALUES
	(1, 1, 3, '2026-03-22 18:12:52'),
	(2, 1, 33, '2026-03-22 18:17:55'),
	(3, 1, 7, '2026-03-22 18:18:43'),
	(20, 1, 10, '2026-03-23 03:20:08');

-- Dumping structure for table creator_connect.gst_rates
CREATE TABLE IF NOT EXISTS `gst_rates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_id` int NOT NULL,
  `subcategory_id` int DEFAULT NULL COMMENT 'NULL = applies to whole category',
  `gst_rate` decimal(5,2) NOT NULL DEFAULT '0.00' COMMENT 'GST % e.g. 5.00, 12.00, 18.00',
  `hsn_sac_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'HSN code for goods / SAC for services',
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cat_subcat` (`category_id`,`subcategory_id`),
  KEY `idx_category` (`category_id`),
  KEY `idx_subcategory` (`subcategory_id`),
  CONSTRAINT `gst_rates_fk1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE CASCADE,
  CONSTRAINT `gst_rates_fk2` FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories` (`subcategory_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='GST rates per category and subcategory';

-- Dumping data for table creator_connect.gst_rates: ~30 rows (approximately)
INSERT INTO `gst_rates` (`id`, `category_id`, `subcategory_id`, `gst_rate`, `hsn_sac_code`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
	(1, 1, NULL, 0.00, NULL, 'Showcase — GST Exempt', 1, '2026-03-20 13:08:06', '2026-03-20 15:50:27'),
	(2, 2, NULL, 0.00, NULL, 'Showcase — GST Exempt', 1, '2026-03-20 13:08:06', '2026-03-20 15:50:27'),
	(3, 3, NULL, 0.00, NULL, 'Showcase — GST Exempt', 1, '2026-03-20 13:08:06', '2026-03-20 15:50:27'),
	(4, 4, NULL, 0.00, NULL, 'Showcase — GST Exempt', 1, '2026-03-20 13:08:06', '2026-03-20 15:50:27'),
	(5, 5, NULL, 0.00, NULL, 'Showcase — GST Exempt', 1, '2026-03-20 13:08:06', '2026-03-20 15:50:27'),
	(6, 6, NULL, 0.00, NULL, 'Showcase — GST Exempt', 1, '2026-03-20 13:08:06', '2026-03-20 15:50:27'),
	(7, 7, NULL, 0.00, NULL, 'Showcase — GST Exempt', 1, '2026-03-20 13:08:06', '2026-03-20 15:50:27'),
	(8, 8, NULL, 0.00, NULL, 'Showcase — GST Exempt', 1, '2026-03-20 13:08:06', '2026-03-20 15:50:27'),
	(9, 9, NULL, 0.00, NULL, 'Showcase — GST Exempt', 1, '2026-03-20 13:08:06', '2026-03-20 15:50:27'),
	(10, 10, NULL, 0.00, NULL, 'Showcase — GST Exempt', 1, '2026-03-20 13:08:06', '2026-03-20 15:50:27'),
	(16, 21, NULL, 0.00, '998300', 'Professional/Creative Services — 18% GST', 1, '2026-03-20 13:08:06', '2026-03-20 16:21:08'),
	(17, 22, NULL, 0.00, '998300', 'Professional/Creative Services — 18% GST', 1, '2026-03-20 13:08:06', '2026-03-20 16:21:11'),
	(18, 23, NULL, 0.00, '998300', 'Professional/Creative Services — 18% GST', 1, '2026-03-20 13:08:06', '2026-03-20 16:21:24'),
	(19, 24, NULL, 0.00, '998300', 'Professional/Creative Services — 18% GST', 1, '2026-03-20 13:08:06', '2026-03-20 16:21:09'),
	(20, 25, NULL, 0.00, '998300', 'Professional/Creative Services — 18% GST', 1, '2026-03-20 13:08:06', '2026-03-20 16:21:06'),
	(21, 26, NULL, 0.00, '998300', 'Professional/Creative Services — 18% GST', 1, '2026-03-20 13:08:06', '2026-03-20 16:21:12'),
	(22, 27, NULL, 0.00, '998300', 'Professional/Creative Services — 18% GST', 1, '2026-03-20 13:08:06', '2026-03-20 15:51:18'),
	(23, 28, NULL, 0.00, '998300', 'Professional/Creative Services — 18% GST', 1, '2026-03-20 13:08:06', '2026-03-20 16:21:09'),
	(24, 29, NULL, 0.00, '998300', 'Professional/Creative Services — 18% GST', 1, '2026-03-20 13:08:06', '2026-03-20 16:21:05'),
	(25, 30, NULL, 0.00, '998300', 'Professional/Creative Services — 18% GST', 1, '2026-03-20 13:08:06', '2026-03-20 15:51:20'),
	(31, 11, NULL, 12.00, '9999', 'Handicrafts — 12% GST', 1, '2026-03-20 13:08:06', '2026-03-20 15:50:27'),
	(32, 12, NULL, 5.00, '2106', 'Packaged Food — 5% GST (HSN 21)', 1, '2026-03-20 13:08:06', '2026-03-20 15:50:27'),
	(33, 13, NULL, 12.00, '6211', 'Apparel/Clothing — 12% GST (HSN 62)', 1, '2026-03-20 13:08:06', '2026-03-20 15:50:27'),
	(34, 14, NULL, 12.00, '9403', 'Home Decor/Furnishing — 12% GST', 1, '2026-03-20 13:08:06', '2026-03-20 15:50:27'),
	(35, 15, NULL, 18.00, '8471', 'Electronics/Gadgets — 18% GST (HSN 84/85)', 1, '2026-03-20 13:08:06', '2026-03-20 15:50:27'),
	(36, 16, NULL, 18.00, '3304', 'Cosmetics/Beauty — 18% GST (HSN 3304)', 1, '2026-03-20 13:08:06', '2026-03-20 15:50:27'),
	(37, 17, NULL, 12.00, '9701', 'Paintings/Art — 12% GST (HSN 9701)', 1, '2026-03-20 13:08:06', '2026-03-20 15:50:27'),
	(38, 18, NULL, 0.00, '4901', 'Books — GST Exempt (HSN 4901)', 1, '2026-03-20 13:08:06', '2026-03-20 15:50:27'),
	(39, 19, NULL, 5.00, '0602', 'Live Plants — 5% GST (HSN 0602)', 1, '2026-03-20 13:08:06', '2026-03-20 15:50:27'),
	(40, 20, NULL, 12.00, '4823', 'Product — standard 12% GST (adjustable per subcategory)', 1, '2026-03-20 13:08:06', '2026-03-20 13:08:06');

-- Dumping structure for table creator_connect.help_articles
CREATE TABLE IF NOT EXISTS `help_articles` (
  `article_id` int NOT NULL AUTO_INCREMENT,
  `category_id` int DEFAULT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `views` int DEFAULT '0',
  `is_featured` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`article_id`),
  UNIQUE KEY `unique_slug` (`slug`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `help_articles_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `help_categories` (`category_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.help_articles: ~16 rows (approximately)
INSERT INTO `help_articles` (`article_id`, `category_id`, `title`, `content`, `slug`, `views`, `is_featured`, `created_at`, `updated_at`) VALUES
	(1, 1, 'How to Create Your Creator Connect Account', '<h2>Welcome to Creator Connect! 🎉</h2>\r\n<p>Creating your account is quick and easy. Follow the steps below to get started.</p>\r\n\r\n<h3>Step 1 — Sign Up</h3>\r\n<ol>\r\n  <li>Visit <strong>Creator Connect</strong> and click the <strong>Sign Up</strong> button on the top right.</li>\r\n  <li>Enter your full name, email address, and a strong password.</li>\r\n  <li>Alternatively, click <strong>Continue with Google</strong> for one-click registration.</li>\r\n</ol>\r\n\r\n<h3>Step 2 — Verify Your Email</h3>\r\n<p>After signing up, check your inbox for a verification email. Click the link inside to activate your account. The link expires in 24 hours.</p>\r\n\r\n<h3>Step 3 — Complete Your Profile</h3>\r\n<ol>\r\n  <li>Add a profile picture that represents you.</li>\r\n  <li>Write a short <em>About Me</em> bio (up to 300 characters).</li>\r\n  <li>Add your city, state, and country.</li>\r\n  <li>Optionally link your social media pages.</li>\r\n</ol>\r\n\r\n<h3>Tips for a Great Profile</h3>\r\n<ul>\r\n  <li>Use a clear, high-quality photo — profiles with photos get 3× more engagement.</li>\r\n  <li>Your username is permanent after signup, so choose wisely!</li>\r\n  <li>A complete profile builds trust with buyers and followers.</li>\r\n</ul>\r\n\r\n<p><strong>You are now ready to explore, create, and sell on Creator Connect! 🚀</strong></p>', 'how-to-create-account', 1255, 1, '2026-03-08 13:19:36', '2026-03-08 13:28:03'),
	(2, 1, 'Understanding Your Creator Connect Dashboard', '<h2>Your Dashboard at a Glance</h2>\r\n<p>Once logged in, your dashboard is the central hub for everything on Creator Connect.</p>\r\n\r\n<h3>Navigation Bar</h3>\r\n<ul>\r\n  <li><strong>Home</strong> — Your personalised feed of content from creators you follow.</li>\r\n  <li><strong>Explore</strong> — Discover new creators, services, and products.</li>\r\n  <li><strong>Creator Bazaar</strong> — Browse and buy products and services listed by creators.</li>\r\n  <li><strong>Upload</strong> — Post a showcase, service, or product listing.</li>\r\n</ul>\r\n\r\n<h3>Profile Menu</h3>\r\n<p>Click your avatar in the top right to access:</p>\r\n<ul>\r\n  <li>Your public profile page</li>\r\n  <li>My Deals (orders and bookings)</li>\r\n  <li>Settings (account, seller balance, notifications)</li>\r\n  <li>Help Centre</li>\r\n  <li>Logout</li>\r\n</ul>\r\n\r\n<h3>Notifications Bell 🔔</h3>\r\n<p>Get real-time alerts for new orders, booking requests, messages, likes, follows, and payment updates.</p>\r\n\r\n<h3>Dark Mode 🌙</h3>\r\n<p>Toggle dark/light mode using the moon icon in the navigation bar. Your preference is saved automatically.</p>', 'understanding-your-dashboard', 980, 1, '2026-03-08 13:19:36', '2026-03-08 13:19:36'),
	(3, 1, 'How to Follow Creators and Customise Your Feed', '<h2>Building Your Creator Network</h2>\r\n<p>Following your favourite creators personalises your home feed and helps you stay updated on new posts, products, and services.</p>\r\n\r\n<h3>How to Follow Someone</h3>\r\n<ol>\r\n  <li>Visit any creator\'s profile by clicking their name or avatar.</li>\r\n  <li>Click the <strong>Follow</strong> button on their profile page.</li>\r\n  <li>If their account is private, a follow request will be sent and must be accepted.</li>\r\n</ol>\r\n\r\n<h3>Managing Who You Follow</h3>\r\n<ul>\r\n  <li>Go to your profile and click <strong>Following</strong> to see your full list.</li>\r\n  <li>Click <strong>Unfollow</strong> next to any creator to stop seeing their content.</li>\r\n</ul>\r\n\r\n<h3>Private Accounts</h3>\r\n<p>If a creator has set their account to private, you must send a follow request. They will receive a notification and can accept or ignore your request.</p>\r\n\r\n<h3>Your Home Feed</h3>\r\n<p>Your feed shows posts from creators you follow, sorted by recency. Explore the <strong>Explore</strong> tab to find trending content beyond your network.</p>', 'how-to-follow-creators', 760, 0, '2026-03-08 13:19:36', '2026-03-08 13:19:36'),
	(4, 2, 'How to Edit Your Profile and Account Settings', '<h2>Keeping Your Profile Up to Date</h2>\r\n<p>Your profile is how other creators and buyers discover and trust you. Keep it accurate and engaging.</p>\r\n\r\n<h3>Editing Your Profile</h3>\r\n<ol>\r\n  <li>Click your avatar → <strong>Settings</strong>.</li>\r\n  <li>Under the <strong>Profile</strong> tab, you can update:\r\n    <ul>\r\n      <li>Full name and username (username cannot be changed after 30 days of account creation)</li>\r\n      <li>Profile picture</li>\r\n      <li>Bio / About Me</li>\r\n      <li>City, State, Country</li>\r\n      <li>Gender and Date of Birth</li>\r\n      <li>Website URL</li>\r\n    </ul>\r\n  </li>\r\n  <li>Click <strong>Save Changes</strong> when done.</li>\r\n</ol>\r\n\r\n<h3>Changing Your Password</h3>\r\n<ol>\r\n  <li>Go to Settings → <strong>Security</strong> tab.</li>\r\n  <li>Enter your current password, then your new password twice.</li>\r\n  <li>Click <strong>Update Password</strong>.</li>\r\n</ol>\r\n<p>⚠️ If you signed up with Google, you may not have a password set. Use the <em>Forgot Password</em> flow to create one.</p>\r\n\r\n<h3>Changing Your Email</h3>\r\n<p>Email changes require re-verification. A confirmation link will be sent to your new email address before the change takes effect.</p>', 'edit-profile-and-settings', 871, 1, '2026-03-08 13:19:36', '2026-03-08 13:20:50'),
	(5, 2, 'How to Make Your Account Private or Public', '<h2>Controlling Who Sees Your Content</h2>\r\n<p>You can switch between a public and private account at any time from Settings.</p>\r\n\r\n<h3>Public Account (Default)</h3>\r\n<ul>\r\n  <li>Anyone can view your posts, profile, and listings.</li>\r\n  <li>Anyone can follow you without approval.</li>\r\n  <li>Best for creators who want maximum visibility and sales.</li>\r\n</ul>\r\n\r\n<h3>Private Account</h3>\r\n<ul>\r\n  <li>Only approved followers can see your posts.</li>\r\n  <li>New followers must send a request which you approve.</li>\r\n  <li>Your products and services are still discoverable in the Bazaar.</li>\r\n</ul>\r\n\r\n<h3>How to Toggle Privacy</h3>\r\n<ol>\r\n  <li>Go to <strong>Settings → Account</strong> tab.</li>\r\n  <li>Find the <em>Private Account</em> toggle.</li>\r\n  <li>Switch it on or off and save.</li>\r\n</ol>\r\n\r\n<p>💡 <strong>Tip:</strong> Even with a private account, your Bazaar listings (products and services) remain visible to all users so you never lose sales opportunities.</p>', 'private-vs-public-account', 540, 0, '2026-03-08 13:19:36', '2026-03-08 13:19:36'),
	(6, 3, 'How to Upload Your First Post', '<h2>Sharing Your Talent with the World</h2>\r\n<p>Creator Connect supports three types of posts — Showcase, Service, and Product. Here is how to create each one.</p>\r\n\r\n<h3>Starting a New Post</h3>\r\n<ol>\r\n  <li>Click the purple <strong>Upload</strong> button in the navigation bar.</li>\r\n  <li>Choose your post type: <strong>Showcase</strong>, <strong>Service</strong>, or <strong>Product</strong>.</li>\r\n  <li>Upload your media (image or video).</li>\r\n  <li>Fill in the details — title, description, category, price (for Service/Product), etc.</li>\r\n  <li>Click <strong>Publish</strong>.</li>\r\n</ol>\r\n\r\n<h3>Post Types Explained</h3>\r\n<table>\r\n  <tr><th>Type</th><th>Purpose</th><th>Can Earn?</th></tr>\r\n  <tr><td>Showcase</td><td>Share your creative work, talent, or art</td><td>No (but builds following)</td></tr>\r\n  <tr><td>Service</td><td>Offer a service customers can book</td><td>Yes — 100% to you</td></tr>\r\n  <tr><td>Product</td><td>Sell a physical or digital product</td><td>Yes — 95–98% to you</td></tr>\r\n</table>\r\n\r\n<h3>Media Requirements</h3>\r\n<ul>\r\n  <li>Images: JPG, PNG, WEBP — max 10 MB</li>\r\n  <li>Videos: MP4, MOV, WEBM — max 100 MB</li>\r\n  <li>Recommended image ratio: 1:1 or 4:5</li>\r\n</ul>\r\n\r\n<h3>After Publishing</h3>\r\n<p>Your post immediately appears on your profile and in the Explore feed. For products and services, they also appear in the Creator Bazaar.</p>', 'how-to-upload-first-post', 1102, 1, '2026-03-08 13:19:36', '2026-03-08 13:31:41'),
	(7, 3, 'Showcase vs Service vs Product Posts — What is the Difference?', '<h2>Choosing the Right Post Type</h2>\r\n<p>Understanding the three post types helps you use Creator Connect to its full potential.</p>\r\n\r\n<h3>🎨 Showcase Posts</h3>\r\n<p>Showcase posts are for sharing your talent and creative work with the community — think of them like Instagram posts.</p>\r\n<ul>\r\n  <li>No price or selling involved.</li>\r\n  <li>Great for building your audience and personal brand.</li>\r\n  <li>Examples: dance videos, paintings, photography, DIY crafts, comedy skits.</li>\r\n  <li>Engagement: likes, comments, shares, saves.</li>\r\n</ul>\r\n\r\n<h3>🛍️ Service Posts</h3>\r\n<p>Service posts let customers book you for a skill or service you offer.</p>\r\n<ul>\r\n  <li>Set your price, duration, delivery time, and revision policy.</li>\r\n  <li>Customers send a booking request with their requirements.</li>\r\n  <li>You accept, complete the work, and receive 100% of the payment (no platform commission on services).</li>\r\n  <li>Examples: mehndi artist, event planner, graphic designer, tutor, caterer.</li>\r\n</ul>\r\n\r\n<h3>📦 Product Posts</h3>\r\n<p>Product posts let you sell physical or handmade items directly through the platform.</p>\r\n<ul>\r\n  <li>Set price, stock quantity, shipping options, and payment methods.</li>\r\n  <li>Supports UPI, bank transfer, and Cash on Delivery (COD).</li>\r\n  <li>Platform takes 5% on online payments, 2% on COD orders.</li>\r\n  <li>Examples: handmade jewellery, paintings, clothing, plants, beauty products.</li>\r\n</ul>', 'showcase-service-product-difference', 920, 1, '2026-03-08 13:19:36', '2026-03-08 13:19:36'),
	(8, 4, 'Understanding Platform Fees and Commissions', '<h2>How Creator Connect Earns and How You Earn More</h2>\r\n<p>We believe creators should keep the majority of what they earn. Here is exactly how our commission structure works.</p>\r\n\r\n<h3>Commission Rates</h3>\r\n<table>\r\n  <tr><th>Transaction Type</th><th>Platform Fee</th><th>You Receive</th></tr>\r\n  <tr><td>Online Payment (UPI / Bank Transfer)</td><td>5%</td><td>95% credited to your wallet</td></tr>\r\n  <tr><td>Cash on Delivery (COD)</td><td>2%</td><td>You collect 100% cash; 2% deducted from your wallet</td></tr>\r\n  <tr><td>Service Booking (any payment)</td><td>0%</td><td>100% — no commission</td></tr>\r\n</table>\r\n\r\n<h3>How COD Commission Works</h3>\r\n<p>For COD orders, you physically collect the full cash amount from the buyer at delivery. The platform then deducts its 2% commission from your existing wallet balance.</p>\r\n<p><strong>Example:</strong> Order value ₹1,499 → You collect ₹1,499 cash → Platform deducts ₹29.98 from your wallet.</p>\r\n\r\n<h3>Commission Deficit</h3>\r\n<p>If your wallet balance is insufficient to cover a COD commission, the deficit is tracked and automatically recovered from your next online payment earnings.</p>\r\n\r\n<h3>Where to See Your Earnings</h3>\r\n<p>Go to <strong>Settings → Seller</strong> tab to view:</p>\r\n<ul>\r\n  <li>Total Earnings</li>\r\n  <li>Available Balance (ready to withdraw)</li>\r\n  <li>Withdrawn Amount</li>\r\n  <li>Commission Ledger (full transaction history)</li>\r\n</ul>', 'platform-fees-and-commissions', 1452, 1, '2026-03-08 13:19:36', '2026-03-08 13:23:39'),
	(9, 4, 'How to Request a Withdrawal', '<h2>Getting Your Money Out</h2>\r\n<p>Once you have earnings in your wallet, you can request a withdrawal to your UPI ID or bank account.</p>\r\n\r\n<h3>Withdrawal Requirements</h3>\r\n<ul>\r\n  <li>Minimum withdrawal amount: <strong>₹120</strong></li>\r\n  <li>You must have a verified UPI ID or bank account saved in Settings.</li>\r\n  <li>Withdrawals are blocked if you have an outstanding commission deficit.</li>\r\n</ul>\r\n\r\n<h3>How to Request</h3>\r\n<ol>\r\n  <li>Go to <strong>Settings → Seller</strong> tab.</li>\r\n  <li>Scroll to the <em>Withdrawal</em> section and click <strong>Request Withdrawal</strong>.</li>\r\n  <li>Enter the amount (minimum ₹120, maximum = your available balance).</li>\r\n  <li>Confirm your payment details and submit.</li>\r\n</ol>\r\n\r\n<h3>Processing Time</h3>\r\n<ul>\r\n  <li>Withdrawal requests are reviewed by the admin team.</li>\r\n  <li>Approved withdrawals are typically processed within <strong>1–3 business days</strong>.</li>\r\n  <li>You will receive a notification once approved and paid.</li>\r\n</ul>\r\n\r\n<h3>Rejected Withdrawals</h3>\r\n<p>In rare cases, a withdrawal may be rejected (e.g., due to a payment dispute). You will receive a notification with the reason and your balance will be restored.</p>\r\n\r\n<h3>Adding Your Payment Details</h3>\r\n<ol>\r\n  <li>Go to <strong>Settings → Seller → Payment Settings</strong>.</li>\r\n  <li>Add your UPI ID or bank account (account number, IFSC code, holder name).</li>\r\n  <li>Save changes before requesting a withdrawal.</li>\r\n</ol>', 'how-to-request-withdrawal', 1321, 1, '2026-03-08 13:19:36', '2026-03-10 09:25:14'),
	(10, 4, 'How Buyers Pay for Products — UPI, Bank Transfer, and COD', '<h2>Payment Methods for Product Orders</h2>\r\n<p>Creator Connect gives buyers flexibility with multiple payment options.</p>\r\n\r\n<h3>UPI Payment</h3>\r\n<ol>\r\n  <li>At checkout, select <strong>UPI</strong>.</li>\r\n  <li>You will see the seller\'s UPI ID and QR code (or the platform\'s UPI for aggregated payments).</li>\r\n  <li>Complete the payment using any UPI app (GPay, PhonePe, Paytm, etc.).</li>\r\n  <li>Enter your UPI transaction reference number and click <strong>I Have Paid</strong>.</li>\r\n  <li>The seller or admin will verify and confirm your order.</li>\r\n</ol>\r\n\r\n<h3>Bank Transfer (NEFT / IMPS)</h3>\r\n<ol>\r\n  <li>Select <strong>Bank Transfer</strong> at checkout.</li>\r\n  <li>Transfer the exact amount to the provided bank account.</li>\r\n  <li>Submit the transfer reference number.</li>\r\n  <li>Verification usually takes a few hours.</li>\r\n</ol>\r\n\r\n<h3>Cash on Delivery (COD)</h3>\r\n<ul>\r\n  <li>Available only for sellers who have enabled COD.</li>\r\n  <li>Pay the exact order amount to the delivery person/seller upon receiving your item.</li>\r\n  <li>No online transaction required.</li>\r\n  <li>COD orders have a slight delay as the seller must confirm receipt.</li>\r\n</ul>\r\n\r\n<h3>Payment Safety Tips</h3>\r\n<ul>\r\n  <li>Always use the payment details shown on the platform — never pay outside.</li>\r\n  <li>Keep your payment reference/screenshot until the order is delivered.</li>\r\n  <li>If payment is verified but order is not confirmed within 24 hours, contact support.</li>\r\n</ul>', 'how-buyers-pay-for-products', 890, 0, '2026-03-08 13:19:36', '2026-03-08 13:19:36'),
	(11, 5, 'How to Place a Product Order', '<h2>Buying on the Creator Bazaar</h2>\r\n<p>Ordering from a creator is simple. Here is a step-by-step walkthrough.</p>\r\n\r\n<h3>Finding a Product</h3>\r\n<ol>\r\n  <li>Go to <strong>Creator Bazaar</strong> and browse or search.</li>\r\n  <li>Use filters to narrow by category, price, or location.</li>\r\n  <li>Click a product to view its full details.</li>\r\n</ol>\r\n\r\n<h3>Placing Your Order</h3>\r\n<ol>\r\n  <li>On the product page, click <strong>Buy Now</strong>.</li>\r\n  <li>Fill in your shipping address (or auto-fill from a previous order).</li>\r\n  <li>Select quantity and choose your payment method (UPI, Bank Transfer, COD).</li>\r\n  <li>Add any notes for the seller (optional).</li>\r\n  <li>Submit the order.</li>\r\n</ol>\r\n\r\n<h3>Order Status Flow</h3>\r\n<p>After placing an order, it moves through these stages:</p>\r\n<ol>\r\n  <li><strong>Pending</strong> — Waiting for seller to confirm.</li>\r\n  <li><strong>Confirmed</strong> — Seller has accepted your order.</li>\r\n  <li><strong>Processing</strong> — Seller is preparing your item.</li>\r\n  <li><strong>Shipped</strong> — Item is on the way.</li>\r\n  <li><strong>Delivered</strong> — You have received your order.</li>\r\n</ol>\r\n\r\n<h3>Tracking Your Orders</h3>\r\n<p>Go to <strong>My Deals → Buyer → Products</strong> to see all your current and past orders with real-time status updates.</p>', 'how-to-place-product-order', 780, 1, '2026-03-08 13:19:36', '2026-03-08 13:19:36'),
	(12, 5, 'How to Book a Service', '<h2>Getting a Service Done Through Creator Connect</h2>\r\n<p>Whether you need mehndi, event management, graphic design, or tutoring — booking a service is straightforward.</p>\r\n\r\n<h3>Step 1 — Find a Service</h3>\r\n<ol>\r\n  <li>Go to <strong>Creator Bazaar → Services</strong>.</li>\r\n  <li>Browse by category or search for what you need.</li>\r\n  <li>Click on a service to read the full description, features, pricing, and provider profile.</li>\r\n</ol>\r\n\r\n<h3>Step 2 — Send a Booking Request</h3>\r\n<ol>\r\n  <li>Click <strong>Book Now</strong> on the service page.</li>\r\n  <li>Fill in:\r\n    <ul>\r\n      <li>Preferred start date and time</li>\r\n      <li>Detailed project requirements</li>\r\n      <li>Your preferred contact method (email, phone, WhatsApp)</li>\r\n    </ul>\r\n  </li>\r\n  <li>Submit the booking request.</li>\r\n</ol>\r\n\r\n<h3>Step 3 — Wait for Acceptance</h3>\r\n<p>The service provider will review your request and accept or decline. You will receive a notification either way.</p>\r\n\r\n<h3>Step 4 — Service Completion</h3>\r\n<p>Once the work is done, the provider marks it as complete. You can then leave a rating and review.</p>\r\n\r\n<h3>Tracking Your Bookings</h3>\r\n<p>Go to <strong>My Deals → Buyer → Services</strong> to see all your bookings and their current status.</p>\r\n\r\n<p>💡 <strong>Remember:</strong> Services have <strong>zero platform commission</strong> — the creator earns 100% of your payment.</p>', 'how-to-book-a-service', 670, 0, '2026-03-08 13:19:36', '2026-03-08 13:19:36'),
	(13, 6, 'Keeping Your Account Safe', '<h2>Account Security Best Practices</h2>\r\n<p>Your account security is important. Here are the steps we recommend to keep your Creator Connect account safe.</p>\r\n\r\n<h3>Use a Strong Password</h3>\r\n<ul>\r\n  <li>At least 8 characters, mixing letters, numbers, and symbols.</li>\r\n  <li>Do not reuse passwords from other websites.</li>\r\n  <li>Change your password periodically via <strong>Settings → Security</strong>.</li>\r\n</ul>\r\n\r\n<h3>Active Sessions</h3>\r\n<p>Creator Connect tracks your active login sessions. You can review them under <strong>Settings → Sessions</strong>. If you see a session you do not recognise, immediately:</p>\r\n<ol>\r\n  <li>Revoke the suspicious session.</li>\r\n  <li>Change your password.</li>\r\n  <li>Contact support if needed.</li>\r\n</ol>\r\n\r\n<h3>Phishing and Scam Awareness</h3>\r\n<ul>\r\n  <li>Creator Connect will <strong>never</strong> ask for your password via email or chat.</li>\r\n  <li>Always check that you are on <code>127.0.0.1:5500</code> (or the official domain) before entering credentials.</li>\r\n  <li>Do not send payments outside the platform to avoid scams.</li>\r\n</ul>\r\n\r\n<h3>Reporting Suspicious Activity</h3>\r\n<p>Use the <strong>Help → Support</strong> section to raise a ticket if you believe your account has been compromised or if you encounter suspicious users.</p>', 'keeping-account-safe', 561, 1, '2026-03-08 13:19:36', '2026-03-08 13:20:59'),
	(14, 6, 'How to Report a User or Post', '<h2>Community Standards and Reporting</h2>\r\n<p>Creator Connect is committed to a safe, respectful community. If you encounter content or behaviour that violates our guidelines, please report it.</p>\r\n\r\n<h3>What You Can Report</h3>\r\n<ul>\r\n  <li>Fake or misleading product listings</li>\r\n  <li>Inappropriate or offensive content</li>\r\n  <li>Scam attempts or fraudulent behaviour</li>\r\n  <li>Harassment or abusive messages</li>\r\n  <li>Copyright infringement</li>\r\n</ul>\r\n\r\n<h3>How to Report a Post</h3>\r\n<ol>\r\n  <li>Open the post and click the <strong>⋮ (More)</strong> menu.</li>\r\n  <li>Select <strong>Report</strong>.</li>\r\n  <li>Choose the reason and add details if prompted.</li>\r\n  <li>Submit — our moderation team will review within 24 hours.</li>\r\n</ol>\r\n\r\n<h3>How to Report a User</h3>\r\n<ol>\r\n  <li>Visit the user\'s profile.</li>\r\n  <li>Click the <strong>⋮</strong> menu on their profile page.</li>\r\n  <li>Select <strong>Report User</strong> and provide details.</li>\r\n</ol>\r\n\r\n<h3>After Reporting</h3>\r\n<p>All reports are reviewed confidentially. You will receive a notification once action is taken. We may remove content, issue warnings, or suspend accounts depending on severity.</p>', 'how-to-report-user-or-post', 420, 0, '2026-03-08 13:19:36', '2026-03-08 13:19:36'),
	(15, 3, 'Creating Your First Post — A Step-by-Step Guide', '<h2>Ready to Share? Here\'s How to Create Your First Post</h2>\r\n<p>Whether you want to showcase your talent, offer a service, or sell a product, Creator Connect makes posting simple. Follow this step-by-step guide to publish your very first post.</p>\r\n\r\n<hr>\r\n\r\n<h3>Step 1 — Tap the Upload Button</h3>\r\n<p>Look for the purple <strong>Upload</strong> button in the top navigation bar (desktop) or the <strong>+ icon</strong> in the bottom tab bar (mobile). Tap it to open the post creation screen.</p>\r\n\r\n<h3>Step 2 — Choose Your Post Type</h3>\r\n<p>You will be asked to pick one of three post types:</p>\r\n<ul>\r\n  <li><strong>Showcase</strong> — Share your creative work (art, dance, photography, DIY, etc.) with the community. No selling involved.</li>\r\n  <li><strong>Service</strong> — Offer a skill or service that customers can book and pay for.</li>\r\n  <li><strong>Product</strong> — List a physical or handmade item for sale in the Bazaar.</li>\r\n</ul>\r\n<p>Not sure which to pick? Read <a href="/help/article/showcase-vs-service-vs-product">Showcase vs Service vs Product</a> for a detailed comparison.</p>\r\n\r\n<h3>Step 3 — Upload Your Media</h3>\r\n<p>Every post requires at least one image or video.</p>\r\n<ul>\r\n  <li><strong>Images:</strong> JPG, PNG, or WEBP — maximum 10 MB per image.</li>\r\n  <li><strong>Videos:</strong> MP4, MOV, or WEBM — maximum 100 MB.</li>\r\n  <li><strong>Tip:</strong> Use a square (1:1) or portrait (4:5) ratio for best display in the feed.</li>\r\n</ul>\r\n<p>You can upload up to <strong>5 images</strong> for product posts to show different angles.</p>\r\n\r\n<h3>Step 4 — Fill in the Details</h3>\r\n<p>Depending on your post type, you will be asked to fill in different fields:</p>\r\n\r\n<table>\r\n  <thead>\r\n    <tr><th>Field</th><th>Showcase</th><th>Service</th><th>Product</th></tr>\r\n  </thead>\r\n  <tbody>\r\n    <tr><td>Title</td><td>✓</td><td>✓</td><td>✓</td></tr>\r\n    <tr><td>Description</td><td>✓</td><td>✓</td><td>✓</td></tr>\r\n    <tr><td>Category / Tags</td><td>✓</td><td>✓</td><td>✓</td></tr>\r\n    <tr><td>Price</td><td>—</td><td>✓</td><td>✓</td></tr>\r\n    <tr><td>Delivery Time</td><td>—</td><td>✓</td><td>—</td></tr>\r\n    <tr><td>Stock Quantity</td><td>—</td><td>—</td><td>✓</td></tr>\r\n    <tr><td>Shipping Options</td><td>—</td><td>—</td><td>✓</td></tr>\r\n    <tr><td>Payment Methods</td><td>—</td><td>—</td><td>✓</td></tr>\r\n  </tbody>\r\n</table>\r\n\r\n<h3>Step 5 — Write a Great Description</h3>\r\n<p>A clear, detailed description helps buyers understand what you offer. Here are some tips:</p>\r\n<ul>\r\n  <li>Start with what the item/service <em>is</em> and who it is for.</li>\r\n  <li>Mention materials, dimensions, or specifications if relevant.</li>\r\n  <li>For services, mention what is included and what is not.</li>\r\n  <li>Use simple language — avoid jargon.</li>\r\n  <li>Add relevant keywords so your post shows up in search.</li>\r\n</ul>\r\n\r\n<h3>Step 6 — Set Visibility and Publishing Options</h3>\r\n<ul>\r\n  <li><strong>Public:</strong> Visible to all users and in Explore/Bazaar (recommended).</li>\r\n  <li><strong>Followers only:</strong> Only your approved followers can see it.</li>\r\n</ul>\r\n\r\n<h3>Step 7 — Tap Publish!</h3>\r\n<p>Review everything one last time, then hit the <strong>Publish</strong> button. Your post will immediately appear on your profile and in the community feed. Service and Product posts also appear in the <strong>Creator Bazaar</strong> for buyers to discover.</p>\r\n\r\n<hr>\r\n\r\n<h3>After Publishing — What Happens Next?</h3>\r\n<ul>\r\n  <li>Your followers will see your post in their feed right away.</li>\r\n  <li>The post is indexed for search and Explore within a few minutes.</li>\r\n  <li>For products, buyers can place an order immediately.</li>\r\n  <li>For services, customers can send you a booking request.</li>\r\n  <li>You can edit or delete your post at any time from your profile.</li>\r\n</ul>\r\n\r\n<h3>Need to Edit After Publishing?</h3>\r\n<p>Go to your profile, tap the post, then tap the <strong>⋮ menu → Edit Post</strong>. You can update the description, price, stock, and media at any time. Note: changing the price does not affect orders already placed.</p>\r\n\r\n<div class="help-tip">\r\n  <strong>💡 Pro Tip:</strong> Posts with high-quality photos and detailed descriptions get 3× more engagement. Spend a few extra minutes on your first post — it sets the tone for your creator profile!\r\n</div>', 'creating-your-first-post-step-by-step', 0, 1, '2026-03-08 13:27:57', '2026-03-08 13:27:57'),
	(16, 3, 'Selling on the Bazaar — How to List and Sell Your Services or Products', '<h2>Start Earning on Creator Connect\'s Bazaar</h2>\r\n<p>The <strong>Creator Bazaar</strong> is the marketplace section of Creator Connect where creators list their services and physical/handmade products for sale. This guide covers everything you need to know to start selling.</p>\r\n\r\n<hr>\r\n\r\n<h2>Part 1 — Selling a Service</h2>\r\n\r\n<h3>What Counts as a Service?</h3>\r\n<p>Any skill or work you can perform for a customer qualifies. Examples include:</p>\r\n<ul>\r\n  <li>Mehndi / henna design</li>\r\n  <li>Graphic design or logo creation</li>\r\n  <li>Photography or videography</li>\r\n  <li>Home tutoring or online classes</li>\r\n  <li>Event planning or decoration</li>\r\n  <li>Tailoring, stitching, or embroidery</li>\r\n  <li>Catering or cooking</li>\r\n  <li>Music lessons or performance</li>\r\n</ul>\r\n\r\n<h3>Creating a Service Listing</h3>\r\n<ol>\r\n  <li>Tap <strong>Upload → Service Post</strong>.</li>\r\n  <li>Upload a clear photo or short video showcasing your work.</li>\r\n  <li>Enter a descriptive <strong>title</strong> (e.g., "Professional Mehndi for Bridal Events").</li>\r\n  <li>Write a detailed <strong>description</strong> — what is included, your process, and what customers can expect.</li>\r\n  <li>Set your <strong>price</strong>. You can offer packages (Basic / Standard / Premium) if needed.</li>\r\n  <li>Set <strong>delivery time</strong> — how many days it takes to complete the service.</li>\r\n  <li>Specify your <strong>revision policy</strong> — how many rounds of changes you offer.</li>\r\n  <li>Choose relevant <strong>tags and category</strong> to help buyers find you.</li>\r\n  <li>Tap <strong>Publish</strong>.</li>\r\n</ol>\r\n\r\n<h3>How Service Bookings Work</h3>\r\n<ol>\r\n  <li>A customer finds your service listing and taps <strong>Book Now</strong>.</li>\r\n  <li>They describe their requirements and submit the booking request.</li>\r\n  <li>You receive a notification — review the request and <strong>Accept</strong> or <strong>Decline</strong>.</li>\r\n  <li>Once accepted, complete the work and mark it as <strong>Delivered</strong>.</li>\r\n  <li>The customer confirms delivery and payment is released to your wallet.</li>\r\n</ol>\r\n\r\n<h3>Service Earnings</h3>\r\n<p>Creator Connect charges <strong>zero commission</strong> on services. You keep <strong>100% of the booking amount</strong>. Earnings are credited to your wallet once the booking is marked complete.</p>\r\n\r\n<hr>\r\n\r\n<h2>Part 2 — Selling a Product</h2>\r\n\r\n<h3>What Can You Sell?</h3>\r\n<p>You can sell physical, handmade, or artisan products. Examples:</p>\r\n<ul>\r\n  <li>Handmade jewellery, accessories, or clothing</li>\r\n  <li>Home décor, candles, or pottery</li>\r\n  <li>Baked goods, homemade food items (where permitted)</li>\r\n  <li>Art prints, illustrations, or stationery</li>\r\n  <li>Customised gifts or personalised items</li>\r\n  <li>Craft supplies or DIY kits</li>\r\n</ul>\r\n\r\n<h3>Creating a Product Listing</h3>\r\n<ol>\r\n  <li>Tap <strong>Upload → Product Post</strong>.</li>\r\n  <li>Upload up to <strong>5 photos</strong> of your product from different angles. Good photos are your biggest selling tool.</li>\r\n  <li>Enter a clear <strong>title</strong> that describes exactly what you are selling.</li>\r\n  <li>Write a detailed <strong>description</strong> — include materials, dimensions, weight, colour options, and any customisation available.</li>\r\n  <li>Set your <strong>price</strong> in rupees.</li>\r\n  <li>Enter your <strong>stock quantity</strong> — how many units you have available.</li>\r\n  <li>Choose <strong>shipping options</strong>:\r\n    <ul>\r\n      <li><em>Ship yourself</em> — you handle packaging and courier.</li>\r\n      <li><em>Local pickup</em> — buyer collects from your location.</li>\r\n    </ul>\r\n  </li>\r\n  <li>Choose <strong>accepted payment methods</strong>:\r\n    <ul>\r\n      <li><em>Online (UPI / Bank Transfer)</em> — payment collected by platform, credited to your wallet after delivery.</li>\r\n      <li><em>Cash on Delivery (COD)</em> — you collect cash directly from the buyer on delivery.</li>\r\n    </ul>\r\n  </li>\r\n  <li>Tap <strong>Publish</strong>.</li>\r\n</ol>\r\n\r\n<h3>Managing Incoming Orders</h3>\r\n<ol>\r\n  <li>When a buyer places an order, you are notified immediately.</li>\r\n  <li>Go to <strong>My Deals → Seller tab</strong> to view the order details and buyer\'s delivery address.</li>\r\n  <li>Pack the item and ship it within your stated processing time.</li>\r\n  <li>Mark the order as <strong>Shipped</strong> and enter the tracking number (if available).</li>\r\n  <li>Once the buyer confirms delivery (or after the auto-confirm window), the order is marked <strong>Delivered</strong>.</li>\r\n</ol>\r\n\r\n<h3>Product Commission Structure</h3>\r\n<table>\r\n  <thead>\r\n    <tr><th>Payment Method</th><th>Platform Commission</th><th>You Receive</th></tr>\r\n  </thead>\r\n  <tbody>\r\n    <tr><td>Online (UPI / Bank Transfer)</td><td>5%</td><td>95% → credited to your wallet</td></tr>\r\n    <tr><td>Cash on Delivery (COD)</td><td>2%</td><td>98% in cash (2% deducted from your wallet)</td></tr>\r\n  </tbody>\r\n</table>\r\n<p><strong>Note on COD:</strong> You collect the full amount in cash from the buyer. The platform deducts the 2% commission from your existing wallet balance. Make sure you maintain a small balance to cover COD commissions.</p>\r\n\r\n<hr>\r\n\r\n<h2>Tips for Selling More on the Bazaar</h2>\r\n<ul>\r\n  <li><strong>Quality photos matter most.</strong> Listings with clear, well-lit photos get significantly more clicks.</li>\r\n  <li><strong>Price competitively.</strong> Check similar listings to understand market rates before setting your price.</li>\r\n  <li><strong>Respond quickly.</strong> Fast replies to booking requests and buyer questions build trust and positive reviews.</li>\r\n  <li><strong>Keep stock updated.</strong> Mark items as out-of-stock promptly to avoid failed orders.</li>\r\n  <li><strong>Collect reviews.</strong> Encourage satisfied customers to leave a rating — reviews boost your visibility in search.</li>\r\n  <li><strong>Share your listings.</strong> Post your product/service links on other platforms to drive traffic to your Bazaar store.</li>\r\n</ul>\r\n\r\n<h3>Withdrawing Your Earnings</h3>\r\n<p>Once you have earned at least <strong>₹120</strong> in your wallet, you can request a withdrawal to your linked UPI ID or bank account. Go to <strong>Settings → Seller Balance → Request Withdrawal</strong>. Withdrawals are typically processed within 2–3 business days.</p>\r\n\r\n<div class="help-tip">\r\n  <strong>💡 Pro Tip:</strong> Build your Showcase profile first to attract followers — then when you list a product or service, you already have an audience ready to buy!\r\n</div>', 'selling-on-bazaar-list-services-products', 0, 1, '2026-03-08 13:27:57', '2026-03-08 13:27:57');

-- Dumping structure for table creator_connect.help_categories
CREATE TABLE IF NOT EXISTS `help_categories` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_icon` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `display_order` int DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.help_categories: ~6 rows (approximately)
INSERT INTO `help_categories` (`category_id`, `category_name`, `category_icon`, `category_description`, `display_order`, `created_at`) VALUES
	(1, 'Getting Started', 'fas fa-rocket', 'New to Creator Connect? Start here.', 1, '2026-02-24 16:54:35'),
	(2, 'Account & Profile', 'fas fa-user-circle', 'Manage your account settings and profile.', 2, '2026-02-24 16:54:35'),
	(3, 'Posts & Content', 'fas fa-photo-video', 'Creating and managing your posts.', 3, '2026-02-24 16:54:35'),
	(4, 'Payments & Billing', 'fas fa-credit-card', 'Payment methods, billing and withdrawals.', 4, '2026-02-24 16:54:35'),
	(5, 'Orders & Services', 'fas fa-box-open', 'Managing your orders and service bookings.', 5, '2026-02-24 16:54:35'),
	(6, 'Safety & Privacy', 'fas fa-shield-alt', 'Privacy settings and account security.', 6, '2026-02-24 16:54:35');

-- Dumping structure for table creator_connect.messages
CREATE TABLE IF NOT EXISTS `messages` (
  `message_id` int NOT NULL AUTO_INCREMENT,
  `sender_id` int NOT NULL,
  `receiver_id` int NOT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `media_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `media_type` enum('image','video','audio','file','shared_post') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_delivered` tinyint(1) DEFAULT '0',
  `is_read` tinyint(1) DEFAULT '0',
  `read_at` timestamp NULL DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_for_everyone` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`message_id`),
  KEY `idx_sender` (`sender_id`),
  KEY `idx_receiver` (`receiver_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.messages: ~11 rows (approximately)
INSERT INTO `messages` (`message_id`, `sender_id`, `receiver_id`, `message`, `media_url`, `media_type`, `is_delivered`, `is_read`, `read_at`, `is_deleted`, `deleted_for_everyone`, `created_at`, `updated_at`) VALUES
	(6, 8, 31, 'hy', NULL, NULL, 1, 1, '2026-03-10 09:21:05', 0, 0, '2026-03-10 09:20:46', '2026-03-10 09:21:05'),
	(7, 31, 8, '😊😊', NULL, NULL, 1, 1, '2026-03-10 09:21:22', 0, 0, '2026-03-10 09:21:22', '2026-03-10 09:21:22'),
	(10, 33, 8, 'hyy', NULL, NULL, 1, 1, '2026-03-11 08:26:38', 0, 0, '2026-03-11 08:26:29', '2026-03-11 08:26:38'),
	(11, 33, 3, 'hyy', NULL, NULL, 1, 1, '2026-03-22 16:22:09', 0, 0, '2026-03-22 16:21:17', '2026-03-22 16:22:09'),
	(12, 33, 3, 'hy', NULL, NULL, 1, 1, '2026-03-22 16:30:50', 0, 0, '2026-03-22 16:30:46', '2026-03-22 16:30:50'),
	(13, 3, 33, 'hy', NULL, NULL, 1, 1, '2026-03-22 16:31:07', 0, 0, '2026-03-22 16:30:57', '2026-03-22 16:31:07'),
	(14, 33, 8, '{"type": "shared_post", "post_id": 44, "post_type": "service", "caption": "Elegant Mehndi designs for every occasion \\ud83d\\udc9a", "media_url": "uploads/posts/3_20260322_085049_Screenshot_2026-03-21_192318.png", "media_type": "image", "product_title": "Bridal | Party | Festive | Custom Designs", "price": 500.0, "currency": "INR", "author": {"username": "Binita", "name": "Binita G Vasita", "avatar": "uploads/profile/20260225_063349_profile.jpg"}}', NULL, 'shared_post', 1, 1, '2026-03-22 17:32:15', 0, 0, '2026-03-22 16:31:18', '2026-03-22 17:32:15'),
	(15, 3, 14, '{"type": "shared_post", "post_id": 44, "post_type": "service", "caption": "Elegant Mehndi designs for every occasion \\ud83d\\udc9a", "media_url": "uploads/posts/3_20260322_085049_Screenshot_2026-03-21_192318.png", "media_type": "image", "product_title": "Bridal | Party | Festive | Custom Designs", "price": 500.0, "currency": "INR", "author": {"username": "Binita", "name": "Binita G Vasita", "avatar": "uploads/profile/20260225_063349_profile.jpg"}}', NULL, 'shared_post', 1, 1, '2026-03-22 16:37:53', 0, 0, '2026-03-22 16:37:20', '2026-03-22 16:37:53'),
	(16, 3, 14, NULL, NULL, NULL, 1, 1, '2026-03-22 16:46:11', 0, 1, '2026-03-22 16:45:32', '2026-03-22 16:59:01'),
	(17, 14, 3, 'hyy', NULL, NULL, 1, 1, '2026-03-22 16:46:26', 0, 0, '2026-03-22 16:46:22', '2026-03-22 16:46:26'),
	(18, 3, 14, 'hy', NULL, NULL, 1, 1, '2026-03-22 17:29:41', 0, 0, '2026-03-22 17:29:39', '2026-03-22 17:29:41');

-- Dumping structure for table creator_connect.message_deletions
CREATE TABLE IF NOT EXISTS `message_deletions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `message_id` int NOT NULL,
  `user_id` int NOT NULL COMMENT 'User who deleted for themselves',
  `deleted_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_message` (`message_id`,`user_id`),
  KEY `idx_md_message` (`message_id`),
  KEY `idx_md_user` (`user_id`),
  CONSTRAINT `fk_md_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`message_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_md_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tracks per-user message deletions (delete for me)';

-- Dumping data for table creator_connect.message_deletions: ~0 rows (approximately)
INSERT INTO `message_deletions` (`id`, `message_id`, `user_id`, `deleted_at`) VALUES
	(1, 17, 14, '2026-03-22 16:59:12');

-- Dumping structure for table creator_connect.message_reactions
CREATE TABLE IF NOT EXISTS `message_reactions` (
  `reaction_id` int NOT NULL AUTO_INCREMENT,
  `message_id` int NOT NULL,
  `user_id` int NOT NULL,
  `reaction_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`reaction_id`),
  UNIQUE KEY `unique_reaction` (`message_id`,`user_id`),
  KEY `idx_message` (`message_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `message_reactions_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `messages` (`message_id`) ON DELETE CASCADE,
  CONSTRAINT `message_reactions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.message_reactions: ~0 rows (approximately)
INSERT INTO `message_reactions` (`reaction_id`, `message_id`, `user_id`, `reaction_type`, `created_at`) VALUES
	(7, 6, 31, 'love', '2026-03-10 09:21:43');

-- Dumping structure for table creator_connect.message_requests
CREATE TABLE IF NOT EXISTS `message_requests` (
  `request_id` int NOT NULL AUTO_INCREMENT,
  `sender_id` int NOT NULL COMMENT 'User who initiated the message request',
  `receiver_id` int NOT NULL COMMENT 'User who receives the request',
  `first_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'The first message shown in the request preview',
  `status` enum('pending','accepted','declined') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`request_id`),
  UNIQUE KEY `unique_request` (`sender_id`,`receiver_id`),
  KEY `idx_mr_receiver_status` (`receiver_id`,`status`),
  KEY `idx_mr_sender` (`sender_id`),
  KEY `idx_mr_created` (`created_at`),
  CONSTRAINT `fk_mr_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mr_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Instagram-style message requests for non-mutual followers';

-- Dumping data for table creator_connect.message_requests: ~4 rows (approximately)
INSERT INTO `message_requests` (`request_id`, `sender_id`, `receiver_id`, `first_message`, `status`, `created_at`, `updated_at`) VALUES
	(1, 33, 3, 'hyy', 'accepted', '2026-03-22 16:21:17', '2026-03-22 16:22:08'),
	(2, 3, 33, 'hy', 'accepted', '2026-03-22 16:30:57', '2026-03-22 16:31:07'),
	(3, 3, 14, 'hy', 'accepted', '2026-03-22 16:45:32', '2026-03-22 16:46:11'),
	(4, 14, 3, 'hyy', 'accepted', '2026-03-22 16:46:22', '2026-03-22 16:46:26');

-- Dumping structure for table creator_connect.notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `notification_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `sender_id` int DEFAULT NULL,
  `notification_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `related_post_id` int DEFAULT NULL,
  `related_comment_id` int DEFAULT NULL,
  `related_message_id` int DEFAULT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_sender_id` (`sender_id`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_created_at` (`created_at`),
  KEY `notifications_ibfk_3` (`related_post_id`),
  KEY `notifications_ibfk_4` (`related_comment_id`),
  KEY `fk_notifications_message` (`related_message_id`),
  CONSTRAINT `fk_notifications_message` FOREIGN KEY (`related_message_id`) REFERENCES `messages` (`message_id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_ibfk_3` FOREIGN KEY (`related_post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_ibfk_4` FOREIGN KEY (`related_comment_id`) REFERENCES `post_comments` (`comment_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=256 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.notifications: ~137 rows (approximately)
INSERT INTO `notifications` (`notification_id`, `user_id`, `sender_id`, `notification_type`, `related_post_id`, `related_comment_id`, `related_message_id`, `message`, `is_read`, `created_at`) VALUES
	(6, 9, 8, 'order_request', NULL, NULL, NULL, 'Jiral Bavishi placed an order for "Traditional Navratri Chaniya Choli 💃✨" — ₹2949.0||NAV:my-deals.html?role=seller&type=products&status=pending', 0, '2026-02-25 03:40:26'),
	(11, 5, 9, 'booking_request', NULL, NULL, NULL, 'Twinkle Nai requested a booking for "Premium Event Catering Service 🍽️✨" — ₹450.00||NAV:my-deals.html?role=seller&type=services&status=pending', 0, '2026-02-25 03:43:08'),
	(12, 9, 5, 'booking_accepted', NULL, NULL, NULL, 'Dhruvi Khandhar accepted your booking for "Premium Event Catering Service 🍽️✨" — they will contact you soon!||NAV:my-deals.html?role=buyer&type=services&status=accepted', 0, '2026-02-25 03:43:31'),
	(13, 9, 5, 'booking_accepted', NULL, NULL, NULL, 'Dhruvi Khandhar accepted your booking for "Premium Event Catering Service 🍽️✨" — they will contact you soon!||NAV:my-deals.html?role=buyer&type=services&status=accepted', 0, '2026-02-25 03:43:35'),
	(26, 10, 7, 'follow', NULL, NULL, NULL, 'Mamta Desai started following you', 0, '2026-02-27 11:33:59'),
	(33, 30, 8, 'order_accepted', NULL, NULL, NULL, 'Jiral Bavishi confirmed your order for "Swiss Beauty Face Perfection Makeup Kit"||NAV:my-deals.html?role=buyer&type=products&status=confirmed', 0, '2026-02-28 13:29:25'),
	(34, 30, 8, 'order_status_update', NULL, NULL, NULL, 'Your order for "Swiss Beauty Face Perfection Makeup Kit" is now being processed||NAV:my-deals.html?role=buyer&type=products', 0, '2026-02-28 13:29:38'),
	(35, 30, 8, 'order_status_update', NULL, NULL, NULL, 'Your order for "Swiss Beauty Face Perfection Makeup Kit" has been shipped||NAV:my-deals.html?role=buyer&type=products', 0, '2026-02-28 13:29:55'),
	(36, 30, 8, 'order_status_update', NULL, NULL, NULL, 'Your order for "Swiss Beauty Face Perfection Makeup Kit" has been delivered||NAV:my-deals.html?role=buyer&type=products', 0, '2026-02-28 13:30:01'),
	(38, 30, 8, 'order_accepted', NULL, NULL, NULL, 'Jiral Bavishi confirmed your order for "Swiss Beauty Face Perfection Makeup Kit"||NAV:my-deals.html?role=buyer&type=products&status=confirmed', 0, '2026-02-28 13:31:17'),
	(39, 30, 8, 'order_status_update', NULL, NULL, NULL, 'Your order for "Swiss Beauty Face Perfection Makeup Kit" is now being processed||NAV:my-deals.html?role=buyer&type=products', 0, '2026-02-28 13:31:36'),
	(40, 30, 8, 'order_status_update', NULL, NULL, NULL, 'Your order for "Swiss Beauty Face Perfection Makeup Kit" has been shipped||NAV:my-deals.html?role=buyer&type=products', 0, '2026-02-28 13:31:53'),
	(41, 30, 8, 'order_status_update', NULL, NULL, NULL, 'Your order for "Swiss Beauty Face Perfection Makeup Kit" has been delivered||NAV:my-deals.html?role=buyer&type=products', 0, '2026-02-28 13:32:32'),
	(42, 17, 30, 'booking_request', NULL, NULL, NULL, 'Vidhi Shah requested a booking for "𝙒𝙚𝙙𝙙𝙞𝙣𝙜 𝙚𝙫𝙚𝙣𝙩 𝙢𝙖𝙣𝙖𝙜𝙚𝙢𝙚𝙣𝙩" — ₹100000.00||NAV:my-deals.html?role=seller&type=services&status=pending', 0, '2026-02-28 13:37:36'),
	(43, 30, 17, 'booking_accepted', NULL, NULL, NULL, 'Vipul Joshi accepted your booking for "𝙒𝙚𝙙𝙙𝙞𝙣𝙜 𝙚𝙫𝙚𝙣𝙩 𝙢𝙖𝙣𝙖𝙜𝙚𝙢𝙚𝙣𝙩" — they will contact you soon!||NAV:my-deals.html?role=buyer&type=services&status=accepted', 0, '2026-02-28 13:38:38'),
	(44, 30, 17, 'booking_accepted', NULL, NULL, NULL, 'Vipul Joshi accepted your booking for "𝙒𝙚𝙙𝙙𝙞𝙣𝙜 𝙚𝙫𝙚𝙣𝙩 𝙢𝙖𝙣𝙖𝙜𝙚𝙢𝙚𝙣𝙩" — they will contact you soon!||NAV:my-deals.html?role=buyer&type=services&status=accepted', 0, '2026-02-28 13:38:39'),
	(45, 30, 17, 'booking_accepted', NULL, NULL, NULL, 'Vipul Joshi accepted your booking for "𝙒𝙚𝙙𝙙𝙞𝙣𝙜 𝙚𝙫𝙚𝙣𝙩 𝙢𝙖𝙣𝙖𝙜𝙚𝙢𝙚𝙣𝙩" — they will contact you soon!||NAV:my-deals.html?role=buyer&type=services&status=accepted', 0, '2026-02-28 13:38:39'),
	(46, 18, 30, 'booking_request', NULL, NULL, NULL, 'Vidhi Shah requested a booking for "Behind the Scenes: The Power of Grid Sys..." — ₹3000.00||NAV:my-deals.html?role=seller&type=services&status=pending', 0, '2026-02-28 13:50:17'),
	(47, 30, 18, 'booking_accepted', NULL, NULL, NULL, 'Muskan Mehta accepted your booking for "Behind the Scenes: The Power of Grid Sys..." — they will contact you soon!||NAV:my-deals.html?role=buyer&type=services&status=accepted', 0, '2026-02-28 13:51:15'),
	(61, 9, 8, 'order_request', NULL, NULL, NULL, 'Jiral Bavishi placed an order for "Traditional Navratri Chaniya Choli 💃✨" — ₹2949.0||NAV:my-deals.html?role=seller&type=products&status=pending', 0, '2026-03-03 08:45:07'),
	(81, 14, 8, 'order_request', NULL, NULL, NULL, 'Jiral Bavishi placed an order for "Beautiful Blue Peacock Canvas Painting" — ₹3000.0||NAV:my-deals.html?role=seller&type=products&status=pending', 0, '2026-03-03 09:24:28'),
	(86, 14, 8, 'order_request', NULL, NULL, NULL, 'Jiral Bavishi placed an order for "Beautiful Blue Peacock Canvas Painting" — ₹3000.0||NAV:my-deals.html?role=seller&type=products&status=pending', 0, '2026-03-03 09:25:35'),
	(92, 9, 8, 'order_accepted', NULL, NULL, NULL, 'Jiral Bavishi confirmed your order for "Swiss Beauty Face Perfection Makeup Kit"||NAV:my-deals.html?role=buyer&type=products&status=confirmed', 0, '2026-03-03 15:59:32'),
	(93, 9, 8, 'order_status_update', NULL, NULL, NULL, 'Your order for "Swiss Beauty Face Perfection Makeup Kit" is now being processed||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-03 15:59:39'),
	(94, 9, 8, 'order_status_update', NULL, NULL, NULL, 'Your order for "Swiss Beauty Face Perfection Makeup Kit" has been shipped||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-03 15:59:46'),
	(95, 9, 8, 'order_status_update', NULL, NULL, NULL, 'Your order for "Swiss Beauty Face Perfection Makeup Kit" has been delivered||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-03 16:29:57'),
	(96, 14, 9, 'order_request', NULL, NULL, NULL, 'Twinkle Nai placed an order for "Beautiful Blue Peacock Canvas Painting" — ₹3000.0||NAV:my-deals.html?role=seller&type=products&status=pending', 0, '2026-03-03 16:34:00'),
	(97, 9, 14, 'order_accepted', NULL, NULL, NULL, 'Art World confirmed your order for "Beautiful Blue Peacock Canvas Painting"||NAV:my-deals.html?role=buyer&type=products&status=confirmed', 0, '2026-03-03 16:34:25'),
	(98, 9, 14, 'order_status_update', NULL, NULL, NULL, 'Your order for "Beautiful Blue Peacock Canvas Painting" is now being processed||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-03 16:34:34'),
	(99, 9, 14, 'order_status_update', NULL, NULL, NULL, 'Your order for "Beautiful Blue Peacock Canvas Painting" has been shipped||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-03 16:34:42'),
	(100, 9, 14, 'order_status_update', NULL, NULL, NULL, 'Your order for "Beautiful Blue Peacock Canvas Painting" has been delivered||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-03 16:35:02'),
	(101, 14, 9, 'order_request', NULL, NULL, NULL, 'Twinkle Nai placed an order for "Beautiful Blue Peacock Canvas Painting" — ₹3000.0||NAV:my-deals.html?role=seller&type=products&status=pending', 0, '2026-03-03 16:41:43'),
	(102, 9, 14, 'order_accepted', NULL, NULL, NULL, 'Art World confirmed your order for "Beautiful Blue Peacock Canvas Painting"||NAV:my-deals.html?role=buyer&type=products&status=confirmed', 0, '2026-03-03 16:42:04'),
	(103, 9, 14, 'order_status_update', NULL, NULL, NULL, 'Your order for "Beautiful Blue Peacock Canvas Painting" is now being processed||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-03 16:42:19'),
	(104, 9, 14, 'order_status_update', NULL, NULL, NULL, 'Your order for "Beautiful Blue Peacock Canvas Painting" has been shipped||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-03 16:42:27'),
	(105, 9, 14, 'order_status_update', NULL, NULL, NULL, 'Your order for "Beautiful Blue Peacock Canvas Painting" has been delivered||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-03 16:42:34'),
	(107, 14, 8, 'order_accepted', NULL, NULL, NULL, 'Jiral Bavishi confirmed your order for "Swiss Beauty Face Perfection Makeup Kit"||NAV:my-deals.html?role=buyer&type=products&status=confirmed', 0, '2026-03-03 16:43:57'),
	(108, 14, 8, 'order_status_update', NULL, NULL, NULL, 'Your order for "Swiss Beauty Face Perfection Makeup Kit" is now being processed||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-03 16:44:04'),
	(109, 14, 8, 'order_status_update', NULL, NULL, NULL, 'Your order for "Swiss Beauty Face Perfection Makeup Kit" has been shipped||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-03 16:44:14'),
	(110, 14, 8, 'order_status_update', NULL, NULL, NULL, 'Your order for "Swiss Beauty Face Perfection Makeup Kit" has been delivered||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-03 16:44:21'),
	(111, 14, 8, 'order_request', NULL, NULL, NULL, 'Jiral Bavishi placed an order for "Beautiful Blue Peacock Canvas Painting" — ₹3000.0||NAV:my-deals.html?role=seller&type=products&status=pending', 0, '2026-03-03 16:52:02'),
	(117, 14, 9, 'order_request', NULL, NULL, NULL, 'Twinkle Nai placed an order for "Beautiful Blue Peacock Canvas Painting" — ₹3000.0||NAV:my-deals.html?role=seller&type=products&status=pending', 0, '2026-03-03 17:13:24'),
	(118, 9, 14, 'order_accepted', NULL, NULL, NULL, 'Art World confirmed your order for "Beautiful Blue Peacock Canvas Painting"||NAV:my-deals.html?role=buyer&type=products&status=confirmed', 0, '2026-03-03 17:13:35'),
	(119, 9, 14, 'order_status_update', NULL, NULL, NULL, 'Your order for "Beautiful Blue Peacock Canvas Painting" is now being processed||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-03 17:13:43'),
	(120, 9, 14, 'order_status_update', NULL, NULL, NULL, 'Your order for "Beautiful Blue Peacock Canvas Painting" has been shipped||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-03 17:13:50'),
	(121, 9, 14, 'order_status_update', NULL, NULL, NULL, 'Your order for "Beautiful Blue Peacock Canvas Painting" has been delivered||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-03 17:13:56'),
	(127, 27, 30, 'order_request', NULL, NULL, NULL, 'Vidhi Shah placed an order for "5 Best Fragrant Plants" — ₹1499.0||NAV:my-deals.html?role=seller&type=products&status=pending', 0, '2026-03-08 11:21:15'),
	(128, 30, 27, 'order_accepted', NULL, NULL, NULL, 'Plant Shoppe confirmed your order for "5 Best Fragrant Plants"||NAV:my-deals.html?role=buyer&type=products&status=confirmed', 0, '2026-03-08 11:22:10'),
	(129, 30, 27, 'order_status_update', NULL, NULL, NULL, 'Your order for "5 Best Fragrant Plants" is now being processed||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-08 11:22:22'),
	(130, 30, 27, 'order_status_update', NULL, NULL, NULL, 'Your order for "5 Best Fragrant Plants" has been shipped||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-08 11:22:35'),
	(131, 30, 27, 'order_status_update', NULL, NULL, NULL, 'Your order for "5 Best Fragrant Plants" has been delivered||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-08 11:23:43'),
	(132, 27, 5, 'order_request', NULL, NULL, NULL, 'Dhruvi Khandhar placed an order for "5 Best Fragrant Plants" — ₹1499.0||NAV:my-deals.html?role=seller&type=products&status=pending', 0, '2026-03-08 11:30:48'),
	(133, 5, 27, 'order_accepted', NULL, NULL, NULL, 'Plant Shoppe confirmed your order for "5 Best Fragrant Plants"||NAV:my-deals.html?role=buyer&type=products&status=confirmed', 0, '2026-03-08 11:31:01'),
	(134, 5, 27, 'order_status_update', NULL, NULL, NULL, 'Your order for "5 Best Fragrant Plants" is now being processed||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-08 11:31:09'),
	(135, 5, 27, 'order_status_update', NULL, NULL, NULL, 'Your order for "5 Best Fragrant Plants" has been shipped||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-08 11:31:15'),
	(136, 5, 27, 'order_status_update', NULL, NULL, NULL, 'Your order for "5 Best Fragrant Plants" has been delivered||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-08 11:31:25'),
	(137, 27, 4, 'order_request', NULL, NULL, NULL, 'Twisha D Chauhan placed an order for "5 Best Fragrant Plants" — ₹1499.0||NAV:my-deals.html?role=seller&type=products&status=pending', 0, '2026-03-08 12:51:02'),
	(138, 4, 27, 'order_accepted', NULL, NULL, NULL, 'Plant Shoppe confirmed your order for "5 Best Fragrant Plants"||NAV:my-deals.html?role=buyer&type=products&status=confirmed', 1, '2026-03-08 12:51:18'),
	(139, 4, 27, 'order_status_update', NULL, NULL, NULL, 'Your order for "5 Best Fragrant Plants" is now being processed||NAV:my-deals.html?role=buyer&type=products', 1, '2026-03-08 12:51:24'),
	(140, 4, 27, 'order_status_update', NULL, NULL, NULL, 'Your order for "5 Best Fragrant Plants" has been shipped||NAV:my-deals.html?role=buyer&type=products', 1, '2026-03-08 12:51:30'),
	(141, 4, 27, 'order_status_update', NULL, NULL, NULL, 'Your order for "5 Best Fragrant Plants" has been delivered||NAV:my-deals.html?role=buyer&type=products', 1, '2026-03-08 12:51:38'),
	(142, 27, 4, 'order_request', NULL, NULL, NULL, 'Twisha D Chauhan placed an order for "5 Best Fragrant Plants" — ₹1499.0||NAV:my-deals.html?role=seller&type=products&status=pending', 0, '2026-03-08 12:53:40'),
	(143, 4, 27, 'order_accepted', NULL, NULL, NULL, 'Plant Shoppe confirmed your order for "5 Best Fragrant Plants"||NAV:my-deals.html?role=buyer&type=products&status=confirmed', 1, '2026-03-08 12:53:55'),
	(144, 4, 27, 'order_accepted', NULL, NULL, NULL, 'Plant Shoppe confirmed your order for "5 Best Fragrant Plants"||NAV:my-deals.html?role=buyer&type=products&status=confirmed', 1, '2026-03-08 12:54:00'),
	(145, 4, 27, 'order_status_update', NULL, NULL, NULL, 'Your order for "5 Best Fragrant Plants" is now being processed||NAV:my-deals.html?role=buyer&type=products', 1, '2026-03-08 12:54:02'),
	(146, 4, 27, 'order_status_update', NULL, NULL, NULL, 'Your order for "5 Best Fragrant Plants" has been shipped||NAV:my-deals.html?role=buyer&type=products', 1, '2026-03-08 12:54:44'),
	(147, 4, 27, 'order_status_update', NULL, NULL, NULL, 'Your order for "5 Best Fragrant Plants" has been delivered||NAV:my-deals.html?role=buyer&type=products', 1, '2026-03-08 12:54:51'),
	(148, 18, 9, 'booking_request', NULL, NULL, NULL, 'Twinkle Nai requested a booking for "Behind the Scenes: The Power of Grid Sys..." — ₹3000.00||NAV:my-deals.html?role=seller&type=services&status=pending', 0, '2026-03-08 13:07:15'),
	(149, 4, 9, 'follow', NULL, NULL, NULL, 'Twinkle Nai started following you', 1, '2026-03-08 13:37:36'),
	(150, 9, 4, 'follow', NULL, NULL, NULL, 'Twisha D Chauhan started following you', 0, '2026-03-08 13:41:43'),
	(151, 4, 9, 'follow', NULL, NULL, NULL, 'Twinkle Nai started following you', 0, '2026-03-08 13:41:53'),
	(163, 8, 31, 'follow', NULL, NULL, NULL, 'Krishna Kalal started following you', 0, '2026-03-10 09:20:17'),
	(164, 31, 8, 'follow', NULL, NULL, NULL, 'Jiral Bavishi started following you', 1, '2026-03-10 09:20:38'),
	(165, 31, 8, 'message', NULL, NULL, NULL, 'Jiral Bavishi sent you a message: "hy"', 1, '2026-03-10 09:20:46'),
	(166, 8, 31, 'message', NULL, NULL, NULL, 'Krishna Kalal sent you a message: "😊😊"', 0, '2026-03-10 09:21:22'),
	(168, 8, 31, 'message_reaction', NULL, NULL, 6, 'Krishna Kalal reacted ❤️ to your message', 0, '2026-03-10 09:21:43'),
	(170, 9, 8, 'follow', NULL, NULL, NULL, 'Jiral Bavishi started following you', 0, '2026-03-10 10:13:21'),
	(171, 9, 8, 'follow', NULL, NULL, NULL, 'Jiral Bavishi started following you', 0, '2026-03-10 10:14:16'),
	(172, 3, 31, 'booking_request', NULL, NULL, NULL, 'Krishna Kalal requested a booking for "Bridal & Festive Mehndi Artist" — ₹500.00||NAV:my-deals.html?role=seller&type=services&status=pending', 0, '2026-03-10 10:29:48'),
	(173, 31, 3, 'booking_accepted', NULL, NULL, NULL, 'Binita G Vasita accepted your booking for "Bridal & Festive Mehndi Artist" — they will contact you soon!||NAV:my-deals.html?role=buyer&type=services&status=accepted', 1, '2026-03-10 10:30:55'),
	(174, 28, 31, 'order_request', NULL, NULL, NULL, 'Krishna Kalal placed an order for "🍽️ A spacious and durable double-layer l..." — ₹378.0||NAV:my-deals.html?role=seller&type=products&status=pending', 0, '2026-03-10 10:34:38'),
	(175, 31, 28, 'order_accepted', NULL, NULL, NULL, 'Lucky Kasturi confirmed your order for "🍽️ A spacious and durable double-layer l..."||NAV:my-deals.html?role=buyer&type=products&status=confirmed', 1, '2026-03-10 10:35:53'),
	(176, 31, 28, 'order_status_update', NULL, NULL, NULL, 'Your order for "🍽️ A spacious and durable double-layer l..." is now being processed||NAV:my-deals.html?role=buyer&type=products', 1, '2026-03-10 10:36:23'),
	(177, 31, 28, 'order_status_update', NULL, NULL, NULL, 'Your order for "🍽️ A spacious and durable double-layer l..." has been shipped||NAV:my-deals.html?role=buyer&type=products', 1, '2026-03-10 10:36:37'),
	(178, 31, 28, 'order_status_update', NULL, NULL, NULL, 'Your order for "🍽️ A spacious and durable double-layer l..." has been delivered||NAV:my-deals.html?role=buyer&type=products', 1, '2026-03-10 10:39:49'),
	(179, 28, 31, 'order_request', NULL, NULL, NULL, 'Krishna Kalal placed an order for "🍽️ A spacious and durable double-layer l..." — ₹378.0||NAV:my-deals.html?role=seller&type=products&status=pending', 0, '2026-03-10 10:40:45'),
	(180, 31, 28, 'order_accepted', NULL, NULL, NULL, 'Lucky Kasturi confirmed your order for "🍽️ A spacious and durable double-layer l..."||NAV:my-deals.html?role=buyer&type=products&status=confirmed', 1, '2026-03-10 10:41:00'),
	(181, 31, 28, 'order_status_update', NULL, NULL, NULL, 'Your order for "🍽️ A spacious and durable double-layer l..." is now being processed||NAV:my-deals.html?role=buyer&type=products', 1, '2026-03-10 10:41:09'),
	(182, 31, 28, 'order_status_update', NULL, NULL, NULL, 'Your order for "🍽️ A spacious and durable double-layer l..." has been shipped||NAV:my-deals.html?role=buyer&type=products', 1, '2026-03-10 10:41:19'),
	(183, 31, 28, 'order_status_update', NULL, NULL, NULL, 'Your order for "🍽️ A spacious and durable double-layer l..." has been delivered||NAV:my-deals.html?role=buyer&type=products', 1, '2026-03-10 10:41:32'),
	(188, 10, 31, 'follow', NULL, NULL, NULL, 'Krishna Kalal started following you', 0, '2026-03-11 07:10:58'),
	(189, 31, 10, 'follow', NULL, NULL, NULL, 'Saumya Nayak started following you', 1, '2026-03-11 07:11:14'),
	(190, 33, 31, 'order_request', NULL, NULL, NULL, 'Krishna Kalal placed an order for "Diya" — ₹35.0||NAV:my-deals.html?role=seller&type=products&status=pending', 1, '2026-03-11 08:00:18'),
	(191, 33, 31, 'order_request', NULL, NULL, NULL, 'Krishna Kalal placed an order for "Diya" — ₹35.0||NAV:my-deals.html?role=seller&type=products&status=pending', 1, '2026-03-11 08:02:07'),
	(192, 31, 33, 'order_accepted', NULL, NULL, NULL, 'Nayak Saumya Amitkumar confirmed your order for "Diya"||NAV:my-deals.html?role=buyer&type=products&status=confirmed', 1, '2026-03-11 08:03:15'),
	(193, 31, 33, 'order_status_update', NULL, NULL, NULL, 'Your order for "Diya" is now being processed||NAV:my-deals.html?role=buyer&type=products', 1, '2026-03-11 08:03:44'),
	(194, 31, 33, 'order_status_update', NULL, NULL, NULL, 'Your order for "Diya" has been shipped||NAV:my-deals.html?role=buyer&type=products', 1, '2026-03-11 08:04:34'),
	(195, 31, 33, 'order_status_update', NULL, NULL, NULL, 'Your order for "Diya" has been delivered||NAV:my-deals.html?role=buyer&type=products', 1, '2026-03-11 08:08:01'),
	(196, 3, 8, 'booking_request', NULL, NULL, NULL, 'Jiral Bavishi requested a booking for "Bridal & Festive Mehndi Artist" — ₹500.00||NAV:my-deals.html?role=seller&type=services&status=pending', 0, '2026-03-11 08:22:14'),
	(197, 8, 3, 'booking_accepted', NULL, NULL, NULL, 'Binita G Vasita accepted your booking for "Bridal & Festive Mehndi Artist" — they will contact you soon!||NAV:my-deals.html?role=buyer&type=services&status=accepted', 0, '2026-03-11 08:23:29'),
	(198, 33, 8, 'follow', NULL, NULL, NULL, 'Jiral Bavishi started following you', 1, '2026-03-11 08:25:48'),
	(199, 8, 33, 'follow', NULL, NULL, NULL, 'Nayak Saumya Amitkumar started following you', 0, '2026-03-11 08:26:20'),
	(200, 8, 33, 'message', NULL, NULL, NULL, 'Nayak Saumya Amitkumar sent you a message: "hyy"', 0, '2026-03-11 08:26:29'),
	(203, 33, 3, 'order_request', NULL, NULL, NULL, 'Binita G Vasita placed an order for "Diya" — ₹146.57||NAV:my-deals.html?role=seller&type=products&status=pending', 1, '2026-03-20 15:40:15'),
	(204, 3, 33, 'order_accepted', NULL, NULL, NULL, 'Nayak Saumya Amitkumar confirmed your order for "Diya"||NAV:my-deals.html?role=buyer&type=products&status=confirmed', 0, '2026-03-20 15:40:30'),
	(205, 3, 33, 'order_status_update', NULL, NULL, NULL, 'Your order for "Diya" is now being processed||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-20 15:40:52'),
	(206, 3, 33, 'order_status_update', NULL, NULL, NULL, 'Your order for "Diya" has been shipped||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-20 15:41:04'),
	(207, 3, 33, 'order_status_update', NULL, NULL, NULL, 'Your order for "Diya" has been delivered||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-20 15:41:12'),
	(208, 33, 31, 'order_request', NULL, NULL, NULL, 'Krishna Kalal placed an order for "Diya" — ₹152.32||NAV:my-deals.html?role=seller&type=products&status=pending', 1, '2026-03-21 06:04:02'),
	(209, 33, 31, 'order_cancelled', NULL, NULL, NULL, 'Krishna Kalal cancelled their order for "Diya"||NAV:my-deals.html?role=seller&type=products&status=cancelled', 1, '2026-03-21 06:04:12'),
	(210, 13, 33, 'like', 12, NULL, NULL, 'Nayak Saumya Amitkumar liked your post', 0, '2026-03-21 06:19:29'),
	(211, 33, 31, 'order_request', NULL, NULL, NULL, 'Krishna Kalal placed an order for "Diya" — ₹152.32||NAV:my-deals.html?role=seller&type=products&status=pending', 1, '2026-03-21 10:45:11'),
	(212, 31, 33, 'order_accepted', NULL, NULL, NULL, 'Nayak Saumya Amitkumar confirmed your order for "Diya"||NAV:my-deals.html?role=buyer&type=products&status=confirmed', 1, '2026-03-21 10:45:26'),
	(213, 31, 33, 'order_status_update', NULL, NULL, NULL, 'Your order for "Diya" is now being processed||NAV:my-deals.html?role=buyer&type=products', 1, '2026-03-21 10:45:42'),
	(214, 31, 33, 'order_status_update', NULL, NULL, NULL, 'Your order for "Diya" has been shipped||NAV:my-deals.html?role=buyer&type=products', 1, '2026-03-21 10:45:48'),
	(215, 31, 33, 'order_status_update', NULL, NULL, NULL, 'Your order for "Diya" has been delivered||NAV:my-deals.html?role=buyer&type=products', 1, '2026-03-21 10:46:03'),
	(216, 8, 6, 'order_request', NULL, NULL, NULL, 'Krishna Kalal placed an order for "Crafted in 22kt gold, this statement nec..." — ₹236000.0||NAV:my-deals.html?role=seller&type=products&status=pending', 0, '2026-03-21 13:48:10'),
	(217, 6, 8, 'order_accepted', NULL, NULL, NULL, 'Jiral Bavishi confirmed your order for "Crafted in 22kt gold, this statement nec..."||NAV:my-deals.html?role=buyer&type=products&status=confirmed', 0, '2026-03-21 13:48:30'),
	(218, 3, 8, 'booking_request', NULL, NULL, NULL, 'Jiral Bavishi requested a booking for "Bridal | Party | Festive | Custom Design..." — ₹3000.0||NAV:my-deals.html?role=seller&type=services&status=pending', 0, '2026-03-21 15:53:33'),
	(219, 8, 3, 'booking_accepted', NULL, NULL, NULL, 'Binita G Vasita accepted your booking for "Bridal | Party | Festive | Custom Design..." — they will contact you soon!||NAV:my-deals.html?role=buyer&type=services&status=accepted', 0, '2026-03-21 15:54:05'),
	(220, 3, 33, 'booking_request', NULL, NULL, NULL, 'Nayak Saumya Amitkumar requested a booking for "Bridal | Party | Festive | Custom Design..." — ₹5033.96||NAV:my-deals.html?role=seller&type=services&status=pending', 0, '2026-03-22 03:27:41'),
	(221, 33, 3, 'booking_accepted', NULL, NULL, NULL, 'Binita G Vasita accepted your booking for "Bridal | Party | Festive | Custom Design..." — they will contact you soon!||NAV:my-deals.html?role=buyer&type=services&status=accepted', 1, '2026-03-22 03:30:35'),
	(222, 33, 3, 'order_request', NULL, NULL, NULL, 'Binita G Vasita placed an order for "Diya" — ₹151.49||NAV:my-deals.html?role=seller&type=products&status=pending', 1, '2026-03-22 09:00:30'),
	(223, 33, 3, 'order_cancelled', NULL, NULL, NULL, 'Binita G Vasita cancelled their order for "Diya"||NAV:my-deals.html?role=seller&type=products&status=cancelled', 1, '2026-03-22 09:01:01'),
	(224, 21, 3, 'order_request', NULL, NULL, NULL, 'Binita G Vasita placed an order for "Fun | Simple | DIY | Budget-friendly" — ₹356.0||NAV:my-deals.html?role=seller&type=products&status=pending', 0, '2026-03-22 11:38:54'),
	(225, 3, 21, 'order_accepted', NULL, NULL, NULL, 'Costume Gallery confirmed your order for "Fun | Simple | DIY | Budget-friendly"||NAV:my-deals.html?role=buyer&type=products&status=confirmed', 0, '2026-03-22 11:39:16'),
	(226, 3, 21, 'order_status_update', NULL, NULL, NULL, 'Your order for "Fun | Simple | DIY | Budget-friendly" is now being processed||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-22 11:39:23'),
	(227, 3, 21, 'order_status_update', NULL, NULL, NULL, 'Your order for "Fun | Simple | DIY | Budget-friendly" has been shipped||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-22 11:39:32'),
	(228, 3, 21, 'order_status_update', NULL, NULL, NULL, 'Your order for "Fun | Simple | DIY | Budget-friendly" has been delivered||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-22 11:39:37'),
	(229, 21, 3, 'order_request', NULL, NULL, NULL, 'Binita G Vasita placed an order for "Fun | Simple | DIY | Budget-friendly" — ₹336.0||NAV:my-deals.html?role=seller&type=products&status=pending', 0, '2026-03-22 11:40:36'),
	(230, 3, 21, 'order_accepted', NULL, NULL, NULL, 'Costume Gallery confirmed your order for "Fun | Simple | DIY | Budget-friendly"||NAV:my-deals.html?role=buyer&type=products&status=confirmed', 0, '2026-03-22 11:40:51'),
	(231, 3, 21, 'order_status_update', NULL, NULL, NULL, 'Your order for "Fun | Simple | DIY | Budget-friendly" is now being processed||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-22 11:41:17'),
	(232, 3, 21, 'order_status_update', NULL, NULL, NULL, 'Your order for "Fun | Simple | DIY | Budget-friendly" has been delivered||NAV:my-deals.html?role=buyer&type=products', 0, '2026-03-22 11:41:27'),
	(233, 3, 21, 'booking_request', NULL, NULL, NULL, 'Costume Gallery requested a booking for "Bridal | Party | Festive | Custom Design..." — ₹5000.0||NAV:my-deals.html?role=seller&type=services&status=pending', 0, '2026-03-22 11:42:19'),
	(234, 21, 3, 'booking_accepted', NULL, NULL, NULL, 'Binita G Vasita accepted your booking for "Bridal | Party | Festive | Custom Design..." — they will contact you soon!||NAV:my-deals.html?role=buyer&type=services&status=accepted', 0, '2026-03-22 11:42:34'),
	(235, 21, 3, 'booking_accepted', NULL, NULL, NULL, 'Binita G Vasita accepted your booking for "Bridal | Party | Festive | Custom Design..." — they will contact you soon!||NAV:my-deals.html?role=buyer&type=services&status=accepted', 0, '2026-03-22 11:42:39'),
	(236, 3, 21, 'booking_request', NULL, NULL, NULL, 'Costume Gallery requested a booking for "Bridal | Party | Festive | Custom Design..." — ₹3028.81||NAV:my-deals.html?role=seller&type=services&status=pending', 0, '2026-03-22 11:44:21'),
	(237, 21, 3, 'booking_accepted', NULL, NULL, NULL, 'Binita G Vasita accepted your booking for "Bridal | Party | Festive | Custom Design..." — they will contact you soon!||NAV:my-deals.html?role=buyer&type=services&status=accepted', 0, '2026-03-22 11:44:33'),
	(238, 3, 33, 'follow', NULL, NULL, NULL, 'Nayak Saumya Amitkumar started following you', 0, '2026-03-22 16:21:10'),
	(239, 33, 3, 'follow', NULL, NULL, NULL, 'Binita G Vasita started following you', 0, '2026-03-22 16:30:35'),
	(240, 3, 33, 'message', NULL, NULL, NULL, 'Nayak Saumya Amitkumar sent you a message: "hy"', 0, '2026-03-22 16:30:46'),
	(241, 14, 3, 'message_request', NULL, NULL, NULL, 'Binita G Vasita sent you a message request: "hy"||NAV:messages.html', 0, '2026-03-22 16:45:32'),
	(242, 14, 3, 'message_request', NULL, NULL, NULL, 'Binita G Vasita sent you a message request: "hy"||NAV:messages.html', 0, '2026-03-22 16:46:05'),
	(243, 3, 14, 'message_request', NULL, NULL, NULL, 'Art World sent you a message request: "hyy"||NAV:messages.html', 0, '2026-03-22 16:46:22'),
	(244, 14, 3, 'message', NULL, NULL, NULL, 'Binita G Vasita sent you a message: "hy"', 0, '2026-03-22 17:29:39'),
	(245, 3, 14, 'follow', NULL, NULL, NULL, 'Art World started following you', 1, '2026-03-22 17:30:46'),
	(246, 8, 14, 'follow', NULL, NULL, NULL, 'Art World started following you', 1, '2026-03-22 17:31:18'),
	(247, 14, 8, 'follow', NULL, NULL, NULL, 'Jiral Bavishi started following you', 0, '2026-03-22 17:32:04'),
	(248, 33, 3, 'group_invite', NULL, NULL, NULL, 'You have a group invitation to join "Fire House"||NAV:messages.html', 1, '2026-03-22 18:26:38'),
	(249, 7, 33, 'group_invite', NULL, NULL, NULL, 'You have a group invitation to join "Fire House"||NAV:messages.html', 0, '2026-03-22 18:30:42'),
	(250, 6, 33, 'group_invite', NULL, NULL, NULL, 'You have a group invitation to join "Fire House"||NAV:messages.html', 0, '2026-03-22 18:30:48'),
	(251, 3, 33, 'group_invite', NULL, NULL, NULL, 'You have a group invitation to join "Fire House"||NAV:messages.html', 0, '2026-03-22 18:30:54'),
	(252, 4, 33, 'group_invite', NULL, NULL, NULL, 'You have a group invitation to join "Fire House"||NAV:messages.html', 0, '2026-03-22 18:31:00'),
	(253, 9, 33, 'group_invite', NULL, NULL, NULL, 'You have a group invitation to join "Fire House"||NAV:messages.html', 0, '2026-03-22 18:31:07'),
	(254, 5, 33, 'group_invite', NULL, NULL, NULL, 'You have a group invitation to join "Fire House"||NAV:messages.html', 0, '2026-03-22 18:31:19'),
	(255, 10, 33, 'group_invite', NULL, NULL, NULL, 'You have a group invitation to join "Fire House"||NAV:messages.html', 1, '2026-03-23 03:18:52');

-- Dumping structure for table creator_connect.order_messages
CREATE TABLE IF NOT EXISTS `order_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `sender_id` int NOT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `message_type` enum('text','image','file') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'text',
  `file_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_sender_id` (`sender_id`),
  CONSTRAINT `fk_order_message_order` FOREIGN KEY (`order_id`) REFERENCES `product_orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_message_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.order_messages: ~0 rows (approximately)

-- Dumping structure for table creator_connect.order_status_history
CREATE TABLE IF NOT EXISTS `order_status_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `old_status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `changed_by` int NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_changed_by` (`changed_by`),
  CONSTRAINT `fk_status_history_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.order_status_history: ~0 rows (approximately)

-- Dumping structure for table creator_connect.password_reset_tokens
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiry` datetime NOT NULL,
  `used` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_token` (`token`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `password_reset_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.password_reset_tokens: ~2 rows (approximately)
INSERT INTO `password_reset_tokens` (`id`, `user_id`, `token`, `expiry`, `used`, `created_at`) VALUES
	(1, 31, 'iTJ8aSL4cVH0DE8B8g7M9mJ3LBA9sN7AMJPQvPDKSxk', '2026-03-10 15:26:46', 0, '2026-03-10 08:56:46'),
	(4, 33, 'h1kqU59G_sNdT-MRCQCmxZQy3RssVf2DXRF1g0GoYik', '2026-03-11 14:24:28', 0, '2026-03-11 07:54:27');

-- Dumping structure for table creator_connect.platform_settings
CREATE TABLE IF NOT EXISTS `platform_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.platform_settings: ~5 rows (approximately)
INSERT INTO `platform_settings` (`id`, `setting_key`, `setting_value`, `description`, `updated_at`) VALUES
	(1, 'platform_fee_percentage', '5', 'Default platform commission percentage', '2026-02-24 16:54:35'),
	(2, 'min_withdrawal_amount', '120', 'Minimum withdrawal amount in INR', '2026-02-24 16:54:35'),
	(3, 'clearance_period_days', '7', 'Days before funds are available for withdrawal', '2026-02-24 16:54:35'),
	(4, 'razorpay_enabled', 'false', 'Enable/disable Razorpay payments', '2026-02-24 16:54:35'),
	(5, 'auto_withdrawal_enabled', 'true', 'Enable automatic withdrawals', '2026-02-24 16:54:35');

-- Dumping structure for table creator_connect.platform_transactions
CREATE TABLE IF NOT EXISTS `platform_transactions` (
  `transaction_id` int NOT NULL AUTO_INCREMENT,
  `order_id` int DEFAULT NULL,
  `booking_id` int DEFAULT NULL,
  `seller_id` int NOT NULL,
  `buyer_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `platform_fee` decimal(10,2) NOT NULL DEFAULT '0.00',
  `net_amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_ref` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','completed','refunded') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`transaction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.platform_transactions: ~0 rows (approximately)

-- Dumping structure for table creator_connect.posts
CREATE TABLE IF NOT EXISTS `posts` (
  `post_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `post_type` enum('showcase','service','product') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'showcase',
  `caption` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `media_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `media_type` enum('image','video','audio','document') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `privacy` enum('public','followers','private') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'public',
  `category_id` int DEFAULT NULL,
  `subcategory_id` int DEFAULT NULL,
  `tags` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `short_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `full_description` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `product_description` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `price` decimal(10,2) DEFAULT NULL,
  `currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'INR',
  `service_duration` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `service_delivery_time` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `includes_revisions` tinyint(1) DEFAULT '0',
  `max_revisions` int DEFAULT '0',
  `requires_advance_booking` tinyint(1) DEFAULT '0',
  `booking_notice_days` int DEFAULT '0',
  `stock` int DEFAULT NULL,
  `sku` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `brand` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `condition_type` enum('new','used','refurbished') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'new',
  `weight_kg` decimal(8,2) DEFAULT NULL,
  `dimensions` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `warranty_info` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `return_policy` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `shipping_available` tinyint(1) DEFAULT '0',
  `shipping_cost` decimal(10,2) DEFAULT '0.00',
  `delivery_charge_type` enum('flat','per_km','free') COLLATE utf8mb4_unicode_ci DEFAULT 'flat' COMMENT 'Delivery pricing model',
  `base_delivery_charge` decimal(10,2) DEFAULT '0.00' COMMENT 'Base/flat delivery charge in INR',
  `per_km_rate` decimal(8,2) DEFAULT '0.00' COMMENT 'Extra charge per km beyond base distance',
  `delivery_max_km` int DEFAULT '100' COMMENT 'Max km seller can deliver (0 = unlimited)',
  `seller_pincode` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Seller pincode for distance calculation',
  `pickup_address` varchar(400) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Pickup address when shipping_available=0',
  `pickup_city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Pickup city',
  `pickup_state` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Pickup state',
  `pickup_pincode` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Pickup pincode for distance/map',
  `pickup_lat` decimal(10,7) DEFAULT NULL COMMENT 'Geocoded lat for pickup pincode',
  `pickup_lng` decimal(10,7) DEFAULT NULL COMMENT 'Geocoded lng for pickup pincode',
  `seller_lat` decimal(10,7) DEFAULT NULL COMMENT 'Seller latitude (resolved from pincode)',
  `seller_lng` decimal(10,7) DEFAULT NULL COMMENT 'Seller longitude (resolved from pincode)',
  `free_shipping_threshold` decimal(10,2) DEFAULT NULL,
  `estimated_delivery_days` int DEFAULT NULL,
  `contact_email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_info` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `delivery_time` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `highlights` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `accepts_upi` tinyint(1) DEFAULT '0',
  `accepts_bank_transfer` tinyint(1) DEFAULT '0',
  `accepts_cod` tinyint(1) DEFAULT '0',
  `features` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `razorpay_product_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paytm_product_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `upi_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_paid` tinyint(1) DEFAULT '0',
  `payment_method` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_sales` int DEFAULT '0',
  `total_revenue` decimal(12,2) DEFAULT '0.00',
  `likes_count` int DEFAULT '0',
  `comments_count` int DEFAULT '0',
  `shares_count` int DEFAULT '0',
  `views_count` int DEFAULT '0',
  `is_deleted` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `service_mode` enum('online','offline','both') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'online',
  `service_location_type` enum('online','doorstep','at_provider','both') COLLATE utf8mb4_unicode_ci DEFAULT 'online',
  `service_address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `platform_fee_percentage` decimal(5,2) DEFAULT '5.00' COMMENT 'Platform commission percentage',
  `service_city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `service_state` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `service_pincode` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `service_radius_km` int DEFAULT '0',
  `service_lat` decimal(10,6) DEFAULT NULL,
  `service_lng` decimal(10,6) DEFAULT NULL,
  `doorstep_base_fee` decimal(8,2) DEFAULT '0.00',
  `doorstep_per_km` decimal(6,2) DEFAULT '0.00',
  PRIMARY KEY (`post_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_post_type` (`post_type`),
  KEY `idx_privacy` (`privacy`),
  KEY `idx_category` (`category_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_is_active` (`is_active`,`is_deleted`),
  KEY `idx_posts_platform_fee` (`platform_fee_percentage`),
  KEY `posts_ibfk_3` (`subcategory_id`),
  CONSTRAINT `posts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `posts_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE SET NULL,
  CONSTRAINT `posts_ibfk_3` FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories` (`subcategory_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.posts: ~27 rows (approximately)
INSERT INTO `posts` (`post_id`, `user_id`, `post_type`, `caption`, `media_url`, `media_type`, `privacy`, `category_id`, `subcategory_id`, `tags`, `title`, `product_title`, `short_description`, `full_description`, `product_description`, `price`, `currency`, `service_duration`, `service_delivery_time`, `includes_revisions`, `max_revisions`, `requires_advance_booking`, `booking_notice_days`, `stock`, `sku`, `brand`, `condition_type`, `weight_kg`, `dimensions`, `warranty_info`, `return_policy`, `shipping_available`, `shipping_cost`, `delivery_charge_type`, `base_delivery_charge`, `per_km_rate`, `delivery_max_km`, `seller_pincode`, `pickup_address`, `pickup_city`, `pickup_state`, `pickup_pincode`, `pickup_lat`, `pickup_lng`, `seller_lat`, `seller_lng`, `free_shipping_threshold`, `estimated_delivery_days`, `contact_email`, `contact_phone`, `contact_info`, `delivery_time`, `highlights`, `accepts_upi`, `accepts_bank_transfer`, `accepts_cod`, `features`, `razorpay_product_id`, `paytm_product_id`, `upi_id`, `is_paid`, `payment_method`, `category`, `total_sales`, `total_revenue`, `likes_count`, `comments_count`, `shares_count`, `views_count`, `is_deleted`, `is_active`, `created_at`, `updated_at`, `service_mode`, `service_location_type`, `service_address`, `platform_fee_percentage`, `service_city`, `service_state`, `service_pincode`, `service_radius_km`, `service_lat`, `service_lng`, `doorstep_base_fee`, `doorstep_per_km`) VALUES
	(1, 3, 'service', 'Let your hands tell a beautiful story 🌿✨\nBridal & festive mehndi designs crafted with love and perfection 👰💖', 'uploads/posts/3_20260225_081536_cropped_image.jpg', 'image', 'public', 21, 202, NULL, 'Bridal & Festive Mehndi Artist', NULL, 'Professional bridal & festive mehndi 👰🌿 · Dark stain guarantee · Home visits available · All occasions covered 🎉', '🌿 About the Service\nProfessional mehndi artist with expertise in bridal, festive & party designs using 100% natural henna.\n\n✨ Design Styles\n• 👰 Full Bridal — hands, legs & back\n• 💍 Engagement & Couple Mehndi\n• 🎊 Festive — Eid, Karwa Chauth, Teej\n• 🌺 Arabic, Rajasthani & Modern Minimal\n\n🎯 Highlights\n• 100% natural chemical-free henna\n• Dark stain guaranteed for 2–3 weeks\n• Fine cone for intricate detailing\n• Home visit (doorstep) available\n• Advance booking recommended for bridal\n\n📞 Call or WhatsApp to book your slot!', NULL, 500.00, 'INR', '2–6 hours (varies by design complexity)', 'Same-day service available', 0, NULL, 1, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'flat', 0.00, 0.00, 100, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'binitagvasita@gmail.com', '9173576732', NULL, NULL, NULL, 0, 0, 0, '🌱 100% Natural & Chemical-Free Henna\n🖤 Rich Dark Stain Guarantee\n👰 Customized Bridal & Festive Designs\n🌿 Rajasthani, Arabic & Modern Styles\n✨ Fine-Detail Cone Work\n🚗 Doorstep & Home-Visit Available\n⏰ On-Time Service Assurance\n📅 Pre-Booking for Bridal Slots\n💬 Free Design Consultation', NULL, NULL, NULL, 0, NULL, NULL, 0, 0.00, 0, 0, 0, 10, 0, 1, '2026-02-25 02:44:45', '2026-03-22 13:40:48', 'offline', 'online', NULL, 5.00, NULL, NULL, NULL, 0, NULL, NULL, 0.00, 0.00),
	(2, 4, 'showcase', 'Stepping to the beats of Aithe Aa 💃🔥\r\nGrace in moves, fire in expressions ✨', 'uploads/posts/4_20260225_081734_dance.mp4', 'video', 'public', 1, NULL, '#AitheAa #DanceReels #DancePerformance #DanceCover #BollywoodDance', NULL, NULL, NULL, NULL, NULL, NULL, 'INR', NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'flat', 0.00, 0.00, 100, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0.00, 0, 0, 0, 3, 0, 1, '2026-02-25 02:47:34', '2026-02-27 13:04:14', NULL, 'online', NULL, 5.00, NULL, NULL, NULL, 0, NULL, NULL, 0.00, 0.00),
	(3, 9, 'product', 'Colorful Navratri special chaniya choli 💃✨ perfect for Garba nights 🎶 with mirror work and vibrant traditional designs 🌸', 'uploads/posts/9_20260225_082728_lehngachaniya.jpg', 'image', 'public', 13, 124, NULL, NULL, 'Traditional Navratri Chaniya Choli 💃✨', 'Vibrant Navratri Chaniya Choli 💃✨ · Mirror work · Lightweight fabric · Sizes S–XL · Perfect for Garba & Dandiya 🎶', '💃 About the Product\nHandcrafted Chaniya Choli with traditional mirror work and vibrant festive colours — perfect for Garba & Dandiya nights.\n\n📏 Sizes Available\nS · M · L · XL · Semi-stitched option available ✂️\n\n🎨 Colours\n❤️ Red · 💛 Yellow · 💙 Blue · 💚 Green · 🧡 Orange · 💜 Purple · 🩷 Pink\n\n🧵 Fabric\n• Chaniya : Pure Georgette with Kota Doria border\n• Choli   : Cotton Silk (stitched / semi-stitched)\n• Dupatta : Net with mirror & tassel work\n\n📦 Box Includes\nChaniya + Choli + Dupatta in a gift box 🎁\n\n🔄 7-day return · Dry-clean recommended', NULL, 2799.00, 'INR', NULL, NULL, 0, NULL, 0, NULL, 3, 'WVR-CHCH-NV01', 'Weaver Saga', 'new', NULL, NULL, 'No warranty (apparel). Dry-clean recommended to maintain colour and embroidery.', '7-day easy return — item must be unused, unwashed, and in original packaging with tags intact.', 1, 150.00, 'flat', 0.00, 0.00, 100, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, 0, 0, 1, '💃 Lightweight & Breathable Georgette Fabric\n🪞 Traditional Hand-Set Mirror Work\n🌈 7+ Vibrant Festive Colour Options\n🎶 Ideal for Garba, Dandiya & Navratri Events\n📏 Sizes S–XXL Available\n✂️ Semi-Stitched Option Available\n🎁 Comes in Premium Gift Box Packaging\n🧵 Handcrafted by Skilled Artisans\n🔄 7-Day Return Policy', NULL, NULL, NULL, 0, NULL, NULL, 2, 5898.00, 0, 0, 1, 24, 0, 1, '2026-02-25 02:57:28', '2026-03-22 13:40:48', NULL, 'online', NULL, 5.00, NULL, NULL, NULL, 0, NULL, NULL, 0.00, 0.00),
	(4, 8, 'product', 'Pamper your skin with the trusted care of Lakmé ✨🌸. This skincare range is designed to cleanse 🫧, hydrate 💧, and brighten ✨ your skin for a healthy, natural glow.', 'uploads/posts/8_20260225_084257_lakme.jpg', 'image', 'public', 16, 159, NULL, NULL, 'Lakmé Glow & Hydration Skincare Combo ✨🌸', 'Daily glow & hydration with Lakmé skincare 🌸💧 · SPF protection · All skin types · Dermatologically tested ✨', '🌸 About the Combo\nIndia\'s most trusted skincare brand — formulated for Indian skin, climate & everyday use.\n\n✨ Kit Includes\n• 🫧 Brightening Facewash\n• 💧 Day Cream SPF 20\n• 🌞 Sunscreen SPF 50 PA+++\n• ✨ Vitamin C Brightening Serum\n• 🌙 Night Repair Crème\n\n🌿 Key Benefits\n• Deep 24-hour hydration\n• Instant glow & even skin tone\n• SPF 50 sun protection\n• Non-greasy lightweight texture\n• Suitable for all skin types\n\n⚠️ Return Policy\nSealed/unopened products only within 5 days.\nShelf life: 24 months from manufacture date.', NULL, 599.00, 'INR', NULL, NULL, 0, NULL, 0, NULL, 8, 'LKM-SKCARE-COMBO01', 'Lakme', 'new', NULL, NULL, 'Check MFG & EXP date on packaging. Shelf life 24 months from manufacture.', '5-day return accepted for sealed/unopened products only. Opened products are non-returnable due to hygiene.', 1, 100.00, 'flat', 0.00, 0.00, 100, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1000.00, 5, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, '💧 Deep 24-Hour Hydration Formula\n✨ Instant Radiance & Glow Boost\n🌞 SPF 50 Sun Protection Included\n🌿 Suitable for All Skin Types\n🫧 Gentle Daily Cleansing\n🌸 Lightweight & Non-Greasy Texture\n🧴 Dermatologically Tested\n📦 Travel-Friendly Packaging\n💚 Free from Harsh Chemicals', NULL, NULL, NULL, 0, NULL, NULL, 2, 1398.00, 0, 0, 0, 10, 0, 1, '2026-02-25 03:12:57', '2026-03-22 13:40:48', NULL, 'online', NULL, 5.00, NULL, NULL, NULL, 0, NULL, NULL, 0.00, 0.00),
	(5, 5, 'service', 'Delicious and hygienic catering service 🍲✨ for weddings, parties & corporate events 🎉 with customizable menu options.', 'uploads/posts/5_20260225_084732_catering.jpg', 'image', 'public', 23, 223, NULL, 'Premium Event Catering Service 🍽️✨', NULL, 'Fresh & hygienic event catering 🍽️✨ · Multi-cuisine · 50 to 5000+ guests · On-time service guaranteed 🍲', '🍽️ About the Service\nProfessional catering for weddings 💍, parties 🎂, corporate events 🏢 and festivals 🎊.\n\n🥘 Menu Options\n• North Indian · Gujarati Thali\n• South Indian · Chinese\n• Live Fast Food Counter\n• Dessert & Sweet Station\n• Welcome Drinks Counter\n\n🎯 Why Choose Us\n• FSSAI certified kitchen 🏅\n• 500+ events delivered\n• Trained & uniformed staff\n• Pure Veg & Jain options available\n• Elegant crockery & live counters included\n\n📋 Note\nAll prices are per plate. GST extra.\nMinimum booking notice: 5 days.\n📞 Call for a custom quote!', NULL, 450.00, 'INR', '4–8 hours depending on event size', 'Menu confirmation 48 hours prior; setup 3 hours before event', 0, NULL, 1, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'flat', 0.00, 0.00, 100, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'dhruvikhandhar4@gmail.com', '9104190406', NULL, NULL, NULL, 0, 0, 0, '🍲 Fresh & Hygienic Food — Prepared on the day of your event\n👨‍🍳 Experienced Chefs with 10+ Years Background\n📋 Fully Customizable Multi-Cuisine Menu\n🌿 Pure Veg & Jain Options Available\n🍛 Beautiful Live Counter Setup\n⏰ On-Time Setup & Service Guaranteed\n👥 Suitable for 50 to 5000+ Guests\n🏅 FSSAI Certified Kitchen\n🍴 Elegant Crockery & Cutlery Included', NULL, NULL, NULL, 0, NULL, NULL, 0, 0.00, 0, 0, 0, 7, 0, 1, '2026-02-25 03:17:33', '2026-03-22 13:40:48', 'offline', 'online', NULL, 5.00, NULL, NULL, NULL, 0, NULL, NULL, 0.00, 0.00),
	(8, 11, 'showcase', 'Shower theme cake!🤍👶🏻\r\nTag your home baker friends or share this reel with them😃', 'uploads/posts/11_20260227_183218_Video-678.mp4', 'video', 'public', 7, 61, '#cakedecorating #cakes #birthdaycake #chocolate #food #dessert #cakesofinstagram', NULL, NULL, NULL, NULL, NULL, NULL, 'INR', NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'flat', 0.00, 0.00, 100, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0.00, 0, 0, 0, 1, 0, 1, '2026-02-27 13:02:18', '2026-02-28 12:50:22', NULL, 'online', NULL, 5.00, NULL, NULL, NULL, 0, NULL, NULL, 0.00, 0.00),
	(9, 11, 'showcase', 'Cake for the Mommyyy!❤️', 'uploads/posts/11_20260227_183346_Screenshot_2026-02-27_183301.png', 'image', 'public', 7, 61, '#codeacake #cake #cakedecorating #birthdaycake #chocolate #food #dessert #cakesofinstagram #cakedesign #foodporn #bakery #baking', NULL, NULL, NULL, NULL, NULL, NULL, 'INR', NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'flat', 0.00, 0.00, 100, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0.00, 0, 0, 0, 0, 0, 1, '2026-02-27 13:03:46', '2026-02-27 13:03:46', NULL, 'online', NULL, 5.00, NULL, NULL, NULL, 0, NULL, NULL, 0.00, 0.00),
	(10, 12, 'service', 'Resin Wall Clock!💕🧿💌', 'uploads/posts/12_20260227_184243_Screenshot_2026-02-27_183938.png', 'image', 'public', 29, NULL, NULL, 'Wall Clock', NULL, 'Handcrafted resin wall clock ⏰💕 · One-of-a-kind art · Silent sweep mechanism · Fully customizable colour & size 🎨', '⏰ About the Product\nEach clock is a unique, hand-poured resin artwork — no two pieces are identical 🌊✨.\n\n🎨 Customization Options\n• Size     : 12" standard · 18" large · 24" XL\n• Colours  : Ocean Blue · Rose Gold · Galaxy Black · Pastel Sunrise · Custom\n• Numbers  : Roman / Arabic / None (minimalist)\n• Frame    : Wood rim · Black metallic · Frameless\n\n🔧 Specs\n• Silent sweep quartz — no ticking sound 🤫\n• 1×AA battery included\n• Ready to hang (hook pre-installed)\n\n📦 Packaging & Delivery\n• Securely bubble-wrapped in branded gift box 🎁\n• Ships all over India in 5–7 days\n• DM for colour samples before ordering!', NULL, 300.00, 'INR', '2–4 hours (crafting time)', '7 days from order confirmation', 0, NULL, 1, 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Customized items are non-returnable. Damaged-in-transit claims accepted within 48 hours of delivery with unboxing video proof.', 1, NULL, 'flat', 0.00, 0.00, 100, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'resignkala@gmail.com', '7209365892', NULL, NULL, NULL, 0, 0, 0, '🖐️ 100% Handmade — Unique One-of-a-Kind Piece\n🌊 Premium Resin Art with Pigments & Metallics\n🤫 Silent Sweep Quartz Movement — No Tick Sound\n🎨 Fully Customizable Colour & Size\n🔢 Roman, Arabic or No Numerals Option\n📌 Ready to Hang — Hook Pre-Installed\n🎁 Gift-Ready Packaging\n🇮🇳 Ships Across India\n♻️ Eco-Safe Resin Materials', NULL, NULL, NULL, 0, NULL, NULL, 0, 0.00, 0, 0, 0, 0, 0, 1, '2026-02-27 13:12:43', '2026-03-22 13:40:48', 'offline', 'online', NULL, 5.00, NULL, NULL, NULL, 0, NULL, NULL, 0.00, 0.00),
	(11, 12, 'showcase', 'reserve your wedding garlands with us!🤍🥀🧿💕💌\r\nDm for price!\r\n*Shipping charges will be extra!\r\nShipping all over India 🇮🇳\r\nDm for orders or inquiries! @resinkalaa', 'uploads/posts/12_20260227_184614_Video-659.mp4', 'video', 'public', 3, NULL, '#resinkalaa #varmalapreserved #varmalapreservation🌺 #varmalapreservedinresin #varmalapreservation❤️', NULL, NULL, NULL, NULL, NULL, NULL, 'INR', NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'flat', 0.00, 0.00, 100, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0.00, 0, 0, 0, 1, 0, 1, '2026-02-27 13:16:14', '2026-02-27 13:16:29', NULL, 'online', NULL, 5.00, NULL, NULL, NULL, 0, NULL, NULL, 0.00, 0.00),
	(12, 13, 'showcase', 'The day is here!🥁 We are ready to set the stage on fire for the freshers. We can’t wait for you to see what we’ve been working on and hope you love the performances as much as we do!⭐️‼️', 'uploads/posts/13_20260228_165201_Video-892.mp4', 'video', 'public', 2, 14, '#fyp #foryou #explore #ahmedabaduniversity #music #musicclub #trending #explorepage✨', NULL, NULL, NULL, NULL, NULL, NULL, 'INR', NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'flat', 0.00, 0.00, 100, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0.00, 1, 0, 0, 2, 0, 1, '2026-02-28 11:22:01', '2026-03-21 06:19:29', NULL, 'online', NULL, 5.00, NULL, NULL, NULL, 0, NULL, NULL, 0.00, 0.00),
	(13, 17, 'service', 'In the presence of Adiyogi, with colors flying and hearts aligning, our forever began.- @triangle_event_management_\r\n#eventplanner #ahmedabadevents #indianwedding #ahmedabad_instagram #eventbytriangleevent #varmalaceremony #weddingevent #bridetobe #couplegoals #adiyogi', 'uploads/posts/17_20260228_170705_Video-610.mp4', 'video', 'public', 27, 262, NULL, '𝙒𝙚𝙙𝙙𝙞𝙣𝙜 𝙚𝙫𝙚𝙣𝙩 𝙢𝙖𝙣𝙖𝙜𝙚𝙢𝙚𝙣𝙩', NULL, 'Full wedding & event management 💍✨ · Décor, lighting, catering, DJ & pyros · 400+ events delivered 🎊 · Pan-Gujarat service 📍', '💍 About Us\nTriangle Event Management — 8+ years of creating unforgettable weddings & events in Ahmedabad and beyond.\n\n🌟 Services We Handle\n• Wedding & reception management\n• Mehendi, Haldi & Sangeet décor\n• Theme floral arrangements\n• Lighting & cold pyro shows\n• DJ, live band & entertainment\n• Catering coordination\n• Photography & videography tie-ups\n• Guest transport & hotel booking\n\n🏆 Our Track Record\n• 400+ successful events 🎊\n• Serving Ahmedabad, Surat, Vadodara & beyond\n• Corporate & celebrity clients\n\n💬 Free initial consultation — call us today!', NULL, 100000.00, 'INR', '1–3 days (depends on event type)', 'Full event planning starts 30–90 days before event', 0, NULL, 1, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'flat', 0.00, 0.00, 100, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'eventmanagement@gmail.com', '9998744209', NULL, NULL, NULL, 0, 0, 0, '👑 Full End-to-End Event Management\n🌺 Luxury Theme Décor & Floral Design\n💡 Grand Lighting & Cold Pyro Shows\n🎶 DJ, Live Band & Entertainment\n🍽️ Multi-Cuisine Catering Coordination\n📸 Photography & Film Package Tie-ups\n🏆 400+ Events Successfully Delivered\n📍 Pan-Gujarat Service Available\n💬 Free Initial Consultation', NULL, NULL, NULL, 0, NULL, NULL, 0, 0.00, 0, 0, 0, 10, 0, 1, '2026-02-28 11:37:05', '2026-03-22 13:40:48', 'offline', 'online', NULL, 5.00, NULL, NULL, NULL, 0, NULL, NULL, 0.00, 0.00),
	(14, 14, 'product', 'Modern Acrylic and Ink Painting, On Sale, Gallery Wall Art with Uncommon Textures, Striking Gold Leaf Accents, Textured Plaster Wall Art', 'uploads/posts/14_20260228_173530_cropped_image.jpg', 'image', 'public', 17, 162, NULL, NULL, 'Modern Acrylic and Ink Painting', 'Original handcrafted acrylic & ink painting 🎨 · Real gold leaf accents · Museum-quality canvas · Ready to hang · 6 sizes available ✨', '🎨 About the Artwork\nOriginal hand-made piece using professional acrylic paints, India ink & real gold leaf — no prints, no reproductions.\n\n🖼️ Options\n• Matte Canvas Stretched (0.75" depth) — gallery-wrapped, ready to hang\n• Matte Canvas Black Framed (1.25" depth) — instant gallery look\n\n📏 Available Sizes\n8×10" · 12×16" · 16×20" · 20×24" · 24×30" · 30×40"\n\n🎨 Artwork Details\n• Techniques : Fluid art, impasto texture, gold leaf, ink resist\n• Palette     : Deep blues, moody neutrals, warm golds & whites\n• Signed by artist on reverse\n\n📦 Arrives ready to hang in a secure flat box with foam corners.\n✅ Anti-yellowing & fade-resistant for 75+ years.', NULL, 2499.00, 'INR', NULL, NULL, 0, NULL, 0, NULL, 1, NULL, 'StoreUSA99', 'new', NULL, NULL, 'Fade-resistant for 75+ years under normal indoor light conditions.', '7-day return accepted if item arrives damaged. Please share unboxing video as proof. Custom orders are non-returnable.', 1, 250.00, 'flat', 0.00, 0.00, 100, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, 0, 0, 1, '🖐️ Original Handcrafted Artwork — One-of-a-Kind\n🥇 Real Gold Leaf Accents\n🎨 Premium Professional Acrylic & Ink Paints\n🏛️ Museum-Quality Canvas (GREENGUARD GOLD Certified)\n🌿 FSC-Certified Sustainable Wood Frame\n📌 Ready-to-Hang Right Out of the Box\n💧 Anti-Yellowing, Water & Fade-Resistant\n📏 6 Size Options Available\n✍️ Artist-Signed on Reverse', NULL, NULL, NULL, 0, NULL, NULL, 0, 0.00, 0, 0, 0, 0, 0, 1, '2026-02-28 11:43:43', '2026-03-22 13:40:48', NULL, 'online', NULL, 5.00, NULL, NULL, NULL, 0, NULL, NULL, 0.00, 0.00),
	(15, 14, 'product', '60x120CM Beautiful Blue Peacock Canvas Painting Home Decoration Wall Art Picture Room Artwork Gift (No Frame)', 'uploads/posts/14_20260228_174044_painting2.jpg', 'image', 'public', 17, 170, NULL, NULL, 'Beautiful Blue Peacock Canvas Painting', 'Handpainted Blue Peacock canvas 🦚✨ · 60×120 cm · Rich acrylic art · Symbol of prosperity · Perfect for home décor & gifting 🎁', '🦚 About the Artwork\nOriginal hand-painted peacock artwork on cotton canvas — crafted with layered acrylic and metallic highlights.\n\n📐 Specifications\n• Size      : 60 cm × 120 cm (vertical)\n• Medium    : Acrylic on cotton canvas\n• Frame     : No frame (can be framed locally)\n• Palette   : Cobalt Blue · Teal · Emerald · Gold · Silver\n• Technique : Layered acrylic with fine-detail brushwork\n\n🌿 Symbolism\n• Symbol of immortality, grace & good fortune\n• Believed to bring peace & prosperity to the home\n• Sacred in Indian mythology (vahana of Lord Murugan)\n\n🎁 Perfect For\nLiving room walls · Bedroom décor · Diwali gifting · Housewarming\n\n✅ Certificate of Authenticity included · Ships rolled in protective tube.', NULL, 3000.00, 'INR', NULL, NULL, 0, NULL, 0, NULL, 3, NULL, 'Jia Fen Art Fashion', 'new', NULL, NULL, 'Colours are lightfast and will not fade for 50+ years under normal indoor conditions.', '7-day free return. Item must be in original condition. Shipping charges for return borne by buyer.', 1, NULL, 'flat', 0.00, 0.00, 100, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, 0, 0, 1, '🦚 Original Hand-Painted Acrylic Artwork\n🎨 Rich Cobalt Blue, Teal & Gold Colour Palette\n📏 Large Format — 60×120 cm\n✨ Metallic Highlight Detailing\n🏠 Elevates Any Living Space Instantly\n🎁 Perfect Housewarming / Diwali Gift\n🌿 Symbol of Prosperity & Good Fortune\n📜 Certificate of Authenticity Included\n📦 Safely Rolled & Tube-Shipped', NULL, NULL, NULL, 0, NULL, NULL, 8, 24000.00, 0, 0, 0, 21, 0, 1, '2026-02-28 12:10:44', '2026-03-22 13:40:48', NULL, 'online', NULL, 5.00, NULL, NULL, NULL, 0, NULL, NULL, 0.00, 0.00),
	(16, 15, 'showcase', 'Some bridges connect places, but this one connects hearts. ❤️\r\nEvenings at Atal Bridge just hit different. 🌇\r\nA symphony of light, wind, and the Sabarmati. 🕊️', 'uploads/posts/15_20260228_180103_photography.jpg', 'image', 'public', 4, 34, '#AtalBridge #Ahmedabad #SabarmatiRiverfront #Amdavad #GujaratTourism #CityOfLights #AtalFootOverBridge #NightVibes #IncredibleIndia', NULL, NULL, NULL, NULL, NULL, NULL, 'INR', NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'flat', 0.00, 0.00, 100, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0.00, 0, 0, 0, 0, 0, 1, '2026-02-28 12:31:03', '2026-02-28 12:31:03', NULL, 'online', NULL, 5.00, NULL, NULL, NULL, 0, NULL, NULL, 0.00, 0.00),
	(17, 18, 'service', 'Turning Concepts into Captivating Creations! 🚀', 'uploads/posts/18_20260228_180525_graphicdesign.jpg', 'image', 'public', 30, 291, NULL, 'Behind the Scenes: The Power of Grid Systems 📏', NULL, 'Professional graphic design services 🎨🚀 · Logo, branding, social media, UI/UX & print · 4 revisions included · Fast 2–5 day delivery ✅', '🎨 About the Service\n5+ years of experience helping startups, businesses & creators build compelling visual identities.\n\n✏️ What I Design\n• 🏢 Logo & brand identity\n• 📱 Social media posts & story templates\n• 📄 Brochures, flyers & posters\n• 🖥️ UI/UX wireframes & app screens\n• 📊 Pitch decks & presentations\n• 📦 Packaging & label design\n\n🛠️ My Process\n1. Brief call (30 min)\n2. 2 initial concept directions\n3. Digital mockups with your feedback\n4. Up to 4 revision rounds\n5. Final delivery — AI, PSD, PDF, PNG\n\n⏰ Turnaround : 2–5 working days\n💬 Free 15-min discovery call available!', NULL, 3000.00, 'INR', '2–6 hours (per deliverable)', '2–5 working days', 1, 4, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'flat', 0.00, 0.00, 100, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'muskan@gmail.com', '9876590456', NULL, NULL, NULL, 0, 0, 0, '🏢 Logo & Brand Identity Design\n📱 Social Media Graphics & Templates\n📄 Brochure, Flyer & Poster Design\n🖥️ UI/UX Wireframes & App Screens\n🔄 Up to 4 Revisions Per Project\n📁 All Source Files Delivered (AI, PSD, PDF)\n⏰ Fast Turnaround — 2–5 Working Days\n📞 Free 15-Min Discovery Call\n💬 Direct Communication Throughout', NULL, NULL, NULL, 0, NULL, NULL, 0, 0.00, 0, 0, 0, 8, 0, 1, '2026-02-28 12:35:25', '2026-03-22 13:40:48', 'online', 'online', NULL, 5.00, NULL, NULL, NULL, 0, NULL, NULL, 0.00, 0.00),
	(18, 8, 'product', 'Unleash your inner diva with the ultimate glow-up essentials! ✨ Re-define perfection one swipe at a time. 💄✨', 'uploads/posts/8_20260228_181330_Screenshot_2026-02-28_180802.png', 'image', 'public', 16, 159, NULL, NULL, 'Swiss Beauty Face Perfection Makeup Kit', '6-in-1 Swiss Beauty Face Perfection Kit 💄✨ · Primer, foundation, concealer, blush, highlighter & fixer · 12-hour long-wear formula 🌟', '💄 What\'s in the Box (6 Products)\n• 🧴 Highlighting Primer — blurs pores, adds glow\n• 🧴 High Performance Foundation — full coverage, matte finish\n• 🖋️ Liquid Concealer — covers dark circles & spots\n• 🌸 Cream Blusher — natural healthy flush\n• ✨ Liquid Highlighter — pearlescent glow on cheekbones\n• 🌬️ Makeup Fixer Spray — locks look for 12+ hours\n\n🎯 How to Apply\n1. Primer → Foundation → Concealer → Blush → Highlighter → Fixer\n\n💕 Suitable For\nAll skin types · Especially great for combination to oily skin\n\n📦 Comes in a branded gift box — perfect for birthdays 🎁\n🌿 Not tested on animals · Paraben-aware formula', NULL, 4999.00, 'INR', NULL, NULL, 0, NULL, 0, NULL, 1, 'SWB-FP6KIT-001', 'Swiss Beauty', 'new', NULL, NULL, NULL, '5-day return for sealed, unopened products only. Opened cosmetics are non-returnable for hygiene reasons.', 1, 200.00, 'flat', 0.00, 0.00, 100, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, 0, 0, 1, '🎁 Complete 6-in-1 Full-Face Makeup Solution\n💧 High-Coverage, Matte Foundation\n✨ Luminous Liquid Highlighter Included\n🌸 Creamy Buildable Blush for Natural Glow\n⏳ 12-Hour Makeup Lock with Fixer Spray\n🧴 Priming Base for Smoother Application\n🌿 Not Tested on Animals\n💕 Suitable for All Skin Types\n🎁 Elegant Gift-Ready Packaging', NULL, NULL, NULL, 0, NULL, NULL, 6, 31194.00, 1, 2, 0, 12, 0, 1, '2026-02-28 12:43:30', '2026-03-22 13:40:48', NULL, 'online', NULL, 5.00, NULL, NULL, NULL, 0, NULL, NULL, 0.00, 0.00),
	(19, 27, 'product', 'Bring nature indoors with this beautiful green companion that purifies your air and brightens your space.', 'uploads/posts/27_20260308_153606_plant.jpg', 'image', 'public', 19, 181, NULL, NULL, '5 Best Fragrant Plants', 'Top 5 air-purifying indoor plants 🌿🪴 · Low maintenance · Perfect for home & office · Includes fragrant varieties · Ships safely 💚', '🌿 The 5 Plants in This Collection\n• 🌹 Mogra (Arabian Jasmine) — fragrant white flowers, air-purifying\n• 🌿 Money Plant — attracts prosperity, thrives in low light\n• 🌵 Aloe Vera — medicinal + decorative, very low maintenance\n• 🌺 Peace Lily — top NASA air-purifier, shade-tolerant\n• 🌼 Chrysanthemum — colourful, filters benzene from air\n\n☀️ Care Guide\n• Water every 3–5 days (do not overwater)\n• Indirect sunlight — 2–4 hours daily\n• Ideal temperature: 18–35°C\n• Mist leaves weekly to remove dust\n\n📦 Packing & Delivery\n• Ships in sealed coco grow bags — spill-proof\n• Optional ceramic pot upgrade (+₹199)\n• Gift wrap available for birthdays & Diwali 🎁', NULL, 1499.00, 'INR', NULL, NULL, 0, NULL, 0, NULL, 6, 'PLT-INDOOR-5PACK', 'Plant Shopee', 'new', NULL, NULL, NULL, '2-day return if plant arrives severely damaged or wrong variety. Share photo proof. Living plants naturally vary in appearance.', 1, NULL, 'flat', 0.00, 0.00, 100, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, 0, 0, 1, '🌿 Certified Air-Purifying Varieties\n🪴 Low Maintenance — Perfect for Beginners\n☀️ Thrives in Indirect Sunlight\n💧 Water Only 2–3 Times a Week\n🏡 Enhances Home & Office Décor\n🌸 Includes Fragrant Varieties\n📦 Spill-Proof Transit Packaging\n🎁 Gift Wrap Option Available\n🌡️ Suitable for Indian Climate', NULL, NULL, NULL, 0, NULL, NULL, 4, 5996.00, 1, 0, 0, 10, 0, 1, '2026-03-08 10:06:06', '2026-03-22 13:40:48', NULL, 'online', NULL, 5.00, NULL, NULL, NULL, 0, NULL, NULL, 0.00, 0.00),
	(20, 16, 'service', '🔥 Transform your body, boost your energy, and build a stronger version of yourself every day.', 'uploads/posts/16_20260309_083231_Video-205.mp4', 'video', 'public', 26, 258, NULL, '🌟 Start your fitness journey', NULL, 'Personalized 3-month fitness program 💪🔥 · Custom workout + nutrition plan · Daily WhatsApp coaching · All fitness levels welcome 🏋️', '💪 About the Program\nPersonalized fitness training designed for your goals — weight loss, muscle building, stamina or overall health.\n\n📅 3-Month Structure\n• Month 1 — Foundation & habit building (45 min/day)\n• Month 2 — Strength & endurance focus (60 min/day)\n• Month 3 — Advanced training & peak performance\n\n✅ What\'s Included\n• Custom workout plan (updated monthly)\n• Personalized diet & nutrition guidance\n• Daily WhatsApp check-ins & motivation\n• Weekly progress tracking & body measurements\n• Exercise video library access\n\n🏋️ Training Modes\nHome workout · Gym-based · Outdoor cardio · Online coaching\n\n🎯 All levels welcome — Beginner, Intermediate & Advanced!', NULL, 5000.00, 'INR', '3 months (12-week program)', 'Program starts within 2 days of enrollment', 0, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'flat', 0.00, 0.00, 100, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'vipul@gmail.com', '9173576732', NULL, NULL, NULL, 0, 0, 0, '💪 Custom Workout Plan Tailored to Your Goals\n🥗 Personalized Diet & Nutrition Guidance\n📱 Daily WhatsApp Check-ins & Motivation\n🎥 Exercise Video Library\n📊 Weekly Progress Tracking\n🏠 Home, Gym & Outdoor Options\n🎯 Suitable for All Fitness Levels\n📅 3-Month Structured Program\n🏆 Proven Results with 100+ Clients', NULL, NULL, NULL, 0, NULL, NULL, 0, 0.00, 0, 0, 0, 2, 0, 1, '2026-03-09 03:02:31', '2026-03-22 13:40:48', 'offline', 'online', NULL, 5.00, NULL, NULL, NULL, 0, NULL, NULL, 0.00, 0.00),
	(21, 19, 'service', '✨ Bring back the shine of your sofa with our professional sofa cleaning service – fresh, clean, and hygienic!', 'uploads/posts/19_20260309_083550_Screenshot_2026-03-09_083315.png', 'image', 'public', 29, 281, NULL, '🏡 Professional sofa cleaning service at your doorstep.', NULL, 'Professional doorstep sofa cleaning 🛋️✨ · Deep steam clean · Stain & odor removal · Eco-safe solutions · Done in 2–4 hours 🧼', '🛋️ About the Service\nDeep-clean your sofa at home — no need to move anything! Our trained team brings all equipment to your doorstep.\n\n🧽 Our 8-Step Cleaning Process\n1. Pre-inspection of fabric & stains\n2. Dry vacuuming — remove loose debris\n3. Enzyme-based stain pre-soak spray\n4. Hot water extraction / foam cleaning\n5. Spot stain treatment\n6. Anti-bacterial sanitizer application\n7. Professional air-drying\n8. Fabric conditioning & post-inspection\n\n🛋️ Sofa Types We Clean\nFabric · Velvet · Microfiber · Suede\n1-seater to L-shape & recliner sofas\n\n⏰ Duration : 2–4 hours · Fully dry in 4–6 hours\n💧 Eco-safe, child & pet-friendly solutions\n📍 Ahmedabad & nearby areas', NULL, 2000.00, 'INR', '2–4 hours', 'Same-day or next-day service available', 0, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'flat', 0.00, 0.00, 100, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '24homeservice@gmail.com', '9316574722', NULL, NULL, NULL, 0, 0, 0, '🧼 8-Step Professional Deep Cleaning Process\n✨ Hot Water Extraction Method\n🦠 Anti-Bacterial & Sanitizing Treatment\n🌺 Stain & Odor Removal\n🛋️ All Fabric Types — Fabric, Velvet, Suede\n🏠 Doorstep Service — No Need to Move Sofa\n💧 Eco-Safe & Child/Pet-Friendly Solutions\n⏰ Done in 2–4 Hours · Dry in 4–6 Hours\n📍 Ahmedabad & Nearby Areas', NULL, NULL, NULL, 0, NULL, NULL, 0, 0.00, 0, 0, 0, 2, 0, 1, '2026-03-09 03:05:50', '2026-03-22 13:40:48', 'offline', 'online', NULL, 5.00, NULL, NULL, NULL, 0, NULL, NULL, 0.00, 0.00),
	(22, 28, 'product', '✨ Keep your meals fresh, organized, and ready to enjoy with this stylish Double Decker Lunch Box – 1440ML.', 'uploads/posts/28_20260309_084738_Screenshot_2026-03-09_084444.png', 'image', 'public', 20, 193, NULL, NULL, '🍽️ A spacious and durable double-layer lunch box', 'Premium Double Decker Lunch Box 🍱 · 1440ML · 2 compartments · BPA-free · Leak-proof lid · Perfect for office, school & travel 💼', '🍱 Product Details\n• Capacity     : 1440 ML (720 ML per tier)\n• Compartments : 2 separate food-safe tiers\n• Material     : Food-grade BPA-free PP plastic ✅\n• Lid           : Snap-lock with rubber gasket — leak-proof 🔒\n• Handle        : Foldable carry handle\n• Colours       : Red 🔴 Blue 💙 Grey ⬜ Green 💚\n• Dishwasher Safe : ✅\n• Microwave Safe  : ❌ (remove lid before heating)\n\n🥗 What Fits Inside\n• Upper tier : Dal / Sabzi / Salad\n• Lower tier : Rice / Roti / Sandwich / Noodles\n\n💼 Best For\nOffice workers · Students · Gym meal-prep · Travelers\n\n🔄 7-day return · 6-month warranty against defects', NULL, 278.00, 'INR', NULL, NULL, 0, NULL, 0, NULL, 8, 'GFT-DDLB-1440ML', 'giftoo', 'new', NULL, NULL, '6-month manufacturer warranty against manufacturing defects.', '7-day return accepted if product is defective or damaged on arrival. Must be in original packaging.', 1, 100.00, 'flat', 0.00, 0.00, 100, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1000.00, 7, NULL, NULL, NULL, NULL, NULL, 0, 0, 1, '🍱 2-Tier Double Decker Design — Keep Foods Separate\n📦 Large 1440ML Total Capacity\n✅ BPA-Free Food-Grade Plastic\n🔒 Snap-Lock Leak-Proof Lid\n🚿 Dishwasher Safe for Easy Cleaning\n🎒 Foldable Handle for Convenient Carry\n🏢 Perfect for Office, School & Travel\n💪 Ideal for Meal Prep & Gym\n🎁 Great Practical Gift Idea', NULL, NULL, NULL, 0, NULL, NULL, 2, 756.00, 0, 0, 0, 10, 0, 1, '2026-03-09 03:17:38', '2026-03-22 13:40:48', NULL, 'online', NULL, 5.00, NULL, NULL, NULL, 0, NULL, NULL, 0.00, 0.00),
	(23, 20, 'service', '✨ Fresh, clean, and perfectly folded clothes delivered right to your doorstep!', 'uploads/posts/20_20260309_085359_Video-604.mp4', 'video', 'public', 25, 244, NULL, '🧼 Professional laundry service that keeps your clothes clean, fresh, and well cared for.', NULL, 'Hassle-free doorstep laundry service 🧼👕 · Wash, dry, iron & fold · Eco-friendly detergents · Express same-day option available 🚚', '🧺 About the Service\nWe pick up, clean, and deliver your clothes — fresh, pressed & neatly folded at your door.\n\n✅ Services Available\n• 👕 Regular Wash (everyday clothes)\n• 👔 Wash + Steam Iron (formal wear)\n• 🧥 Dry Cleaning (suits, sarees, sherwanis)\n• 🛏️ Household Linen (bedsheets, curtains, towels)\n• ⚡ Express Wash — returned in 6–8 hours\n\n🧴 How It Works\n1. Schedule pickup via call / WhatsApp\n2. We collect in a branded bag\n3. Wash → Dry → Iron → Fold\n4. Deliver to your doorstep neatly packed\n\n⏰ Standard turnaround : 24–48 hours\n⚡ Express service : 6–8 hours (extra charge)\n📍 Ahmedabad & surrounding areas · Min order ₹200', NULL, 200.00, 'INR', '1–2 days (standard) / Same day (express)', '24–48 hours standard · 6–8 hours express', 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'flat', 0.00, 0.00, 100, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'quicklaundry@gmail.com', '9173576732', NULL, NULL, NULL, 0, 0, 0, '🚚 Doorstep Pickup & Delivery Included\n🧼 Enzyme-Based Premium Detergents\n👗 Delicate & Dry Cleaning Options\n🛏️ Household Linen Service Available\n⚡ Express 6-Hour Service Option\n👕 Wash + Dry + Iron + Fold — All in One\n🌿 Eco-Friendly & Skin-Safe Products\n📱 Easy Booking via Call or WhatsApp\n⏰ 24–48 Hour Standard Turnaround', NULL, NULL, NULL, 0, NULL, NULL, 0, 0.00, 0, 0, 0, 4, 0, 1, '2026-03-09 03:23:59', '2026-03-22 13:40:48', 'offline', 'online', NULL, 5.00, NULL, NULL, NULL, 0, NULL, NULL, 0.00, 0.00),
	(24, 24, 'product', '🚀 Powerful performance, sleek design, and smart technology – the perfect laptop for work, study, and entertainment.', 'uploads/posts/24_20260309_104427_312504_p5fspk.webm', 'video', 'public', 15, 143, NULL, NULL, 'Lenovo IdeaPad Slim 3 15IAH8 Intel Core i5 12th Gen Thin & Light Laptop (16GB, 512GB SSD, Windows 11 Home, 15.6 inch Full HD IPS Display, MS Office 2024, Arctic Grey, 1.62 KG)', 'Lenovo IdeaPad Slim 3 💻⚡ · i5 12th Gen · 16GB RAM · 512GB SSD · 15.6" FHD IPS · Windows 11 + MS Office 2024 · 1.62 kg 🚀', '💻 Full Specifications\n• Processor  : Intel Core i5-12450H (12th Gen) — up to 4.4 GHz\n• RAM         : 16 GB DDR4 (expandable to 24 GB)\n• Storage     : 512 GB NVMe SSD\n• Display     : 15.6" Full HD IPS Anti-Glare\n• Graphics    : Intel UHD / Iris Xe\n• OS          : Windows 11 Home (64-bit)\n• Office      : MS Office 2024 — lifetime license ✅\n• Battery     : Up to 8 hours\n• Weight      : 1.62 kg · Colour: Arctic Grey\n• Ports       : 2×USB-A · 1×USB-C · HDMI · SD Card · 3.5mm\n• WiFi 6 + Bluetooth 5.1\n• Backlit Keyboard ✅ · Fingerprint Reader ✅\n\n📦 Box : Laptop + 65W USB-C Charger\n🛡️ Warranty : 1 Year Lenovo On-Site', NULL, 52890.00, 'INR', NULL, NULL, 0, NULL, 0, NULL, 1, 'LNV-IPS3-15IAH8-I5', 'Lenovo', 'new', NULL, NULL, '1 Year Lenovo On-Site Warranty — all hardware defects covered.', '10-day replacement policy for manufacturing defects. Physical damage not covered.', 1, 300.00, 'flat', 0.00, 0.00, 100, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, 0, 0, 1, '⚡ Intel Core i5 12th Gen — 8 Cores up to 4.4 GHz\n💾 16 GB DDR4 RAM — Smooth Multitasking\n💿 512 GB NVMe SSD — Lightning Fast Boot\n🖥️ 15.6" Full HD IPS Anti-Glare Display\n🖱️ Windows 11 Home Pre-Installed\n📝 MS Office 2024 Lifetime License Included\n🔋 Up to 8-Hour Battery Life\n⌨️ Backlit Keyboard + Fingerprint Reader\n📶 WiFi 6 + Bluetooth 5.1\n🎒 Ultra-Light 1.62 KG Design', NULL, NULL, NULL, 0, NULL, NULL, 1, 53190.00, 0, 0, 0, 10, 0, 1, '2026-03-09 05:14:27', '2026-03-22 13:40:48', NULL, 'online', NULL, 5.00, NULL, NULL, NULL, 0, NULL, NULL, 0.00, 0.00),
	(25, 21, 'service', '✨ Shine on stage with stunning dance costumes available on rent for every performance!', 'uploads/posts/21_20260309_104853_Screenshot_2026-03-09_104650.png', 'image', 'public', 24, 235, NULL, '🎭 Rent beautiful and high-quality dance costumes for performances, competitions, and events.', NULL, 'Rent stunning dance costumes 💃🎭 · Classical, Bollywood, folk & western styles · Kids & adult sizes · Cleaned & stage-ready ✨', '🎭 About the Service\nA wide collection of stage costumes for rent — cleaned, tailored & ready to perform in.\n\n👗 Costume Categories\n• 💃 Bollywood & filmi fusion\n• 🎊 Classical — Bharatanatyam, Kathak, Odissi\n• 🌿 Folk — Garba, Dandiya, Bhangra, Lavani\n• 🎭 Western — Salsa, Jazz, Contemporary, Hip-Hop\n• 🧒 Kids costumes — age 3–14, all styles\n\n✅ Rental Includes\n• Full outfit (top + bottom + accessories)\n• Professionally cleaned & sanitized\n• Minor alteration adjustments available\n• Home delivery & return pickup\n\n🔄 Rental Periods : 1 day · 3 days · 7 days\n📍 Ahmedabad · WhatsApp us photos of costume options before booking!', NULL, 500.00, 'INR', '3 days rental (default)', 'Delivery 1 day before event · Pickup 1 day after', 0, 0, 1, 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'flat', 0.00, 0.00, 100, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'costume@gmail.com', '9173576732', NULL, NULL, NULL, 0, 0, 0, '💃 100+ Costume Designs — All Styles & Occasions\n👗 Clean, Sanitized & Stage-Ready Outfits\n📏 Kids & Adult Sizes Available\n🎭 Classical, Folk, Bollywood & Western\n🔄 Flexible Rental Period (1, 3 or 7 days)\n🚗 Home Delivery & Pickup Service\n✂️ Minor Alterations Available\n💬 WhatsApp Photo Preview Before Booking\n💰 Affordable — Save vs Buying a New Costume', NULL, NULL, NULL, 0, NULL, NULL, 0, 0.00, 0, 0, 0, 33, 0, 1, '2026-03-09 05:18:53', '2026-03-22 13:45:32', 'both', 'both', '53/626 CHANDNI APPARTMENT SOLA ROAD NARANPURA ahmedabad', 5.00, 'Ahmedabad', 'Gujarat', '380063', 0, 23.057716, 72.546503, 20.00, 5.00),
	(26, 8, 'product', '✨ Add a touch of elegance and sparkle to your style with this beautiful piece of jewellery.', 'uploads/posts/8_20260309_110225_Video-343.mp4', 'video', 'public', 16, 157, NULL, NULL, 'Crafted in 22kt gold, this statement necklace is adorned with emerald accents, pearl clusters, and luminous drop detailing, anchored by an intricately hand-painted meenakari centrepiece', 'Handcrafted 22KT gold necklace 💎👑 · Natural emeralds · Pearl clusters · Hand-painted Meenakari centrepiece · BIS hallmarked · Limited edition ✨', '💎 Product Details\n• Gold Purity  : 22KT BIS Hallmarked\n• Gold Weight  : approx. 42–48 grams\n• Main Stones  : Natural Colombian Emeralds 💚\n• Accent       : Freshwater pearl clusters 🤍\n• Centrepiece  : Hand-painted Meenakari (Jaipur enamel art) 🎨\n• Drop Detail  : 24KT gold-dipped teardrop pendants\n• Length       : 16–18" (adjustable)\n• Clasp        : Secure box clasp with safety catch\n\n🎨 About Meenakari\nA 500-year-old Rajasthani enamel art painted by master craftsmen of Jaipur using natural mineral pigments and kiln-fired for lasting brilliance.\n\n✅ Certifications\n• BIS Hallmark · Stone Authenticity · Craftsmanship Certificate\n\n📦 Velvet-lined branded jewellery box · Insured home delivery available', NULL, 200000.00, 'INR', NULL, NULL, 0, NULL, 0, NULL, 1, 'TYN-NK-22KT-EMR-MKRI', 'Tyani', 'new', NULL, NULL, 'Lifetime free cleaning & polishing at our studio. 1-year craftsmanship warranty.', '15-day return accepted if item is in original condition with all certificates. Custom/engraved pieces are non-returnable.', 1, 0.00, 'per_km', 20.00, 5.00, 100, '380063', NULL, NULL, NULL, NULL, NULL, NULL, 23.0577163, 72.5465027, NULL, 3, NULL, NULL, NULL, NULL, NULL, 0, 0, 1, '⚜️ 22KT BIS Hallmarked Gold\n💚 Natural Colombian Emerald Accents\n🤍 Freshwater Pearl Clusters\n🎨 Hand-Painted Meenakari Centrepiece\n💧 24KT Gold-Dipped Teardrop Drops\n📜 Full Stone Authenticity Certificates\n🏅 Numbered Limited Edition Piece\n📦 Velvet-Lined Premium Jewellery Box\n🛡️ Insured Home Delivery Available', NULL, NULL, NULL, 0, NULL, NULL, 0, 0.00, 1, 0, 0, 19, 0, 1, '2026-03-09 05:32:25', '2026-03-22 13:46:45', NULL, 'online', NULL, 5.00, NULL, NULL, NULL, 0, NULL, NULL, 0.00, 0.00),
	(28, 6, 'product', '✨ Add a touch of charm and personality to your refrigerator with this cute and stylish fridge magnet.', 'uploads/posts/6_20260310_225644_cropped_image.jpg', 'image', 'public', 14, 137, NULL, NULL, 'Cute Decorative Fridge Magnet for Refrigerator | Mini Home Décor Magnet', 'Cute decorative fridge magnet 🧲🎨 · Strong neodymium hold · 50+ designs · Perfect for kitchen décor, gifting & notes 🏡✨', '🧲 Product Details\n• Size     : 5×5 cm (standard) / 7×7 cm (large)\n• Material : MDF board + UV-printed top + neodymium magnet\n• Hold     : Holds 4–5 sheets of paper firmly\n• Finish   : Matte or Glossy (select at checkout)\n\n🎨 Design Categories\n🌸 Floral & Nature · 🐾 Animals · ✈️ Travel landmarks\n🍕 Food & Drinks · 💬 Quotes · 🪔 Seasonal (Diwali, Christmas)\n\n💡 Perfect For\n• Refrigerator & whiteboard décor\n• Holding grocery lists, recipes, kids\' art\n• Locker & gym decoration\n• Office Secret Santa / birthday return gift\n\n📦 Bulk Orders\nCustom logo or photo printing available for 50+ pieces!\nShips pan-India in 3–5 days 🚀', NULL, 20.00, 'INR', NULL, NULL, 0, NULL, 0, NULL, 25, 'DCR-FMGT-MDF-STD', NULL, 'new', NULL, NULL, NULL, '5-day return for damaged/wrong items. Custom-printed magnets are non-returnable.', 1, NULL, 'flat', 0.00, 0.00, 100, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, 0, 0, 1, '🧲 Strong Neodymium Magnet — Holds 4–5 Papers\n🎨 50+ Cute Design Options Available\n📐 Available in 5cm & 7cm Sizes\n✨ UV-Printed for Vivid, Fade-Proof Colours\n🏡 Perfect Kitchen & Office Décor Item\n📋 Multi-Purpose — Notes, Photos, Reminders\n🎁 Ideal Gifting Item — Low Budget, High Charm\n📦 Bulk Custom Printing Available (50+)\n🚀 Ships Pan-India in 3–5 Days', NULL, NULL, NULL, 0, NULL, NULL, 0, 0.00, 0, 0, 1, 39, 0, 1, '2026-03-10 17:24:58', '2026-03-22 13:43:39', NULL, 'online', NULL, 5.00, NULL, NULL, NULL, 0, NULL, NULL, 0.00, 0.00),
	(30, 33, 'product', 'handmade diya with heart', 'uploads/posts/33_20260320_191031_Screenshot_2026-03-10_215552.png', 'image', 'public', 11, 104, NULL, NULL, 'Handmade Heart Diya 🪔❤️ — Festive Clay Lamp', 'Handcrafted heart-shaped clay diya 🪔❤️ · Hand-painted with vibrant colours & glitter · Perfect for Diwali, gifting & home décor ✨', '🪔 Product Details\n• Material  : Terracotta clay (eco-friendly 🌿)\n• Shape     : Heart ❤️ — approx. 8×8 cm\n• Painting  : Acrylic — Red, Gold, Orange, Green, Blue\n• Finish    : Glitter accent border\n• Oil Well  : Holds 5 ml — suitable for ghee or mustard oil\n\n✏️ Customization\n• Name / initials painted on diya (+₹20 per piece)\n• Custom colour theme available\n\n🎁 Pack Options\n• 1 Diya      — ₹100\n• Set of 4    — ₹360 (save ₹40)\n• Set of 8    — ₹700 (save ₹100)\n• Gift Box 12 — ₹999 with decorative packaging\n\n🏡 Perfect For\nDiwali décor · Home mandir · Corporate gifting · Gifting to family\n\n📦 Bubble-wrap protected · Ships all over India 🇮🇳', NULL, 100.00, 'INR', NULL, NULL, 0, NULL, 0, NULL, 3, 'KOH-DIYA-HEART-01', 'Kohinoor Studio', 'new', NULL, NULL, NULL, '3-day return for transit damage with unboxing video proof. Handmade items may have slight natural variations — not a defect.', 1, NULL, 'per_km', 10.00, 6.00, 50, '380001', NULL, NULL, NULL, NULL, NULL, NULL, 23.0223471, 72.5916042, NULL, 5, NULL, NULL, NULL, NULL, NULL, 0, 0, 1, '🪔 100% Handmade Terracotta Clay\n🎨 Hand-Painted with Acrylic & Glitter\n❤️ Unique Heart Shape Design\n🌿 Eco-Friendly Natural Clay\n🕯️ Holds Ghee, Oil or Wax Candle\n✏️ Name Personalization Available\n🎁 Available as Gift Sets (4, 8, 12 pieces)\n📦 Bubble-Wrap Protected Shipping\n🇮🇳 Ships Pan-India', NULL, NULL, NULL, 0, NULL, NULL, 2, 298.89, 0, 0, 1, 62, 0, 1, '2026-03-20 13:40:31', '2026-03-22 16:02:56', NULL, 'online', NULL, 5.00, NULL, NULL, NULL, 0, NULL, NULL, 0.00, 0.00),
	(44, 3, 'service', 'Elegant Mehndi designs for every occasion 💚', 'uploads/posts/3_20260322_085049_Screenshot_2026-03-21_192318.png', 'image', 'public', 21, NULL, NULL, 'Bridal | Party | Festive | Custom Designs', NULL, 'Exquisite mehndi designs 🌿💚 · Bridal, party & festive · Dark stain guarantee · Natural henna · Home visits available · Ahmedabad 📍', '💚 About the Artist\nBased in Memnagar, Ahmedabad — specializing in bespoke mehndi designs that blend tradition with modern artistry.\n\n🌿 Design Styles\n• 👰 Full Bridal — hands, legs & back\n• 💍 Engagement & Couple Mehndi\n• 🎊 Party & Event Mehndi\n• 🌙 Festival Specials — Eid, Karwa Chauth, Teej\n• 🎨 Modern Minimal & Geometric\n• 🌺 Rajasthani & Arabic Fusion\n\n✅ Why Book Me\n• 100% organic henna — no chemicals, no PPD\n• Fine cone for precise, clean lines\n• Same-day appointments available\n• Home visit (doorstep) available\n• WhatsApp portfolio available before booking\n\n📍 Studio: A3/10 Vishva Lake, Memnagar, Ahmedabad — 380052', NULL, 500.00, 'INR', '1–5 hours (varies by design)', 'Same-day service', 0, 0, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'flat', 0.00, 0.00, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'saumyan24@gmail.com', '+919316574722', NULL, NULL, NULL, 0, 0, 0, '🌿 100% Organic & Chemical-Free Henna\n🎨 Bridal, Arabic, Rajasthani & Modern Styles\n💚 Dark Stain Guarantee\n✅ Needle-Thin Cone for Fine Detailing\n🚗 Home Visit / Doorstep Service Available\n🏪 Studio Walk-Ins Welcome\n📅 Same-Day Appointments Available\n🌙 Festival & Occasion Specialization\n💬 Free Design Consultation on WhatsApp', NULL, NULL, NULL, 0, NULL, NULL, 0, 0.00, 0, 0, 2, 34, 0, 1, '2026-03-22 03:20:50', '2026-03-22 16:37:20', 'both', 'both', 'A3/10 Vishva lake Monapark Soceity, Nr Memnagar Lake, B/h Divyapathschool, Memangar Ahmedbabd, Gujarat 380052', 5.00, 'Ahmedabad', 'Gujarat', '380052', 0, 23.046482, 72.534358, 10.00, 5.00);

-- Dumping structure for table creator_connect.post_comments
CREATE TABLE IF NOT EXISTS `post_comments` (
  `comment_id` int NOT NULL AUTO_INCREMENT,
  `post_id` int NOT NULL,
  `user_id` int NOT NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_comment_id` int DEFAULT NULL,
  `likes_count` int DEFAULT '0',
  `is_deleted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`comment_id`),
  KEY `idx_post_id` (`post_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_parent` (`parent_comment_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `post_comments_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE,
  CONSTRAINT `post_comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `post_comments_ibfk_3` FOREIGN KEY (`parent_comment_id`) REFERENCES `post_comments` (`comment_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.post_comments: ~1 rows (approximately)
INSERT INTO `post_comments` (`comment_id`, `post_id`, `user_id`, `content`, `parent_comment_id`, `likes_count`, `is_deleted`, `created_at`, `updated_at`) VALUES
	(2, 18, 8, '@Saumya thank you', NULL, 0, 0, '2026-03-03 08:07:47', '2026-03-03 08:07:47');

-- Dumping structure for table creator_connect.post_likes
CREATE TABLE IF NOT EXISTS `post_likes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `post_id` int NOT NULL,
  `user_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_like` (`post_id`,`user_id`),
  KEY `idx_post_id` (`post_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `post_likes_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE,
  CONSTRAINT `post_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.post_likes: ~1 rows (approximately)
INSERT INTO `post_likes` (`id`, `post_id`, `user_id`, `created_at`) VALUES
	(5, 26, 31, '2026-03-10 09:05:54'),
	(8, 12, 33, '2026-03-21 06:19:29');

-- Dumping structure for table creator_connect.post_shares
CREATE TABLE IF NOT EXISTS `post_shares` (
  `id` int NOT NULL AUTO_INCREMENT,
  `post_id` int NOT NULL,
  `shared_by_user_id` int NOT NULL,
  `shared_to_user_id` int DEFAULT NULL,
  `share_type` enum('direct','story','external') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'direct',
  `shared_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_post_id` (`post_id`),
  KEY `idx_shared_by` (`shared_by_user_id`),
  KEY `idx_shared_to` (`shared_to_user_id`),
  CONSTRAINT `post_shares_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE,
  CONSTRAINT `post_shares_ibfk_2` FOREIGN KEY (`shared_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `post_shares_ibfk_3` FOREIGN KEY (`shared_to_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.post_shares: ~3 rows (approximately)
INSERT INTO `post_shares` (`id`, `post_id`, `shared_by_user_id`, `shared_to_user_id`, `share_type`, `shared_url`, `created_at`) VALUES
	(6, 28, 33, NULL, 'direct', NULL, '2026-03-20 11:21:20'),
	(7, 30, 33, NULL, 'direct', NULL, '2026-03-22 16:02:56'),
	(8, 44, 33, NULL, 'direct', NULL, '2026-03-22 16:31:18'),
	(9, 44, 3, NULL, 'direct', NULL, '2026-03-22 16:37:20');

-- Dumping structure for table creator_connect.product_orders
CREATE TABLE IF NOT EXISTS `product_orders` (
  `order_id` int NOT NULL AUTO_INCREMENT,
  `post_id` int NOT NULL,
  `seller_id` int NOT NULL,
  `buyer_id` int NOT NULL,
  `order_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `quantity` int NOT NULL DEFAULT '1',
  `product_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_price` decimal(10,2) NOT NULL,
  `currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'INR',
  `subtotal` decimal(10,2) NOT NULL,
  `shipping_cost` decimal(10,2) DEFAULT '0.00',
  `tax_amount` decimal(10,2) DEFAULT '0.00',
  `gst_rate` decimal(5,2) DEFAULT '0.00' COMMENT 'GST percentage applied',
  `gst_amount` decimal(10,2) DEFAULT '0.00' COMMENT 'GST amount in INR',
  `delivery_charge` decimal(10,2) DEFAULT '0.00' COMMENT 'Dynamic delivery charge based on distance',
  `delivery_distance_km` decimal(8,2) DEFAULT NULL COMMENT 'Distance from seller to buyer in km',
  `is_pickup` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 = buyer will pick up; 0 = shipped',
  `pickup_confirmed_at` timestamp NULL DEFAULT NULL COMMENT 'When buyer confirmed pickup',
  `buyer_lat` decimal(10,7) DEFAULT NULL COMMENT 'Buyer delivery latitude',
  `buyer_lng` decimal(10,7) DEFAULT NULL COMMENT 'Buyer delivery longitude',
  `buyer_pincode_delivery` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Buyer delivery pincode',
  `discount_amount` decimal(10,2) DEFAULT '0.00',
  `total_amount` decimal(10,2) NOT NULL,
  `shipping_full_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shipping_phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shipping_address_line1` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `shipping_address_line2` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `shipping_city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shipping_state` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shipping_pincode` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shipping_country` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'India',
  `shipping_landmark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `buyer_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','confirmed','processing','shipped','delivered','cancelled','rejected','refunded') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `seller_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `confirmed_at` timestamp NULL DEFAULT NULL,
  `processing_at` timestamp NULL DEFAULT NULL,
  `shipped_at` timestamp NULL DEFAULT NULL,
  `delivered_at` timestamp NULL DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `cancellation_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `tracking_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shipping_carrier` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estimated_delivery_date` date DEFAULT NULL,
  `actual_delivery_date` date DEFAULT NULL,
  `payment_status` enum('pending','submitted','verified','failed','refunded','verification_pending','completed','cod_pending','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `payment_method` enum('upi','bank_transfer','cod','online','card') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_reference` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_date` timestamp NULL DEFAULT NULL,
  `buyer_rating` tinyint DEFAULT NULL,
  `buyer_review` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `review_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `payment_reference_buyer` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_submitted_at` timestamp NULL DEFAULT NULL,
  `payment_verified_at` timestamp NULL DEFAULT NULL,
  `payment_admin_note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`order_id`),
  KEY `idx_post_id` (`post_id`),
  KEY `idx_seller_id` (`seller_id`),
  KEY `idx_buyer_id` (`buyer_id`),
  KEY `idx_status` (`status`),
  KEY `idx_payment_status` (`payment_status`),
  KEY `idx_order_date` (`order_date`),
  CONSTRAINT `fk_product_buyer` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_order_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_seller` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.product_orders: ~23 rows (approximately)
INSERT INTO `product_orders` (`order_id`, `post_id`, `seller_id`, `buyer_id`, `order_date`, `quantity`, `product_name`, `product_price`, `currency`, `subtotal`, `shipping_cost`, `tax_amount`, `gst_rate`, `gst_amount`, `delivery_charge`, `delivery_distance_km`, `is_pickup`, `pickup_confirmed_at`, `buyer_lat`, `buyer_lng`, `buyer_pincode_delivery`, `discount_amount`, `total_amount`, `shipping_full_name`, `shipping_phone`, `shipping_address_line1`, `shipping_address_line2`, `shipping_city`, `shipping_state`, `shipping_pincode`, `shipping_country`, `shipping_landmark`, `buyer_notes`, `status`, `seller_message`, `confirmed_at`, `processing_at`, `shipped_at`, `delivered_at`, `cancelled_at`, `cancellation_reason`, `tracking_number`, `shipping_carrier`, `estimated_delivery_date`, `actual_delivery_date`, `payment_status`, `payment_method`, `payment_reference`, `payment_date`, `buyer_rating`, `buyer_review`, `review_date`, `created_at`, `updated_at`, `payment_reference_buyer`, `payment_submitted_at`, `payment_verified_at`, `payment_admin_note`) VALUES
	(2, 3, 9, 8, '2026-02-25 03:40:21', 1, 'Traditional Navratri Chaniya Choli 💃✨', 2799.00, 'INR', 2799.00, 150.00, 0.00, 0.00, 0.00, 0.00, NULL, 0, NULL, NULL, NULL, NULL, 0.00, 2949.00, 'Jiral Bavishi', '9875275747', 'SP GIRLS HOSTEL MEMNAGAR', '', 'Ahmedabad', 'Gujarat', '380064', 'India', '', '', 'delivered', NULL, '2026-02-25 03:41:06', '2026-02-25 03:41:11', '2026-02-25 03:41:17', '2026-02-25 03:41:23', NULL, NULL, NULL, NULL, NULL, NULL, 'completed', 'upi', NULL, NULL, NULL, NULL, NULL, '2026-02-25 03:40:21', '2026-02-25 03:41:30', NULL, '2026-02-25 03:40:47', '2026-02-25 03:41:30', NULL),
	(4, 18, 8, 30, '2026-02-28 13:28:22', 1, 'Swiss Beauty Face Perfection Makeup Kit', 4999.00, 'INR', 4999.00, 200.00, 0.00, 0.00, 0.00, 0.00, NULL, 0, NULL, NULL, NULL, NULL, 0.00, 5199.00, 'Vidhi Shah', '7893456287', 'Aroma Colony, beside Ganpat University naroda', '', 'Ahmedabad', 'Gujarat', '380063', 'India', '', '', 'delivered', NULL, '2026-02-28 13:29:21', '2026-02-28 13:29:33', '2026-02-28 13:29:51', '2026-02-28 13:29:57', NULL, NULL, NULL, NULL, NULL, NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-28 13:28:22', '2026-02-28 13:29:57', NULL, NULL, NULL, NULL),
	(5, 18, 8, 30, '2026-02-28 13:30:59', 1, 'Swiss Beauty Face Perfection Makeup Kit', 4999.00, 'INR', 4999.00, 200.00, 0.00, 0.00, 0.00, 0.00, NULL, 0, NULL, NULL, NULL, NULL, 0.00, 5199.00, 'Vidhi Shah', '7893456287', 'Aroma Colony, beside Ganpat University naroda', '', 'Ahmedabad', 'Gujarat', '380063', 'India', '', '', 'delivered', NULL, '2026-02-28 13:31:13', '2026-02-28 13:31:31', '2026-02-28 13:31:49', '2026-02-28 13:32:27', NULL, NULL, NULL, NULL, NULL, NULL, 'completed', 'upi', NULL, NULL, NULL, NULL, NULL, '2026-02-28 13:30:59', '2026-02-28 13:32:27', NULL, '2026-02-28 13:31:40', '2026-02-28 13:32:05', NULL),
	(7, 3, 9, 8, '2026-03-03 08:45:02', 1, 'Traditional Navratri Chaniya Choli 💃✨', 2799.00, 'INR', 2799.00, 150.00, 0.00, 0.00, 0.00, 0.00, NULL, 0, NULL, NULL, NULL, NULL, 0.00, 2949.00, 'Jiral Bavishi', '9875275747', 'SP GIRLS HOSTEL MEMNAGAR', '', 'Ahmedabad', 'Gujarat', '380064', 'India', '', '', 'delivered', NULL, '2026-03-03 08:45:31', '2026-03-03 08:46:06', '2026-03-03 08:46:12', '2026-03-03 08:46:20', NULL, NULL, NULL, NULL, NULL, NULL, 'completed', 'cod', NULL, '2026-03-03 08:46:20', NULL, NULL, NULL, '2026-03-03 08:45:02', '2026-03-03 08:46:20', NULL, '2026-03-03 08:45:51', NULL, 'COD collected — 2.0% commission deducted'),
	(11, 15, 14, 8, '2026-03-03 09:24:24', 1, 'Beautiful Blue Peacock Canvas Painting', 3000.00, 'INR', 3000.00, 0.00, 0.00, 0.00, 0.00, 0.00, NULL, 0, NULL, NULL, NULL, NULL, 0.00, 3000.00, 'Jiral Bavishi', '9875275747', 'SP GIRLS HOSTEL MEMNAGAR', '', 'Ahmedabad', 'Gujarat', '380064', 'India', '', '', 'delivered', NULL, '2026-03-03 09:24:37', '2026-03-03 09:24:52', '2026-03-03 09:24:58', '2026-03-03 09:25:04', NULL, NULL, NULL, NULL, NULL, NULL, 'completed', 'cod', NULL, '2026-03-03 09:25:04', NULL, NULL, NULL, '2026-03-03 09:24:24', '2026-03-03 09:25:04', NULL, '2026-03-03 09:24:43', NULL, 'COD collected — 2.0% commission deducted'),
	(12, 15, 14, 8, '2026-03-03 09:25:31', 1, 'Beautiful Blue Peacock Canvas Painting', 3000.00, 'INR', 3000.00, 0.00, 0.00, 0.00, 0.00, 0.00, NULL, 0, NULL, NULL, NULL, NULL, 0.00, 3000.00, 'Jiral Bavishi', '9875275747', 'SP GIRLS HOSTEL MEMNAGAR', '', 'Ahmedabad', 'Gujarat', '380064', 'India', '', '', 'delivered', NULL, '2026-03-03 09:25:42', '2026-03-03 09:25:50', '2026-03-03 09:26:03', '2026-03-03 09:26:09', NULL, NULL, NULL, NULL, NULL, NULL, 'completed', 'upi', NULL, NULL, NULL, NULL, NULL, '2026-03-03 09:25:31', '2026-03-03 09:26:25', NULL, '2026-03-03 09:25:58', '2026-03-03 09:26:25', NULL),
	(13, 18, 8, 9, '2026-03-03 15:59:00', 1, 'Swiss Beauty Face Perfection Makeup Kit', 4999.00, 'INR', 4999.00, 200.00, 0.00, 0.00, 0.00, 0.00, NULL, 0, NULL, NULL, NULL, NULL, 0.00, 5199.00, 'Twinkle Nai', '9664668674', '53/626 CHANDNI APPARTMENT SOLA ROAD NARANPURA', '', 'Ahmedabad', 'Gujarat', '380063', 'India', '', '', 'delivered', NULL, '2026-03-03 15:59:28', '2026-03-03 15:59:35', '2026-03-03 15:59:42', '2026-03-03 16:29:51', NULL, NULL, NULL, NULL, NULL, NULL, 'completed', 'cod', NULL, '2026-03-03 16:29:51', NULL, NULL, NULL, '2026-03-03 15:59:00', '2026-03-03 16:29:51', NULL, '2026-03-03 16:15:58', NULL, 'COD collected — 2.0% commission deducted'),
	(14, 15, 14, 9, '2026-03-03 16:33:56', 1, 'Beautiful Blue Peacock Canvas Painting', 3000.00, 'INR', 3000.00, 0.00, 0.00, 0.00, 0.00, 0.00, NULL, 0, NULL, NULL, NULL, NULL, 0.00, 3000.00, 'Twinkle Nai', '9664668674', '53/626 CHANDNI APPARTMENT SOLA ROAD NARANPURA', '', 'Ahmedabad', 'Gujarat', '380063', 'India', '', '', 'delivered', NULL, '2026-03-03 16:34:20', '2026-03-03 16:34:29', '2026-03-03 16:34:37', '2026-03-03 16:34:57', NULL, NULL, NULL, NULL, NULL, NULL, 'completed', 'upi', NULL, NULL, NULL, NULL, NULL, '2026-03-03 16:33:56', '2026-03-03 16:34:57', NULL, '2026-03-03 16:34:33', '2026-03-03 16:34:50', NULL),
	(15, 15, 14, 9, '2026-03-03 16:41:38', 1, 'Beautiful Blue Peacock Canvas Painting', 3000.00, 'INR', 3000.00, 0.00, 0.00, 0.00, 0.00, 0.00, NULL, 0, NULL, NULL, NULL, NULL, 0.00, 3000.00, 'Twinkle Nai', '9664668674', '53/626 CHANDNI APPARTMENT SOLA ROAD NARANPURA', '', 'Ahmedabad', 'Gujarat', '380063', 'India', '', '', 'delivered', NULL, '2026-03-03 16:42:00', '2026-03-03 16:42:14', '2026-03-03 16:42:22', '2026-03-03 16:42:29', NULL, NULL, NULL, NULL, NULL, NULL, 'completed', 'cod', NULL, '2026-03-03 16:42:29', NULL, NULL, NULL, '2026-03-03 16:41:38', '2026-03-03 16:42:29', NULL, '2026-03-03 16:42:12', NULL, 'COD collected — 2.0% commission deducted'),
	(16, 18, 8, 14, '2026-03-03 16:43:28', 1, 'Swiss Beauty Face Perfection Makeup Kit', 4999.00, 'INR', 4999.00, 200.00, 0.00, 0.00, 0.00, 0.00, NULL, 0, NULL, NULL, NULL, NULL, 0.00, 5199.00, 'Art World', '9678345623', 'Divyapath School, Memnagar', '', 'Ahmedabad', 'Gujarat', '380063', 'India', '', '', 'delivered', NULL, '2026-03-03 16:43:53', '2026-03-03 16:44:00', '2026-03-03 16:44:10', '2026-03-03 16:44:16', NULL, NULL, NULL, NULL, NULL, NULL, 'completed', 'upi', NULL, NULL, NULL, NULL, NULL, '2026-03-03 16:43:28', '2026-03-03 16:44:28', NULL, '2026-03-03 16:44:09', '2026-03-03 16:44:28', NULL),
	(17, 15, 14, 8, '2026-03-03 16:51:57', 1, 'Beautiful Blue Peacock Canvas Painting', 3000.00, 'INR', 3000.00, 0.00, 0.00, 0.00, 0.00, 0.00, NULL, 0, NULL, NULL, NULL, NULL, 0.00, 3000.00, 'Jiral Bavishi', '9875275747', 'SP GIRLS HOSTEL MEMNAGAR', '', 'Ahmedabad', 'Gujarat', '380064', 'India', '', '', 'delivered', NULL, '2026-03-03 16:52:13', '2026-03-03 16:52:16', '2026-03-03 16:52:19', '2026-03-03 16:52:38', NULL, NULL, NULL, NULL, NULL, NULL, 'completed', 'cod', NULL, '2026-03-03 16:52:38', NULL, NULL, NULL, '2026-03-03 16:51:57', '2026-03-03 16:52:38', NULL, '2026-03-03 16:52:35', NULL, 'COD collected — 2.0% commission deducted'),
	(18, 15, 14, 9, '2026-03-03 17:13:19', 1, 'Beautiful Blue Peacock Canvas Painting', 3000.00, 'INR', 3000.00, 0.00, 0.00, 0.00, 0.00, 0.00, NULL, 0, NULL, NULL, NULL, NULL, 0.00, 3000.00, 'Twinkle Nai', '9664668674', '53/626 CHANDNI APPARTMENT SOLA ROAD NARANPURA', '', 'Ahmedabad', 'Gujarat', '380063', 'India', '', '', 'delivered', NULL, '2026-03-03 17:13:30', '2026-03-03 17:13:39', '2026-03-03 17:13:46', '2026-03-03 17:13:52', NULL, NULL, NULL, NULL, NULL, NULL, 'completed', 'cod', NULL, '2026-03-03 17:13:52', NULL, NULL, NULL, '2026-03-03 17:13:19', '2026-03-03 17:13:52', NULL, '2026-03-03 17:13:43', NULL, 'COD collected — 2.0% commission deducted'),
	(19, 19, 27, 30, '2026-03-08 11:21:11', 1, '5 Best Fragrant Plants', 1499.00, 'INR', 1499.00, 0.00, 0.00, 0.00, 0.00, 0.00, NULL, 0, NULL, NULL, NULL, NULL, 0.00, 1499.00, 'Vidhi Shah', '7893456287', 'Aroma Colony, beside Ganpat University naroda', '', 'Ahmedabad', 'Gujarat', '380063', 'India', '', '', 'delivered', NULL, '2026-03-08 11:22:06', '2026-03-08 11:22:18', '2026-03-08 11:22:30', '2026-03-08 11:23:39', NULL, NULL, NULL, NULL, NULL, NULL, 'completed', 'upi', NULL, NULL, NULL, NULL, NULL, '2026-03-08 11:21:11', '2026-03-08 11:23:39', NULL, '2026-03-08 11:22:55', '2026-03-08 11:23:08', NULL),
	(20, 19, 27, 5, '2026-03-08 11:30:43', 1, '5 Best Fragrant Plants', 1499.00, 'INR', 1499.00, 0.00, 0.00, 0.00, 0.00, 0.00, NULL, 0, NULL, NULL, NULL, NULL, 0.00, 1499.00, 'Dhruvi Khandhar', '9345907869', 'Sagar Colony, Prabhat Chowk, Ahmedabad 380063', '', 'Ahmedabad', 'Gujarat', '380063', 'India', '', '', 'delivered', NULL, '2026-03-08 11:30:57', '2026-03-08 11:31:05', '2026-03-08 11:31:11', '2026-03-08 11:31:21', NULL, NULL, NULL, NULL, NULL, NULL, 'completed', 'cod', NULL, '2026-03-08 11:31:21', NULL, NULL, NULL, '2026-03-08 11:30:43', '2026-03-08 11:31:21', NULL, '2026-03-08 11:31:15', NULL, 'COD collected — 2.0% commission deducted'),
	(21, 19, 27, 4, '2026-03-08 12:50:57', 1, '5 Best Fragrant Plants', 1499.00, 'INR', 1499.00, 0.00, 0.00, 0.00, 0.00, 0.00, NULL, 0, NULL, NULL, NULL, NULL, 0.00, 1499.00, 'Twisha D Chauhan', '9916509726', 'Sarkari Vashat Vastrapur Ahmedabad', '', 'Ahmedabad', 'Gujarat', '380063', 'India', '', '', 'delivered', NULL, '2026-03-08 12:51:13', '2026-03-08 12:51:20', '2026-03-08 12:51:26', '2026-03-08 12:51:33', NULL, NULL, NULL, NULL, NULL, NULL, 'completed', 'upi', NULL, NULL, NULL, NULL, NULL, '2026-03-08 12:50:57', '2026-03-08 12:51:55', NULL, '2026-03-08 12:51:24', '2026-03-08 12:51:55', NULL),
	(22, 19, 27, 4, '2026-03-08 12:53:35', 1, '5 Best Fragrant Plants', 1499.00, 'INR', 1499.00, 0.00, 0.00, 0.00, 0.00, 0.00, NULL, 0, NULL, NULL, NULL, NULL, 0.00, 1499.00, 'Twisha D Chauhan', '9916509726', 'Sarkari Vashat Vastrapur Ahmedabad', '', 'Ahmedabad', 'Gujarat', '380063', 'India', '', '', 'delivered', NULL, '2026-03-08 12:53:56', '2026-03-08 12:53:57', '2026-03-08 12:54:40', '2026-03-08 12:54:46', NULL, NULL, NULL, NULL, NULL, NULL, 'completed', 'cod', NULL, '2026-03-08 12:54:46', NULL, NULL, NULL, '2026-03-08 12:53:35', '2026-03-08 12:54:46', NULL, '2026-03-08 12:54:22', NULL, 'COD collected — 2.0% commission deducted'),
	(25, 22, 28, 31, '2026-03-10 10:34:33', 1, '🍽️ A spacious and durable double-layer lunch box', 278.00, 'INR', 278.00, 100.00, 0.00, 0.00, 0.00, 0.00, NULL, 0, NULL, NULL, NULL, NULL, 0.00, 378.00, 'Krishna Kalal', '9316574722', '53/626 CHANDNI APPARTMENT SOLA ROAD NARANPURA', '', 'Ahmedabad', 'Gujarat', '380063', 'India', '', '', 'delivered', NULL, '2026-03-10 10:35:49', '2026-03-10 10:36:19', '2026-03-10 10:36:32', '2026-03-10 10:39:44', NULL, NULL, NULL, NULL, NULL, NULL, 'rejected', 'upi', NULL, NULL, NULL, NULL, NULL, '2026-03-10 10:34:33', '2026-03-10 10:40:21', NULL, '2026-03-10 10:39:20', NULL, NULL),
	(26, 22, 28, 31, '2026-03-10 10:40:35', 1, '🍽️ A spacious and durable double-layer lunch box', 278.00, 'INR', 278.00, 100.00, 0.00, 0.00, 0.00, 0.00, NULL, 0, NULL, NULL, NULL, NULL, 0.00, 378.00, 'Krishna Kalal', '9316574722', '53/626 CHANDNI APPARTMENT SOLA ROAD NARANPURA', '', 'Ahmedabad', 'Gujarat', '380063', 'India', '', '', 'delivered', NULL, '2026-03-10 10:40:52', '2026-03-10 10:41:04', '2026-03-10 10:41:14', '2026-03-10 10:41:26', NULL, NULL, NULL, NULL, NULL, NULL, 'completed', 'upi', NULL, NULL, NULL, NULL, NULL, '2026-03-10 10:40:35', '2026-03-10 10:41:50', NULL, '2026-03-10 10:41:22', '2026-03-10 10:41:50', NULL),
	(29, 30, 33, 3, '2026-03-20 15:40:10', 1, 'Diya', 100.00, 'INR', 100.00, 34.57, 12.00, 12.00, 12.00, 34.57, 4.91, 0, NULL, NULL, NULL, '380013', 0.00, 146.57, 'Nayak Saumya Amitkumar', '9316574722', '32/381, Parasnagar 2, Naranpura, AEC- Sola Road Ahmedabad, Gujarat -380013', '', 'Amod', 'Gujarat', '380013', 'India', '', '', 'delivered', NULL, '2026-03-20 15:40:25', '2026-03-20 15:40:47', '2026-03-20 15:41:00', '2026-03-20 15:41:07', NULL, NULL, NULL, NULL, NULL, NULL, 'completed', 'upi', NULL, NULL, NULL, NULL, NULL, '2026-03-20 15:40:10', '2026-03-20 15:41:07', NULL, '2026-03-20 15:40:37', '2026-03-20 15:40:56', NULL),
	(30, 30, 33, 31, '2026-03-21 06:03:59', 1, 'Diya', 100.00, 'INR', 100.00, 40.32, 12.00, 12.00, 12.00, 40.32, 6.06, 0, NULL, NULL, NULL, '380063', 0.00, 152.32, 'Krishna Kalal', '9316574722', '53/626 CHANDNI APPARTMENT SOLA ROAD NARANPURA', '', 'Nicobar', 'Andaman and Nicobar Islands', '380063', 'India', '', '', 'cancelled', NULL, NULL, NULL, NULL, NULL, '2026-03-21 06:04:09', NULL, NULL, NULL, NULL, NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-21 06:03:59', '2026-03-21 06:04:09', NULL, NULL, NULL, NULL),
	(31, 30, 33, 31, '2026-03-21 10:45:06', 1, 'Diya', 100.00, 'INR', 100.00, 40.32, 12.00, 12.00, 12.00, 40.32, 6.06, 0, NULL, NULL, NULL, '380063', 0.00, 152.32, 'Krishna Kalal', '9316574722', '53/626 CHANDNI APPARTMENT SOLA ROAD NARANPURA', '', 'Ahmedabad', 'Gujarat', '380063', 'India', '', '', 'delivered', NULL, '2026-03-21 10:45:22', '2026-03-21 10:45:38', '2026-03-21 10:45:44', '2026-03-21 10:46:00', NULL, NULL, NULL, NULL, NULL, NULL, 'completed', 'cod', NULL, '2026-03-21 10:46:00', NULL, NULL, NULL, '2026-03-21 10:45:06', '2026-03-21 10:46:00', NULL, '2026-03-21 10:45:57', NULL, 'COD collected — 2.0% commission deducted'),
	(32, 26, 8, 6, '2026-03-21 13:48:06', 1, 'Crafted in 22kt gold, this statement necklace is adorned with emerald accents, pearl clusters, and luminous drop detailing, anchored by an intricately hand-painted meenakari centrepiece', 200000.00, 'INR', 200000.00, 0.00, 36000.00, 18.00, 36000.00, 0.00, NULL, 0, NULL, NULL, NULL, '380063', 0.00, 236000.00, 'Krishna Kalal', '8492384513', '53/626 CHANDNI APPARTMENT SOLA ROAD NARANPURA', '', 'Ahmedabad', 'Gujarat', '380063', 'India', '', '', 'confirmed', NULL, '2026-03-21 13:48:26', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-21 13:48:06', '2026-03-21 13:48:26', NULL, NULL, NULL, NULL),
	(33, 30, 33, 3, '2026-03-22 09:00:26', 1, 'Diya', 100.00, 'INR', 100.00, 39.49, 12.00, 12.00, 12.00, 39.49, 4.91, 0, NULL, NULL, NULL, '380013', 0.00, 151.49, 'Nayak Saumya Amitkumar', '9316574722', '32/381, Parasnagar 2, Naranpura, AEC- Sola Road Ahmedabad, Gujarat -380013', '', 'Amod', 'Gujarat', '380013', 'India', '', '', 'cancelled', NULL, NULL, NULL, NULL, NULL, '2026-03-22 09:00:57', NULL, NULL, NULL, NULL, NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-22 09:00:26', '2026-03-22 09:00:57', NULL, NULL, NULL, NULL);

-- Dumping structure for table creator_connect.roles
CREATE TABLE IF NOT EXISTS `roles` (
  `role_id` int NOT NULL,
  `role_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `role_name` (`role_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.roles: ~2 rows (approximately)
INSERT INTO `roles` (`role_id`, `role_name`, `description`, `created_at`) VALUES
	(0, 'Creator', 'Content creator with standard permissions', '2026-02-24 16:54:35'),
	(1, 'Admin', 'Administrator with full system access', '2026-02-24 16:54:35');

-- Dumping structure for table creator_connect.role_permissions
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_role_permission` (`role_id`,`permission_id`),
  KEY `idx_role` (`role_id`),
  KEY `idx_permission` (`permission_id`),
  CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE CASCADE,
  CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `admin_permissions` (`permission_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.role_permissions: ~7 rows (approximately)
INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`) VALUES
	(1, 1, 1, '2026-02-24 16:54:35'),
	(2, 1, 2, '2026-02-24 16:54:35'),
	(3, 1, 3, '2026-02-24 16:54:35'),
	(4, 1, 4, '2026-02-24 16:54:35'),
	(5, 1, 5, '2026-02-24 16:54:35'),
	(6, 1, 6, '2026-02-24 16:54:35'),
	(7, 1, 7, '2026-02-24 16:54:35');

-- Dumping structure for table creator_connect.sales_summary
CREATE TABLE IF NOT EXISTS `sales_summary` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transaction_id` int NOT NULL,
  `seller_id` int NOT NULL,
  `post_id` int NOT NULL,
  `gross_amount` decimal(10,2) NOT NULL,
  `platform_fee` decimal(10,2) NOT NULL,
  `net_amount` decimal(10,2) NOT NULL,
  `clearance_status` enum('pending','cleared','on_hold') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `cleared_at` timestamp NULL DEFAULT NULL,
  `sale_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `transaction_id` (`transaction_id`),
  KEY `post_id` (`post_id`),
  KEY `idx_seller_sales` (`seller_id`),
  KEY `idx_clearance_status` (`clearance_status`),
  CONSTRAINT `sales_summary_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `platform_transactions` (`transaction_id`) ON DELETE CASCADE,
  CONSTRAINT `sales_summary_ibfk_2` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_summary_ibfk_3` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.sales_summary: ~0 rows (approximately)

-- Dumping structure for table creator_connect.saved_posts
CREATE TABLE IF NOT EXISTS `saved_posts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `post_id` int NOT NULL,
  `saved_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_save` (`user_id`,`post_id`),
  KEY `post_id` (`post_id`),
  KEY `idx_user_saved` (`user_id`,`saved_at`),
  CONSTRAINT `saved_posts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `saved_posts_ibfk_2` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.saved_posts: ~3 rows (approximately)
INSERT INTO `saved_posts` (`id`, `user_id`, `post_id`, `saved_at`) VALUES
	(3, 4, 3, '2026-03-08 13:04:38');

-- Dumping structure for table creator_connect.seller_balance
CREATE TABLE IF NOT EXISTS `seller_balance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `total_earnings` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_withdrawn` decimal(12,2) NOT NULL DEFAULT '0.00',
  `available_balance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `pending_clearance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_sales` int NOT NULL DEFAULT '0',
  `total_refunds` decimal(12,2) NOT NULL DEFAULT '0.00',
  `last_withdrawal_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `commission_deficit` decimal(12,2) NOT NULL DEFAULT '0.00',
  `is_withdrawal_blocked` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_balance` (`user_id`),
  CONSTRAINT `seller_balance_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=199 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.seller_balance: ~12 rows (approximately)
INSERT INTO `seller_balance` (`id`, `user_id`, `total_earnings`, `total_withdrawn`, `available_balance`, `pending_clearance`, `total_sales`, `total_refunds`, `last_withdrawal_at`, `updated_at`, `commission_deficit`, `is_withdrawal_blocked`) VALUES
	(1, 8, 19912.17, 900.00, 8666.16, 0.00, 4, 0.00, '2026-03-11 02:44:41', '2026-03-11 08:15:06', 0.00, 0),
	(5, 9, 5691.57, 0.00, 2742.57, 0.00, 2, 0.00, NULL, '2026-03-08 14:12:14', 0.00, 0),
	(11, 30, 0.00, 0.00, 0.00, 0.00, 0, 0.00, NULL, '2026-02-28 13:27:07', 0.00, 0),
	(29, 14, 5700.00, 6534.00, 0.00, 0.00, 8, 0.00, '2026-03-03 11:45:31', '2026-03-03 17:20:04', 0.00, 0),
	(54, 5, 450.00, 0.00, 0.00, 0.00, 1, 0.00, NULL, '2026-03-03 09:31:12', 0.00, 0),
	(111, 27, 5786.14, 100.00, 2688.14, 0.00, 4, 0.00, '2026-03-08 05:55:52', '2026-03-08 12:59:45', 0.00, 0),
	(143, 4, 0.00, 0.00, 0.00, 0.00, 0, 0.00, NULL, '2026-03-08 13:06:39', 0.00, 0),
	(170, 24, 50530.50, 10000.00, 40530.50, 50530.50, 1, 0.00, '2026-03-09 01:17:24', '2026-03-09 06:47:32', 0.00, 0),
	(174, 28, 718.20, 100.00, 259.10, 0.00, 2, 0.00, '2026-03-10 05:22:24', '2026-03-10 10:52:31', 0.00, 0),
	(176, 31, 0.00, 0.00, 0.00, 0.00, 0, 0.00, NULL, '2026-03-11 07:15:55', 0.00, 0),
	(186, 33, 288.52, 0.00, 136.19, 0.00, 2, 0.00, NULL, '2026-03-21 10:59:55', 0.00, 0),
	(196, 21, 667.48, 0.00, 331.48, 0.00, 2, 0.00, NULL, '2026-03-22 11:41:35', 0.00, 0);

-- Dumping structure for table creator_connect.seller_payment_settings
CREATE TABLE IF NOT EXISTS `seller_payment_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `accepts_upi` tinyint(1) DEFAULT '0',
  `upi_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `upi_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accepts_bank_transfer` tinyint(1) DEFAULT '0',
  `bank_account_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_ifsc_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_holder_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_branch` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT '0',
  `verified_at` timestamp NULL DEFAULT NULL,
  `verified_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_payment` (`user_id`),
  CONSTRAINT `seller_payment_settings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.seller_payment_settings: ~4 rows (approximately)
INSERT INTO `seller_payment_settings` (`id`, `user_id`, `accepts_upi`, `upi_id`, `upi_name`, `accepts_bank_transfer`, `bank_account_number`, `bank_ifsc_code`, `bank_holder_name`, `bank_name`, `bank_branch`, `is_verified`, `verified_at`, `verified_by`, `created_at`, `updated_at`) VALUES
	(1, 8, 1, '9316574722@ptyes', 'Saumya', 1, '344444444444444', 'SBIN0001234', 'e333332e', 'state', 'ee', 0, NULL, NULL, '2026-02-25 03:25:35', '2026-02-25 04:44:54'),
	(2, 9, 1, '9316574722@ptyes', 'Twinkal', 0, '', '', '', '', '', 0, NULL, NULL, '2026-02-25 03:42:12', '2026-02-25 03:42:12'),
	(3, 14, 1, '9316574722@ptyes', 'Saumya', 0, '', '', '', '', '', 0, NULL, NULL, '2026-03-03 16:48:39', '2026-03-03 16:48:39'),
	(4, 27, 1, '9316574722@ptyes', 'Plant', 0, '', '', '', '', '', 0, NULL, NULL, '2026-03-08 11:25:26', '2026-03-08 11:29:08'),
	(5, 24, 1, '9316574722@ptyes', 'eeeeeeeee', 0, '', '', '', '', '', 0, NULL, NULL, '2026-03-09 06:46:29', '2026-03-09 06:46:29'),
	(6, 28, 1, '9316574722@upi', 'eeeeeeeee', 0, '', '', '', '', '', 0, NULL, NULL, '2026-03-10 10:51:52', '2026-03-10 10:51:52');

-- Dumping structure for table creator_connect.service_bookings
CREATE TABLE IF NOT EXISTS `service_bookings` (
  `booking_id` int NOT NULL AUTO_INCREMENT,
  `post_id` int NOT NULL,
  `service_provider_id` int NOT NULL COMMENT 'User who offers the service',
  `customer_id` int NOT NULL COMMENT 'User who books the service',
  `booking_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `preferred_start_date` date DEFAULT NULL COMMENT 'When customer wants service to start',
  `preferred_time` time DEFAULT NULL COMMENT 'Preferred time if applicable',
  `booked_slot` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Slot label (HH:MM) picked by buyer, e.g. 09:00',
  `duration_days` int DEFAULT NULL COMMENT 'How many days the service will take',
  `customer_requirements` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Detailed requirements from customer',
  `reference_files` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'JSON array of uploaded reference files',
  `contact_method` enum('email','phone','whatsapp') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_contact` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quoted_price` decimal(10,2) NOT NULL COMMENT 'Service price at time of booking',
  `currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'INR',
  `additional_charges` decimal(10,2) DEFAULT NULL COMMENT 'Any extra charges',
  `total_amount` decimal(10,2) NOT NULL,
  `status` enum('pending','accepted','in_progress','revision_requested','completed','cancelled','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `provider_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Message from service provider',
  `accepted_at` timestamp NULL DEFAULT NULL,
  `rejected_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `cancellation_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `payment_status` enum('pending','partial','completed','refunded','verification_pending','cod_pending','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `advance_paid` decimal(10,2) DEFAULT NULL,
  `advance_payment_date` timestamp NULL DEFAULT NULL,
  `final_payment_date` timestamp NULL DEFAULT NULL,
  `payment_method` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'upi, bank_transfer, razorpay',
  `payment_reference` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `delivery_files` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'JSON array of delivered work files',
  `delivery_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `delivery_date` timestamp NULL DEFAULT NULL,
  `customer_rating` tinyint(1) DEFAULT NULL COMMENT '1-5 stars',
  `customer_review` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `review_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `variant_id` int DEFAULT NULL,
  `selected_variant_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `variant_price` decimal(10,2) DEFAULT NULL,
  `final_price` decimal(10,2) DEFAULT NULL,
  `location_type` enum('online','at_provider','doorstep','both') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'online',
  `buyer_address` text COLLATE utf8mb4_unicode_ci,
  `buyer_pincode` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `buyer_lat` decimal(10,6) DEFAULT NULL,
  `buyer_lng` decimal(10,6) DEFAULT NULL,
  `distance_km` decimal(8,2) DEFAULT NULL,
  `travel_fee` decimal(8,2) DEFAULT '0.00',
  `delivery_timeline` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `service_completed_at` datetime DEFAULT NULL,
  `buyer_confirmed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`booking_id`),
  KEY `idx_post_id` (`post_id`),
  KEY `idx_service_provider` (`service_provider_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`),
  KEY `idx_booking_date` (`booking_date`),
  CONSTRAINT `fk_service_booking_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_service_customer` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_service_provider` FOREIGN KEY (`service_provider_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.service_bookings: ~9 rows (approximately)
INSERT INTO `service_bookings` (`booking_id`, `post_id`, `service_provider_id`, `customer_id`, `booking_date`, `preferred_start_date`, `preferred_time`, `booked_slot`, `duration_days`, `customer_requirements`, `reference_files`, `contact_method`, `customer_contact`, `quoted_price`, `currency`, `additional_charges`, `total_amount`, `status`, `provider_message`, `accepted_at`, `rejected_at`, `completed_at`, `cancelled_at`, `cancellation_reason`, `payment_status`, `advance_paid`, `advance_payment_date`, `final_payment_date`, `payment_method`, `payment_reference`, `delivery_files`, `delivery_message`, `delivery_date`, `customer_rating`, `customer_review`, `review_date`, `created_at`, `updated_at`, `variant_id`, `selected_variant_name`, `variant_price`, `final_price`, `location_type`, `buyer_address`, `buyer_pincode`, `buyer_lat`, `buyer_lng`, `distance_km`, `travel_fee`, `delivery_timeline`, `service_completed_at`, `buyer_confirmed_at`) VALUES
	(1, 5, 5, 9, '2026-02-25 03:43:04', '2026-03-04', '12:15:00', '12:15', 1, 'For Wedding ceremony requirement', NULL, 'email', 'twinkalnayi@gmail.com', 450.00, 'INR', NULL, 450.00, 'completed', NULL, '2026-02-25 03:43:31', NULL, '2026-02-25 03:43:44', NULL, NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-25 03:43:04', '2026-03-22 03:49:14', NULL, NULL, NULL, NULL, 'online', NULL, NULL, NULL, NULL, NULL, 0.00, NULL, NULL, NULL),
	(2, 13, 17, 30, '2026-02-28 13:37:31', '2026-03-03', '21:06:00', '21:06', 1, 'Birthday decoration needed for my brother', NULL, 'email', 'vidhi@gmail.com', 100000.00, 'INR', NULL, 100000.00, 'completed', NULL, '2026-02-28 13:38:35', NULL, '2026-02-28 13:38:52', NULL, NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-28 13:37:31', '2026-03-22 03:49:14', NULL, NULL, NULL, NULL, 'online', NULL, NULL, NULL, NULL, NULL, 0.00, NULL, NULL, NULL),
	(3, 17, 18, 30, '2026-02-28 13:50:13', '2026-03-06', '21:19:00', '21:19', 1, 'I want logo for my web application', NULL, 'phone', '9316574722', 3000.00, 'INR', NULL, 3000.00, 'completed', NULL, '2026-02-28 13:51:11', NULL, '2026-03-03 03:51:57', NULL, NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-28 13:50:13', '2026-03-22 03:49:14', NULL, NULL, NULL, NULL, 'online', NULL, NULL, NULL, NULL, NULL, 0.00, NULL, NULL, NULL),
	(5, 17, 18, 9, '2026-03-08 13:07:09', '2026-03-14', '20:38:00', '20:38', 1, 'I want UI/UX designer for my website', NULL, 'email', 'saumyan26@gmail.com', 3000.00, 'INR', NULL, 3000.00, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-08 13:07:09', '2026-03-22 03:49:14', NULL, NULL, NULL, NULL, 'online', NULL, NULL, NULL, NULL, NULL, 0.00, NULL, NULL, NULL),
	(6, 1, 3, 31, '2026-03-10 10:29:43', '2026-03-12', '18:00:00', '18:00', 1, 'bridal mehndi requirement', NULL, 'email', 'saumyan26@gmail.com', 500.00, 'INR', NULL, 500.00, 'completed', NULL, '2026-03-10 10:30:50', NULL, '2026-03-10 10:31:52', NULL, NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-10 10:29:43', '2026-03-22 03:49:14', NULL, NULL, NULL, NULL, 'online', NULL, NULL, NULL, NULL, NULL, 0.00, NULL, NULL, NULL),
	(7, 1, 3, 8, '2026-03-11 08:22:09', '2026-03-13', '16:52:00', '16:52', 1, 'I need for 2 hands e', NULL, 'email', 'saumyan26@gmail.com', 500.00, 'INR', NULL, 500.00, 'completed', NULL, '2026-03-11 08:23:24', NULL, '2026-03-11 08:24:38', NULL, NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-11 08:22:09', '2026-03-22 03:49:14', NULL, NULL, NULL, NULL, 'online', NULL, NULL, NULL, NULL, NULL, 0.00, NULL, NULL, NULL),
	(9, 44, 3, 33, '2026-03-22 03:27:37', '2026-03-23', '10:00:00', '10:00', 1, 'for wedding event , bridal mehndi', NULL, 'email', 'saumyan26@gmail.com', 1.00, 'INR', NULL, 5033.96, 'completed', NULL, '2026-03-22 03:30:31', NULL, '2026-03-22 03:49:52', NULL, NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-22 03:27:37', '2026-03-22 03:49:52', 11, 'Bridal Mehndi Package 👰\n            Full hands (front & back) Full legs design Custom bridal theme Groom name inclusion\n            4.0h', 5000.00, 5000.00, 'doorstep', '53/626 chandi appartment sola road naranpura', '380013', NULL, NULL, NULL, 33.96, NULL, NULL, NULL),
	(10, 44, 3, 21, '2026-03-22 11:42:15', '2026-03-23', '11:00:00', NULL, 1, 'For wedding event bridal mehndi', NULL, 'email', 'saumyan26@gmail.com', 2.00, 'INR', NULL, 5000.00, 'completed', NULL, '2026-03-22 11:42:35', NULL, '2026-03-22 11:42:44', NULL, NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-22 11:42:15', '2026-03-22 11:42:44', 11, 'Bridal Mehndi Package 👰\n            Full hands (front & back) Full legs design Custom bridal theme Groom name inclusion\n            4.0h', 5000.00, 5000.00, 'at_provider', NULL, NULL, NULL, NULL, NULL, 0.00, NULL, NULL, NULL),
	(11, 44, 3, 21, '2026-03-22 11:44:17', '2026-03-23', '12:00:00', NULL, 1, 'Event of engagement so need party type mehndi', NULL, 'email', 'saumyan26@gmail.com', 2.00, 'INR', NULL, 3028.81, 'completed', NULL, '2026-03-22 11:44:29', NULL, '2026-03-22 11:44:57', NULL, NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-22 11:44:17', '2026-03-22 11:44:57', 12, 'Engagement / Party Package 💍\n            Half hands design Simple leg design (optional) Elegant & quick patterns\n            2.0h', 3000.00, 3000.00, 'doorstep', '53/626 Chandni Appartment sola road naranpura ahmedabad', '380063', NULL, NULL, NULL, 28.81, NULL, NULL, NULL);

-- Dumping structure for table creator_connect.service_contact_requests
CREATE TABLE IF NOT EXISTS `service_contact_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `post_id` int NOT NULL,
  `service_provider_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `contact_email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','responded','closed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_post_id` (`post_id`),
  KEY `idx_provider` (`service_provider_id`),
  KEY `idx_customer` (`customer_id`),
  CONSTRAINT `service_contact_requests_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE,
  CONSTRAINT `service_contact_requests_ibfk_2` FOREIGN KEY (`service_provider_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `service_contact_requests_ibfk_3` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.service_contact_requests: ~0 rows (approximately)

-- Dumping structure for table creator_connect.service_price_variants
CREATE TABLE IF NOT EXISTS `service_price_variants` (
  `variant_id` int NOT NULL AUTO_INCREMENT,
  `post_id` int NOT NULL,
  `variant_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `duration_hours` decimal(4,1) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `sort_order` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`variant_id`),
  KEY `idx_spv_post` (`post_id`),
  KEY `idx_spv_active` (`post_id`,`is_active`),
  CONSTRAINT `fk_spv_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.service_price_variants: ~35 rows (approximately)
INSERT INTO `service_price_variants` (`variant_id`, `post_id`, `variant_name`, `description`, `price`, `duration_hours`, `is_active`, `sort_order`, `created_at`) VALUES
	(16, 1, 'Basic Festive Package 🌸', 'Both hands front design · Lightweight Arabic patterns · Perfect for Eid, Teej, Karwa Chauth', 500.00, 2.0, 1, 0, '2026-03-22 19:03:31'),
	(17, 1, 'Party & Engagement Package 💍', 'Both hands full design (front & back) · Feet tops · Bridal motifs · Suits engagement & pre-wedding', 1200.00, 3.0, 1, 1, '2026-03-22 19:03:31'),
	(18, 1, 'Full Bridal Package 👰', 'Full hands (front & back) · Full legs · Back design · Groom initials hidden · Dark stain cone · 2 sittings if needed', 2500.00, 6.0, 1, 2, '2026-03-22 19:03:31'),
	(19, 1, 'VIP Bridal with Home Visit 🚗✨', 'Everything in Full Bridal + doorstep visit included + touch-up sitting + personalized bridal pattern consultation', 3500.00, 7.0, 1, 3, '2026-03-22 19:03:31'),
	(20, 5, 'Starter Pack — up to 50 guests 🥗', 'Basic Gujarati Thali · 5 sabzi + dal + roti + rice + farsan + dessert · 2 serving staff included', 450.00, 5.0, 1, 0, '2026-03-22 19:03:31'),
	(21, 5, 'Standard Pack — 50–200 guests 🍛', 'Mixed Indian Buffet · North + Gujarati · 8 items + dessert counter · 5 staff + crockery', 380.00, 6.0, 1, 1, '2026-03-22 19:03:31'),
	(22, 5, 'Premium Pack — 200–500 guests 🍽️', 'Multi-Cuisine Buffet · North + Gujarati + South + Chinese · Live counter · 12 items + 2 desserts · 10 staff', 350.00, 7.0, 1, 2, '2026-03-22 19:03:31'),
	(23, 5, 'Royal Wedding Pack — 500+ guests 👑', 'Full Multi-Cuisine + Live Stalls + Welcome Drink Counter + Dessert Trolley + Uniformed Staff · Per plate price negotiable', 300.00, 8.0, 1, 3, '2026-03-22 19:03:31'),
	(24, 10, 'Standard 12" Clock ⏰', 'Resin wall clock · 12 inch · Choice of 3 colour themes · Silent quartz · Wooden rim · Ready to hang', 300.00, 3.0, 1, 0, '2026-03-22 19:03:31'),
	(25, 10, 'Large 18" Statement Clock 🌊', 'Resin wall clock · 18 inch · Premium metallic pigments · Custom colour · Silent quartz · Black metallic rim', 550.00, 4.0, 1, 1, '2026-03-22 19:03:31'),
	(26, 10, 'Custom Gift Clock 🎁✨', '12" or 18" clock · Your chosen colour palette + personalized message/date engraved on dial · Premium gift box', 700.00, 5.0, 1, 2, '2026-03-22 19:03:31'),
	(27, 13, 'Small Function Package 🌸', 'Mehendi / Haldi / Engagement décor · Up to 100 guests · Basic floral + lighting + 2 staff', 25000.00, 8.0, 1, 0, '2026-03-22 19:03:31'),
	(28, 13, 'Standard Wedding Package 💍', 'Full wedding day management · Up to 300 guests · Theme décor + lighting + catering coordination + DJ + photography tie-up', 75000.00, 16.0, 1, 1, '2026-03-22 19:03:31'),
	(29, 13, 'Premium 2-Day Wedding Package 💒', '2-day event (wedding + reception) · Up to 500 guests · Luxury décor + cold pyros + full entertainment + all coordination', 150000.00, 48.0, 1, 2, '2026-03-22 19:03:31'),
	(30, 13, 'Royal Destination Wedding 👑✨', 'Multi-day destination wedding · Unlimited guests · Full luxury experience · Pyros + fireworks + celebrity entertainment', 300000.00, 72.0, 1, 3, '2026-03-22 19:03:31'),
	(31, 17, 'Logo Design Only 🏷️', 'Custom logo · 3 concept directions · 4 revisions · Final files AI + PNG + PDF', 1500.00, 6.0, 1, 0, '2026-03-22 19:03:31'),
	(32, 17, 'Brand Identity Starter 🎨', 'Logo + business card + letterhead + social media avatar + brand colour palette', 3000.00, 12.0, 1, 1, '2026-03-22 19:03:31'),
	(33, 17, 'Social Media Content Pack 📱', '10 custom post templates (Feed + Stories) + brand fonts + colour scheme — delivered as editable Canva/PSD files', 2000.00, 8.0, 1, 2, '2026-03-22 19:03:31'),
	(34, 17, 'Full Brand Kit 🚀', 'Logo + brand identity + 10 social templates + pitch deck (10 slides) + packaging label design · 5 revisions', 6000.00, 24.0, 1, 3, '2026-03-22 19:03:31'),
	(35, 20, 'Starter — 1 Month 🏃', '4-week workout plan + basic diet guide + 2 check-ins per week via WhatsApp', 2000.00, 1.0, 1, 0, '2026-03-22 19:03:31'),
	(36, 20, 'Standard — 3 Month Program 💪', '12-week full program + custom diet plan + daily check-ins + weekly video call + progress tracking', 5000.00, 1.0, 1, 1, '2026-03-22 19:03:31'),
	(37, 20, 'Premium — 3 Month + Gym Plan 🏋️', '12-week gym-focused program + diet + supplements guide + bi-weekly body analysis + 24/7 WhatsApp support', 7500.00, 1.0, 1, 2, '2026-03-22 19:03:31'),
	(38, 20, 'Elite Online Coaching 🏆', 'Personalized 3-month plan + video call sessions (3×/month) + custom meal plan + exclusive exercise library', 10000.00, 1.0, 1, 3, '2026-03-22 19:03:31'),
	(39, 21, '1–2 Seater Sofa Clean 🛋️', 'Single or two-seater sofa · Full deep clean + stain treatment + sanitization', 800.00, 2.0, 1, 0, '2026-03-22 19:03:31'),
	(40, 21, '3 Seater Sofa Clean 🛋️✨', '3-seater sofa · Full deep clean + stain & odor treatment + fabric conditioning', 1200.00, 2.5, 1, 1, '2026-03-22 19:03:31'),
	(41, 21, 'L-Shape / Corner Sofa 🏡', 'Large L-shape or sectional sofa · Complete deep clean including all sections + sanitization', 2000.00, 4.0, 1, 2, '2026-03-22 19:03:31'),
	(42, 21, 'Full Home Sofa Package 🏠💎', 'Clean all sofas in the home (up to 5 items) + 2 chairs + mattress surface clean · Best value pack', 3500.00, 6.0, 1, 3, '2026-03-22 19:03:31'),
	(43, 23, 'Regular Wash (per kg) 👕', 'Machine wash + dry + fold · Min 3 kg · Casual clothes, jeans, T-shirts · 24–48 hr turnaround', 80.00, 24.0, 1, 0, '2026-03-22 19:03:31'),
	(44, 23, 'Wash + Iron (per kg) 👔', 'Machine wash + steam iron + neatly fold · Min 3 kg · Best for office shirts & formal wear', 120.00, 24.0, 1, 1, '2026-03-22 19:03:31'),
	(45, 23, 'Dry Cleaning (per item) 🧥', 'Professional dry cleaning for suits, sarees, sherwanis, heavy garments · Per piece pricing', 200.00, 48.0, 1, 2, '2026-03-22 19:03:31'),
	(46, 23, 'Express Laundry ⚡ (5 kg min)', 'Same-day wash + dry + fold delivery · Ready in 6–8 hours · Perfect for urgent needs', 150.00, 8.0, 1, 3, '2026-03-22 19:03:31'),
	(47, 25, 'Basic Costume Rental — 1 Day 🌸', 'Any single costume from our collection · 1-day rental · Includes cleaning deposit refunded on return', 500.00, 24.0, 1, 0, '2026-03-22 19:03:31'),
	(48, 25, 'Standard Rental — 3 Days 💃', 'Any single full outfit · 3-day rental · Ideal for multi-day events or competitions · Includes accessories', 800.00, 72.0, 1, 1, '2026-03-22 19:03:31'),
	(49, 25, 'Premium Costume — 7 Days 🎭✨', 'Premium tier costume (bridal, classical, heavy lehenga) · 7-day rental · Includes minor tailoring + accessories', 1200.00, 168.0, 1, 2, '2026-03-22 19:03:31'),
	(50, 25, 'Group Booking (5+ costumes) 👥', '5 or more costumes rented together · Per-costume discount · Ideal for schools, groups, troupes', 400.00, 72.0, 1, 3, '2026-03-22 19:03:31'),
	(57, 44, 'Bridal Mehndi Package 👰', 'Full hands (front & back) Full legs design Custom bridal theme Groom name inclusion', 5000.00, 4.0, 1, 0, '2026-03-22 21:17:41'),
	(58, 44, 'Engagement / Party Package 💍', 'Half hands design Simple leg design (optional) Elegant & quick patterns', 3000.00, 2.0, 1, 1, '2026-03-22 21:17:41'),
	(59, 44, 'Simple Festive Design 🌸', 'One hand (front) · Arabic / minimal pattern · Ideal for Eid, Karwa Chauth, Teej · Quick 45 min session', 500.00, 1.0, 1, 2, '2026-03-22 21:17:41'),
	(60, 44, 'Party & Event Package 💃', 'Both hands front · Elegant medium-detail design · Suitable for parties, birthdays, sangeet functions', 1000.00, 2.0, 1, 3, '2026-03-22 21:17:41');

-- Dumping structure for table creator_connect.service_time_slots
CREATE TABLE IF NOT EXISTS `service_time_slots` (
  `slot_id` int NOT NULL AUTO_INCREMENT,
  `post_id` int NOT NULL COMMENT 'References posts.post_id',
  `slot_label` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'HH:MM 24-hr, e.g. "09:00"',
  `slot_display` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'e.g. "9:00 AM"',
  `duration_mins` int NOT NULL DEFAULT '60' COMMENT 'Slot duration in minutes',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`slot_id`),
  KEY `idx_sts_post` (`post_id`),
  KEY `idx_sts_active` (`post_id`,`is_active`),
  CONSTRAINT `fk_sts_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Time slots defined by service provider at upload time';

-- Dumping data for table creator_connect.service_time_slots: ~28 rows (approximately)
INSERT INTO `service_time_slots` (`slot_id`, `post_id`, `slot_label`, `slot_display`, `duration_mins`, `is_active`, `sort_order`, `created_at`) VALUES
	(18, 1, '09:00', '9:00 AM', 120, 1, 0, '2026-03-22 19:03:31'),
	(19, 1, '11:00', '11:00 AM', 120, 1, 1, '2026-03-22 19:03:31'),
	(20, 1, '14:00', '2:00 PM', 180, 1, 2, '2026-03-22 19:03:31'),
	(21, 1, '17:00', '5:00 PM', 120, 1, 3, '2026-03-22 19:03:31'),
	(22, 5, '10:00', '10:00 AM (Morning Event)', 300, 1, 0, '2026-03-22 19:03:31'),
	(23, 5, '13:00', '1:00 PM (Lunch Event)', 300, 1, 1, '2026-03-22 19:03:31'),
	(24, 5, '18:00', '6:00 PM (Evening Event)', 300, 1, 2, '2026-03-22 19:03:31'),
	(25, 5, '20:00', '8:00 PM (Dinner Event)', 300, 1, 3, '2026-03-22 19:03:31'),
	(26, 10, '10:00', '10:00 AM', 240, 1, 0, '2026-03-22 19:03:31'),
	(27, 10, '14:00', '2:00 PM', 240, 1, 1, '2026-03-22 19:03:31'),
	(28, 20, '06:00', '6:00 AM (Morning Session)', 60, 1, 0, '2026-03-22 19:03:31'),
	(29, 20, '08:00', '8:00 AM (Morning Session)', 60, 1, 1, '2026-03-22 19:03:31'),
	(30, 20, '17:00', '5:00 PM (Evening Session)', 60, 1, 2, '2026-03-22 19:03:31'),
	(31, 20, '19:00', '7:00 PM (Evening Session)', 60, 1, 3, '2026-03-22 19:03:31'),
	(32, 21, '09:00', '9:00 AM', 180, 1, 0, '2026-03-22 19:03:31'),
	(33, 21, '11:00', '11:00 AM', 180, 1, 1, '2026-03-22 19:03:31'),
	(34, 21, '14:00', '2:00 PM', 180, 1, 2, '2026-03-22 19:03:31'),
	(35, 21, '16:00', '4:00 PM', 150, 1, 3, '2026-03-22 19:03:31'),
	(36, 23, '08:00', '8:00 AM Pickup', 30, 1, 0, '2026-03-22 19:03:31'),
	(37, 23, '10:00', '10:00 AM Pickup', 30, 1, 1, '2026-03-22 19:03:31'),
	(38, 23, '14:00', '2:00 PM Pickup', 30, 1, 2, '2026-03-22 19:03:31'),
	(39, 23, '17:00', '5:00 PM Pickup', 30, 1, 3, '2026-03-22 19:03:31'),
	(48, 44, '10:00', '10:00 AM', 60, 1, 0, '2026-03-22 21:17:41'),
	(49, 44, '11:00', '11:00 AM', 60, 1, 1, '2026-03-22 21:17:41'),
	(50, 44, '12:00', '12:00 PM', 60, 1, 2, '2026-03-22 21:17:41'),
	(51, 44, '14:00', '2:00 PM', 90, 1, 3, '2026-03-22 21:17:41'),
	(52, 44, '16:00', '4:00 PM', 90, 1, 4, '2026-03-22 21:17:41'),
	(53, 44, '18:00', '6:00 PM', 60, 1, 5, '2026-03-22 21:17:41');

-- Dumping structure for table creator_connect.subcategories
CREATE TABLE IF NOT EXISTS `subcategories` (
  `subcategory_id` int NOT NULL AUTO_INCREMENT,
  `category_id` int NOT NULL,
  `subcategory_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `subcategory_slug` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `display_order` int DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`subcategory_id`),
  KEY `idx_category` (`category_id`),
  CONSTRAINT `subcategories_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=301 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.subcategories: ~300 rows (approximately)
INSERT INTO `subcategories` (`subcategory_id`, `category_id`, `subcategory_name`, `subcategory_slug`, `description`, `is_active`, `display_order`, `created_at`) VALUES
	(1, 1, 'Bharatanatyam', 'bharatanatyam', 'Classical Tamil Nadu dance form', 1, 1, '2026-02-25 03:22:31'),
	(2, 1, 'Kathak', 'kathak', 'North Indian classical dance', 1, 2, '2026-02-25 03:22:31'),
	(3, 1, 'Garba & Dandiya', 'garba-dandiya', 'Gujarati folk dance performances', 1, 3, '2026-02-25 03:22:31'),
	(4, 1, 'Bollywood Dance', 'bollywood-dance', 'Bollywood style choreography', 1, 4, '2026-02-25 03:22:31'),
	(5, 1, 'Lavani', 'lavani', 'Traditional Maharashtrian dance', 1, 5, '2026-02-25 03:22:31'),
	(6, 1, 'Western Dance', 'western-dance', 'Hip hop, contemporary and freestyle', 1, 6, '2026-02-25 03:22:31'),
	(7, 1, 'Kuchipudi', 'kuchipudi', 'Classical Telugu dance form', 1, 7, '2026-02-25 03:22:31'),
	(8, 1, 'Folk Dance', 'folk-dance', 'Regional Indian folk dances', 1, 8, '2026-02-25 03:22:31'),
	(9, 1, 'Zumba & Aerobics', 'zumba-aerobics', 'Fitness dance performances', 1, 9, '2026-02-25 03:22:31'),
	(10, 1, 'Fusion Dance', 'fusion-dance', 'Blend of classical and western styles', 1, 10, '2026-02-25 03:22:31'),
	(11, 2, 'Classical Vocals', 'classical-vocals', 'Hindustani and Carnatic singing', 1, 1, '2026-02-25 03:22:31'),
	(12, 2, 'Bollywood Songs', 'bollywood-songs', 'Bollywood covers and originals', 1, 2, '2026-02-25 03:22:31'),
	(13, 2, 'Bhajan & Devotional', 'bhajan-devotional', 'Bhajans, kirtans and devotional music', 1, 3, '2026-02-25 03:22:31'),
	(14, 2, 'Guitar & Strings', 'guitar-strings', 'Guitar, sitar, sarod performances', 1, 4, '2026-02-25 03:22:31'),
	(15, 2, 'Tabla & Percussion', 'tabla-percussion', 'Tabla, dholak and percussion', 1, 5, '2026-02-25 03:22:31'),
	(16, 2, 'Flute & Wind', 'flute-wind', 'Bansuri, harmonium and wind instruments', 1, 6, '2026-02-25 03:22:31'),
	(17, 2, 'Ghazal & Sufi', 'ghazal-sufi', 'Ghazals, qawwali and sufi music', 1, 7, '2026-02-25 03:22:31'),
	(18, 2, 'Rap & Hip Hop', 'rap-hip-hop', 'Hindi and regional rap and hip hop', 1, 8, '2026-02-25 03:22:31'),
	(19, 2, 'Lofi & Covers', 'lofi-covers', 'Lofi beats and song covers', 1, 9, '2026-02-25 03:22:31'),
	(20, 2, 'Indie & Original', 'indie-original', 'Original compositions and indie music', 1, 10, '2026-02-25 03:22:31'),
	(21, 3, 'Rangoli', 'rangoli', 'Traditional and contemporary rangoli art', 1, 1, '2026-02-25 03:22:31'),
	(22, 3, 'Madhubani Painting', 'madhubani-painting', 'Traditional Bihar folk painting', 1, 2, '2026-02-25 03:22:31'),
	(23, 3, 'Warli Art', 'warli-art', 'Tribal art from Maharashtra', 1, 3, '2026-02-25 03:22:31'),
	(24, 3, 'Portrait & Sketch', 'portrait-sketch', 'Pencil, charcoal and digital portraits', 1, 4, '2026-02-25 03:22:31'),
	(25, 3, 'Watercolour', 'watercolour', 'Watercolour landscapes and illustrations', 1, 5, '2026-02-25 03:22:31'),
	(26, 3, 'Digital Illustration', 'digital-illustration', 'Digital art and illustration', 1, 6, '2026-02-25 03:22:31'),
	(27, 3, 'Calligraphy', 'calligraphy', 'Hindi, Urdu and English calligraphy', 1, 7, '2026-02-25 03:22:31'),
	(28, 3, 'Mandala Art', 'mandala-art', 'Mandala drawing and colouring', 1, 8, '2026-02-25 03:22:31'),
	(29, 3, 'Acrylic & Oil Painting', 'acrylic-oil-painting', 'Canvas acrylic and oil paintings', 1, 9, '2026-02-25 03:22:31'),
	(30, 3, 'Craft Paper Art', 'craft-paper-art', 'Origami, quilling and paper art', 1, 10, '2026-02-25 03:22:31'),
	(31, 4, 'Wedding Photography', 'wedding-photography', 'Bridal and wedding ceremony shots', 1, 1, '2026-02-25 03:22:31'),
	(32, 4, 'Portrait Photography', 'portrait-photography', 'Individual and family portraits', 1, 2, '2026-02-25 03:22:31'),
	(33, 4, 'Food Photography', 'food-photography', 'Restaurant and homemade food shots', 1, 3, '2026-02-25 03:22:31'),
	(34, 4, 'Street Photography', 'street-photography', 'Indian street life and culture', 1, 4, '2026-02-25 03:22:31'),
	(35, 4, 'Nature & Wildlife', 'nature-wildlife', 'Nature, birds and landscape shots', 1, 5, '2026-02-25 03:22:31'),
	(36, 4, 'Festival Photography', 'festival-photography', 'Holi, Diwali, Navratri and more', 1, 6, '2026-02-25 03:22:31'),
	(37, 4, 'Fashion Photography', 'fashion-photography', 'Traditional and modern fashion shoots', 1, 7, '2026-02-25 03:22:31'),
	(38, 4, 'Product Photography', 'product-photography', 'E-commerce and product showcase shots', 1, 8, '2026-02-25 03:22:31'),
	(39, 4, 'Maternity & Baby', 'maternity-baby', 'Maternity and newborn photography', 1, 9, '2026-02-25 03:22:31'),
	(40, 4, 'Architecture & Interiors', 'architecture-interiors', 'Homes, temples and building photography', 1, 10, '2026-02-25 03:22:31'),
	(41, 5, 'Bridal Mehndi', 'bridal-mehndi', 'Full bridal hand and feet mehndi', 1, 1, '2026-02-25 03:22:31'),
	(42, 5, 'Arabic Mehndi', 'arabic-mehndi', 'Arabic style mehndi designs', 1, 2, '2026-02-25 03:22:31'),
	(43, 5, 'Rajasthani Mehndi', 'rajasthani-mehndi', 'Traditional Rajasthani patterns', 1, 3, '2026-02-25 03:22:31'),
	(44, 5, 'Indo-Western Mehndi', 'indo-western-mehndi', 'Fusion mehndi designs', 1, 4, '2026-02-25 03:22:31'),
	(45, 5, 'Glitter & Colour Mehndi', 'glitter-mehndi', 'Glitter, white and coloured mehndi', 1, 5, '2026-02-25 03:22:31'),
	(46, 5, 'Feet Mehndi', 'feet-mehndi', 'Feet and ankle mehndi designs', 1, 6, '2026-02-25 03:22:31'),
	(47, 5, 'Finger Mehndi', 'finger-mehndi', 'Minimalist finger mehndi', 1, 7, '2026-02-25 03:22:31'),
	(48, 5, 'Face Painting', 'face-painting', 'Festival and kids face painting', 1, 8, '2026-02-25 03:22:31'),
	(49, 5, 'Tattoo Art', 'tattoo-art', 'Temporary and permanent tattoo designs', 1, 9, '2026-02-25 03:22:31'),
	(50, 5, 'Nail Art', 'nail-art', 'Traditional and modern nail designs', 1, 10, '2026-02-25 03:22:31'),
	(51, 6, 'Saree Draping', 'saree-draping', 'Different saree draping styles', 1, 1, '2026-02-25 03:22:31'),
	(52, 6, 'Bridal Look', 'bridal-look', 'Full bridal styling and makeup', 1, 2, '2026-02-25 03:22:31'),
	(53, 6, 'Ethnic Wear Styling', 'ethnic-wear-styling', 'Kurta, lehenga and salwar looks', 1, 3, '2026-02-25 03:22:31'),
	(54, 6, 'Western Outfits', 'western-outfits', 'Casual and western fashion looks', 1, 4, '2026-02-25 03:22:31'),
	(55, 6, 'Hair Styling', 'hair-styling', 'Braids, buns and hair tutorials', 1, 5, '2026-02-25 03:22:31'),
	(56, 6, 'Budget Fashion', 'budget-fashion', 'Affordable and thrifted fashion', 1, 6, '2026-02-25 03:22:31'),
	(57, 6, 'Plus Size Fashion', 'plus-size-fashion', 'Fashion for all body types', 1, 7, '2026-02-25 03:22:31'),
	(58, 6, 'Kids Fashion', 'kids-fashion', 'Trendy and traditional kids outfits', 1, 8, '2026-02-25 03:22:31'),
	(59, 6, 'Jewellery Styling', 'jewellery-styling', 'Traditional and statement jewellery looks', 1, 9, '2026-02-25 03:22:31'),
	(60, 6, 'Festival Fashion', 'festival-fashion', 'Navratri, Diwali, Eid festival looks', 1, 10, '2026-02-25 03:22:31'),
	(61, 7, 'Cake Decoration', 'cake-decoration', 'Fondant, buttercream and custom cakes', 1, 1, '2026-02-25 03:22:31'),
	(62, 7, 'Indian Sweets', 'indian-sweets', 'Ladoo, barfi, halwa and mithai making', 1, 2, '2026-02-25 03:22:31'),
	(63, 7, 'Street Food Recipes', 'street-food-recipes', 'Pani puri, chaat, vada pav and more', 1, 3, '2026-02-25 03:22:31'),
	(64, 7, 'Thali Presentation', 'thali-presentation', 'Traditional Indian meal plating', 1, 4, '2026-02-25 03:22:31'),
	(65, 7, 'Baking', 'baking', 'Bread, cookies, muffins and pastries', 1, 5, '2026-02-25 03:22:31'),
	(66, 7, 'Tiffin Meal Prep', 'tiffin-meal-prep', 'Daily tiffin and lunchbox ideas', 1, 6, '2026-02-25 03:22:31'),
	(67, 7, 'Regional Cuisine', 'regional-cuisine', 'Rajasthani, Bengali, South Indian recipes', 1, 7, '2026-02-25 03:22:31'),
	(68, 7, 'Chocolate Making', 'chocolate-making', 'Homemade chocolates and truffles', 1, 8, '2026-02-25 03:22:31'),
	(69, 7, 'Mocktails & Drinks', 'mocktails-drinks', 'Sherbets, lassi and cold drinks', 1, 9, '2026-02-25 03:22:31'),
	(70, 7, 'Pickle & Preserves', 'pickle-preserves', 'Homemade achaar, murabba and jam', 1, 10, '2026-02-25 03:22:31'),
	(71, 8, 'Embroidery & Stitching', 'embroidery-stitching', 'Thread work, kantha and cross stitch', 1, 1, '2026-02-25 03:22:31'),
	(72, 8, 'Macramé & Weaving', 'macrame-weaving', 'Macramé wall hangings and woven products', 1, 2, '2026-02-25 03:22:31'),
	(73, 8, 'Resin Art', 'resin-art', 'Resin jewellery, trays and art pieces', 1, 3, '2026-02-25 03:22:31'),
	(74, 8, 'Candle Making', 'candle-making', 'Scented, decorative and soy candles', 1, 4, '2026-02-25 03:22:31'),
	(75, 8, 'Crochet & Knitting', 'crochet-knitting', 'Crochet bags, scarves and woollen items', 1, 5, '2026-02-25 03:22:31'),
	(76, 8, 'Upcycle & Recycle', 'upcycle-recycle', 'Creative upcycling and waste to art', 1, 6, '2026-02-25 03:22:31'),
	(77, 8, 'Pottery & Clay', 'pottery-clay', 'Hand-thrown pots, diyas and clay art', 1, 7, '2026-02-25 03:22:31'),
	(78, 8, 'Fabric Painting', 'fabric-painting', 'Hand-painted dupattas, kurtas and tote bags', 1, 8, '2026-02-25 03:22:31'),
	(79, 8, 'Jewellery Making', 'jewellery-making', 'Terracotta, paper, beaded and wire jewellery', 1, 9, '2026-02-25 03:22:31'),
	(80, 8, 'Greeting & Gift Wrapping', 'greeting-gift', 'Handmade cards, gift wrapping and packaging', 1, 10, '2026-02-25 03:22:31'),
	(81, 9, 'Family Skits', 'family-skits', 'Relatable family situation comedy', 1, 1, '2026-02-25 03:22:31'),
	(82, 9, 'Office Comedy', 'office-comedy', 'Workplace humour and parodies', 1, 2, '2026-02-25 03:22:31'),
	(83, 9, 'Stand-Up Comedy', 'stand-up-comedy', 'Short stand-up routines', 1, 3, '2026-02-25 03:22:31'),
	(84, 9, 'Parody & Mimicry', 'parody-mimicry', 'Celebrity mimicry and parody videos', 1, 4, '2026-02-25 03:22:31'),
	(85, 9, 'Regional Comedy', 'regional-comedy', 'Gujarati, Marathi, Punjabi comedy', 1, 5, '2026-02-25 03:22:31'),
	(86, 9, 'Kids Comedy', 'kids-comedy', 'Clean fun comedy for children', 1, 6, '2026-02-25 03:22:31'),
	(87, 9, 'Saas-Bahu Skits', 'saas-bahu-skits', 'Indian family drama parodies', 1, 7, '2026-02-25 03:22:31'),
	(88, 9, 'Trending Reels', 'trending-reels', 'Trending audio and reel content', 1, 8, '2026-02-25 03:22:31'),
	(89, 9, 'Prank Videos', 'prank-videos', 'Safe and fun prank content', 1, 9, '2026-02-25 03:22:31'),
	(90, 9, 'Motivational Humour', 'motivational-humour', 'Funny yet inspiring content', 1, 10, '2026-02-25 03:22:31'),
	(91, 10, 'Hatha Yoga', 'hatha-yoga', 'Traditional hatha yoga sequences', 1, 1, '2026-02-25 03:22:31'),
	(92, 10, 'Surya Namaskar', 'surya-namaskar', 'Sun salutation routines', 1, 2, '2026-02-25 03:22:31'),
	(93, 10, 'Pranayama & Meditation', 'pranayama-meditation', 'Breathing exercises and meditation', 1, 3, '2026-02-25 03:22:31'),
	(94, 10, 'Power Yoga', 'power-yoga', 'Intensive yoga workout sessions', 1, 4, '2026-02-25 03:22:31'),
	(95, 10, 'Zumba & Dance Fitness', 'zumba-dance-fitness', 'Fun fitness dance routines', 1, 5, '2026-02-25 03:22:31'),
	(96, 10, 'Home Workout', 'home-workout', 'No equipment home workout routines', 1, 6, '2026-02-25 03:22:31'),
	(97, 10, 'Diet & Nutrition Tips', 'diet-nutrition', 'Healthy eating and Indian diet advice', 1, 7, '2026-02-25 03:22:31'),
	(98, 10, 'Pregnancy Yoga', 'pregnancy-yoga', 'Safe yoga for expecting mothers', 1, 8, '2026-02-25 03:22:31'),
	(99, 10, 'Kids Fitness', 'kids-fitness', 'Fun exercises for children', 1, 9, '2026-02-25 03:22:31'),
	(100, 10, 'Senior Fitness', 'senior-fitness', 'Gentle exercises for elderly', 1, 10, '2026-02-25 03:22:31'),
	(101, 11, 'Terracotta Jewellery', 'terracotta-jewellery', 'Handmade terracotta earrings and sets', 1, 1, '2026-02-25 03:22:31'),
	(102, 11, 'Resin Jewellery', 'resin-jewellery', 'Resin rings, pendants and earrings', 1, 2, '2026-02-25 03:22:31'),
	(103, 11, 'Fabric Bags & Pouches', 'fabric-bags-pouches', 'Cloth bags, jhola bags and pouches', 1, 3, '2026-02-25 03:22:31'),
	(104, 11, 'Diyas & Candles', 'diyas-candles', 'Decorated diyas and handmade candles', 1, 4, '2026-02-25 03:22:31'),
	(105, 11, 'Macramé Products', 'macrame-products', 'Wall hangings, plant hangers and more', 1, 5, '2026-02-25 03:22:31'),
	(106, 11, 'Embroidered Items', 'embroidered-items', 'Embroidered cushions, bags and home décor', 1, 6, '2026-02-25 03:22:31'),
	(107, 11, 'Handmade Toys', 'handmade-toys', 'Cloth dolls, wooden and educational toys', 1, 7, '2026-02-25 03:22:31'),
	(108, 11, 'Gift Hampers', 'gift-hampers', 'Customised and themed gift boxes', 1, 8, '2026-02-25 03:22:31'),
	(109, 11, 'Crochet Products', 'crochet-products', 'Crochet bags, caps and home items', 1, 9, '2026-02-25 03:22:31'),
	(110, 11, 'Patchwork & Quilts', 'patchwork-quilts', 'Handmade quilts, cushion covers and rugs', 1, 10, '2026-02-25 03:22:31'),
	(111, 12, 'Pickles & Achaar', 'pickles-achaar', 'Mango, lemon, mixed vegetable pickles', 1, 1, '2026-02-25 03:22:31'),
	(112, 12, 'Sweets & Mithai', 'sweets-mithai', 'Ladoo, barfi, halwa and Indian sweets', 1, 2, '2026-02-25 03:22:31'),
	(113, 12, 'Snacks & Namkeen', 'snacks-namkeen', 'Chivda, sev, chakli and dry snacks', 1, 3, '2026-02-25 03:22:31'),
	(114, 12, 'Masala & Spices', 'masala-spices', 'Homemade masala blends and spices', 1, 4, '2026-02-25 03:22:31'),
	(115, 12, 'Jams & Preserves', 'jams-preserves', 'Fruit jams, murabba and preserves', 1, 5, '2026-02-25 03:22:31'),
	(116, 12, 'Baked Goods', 'baked-goods', 'Cakes, cookies, brownies and bread', 1, 6, '2026-02-25 03:22:31'),
	(117, 12, 'Chocolates', 'chocolates', 'Handmade chocolates and truffles', 1, 7, '2026-02-25 03:22:31'),
	(118, 12, 'Papad & Fryums', 'papad-fryums', 'Handmade papad, fryums and khichiya', 1, 8, '2026-02-25 03:22:31'),
	(119, 12, 'Herbal & Health', 'herbal-health', 'Herbal powders, kadha and health mixes', 1, 9, '2026-02-25 03:22:31'),
	(120, 12, 'Ready to Cook', 'ready-to-cook', 'Idli batter, dhokla mix and ready mixes', 1, 10, '2026-02-25 03:22:31'),
	(121, 13, 'Sarees', 'sarees', 'Silk, cotton, georgette and printed sarees', 1, 1, '2026-02-25 03:22:31'),
	(122, 13, 'Salwar Suits', 'salwar-suits', 'Ready-made and unstitched salwar suits', 1, 2, '2026-02-25 03:22:31'),
	(123, 13, 'Kurtis & Tops', 'kurtis-tops', 'Daily wear and festive kurtis', 1, 3, '2026-02-25 03:22:31'),
	(124, 13, 'Lehenga & Chaniya', 'lehenga-chaniya', 'Bridal and festive lehengas', 1, 4, '2026-02-25 03:22:31'),
	(125, 13, 'Western Wear', 'western-wear', 'Jeans, tops, dresses and western outfits', 1, 5, '2026-02-25 03:22:31'),
	(126, 13, 'Kids Clothing', 'kids-clothing', 'Boys and girls ethnic and casual wear', 1, 6, '2026-02-25 03:22:31'),
	(127, 13, 'Men\'s Ethnic Wear', 'mens-ethnic-wear', 'Kurta, dhoti and sherwanis', 1, 7, '2026-02-25 03:22:31'),
	(128, 13, 'Dupattas & Stoles', 'dupattas-stoles', 'Printed, embroidered and plain dupattas', 1, 8, '2026-02-25 03:22:31'),
	(129, 13, 'Nightwear & Loungewear', 'nightwear', 'Comfortable daily wear and nightsuits', 1, 9, '2026-02-25 03:22:31'),
	(130, 13, 'Woollen & Winter', 'woollen-winter', 'Sweaters, shawls and winter clothing', 1, 10, '2026-02-25 03:22:31'),
	(131, 14, 'Wooden Furniture', 'wooden-furniture', 'Chairs, tables, shelves and storage', 1, 1, '2026-02-25 03:22:31'),
	(132, 14, 'Cushion & Pillow Covers', 'cushion-covers', 'Hand-printed and embroidered covers', 1, 2, '2026-02-25 03:22:31'),
	(133, 14, 'Wall Art & Frames', 'wall-art-frames', 'Paintings, prints and photo frames', 1, 3, '2026-02-25 03:22:31'),
	(134, 14, 'Table Runners & Mats', 'table-runners', 'Handmade table décor items', 1, 4, '2026-02-25 03:22:31'),
	(135, 14, 'Curtains & Drapes', 'curtains-drapes', 'Window curtains and door hangings', 1, 5, '2026-02-25 03:22:31'),
	(136, 14, 'Puja & Temple Décor', 'puja-decor', 'Puja thali, torans and temple décor', 1, 6, '2026-02-25 03:22:31'),
	(137, 14, 'Mirrors & Wall Décor', 'mirrors-wall', 'Decorative mirrors and wall hangings', 1, 7, '2026-02-25 03:22:31'),
	(138, 14, 'Storage Solutions', 'storage-solutions', 'Baskets, organisers and storage boxes', 1, 8, '2026-02-25 03:22:31'),
	(139, 14, 'Rugs & Carpets', 'rugs-carpets', 'Handmade and woven rugs and doormats', 1, 9, '2026-02-25 03:22:31'),
	(140, 14, 'Bamboo & Cane Items', 'bamboo-cane', 'Eco-friendly bamboo home products', 1, 10, '2026-02-25 03:22:31'),
	(141, 15, 'Mobile Accessories', 'mobile-accessories', 'Cases, chargers, earphones and stands', 1, 1, '2026-02-25 03:22:31'),
	(142, 15, 'Second-Hand Phones', 'second-hand-phones', 'Used smartphones in good condition', 1, 2, '2026-02-25 03:22:31'),
	(143, 15, 'Laptops & Computers', 'laptops-computers', 'Used and refurbished laptops', 1, 3, '2026-02-25 03:22:31'),
	(144, 15, 'Smart Home Devices', 'smart-home', 'Smart bulbs, plugs and home automation', 1, 4, '2026-02-25 03:22:31'),
	(145, 15, 'Earphones & Speakers', 'earphones-speakers', 'Wired, wireless and bluetooth audio', 1, 5, '2026-02-25 03:22:31'),
	(146, 15, 'Camera & Photography', 'camera-photo', 'Cameras, lenses and accessories', 1, 6, '2026-02-25 03:22:31'),
	(147, 15, 'Gaming Accessories', 'gaming-accessories', 'Controllers, headsets and gaming gear', 1, 7, '2026-02-25 03:22:31'),
	(148, 15, 'TV & Entertainment', 'tv-entertainment', 'TV accessories and streaming devices', 1, 8, '2026-02-25 03:22:31'),
	(149, 15, 'Power Banks', 'power-banks', 'Portable chargers and power banks', 1, 9, '2026-02-25 03:22:31'),
	(150, 15, 'Cables & Adapters', 'cables-adapters', 'USB, HDMI and charging cables', 1, 10, '2026-02-25 03:22:31'),
	(151, 16, 'Herbal Face Pack', 'herbal-face-pack', 'Multani mitti, besan and natural packs', 1, 1, '2026-02-25 03:22:31'),
	(152, 16, 'Ayurvedic Hair Oil', 'ayurvedic-hair-oil', 'Homemade bhringraj, amla and coconut oils', 1, 2, '2026-02-25 03:22:31'),
	(153, 16, 'Ubtan & Scrubs', 'ubtan-scrubs', 'Traditional ubtan and body scrubs', 1, 3, '2026-02-25 03:22:31'),
	(154, 16, 'Natural Lip Care', 'natural-lip-care', 'Beeswax, shea butter lip balms', 1, 4, '2026-02-25 03:22:31'),
	(155, 16, 'Handmade Soap', 'handmade-soap', 'Herbal, charcoal and goat milk soaps', 1, 5, '2026-02-25 03:22:31'),
	(156, 16, 'Kumkumadi & Serums', 'serums-oils', 'Face serums, rosehip and facial oils', 1, 6, '2026-02-25 03:22:31'),
	(157, 16, 'Kajal & Surma', 'kajal-surma', 'Traditional kajal and surma', 1, 7, '2026-02-25 03:22:31'),
	(158, 16, 'Hair Care', 'hair-care', 'Hair masks, shampoo bars and conditioners', 1, 8, '2026-02-25 03:22:31'),
	(159, 16, 'Organic Makeup', 'organic-makeup', 'Natural and chemical-free makeup', 1, 9, '2026-02-25 03:22:31'),
	(160, 16, 'Essential Oils', 'essential-oils', 'Pure essential and aromatherapy oils', 1, 10, '2026-02-25 03:22:31'),
	(161, 17, 'Madhubani Art', 'madhubani-art', 'Traditional Madhubani paintings on canvas', 1, 1, '2026-02-25 03:22:31'),
	(162, 17, 'Warli Paintings', 'warli-paintings', 'Tribal Warli style original art', 1, 2, '2026-02-25 03:22:31'),
	(163, 17, 'God & Devotional Art', 'devotional-art', 'Religious paintings and prints', 1, 3, '2026-02-25 03:22:31'),
	(164, 17, 'Abstract Art', 'abstract-art', 'Original abstract canvas paintings', 1, 4, '2026-02-25 03:22:31'),
	(165, 17, 'Portrait Commissions', 'portrait-commissions', 'Custom portrait paintings and sketches', 1, 5, '2026-02-25 03:22:31'),
	(166, 17, 'Miniature Painting', 'miniature-painting', 'Rajput and Mughal miniature art', 1, 6, '2026-02-25 03:22:31'),
	(167, 17, 'Watercolour Art', 'watercolour-art', 'Original watercolour artworks', 1, 7, '2026-02-25 03:22:31'),
	(168, 17, 'Digital Print Posters', 'digital-posters', 'Printable art and decorative posters', 1, 8, '2026-02-25 03:22:31'),
	(169, 17, 'Mandala Wall Art', 'mandala-wall-art', 'Mandala on canvas and wood', 1, 9, '2026-02-25 03:22:31'),
	(170, 17, 'Nature & Landscape', 'nature-landscape-art', 'Scenic nature and landscape paintings', 1, 10, '2026-02-25 03:22:31'),
	(171, 18, 'Hand-lettered Cards', 'handlettered-cards', 'Birthday, wedding and greeting cards', 1, 1, '2026-02-25 03:22:31'),
	(172, 18, 'Journals & Diaries', 'journals-diaries', 'Handmade and decorative notebooks', 1, 2, '2026-02-25 03:22:31'),
	(173, 18, 'Bookmarks', 'bookmarks', 'Painted and decorated bookmarks', 1, 3, '2026-02-25 03:22:31'),
	(174, 18, 'Stickers & Prints', 'stickers-prints', 'Custom stickers and decorative prints', 1, 4, '2026-02-25 03:22:31'),
	(175, 18, 'Planners', 'planners', 'Daily, weekly and monthly planners', 1, 5, '2026-02-25 03:22:31'),
	(176, 18, 'Gift Tags & Labels', 'gift-tags-labels', 'Decorative tags and personalised labels', 1, 6, '2026-02-25 03:22:31'),
	(177, 18, 'Kids Activity Books', 'kids-activity-books', 'Colouring and activity books for children', 1, 7, '2026-02-25 03:22:31'),
	(178, 18, 'Recipe Books', 'recipe-books', 'Handwritten and printed recipe collections', 1, 8, '2026-02-25 03:22:31'),
	(179, 18, 'Art Prints', 'art-prints', 'Downloadable and physical art prints', 1, 9, '2026-02-25 03:22:31'),
	(180, 18, 'Second-Hand Books', 'second-hand-books', 'Used textbooks and novels', 1, 10, '2026-02-25 03:22:31'),
	(181, 19, 'Indoor Plants', 'indoor-plants', 'Low-maintenance indoor houseplants', 1, 1, '2026-02-25 03:22:31'),
	(182, 19, 'Succulents & Cactus', 'succulents-cactus', 'Small succulents and cactus varieties', 1, 2, '2026-02-25 03:22:31'),
	(183, 19, 'Vegetable Seedlings', 'vegetable-seedlings', 'Tomato, chilli, coriander and more', 1, 3, '2026-02-25 03:22:31'),
	(184, 19, 'Flower Seeds & Plants', 'flower-seeds-plants', 'Marigold, rose, jasmine seeds and plants', 1, 4, '2026-02-25 03:22:31'),
	(185, 19, 'Terracotta Pots', 'terracotta-pots', 'Handmade and painted clay pots', 1, 5, '2026-02-25 03:22:31'),
	(186, 19, 'Organic Fertilizers', 'organic-fertilizers', 'Compost, vermicompost and natural feeds', 1, 6, '2026-02-25 03:22:31'),
	(187, 19, 'Tulsi & Medicinal', 'tulsi-medicinal', 'Tulsi, neem and medicinal herb plants', 1, 7, '2026-02-25 03:22:31'),
	(188, 19, 'Hanging Planters', 'hanging-planters', 'Macramé and vertical hanging planters', 1, 8, '2026-02-25 03:22:31'),
	(189, 19, 'Gardening Tools', 'gardening-tools', 'Small tools and gardening accessories', 1, 9, '2026-02-25 03:22:31'),
	(190, 19, 'Aquatic & Terrariums', 'aquatic-terrariums', 'Aquatic plants, moss and terrarium kits', 1, 10, '2026-02-25 03:22:31'),
	(191, 20, 'Kitchen Storage', 'kitchen-storage', 'Containers, boxes and kitchen organizers', 1, 1, '2026-02-25 03:22:31'),
	(192, 20, 'Bathroom Organizers', 'bathroom-organizers', 'Soap dispensers, racks and holders', 1, 2, '2026-02-25 03:22:31'),
	(193, 20, 'Tiffin Boxes', 'tiffin-boxes', 'Lunch boxes, water bottles and flasks', 1, 3, '2026-02-25 03:22:31'),
	(194, 20, 'Baskets & Bins', 'baskets-bins', 'Laundry baskets, bins and crates', 1, 4, '2026-02-25 03:22:31'),
	(195, 20, 'Stationery Organizers', 'stationery-organizers', 'Pen stands, file holders and desk items', 1, 5, '2026-02-25 03:22:31'),
	(196, 20, 'Hangers & Hooks', 'hangers-hooks', 'Clothes hangers, wall hooks and clips', 1, 6, '2026-02-25 03:22:31'),
	(197, 20, 'Garden Items', 'garden-plastic', 'Planters, watering cans and garden gear', 1, 7, '2026-02-25 03:22:31'),
	(198, 20, 'Kids Items', 'kids-plastic', 'Kids cups, plates and feeding accessories', 1, 8, '2026-02-25 03:22:31'),
	(199, 20, 'Door Mats', 'door-mats', 'Rubber and plastic door mats and bath mats', 1, 9, '2026-02-25 03:22:31'),
	(200, 20, 'Food Wraps & Bags', 'food-wraps-bags', 'Zip lock, cling wrap and food storage bags', 1, 10, '2026-02-25 03:22:31'),
	(201, 21, 'Bridal Mehndi', 'svc-bridal-mehndi', 'Full bridal hands and feet mehndi at home', 1, 1, '2026-02-25 03:22:31'),
	(202, 21, 'Party Mehndi', 'svc-party-mehndi', 'Quick party mehndi for events', 1, 2, '2026-02-25 03:22:31'),
	(203, 21, 'Bridal Makeup', 'bridal-makeup', 'Complete bridal makeup at home', 1, 3, '2026-02-25 03:22:31'),
	(204, 21, 'Party Makeup', 'party-makeup', 'Event and function makeup service', 1, 4, '2026-02-25 03:22:31'),
	(205, 21, 'Hair Styling', 'svc-hair-styling', 'Bridal and party hair styling', 1, 5, '2026-02-25 03:22:31'),
	(206, 21, 'Saree Draping', 'svc-saree-draping', 'Professional saree draping service', 1, 6, '2026-02-25 03:22:31'),
	(207, 21, 'Eyebrow Threading', 'eyebrow-threading', 'Threading and facial services at home', 1, 7, '2026-02-25 03:22:31'),
	(208, 21, 'Nail Art Service', 'svc-nail-art', 'Nail art and extension service', 1, 8, '2026-02-25 03:22:31'),
	(209, 21, 'Pre-Bridal Package', 'pre-bridal', 'Skin and beauty prep before wedding', 1, 9, '2026-02-25 03:22:31'),
	(210, 21, 'Kids Makeup & Costume', 'kids-makeup', 'Kids fancy dress and makeup service', 1, 10, '2026-02-25 03:22:31'),
	(211, 22, 'Blouse Stitching', 'blouse-stitching', 'Custom blouse stitching and alteration', 1, 1, '2026-02-25 03:22:31'),
	(212, 22, 'Salwar Suit Stitching', 'salwar-stitching', 'Full suit stitching from fabric', 1, 2, '2026-02-25 03:22:31'),
	(213, 22, 'Lehenga Stitching', 'lehenga-stitching', 'Custom lehenga and bridal outfit stitching', 1, 3, '2026-02-25 03:22:31'),
	(214, 22, 'Alteration & Repair', 'alteration-repair', 'Cloth alteration, hemming and repairs', 1, 4, '2026-02-25 03:22:31'),
	(215, 22, 'Kurti Stitching', 'kurti-stitching', 'Daily and festive kurti stitching', 1, 5, '2026-02-25 03:22:31'),
	(216, 22, 'Kids Clothing Stitch', 'kids-cloth-stitch', 'Custom stitching for children\'s outfits', 1, 6, '2026-02-25 03:22:31'),
	(217, 22, 'Curtain & Home Linen', 'curtain-linen', 'Curtain stitching and home linen sewing', 1, 7, '2026-02-25 03:22:31'),
	(218, 22, 'Embroidery Work', 'svc-embroidery', 'Thread and zari embroidery on clothes', 1, 8, '2026-02-25 03:22:31'),
	(219, 22, 'Uniform Stitching', 'uniform-stitching', 'School and work uniform stitching', 1, 9, '2026-02-25 03:22:31'),
	(220, 22, 'Fall & Pico Work', 'fall-pico', 'Fall stitching, pico and finishing work', 1, 10, '2026-02-25 03:22:31'),
	(221, 23, 'Daily Tiffin Service', 'daily-tiffin', 'Regular home-cooked meal delivery', 1, 1, '2026-02-25 03:22:31'),
	(222, 23, 'Diet & Healthy Tiffin', 'diet-tiffin', 'Low calorie and diet meal service', 1, 2, '2026-02-25 03:22:31'),
	(223, 23, 'Wedding Catering', 'wedding-catering', 'Full wedding and reception catering', 1, 3, '2026-02-25 03:22:31'),
	(224, 23, 'Birthday Party Food', 'birthday-catering', 'Snacks and food for birthday parties', 1, 4, '2026-02-25 03:22:31'),
	(225, 23, 'Puja Prasad & Thali', 'puja-prasad', 'Puja prasad, thali and religious food', 1, 5, '2026-02-25 03:22:31'),
	(226, 23, 'Corporate Lunch', 'corporate-lunch', 'Office lunch and meal packages', 1, 6, '2026-02-25 03:22:31'),
	(227, 23, 'Vrat & Fasting Food', 'vrat-food', 'Navratri, Ekadashi and fasting meals', 1, 7, '2026-02-25 03:22:31'),
	(228, 23, 'Jain Food', 'jain-food', 'Jain-specific meal and tiffin service', 1, 8, '2026-02-25 03:22:31'),
	(229, 23, 'Snacks on Order', 'snacks-order', 'Samosas, kachori, dhokla on order', 1, 9, '2026-02-25 03:22:31'),
	(230, 23, 'Pickle & Homemade Food', 'pickle-homemade', 'Homemade achaar, papad and condiments', 1, 10, '2026-02-25 03:22:31'),
	(231, 24, 'Bridal Lehenga Rent', 'bridal-lehenga-rent', 'Premium bridal lehenga on rent', 1, 1, '2026-02-25 03:22:31'),
	(232, 24, 'Sherwani Rent', 'sherwani-rent', 'Groom sherwani and ethnic wear rental', 1, 2, '2026-02-25 03:22:31'),
	(233, 24, 'Party Wear Rent', 'party-wear-rent', 'Designer gowns and party outfits on rent', 1, 3, '2026-02-25 03:22:31'),
	(234, 24, 'Saree on Rent', 'saree-rent', 'Silk, banarasi and designer saree rental', 1, 4, '2026-02-25 03:22:31'),
	(235, 24, 'Kids Costume Rent', 'kids-costume-rent', 'Fancy dress and kids party costumes', 1, 5, '2026-02-25 03:22:31'),
	(236, 24, 'Navratri & Festival Wear', 'navratri-rent', 'Chaniya choli and festival outfit rental', 1, 6, '2026-02-25 03:22:31'),
	(237, 24, 'Indo-Western Rent', 'indo-western-rent', 'Fusion and indo-western outfit rental', 1, 7, '2026-02-25 03:22:31'),
	(238, 24, 'Jewellery on Rent', 'jewellery-rent', 'Bridal and party jewellery rental', 1, 8, '2026-02-25 03:22:31'),
	(239, 24, 'Suit & Kurta Rent', 'suit-kurta-rent', 'Men\'s traditional wear rental', 1, 9, '2026-02-25 03:22:31'),
	(240, 24, 'Accessories Rent', 'accessories-rent', 'Bags, dupattas and fashion accessories rental', 1, 10, '2026-02-25 03:22:31'),
	(241, 25, 'Daily Laundry', 'daily-laundry', 'Daily clothes wash and fold service', 1, 1, '2026-02-25 03:22:31'),
	(242, 25, 'Ironing Service', 'ironing-service', 'Clothes ironing and steam pressing', 1, 2, '2026-02-25 03:22:31'),
	(243, 25, 'Dry Cleaning', 'dry-cleaning', 'Saree, suit and delicate garment cleaning', 1, 3, '2026-02-25 03:22:31'),
	(244, 25, 'Bridal Outfit Cleaning', 'bridal-cleaning', 'Specialist lehenga and wedding wear care', 1, 4, '2026-02-25 03:22:31'),
	(245, 25, 'Blanket & Quilt Wash', 'blanket-wash', 'Heavy linen, blanket and quilt washing', 1, 5, '2026-02-25 03:22:31'),
	(246, 25, 'Pickup & Delivery', 'pickup-delivery', 'Doorstep pickup and delivery laundry', 1, 6, '2026-02-25 03:22:31'),
	(247, 25, 'Shoe Cleaning', 'shoe-cleaning', 'Sneaker and footwear cleaning service', 1, 7, '2026-02-25 03:22:31'),
	(248, 25, 'Stain Removal', 'stain-removal', 'Specialist stain treatment', 1, 8, '2026-02-25 03:22:31'),
	(249, 25, 'Curtain Cleaning', 'curtain-cleaning', 'Curtain, sofa cover and linen washing', 1, 9, '2026-02-25 03:22:31'),
	(250, 25, 'Bag & Purse Clean', 'bag-purse-clean', 'Handbag and purse cleaning and care', 1, 10, '2026-02-25 03:22:31'),
	(251, 26, 'School Tuition', 'school-tuition', 'Home tuition for school subjects', 1, 1, '2026-02-25 03:22:31'),
	(252, 26, 'Spoken English', 'spoken-english', 'English speaking and communication classes', 1, 2, '2026-02-25 03:22:31'),
	(253, 26, 'Dance Classes', 'dance-classes', 'Classical, folk and western dance teaching', 1, 3, '2026-02-25 03:22:31'),
	(254, 26, 'Music & Singing Class', 'music-class', 'Vocal training and instrument classes', 1, 4, '2026-02-25 03:22:31'),
	(255, 26, 'Art & Craft Classes', 'art-craft-class', 'Drawing, painting and craft workshops', 1, 5, '2026-02-25 03:22:31'),
	(256, 26, 'Cooking Classes', 'cooking-classes', 'Indian and baking cooking workshops', 1, 6, '2026-02-25 03:22:31'),
	(257, 26, 'Computer & Digital', 'computer-digital', 'Basic computer, MS Office and digital classes', 1, 7, '2026-02-25 03:22:31'),
	(258, 26, 'Yoga & Fitness Classes', 'yoga-fitness-class', 'Group and personal yoga training', 1, 8, '2026-02-25 03:22:31'),
	(259, 26, 'Mehndi Classes', 'mehndi-class', 'Learn mehndi art from scratch', 1, 9, '2026-02-25 03:22:31'),
	(260, 26, 'Stitching Classes', 'stitching-class', 'Tailoring and embroidery learning', 1, 10, '2026-02-25 03:22:31'),
	(261, 27, 'Birthday Decoration', 'birthday-decor', 'Balloon, backdrop and party setup', 1, 1, '2026-02-25 03:22:31'),
	(262, 27, 'Wedding Decoration', 'wedding-decor', 'Mandap, stage and floral wedding décor', 1, 2, '2026-02-25 03:22:31'),
	(263, 27, 'Baby Shower Decor', 'baby-shower-decor', 'Themed baby shower setup and décor', 1, 3, '2026-02-25 03:22:31'),
	(264, 27, 'Balloon Art', 'balloon-art', 'Balloon bouquets, arches and sculptures', 1, 4, '2026-02-25 03:22:31'),
	(265, 27, 'Floral Decoration', 'floral-decor', 'Fresh and artificial flower arrangements', 1, 5, '2026-02-25 03:22:31'),
	(266, 27, 'Navratri & Garba', 'navratri-garba-decor', 'Navratri and festival event setup', 1, 6, '2026-02-25 03:22:31'),
	(267, 27, 'Puja Event Setup', 'puja-event', 'Griha pravesh, satyanarayan puja setup', 1, 7, '2026-02-25 03:22:31'),
	(268, 27, 'Photo Booth Setup', 'photo-booth', 'DIY and themed photo booth arrangements', 1, 8, '2026-02-25 03:22:31'),
	(269, 27, 'Rangoli Service', 'svc-rangoli', 'Rangoli design service for events', 1, 9, '2026-02-25 03:22:31'),
	(270, 27, 'Theme Party Planning', 'theme-party', 'Full theme-based party planning', 1, 10, '2026-02-25 03:22:31'),
	(271, 28, 'Wedding Photography', 'svc-wedding-photo', 'Full-day wedding coverage', 1, 1, '2026-02-25 03:22:31'),
	(272, 28, 'Pre-Wedding Shoot', 'pre-wedding-shoot', 'Couple and pre-wedding sessions', 1, 2, '2026-02-25 03:22:31'),
	(273, 28, 'Maternity Shoot', 'maternity-shoot', 'Maternity and bump photoshoot', 1, 3, '2026-02-25 03:22:31'),
	(274, 28, 'Birthday Photography', 'svc-birthday-photo', 'Kids and adult birthday photography', 1, 4, '2026-02-25 03:22:31'),
	(275, 28, 'Product Photography', 'svc-product-photo', 'E-commerce and catalogue photography', 1, 5, '2026-02-25 03:22:31'),
	(276, 28, 'Reels & Short Videos', 'reels-short-video', 'Instagram reels and short video editing', 1, 6, '2026-02-25 03:22:31'),
	(277, 28, 'Drone Photography', 'drone-photography', 'Aerial drone videography and photos', 1, 7, '2026-02-25 03:22:31'),
	(278, 28, 'Video Editing', 'video-editing', 'Wedding films, reels and vlogs editing', 1, 8, '2026-02-25 03:22:31'),
	(279, 28, 'School Annual Day', 'school-annual-day', 'School event and function coverage', 1, 9, '2026-02-25 03:22:31'),
	(280, 28, 'Corporate Photography', 'corporate-photo', 'Office events and corporate headshots', 1, 10, '2026-02-25 03:22:31'),
	(281, 29, 'House Cleaning', 'house-cleaning', 'Deep cleaning and regular home cleaning', 1, 1, '2026-02-25 03:22:31'),
	(282, 29, 'Cook at Home', 'cook-at-home', 'Part-time cook for daily meals', 1, 2, '2026-02-25 03:22:31'),
	(283, 29, 'Babysitting & Childcare', 'babysitting', 'Trusted babysitter and child minding', 1, 3, '2026-02-25 03:22:31'),
	(284, 29, 'Elderly Care', 'elderly-care', 'Companion and care for senior citizens', 1, 4, '2026-02-25 03:22:31'),
	(285, 29, 'Grocery & Errand Help', 'errand-help', 'Local grocery and errand assistance', 1, 5, '2026-02-25 03:22:31'),
	(286, 29, 'Pet Care & Grooming', 'pet-care', 'Dog walking, bathing and pet sitting', 1, 6, '2026-02-25 03:22:31'),
	(287, 29, 'Plant Care Service', 'plant-care', 'Watering and plant maintenance service', 1, 7, '2026-02-25 03:22:31'),
	(288, 29, 'Car Washing', 'car-washing', 'Home car wash and cleaning service', 1, 8, '2026-02-25 03:22:31'),
	(289, 29, 'Packing & Moving Help', 'packing-moving', 'Help with packing during relocation', 1, 9, '2026-02-25 03:22:31'),
	(290, 29, 'Dish Washing & Kitchen', 'dishwashing-kitchen', 'Kitchen cleaning and dishwashing help', 1, 10, '2026-02-25 03:22:31'),
	(291, 30, 'Logo Design', 'svc-logo-design', 'Business and brand logo creation', 1, 1, '2026-02-25 03:22:31'),
	(292, 30, 'Social Media Posts', 'social-media-posts', 'Instagram, Facebook post and story design', 1, 2, '2026-02-25 03:22:31'),
	(293, 30, 'Wedding Invitation', 'wedding-invitation', 'Digital and print wedding card design', 1, 3, '2026-02-25 03:22:31'),
	(294, 30, 'Video Editing', 'svc-video-editing', 'Reel, vlog and YouTube video editing', 1, 4, '2026-02-25 03:22:31'),
	(295, 30, 'Resume Design', 'resume-design', 'Professional resume and CV design', 1, 5, '2026-02-25 03:22:31'),
	(296, 30, 'Banner & Poster', 'banner-poster', 'Event banners and promotional posters', 1, 6, '2026-02-25 03:22:31'),
	(297, 30, 'Product Label Design', 'product-label', 'Label and packaging design for products', 1, 7, '2026-02-25 03:22:31'),
	(298, 30, 'Photo Editing', 'photo-editing', 'Photo retouching and background removal', 1, 8, '2026-02-25 03:22:31'),
	(299, 30, 'Thumbnail Design', 'thumbnail-design', 'YouTube and social media thumbnail design', 1, 9, '2026-02-25 03:22:31'),
	(300, 30, 'Website & App UI', 'website-app-ui', 'Basic website and app UI/UX design', 1, 10, '2026-02-25 03:22:31');

-- Dumping structure for table creator_connect.support_tickets
CREATE TABLE IF NOT EXISTS `support_tickets` (
  `ticket_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `subject` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('open','in_progress','resolved','closed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'open',
  `priority` enum('low','medium','high','urgent') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ticket_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `support_tickets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.support_tickets: ~0 rows (approximately)
INSERT INTO `support_tickets` (`ticket_id`, `user_id`, `subject`, `message`, `category`, `status`, `priority`, `created_at`, `updated_at`) VALUES
	(2, 8, 'Payment', 'I want know about my payment status', 'billing', 'open', 'high', '2026-03-10 09:26:11', '2026-03-10 09:26:11');

-- Dumping structure for table creator_connect.typing_indicators
CREATE TABLE IF NOT EXISTS `typing_indicators` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `conversation_with` int NOT NULL,
  `is_typing` tinyint(1) DEFAULT '0',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_typing` (`user_id`,`conversation_with`),
  KEY `idx_user_id` (`user_id`),
  KEY `typing_indicators_ibfk_2` (`conversation_with`),
  CONSTRAINT `typing_indicators_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `typing_indicators_ibfk_2` FOREIGN KEY (`conversation_with`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.typing_indicators: ~0 rows (approximately)

-- Dumping structure for table creator_connect.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `profile_pic` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gender` enum('male','female','other','prefer_not_to_say') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `about_me` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `role` int NOT NULL DEFAULT '0',
  `is_private` tinyint(1) NOT NULL DEFAULT '0',
  `otp_verified` tinyint(1) DEFAULT '0',
  `login_attempts` int DEFAULT '0',
  `account_locked_until` timestamp NULL DEFAULT NULL,
  `last_login` timestamp NULL DEFAULT NULL,
  `verification_method` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `website_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_role` (`role`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role`) REFERENCES `roles` (`role_id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.users: ~30 rows (approximately)
INSERT INTO `users` (`id`, `email`, `username`, `password`, `full_name`, `phone`, `profile_pic`, `country`, `state`, `city`, `gender`, `date_of_birth`, `about_me`, `role`, `is_private`, `otp_verified`, `login_attempts`, `account_locked_until`, `last_login`, `verification_method`, `created_at`, `updated_at`, `website_url`) VALUES
	(1, 'admin@gmail.com', 'Admin', '$2b$12$sMlm6SxxTEYROmr65.isZuprr8Zk.ucNb9Rcro60SuNBydedxLSc2', 'Admin', '9316574722', NULL, NULL, NULL, NULL, NULL, NULL, 'Manage Application', 1, 0, 1, 0, NULL, '2026-03-22 02:39:42', NULL, '2026-02-24 16:55:55', '2026-03-22 02:39:42', NULL),
	(3, 'binitagvasita@gmail.com', 'Binita', '$2b$12$778D4ulXmx/Rxczz1CBu0.eOWgJ.QnOrnXwDPgenfJeKeu6mHlPPW', 'Binita G Vasita', '+919173576732', 'uploads/profile/20260225_063349_profile.jpg', 'India', 'Gujarat', 'Ahmedabad', NULL, '2006-02-07', 'Mehndi is My Art....', 0, 0, 1, 0, NULL, '2026-03-23 03:15:44', 'email', '2026-02-24 17:58:57', '2026-03-23 03:15:44', NULL),
	(4, 'twishadchauhan@gmail.com', 'Twisha', '$2b$12$fvL2wVf90qppLA/yuuQKdeivHIkL/8AA6LYU8NWnvmzxH9iXXNWda', 'Twisha D Chauhan', '+919016509726', 'uploads/profile/20260225_064420_profile.jpg', 'India', 'Gujarat', 'Ahmedabad', 'female', '2005-09-08', 'Dance is the hidden language of the soul.', 0, 0, 1, 0, NULL, '2026-03-08 12:50:21', 'email', '2026-02-25 01:14:20', '2026-03-08 12:50:21', NULL),
	(5, 'dhruvikhandhar4@gmail.com', 'Dhruvi', '$2b$12$vqsZnbIbl9xVDRydohEcS.6yKoarEfYOlTtR3QFvnn0WMpjhxqF1K', 'Dhruvi Khandhar', '+919034590786', 'uploads/profile/20260225_075253_profile.jpg', 'India', 'Gujarat', 'Ahmedabad', 'female', '2006-04-19', 'Food cooked with passion is the most delicious of all.', 0, 0, 1, 0, NULL, '2026-03-08 11:29:57', 'email', '2026-02-25 01:16:40', '2026-03-08 11:29:57', NULL),
	(6, 'krishna887kalal@gmail.com', 'Krishna', '$2b$12$UIYQJ8K4.jo0xMqYENYkNe.kD4RPc5GRADfRUg67MgPl2q9daBph2', 'Krishna Kalal', '+918849238451', 'uploads/profile/20260225_064839_profile.jpg', 'India', 'Gujarat', 'Ahmedabad', 'female', '2006-04-04', 'Elegance is not just a style, it\'s a state of mind', 0, 0, 1, 0, NULL, '2026-03-21 11:00:19', 'email', '2026-02-25 01:18:40', '2026-03-21 11:00:19', NULL),
	(7, 'devabhair503@gmail.com', 'Mamta', '$2b$12$zeTKmAyKW74h0mzrvor9CO8RNQ.PbO6dGrqZs1qS0piN3Cfoff/TO', 'Mamta Desai', '+919313818839', 'uploads/profile/20260225_065148_profile.jpg', 'India', 'Gujarat', 'Ahmedabad', 'female', '2004-12-26', 'Whenever you see a successful business, someone once made a courageous decision.', 0, 0, 1, 0, NULL, '2026-03-22 18:18:30', 'email', '2026-02-25 01:21:48', '2026-03-22 18:18:30', NULL),
	(8, 'jiralbavishi@gmail.com', 'Jiral', '$2b$12$cgWfocWqcCH3LGDIvY6DF.fHifRRImoTQnkBmsLLoETflSYIu9OPC', 'Jiral Bavishi', '+919875275747', 'uploads/profile/20260225_074926_profile.jpg', 'India', 'Gujarat', 'Ahmedabad', 'female', '2005-10-13', 'Beauty is power; a smile is its sword.', 0, 0, 1, 0, NULL, '2026-03-22 17:31:57', 'email', '2026-02-25 02:19:27', '2026-03-22 17:31:57', NULL),
	(9, 'twinklenayi2006@gmail.com', 'Twinkal', '$2b$12$y1TCPDtdI/fM.6IuSkLLZ.UAgM9Naqy5O3z4e88TAG4oenCy2pp4i', 'Twinkle Nai', '+919664668674', NULL, 'India', 'Gujarat', 'Ahmedabad', 'female', '2006-01-16', 'Develop a passion for learning.', 0, 0, 1, 0, NULL, '2026-03-08 13:00:00', 'email', '2026-02-25 02:22:21', '2026-03-08 13:00:00', NULL),
	(10, 'saumyan26@gmail.com', 'saumyan26', '$2b$12$2EN/QAHp.XDRel4FjGUSce6BEfXy8Gapx83f76uz0i3jcOktUbX5i', 'Saumya Nayak', NULL, 'https://lh3.googleusercontent.com/a/ACg8ocIneB_d69YUYWUIHtXh3B_irLcNW-OXgy0-WyWeQKuu1p8uK0k=s96-c', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 1, 0, NULL, '2026-03-23 03:19:59', 'google', '2026-02-27 11:23:11', '2026-03-23 03:19:59', NULL),
	(11, 'cakeshop@gmail.com', 'Codeacake', '$2b$12$ljQHZ35nR3gueY6jNQutg.xajbNXUfZP3evKrwPbHWQE9l85BuEdO', 'Cake Shop', '+917202807998', 'uploads/profile/20260227_182848_profile.jpg', 'India', 'Gujarat', 'Surat', 'female', '2003-09-27', '❤️👩🏻‍🍳\r\n</Techie by day, Baker by night>\r\nHome Baker | 100% Eggless | Cakes |\r\nCupcakes | Chocolates', 0, 0, 1, 0, NULL, '2026-02-27 12:59:03', 'email', '2026-02-27 12:58:48', '2026-02-27 12:59:03', NULL),
	(12, 'resignkala@gmail.com', 'resinkalaa', '$2b$12$VdFn4V2WrdQVbOiHKZl5CO8i0v0Q3AP5G1Plwqe4Dm4I7gv5d3WWO', 'Resin By Shivangi', '+917202807998', 'uploads/profile/20260227_183810_profile.jpg', 'India', 'Gujarat', 'Jamnagar', 'female', '2005-04-15', 'Resin Artist | Shivangi & Shradhdha', 0, 0, 1, 0, NULL, '2026-02-27 13:08:29', 'email', '2026-02-27 13:08:11', '2026-02-27 13:08:29', NULL),
	(13, 'riya@gmail.com', 'Riya', '$2b$12$FKtApcCeZbuCotNMJqi/EOnKIstDBsE10TtMFNk4JS8bOJRSfRCYq', 'Riya Sengal', '+918799572287', 'uploads/profile/20260227_220455_profile.jpg', 'India', 'Gujarat', 'Vadodara', 'female', '2006-03-16', 'This page is not just about songs, it’s about feelings.\r\nEvery beat tells a story, every lyric touches the heart.🎧', 0, 0, 1, 0, NULL, '2026-02-28 11:21:03', 'email', '2026-02-27 16:34:55', '2026-02-28 11:21:03', NULL),
	(14, 'artworld@gmail.com', 'Art_World', '$2b$12$.AWfT.sc57KXootHbWjfzeC5Cm0Z9Dut68xAUcgjbYQNECIc18y0W', 'Art World', '+918967834562', 'uploads/profile/20260227_221127_profile.jpg', 'India', 'Gujarat', 'Ahmedabad', 'male', '2005-02-10', 'Art is not what you see,\r\nbut what you make others feel. 🖌️💖', 0, 0, 1, 0, NULL, '2026-03-22 16:37:47', 'email', '2026-02-27 16:41:27', '2026-03-22 16:37:47', NULL),
	(15, 'megha@gmail.com', 'meghna_photography', '$2b$12$LCfcE./Bc8ioIpOI9e6/Cerk0uJiquc2bh5vdbRmKLhZh9dEQxJay', 'Meghna Sejpal', '+917894562348', 'uploads/profile/20260227_221553_profile.jpg', 'India', 'Gujarat', 'Amreli', 'female', '1999-06-18', 'मन, वचन और कर्म से फोटोग्राफर। 📸\r\nWeddings I Fashion I Product\r\nNominated as Best POY by \'Better Photography\' 2010\r\nEx HRD Head,GJTCI', 0, 0, 1, 0, NULL, '2026-02-28 12:13:00', 'email', '2026-02-27 16:45:53', '2026-02-28 12:13:00', NULL),
	(16, 'fitandfine@gmail.com', 'fit_and_fine_fitness', '$2b$12$H1HWUyCp1Vr89/tRJdaQtOBT87vwL9a79VoOPzQz4i0LBTLzBDdae', 'Vishal Joshi', '+919967983198', 'uploads/profile/20260227_222612_profile.jpg', 'India', 'Maharashtra', 'Mumbai', 'male', '1995-08-17', 'Fit and fine fitness\r\nStrength. Focus. Transformation.\r\nFreelance Fitness Expert 🏋️‍♂️\r\nOnline & Personal Training | DM to begin\r\nMumbai 📍India 🇮🇳', 0, 0, 1, 0, NULL, '2026-03-09 02:59:52', 'email', '2026-02-27 16:56:13', '2026-03-09 02:59:52', NULL),
	(17, 'eventmanage@gmail.com', 'event_management_dcc', '$2b$12$Nc2aw00t96Jt.ZNlzrRla.UJzGUMxxdlEY2GwW86m7Kt9YdsPlBR6', 'Vipul Joshi', '+918905683472', 'uploads/profile/20260227_223452_profile.jpg', 'India', 'Delhi', 'Central Delhi', 'male', '1990-07-25', 'Managed by : @_.illusionnnnn._\r\nAll about event management in Dhaka City College📍\r\n📩 - eventmanagementdcc1@gmail.com', 0, 0, 1, 0, NULL, '2026-02-28 13:38:25', 'email', '2026-02-27 17:04:53', '2026-02-28 13:38:25', NULL),
	(18, 'graphicdesign@gmail.com', 'Graphic_Design', '$2b$12$1x2nv9FCAcHnDgtO4U4z4uMXTXf0UmaHW3977RXf/Cnn.rM1/xU/e', 'Muskan Mehta', '+917865732456', 'uploads/profile/20260227_224547_profile.jpg', 'India', 'Haryana', 'Bara Uchana', 'female', '2004-08-27', 'Heyyy !\r\nIT\'S ME MUSKAN MEMON\r\nGRAPHIC DESIGNER\r\nBORN TO CREATE\r\n#graphicdesign\r\n#designer', 0, 0, 1, 0, NULL, '2026-03-08 11:01:16', 'email', '2026-02-27 17:15:48', '2026-03-08 11:01:16', NULL),
	(19, 'homeservice@gmail.com', '24homeservice', '$2b$12$39T5w7T9kI.F2zqeVq/6leg/8V3mj4vlJgE159XukWuZH/FJXXLVO', 'Home Service Anytime', '+919875678456', 'uploads/profile/20260228_072703_profile.jpg', 'India', 'Maharashtra', 'Pune', 'male', '1987-11-28', '“Electrician, Plumber, Carpenter & Cleaner services at your doorstep 🛠️ Call/WhatsApp now!', 0, 0, 1, 0, NULL, '2026-03-09 03:03:30', 'email', '2026-02-28 01:57:04', '2026-03-09 03:03:30', NULL),
	(20, 'quicklaundry@gmail.com', 'Quick_Laundry', '$2b$12$6oxDp0ftCbOQsntlH.tGm.k2t.dPPs3mb.8OiKEO69Y/fNImhY.DC', 'Quick Laundry', '+919870675435', 'uploads/profile/20260228_073340_profile.jpg', 'India', 'Gujarat', 'Ahmedabad', 'male', '1990-04-17', 'Clean Clothes, Clean Life.\r\nSpin Cycle Success.\r\nFreshness Guaranteed, Every Load.', 0, 0, 1, 0, NULL, '2026-03-09 03:21:55', 'email', '2026-02-28 02:03:41', '2026-03-09 03:21:55', NULL),
	(21, 'klassiccostume@gmail.com', 'klassiccostumeahmedabad', '$2b$12$3FRgCBhfQslXqxVGNUAUn.gSSHU/MPbhB.NxyI028XPCdrLiHHKwW', 'Costume Gallery', '+918907632579', 'uploads/profile/20260228_074409_profile.jpg', 'India', 'Gujarat', 'Ahmedabad', 'female', '1990-03-16', 'Apparel & clothing\r\nEstablished in Mumbai in 2002 | 2019 Ahmedabad | Costumes on rent | Dance shows | Fancy Dress | Drama | Create ~ Rent ~ Sale', 0, 0, 1, 0, NULL, '2026-03-22 04:28:39', 'email', '2026-02-28 02:14:10', '2026-03-22 04:28:39', NULL),
	(22, 'srtution@gmail.com', 'sr_tution', '$2b$12$hSj8G29Yv0oPjunCpo8vgecSsM2kSf6i2kYTcHDxmERvWHFkPk.lq', 'SR Tution', '+917895643890', 'uploads/profile/20260228_075521_profile.jpg', 'India', 'Gujarat', 'Amreli', 'male', '2004-07-21', 'Admin @santhosh_kumar_2_9\r\nJOIN 🏃🏻 ENJOY ❤️ STUDY 📖', 0, 0, 1, 0, NULL, NULL, 'email', '2026-02-28 02:25:22', '2026-02-28 02:25:22', NULL),
	(23, 'bookshop99@gmail.com', 'book_shop_99', '$2b$12$AYqB5kr32IyWH1df9K7mLOOftgbvDnTaH8Yek11ktHMq.T6Z0oTfa', 'Book Shop INDIA', '+919785603241', 'uploads/profile/20260228_080701_profile.jpg', 'India', 'Delhi', 'Delhi', 'male', '2003-08-21', 'Bookstore\r\nGet premium quality books📚\r\nDM to order\r\nPAN India delivery 🇮🇳\r\nCOD available\r\n10k+ customers loved us! ❤️🧿\r\nManga/Fictional/self help books', 0, 0, 1, 0, NULL, NULL, 'email', '2026-02-28 02:37:02', '2026-02-28 02:37:02', NULL),
	(24, 'uselectronic@gmail.com', 'uselectronic2010_', '$2b$12$Vqk1DeoUR4yGFVC8sGijouLV5vC68mQK5MmEqF.umr///YfBifvF2', 'Soham Jain', '+918780227286', 'uploads/profile/20260228_081320_profile.jpg', 'India', 'Gujarat', 'Ahmedabad', 'male', '1987-10-21', 'Shopping & retail\r\nMain Account: @uselectronics2010\r\n𝗔𝗻𝘆 𝗘𝗻𝗾𝘂𝗶𝗿𝗶𝗲𝘀 𝗣𝗹𝗲𝗮𝘀𝗲 𝗖𝗮𝗹𝗹 𝗺𝗲: 𝟴𝟳𝟴𝟬𝟮 𝟮𝟳𝟮𝟴𝟲\r\nSINCE 2010\r\n𝗨 𝗦 𝗘𝗟𝗘𝗖𝗧𝗥𝗢𝗡𝗜𝗖 𝗦𝗧𝗢𝗥𝗘, 𝗟𝗔𝗟 𝗗𝗔𝗥𝗪𝗔𝗝𝗔 𝗔𝗛𝗠𝗘𝗗𝗔𝗕𝗔𝗗-𝟬𝟭📍', 0, 0, 1, 0, NULL, '2026-03-09 06:38:34', 'email', '2026-02-28 02:43:21', '2026-03-09 06:38:34', NULL),
	(25, 'furnitureshop@gmail.com', 'furniture_shop_w', '$2b$12$HsORbKlTo.5rnAGJp21aUejaJNEaF7EEKn/CBw0MED6WYzkkby8qS', 'Barnala Woods', '+918000067022', 'uploads/profile/20260228_081858_profile.jpg', 'India', 'Punjab', 'Barnala', 'male', '1990-12-21', 'Furniture store\r\nA Complete Furniture Shop\r\nfor order 📞 80000-67022\r\n#furniture #homefurniture\r\nNew bus stand road, Oppo. Prem Pardhan Market, Barnala 148101', 0, 0, 1, 0, NULL, NULL, 'email', '2026-02-28 02:49:01', '2026-02-28 02:49:01', NULL),
	(26, 'nyrah@gmail.com', 'nyrah_craftshop', '$2b$12$nlV7oZGmEc15vkTP4wI97OTg8/ECx4OdTwxbUcODs4N9mM5X3p2de', 'Nyrah Crafts', '+919633055308', 'uploads/profile/20260228_082506_profile.jpg', 'India', 'Gujarat', 'Ahmedabad', 'female', '2007-06-14', 'Arts & Crafts Store\r\nSreerangam Tower, advocate lane karunagapally) ph-8113913077( wholesale & retail) for customising gift and hampers contact(@nyrah_gifts_9633055308)', 0, 0, 1, 0, NULL, '2026-03-21 06:06:14', 'email', '2026-02-28 02:55:07', '2026-03-21 06:06:14', NULL),
	(27, 'plantshopee@gmail.com', 'plant_shoppe', '$2b$12$FP6xmmBwU9UnrPcEywNJJO2Q.EIBEYZlsBRDSMdLRzRhxSSq7AcNu', 'Plant Shoppe', '+19255377654', 'uploads/profile/20260228_083402_profile.jpg', 'United States', 'Texas', 'San Antonio', 'male', '1995-04-12', 'houseplants | wellness | curated goods🪴\r\nWednesday -Friday 11-6\r\nSaturday 10-6\r\nSunday 11-5\r\n3020 N St Marys St #103, San Antonio, Texas 78212', 0, 0, 1, 0, NULL, '2026-03-08 09:58:05', 'email', '2026-02-28 03:04:03', '2026-03-08 09:58:05', NULL),
	(28, 'kiran@gmail.com', 'plastic_shop15', '$2b$12$z.E4QFskOCd.EX7oL9KG1eG3VQuedXautfKJgR2QggL.utSb/gm0S', 'Lucky Kasturi', '+918830877751', 'uploads/profile/20260228_083732_profile.jpg', 'India', 'Gujarat', 'Ahmedabad', 'male', '1990-06-14', 'Home Goods Store\r\nAll Types Of Home Appliances\r\nGIFT ITEM all over India delivery available IMPORTANTED ITEMS. wholesale and retail\r\nContact number 8830877751', 0, 0, 1, 0, NULL, '2026-03-10 10:33:21', 'email', '2026-02-28 03:07:33', '2026-03-10 10:33:21', NULL),
	(30, 'vidhi@gmail.com', 'Vidhi', '$2b$12$rj8boLEASjZAWUKw0d.loO3BosVjdUw203qxaqphwkSu0IVm2oq/u', 'Vidhi Shah', '+916789345628', NULL, 'India', 'Gujarat', 'Ahmedabad', 'female', '2007-01-23', 'Built to vibe', 0, 0, 1, 0, NULL, '2026-03-08 11:20:46', 'email', '2026-02-28 03:14:03', '2026-03-08 11:20:46', NULL),
	(31, 'kalalkrishna50@gmail.com', 'Krishna_Kalal', '$2b$12$rJnqmBKaKvkeB4HeUnpmEeF9IsF5KUWPdgvsxfur6wbcnKI6axh5C', 'Krishna Kalal', '+919316574722', 'uploads/profile/20260310_140732_profile.jpg', 'India', 'Gujarat', 'Ahmedabad', 'female', '2006-04-04', 'I am artist', 0, 0, 1, 0, NULL, '2026-03-21 10:30:36', 'email', '2026-03-10 08:37:33', '2026-03-21 10:30:36', NULL),
	(33, 'saumyan24@gmail.com', 'Saumya', '$2b$12$PLiNPi98f/i.aAwg5BBCB.VvmNhBs508JXzdMf9RQCLtxQSjPokxW', 'Nayak Saumya Amitkumar', '+919316574722', 'uploads/profile/20260311_132330_profile.jpg', 'India', 'Gujarat', 'Ahmedabad', 'female', '2006-04-23', 'I am artist', 0, 0, 1, 0, NULL, '2026-03-23 03:15:36', 'email', '2026-03-11 07:53:30', '2026-03-23 03:15:36', NULL);

-- Dumping structure for table creator_connect.user_social_links
CREATE TABLE IF NOT EXISTS `user_social_links` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `platform` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_visible` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `user_social_links_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.user_social_links: ~0 rows (approximately)

-- Dumping structure for view creator_connect.v_active_product_orders
-- Creating temporary table to overcome VIEW dependency errors
CREATE TABLE `v_active_product_orders` (
	`order_id` INT NOT NULL,
	`post_id` INT NOT NULL,
	`seller_id` INT NOT NULL,
	`buyer_id` INT NOT NULL,
	`order_date` TIMESTAMP NOT NULL,
	`quantity` INT NOT NULL,
	`product_name` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`product_price` DECIMAL(10,2) NOT NULL,
	`currency` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`subtotal` DECIMAL(10,2) NOT NULL,
	`shipping_cost` DECIMAL(10,2) NULL,
	`tax_amount` DECIMAL(10,2) NULL,
	`discount_amount` DECIMAL(10,2) NULL,
	`total_amount` DECIMAL(10,2) NOT NULL,
	`shipping_full_name` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`shipping_phone` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`shipping_address_line1` TEXT NULL COLLATE 'utf8mb4_unicode_ci',
	`shipping_address_line2` TEXT NULL COLLATE 'utf8mb4_unicode_ci',
	`shipping_city` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`shipping_state` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`shipping_pincode` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`shipping_country` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`shipping_landmark` TEXT NULL COLLATE 'utf8mb4_unicode_ci',
	`buyer_notes` TEXT NULL COLLATE 'utf8mb4_unicode_ci',
	`status` ENUM('pending','confirmed','processing','shipped','delivered','cancelled','rejected','refunded') NULL COLLATE 'utf8mb4_unicode_ci',
	`seller_message` TEXT NULL COLLATE 'utf8mb4_unicode_ci',
	`confirmed_at` TIMESTAMP NULL,
	`processing_at` TIMESTAMP NULL,
	`shipped_at` TIMESTAMP NULL,
	`delivered_at` TIMESTAMP NULL,
	`cancelled_at` TIMESTAMP NULL,
	`cancellation_reason` TEXT NULL COLLATE 'utf8mb4_unicode_ci',
	`tracking_number` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`shipping_carrier` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`estimated_delivery_date` DATE NULL,
	`actual_delivery_date` DATE NULL,
	`payment_status` ENUM('pending','submitted','verified','failed','refunded','verification_pending','completed','cod_pending','rejected') NULL COLLATE 'utf8mb4_unicode_ci',
	`payment_method` ENUM('upi','bank_transfer','cod','online','card') NULL COLLATE 'utf8mb4_unicode_ci',
	`payment_reference` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`payment_date` TIMESTAMP NULL,
	`buyer_rating` TINYINT NULL,
	`buyer_review` TEXT NULL COLLATE 'utf8mb4_unicode_ci',
	`review_date` TIMESTAMP NULL,
	`created_at` TIMESTAMP NOT NULL,
	`updated_at` TIMESTAMP NOT NULL,
	`payment_reference_buyer` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`payment_submitted_at` TIMESTAMP NULL,
	`payment_verified_at` TIMESTAMP NULL,
	`payment_admin_note` TEXT NULL COLLATE 'utf8mb4_unicode_ci',
	`product_title` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`product_image` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`seller_username` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`seller_name` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`seller_avatar` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`seller_email` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`buyer_username` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`buyer_name` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`buyer_avatar` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`buyer_email` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci'
) ENGINE=MyISAM;

-- Dumping structure for view creator_connect.v_active_service_bookings
-- Creating temporary table to overcome VIEW dependency errors
CREATE TABLE `v_active_service_bookings` (
	`booking_id` INT NOT NULL,
	`post_id` INT NOT NULL,
	`service_provider_id` INT NOT NULL COMMENT 'User who offers the service',
	`customer_id` INT NOT NULL COMMENT 'User who books the service',
	`booking_date` TIMESTAMP NOT NULL,
	`preferred_start_date` DATE NULL COMMENT 'When customer wants service to start',
	`preferred_time` TIME NULL COMMENT 'Preferred time if applicable',
	`duration_days` INT NULL COMMENT 'How many days the service will take',
	`customer_requirements` TEXT NULL COMMENT 'Detailed requirements from customer' COLLATE 'utf8mb4_unicode_ci',
	`reference_files` TEXT NULL COMMENT 'JSON array of uploaded reference files' COLLATE 'utf8mb4_unicode_ci',
	`contact_method` ENUM('email','phone','whatsapp') NULL COLLATE 'utf8mb4_unicode_ci',
	`customer_contact` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`quoted_price` DECIMAL(10,2) NOT NULL COMMENT 'Service price at time of booking',
	`currency` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`additional_charges` DECIMAL(10,2) NULL COMMENT 'Any extra charges',
	`total_amount` DECIMAL(10,2) NOT NULL,
	`status` ENUM('pending','accepted','in_progress','revision_requested','completed','cancelled','rejected') NULL COLLATE 'utf8mb4_unicode_ci',
	`provider_message` TEXT NULL COMMENT 'Message from service provider' COLLATE 'utf8mb4_unicode_ci',
	`accepted_at` TIMESTAMP NULL,
	`rejected_at` TIMESTAMP NULL,
	`completed_at` TIMESTAMP NULL,
	`cancelled_at` TIMESTAMP NULL,
	`cancellation_reason` TEXT NULL COLLATE 'utf8mb4_unicode_ci',
	`payment_status` ENUM('pending','partial','completed','refunded','verification_pending','cod_pending','failed') NULL COLLATE 'utf8mb4_unicode_ci',
	`advance_paid` DECIMAL(10,2) NULL,
	`advance_payment_date` TIMESTAMP NULL,
	`final_payment_date` TIMESTAMP NULL,
	`payment_method` VARCHAR(1) NULL COMMENT 'upi, bank_transfer, razorpay' COLLATE 'utf8mb4_unicode_ci',
	`payment_reference` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`delivery_files` TEXT NULL COMMENT 'JSON array of delivered work files' COLLATE 'utf8mb4_unicode_ci',
	`delivery_message` TEXT NULL COLLATE 'utf8mb4_unicode_ci',
	`delivery_date` TIMESTAMP NULL,
	`customer_rating` TINYINT(1) NULL COMMENT '1-5 stars',
	`customer_review` TEXT NULL COLLATE 'utf8mb4_unicode_ci',
	`review_date` TIMESTAMP NULL,
	`created_at` TIMESTAMP NOT NULL,
	`updated_at` TIMESTAMP NOT NULL,
	`service_title` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`original_price` DECIMAL(10,2) NULL,
	`service_image` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`provider_username` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`provider_name` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`provider_avatar` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`provider_email` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`customer_username` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`customer_name` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`customer_avatar` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci',
	`customer_email` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci'
) ENGINE=MyISAM;

-- Dumping structure for table creator_connect.withdrawal_requests
CREATE TABLE IF NOT EXISTS `withdrawal_requests` (
  `request_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` enum('pending','approved','completed','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `request_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_date` timestamp NULL DEFAULT NULL,
  `admin_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `payment_method` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_reference` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`request_id`),
  KEY `user_id` (`user_id`),
  KEY `status` (`status`),
  CONSTRAINT `withdrawal_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table creator_connect.withdrawal_requests: ~9 rows (approximately)
INSERT INTO `withdrawal_requests` (`request_id`, `user_id`, `amount`, `status`, `request_date`, `processed_date`, `admin_notes`, `payment_method`, `payment_reference`) VALUES
	(1, 8, 100.00, 'approved', '2026-02-25 03:25:41', '2026-02-24 21:56:00', NULL, 'UPI', '22'),
	(2, 9, 200.00, 'rejected', '2026-02-25 03:42:15', '2026-02-28 13:35:56', 'Order issue arise', NULL, NULL),
	(3, 8, 100.00, 'approved', '2026-02-25 04:44:19', '2026-02-24 23:15:17', NULL, 'UPI', '2222222222222'),
	(4, 8, 200.00, 'approved', '2026-02-28 13:34:56', '2026-02-28 08:05:23', NULL, 'UPI', '2300002'),
	(5, 14, 600.00, 'approved', '2026-03-03 16:48:44', '2026-03-03 11:18:58', NULL, 'UPI', '2222222222222'),
	(6, 14, 234.00, 'approved', '2026-03-03 17:14:13', '2026-03-03 11:45:03', NULL, 'UPI', '2222222222222'),
	(7, 14, 5700.00, 'approved', '2026-03-03 17:14:20', '2026-03-03 11:45:31', NULL, 'UPI', '2222222222222'),
	(8, 8, 200.00, 'approved', '2026-03-03 17:16:01', '2026-03-03 11:46:14', NULL, 'UPI', '2222222222222'),
	(9, 8, 100.00, 'approved', '2026-03-03 17:20:19', '2026-03-03 11:50:51', NULL, 'UPI', '2222222222222'),
	(10, 27, 100.00, 'approved', '2026-03-08 11:25:30', '2026-03-08 05:55:52', NULL, 'UPI', '2222222222222'),
	(11, 24, 10000.00, 'approved', '2026-03-09 06:46:57', '2026-03-09 01:17:24', NULL, 'UPI', '2222222222222'),
	(12, 28, 100.00, 'approved', '2026-03-10 10:51:57', '2026-03-10 05:22:24', NULL, 'UPI', '2222222222222'),
	(13, 8, 200.00, 'approved', '2026-03-11 08:11:58', '2026-03-11 02:44:41', NULL, 'UPI', '2222222222222');

-- Dumping structure for trigger creator_connect.after_order_confirmed
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO';
DELIMITER //
CREATE TRIGGER `after_order_confirmed` AFTER UPDATE ON `product_orders` FOR EACH ROW BEGIN
  IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    UPDATE posts
    SET stock = GREATEST(COALESCE(stock, 0) - NEW.quantity, 0)
    WHERE post_id = NEW.post_id AND post_type = 'product';
  END IF;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Dumping structure for trigger creator_connect.after_order_delivered
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO';
DELIMITER //
CREATE TRIGGER `after_order_delivered` AFTER UPDATE ON `product_orders` FOR EACH ROW BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    UPDATE posts
    SET total_sales   = COALESCE(total_sales, 0)   + NEW.quantity,
        total_revenue = COALESCE(total_revenue, 0) + NEW.total_amount
    WHERE post_id = NEW.post_id;
  END IF;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Dumping structure for trigger creator_connect.after_post_comment_delete
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO';
DELIMITER //
CREATE TRIGGER `after_post_comment_delete` AFTER DELETE ON `post_comments` FOR EACH ROW BEGIN
  UPDATE posts
  SET comments_count = GREATEST(comments_count - 1, 0)
  WHERE post_id = OLD.post_id;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Dumping structure for trigger creator_connect.after_post_comment_insert
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO';
DELIMITER //
CREATE TRIGGER `after_post_comment_insert` AFTER INSERT ON `post_comments` FOR EACH ROW BEGIN
  UPDATE posts
  SET comments_count = comments_count + 1
  WHERE post_id = NEW.post_id;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Dumping structure for trigger creator_connect.after_post_like_delete
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO';
DELIMITER //
CREATE TRIGGER `after_post_like_delete` AFTER DELETE ON `post_likes` FOR EACH ROW BEGIN
  UPDATE posts
  SET likes_count = GREATEST(likes_count - 1, 0)
  WHERE post_id = OLD.post_id;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Dumping structure for trigger creator_connect.after_post_like_insert
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO';
DELIMITER //
CREATE TRIGGER `after_post_like_insert` AFTER INSERT ON `post_likes` FOR EACH ROW BEGIN
  UPDATE posts
  SET likes_count = likes_count + 1
  WHERE post_id = NEW.post_id;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Dumping structure for trigger creator_connect.after_post_share_insert
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO';
DELIMITER //
CREATE TRIGGER `after_post_share_insert` AFTER INSERT ON `post_shares` FOR EACH ROW BEGIN
  UPDATE posts
  SET shares_count = shares_count + 1
  WHERE post_id = NEW.post_id;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Dumping structure for trigger creator_connect.after_sales_cleared
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO';
DELIMITER //
CREATE TRIGGER `after_sales_cleared` AFTER UPDATE ON `sales_summary` FOR EACH ROW BEGIN
  IF NEW.clearance_status = 'cleared' AND OLD.clearance_status != 'cleared' THEN
    UPDATE seller_balance
    SET available_balance = available_balance + NEW.net_amount,
        pending_clearance = pending_clearance - NEW.net_amount
    WHERE user_id = NEW.seller_id;
  END IF;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Removing temporary table and create final VIEW structure
DROP TABLE IF EXISTS `v_active_product_orders`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_active_product_orders` AS select `po`.`order_id` AS `order_id`,`po`.`post_id` AS `post_id`,`po`.`seller_id` AS `seller_id`,`po`.`buyer_id` AS `buyer_id`,`po`.`order_date` AS `order_date`,`po`.`quantity` AS `quantity`,`po`.`product_name` AS `product_name`,`po`.`product_price` AS `product_price`,`po`.`currency` AS `currency`,`po`.`subtotal` AS `subtotal`,`po`.`shipping_cost` AS `shipping_cost`,`po`.`tax_amount` AS `tax_amount`,`po`.`discount_amount` AS `discount_amount`,`po`.`total_amount` AS `total_amount`,`po`.`shipping_full_name` AS `shipping_full_name`,`po`.`shipping_phone` AS `shipping_phone`,`po`.`shipping_address_line1` AS `shipping_address_line1`,`po`.`shipping_address_line2` AS `shipping_address_line2`,`po`.`shipping_city` AS `shipping_city`,`po`.`shipping_state` AS `shipping_state`,`po`.`shipping_pincode` AS `shipping_pincode`,`po`.`shipping_country` AS `shipping_country`,`po`.`shipping_landmark` AS `shipping_landmark`,`po`.`buyer_notes` AS `buyer_notes`,`po`.`status` AS `status`,`po`.`seller_message` AS `seller_message`,`po`.`confirmed_at` AS `confirmed_at`,`po`.`processing_at` AS `processing_at`,`po`.`shipped_at` AS `shipped_at`,`po`.`delivered_at` AS `delivered_at`,`po`.`cancelled_at` AS `cancelled_at`,`po`.`cancellation_reason` AS `cancellation_reason`,`po`.`tracking_number` AS `tracking_number`,`po`.`shipping_carrier` AS `shipping_carrier`,`po`.`estimated_delivery_date` AS `estimated_delivery_date`,`po`.`actual_delivery_date` AS `actual_delivery_date`,`po`.`payment_status` AS `payment_status`,`po`.`payment_method` AS `payment_method`,`po`.`payment_reference` AS `payment_reference`,`po`.`payment_date` AS `payment_date`,`po`.`buyer_rating` AS `buyer_rating`,`po`.`buyer_review` AS `buyer_review`,`po`.`review_date` AS `review_date`,`po`.`created_at` AS `created_at`,`po`.`updated_at` AS `updated_at`,`po`.`payment_reference_buyer` AS `payment_reference_buyer`,`po`.`payment_submitted_at` AS `payment_submitted_at`,`po`.`payment_verified_at` AS `payment_verified_at`,`po`.`payment_admin_note` AS `payment_admin_note`,`p`.`product_title` AS `product_title`,`p`.`media_url` AS `product_image`,`seller`.`username` AS `seller_username`,`seller`.`full_name` AS `seller_name`,`seller`.`profile_pic` AS `seller_avatar`,`seller`.`email` AS `seller_email`,`buyer`.`username` AS `buyer_username`,`buyer`.`full_name` AS `buyer_name`,`buyer`.`profile_pic` AS `buyer_avatar`,`buyer`.`email` AS `buyer_email` from (((`product_orders` `po` join `posts` `p` on((`po`.`post_id` = `p`.`post_id`))) join `users` `seller` on((`po`.`seller_id` = `seller`.`id`))) join `users` `buyer` on((`po`.`buyer_id` = `buyer`.`id`))) where (`po`.`status` not in ('cancelled','delivered','refunded'));

-- Removing temporary table and create final VIEW structure
DROP TABLE IF EXISTS `v_active_service_bookings`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_active_service_bookings` AS select `sb`.`booking_id` AS `booking_id`,`sb`.`post_id` AS `post_id`,`sb`.`service_provider_id` AS `service_provider_id`,`sb`.`customer_id` AS `customer_id`,`sb`.`booking_date` AS `booking_date`,`sb`.`preferred_start_date` AS `preferred_start_date`,`sb`.`preferred_time` AS `preferred_time`,`sb`.`duration_days` AS `duration_days`,`sb`.`customer_requirements` AS `customer_requirements`,`sb`.`reference_files` AS `reference_files`,`sb`.`contact_method` AS `contact_method`,`sb`.`customer_contact` AS `customer_contact`,`sb`.`quoted_price` AS `quoted_price`,`sb`.`currency` AS `currency`,`sb`.`additional_charges` AS `additional_charges`,`sb`.`total_amount` AS `total_amount`,`sb`.`status` AS `status`,`sb`.`provider_message` AS `provider_message`,`sb`.`accepted_at` AS `accepted_at`,`sb`.`rejected_at` AS `rejected_at`,`sb`.`completed_at` AS `completed_at`,`sb`.`cancelled_at` AS `cancelled_at`,`sb`.`cancellation_reason` AS `cancellation_reason`,`sb`.`payment_status` AS `payment_status`,`sb`.`advance_paid` AS `advance_paid`,`sb`.`advance_payment_date` AS `advance_payment_date`,`sb`.`final_payment_date` AS `final_payment_date`,`sb`.`payment_method` AS `payment_method`,`sb`.`payment_reference` AS `payment_reference`,`sb`.`delivery_files` AS `delivery_files`,`sb`.`delivery_message` AS `delivery_message`,`sb`.`delivery_date` AS `delivery_date`,`sb`.`customer_rating` AS `customer_rating`,`sb`.`customer_review` AS `customer_review`,`sb`.`review_date` AS `review_date`,`sb`.`created_at` AS `created_at`,`sb`.`updated_at` AS `updated_at`,`p`.`product_title` AS `service_title`,`p`.`price` AS `original_price`,`p`.`media_url` AS `service_image`,`provider`.`username` AS `provider_username`,`provider`.`full_name` AS `provider_name`,`provider`.`profile_pic` AS `provider_avatar`,`provider`.`email` AS `provider_email`,`customer`.`username` AS `customer_username`,`customer`.`full_name` AS `customer_name`,`customer`.`profile_pic` AS `customer_avatar`,`customer`.`email` AS `customer_email` from (((`service_bookings` `sb` join `posts` `p` on((`sb`.`post_id` = `p`.`post_id`))) join `users` `provider` on((`sb`.`service_provider_id` = `provider`.`id`))) join `users` `customer` on((`sb`.`customer_id` = `customer`.`id`))) where (`sb`.`status` not in ('cancelled','rejected','completed'));

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
