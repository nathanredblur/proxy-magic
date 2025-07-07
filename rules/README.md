# Rules Directory

This folder contains all proxy rules organized in a modular way to facilitate administration and testing.

## 📁 Structure

- **`../types.js`** - TypeScript type definitions for rules
- **`*.js`** - Individual rule files with specific functionality
- **`README.md`** - This documentation file
- **`TEST-CATALOG.md`** - Comprehensive testing guide

## 🎯 Current Rules

### Demo Rules (Safe for Testing)

1. **`http-testing-demo.js`** - **🚀 ENHANCED** HTTP→HTTPS conversion with manual response handling using httpbin.org
2. **`json-api-demo.js`** - JSON API response modification using JSONPlaceholder
3. **`html-modification-demo.js`** - **🚀 ENHANCED** HTML content enhancement with protocol conversion support
4. **`local-development-demo.js`** - Localhost and development server testing with framework detection
5. **`site-redirect-demo.js`** - Real-world site redirection (CNN → BBC News) with visual indicators

### Basic Examples

6. **`example-org-modifier.js`** - Simple example.org modifier demonstrating basic rule structure

## 🚀 New Advanced Features

### Manual Response Handling

Rules can now bypass proxy limitations by handling responses manually:

```javascript
/** @type {import('../types').Rule} */
const advancedRule = {
  name: "Manual Response Demo",

  match: (parsedUrl, clientReq, ctx) => {
    return parsedUrl.hostname === "httpbin.org";
  },

  onRequest: (ctx, parsedUrl) => {
    // Mark as manual response to prevent proxy conflicts
    ctx.isManualResponse = true;

    // Custom logic here...

    return false; // Indicate manual handling
  },
};
```

### Protocol Conversion Support

- **HTTP → HTTPS**: Automatic conversion with custom headers and enhanced responses
- **HTTPS → HTTP**: Support for redirecting secure requests to HTTP backends
- **Port-based Detection**: Intelligent protocol switching based on target ports
- **Manual Override**: Custom protocol handling for complex scenarios

## 📋 How to Add a New Rule

1. Create a new `.js` file in this folder
2. Export an object that implements the `Rule` interface (see `../types.js`)
3. The rule will be automatically loaded the next time the proxy is restarted
4. **NEW**: Use manual response handling for complex scenarios

Example:

```javascript
/** @type {import('../types').Rule} */
const myNewRule = {
  name: "My New Rule",
  match: (parsedUrl, clientReq, ctx) => {
    return parsedUrl.hostname.includes("example.com");
  },
  onRequest: (ctx, parsedUrl) => {
    // Option 1: Standard proxy modification
    ctx.proxyToServerRequestOptions.headers["X-Custom"] = "value";

    // Option 2: Manual response handling (NEW)
    if (needsManualHandling) {
      ctx.isManualResponse = true;
      // Handle response manually...
      return false;
    }
  },
  onResponse: (ctx, parsedUrl) => {
    // Modify the response (optional)
  },
};

module.exports = myNewRule;
```

## 🔧 Rule Details

### HTTP Testing Demo (`http-testing-demo.js`) - **🚀 ENHANCED**

**Perfect for**: Learning HTTP→HTTPS conversion and manual response handling

- **Matches**: httpbin.org requests
- **Features**:
  - **NEW**: Manual HTTPS request handling bypassing proxy limitations
  - **NEW**: Protocol conversion from HTTP to HTTPS
  - **NEW**: Enhanced JSON response with proxy magic information
  - **NEW**: Custom header injection and manipulation
  - **NEW**: Automatic curl command generation for debugging
- **Safe**: Uses httpbin.org testing service
- **Technology**: Demonstrates manual response handling with Node.js `https` module

**Example Usage:**

```bash
node start-proxy.js --chrome-url http://httpbin.org/ --chrome  # Test HTTP→HTTPS conversion
```

### JSON API Demo (`json-api-demo.js`)

**Perfect for**: Understanding API response modification

- **Matches**: JSONPlaceholder API requests
- **Features**: Modifies JSON responses, adds metadata, demonstrates API enhancement
- **Safe**: Uses JSONPlaceholder fake API service

### HTML Modification Demo (`html-modification-demo.js`) - **🚀 ENHANCED**

**Perfect for**: Learning webpage content enhancement with protocol support

- **Matches**: example.com, example.net, test.example domains
- **Features**:
  - **UPDATED**: Enhanced protocol conversion support
  - **UPDATED**: Improved HTTPS→HTTP redirection with proper port handling
  - **UPDATED**: Better SSL context management
  - Injects banners, adds CSS styling, content modification
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

## 🧪 Testing Your Rules

### 📋 Complete Test Catalog

For a comprehensive list of all possible tests organized by functionality, see:
**[`TEST-CATALOG.md`](./TEST-CATALOG.md)** - Complete test reference with examples for:

- 🎯 **Matching Tests** - Domain, port, path, parameter, method, and header matching
- 🔄 **Request Tests** - Header manipulation, redirection, parameter modification
- 📨 **Response Tests** - Content modification, header injection, error handling
- 🚀 **NEW**: Manual response handling and protocol conversion tests

### Recommended Testing Sequence

1. **Start with HTTP Testing Demo**: Visit `httpbin.org` to see HTTP→HTTPS conversion
2. **Try JSON API Demo**: Visit `jsonplaceholder.typicode.com` to see API modification
3. **Test HTML Modification Demo**: Visit `example.com` to see content enhancement
4. **Local Development Demo**: Test with `localhost:3000` or `myapp.test`
5. **Site Redirect Demo**: Visit `cnn.com` to see real-world redirection
6. **Protocol Testing**: Use different protocols to test conversion capabilities

### Testing Tips

- **🚀 NEW**: Use `node start-proxy.js --chrome-url http://httpbin.org/ --chrome` to test HTTP→HTTPS conversion
- **🚀 NEW**: Check logs for protocol conversion messages and curl commands
- Use testing domains when possible (httpbin.org, example.com, localhost)
- Check browser developer tools to see added headers
- Look for visual banners and modifications
- Check console for debug messages
- Use `--log=DEBUG` for detailed logging including:
  - Complete request/response details
  - Protocol conversion tracking
  - Generated curl commands
  - Rule processing information
- Reference the **TEST-CATALOG.md** for specific test patterns

## 🎨 Best Practices

### Development Guidelines

- ✅ **Test Safely**: Use testing domains like httpbin.org, example.com, or localhost
- ✅ **Type Safety**: Use JSDoc comments with TypeScript types
- ✅ **Clear Naming**: Use descriptive rule names and console logging
- ✅ **Error Handling**: Add proper error handling for production rules
- ✅ **Performance**: Be mindful of response modification impact
- ✅ **Documentation**: Comment your match logic and modifications

### **🚀 NEW**: Advanced Practices

- ✅ **Manual Response Handling**: Use `ctx.isManualResponse = true` for complex scenarios
- ✅ **Protocol Awareness**: Handle HTTP/HTTPS conversions properly
- ✅ **Conflict Prevention**: Return `false` from `onRequest` when handling manually
- ✅ **Comprehensive Logging**: Use detailed logging for debugging
- ✅ **Statistics Friendly**: Rules are automatically tracked in proxy statistics

## 🔧 Creating Your Own Rules

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
    // Standard proxy modification
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

### **🚀 NEW**: Advanced Rule Template (Manual Response Handling)

```javascript
const https = require("https");
const http = require("http");

/** @type {import('../types').Rule} */
const advancedRule = {
  name: "Advanced Manual Response Rule",

  match: (parsedUrl, clientReq, ctx) => {
    return parsedUrl.hostname === "target-domain.com";
  },

  onRequest: (ctx, parsedUrl) => {
    // Mark as manual response to prevent proxy conflicts
    ctx.isManualResponse = true;

    // Choose protocol based on requirements
    const requestModule = needsHttps ? https : http;
    const port = needsHttps ? 443 : 80;

    // Build custom request
    const customReq = requestModule.request(
      {
        hostname: "target-server.com",
        port: port,
        path: "/custom-endpoint",
        method: ctx.clientToProxyRequest.method,
        headers: {
          // Custom headers
          "X-Proxy-Magic": "Advanced Rule",
          "User-Agent": ctx.clientToProxyRequest.headers["user-agent"],
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          // Process and send custom response
          const enhancedData = JSON.stringify({
            original: JSON.parse(data),
            enhanced: "by-proxy-magic",
            timestamp: new Date().toISOString(),
          });

          ctx.proxyToClientResponse.writeHead(200, {
            "Content-Type": "application/json",
            "X-Enhanced-By": "Proxy Magic",
          });
          ctx.proxyToClientResponse.end(enhancedData);
        });
      }
    );

    customReq.on("error", (err) => {
      ctx.proxyToClientResponse.writeHead(500, {
        "Content-Type": "application/json",
      });
      ctx.proxyToClientResponse.end(JSON.stringify({ error: err.message }));
    });

    customReq.end();

    // Indicate manual handling
    return false;
  },
};

module.exports = advancedRule;
```

## 📊 Statistics Integration

All rules are automatically tracked in the proxy statistics system:

- **Rule Usage**: Which rules are being used and how often
- **Protocol Conversions**: HTTP↔HTTPS conversions are tracked
- **Request Counting**: Rule-matched requests vs pass-through requests
- **Performance Monitoring**: Real-time statistics every 5 minutes

## 🔍 Debugging Your Rules

### Enhanced Logging

With `--log=DEBUG`, you get comprehensive information:

```bash
node start-proxy.js --chrome-url https://example.com --log 2
```

**Debug Information Includes:**

- Complete request/response details
- Protocol conversion tracking
- Generated curl commands for testing
- Rule processing steps
- Manual response handling status

### Common Debugging Patterns

```javascript
// Add detailed logging to your rules
onRequest: (ctx, parsedUrl) => {
  console.log(`🎯 [${ruleName}] Processing: ${parsedUrl.href}`);
  console.log(`🎯 [${ruleName}] Headers:`, ctx.clientToProxyRequest.headers);

  // Your rule logic here

  if (manualHandling) {
    console.log(`🔧 [${ruleName}] Using manual response handling`);
    ctx.isManualResponse = true;
    return false;
  }
};
```

## 🚀 Advanced Features Summary

### Manual Response Handling

- Bypass proxy limitations for complex scenarios
- Direct HTTP/HTTPS request handling
- Custom response processing
- Protocol conversion support

### Protocol Intelligence

- Automatic HTTP↔HTTPS conversion
- Port-based protocol detection
- Custom protocol override
- SSL context management

### Enhanced Debugging

- Comprehensive request/response logging
- Automatic curl command generation
- Protocol conversion tracking
- Rule processing visibility

### Statistics Integration

- Automatic rule usage tracking
- Protocol conversion monitoring
- Performance metrics
- Real-time reporting

## 🤝 Advantages of This Structure

- ✅ **Modular**: Each rule in its own file with focused functionality
- ✅ **Easy maintenance**: Modifying one rule doesn't affect others
- ✅ **Auto-loading**: New rules are automatically detected
- ✅ **Type Safety**: TypeScript type definitions
- ✅ **Testing-Friendly**: Multiple demo rules for learning different scenarios
- ✅ **Safe Testing**: Uses dedicated testing services and example domains
- ✅ **Progressive Learning**: From simple to complex examples
- ✅ **🚀 NEW**: Advanced manual response handling capabilities
- ✅ **🚀 NEW**: Protocol conversion support
- ✅ **🚀 NEW**: Enhanced debugging and monitoring
