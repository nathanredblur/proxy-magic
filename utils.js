/**
 * Reconstructs a full URL from request data
 * @param {Object} clientToProxyRequest - The client request object
 * @param {boolean} isSSL - Whether the connection is SSL/HTTPS
 * @returns {URL|null} - Parsed URL object or null if reconstruction fails
 */
function reconstructFullUrl(clientToProxyRequest, isSSL = false) {
    if (!clientToProxyRequest) {
        return null;
    }
    
    const reqUrl = clientToProxyRequest.url;
    
    try {
        if (reqUrl.startsWith('http://') || reqUrl.startsWith('https://')) {
            return new URL(reqUrl);
        } else if (clientToProxyRequest.headers.host) {
            const protocol = isSSL ? 'https://' : 'http://';
            let pathAndQuery = reqUrl;
            if (reqUrl.includes(':') && !reqUrl.startsWith('/')) {
                pathAndQuery = '/'; 
            } else if (!reqUrl.startsWith('/')) {
                pathAndQuery = '/' + reqUrl;
            }
            return new URL(`${protocol}${clientToProxyRequest.headers.host}${pathAndQuery}`);
        }
    } catch (e) {
        // URL reconstruction failed
    }
    
    return null;
}

/**
 * Gets the full URL string from request context
 * @param {Object} ctx - The proxy context
 * @returns {string} - Full URL string or fallback value
 */
function getFullUrlString(ctx) {
    if (!ctx || !ctx.clientToProxyRequest) {
        return 'unknown';
    }
    
    const parsedUrl = reconstructFullUrl(ctx.clientToProxyRequest, ctx.isSSL);
    if (parsedUrl) {
        return parsedUrl.toString();
    }
    
    // Fallback to original URL
    return ctx.clientToProxyRequest.url || 'unknown';
}

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
 * Creates a user-friendly HTML error page
 */
function createErrorPage(statusCode, title, message, details, ctx) {
    const requestedUrl = getFullUrlString(ctx);
    const timestamp = new Date().toISOString();
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Proxy Magic - ${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #333;
        }
        
        .error-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            padding: 40px;
            max-width: 600px;
            width: 90%;
            text-align: center;
        }
        
        .error-icon {
            font-size: 4rem;
            margin-bottom: 20px;
            opacity: 0.7;
        }
        
        .error-code {
            font-size: 1.5rem;
            color: #e74c3c;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .error-title {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 15px;
            color: #2c3e50;
        }
        
        .error-message {
            font-size: 1.1rem;
            color: #7f8c8d;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        
        .error-details {
            background: #f8f9fa;
            border-left: 4px solid #e74c3c;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
            border-radius: 4px;
        }
        
        .error-details strong {
            color: #2c3e50;
        }
        
        .url-info {
            background: #f1f2f6;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            font-family: monospace;
            font-size: 14px;
            word-break: break-all;
        }
        
        .suggestions {
            text-align: left;
            margin: 25px 0;
        }
        
        .suggestions h4 {
            color: #2c3e50;
            margin-bottom: 10px;
        }
        
        .suggestions ul {
            color: #7f8c8d;
            padding-left: 20px;
        }
        
        .suggestions li {
            margin-bottom: 8px;
            line-height: 1.4;
        }
        
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ecf0f1;
            font-size: 0.9rem;
            color: #95a5a6;
        }
        
        .retry-button {
            background: #3498db;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 1rem;
            cursor: pointer;
            transition: background 0.3s;
            margin-top: 20px;
        }
        
        .retry-button:hover {
            background: #2980b9;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-icon">🚫</div>
        <div class="error-code">ERROR ${statusCode}</div>
        <h1 class="error-title">${title}</h1>
        <p class="error-message">${message}</p>
        
        <div class="url-info">
            <strong>Requested URL:</strong> ${requestedUrl}
        </div>
        
        <div class="error-details">
            <strong>Technical Details:</strong> ${details}
        </div>
        
        <div class="suggestions">
            <h4>What can you do?</h4>
            <ul>
                <li>Check that the URL is spelled correctly</li>
                <li>Verify your internet connection</li>
                <li>The website might be temporarily unavailable</li>
                <li>If the problem persists, contact the administrator</li>
            </ul>
        </div>
        
        <button class="retry-button" onclick="window.location.reload()">
            🔄 Retry
        </button>
        
        <div class="footer">
            <p>Proxy Magic Error Handler</p>
            <p>Timestamp: ${timestamp}</p>
        </div>
    </div>
</body>
</html>`;
}

module.exports = {
    reconstructFullUrl,
    getFullUrlString,
    requestExpectsHtml,
    createErrorPage,
    generateCurlCommand
}; 