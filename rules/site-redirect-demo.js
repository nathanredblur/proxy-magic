const Proxy = require('http-mitm-proxy').Proxy;

/** @type {import('../types').Rule} */
const siteRedirectDemo = {
    name: 'Site Redirect Demo - CNN to BBC News',
    
    /**
     * Match CNN requests to demonstrate real site redirection
     */
    match: (parsedUrl, clientReq, ctx) => {
        return parsedUrl.hostname.includes('cnn.com');
    },

    /**
     * Redirect CNN traffic to BBC News
     */
    onRequest: (ctx, parsedUrl) => {
        console.log(`🔄 [REDIRECT DEMO] Redirecting CNN request: ${parsedUrl.href}`);
        
        // Redirect to BBC News
        ctx.proxyToServerRequestOptions.hostname = 'www.bbc.com';
        ctx.proxyToServerRequestOptions.port = 443;
        ctx.proxyToServerRequestOptions.path = '/news';
        
        // Add custom headers to indicate redirection
        ctx.proxyToServerRequestOptions.headers['X-Redirect-Demo'] = 'CNN to BBC';
        ctx.proxyToServerRequestOptions.headers['X-Original-Host'] = parsedUrl.hostname;
        ctx.proxyToServerRequestOptions.headers['X-Original-Path'] = parsedUrl.pathname;
        ctx.proxyToServerRequestOptions.headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
        
        // Preserve some query parameters if they exist
        const url = new URL(`https://${ctx.proxyToServerRequestOptions.hostname}${ctx.proxyToServerRequestOptions.path}`);
        
        // Add tracking parameters to show this was redirected
        url.searchParams.set('redirected_from', 'cnn');
        url.searchParams.set('proxy_redirect', 'true');
        url.searchParams.set('timestamp', Date.now().toString());
        
        ctx.proxyToServerRequestOptions.path = url.pathname + url.search;
        
        // Enable response modification for HTML content
        const acceptHeader = ctx.clientToProxyRequest.headers['accept'] || '';
        if (acceptHeader.includes('text/html')) {
            console.log(`📄 [REDIRECT DEMO] HTML request detected, preparing for response modification`);
            ctx.use(Proxy.gunzip);
        }
        
        console.log(`✅ [REDIRECT DEMO] Request redirected from CNN to BBC`);
    },

    /**
     * Modify the response to show redirect information
     */
    onResponse: (ctx, parsedUrl) => {
        console.log(`📨 [REDIRECT DEMO] Processing redirected response`);
        
        // Add custom headers to show the redirection happened
        ctx.proxyToClientResponse.setHeader('X-Proxy-Magic-Test', 'Site Redirect Demo Active');
        ctx.proxyToClientResponse.setHeader('X-Redirected-From', parsedUrl.hostname);
        ctx.proxyToClientResponse.setHeader('X-Redirected-To', 'www.bbc.com');
        ctx.proxyToClientResponse.setHeader('X-Test-Timestamp', new Date().toISOString());
        ctx.proxyToClientResponse.setHeader('X-Demo-Type', 'Site-to-Site Redirection');
        
        const contentType = ctx.serverToProxyResponse.headers['content-type'] || '';
        
        // Modify HTML responses to add redirect notification
        if (contentType.includes('text/html')) {
            console.log(`🌐 [REDIRECT DEMO] Adding redirect banner to HTML`);
            
            ctx.onResponseData(function(ctx, chunk, callback) {
                let html = chunk.toString();
                
                // Add a redirect notification banner
                const redirectBanner = `
                    <div style="
                        position: fixed; 
                        top: 0; 
                        left: 0; 
                        right: 0; 
                        background: linear-gradient(135deg, #e74c3c, #c0392b); 
                        color: white; 
                        padding: 12px; 
                        text-align: center; 
                        z-index: 10000;
                        font-family: 'Arial', sans-serif;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                        border-bottom: 3px solid #f39c12;
                        font-size: 14px;
                    ">
                        🚀 <strong>Site Redirect Demo Active</strong> 🚀
                        <br>
                        <small style="opacity: 0.9;">
                            You requested: <strong>${parsedUrl.hostname}</strong> → Now viewing: <strong>BBC News</strong>
                        </small>
                    </div>
                    <div style="height: 70px;"></div>
                `;
                
                // Insert banner at the beginning of the body
                if (html.includes('<body')) {
                    // Find the end of the opening body tag
                    const bodyTagEnd = html.indexOf('>', html.indexOf('<body')) + 1;
                    html = html.slice(0, bodyTagEnd) + redirectBanner + html.slice(bodyTagEnd);
                } else {
                    html = redirectBanner + html;
                }
                
                // Add redirect information box
                const redirectInfo = `
                    <div style="
                        position: fixed; 
                        bottom: 20px; 
                        right: 20px; 
                        background: rgba(0, 0, 0, 0.8); 
                        color: white; 
                        padding: 15px; 
                        border-radius: 8px;
                        font-family: monospace;
                        font-size: 12px;
                        z-index: 9999;
                        max-width: 300px;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                    ">
                        <strong>🔄 Redirect Info:</strong><br>
                        <strong>Original:</strong> ${parsedUrl.href}<br>
                        <strong>Redirected to:</strong> BBC News<br>
                        <strong>Time:</strong> ${new Date().toLocaleTimeString()}<br>
                        <small>This is a demo of site-to-site redirection</small>
                    </div>
                `;
                
                // Add the info box before closing body tag
                html = html.replace('</body>', redirectInfo + '</body>');
                
                console.log(`✨ [REDIRECT DEMO] HTML modification complete`);
                return callback(null, Buffer.from(html));
            });
        }
        
        console.log(`✅ [REDIRECT DEMO] Response processing complete`);
    }
};

module.exports = siteRedirectDemo; 