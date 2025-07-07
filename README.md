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

    Create a `config.yaml` file for persistent settings (see Configuration section for details):

    ```bash
    # Basic config.yaml example
    cat > config.example.yaml << 'EOF'
    ui: true          # Interactive Terminal UI
    chrome: true      # Launch Chrome automatically
    rulesDir: "user-rules"  # Rules directory
    EOF
    ```

3.  **Start the proxy:**

    ```bash
    # Use config.yaml defaults (recommended)
    node start-proxy.js

    # Common modes
    node start-proxy.js --ui --chrome             # Interactive UI + Chrome
    node start-proxy.js --ui=false --chrome      # Background + Chrome only

    # Show all options
    node start-proxy.js --help
    ```

4.  **Available Modes:**
    - **Background Mode**: Proxy runs in background, configure browser manually
    - **UI Mode**: Interactive terminal with real-time logs and rule management
    - **Chrome Mode**: Automatically launches Chrome with proxy configuration
    - **Combined**: UI + Chrome for full interactive experience

## ⚙️ Configuration

Proxy Magic uses a modern configuration system with support for YAML (with comments) and JSON formats.

### YAML Configuration (config.yaml) - Recommended

Create a `config.yaml` file in the project root to set default values:

```yaml
# Proxy Magic Configuration
# Control how the proxy starts and what interfaces are available

ui: false # Interactive Terminal UI
chrome: false # Launch Chrome automatically
debug: false # Enable debug mode
logLevel: "1" # Log level (0, 1, 2)
rulesDir: "user-rules" # Rules directory
chromeUrl: null # Chrome startup URL

proxy:
  port: 8080 # Proxy server port
  host: "127.0.0.1" # Bind address
  logLevel: 2 # Internal proxy log level
  statsInterval: 5 # Statistics interval
  caCertDir: ".proxy_certs" # SSL certificates directory
```

### Configuration Priority

1. **Command line arguments** (highest priority)
2. **File specified with --config** (overwrites global config)
3. **Global config file** (base configuration)
4. **Default values** (lowest priority)

The application automatically searches for global config files in this order:

- `config.yaml` (recommended - supports comments)
- `config.yml` (alternative YAML extension)
- `config.json` (legacy JSON format)

### Command Line Options

All configuration can be overridden via command-line arguments:

```bash
# Basic options
node start-proxy.js --ui                    # Enable interactive UI
node start-proxy.js --ui=false              # Disable UI explicitly
node start-proxy.js --chrome                # Launch Chrome automatically
node start-proxy.js --chrome=false          # Don't launch Chrome
node start-proxy.js --debug                 # Enable debug mode
node start-proxy.js --debug=false           # Disable debug

# Advanced configuration
node start-proxy.js --rules user-rules      # Set rules directory
node start-proxy.js --chrome-url https://google.com  # Custom Chrome start URL
node start-proxy.js --log 2                 # Set log level (0=errors, 1=basic, 2=debug)

# Configuration files
node start-proxy.js --config my-config.json # Use specific config file

# Show current configuration
node start-proxy.js --help                  # Shows all available options
```

### Configuration Validation

The application validates all configuration on startup:

- **Rules Directory**: Must exist and contain valid `.js` rule files
- **Chrome URL**: Must be a valid URL format (if provided)
- **Log Level**: Must be 0-3 or NONE/INFO/DEBUG/VERBOSE
- **Port Configuration**: Proxy port must be available

Invalid configurations will show detailed error messages with suggestions for fixes.

## 🎮 Interactive Terminal UI

Start with `--ui` flag for an interactive interface with real-time logs and rule management.

### Key Features

- **Split Panel Layout**: Real-time logs (top) + interactive rule list (bottom)
- **Rule Management**: Toggle rules on/off, view details, hot-reload support
- **Keyboard Navigation**: ↑/↓ to navigate, Space to toggle, Enter for details
- **Quick Commands**: `b` launch Chrome, `c` clear logs, `r` reload rules, `q` quit

### Essential Keyboard Shortcuts

```
Navigation:     ↑/↓ (navigate rules), Tab (switch panels)
Rule Control:   Space (toggle), Enter (details), r (reload)
Quick Actions:  b (launch Chrome), c (clear logs), q (quit), F1 (help)
```

### Quick Start Examples

```bash
# Background mode with Chrome
node start-proxy.js --chrome

# Interactive UI mode
node start-proxy.js --ui

# Combined mode (recommended)
node start-proxy.js --ui --chrome
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

## 🎯 Usage

### Command Line Options

```bash
node start-proxy.js [OPTIONS]

# Basic options
--ui[=true|false]     # Interactive Terminal UI
--chrome[=true|false] # Launch Chrome automatically
--debug[=true|false]  # Enable debug mode
--log LEVEL           # Set log level (0=errors, 1=basic, 2=debug)
--config FILE         # Use specific configuration file
--create-cert         # Create certificates and exit
```

### Package Scripts

```bash
pnpm start           # Start proxy and Chrome concurrently
pnpm proxy           # Only start the proxy server
pnpm chrome          # Only start Chrome (proxy must be running)
```

## 🧪 Testing & Examples

### Demo Rules Available

The `rules/` directory contains several example rules:

- **HTTP Testing Demo**: HTTP→HTTPS conversion with httpbin.org
- **JSON API Demo**: API response modification
- **HTML Modification Demo**: Content enhancement
- **Local Development Demo**: Development server integration

### Quick Testing

```bash
# Test with httpbin.org
node start-proxy.js --chrome-url http://httpbin.org/ --ui

# Debug mode
node start-proxy.js --chrome-url http://httpbin.org/ --log 2 --ui
```

## 🔍 Troubleshooting

### Common Issues

1. **Certificate Errors**: Run `./setup.sh --clean-only` then `./setup.sh`
2. **Protocol Errors**: Check logs with `--log 2` for detailed error information
3. **Connection Refused**: Target server may be down or blocking requests
4. **UI Display Issues**: Ensure terminal supports colors and has adequate size (80x24 minimum)

### Debug Mode

Use `--log 2` for detailed debugging information including request/response details, rule processing, and certificate validation.

```bash
# Debug with UI
node start-proxy.js --log 2 --ui

# Certificate management
./setup.sh --show-certs
./setup.sh --clean-only && ./setup.sh
```

## 📁 Project Structure

```
proxy-magic/
├── README.md                   # This file
├── start-proxy.js             # Main entry point
├── types.js                   # TypeScript definitions
├── setup.sh                   # Certificate management
├── config.yaml                # Configuration file (recommended)
├── config.json                # Configuration file (legacy format)
├── src/                       # Core source code
│   ├── proxy-server.js        # Main proxy server
│   ├── rule-loader.js         # Rule loading system
│   ├── request-processor.js   # Request processing
│   ├── response-processor.js  # Response processing
│   ├── error-handler.js       # Error handling
│   ├── ui/                    # Interactive Terminal UI
│   │   ├── terminal-ui.js     # Main TUI interface
│   │   ├── log-formatter.js   # Log formatting
│   │   └── rule-manager.js    # Rule management
│   └── utils/                 # Utility modules
├── rules/                     # Demo rules directory
├── user-rules/               # User-specific rules
├── config/                   # Configuration files (auto-created)
└── .proxy_certs/            # Generated certificates (auto-created)
```

## 🤝 Contributing

1. Create new rules in the `rules/` or `user-rules/` directory
2. Follow the `Rule` interface defined in `types.js`
3. Test with safe domains (httpbin.org, example.com, localhost)
4. Add comprehensive logging and error handling
5. Update documentation as needed

## 📄 License

This project is for development and testing purposes. Please use responsibly and in compliance with applicable laws and terms of service.

## Inspiration links

- https://www.mock-server.com/
- https://docs.mitmproxy.org/stable/
