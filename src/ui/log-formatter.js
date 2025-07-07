/**
 * Log Formatter for Terminal UI
 * Handles color-coded log formatting, filtering, and display
 */

const chalk = require('chalk');

/**
 * Log entry types
 */
const LOG_TYPES = {
    REQUEST: 'REQUEST',
    RESPONSE: 'RESPONSE',
    ERROR: 'ERROR',
    RULE: 'RULE',
    SYSTEM: 'SYSTEM',
    STATS: 'STATS'
};

/**
 * Log formatter class
 */
class LogFormatter {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000; // Keep last 1000 logs
        this.filters = {
            types: new Set(), // Empty = show all
            domains: new Set(), // Empty = show all
            rules: new Set() // Empty = show all
        };
    }

    /**
     * Add a log entry
     * @param {string} message - Log message
     * @param {string} type - Log type (REQUEST, RESPONSE, ERROR, etc.)
     * @param {Object} metadata - Additional metadata
     */
    addLog(message, type = LOG_TYPES.SYSTEM, metadata = {}) {
        const logEntry = {
            timestamp: new Date(),
            message,
            type,
            metadata,
            id: Date.now() + Math.random()
        };

        this.logs.push(logEntry);

        // Keep only recent logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        return logEntry;
    }

    /**
     * Format a log entry for display
     * @param {Object} logEntry - Log entry object
     * @returns {string} Formatted log string
     */
    formatLogEntry(logEntry) {
        const { timestamp, message, type, metadata } = logEntry;
        const timeStr = this.formatTimestamp(timestamp);
        const typeStr = this.formatLogType(type);
        
        let formattedMessage = message;
        
        // Add metadata if available
        if (metadata.url) {
            formattedMessage += ` ${chalk.cyan(metadata.url)}`;
        }
        
        if (metadata.rule) {
            formattedMessage += ` ${chalk.magenta(`[${metadata.rule}]`)}`;
        }
        
        if (metadata.status) {
            const statusColor = this.getStatusColor(metadata.status);
            formattedMessage += ` ${statusColor(metadata.status)}`;
        }

        return `${timeStr} ${typeStr} ${formattedMessage}`;
    }

    /**
     * Format timestamp for display
     * @param {Date} timestamp - Timestamp to format
     * @returns {string} Formatted timestamp
     */
    formatTimestamp(timestamp) {
        const time = timestamp.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        return chalk.blue(time);
    }

    /**
     * Format log type with colors
     * @param {string} type - Log type
     * @returns {string} Colored log type
     */
    formatLogType(type) {
        const colors = {
            [LOG_TYPES.REQUEST]: chalk.blue,
            [LOG_TYPES.RESPONSE]: chalk.green,
            [LOG_TYPES.ERROR]: chalk.red,
            [LOG_TYPES.RULE]: chalk.magenta,
            [LOG_TYPES.SYSTEM]: chalk.yellow,
            [LOG_TYPES.STATS]: chalk.cyan
        };

        const color = colors[type] || chalk.white;
        return color(`[${type.padEnd(8)}]`);
    }

    /**
     * Get color for HTTP status code
     * @param {number} status - HTTP status code
     * @returns {Function} Chalk color function
     */
    getStatusColor(status) {
        if (status >= 200 && status < 300) return chalk.green;
        if (status >= 300 && status < 400) return chalk.yellow;
        if (status >= 400 && status < 500) return chalk.red;
        if (status >= 500) return chalk.redBright;
        return chalk.white;
    }

    /**
     * Get filtered logs based on current filters
     * @returns {Array} Filtered log entries
     */
    getFilteredLogs() {
        return this.logs.filter(log => {
            // Filter by type
            if (this.filters.types.size > 0 && !this.filters.types.has(log.type)) {
                return false;
            }

            // Filter by domain
            if (this.filters.domains.size > 0 && log.metadata.domain) {
                const matchesDomain = Array.from(this.filters.domains).some(domain =>
                    log.metadata.domain.includes(domain)
                );
                if (!matchesDomain) return false;
            }

            // Filter by rule
            if (this.filters.rules.size > 0 && log.metadata.rule) {
                if (!this.filters.rules.has(log.metadata.rule)) {
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Get formatted logs for display
     * @param {number} limit - Maximum number of logs to return
     * @returns {Array} Array of formatted log strings
     */
    getFormattedLogs(limit = 100) {
        const filteredLogs = this.getFilteredLogs();
        const recentLogs = filteredLogs.slice(-limit);
        return recentLogs.map(log => this.formatLogEntry(log));
    }

    /**
     * Add filter by type
     * @param {string} type - Log type to filter
     */
    addTypeFilter(type) {
        this.filters.types.add(type);
    }

    /**
     * Remove filter by type
     * @param {string} type - Log type to remove from filter
     */
    removeTypeFilter(type) {
        this.filters.types.delete(type);
    }

    /**
     * Add filter by domain
     * @param {string} domain - Domain to filter
     */
    addDomainFilter(domain) {
        this.filters.domains.add(domain);
    }

    /**
     * Remove filter by domain
     * @param {string} domain - Domain to remove from filter
     */
    removeDomainFilter(domain) {
        this.filters.domains.delete(domain);
    }

    /**
     * Add filter by rule
     * @param {string} rule - Rule name to filter
     */
    addRuleFilter(rule) {
        this.filters.rules.add(rule);
    }

    /**
     * Remove filter by rule
     * @param {string} rule - Rule name to remove from filter
     */
    removeRuleFilter(rule) {
        this.filters.rules.delete(rule);
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        this.filters.types.clear();
        this.filters.domains.clear();
        this.filters.rules.clear();
    }

    /**
     * Get current filter status
     * @returns {Object} Current filters
     */
    getFilterStatus() {
        return {
            types: Array.from(this.filters.types),
            domains: Array.from(this.filters.domains),
            rules: Array.from(this.filters.rules),
            hasFilters: this.filters.types.size > 0 || 
                       this.filters.domains.size > 0 || 
                       this.filters.rules.size > 0
        };
    }

    /**
     * Clear all logs
     */
    clearLogs() {
        this.logs = [];
    }

    /**
     * Get log statistics
     * @returns {Object} Log statistics
     */
    getLogStats() {
        const stats = {
            total: this.logs.length,
            byType: {}
        };

        // Count by type
        this.logs.forEach(log => {
            stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
        });

        return stats;
    }

    /**
     * Format a request log
     * @param {string} method - HTTP method
     * @param {string} url - Request URL
     * @param {string} rule - Rule name (optional)
     * @returns {Object} Log entry
     */
    logRequest(method, url, rule = null) {
        const message = `${method} ${url}`;
        const metadata = { 
            url, 
            method, 
            rule,
            domain: this.extractDomain(url)
        };
        return this.addLog(message, LOG_TYPES.REQUEST, metadata);
    }

    /**
     * Format a response log
     * @param {string} method - HTTP method
     * @param {string} url - Request URL
     * @param {number} status - HTTP status code
     * @param {string} rule - Rule name (optional)
     * @returns {Object} Log entry
     */
    logResponse(method, url, status, rule = null) {
        const message = `${method} ${url} ${status}`;
        const metadata = { 
            url, 
            method, 
            status, 
            rule,
            domain: this.extractDomain(url)
        };
        return this.addLog(message, LOG_TYPES.RESPONSE, metadata);
    }

    /**
     * Format an error log
     * @param {string} error - Error message
     * @param {string} url - URL where error occurred (optional)
     * @returns {Object} Log entry
     */
    logError(error, url = null) {
        const metadata = { 
            error,
            url,
            domain: url ? this.extractDomain(url) : null
        };
        return this.addLog(error, LOG_TYPES.ERROR, metadata);
    }

    /**
     * Format a rule activity log
     * @param {string} ruleName - Rule name
     * @param {string} action - Action performed
     * @param {string} url - URL (optional)
     * @returns {Object} Log entry
     */
    logRuleActivity(ruleName, action, url = null) {
        const message = `${ruleName}: ${action}`;
        const metadata = { 
            rule: ruleName, 
            action,
            url,
            domain: url ? this.extractDomain(url) : null
        };
        return this.addLog(message, LOG_TYPES.RULE, metadata);
    }

    /**
     * Format a system log
     * @param {string} message - System message
     * @returns {Object} Log entry
     */
    logSystem(message) {
        return this.addLog(message, LOG_TYPES.SYSTEM);
    }

    /**
     * Extract domain from URL
     * @param {string} url - URL to extract domain from
     * @returns {string|null} Domain or null if extraction fails
     */
    extractDomain(url) {
        try {
            if (url.startsWith('http')) {
                return new URL(url).hostname;
            } else {
                // Handle relative URLs or host headers
                const parts = url.split('/');
                return parts[0].split(':')[0];
            }
        } catch (e) {
            return null;
        }
    }

    /**
     * Get total log count
     * @returns {number} Total number of logs
     */
    getLogCount() {
        return this.logs.length;
    }
}

module.exports = {
    LogFormatter,
    LOG_TYPES
}; 