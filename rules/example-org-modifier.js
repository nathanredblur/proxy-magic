const Proxy = require('http-mitm-proxy').Proxy; // Required for ctx.use(Proxy.gunzip)

/** @type {import('../types').Rule} */
const exampleOrgModifierRule = {
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
};

module.exports = exampleOrgModifierRule; 