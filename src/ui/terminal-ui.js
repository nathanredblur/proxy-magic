/**
 * Terminal UI for Proxy Magic
 * Interactive terminal interface with split panels for logs and rules
 */

const blessed = require('blessed');
const contrib = require('blessed-contrib');
const chalk = require('chalk');
const { LogFormatter, LOG_TYPES } = require('./log-formatter');
const { RuleManager } = require('./rule-manager');
const { chromeLauncher } = require('../utils/chrome-launcher');

/**
 * Terminal UI class
 */
class TerminalUI {
    constructor(options = {}) {
        this.screen = null;
        this.logBox = null;
        this.ruleBox = null;
        this.statusBar = null;
        this.helpBox = null;
        this.detailBox = null;
        
        this.logFormatter = new LogFormatter();
        this.ruleManager = new RuleManager(options.rulesDir);
        
        this.currentPanel = 'logs'; // 'logs' or 'rules'
        this.showHelp = false;
        this.showDetails = false;
        
        this.refreshInterval = null;
        this.initialized = false;
        
        // Store configuration  
        this.chromeUrl = options.chromeUrl || null;  // null = use Chrome's default behavior
    }

    /**
     * Initialize the terminal UI
     */
    async initialize() {
        try {
            await this.ruleManager.initialize();
            this.createScreen();
            this.createPanels();
            this.setupKeyHandlers();
            this.startRefreshTimer();
            this.initialized = true;
            
            this.logFormatter.logSystem('🎮 Interactive Terminal UI started');
            this.logFormatter.logSystem('Press F1 for help, b to launch browser, q to quit');
            
            this.render();
        } catch (error) {
            console.error('Failed to initialize Terminal UI:', error);
            throw error;
        }
    }

    /**
     * Create the main screen
     */
    createScreen() {
        // Set environment variable to force simple color mode
        process.env.TERM = 'xterm';
        
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'Proxy Magic - Interactive UI',
            dockBorders: true,
            fullUnicode: false,
            autoPadding: true,
            debug: false,
            warnings: false,
            sendFocus: false,
            useBCE: false,
            terminal: 'xterm', // Force simple terminal type
            ignoreLocked: true
        });
        
        // Handle screen resize
        this.screen.on('resize', () => {
            this.render();
        });
        
        // Suppress blessed errors and warnings
        this.screen.on('warning', (warning) => {
            // Silently ignore blessed warnings
        });
        
        this.screen.on('error', (error) => {
            // Silently ignore blessed errors
        });
    }

    /**
     * Create UI panels
     */
    createPanels() {
        // Main container
        const container = blessed.box({
            parent: this.screen,
            top: 0,
            left: 0,
            width: '100%',
            height: '100%-1',
            border: 'line',
            style: {
                border: { fg: 'cyan' }
            }
        });

        // Log panel (top 70%)
        this.logBox = blessed.log({
            parent: container,
            label: ' 📜 Logs ',
            top: 0,
            left: 0,
            width: '100%',
            height: '70%',
            border: 'line',
            style: {
                border: { fg: this.currentPanel === 'logs' ? 'yellow' : 'gray' }
            },
            tags: true,
            mouse: true,
            scrollable: true,
            alwaysScroll: true,
            scrollbar: {
                ch: ' ',
                track: {
                    bg: 'gray'
                },
                style: {
                    inverse: true
                }
            }
        });

        // Rule panel (bottom 30%)
        this.ruleBox = blessed.list({
            parent: container,
            label: ' ⚙️  Rules ',
            top: '70%',
            left: 0,
            width: '100%',
            height: '30%',
            border: 'line',
            style: {
                border: { fg: this.currentPanel === 'rules' ? 'yellow' : 'gray' },
                selected: { 
                    bg: 'blue', 
                    fg: 'white',
                    bold: true
                },
                item: { 
                    fg: 'white',
                },
                focus: {
                    border: { fg: 'yellow' }
                }
            },
            tags: false, // Disable tags to avoid color conflicts
            mouse: true,
            keys: true, // Keep keys for native navigation
            vi: false, // Disable vi mode to avoid conflicts
            scrollable: true,
            interactive: true,
            scrollbar: {
                ch: ' ',
                track: {
                    bg: 'gray'
                },
                style: {
                    inverse: true
                }
            }
        });

        // Status bar
        this.statusBar = blessed.box({
            parent: this.screen,
            bottom: 0,
            left: 0,
            width: '100%',
            height: 1,
            content: this.getStatusText(),
            style: {
                bg: 'blue',
                fg: 'white'
            },
            tags: true
        });

        // Help overlay (hidden by default)
        this.helpBox = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '80%',
            height: '80%',
            border: 'line',
            style: {
                border: { fg: 'yellow' },
                bg: 'black',
                fg: 'white'
            },
            content: this.getHelpText(),
            tags: true,
            hidden: true,
            scrollable: true
        });

        // Detail overlay (hidden by default)
        this.detailBox = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '90%',
            height: '90%',
            border: 'line',
            style: {
                border: { fg: 'cyan' },
                bg: 'black',
                fg: 'white'
            },
            tags: true,
            hidden: true,
            scrollable: true,
            scrollbar: {
                ch: ' ',
                track: {
                    bg: 'gray'
                },
                style: {
                    inverse: true
                }
            }
        });
    }

    /**
     * Setup keyboard event handlers
     */
    setupKeyHandlers() {
        // Global key handlers
        this.screen.key(['q', 'C-c'], () => {
            this.cleanup();
            process.exit(0);
        });

        this.screen.key(['F1', '?'], () => {
            this.toggleHelp();
        });

        this.screen.key(['tab'], () => {
            if (!this.showHelp && !this.showDetails) {
                this.switchPanel();
            }
        });

        this.screen.key(['escape'], () => {
            this.hideOverlays();
        });

        // Chrome launcher
        this.screen.key(['b'], async () => {
            await this.launchChrome();
        });

        // Log panel actions
        this.screen.key(['c'], () => {
            if (this.currentPanel === 'logs') {
                this.clearLogs();
            }
        });

        this.screen.key(['f'], () => {
            this.showFilterDialog();
        });

        // Rule panel actions
        this.screen.key(['r'], async () => {
            await this.reloadRules();
        });

        this.screen.key([' ', 'space'], async () => {
            if (this.currentPanel === 'rules') {
                await this.toggleSelectedRule();
            }
        });

        this.screen.key(['enter'], () => {
            if (this.currentPanel === 'rules') {
                this.showRuleDetails();
            }
        });

        // Navigation keys - let blessed handle native navigation
        this.screen.key(['pageup'], () => {
            if (this.currentPanel === 'logs') {
                this.logBox.scroll(-10);
                this.render();
            }
        });

        this.screen.key(['pagedown'], () => {
            if (this.currentPanel === 'logs') {
                this.logBox.scroll(10);
                this.render();
            }
        });

        // Setup rule box specific events
        this.ruleBox.on('select', (item, index) => {
            // Handle selection change if needed
            this.render();
        });

        // Handle panel focus on click
        this.logBox.on('click', () => {
            if (this.currentPanel !== 'logs') {
                this.currentPanel = 'logs';
                this.updatePanelBorders();
                this.focusCurrentPanel();
                this.render();
            }
        });

        this.ruleBox.on('click', () => {
            if (this.currentPanel !== 'rules') {
                this.currentPanel = 'rules';
                this.updatePanelBorders();
                this.focusCurrentPanel();
                this.render();
            }
        });
    }

    /**
     * Start the refresh timer
     */
    startRefreshTimer() {
        this.refreshInterval = setInterval(() => {
            this.updatePanels();
        }, 1000);
    }

    /**
     * Update panels with fresh data
     */
    updatePanels() {
        this.updateLogPanel();
        this.updateRulePanel();
        this.updateStatusBar();
        this.render();
    }

    /**
     * Update the log panel
     */
    updateLogPanel() {
        // Get new logs since last update
        const allLogs = this.logFormatter.getFormattedLogs();
        
        // Clear and repopulate to avoid UI glitches
        if (allLogs.length > 0) {
            // Keep the logBox structure intact
            const content = allLogs.join('\n');
            if (content !== this.logBox.content) {
                this.logBox.setContent(content);
                // Auto-scroll to bottom
                this.logBox.setScrollPerc(100);
            }
        }
    }

    /**
     * Update the rule panel
     */
    updateRulePanel() {
        const rules = this.ruleManager.getFormattedRules();
        const currentSelection = this.ruleBox.selected || 0;
        
        this.ruleBox.setItems(rules);
        
        // Preserve selection if valid
        if (currentSelection < rules.length) {
            this.ruleBox.select(currentSelection);
        }
    }

    /**
     * Update the status bar
     */
    updateStatusBar() {
        this.statusBar.setContent(this.getStatusText());
    }

    /**
     * Get status bar text
     */
    getStatusText() {
        // Chrome runs independently, so we show it as independent
        const chromeStatus = chalk.blue('🌐 Chrome: Independent');
        
        const rulesCount = this.ruleManager.getRuleCount();
        const enabledCount = this.ruleManager.getEnabledCount();
        
        const panelCommands = this.currentPanel === 'rules' 
            ? 'Space=Toggle | Enter=Details | r=Reload'
            : 'c=Clear | f=Filter';
        
        return `${chromeStatus} | ` +
               `📋 Panel: ${this.currentPanel.toUpperCase()} | ` +
               `📦 Rules: ${enabledCount}/${rulesCount.total} enabled | ` +
               `📜 Logs: ${this.logFormatter.getLogCount()} | ` +
               `${panelCommands} | F1=Help | b=Chrome | q=Quit`;
    }

    /**
     * Get help text content
     */
    getHelpText() {
        return `
{center}{bold}🎮 Proxy Magic - Terminal UI Help{/bold}{/center}

{bold}NAVIGATION:{/bold}
  Tab              Switch between Log and Rule panels
  Click            Click on panels to switch focus
  ↑/↓ Arrow Keys   Navigate through rules
  Page Up/Down     Scroll logs

{bold}GENERAL COMMANDS:{/bold}
  F1 or ?          Show/hide this help
  q or Ctrl+C      Quit application
  Esc              Close overlays (help, details)
  b                Launch Chrome browser with proxy

{bold}LOG PANEL COMMANDS:{/bold}
  c                Clear all logs
  f                Show filter options (coming soon)

{bold}RULE PANEL COMMANDS:{/bold}
  Space            Toggle rule on/off (IMMEDIATE EFFECT)
  Enter            Show rule details
  r                Reload all rules from disk

{bold}RULE STATUS INDICATORS:{/bold}
  ✅ Enabled rule   Rule is active and will process requests
  ❌ Disabled rule  Rule is inactive and will be ignored
  [rules]          System rule from rules/ directory
  [user-rules]     User rule from user-rules/ directory

{bold}LOG TYPES:{/bold}
  📝 Request       Incoming HTTP request
  📤 Response      Outgoing HTTP response  
  ❌ Error         Error or warning message
  ⚙️  Rule         Rule activation/deactivation
  📊 System        System status message

{center}{bold}Press Esc to close this help{/bold}{/center}
        `;
    }

    /**
     * Switch between panels
     */
    switchPanel() {
        this.currentPanel = this.currentPanel === 'logs' ? 'rules' : 'logs';
        this.updatePanelBorders();
        this.focusCurrentPanel();
        this.render();
    }

    /**
     * Update panel border colors based on current panel
     */
    updatePanelBorders() {
        this.logBox.style.border.fg = this.currentPanel === 'logs' ? 'yellow' : 'gray';
        this.ruleBox.style.border.fg = this.currentPanel === 'rules' ? 'yellow' : 'gray';
    }

    /**
     * Toggle help overlay
     */
    toggleHelp() {
        this.showHelp = !this.showHelp;
        
        if (this.showHelp) {
            this.helpBox.show();
            this.helpBox.focus();
        } else {
            this.helpBox.hide();
            this.focusCurrentPanel();
        }
        
        this.render();
    }

    /**
     * Hide all overlays
     */
    hideOverlays() {
        if (this.showHelp) {
            this.showHelp = false;
            this.helpBox.hide();
        }
        
        if (this.showDetails) {
            this.showDetails = false;
            this.detailBox.hide();
        }
        
        this.focusCurrentPanel();
        this.render();
    }

    /**
     * Focus the current panel
     */
    focusCurrentPanel() {
        if (this.currentPanel === 'logs') {
            this.logBox.focus();
        } else {
            this.ruleBox.focus();
            // Ensure there's a selection
            if (this.ruleBox.items.length > 0 && this.ruleBox.selected === -1) {
                this.ruleBox.select(0);
            }
        }
    }

    /**
     * Clear all logs
     */
    clearLogs() {
        this.logFormatter.clearLogs();
        this.logBox.setContent('');
        this.logFormatter.logSystem('📜 Logs cleared');
        // Force update to show the new log message
        this.updateLogPanel();
        this.render();
    }

    /**
     * Launch Chrome browser
     */
    async launchChrome() {
        try {
            this.logFormatter.logSystem('🚀 Launching Chrome browser as independent process...');
            if (this.chromeUrl && this.chromeUrl.trim() !== '') {
                this.logFormatter.logSystem(`📍 Starting URL: ${this.chromeUrl}`);
            } else {
                this.logFormatter.logSystem('📍 Using Chrome\'s default behavior (last session/homepage)');
            }
            
            const result = await chromeLauncher.launchChrome(this.chromeUrl);
            
            if (result.success) {
                this.logFormatter.logSystem(`✅ ${result.message}`);
                this.logFormatter.logSystem('🌐 Chrome runs independently with proxy: http://127.0.0.1:8080');
                this.logFormatter.logSystem('ℹ️ Chrome will not affect proxy stability');
            } else {
                this.logFormatter.logSystem(`❌ ${result.message}`);
            }
        } catch (error) {
            this.logFormatter.logSystem(`❌ Error launching Chrome: ${error.message}`);
        }
        
        this.render();
    }

    /**
     * Reload rules
     */
    async reloadRules() {
        try {
            this.logFormatter.logSystem('🔄 Reloading rules from disk...');
            await this.ruleManager.reloadRules();
            this.logFormatter.logSystem('📋 Rules reloaded, updating proxy...');
            
            // Trigger immediate rule reload in proxy
            await this.reloadProxyRules();
            
            this.logFormatter.logSystem('✅ Rules and proxy updated successfully');
            this.updateRulePanel();
        } catch (error) {
            this.logFormatter.logSystem(`❌ Error reloading rules: ${error.message}`);
        }
        this.render();
    }

    /**
     * Toggle the selected rule
     */
    async toggleSelectedRule() {
        try {
            const selectedIndex = this.ruleBox.selected;
            const rules = this.ruleManager.getAllRules();
            
            if (selectedIndex >= 0 && selectedIndex < rules.length) {
                const rule = rules[selectedIndex];
                const oldState = rule.enabled;
                const newState = await this.ruleManager.toggleRule(rule.filename);
                const status = newState ? 'enabled' : 'disabled';
                
                this.logFormatter.logRuleActivity(rule.filename, `Rule ${status} (${oldState ? 'ON' : 'OFF'} → ${newState ? 'ON' : 'OFF'})`);
                this.logFormatter.logSystem(`🔄 Updating proxy rules for immediate effect...`);
                
                // Get current rule counts
                const enabledRules = this.ruleManager.getEnabledRuleModules();
                this.logFormatter.logSystem(`📊 Currently active rules: ${enabledRules.length}`);
                
                // Trigger immediate rule reload in proxy
                await this.reloadProxyRules();
                
                this.logFormatter.logSystem(`✅ Rule toggle complete - next request will use updated rules`);
                this.updateRulePanel();
            }
        } catch (error) {
            this.logFormatter.logSystem(`❌ Error toggling rule: ${error.message}`);
        }
        this.render();
    }

    /**
     * Reload proxy rules for immediate effect
     */
    async reloadProxyRules() {
        if (this.onRulesChanged) {
            try {
                // Get the updated enabled rules
                const enabledRules = this.ruleManager.getEnabledRuleModules();
                // Call the callback to update proxy
                await this.onRulesChanged(enabledRules);
            } catch (error) {
                this.logFormatter.logSystem(`❌ Error reloading proxy rules: ${error.message}`);
            }
        }
    }

    /**
     * Set callback for when rules change
     */
    setRulesChangedCallback(callback) {
        this.onRulesChanged = callback;
    }

    /**
     * Show rule details overlay
     */
    showRuleDetails() {
        const selectedIndex = this.ruleBox.selected;
        const rules = this.ruleManager.getAllRules();
        
        if (selectedIndex >= 0 && selectedIndex < rules.length) {
            const rule = rules[selectedIndex];
            
            const details = `
{center}{bold}📋 Rule Details{/bold}{/center}

{bold}Filename:{/bold} ${rule.filename}
{bold}Status:{/bold} ${rule.enabled ? chalk.green('🟢 Enabled') : chalk.red('🔴 Disabled')}
{bold}Path:{/bold} ${rule.path}

{bold}Description:{/bold}
${rule.description || 'No description available'}

{bold}Last Modified:{/bold} ${rule.lastModified || 'Unknown'}

{center}Press Esc to close{/center}
            `;
            
            this.detailBox.setContent(details);
            this.detailBox.show();
            this.detailBox.focus();
            this.showDetails = true;
            this.render();
        }
    }

    /**
     * Show filter dialog (placeholder)
     */
    showFilterDialog() {
        this.logFormatter.logSystem('🔍 Filter dialog coming soon...');
        this.render();
    }

    /**
     * Add a log entry
     */
    addLog(message, type = LOG_TYPES.SYSTEM, metadata = {}) {
        this.logFormatter.addLog(message, type, metadata);
    }

    /**
     * Log a request
     */
    logRequest(method, url, rule = null) {
        this.logFormatter.logRequest(method, url, rule);
    }

    /**
     * Log a response
     */
    logResponse(method, url, status, rule = null) {
        this.logFormatter.logResponse(method, url, status, rule);
    }

    /**
     * Log an error
     */
    logError(error, url = null) {
        this.logFormatter.logError(error, url);
    }

    /**
     * Log rule activity
     */
    logRuleActivity(ruleName, action, url = null) {
        this.logFormatter.logRuleActivity(ruleName, action, url);
    }

    /**
     * Log system message
     */
    logSystem(message) {
        this.logFormatter.logSystem(message);
    }

    /**
     * Get enabled rules
     */
    getEnabledRules() {
        return this.ruleManager.getEnabledRules();
    }

    /**
     * Check if rule is enabled
     */
    isRuleEnabled(filename) {
        return this.ruleManager.isRuleEnabled(filename);
    }

    /**
     * Render the screen
     */
    render() {
        if (this.screen && this.initialized) {
            this.screen.render();
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        if (this.screen) {
            this.screen.destroy();
        }
        
        // Note: Chrome closing and console restoration is handled by the shutdown handler
        // to ensure proper order and avoid race conditions
        
        this.initialized = false;
    }

    /**
     * Check if UI is initialized
     */
    isInitialized() {
        return this.initialized;
    }
}

module.exports = { TerminalUI }; 