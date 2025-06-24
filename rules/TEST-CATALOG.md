# Proxy Magic Test Catalog

This document provides a comprehensive list of all possible tests organized by proxy rule functionality.

## 🎯 MATCHING Tests

### Domain/Hostname Matching

| Test Case              | Code Example                                               | Description                   |
| ---------------------- | ---------------------------------------------------------- | ----------------------------- |
| **Exact Domain**       | `parsedUrl.hostname === 'example.com'`                     | Match specific domain exactly |
| **Subdomain Wildcard** | `parsedUrl.hostname.endsWith('.example.com')`              | Match all subdomains          |
| **Domain Contains**    | `parsedUrl.hostname.includes('example')`                   | Match domains containing text |
| **Multiple Domains**   | `['example.com', 'test.com'].includes(parsedUrl.hostname)` | Match any from list           |
| **Regex Domain**       | `/^(www\.)?example\.(com\|org)$/.test(parsedUrl.hostname)` | Complex domain patterns       |
| **Subdomain Prefix**   | `parsedUrl.hostname.startsWith('api.')`                    | Match subdomain prefixes      |
| **Local Domains**      | `parsedUrl.hostname === 'localhost'`                       | Match localhost               |
| **IP Addresses**       | `parsedUrl.hostname === '127.0.0.1'`                       | Match IP addresses            |
| **Development TLDs**   | `parsedUrl.hostname.endsWith('.test')`                     | Match .test, .local, .dev     |

### Port Matching

| Test Case             | Code Example                                                           | Description            |
| --------------------- | ---------------------------------------------------------------------- | ---------------------- |
| **Specific Port**     | `parsedUrl.port === '3000'`                                            | Match exact port       |
| **Port Range**        | `parseInt(parsedUrl.port) >= 3000 && parseInt(parsedUrl.port) <= 3999` | Match port ranges      |
| **Common Ports**      | `['80', '443', '8080'].includes(parsedUrl.port)`                       | Match common ports     |
| **Development Ports** | `['3000', '8000', '8080'].includes(parsedUrl.port)`                    | Match dev server ports |

### Path Matching

| Test Case           | Code Example                                                  | Description                 |
| ------------------- | ------------------------------------------------------------- | --------------------------- |
| **Exact Path**      | `parsedUrl.pathname === '/api/users'`                         | Match exact path            |
| **Path Prefix**     | `parsedUrl.pathname.startsWith('/api/')`                      | Match path prefixes         |
| **Path Suffix**     | `parsedUrl.pathname.endsWith('.json')`                        | Match file extensions       |
| **Path Contains**   | `parsedUrl.pathname.includes('/admin/')`                      | Match paths containing text |
| **Path Regex**      | `/^\/api\/v[0-9]+\//.test(parsedUrl.pathname)`                | Match versioned APIs        |
| **Multiple Paths**  | `['/login', '/signup', '/auth'].includes(parsedUrl.pathname)` | Match specific paths        |
| **File Extensions** | `parsedUrl.pathname.match(/\.(js\|css\|png\|jpg)$/)`          | Match static files          |

### Query Parameter Matching

| Test Case               | Code Example                                                                | Description               |
| ----------------------- | --------------------------------------------------------------------------- | ------------------------- |
| **Parameter Exists**    | `parsedUrl.searchParams.has('debug')`                                       | Check if parameter exists |
| **Parameter Value**     | `parsedUrl.searchParams.get('env') === 'dev'`                               | Match parameter value     |
| **Multiple Parameters** | `parsedUrl.searchParams.has('debug') && parsedUrl.searchParams.has('test')` | Multiple conditions       |
| **Parameter Pattern**   | `/^v[0-9]+$/.test(parsedUrl.searchParams.get('version'))`                   | Parameter value patterns  |

### HTTP Method Matching

| Test Case         | Code Example                                            | Description                |
| ----------------- | ------------------------------------------------------- | -------------------------- |
| **GET Requests**  | `clientReq.method === 'GET'`                            | Match GET requests         |
| **POST Requests** | `clientReq.method === 'POST'`                           | Match POST requests        |
| **API Methods**   | `['POST', 'PUT', 'DELETE'].includes(clientReq.method)`  | Match write operations     |
| **Safe Methods**  | `['GET', 'HEAD', 'OPTIONS'].includes(clientReq.method)` | Match read-only operations |

### Header-Based Matching

| Test Case          | Code Example                                               | Description                  |
| ------------------ | ---------------------------------------------------------- | ---------------------------- |
| **User Agent**     | `clientReq.headers['user-agent'].includes('Chrome')`       | Match specific browsers      |
| **Content Type**   | `clientReq.headers['content-type'] === 'application/json'` | Match request content type   |
| **Accept Header**  | `clientReq.headers['accept'].includes('text/html')`        | Match what client accepts    |
| **Authorization**  | `clientReq.headers['authorization']`                       | Match authenticated requests |
| **Custom Headers** | `clientReq.headers['x-api-key']`                           | Match custom headers         |
| **Referer**        | `clientReq.headers['referer'].includes('example.com')`     | Match request source         |

### Combined/Complex Matching

| Test Case            | Code Example                                                                                     | Description               |
| -------------------- | ------------------------------------------------------------------------------------------------ | ------------------------- |
| **API Endpoints**    | `parsedUrl.hostname === 'api.example.com' && parsedUrl.pathname.startsWith('/v1/')`              | API-specific matching     |
| **Static Assets**    | `parsedUrl.pathname.match(/\.(css\|js\|png\|jpg)$/) && parsedUrl.hostname === 'cdn.example.com'` | CDN asset matching        |
| **Admin Areas**      | `parsedUrl.pathname.startsWith('/admin/') && clientReq.headers['authorization']`                 | Secure area matching      |
| **Development Mode** | `parsedUrl.hostname === 'localhost' && parsedUrl.searchParams.has('debug')`                      | Dev environment detection |

---

## 🔄 ON REQUEST Tests

### Header Manipulation

| Test Case               | Code Example                                                                      | Description             |
| ----------------------- | --------------------------------------------------------------------------------- | ----------------------- |
| **Add Header**          | `ctx.proxyToServerRequestOptions.headers['X-Custom'] = 'value'`                   | Add custom headers      |
| **Modify User-Agent**   | `ctx.proxyToServerRequestOptions.headers['User-Agent'] = 'Custom Agent'`          | Change user agent       |
| **Add Authentication**  | `ctx.proxyToServerRequestOptions.headers['Authorization'] = 'Bearer token'`       | Add auth headers        |
| **Remove Header**       | `delete ctx.proxyToServerRequestOptions.headers['X-Tracking']`                    | Remove unwanted headers |
| **Copy Headers**        | `ctx.proxyToServerRequestOptions.headers['X-Original-Host'] = parsedUrl.hostname` | Copy request info       |
| **Conditional Headers** | Add headers based on conditions                                                   | Dynamic header addition |

### URL/Path Redirection

| Test Case              | Code Example                                                                          | Description                  |
| ---------------------- | ------------------------------------------------------------------------------------- | ---------------------------- |
| **Change Hostname**    | `ctx.proxyToServerRequestOptions.hostname = 'api.example.com'`                        | Redirect to different server |
| **Change Port**        | `ctx.proxyToServerRequestOptions.port = 443`                                          | Change target port           |
| **Change Path**        | `ctx.proxyToServerRequestOptions.path = '/v2' + parsedUrl.pathname`                   | Modify request path          |
| **Path Rewriting**     | `ctx.proxyToServerRequestOptions.path = parsedUrl.pathname.replace('/old/', '/new/')` | Path transformation          |
| **Query Preservation** | `ctx.proxyToServerRequestOptions.path = newPath + parsedUrl.search`                   | Keep query parameters        |

### Query Parameter Manipulation

| Test Case                    | Code Example                                 | Description               |
| ---------------------------- | -------------------------------------------- | ------------------------- |
| **Add Parameters**           | `url.searchParams.set('proxy_test', 'true')` | Add tracking parameters   |
| **Remove Parameters**        | `url.searchParams.delete('utm_source')`      | Remove tracking           |
| **Modify Parameters**        | `url.searchParams.set('version', 'v2')`      | Change parameter values   |
| **Parameter Transformation** | Transform parameter format                   | Convert parameter formats |

### Request Body Modification

| Test Case                  | Code Example             | Description                 |
| -------------------------- | ------------------------ | --------------------------- |
| **JSON Enhancement**       | Modify JSON request body | Add fields to JSON requests |
| **Form Data Modification** | Modify form submissions  | Change form field values    |
| **File Upload Handling**   | Handle multipart data    | Process file uploads        |

### SSL/Protocol Handling

| Test Case              | Code Example        | Description          |
| ---------------------- | ------------------- | -------------------- |
| **Force HTTPS**        | `ctx.isSSL = true`  | Force SSL connection |
| **Protocol Downgrade** | `ctx.isSSL = false` | Use HTTP instead     |

### Request Blocking/Filtering

| Test Case                | Code Example                    | Description             |
| ------------------------ | ------------------------------- | ----------------------- |
| **Block Request**        | Return early without forwarding | Block unwanted requests |
| **Conditional Blocking** | Block based on conditions       | Smart request filtering |

---

## 📨 ON RESPONSE Tests

### Response Header Manipulation

| Test Case            | Code Example                                                                             | Description          |
| -------------------- | ---------------------------------------------------------------------------------------- | -------------------- |
| **Add Headers**      | `ctx.proxyToClientResponse.setHeader('X-Proxy-Modified', 'true')`                        | Add response headers |
| **Security Headers** | `ctx.proxyToClientResponse.setHeader('X-Frame-Options', 'DENY')`                         | Add security headers |
| **CORS Headers**     | `ctx.proxyToClientResponse.setHeader('Access-Control-Allow-Origin', '*')`                | Enable CORS          |
| **Cache Control**    | `ctx.proxyToClientResponse.setHeader('Cache-Control', 'no-cache')`                       | Control caching      |
| **Content Type**     | `ctx.proxyToClientResponse.setHeader('Content-Type', 'application/json; charset=utf-8')` | Set content type     |

### HTML Content Modification

| Test Case                | Code Example                                            | Description          |
| ------------------------ | ------------------------------------------------------- | -------------------- |
| **Inject Banners**       | `html.replace('<body>', '<body>' + banner)`             | Add visual banners   |
| **CSS Injection**        | `html.replace('</head>', css + '</head>')`              | Add custom styles    |
| **JavaScript Injection** | `html.replace('</head>', script + '</head>')`           | Add custom scripts   |
| **Content Replacement**  | `html.replace(/old text/g, 'new text')`                 | Replace text content |
| **Link Modification**    | `html.replace(/href="([^"]+)"/g, 'href="modified-$1"')` | Modify links         |
| **Meta Tag Injection**   | Add meta tags for SEO/analytics                         | Inject metadata      |
| **Form Enhancement**     | Modify form elements                                    | Add form validation  |

### JSON Response Modification

| Test Case                      | Code Example                                      | Description                    |
| ------------------------------ | ------------------------------------------------- | ------------------------------ |
| **Add Metadata**               | `jsonData._metadata = { modified: true }`         | Add metadata fields            |
| **Field Modification**         | `jsonData.title = '[MODIFIED] ' + jsonData.title` | Modify existing fields         |
| **Data Enhancement**           | Add computed fields                               | Enhance data with calculations |
| **Array Manipulation**         | Modify array contents                             | Add/remove array items         |
| **Nested Object Modification** | Modify nested structures                          | Deep object manipulation       |

### XML/RSS Modification

| Test Case              | Code Example            | Description                  |
| ---------------------- | ----------------------- | ---------------------------- |
| **RSS Enhancement**    | Modify RSS feed content | Add items to feeds           |
| **XML Transformation** | Transform XML structure | Convert XML formats          |
| **SOAP Modification**  | Modify SOAP responses   | Change web service responses |

### Binary/File Modification

| Test Case                 | Code Example        | Description              |
| ------------------------- | ------------------- | ------------------------ |
| **Image Processing**      | Process image files | Resize, watermark images |
| **CSS Minification**      | Minify CSS files    | Optimize stylesheets     |
| **JavaScript Processing** | Process JS files    | Add debugging, minify    |

### Error Handling/Custom Responses

| Test Case                    | Code Example                    | Description                |
| ---------------------------- | ------------------------------- | -------------------------- |
| **Custom Error Pages**       | Serve custom 404 pages          | Better error experience    |
| **Status Code Modification** | Change response status          | Modify success/error codes |
| **Redirect Responses**       | Generate redirect responses     | Custom redirect logic      |
| **Static File Serving**      | Serve files directly from proxy | Bypass original server     |

### Performance Optimization

| Test Case                | Code Example                 | Description            |
| ------------------------ | ---------------------------- | ---------------------- |
| **Response Compression** | Enable gzip compression      | Optimize transfer size |
| **Caching Logic**        | Implement caching strategies | Cache responses        |
| **Response Streaming**   | Stream large responses       | Handle large files     |

### Content Filtering

| Test Case                | Code Example               | Description     |
| ------------------------ | -------------------------- | --------------- |
| **Content Sanitization** | Remove unsafe content      | Clean HTML/JS   |
| **Ad Blocking**          | Remove advertising content | Block ads       |
| **Privacy Protection**   | Remove tracking scripts    | Enhance privacy |

---

## 🧪 Testing Framework Structure

### Test Organization

```javascript
/** @type {import('../types').Rule} */
const testRule = {
  name: "Test Category - Specific Test",

  // MATCHING TESTS
  match: (parsedUrl, clientReq, ctx) => {
    // Test matching logic here
    return true;
  },

  // REQUEST MODIFICATION TESTS
  onRequest: (ctx, parsedUrl) => {
    // Test request modification here
  },

  // RESPONSE MODIFICATION TESTS
  onResponse: (ctx, parsedUrl) => {
    // Test response modification here
  },
};
```

### Safe Testing Recommendations

- **Use testing domains**: httpbin.org, jsonplaceholder.typicode.com, example.com
- **Use localhost**: Test with local development servers
- **Use .test domains**: Create custom test scenarios
- **Mock responses**: Use proxy to serve test data
- **Gradual complexity**: Start simple, add complexity progressively
