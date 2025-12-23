<?php
/**
 * ResourceSpace Configuration Overrides
 * 
 * This file contains custom configuration for the ResourceSpace installation.
 * Values here override defaults from config.default.php
 * 
 * All settings are read from environment variables with sensible defaults.
 * 
 * For full configuration options, see:
 * https://www.resourcespace.com/knowledge-base/systemadmin/config_file
 */

// =============================================================================
// Database Configuration
// =============================================================================
$mysql_server = getenv('DB_HOST') ?: 'mariadb';
$mysql_username = getenv('DB_USER') ?: 'resourcespace_rw';
$mysql_password = getenv('DB_PASSWORD') ?: '';
$mysql_db = getenv('DB_NAME') ?: 'resourcespace';

// Azure MySQL SSL (uncomment for Azure MySQL)
// $mysql_ssl_ca_path = '/etc/ssl/certs/DigiCertGlobalRootCA.crt.pem';

// =============================================================================
// General Settings
// =============================================================================
$baseurl = getenv('RS_BASE_URL') ?: 'http://localhost';
$applicationname = getenv('RS_APP_NAME') ?: 'Brompton Digital Asset Management';

// =============================================================================
// Storage Settings
// =============================================================================
$storagedir = '/var/www/resourcespace/filestore';

// =============================================================================
// Security Settings
// =============================================================================
// Generate keys with: openssl rand -hex 32
$scramble_key = getenv('RS_SCRAMBLE_KEY') ?: '';
$api_scramble_key = getenv('RS_API_SCRAMBLE_KEY') ?: '';

// =============================================================================
// Email Settings
// =============================================================================
$email_from = getenv('RS_EMAIL_FROM') ?: 'noreply@yourdomain.com';
$email_notify = getenv('RS_EMAIL_NOTIFY') ?: 'admin@yourdomain.com';
