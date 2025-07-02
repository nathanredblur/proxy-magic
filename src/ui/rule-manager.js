/**
 * Interactive Rule Manager for Terminal UI
 * Handles rule display, toggling, and management
 */

const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');
const { ruleStateManager } = require('../utils/rule-state');

// Load environment variables
require('dotenv').config();

/**
 * Interactive rule manager class
 */
class RuleManager {
    constructor(rulesDir = null) {
        this.rules = [];
        this.selectedIndex = 0;
        this.initialized = false;
        
        // Rules directory can be overridden by constructor parameter, --rules flag, or .env
        const rawRulesDir = rulesDir || process.env.RULES_DIR || 'rules';
        
        // Handle both relative and absolute paths properly
        if (path.isAbsolute(rawRulesDir)) {
            this.rulesDir = rawRulesDir;
        } else {
            // For relative paths, resolve from current working directory
            this.rulesDir = path.resolve(process.cwd(), rawRulesDir);
        }
        
        // Determine source name for display
        const baseName = path.basename(this.rulesDir);
        if (baseName === 'user-rules' || this.rulesDir.includes('user-rules')) {
            this.sourceName = 'user-rules';
        } else if (baseName === 'rules' || this.rulesDir.includes('/rules')) {
            this.sourceName = 'rules';
        } else {
            this.sourceName = baseName;
        }
        
        // Log the resolved rules directory for debugging (only in debug mode)
        if (process.env.DEBUG_RULES === 'true') {
            console.log(`🔍 [RuleManager] Raw rules dir: "${rawRulesDir}"`);
            console.log(`🔍 [RuleManager] Resolved rules directory: "${this.rulesDir}"`);
            console.log(`🔍 [RuleManager] Source name: "${this.sourceName}"`);
            console.log(`🔍 [RuleManager] Working directory: "${process.cwd()}"`);
        }
    }

    /**
     * Initialize the rule manager
     * Load rules and their states
     */
    async initialize() {
        try {
            await ruleStateManager.initialize();
            await this.loadRules();
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize rule manager:', error);
            this.initialized = false;
        }
    }

    /**
     * Load all rules from the configured rules directory
     */
    async loadRules() {
        this.rules = [];
        
        if (process.env.DEBUG_RULES === 'true') {
            console.log(`🔍 [RuleManager] Starting rule loading from: ${this.rulesDir}`);
            console.log(`🔍 [RuleManager] Directory exists: ${await require('fs-extra').pathExists(this.rulesDir)}`);
        }
        
        // Load rules only from the configured directory (respects RULES_DIR)
        await this.loadRulesFromDirectory(this.rulesDir, this.sourceName);

        if (process.env.DEBUG_RULES === 'true') {
            console.log(`🔍 [RuleManager] Loaded ${this.rules.length} rules total`);
        }

        // Ensure all rules have states
        for (const rule of this.rules) {
            await ruleStateManager.ensureRuleState(rule.filename, true);
        }

        // Sort rules by name for consistent display
        this.rules.sort((a, b) => a.name.localeCompare(b.name));
        
        if (process.env.DEBUG_RULES === 'true') {
            console.log(`🔍 [RuleManager] Final rule count after sorting: ${this.rules.length}`);
            if (this.rules.length > 0) {
                console.log(`🔍 [RuleManager] Rule names: ${this.rules.map(r => r.name).join(', ')}`);
            }
        }
    }

    /**
     * Load rules from a specific directory
     * @param {string} directory - Directory path
     * @param {string} source - Source identifier (rules/user-rules)
     */
    async loadRulesFromDirectory(directory, source) {
        try {
            if (process.env.DEBUG_RULES === 'true') {
                console.log(`🔍 [RuleManager] Loading from directory: ${directory}`);
            }
            
            if (!await fs.pathExists(directory)) {
                if (process.env.DEBUG_RULES === 'true') {
                    console.log(`🔍 [RuleManager] Directory does not exist: ${directory}`);
                }
                return;
            }

            const files = await fs.readdir(directory);
            if (process.env.DEBUG_RULES === 'true') {
                console.log(`🔍 [RuleManager] Found ${files.length} files: ${files.join(', ')}`);
            }
            
            const ruleFiles = files.filter(file => 
                file.endsWith('.js') && 
                file !== 'index.js' && 
                file !== 'types.js'
            );
            
            if (process.env.DEBUG_RULES === 'true') {
                console.log(`🔍 [RuleManager] Filtered to ${ruleFiles.length} rule files: ${ruleFiles.join(', ')}`);
            }

            for (const file of ruleFiles) {
                try {
                    const rulePath = path.join(directory, file);
                    if (process.env.DEBUG_RULES === 'true') {
                        console.log(`🔍 [RuleManager] Loading rule from: ${rulePath}`);
                    }
                    
                    // Clear require cache for hot reloading
                    delete require.cache[require.resolve(rulePath)];
                    
                    const ruleModule = require(rulePath);
                    if (process.env.DEBUG_RULES === 'true') {
                        console.log(`🔍 [RuleManager] Rule module type: ${typeof ruleModule}, name: ${ruleModule?.name || 'unnamed'}`);
                    }
                    
                    if (ruleModule && typeof ruleModule === 'object') {
                        const rule = {
                            filename: file,
                            name: ruleModule.name || file.replace('.js', ''),
                            source: source,
                            path: rulePath,
                            module: ruleModule,
                            lastModified: await this.getFileModificationTime(rulePath)
                        };
                        
                        this.rules.push(rule);
                        if (process.env.DEBUG_RULES === 'true') {
                            console.log(`🔍 [RuleManager] Successfully loaded rule: ${rule.name}`);
                        }
                    } else {
                        if (process.env.DEBUG_RULES === 'true') {
                            console.log(`🔍 [RuleManager] Skipped invalid rule module: ${file}`);
                        }
                    }
                } catch (error) {
                    console.error(`🔍 [RuleManager] Failed to load rule ${file}:`, error.message);
                    if (process.env.DEBUG_RULES === 'true') {
                        console.error(`🔍 [RuleManager] Full error:`, error);
                    }
                }
            }
        } catch (error) {
            console.error(`🔍 [RuleManager] Failed to load rules from ${directory}:`, error);
        }
    }

    /**
     * Get file modification time
     * @param {string} filePath - File path
     * @returns {Date} Modification time
     */
    async getFileModificationTime(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return stats.mtime;
        } catch (error) {
            return new Date();
        }
    }

    /**
     * Get rules with their current states
     * @returns {Array} Rules with states
     */
    getRulesWithStates() {
        return this.rules.map(rule => {
            const state = ruleStateManager.getRuleState(rule.filename);
            return {
                ...rule,
                enabled: state.enabled,
                usageCount: state.usageCount,
                lastModified: state.lastModified
            };
        });
    }

    /**
     * Format rules for display in the UI
     * @returns {Array} Formatted rule strings
     */
    getFormattedRules() {
        const rulesWithStates = this.getRulesWithStates();
        
        return rulesWithStates.map((rule) => {
            const status = rule.enabled ? '✅' : '❌';
            const name = rule.name;
            const source = `[${rule.source}]`;
            const usage = rule.usageCount > 0 ? `(${rule.usageCount} uses)` : '';
            
            // Return plain text without chalk colors - blessed handles styling
            return `${status} ${name} ${source} ${usage}`.trim();
        });
    }

    /**
     * Get the currently selected rule
     * @returns {Object|null} Selected rule or null
     */
    getSelectedRule() {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.rules.length) {
            return this.rules[this.selectedIndex];
        }
        return null;
    }

    /**
     * Move selection up
     */
    selectPrevious() {
        if (this.rules.length > 0) {
            this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        }
    }

    /**
     * Move selection down
     */
    selectNext() {
        if (this.rules.length > 0) {
            this.selectedIndex = Math.min(this.rules.length - 1, this.selectedIndex + 1);
        }
    }

    /**
     * Toggle the enabled state of the selected rule
     * @returns {boolean|null} New enabled state or null if no rule selected
     */
    async toggleSelectedRule() {
        const selectedRule = this.getSelectedRule();
        if (!selectedRule) return null;

        const newState = await ruleStateManager.toggleRule(selectedRule.filename);
        return newState;
    }

    /**
     * Toggle the enabled state of a specific rule
     * @param {string} filename - Rule filename
     * @returns {boolean|null} New enabled state or null if rule not found
     */
    async toggleRule(filename) {
        const rule = this.rules.find(r => r.filename === filename);
        if (!rule) return null;

        const newState = await ruleStateManager.toggleRule(filename);
        return newState;
    }

    /**
     * Get rule details for display
     * @param {Object} rule - Rule object
     * @returns {Array} Array of detail strings
     */
    getRuleDetails(rule) {
        if (!rule) return [];

        const state = ruleStateManager.getRuleState(rule.filename);
        const details = [
            chalk.bold.blue(`Rule: ${rule.name}`),
            chalk.gray(`File: ${rule.filename}`),
            chalk.gray(`Source: ${rule.source}`),
            chalk.gray(`Path: ${rule.path}`),
            '',
            `Status: ${state.enabled ? chalk.green('ENABLED') : chalk.red('DISABLED')}`,
            `Usage Count: ${chalk.cyan(state.usageCount || 0)}`,
            `Last Modified: ${chalk.gray(state.lastModified)}`,
            ''
        ];

        // Add rule description if available
        if (rule.module.description) {
            details.push(`Description: ${rule.module.description}`);
            details.push('');
        }

        // Add match function info
        if (rule.module.match) {
            details.push(chalk.yellow('Match Function:'));
            details.push(chalk.gray(rule.module.match.toString().substring(0, 200) + '...'));
            details.push('');
        }

        // Add handlers info
        const handlers = [];
        if (rule.module.onRequest) handlers.push('onRequest');
        if (rule.module.onResponse) handlers.push('onResponse');
        if (rule.module.onRequestData) handlers.push('onRequestData');
        if (rule.module.onResponseData) handlers.push('onResponseData');

        if (handlers.length > 0) {
            details.push(`Handlers: ${chalk.cyan(handlers.join(', '))}`);
        }

        return details;
    }

    /**
     * Reload all rules
     */
    async reloadRules() {
        await this.loadRules();
        
        // Adjust selected index if needed
        if (this.selectedIndex >= this.rules.length) {
            this.selectedIndex = Math.max(0, this.rules.length - 1);
        }
    }

    /**
     * Get rule statistics
     * @returns {Object} Rule statistics
     */
    getRuleStats() {
        const rulesWithStates = this.getRulesWithStates();
        const enabled = rulesWithStates.filter(rule => rule.enabled).length;
        const disabled = rulesWithStates.length - enabled;
        const totalUsage = rulesWithStates.reduce((sum, rule) => sum + (rule.usageCount || 0), 0);

        return {
            total: rulesWithStates.length,
            enabled,
            disabled,
            totalUsage,
            bySource: this.getStatsBySource(rulesWithStates)
        };
    }

    /**
     * Get statistics by source
     * @param {Array} rulesWithStates - Rules with states
     * @returns {Object} Statistics by source
     */
    getStatsBySource(rulesWithStates) {
        const stats = {};
        
        rulesWithStates.forEach(rule => {
            if (!stats[rule.source]) {
                stats[rule.source] = { total: 0, enabled: 0, disabled: 0 };
            }
            stats[rule.source].total++;
            if (rule.enabled) {
                stats[rule.source].enabled++;
            } else {
                stats[rule.source].disabled++;
            }
        });

        return stats;
    }

    /**
     * Get formatted statistics for display
     * @returns {Array} Formatted statistics strings
     */
    getFormattedStats() {
        const stats = this.getRuleStats();
        const lines = [
            chalk.bold.cyan('📊 Rule Statistics'),
            '',
            `Total Rules: ${chalk.yellow(stats.total)}`,
            `Enabled: ${chalk.green(stats.enabled)}`,
            `Disabled: ${chalk.red(stats.disabled)}`,
            `Total Usage: ${chalk.cyan(stats.totalUsage)}`,
            ''
        ];

        // Add stats by source
        Object.entries(stats.bySource).forEach(([source, sourceStats]) => {
            lines.push(`${source}: ${sourceStats.enabled}/${sourceStats.total} enabled`);
        });

        return lines;
    }

    /**
     * Enable all rules
     */
    async enableAllRules() {
        for (const rule of this.rules) {
            await ruleStateManager.setRuleEnabled(rule.filename, true);
        }
    }

    /**
     * Disable all rules
     */
    async disableAllRules() {
        for (const rule of this.rules) {
            await ruleStateManager.setRuleEnabled(rule.filename, false);
        }
    }

    /**
     * Get enabled rules for the proxy
     * @returns {Array} Array of enabled rule modules
     */
    getEnabledRuleModules() {
        const rulesWithStates = this.getRulesWithStates();
        return rulesWithStates
            .filter(rule => rule.enabled)
            .map(rule => rule.module);
    }

    /**
     * Check if a rule is enabled
     * @param {string} filename - Rule filename
     * @returns {boolean} True if enabled
     */
    isRuleEnabled(filename) {
        const state = ruleStateManager.getRuleState(filename);
        return state.enabled;
    }

    /**
     * Get rule by filename
     * @param {string} filename - Rule filename
     * @returns {Object|null} Rule object or null
     */
    getRuleByFilename(filename) {
        return this.rules.find(rule => rule.filename === filename) || null;
    }

    /**
     * Get rule count information
     * @returns {Object} Rule count object with total, enabled, disabled
     */
    getRuleCount() {
        const rulesWithStates = this.getRulesWithStates();
        const enabled = rulesWithStates.filter(rule => rule.enabled).length;
        
        return {
            total: rulesWithStates.length,
            enabled,
            disabled: rulesWithStates.length - enabled
        };
    }

    /**
     * Get count of enabled rules
     * @returns {number} Number of enabled rules
     */
    getEnabledCount() {
        const rulesWithStates = this.getRulesWithStates();
        return rulesWithStates.filter(rule => rule.enabled).length;
    }

    /**
     * Get all rules (with state information)
     * @returns {Array} All rules with state
     */
    getAllRules() {
        return this.getRulesWithStates();
    }

    /**
     * Get enabled rules for proxy (same as getEnabledRuleModules for compatibility)
     * @returns {Array} Array of enabled rule modules
     */
    getEnabledRules() {
        return this.getEnabledRuleModules();
    }
}

module.exports = {
    RuleManager
}; 