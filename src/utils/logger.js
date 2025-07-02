/**
 * Logger module for Proxy Magic
 * Handles all logging functionality with configurable levels
 */

// 0: No logs (except fatal errors), 1: Basic logs, 2: Debug logs
const LOG_LEVEL = parseInt(process.env.PROXY_LOG_LEVEL || '2', 10);

// UI interceptor for logs
let uiInstance = null;
let suppressConsole = false;

/**
 * Logger object with level-based logging
 */
const logger = {
    /**
     * Log a message at the specified level
     * @param {number} level - Log level (0-2)
     * @param {...any} args - Arguments to log
     */
    log: (level, ...args) => {
        if (LOG_LEVEL >= level) {
            const message = args.join(' ');
            
            if (uiInstance && suppressConsole) {
                // Send to UI instead of console
                uiInstance.logSystem(message);
            } else {
                // Normal console output
                console.log(...args);
            }
        }
    },
    
    /**
     * Log an error (always shown)
     * @param {...any} args - Arguments to log
     */
    error: (...args) => {
        const message = args.join(' ');
        
        if (uiInstance && suppressConsole) {
            // Send to UI instead of console
            uiInstance.logError(message);
        } else {
            // Normal console output
            console.error(...args);
        }
    },
    
    /**
     * Log debug information (level 2)
     * @param {...any} args - Arguments to log
     */
    debug: (...args) => {
        if (LOG_LEVEL >= 2) {
            const message = ['[DEBUG]', ...args].join(' ');
            
            if (uiInstance && suppressConsole) {
                // Send to UI instead of console
                uiInstance.logSystem(message);
            } else {
                // Normal console output
                console.log('[DEBUG]', ...args);
            }
        }
    },
    
    /**
     * Log basic information (level 1)
     * @param {...any} args - Arguments to log
     */
    info: (...args) => {
        if (LOG_LEVEL >= 1) {
            const message = ['[INFO]', ...args].join(' ');
            
            if (uiInstance && suppressConsole) {
                // Send to UI instead of console
                uiInstance.logSystem(message);
            } else {
                // Normal console output
                console.log('[INFO]', ...args);
            }
        }
    },
    
    /**
     * Log warnings (level 1)
     * @param {...any} args - Arguments to log
     */
    warn: (...args) => {
        if (LOG_LEVEL >= 1) {
            const message = ['[WARN]', ...args].join(' ');
            
            if (uiInstance && suppressConsole) {
                // Send to UI instead of console
                uiInstance.logSystem(message);
            } else {
                // Normal console output
                console.warn('[WARN]', ...args);
            }
        }
    }
};

/**
 * Get current log level
 * @returns {number} - Current log level
 */
function getLogLevel() {
    return LOG_LEVEL;
}

/**
 * Initialize logger and display configuration
 */
function initializeLogger() {
    logger.info(`Log level set to: ${LOG_LEVEL}`);
    logger.debug('Debug logging enabled');
}

/**
 * Set UI instance to intercept logs
 * @param {Object} ui - UI instance with logging methods
 */
function setUIInstance(ui) {
    uiInstance = ui;
}

/**
 * Enable or disable console suppression
 * @param {boolean} suppress - Whether to suppress console output
 */
function suppressConsoleOutput(suppress = true) {
    suppressConsole = suppress;
    if (suppress && uiInstance) {
        // Store original console methods
        logger._originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn
        };
        
        // Store original stdout/stderr methods
        logger._originalStdout = {
            write: process.stdout.write.bind(process.stdout)
        };
        
        logger._originalStderr = {
            write: process.stderr.write.bind(process.stderr)
        };
        
        // Suppress direct console calls
        console.log = (...args) => {
            if (uiInstance) {
                uiInstance.logSystem(args.join(' '));
            }
        };
        
        console.error = (...args) => {
            if (uiInstance) {
                uiInstance.logError(args.join(' '));
            }
        };
        
        console.warn = (...args) => {
            if (uiInstance) {
                uiInstance.logSystem('[WARN] ' + args.join(' '));
            }
        };
        
        // Intercept stdout.write to catch http-mitm-proxy logs (but not blessed.js)
        process.stdout.write = function(chunk, encoding, callback) {
            if (uiInstance && typeof chunk === 'string') {
                const message = chunk.toString();
                
                // Allow blessed.js control sequences to pass through
                if (message.includes('\x1b[') || // ANSI escape sequences
                    message.includes('\u001b[') || // Unicode escape sequences
                    message.includes('\x1b[') || // Hex escape sequences
                    message.length < 10 || // Very short writes (cursor control)
                    !message.includes('\n')) { // Non-complete lines (UI rendering)
                    return logger._originalStdout.write(chunk, encoding, callback);
                }
                
                const trimmed = message.trim();
                // Only intercept specific proxy messages that are complete lines
                if (trimmed.includes('https server started for') ||
                    trimmed.includes('starting server for') ||
                    trimmed.includes('server started for') ||
                    trimmed.includes('http server created') ||
                    trimmed.includes('connection established')) {
                    // Suppress these specific proxy messages
                    if (typeof encoding === 'function') {
                        encoding(null);
                    } else if (typeof callback === 'function') {
                        callback(null);
                    }
                    return true;
                }
                
                // Let everything else pass through normally
                return logger._originalStdout.write(chunk, encoding, callback);
            }
            return logger._originalStdout.write(chunk, encoding, callback);
        };
        
        // Intercept stderr.write to catch error messages
        process.stderr.write = function(chunk, encoding, callback) {
            if (uiInstance && typeof chunk === 'string') {
                const message = chunk.toString().trim();
                
                // Filter out blessed.js terminal compatibility errors
                if (message.includes('Error on xterm-256color') ||
                    message.includes('Setulc:') ||
                    message.includes('blessed') ||
                    message.includes('\\u001b[58::2::') ||
                    message.includes('out.push') ||
                    message.includes('stack.push') ||
                    message.includes('params[0]')) {
                    // Suppress blessed terminal errors
                    if (typeof encoding === 'function') {
                        encoding(null);
                    } else if (typeof callback === 'function') {
                        callback(null);
                    }
                    return true;
                }
                
                // Show other meaningful errors in UI
                if (message && message.length > 3) {
                    uiInstance.logError(message);
                }
                
                // Handle callback properly
                if (typeof encoding === 'function') {
                    encoding(null);
                } else if (typeof callback === 'function') {
                    callback(null);
                }
                return true;
            }
            return logger._originalStderr.write(chunk, encoding, callback);
        };
        
    } else if (!suppress && logger._originalConsole) {
        // Restore original console methods
        console.log = logger._originalConsole.log;
        console.error = logger._originalConsole.error;
        console.warn = logger._originalConsole.warn;
        delete logger._originalConsole;
        
        // Restore original stdout/stderr methods
        if (logger._originalStdout) {
            process.stdout.write = logger._originalStdout.write;
            delete logger._originalStdout;
        }
        
        if (logger._originalStderr) {
            process.stderr.write = logger._originalStderr.write;
            delete logger._originalStderr;
        }
    }
}

/**
 * Remove UI instance and restore console
 */
function removeUIInstance() {
    suppressConsoleOutput(false);
    uiInstance = null;
    suppressConsole = false;
}

module.exports = {
    logger,
    getLogLevel,
    initializeLogger,
    setUIInstance,
    suppressConsoleOutput,
    removeUIInstance
}; 