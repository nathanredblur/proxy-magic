#!/usr/bin/env node

/**
 * Proxy Magic - Main Entry Point
 * New modular startup script with UI support
 */

// Disable TLS certificate verification for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const appConfig = require('./utils/app-config');

// Remove dotenv dependency - no longer used

/**
 * Read configuration from file (supports JSON and YAML)
 * @param {string} configPath - Path to configuration file
 * @returns {Object} Configuration object
 */
function readConfigFile(configPath) {
    try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const ext = path.extname(configPath).toLowerCase();
        
        let config;
        if (ext === '.yaml' || ext === '.yml') {
            // Parse YAML file
            config = YAML.parse(configContent);
        } else {
            // Parse JSON file (default)
            config = JSON.parse(configContent);
        }
        
        return config;
    } catch (error) {
        console.error(`❌ Error reading config file ${configPath}:`, error.message);
        if (error.name === 'YAMLParseError') {
            console.error('💡 YAML syntax error. Check your indentation and structure.');
        } else if (error.name === 'SyntaxError') {
            console.error('💡 JSON syntax error. Check your JSON formatting.');
        }
        process.exit(1);
    }
}

/**
 * Parse boolean value from string
 * @param {string} value - String value to parse
 * @returns {boolean} Boolean value
 */
function parseBoolean(value) {
    return value === 'true';
}

/**
 * Parse command line arguments
 * @returns {Object} Parsed arguments
 */
function parseArguments() {
    const args = process.argv.slice(2);
    
    // Configuration accumulator - starts empty, gets populated from files and CLI
    const config = {};
    
    // Step 1: Always try to load global config from current directory first
    // Priority: config.yaml > config.yml > config.json
    const possibleConfigFiles = [
        path.join(process.cwd(), 'config.yaml'),
        path.join(process.cwd(), 'config.yml'),
        path.join(process.cwd(), 'config.json')
    ];
    
    let defaultConfigPath = null;
    for (const configPath of possibleConfigFiles) {
        if (fs.existsSync(configPath)) {
            defaultConfigPath = configPath;
            break;
        }
    }
    
    if (defaultConfigPath) {
        console.log(`📋 Loading global configuration from: ${defaultConfigPath}`);
        const fileConfig = readConfigFile(defaultConfigPath);
        Object.assign(config, fileConfig);
    }
    
    // Step 2: Parse CLI arguments and find --config file
    let explicitConfigFile = null;
    const cliOverrides = {};
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg.startsWith('--config=')) {
            explicitConfigFile = arg.split('=')[1];
        } else if (arg === '--config') {
            explicitConfigFile = args[++i];
        } else if (arg === '--create-cert') {
            cliOverrides.createCert = true;
        } else if (arg.startsWith('--ui=')) {
            cliOverrides.ui = parseBoolean(arg.split('=')[1]);
        } else if (arg === '--ui') {
            cliOverrides.ui = true;
        } else if (arg.startsWith('--chrome=')) {
            cliOverrides.chrome = parseBoolean(arg.split('=')[1]);
        } else if (arg === '--chrome') {
            cliOverrides.chrome = true;
        } else if (arg.startsWith('--debug=')) {
            cliOverrides.debug = parseBoolean(arg.split('=')[1]);
        } else if (arg === '--debug' || arg === '-d') {
            cliOverrides.debug = true;
        } else if (arg.startsWith('--log=')) {
            cliOverrides.logLevel = arg.split('=')[1];
        } else if (arg === '--log' || arg === '-l') {
            cliOverrides.logLevel = args[++i];
        } else if (arg.startsWith('--rules=')) {
            cliOverrides.rulesDir = arg.split('=')[1];
        } else if (arg === '--rules') {
            cliOverrides.rulesDir = args[++i];
        } else if (arg.startsWith('--chrome-url=')) {
            const url = arg.split('=')[1];
            cliOverrides.chromeUrl = url && url.trim() !== '' ? url : null;
        } else if (arg === '--chrome-url') {
            const url = args[++i];
            cliOverrides.chromeUrl = url && url.trim() !== '' ? url : null;
        } else if (arg === '--help' || arg === '-h') {
            showHelp();
            process.exit(0);
        } else {
            console.error(`❌ Unknown argument: ${arg}`);
            console.error('Use --help for usage information');
            process.exit(1);
        }
    }
    
    // Step 3: If explicit config file is specified, load it and merge (overwrites global config)
    if (explicitConfigFile) {
        console.log(`📋 Loading explicit configuration from: ${explicitConfigFile}`);
        const fileConfig = readConfigFile(explicitConfigFile);
        Object.assign(config, fileConfig);
    }
    
    // Step 4: Apply CLI overrides (highest priority)
    Object.assign(config, cliOverrides);
    
    return config;
}

/**
 * Show help information
 */
function showHelp() {
    console.log(`
Proxy Magic - HTTP/HTTPS Proxy with Rule Management

USAGE:
  node src/index.js [OPTIONS]

OPTIONS:
  --config FILE            Path to configuration file (JSON or YAML format)
  --create-cert           Create certificates and exit (useful for setup)
  --ui[=true|false]       Start with Terminal UI (default: false)
  --chrome[=true|false]   Launch Chrome automatically (default: false)
  --debug[=true|false]    Enable debug mode (default: false)
  --log LEVEL, -l         Set log level (0=errors, 1=basic, 2=debug)
  --rules DIR             Rules directory
  --chrome-url URL        Chrome startup URL
  --help, -h              Show this help

CONFIGURATION PRIORITY:
  1. Command line arguments (highest priority)
  2. File specified with --config (overwrites global config)
  3. Global config file (base configuration)
  4. Default values (lowest priority)
  
  The application will automatically look for configuration files in this order:
  - config.yaml (recommended - supports comments)
  - config.yml  (alternative YAML extension)
  - config.json (legacy JSON format)

EXAMPLES:
  node src/index.js                                        # Use default config.yaml if exists
  node src/index.js --config myconfig.yaml                # Use specific YAML config file
  node src/index.js --config myconfig.json                # Use specific JSON config file
  node src/index.js --create-cert                         # Create certificates only
  node src/index.js --ui --chrome                         # Start with UI and Chrome
  node src/index.js --ui=true --chrome=false             # Explicit boolean values
  node src/index.js --rules user-rules --ui              # Use user-rules directory with UI
  node src/index.js --chrome-url https://google.com      # Chrome starts with Google

CONFIGURATION FILE FORMAT:
  YAML format (recommended - supports comments):
  # Proxy Magic Configuration
  ui: true          # Interactive Terminal UI
  chrome: false     # Launch Chrome automatically
  debug: false      # Enable debug mode
  logLevel: "1"     # Log level (0, 1, 2)
  rulesDir: "rules"  # Rules directory
  chromeUrl: null   # Chrome startup URL
  proxy:
    port: 8080      # Proxy server port
    host: "127.0.0.1"  # Bind address
    logLevel: 2     # Internal proxy log level
    statsInterval: 5  # Statistics interval
    caCertDir: ".proxy_certs"  # SSL certificates directory

  JSON format (legacy):
  {"ui": true, "chrome": false, "debug": false, "logLevel": "1", ...}
    `);
}

/**
 * Main entry point with argument parsing
 */
async function startProxy() {
    try {
        const config = parseArguments();
        
        // Initialize the centralized configuration FIRST
        appConfig.initialize(config);
        
        // Import proxy-server after appConfig is initialized
        const { main, createCertificatesOnly } = require('./proxy-server');
        
        // If only creating certificates, do that and exit
        if (config.createCert) {
            console.log('🔐 Creating certificates...');
            await createCertificatesOnly(config);
            console.log('✅ Certificates created successfully');
            process.exit(0);
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