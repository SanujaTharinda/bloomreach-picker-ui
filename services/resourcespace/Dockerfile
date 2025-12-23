# ResourceSpace Docker Image
# Based on official ResourceSpace Docker setup
# https://www.resourcespace.com/knowledge-base/systemadmin/install_docker

FROM resourcespace/resourcespace:latest

# Copy custom configuration overrides
COPY config/config.php /var/www/resourcespace/include/config.php

# Copy custom plugins (if any)
COPY plugins/ /var/www/resourcespace/plugins/

# Expose port 80
EXPOSE 80

