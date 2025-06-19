# 🔧 Proxy Magic Demo: Google to DuckDuckGo Redirect

This demo rule (`google-to-duckduckgo-demo.js`) showcases all the capabilities of the Proxy Magic application by redirecting Google traffic to DuckDuckGo while demonstrating various proxy features.

## 🎯 What This Demo Does

When you visit Google.com through the proxy, this rule will:

1. **Redirect** your traffic to DuckDuckGo.com
2. **Preserve** your search queries
3. **Add** privacy-enhancing headers
4. **Modify** the response content with visual indicators
5. **Inject** custom CSS and JavaScript
6. **Log** all modifications for educational purposes

## 🚀 How to Test

1. **Start the proxy server:**

   ```bash
   npm start
   ```

2. **Configure your browser** to use `127.0.0.1:8080` as HTTP proxy

3. **Visit Google.com** - you'll be redirected to DuckDuckGo with a privacy banner

4. **Try a search** like `google.com/search?q=proxy magic` - your query will be preserved

5. **Check the developer console** for demo logs and information

6. **Visit special demo URLs:**
   - `google.com/proxy-magic-demo.txt` - Custom static file
   - Any 404 on google.com - Custom error page

## 📋 Features Demonstrated

### 🎯 Request Matching Capabilities

| Feature                | Example                                    | Description                 |
| ---------------------- | ------------------------------------------ | --------------------------- |
| **Domain Matching**    | `google.com`, `www.google.com`             | Exact domain matches        |
| **Subdomain Matching** | `*.google.com`                             | Any subdomain of google.com |
| **Pattern Matching**   | `hostname.includes('google')`              | Flexible pattern matching   |
| **Regex Matching**     | `/^(www\.)?google\.(com\|co\.uk)$/`        | Advanced regex patterns     |
| **Port Matching**      | `port === '3000'`                          | Specific port targeting     |
| **Path Matching**      | `pathname === '/search'`                   | Exact path matches          |
| **Path Patterns**      | `pathname.startsWith('/api/')`             | Path prefix matching        |
| **File Extensions**    | `pathname.endsWith('.json')`               | File type matching          |
| **Query Parameters**   | `searchParams.has('debug')`                | Parameter presence          |
| **HTTP Methods**       | `method === 'POST'`                        | Request method filtering    |
| **Headers**            | `headers['user-agent'].includes('Chrome')` | Header-based matching       |

### 🔄 Request Manipulation

| Feature                 | What It Does                | Example               |
| ----------------------- | --------------------------- | --------------------- |
| **Traffic Redirection** | Changes destination server  | Google → DuckDuckGo   |
| **Header Addition**     | Adds custom headers         | `X-Proxy-Magic: Demo` |
| **Header Modification** | Modifies existing headers   | Enhanced User-Agent   |
| **Header Removal**      | Removes unwanted headers    | Privacy protection    |
| **Query Manipulation**  | Adds/removes URL parameters | Tracking protection   |
| **Body Modification**   | Modifies POST/PUT bodies    | JSON enhancement      |
| **Request Blocking**    | Blocks unwanted requests    | Ad/tracker blocking   |

### 📨 Response Manipulation

| Feature                    | What It Does             | Example                  |
| -------------------------- | ------------------------ | ------------------------ |
| **Header Addition**        | Adds response headers    | Privacy indicators       |
| **Cookie Modification**    | Enhances cookie security | SameSite/Secure flags    |
| **HTML Modification**      | Modifies page content    | Privacy banner injection |
| **CSS Injection**          | Adds custom styles       | Visual demo indicators   |
| **JavaScript Injection**   | Adds custom scripts      | Console logging          |
| **JSON Modification**      | Modifies API responses   | Metadata addition        |
| **Static File Serving**    | Serves custom content    | Demo file generation     |
| **Error Page Enhancement** | Enhance existing errors  | Custom error banners     |
| **Caching Control**        | Modifies cache headers   | Performance optimization |

## 🎨 Visual Indicators

When visiting Google through the proxy, you'll see:

- **🛡️ Privacy Banner**: Green banner at the top indicating redirection
- **🔗 Link Indicators**: Small link icons after all links
- **🌈 Rainbow Bar**: Animated gradient bar (from CSS modification)
- **📱 Corner Indicator**: "CSS Modified" indicator in bottom-right
- **🎯 Console Logs**: Detailed information in browser console
- **📊 Search Highlighting**: Alternating borders on search results

## 📱 Testing Different Scenarios

### Basic Redirection

```
Visit: http://google.com
Result: Redirected to DuckDuckGo with privacy banner
```

### Search Query Preservation

```
Visit: http://google.com/search?q=proxy+magic
Result: DuckDuckGo search for "proxy magic"
```

### Static File Serving

```
Visit: http://google.com/proxy-magic-demo.txt
Result: Custom text file with demo information
```

### Custom Error Pages

```
Visit: http://google.com/nonexistent-page
Result: Error page with custom proxy banner
```

### API Requests (JSON)

```
Visit: Any Google API endpoint
Result: JSON response with added _proxyMagic metadata
```

## 🔧 Code Structure

The demo rule is organized into clear sections:

1. **Match Function**: Demonstrates various matching techniques
2. **onRequest Function**: Shows request manipulation capabilities
3. **onResponse Function**: Demonstrates response modification
4. **Utility Functions**: Helper functions for common tasks

## 🎓 Learning Opportunities

This demo teaches you how to:

- **Match requests** using various criteria
- **Redirect traffic** to different servers
- **Modify headers** for privacy/security
- **Inject content** into HTML pages
- **Manipulate API responses**
- **Serve static files** directly from the proxy
- **Handle errors** with custom pages
- **Add tracking protection**
- **Enhance privacy** automatically

## 🛠️ Customization Ideas

Based on this demo, you could create rules for:

- **Ad Blocking**: Block advertising domains
- **Privacy Protection**: Remove tracking parameters
- **Content Filtering**: Filter inappropriate content
- **API Enhancement**: Add authentication headers
- **Development Tools**: Add debugging information
- **Performance**: Optimize resource loading
- **Security**: Add security headers
- **Localization**: Modify content for regions

## 📝 Configuration Options

The demo rule can be customized by:

1. **Uncommenting features** you want to enable
2. **Modifying match conditions** for your use case
3. **Adjusting redirection targets**
4. **Customizing visual indicators**
5. **Adding your own content modifications**

## 🚨 Important Notes

- **Privacy**: This demo redirects Google to DuckDuckGo for privacy demonstration
- **Performance**: Extensive modifications may impact page load times
- **Compatibility**: Some features may not work with all websites
- **Security**: Always validate and sanitize injected content
- **Testing**: Test thoroughly before using in production

## 🎉 Next Steps

After exploring this demo:

1. **Create your own rules** based on the patterns shown
2. **Combine multiple features** for powerful proxy behaviors
3. **Optimize for performance** by removing unnecessary features
4. **Add error handling** for production use
5. **Contribute improvements** back to the project

## 🔍 Debug Information

Enable debug mode to see detailed logs:

```bash
DEBUG_RULES=true npm start
```

This will show:

- Rule loading information
- Request/response processing details
- Modification confirmations
- Error details if any issues occur

## 🛠️ Troubleshooting

### Common Issues and Solutions

**Error: "Cannot write headers after they are sent"**

- **Cause**: Trying to modify response headers after they've been sent
- **Solution**: Use `setHeader()` instead of `writeHead()`, or modify content instead of replacing responses
- **Fixed in**: This demo uses safe header modification techniques

**Rule not matching**

- **Cause**: Incorrect URL matching logic
- **Solution**: Enable debug mode and check the console logs for URL parsing
- **Test**: Use the built-in test cases to verify matching logic

**Content not being modified**

- **Cause**: Response might not be the expected content type
- **Solution**: Check the `content-type` header and ensure proper content type handling
- **Debug**: Add console logs to see what content types are being processed

**Proxy not intercepting HTTPS**

- **Cause**: HTTPS requires certificate trust
- **Solution**: Install and trust the generated CA certificate
- **Location**: Check `.proxy_certs/certs/ca.pem`

---

**Happy Proxying! 🚀**

This demo showcases the power and flexibility of Proxy Magic. Use it as a learning tool and springboard for your own proxy rules.
