# MITM Proxy Server for Development

This project sets up a local Man-in-the-Middle (MITM) proxy server using Node.js and the `http-mitm-proxy` library. It's designed to intercept and modify HTTP/HTTPS traffic for development and testing purposes.

## 🚀 Features

- **Smart Request Interception**: HTTP and HTTPS traffic with intelligent protocol conversion
- **Advanced Rule System**: Modular rules for request/response modification (see `rules/` directory)
- **Automatic SSL Management**: Certificate generation, validation, and cleanup tools
- **Protocol Conversion**: Seamless HTTP ↔ HTTPS conversion with automatic port detection
- **Comprehensive Logging**: Detailed request/response logging with curl command generation
- **Real-time Statistics**: Traffic monitoring with protocol conversion tracking
- **Manual Response Handling**: Support for custom response processing bypassing proxy limitations
- **Automated Browser Setup**: Chrome integration with proxy configuration
- **Clean Process Management**: Automatic cleanup and error handling

## 📊 Advanced Capabilities

### Protocol Intelligence

- **Automatic Protocol Detection**: Smart HTTP/HTTPS switching based on ports (80→HTTP, 443→HTTPS)
- **Manual Protocol Conversion**: Support for HTTP→HTTPS and HTTPS→HTTP redirections
- **Port-based Configuration**: Intelligent proxy setup based on target server ports
- **SSL Certificate Validation**: Advanced certificate management and troubleshooting

### Logging & Debugging

- **Detailed Request Logging**: Complete request/response information with headers
- **Curl Command Generation**: Automatic curl equivalent commands for testing
- **Statistics Tracking**: Real-time monitoring of requests, protocol conversions, and rule usage
- **Error Filtering**: Smart filtering of common connection errors (EPIPE, ECONNRESET)
- **Rule Validation**: Automatic detection and reporting of rule configuration issues

### Certificate Management

- **Advanced Setup Script**: Improved `setup.sh` with SHA-1 based certificate cleanup
- **Duplicate Detection**: Automatic detection and removal of duplicate CA certificates
- **Certificate Validation**: Comprehensive certificate chain verification
- **Cross-platform Support**: Enhanced certificate installation for macOS, Windows, and Linux

## Prerequisites

- Node.js (v14+ recommended) and pnpm (or npm/yarn) installed
- Google Chrome browser (for automated startup script)
- macOS (scripts are optimized for macOS, but can be adapted for other OS)

## Quick Start

1.  **Install Dependencies:**

    ```bash
    pnpm install
    # or npm install
    # or yarn install
    ```

2.  **Start with the convenient script:**

    ```bash
    # Start proxy and Chrome with default settings
    ./start.sh

    # Start with a specific URL
    ./start.sh https://example.com

    # Test HTTP→HTTPS conversion
    ./start.sh http://httpbin.org/

    # Start with debug logging
    ./start.sh --log=DEBUG

    # Start with specific URL and log level
    ./start.sh https://github.com --log=INFO
    ```

## 🛠️ Certificate Management

### Enhanced Setup Script

The `setup.sh` script now includes advanced certificate management:

```bash
# Generate and install certificates (recommended)
./setup.sh

# Show existing certificates
./setup.sh --show-certs

# Clean up duplicate certificates only
./setup.sh --clean-only

# Force regeneration of certificates
./setup.sh --force
```

**Features:**

- **SHA-1 Based Cleanup**: Removes duplicate certificates by hash instead of name
- **Validation**: Comprehensive certificate chain verification
- **Cross-platform**: Support for macOS, Windows, and Linux certificate stores
- **Duplicate Detection**: Automatic identification of conflicting certificates

### Initial Certificate Setup

The first time you run the proxy, it will generate a root Certificate Authority (CA). You **MUST** install this certificate to avoid SSL warnings:

1. **Generate the CA certificate**:

   ```bash
   ./setup.sh  # Recommended method
   ```

2. **Manual Installation** (if setup.sh doesn't work):

   **macOS:**

   1. Open **Keychain Access** → **System** keychain
   2. Drag `ca.pem` from `./.proxy_certs/certs/ca.pem` into Keychain
   3. Double-click the certificate → Expand **Trust** section
   4. Set "When using this certificate:" to **Always Trust**

   **Windows:**

   1. Double-click `ca.pem` → "Install Certificate..." → "Local Machine"
   2. Select "Trusted Root Certification Authorities"

   **Linux:**

   ```bash
   sudo cp ./.proxy_certs/certs/ca.pem /usr/local/share/ca-certificates/proxy-magic.crt
   sudo update-ca-certificates
   ```

## 🎯 Available Startup Methods

### Method 1: Automated Script (Recommended)

The `start.sh` script provides the most convenient way to start the proxy server and Chrome:

```bash
# Basic usage
./start.sh [URL] [--log=LEVEL | -l LEVEL]

# Examples:
./start.sh                                    # Start with about:blank
./start.sh https://example.com                # Start with specific URL
./start.sh http://httpbin.org/                # Test HTTP→HTTPS conversion
./start.sh --log=DEBUG                       # Start with debug logging
./start.sh https://example.com --log=INFO    # URL + log level
./start.sh -l DEBUG https://example.com      # Alternative log syntax
```

**Log Levels:**

- `NONE` or `0`: No logging
- `INFO` or `1`: Standard logging with statistics (default)
- `DEBUG` or `2`: Verbose debugging with detailed request/response info

**Features:**

- Automatically starts the proxy server in background
- Launches Chrome with proper proxy configuration
- Handles process cleanup when Chrome closes
- Uses persistent Chrome profile in `./.chrome_proxy_profile`
- Sets `NODE_TLS_REJECT_UNAUTHORIZED=0` for development
- **Real-time Statistics**: Shows request counts, protocol conversions, and rule usage every 5 minutes

### Method 2: Package.json Scripts

```bash
# Start proxy server and Chrome concurrently
pnpm start           # Uses concurrently to run both processes
pnpm debug           # Runs proxy with Node.js debugger
pnpm proxy           # Only start the proxy server
pnpm proxy:debug     # Start proxy with Node.js debugger
pnpm chrome          # Only start Chrome (proxy must be running)
```

### Method 3: Manual Startup

```bash
# Start proxy server manually
export NODE_TLS_REJECT_UNAUTHORIZED=0
node proxy-server.js

# In another terminal, start Chrome with proxy
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --proxy-server="http://127.0.0.1:8080" \
  --user-data-dir="./.chrome_proxy_profile" \
  --no-first-run \
  --disable-session-crashed-bubble
```

## 📈 Statistics & Monitoring

The proxy now includes comprehensive statistics tracking:

### Real-time Monitoring

- **Request Counting**: Total requests processed (excluding browser internals)
- **Protocol Conversions**: HTTP→HTTPS and HTTPS→HTTP conversion tracking
- **Rule Usage**: Which rules are being used and how often
- **Unique Hosts**: Number of different domains accessed
- **Pass-through Requests**: Requests not matched by any rules

### Statistics Display

- **Periodic Reports**: Automatic statistics every 5 minutes during operation
- **Final Summary**: Complete statistics when proxy shuts down
- **Filtered Data**: Browser internal requests are filtered from user-relevant statistics

Example output:

```
📊 ===== PROXY STATISTICS =====
📊 Uptime: 15 minutes, 30 seconds
📊 Total Requests: 45 (user requests, browser internals filtered)
📊 Rules Matched: 12 requests
📊 Pass-through: 33 requests
📊 Protocol Conversions: HTTP→HTTPS: 5, HTTPS→HTTP: 2
📊 Unique Hosts: 8 different domains
📊 Rules Used: HTTP Testing Demo, HTML Modification Demo
📊 ===============================
```

## 🔧 Advanced Rule Capabilities

### Manual Response Handling

Rules can now handle responses manually, bypassing proxy limitations:

```javascript
/** @type {import('./types').Rule} */
const advancedRule = {
  name: "Advanced HTTP→HTTPS Conversion",

  match: (parsedUrl, clientReq, ctx) => {
    return parsedUrl.hostname === "httpbin.org";
  },

  onRequest: (ctx, parsedUrl) => {
    // Mark as manual response to prevent proxy conflicts
    ctx.isManualResponse = true;

    // Make custom HTTPS request
    const https = require("https");
    const httpsReq = https.request(
      {
        hostname: "httpbin.org",
        port: 443,
        path: "/headers",
        method: "GET",
        headers: {
          /* custom headers */
        },
      },
      (res) => {
        // Handle response manually
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          ctx.proxyToClientResponse.writeHead(200, {
            "Content-Type": "application/json",
          });
          ctx.proxyToClientResponse.end(
            JSON.stringify({
              original: JSON.parse(data),
              enhanced: "by-proxy-magic",
            })
          );
        });
      }
    );
    httpsReq.end();

    return false; // Indicate manual handling
  },
};
```

### Protocol Conversion Features

- **Automatic Detection**: Port-based protocol detection (80→HTTP, 443→HTTPS)
- **Manual Override**: Support for custom protocol conversions
- **Header Management**: Intelligent Host header management for different ports
- **SSL Context Switching**: Dynamic SSL context based on target requirements

## 🧪 Testing & Examples

### Demo Rules Available

1. **HTTP Testing Demo** (`http-testing-demo.js`): HTTP→HTTPS conversion with httpbin.org
2. **JSON API Demo** (`json-api-demo.js`): API response modification
3. **HTML Modification Demo** (`html-modification-demo.js`): Content enhancement
4. **Local Development Demo** (`local-development-demo.js`): Development server integration
5. **Site Redirect Demo** (`site-redirect-demo.js`): Real-world site redirection

### Testing Protocol Conversion

```bash
# Test HTTP→HTTPS conversion
./start.sh http://httpbin.org/

# Test HTTPS→HTTP conversion
./start.sh https://test.example/

# Debug protocol issues
./start.sh http://httpbin.org/ --log=DEBUG
```

## 🔍 Troubleshooting

### Common Issues

1. **Certificate Errors**: Run `./setup.sh --clean-only` then `./setup.sh`
2. **Protocol Errors**: Check logs for "Protocol 'https:' not supported" - indicates rule configuration issue
3. **Headers Already Sent**: Indicates multiple response handlers - check for manual response handling
4. **Connection Refused**: Target server may be down or blocking requests

### Debug Information

With `--log=DEBUG`, you'll see:

- **Complete Request Details**: Headers, methods, URLs
- **Curl Command Generation**: Equivalent curl commands for testing
- **Protocol Conversion Tracking**: HTTP↔HTTPS conversions
- **Rule Processing**: Which rules match and execute
- **Certificate Chain Info**: SSL certificate validation details

### Advanced Debugging

```bash
# Show certificate information
./setup.sh --show-certs

# Clean and regenerate certificates
./setup.sh --clean-only && ./setup.sh

# Test specific rule with debug
./start.sh https://example.com --log=DEBUG

# Check proxy statistics
# (Statistics are shown every 5 minutes and on shutdown)
```

## 📁 Project Structure

```
proxy-magic/
├── README.md                 # This file
├── proxy-server.js          # Main proxy server with advanced logging
├── rules.js                 # Rule loader
├── types.js                 # TypeScript definitions
├── utils.js                 # Utility functions
├── setup.sh                 # Advanced certificate management
├── start.sh                 # Convenient startup script
├── rules/                   # Rule directory
│   ├── README.md           # Rule documentation
│   ├── TEST-CATALOG.md     # Complete testing guide
│   ├── *.js                # Individual rule files
└── .proxy_certs/           # Generated certificates (auto-created)
```

## 🤝 Contributing

1. Create new rules in the `rules/` directory
2. Follow the `Rule` interface defined in `types.js`
3. Test with safe domains (httpbin.org, example.com, localhost)
4. Add comprehensive logging and error handling
5. Update documentation as needed

## 📄 License

This project is for development and testing purposes. Please use responsibly and in compliance with applicable laws and terms of service.
