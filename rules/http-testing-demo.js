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
     * Redirect to httpbin's headers endpoint and add custom headers
     */
    onRequest: (ctx, parsedUrl) => {
        console.log(`🌐 [HTTP DEMO] Intercepting httpbin request: ${parsedUrl.href}`);
        
        // Redirect to httpbin's headers endpoint to show header manipulation
        ctx.proxyToServerRequestOptions.hostname = 'httpbin.org';
        ctx.proxyToServerRequestOptions.port = 443;
        ctx.proxyToServerRequestOptions.path = '/headers';
        
        // Add custom headers that will be visible in the response
        ctx.proxyToServerRequestOptions.headers['X-Proxy-Magic-Demo'] = 'HTTP Testing';
        ctx.proxyToServerRequestOptions.headers['X-Original-Path'] = parsedUrl.pathname;
        ctx.proxyToServerRequestOptions.headers['X-Test-Scenario'] = 'Header Manipulation';
        ctx.proxyToServerRequestOptions.headers['X-User-Agent-Enhanced'] = 'Enhanced by Proxy Magic';
        
        // Demonstrate query parameter manipulation
        const url = new URL(`https://${ctx.proxyToServerRequestOptions.hostname}${ctx.proxyToServerRequestOptions.path}`);
        url.searchParams.set('proxy_test', 'true');
        url.searchParams.set('demo_mode', 'http_headers');
        url.searchParams.set('timestamp', Date.now().toString());
        
        ctx.proxyToServerRequestOptions.path = url.pathname + url.search;
        
        console.log(`✅ [HTTP DEMO] Request modification complete`);
    },

    /**
     * Add test headers to the response
     */
    onResponse: (ctx, parsedUrl) => {
        console.log(`📨 [HTTP DEMO] Processing response from httpbin.org`);
        
        // Add test headers to the response
        ctx.proxyToClientResponse.setHeader('X-Proxy-Magic-Test', 'HTTP Demo Active');
        ctx.proxyToClientResponse.setHeader('X-Test-Timestamp', new Date().toISOString());
        ctx.proxyToClientResponse.setHeader('X-Original-Host', parsedUrl.hostname);
        ctx.proxyToClientResponse.setHeader('X-Demo-Type', 'HTTP Header Testing');
        
        console.log(`✅ [HTTP DEMO] Response headers added`);
    }
};

module.exports = httpTestingDemo; 