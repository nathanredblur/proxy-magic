# MITM Proxy Server for Development

This project sets up a local Man-in-the-Middle (MITM) proxy server using Node.js and the `http-mitm-proxy` library. It's designed to intercept and modify HTTP/HTTPS traffic for development and testing purposes.

## Features

- Intercepts HTTP and HTTPS traffic with custom rules
- Modular rule system for request/response modification (see `rules.js`)
- Automatic SSL certificate generation and management
- Multiple startup options with different log levels
- Automated Chrome browser setup with proxy configuration
- Clean process management and automatic cleanup

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

    # Start with debug logging
    ./start.sh --log=DEBUG

    # Start with specific URL and log level
    ./start.sh https://github.com --log=INFO
    ```

## Available Startup Methods

### Method 1: Automated Script (Recommended)

The `start.sh` script provides the most convenient way to start the proxy server and Chrome:

```bash
# Basic usage
./start.sh [URL] [--log=LEVEL | -l LEVEL]

# Examples:
./start.sh                                    # Start with about:blank
./start.sh https://example.com                # Start with specific URL
./start.sh --log=DEBUG                       # Start with debug logging
./start.sh https://example.com --log=INFO    # URL + log level
./start.sh -l DEBUG https://example.com      # Alternative log syntax
```

**Log Levels:**

- `NONE` or `0`: No logging
- `INFO` or `1`: Standard logging (default)
- `DEBUG` or `2`: Verbose debugging

**Features:**

- Automatically starts the proxy server in background
- Launches Chrome with proper proxy configuration
- Handles process cleanup when Chrome closes
- Uses persistent Chrome profile in `./.chrome_proxy_profile`
- Sets `NODE_TLS_REJECT_UNAUTHORIZED=0` for development

### Method 2: Package.json Scripts

```bash
# Start proxy server and Chrome concurrently
pnpm start           # Uses concurrently to run both processes

# Start with debug mode
pnpm debug           # Runs proxy with Node.js debugger

# Run components separately
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

## Initial Certificate Setup

The first time you run the proxy, it will generate a root Certificate Authority (CA). You **MUST** install this certificate to avoid SSL warnings:

1. **Generate the CA certificate** (run any startup method once):

   ```bash
   ./start.sh  # Run once and close Chrome to generate certs
   ```

2. **Install the CA Certificate** (`./.proxy_certs/certs/ca.pem`):

   **macOS:**

   1. Open **Keychain Access** (Applications > Utilities)
   2. Select the **System** keychain
   3. Drag and drop `ca.pem` from `./.proxy_certs/certs/ca.pem` into Keychain
   4. Double-click the certificate in the list
   5. Expand the **Trust** section
   6. Set "When using this certificate:" to **Always Trust**
   7. Close and enter your admin password

   **Windows:**

   1. Double-click the `ca.pem` file
   2. Click "Install Certificate..." → "Local Machine"
   3. Select "Place all certificates in the following store"
   4. Browse and select "Trusted Root Certification Authorities"
   5. Complete the installation

   **Linux:**

   ```bash
   sudo cp ./.proxy_certs/certs/ca.pem /usr/local/share/ca-certificates/proxy-magic.crt
   sudo update-ca-certificates
   ```

   **Firefox:** Import separately in Firefox Settings > Privacy & Security > Certificates

## Implementing Custom Rules

Rules are defined in `rules.js` using a modular system. Each rule can:

- Match specific URLs or patterns
- Modify requests before they reach the target server
- Modify responses before they reach the client

### Rule Structure

```javascript
{
    name: 'My Custom Rule',
    match: (parsedUrl, clientReq, ctx) => {
        // Return true if this rule should apply
        return parsedUrl.hostname.includes('example.com');
    },
    onRequest: (ctx, parsedUrl) => {
        // Modify the request
        ctx.proxyToServerRequestOptions.headers['X-Custom'] = 'value';
    },
    onResponse: (ctx, parsedUrl) => {
        // Modify the response
        ctx.onResponseData((ctx, chunk, callback) => {
            // Transform response data
            callback(null, modifiedChunk);
        });
    }
}
```

### Example Rules

**Redirect to Local Development Server:**

```javascript
{
    name: 'Local Dev Redirect',
    match: (parsedUrl, clientReq, ctx) => {
        return parsedUrl.hostname.includes('my-app.com') &&
               parsedUrl.pathname.startsWith('/api/');
    },
    onRequest: (ctx, parsedUrl) => {
        // Redirect API calls to local dev server
        Object.assign(ctx.proxyToServerRequestOptions, {
            host: 'localhost',
            port: 3000,
            path: parsedUrl.pathname + (parsedUrl.search || ''),
            headers: {
                ...ctx.clientToProxyRequest.headers,
                'Host': 'localhost:3000'
            }
        });

        // Ensure SSL is handled correctly
        if (parsedUrl.protocol === 'https:') {
            ctx.isSSL = true;
        }
    }
}
```

## Project Structure

```
proxy-magic/
├── proxy-server.js          # Main proxy server
├── rules.js                 # Modular rule definitions
├── start.sh                 # Convenient startup script
├── package.json             # Dependencies and scripts
├── .proxy_certs/            # Generated SSL certificates
├── .chrome_proxy_profile/   # Chrome profile for proxy
└── README.md               # This file
```

## Configuration

### Rules Directory Configuration

The rules folder is configurable through the `.env` file in the project root:

```env
# Rules directory path (relative to project root)
RULES_DIR=rules

# Debug mode for rules loading (true/false)
DEBUG_RULES=false
```

### Environment Variables

- `NODE_TLS_REJECT_UNAUTHORIZED=0` - Disables TLS verification (set automatically)
- `PROXY_LOG_LEVEL` - Controls logging verbosity (0=NONE, 1=INFO, 2=DEBUG)
- `RULES_DIR` - Path to the rules folder (relative to project root, defaults to "rules")
- `DEBUG_RULES` - Enables debug mode to see detailed rule loading information

### Advanced Configuration

#### Using a Custom Rules Folder

1. Modify the `.env` file:

   ```env
   RULES_DIR=my-custom-rules
   ```

2. Create the folder and move/create your rules there

3. Restart the proxy

#### Multiple Rules Folders

To have different sets of rules, you can:

1. Create different folders: `rules-dev/`, `rules-prod/`, etc.
2. Change `RULES_DIR` according to the environment
3. Use scripts in `package.json` for different configurations

#### Debug Mode for Rules

To see detailed information about rule loading:

```bash
# Option 1: Temporary environment variable
DEBUG_RULES=true node proxy-server.js

# Option 2: Modify .env file
DEBUG_RULES=true
```

## Troubleshooting

**SSL Certificate Issues:**

- Ensure `ca.pem` is properly installed and trusted in your system keychain
- Restart Chrome after installing certificates
- Check that the certificate hasn't expired

**Proxy Not Working:**

- Verify Chrome is using proxy: Check `chrome://settings/` → Advanced → System
- Ensure proxy server is running on port 8080
- Check for port conflicts: `lsof -i :8080`

**Connection Errors:**

- For HTTPS targets, ensure `ctx.isSSL = true` in your rules
- Check target server is accessible: `curl -k https://target-server.com`
- Review proxy logs with `--log=DEBUG`

**Script Permissions:**

```bash
chmod +x start.sh  # Make script executable
```

## Security Notes

- This proxy is for **development only** - never use in production
- The generated CA certificate has access to decrypt all HTTPS traffic
- Keep the `.proxy_certs/` directory secure and never commit to version control

## Recommended .gitignore

```gitignore
# Proxy certificates and profiles
/.proxy_certs/
/.chrome_proxy_profile/

# Node.js
node_modules/
npm-debug.log*

# Environment
.env
.env.local
```

## Contributing

1. Add new rules to `rules.js`
2. Test with `./start.sh --log=DEBUG`
3. Update this README if adding new features
4. Ensure cross-platform compatibility where possible
