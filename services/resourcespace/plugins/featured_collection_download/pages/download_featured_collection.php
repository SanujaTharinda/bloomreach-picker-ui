<?php
/**
 * Featured Collection Download Plugin - Download Handler Page
 *
 * Handles the download request for featured collections, generating a hierarchical
 * ZIP archive containing all assets from the collection and its children.
 */

// Include ResourceSpace core
include dirname(__DIR__, 3) . '/include/boot.php';
include dirname(__DIR__, 3) . '/include/authenticate.php';
include_once dirname(__DIR__) . '/include/featured_collection_download_functions.php';

// Security: Check collection download is enabled
if (empty($collection_download)) {
    header('HTTP/1.1 403 Forbidden');
    exit($lang['error-permissiondenied'] ?? 'Collection download is not enabled');
}

// Validate collection reference
$collection_ref = getval('collection', '', true);
if (empty($collection_ref) || !is_numeric($collection_ref) || $collection_ref <= 0) {
    header('HTTP/1.1 400 Bad Request');
    exit($lang['error-collectionnotfound'] ?? 'Invalid collection reference');
}
$collection_ref = (int)$collection_ref;

// Get collection data
$collection_data = get_collection($collection_ref);
if (!$collection_data) {
    header('HTTP/1.1 404 Not Found');
    exit($lang['error-collectionnotfound'] ?? 'Collection not found');
}

$collection_name = $collection_data['name'] ?? 'collection_' . $collection_ref;
$zip_filename = fcd_sanitize_name($collection_name);

// Check request type
$start_download = getval('start', '') === 'true';

// Process the request
if ($start_download) {
    // Increase limits for large downloads
    @set_time_limit(0);
    @ini_set('memory_limit', '512M');

    // Build resource tree
    $tree_result = fcd_build_collection_tree($collection_ref);
    $resources = $tree_result['resources'];

    if (empty($resources)) {
        header('HTTP/1.1 404 Not Found');
        exit($lang['fcd_no_resources'] ?? 'No downloadable resources found');
    }

    // Create ZIP archive
    $zip_path = fcd_create_hierarchical_zip($resources, $zip_filename);

    if (!$zip_path) {
        header('HTTP/1.1 500 Internal Server Error');
        exit($lang['fcd_zip_error'] ?? 'Failed to create ZIP archive');
    }

    // Log the download
    $resource_count = count($resources);
    log_activity(
        sprintf('Featured collection download: %s (ID: %d) - %d resources', $collection_name, $collection_ref, $resource_count),
        LOG_CODE_DOWNLOADED,
        null,
        'featured_collection_download'
    );

    // Stream the download
    fcd_stream_zip_download($zip_path, $zip_filename . '.zip', true);
    exit();
}

// Show confirmation page
$tree_result = fcd_build_collection_tree($collection_ref);
$resources = $tree_result['resources'];
$resource_count = count($resources);

// Handle empty collection
if ($resource_count === 0) {
    include dirname(__DIR__, 3) . '/include/header.php';
    ?>
    <div class="BasicsBox">
        <h1><?php echo htmlspecialchars($lang['fcd_download_collection'] ?? 'Download Collection'); ?></h1>
        <p class="FormHelp">
            <?php echo htmlspecialchars($lang['fcd_no_resources'] ?? 'This collection has no downloadable resources.'); ?>
        </p>
        <p>
            <a href="<?php echo $baseurl; ?>/pages/collections_featured.php"
               onclick="return CentralSpaceLoad(this, true);"
               class="ButtonType1">
                <?php echo htmlspecialchars($lang['back'] ?? 'Back'); ?>
            </a>
        </p>
    </div>
    <?php
    include dirname(__DIR__, 3) . '/include/footer.php';
    exit();
}

$total_size = $tree_result['total_size'];
$size_formatted = formatfilesize($total_size);
$truncated = $tree_result['truncated'] ?? false;

include dirname(__DIR__, 3) . '/include/header.php';
?>
<div class="BasicsBox">
    <h1><?php echo htmlspecialchars($lang['fcd_download_collection'] ?? 'Download Collection'); ?>: <?php echo htmlspecialchars($collection_name); ?></h1>

    <div class="Question" style="text-align: left;">
        <p style="margin: 10px 0;">
            <?php
            echo sprintf(
                htmlspecialchars($lang['fcd_download_summary'] ?? 'This download will include %d resource(s) with a total size of approximately %s.'),
                $resource_count,
                $size_formatted
            );
            ?>
        </p>
        <?php if ($truncated): ?>
        <p style="margin: 10px 0; color: #c00;">
            <?php echo htmlspecialchars($lang['fcd_download_truncated'] ?? 'Note: Download was limited due to size or resource count restrictions.'); ?>
        </p>
        <?php endif; ?>
        <p style="margin: 10px 0; color: #666;">
            <?php echo htmlspecialchars($lang['fcd_folder_structure_note'] ?? 'The ZIP archive will preserve the collection folder structure.'); ?>
        </p>
    </div>

    <div id="fcd_progress" style="display: none; text-align: left; margin: 20px 0; padding: 0 10px;">
        <p id="fcd_progress_text" style="margin: 10px 0;"><?php echo htmlspecialchars($lang['fcd_preparing_download'] ?? 'Preparing download, please wait...'); ?></p>
        <div style="width: 100%; max-width: 400px; background-color: #e0e0e0; border-radius: 4px; overflow: hidden;">
            <div id="fcd_progress_bar" style="width: 0%; height: 24px; background-color: #4CAF50; transition: width 0.3s;"></div>
        </div>
    </div>

    <div id="fcd_complete" style="display: none; text-align: left; margin: 20px 0; padding: 0 10px;">
        <p style="margin: 10px 0; color: #2e7d32;">
            <i class="fa fa-check-circle"></i>&nbsp;
            <?php echo htmlspecialchars($lang['fcd_download_started'] ?? 'Download started! Your ZIP file should be downloading now.'); ?>
        </p>
        <p style="margin: 10px 0; color: #666;">
            <?php echo htmlspecialchars($lang['fcd_download_not_started'] ?? 'If the download did not start, '); ?>
            <a href="#" id="fcd_retry_link"><?php echo htmlspecialchars($lang['fcd_click_here'] ?? 'click here to try again'); ?></a>.
        </p>
    </div>

    <div class="QuestionSubmit" id="fcd_buttons" style="text-align: left; padding: 15px 10px;">
        <a href="<?php echo $baseurl; ?>/pages/collections_featured.php"
           onclick="return CentralSpaceLoad(this, true);"
           class="ButtonType2">
            <?php echo htmlspecialchars($lang['cancel'] ?? 'Cancel'); ?>
        </a>
        &nbsp;&nbsp;
        <a href="#" onclick="fcdStartDownload(); return false;" class="ButtonType1" id="fcd_download_btn">
            <i class="fa fa-download"></i>&nbsp;
            <?php echo htmlspecialchars($lang['fcd_start_download'] ?? 'Download'); ?>
        </a>
    </div>

    <div class="QuestionSubmit" id="fcd_back_button" style="display: none; text-align: left; padding: 15px 10px;">
        <a href="<?php echo $baseurl; ?>/pages/collections_featured.php"
           onclick="return CentralSpaceLoad(this, true);"
           class="ButtonType1">
            <i class="fa fa-arrow-left"></i>&nbsp;
            <?php echo htmlspecialchars($lang['fcd_back_to_collections'] ?? 'Back to Featured Collections'); ?>
        </a>
    </div>
</div>

<script>
function fcdStartDownload() {
    var downloadUrl = '<?php echo $baseurl; ?>/plugins/featured_collection_download/pages/download_featured_collection.php';
    downloadUrl += '?collection=<?php echo (int)$collection_ref; ?>&start=true';

    // Hide buttons, show progress
    document.getElementById('fcd_buttons').style.display = 'none';
    document.getElementById('fcd_progress').style.display = 'block';

    // Animate progress bar
    var progressBar = document.getElementById('fcd_progress_bar');
    progressBar.style.width = '30%';

    // Use iframe for download to detect completion
    var iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = downloadUrl;
    document.body.appendChild(iframe);

    // After a short delay, show completion message
    setTimeout(function() {
        progressBar.style.width = '100%';
    }, 500);

    setTimeout(function() {
        document.getElementById('fcd_progress').style.display = 'none';
        document.getElementById('fcd_complete').style.display = 'block';
        document.getElementById('fcd_back_button').style.display = 'block';

        // Set up retry link
        document.getElementById('fcd_retry_link').href = downloadUrl;
    }, 1500);
}
</script>
<?php
include dirname(__DIR__, 3) . '/include/footer.php';

