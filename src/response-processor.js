/**
 * Response processor module for Proxy Magic
 * Handles response processing and rule-based response modifications
 */

const { logger, getLogLevel } = require('./utils/logger');
const { reconstructFullUrl } = require('./utils/url-utils');

/**
 * Processes proxy responses
 * @param {Object} ctx - Proxy context
 * @param {Function} callback - Callback function
 */
function processResponse(ctx, callback) {
    logger.log(2, `[DEBUG onResponse] Received response for: ${ctx.clientToProxyRequest.url}`);

    if (ctx.proxyProcessed && ctx.matchedRule && ctx.matchedRule.onResponse) {
        logger.log(2, `[DEBUG onResponse] Executing onResponse for rule '${ctx.matchedRule.name || 'Unnamed Rule'}'`);
        
        try {
            const parsedUrl = reconstructFullUrl(ctx.clientToProxyRequest, ctx.isSSL);
            if (!parsedUrl) {
                logger.log(1, `[onResponse] Could not determine absolute URL for: ${ctx.clientToProxyRequest.url}, skipping response rule.`);
                return callback(); 
            }
            
            ctx.matchedRule.onResponse(ctx, parsedUrl);
        } catch (e) {
            logger.error(`[onResponse] Error executing onResponse for rule '${ctx.matchedRule.name || 'Unnamed Rule'}':`, e);
        }
    } else {
        logger.log(2, `[DEBUG onResponse] No matched rule or no onResponse handler for ${ctx.clientToProxyRequest.url}. Passing through.`);
    }
    
    return callback(); 
}

/**
 * Processes response data chunks
 * @param {Object} ctx - Proxy context
 * @param {Buffer} chunk - Data chunk
 * @param {Function} callback - Callback function
 */
function processResponseData(ctx, chunk, callback) {
    // Default implementation - just pass through
    // Rules can override this behavior in their onResponse handlers
    return callback(null, chunk);
}

/**
 * Handles response end
 * @param {Object} ctx - Proxy context
 * @param {Function} callback - Callback function
 */
function processResponseEnd(ctx, callback) {
    // Log response completion for debugging
    if (ctx.matchedRule) {
        logger.log(2, `[DEBUG onResponseEnd] Response completed for rule: ${ctx.matchedRule.name || 'Unnamed Rule'}`);
    }
    
    return callback();
}

/**
 * Logs response headers for debugging
 * @param {Object} ctx - Proxy context
 */
function logResponseHeaders(ctx) {
    if (ctx.serverToProxyResponse && getLogLevel() >= 2) {
        const response = ctx.serverToProxyResponse;
        
        logger.log(2, '📤 [RESPONSE] ===== SERVER RESPONSE HEADERS =====');
        logger.log(2, `📤 [RESPONSE] Status: ${response.statusCode} ${response.statusMessage || ''}`);
        
        if (response.headers) {
            Object.entries(response.headers).forEach(([key, value]) => {
                logger.log(2, `📤 [RESPONSE]   ${key}: ${value}`);
            });
        }
        
        logger.log(2, '📤 [RESPONSE] ========================================');
    }
}

/**
 * Checks if response should be modified based on content type
 * @param {Object} ctx - Proxy context
 * @returns {boolean} - True if response can be modified
 */
function canModifyResponse(ctx) {
    if (!ctx.serverToProxyResponse || !ctx.serverToProxyResponse.headers) {
        return false;
    }
    
    const contentType = ctx.serverToProxyResponse.headers['content-type'];
    if (!contentType) {
        return true; // Assume modifiable if no content type
    }
    
    // Allow modification for text-based content
    const modifiableTypes = [
        'text/',
        'application/json',
        'application/xml',
        'application/javascript',
        'application/x-javascript'
    ];
    
    return modifiableTypes.some(type => contentType.toLowerCase().includes(type));
}

/**
 * Gets response content encoding
 * @param {Object} ctx - Proxy context
 * @returns {string|null} - Content encoding or null
 */
function getResponseEncoding(ctx) {
    if (!ctx.serverToProxyResponse || !ctx.serverToProxyResponse.headers) {
        return null;
    }
    
    return ctx.serverToProxyResponse.headers['content-encoding'] || null;
}

/**
 * Modifies response headers if needed
 * @param {Object} ctx - Proxy context
 * @param {Object} modifications - Header modifications
 */
function modifyResponseHeaders(ctx, modifications) {
    if (!ctx.proxyToClientResponse || ctx.proxyToClientResponse.headersSent) {
        logger.warn('[RESPONSE] Cannot modify headers - response already sent');
        return;
    }
    
    if (!modifications || typeof modifications !== 'object') {
        return;
    }
    
    // Apply header modifications
    Object.entries(modifications).forEach(([key, value]) => {
        if (value === null || value === undefined) {
            // Remove header
            ctx.proxyToClientResponse.removeHeader(key);
            logger.log(2, `[RESPONSE] Removed header: ${key}`);
        } else {
            // Set/modify header
            ctx.proxyToClientResponse.setHeader(key, value);
            logger.log(2, `[RESPONSE] Modified header: ${key} = ${value}`);
        }
    });
}

/**
 * Handles response errors
 * @param {Object} ctx - Proxy context
 * @param {Error} error - Response error
 */
function handleResponseError(ctx, error) {
    logger.error('[RESPONSE ERROR]', error);
    
    // If we haven't sent headers yet, send an error response
    if (ctx.proxyToClientResponse && !ctx.proxyToClientResponse.headersSent) {
        ctx.proxyToClientResponse.writeHead(500, {
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        ctx.proxyToClientResponse.end('Response processing error');
    }
}

module.exports = {
    processResponse,
    processResponseData,
    processResponseEnd,
    logResponseHeaders,
    canModifyResponse,
    getResponseEncoding,
    modifyResponseHeaders,
    handleResponseError
}; 