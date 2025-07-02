/**
 * Statistics tracking module for Proxy Magic
 * Handles all proxy statistics and reporting
 */

const { logger } = require('./logger');

/**
 * Statistics object to track proxy usage
 */
const stats = {
    totalRequests: 0,
    httpsToHttp: 0,
    httpToHttps: 0,
    rulesMatched: 0,
    passThrough: 0,
    startTime: Date.now(),
    uniqueHosts: new Set(),
    rulesUsed: new Set()
};

/**
 * Increment total requests counter
 */
function incrementTotalRequests() {
    stats.totalRequests++;
}

/**
 * Increment HTTPS to HTTP conversion counter
 */
function incrementHttpsToHttp() {
    stats.httpsToHttp++;
}

/**
 * Increment HTTP to HTTPS conversion counter
 */
function incrementHttpToHttps() {
    stats.httpToHttps++;
}

/**
 * Increment rules matched counter
 */
function incrementRulesMatched() {
    stats.rulesMatched++;
}

/**
 * Increment pass-through counter
 */
function incrementPassThrough() {
    stats.passThrough++;
}

/**
 * Add a unique host to tracking
 * @param {string} hostname - The hostname to track
 */
function addUniqueHost(hostname) {
    if (hostname) {
        stats.uniqueHosts.add(hostname);
    }
}

/**
 * Add a used rule to tracking
 * @param {string} ruleName - The rule name to track
 */
function addUsedRule(ruleName) {
    if (ruleName) {
        stats.rulesUsed.add(ruleName);
    }
}

/**
 * Get current uptime in a readable format
 * @returns {Object} - Object with minutes and seconds
 */
function getUptime() {
    const uptimeMs = Date.now() - stats.startTime;
    const uptimeMinutes = Math.floor(uptimeMs / 60000);
    const uptimeSeconds = Math.floor((uptimeMs % 60000) / 1000);
    
    return { minutes: uptimeMinutes, seconds: uptimeSeconds };
}

/**
 * Calculate rule match rate as percentage
 * @returns {string} - Match rate as percentage string
 */
function getRuleMatchRate() {
    if (stats.totalRequests === 0) return '0.0';
    return ((stats.rulesMatched / stats.totalRequests) * 100).toFixed(1);
}

/**
 * Log current statistics
 */
function logStatistics() {
    const uptime = getUptime();
    
    logger.log(1, '📊 ===== PROXY STATISTICS =====');
    logger.log(1, `📊 Uptime: ${uptime.minutes}m ${uptime.seconds}s`);
    logger.log(1, `📊 User Requests: ${stats.totalRequests} (filtering out browser internals)`);
    logger.log(1, `📊 Unique Hosts: ${stats.uniqueHosts.size}`);
    logger.log(1, `📊 Rules Matched: ${stats.rulesMatched}`);
    logger.log(1, `📊 Pass-Through: ${stats.passThrough}`);
    logger.log(1, `📊 HTTPS → HTTP: ${stats.httpsToHttp}`);
    logger.log(1, `📊 HTTP → HTTPS: ${stats.httpToHttps}`);
    
    if (stats.rulesUsed.size > 0) {
        logger.log(1, `📊 Active Rules: ${Array.from(stats.rulesUsed).join(', ')}`);
    }
    
    logger.log(1, '📊 ===========================');
}

/**
 * Log final statistics on shutdown
 */
function logFinalStatistics() {
    const uptime = getUptime();
    
    logger.log(1, '📊 ===== FINAL PROXY STATISTICS =====');
    logger.log(1, `📊 Total Uptime: ${uptime.minutes}m ${uptime.seconds}s`);
    logger.log(1, `📊 User Requests Processed: ${stats.totalRequests} (filtered)`);
    logger.log(1, `📊 Unique Hosts Visited: ${stats.uniqueHosts.size}`);
    
    if (stats.uniqueHosts.size > 0) {
        logger.log(1, `📊 Hosts: ${Array.from(stats.uniqueHosts).join(', ')}`);
    }
    
    logger.log(1, `📊 Rules Matched: ${stats.rulesMatched}`);
    logger.log(1, `📊 Pass-Through: ${stats.passThrough}`);
    logger.log(1, `📊 HTTPS → HTTP Redirections: ${stats.httpsToHttp}`);
    logger.log(1, `📊 HTTP → HTTPS Redirections: ${stats.httpToHttps}`);
    
    if (stats.rulesUsed.size > 0) {
        logger.log(1, `📊 Rules Used: ${Array.from(stats.rulesUsed).join(', ')}`);
    }
    
    if (stats.totalRequests > 0) {
        const ruleMatchRate = getRuleMatchRate();
        logger.log(1, `📊 Rule Match Rate: ${ruleMatchRate}%`);
    }
    
    logger.log(1, '📊 ===================================');
}

/**
 * Start periodic statistics reporting
 * @param {number} intervalMinutes - Interval in minutes (default: 5)
 */
function startPeriodicReporting(intervalMinutes = 5) {
    setInterval(logStatistics, intervalMinutes * 60 * 1000);
}

/**
 * Get current statistics snapshot
 * @returns {Object} - Current statistics
 */
function getStats() {
    return {
        ...stats,
        uniqueHostsArray: Array.from(stats.uniqueHosts),
        rulesUsedArray: Array.from(stats.rulesUsed),
        uptime: getUptime(),
        ruleMatchRate: getRuleMatchRate()
    };
}

module.exports = {
    incrementTotalRequests,
    incrementHttpsToHttp,
    incrementHttpToHttps,
    incrementRulesMatched,
    incrementPassThrough,
    addUniqueHost,
    addUsedRule,
    getUptime,
    getRuleMatchRate,
    logStatistics,
    logFinalStatistics,
    startPeriodicReporting,
    getStats
}; 