/**
 * Rule State Management Utilities
 * Handles persistent rule states (enabled/disabled) with auto-save
 */

const fs = require('fs-extra');
const path = require('path');
const { logger } = require('./logger');

// Default configuration
const CONFIG_DIR = path.resolve('config');
const RULES_STATE_FILE = path.join(CONFIG_DIR, 'rules-state.json');

/**
 * Default rule state structure
 * @typedef {Object} RuleState
 * @property {boolean} enabled - Whether the rule is enabled
 * @property {string} lastModified - Last modification timestamp
 * @property {number} usageCount - Number of times the rule has been used
 */

/**
 * Rule state manager class
 */
class RuleStateManager {
    constructor() {
        this.states = {};
        this.initialized = false;
    }

    /**
     * Initialize the rule state manager
     * Creates config directory and loads existing states
     */
    async initialize() {
        try {
            // Ensure config directory exists
            await fs.ensureDir(CONFIG_DIR);
            
            // Load existing states
            await this.loadStates();
            
            this.initialized = true;
            logger.log(2, `[RULE STATE] Initialized with ${Object.keys(this.states).length} rule states`);
        } catch (error) {
            logger.error('Failed to initialize rule state manager:', error);
            this.states = {};
            this.initialized = true;
        }
    }

    /**
     * Load rule states from persistent storage
     */
    async loadStates() {
        try {
            if (await fs.pathExists(RULES_STATE_FILE)) {
                const data = await fs.readJson(RULES_STATE_FILE);
                this.states = data || {};
                logger.log(2, `[RULE STATE] Loaded states for ${Object.keys(this.states).length} rules`);
            } else {
                this.states = {};
                logger.log(2, '[RULE STATE] No existing state file found, starting fresh');
            }
        } catch (error) {
            logger.error('Failed to load rule states:', error);
            this.states = {};
        }
    }

    /**
     * Save rule states to persistent storage
     */
    async saveStates() {
        try {
            await fs.ensureDir(CONFIG_DIR);
            await fs.writeJson(RULES_STATE_FILE, this.states, { spaces: 2 });
            logger.log(2, `[RULE STATE] Saved states for ${Object.keys(this.states).length} rules`);
        } catch (error) {
            logger.error('Failed to save rule states:', error);
        }
    }

    /**
     * Get the state of a rule
     * @param {string} ruleName - Name of the rule file or rule name
     * @returns {RuleState} Rule state object
     */
    getRuleState(ruleName) {
        if (!this.initialized) {
            logger.warn('[RULE STATE] Manager not initialized');
            return this.getDefaultState();
        }

        return this.states[ruleName] || this.getDefaultState();
    }

    /**
     * Set the enabled state of a rule
     * @param {string} ruleName - Name of the rule file or rule name
     * @param {boolean} enabled - Whether the rule should be enabled
     */
    async setRuleEnabled(ruleName, enabled) {
        if (!this.initialized) {
            await this.initialize();
        }

        const currentState = this.getRuleState(ruleName);
        this.states[ruleName] = {
            ...currentState,
            enabled,
            lastModified: new Date().toISOString()
        };

        // Auto-save
        await this.saveStates();
        
        logger.log(1, `[RULE STATE] ${ruleName}: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    /**
     * Toggle the enabled state of a rule
     * @param {string} ruleName - Name of the rule file or rule name
     * @returns {boolean} New enabled state
     */
    async toggleRule(ruleName) {
        const currentState = this.getRuleState(ruleName);
        const newEnabled = !currentState.enabled;
        await this.setRuleEnabled(ruleName, newEnabled);
        return newEnabled;
    }

    /**
     * Increment usage count for a rule
     * @param {string} ruleName - Name of the rule file or rule name
     */
    async incrementUsage(ruleName) {
        if (!this.initialized) {
            await this.initialize();
        }

        const currentState = this.getRuleState(ruleName);
        this.states[ruleName] = {
            ...currentState,
            usageCount: (currentState.usageCount || 0) + 1,
            lastModified: new Date().toISOString()
        };

        // Save periodically, not on every increment to avoid too much I/O
        if (currentState.usageCount % 10 === 0) {
            await this.saveStates();
        }
    }

    /**
     * Get all rule states
     * @returns {Object} All rule states
     */
    getAllStates() {
        return { ...this.states };
    }

    /**
     * Get enabled rules only
     * @returns {string[]} Array of enabled rule names
     */
    getEnabledRules() {
        return Object.keys(this.states).filter(ruleName => 
            this.states[ruleName].enabled
        );
    }

    /**
     * Get disabled rules only
     * @returns {string[]} Array of disabled rule names
     */
    getDisabledRules() {
        return Object.keys(this.states).filter(ruleName => 
            !this.states[ruleName].enabled
        );
    }

    /**
     * Initialize rule state if it doesn't exist
     * @param {string} ruleName - Name of the rule
     * @param {boolean} defaultEnabled - Default enabled state
     */
    async ensureRuleState(ruleName, defaultEnabled = true) {
        if (!this.states[ruleName]) {
            this.states[ruleName] = {
                enabled: defaultEnabled,
                lastModified: new Date().toISOString(),
                usageCount: 0
            };
            await this.saveStates();
        }
    }

    /**
     * Get default rule state
     * @returns {RuleState} Default state object
     */
    getDefaultState() {
        return {
            enabled: true,
            lastModified: new Date().toISOString(),
            usageCount: 0
        };
    }

    /**
     * Reset all rule states
     */
    async resetAllStates() {
        this.states = {};
        await this.saveStates();
        logger.log(1, '[RULE STATE] All rule states reset');
    }

    /**
     * Get statistics about rule usage
     * @returns {Object} Usage statistics
     */
    getUsageStats() {
        const allStates = Object.values(this.states);
        const enabledCount = allStates.filter(state => state.enabled).length;
        const totalUsage = allStates.reduce((sum, state) => sum + (state.usageCount || 0), 0);
        
        return {
            totalRules: allStates.length,
            enabledRules: enabledCount,
            disabledRules: allStates.length - enabledCount,
            totalUsage
        };
    }
}

// Create singleton instance
const ruleStateManager = new RuleStateManager();

module.exports = {
    ruleStateManager,
    RuleStateManager
}; 