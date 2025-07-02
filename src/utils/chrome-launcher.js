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
     * @param {string} url - URL to open
     * @returns {Array} Chrome arguments
     */
    getChromeArgs(url = 'about:blank') {
        return [
            `--proxy-server=http://${this.proxyHost}:${this.proxyPort}`,
            '--no-first-run',
            `--user-data-dir=${this.profileDir}`,
            '--disable-session-crashed-bubble',
            '--disable-background-timer-throttling',
            '--disable-background-mode',
            url
        ];
    }

    /**
     * Launch Chrome with proxy settings
     * @param {string} url - URL to open (default: about:blank)
     * @param {Object} options - Launch options
     * @returns {Promise} Promise that resolves when Chrome starts
     */
    async launchChrome(url = 'about:blank', options = {}) {
        try {
            // Check if Chrome is already running
            if (this.chromeProcess && !this.chromeProcess.killed) {
                logger.log(1, '[CHROME] Chrome is already running');
                return { success: false, message: 'Chrome is already running' };
            }

            const args = this.getChromeArgs(url);
            
            logger.log(1, `[CHROME] Launching Chrome with URL: ${url}`);
            logger.log(2, `[CHROME] Command: ${this.chromePath} ${args.join(' ')}`);

            // Spawn Chrome process
            this.chromeProcess = spawn(this.chromePath, args, {
                detached: true,
                stdio: options.stdio || 'ignore'
            });

            // Handle Chrome process events
            this.chromeProcess.on('error', (error) => {
                logger.error('[CHROME] Failed to start Chrome:', error.message);
                this.chromeProcess = null;
            });

            this.chromeProcess.on('exit', (code, signal) => {
                logger.log(1, `[CHROME] Chrome exited with code: ${code}, signal: ${signal}`);
                this.chromeProcess = null;
            });

            // Unref to allow parent process to exit
            this.chromeProcess.unref();

            return { 
                success: true, 
                message: `Chrome launched with URL: ${url}`,
                pid: this.chromeProcess.pid 
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
     * @param {string} testType - Type of test (httpbin, example, etc.)
     * @returns {Promise} Promise that resolves when Chrome starts
     */
    async launchWithTestUrl(testType = 'httpbin') {
        const testUrls = {
            httpbin: 'http://httpbin.org/',
            example: 'https://example.com',
            google: 'https://google.com',
            localhost: 'http://localhost:3000',
            blank: 'about:blank'
        };

        const url = testUrls[testType] || testUrls.blank;
        return this.launchChrome(url);
    }

    /**
     * Check if Chrome is running
     * @returns {boolean} True if Chrome process is active
     */
    isChromeRunning() {
        return this.chromeProcess && !this.chromeProcess.killed;
    }

    /**
     * Close Chrome if it's running
     * @returns {Promise} Promise that resolves when Chrome is closed
     */
    async closeChrome() {
        return new Promise((resolve) => {
            if (!this.chromeProcess || this.chromeProcess.killed) {
                resolve({ success: true, message: 'Chrome was not running' });
                return;
            }

            logger.log(1, '[CHROME] Closing Chrome...');

            // Set up exit handler
            this.chromeProcess.once('exit', () => {
                this.chromeProcess = null;
                resolve({ success: true, message: 'Chrome closed' });
            });

            // Kill the process
            try {
                this.chromeProcess.kill('SIGTERM');
                
                // Force kill after 5 seconds if it doesn't close gracefully
                setTimeout(() => {
                    if (this.chromeProcess && !this.chromeProcess.killed) {
                        this.chromeProcess.kill('SIGKILL');
                    }
                }, 5000);
            } catch (error) {
                logger.error('[CHROME] Error closing Chrome:', error);
                resolve({ success: false, message: `Error closing Chrome: ${error.message}` });
            }
        });
    }

    /**
     * Get Chrome status information
     * @returns {Object} Chrome status object
     */
    getStatus() {
        return {
            running: this.isChromeRunning(),
            pid: this.chromeProcess ? this.chromeProcess.pid : null,
            proxyUrl: `http://${this.proxyHost}:${this.proxyPort}`,
            profileDir: this.profileDir,
            chromePath: this.chromePath
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