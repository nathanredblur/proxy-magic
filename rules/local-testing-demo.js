const Proxy = require('http-mitm-proxy').Proxy; // Required for ctx.use(Proxy.gunzip)

/** @type {import('../types').Rule} */
const localTestingDemo = {
    name: 'Local Testing Demo - Complete Tutorial',
    
    /**
     * TESTING-FRIENDLY MATCHING DEMO
     * Using domains that are specifically designed for testing and development
     */
    match: (parsedUrl, clientReq, ctx) => {
        // === OPTION 1: LOCAL TEST SERVERS ===
        // httpbin.org - HTTP testing service
        if (parsedUrl.hostname === 'httpbin.org') return true;
        
        // JSONPlaceholder - Fake REST API for testing
        if (parsedUrl.hostname === 'jsonplaceholder.typicode.com') return true;
        
        // === OPTION 2: EXAMPLE DOMAINS (RFC 2606) ===
        // These domains are reserved for testing and examples
        if (parsedUrl.hostname === 'example.com') return true;
        if (parsedUrl.hostname === 'example.org') return true;
        if (parsedUrl.hostname === 'example.net') return true;
        if (parsedUrl.hostname === 'test.example') return true;
        
        // === OPTION 3: LOCALHOST TESTING ===
        // Perfect for local development
        if (parsedUrl.hostname === 'localhost' && parsedUrl.port === '3000') return true;
        if (parsedUrl.hostname === '127.0.0.1' && parsedUrl.port === '8000') return true;
        
        // === OPTION 4: TESTING SUBDOMAINS ===
        // Create custom test scenarios
        if (parsedUrl.hostname.startsWith('test-')) return true;
        if (parsedUrl.hostname.endsWith('.test')) return true;
        
        return false;
    },

    /**
     * REQUEST MANIPULATION DEMO
     * Redirect to different testing services based on the original request
     */
    onRequest: (ctx, parsedUrl) => {
        console.log(`🔄 [TEST DEMO] Intercepting request: ${parsedUrl.href}`);
        
        // === SCENARIO 1: HTTP TESTING (httpbin.org) ===
        if (parsedUrl.hostname === 'httpbin.org') {
            console.log(`🌐 [TEST DEMO] Redirecting httpbin request to demonstrate HTTP features`);
            
            // Redirect to httpbin's headers endpoint to show header manipulation
            ctx.proxyToServerRequestOptions.hostname = 'httpbin.org';
            ctx.proxyToServerRequestOptions.port = 443;
            ctx.proxyToServerRequestOptions.path = '/headers';
            
            // Add custom headers that will be visible in the response
            ctx.proxyToServerRequestOptions.headers['X-Proxy-Magic-Demo'] = 'HTTP Testing';
            ctx.proxyToServerRequestOptions.headers['X-Original-Path'] = parsedUrl.pathname;
            ctx.proxyToServerRequestOptions.headers['X-Test-Scenario'] = 'Header Manipulation';
        }
        
        // === SCENARIO 2: JSON API TESTING (JSONPlaceholder) ===
        else if (parsedUrl.hostname === 'jsonplaceholder.typicode.com') {
            console.log(`📊 [TEST DEMO] Redirecting to JSONPlaceholder for API testing`);
            
            // Redirect to posts endpoint for consistent testing
            ctx.proxyToServerRequestOptions.hostname = 'jsonplaceholder.typicode.com';
            ctx.proxyToServerRequestOptions.port = 443;
            ctx.proxyToServerRequestOptions.path = '/posts/1';
            
            // Add API-specific headers
            ctx.proxyToServerRequestOptions.headers['X-API-Test'] = 'JSON Manipulation Demo';
            ctx.proxyToServerRequestOptions.headers['X-Proxy-Enhanced'] = 'true';
        }
        
        // === SCENARIO 3: EXAMPLE.COM TESTING ===
        else if (parsedUrl.hostname.includes('example.')) {
            console.log(`📄 [TEST DEMO] Redirecting example domain for HTML testing`);
            
            // Redirect to a simple HTML page for content modification testing
            ctx.proxyToServerRequestOptions.hostname = 'example.com';
            ctx.proxyToServerRequestOptions.port = 80;
            ctx.proxyToServerRequestOptions.path = '/';
            
            // Add headers for HTML modification demo
            ctx.proxyToServerRequestOptions.headers['X-HTML-Test'] = 'Content Modification Demo';
        }
        
        // === SCENARIO 4: LOCAL TESTING ===
        else if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
            console.log(`🏠 [TEST DEMO] Local development server testing`);
            
            // For local testing, you can redirect to a simple HTTP server
            // Example: redirect to a local test server you can easily set up
            ctx.proxyToServerRequestOptions.headers['X-Local-Test'] = 'Development Server Demo';
        }
        
        // === ADVANCED TESTING SCENARIOS ===
        
        // Demonstrate query parameter manipulation
        const url = new URL(`https://${ctx.proxyToServerRequestOptions.hostname}${ctx.proxyToServerRequestOptions.path}`);
        url.searchParams.set('proxy_test', 'true');
        url.searchParams.set('demo_mode', 'enabled');
        url.searchParams.set('timestamp', Date.now().toString());
        
        // Remove any existing tracking parameters for clean testing
        url.searchParams.delete('utm_source');
        url.searchParams.delete('utm_medium');
        
        ctx.proxyToServerRequestOptions.path = url.pathname + url.search;
        
        // Enable response modification for HTML content
        const acceptHeader = ctx.clientToProxyRequest.headers['accept'] || '';
        if (acceptHeader.includes('text/html')) {
            console.log(`📄 [TEST DEMO] HTML request detected, preparing for response modification`);
            ctx.use(Proxy.gunzip);
        }
        
        console.log(`✅ [TEST DEMO] Request modification complete`);
    },

    /**
     * RESPONSE MANIPULATION DEMO
     * Modify responses to demonstrate various proxy capabilities
     */
    onResponse: (ctx, parsedUrl) => {
        console.log(`📨 [TEST DEMO] Processing response from: ${ctx.proxyToServerRequestOptions.hostname}`);
        
        // Add test headers to all responses
        ctx.proxyToClientResponse.setHeader('X-Proxy-Magic-Test', 'Demo Active');
        ctx.proxyToClientResponse.setHeader('X-Test-Timestamp', new Date().toISOString());
        ctx.proxyToClientResponse.setHeader('X-Original-Host', parsedUrl.hostname);
        
        const contentType = ctx.serverToProxyResponse.headers['content-type'] || '';
        
        // Ensure proper UTF-8 encoding for HTML responses
        if (contentType.includes('text/html') && !contentType.includes('charset')) {
            ctx.proxyToClientResponse.setHeader('Content-Type', contentType + '; charset=utf-8');
        }
        
        // === HTML RESPONSE TESTING ===
        if (contentType.includes('text/html')) {
            console.log(`🌐 [TEST DEMO] Modifying HTML response`);
            
            ctx.onResponseData(function(ctx, chunk, callback) {
                let html = chunk.toString();
                
                // Add a prominent test banner
                const testBanner = `
                    <div style="
                        position: fixed; 
                        top: 0; 
                        left: 0; 
                        right: 0; 
                        background: linear-gradient(135deg, #6c5ce7, #a29bfe); 
                        color: white; 
                        padding: 15px; 
                        text-align: center; 
                        z-index: 10000;
                        font-family: 'Arial', sans-serif;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                        border-bottom: 3px solid #fd79a8;
                    ">
                        &#x1F9EA; <strong>Proxy Magic Testing Demo</strong> &#x1F9EA;
                        <br>
                        <small style="opacity: 0.9;">
                            Original: ${parsedUrl.hostname} &#x2192; Modified: ${ctx.proxyToServerRequestOptions.hostname}
                        </small>
                    </div>
                    <div style="height: 80px;"></div>
                `;
                
                // Ensure proper UTF-8 charset is set
                if (html.includes('<head>') && !html.includes('charset')) {
                    html = html.replace('<head>', '<head>\n    <meta charset="UTF-8">');
                } else if (!html.includes('<head>') && !html.includes('charset')) {
                    html = '<meta charset="UTF-8">\n' + html;
                }
                
                // Insert banner
                if (html.includes('<body>')) {
                    html = html.replace('<body>', '<body>' + testBanner);
                } else {
                    html = testBanner + html;
                }
                
                // Add test information to the page
                const testInfo = `
                    <div style="
                        margin: 20px; 
                        padding: 20px; 
                        background: #f8f9fa; 
                        border-left: 4px solid #6c5ce7;
                        font-family: monospace;
                    ">
                        <h3>&#x1F50D; Proxy Magic Test Information</h3>
                        <p><strong>Test Scenario:</strong> ${ctx.proxyToServerRequestOptions.headers['X-Test-Scenario'] || 'General Testing'}</p>
                        <p><strong>Original URL:</strong> ${parsedUrl.href}</p>
                        <p><strong>Modified URL:</strong> https://${ctx.proxyToServerRequestOptions.hostname}${ctx.proxyToServerRequestOptions.path}</p>
                        <p><strong>Content Type:</strong> ${contentType}</p>
                        <p><strong>Test Headers Added:</strong> X-Proxy-Magic-Test, X-Test-Timestamp, X-Original-Host</p>
                    </div>
                `;
                
                // Insert test info before closing body tag
                html = html.replace('</body>', testInfo + '</body>');
                
                // Add test CSS
                const testCSS = `
                    <style>
                        /* Proxy Magic Test Styles */
                        .proxy-test-highlight {
                            background: linear-gradient(45deg, #fd79a8, #fdcb6e) !important;
                            padding: 2px 4px !important;
                            border-radius: 3px !important;
                        }
                        
                        /* Subtle animation for test elements */
                        .proxy-test-highlight {
                            animation: pulse 2s infinite;
                        }
                        
                        @keyframes pulse {
                            0% { opacity: 1; }
                            50% { opacity: 0.7; }
                            100% { opacity: 1; }
                        }
                    </style>
                `;
                
                html = html.replace('</head>', testCSS + '</head>');
                
                console.log(`✨ [TEST DEMO] HTML modification complete`);
                return callback(null, Buffer.from(html));
            });
        }
        
        // === JSON API RESPONSE TESTING ===
        else if (contentType.includes('application/json')) {
            console.log(`📊 [TEST DEMO] Modifying JSON response`);
            
            ctx.onResponseData(function(ctx, chunk, callback) {
                try {
                    let jsonData = JSON.parse(chunk.toString());
                    
                    // Add test metadata
                    jsonData._proxyMagicTest = {
                        testActive: true,
                        originalHost: parsedUrl.hostname,
                        modifiedHost: ctx.proxyToServerRequestOptions.hostname,
                        timestamp: new Date().toISOString(),
                        scenario: ctx.proxyToServerRequestOptions.headers['X-API-Test'] || 'JSON API Testing'
                    };
                    
                    console.log(`📊 [TEST DEMO] JSON modification complete`);
                    return callback(null, Buffer.from(JSON.stringify(jsonData, null, 2)));
                    
                } catch (e) {
                    console.log(`⚠️ [TEST DEMO] Could not parse JSON: ${e.message}`);
                    return callback(null, chunk);
                }
            });
        }
        
        // === STATIC FILE SERVING FOR TESTING ===
        if (parsedUrl.pathname === '/proxy-test-info') {
            console.log(`📄 [TEST DEMO] Serving test information file`);
            
            const testInfo = `
=== PROXY MAGIC TESTING DEMO ===

This is a test file served by the proxy rule for testing purposes.

Test Configuration:
- Original request: ${parsedUrl.href}
- Test timestamp: ${new Date().toISOString()}
- Rule: ${localTestingDemo.name}

Recommended Testing Domains:
✅ httpbin.org - HTTP testing service
✅ jsonplaceholder.typicode.com - JSON API testing
✅ example.com - HTML content testing
✅ localhost:3000 - Local development testing

Testing Scenarios Available:
1. Header manipulation (httpbin.org)
2. JSON API modification (jsonplaceholder.typicode.com)
3. HTML content modification (example.com)
4. Local development testing (localhost)
5. Static file serving (this file)

To test different scenarios:
1. Visit: httpbin.org/get
2. Visit: jsonplaceholder.typicode.com/posts/1
3. Visit: example.com
4. Visit: any-domain.com/proxy-test-info

=== END TEST INFO ===
            `;
            
            ctx.proxyToClientResponse.writeHead(200, {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Length': Buffer.byteLength(testInfo),
                'X-Served-By': 'Proxy Magic Testing Demo'
            });
            ctx.proxyToClientResponse.end(testInfo);
            return;
        }
        
        console.log(`✅ [TEST DEMO] Response modification complete`);
    }
};

module.exports = localTestingDemo; 