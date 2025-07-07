/**
 * Proxy configuration module for Proxy Magic
 * Handles proxy settings and initialization
 */

const path = require('path');
const { logger } = require('./logger');
const appConfig = require('./app-config');

/**
 * Gets proxy configuration from app config
 * @param {Object} startupConfig - Configuration from startup (file or CLI) - deprecated, use appConfig instead
 * @returns {Object} - Proxy configuration object
 */
function getProxyConfig(startupConfig = {}) {
    return appConfig.getProxyConfig();
}

/**
 * Gets the full path to the CA certificate directory
 * @param {string} baseDir - Base directory (usually __dirname)
 * @param {string} caDirName - CA directory name (optional, uses appConfig if not provided)
 * @returns {string} - Full path to CA directory
 */
function getCaCertPath(baseDir, caDirName = null) {
    const actualCaDirName = caDirName || appConfig.getProxyConfig().caCertDir;
    
    // Go up one directory from src/ to the project root
    const projectRoot = path.join(baseDir, '..');
    const caDir = path.join(projectRoot, actualCaDirName);
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
        config.logLevel = appConfig.getDefaults().proxy.logLevel;
    }
    
    // Validate stats interval
    if (config.statsInterval < 1) {
        warnings.push(`Invalid stats interval: ${config.statsInterval}. Should be >= 1 minute. Using default.`);
        config.statsInterval = appConfig.getDefaults().proxy.statsInterval;
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
 * Configuration help
 */
const CONFIG_HELP = {
    proxy: {
        port: 'Port for the proxy server (default: 8080)',
        host: 'Host address to bind to (default: 127.0.0.1)',
        logLevel: 'Logging level: 0=errors only, 1=basic, 2=debug (default: 2)',
        statsInterval: 'Statistics reporting interval in minutes (default: 5)',
        caCertDir: 'Directory for CA certificates (default: .proxy_certs)'
    }
};

/**
 * Prints configuration help
 */
function printConfigurationHelp() {
    logger.log(1, '📋 ===== CONFIGURATION OPTIONS =====');
    logger.log(1, '📋 proxy.port: Port for the proxy server (default: 8080)');
    logger.log(1, '📋 proxy.host: Host address to bind to (default: 127.0.0.1)');
    logger.log(1, '📋 proxy.logLevel: Logging level: 0=errors only, 1=basic, 2=debug (default: 2)');
    logger.log(1, '📋 proxy.statsInterval: Statistics reporting interval in minutes (default: 5)');
    logger.log(1, '📋 proxy.caCertDir: Directory for CA certificates (default: .proxy_certs)');
    logger.log(1, '📋 ===================================');
}

module.exports = {
    getProxyConfig,
    getCaCertPath,
    validateConfig,
    logConfiguration,
    getProxyListenOptions,
    logStartupInfo,
    printConfigurationHelp
}; 