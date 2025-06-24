const Proxy = require('http-mitm-proxy').Proxy;
const path = require('path');
const rules = require('./rules'); // Import the rules
const { createErrorPage, reconstructFullUrl, getFullUrlString, requestExpectsHtml, generateCurlCommand } = require('./utils'); // Import utility functions

// RULE VALIDATION SYSTEM
function validateRules(rules) {
    logger.log(1, '🔍 Validating proxy rules...');
    
    rules.forEach((rule, index) => {
        const ruleName = rule.name || `Rule #${index + 1}`;
        
        // Check required properties
        if (!rule.match || typeof rule.match !== 'function') {
            logger.error(`🚨 [RULE VALIDATION] ${ruleName}: Missing or invalid 'match' function`);
        }
        
        // Check optional but recommended properties
        if (!rule.name) {
            logger.log(1, `⚠️ [RULE VALIDATION] Rule #${index + 1}: Consider adding a 'name' property for better debugging`);
        }
        
        // Validate onRequest function if present
        if (rule.onRequest && typeof rule.onRequest !== 'function') {
            logger.error(`🚨 [RULE VALIDATION] ${ruleName}: 'onRequest' must be a function`);
        }
        
        // Validate onResponse function if present
        if (rule.onResponse && typeof rule.onResponse !== 'function') {
            logger.error(`🚨 [RULE VALIDATION] ${ruleName}: 'onResponse' must be a function`);
        }
        
        logger.log(2, `✅ [RULE VALIDATION] ${ruleName}: Basic validation passed`);
    });
    
    logger.log(1, `📋 Loaded ${rules.length} proxy rules from ${__dirname}/rules`);
}



// Statistics tracking
const stats = {
    totalRequests: 0,
    httpsToHttp: 0,
    httpToHttps: 0,
    rulesMatched: 0,
    passThrough: 0,
    startTime: Date.now(),
    uniqueHosts: new Set(),
    rulesUsed: new Set()
};

// --- Logging Configuration ---
// 0: No logs (except fatal errors), 1: Basic logs, 2: Debug logs
const LOG_LEVEL = parseInt(process.env.PROXY_LOG_LEVEL || '2', 10);

const logger = {
    log: (level, ...args) => {
        if (LOG_LEVEL >= level) {
            console.log(...args);
        }
    },
    error: (...args) => {
        console.error(...args);
    }
};

// --- Global Error Handlers ---
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  logger.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});

const PROXY_PORT = 8080;

logger.log(2, '[DEBUG] Initializing proxy object...');
const proxy = new Proxy();
logger.log(2, '[DEBUG] Proxy object initialized.');

logger.log(1, 'Initializing MITM Proxy Server...');
logger.log(1, `Log level set to: ${LOG_LEVEL}`);

// Validate rules before starting the proxy
validateRules(rules);

const caDir = path.join(__dirname, '.proxy_certs');
const caCertPath = path.join(caDir, 'certs', 'ca.pem');
logger.log(2, `[DEBUG] CA directory set to: ${caDir}`);

logger.log(1, 'Please ensure the root CA certificate is generated and trusted.');
logger.log(1, `The CA certificate (ca.pem) for this proxy will be stored in: ${caCertPath}`);

proxy.onError(function(ctx, err, errorKind) {
    // CRITICAL: Check if this is a manual response from a rule
    if (ctx && ctx.isManualResponse) {
        logger.log(1, `🔧 [HTTP DEMO] Ignoring proxy error for manual response: ${errorKind} (${err.code})`);
        return; // Don't interfere with manual responses
    }
    
    // Filter out common/expected errors that create noise
    const isCommonError = (
        err.code === 'EPIPE' || 
        err.code === 'ECONNRESET' || 
        err.message.includes('socket hang up')
    );
    
    const isConnectionError = (
        errorKind === 'CLIENT_TO_PROXY_SOCKET_ERROR' || 
        errorKind === 'HTTPS_CLIENT_ERROR'
    );
    
    if (isCommonError && isConnectionError) {
        // Log common connection errors at debug level only
        const url = ctx ? getFullUrlString(ctx) : 'unknown';
        logger.log(2, `[DEBUG] ${errorKind}: ${err.code || err.message} (${url})`);
        return; // Don't process further for common errors
    }
    
    // Log serious errors with full details
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
    
    // Handle specific error types and provide better responses to the client
    if (ctx && ctx.proxyToClientResponse && !ctx.proxyToClientResponse.headersSent) {
        try {
            // Determine error type and create appropriate response
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

            // Check if the request expects HTML content
            const expectsHtml = requestExpectsHtml(ctx.clientToProxyRequest);
            
            if (expectsHtml) {
                // Create a user-friendly HTML error page
                const errorPage = createErrorPage(statusCode, errorTitle, errorMessage, errorDetails, ctx);
                
                ctx.proxyToClientResponse.writeHead(statusCode, {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                });
                ctx.proxyToClientResponse.end(errorPage);
                
                logger.log(1, `Sent custom HTML error page for ${errorKind} error (${statusCode})`);
            } else {
                // Send a simple text error for non-HTML requests
                const simpleError = `${statusCode} ${errorTitle}: ${errorMessage}`;
                
                ctx.proxyToClientResponse.writeHead(statusCode, {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                });
                ctx.proxyToClientResponse.end(simpleError);
                
                logger.log(1, `Sent simple text error for ${errorKind} error (${statusCode}) - non-HTML request`);
            }
        } catch (responseErr) {
            logger.error('Error while sending custom error response:', responseErr);
            // Fallback to simple error
            if (!ctx.proxyToClientResponse.headersSent) {
                ctx.proxyToClientResponse.writeHead(500, {'Content-Type': 'text/plain'});
                ctx.proxyToClientResponse.end('Proxy Error: Unable to process request');
            }
        }
    }
});

proxy.onRequest(function(ctx, callback) {
    const clientReq = ctx.clientToProxyRequest;
    const reqUrl = clientReq.url;
    logger.log(2, `[DEBUG onRequest] Intercepting: ${clientReq.method} ${reqUrl}`);
    
    // Update statistics (filter out browser internal requests)
    const isInternalRequest = (
        reqUrl.includes('googleapis.com') ||
        reqUrl.includes('google.com') ||
        reqUrl.includes('chrome-extension') ||
        reqUrl.includes('moz-extension') ||
        reqUrl.includes('optimizationguide-pa.googleapis.com') ||
        reqUrl.includes('update.googleapis.com') ||
        reqUrl.includes('clientservices.googleapis.com')
    );
    
    if (!isInternalRequest) {
        stats.totalRequests++;
        
        // Track unique hosts
        const hostname = clientReq.headers.host;
        if (hostname) {
            stats.uniqueHosts.add(hostname);
        }
    }
    
    // Log original request details for debugging
    logger.log(1, `📥 [ORIGINAL REQUEST] Method: ${clientReq.method}, URL: ${reqUrl}`);
    logger.log(1, `📥 [ORIGINAL REQUEST] Host Header: ${clientReq.headers.host || '[MISSING]'}`);
    logger.log(1, `📥 [ORIGINAL REQUEST] User-Agent: ${clientReq.headers['user-agent'] || '[MISSING]'}`);
    logger.log(1, `📥 [ORIGINAL REQUEST] isSSL: ${ctx.isSSL}`);

    // CRITICAL FIX: Initialize proxyToServerRequestOptions if not already set
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

    ctx.proxyProcessed = false; // Flag to indicate if any rule processed this request
    ctx.matchedRule = null;     // Store the rule that matched

    try {
        const parsedUrl = reconstructFullUrl(clientReq, ctx.isSSL);
        if (!parsedUrl) {
            logger.log(1, `[onRequest] Could not determine absolute URL for: ${reqUrl}, skipping rule processing.`);
            return callback();
        }
        
        for (const rule of rules) {
            if (rule.match(parsedUrl, clientReq, ctx)) {
                logger.log(1, `🎯 [RULE MATCH] '${rule.name || 'Unnamed Rule'}' → ${reqUrl}`);
                ctx.proxyProcessed = true;
                ctx.matchedRule = rule;
                
                // Only count non-internal requests in statistics
                if (!isInternalRequest) {
                    stats.rulesMatched++;
                    stats.rulesUsed.add(rule.name || 'Unnamed Rule');
                }
                if (rule.onRequest) {
                    logger.log(2, `[DEBUG onRequest] Executing onRequest for rule '${rule.name || 'Unnamed Rule'}'`);
                    const ruleResult = rule.onRequest(ctx, parsedUrl);
                    
                    // Check if rule is handling response manually
                    if (ruleResult === false || ctx.isManualResponse) {
                        logger.log(1, `🔧 [MANUAL RESPONSE] Rule '${rule.name}' is handling response manually - skipping proxy processing`);
                        return; // Don't call callback() - let the rule handle everything
                    }
                }
                
                // INTELLIGENT RULE POST-PROCESSING: Auto-fix common rule configuration issues
                if (ctx.proxyToServerRequestOptions && ctx.proxyToServerRequestOptions.hostname) {
                    const options = ctx.proxyToServerRequestOptions;
                    const originalIsSSL = ctx.isSSL;
                    
                    // Ensure headers are initialized
                    options.headers = options.headers || {};
                    
                    // SMART PORT/PROTOCOL DETECTION AND AUTO-CORRECTION
                    const port = options.port;
                    const hostname = options.hostname;
                    
                    // Smart protocol detection based on port
                    // The key insight: we need to set ctx.isSSL BEFORE the library makes the request
                    if (port === 80) {
                        ctx.isSSL = false;
                        options.protocol = 'http:';
                        options.agent = false; // Use default HTTP agent
                        logger.log(1, `🔧 [AUTO-FIX] Port 80 → HTTP protocol`);
                    } else if (port === 443) {
                        ctx.isSSL = true;
                        options.protocol = 'https:';
                        logger.log(1, `🔧 [AUTO-FIX] Port 443 → HTTPS protocol`);
                    } else {
                        // For non-standard ports, keep original SSL setting but warn
                        logger.log(1, `⚠️ [AUTO-FIX] Non-standard port ${port}, keeping SSL=${ctx.isSSL}`);
                    }
                    
                                        // Update statistics for protocol conversions
                    if (originalIsSSL !== ctx.isSSL && clientReq.headers.host && clientReq.headers.host !== hostname) {
                        if (originalIsSSL && !ctx.isSSL) {
                            stats.httpsToHttp++;
                            logger.log(1, `📊 [STATS] HTTPS → HTTP redirection: ${clientReq.headers.host} → ${hostname}:${port}`);
                        } else if (!originalIsSSL && ctx.isSSL) {
                            stats.httpToHttps++;
                            logger.log(1, `📊 [STATS] HTTP → HTTPS redirection: ${clientReq.headers.host} → ${hostname}:${port}`);
                        }
                    }
                    
                    // SMART HOST HEADER MANAGEMENT
                    // Set Host header based on target hostname and port
                    if (port === 80 || port === 443) {
                        options.headers.host = hostname;
                    } else {
                        options.headers.host = `${hostname}:${port}`;
                    }
                    
                    // INTELLIGENT PATH VALIDATION
                    if (!options.path || options.path === 'undefined') {
                        options.path = '/';
                        logger.log(1, `🔧 [AUTO-FIX] Missing or invalid path → set to '/'`);
                    }
                    
                    // ENSURE METHOD IS SET
                    if (!options.method) {
                        options.method = clientReq.method || 'GET';
                        logger.log(2, `[AUTO-FIX] Missing method → set to '${options.method}'`);
                    }
                    
                    // VALIDATE HOSTNAME
                    if (!hostname || hostname === 'undefined') {
                        logger.error(`🚨 [RULE ERROR] Invalid hostname after rule processing: '${hostname}'`);
                        logger.error(`🚨 [RULE ERROR] Rule '${ctx.matchedRule.name}' may have configuration issues`);
                    }
                    
                    logger.log(2, `[DEBUG onRequest] Rule processed - Host: ${options.headers.host}, SSL: ${ctx.isSSL}, Protocol: ${options.protocol || 'auto'}`);
                } else {
                    logger.error(`🚨 [RULE ERROR] Rule processed but proxyToServerRequestOptions is invalid`);
                    logger.error(`🚨 [RULE ERROR] Rule '${ctx.matchedRule?.name || 'Unknown'}' may need to be fixed`);
                }
                
                break; // Stop after first matching rule
            }
        }

        if (!ctx.proxyProcessed) {
            logger.log(2, `[DEBUG onRequest] No rule matched for ${reqUrl}. Passing through.`);
            
            // Only count non-internal requests in statistics
            if (!isInternalRequest) {
                stats.passThrough++;
            }
            
            // For non-processed requests, ensure all options are correctly set
            const parsedUrl = reconstructFullUrl(clientReq, ctx.isSSL);
            if (parsedUrl && ctx.proxyToServerRequestOptions) {
                // Ensure hostname is set correctly
                if (!ctx.proxyToServerRequestOptions.hostname) {
                    ctx.proxyToServerRequestOptions.hostname = parsedUrl.hostname;
                    logger.log(2, `[DEBUG onRequest] Fixed missing hostname: ${parsedUrl.hostname}`);
                }
                
                // Ensure port is set correctly
                if (!ctx.proxyToServerRequestOptions.port) {
                    ctx.proxyToServerRequestOptions.port = parsedUrl.port || (ctx.isSSL ? 443 : 80);
                    logger.log(2, `[DEBUG onRequest] Fixed missing port: ${ctx.proxyToServerRequestOptions.port}`);
                }
                
                // Ensure path is set correctly
                if (!ctx.proxyToServerRequestOptions.path) {
                    ctx.proxyToServerRequestOptions.path = parsedUrl.pathname + (parsedUrl.search || '');
                    logger.log(2, `[DEBUG onRequest] Fixed missing path: ${ctx.proxyToServerRequestOptions.path}`);
                }
                
                // Handle SSL configuration for pass-through requests
                const port = ctx.proxyToServerRequestOptions.port;
                if (port === 80) {
                    ctx.isSSL = false;
                    ctx.proxyToServerRequestOptions.protocol = 'http:';
                    ctx.proxyToServerRequestOptions.agent = false; // Use default HTTP agent
                    logger.log(2, `[DEBUG onRequest] Pass-through: Using HTTP for port 80`);
                } else if (port === 443) {
                    ctx.isSSL = true;
                    ctx.proxyToServerRequestOptions.protocol = 'https:';
                    logger.log(2, `[DEBUG onRequest] Pass-through: Using HTTPS for port 443`);
                }
                
                // Ensure headers are set correctly
                ctx.proxyToServerRequestOptions.headers = ctx.proxyToServerRequestOptions.headers || {};
                ctx.proxyToServerRequestOptions.headers.host = parsedUrl.hostname;
                logger.log(2, `[DEBUG onRequest] Pass-through configured for: ${parsedUrl.hostname}:${ctx.proxyToServerRequestOptions.port}, SSL: ${ctx.isSSL}`);
            } else {
                logger.error(`[DEBUG onRequest] Could not configure pass-through for ${reqUrl} - missing parsedUrl or proxyToServerRequestOptions`);
            }
        }

    } catch (e) {
        logger.error(`[onRequest] Error processing rules for ${reqUrl}:`, e);
    }

    return callback();
});

// Add detailed logging for the actual HTTP request being made
proxy.onRequestData(function(ctx, chunk, callback) {
    return callback(null, chunk);
});

proxy.onRequestEnd(function(ctx, callback) {
    // Log the final request that will be made to the target server
    const options = ctx.proxyToServerRequestOptions;
    if (options && LOG_LEVEL >= 1) {
        const protocol = options.port === 443 ? 'https' : 'http';
        const port = (options.port === 80 || options.port === 443) ? '' : `:${options.port}`;
        const fullUrl = `${protocol}://${options.hostname}${port}${options.path}`;
        
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
        
        // Generate equivalent curl command
        const curlCommand = generateCurlCommand(options);
        
        // Also generate a version that saves to file for binary/large responses
        const curlToFile = curlCommand.replace('curl -v --compressed', 'curl -v --compressed -o response.html');
        
        logger.log(1, `🌐 [FINAL REQUEST] Equivalent curl command (terminal output):`);
        logger.log(1, `🌐 [FINAL REQUEST] ${curlCommand}`);
        logger.log(1, `🌐 [FINAL REQUEST] Or save to file:`);
        logger.log(1, `🌐 [FINAL REQUEST] ${curlToFile}`);
        logger.log(1, '🌐 [FINAL REQUEST] ===============================================');
    }
    
    return callback();
});

proxy.onResponse(function(ctx, callback) {
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
});

logger.log(2, '[DEBUG] Attempting to start proxy listener...');
proxy.listen({ host: '127.0.0.1', port: PROXY_PORT, sslCaDir: caDir }, (err) => {
    if (err) {
        logger.error('FATAL ERROR starting MITM proxy listener:', err);
        return process.exit(1);
    }
    logger.log(1, `MITM Proxy listening on http://127.0.0.1:${PROXY_PORT}`);
    logger.log(1, 'CA certificate for SSL interception is configured to use path within:', caDir);
    
    // Show statistics every 5 minutes
    setInterval(() => {
        const uptimeMs = Date.now() - stats.startTime;
        const uptimeMinutes = Math.floor(uptimeMs / 60000);
        const uptimeSeconds = Math.floor((uptimeMs % 60000) / 1000);
        
        logger.log(1, '📊 ===== PROXY STATISTICS =====');
        logger.log(1, `📊 Uptime: ${uptimeMinutes}m ${uptimeSeconds}s`);
        logger.log(1, `📊 User Requests: ${stats.totalRequests} (filtering out browser internals)`);
        logger.log(1, `📊 Unique Hosts: ${stats.uniqueHosts.size}`);
        logger.log(1, `📊 Rules Matched: ${stats.rulesMatched}`);
        logger.log(1, `📊 Pass-Through: ${stats.passThrough}`);
        logger.log(1, `📊 HTTPS → HTTP: ${stats.httpsToHttp}`);
        logger.log(1, `📊 HTTP → HTTPS: ${stats.httpToHttps}`);
        if (stats.rulesUsed.size > 0) {
            logger.log(1, `📊 Active Rules: ${Array.from(stats.rulesUsed).join(', ')}`);
        }
        logger.log(1, '📊 ===========================');
    }, 5 * 60 * 1000); // Every 5 minutes
});

process.on('SIGINT', () => {
    logger.log(1, '\nShutting down MITM proxy...');
    
    // Show final statistics
    const uptimeMs = Date.now() - stats.startTime;
    const uptimeMinutes = Math.floor(uptimeMs / 60000);
    const uptimeSeconds = Math.floor((uptimeMs % 60000) / 1000);
    
    logger.log(1, '📊 ===== FINAL PROXY STATISTICS =====');
    logger.log(1, `📊 Total Uptime: ${uptimeMinutes}m ${uptimeSeconds}s`);
    logger.log(1, `📊 User Requests Processed: ${stats.totalRequests} (filtered)`);
    logger.log(1, `📊 Unique Hosts Visited: ${stats.uniqueHosts.size}`);
    if (stats.uniqueHosts.size > 0) {
        logger.log(1, `📊 Hosts: ${Array.from(stats.uniqueHosts).join(', ')}`);
    }
    logger.log(1, `📊 Rules Matched: ${stats.rulesMatched}`);
    logger.log(1, `📊 Pass-Through: ${stats.passThrough}`);
    logger.log(1, `📊 HTTPS → HTTP Redirections: ${stats.httpsToHttp}`);
    logger.log(1, `📊 HTTP → HTTPS Redirections: ${stats.httpToHttps}`);
    if (stats.rulesUsed.size > 0) {
        logger.log(1, `📊 Rules Used: ${Array.from(stats.rulesUsed).join(', ')}`);
    }
    if (stats.totalRequests > 0) {
        const ruleMatchRate = ((stats.rulesMatched / stats.totalRequests) * 100).toFixed(1);
        logger.log(1, `📊 Rule Match Rate: ${ruleMatchRate}%`);
    }
    logger.log(1, '📊 ===================================');
    
    if (proxy) {
        proxy.close(() => {
            logger.log(1, 'MITM Proxy closed.');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});