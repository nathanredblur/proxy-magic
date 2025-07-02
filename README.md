# Proxy Magic - MITM Proxy Server for Development

This project sets up a local Man-in-the-Middle (MITM) proxy server using Node.js and the `http-mitm-proxy` library. It's designed to intercept and modify HTTP/HTTPS traffic for development and testing purposes.

## 🚀 Features

- **Smart Request Interception**: HTTP and HTTPS traffic with intelligent protocol conversion
- **Advanced Modular Rule System**: Hot-reloadable rules for request/response modification (see `rules/` directory)
- **Interactive Terminal UI** (Optional): Real-time rule management with keyboard controls
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

### Interactive Terminal UI (New!)

- **Optional TUI Interface**: Start with `--ui` flag for interactive management
- **Real-time Log Display**: Organized, color-coded logs with filtering
- **Rule Management**: Enable/disable rules with keyboard shortcuts
- **Persistent Configuration**: Rule states saved automatically
- **Hot Reload**: Dynamic rule reloading without restarting the proxy

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

2.  **Optional: Configure Defaults (Recommended)**

    Create a `.env` file to set your preferred defaults:

    ```bash
    # Example .env configuration
    cat > .env << 'EOF'
    DEFAULT_UI=true
    DEFAULT_CHROME=true
    RULES_DIR=user-rules
    CHROME_START_URL=https://example.org/
    EOF
    ```

3.  **Choose your mode:**

    ```bash
    # Use .env defaults (recommended)
    ./start.sh

    # Specific modes (override .env)
    ./start.sh --ui --chrome             # Interactive UI + Chrome
    ./start.sh --no-ui --chrome          # Background + Chrome only
    ./start.sh --rules=user-rules --ui   # Custom rules directory

    # Advanced options
    ./start.sh --chrome-url=https://google.com --ui --debug
    ./start.sh --log=DEBUG --rules=test-rules

    # Show all options and current .env values
    ./start.sh --help
    ```

4.  **Available Modes:**
    - **Background Mode**: Proxy runs in background, configure browser manually
    - **UI Mode**: Interactive terminal with real-time logs and rule management
    - **Chrome Mode**: Automatically launches Chrome with proxy configuration
    - **Combined**: UI + Chrome for full interactive experience

## ⚙️ Configuration

Proxy Magic supports comprehensive configuration through environment variables and command-line arguments. All settings can be configured in a `.env` file for persistent configuration.

### Environment Configuration (.env)

Create a `.env` file in the project root to set default values:

```env
# Proxy Magic Configuration

# Rules Directory - Where to load rules from
# Options: 'rules' (system rules), 'user-rules' (user rules), or custom path
RULES_DIR=user-rules

# Default startup modes
DEFAULT_UI=false
DEFAULT_CHROME=false
DEFAULT_DEBUG=false

# Chrome Configuration
CHROME_START_URL=https://example.org/
# Alternative URLs you can use:
# CHROME_START_URL=https://example.com
# CHROME_START_URL=https://google.com
# CHROME_START_URL=about:blank
# CHROME_START_URL=http://localhost:3000

# Proxy Server Configuration
PROXY_HOST=127.0.0.1
PROXY_PORT=8080

# Logging Configuration
LOG_LEVEL=1
STATS_INTERVAL=60000

# SSL Configuration
CA_CERT_DIR=certs
```

### Command Line Options

All configuration can be overridden via command-line arguments:

```bash
# Basic options
./start.sh --ui                      # Enable interactive UI
./start.sh --no-ui                   # Disable UI (override .env)
./start.sh --chrome                  # Launch Chrome automatically
./start.sh --no-chrome               # Don't launch Chrome (override .env)
./start.sh --debug                   # Enable debug mode
./start.sh --no-debug                # Disable debug (override .env)

# Advanced configuration
./start.sh --rules=user-rules        # Set rules directory
./start.sh --chrome-url=https://google.com  # Custom Chrome start URL
./start.sh --log=DEBUG               # Set log level (NONE, INFO, DEBUG, VERBOSE)

# Show current configuration
./start.sh --help                    # Displays current .env values
```

### Configuration Examples

**Example 1: Development Setup**

```env
# .env - Development configuration
DEFAULT_UI=true
DEFAULT_CHROME=true
DEFAULT_DEBUG=true
RULES_DIR=user-rules
CHROME_START_URL=http://localhost:3000
LOG_LEVEL=2
```

**Example 2: Production Testing**

```env
# .env - Production testing
DEFAULT_UI=false
DEFAULT_CHROME=true
DEFAULT_DEBUG=false
RULES_DIR=rules
CHROME_START_URL=https://example.org/
LOG_LEVEL=1
```

**Example 3: Manual Configuration**

```bash
# Override all .env settings for specific test
./start.sh --rules=test-rules --chrome-url=https://staging.example.com --ui --debug
```

### Configuration Priority

Settings are applied in the following order (highest priority first):

1. **Command-line arguments** (`--ui`, `--chrome-url=...`, etc.)
2. **Environment variables** (.env file)
3. **Default values** (built-in defaults)

### Configuration Validation

The application validates all configuration on startup:

- **Rules Directory**: Must exist and contain valid `.js` rule files
- **Chrome URL**: Must be a valid URL format
- **Log Level**: Must be 0-3 or NONE/INFO/DEBUG/VERBOSE
- **Port Configuration**: Proxy port must be available

Invalid configurations will show detailed error messages with suggestions for fixes.

## 🎮 Interactive Terminal UI

### Starting the UI

The Interactive Terminal UI can be enabled with the `--ui` flag:

```bash
./start.sh --ui                   # Start with UI mode
./start.sh --ui --chrome         # Start with UI and auto Chrome
./start.sh --ui --debug          # Start with UI and debug mode
node start-proxy.js --ui         # Direct start with UI
```

### UI Features

- **Split Panel Layout**:
  - Top: Real-time logs with colors and filtering
  - Bottom: Rule list with status indicators
- **Keyboard Controls**:
  - `↑/↓`: Navigate between rules
  - `Space`: Toggle rule on/off
  - `Enter`: View rule details
  - `r`: Reload all rules
  - `c`: Clear logs
  - `f`: Filter logs by type/domain
  - `b`: Launch Chrome browser with proxy
  - `q`: Quit
  - `F1`: Help/shortcuts
  - `Tab`: Switch between panels

### Rule Management

- **Visual Status**: ✅ Active / ❌ Inactive rules
- **Hot Reload**: Rules reload instantly when files change
- **Persistent State**: Rule on/off states saved to `config/rules-state.json`
- **Real-time Updates**: See rule activity and request counts live

### UI Features in Detail

**Split Panel Layout:**

- **Top Panel (70%)**: Real-time scrolling logs with color coding
- **Bottom Panel (30%)**: Interactive rule list with navigation

**Live Logging:**

- 🔵 **REQUEST** - Incoming HTTP requests
- 🟢 **RESPONSE** - HTTP responses with status codes
- 🔴 **ERROR** - Proxy and connection errors
- 🟣 **RULE** - Rule activation and management events
- 🟡 **SYSTEM** - System status and startup messages
- 🔵 **STATS** - Statistics and performance data

**Rule Management Interface:**

- Navigate with ↑/↓ or j/k (vi-style)
- Toggle rules on/off with Space
- View detailed rule information with Enter
- Real-time usage counters and statistics
- Color-coded status indicators

**Keyboard Shortcuts Summary:**

```
Global Commands:
  F1, ?       Help overlay
  Tab         Switch panels
  q, Ctrl+C   Quit
  Esc         Close overlays
  b           Launch Chrome browser
  c           Clear logs
  r           Reload rules

Navigation:
  ↑/↓, j/k    Navigate rules
  Space       Toggle rule
  Enter       Rule details
  Page Up/Dn  Scroll logs
```

### Example Usage Session

**Option 1: Background Mode + Auto Chrome**

1. **Start**: `./start.sh --chrome`
2. **Chrome launches automatically** with proxy configured
3. **Browse websites** - all traffic will be intercepted and logged

**Option 2: Interactive UI Mode**

1. **Start with UI**: `./start.sh --ui`
2. **Launch Chrome**: Press `b` to open Chrome with proxy
3. **Navigate to Rules Panel**: Press `Tab`
4. **Browse Rules**: Use ↑/↓ to select rules
5. **Toggle a Rule**: Press `Space` to enable/disable
6. **View Details**: Press `Enter` for rule information
7. **Monitor Activity**: Press `Tab` to return to logs
8. **Clear Logs**: Press `c` to clear the log panel
9. **Get Help**: Press `F1` for complete help

**Option 3: Combined Mode (Recommended)**

1. **Start**: `./start.sh --ui --chrome`
2. **Chrome launches automatically** + **Interactive UI available**
3. **Best of both worlds**: Auto setup + manual control

### Live Demo

**Background Mode** (`./start.sh --chrome`):

```
🎯 Proxy Magic Startup
=====================

Configuration:
  🌐 Proxy: http://127.0.0.1:8080
  🎮 Interactive UI: Disabled
  🌐 Auto Chrome: Enabled
  📊 Log Level: INFO (1)
  🐛 Debug Mode: Disabled

🚀 Starting Proxy Magic in background mode...
📱 Chrome will be launched automatically

✅ Proxy server started (PID: 1234)
🌐 Proxy URL: http://127.0.0.1:8080
🚀 Launching Chrome browser automatically...
✅ Chrome launched with URL: http://httpbin.org/
🌐 Chrome configured with proxy: http://127.0.0.1:8080

⌨️  Press Ctrl+C to stop the proxy and Chrome
```

**UI Mode** (`./start.sh --ui --chrome`):

```
┌─ 📜 Logs ─────────────────────────────────────────────────┐
│ 14:23:45 [SYSTEM  ] 🎮 Interactive Terminal UI started    │
│ 14:23:45 [SYSTEM  ] 📋 Loaded 6 enabled rules             │
│ 14:23:45 [SYSTEM  ] 🚀 Proxy server started successfully  │
│ 14:23:45 [SYSTEM  ] 🚀 Launching Chrome browser automatically... │
│ 14:24:12 [SYSTEM  ] ✅ Chrome launched with URL: http://httpbin.org/ │
│ 14:24:12 [SYSTEM  ] 🌐 Chrome configured with proxy: http://127.0.0.1:8080 │
│ 14:24:15 [REQUEST ] GET /feeds/posts/                     │
│ 14:24:15 [RESPONSE] GET /feeds/posts/ 200                 │
│ 14:24:18 [RULE    ] Example.org Modifier: enabled        │
└───────────────────────────────────────────────────────────┘
┌─ ⚙️ Rules ────────────────────────────────────────────────┐
│ ✅ Example.org Modifier [user-rules] (12 uses)           │
│ ❌ HTTP Testing Demo [rules]                              │
│ ✅ JSON API Demo [rules] (3 uses)                        │
│ ✅ Banking 3400 [user-rules] (45 uses)                   │
└───────────────────────────────────────────────────────────┘
🌐 Chrome: Running | Panel: RULES | Rules: 4/6 enabled | Logs: 156 | Press F1 for help, b for browser
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
./start.sh [URL] [--ui] [--log=LEVEL | -l LEVEL]

# Examples:
./start.sh                                    # Start with about:blank
./start.sh --ui                              # Start with Interactive UI
./start.sh https://example.com                # Start with specific URL
./start.sh https://example.com --ui          # Start with UI and URL
./start.sh http://httpbin.org/                # Test HTTP→HTTPS conversion
./start.sh --log=DEBUG                       # Start with debug logging
./start.sh https://example.com --log=INFO    # URL + log level
./start.sh -l DEBUG https://example.com --ui # Alternative log syntax with UI
```

**Command Line Options:**

- `--ui`: Start Interactive Terminal UI
- `--log=LEVEL` or `-l LEVEL`: Set log level (NONE/0, INFO/1, DEBUG/2)

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

### Method 2: Direct Node.js

```bash
# Start proxy server with UI
node start-proxy.js --ui

# Start proxy server normally
node start-proxy.js

# Start with debug logging
DEBUG_RULES=true node start-proxy.js --ui
```

### Method 3: Package.json Scripts

```bash
# Start proxy server and Chrome concurrently
pnpm start           # Uses concurrently to run both processes
pnpm debug           # Runs proxy with Node.js debugger
pnpm proxy           # Only start the proxy server
pnpm proxy:debug     # Start proxy with Node.js debugger
pnpm chrome          # Only start Chrome (proxy must be running)
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
- **Interactive UI**: Real-time statistics in the terminal interface

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
6. **Example Org Modifier** (`example-org-modifier.js`): Simple HTML modification example

### Testing Protocol Conversion

```bash
# Test HTTP→HTTPS conversion
./start.sh http://httpbin.org/

# Test with Interactive UI
./start.sh http://httpbin.org/ --ui

# Test HTTPS→HTTP conversion
./start.sh https://test.example/

# Debug protocol issues
./start.sh http://httpbin.org/ --log=DEBUG --ui
```

## 🔍 Troubleshooting

### Common Issues

1. **Certificate Errors**: Run `./setup.sh --clean-only` then `./setup.sh`
2. **Protocol Errors**: Check logs for "Protocol 'https:' not supported" - indicates rule configuration issue
3. **Headers Already Sent**: Indicates multiple response handlers - check for manual response handling
4. **Connection Refused**: Target server may be down or blocking requests
5. **UI Display Issues**: Ensure terminal supports colors and has adequate size (80x24 minimum)

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

# Test specific rule with debug and UI
./start.sh https://example.com --log=DEBUG --ui

# Check proxy statistics
# (Statistics are shown every 5 minutes and on shutdown)
```

## 📁 Project Structure

```
proxy-magic/
├── README.md                   # This file
├── start-proxy.js             # Main entry point
├── types.js                   # TypeScript definitions
├── setup.sh                   # Advanced certificate management
├── start.sh                   # Convenient startup script
├── src/                       # Core source code
│   ├── proxy-server.js        # Main proxy server with modular architecture
│   ├── rule-loader.js         # Modular rule loading system
│   ├── request-processor.js   # Request processing logic
│   ├── response-processor.js  # Response processing logic
│   ├── error-handler.js       # Advanced error handling
│   ├── ui/                    # Interactive Terminal UI (New!)
│   │   ├── terminal-ui.js     # Main TUI interface
│   │   ├── log-formatter.js   # Log formatting and display
│   │   └── rule-manager.js    # Interactive rule management
│   └── utils/                 # Utility modules
│       ├── logger.js          # Logging utilities
│       ├── stats.js           # Statistics tracking
│       ├── proxy-config.js    # Configuration management
│       ├── rule-validator.js  # Rule validation
│       ├── request-utils.js   # Request utilities
│       ├── url-utils.js       # URL processing utilities
│       ├── error-utils.js     # Error classification utilities
│       └── curl-utils.js      # Curl command generation
├── rules/                     # Rule directory
│   ├── README.md             # Rule documentation
│   ├── TEST-CATALOG.md       # Complete testing guide
│   └── *.js                  # Individual rule files
├── user-rules/               # User-specific rules
├── config/                   # Configuration files (Auto-created)
│   └── rules-state.json      # Rule states (enabled/disabled)
└── .proxy_certs/            # Generated certificates (auto-created)
```

## 🚧 Development Roadmap & Current Work

### ✅ Completed Features

- Modular architecture with separated concerns
- Advanced error handling and logging
- Certificate management and SSL interception
- Rule validation and loading system
- Statistics tracking and monitoring

### 🔄 Current Development (Interactive UI)

#### Phase 1: Core UI Infrastructure ✅ COMPLETED

- [x] Command line argument parsing for `--ui` flag
- [x] Basic terminal UI setup with blessed.js
- [x] Split-panel layout (logs top, rules bottom)
- [x] Keyboard navigation system

#### Phase 2: Rule Management ✅ COMPLETED

- [x] Interactive rule list with status indicators
- [x] Rule toggle functionality (enable/disable)
- [x] Persistent rule state storage (`config/rules-state.json`)
- [x] Hot-reload rule system integration

#### Phase 3: Enhanced Logging Display ✅ COMPLETED

- [x] Color-coded log formatting
- [x] Real-time log streaming in UI
- [x] Log filtering by type/domain/rule (basic implementation)
- [ ] Advanced log export functionality

#### Phase 4: Advanced Features ✅ MOSTLY COMPLETED

- [x] Rule detail view and editing hints
- [x] Statistics dashboard in UI
- [x] Configuration management interface
- [x] Help system and keyboard shortcuts
- [ ] Advanced filtering dialog
- [ ] Performance metrics display

### 🎯 Planned Features

- Web-based UI alternative to terminal UI
- Rule template system for common patterns
- Performance monitoring and bottleneck detection
- Request/response diff visualization
- SSL pinning bypass utilities

## 🤝 Contributing

1. Create new rules in the `rules/` or `user-rules/` directory
2. Follow the `Rule` interface defined in `types.js`
3. Test with safe domains (httpbin.org, example.com, localhost)
4. Add comprehensive logging and error handling
5. Update documentation as needed
6. For UI contributions, see the development roadmap above

## 📄 License

This project is for development and testing purposes. Please use responsibly and in compliance with applicable laws and terms of service.

## Inspiration links

- https://www.mock-server.com/
- https://docs.mitmproxy.org/stable/
