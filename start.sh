#!/bin/bash

# Disable TLS certificate verification
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Script to start Node.js proxy server and Chrome with proxy settings

# Default URL if none is provided
DEFAULT_URL="about:blank"
TARGET_URL=${1:-$DEFAULT_URL}

# Command to start the Node.js server
NODE_SERVER_CMD="node proxy-server.js"

# Chrome application path
CHROME_APP_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Start the Node.js server in the background
echo "Starting Node.js proxy server..."
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