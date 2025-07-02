/**
 * Request utility functions for Proxy Magic
 * Handles request analysis and validation
 */

/**
 * Determines if a request expects HTML content
 * @param {Object} clientToProxyRequest - The client request object
 * @returns {boolean} - True if the request likely expects HTML
 */
function requestExpectsHtml(clientToProxyRequest) {
    if (!clientToProxyRequest) {
        return false;
    }
    
    // Check Accept header
    const acceptHeader = clientToProxyRequest.headers.accept;
    if (acceptHeader) {
        // If Accept header explicitly requests HTML
        if (acceptHeader.includes('text/html')) {
            return true;
        }
        // If Accept header is for specific non-HTML content
        if (acceptHeader.includes('image/') || 
            acceptHeader.includes('text/css') || 
            acceptHeader.includes('text/javascript') ||
            acceptHeader.includes('application/javascript') ||
            acceptHeader.includes('application/json') ||
            acceptHeader.includes('application/xml') ||
            acceptHeader.includes('font/') ||
            acceptHeader.includes('audio/') ||
            acceptHeader.includes('video/')) {
            return false;
        }
    }
    
    // Check URL extension
    const url = clientToProxyRequest.url;
    if (url) {
        const urlWithoutQuery = url.split('?')[0];
        const extension = urlWithoutQuery.split('.').pop().toLowerCase();
        
        // Non-HTML extensions
        const nonHtmlExtensions = [
            'js', 'css', 'json', 'xml', 'txt',
            'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico',
            'mp3', 'mp4', 'wav', 'avi', 'mov',
            'pdf', 'zip', 'tar', 'gz',
            'woff', 'woff2', 'ttf', 'eot'
        ];
        
        if (nonHtmlExtensions.includes(extension)) {
            return false;
        }
        
        // HTML extensions
        if (['html', 'htm'].includes(extension)) {
            return true;
        }
    }
    
    // Default: assume HTML for navigation requests (GET without specific extension)
    return clientToProxyRequest.method === 'GET';
}

/**
 * Checks if a request is an internal browser request that should be filtered from stats
 * @param {string} reqUrl - The request URL
 * @returns {boolean} - True if it's an internal request
 */
function isInternalRequest(reqUrl) {
    return (
        reqUrl.includes('googleapis.com') ||
        reqUrl.includes('google.com') ||
        reqUrl.includes('chrome-extension') ||
        reqUrl.includes('moz-extension') ||
        reqUrl.includes('optimizationguide-pa.googleapis.com')
    );
}

/**
 * Validates and normalizes request options
 * @param {Object} options - Request options to validate
 * @param {Object} clientReq - Original client request
 * @returns {Object} - Validated and normalized options
 */
function validateRequestOptions(options, clientReq) {
    const normalizedOptions = { ...options };
    
    // Ensure headers are initialized
    normalizedOptions.headers = normalizedOptions.headers || {};
    
    // Validate hostname
    if (!normalizedOptions.hostname || normalizedOptions.hostname === 'undefined') {
        throw new Error(`Invalid hostname: '${normalizedOptions.hostname}'`);
    }
    
    // Validate and fix path
    if (!normalizedOptions.path || normalizedOptions.path === 'undefined') {
        normalizedOptions.path = '/';
    }
    
    // Ensure method is set
    if (!normalizedOptions.method) {
        normalizedOptions.method = clientReq.method || 'GET';
    }
    
    return normalizedOptions;
}

/**
 * Extracts the hostname from a request URL or host header
 * @param {Object} clientToProxyRequest - The client request object
 * @returns {string|null} - Extracted hostname or null
 */
function extractHostname(clientToProxyRequest) {
    if (!clientToProxyRequest) {
        return null;
    }
    
    // Try host header first
    if (clientToProxyRequest.headers.host) {
        return clientToProxyRequest.headers.host.split(':')[0];
    }
    
    // Try to extract from URL
    const url = clientToProxyRequest.url;
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        try {
            return new URL(url).hostname;
        } catch (e) {
            // Invalid URL
        }
    }
    
    return null;
}

module.exports = {
    requestExpectsHtml,
    isInternalRequest,
    validateRequestOptions,
    extractHostname
}; 