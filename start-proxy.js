#!/usr/bin/env node

/**
 * Proxy Magic - Main Entry Point
 * New modular startup script with UI support
 */

const { main } = require('./src/proxy-server');

// Load environment variables
require('dotenv').config();

/**
 * Parse command line arguments with .env defaults
 * @returns {Object} Parsed arguments
 */
function parseArguments() {
    const args = process.argv.slice(2);
    
    // Load defaults from .env
    const config = {
        ui: process.env.DEFAULT_UI === 'true',
        chrome: process.env.DEFAULT_CHROME === 'true',
        debug: process.env.DEFAULT_DEBUG === 'true',
        logLevel: process.env.LOG_LEVEL || null,
        rulesDir: process.env.RULES_DIR || null,
        chromeUrl: process.env.CHROME_START_URL || null  // null means use Chrome's default behavior
    };
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '--ui') {
            config.ui = true;
        } else if (arg === '--no-ui') {
            config.ui = false;
        } else if (arg === '--chrome') {
            config.chrome = true;
        } else if (arg === '--no-chrome') {
            config.chrome = false;
        } else if (arg === '--debug' || arg === '-d') {
            config.debug = true;
        } else if (arg === '--no-debug') {
            config.debug = false;
        } else if (arg.startsWith('--log=')) {
            config.logLevel = arg.split('=')[1];
        } else if (arg === '--log' || arg === '-l') {
            config.logLevel = args[++i];
        } else if (arg.startsWith('--rules=')) {
            config.rulesDir = arg.split('=')[1];
        } else if (arg === '--rules') {
            config.rulesDir = args[++i];
        } else if (arg.startsWith('--chrome-url=')) {
            const url = arg.split('=')[1];
            config.chromeUrl = url && url.trim() !== '' ? url : null;
        } else if (arg === '--chrome-url') {
            const url = args[++i];
            config.chromeUrl = url && url.trim() !== '' ? url : null;
        } else if (arg === '--help' || arg === '-h') {
            showHelp();
            process.exit(0);
        }
    }
    
    return config;
}

/**
 * Show help information
 */
function showHelp() {
    console.log(`
Proxy Magic - HTTP/HTTPS Proxy with Rule Management

USAGE:
  node start-proxy.js [OPTIONS]

OPTIONS:
  --ui                 Start with Terminal UI (default from .env: ${process.env.DEFAULT_UI || 'false'})
  --no-ui              Disable Terminal UI
  --chrome             Launch Chrome automatically (default from .env: ${process.env.DEFAULT_CHROME || 'false'})
  --no-chrome          Don't launch Chrome
  --debug, -d          Enable debug mode (default from .env: ${process.env.DEFAULT_DEBUG || 'false'})
  --no-debug           Disable debug mode
  --log LEVEL, -l      Set log level (default from .env: ${process.env.LOG_LEVEL || '1'})
  --rules DIR          Rules directory (default from .env: ${process.env.RULES_DIR || 'rules'})
  --chrome-url URL     Chrome startup URL (empty = Chrome's default behavior, from .env: ${process.env.CHROME_START_URL || 'default behavior'})
  --help, -h           Show this help

EXAMPLES:
  node start-proxy.js --ui --chrome                    # Start with UI and Chrome
  node start-proxy.js --rules user-rules --ui         # Use user-rules directory with UI
  node start-proxy.js --chrome-url https://google.com # Chrome starts with Google
  node start-proxy.js --no-ui --no-chrome            # Headless mode

CONFIGURATION:
  Settings can be configured in .env file:
  - DEFAULT_UI=true/false
  - DEFAULT_CHROME=true/false  
  - DEFAULT_DEBUG=true/false
  - RULES_DIR=user-rules
  - CHROME_START_URL=  (empty for Chrome's default behavior)
  - LOG_LEVEL=1
    `);
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