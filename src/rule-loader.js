const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

/**
 * @typedef {Object} Rule
 * @property {string} [name] - Optional descriptive name for the rule.
 * @property {(parsedUrl: URL, clientReq: import('http').IncomingMessage, ctx: any) => boolean} match - Function to determine if the rule applies.
 * @property {(ctx: any, parsedUrl: URL) => void} [onRequest] - Optional function to modify the request to the target server.
 * @property {(ctx: any, parsedUrl: URL) => void} [onResponse] - Optional function to modify the response to the client.
 */

/**
 * Automatically load all rule files from the configured rules directory
 * @returns {Array<Rule>} Array of rule objects
 */
function loadAllRules() {
    // Get rules directory from environment variable or use default
    const rawRulesDir = process.env.RULES_DIR || 'rules';
    
    // Handle both relative and absolute paths properly
    let rulesDir;
    if (path.isAbsolute(rawRulesDir)) {
        rulesDir = rawRulesDir;
    } else {
        // For relative paths, resolve from current working directory
        rulesDir = path.resolve(process.cwd(), rawRulesDir);
    }
    
    const rules = [];
    const isDebug = process.env.DEBUG_RULES === 'true';
    
    // Log for debugging (only in debug mode)
    if (isDebug) {
        console.log(`🔍 [RuleLoader] Raw RULES_DIR: "${rawRulesDir}"`);
        console.log(`🔍 [RuleLoader] Resolved rules directory: "${rulesDir}"`);
        console.log(`🔍 [RuleLoader] Working directory: "${process.cwd()}"`);
        console.log(`🔍 [RuleLoader] Debug mode: ${isDebug}`);
    }
    
    if (isDebug) {
        console.log(`🔍 Loading rules from: ${rulesDir}`);
    }
    
    // Check if rules directory exists
    if (!fs.existsSync(rulesDir)) {
        console.error(`❌ Rules directory not found: ${rulesDir}`);
        return [];
    }
    
    // Get all .js files except index.js and types.js
    const ruleFiles = fs.readdirSync(rulesDir)
        .filter(file => file.endsWith('.js') && 
                       file !== 'index.js' && 
                       file !== 'types.js');
    
    if (isDebug) {
        console.log(`📁 Found ${ruleFiles.length} rule files: ${ruleFiles.join(', ')}`);
    }
    
    // Load each rule file
    for (const file of ruleFiles) {
        try {
            const rulePath = path.join(rulesDir, file);
            
            // Clear require cache to allow hot reloading during development
            delete require.cache[require.resolve(rulePath)];
            
            const rule = require(rulePath);
            if (rule && typeof rule === 'object') {
                rules.push(rule);
                if (isDebug) {
                    console.log(`✅ Loaded rule: ${rule.name || file}`);
                }
            } else {
                console.warn(`⚠️  Rule file ${file} did not export a valid rule object`);
            }
        } catch (error) {
            console.error(`❌ Failed to load rule from ${file}:`, error.message);
            if (isDebug) {
                console.error(error.stack);
            }
        }
    }
    
    // Log rule count for debugging (only in debug mode)
    if (isDebug) {
        console.log(`🔍 [RuleLoader] Total rules loaded: ${rules.length}`);
        if (rules.length > 0) {
            console.log(`🔍 [RuleLoader] Rule names: ${rules.map(r => r.name || 'unnamed').join(', ')}`);
        }
    }
    
    if (isDebug) {
        console.log(`📋 Total rules loaded: ${rules.length}`);
    } else if (rules.length > 0) {
        console.log(`📋 Loaded ${rules.length} proxy rules from ${rulesDir}`);
    }
    
    return rules;
}

// Export the loaded rules
module.exports = loadAllRules(); 