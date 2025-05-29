const Proxy = require('http-mitm-proxy').Proxy;
const path = require('path');
const rules = require('./rules'); // Import the rules

// --- Logging Configuration ---
// 0: No logs (except fatal errors), 1: Basic logs, 2: Debug logs
const LOG_LEVEL = parseInt(process.env.PROXY_LOG_LEVEL || '1', 10);

const logger = {
    log: (level, ...args) => {
        if (LOG_LEVEL >= level) {
            console.log(...args);
        }
    },
    error: (...args) => {
        console.error(...args);
    }
};

// --- Global Error Handlers ---
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  logger.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});

const PROXY_PORT = 8080;

logger.log(2, '[DEBUG] Initializing proxy object...');
const proxy = new Proxy();
logger.log(2, '[DEBUG] Proxy object initialized.');

logger.log(1, 'Initializing MITM Proxy Server...');
logger.log(1, `Log level set to: ${LOG_LEVEL}`)

const caDir = path.join(__dirname, '.proxy_certs');
const caCertPath = path.join(caDir, 'certs', 'ca.pem');
logger.log(2, `[DEBUG] CA directory set to: ${caDir}`);

logger.log(1, 'Please ensure the root CA certificate is generated and trusted.');
logger.log(1, `The CA certificate (ca.pem) for this proxy will be stored in: ${caCertPath}`);

proxy.onError(function(ctx, err, errorKind) {
    logger.error('---------------------------------------------------------------------');
    logger.error(`PROXY ERROR - Kind: ${errorKind}`);
    if (ctx) {
        logger.error(`PROXY ERROR - Client URL: ${ctx.clientToProxyRequest ? ctx.clientToProxyRequest.url : 'N/A'}`);
        // Add more context if available and needed
    }
    logger.error('PROXY ERROR - Details:', err);
    logger.error('---------------------------------------------------------------------');
});

proxy.onRequest(function(ctx, callback) {
    const clientReq = ctx.clientToProxyRequest;
    const reqUrl = clientReq.url;
    logger.log(2, `[DEBUG onRequest] Intercepting: ${clientReq.method} ${reqUrl}`);

    ctx.proxyProcessed = false; // Flag to indicate if any rule processed this request
    ctx.matchedRule = null;     // Store the rule that matched

    try {
        let parsedUrl;
        if (reqUrl.startsWith('http://') || reqUrl.startsWith('https://')) {
            parsedUrl = new URL(reqUrl);
        } else if (clientReq.headers.host) {
            const protocol = ctx.isSSL ? 'https://' : 'http://';
            let pathAndQuery = reqUrl;
            if (reqUrl.includes(':') && !reqUrl.startsWith('/')) {
                pathAndQuery = '/'; 
            } else if (!reqUrl.startsWith('/')){
                pathAndQuery = '/' + reqUrl;
            }
            parsedUrl = new URL(`${protocol}${clientReq.headers.host}${pathAndQuery}`);
        } else {
            logger.log(1, `[onRequest] Could not determine absolute URL for: ${reqUrl}, skipping rule processing.`);
            return callback();
        }
        
        for (const rule of rules) {
            if (rule.match(parsedUrl, clientReq, ctx)) {
                logger.log(1, `[onRequest] Rule '${rule.name || 'Unnamed Rule'}' matched for ${reqUrl}`);
                ctx.proxyProcessed = true;
                ctx.matchedRule = rule;
                if (rule.onRequest) {
                    logger.log(2, `[DEBUG onRequest] Executing onRequest for rule '${rule.name || 'Unnamed Rule'}'`);
                    rule.onRequest(ctx, parsedUrl);
                }
                break; // Stop after first matching rule
            }
        }

        if (!ctx.proxyProcessed) {
            logger.log(2, `[DEBUG onRequest] No rule matched for ${reqUrl}. Passing through.`);
        }

    } catch (e) {
        logger.error(`[onRequest] Error processing rules for ${reqUrl}:`, e);
    }

    return callback();
});

proxy.onResponse(function(ctx, callback) {
    logger.log(2, `[DEBUG onResponse] Received response for: ${ctx.clientToProxyRequest.url}`);

    if (ctx.proxyProcessed && ctx.matchedRule && ctx.matchedRule.onResponse) {
        logger.log(2, `[DEBUG onResponse] Executing onResponse for rule '${ctx.matchedRule.name || 'Unnamed Rule'}'`);
        try {
             // Re-parse URL if necessary for onResponse, or pass from onRequest if always available
            let parsedUrl;
            const clientReq = ctx.clientToProxyRequest;
            const reqUrl = clientReq.url;
            if (reqUrl.startsWith('http://') || reqUrl.startsWith('https://')) {
                parsedUrl = new URL(reqUrl);
            } else if (clientReq.headers.host) {
                const protocol = ctx.isSSL ? 'https://' : 'http://';
                let pathAndQuery = reqUrl;
                if (reqUrl.includes(':') && !reqUrl.startsWith('/')) { pathAndQuery = '/'; }
                else if (!reqUrl.startsWith('/')){ pathAndQuery = '/' + reqUrl; }
                parsedUrl = new URL(`${protocol}${clientReq.headers.host}${pathAndQuery}`);
            } else {
                logger.log(1, `[onResponse] Could not determine absolute URL for: ${reqUrl}, skipping response rule.`);
                return callback(); 
            }
            ctx.matchedRule.onResponse(ctx, parsedUrl);
        } catch (e) {
            logger.error(`[onResponse] Error executing onResponse for rule '${ctx.matchedRule.name || 'Unnamed Rule'}':`, e);
        }
    } else {
        logger.log(2, `[DEBUG onResponse] No matched rule or no onResponse handler for ${ctx.clientToProxyRequest.url}. Passing through.`);
    }
    return callback(); 
});

logger.log(2, '[DEBUG] Attempting to start proxy listener...');
proxy.listen({ host: '127.0.0.1', port: PROXY_PORT, sslCaDir: caDir }, (err) => {
    if (err) {
        logger.error('FATAL ERROR starting MITM proxy listener:', err);
        return process.exit(1);
    }
    logger.log(1, `MITM Proxy listening on http://127.0.0.1:${PROXY_PORT}`);
    logger.log(1, 'CA certificate for SSL interception is configured to use path within:', caDir);
});

process.on('SIGINT', () => {
    logger.log(1, '\nShutting down MITM proxy...');
    if (proxy) {
        proxy.close(() => {
            logger.log(1, 'MITM Proxy closed.');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
}); 