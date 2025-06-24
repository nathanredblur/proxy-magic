/** @type {import('../types').Rule} */
const jsonApiDemo = {
    name: 'JSON API Demo - Response Modification',
    
    /**
     * Match JSONPlaceholder requests for API testing
     */
    match: (parsedUrl, clientReq, ctx) => {
        return parsedUrl.hostname === 'jsonplaceholder.typicode.com';
    },

    /**
     * Redirect to a consistent API endpoint and add API headers
     */
    onRequest: (ctx, parsedUrl) => {
        console.log(`📊 [API DEMO] Intercepting API request: ${parsedUrl.href}`);
        
        // Redirect to posts endpoint for consistent testing
        ctx.proxyToServerRequestOptions.hostname = 'jsonplaceholder.typicode.com';
        ctx.proxyToServerRequestOptions.port = 443;
        ctx.proxyToServerRequestOptions.path = '/posts/1';
        
        // Add API-specific headers
        ctx.proxyToServerRequestOptions.headers['X-API-Test'] = 'JSON Manipulation Demo';
        ctx.proxyToServerRequestOptions.headers['X-Proxy-Enhanced'] = 'true';
        ctx.proxyToServerRequestOptions.headers['X-Original-Path'] = parsedUrl.pathname;
        
        // Add query parameters for testing
        const url = new URL(`https://${ctx.proxyToServerRequestOptions.hostname}${ctx.proxyToServerRequestOptions.path}`);
        url.searchParams.set('proxy_test', 'true');
        url.searchParams.set('demo_mode', 'json_api');
        url.searchParams.set('timestamp', Date.now().toString());
        
        ctx.proxyToServerRequestOptions.path = url.pathname + url.search;
        
        console.log(`✅ [API DEMO] Request modification complete`);
    },

    /**
     * Modify JSON responses to add test metadata
     */
    onResponse: (ctx, parsedUrl) => {
        console.log(`📨 [API DEMO] Processing JSON response`);
        
        // Add test headers to the response
        ctx.proxyToClientResponse.setHeader('X-Proxy-Magic-Test', 'JSON API Demo Active');
        ctx.proxyToClientResponse.setHeader('X-Test-Timestamp', new Date().toISOString());
        ctx.proxyToClientResponse.setHeader('X-Original-Host', parsedUrl.hostname);
        ctx.proxyToClientResponse.setHeader('X-Demo-Type', 'JSON API Testing');
        
        const contentType = ctx.serverToProxyResponse.headers['content-type'] || '';
        
        // Modify JSON responses
        if (contentType.includes('application/json')) {
            console.log(`📊 [API DEMO] Modifying JSON response`);
            
            ctx.onResponseData(function(ctx, chunk, callback) {
                try {
                    let jsonData = JSON.parse(chunk.toString());
                    
                    // Add test metadata to the JSON response
                    jsonData._proxyMagicTest = {
                        testActive: true,
                        originalHost: parsedUrl.hostname,
                        modifiedHost: ctx.proxyToServerRequestOptions.hostname,
                        timestamp: new Date().toISOString(),
                        scenario: 'JSON API Response Modification',
                        demoVersion: '1.0'
                    };
                    
                    // Add a test field to demonstrate modification
                    if (jsonData.title) {
                        jsonData.title = `[PROXY MODIFIED] ${jsonData.title}`;
                    }
                    
                    // Add test array if it doesn't exist
                    if (!jsonData.testArray) {
                        jsonData.testArray = ['proxy', 'magic', 'demo'];
                    }
                    
                    console.log(`📊 [API DEMO] JSON modification complete`);
                    return callback(null, Buffer.from(JSON.stringify(jsonData, null, 2)));
                    
                } catch (e) {
                    console.log(`⚠️ [API DEMO] Could not parse JSON: ${e.message}`);
                    return callback(null, chunk);
                }
            });
        }
        
        console.log(`✅ [API DEMO] Response processing complete`);
    }
};

module.exports = jsonApiDemo; 