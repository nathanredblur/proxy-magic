const Proxy = require('http-mitm-proxy').Proxy;

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
     * Redirect to a consistent API endpoint and prevent compression
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
        
        // CRITICAL: Remove compression headers to get uncompressed JSON
        console.log(`🔧 [API DEMO] Disabling compression by modifying accept-encoding header`);
        ctx.proxyToServerRequestOptions.headers['accept-encoding'] = 'identity';
        
        // Add query parameters for testing
        const url = new URL(`https://${ctx.proxyToServerRequestOptions.hostname}${ctx.proxyToServerRequestOptions.path}`);
        url.searchParams.set('proxy_test', 'true');
        url.searchParams.set('demo_mode', 'json_api');
        url.searchParams.set('timestamp', Date.now().toString());
        
        ctx.proxyToServerRequestOptions.path = url.pathname + url.search;
        
        console.log(`✅ [API DEMO] Request modification complete - compression disabled`);
    },

    /**
     * Modify JSON responses by collecting all data and modifying at the end
     */
    onResponse: (ctx, parsedUrl) => {
        console.log(`📨 [API DEMO] Processing JSON response`);
        
        const contentType = ctx.serverToProxyResponse.headers['content-type'] || '';
        console.log(`📊 [API DEMO] Response Content-Type: ${contentType}`);
        
        // Only modify JSON responses
        if (contentType.includes('application/json')) {
            console.log(`📊 [API DEMO] Content-Type is JSON - proceeding with modification`);
            
            // Add safe headers that don't conflict with proxy
            ctx.proxyToClientResponse.setHeader('X-Proxy-Magic-Test', 'JSON API Demo Active');
            ctx.proxyToClientResponse.setHeader('X-Test-Timestamp', new Date().toISOString());
            ctx.proxyToClientResponse.setHeader('X-Demo-Type', 'JSON API Testing');
            
            // Collect all response data first
            let responseBuffer = Buffer.alloc(0);
            let dataCollectionComplete = false;
            
            ctx.onResponseData(function(ctx, chunk, callback) {
                console.log(`📊 [API DEMO] Collecting chunk: ${chunk.length} bytes`);
                responseBuffer = Buffer.concat([responseBuffer, chunk]);
                
                // Don't send data yet - collect it all first
                callback(null, null);
            });
            
            ctx.onResponseEnd(function(ctx, callback) {
                console.log(`📊 [API DEMO] All data collected. Total size: ${responseBuffer.length} bytes`);
                dataCollectionComplete = true;
                
                try {
                    const jsonString = responseBuffer.toString('utf8');
                    console.log(`📊 [API DEMO] Raw JSON (first 200 chars): ${jsonString.substring(0, 200)}`);
                    
                    let jsonData = JSON.parse(jsonString);
                    console.log(`📊 [API DEMO] Successfully parsed JSON:`, jsonData);
                    
                    // Add test metadata to the JSON response
                    jsonData._proxyMagicTest = {
                        testActive: true,
                        originalHost: parsedUrl.hostname,
                        modifiedHost: ctx.proxyToServerRequestOptions.hostname || 'unknown',
                        timestamp: new Date().toISOString(),
                        scenario: 'JSON API Response Modification (Buffered)',
                        demoVersion: '4.6',
                        originalUrl: parsedUrl.href,
                        modifiedUrl: `https://${ctx.proxyToServerRequestOptions.hostname}${ctx.proxyToServerRequestOptions.path}`,
                        compressionDisabled: true,
                        method: 'Buffer and Replace',
                        bufferedMode: true
                    };
                    
                    // Add a test field to demonstrate modification
                    if (jsonData.title) {
                        const originalTitle = jsonData.title;
                        jsonData.title = `🚀 [PROXY MODIFIED] ${originalTitle}`;
                        jsonData.originalTitle = originalTitle;
                        console.log(`📊 [API DEMO] Modified title: ${originalTitle} → ${jsonData.title}`);
                    }
                    
                    // Add test array if it doesn't exist
                    if (!jsonData.testArray) {
                        jsonData.testArray = ['proxy', 'magic', 'demo', 'json-modification', 'buffered-mode'];
                    }
                    
                    // Add more visible modifications
                    jsonData.proxyMagicActive = true;
                    jsonData.modificationCount = (jsonData.modificationCount || 0) + 1;
                    jsonData.compressionDisabled = true;
                    jsonData.bufferedMode = true;
                    jsonData.safeMode = true;
                    jsonData.proxyHeadersRespected = true;
                    
                    const modifiedJson = JSON.stringify(jsonData, null, 2);
                    console.log(`✨ [API DEMO] JSON modification complete!`);
                    console.log(`📊 [API DEMO] Sending modified JSON (${modifiedJson.length} chars)`);
                    
                    // Now manually send all the data at once
                    ctx.proxyToClientResponse.write(modifiedJson);
                    ctx.proxyToClientResponse.end();
                    
                    console.log(`🎉 [API DEMO] Modified JSON sent successfully!`);
                    
                    // Don't call the callback since we handled the response manually
                    
                } catch (e) {
                    console.log(`⚠️ [API DEMO] Could not parse JSON: ${e.message}`);
                    console.log(`⚠️ [API DEMO] Raw data (first 200 chars): ${responseBuffer.toString().substring(0, 200)}`);
                    
                    // Send original data if parsing fails
                    ctx.proxyToClientResponse.write(responseBuffer);
                    ctx.proxyToClientResponse.end();
                    
                    console.log(`🎉 [API DEMO] Original data sent due to parsing error`);
                }
            });
        } else {
            console.log(`⚠️ [API DEMO] Content-Type is not JSON (${contentType}) - skipping modification`);
        }
        
        console.log(`✅ [API DEMO] Response processing setup complete`);
    }
};

module.exports = jsonApiDemo; 