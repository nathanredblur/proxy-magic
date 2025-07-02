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
 * Sets up stderr filtering to prevent Chrome noise from causing crashes
 */
function setupStderrFiltering() {
    const originalWrite = process.stderr.write;
    
    process.stderr.write = function(string, encoding, fd) {
        // Filter out Chrome noise from stderr
        if (typeof string === 'string' && (
            string.includes('Trying to load the allocator multiple times') ||
            string.includes('TensorFlow Lite XNNPACK delegate') ||
            string.includes('Attempting to use a delegate') ||
            string.includes('VoiceTranscriptionCapability') ||
            string.includes('absl::InitializeLog') ||
            string.includes('WARNING: All log messages before')
        )) {
            // Silently suppress Chrome noise
            return true;
        }
        
        // Allow other stderr messages through
        return originalWrite.call(process.stderr, string, encoding, fd);
    };
}

/**
 * Sets up global error handlers for the process
 */
function setupGlobalErrorHandlers() {
    // First setup stderr filtering
    setupStderrFiltering();
    process.on('uncaughtException', (err) => {
        logger.error('UNCAUGHT EXCEPTION:', err);
        
        // Don't exit for blessed/terminal related errors
        if (err.message && (
            err.message.includes('Error on xterm-256color') ||
            err.message.includes('blessed') ||
            err.message.includes('setTermcap') ||
            err.message.includes('Setulc')
        )) {
            logger.error('Ignoring terminal compatibility error');
            return;
        }
        
        // For Chrome/spawn related errors, log but don't exit
        if (err.message && (
            err.message.includes('spawn') ||
            err.message.includes('Chrome') ||
            err.message.includes('ENOENT') ||
            err.message.includes('allocator') ||
            err.message.includes('TensorFlow') ||
            err.message.includes('delegate') ||
            err.message.includes('XNNPACK') ||
            err.message.includes('VoiceTranscription') ||
            err.message.includes('absl::InitializeLog')
        )) {
            logger.error('Ignoring Chrome/spawn related error');
            return;
        }
        
        // Only exit for truly fatal errors
        logger.error('Fatal error detected, shutting down...');
        process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('UNHANDLED REJECTION:', reason);
        
        // Don't exit for Chrome-related promise rejections
        if (reason && reason.message && (
            reason.message.includes('Chrome') ||
            reason.message.includes('spawn') ||
            reason.message.includes('ENOENT') ||
            reason.message.includes('allocator') ||
            reason.message.includes('TensorFlow') ||
            reason.message.includes('delegate') ||
            reason.message.includes('XNNPACK') ||
            reason.message.includes('VoiceTranscription') ||
            reason.message.includes('absl::InitializeLog')
        )) {
            logger.error('Ignoring Chrome-related promise rejection');
            return;
        }
        
        // Only exit for truly fatal promise rejections
        logger.error('Fatal promise rejection, shutting down...');
        process.exit(1);
    });
}

module.exports = {
    handleProxyError,
    logDetailedError,
    sendErrorResponse,
    setupGlobalErrorHandlers,
    setupStderrFiltering
}; 