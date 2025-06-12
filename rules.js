const path = require('path'); // Import the path module
const Proxy = require('http-mitm-proxy').Proxy; // Required for ctx.use(Proxy.gunzip)

/**
 * @typedef {Object} Rule
 * @property {string} [name] - Optional descriptive name for the rule.
 * @property {(parsedUrl: URL, clientReq: import('http').IncomingMessage, ctx: any) => boolean} match - Function to determine if the rule applies.
 * @property {(ctx: any, parsedUrl: URL) => void} [onRequest] - Optional function to modify the request to the target server.
 * @property {(ctx: any, parsedUrl: URL) => void} [onResponse] - Optional function to modify the response to the client.
 */

/** @type {Rule[]} */
const rules = [
    {
        name: 'Kraken Assets & HTML Redirect to Localhost (Filename Only)',
        match: (parsedUrl, clientReq, ctx) => {
            // Now matches any file type under the specified path and hostname pattern
            return (
                parsedUrl.hostname.includes('kraken-dev-') &&
                parsedUrl.pathname.startsWith('/my/money/') // Broadened path slightly to include manifest if it is at /my/money/manifest...
            );
        },
        onRequest: (ctx, parsedUrl) => {
            const TARGET_HOST = 'localhost';
            const TARGET_PORT = 9045;

            // Extract filename from the original pathname
            const originalPathname = parsedUrl.pathname;
            const filename = path.basename(originalPathname);
            
            // Construct the new path: /filename?originalquery
            const newPath = '/' + filename + parsedUrl.search; 

            const originalHostHeader = `${TARGET_HOST}:${TARGET_PORT}`;

            // Clean up proxyToServerRequestOptions for a fresh HTTP request
            // Start with a minimal set of options, then add what's needed.
            const newOptions = {
                host: TARGET_HOST,
                port: TARGET_PORT,
                path: newPath, // Use only the filename + query for the path
                method: ctx.clientToProxyRequest.method, // Preserve original method
                headers: { // Start with minimal headers, can be more selective
                    ...ctx.clientToProxyRequest.headers, // Carry over original headers
                    'Host': originalHostHeader // Set the correct Host header for the target
                }
            };
            
            // Delete common SSL-related properties that might confuse an HTTP request
            delete newOptions.headers['Upgrade-Insecure-Requests']; // Often sent by browsers for HTTPS
            // Overwrite the context's request options object
            for (const key in ctx.proxyToServerRequestOptions) {
                delete ctx.proxyToServerRequestOptions[key];
            }
            Object.assign(ctx.proxyToServerRequestOptions, newOptions);
            
            if (ctx.isSSL) {
                ctx.isSSL = false; 
            }
            // Log an info message via the logger in proxy-server.js
            // Example: logger.log(1, `[RULE: ${this.name}] Redirecting ${parsedUrl.href} to http://${TARGET_HOST}:${TARGET_PORT}${newPath}`);
        }
    },
    {
        name: 'Banking HTML Redirect',
        match: (parsedUrl, clientReq, ctx) => {
            // Now matches any file type under the specified path and hostname pattern
            return (
                parsedUrl.hostname.includes('kraken-dev-') &&
                parsedUrl.pathname.startsWith('/my/banking/') // Broadened path slightly to include manifest if it is at /my/money/manifest...
            );
        },
        onRequest: (ctx, parsedUrl) => {
            const TARGET_HOST = 'localhost';
            const TARGET_PORT = 3400;

            // Keep the full original pathname and query
            const newPath = parsedUrl.pathname + parsedUrl.search; 

            const originalHostHeader = `${TARGET_HOST}:${TARGET_PORT}`;

            // Clean up proxyToServerRequestOptions for a fresh HTTPS request
            const newOptions = {
                host: TARGET_HOST,
                port: TARGET_PORT,
                path: newPath, // Use the full original path + query
                method: ctx.clientToProxyRequest.method, // Preserve original method
                headers: { // Start with minimal headers, can be more selective
                    ...ctx.clientToProxyRequest.headers, // Carry over original headers
                    'Host': originalHostHeader, // Set the correct Host header for the target
                }
            };
            
            Object.assign(ctx.proxyToServerRequestOptions, newOptions);
        }
    },
    {
        name: 'WebSocket Redirect to Localhost',
        match: (parsedUrl, clientReq, ctx) => {
            // Match kraken-dev hostnames with sofitest.com domain on port 3401
            return (
                parsedUrl.hostname.includes('kraken-dev-') &&
                parsedUrl.hostname.includes('sofitest.com') &&
                parsedUrl.port === '3401'
            );
        },
        onRequest: (ctx, parsedUrl) => {
            const TARGET_HOST = 'localhost';
            const TARGET_PORT = 3401;

            // Keep the full original pathname and query
            const newPath = parsedUrl.pathname + (parsedUrl.search || ''); 

            const originalHostHeader = `${TARGET_HOST}:${TARGET_PORT}`;

            // Clean up proxyToServerRequestOptions for a fresh HTTPS request
            const newOptions = {
                host: TARGET_HOST,
                port: TARGET_PORT,
                path: newPath, // Use the full original path + query
                method: ctx.clientToProxyRequest.method, // Preserve original method
                headers: { 
                    ...ctx.clientToProxyRequest.headers, // Carry over original headers
                    'Host': originalHostHeader, // Set the correct Host header for the target
                }
            };
            
            Object.assign(ctx.proxyToServerRequestOptions, newOptions);
        }
    },
    {
        name: 'Example.org Modifier',
        match: (parsedUrl, clientReq, ctx) => {
            return parsedUrl.hostname.includes('example.org');
        },
        onRequest: (ctx, parsedUrl) => {
            ctx.proxyToServerRequestOptions.headers['X-Custom-MITM-Header'] = 'Hello from Modular Proxy!';
            
            const acceptHeader = ctx.clientToProxyRequest.headers['accept'] || '';
            if (acceptHeader.includes('text/html')) {
                // logger.log(2, `[RULE: ${this.name || 'Example.org Modifier'}] example.org is HTML, preparing for response modification.`);
                ctx.use(Proxy.gunzip); // Enable gunzip for the response if it's gzipped
            }
        },
        onResponse: (ctx, parsedUrl) => {
            if (
                ctx.serverToProxyResponse.headers['content-type'] &&
                ctx.serverToProxyResponse.headers['content-type'].includes('text/html')
            ) {
                // logger.log(1, `[RULE: ${this.name || 'Example.org Modifier'}] Modifying HTML response from example.org`);
                ctx.onResponseData(function(ctx, chunk, callback) {
                    let body = chunk.toString();
                    body = body.replace('<body>', '<body><h1 style="color:green; background:lightgray; padding:5px;">MODIFIED BY MODULAR PROXY!</h1>');
                    return callback(null, Buffer.from(body));
                });
            }
        }
    }
    // Add more rules here
];

module.exports = rules; 