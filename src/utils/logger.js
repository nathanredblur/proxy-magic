/**
 * Logger module for Proxy Magic
 * Handles all logging functionality with configurable levels
 */

// 0: No logs (except fatal errors), 1: Basic logs, 2: Debug logs
const LOG_LEVEL = parseInt(process.env.PROXY_LOG_LEVEL || '2', 10);

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
            console.log(...args);
        }
    },
    
    /**
     * Log an error (always shown)
     * @param {...any} args - Arguments to log
     */
    error: (...args) => {
        console.error(...args);
    },
    
    /**
     * Log debug information (level 2)
     * @param {...any} args - Arguments to log
     */
    debug: (...args) => {
        if (LOG_LEVEL >= 2) {
            console.log('[DEBUG]', ...args);
        }
    },
    
    /**
     * Log basic information (level 1)
     * @param {...any} args - Arguments to log
     */
    info: (...args) => {
        if (LOG_LEVEL >= 1) {
            console.log('[INFO]', ...args);
        }
    },
    
    /**
     * Log warnings (level 1)
     * @param {...any} args - Arguments to log
     */
    warn: (...args) => {
        if (LOG_LEVEL >= 1) {
            console.warn('[WARN]', ...args);
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

module.exports = {
    logger,
    getLogLevel,
    initializeLogger
}; 