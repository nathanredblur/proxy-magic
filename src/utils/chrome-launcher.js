/**
 * Chrome Launcher Utility
 * Handles launching Chrome with proxy configuration
 */

const { spawn } = require('child_process');
const path = require('path');
const { logger } = require('./logger');
const appConfig = require('./app-config');

// Chrome process tracking
let chromeProcess = null;

/**
 * Get Chrome application path based on platform
 * @returns {string} Chrome executable path
 */
function getChromePath() {
    const platform = process.platform;
    
    switch (platform) {
        case 'darwin': // macOS
            return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        case 'win32': // Windows
            return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        case 'linux': // Linux
            return 'google-chrome';
        default:
            return 'google-chrome';
    }
}

/**
 * Get Chrome command line arguments
 * @param {string|null} url - URL to open (null/undefined for default Chrome behavior)
 * @returns {Array} Chrome arguments
 */
function getChromeArgs(url = null) {
    const proxyConfig = appConfig.getProxyConfig();
    const profileDir = appConfig.getChromeProfileDir();
    
    const baseArgs = [
        `--proxy-server=http://${proxyConfig.host}:${proxyConfig.port}`,
        '--no-first-run',
        `--user-data-dir=${profileDir}`,
        '--disable-session-crashed-bubble',
        '--disable-background-timer-throttling',
        '--disable-background-mode'
    ];
    
    // Only add URL if one is specifically provided
    // This allows Chrome to use its default behavior (last session, homepage, etc.)
    if (url && url.trim() !== '') {
        baseArgs.push(url);
    }
    
    return baseArgs;
}

/**
 * Launch Chrome with proxy settings
 * @param {string|null} url - URL to open (null/undefined for Chrome's default behavior)
 * @param {Object} options - Launch options
 * @returns {Promise} Promise that resolves when Chrome starts
 */
async function launchChrome(url = null, options = {}) {
    try {
        // Check if Chrome is already running
        if (chromeProcess && !chromeProcess.killed) {
            logger.log(1, '[CHROME] Chrome is already running');
            return { success: false, message: 'Chrome is already running' };
        }

        const chromePath = getChromePath();
        const args = getChromeArgs(url);
        
        if (url && url.trim() !== '') {
            logger.log(1, `[CHROME] Launching Chrome with URL: ${url}`);
        } else {
            logger.log(1, '[CHROME] Launching Chrome with default behavior (last session/homepage)');
        }
        logger.log(2, `[CHROME] Command: ${chromePath} ${args.join(' ')}`);

        // Launch Chrome as completely detached process
        // This makes Chrome independent from our Node.js process
        chromeProcess = spawn(chromePath, args, {
            detached: true,    // Make Chrome completely independent
            stdio: 'ignore'    // Ignore all stdio (stdin, stdout, stderr)
        });

        // Immediately unref the process so Node.js doesn't wait for it
        chromeProcess.unref();

        // Don't add ANY event listeners to avoid interference
        // Chrome is now completely fire-and-forget

        const pid = chromeProcess.pid;
        
        // Clear the reference since we don't want to manage Chrome
        chromeProcess = null;

        logger.log(1, `[CHROME] Chrome launched successfully as detached process (PID: ${pid})`);

        const message = url && url.trim() !== '' 
            ? `Chrome launched independently with URL: ${url}`
            : 'Chrome launched independently with default behavior (last session/homepage)';

        return { 
            success: true, 
            message: message,
            pid: pid 
        };

    } catch (error) {
        logger.error('[CHROME] Error launching Chrome:', error);
        return { 
            success: false, 
            message: `Failed to launch Chrome: ${error.message}` 
        };
    }
}

/**
 * Check if Chrome is running
 * Note: Since Chrome runs as detached process, we can't track its status
 * @returns {boolean} Always returns false since we don't track detached processes
 */
function isChromeRunning() {
    // We don't track Chrome status since it runs as detached process
    return false;
}

/**
 * Close Chrome if it's running
 * Note: Since Chrome runs as detached process, we can't close it programmatically
 * @returns {Promise} Promise that resolves immediately
 */
async function closeChrome() {
    return new Promise((resolve) => {
        resolve({ 
            success: false, 
            message: 'Cannot close Chrome - it runs as independent detached process. Close manually.' 
        });
    });
}

/**
 * Get Chrome status information
 * @returns {Object} Chrome status object
 */
function getStatus() {
    const proxyConfig = appConfig.getProxyConfig();
    const profileDir = appConfig.getChromeProfileDir();
    
    return {
        running: false, // Always false since we don't track detached processes
        pid: null,      // No PID available for detached processes
        proxyUrl: `http://${proxyConfig.host}:${proxyConfig.port}`,
        profileDir: profileDir,
        chromePath: getChromePath(),
        mode: 'detached' // Indicate Chrome runs independently
    };
}

module.exports = {
    launchChrome,
    isChromeRunning,
    closeChrome,
    getStatus,
    getChromePath,
    getChromeArgs
}; 