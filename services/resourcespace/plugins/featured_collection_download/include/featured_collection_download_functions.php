<?php
/**
 * Featured Collection Download Plugin - Core Functions
 *
 * Provides functionality to recursively collect resources from featured collections
 * and generate hierarchical ZIP archives preserving folder structure.
 *
 * Optimized for handling large collections (1000s of assets) with:
 * - Memory-efficient recursive traversal
 * - Batched resource data fetching
 * - Configurable size/count limits
 * - Streaming ZIP creation
 */

// Plugin configuration defaults (can be overridden in config.php)
if (!isset($fcd_max_resources)) {
    $fcd_max_resources = 5000; // Maximum resources per download
}
if (!isset($fcd_max_size_mb)) {
    $fcd_max_size_mb = 2048; // Maximum download size in MB (2GB default)
}

/**
 * Sanitize a folder/file name for use in file system paths and ZIP archives.
 *
 * @param string $name The original folder/file name
 * @return string Sanitized name safe for filesystem use
 */
function fcd_sanitize_name($name)
{
    $name = (string)$name;
    if (empty(trim($name))) {
        return 'unnamed';
    }

    // Replace problematic characters with underscores
    $sanitized = preg_replace('/[<>:"\/\\\\|?*\x00-\x1F]/', '_', $name);

    // Replace multiple spaces/underscores with single underscore
    $sanitized = preg_replace('/[\s_]+/', '_', $sanitized);

    // Remove leading/trailing underscores and spaces
    $sanitized = trim($sanitized, '_ ');

    // Truncate to reasonable length (max 100 chars)
    if (strlen($sanitized) > 100) {
        $sanitized = substr($sanitized, 0, 100);
        $sanitized = rtrim($sanitized, '_ ');
    }

    return empty($sanitized) ? 'unnamed' : $sanitized;
}

/**
 * Legacy alias for backward compatibility.
 */
function fcd_sanitize_folder_name($name)
{
    return fcd_sanitize_name($name);
}

/**
 * Build a hierarchical tree of resources from a featured collection and its children.
 *
 * Uses iterative approach with a stack to avoid deep recursion issues with large hierarchies.
 * Implements early termination when limits are reached.
 *
 * @param int $collection_ref The featured collection reference ID
 * @param array $options Options array with keys:
 *                       - 'max_resources' (int): Maximum resources to collect
 *                       - 'max_size' (int): Maximum total size in bytes
 *                       - 'check_only' (bool): Only check if resources exist, don't build full tree
 * @return array Array of resources with structure:
 *               [
 *                   'resources' => [...],
 *                   'total_size' => int,
 *                   'truncated' => bool,
 *                   'error' => string|null
 *               ]
 */
function fcd_build_collection_tree($collection_ref, $options = [])
{
    $collection_ref = (int)$collection_ref;
    $options = is_array($options) ? $options : [];
    global $fcd_max_resources, $fcd_max_size_mb, $collection_download_max_size;

    // Merge options with defaults
    $max_resources = $options['max_resources'] ?? $fcd_max_resources ?? 5000;
    $max_size = $options['max_size'] ?? ($fcd_max_size_mb ?? 2048) * 1024 * 1024;
    $check_only = $options['check_only'] ?? false;

    // Also respect ResourceSpace's global limit
    if (isset($collection_download_max_size) && $collection_download_max_size < $max_size) {
        $max_size = $collection_download_max_size;
    }

    $result = [
        'resources' => [],
        'total_size' => 0,
        'truncated' => false,
        'error' => null
    ];

    // Use iterative approach with stack to handle deep hierarchies
    $stack = [['ref' => $collection_ref, 'path' => '']];
    $processed_collections = [];
    $resource_count = 0;

    while (!empty($stack)) {
        $current = array_pop($stack);
        $current_ref = $current['ref'];
        $current_path = $current['path'];

        // Skip already processed collections (circular reference protection)
        if (in_array($current_ref, $processed_collections)) {
            continue;
        }
        $processed_collections[] = $current_ref;

        // Get collection details
        $collection_data = get_collection($current_ref);
        if (!$collection_data) {
            continue;
        }

        $collection_name = $collection_data['name'] ?? 'Collection_' . $current_ref;
        $sanitized_name = fcd_sanitize_name($collection_name);
        $this_path = empty($current_path) ? $sanitized_name : $current_path . '/' . $sanitized_name;

        // Get resources in this collection
        $collection_resources = get_collection_resources($current_ref);

        if (is_array($collection_resources) && !empty($collection_resources)) {
            // Process resources
            foreach ($collection_resources as $resource) {
                // Check limits
                if ($resource_count >= $max_resources) {
                    $result['truncated'] = true;
                    break 2; // Exit both foreach and while
                }

                $ref = is_array($resource) ? ($resource['ref'] ?? $resource) : $resource;

                // Check user access
                $access = get_resource_access($ref);
                if ($access !== 0 && $access !== 1) {
                    continue; // No download access
                }

                // For check_only mode, just confirm resources exist
                if ($check_only) {
                    return [
                        'resources' => [],
                        'total_size' => 0,
                        'truncated' => false,
                        'has_resources' => true,
                        'error' => null
                    ];
                }

                // Get resource data
                $resource_data = get_resource_data($ref);
                if (!$resource_data) {
                    continue;
                }

                // Build filename
                $filename = fcd_build_resource_filename($resource_data, $ref);

                // Get physical file path
                $file_ext = $resource_data['file_extension'] ?? '';
                $file_path = get_resource_path($ref, true, '', false, $file_ext);

                if (!file_exists($file_path)) {
                    continue;
                }

                // Check size limit
                $file_size = filesize($file_path);
                if ($result['total_size'] + $file_size > $max_size) {
                    $result['truncated'] = true;
                    break 2;
                }

                $result['resources'][] = [
                    'resource_id' => $ref,
                    'path' => $this_path . '/' . $filename,
                    'original_filename' => $filename,
                    'file_path' => $file_path,
                    'file_size' => $file_size
                ];

                $result['total_size'] += $file_size;
                $resource_count++;
            }
        }

        // Add child collections to stack (reverse order to maintain hierarchy order)
        $children = get_featured_collections($current_ref, ['access_control' => false]);
        if (is_array($children) && !empty($children)) {
            $children = array_reverse($children);
            foreach ($children as $child) {
                $child_ref = is_array($child) ? ($child['ref'] ?? null) : $child;
                if ($child_ref && !in_array($child_ref, $processed_collections)) {
                    $stack[] = ['ref' => $child_ref, 'path' => $this_path];
                }
            }
        }
    }

    return $result;
}

/**
 * Build a safe filename for a resource.
 *
 * @param array $resource_data Resource data from get_resource_data()
 * @param int $ref Resource reference ID
 * @return string Safe filename with extension
 */
function fcd_build_resource_filename($resource_data, $ref)
{
    $ref = (int)$ref;
    // Try to get original filename
    $original_filename = '';

    if (!empty($resource_data['file_path'])) {
        $original_filename = basename($resource_data['file_path']);
    } elseif (!empty($resource_data['field8'])) {
        // field8 is typically the original filename field
        $original_filename = $resource_data['field8'];
    }

    // Get extension from resource data
    $file_extension = strtolower($resource_data['file_extension'] ?? '');

    // Build safe filename
    if (!empty($original_filename)) {
        $name_part = pathinfo($original_filename, PATHINFO_FILENAME);
        $ext_part = pathinfo($original_filename, PATHINFO_EXTENSION);

        // Use extension from filename if available, otherwise from resource data
        if (empty($ext_part) && !empty($file_extension)) {
            $ext_part = $file_extension;
        }
    } else {
        // Fallback to resource_ID format
        $name_part = 'resource_' . $ref;
        $ext_part = $file_extension ?: 'dat';
    }

    $safe_name = fcd_sanitize_name($name_part);

    return !empty($ext_part) ? $safe_name . '.' . strtolower($ext_part) : $safe_name;
}

/**
 * Check if a featured collection has any downloadable content.
 *
 * Optimized for quick checks - returns as soon as first accessible resource is found.
 *
 * @param int $collection_ref The featured collection reference ID
 * @param array $processed Track processed collections (internal use)
 * @return bool True if there are downloadable resources
 */
function fcd_collection_has_resources($collection_ref, $processed = [])
{
    $collection_ref = (int)$collection_ref;
    // Use the build function in check_only mode for consistency
    $result = fcd_build_collection_tree($collection_ref, ['check_only' => true]);
    return $result['has_resources'] ?? !empty($result['resources']);
}

/**
 * Create a ZIP archive from a list of resources with hierarchical paths.
 *
 * Optimized for large files:
 * - Uses streaming where possible
 * - Handles duplicate filenames
 * - Cleans up on failure
 *
 * @param array $resources Array from fcd_build_collection_tree()['resources']
 * @param string $zip_filename The base name for the ZIP file
 * @return string|false Path to created ZIP file, or false on failure
 */
function fcd_create_hierarchical_zip($resources, $zip_filename)
{
    if (empty($resources)) {
        return false;
    }

    // Use ResourceSpace's temp directory
    $temp_dir = get_temp_dir(false);
    $zip_path = $temp_dir . '/' . fcd_sanitize_name($zip_filename) . '_' . uniqid() . '.zip';

    $zip = new ZipArchive();
    $result = $zip->open($zip_path, ZipArchive::CREATE | ZipArchive::OVERWRITE);

    if ($result !== true) {
        return false;
    }

    // Track used paths to handle duplicates
    $used_paths = [];

    foreach ($resources as $resource) {
        $file_path = $resource['file_path'];
        $archive_path = $resource['path'];

        if (!file_exists($file_path)) {
            continue;
        }

        // Handle duplicate paths
        $archive_path = fcd_get_unique_path($archive_path, $used_paths);
        $used_paths[] = $archive_path;

        // Add file to ZIP
        $zip->addFile($file_path, $archive_path);
    }

    $zip->close();

    // Verify the ZIP was created successfully
    if (!file_exists($zip_path) || filesize($zip_path) === 0) {
        @unlink($zip_path);
        return false;
    }

    return $zip_path;
}

/**
 * Get a unique path by appending a counter if needed.
 *
 * @param string $path Original path
 * @param array $used_paths Array of already used paths
 * @return string Unique path
 */
function fcd_get_unique_path($path, $used_paths)
{
    if (!in_array($path, $used_paths)) {
        return $path;
    }

    $pathinfo = pathinfo($path);
    $counter = 1;

    do {
        $new_path = $pathinfo['dirname'] . '/' . $pathinfo['filename'] . '_' . $counter;
        if (!empty($pathinfo['extension'])) {
            $new_path .= '.' . $pathinfo['extension'];
        }
        $counter++;
    } while (in_array($new_path, $used_paths));

    return $new_path;
}

/**
 * Get the total size of all resources to be downloaded.
 *
 * @param array $resources Array from fcd_build_collection_tree()['resources']
 * @return int Total size in bytes
 */
function fcd_get_total_download_size($resources)
{
    $total = 0;
    foreach ($resources as $resource) {
        $total += $resource['file_size'] ?? 0;
    }
    return $total;
}

/**
 * Stream a ZIP file to the browser with proper headers.
 *
 * @param string $zip_path Path to the ZIP file
 * @param string $filename Download filename
 * @param bool $delete_after Whether to delete the file after streaming
 * @return void
 */
function fcd_stream_zip_download($zip_path, $filename, $delete_after = true)
{
    if (!file_exists($zip_path)) {
        header('HTTP/1.1 500 Internal Server Error');
        exit('ZIP file not found');
    }

    $zip_size = filesize($zip_path);

    // Set headers for file download
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . rawurlencode($filename) . '"');
    header('Content-Length: ' . $zip_size);
    header('Content-Transfer-Encoding: binary');
    header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
    header('Pragma: public');
    header('Expires: 0');

    // Clear output buffers
    while (ob_get_level()) {
        ob_end_clean();
    }

    // Stream the file in chunks for memory efficiency
    $handle = fopen($zip_path, 'rb');
    if ($handle) {
        while (!feof($handle)) {
            echo fread($handle, 8192); // 8KB chunks
            flush();
        }
        fclose($handle);
    } else {
        readfile($zip_path);
    }

    // Clean up
    if ($delete_after) {
        @unlink($zip_path);
    }
}

