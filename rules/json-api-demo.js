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
     * Setup request using official Proxy.gunzip approach with gzip compression
     */
    onRequest: (ctx, parsedUrl) => {
        console.log(`📊 [API DEMO] Intercepting API request: ${parsedUrl.href}`);
        
        console.log(`🔧 [API DEMO] Using Proxy.gunzip with gzip compression (brotli not supported)`);
        
        // Redirect to posts endpoint for consistent testing
        ctx.proxyToServerRequestOptions.hostname = 'jsonplaceholder.typicode.com';
        ctx.proxyToServerRequestOptions.port = 443;
        ctx.proxyToServerRequestOptions.path = '/posts/1?proxy_test=true&demo_mode=gzip_compression&timestamp=' + Date.now();
        
        // USE ONLY GZIP compression (Proxy.gunzip supports this)
        const originalEncoding = ctx.proxyToServerRequestOptions.headers['accept-encoding'];
        console.log(`📊 [API DEMO] Original accept-encoding: ${originalEncoding}`);
        
        // Force gzip only (Proxy.gunzip supports gzip and deflate, but not brotli)
        ctx.proxyToServerRequestOptions.headers['accept-encoding'] = 'gzip, deflate';
        console.log(`🔧 [API DEMO] Modified accept-encoding: gzip, deflate (removed brotli/zstd - Proxy.gunzip compatible)`);
        
        // Add custom headers for testing
        ctx.proxyToServerRequestOptions.headers['X-API-Test'] = 'JSON Manipulation Demo';
        ctx.proxyToServerRequestOptions.headers['X-Proxy-Enhanced'] = 'true';
        ctx.proxyToServerRequestOptions.headers['X-Original-Path'] = parsedUrl.pathname;
        
        // ENABLE Proxy.gunzip for automatic decompression
        ctx.use(Proxy.gunzip);
        console.log(`✅ [API DEMO] Proxy.gunzip enabled - should handle gzip/deflate automatically`);
        
        // Set up response data handler
        ctx.onResponseData(function(ctx, chunk, responseCallback) {
            console.log(`📦 [API DEMO] onResponseData called - received chunk: ${chunk.length} bytes`);
            
            const contentType = ctx.serverToProxyResponse.headers['content-type'] || '';
            const contentEncoding = ctx.serverToProxyResponse.headers['content-encoding'] || 'none';
            console.log(`📊 [API DEMO] Content-Type: ${contentType}`);
            console.log(`📊 [API DEMO] Content-Encoding: ${contentEncoding}`);
            
            // Only process JSON responses
            if (!contentType.includes('application/json')) {
                console.log(`⚠️ [API DEMO] Not a JSON response, passing through unchanged`);
                return responseCallback(null, chunk);
            }
            
            console.log(`📊 [API DEMO] JSON response detected - Proxy.gunzip should have decompressed it`);
            
            try {
                // Convert chunk to string (should be decompressed by Proxy.gunzip)
                const jsonString = chunk.toString('utf8');
                console.log(`📊 [API DEMO] JSON string: ${jsonString.length} chars`);
                console.log(`📊 [API DEMO] JSON preview: ${jsonString.substring(0, 200)}...`);
                
                // Check if it looks like JSON (starts with { or [)
                if (!jsonString.trim().startsWith('{') && !jsonString.trim().startsWith('[')) {
                    console.log(`❌ [API DEMO] Data doesn't look like JSON, Proxy.gunzip might not have worked`);
                    console.log(`📊 [API DEMO] Raw data (hex): ${chunk.toString('hex').substring(0, 100)}...`);
                    
                    // Return error response
                    const errorResponse = {
                        error: "Data still appears compressed",
                        contentEncoding: contentEncoding,
                        dataPreview: jsonString.substring(0, 100),
                        hexPreview: chunk.toString('hex').substring(0, 100),
                        note: "Proxy.gunzip may not support this compression type"
                    };
                    return responseCallback(null, Buffer.from(JSON.stringify(errorResponse, null, 2), 'utf8'));
                }
                
                // Parse the JSON
                const jsonData = JSON.parse(jsonString);
                console.log(`✅ [API DEMO] JSON parsed successfully!`);
                
                // Modify the JSON
                const modifiedJson = {
                    ...jsonData,
                    title: `🎉 [GZIP SUCCESS!] ${jsonData.title || 'Modified Title'}`,
                    proxyModified: true,
                    proxyTimestamp: new Date().toISOString(),
                    proxySuccess: "🎉 SUCCESS! Proxy.gunzip working with gzip compression!",
                    originalData: jsonData,
                    compressionInfo: {
                        method: 'Proxy.gunzip with gzip/deflate compression',
                        contentEncoding: contentEncoding,
                        proxyGunzipWorking: true,
                        supportedCompressions: ['gzip', 'deflate'],
                        notSupported: ['brotli', 'zstd']
                    }
                };
                
                const modifiedResponse = JSON.stringify(modifiedJson, null, 2);
                console.log(`🎯 [API DEMO] Modified JSON ready (${modifiedResponse.length} chars)`);
                console.log(`📊 [API DEMO] Modified preview: ${modifiedResponse.substring(0, 300)}...`);
                
                // Return modified JSON as buffer
                const modifiedBuffer = Buffer.from(modifiedResponse, 'utf8');
                console.log(`🎉 [API DEMO] SUCCESS! Returning modified JSON with gzip compression!`);
                return responseCallback(null, modifiedBuffer);
                
            } catch (parseError) {
                console.error(`❌ [API DEMO] JSON parse error:`, parseError.message);
                console.log(`📊 [API DEMO] Raw chunk data: ${chunk.toString('utf8').substring(0, 500)}`);
                console.log(`📊 [API DEMO] Raw chunk hex: ${chunk.toString('hex').substring(0, 200)}`);
                
                // Return error as JSON
                const errorResponse = {
                    error: "JSON Parse Error (Gzip Test)",
                    message: parseError.message,
                    rawDataPreview: chunk.toString('utf8').substring(0, 500),
                    hexPreview: chunk.toString('hex').substring(0, 200),
                    contentEncoding: contentEncoding,
                    compressionNote: "Using gzip/deflate - Proxy.gunzip compatible"
                };
                
                const errorBuffer = Buffer.from(JSON.stringify(errorResponse, null, 2), 'utf8');
                console.log(`📊 [API DEMO] Parse error response prepared`);
                return responseCallback(null, errorBuffer);
            }
        });
        
        console.log(`✅ [API DEMO] Request setup complete - testing with gzip compression`);
    }
};

module.exports = jsonApiDemo; 