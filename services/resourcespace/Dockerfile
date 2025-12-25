# ResourceSpace Docker Image
# Based on official: https://github.com/resourcespace/docker
#
# Changes from official:
# - Custom config.php that reads DB settings from environment variables
# - Custom plugins folder

FROM ubuntu:24.04

LABEL org.opencontainers.image.authors="Montala Ltd"

ENV DEBIAN_FRONTEND="noninteractive"

# Install dependencies (matches official)
RUN apt-get update && apt-get install -y \
    nano \
    imagemagick \
    apache2 \
    subversion \
    ghostscript \
    antiword \
    poppler-utils \
    libimage-exiftool-perl \
    cron \
    postfix \
    wget \
    php \
    php-apcu \
    php-curl \
    php-dev \
    php-gd \
    php-intl \
    php-mysqlnd \
    php-mbstring \
    php-zip \
    libapache2-mod-php \
    ffmpeg \
    libopencv-dev \
    python3-opencv \
    python3 \
    python3-pip \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# Configure PHP (matches official)
RUN sed -i -e "s/upload_max_filesize\s*=\s*2M/upload_max_filesize = 100M/g" /etc/php/8.3/apache2/php.ini \
 && sed -i -e "s/post_max_size\s*=\s*8M/post_max_size = 100M/g" /etc/php/8.3/apache2/php.ini \
 && sed -i -e "s/max_execution_time\s*=\s*30/max_execution_time = 300/g" /etc/php/8.3/apache2/php.ini \
 && sed -i -e "s/memory_limit\s*=\s*128M/memory_limit = 1G/g" /etc/php/8.3/apache2/php.ini

# Configure Apache (matches official)
RUN printf '<Directory /var/www/>\n\
\tOptions FollowSymLinks\n\
</Directory>\n'\
>> /etc/apache2/sites-enabled/000-default.conf

# Add cron job (matches official)
ADD cronjob /etc/cron.daily/resourcespace

WORKDIR /var/www/html

# Checkout ResourceSpace from official SVN (matches official)
RUN rm -f index.html \
 && svn co -q https://svn.resourcespace.com/svn/rs/releases/10.7 . \
 && mkdir -p filestore \
 && chmod 777 filestore \
 && chmod -R 777 include/

# =============================================================================
# CUSTOM: Copy our config.php that reads from environment variables
# =============================================================================
COPY config/config.php /var/www/html/include/config.php

# CUSTOM: Copy custom plugins (if any)
COPY plugins/ /var/www/html/plugins/

# Copy entrypoint script (matches official)
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Start both cron and Apache (matches official)
CMD ["/entrypoint.sh"]
