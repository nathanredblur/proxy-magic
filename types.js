/**
 * @typedef {Object} Rule
 * @property {string} [name] - Optional descriptive name for the rule.
 * @property {(parsedUrl: URL, clientReq: import('http').IncomingMessage, ctx: any) => boolean} match - Function to determine if the rule applies.
 * @property {(ctx: any, parsedUrl: URL) => void} [onRequest] - Optional function to modify the request to the target server.
 * @property {(ctx: any, parsedUrl: URL) => void} [onResponse] - Optional function to modify the response to the client.
 */

module.exports = {}; // Only for JSDoc exports 