/**
 * Error utility functions for Proxy Magic
 * Handles error page generation and error type classification
 */

const { getFullUrlString } = require('./url-utils');

/**
 * Creates a user-friendly HTML error page
 * @param {number} statusCode - HTTP status code
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @param {string} details - Technical details
 * @param {Object} ctx - Proxy context
 * @returns {string} - HTML error page
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

/**
 * Classifies error types and returns appropriate HTTP status and messages
 * @param {Error} err - The error object
 * @returns {Object} - Error classification with statusCode, title, message, and details
 */
function classifyError(err) {
    let statusCode = 500;
    let errorTitle = 'Proxy Error';
    let errorMessage = 'An error occurred while processing your request.';
    let errorDetails = err.message || 'Unknown error';
    
    // Handle DNS resolution errors (ENOTFOUND)
    if (err.code === 'ENOTFOUND') {
        statusCode = 502; // Bad Gateway
        errorTitle = 'Site Not Found';
        errorMessage = 'The requested website could not be found or is not accessible.';
        errorDetails = `Could not resolve hostname: ${err.hostname || 'unknown'}`;
    } 
    // Handle connection refused errors
    else if (err.code === 'ECONNREFUSED') {
        statusCode = 502; // Bad Gateway
        errorTitle = 'Connection Refused';
        errorMessage = 'The target server refused the connection.';
        errorDetails = `Connection refused to ${err.address}:${err.port}`;
    }
    // Handle timeout errors
    else if (err.code === 'ETIMEDOUT' || err.timeout) {
        statusCode = 504; // Gateway Timeout
        errorTitle = 'Request Timeout';
        errorMessage = 'The request timed out while trying to reach the target server.';
        errorDetails = 'Connection timed out';
    }
    // Handle certificate errors
    else if (err.code && err.code.startsWith('CERT_')) {
        statusCode = 502; // Bad Gateway
        errorTitle = 'Certificate Error';
        errorMessage = 'There was a problem with the SSL certificate of the target site.';
        errorDetails = err.message;
    }
    
    return {
        statusCode,
        errorTitle,
        errorMessage,
        errorDetails
    };
}

/**
 * Checks if an error is a common/expected error that should be filtered
 * @param {Error} err - The error object
 * @param {string} errorKind - The error kind from the proxy
 * @returns {boolean} - True if it's a common error
 */
function isCommonError(err, errorKind) {
    const isCommonErrorCode = (
        err.code === 'EPIPE' || 
        err.code === 'ECONNRESET' || 
        err.message.includes('socket hang up')
    );
    
    const isConnectionError = (
        errorKind === 'CLIENT_TO_PROXY_SOCKET_ERROR' || 
        errorKind === 'HTTPS_CLIENT_ERROR'
    );
    
    return isCommonErrorCode && isConnectionError;
}

/**
 * Creates HTTP error headers
 * @param {number} statusCode - HTTP status code
 * @param {boolean} isHtml - Whether the response is HTML
 * @returns {Object} - HTTP headers object
 */
function createErrorHeaders(statusCode, isHtml = true) {
    const contentType = isHtml ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8';
    
    return {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    };
}

module.exports = {
    createErrorPage,
    classifyError,
    isCommonError,
    createErrorHeaders
}; 