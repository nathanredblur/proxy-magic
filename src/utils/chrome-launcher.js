/**
 * Chrome Launcher Utility
 * Handles launching Chrome with proxy configuration
 */

const { spawn } = require('child_process');
const path = require('path');
const { logger } = require('./logger');

/**
 * Chrome launcher class
 */
class ChromeLauncher {
    constructor() {
        this.chromeProcess = null;
        this.proxyHost = '127.0.0.1';
        this.proxyPort = 8080;
        this.chromePath = this.getChromePath();
        this.profileDir = path.resolve('.chrome_proxy_profile');
    }

    /**
     * Get Chrome application path based on platform
     * @returns {string} Chrome executable path
     */
    getChromePath() {
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
    getChromeArgs(url = null) {
        const baseArgs = [
            `--proxy-server=http://${this.proxyHost}:${this.proxyPort}`,
            '--no-first-run',
            `--user-data-dir=${this.profileDir}`,
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
    async launchChrome(url = null, options = {}) {
        try {
            // Check if Chrome is already running
            if (this.chromeProcess && !this.chromeProcess.killed) {
                logger.log(1, '[CHROME] Chrome is already running');
                return { success: false, message: 'Chrome is already running' };
            }

            const args = this.getChromeArgs(url);
            
            if (url && url.trim() !== '') {
                logger.log(1, `[CHROME] Launching Chrome with URL: ${url}`);
            } else {
                logger.log(1, '[CHROME] Launching Chrome with default behavior (last session/homepage)');
            }
            logger.log(2, `[CHROME] Command: ${this.chromePath} ${args.join(' ')}`);

            // Launch Chrome as completely detached process
            // This makes Chrome independent from our Node.js process
            this.chromeProcess = spawn(this.chromePath, args, {
                detached: true,    // Make Chrome completely independent
                stdio: 'ignore'    // Ignore all stdio (stdin, stdout, stderr)
            });

            // Immediately unref the process so Node.js doesn't wait for it
            this.chromeProcess.unref();

            // Don't add ANY event listeners to avoid interference
            // Chrome is now completely fire-and-forget

            const pid = this.chromeProcess.pid;
            
            // Clear the reference since we don't want to manage Chrome
            this.chromeProcess = null;

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
     * Launch Chrome with a specific test URL
     * @param {string} testType - Type of test (httpbin, example, etc., or 'default' for Chrome's default behavior)
     * @returns {Promise} Promise that resolves when Chrome starts
     */
    async launchWithTestUrl(testType = 'default') {
        const testUrls = {
            httpbin: 'http://httpbin.org/',
            example: 'https://example.com',
            google: 'https://google.com',
            localhost: 'http://localhost:3000',
            blank: 'about:blank',
            default: null  // Use Chrome's default behavior
        };

        const url = testUrls[testType] !== undefined ? testUrls[testType] : testUrls.default;
        return this.launchChrome(url);
    }

    /**
     * Check if Chrome is running
     * Note: Since Chrome runs as detached process, we can't track its status
     * @returns {boolean} Always returns false since we don't track detached processes
     */
    isChromeRunning() {
        // We don't track Chrome status since it runs as detached process
        return false;
    }

    /**
     * Close Chrome if it's running
     * Note: Since Chrome runs as detached process, we can't close it programmatically
     * @returns {Promise} Promise that resolves immediately
     */
    async closeChrome() {
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
    getStatus() {
        return {
            running: false, // Always false since we don't track detached processes
            pid: null,      // No PID available for detached processes
            proxyUrl: `http://${this.proxyHost}:${this.proxyPort}`,
            profileDir: this.profileDir,
            chromePath: this.chromePath,
            mode: 'detached' // Indicate Chrome runs independently
        };
    }

    /**
     * Set proxy configuration
     * @param {string} host - Proxy host
     * @param {number} port - Proxy port
     */
    setProxyConfig(host = '127.0.0.1', port = 8080) {
        this.proxyHost = host;
        this.proxyPort = port;
    }
}

// Create singleton instance
const chromeLauncher = new ChromeLauncher();

module.exports = {
    chromeLauncher,
    ChromeLauncher
}; 