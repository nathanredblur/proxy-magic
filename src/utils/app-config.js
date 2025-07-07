/**
 * Application Configuration Manager
 * Centralizes all configuration access across the application
 */

const os = require('os');
const path = require('path');

// Default configuration - single source of truth
const DEFAULT_CONFIG = {
    ui: false,
    chrome: false,
    debug: false,
    logLevel: '1',
    rulesDir: 'rules',
    chromeUrl: null,
    createCert: false,
    configFile: null,
    proxy: {
        port: 8080,
        host: '127.0.0.1',
        logLevel: 2,
        statsInterval: 5,
        caCertDir: path.join(os.homedir(), '.proxy_certs')
    }
};

// Application state
let config = { ...DEFAULT_CONFIG };
let initialized = false;

/**
 * Initialize the configuration
 * @param {Object} userConfig - Configuration object from src/index.js
 */
function initialize(userConfig) {
    // Merge the provided config with defaults
    config = { ...DEFAULT_CONFIG, ...userConfig };
    
    // Ensure proxy object exists and has defaults
    if (!config.proxy) {
        config.proxy = {};
    }
    config.proxy = {
        ...DEFAULT_CONFIG.proxy,
        ...config.proxy
    };
    
    initialized = true;
    
    // Set process.env for backward compatibility where needed
    if (config.debug) {
        process.env.DEBUG_RULES = 'true';
    }
    if (config.logLevel) {
        process.env.LOG_LEVEL = config.logLevel;
    }
}

/**
 * Get the current configuration
 * @returns {Object} Current configuration object
 */
function getConfig() {
    if (!initialized) {
        throw new Error('AppConfig not initialized. Call initialize() first.');
    }
    return config;
}

/**
 * Get a specific configuration value
 * @param {string} key - Configuration key (supports dot notation)
 * @returns {*} Configuration value
 */
function get(key) {
    if (!initialized) {
        throw new Error('AppConfig not initialized. Call initialize() first.');
    }
    
    const keys = key.split('.');
    let value = config;
    
    for (const k of keys) {
        value = value[k];
        if (value === undefined) {
            return undefined;
        }
    }
    
    return value;
}

/**
 * Set a specific configuration value
 * @param {string} key - Configuration key (supports dot notation)
 * @param {*} value - Value to set
 */
function set(key, value) {
    if (!initialized) {
        throw new Error('AppConfig not initialized. Call initialize() first.');
    }
    
    const keys = key.split('.');
    let target = config;
    
    for (let i = 0; i < keys.length - 1; i++) {
        if (!target[keys[i]]) {
            target[keys[i]] = {};
        }
        target = target[keys[i]];
    }
    
    target[keys[keys.length - 1]] = value;
}

/**
 * Check if configuration is initialized
 * @returns {boolean} True if initialized
 */
function isInitialized() {
    return initialized;
}

/**
 * Get rules directory
 * @returns {string} Rules directory path
 */
function getRulesDir() {
    return get('rulesDir');
}

/**
 * Get debug mode
 * @returns {boolean} Debug mode enabled
 */
function isDebugMode() {
    return get('debug') || false;
}

/**
 * Get log level
 * @returns {string} Log level
 */
function getLogLevel() {
    return get('logLevel');
}

/**
 * Get UI mode
 * @returns {boolean} UI mode enabled
 */
function isUIMode() {
    return get('ui') || false;
}

/**
 * Get Chrome mode
 * @returns {boolean} Chrome mode enabled
 */
function isChromeMode() {
    return get('chrome') || false;
}

/**
 * Get Chrome URL
 * @returns {string|null} Chrome startup URL
 */
function getChromeUrl() {
    return get('chromeUrl');
}

/**
 * Get proxy configuration
 * @returns {Object} Proxy configuration
 */
function getProxyConfig() {
    return get('proxy');
}

/**
 * Get default configuration (for reference)
 * @returns {Object} Default configuration object
 */
function getDefaults() {
    return { ...DEFAULT_CONFIG };
}

module.exports = {
    initialize,
    getConfig,
    get,
    set,
    isInitialized,
    getRulesDir,
    isDebugMode,
    getLogLevel,
    isUIMode,
    isChromeMode,
    getChromeUrl,
    getProxyConfig,
    getDefaults
}; 