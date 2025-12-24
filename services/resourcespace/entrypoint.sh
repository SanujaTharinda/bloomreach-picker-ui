#!/bin/bash
set -e

# Start cron service for scheduled tasks
service cron start

# Ensure filestore directory exists and has correct permissions
mkdir -p /var/www/html/filestore
chown -R www-data:www-data /var/www/html/filestore
chmod -R 755 /var/www/html/filestore

# Ensure include directory is writable for config
chown -R www-data:www-data /var/www/html/include
chmod -R 755 /var/www/html/include

# Execute the main command
exec "$@"
