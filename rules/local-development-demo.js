/** @type {import('../types').Rule} */
const localDevelopmentDemo = {
    name: 'Local Development Demo - Localhost Testing',
    
    /**
     * Match localhost and development server requests
     */
    match: (parsedUrl, clientReq, ctx) => {
        // Match localhost on specific ports
        if (parsedUrl.hostname === 'localhost' && parsedUrl.port === '3000') return true;
        if (parsedUrl.hostname === '127.0.0.1' && parsedUrl.port === '8000') return true;
        
        // Match development subdomains
        if (parsedUrl.hostname.startsWith('test-')) return true;
        if (parsedUrl.hostname.endsWith('.test')) return true;
        if (parsedUrl.hostname.endsWith('.local')) return true;
        
        return false;
    },

    /**
     * Handle local development requests
     */
    onRequest: (ctx, parsedUrl) => {
        console.log(`🏠 [DEV DEMO] Intercepting local development request: ${parsedUrl.href}`);
        
        // Add development-specific headers
        ctx.proxyToServerRequestOptions.headers['X-Local-Test'] = 'Development Server Demo';
        ctx.proxyToServerRequestOptions.headers['X-Original-Host'] = parsedUrl.hostname;
        ctx.proxyToServerRequestOptions.headers['X-Dev-Mode'] = 'true';
        ctx.proxyToServerRequestOptions.headers['X-Proxy-Enhanced'] = 'local-development';
        
        // Handle different development scenarios
        if (parsedUrl.hostname === 'localhost' && parsedUrl.port === '3000') {
            console.log(`🚀 [DEV DEMO] React/Next.js development server detected`);
            
            // Add React development headers
            ctx.proxyToServerRequestOptions.headers['X-Framework'] = 'React/Next.js';
            ctx.proxyToServerRequestOptions.headers['X-Dev-Port'] = '3000';
            
        } else if (parsedUrl.hostname === '127.0.0.1' && parsedUrl.port === '8000') {
            console.log(`🐍 [DEV DEMO] Django/Python development server detected`);
            
            // Add Python development headers
            ctx.proxyToServerRequestOptions.headers['X-Framework'] = 'Django/Python';
            ctx.proxyToServerRequestOptions.headers['X-Dev-Port'] = '8000';
            
        } else if (parsedUrl.hostname.endsWith('.test') || parsedUrl.hostname.endsWith('.local')) {
            console.log(`🧪 [DEV DEMO] Custom test domain detected`);
            
            // For custom test domains, redirect to a simple example
            ctx.proxyToServerRequestOptions.hostname = 'httpbin.org';
            ctx.proxyToServerRequestOptions.port = 443;
            ctx.proxyToServerRequestOptions.path = '/json';
            
            ctx.proxyToServerRequestOptions.headers['X-Framework'] = 'Custom Test Domain';
            ctx.proxyToServerRequestOptions.headers['X-Redirected-From'] = parsedUrl.hostname;
        }
        
        // Add development query parameters
        const url = new URL(`http${parsedUrl.port === '443' ? 's' : ''}://${ctx.proxyToServerRequestOptions.hostname}:${ctx.proxyToServerRequestOptions.port || parsedUrl.port || '80'}${ctx.proxyToServerRequestOptions.path || parsedUrl.pathname}`);
        url.searchParams.set('dev_mode', 'true');
        url.searchParams.set('proxy_test', 'local_development');
        url.searchParams.set('timestamp', Date.now().toString());
        
        // Preserve existing query parameters
        if (parsedUrl.search) {
            const originalParams = new URLSearchParams(parsedUrl.search);
            for (const [key, value] of originalParams) {
                if (!url.searchParams.has(key)) {
                    url.searchParams.set(key, value);
                }
            }
        }
        
        ctx.proxyToServerRequestOptions.path = url.pathname + url.search;
        
        console.log(`✅ [DEV DEMO] Local development request prepared`);
    },

    /**
     * Add development-specific response headers and information
     */
    onResponse: (ctx, parsedUrl) => {
        console.log(`📨 [DEV DEMO] Processing local development response`);
        
        // Add development headers to the response
        ctx.proxyToClientResponse.setHeader('X-Proxy-Magic-Test', 'Local Development Demo Active');
        ctx.proxyToClientResponse.setHeader('X-Test-Timestamp', new Date().toISOString());
        ctx.proxyToClientResponse.setHeader('X-Original-Host', parsedUrl.hostname);
        ctx.proxyToClientResponse.setHeader('X-Demo-Type', 'Local Development Testing');
        ctx.proxyToClientResponse.setHeader('X-Dev-Environment', 'proxy-enhanced');
        
        // Add CORS headers for development
        ctx.proxyToClientResponse.setHeader('Access-Control-Allow-Origin', '*');
        ctx.proxyToClientResponse.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        ctx.proxyToClientResponse.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        
        const contentType = ctx.serverToProxyResponse.headers['content-type'] || '';
        
        // Handle JSON responses (common in development APIs)
        if (contentType.includes('application/json')) {
            console.log(`📊 [DEV DEMO] Processing JSON development response`);
            
            ctx.onResponseData(function(ctx, chunk, callback) {
                try {
                    let jsonData = JSON.parse(chunk.toString());
                    
                    // Add development metadata
                    jsonData._developmentInfo = {
                        proxyActive: true,
                        originalHost: parsedUrl.hostname,
                        originalPort: parsedUrl.port || 'default',
                        framework: ctx.proxyToServerRequestOptions.headers['X-Framework'] || 'Unknown',
                        timestamp: new Date().toISOString(),
                        environment: 'development',
                        proxyEnhanced: true
                    };
                    
                    // Add development warnings if needed
                    if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
                        jsonData._developmentInfo.warning = 'This is a development server response';
                    }
                    
                    console.log(`📊 [DEV DEMO] JSON development response enhanced`);
                    return callback(null, Buffer.from(JSON.stringify(jsonData, null, 2)));
                    
                } catch (e) {
                    console.log(`⚠️ [DEV DEMO] Could not parse JSON: ${e.message}`);
                    return callback(null, chunk);
                }
            });
        }
        
        // Handle HTML responses (development servers often serve HTML)
        else if (contentType.includes('text/html')) {
            console.log(`🌐 [DEV DEMO] Processing HTML development response`);
            
            ctx.onResponseData(function(ctx, chunk, callback) {
                let html = chunk.toString();
                
                // Add development banner
                const devBanner = `
                    <div style="
                        position: fixed; 
                        top: 0; 
                        left: 0; 
                        right: 0; 
                        background: linear-gradient(135deg, #2d3748, #4a5568); 
                        color: white; 
                        padding: 10px; 
                        text-align: center; 
                        z-index: 10000;
                        font-family: 'Courier New', monospace;
                        font-size: 12px;
                        border-bottom: 2px solid #38b2ac;
                    ">
                        🛠️ <strong>Development Environment Detected</strong> 🛠️
                        <br>
                        <small>
                            ${parsedUrl.hostname}:${parsedUrl.port || 'default'} | 
                            Framework: ${ctx.proxyToServerRequestOptions.headers['X-Framework'] || 'Unknown'} | 
                            Proxy Enhanced
                        </small>
                    </div>
                    <div style="height: 60px;"></div>
                `;
                
                // Insert development banner
                if (html.includes('<body>')) {
                    html = html.replace('<body>', '<body>' + devBanner);
                } else {
                    html = devBanner + html;
                }
                
                // Add development console script
                const devScript = `
                    <script>
                        console.group('🛠️ Proxy Magic - Development Mode');
                        console.log('Original Host:', '${parsedUrl.hostname}:${parsedUrl.port || 'default'}');
                        console.log('Framework:', '${ctx.proxyToServerRequestOptions.headers['X-Framework'] || 'Unknown'}');
                        console.log('Proxy Enhanced:', true);
                        console.log('Environment:', 'Development');
                        console.log('Timestamp:', '${new Date().toISOString()}');
                        console.groupEnd();
                        
                        // Add development helper functions
                        window.proxyMagic = {
                            info: () => console.table({
                                'Original Host': '${parsedUrl.hostname}:${parsedUrl.port || 'default'}',
                                'Framework': '${ctx.proxyToServerRequestOptions.headers['X-Framework'] || 'Unknown'}',
                                'Environment': 'Development',
                                'Proxy Enhanced': true
                            }),
                            originalUrl: '${parsedUrl.href}',
                            framework: '${ctx.proxyToServerRequestOptions.headers['X-Framework'] || 'Unknown'}'
                        };
                        
                        console.log('💡 Tip: Use proxyMagic.info() for development information');
                    </script>
                `;
                
                html = html.replace('</head>', devScript + '</head>');
                
                console.log(`✨ [DEV DEMO] HTML development response enhanced`);
                return callback(null, Buffer.from(html));
            });
        }
        
        console.log(`✅ [DEV DEMO] Local development response processing complete`);
    }
};

module.exports = localDevelopmentDemo; 