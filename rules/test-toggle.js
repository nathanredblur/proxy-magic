/**
 * TEST RULE: Rule Toggle Verification
 * This rule adds a custom header to all responses to verify it's working
 * When enabled: adds X-Test-Rule-Active: true
 * When disabled: header won't appear
 */

module.exports = {
    name: 'Test Toggle Rule',
    description: 'Adds X-Test-Rule-Active header to verify rule toggling works immediately',
    
    match: (ctx) => {
        // Match all requests to test the toggle functionality
        return true;
    },
    
    onResponse: (ctx, callback) => {
        try {
            // Add a test header to verify this rule is active
            if (ctx.serverToProxyResponse && ctx.serverToProxyResponse.headers) {
                ctx.serverToProxyResponse.headers['X-Test-Rule-Active'] = 'true';
                ctx.serverToProxyResponse.headers['X-Test-Rule-Timestamp'] = new Date().toISOString();
            }
            
            // Log that this rule is working
            console.log(`[TEST-TOGGLE] Rule is ACTIVE - added test headers to: ${ctx.clientToProxyRequest.url}`);
            
        } catch (error) {
            console.error('[TEST-TOGGLE] Error in test rule:', error);
        }
        
        return callback();
    }
}; 