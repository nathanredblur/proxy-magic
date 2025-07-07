/**
 * Proxy Magic - Main Server
 * Refactored and modular MITM proxy server
 */

const Proxy = require('http-mitm-proxy').Proxy;
const path = require('path');

// Import our refactored modules
const { logger, initializeLogger, setUIInstance, suppressConsoleOutput, removeUIInstance } = require('./utils/logger');
const appConfig = require('./utils/app-config');
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
 * @param {Object} startupConfig - Startup configuration (UI, debug, etc.)
 */
async function startProxyServer(startupConfig = {}) {
    // Log configuration for debugging (only in debug mode)
    if (appConfig.isDebugMode()) {
        console.log(`🔍 [ProxyServer] Configuration:`);
        console.log(`🔍   rulesDir: ${appConfig.getRulesDir()}`);
        console.log(`🔍   chromeUrl: ${appConfig.getChromeUrl()}`);
        console.log(`🔍   UI mode: ${appConfig.isUIMode()}`);
        console.log(`🔍   Chrome mode: ${appConfig.isChromeMode()}`);
        console.log(`🔍   Debug mode: ${appConfig.isDebugMode()}`);
    }
    
    // Initialize UI first if requested to avoid log conflicts
    let terminalUI = null;
    if (startupConfig.ui) {
        // Pre-emptively suppress blessed errors before initialization
        const originalStderrWrite = process.stderr.write;
        process.stderr.write = function(chunk, encoding, callback) {
            const message = chunk.toString();
            if (message.includes('Error on xterm-256color') ||
                message.includes('Setulc:') ||
                message.includes('\\u001b[58::2::') ||
                message.includes('out.push') ||
                message.includes('stack.push') ||
                message.includes('params[0]') ||
                message.includes('var v,') ||
                message.includes('return out.join')) {
                // Suppress blessed terminal errors completely
                if (typeof encoding === 'function') {
                    encoding(null);
                } else if (typeof callback === 'function') {
                    callback(null);
                }
                return true;
            }
            return originalStderrWrite.call(this, chunk, encoding, callback);
        };
        
        try {
            const { TerminalUI } = require('./ui/terminal-ui');
            if (appConfig.isDebugMode()) {
                console.log(`🔍 [ProxyServer] Creating TerminalUI with rulesDir: ${appConfig.getRulesDir()}`);
            }
            terminalUI = new TerminalUI({
                rulesDir: startupConfig.rulesDir,
                chromeUrl: startupConfig.chromeUrl
            });
            await terminalUI.initialize();
            
            // Restore stderr now that UI is initialized
            process.stderr.write = originalStderrWrite;
            
            // Configure logger to redirect to UI immediately
            setUIInstance(terminalUI);
            suppressConsoleOutput(true);
            
            // Suppress blessed.js terminal compatibility errors
            const originalProcessEmit = process.emit;
            process.emit = function(event, error, ...args) {
                if (event === 'uncaughtException' && error && error.message) {
                    const message = error.message.toString();
                    if (message.includes('Error on xterm-256color') ||
                        message.includes('Setulc:') ||
                        message.includes('blessed') ||
                        message.includes('\\u001b[58::2::')) {
                        // Suppress blessed terminal compatibility errors
                        return false;
                    }
                }
                return originalProcessEmit.call(this, event, error, ...args);
            };
            
            // Use UI logging for this message
            terminalUI.logSystem('🎮 Interactive Terminal UI initialized');
            terminalUI.logSystem('📊 Terminal logs redirected to UI interface');
        } catch (error) {
            // Restore stderr in case of failure
            process.stderr.write = originalStderrWrite;
            console.error('Failed to initialize Terminal UI:', error);
            console.error('Continuing without UI...');
        }
    }
    
    // Initialize logger (now routed to UI if available)
    initializeLogger();
    
    // Setup global error handlers
    setupGlobalErrorHandlers();
    
    // Get and validate configuration
    const config = getProxyConfig(startupConfig);
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
    
        // Load rules with state management
    let activeRules = [];
    let proxy = null;
    
    // Create a rule provider function that always returns current rules
    const getRuleProvider = () => {
        if (terminalUI) {
            return () => terminalUI.getEnabledRules();
        } else {
            const staticRules = require('./rule-loader');
            return () => staticRules;
        }
    };
    
    const ruleProvider = getRuleProvider();
    
    if (terminalUI) {
        // Use UI rule manager for enabled rules only
        activeRules = terminalUI.getEnabledRules();
        if (appConfig.isDebugMode()) {
            console.log(`🔍 [ProxyServer] TerminalUI rules loaded: ${activeRules.length} enabled rules`);
        }
        terminalUI.logSystem(`📋 Loaded ${activeRules.length} enabled rules from directory: ${terminalUI.ruleManager.rulesDir}`);
        
        // Initialize proxy
        proxy = initializeProxy();
        
        // Setup dynamic rule reloading callback
        terminalUI.setRulesChangedCallback(async (newRules) => {
            activeRules = newRules;
            terminalUI.logSystem(`🔄 Rules updated - ${activeRules.length} rules now active`);
            terminalUI.logSystem(`📊 Active rules: ${activeRules.map(r => r.filename || 'unnamed').join(', ')}`);
        });
        
        // Setup proxy event handlers with dynamic rule provider
        setupProxyHandlers(proxy, ruleProvider, terminalUI);
    } else {
        // Load rules using the legacy loader for non-UI mode
        const rules = require('./rule-loader');
        activeRules = rules;
        if (appConfig.isDebugMode()) {
            console.log(`🔍 [ProxyServer] Legacy loader rules: ${activeRules.length} rules from ${appConfig.getRulesDir()}`);
        }
        // Validate rules before starting the proxy (non-UI mode)
        validateRules(rules);
        
        // Initialize proxy
        proxy = initializeProxy();
        
        // Setup proxy event handlers
        setupProxyHandlers(proxy, ruleProvider, terminalUI);
    }
    
    // Start the proxy server
    startProxy(proxy, config, paths, terminalUI, startupConfig);
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
 * @param {Function} ruleProvider - Function that returns current active rules
 * @param {TerminalUI} terminalUI - Terminal UI instance (optional)
 */
function setupProxyHandlers(proxy, ruleProvider, terminalUI = null) {
    // Clear existing handlers to avoid duplicates during rule reloading
    if (proxy._eventHandlers) {
        proxy.removeAllListeners();
        delete proxy._eventHandlers;
    }
    proxy._eventHandlers = true;
    
    // Error handler
    proxy.onError((ctx, err, errorKind) => {
        handleProxyError(ctx, err, errorKind);
        if (terminalUI) {
            const url = ctx ? (ctx.clientToProxyRequest ? ctx.clientToProxyRequest.url : 'unknown') : 'unknown';
            terminalUI.logError(`${errorKind}: ${err.message}`, url);
        }
    });
    
    // Request handlers - use dynamic rule provider
    proxy.onRequest((ctx, callback) => {
        const activeRules = ruleProvider(); // Get current rules dynamically
        
        // Debug logging to verify rules are being loaded correctly
        if (terminalUI && ctx.clientToProxyRequest) {
            const method = ctx.clientToProxyRequest.method;
            const url = ctx.clientToProxyRequest.url;
            
            // Only log rule count for the first few requests to avoid spam
            if (!proxy._debugLogCount) proxy._debugLogCount = 0;
            if (proxy._debugLogCount < 3) {
                terminalUI.logSystem(`🔍 Processing ${method} ${url} with ${activeRules.length} active rules`);
                proxy._debugLogCount++;
            }
            
            terminalUI.logRequest(method, url);
        }
        
        processRequest(ctx, activeRules, callback);
    });
    
    proxy.onRequestData((ctx, chunk, callback) => {
        return callback(null, chunk); // Pass through by default
    });
    
    proxy.onRequestEnd((ctx, callback) => {
        logFinalRequest(ctx);
        return callback();
    });
    
    // Response handlers
    proxy.onResponse((ctx, callback) => {
        processResponse(ctx, callback);
        
        // Log response in UI
        if (terminalUI && ctx.clientToProxyRequest && ctx.serverToProxyResponse) {
            const method = ctx.clientToProxyRequest.method;
            const url = ctx.clientToProxyRequest.url;
            const status = ctx.serverToProxyResponse.statusCode;
            terminalUI.logResponse(method, url, status);
        }
    });
    
    proxy.onResponseData(processResponseData);
    
    proxy.onResponseEnd(processResponseEnd);
}

/**
 * Starts the proxy server with the given configuration
 * @param {Proxy} proxy - The proxy object
 * @param {Object} config - Configuration object
 * @param {Object} paths - CA certificate paths
 * @param {TerminalUI} terminalUI - Terminal UI instance (optional)
 * @param {Object} startupConfig - Startup configuration for Chrome, etc.
 */
function startProxy(proxy, config, paths, terminalUI = null, startupConfig = {}) {
    const listenOptions = getProxyListenOptions(config, paths.caDir);
    
    logger.log(2, '[DEBUG] Attempting to start proxy listener...');
    
    proxy.listen(listenOptions, async (err) => {
        if (err) {
            logger.error('FATAL ERROR starting MITM proxy listener:', err);
            if (terminalUI) {
                terminalUI.logError(`Failed to start proxy: ${err.message}`);
            }
            return process.exit(1);
        }
        
        const startupMessage = `✅ MITM Proxy listening on http://${config.host}:${config.port}`;
        const certMessage = `📁 CA certificate for SSL interception configured at: ${paths.caDir}`;
        
        logger.log(1, startupMessage);
        logger.log(1, certMessage);
        
        if (terminalUI) {
            terminalUI.logSystem(startupMessage);
            terminalUI.logSystem(certMessage);
            terminalUI.logSystem(`📁 Loading rules from directory: ${terminalUI.ruleManager.rulesDir}`);
            terminalUI.logSystem('🚀 Proxy server started successfully');
        } else {
            // For non-UI mode, also log the rules directory
            const rulesDir = appConfig.getRulesDir();
            const resolvedRulesDir = require('path').isAbsolute(rulesDir) ? rulesDir : require('path').resolve(process.cwd(), rulesDir);
            logger.log(1, `📁 Loading rules from directory: ${resolvedRulesDir}`);
        }
        
        // Launch Chrome automatically if requested
        if (startupConfig.chrome) {
            try {
                const { launchChrome } = require('./utils/chrome-launcher');
                
                const chromeUrl = startupConfig.chromeUrl;
                
                logger.log(1, '🚀 Launching Chrome browser automatically...');
                if (chromeUrl && chromeUrl.trim() !== '') {
                    logger.log(1, `📍 Starting URL: ${chromeUrl}`);
                } else {
                    logger.log(1, '📍 Using Chrome\'s default behavior (last session/homepage)');
                }
                
                if (terminalUI) {
                    terminalUI.logSystem('🚀 Launching Chrome browser automatically...');
                    terminalUI.logSystem(`📍 Starting URL: ${chromeUrl}`);
                }
                
                const result = await launchChrome(chromeUrl);
                
                if (result.success) {
                    logger.log(1, `✅ Chrome launched: ${result.message}`);
                    logger.log(1, `🌐 Chrome configured with proxy: http://${config.host}:${config.port}`);
                    
                    if (terminalUI) {
                        terminalUI.logSystem(`✅ Chrome launched: ${result.message}`);
                        terminalUI.logSystem(`🌐 Chrome configured with proxy: http://${config.host}:${config.port}`);
                    }
                } else {
                    logger.log(1, `❌ Failed to launch Chrome: ${result.message}`);
                    if (terminalUI) {
                        terminalUI.logSystem(`❌ Failed to launch Chrome: ${result.message}`);
                    }
                }
            } catch (error) {
                logger.error('❌ Error launching Chrome:', error.message);
                if (terminalUI) {
                    terminalUI.logError(`Error launching Chrome: ${error.message}`);
                }
            }
        }
        
        // Start periodic statistics reporting
        stats.startPeriodicReporting(config.statsInterval);
        
        // Setup shutdown handlers
        setupShutdownHandlers(proxy, terminalUI);
    });
}

/**
 * Sets up graceful shutdown handlers
 * @param {Proxy} proxy - The proxy object
 * @param {TerminalUI} terminalUI - Terminal UI instance (optional)
 */
function setupShutdownHandlers(proxy, terminalUI = null) {
    const shutdownHandler = async () => {
        const shutdownMessage = '🛑 Shutting down MITM proxy...';
        
        if (terminalUI) {
            terminalUI.logSystem(shutdownMessage);
            terminalUI.logSystem('🛑 Shutting down proxy server...');
        } else {
            logger.log(1, shutdownMessage);
        }
        
        // Close Chrome first if running (while UI logging is still active)
        const { isChromeRunning, closeChrome } = require('./utils/chrome-launcher');
        if (isChromeRunning()) {
            if (terminalUI) {
                terminalUI.logSystem('🌐 Closing Chrome browser...');
            }
            try {
                await closeChrome();
                if (terminalUI) {
                    terminalUI.logSystem('✅ Chrome closed successfully');
                }
            } catch (error) {
                if (terminalUI) {
                    terminalUI.logError(`Error closing Chrome: ${error.message}`);
                } else {
                    logger.error('Error closing Chrome:', error);
                }
            }
        }
        
        // Show final statistics
        stats.logFinalStatistics();
        
        // Cleanup UI after Chrome is closed
        if (terminalUI) {
            terminalUI.logSystem('🧹 Cleaning up UI...');
            // Small delay to show the message
            setTimeout(() => {
                removeUIInstance();
                terminalUI.cleanup();
                
                // Now close proxy
                if (proxy && proxy.close) {
                    try {
                        proxy.close(() => {
                            console.log('✅ MITM Proxy closed gracefully.');
                            process.exit(0);
                        });
                    } catch (error) {
                        console.error('Error closing proxy:', error);
                        process.exit(1);
                    }
                } else {
                    console.log('✅ MITM Proxy already closed or not available.');
                    process.exit(0);
                }
            }, 100);
        } else {
            if (proxy && proxy.close) {
                try {
                    proxy.close(() => {
                        console.log('✅ MITM Proxy closed gracefully.');
                        process.exit(0);
                    });
                } catch (error) {
                    console.error('Error closing proxy:', error);
                    process.exit(1);
                }
            } else {
                console.log('✅ MITM Proxy already closed or not available.');
                process.exit(0);
            }
        }
    };
    
    // Handle different shutdown signals
    process.on('SIGINT', () => {
        shutdownHandler().catch(error => {
            console.error('Error during shutdown:', error);
            process.exit(1);
        });
    });
    process.on('SIGTERM', () => {
        shutdownHandler().catch(error => {
            console.error('Error during shutdown:', error);
            process.exit(1);
        });
    });
    
    // Handle Windows signals
    if (process.platform === 'win32') {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        rl.on('SIGINT', () => {
            shutdownHandler().catch(error => {
                console.error('Error during shutdown:', error);
                process.exit(1);
            });
        });
    }
}

/**
 * Creates certificates only without starting the proxy server
 * @param {Object} startupConfig - Startup configuration
 */
async function createCertificatesOnly(startupConfig = {}) {
    try {
        // Initialize logger without UI
        initializeLogger();
        
        // Get and validate configuration
        const config = getProxyConfig(startupConfig);
        const validation = validateConfig(config);
        
        if (!validation.isValid) {
            logger.error('🚨 Configuration errors:');
            validation.errors.forEach(error => logger.error(`  - ${error}`));
            throw new Error('Configuration validation failed');
        }
        
        // Get CA certificate paths
        const paths = getCaCertPath(__dirname, config.caCertDir);
        
        logger.log(1, `🔐 Creating certificates in: ${paths.caDir}`);
        
        // Create proxy instance to generate certificates
        const proxy = initializeProxy();
        
        return new Promise((resolve, reject) => {
            const listenOptions = getProxyListenOptions(config, paths.caDir);
            
            proxy.listen(listenOptions, (err) => {
                if (err) {
                    logger.error('Error starting proxy for certificate generation:', err);
                    return reject(err);
                }
                
                logger.log(1, '✅ Certificates generated successfully');
                
                // Close proxy immediately after certificates are generated
                proxy.close(() => {
                    logger.log(1, '🔐 Certificate generation complete');
                    resolve();
                });
            });
        });
    } catch (error) {
        logger.error('🚨 Fatal error during certificate creation:', error);
        throw error;
    }
}

/**
 * Main entry point with UI support
 * @param {Object} config - Configuration options
 */
async function main(config = {}) {
    try {
        await startProxyServer(config);
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
    createCertificatesOnly,
    main
};

// Start the server if this file is run directly
if (require.main === module) {
    main().catch(error => {
        console.error('Failed to start proxy server:', error);
        process.exit(1);
    });
} 