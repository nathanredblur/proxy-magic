#!/bin/bash

# Disable TLS certificate verification
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Script to start Node.js proxy server and Chrome with proxy settings
# Usage: ./start.sh [URL] [--log=LEVEL | -l LEVEL]
# Examples:
#   ./start.sh https://example.com --log=DEBUG
#   ./start.sh --log=INFO https://example.com
#   ./start.sh -l DEBUG
#   ./start.sh https://example.com

# Default values
DEFAULT_URL="about:blank"
DEFAULT_LOG_LEVEL="1"  # INFO level

# Initialize variables
TARGET_URL=""
LOG_LEVEL="$DEFAULT_LOG_LEVEL"

# Function to convert log level names to numbers
get_log_level_number() {
    # Convert to uppercase using tr command for better compatibility
    local level_upper=$(echo "$1" | tr '[:lower:]' '[:upper:]')
    case "$level_upper" in
        "NONE"|"0")     echo "0" ;;
        "INFO"|"1")     echo "1" ;;
        "DEBUG"|"2")    echo "2" ;;
        *)              echo "1" ;;  # Default to INFO
    esac
}

# Clear the screen
clear

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
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
                echo "Error: --log/-l requires a value (NONE, INFO, DEBUG)"
                exit 1
            fi
            ;;
        -*)
            echo "Unknown option: $1"
            echo "Usage: ./start.sh [URL] [--log=LEVEL | -l LEVEL]"
            echo "Log levels: NONE, INFO, DEBUG"
            exit 1
            ;;
        *)
            # If no URL has been set yet, this is the URL
            if [[ -z "$TARGET_URL" ]]; then
                TARGET_URL="$1"
            else
                echo "Error: Multiple URLs provided. Only one URL is allowed."
                exit 1
            fi
            shift
            ;;
    esac
done

# Set default URL if none provided
if [[ -z "$TARGET_URL" ]]; then
    TARGET_URL="$DEFAULT_URL"
fi

# Export log level for the proxy server
export PROXY_LOG_LEVEL=$LOG_LEVEL

# Command to start the Node.js server
NODE_SERVER_CMD="node proxy-server.js"

# Chrome application path
CHROME_APP_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Start the Node.js server in the background
LOG_LEVEL_NAME_DISPLAY="INFO"
case $LOG_LEVEL in
    "0") LOG_LEVEL_NAME_DISPLAY="NONE" ;;
    "1") LOG_LEVEL_NAME_DISPLAY="INFO" ;;
    "2") LOG_LEVEL_NAME_DISPLAY="DEBUG" ;;
esac
echo "Starting Node.js proxy server with log level: $LOG_LEVEL_NAME_DISPLAY ($LOG_LEVEL)"
$NODE_SERVER_CMD &
NODE_SERVER_PID=$!
echo "Node.js server started with PID: $NODE_SERVER_PID"

# Function to clean up (kill Node.js server)
cleanup() {
    echo "Cleaning up..."
    if kill -0 $NODE_SERVER_PID 2>/dev/null; then
        echo "Stopping Node.js server (PID: $NODE_SERVER_PID)..."
        kill $NODE_SERVER_PID
        wait $NODE_SERVER_PID 2>/dev/null # Wait for the process to actually terminate
        echo "Node.js server stopped."
    else
        echo "Node.js server (PID: $NODE_SERVER_PID) already stopped or not found."
    fi
}

# Trap EXIT signal to run cleanup function
trap cleanup EXIT

# Prepare Chrome arguments using an array
CHROME_ARGS=(
    "--proxy-server=http://127.0.0.1:8080"
    "--no-first-run"
    "--user-data-dir=./.chrome_proxy_profile"
    "--disable-session-crashed-bubble"
)

# Start Chrome
echo "Starting Chrome with URL: $TARGET_URL"
echo "Chrome command: \"$CHROME_APP_PATH\" \"${CHROME_ARGS[@]}\" \"$TARGET_URL\""

# Execute Chrome
"$CHROME_APP_PATH" "${CHROME_ARGS[@]}" "$TARGET_URL"

CHROME_EXIT_CODE=$?
echo "Chrome exited with code: $CHROME_EXIT_CODE. Script will now exit and cleanup."

# Explicitly exit to ensure the trap runs, though it should run anyway
exit $CHROME_EXIT_CODE 