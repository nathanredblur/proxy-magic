# Rules Directory

This folder contains all proxy rules organized in a modular way to facilitate administration.

## Structure

- **`types.js`** - TypeScript type definitions for rules (located in project root)
- **`*.js`** - Individual rule files

## Current Rules

### Demo Rules (Safe for Testing)

1. **`http-testing-demo.js`** - HTTP header manipulation using httpbin.org for safe testing
2. **`json-api-demo.js`** - JSON API response modification using JSONPlaceholder
3. **`html-modification-demo.js`** - HTML content enhancement using example.com domains
4. **`local-development-demo.js`** - Localhost and development server testing with framework detection
5. **`site-redirect-demo.js`** - Real-world site redirection (CNN → BBC News) with visual indicators

### Basic Examples

6. **`example-org-modifier.js`** - Simple example.org modifier demonstrating basic rule structure

## How to Add a New Rule

1. Create a new `.js` file in this folder
2. Export an object that implements the `Rule` interface (see `../types.js`)
3. The rule will be automatically loaded the next time the proxy is restarted

Example:

```javascript
/** @type {import('../types').Rule} */
const myNewRule = {
  name: "My New Rule",
  match: (parsedUrl, clientReq, ctx) => {
    return parsedUrl.hostname.includes("example.com");
  },
  onRequest: (ctx, parsedUrl) => {
    // Modify the request
  },
  onResponse: (ctx, parsedUrl) => {
    // Modify the response (optional)
  },
};

module.exports = myNewRule;
```

## Rule Details

### HTTP Testing Demo (`http-testing-demo.js`)

**Perfect for**: Learning header manipulation and HTTP testing

- **Matches**: httpbin.org requests
- **Features**: Redirects to `/headers` endpoint, adds custom headers, demonstrates query parameter manipulation
- **Safe**: Uses httpbin.org testing service

### JSON API Demo (`json-api-demo.js`)

**Perfect for**: Understanding API response modification

- **Matches**: JSONPlaceholder API requests
- **Features**: Modifies JSON responses, adds metadata, demonstrates API enhancement
- **Safe**: Uses JSONPlaceholder fake API service

### HTML Modification Demo (`html-modification-demo.js`)

**Perfect for**: Learning webpage content enhancement

- **Matches**: example.com, example.net, test.example domains
- **Features**: Injects banners, adds CSS styling, content modification
- **Safe**: Uses RFC 2606 example domains

### Local Development Demo (`local-development-demo.js`)

**Perfect for**: Development server testing and framework detection

- **Matches**: localhost:3000, 127.0.0.1:8000, _.test, _.local domains
- **Features**: Framework detection (React/Next.js, Django/Python), CORS headers, development helpers
- **Safe**: Targets local development servers

### Site Redirect Demo (`site-redirect-demo.js`)

**Perfect for**: Understanding real-world site redirection

- **Matches**: CNN.com requests
- **Features**: Redirects to BBC News, adds visual indicators, demonstrates cross-site redirection
- **Note**: Uses real websites - be mindful of usage

### Example.org Modifier (`example-org-modifier.js`)

**Perfect for**: Understanding basic rule structure

- **Matches**: example.org domains
- **Features**: Basic header addition and HTML banner injection
- **Safe**: Uses RFC 2606 example domain

## Testing Your Rules

### 📋 Complete Test Catalog

For a comprehensive list of all possible tests organized by functionality, see:
**[`TEST-CATALOG.md`](./TEST-CATALOG.md)** - Complete test reference with examples for:

- 🎯 **Matching Tests** - Domain, port, path, parameter, method, and header matching
- 🔄 **Request Tests** - Header manipulation, redirection, parameter modification
- 📨 **Response Tests** - Content modification, header injection, error handling

### Recommended Testing Sequence

1. **Start with HTTP Testing Demo**: Visit `httpbin.org` to see header manipulation
2. **Try JSON API Demo**: Visit `jsonplaceholder.typicode.com` to see API modification
3. **Test HTML Modification Demo**: Visit `example.com` to see content enhancement
4. **Local Development Demo**: Test with `localhost:3000` or `myapp.test`
5. **Site Redirect Demo**: Visit `cnn.com` to see real-world redirection

### Testing Tips

- Use testing domains when possible (httpbin.org, example.com, localhost)
- Check browser developer tools to see added headers
- Look for visual banners and modifications
- Check console for debug messages
- Use `DEBUG_RULES=true` for detailed logging
- Reference the **TEST-CATALOG.md** for specific test patterns

## Best Practices

- ✅ **Test Safely**: Use testing domains like httpbin.org, example.com, or localhost
- ✅ **Type Safety**: Use JSDoc comments with TypeScript types
- ✅ **Clear Naming**: Use descriptive rule names and console logging
- ✅ **Error Handling**: Add proper error handling for production rules
- ✅ **Performance**: Be mindful of response modification impact
- ✅ **Documentation**: Comment your match logic and modifications

## Creating Your Own Rules

### Basic Rule Template

```javascript
const Proxy = require("http-mitm-proxy").Proxy; // Only if using ctx.use(Proxy.gunzip)

/** @type {import('../types').Rule} */
const myRule = {
  name: "My Custom Rule",

  match: (parsedUrl, clientReq, ctx) => {
    // Return true if this rule should apply
    return parsedUrl.hostname.includes("my-domain.com");
  },

  onRequest: (ctx, parsedUrl) => {
    // Modify headers
    ctx.proxyToServerRequestOptions.headers["X-Custom"] = "value";

    // Enable response modification for HTML
    const acceptHeader = ctx.clientToProxyRequest.headers["accept"] || "";
    if (acceptHeader.includes("text/html")) {
      ctx.use(Proxy.gunzip);
    }
  },

  onResponse: (ctx, parsedUrl) => {
    // Add response headers
    ctx.proxyToClientResponse.setHeader("X-Modified", "true");

    // Modify content
    const contentType = ctx.serverToProxyResponse.headers["content-type"] || "";
    if (contentType.includes("text/html")) {
      ctx.onResponseData(function (ctx, chunk, callback) {
        let content = chunk.toString();
        // Modify content here
        return callback(null, Buffer.from(content));
      });
    }
  },
};

module.exports = myRule;
```

## Advantages of This Structure

- ✅ **Modular**: Each rule in its own file with focused functionality
- ✅ **Easy maintenance**: Modifying one rule doesn't affect others
- ✅ **Auto-loading**: New rules are automatically detected
- ✅ **Type Safety**: TypeScript type definitions
- ✅ **Testing-Friendly**: Multiple demo rules for learning different scenarios
- ✅ **Safe Testing**: Uses dedicated testing services and example domains
- ✅ **Progressive Learning**: From simple to complex examples
