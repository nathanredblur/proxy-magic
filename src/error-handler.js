/**
 * Error handler module for Proxy Magic
 * Handles proxy errors and generates appropriate responses
 */

const { logger } = require('./utils/logger');
const { getFullUrlString } = require('./utils/url-utils');
const { 
    createErrorPage, 
    classifyError, 
    isCommonError, 
    createErrorHeaders 
} = require('./utils/error-utils');
const { requestExpectsHtml } = require('./utils/request-utils');

/**
 * Main proxy error handler
 * @param {Object} ctx - Proxy context
 * @param {Error} err - Error object
 * @param {string} errorKind - Error kind from proxy
 */
function handleProxyError(ctx, err, errorKind) {
    // CRITICAL: Check if this is a manual response from a rule
    if (ctx && ctx.isManualResponse) {
        logger.log(1, `🔧 [HTTP DEMO] Ignoring proxy error for manual response: ${errorKind} (${err.code})`);
        return; // Don't interfere with manual responses
    }
    
    // Filter out common/expected errors that create noise
    if (isCommonError(err, errorKind)) {
        const url = ctx ? getFullUrlString(ctx) : 'unknown';
        logger.log(2, `[DEBUG] ${errorKind}: ${err.code || err.message} (${url})`);
        return; // Don't process further for common errors
    }
    
    // Log serious errors with full details
    logDetailedError(ctx, err, errorKind);
    
    // Handle specific error types and provide better responses to the client
    if (ctx && ctx.proxyToClientResponse && !ctx.proxyToClientResponse.headersSent) {
        sendErrorResponse(ctx, err);
    }
}

/**
 * Logs detailed error information
 * @param {Object} ctx - Proxy context
 * @param {Error} err - Error object
 * @param {string} errorKind - Error kind
 */
function logDetailedError(ctx, err, errorKind) {
    logger.error('---------------------------------------------------------------------');
    logger.error(`PROXY ERROR - Kind: ${errorKind}`);
    
    if (ctx) {
        const fullUrl = getFullUrlString(ctx);
        logger.error(`PROXY ERROR - Client URL: ${fullUrl}`);
        
        // Add detailed request information for debugging
        if (ctx.proxyToServerRequestOptions) {
            const options = ctx.proxyToServerRequestOptions;
            const protocol = options.port === 443 ? 'https' : 'http';
            const targetUrl = `${protocol}://${options.hostname}:${options.port}${options.path}`;
            logger.error(`PROXY ERROR - Target URL: ${targetUrl}`);
            logger.error(`PROXY ERROR - Request Headers:`, options.headers);
        }
    }
    
    logger.error('PROXY ERROR - Details:', err);
    logger.error('---------------------------------------------------------------------');
}

/**
 * Sends an appropriate error response to the client
 * @param {Object} ctx - Proxy context
 * @param {Error} err - Error object
 */
function sendErrorResponse(ctx, err) {
    try {
        const errorInfo = classifyError(err);
        const expectsHtml = requestExpectsHtml(ctx.clientToProxyRequest);
        
        if (expectsHtml) {
            sendHtmlErrorResponse(ctx, errorInfo);
        } else {
            sendTextErrorResponse(ctx, errorInfo);
        }
    } catch (responseErr) {
        logger.error('Error while sending custom error response:', responseErr);
        sendFallbackErrorResponse(ctx);
    }
}

/**
 * Sends an HTML error response
 * @param {Object} ctx - Proxy context
 * @param {Object} errorInfo - Classified error information
 */
function sendHtmlErrorResponse(ctx, errorInfo) {
    const { statusCode, errorTitle, errorMessage, errorDetails } = errorInfo;
    const errorPage = createErrorPage(statusCode, errorTitle, errorMessage, errorDetails, ctx);
    const headers = createErrorHeaders(statusCode, true);
    
    ctx.proxyToClientResponse.writeHead(statusCode, headers);
    ctx.proxyToClientResponse.end(errorPage);
    
    logger.log(1, `Sent custom HTML error page for error (${statusCode})`);
}

/**
 * Sends a plain text error response
 * @param {Object} ctx - Proxy context
 * @param {Object} errorInfo - Classified error information
 */
function sendTextErrorResponse(ctx, errorInfo) {
    const { statusCode, errorTitle, errorMessage } = errorInfo;
    const simpleError = `${statusCode} ${errorTitle}: ${errorMessage}`;
    const headers = createErrorHeaders(statusCode, false);
    
    ctx.proxyToClientResponse.writeHead(statusCode, headers);
    ctx.proxyToClientResponse.end(simpleError);
    
    logger.log(1, `Sent simple text error (${statusCode}) - non-HTML request`);
}

/**
 * Sends a basic fallback error response
 * @param {Object} ctx - Proxy context
 */
function sendFallbackErrorResponse(ctx) {
    if (!ctx.proxyToClientResponse.headersSent) {
        ctx.proxyToClientResponse.writeHead(500, {'Content-Type': 'text/plain'});
        ctx.proxyToClientResponse.end('Proxy Error: Unable to process request');
    }
}

/**
 * Sets up global error handlers for the process
 */
function setupGlobalErrorHandlers() {
    process.on('uncaughtException', (err) => {
        logger.error('UNCAUGHT EXCEPTION:', err);
        process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('UNHANDLED REJECTION:', reason);
        process.exit(1);
    });
}

module.exports = {
    handleProxyError,
    logDetailedError,
    sendErrorResponse,
    setupGlobalErrorHandlers
}; 