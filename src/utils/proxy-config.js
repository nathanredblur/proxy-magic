/**
 * Proxy configuration module for Proxy Magic
 * Handles proxy settings and initialization
 */

const path = require('path');
const { logger } = require('./logger');

// Default configuration
const DEFAULT_CONFIG = {
    port: 8080,
    host: '127.0.0.1',
    logLevel: 2,
    statsInterval: 5, // minutes
    caCertDir: '.proxy_certs'
};

/**
 * Gets proxy configuration from environment variables and defaults
 * @returns {Object} - Proxy configuration object
 */
function getProxyConfig() {
    return {
        port: parseInt(process.env.PROXY_PORT || DEFAULT_CONFIG.port, 10),
        host: process.env.PROXY_HOST || DEFAULT_CONFIG.host,
        logLevel: parseInt(process.env.PROXY_LOG_LEVEL || DEFAULT_CONFIG.logLevel, 10),
        statsInterval: parseInt(process.env.PROXY_STATS_INTERVAL || DEFAULT_CONFIG.statsInterval, 10),
        caCertDir: process.env.PROXY_CA_DIR || DEFAULT_CONFIG.caCertDir
    };
}

/**
 * Gets the full path to the CA certificate directory
 * @param {string} baseDir - Base directory (usually __dirname)
 * @param {string} caDirName - CA directory name
 * @returns {string} - Full path to CA directory
 */
function getCaCertPath(baseDir, caDirName = DEFAULT_CONFIG.caCertDir) {
    // Go up one directory from src/ to the project root
    const projectRoot = path.join(baseDir, '..');
    const caDir = path.join(projectRoot, caDirName);
    const caCertPath = path.join(caDir, 'certs', 'ca.pem');
    
    return {
        caDir,
        caCertPath
    };
}

/**
 * Validates proxy configuration
 * @param {Object} config - Configuration to validate
 * @returns {Object} - Validation result
 */
function validateConfig(config) {
    const errors = [];
    const warnings = [];
    
    // Validate port
    if (!config.port || config.port < 1 || config.port > 65535) {
        errors.push(`Invalid port: ${config.port}. Must be between 1 and 65535.`);
    }
    
    // Check for privileged ports
    if (config.port < 1024 && process.getuid && process.getuid() !== 0) {
        warnings.push(`Port ${config.port} is privileged. You may need to run as administrator/root.`);
    }
    
    // Validate host
    if (!config.host || typeof config.host !== 'string') {
        errors.push(`Invalid host: ${config.host}. Must be a valid hostname or IP address.`);
    }
    
    // Validate log level
    if (config.logLevel < 0 || config.logLevel > 2) {
        warnings.push(`Invalid log level: ${config.logLevel}. Should be 0, 1, or 2. Using default.`);
        config.logLevel = DEFAULT_CONFIG.logLevel;
    }
    
    // Validate stats interval
    if (config.statsInterval < 1) {
        warnings.push(`Invalid stats interval: ${config.statsInterval}. Should be >= 1 minute. Using default.`);
        config.statsInterval = DEFAULT_CONFIG.statsInterval;
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        config
    };
}

/**
 * Logs configuration information
 * @param {Object} config - Configuration to log
 * @param {Object} paths - CA paths object
 */
function logConfiguration(config, paths) {
    logger.log(1, '⚙️ ===== PROXY CONFIGURATION =====');
    logger.log(1, `⚙️ Listen Address: ${config.host}:${config.port}`);
    logger.log(1, `⚙️ Log Level: ${config.logLevel}`);
    logger.log(1, `⚙️ Stats Interval: ${config.statsInterval} minutes`);
    logger.log(1, `⚙️ CA Certificate Dir: ${paths.caDir}`);
    logger.log(1, `⚙️ CA Certificate Path: ${paths.caCertPath}`);
    logger.log(1, '⚙️ ================================');
}

/**
 * Gets proxy listen options for http-mitm-proxy
 * @param {Object} config - Proxy configuration
 * @param {string} caDir - CA certificate directory
 * @returns {Object} - Listen options for proxy
 */
function getProxyListenOptions(config, caDir) {
    return {
        host: config.host,
        port: config.port,
        sslCaDir: caDir
    };
}

/**
 * Logs startup information
 * @param {Object} config - Proxy configuration
 * @param {Object} paths - CA paths object
 */
function logStartupInfo(config, paths) {
    logger.log(1, 'Initializing MITM Proxy Server...');
    logger.log(1, 'Please ensure the root CA certificate is generated and trusted.');
    logger.log(1, `The CA certificate (ca.pem) for this proxy will be stored in: ${paths.caCertPath}`);
    
    logConfiguration(config, paths);
}

/**
 * Environment configuration helper
 */
const ENV_HELP = {
    PROXY_PORT: 'Port for the proxy server (default: 8080)',
    PROXY_HOST: 'Host address to bind to (default: 127.0.0.1)',
    PROXY_LOG_LEVEL: 'Logging level: 0=errors only, 1=basic, 2=debug (default: 2)',
    PROXY_STATS_INTERVAL: 'Statistics reporting interval in minutes (default: 5)',
    PROXY_CA_DIR: 'Directory for CA certificates (default: .proxy_certs)'
};

/**
 * Prints environment variable help
 */
function printEnvironmentHelp() {
    logger.log(1, '📋 ===== ENVIRONMENT VARIABLES =====');
    Object.entries(ENV_HELP).forEach(([key, description]) => {
        const currentValue = process.env[key] || 'not set';
        logger.log(1, `📋 ${key}: ${description}`);
        logger.log(1, `📋   Current value: ${currentValue}`);
    });
    logger.log(1, '📋 ==================================');
}

module.exports = {
    getProxyConfig,
    getCaCertPath,
    validateConfig,
    logConfiguration,
    getProxyListenOptions,
    logStartupInfo,
    printEnvironmentHelp,
    DEFAULT_CONFIG
}; 