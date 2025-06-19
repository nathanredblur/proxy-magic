#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROXY_PORT=8080
CA_DIR=".proxy_certs"
CA_CERT_PATH="$CA_DIR/certs/ca.pem"
STARTUP_TIMEOUT=15
PID_FILE="/tmp/proxy-magic-setup.pid"

# Functions
log() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

cleanup() {
    log "Cleaning up..."
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log "Stopping proxy server (PID: $pid)..."
            kill -TERM "$pid" 2>/dev/null
            sleep 2
            if kill -0 "$pid" 2>/dev/null; then
                kill -KILL "$pid" 2>/dev/null
            fi
        fi
        rm -f "$PID_FILE"
    fi
}

# Trap to ensure cleanup on exit
trap cleanup EXIT INT TERM

check_requirements() {
    log "Checking system requirements..."
    
    # Check if we're on macOS
    if [[ "$OSTYPE" != "darwin"* ]]; then
        error "This setup script is designed for macOS only"
        exit 1
    fi
    
    # Check if security command is available
    if ! command -v security &> /dev/null; then
        error "security command not found. Are you running on macOS?"
        exit 1
    fi
    
    # Check if node is available
    if ! command -v node &> /dev/null; then
        error "Node.js not found. Please install Node.js first."
        exit 1
    fi
    
    success "System requirements check passed"
}

start_proxy_server() {
    log "Starting proxy server to generate certificates..."
    
    # Set environment variables and start the proxy server in background
    export NODE_TLS_REJECT_UNAUTHORIZED=0
    nohup node proxy-server.js > /tmp/proxy-setup.log 2>&1 &
    local pid=$!
    echo $pid > "$PID_FILE"
    
    log "Proxy server started with PID: $pid"
    
    # Wait for server to start
    local attempts=0
    local max_attempts=$((STARTUP_TIMEOUT * 2)) # Check every 500ms
    
    while [ $attempts -lt $max_attempts ]; do
        if grep -q "MITM Proxy listening on" /tmp/proxy-setup.log 2>/dev/null; then
            success "Proxy server started successfully"
            return 0
        fi
        
        if grep -q "FATAL ERROR" /tmp/proxy-setup.log 2>/dev/null; then
            error "Proxy server failed to start:"
            cat /tmp/proxy-setup.log
            return 1
        fi
        
        if ! kill -0 "$pid" 2>/dev/null; then
            error "Proxy server process died unexpectedly"
            return 1
        fi
        
        sleep 0.5
        attempts=$((attempts + 1))
        
        # Show progress every 5 seconds
        if [ $((attempts % 10)) -eq 0 ]; then
            log "Still waiting for proxy server to start... (${attempts}/2 seconds)"
        fi
    done
    
    error "Proxy server startup timeout"
    return 1
}

wait_for_certificate() {
    log "Waiting for certificate generation..."
    
    local attempts=0
    local max_attempts=$((STARTUP_TIMEOUT * 2)) # Check every 500ms
    
    while [ $attempts -lt $max_attempts ]; do
        if [ -f "$CA_CERT_PATH" ]; then
            success "Certificate generated successfully"
            return 0
        fi
        
        sleep 0.5
        attempts=$((attempts + 1))
        
        # Show progress every 5 seconds
        if [ $((attempts % 10)) -eq 0 ]; then
            log "Still waiting for certificate generation... (${attempts}/2 seconds)"
        fi
    done
    
    error "Certificate generation timeout"
    return 1
}

install_certificate() {
    log "Installing certificate to system keychain..."
    warning "This operation requires administrator privileges"
    
    # Check if certificate file exists
    if [ ! -f "$CA_CERT_PATH" ]; then
        error "Certificate file not found: $CA_CERT_PATH"
        return 1
    fi
    
    # Install the certificate
    if sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "$CA_CERT_PATH" 2>/dev/null; then
        success "Certificate installed successfully to system keychain"
        return 0
    else
        # Check if it already exists
        local cert_name=$(openssl x509 -noout -subject -in "$CA_CERT_PATH" 2>/dev/null | sed 's/.*CN=\([^,]*\).*/\1/')
        if security find-certificate -c "$cert_name" /Library/Keychains/System.keychain >/dev/null 2>&1; then
            warning "Certificate already exists in keychain"
            return 0
        else
            error "Failed to install certificate. Please run with sudo or check your permissions."
            return 1
        fi
    fi
}

show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -f, --force    Force reinstallation even if certificate exists"
    echo "  -q, --quiet    Quiet mode (less verbose output)"
    echo ""
    echo "This script will:"
    echo "  1. Start the proxy server to generate SSL certificates"
    echo "  2. Wait for certificate generation"
    echo "  3. Stop the proxy server"
    echo "  4. Install the certificate to macOS system keychain"
}

main() {
    local force_install=false
    local quiet_mode=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -f|--force)
                force_install=true
                shift
                ;;
            -q|--quiet)
                quiet_mode=true
                shift
                ;;
            *)
                error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Header
    echo -e "${MAGENTA}"
    echo "🚀 Proxy Magic Setup"
    echo "=================="
    echo -e "${NC}"
    
    # Check system requirements
    check_requirements
    
    # Check if certificate already exists
    if [ -f "$CA_CERT_PATH" ] && [ "$force_install" = false ]; then
        log "Certificate already exists at: $CA_CERT_PATH"
        echo -n "Do you want to reinstall the certificate? (y/N): "
        read -r answer
        if [[ ! "$answer" =~ ^[Yy]$ ]]; then
            log "Setup cancelled by user"
            exit 0
        fi
    fi
    
    # Create certificates directory if it doesn't exist
    mkdir -p "$CA_DIR/certs" "$CA_DIR/keys"
    
    # Start proxy server
    if ! start_proxy_server; then
        error "Failed to start proxy server"
        exit 1
    fi
    
    # Wait for certificate generation
    if ! wait_for_certificate; then
        error "Failed to generate certificate"
        exit 1
    fi
    
    # Install certificate
    if ! install_certificate; then
        error "Failed to install certificate"
        exit 1
    fi
    
    # Success message
    echo ""
    success "🎉 Setup completed successfully!"
    echo ""
    log "Next steps"
    log "Run: ./start.sh https://www.example.org"
    log "or browse to any HTTPS site to test SSL interception"
    echo ""
    log "Certificate location: $CA_CERT_PATH"
    log "Proxy server log: /tmp/proxy-setup.log"
}

# Run main function
main "$@" 