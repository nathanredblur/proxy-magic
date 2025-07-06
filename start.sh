#!/bin/bash

# Disable TLS certificate verification
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Proxy Magic Startup Script
# Supports multiple configuration modes with .env file support
# Usage: ./start.sh [OPTIONS]
# All options can be configured via .env file or command line

# Load .env file if it exists
if [[ -f .env ]]; then
    source .env
fi

# Default values (can be overridden by .env)
DEFAULT_LOG_LEVEL="1"  # INFO level

# Initialize variables with .env defaults
LOG_LEVEL="${LOG_LEVEL:-$DEFAULT_LOG_LEVEL}"
DEBUG_MODE="${DEFAULT_DEBUG:-false}"
UI_MODE="${DEFAULT_UI:-false}"
CHROME_MODE="${DEFAULT_CHROME:-false}"
RULES_DIR="${RULES_DIR:-}"
CHROME_URL="${CHROME_START_URL:-}"

# Convert string boolean values to bash boolean
if [[ "$DEBUG_MODE" == "true" ]]; then
    DEBUG_MODE=true
else
    DEBUG_MODE=false
fi

if [[ "$UI_MODE" == "true" ]]; then
    UI_MODE=true
else
    UI_MODE=false
fi

if [[ "$CHROME_MODE" == "true" ]]; then
    CHROME_MODE=true
else
    CHROME_MODE=false
fi

# Function to convert log level names to numbers
get_log_level_number() {
    # Convert to uppercase using tr command for better compatibility
    local level_upper=$(echo "$1" | tr '[:lower:]' '[:upper:]')
    case "$level_upper" in
        "NONE"|"0")     echo "0" ;;
        "INFO"|"1")     echo "1" ;;
        "DEBUG"|"2")    echo "2" ;;
        "VERBOSE"|"3")  echo "3" ;;
        *)              echo "1" ;;  # Default to INFO
    esac
}

# Clear the screen
clear

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --ui)
            UI_MODE=true
            shift
            ;;
        --no-ui)
            UI_MODE=false
            shift
            ;;
        --chrome)
            CHROME_MODE=true
            shift
            ;;
        --no-chrome)
            CHROME_MODE=false
            shift
            ;;
        --debug)
            DEBUG_MODE=true
            shift
            ;;
        --no-debug)
            DEBUG_MODE=false
            shift
            ;;
        --rules=*)
            RULES_DIR="${1#*=}"
            shift
            ;;
        --rules)
            if [[ -n $2 && $2 != -* ]]; then
                RULES_DIR="$2"
                shift 2
            else
                echo "Error: --rules requires a directory path"
                exit 1
            fi
            ;;
        --chrome-url=*)
            CHROME_URL="${1#*=}"
            shift
            ;;
        --chrome-url)
            if [[ -n $2 && $2 != -* ]]; then
                CHROME_URL="$2"
                shift 2
            else
                echo "Error: --chrome-url requires a URL"
                exit 1
            fi
            ;;
        --log=*)
            LOG_LEVEL_NAME="${1#*=}"
            LOG_LEVEL=$(get_log_level_number "$LOG_LEVEL_NAME")
            shift
            ;;
        -l|--log)
            if [[ -n $2 && $2 != -* ]]; then
                LOG_LEVEL_NAME="$2"
                LOG_LEVEL=$(get_log_level_number "$LOG_LEVEL_NAME")
                shift 2
            else
                echo "Error: --log/-l requires a value (NONE, INFO, DEBUG, VERBOSE)"
                exit 1
            fi
            ;;
        --help|-h)
            echo "🎯 Proxy Magic Startup Script"
            echo "============================="
            echo ""
            echo "Usage: ./start.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --ui                      Start with interactive terminal UI"
            echo "  --no-ui                   Disable terminal UI"
            echo "  --chrome                  Launch Chrome browser with proxy"
            echo "  --no-chrome               Don't launch Chrome"
            echo "  --debug                   Enable debug mode"
            echo "  --no-debug                Disable debug mode"
            echo "  --log=LEVEL               Set log level (NONE, INFO, DEBUG, VERBOSE)"
            echo "  -l LEVEL                  Same as --log=LEVEL"
            echo "  --rules=DIR               Set rules directory"
            echo "  --chrome-url=URL          Set Chrome startup URL"
            echo "  --help, -h                Show this help message"
            echo ""
            echo "Current .env Configuration:"
            echo "  DEFAULT_UI=${DEFAULT_UI:-false}"
            echo "  DEFAULT_CHROME=${DEFAULT_CHROME:-false}"
            echo "  DEFAULT_DEBUG=${DEFAULT_DEBUG:-false}"
            echo "  RULES_DIR=${RULES_DIR:-rules}"
            echo "  CHROME_START_URL=${CHROME_START_URL:-(Chrome\'s default behavior)}"
            echo "  LOG_LEVEL=${LOG_LEVEL:-1}"
            echo ""
            echo "Modes:"
            echo "  Default                   Background proxy server"
            echo "  --ui                      Interactive terminal with rule management"
            echo "  --chrome                  Background proxy + Chrome launch"
            echo "  --ui --chrome             Interactive UI + Chrome launch"
            echo ""
            echo "Interactive Features (--ui mode):"
            echo "  🌐 Press 'b' to launch Chrome browser with proxy"
            echo "  📋 Press 'Tab' to switch between logs and rules panels"
            echo "  ⚙️  Press 'Space' to enable/disable rules"
            echo "  📝 Press 'F1' or '?' for complete help"
            echo "  🚪 Press 'q' or Ctrl+C to quit"
            echo ""
            echo "Examples:"
            echo "  ./start.sh                                      # Use .env defaults"
            echo "  ./start.sh --ui --chrome                       # UI + Chrome"
            echo "  ./start.sh --rules=user-rules --ui             # Custom rules dir"
            echo "  ./start.sh --chrome-url=https://google.com     # Custom Chrome URL"
            echo "  ./start.sh --no-ui --no-chrome                 # Force headless mode"
            echo "  ./start.sh --debug --log=DEBUG                 # Full debug mode"
            exit 0
            ;;
        -*)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
        *)
            echo "Error: Unexpected argument '$1'"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Export log level for the proxy server
export PROXY_LOG_LEVEL=$LOG_LEVEL

# Build the Node.js server command with arguments
NODE_SERVER_CMD="node start-proxy.js"

# Add UI argument if specified
if [[ "$UI_MODE" == true ]]; then
    NODE_SERVER_CMD="$NODE_SERVER_CMD --ui"
fi

# Add Chrome argument if specified
if [[ "$CHROME_MODE" == true ]]; then
    NODE_SERVER_CMD="$NODE_SERVER_CMD --chrome"
fi

# Add log level argument if different from default
if [[ "$LOG_LEVEL" != "$DEFAULT_LOG_LEVEL" ]]; then
    NODE_SERVER_CMD="$NODE_SERVER_CMD --log=$LOG_LEVEL"
fi

# Add debug argument if specified
if [[ "$DEBUG_MODE" == true ]]; then
    NODE_SERVER_CMD="$NODE_SERVER_CMD --debug"
fi

# Add rules directory if specified
if [[ -n "$RULES_DIR" ]]; then
    NODE_SERVER_CMD="$NODE_SERVER_CMD --rules=$RULES_DIR"
fi

# Add Chrome URL if specified
if [[ -n "$CHROME_URL" ]]; then
    NODE_SERVER_CMD="$NODE_SERVER_CMD --chrome-url=$CHROME_URL"
fi

# Display startup information
LOG_LEVEL_NAME_DISPLAY="INFO"
case $LOG_LEVEL in
    "0") LOG_LEVEL_NAME_DISPLAY="NONE" ;;
    "1") LOG_LEVEL_NAME_DISPLAY="INFO" ;;
    "2") LOG_LEVEL_NAME_DISPLAY="DEBUG" ;;
    "3") LOG_LEVEL_NAME_DISPLAY="VERBOSE" ;;
esac

echo "🎯 Proxy Magic Startup"
echo "====================="
echo ""
echo "Configuration:"
echo "  🌐 Proxy: http://127.0.0.1:8080"
echo "  🎮 Interactive UI: $([ "$UI_MODE" == true ] && echo "Enabled" || echo "Disabled")"
echo "  🌐 Auto Chrome: $([ "$CHROME_MODE" == true ] && echo "Enabled" || echo "Disabled")"
echo "  📊 Log Level: $LOG_LEVEL_NAME_DISPLAY ($LOG_LEVEL)"
echo "  🐛 Debug Mode: $([ "$DEBUG_MODE" == true ] && echo "Enabled" || echo "Disabled")"
echo "  📁 Rules Directory: ${RULES_DIR:-default}"
echo "  🌐 Chrome Start URL: ${CHROME_URL:-default}"
echo ""

# Function to clean up
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    if [[ ! -z "$SERVER_PID" ]]; then
        echo "  🔌 Stopping proxy server..."
        kill $SERVER_PID 2>/dev/null
        wait $SERVER_PID 2>/dev/null
    fi
    echo "✅ Cleanup complete"
}

# Trap EXIT signal to run cleanup function
trap cleanup EXIT

if [[ "$UI_MODE" == true ]]; then
    # UI mode: Run in foreground with interactive terminal
    echo "🚀 Starting Proxy Magic with Interactive UI..."
    if [[ "$CHROME_MODE" == true ]]; then
        echo "📱 Chrome will be launched automatically"
    else
        echo "📱 Press 'b' in the UI to launch Chrome browser"
    fi
    echo "📝 Use Ctrl+C or 'q' to quit"
    echo ""
    echo "Command: $NODE_SERVER_CMD"
    echo ""
    
    # Start the proxy server with UI (runs in foreground)
    exec $NODE_SERVER_CMD
else
    # Background mode: Run proxy in background, optionally start Chrome
    echo "🚀 Starting Proxy Magic in background mode..."
    if [[ "$CHROME_MODE" == true ]]; then
        echo "📱 Chrome will be launched automatically"
    else
        echo "📱 Configure your browser manually with proxy: http://127.0.0.1:8080"
    fi
    echo ""
    echo "Command: $NODE_SERVER_CMD"
    echo ""
    
    # Start the proxy server in background
    $NODE_SERVER_CMD &
    SERVER_PID=$!
    
    # Wait a moment for the server to start
    sleep 2
    
    # Check if server started successfully
    if ! kill -0 $SERVER_PID 2>/dev/null; then
        echo "❌ Failed to start proxy server"
        exit 1
    fi
    
    echo "✅ Proxy server started (PID: $SERVER_PID)"
    echo "🌐 Proxy URL: http://127.0.0.1:8080"
    echo ""
    
    if [[ "$CHROME_MODE" == true ]]; then
        echo "📱 Chrome will be launched by the proxy server"
        echo "⌨️  Press Ctrl+C to stop the proxy and Chrome"
    else
        echo "⌨️  Press Ctrl+C to stop the proxy server"
    fi
    echo ""
    
    # Wait for interrupt signal
    wait $SERVER_PID
fi 