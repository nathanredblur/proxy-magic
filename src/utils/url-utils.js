/**
 * URL utility functions for Proxy Magic
 * Handles URL reconstruction and manipulation
 */

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
 * Builds the target URL with protocol and port information
 * @param {string} hostname - Target hostname
 * @param {number} port - Target port
 * @param {string} path - Request path
 * @returns {string} - Complete URL
 */
function buildTargetUrl(hostname, port, path) {
    const protocol = port === 443 ? 'https' : 'http';
    const portStr = (port === 80 || port === 443) ? '' : `:${port}`;
    return `${protocol}://${hostname}${portStr}${path || '/'}`;
}

module.exports = {
    reconstructFullUrl,
    getFullUrlString,
    buildTargetUrl
}; 