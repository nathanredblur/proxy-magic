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
        name: 'Kraken HTML Redirect to Localhost',
        match: (parsedUrl, clientReq, ctx) => {
            return (
                parsedUrl.hostname.includes('kraken-dev-') &&
                parsedUrl.pathname.startsWith('/my/money/account') &&
                (clientReq.headers['accept'] || '').includes('text/html')
            );
        },
        onRequest: (ctx, parsedUrl) => {
            const TARGET_HOST = 'localhost'; // Could be configurable too
            const TARGET_PORT = 9045;    // Could be configurable too

            ctx.proxyToServerRequestOptions.host = TARGET_HOST;
            ctx.proxyToServerRequestOptions.port = TARGET_PORT;
            ctx.proxyToServerRequestOptions.path = parsedUrl.pathname + parsedUrl.search;
            ctx.proxyToServerRequestOptions.headers['Host'] = `${TARGET_HOST}:${TARGET_PORT}`;
            ctx.proxyToServerRequestOptions.protocol = 'http:';
            // logger.log(1, `[RULE: ${this.name || 'Kraken Redirect'}] Redirecting to http://${TARGET_HOST}:${TARGET_PORT}${ctx.proxyToServerRequestOptions.path}`);
            // We'll add proper logging in proxy-server.js based on a logger utility
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