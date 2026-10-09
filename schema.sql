-- Construction Staff Attendance & Geofencing Database Schema
-- Database Name: construction_attendance_db

CREATE DATABASE IF NOT EXISTS `construction_attendance_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `construction_attendance_db`;

-- 1. Sites Table (Construction Job Sites & Geofences)
CREATE TABLE IF NOT EXISTS `sites` (
    `id` VARCHAR(32) PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `code` VARCHAR(50) NOT NULL UNIQUE,
    `address` VARCHAR(255) NULL,
    `latitude` DECIMAL(10, 6) NOT NULL,
    `longitude` DECIMAL(10, 6) NOT NULL,
    `radius` INT NOT NULL DEFAULT 150,
    `supervisor` VARCHAR(120) NULL,
    `supervisor_phone` VARCHAR(50) NULL,
    `active_workers` INT DEFAULT 0,
    `status` VARCHAR(20) DEFAULT 'Active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Staff Table (Field Personnel)
CREATE TABLE IF NOT EXISTS `staff` (
    `id` VARCHAR(32) PRIMARY KEY,
    `name` VARCHAR(120) NOT NULL,
    `role` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(50) NULL,
    `primary_site_id` VARCHAR(32) NULL,
    `avatar` VARCHAR(10) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_staff_site` (`primary_site_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Attendance Table (Field GPS Punches & Shift Records)
CREATE TABLE IF NOT EXISTS `attendance` (
    `id` VARCHAR(64) PRIMARY KEY,
    `staff_id` VARCHAR(32) NOT NULL,
    `staff_name` VARCHAR(120) NOT NULL,
    `role` VARCHAR(100) NULL,
    `site_id` VARCHAR(32) NOT NULL,
    `site_name` VARCHAR(150) NOT NULL,
    `site_code` VARCHAR(50) NULL,
    `date` DATE NOT NULL,
    `check_in_time` VARCHAR(20) NOT NULL,
    `check_in_timestamp` DATETIME NOT NULL,
    `check_in_lat` DECIMAL(10, 6) NOT NULL,
    `check_in_lng` DECIMAL(10, 6) NOT NULL,
    `check_in_accuracy` INT DEFAULT 5,
    `check_in_distance` INT DEFAULT 0,
    `check_in_geofence_verified` TINYINT(1) DEFAULT 1,
    `check_out_time` VARCHAR(20) NULL,
    `check_out_timestamp` DATETIME NULL,
    `check_out_lat` DECIMAL(10, 6) NULL,
    `check_out_lng` DECIMAL(10, 6) NULL,
    `check_out_accuracy` INT NULL,
    `check_out_distance` INT NULL,
    `check_out_geofence_verified` TINYINT(1) NULL,
    `total_duration_seconds` INT NULL,
    `total_duration_formatted` VARCHAR(40) DEFAULT 'In Progress',
    `total_hours_decimal` DECIMAL(5, 2) DEFAULT 0.00,
    `status` VARCHAR(50) NOT NULL DEFAULT 'Present',
    `geofence_flag` VARCHAR(80) NOT NULL DEFAULT 'Verified (On-Site)',
    `verified_photo` LONGTEXT NULL,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_att_date` (`date`),
    INDEX `idx_att_staff` (`staff_id`),
    INDEX `idx_att_site` (`site_id`),
    INDEX `idx_att_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Settings Table
CREATE TABLE IF NOT EXISTS `settings` (
    `setting_key` VARCHAR(50) PRIMARY KEY,
    `setting_value` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES 
('company_name', 'TITAN INFRASTRUCTURE & CONSTRUCTION CORP.'),
('work_hours_per_shift', '8'),
('grace_period_minutes', '15')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);
