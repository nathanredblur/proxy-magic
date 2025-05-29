# MITM Proxy Server for Development

This project sets up a local Man-in-the-Middle (MITM) proxy server using Node.js and the `http-mitm-proxy` library. It's designed to intercept and modify HTTP/HTTPS traffic for development and testing purposes.

## Features

- Intercepts HTTP and HTTPS traffic.
- Allows defining custom rules to modify requests (e.g., redirect URLs, add headers).
- Stores its Certificate Authority (CA) certificate locally within the project (`./.proxy_certs`).

## Prerequisites

- Node.js and pnpm (or npm/yarn) installed.

## Setup and Usage

1.  **Install Dependencies:**

    ```bash
    pnpm install
    # or npm install
    # or yarn install
    ```

2.  **Generate and Install the CA Certificate:**

    The first time you run the proxy, it will generate a root Certificate Authority (CA) if one doesn't already exist in the `./.proxy_certs/certs/` directory. This CA is used to sign SSL certificates for the sites you visit through the proxy, allowing it to decrypt and inspect HTTPS traffic.

    - **Run the proxy once to generate the CA:**

      ```bash
      pnpm start
      # or node proxy-server.js
      ```

      Look for a message like: `The CA certificate (ca.pem) for this proxy will be stored in: /path/to/your/project/.proxy_certs/certs/ca.pem`.
      You can stop the proxy (Ctrl+C) after the certificate `ca.pem` is generated.

    - **Install the CA Certificate (`ca.pem`):**
      You **MUST** install the generated `ca.pem` file (located at `./.proxy_certs/certs/ca.pem`) into your operating system's or browser's trust store. Otherwise, you will get SSL warnings/errors for all HTTPS sites.

      **macOS:**

      1.  Open **Keychain Access** (Applications > Utilities > Keychain Access).
      2.  Select the **System** keychain from the sidebar.
      3.  Drag and drop the `ca.pem` file from `./.proxy_certs/certs/ca.pem` into the list of certificates in Keychain Access.
      4.  Find the certificate in the list (it will likely be named after the hostname of your machine or a generic name like "Node MITM Proxy CA").
      5.  Double-click the certificate to open its details.
      6.  Expand the **Trust** section.
      7.  Set "When using this certificate:" to **Always Trust**.
      8.  Close the certificate window. You may need to enter your administrator password.

      **Windows:**

      1.  Double-click the `ca.pem` file.
      2.  Click "Install Certificate...".
      3.  Choose "Current User" or "Local Machine" (Local Machine is generally recommended if you have admin rights).
      4.  Select "Place all certificates in the following store".
      5.  Click "Browse..." and select "Trusted Root Certification Authorities". Click OK.
      6.  Click "Next" and then "Finish".
      7.  If you get a security warning, click "Yes".

      **Linux (Debian/Ubuntu based):**

      1.  Copy the `ca.pem` file to the system CA directory:
          ```bash
          sudo cp ./.proxy_certs/certs/ca.pem /usr/local/share/ca-certificates/node-mitm-proxy.crt
          ```
      2.  Update the system CA store:
          ```bash
          sudo update-ca-certificates
          ```

      **Firefox:**
      Firefox has its own certificate trust store. You may need to import the CA certificate there as well:

      1.  Go to Firefox Settings > Privacy & Security > Certificates (View Certificates).
      2.  In the "Authorities" tab, click "Import...".
      3.  Navigate to and select the `ca.pem` file from `./.proxy_certs/certs/ca.pem`.
      4.  Check "Trust this CA to identify websites." and click OK.

3.  **Start the Proxy Server:**

    ```bash
    pnpm start
    ```

    The proxy will listen on port 8080 (or as configured in `proxy-server.js`).

4.  **Configure Your Browser/System to Use the Proxy:**

    - **System-wide (macOS Example):**

      1.  Go to System Settings > Network.
      2.  Select your active network service (e.g., Wi-Fi).
      3.  Click "Details..." then "Proxies".
      4.  Enable "Web Proxy (HTTP)" and "Secure Web Proxy (HTTPS)".
      5.  Set both to Server: `127.0.0.1`, Port: `8080`.
      6.  Click OK and Apply.

    - **Launch Chrome with Proxy (macOS/Linux):**
      You can use the command from `package.json`'s `start:chrome:proxy` script or adapt it:

      ```bash
      /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --proxy-server="http://127.0.0.1:8080" --user-data-dir="$(mktemp -d)" --no-first-run --ignore-certificate-errors-spki-list=THIS_IS_A_PLACEHOLDER_AND_WILL_BE_GENERATED_BY_THE_PROXY
      ```

      **Note on `--ignore-certificate-errors-spki-list`**: `http-mitm-proxy` might require you to add a specific SPKI hash to this flag if you encounter issues with Chrome trusting the dynamically generated certificates, even with the root CA installed. The proxy itself might log this required hash when it encounters such an issue. Alternatively, ensuring the CA is fully trusted in your OS keychain often resolves this for Chrome.

      For a more persistent setup without needing to start Chrome with flags every time, configure the proxy in your system network settings.

## Implementing Rules

Modify the `proxy.onRequest` function in `proxy-server.js` to define your interception and modification rules.
See the comments within the file for examples on how to:

- Read request details (URL, headers, method).
- Modify the request before it's sent to the server (e.g., change host, port, path, headers).

Example (redirecting a specific path):

```javascript
// In proxy.onRequest in proxy-server.js
const req = ctx.clientToProxyRequest;
const url = new URL(req.url); // Assumes req.url is absolute, which it should be in proxy requests

if (
  url.hostname.startsWith("kraken-dev-") &&
  url.pathname.startsWith("/my/money/account")
) {
  const acceptHeader = req.headers["accept"] || "";
  if (acceptHeader.includes("text/html")) {
    console.log(`[MITM RULE] Kraken redirect rule matched for ${req.url}`);
    ctx.proxyToServerRequestOptions.host = "localhost";
    ctx.proxyToServerRequestOptions.port = 9045;
    ctx.proxyToServerRequestOptions.path = url.pathname + url.search; // Preserve path and query
    ctx.proxyToServerRequestOptions.headers["Host"] = "localhost:9045"; // Update Host header
    console.log(
      `[MITM RULE] Redirecting to localhost:9045${ctx.proxyToServerRequestOptions.path}`
    );
  }
}
```

## Troubleshooting

- **SSL Errors / Untrusted Certificate:** Ensure the `ca.pem` from `./.proxy_certs/certs/ca.pem` is correctly installed AND trusted in your system/browser keychain. Restart your browser after installing the certificate.
- **Proxy Not Intercepting:** Double-check your system/browser proxy settings are pointing to `127.0.0.1:8080` for both HTTP and HTTPS.
- **Certificate Generation:** If `.proxy_certs/certs/ca.pem` is not created, check console logs for errors when starting the proxy server.

## To Add to .gitignore

It's highly recommended to add the certificate directory to your `.gitignore` file, as these are typically machine-specific or generated locally.

```
# Proxy CA certificates
/.proxy_certs/
```
