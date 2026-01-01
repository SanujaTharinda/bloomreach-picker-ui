<?php
###############################
## ResourceSpace
## Local Configuration Script
###############################

# All custom settings should be entered in this file.
# Options may be copied from config.default.php and configured here.

# =============================================================================
# ENVIRONMENT VARIABLES (SECRETS - must be set via env vars)
# =============================================================================

# Database settings
$mysql_server = getenv('DB_HOST') ?: 'mariadb';
$mysql_username = getenv('DB_USER') ?: 'resourcespace_rw';
$mysql_password = getenv('DB_PASSWORD');  // REQUIRED - no default
$mysql_db = getenv('DB_NAME') ?: 'resourcespace';

# Secure keys (CRITICAL - generated during setup, must match for file access)
$scramble_key = getenv('RS_SCRAMBLE_KEY');      // REQUIRED - no default
$api_scramble_key = getenv('RS_API_SCRAMBLE_KEY');  // REQUIRED - no default

# Base URL
$baseurl = getenv('RS_BASE_URL') ?: 'http://localhost';

# Email settings
$email_from = getenv('RS_EMAIL_FROM') ?: 'noreply@localhost';
$email_notify = getenv('RS_EMAIL_NOTIFY') ?: 'admin@localhost';

# Application name
$applicationname = getenv('RS_APP_NAME') ?: 'ResourceSpace';

# =============================================================================
# SETUP-GENERATED VALUES (from initial ResourceSpace setup)
# These are non-sensitive and can be committed to git
# =============================================================================

# Paths
$imagemagick_path = '/usr/bin';
$ghostscript_path = '/usr/bin';
$ffmpeg_path = '/usr/bin';
$exiftool_path = '/usr/bin';
$pdftotext_path = '/usr/bin';

$homeanim_folder = 'filestore/system/slideshow_ebec04f2073df43';

/*

New Installation Defaults
-------------------------

The following configuration options are set for new installations only.
This provides a mechanism for enabling new features for new installations 
without affecting existing installations (as would occur with changes to config.default.php)

*/
                                
// Set imagemagick default for new installs to expect the newer version with the sRGB bug fixed.
$imagemagick_colorspace = "sRGB";

$contact_link = false;
$themes_simple_view = true;

$stemming = true;
$case_insensitive_username = true;
$user_pref_user_management_notifications = true;

$use_zip_extension = true;
$collection_download = true;

$ffmpeg_preview_force = true;
$ffmpeg_preview_extension = 'mp4';
$ffmpeg_preview_options = '-f mp4 -b:v 1200k -b:a 64k -ac 1 -c:v libx264 -pix_fmt yuv420p -profile:v baseline -level 3 -c:a aac -strict -2';

$daterange_search = true;
$upload_then_edit = true;

$purge_temp_folder_age = 90;
$filestore_evenspread = true;

$comments_resource_enable = true;

$api_upload_urls = array();

$use_native_input_for_date_field = true;
$resource_view_use_pre = true;

$sort_tabs = false;
$maxyear_extends_current = 5;
$thumbs_display_archive_state = true;
$file_checksums = true;
$hide_real_filepath = true;
$annotate_enabled = true;

# =============================================================================
# PLUGINS
# =============================================================================
$plugins[] = "featured_collection_download";

# =============================================================================
# DEBUG (optional - enable via env var)
# =============================================================================
if (getenv('RS_DEBUG') === 'true') {
    $debug_log = true;
    $debug_log_location = "/var/www/html/filestore/tmp/debug.txt";
}
