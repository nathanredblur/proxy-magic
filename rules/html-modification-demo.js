const Proxy = require('http-mitm-proxy').Proxy;

/** @type {import('../types').Rule} */
const htmlModificationDemo = {
    name: 'HTML Modification Demo - Content Enhancement',
    
    /**
     * Match example domains for HTML testing
     */
    match: (parsedUrl, clientReq, ctx) => {
        return parsedUrl.hostname === 'example.com' || 
               parsedUrl.hostname === 'example.net' || 
               parsedUrl.hostname === 'test.example';
    },

    /**
     * Prepare request for HTML modification
     */
    onRequest: (ctx, parsedUrl) => {
        console.log(`📄 [HTML DEMO] Intercepting HTML request: ${parsedUrl.href}`);
        
        // Redirect to example.com with HTTP for testing HTTPS -> HTTP
        ctx.proxyToServerRequestOptions.hostname = 'example.com';
        ctx.proxyToServerRequestOptions.port = 80; // HTTP port for testing HTTPS -> HTTP
        
        // Ensure path is set correctly - use original path or default to '/'
        const originalPath = parsedUrl.pathname + (parsedUrl.search || '');
        ctx.proxyToServerRequestOptions.path = originalPath || '/';
        
        // Add headers for HTML modification demo
        ctx.proxyToServerRequestOptions.headers = ctx.proxyToServerRequestOptions.headers || {};
        ctx.proxyToServerRequestOptions.headers['X-HTML-Test'] = 'Content Modification Demo';
        ctx.proxyToServerRequestOptions.headers['X-Original-Host'] = parsedUrl.hostname;

        // Generate a curl command to test the request (HTTP for testing)
        const curlCommand = `curl -v -H "X-HTML-Test: Content Modification Demo" -H "X-Original-Host: ${parsedUrl.hostname}" http://${ctx.proxyToServerRequestOptions.hostname}${ctx.proxyToServerRequestOptions.path}`;
        console.log(`🔍 [HTML DEMO] Curl command: ${curlCommand}`);
        
        console.log(`🔧 [HTML DEMO] Proxying ${parsedUrl.href} -> http://${ctx.proxyToServerRequestOptions.hostname}${ctx.proxyToServerRequestOptions.path} (HTTPS->HTTP test)`);
        
        // Enable response modification for HTML content
        const acceptHeader = ctx.clientToProxyRequest.headers['accept'] || '';
        if (acceptHeader.includes('text/html')) {
            console.log(`📄 [HTML DEMO] HTML request detected, preparing for response modification`);
            ctx.use(Proxy.gunzip);
        }
    },

    /**
     * Modify HTML responses to add banners and styling
     */
    onResponse: (ctx, parsedUrl) => {
        console.log(`📨 [HTML DEMO] Processing HTML response`);
        
        // Add test headers to all responses
        ctx.proxyToClientResponse.setHeader('X-Proxy-Magic-Test', 'HTML Demo Active');
        ctx.proxyToClientResponse.setHeader('X-Test-Timestamp', new Date().toISOString());
        ctx.proxyToClientResponse.setHeader('X-Original-Host', parsedUrl.hostname);
        ctx.proxyToClientResponse.setHeader('X-Demo-Type', 'HTML Content Modification');
        
        const contentType = ctx.serverToProxyResponse.headers['content-type'] || '';
        
        // Ensure proper UTF-8 encoding for HTML responses
        if (contentType.includes('text/html') && !contentType.includes('charset')) {
            ctx.proxyToClientResponse.setHeader('Content-Type', contentType + '; charset=utf-8');
        }
        
        // HTML response modification
        if (contentType.includes('text/html')) {
            console.log(`🌐 [HTML DEMO] Modifying HTML response`);
            
            ctx.onResponseData(function(ctx, chunk, callback) {
                let html = chunk.toString();
                
                // Add a test banner showing HTTPS -> HTTP redirection working
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
                        🎨 <strong>HTTPS → HTTP Redirection Working!</strong> 🎨
                        <br>
                        <small style="opacity: 0.9;">
                            Original: ${parsedUrl.hostname} (HTTPS) → example.com:80 (HTTP) by Proxy Magic
                        </small>
                    </div>
                    <div style="height: 80px;"></div>
                `;
                
                // Insert banner
                if (html.includes('<body>')) {
                    html = html.replace('<body>', '<body>' + testBanner);
                } else {
                    html = testBanner + html;
                }
                
                console.log(`✨ [HTML DEMO] HTML modification complete - HTTPS->HTTP redirection working!`);
                return callback(null, Buffer.from(html));
            });
        }
        
        console.log(`✅ [HTML DEMO] Response processing complete`);
    }
};

module.exports = htmlModificationDemo; 