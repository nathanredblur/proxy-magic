/**
 * Request processor module for Proxy Magic
 * Handles request processing, rule matching and request optimization
 */

const { logger, getLogLevel } = require('./utils/logger');
const { reconstructFullUrl, buildTargetUrl } = require('./utils/url-utils');
const { isInternalRequest, validateRequestOptions } = require('./utils/request-utils');
const { generateCurlCommand, generateCurlToFile } = require('./utils/curl-utils');
const { validateRuleExecution } = require('./utils/rule-validator');
const stats = require('./utils/stats');

/**
 * Processes incoming proxy requests
 * @param {Object} ctx - Proxy context
 * @param {Array} rules - Array of proxy rules
 * @param {Function} callback - Callback function
 */
function processRequest(ctx, rules, callback) {
    const clientReq = ctx.clientToProxyRequest;
    const reqUrl = clientReq.url;
    
    logger.log(2, `[DEBUG onRequest] Intercepting: ${clientReq.method} ${reqUrl}`);
    
    // Update statistics (filter out browser internal requests)
    const isInternal = isInternalRequest(reqUrl);
    
    if (!isInternal) {
        stats.incrementTotalRequests();
        
        // Track unique hosts
        const hostname = clientReq.headers.host;
        if (hostname) {
            stats.addUniqueHost(hostname);
        }
    }
    
    // Log original request details for debugging
    logOriginalRequest(clientReq, ctx);
    
    // Initialize proxyToServerRequestOptions if not already set
    initializeRequestOptions(ctx, clientReq);
    
    // Process rules
    const ruleResult = processRules(ctx, rules, isInternal);
    
    // Post-process based on rule results
    if (ruleResult.processed) {
        postProcessRuleResult(ctx, ruleResult);
    } else {
        processPassThrough(ctx, clientReq, isInternal);
    }
    
    return callback();
}

/**
 * Logs original request information
 * @param {Object} clientReq - Client request
 * @param {Object} ctx - Proxy context
 */
function logOriginalRequest(clientReq, ctx) {
    logger.log(1, `📥 [ORIGINAL REQUEST] Method: ${clientReq.method}, URL: ${clientReq.url}`);
    logger.log(1, `📥 [ORIGINAL REQUEST] Host Header: ${clientReq.headers.host || '[MISSING]'}`);
    logger.log(1, `📥 [ORIGINAL REQUEST] User-Agent: ${clientReq.headers['user-agent'] || '[MISSING]'}`);
    logger.log(1, `📥 [ORIGINAL REQUEST] isSSL: ${ctx.isSSL}`);
}

/**
 * Initializes proxy request options
 * @param {Object} ctx - Proxy context
 * @param {Object} clientReq - Client request
 */
function initializeRequestOptions(ctx, clientReq) {
    if (!ctx.proxyToServerRequestOptions) {
        const parsedUrl = reconstructFullUrl(clientReq, ctx.isSSL);
        if (parsedUrl) {
            ctx.proxyToServerRequestOptions = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (ctx.isSSL ? 443 : 80),
                path: parsedUrl.pathname + (parsedUrl.search || ''),
                method: clientReq.method || 'GET',
                headers: {...clientReq.headers}
            };
            logger.log(2, `[DEBUG onRequest] Initialized proxyToServerRequestOptions for ${parsedUrl.hostname}`);
        }
    }
}

/**
 * Processes rules and returns result
 * @param {Object} ctx - Proxy context
 * @param {Array} rules - Array of rules
 * @param {boolean} isInternal - Whether request is internal
 * @returns {Object} - Processing result
 */
function processRules(ctx, rules, isInternal) {
    const clientReq = ctx.clientToProxyRequest;
    const reqUrl = clientReq.url;
    
    ctx.proxyProcessed = false;
    ctx.matchedRule = null;
    
    try {
        const parsedUrl = reconstructFullUrl(clientReq, ctx.isSSL);
        if (!parsedUrl) {
            logger.log(1, `[onRequest] Could not determine absolute URL for: ${reqUrl}, skipping rule processing.`);
            return { processed: false };
        }
        
        for (const rule of rules) {
            if (rule.match(parsedUrl, clientReq, ctx)) {
                logger.log(1, `🎯 [RULE MATCH] '${rule.name || 'Unnamed Rule'}' → ${reqUrl}`);
                ctx.proxyProcessed = true;
                ctx.matchedRule = rule;
                
                // Only count non-internal requests in statistics
                if (!isInternal) {
                    stats.incrementRulesMatched();
                    stats.addUsedRule(rule.name || 'Unnamed Rule');
                }
                
                if (rule.onRequest) {
                    logger.log(2, `[DEBUG onRequest] Executing onRequest for rule '${rule.name || 'Unnamed Rule'}'`);
                    const ruleResult = rule.onRequest(ctx, parsedUrl);
                    
                    // Check if rule is handling response manually
                    if (ruleResult === false || ctx.isManualResponse) {
                        logger.log(1, `🔧 [MANUAL RESPONSE] Rule '${rule.name}' is handling response manually - skipping proxy processing`);
                        return { processed: true, manual: true };
                    }
                }
                
                return { processed: true, rule, parsedUrl };
            }
        }
        
        return { processed: false, parsedUrl };
        
    } catch (e) {
        logger.error(`[onRequest] Error processing rules for ${reqUrl}:`, e);
        return { processed: false, error: e };
    }
}

/**
 * Post-processes the result after rule execution
 * @param {Object} ctx - Proxy context
 * @param {Object} ruleResult - Rule processing result
 */
function postProcessRuleResult(ctx, ruleResult) {
    if (ruleResult.manual) {
        return; // Rule is handling everything manually
    }
    
    // INTELLIGENT RULE POST-PROCESSING: Auto-fix common rule configuration issues
    if (ctx.proxyToServerRequestOptions && ctx.proxyToServerRequestOptions.hostname) {
        const options = ctx.proxyToServerRequestOptions;
        const originalIsSSL = ctx.isSSL;
        
        // Smart protocol and port handling
        smartProtocolDetection(ctx, options, originalIsSSL);
        
        // Smart host header management
        smartHostHeaderManagement(options, ctx);
        
        // Validate request options
        try {
            validateRequestOptions(options, ctx.clientToProxyRequest);
        } catch (error) {
            logger.error(`🚨 [RULE ERROR] ${error.message}`);
            logger.error(`🚨 [RULE ERROR] Rule '${ctx.matchedRule?.name || 'Unknown'}' may need to be fixed`);
        }
        
        logger.log(2, `[DEBUG onRequest] Rule processed - Host: ${options.headers.host}, SSL: ${ctx.isSSL}, Protocol: ${options.protocol || 'auto'}`);
    } else {
        logger.error(`🚨 [RULE ERROR] Rule processed but proxyToServerRequestOptions is invalid`);
        logger.error(`🚨 [RULE ERROR] Rule '${ctx.matchedRule?.name || 'Unknown'}' may need to be fixed`);
    }
}

/**
 * Smart protocol detection based on port
 * @param {Object} ctx - Proxy context
 * @param {Object} options - Request options
 * @param {boolean} originalIsSSL - Original SSL state
 */
function smartProtocolDetection(ctx, options, originalIsSSL) {
    const port = options.port;
    const hostname = options.hostname;
    
    if (port === 80) {
        ctx.isSSL = false;
        options.protocol = 'http:';
        options.agent = false;
        logger.log(1, `🔧 [AUTO-FIX] Port 80 → HTTP protocol`);
    } else if (port === 443) {
        ctx.isSSL = true;
        options.protocol = 'https:';
        logger.log(1, `🔧 [AUTO-FIX] Port 443 → HTTPS protocol`);
    } else {
        logger.log(1, `⚠️ [AUTO-FIX] Non-standard port ${port}, keeping SSL=${ctx.isSSL}`);
    }
    
    // Update statistics for protocol conversions
    if (originalIsSSL !== ctx.isSSL && ctx.clientToProxyRequest.headers.host && ctx.clientToProxyRequest.headers.host !== hostname) {
        if (originalIsSSL && !ctx.isSSL) {
            stats.incrementHttpsToHttp();
            logger.log(1, `📊 [STATS] HTTPS → HTTP redirection: ${ctx.clientToProxyRequest.headers.host} → ${hostname}:${port}`);
        } else if (!originalIsSSL && ctx.isSSL) {
            stats.incrementHttpToHttps();
            logger.log(1, `📊 [STATS] HTTP → HTTPS redirection: ${ctx.clientToProxyRequest.headers.host} → ${hostname}:${port}`);
        }
    }
}

/**
 * Smart host header management
 * @param {Object} options - Request options
 * @param {Object} ctx - Proxy context for getting original method
 */
function smartHostHeaderManagement(options, ctx) {
    const { hostname, port } = options;
    
    options.headers = options.headers || {};
    
    // Set Host header based on target hostname and port
    if (port === 80 || port === 443) {
        options.headers.host = hostname;
    } else {
        options.headers.host = `${hostname}:${port}`;
    }
    
    // Validate and fix path
    if (!options.path || options.path === 'undefined') {
        options.path = '/';
        logger.log(1, `🔧 [AUTO-FIX] Missing or invalid path → set to '/'`);
    }
    
    // Ensure method is set
    if (!options.method) {
        options.method = ctx.clientToProxyRequest.method || 'GET';
        logger.log(2, `[AUTO-FIX] Missing method → set to '${options.method}'`);
    }
}

/**
 * Processes pass-through requests (no rule matched)
 * @param {Object} ctx - Proxy context
 * @param {Object} clientReq - Client request
 * @param {boolean} isInternal - Whether request is internal
 */
function processPassThrough(ctx, clientReq, isInternal) {
    logger.log(2, `[DEBUG onRequest] No rule matched for ${clientReq.url}. Passing through.`);
    
    if (!isInternal) {
        stats.incrementPassThrough();
    }
    
    // Ensure pass-through requests are properly configured
    configurePassThrough(ctx, clientReq);
}

/**
 * Configures pass-through requests
 * @param {Object} ctx - Proxy context
 * @param {Object} clientReq - Client request
 */
function configurePassThrough(ctx, clientReq) {
    const parsedUrl = reconstructFullUrl(clientReq, ctx.isSSL);
    if (parsedUrl && ctx.proxyToServerRequestOptions) {
        const options = ctx.proxyToServerRequestOptions;
        
        // Ensure all required fields are set
        if (!options.hostname) {
            options.hostname = parsedUrl.hostname;
            logger.log(2, `[DEBUG onRequest] Fixed missing hostname: ${parsedUrl.hostname}`);
        }
        
        if (!options.port) {
            options.port = parsedUrl.port || (ctx.isSSL ? 443 : 80);
            logger.log(2, `[DEBUG onRequest] Fixed missing port: ${options.port}`);
        }
        
        if (!options.path) {
            options.path = parsedUrl.pathname + (parsedUrl.search || '');
            logger.log(2, `[DEBUG onRequest] Fixed missing path: ${options.path}`);
        }
        
        // Handle SSL configuration for pass-through requests
        const port = options.port;
        if (port === 80) {
            ctx.isSSL = false;
            options.protocol = 'http:';
            options.agent = false;
            logger.log(2, `[DEBUG onRequest] Pass-through: Using HTTP for port 80`);
        } else if (port === 443) {
            ctx.isSSL = true;
            options.protocol = 'https:';
            logger.log(2, `[DEBUG onRequest] Pass-through: Using HTTPS for port 443`);
        }
        
        // Ensure headers are set correctly
        options.headers = options.headers || {};
        options.headers.host = parsedUrl.hostname;
        
        logger.log(2, `[DEBUG onRequest] Pass-through configured for: ${parsedUrl.hostname}:${options.port}, SSL: ${ctx.isSSL}`);
    } else {
        logger.error(`[DEBUG onRequest] Could not configure pass-through for ${clientReq.url} - missing parsedUrl or proxyToServerRequestOptions`);
    }
}

/**
 * Logs the final request details
 * @param {Object} ctx - Proxy context
 */
function logFinalRequest(ctx) {
    const options = ctx.proxyToServerRequestOptions;
    if (options && getLogLevel() >= 1) {
        const fullUrl = buildTargetUrl(options.hostname, options.port, options.path);
        
        logger.log(1, '🌐 [FINAL REQUEST] ===== ACTUAL HTTP REQUEST TO TARGET SERVER =====');
        logger.log(1, `🌐 [FINAL REQUEST] Method: ${options.method || 'GET'}`);
        logger.log(1, `🌐 [FINAL REQUEST] URL: ${fullUrl}`);
        logger.log(1, `🌐 [FINAL REQUEST] Host: ${options.hostname}:${options.port}`);
        logger.log(1, `🌐 [FINAL REQUEST] Path: ${options.path}`);
        
        // Log ALL headers for debugging
        logger.log(1, `🌐 [FINAL REQUEST] All Headers:`);
        if (options.headers) {
            Object.entries(options.headers).forEach(([key, value]) => {
                logger.log(1, `🌐 [FINAL REQUEST]   ${key}: ${value}`);
            });
        } else {
            logger.log(1, `🌐 [FINAL REQUEST]   [NO HEADERS]`);
        }
        
        // Check for potential issues
        const issues = [];
        if (!options.hostname) issues.push('Missing hostname');
        if (!options.path) issues.push('Missing path');
        if (options.path === 'undefined') issues.push('Path is literal "undefined"');
        if (!options.headers || !options.headers.host) issues.push('Missing Host header');
        
        if (issues.length > 0) {
            logger.log(1, `🚨 [FINAL REQUEST] POTENTIAL ISSUES: ${issues.join(', ')}`);
        }
        
        // Generate equivalent curl commands
        const curlCommand = generateCurlCommand(options);
        const curlToFile = generateCurlToFile(options);
        
        logger.log(1, `🌐 [FINAL REQUEST] Equivalent curl command (terminal output):`);
        logger.log(1, `🌐 [FINAL REQUEST] ${curlCommand}`);
        logger.log(1, `🌐 [FINAL REQUEST] Or save to file:`);
        logger.log(1, `🌐 [FINAL REQUEST] ${curlToFile}`);
        logger.log(1, '🌐 [FINAL REQUEST] ===============================================');
    }
}

module.exports = {
    processRequest,
    logFinalRequest
}; 