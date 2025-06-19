# Rules Directory

This folder contains all proxy rules organized in a modular way to facilitate administration.

## Structure

- **`types.js`** - TypeScript type definitions for rules
- **`*.js`** - Individual rule files

## Configuration

The rules folder is configurable through the `.env` file in the project root:

```env
# Rules directory path (relative to project root)
RULES_DIR=rules

# Debug mode for rules loading (true/false)
DEBUG_RULES=false
```

### Environment Variables

- **`RULES_DIR`**: Path to the rules folder (relative to project root)
- **`DEBUG_RULES`**: Enables debug mode to see detailed loading information

## Current Rules

1. **`kraken-assets.js`** - Kraken Assets & HTML Redirect to Localhost (Filename Only)
2. **`banking-html.js`** - Banking HTML Redirect
3. **`websocket-redirect.js`** - WebSocket Redirect to Localhost
4. **`example-org-modifier.js`** - Example.org Modifier

## How to Add a New Rule

1. Create a new `.js` file in this folder (or in the configured folder)
2. Export an object that implements the `Rule` interface (see `types.js`)
3. The rule will be automatically loaded the next time the proxy is restarted

Example:

```javascript
/** @type {import('./types').Rule} */
const myNewRule = {
  name: "My New Rule",
  match: (parsedUrl, clientReq, ctx) => {
    return parsedUrl.hostname.includes("example.com");
  },
  onRequest: (ctx, parsedUrl) => {
    // Modify the request
  },
  onResponse: (ctx, parsedUrl) => {
    // Modify the response (optional)
  },
};

module.exports = myNewRule;
```

## Advanced Configuration

### Using a Custom Rules Folder

1. Modify the `.env` file:

   ```env
   RULES_DIR=my-custom-rules
   ```

2. Create the folder and move/create your rules there

3. Restart the proxy

### Multiple Rules Folders

To have different sets of rules, you can:

1. Create different folders: `rules-dev/`, `rules-prod/`, etc.
2. Change `RULES_DIR` according to the environment
3. Use scripts in `package.json` for different configurations

## Debug

To see detailed information about rule loading:

```bash
# Option 1: Temporary environment variable
DEBUG_RULES=true node proxy-server.js

# Option 2: Modify .env
DEBUG_RULES=true
```

## Advantages of This Structure

- ✅ **Modular**: Each rule in its own file
- ✅ **Configurable**: Customizable rules folder
- ✅ **Easy maintenance**: Modifying one rule doesn't affect others
- ✅ **Auto-loading**: New rules are automatically detected
- ✅ **Type Safety**: TypeScript type definitions
- ✅ **Debug**: Debug mode for troubleshooting
- ✅ **Hot Reload**: Support for hot reloading during development
