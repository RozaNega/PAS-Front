# Connection Test Guide

## The Issue

You're seeing "Unable to connect to the server" even though:
- ✅ Backend is running on port 5028
- ✅ Frontend is running on port 4200
- ✅ Proxy configuration is in place

## Root Cause

The Angular dev server needs to be **completely restarted** after adding the proxy configuration. Simply saving files or hot-reloading is not enough.

## Solution Steps

### Step 1: Stop the Dev Server Completely
```bash
# Press Ctrl+C in the terminal where ng serve is running
# Make sure it fully stops
```

### Step 2: Clear Angular Cache
```bash
rmdir /s /q .angular\cache
```

### Step 3: Clear Browser Cache
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

Or:
- Chrome: Ctrl+Shift+Delete → Clear cache
- Edge: Ctrl+Shift+Delete → Clear cache

### Step 4: Restart Dev Server
```bash
ng serve
```

**IMPORTANT:** Make sure you see this in the console output:
```
** Angular Live Development Server is listening on localhost:4200, open your browser on http://localhost:4200/ **
```

### Step 5: Test the Connection

#### Option A: Test in Browser
1. Open `http://localhost:4200`
2. Open DevTools (F12) → Network tab
3. Try to login
4. Look at the request URL - it should be:
   - ✅ `http://localhost:4200/api/Auth/login` (proxied)
   - ❌ NOT `http://localhost:5028/api/Auth/login` (direct)

#### Option B: Test with curl
```bash
# Test if proxy is working
curl http://localhost:4200/api/WeatherForecast
```

If the proxy is working, you should get a response from the backend.

## Debugging

### Check 1: Verify Proxy Config is Loaded
When you start `ng serve`, you should see proxy debug logs in the console if the proxy is working.

### Check 2: Check Browser Console
Open DevTools → Console and look for:
- `[Auth Interceptor] Request:` logs
- The URL should be `/api/Auth/login` (relative)
- NOT `http://localhost:5028/api/Auth/login` (absolute)

### Check 3: Check Network Tab
1. Open DevTools → Network tab
2. Try to login
3. Click on the `login` request
4. Check the "Request URL" - it should be `http://localhost:4200/api/Auth/login`

### Check 4: Verify Backend is Accessible
```bash
# Test backend directly
curl http://localhost:5028/api/WeatherForecast
```

## Common Issues

### Issue 1: Dev Server Not Using Proxy
**Symptom:** Requests go directly to `http://localhost:5028`

**Solution:**
1. Verify `angular.json` has the proxy config:
   ```json
   "development": {
     "buildTarget": "PAS-Frontend:build:development",
     "proxyConfig": "proxy.conf.json"
   }
   ```
2. Restart dev server completely

### Issue 2: CORS Errors
**Symptom:** "Access-Control-Allow-Origin" errors

**Solution:** This means the proxy is NOT working. Follow Step 1-4 above.

### Issue 3: Status 0 Error
**Symptom:** Error status is 0

**Causes:**
- Proxy not configured
- Backend not running
- Network issue
- CORS blocking the request

**Solution:**
1. Verify backend is running: `curl http://localhost:5028/api/WeatherForecast`
2. Restart dev server with proxy
3. Clear browser cache

## Verification Checklist

Before trying to login, verify:

- [ ] Backend is running on port 5028
  ```bash
  netstat -ano | findstr :5028
  ```

- [ ] Frontend is running on port 4200
  ```bash
  netstat -ano | findstr :4200
  ```

- [ ] `proxy.conf.json` exists in project root

- [ ] `angular.json` has `proxyConfig` in development configuration

- [ ] `environment.development.ts` has `apiUrl: '/api'` (relative URL)

- [ ] Dev server was restarted after adding proxy config

- [ ] Browser cache was cleared

## Expected Behavior

### Before Proxy (WRONG)
```
Browser → http://localhost:5028/api/Auth/login
         ↓
      CORS ERROR ❌
```

### After Proxy (CORRECT)
```
Browser → http://localhost:4200/api/Auth/login
         ↓
    Angular Dev Server (proxy)
         ↓
    http://localhost:5028/api/Auth/login
         ↓
      Backend API ✅
```

## Still Not Working?

If you've followed all steps and it's still not working:

1. **Check if you're running in production mode:**
   ```bash
   # Should be development, not production
   ng serve --configuration development
   ```

2. **Check if there's a firewall blocking localhost:**
   - Temporarily disable firewall
   - Or add exception for ports 4200 and 5028

3. **Check if backend is listening on the right interface:**
   - Backend should listen on `127.0.0.1:5028` or `0.0.0.0:5028`
   - NOT just `localhost:5028`

4. **Try a different browser:**
   - Sometimes browser extensions block requests
   - Try in incognito/private mode

5. **Check backend logs:**
   - See if requests are reaching the backend
   - Check for any errors in backend console

## Quick Test Script

Create a file `test-proxy.html` in the project root:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Proxy Test</title>
</head>
<body>
    <h1>Proxy Connection Test</h1>
    <button onclick="testProxy()">Test Proxy</button>
    <pre id="result"></pre>

    <script>
        async function testProxy() {
            const result = document.getElementById('result');
            result.textContent = 'Testing...';
            
            try {
                const response = await fetch('/api/WeatherForecast');
                const data = await response.json();
                result.textContent = 'SUCCESS! Proxy is working.\n\n' + JSON.stringify(data, null, 2);
            } catch (error) {
                result.textContent = 'FAILED! Proxy is not working.\n\n' + error.message;
            }
        }
    </script>
</body>
</html>
```

Then open `http://localhost:4200/test-proxy.html` and click the button.
