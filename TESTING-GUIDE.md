# 🧪 Proxy Magic Testing Guide

## 🎯 Better Testing Alternatives

Instead of using real production domains like Google and DuckDuckGo, here are much better testing options:

## 📋 Recommended Testing Domains

### 🌐 Online Testing Services

| Service             | URL                            | Purpose                  | Why It's Great                           |
| ------------------- | ------------------------------ | ------------------------ | ---------------------------------------- |
| **HTTPBin**         | `httpbin.org`                  | HTTP testing service     | Shows headers, supports all HTTP methods |
| **JSONPlaceholder** | `jsonplaceholder.typicode.com` | Fake REST API            | Perfect for JSON API testing             |
| **Example.com**     | `example.com`                  | RFC 2606 reserved domain | Designed specifically for testing        |
| **PostBin**         | `postb.in`                     | Request inspection       | See exactly what requests look like      |

### 🏠 Local Testing Options

| Option                 | URL              | Purpose            | Setup                 |
| ---------------------- | ---------------- | ------------------ | --------------------- |
| **Local Test Server**  | `localhost:3000` | Custom test server | `node test-server.js` |
| **Development Server** | `127.0.0.1:8000` | Your own app       | Any local server      |
| **Docker Containers**  | Various ports    | Isolated testing   | Docker-based services |

## 🚀 Quick Start Testing

### 1. **Start the Local Test Server**

```bash
# Terminal 1 - Start test server
node test-server.js
```

### 2. **Start the Proxy**

```bash
# Terminal 2 - Start proxy
npm start
```

### 3. **Configure Browser Proxy**

- Set HTTP proxy to: `127.0.0.1:8080`
- Enable proxy for localhost (important!)

### 4. **Test Different Scenarios**

#### 🌐 HTML Content Modification

```
Visit: http://localhost:3000
Expected: See test server page with proxy banner added
```

#### 📊 JSON API Testing

```
Visit: http://localhost:3000/api/test
Expected: JSON response with proxy metadata added
```

#### 🔍 Header Inspection

```
Visit: http://localhost:3000/headers
Expected: See custom proxy headers in the response
```

#### ⚠️ Error Handling

```
Visit: http://localhost:3000/error/404
Expected: 404 page with proxy error banner
```

## 🧪 Advanced Testing Scenarios

### **HTTPBin Testing** (External Service)

```bash
# Test header manipulation
curl -x 127.0.0.1:8080 http://httpbin.org/headers

# Test query parameters
curl -x 127.0.0.1:8080 "http://httpbin.org/get?test=value"

# Test POST requests
curl -x 127.0.0.1:8080 -X POST -d "test=data" http://httpbin.org/post
```

### **JSONPlaceholder Testing** (External API)

```bash
# Test JSON modification
curl -x 127.0.0.1:8080 https://jsonplaceholder.typicode.com/posts/1

# Test API with query parameters
curl -x 127.0.0.1:8080 "https://jsonplaceholder.typicode.com/posts?userId=1"
```

### **Example.com Testing** (HTML Content)

```bash
# Test HTML modification
curl -x 127.0.0.1:8080 http://example.com
```

### **Static File Serving Test**

```bash
# Test custom file serving
curl -x 127.0.0.1:8080 http://any-domain.com/proxy-test-info
```

## 🎨 Visual Testing Checklist

When testing through a browser, you should see:

### ✅ **Local Test Server** (`localhost:3000`)

- [ ] Purple test banner at the top
- [ ] "🧪 Proxy Magic Testing Demo" message
- [ ] Test information box with proxy details
- [ ] Original server content below

### ✅ **HTTPBin** (`httpbin.org`)

- [ ] Shows your custom proxy headers
- [ ] Query parameters added by proxy
- [ ] Modified request details

### ✅ **JSONPlaceholder** (API responses)

- [ ] JSON response includes `_proxyMagicTest` object
- [ ] Custom headers in response
- [ ] Original API data preserved

### ✅ **Example.com** (HTML modification)

- [ ] Custom proxy banner injected
- [ ] Test styles applied
- [ ] Console logs showing proxy activity

## 🔧 Debugging Tips

### **Enable Debug Mode**

```bash
DEBUG_RULES=true npm start
```

### **Check Browser Developer Tools**

1. Open DevTools (F12)
2. Go to Network tab
3. Look for custom headers:
   - `X-Proxy-Magic-Test`
   - `X-Test-Timestamp`
   - `X-Original-Host`

### **Common Issues & Solutions**

**Proxy not working?**

- ✅ Check browser proxy settings
- ✅ Make sure proxy is running on port 8080
- ✅ Try disabling HTTPS proxy if only testing HTTP

**Local server not accessible?**

- ✅ Enable proxy for localhost in browser settings
- ✅ Check if test server is running (`node test-server.js`)
- ✅ Try `127.0.0.1:3000` instead of `localhost:3000`

**Headers not visible?**

- ✅ Enable debug mode with `DEBUG_RULES=true`
- ✅ Check browser console for proxy logs
- ✅ Use curl for direct header inspection

## 🎯 Testing Scenarios by Feature

### **Request Matching**

```bash
# Test different domains
curl -x 127.0.0.1:8080 http://example.com
curl -x 127.0.0.1:8080 http://httpbin.org
curl -x 127.0.0.1:8080 http://localhost:3000
```

### **Header Manipulation**

```bash
# See added headers
curl -x 127.0.0.1:8080 http://httpbin.org/headers
```

### **Query Parameter Modification**

```bash
# See modified parameters
curl -x 127.0.0.1:8080 "http://httpbin.org/get?original=param"
```

### **Content Modification**

```bash
# See modified HTML
curl -x 127.0.0.1:8080 http://example.com

# See modified JSON
curl -x 127.0.0.1:8080 https://jsonplaceholder.typicode.com/posts/1
```

### **Static File Serving**

```bash
# Test custom file serving
curl -x 127.0.0.1:8080 http://test.com/proxy-test-info
```

## 🚀 Production Testing Tips

### **Use Staging Environments**

- Test against your own staging servers
- Use development API endpoints
- Create test-specific domains

### **Mock Services**

- Use tools like WireMock or json-server
- Create Docker containers for testing
- Set up local mock APIs

### **Ethical Testing**

- Don't test against production services you don't own
- Use domains reserved for testing (example.com, test domains)
- Respect rate limits and ToS of testing services

## 📝 Creating Your Own Test Rules

Based on the demos, you can create rules for:

1. **Development Proxy** - Redirect staging to local
2. **API Enhancement** - Add authentication headers
3. **Content Filtering** - Block or modify content
4. **Performance Testing** - Add delays or modify responses
5. **Security Testing** - Add security headers

---

**🎉 Happy Testing!**

This guide provides safe, ethical, and effective ways to test all proxy functionality without relying on production services.
