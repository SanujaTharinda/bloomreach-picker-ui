# ResourceSpace Docker Image
# Built from official ResourceSpace Docker source
# https://github.com/resourcespace/docker
#
# This Dockerfile is based on the official RS Docker setup with custom configuration.

FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    apache2 \
    cron \
    ffmpeg \
    ghostscript \
    git \
    imagemagick \
    libapache2-mod-php \
    libreoffice \
    mariadb-client \
    php \
    php-curl \
    php-dev \
    php-gd \
    php-intl \
    php-ldap \
    php-mbstring \
    php-mysql \
    php-xml \
    php-zip \
    poppler-utils \
    wget \
    exiftool \
    antiword \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Clone ResourceSpace to Apache document root
RUN rm -rf /var/www/html/* \
    && git clone https://github.com/resourcespace/resourcespace.git /var/www/html

# Set permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

# Enable Apache rewrite module
RUN a2enmod rewrite

# Configure Apache to allow .htaccess overrides
RUN sed -i '/<Directory \/var\/www\/>/,/<\/Directory>/ s/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf

# Copy custom configuration
COPY config/config.php /var/www/html/include/config.php

# Copy custom plugins (if any)
COPY plugins/ /var/www/html/plugins/

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Setup cron for ResourceSpace scheduled tasks
COPY cronjob /etc/cron.d/resourcespace
RUN chmod 0644 /etc/cron.d/resourcespace \
    && crontab /etc/cron.d/resourcespace

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
CMD ["apache2ctl", "-D", "FOREGROUND"]
