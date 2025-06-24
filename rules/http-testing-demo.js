const https = require('https');
const Proxy = require('http-mitm-proxy').Proxy;

/** @type {import('../types').Rule} */
const httpTestingDemo = {
    name: 'HTTP Testing Demo - Header Manipulation',
    
    /**
     * Match httpbin.org requests for HTTP testing
     */
    match: (parsedUrl, clientReq, ctx) => {
        return parsedUrl.hostname === 'httpbin.org';
    },

    /**
     * Handle HTTP -> HTTPS conversion by making our own HTTPS request
     * This bypasses the MITM library's protocol limitations
     */
    onRequest: (ctx, parsedUrl) => {
        console.log(`🌐 [HTTP DEMO] Intercepting httpbin request: ${parsedUrl.href}`);
        console.log(`🔧 [HTTP DEMO] Converting HTTP -> HTTPS manually to bypass protocol restrictions`);
        
        // Mark this context as manually handled to prevent proxy from also responding
        ctx.isManualResponse = true;
        
        // Build custom headers for the HTTPS request
        const customHeaders = {
            'X-Proxy-Magic-Demo': 'HTTP Testing',
            'X-Original-Path': parsedUrl.pathname,
            'X-Test-Scenario': 'Header Manipulation',
            'X-User-Agent-Enhanced': 'Enhanced by Proxy Magic',
            'User-Agent': ctx.clientToProxyRequest.headers['user-agent'] || 'Proxy Magic Demo',
            'Accept': ctx.clientToProxyRequest.headers['accept'] || '*/*',
            'Host': 'httpbin.org'
        };
        
        // Build the HTTPS URL and options
        const timestamp = Date.now();
        const requestPath = `/headers?proxy_test=true&demo_mode=http_headers&timestamp=${timestamp}`;
        const httpsUrl = `https://httpbin.org${requestPath}`;
        
        console.log(`🔧 [HTTP DEMO] Making HTTPS request to: ${httpsUrl}`);
        
        // Make the HTTPS request manually with proper options object
        const httpsReq = https.request({
            hostname: 'httpbin.org',
            port: 443,
            path: requestPath,
            method: ctx.clientToProxyRequest.method || 'GET',
            headers: customHeaders
        }, (httpsRes) => {
            console.log(`📨 [HTTP DEMO] Got HTTPS response: ${httpsRes.statusCode}`);
            
            // Handle response data
            let responseData = '';
            httpsRes.on('data', (chunk) => {
                responseData += chunk.toString();
            });
            
            httpsRes.on('end', () => {
                try {
                    // If it's JSON, enhance it
                    const jsonData = JSON.parse(responseData);
                    jsonData['proxy-magic-info'] = {
                        'test-scenario': 'HTTP → HTTPS Header Manipulation (Manual)',
                        'original-url': parsedUrl.href,
                        'modified-url': httpsUrl,
                        'protocol-conversion': 'HTTP → HTTPS',
                        'conversion-method': 'Manual HTTPS Request',
                        'timestamp': new Date().toISOString(),
                        'headers-added': Object.keys(customHeaders),
                        'success': true
                    };
                    
                    const modifiedResponse = JSON.stringify(jsonData, null, 2);
                    console.log(`✨ [HTTP DEMO] JSON modification complete - HTTP->HTTPS manual conversion working!`);
                    
                    // Send the response immediately
                    if (!ctx.proxyToClientResponse.headersSent) {
                        // Add custom headers
                        ctx.proxyToClientResponse.setHeader('X-Proxy-Magic-Test', 'HTTP Demo Active');
                        ctx.proxyToClientResponse.setHeader('X-Test-Timestamp', new Date().toISOString());
                        ctx.proxyToClientResponse.setHeader('X-Original-Host', parsedUrl.hostname);
                        ctx.proxyToClientResponse.setHeader('X-Demo-Type', 'HTTP Header Testing');
                        ctx.proxyToClientResponse.setHeader('X-Protocol-Conversion', 'HTTP-to-HTTPS-Manual');
                        ctx.proxyToClientResponse.setHeader('Content-Type', 'application/json');
                        
                        ctx.proxyToClientResponse.writeHead(httpsRes.statusCode);
                        ctx.proxyToClientResponse.end(modifiedResponse);
                        console.log(`🎉 [HTTP DEMO] JSON response sent successfully!`);
                    } else {
                        console.log(`⚠️ [HTTP DEMO] Headers already sent, cannot send JSON response`);
                    }
                } catch (e) {
                    console.log(`⚠️ [HTTP DEMO] Could not parse JSON, sending raw response: ${e.message}`);
                    if (!ctx.proxyToClientResponse.headersSent) {
                        // Copy original headers
                        Object.keys(httpsRes.headers).forEach(key => {
                            try {
                                ctx.proxyToClientResponse.setHeader(key, httpsRes.headers[key]);
                            } catch (headerError) {
                                console.log(`⚠️ [HTTP DEMO] Could not set header ${key}: ${headerError.message}`);
                            }
                        });
                        
                        ctx.proxyToClientResponse.writeHead(httpsRes.statusCode);
                        ctx.proxyToClientResponse.end(responseData);
                        console.log(`🎉 [HTTP DEMO] Raw response sent successfully!`);
                    }
                }
            });
        });
        
        httpsReq.on('error', (err) => {
            console.error(`❌ [HTTP DEMO] HTTPS request failed: ${err.message}`);
            
            if (!ctx.proxyToClientResponse.headersSent) {
                ctx.proxyToClientResponse.writeHead(500, {'Content-Type': 'application/json'});
                ctx.proxyToClientResponse.end(JSON.stringify({
                    error: 'HTTP to HTTPS conversion failed',
                    message: err.message,
                    'proxy-magic-info': {
                        'test-scenario': 'HTTP → HTTPS Conversion Error',
                        'original-url': parsedUrl.href,
                        'target-url': httpsUrl,
                        'error': err.message
                    }
                }, null, 2));
                console.log(`🎉 [HTTP DEMO] Error response sent successfully!`);
            }
        });
        
        // Send the request
        httpsReq.end();
        
        console.log(`✅ [HTTP DEMO] Manual HTTPS request initiated`);
        
        // IMPORTANT: Don't set proxy options since we're handling manually
        // This prevents the proxy from also trying to make a request
        return false; // Indicate that we're handling this manually
    },

    /**
     * onResponse is not used since we handle the response manually in onRequest
     */
    onResponse: (ctx, parsedUrl) => {
        // Not used - we handle the response manually in onRequest
        console.log(`📨 [HTTP DEMO] onResponse called (but not used for manual HTTPS conversion)`);
    }
};

module.exports = httpTestingDemo; 