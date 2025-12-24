#!/bin/bash
# ResourceSpace entrypoint script
# Starts cron and Apache

# Start cron service
service cron start

# Start Apache in foreground
apache2ctl -D FOREGROUND
