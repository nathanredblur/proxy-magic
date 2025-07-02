#!/usr/bin/env node

/**
 * Proxy Magic - Main Entry Point
 * New modular startup script with UI support
 */

const { main } = require('./src/proxy-server');

/**
 * Parse command line arguments
 * @returns {Object} Parsed arguments
 */
function parseArguments() {
    const args = process.argv.slice(2);
    const config = {
        ui: false,
        chrome: false,
        logLevel: null,
        debug: false
    };
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '--ui') {
            config.ui = true;
        } else if (arg === '--chrome') {
            config.chrome = true;
        } else if (arg === '--debug' || arg === '-d') {
            config.debug = true;
        } else if (arg.startsWith('--log=')) {
            config.logLevel = arg.split('=')[1];
        } else if (arg === '--log' || arg === '-l') {
            config.logLevel = args[++i];
        }
    }
    
    return config;
}

/**
 * Main entry point with argument parsing
 */
async function startProxy() {
    try {
        const config = parseArguments();
        
        // Set debug environment if specified
        if (config.debug) {
            process.env.DEBUG_RULES = 'true';
        }
        
        // Set log level environment if specified
        if (config.logLevel) {
            process.env.LOG_LEVEL = config.logLevel;
        }
        
        // Start the proxy server with configuration
        await main(config);
    } catch (error) {
        console.error('🚨 Fatal error during proxy startup:', error);
        process.exit(1);
    }
}

// Start the proxy server
startProxy().catch(error => {
    console.error('Failed to start proxy:', error);
    process.exit(1);
}); 