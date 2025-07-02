/**
 * Curl utility functions for Proxy Magic
 * Generates curl commands equivalent to proxy requests
 */

/**
 * Generates a curl command equivalent to the proxy request
 * @param {Object} options - The request options (proxyToServerRequestOptions)
 * @returns {string} - Equivalent curl command
 */
function generateCurlCommand(options) {
    if (!options || !options.hostname) {
        return 'curl [invalid request options]';
    }
    
    const protocol = options.port === 443 ? 'https' : 'http';
    const port = (options.port === 80 || options.port === 443) ? '' : `:${options.port}`;
    const fullUrl = `${protocol}://${options.hostname}${port}${options.path || '/'}`;
    
    // Start with curl command - add --compressed to handle gzip and other encodings
    let curlCommand = `curl -v --compressed`;
    
    // Add method if not GET
    if (options.method && options.method !== 'GET') {
        curlCommand += ` -X ${options.method}`;
    }
    
    // Add headers
    if (options.headers) {
        for (const [headerName, headerValue] of Object.entries(options.headers)) {
            // Skip some headers that curl sets automatically or that might cause issues
            const skipHeaders = [
                'host', 
                'content-length', 
                'connection', 
                'transfer-encoding',
                'expect'
            ];
            
            if (!skipHeaders.includes(headerName.toLowerCase())) {
                curlCommand += ` -H "${headerName}: ${headerValue}"`;
            }
        }
    }
    
    curlCommand += ` "${fullUrl}"`;
    
    return curlCommand;
}

/**
 * Generates a curl command that saves response to file
 * @param {Object} options - The request options
 * @param {string} filename - Output filename (default: 'response.html')
 * @returns {string} - Curl command that saves to file
 */
function generateCurlToFile(options, filename = 'response.html') {
    const baseCurl = generateCurlCommand(options);
    return baseCurl.replace('curl -v --compressed', `curl -v --compressed -o ${filename}`);
}

/**
 * Gets the list of headers that should be skipped in curl commands
 * @returns {Array<string>} - Array of header names to skip
 */
function getSkipHeaders() {
    return [
        'host', 
        'content-length', 
        'connection', 
        'transfer-encoding',
        'expect'
    ];
}

/**
 * Formats headers for curl command
 * @param {Object} headers - Request headers
 * @returns {string} - Formatted header string for curl
 */
function formatHeadersForCurl(headers) {
    if (!headers || typeof headers !== 'object') {
        return '';
    }
    
    const skipHeaders = getSkipHeaders();
    let headerString = '';
    
    for (const [headerName, headerValue] of Object.entries(headers)) {
        if (!skipHeaders.includes(headerName.toLowerCase())) {
            headerString += ` -H "${headerName}: ${headerValue}"`;
        }
    }
    
    return headerString;
}

module.exports = {
    generateCurlCommand,
    generateCurlToFile,
    getSkipHeaders,
    formatHeadersForCurl
}; 