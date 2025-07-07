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
# Certificate paths (using user home directory)
CA_DIR="$HOME/.proxy_certs"
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
    # Remove temporary files
    rm -f /tmp/proxy-setup.log
    rm -f "$PID_FILE"
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
    log "Generating certificates using --create-cert option..."
    
    # Use the new --create-cert option to generate certificates only
    export NODE_TLS_REJECT_UNAUTHORIZED=0
    
    if proxy-magic --create-cert > /tmp/proxy-setup.log 2>&1; then
        success "Certificates generated successfully"
        return 0
    else
        error "Certificate generation failed:"
        cat /tmp/proxy-setup.log
        return 1
    fi
}

wait_for_certificate() {
    # With --create-cert, certificates are generated synchronously
    # So we just need to check if the certificate file exists
    if [ -f "$CA_CERT_PATH" ]; then
        success "Certificate file found"
        return 0
    else
        error "Certificate file not found at $CA_CERT_PATH"
        return 1
    fi
}

show_existing_certificates() {
    log "Current certificates in keychain:"
    echo "--- System Keychain ---"
    local system_output=$(security find-certificate -a -c "NodeMITMProxyCA" -Z /Library/Keychains/System.keychain 2>/dev/null)
    if [ -n "$system_output" ]; then
        echo "$system_output" | grep -E "(keychain|\"labl\"|SHA-1 hash:)"
        local count=$(echo "$system_output" | grep -c "SHA-1 hash:")
        log "Total: $count certificate(s) in system keychain"
    else
        echo "No NodeMITMProxyCA certificates found in system keychain"
    fi
    
    echo "--- User Keychain ---"
    local user_output=$(security find-certificate -a -c "NodeMITMProxyCA" -Z ~/Library/Keychains/login.keychain-db 2>/dev/null)
    if [ -n "$user_output" ]; then
        echo "$user_output" | grep -E "(keychain|\"labl\"|SHA-1 hash:)"
        local count=$(echo "$user_output" | grep -c "SHA-1 hash:")
        log "Total: $count certificate(s) in user keychain"
    else
        echo "No NodeMITMProxyCA certificates found in user keychain"
    fi
    echo ""
}

remove_old_certificates() {
    log "Removing old certificates and directories..."
    
    # Show existing certificates first
    show_existing_certificates
    
    # Remove certificate directories
    if [ -d "$CA_DIR" ]; then
        rm -rf "$CA_DIR"
        success "Removed certificate directory: $CA_DIR"
    fi
    
    # Remove old certificates from keychain
    log "Checking for old certificates in keychain..."
    
    # Common certificate names used by http-mitm-proxy
    local cert_names=("NodeMITMProxyCA" "http-mitm-proxy" "MITM Proxy CA" "Proxy Magic CA" "localhost")
    
    for cert_name in "${cert_names[@]}"; do
        log "Checking for certificates named '$cert_name'..."
        
        # Remove from system keychain (may have multiple certificates with same name)
        local removed_count=0
        
        # Get all certificate SHA-1 hashes for this name
        local cert_hashes=($(security find-certificate -a -c "$cert_name" -Z /Library/Keychains/System.keychain 2>/dev/null | grep "SHA-1 hash:" | awk '{print $3}'))
        
        if [ ${#cert_hashes[@]} -gt 0 ]; then
            log "Found ${#cert_hashes[@]} certificate(s) named '$cert_name' in system keychain"
            
            for hash in "${cert_hashes[@]}"; do
                log "Removing certificate with SHA-1: $hash"
                if sudo security delete-certificate -Z "$hash" /Library/Keychains/System.keychain 2>/dev/null; then
                    removed_count=$((removed_count + 1))
                    success "Removed certificate with hash: $hash"
                else
                    warning "Could not remove certificate with hash: $hash"
                fi
            done
        fi
        
        if [ $removed_count -gt 0 ]; then
            success "Removed $removed_count certificate(s) named '$cert_name' from system keychain"
        fi
        
        # Remove from user keychain (may have multiple certificates with same name)
        removed_count=0
        
        # Get all certificate SHA-1 hashes for this name in user keychain
        local user_cert_hashes=($(security find-certificate -a -c "$cert_name" -Z ~/Library/Keychains/login.keychain-db 2>/dev/null | grep "SHA-1 hash:" | awk '{print $3}'))
        
        if [ ${#user_cert_hashes[@]} -gt 0 ]; then
            log "Found ${#user_cert_hashes[@]} certificate(s) named '$cert_name' in user keychain"
            
            for hash in "${user_cert_hashes[@]}"; do
                log "Removing certificate with SHA-1: $hash from user keychain"
                if security delete-certificate -Z "$hash" ~/Library/Keychains/login.keychain-db 2>/dev/null; then
                    removed_count=$((removed_count + 1))
                    success "Removed certificate with hash: $hash from user keychain"
                else
                    warning "Could not remove certificate with hash: $hash from user keychain"
                fi
            done
        fi
        
        if [ $removed_count -gt 0 ]; then
            success "Removed $removed_count certificate(s) named '$cert_name' from user keychain"
        fi
    done
    
    success "Certificate cleanup completed"
    
    # Show certificates after cleanup
    log "Certificates after cleanup:"
    show_existing_certificates
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
    echo "  -c, --clean    Clean old certificates and regenerate"
    echo "  --clean-only   Only clean certificates, don't regenerate"
    echo "  --show-certs   Show current certificates in keychain"
    echo "  -q, --quiet    Quiet mode (less verbose output)"
    echo ""
    echo "This script will:"
    echo "  1. Clean old certificates (if --clean or --force is used)"
    echo "  2. Start the proxy server to generate SSL certificates"
    echo "  3. Wait for certificate generation"
    echo "  4. Stop the proxy server"
    echo "  5. Install the certificate to macOS system keychain"
}

main() {
    local force_install=false
    local clean_certificates=false
    local clean_only=false
    local show_certificates=false
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
                clean_certificates=true
                shift
                ;;
            -c|--clean)
                clean_certificates=true
                shift
                ;;
            --clean-only)
                clean_only=true
                shift
                ;;
            --show-certs)
                show_certificates=true
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
    
    # Handle special commands first
    if [ "$show_certificates" = true ]; then
        echo -e "${MAGENTA}🔍 Current Certificates${NC}"
        check_requirements
        show_existing_certificates
        exit 0
    fi
    
    if [ "$clean_only" = true ]; then
        echo -e "${MAGENTA}🧹 Certificate Cleanup Only${NC}"
        check_requirements
        remove_old_certificates
        success "Certificate cleanup completed!"
        exit 0
    fi
    
    # Header
    echo -e "${MAGENTA}"
    echo "🚀 Proxy Magic Setup"
    echo "=================="
    echo -e "${NC}"
    
    # Check system requirements
    check_requirements
    
    # Show certificate location
    log "Certificate directory: $CA_DIR"
    log "Certificate file: $CA_CERT_PATH"
    
    # Clean old certificates if requested
    if [ "$clean_certificates" = true ]; then
        remove_old_certificates
    elif [ -f "$CA_CERT_PATH" ] && [ "$force_install" = false ]; then
        log "Certificate already exists at: $CA_CERT_PATH"
        echo -n "Do you want to reinstall the certificate? (y/N): "
        read -r answer
        if [[ ! "$answer" =~ ^[Yy]$ ]]; then
            log "Setup cancelled by user"
            exit 0
        fi
        remove_old_certificates
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
    log "Run: proxy-magic --chrome-url https://www.example.org --chrome"
    log "or browse to any HTTPS site to test SSL interception"
    echo ""
    log "Certificate location: $CA_CERT_PATH"
    log "Proxy server log: /tmp/proxy-setup.log"
}

# Run main function
main "$@" 