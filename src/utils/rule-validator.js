/**
 * Rule validation module for Proxy Magic
 * Validates proxy rules for correctness and completeness
 */

const { logger } = require('./logger');

/**
 * Validates an array of proxy rules
 * @param {Array} rules - Array of rule objects to validate
 * @returns {Object} - Validation result with valid/invalid counts
 */
function validateRules(rules) {
    logger.log(1, '🔍 Validating proxy rules...');
    
    let validRules = 0;
    let invalidRules = 0;
    const validationResults = [];
    
    rules.forEach((rule, index) => {
        const result = validateSingleRule(rule, index);
        validationResults.push(result);
        
        if (result.isValid) {
            validRules++;
        } else {
            invalidRules++;
        }
    });
    
    logger.log(1, `📋 Loaded ${rules.length} proxy rules from rules directory`);
    logger.log(1, `✅ Valid rules: ${validRules}`);
    
    if (invalidRules > 0) {
        logger.log(1, `❌ Invalid rules: ${invalidRules}`);
    }
    
    return {
        totalRules: rules.length,
        validRules,
        invalidRules,
        results: validationResults
    };
}

/**
 * Validates a single proxy rule
 * @param {Object} rule - Rule object to validate
 * @param {number} index - Rule index for error reporting
 * @returns {Object} - Validation result for the rule
 */
function validateSingleRule(rule, index) {
    const ruleName = rule.name || `Rule #${index + 1}`;
    const errors = [];
    const warnings = [];
    
    // Check required properties
    if (!rule.match || typeof rule.match !== 'function') {
        errors.push('Missing or invalid \'match\' function');
    }
    
    // Check optional but recommended properties
    if (!rule.name) {
        warnings.push('Consider adding a \'name\' property for better debugging');
    }
    
    // Validate onRequest function if present
    if (rule.onRequest && typeof rule.onRequest !== 'function') {
        errors.push('\'onRequest\' must be a function');
    }
    
    // Validate onResponse function if present
    if (rule.onResponse && typeof rule.onResponse !== 'function') {
        errors.push('\'onResponse\' must be a function');
    }
    
    // Check for common issues
    if (rule.onRequest && rule.onResponse && !rule.description) {
        warnings.push('Rules with both onRequest and onResponse should have a description');
    }
    
    // Log results
    if (errors.length > 0) {
        logger.error(`🚨 [RULE VALIDATION] ${ruleName}: ${errors.join(', ')}`);
    } else {
        logger.log(2, `✅ [RULE VALIDATION] ${ruleName}: Basic validation passed`);
    }
    
    if (warnings.length > 0) {
        warnings.forEach(warning => {
            logger.log(1, `⚠️ [RULE VALIDATION] ${ruleName}: ${warning}`);
        });
    }
    
    return {
        ruleName,
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Validates rule configuration at runtime
 * @param {Object} rule - Rule object
 * @param {Object} ctx - Proxy context
 * @returns {Object} - Runtime validation result
 */
function validateRuleExecution(rule, ctx) {
    const issues = [];
    
    if (!ctx.proxyToServerRequestOptions) {
        issues.push('proxyToServerRequestOptions not initialized');
        return { isValid: false, issues };
    }
    
    const options = ctx.proxyToServerRequestOptions;
    
    // Validate hostname
    if (!options.hostname || options.hostname === 'undefined') {
        issues.push(`Invalid hostname: '${options.hostname}'`);
    }
    
    // Validate path
    if (options.path === 'undefined') {
        issues.push('Path is literal "undefined"');
    }
    
    // Validate port
    if (!options.port || isNaN(options.port) || options.port < 1 || options.port > 65535) {
        issues.push(`Invalid port: ${options.port}`);
    }
    
    // Validate headers
    if (!options.headers || typeof options.headers !== 'object') {
        issues.push('Missing or invalid headers object');
    } else if (!options.headers.host) {
        issues.push('Missing Host header');
    }
    
    if (issues.length > 0) {
        const ruleName = rule.name || 'Unknown Rule';
        logger.error(`🚨 [RULE RUNTIME] ${ruleName}: ${issues.join(', ')}`);
    }
    
    return {
        isValid: issues.length === 0,
        issues
    };
}

module.exports = {
    validateRules,
    validateSingleRule,
    validateRuleExecution
}; 