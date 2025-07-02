# Proxy Magic - Refactored Architecture

This directory contains the refactored and modular version of Proxy Magic, breaking down the monolithic `start-proxy.js` file into smaller, more maintainable modules.

## 🏗️ Architecture Overview

The code has been organized into focused modules with clear responsibilities:

### Core Modules

- **`start-proxy.js`** - Main server orchestration and startup
- **`logger.js`** - Centralized logging system with configurable levels
- **`stats.js`** - Statistics tracking and reporting
- **`rule-validator.js`** - Rule validation and verification
- **`error-handler.js`** - Global error handling and user-friendly error pages
- **`request-processor.js`** - Request processing, rule matching, and optimization
- **`response-processor.js`** - Response processing and modifications
- **`proxy-config.js`** - Configuration management and validation

### Utility Modules (`utils/`)

- **`url-utils.js`** - URL reconstruction and manipulation
- **`request-utils.js`** - Request analysis and validation helpers
- **`curl-utils.js`** - Curl command generation for debugging
- **`error-utils.js`** - Error classification and HTML error page generation
- **`index.js`** - Consolidated utility exports

## 🔧 Key Improvements

### 1. **Separation of Concerns**

Each module has a single, well-defined responsibility, making the code easier to understand and maintain.

### 2. **Better Error Handling**

- Centralized error classification
- User-friendly HTML error pages
- Intelligent error filtering to reduce noise

### 3. **Enhanced Logging**

- Configurable log levels (0-2)
- Structured logging with prefixes
- Debug-friendly request/response logging

### 4. **Comprehensive Statistics**

- Real-time statistics tracking
- Protocol conversion monitoring
- Rule usage analytics
- Performance metrics

### 5. **Intelligent Rule Processing**

- Auto-fixing common configuration issues
- Smart protocol detection
- Host header management
- Request validation

### 6. **Configuration Management**

- Environment variable support
- Configuration validation
- Default value handling
- Startup information logging

## 🚀 Usage

### Starting the Server

```javascript
// Using the new modular system
const { main } = require("./src/proxy-server");
main();

// Or access individual modules
const { logger, stats, proxyConfig } = require("./src");
```

### Environment Variables

| Variable               | Description              | Default      |
| ---------------------- | ------------------------ | ------------ |
| `PROXY_PORT`           | Proxy server port        | 8080         |
| `PROXY_HOST`           | Host address to bind to  | 127.0.0.1    |
| `PROXY_LOG_LEVEL`      | Log level (0-2)          | 2            |
| `PROXY_STATS_INTERVAL` | Stats interval (minutes) | 5            |
| `PROXY_CA_DIR`         | CA certificate directory | .proxy_certs |

### Log Levels

- **0**: Errors only
- **1**: Basic operational logs
- **2**: Debug logs with detailed information

## 📦 Module Dependencies

```
start-proxy.js
├── logger.js
├── stats.js
├── rule-validator.js
├── error-handler.js
├── request-processor.js
├── response-processor.js
├── proxy-config.js
└── utils/
    ├── url-utils.js
    ├── request-utils.js
    ├── curl-utils.js
    ├── error-utils.js
    └── index.js
```

## 🔄 Migration Notes

### From Legacy System

The legacy `start-proxy.js` has been replaced with a simple entry point that delegates to the new modular system:

```javascript
// start-proxy.js (root)
const { main } = require("./src/proxy-server");
main();
```

### Backward Compatibility

All existing rules and configurations continue to work without modification. The refactoring is purely internal and doesn't change the external API.

## 🧪 Testing

Each module can be tested independently:

```javascript
const { logger } = require("./src/logger");
const { validateRules } = require("./src/rule-validator");
const { processRequest } = require("./src/request-processor");

// Test individual components
```

## 📈 Benefits

1. **Maintainability**: Easier to understand, modify, and extend
2. **Testability**: Individual modules can be unit tested
3. **Reusability**: Components can be used in other projects
4. **Debugging**: Better error messages and logging
5. **Performance**: Optimized request/response processing
6. **Documentation**: Self-documenting code with clear module boundaries

## 🔮 Future Enhancements

- Plugin system for custom processors
- Performance monitoring and metrics
- Enhanced rule debugging tools
- Configuration hot-reloading
- Advanced caching mechanisms
