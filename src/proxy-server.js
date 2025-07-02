/**
 * Proxy Magic - Main Server
 * Refactored and modular MITM proxy server
 */

const Proxy = require('http-mitm-proxy').Proxy;
const path = require('path');
const rules = require('./rule-loader'); // Import the rules loader

// Import our refactored modules
const { logger, initializeLogger } = require('./utils/logger');
const stats = require('./utils/stats');
const { validateRules } = require('./utils/rule-validator');
const { handleProxyError, setupGlobalErrorHandlers } = require('./error-handler');
const { processRequest, logFinalRequest } = require('./request-processor');
const { processResponse, processResponseData, processResponseEnd } = require('./response-processor');
const { 
    getProxyConfig, 
    getCaCertPath, 
    validateConfig, 
    getProxyListenOptions, 
    logStartupInfo 
} = require('./utils/proxy-config');

/**
 * Main proxy server initialization and setup
 */
function startProxyServer() {
    // Initialize logger first
    initializeLogger();
    
    // Setup global error handlers
    setupGlobalErrorHandlers();
    
    // Get and validate configuration
    const config = getProxyConfig();
    const validation = validateConfig(config);
    
    if (!validation.isValid) {
        logger.error('🚨 Configuration errors:');
        validation.errors.forEach(error => logger.error(`  - ${error}`));
        process.exit(1);
    }
    
    if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => logger.warn(`⚠️ ${warning}`));
    }
    
    // Get CA certificate paths
    const paths = getCaCertPath(__dirname, config.caCertDir);
    
    // Log startup information
    logStartupInfo(config, paths);
    
    // Validate rules before starting the proxy
    validateRules(rules);
    
    // Initialize proxy
    const proxy = initializeProxy();
    
    // Setup proxy event handlers
    setupProxyHandlers(proxy);
    
    // Start the proxy server
    startProxy(proxy, config, paths);
}

/**
 * Initializes the MITM proxy object
 * @returns {Proxy} - Initialized proxy object
 */
function initializeProxy() {
    logger.log(2, '[DEBUG] Initializing proxy object...');
    const proxy = new Proxy();
    logger.log(2, '[DEBUG] Proxy object initialized.');
    return proxy;
}

/**
 * Sets up all proxy event handlers
 * @param {Proxy} proxy - The proxy object
 */
function setupProxyHandlers(proxy) {
    // Error handler
    proxy.onError(handleProxyError);
    
    // Request handlers
    proxy.onRequest((ctx, callback) => {
        processRequest(ctx, rules, callback);
    });
    
    proxy.onRequestData((ctx, chunk, callback) => {
        return callback(null, chunk); // Pass through by default
    });
    
    proxy.onRequestEnd((ctx, callback) => {
        logFinalRequest(ctx);
        return callback();
    });
    
    // Response handlers
    proxy.onResponse(processResponse);
    
    proxy.onResponseData(processResponseData);
    
    proxy.onResponseEnd(processResponseEnd);
}

/**
 * Starts the proxy server with the given configuration
 * @param {Proxy} proxy - The proxy object
 * @param {Object} config - Configuration object
 * @param {Object} paths - CA certificate paths
 */
function startProxy(proxy, config, paths) {
    const listenOptions = getProxyListenOptions(config, paths.caDir);
    
    logger.log(2, '[DEBUG] Attempting to start proxy listener...');
    
    proxy.listen(listenOptions, (err) => {
        if (err) {
            logger.error('FATAL ERROR starting MITM proxy listener:', err);
            return process.exit(1);
        }
        
        logger.log(1, `✅ MITM Proxy listening on http://${config.host}:${config.port}`);
        logger.log(1, `📁 CA certificate for SSL interception configured at: ${paths.caDir}`);
        
        // Start periodic statistics reporting
        stats.startPeriodicReporting(config.statsInterval);
        
        // Setup shutdown handlers
        setupShutdownHandlers(proxy);
    });
}

/**
 * Sets up graceful shutdown handlers
 * @param {Proxy} proxy - The proxy object
 */
function setupShutdownHandlers(proxy) {
    const shutdownHandler = () => {
        logger.log(1, '\n🛑 Shutting down MITM proxy...');
        
        // Show final statistics
        stats.logFinalStatistics();
        
        if (proxy) {
            proxy.close(() => {
                logger.log(1, '✅ MITM Proxy closed gracefully.');
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    };
    
    // Handle different shutdown signals
    process.on('SIGINT', shutdownHandler);
    process.on('SIGTERM', shutdownHandler);
    
    // Handle Windows signals
    if (process.platform === 'win32') {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        rl.on('SIGINT', shutdownHandler);
    }
}

/**
 * Main entry point
 */
function main() {
    try {
        startProxyServer();
    } catch (error) {
        logger.error('🚨 Fatal error during proxy startup:', error);
        process.exit(1);
    }
}

// Export for testing or programmatic use
module.exports = {
    startProxyServer,
    initializeProxy,
    setupProxyHandlers,
    startProxy,
    setupShutdownHandlers,
    main
};

// Start the server if this file is run directly
if (require.main === module) {
    main();
} 