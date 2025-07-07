# Proxy Magic Configuration

## New Configuration System

Proxy Magic now uses a modern configuration system that supports YAML files (with comments) and JSON.

### Automatic Configuration

The application automatically searches for configuration files in the following order:

1. `config.yaml` (recommended - supports comments)
2. `config.yml` (alternative YAML)
3. `config.json` (legacy format)

```bash
# Automatically searches for config.yaml, config.yml, or config.json
node src/index.js
```

### Specific Configuration File

To use a specific configuration file, use the `--config` parameter:

```bash
node src/index.js --config my-config.yaml
node src/index.js --config my-config.json
```

### Configuration File Structure

#### YAML (Recommended)

The configuration file can be a YAML file with descriptive comments:

```yaml
# Proxy Magic Configuration
# Control how the proxy starts and what interfaces are available

ui: true # Interactive Terminal UI
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

#### JSON (Legacy Format)

You can also use the traditional JSON format:

```json
{
  "ui": true,
  "chrome": false,
  "debug": false,
  "logLevel": "1",
  "rulesDir": "user-rules",
  "chromeUrl": null,
  "proxy": {
    "port": 8080,
    "host": "127.0.0.1",
    "logLevel": 2,
    "statsInterval": 5,
    "caCertDir": ".proxy_certs"
  }
}
```

### Configuration Options

#### Main Options

- `ui`: (boolean) Enables terminal user interface
- `chrome`: (boolean) Launches Chrome automatically
- `debug`: (boolean) Enables debug mode
- `logLevel`: (string) Logging level ("0", "1", "2")
- `rulesDir`: (string) Rules directory
- `chromeUrl`: (string|null) Chrome startup URL

#### Proxy Options (`proxy` object)

- `port`: (number) Proxy port (default: 8080)
- `host`: (string) Listen address (default: "127.0.0.1")
- `logLevel`: (number) Logging level (0=errors, 1=basic, 2=debug)
- `statsInterval`: (number) Statistics interval in minutes
- `caCertDir`: (string) CA certificates directory

### Simplified Command Line Parameters

Command line parameters take priority over the configuration file:

```bash
# Automatic configuration from config.json
node src/index.js

# Simplified boolean parameters
node src/index.js --ui                    # ui = true
node src/index.js --ui=true               # ui = true
node src/index.js --ui=false              # ui = false
node src/index.js --ui=any-value          # ui = false (only "true" is truthy)

# Same for chrome and debug
node src/index.js --chrome=true --debug=false
```

### Available Options

- `--config FILE`: Path to JSON configuration file
- `--create-cert`: Create certificates and exit (useful for setup)
- `--ui[=true|false]`: Start with terminal user interface
- `--chrome[=true|false]`: Launch Chrome automatically
- `--debug[=true|false]`: Enable debug mode
- `--log LEVEL`, `-l`: Set logging level
- `--rules DIR`: Rules directory
- `--chrome-url URL`: Chrome startup URL
- `--help`, `-h`: Show help

### Usage Examples

#### Automatic Configuration

```bash
# Use global config.json if it exists
node src/index.js

# Create certificates only
node src/index.js --create-cert

# Override global configuration with CLI parameters
node src/index.js --ui=true --chrome=false
```

#### Specific Configurations

```bash
# Specific file that overrides global configuration
node src/index.js --config my-config.json

# CLI parameters that override everything else
node src/index.js --config my-config.json --ui=true --chrome=false

# Complete priority example:
# 1. global config.json (base)
# 2. my-config.json (overrides global)
# 3. --ui=true (overrides everything)
node src/index.js --config my-config.json --ui=true
```

### Configuration Priority

1. **Command line parameters** (highest priority)
2. **File specified with `--config`** (overwrites global configuration)
3. **Global `config.json` file** (base configuration)
4. **Default values** (lowest priority)

### Migration from Environment Variables

If you previously used environment variables, you now need to create a configuration file:

**Before (.env):**

```
DEFAULT_UI=true
DEFAULT_CHROME=false
RULES_DIR=user-rules
PROXY_PORT=8080
```

**Now (config.yaml - recommended):**

```yaml
# Proxy Magic Configuration
ui: true # Interactive Terminal UI
chrome: false # Launch Chrome automatically
rulesDir: "user-rules" # Rules directory
proxy:
  port: 8080 # Proxy server port
```

**Or using JSON:**

```json
{
  "ui": true,
  "chrome": false,
  "rulesDir": "user-rules",
  "proxy": {
    "port": 8080
  }
}
```

### Usage in setup.sh

The setup.sh script now uses the `--create-cert` parameter to generate certificates efficiently:

```bash
./setup.sh
```

This internally executes:

```bash
node src/index.js --create-cert
```

### Direct Execution

It's no longer necessary to use `start.sh` (removed). You can execute directly:

```bash
# Normal execution
node src/index.js

# Background mode (if you need it to run in the background)
node src/index.js &

# With specific configuration
node src/index.js --config my-config.json --ui --chrome
```
