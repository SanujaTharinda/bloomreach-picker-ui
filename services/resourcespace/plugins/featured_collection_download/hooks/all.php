<?php
/**
 * Featured Collection Download Plugin - Hooks
 *
 * Registers plugin hooks for adding download action to featured collections.
 */

/**
 * Hook: Initialise the plugin - include required files.
 *
 * Called early in the ResourceSpace boot process.
 */
function HookFeatured_collection_downloadAllInitialise()
{
    $plugin_root = dirname(__DIR__);
    include_once "{$plugin_root}/include/featured_collection_download_functions.php";
}

/**
 * Hook: Add "Download All Assets" action to the collection actions dropdown.
 *
 * Called via render_actions_add_collection_option when rendering
 * the actions dropdown for collections (including featured collections).
 *
 * @param bool $top_actions Whether these are top actions
 * @param array $options Current options array
 * @param array $collection_data Collection data
 * @param array $urlparams URL parameters
 * @return array Modified options array with download action added
 */
function HookFeatured_collection_downloadAllRender_actions_add_collection_option(
    $top_actions,
    $options,
    $collection_data,
    $urlparams
) {
    global $baseurl_short, $lang, $collection_download, $use_zip_extension;

    // Ensure options is an array
    if (!is_array($options)) {
        $options = [];
    }

    // Validate collection data
    if (!is_array($collection_data) || empty($collection_data['ref'])) {
        return $options;
    }

    $collection_ref = (int)$collection_data['ref'];

    // Check if collection download is enabled globally
    if (empty($collection_download)) {
        return $options;
    }

    // Check if ZIP extension is available
    if (empty($use_zip_extension) && !class_exists('ZipArchive')) {
        return $options;
    }

    // Check if this collection (or its children) has any downloadable resources
    if (!function_exists('fcd_collection_has_resources') || !fcd_collection_has_resources($collection_ref)) {
        return $options;
    }

    // Add the download action
    $options[] = [
        'value' => 'fcd_download_all',
        'label' => $lang['fcd_download_all_assets'] ?? 'Download All Assets',
        'data_attr' => [
            'url' => "{$baseurl_short}plugins/featured_collection_download/pages/download_featured_collection.php?collection={$collection_ref}"
        ],
        'category' => ACTIONGROUP_RESOURCE,
        'order_by' => 25 // Just after standard download option (order_by=20)
    ];

    return $options;
}

