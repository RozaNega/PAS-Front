# 🔍 Debug Connection Issue - Step by Step

## I've Added Debug Logging

The application now has comprehensive logging to help identify the issue.

## Step 1: Restart the Dev Server

**IMPORTANT:** You MUST restart for the new logging to work.

```bash
# Stop the server (Ctrl+C)
# Clear cache
rmdir /s /q .angular\cache
# Restart
ng serve
```

## Step 2: Test the Proxy

Open this URL in your browser:
```
http://localhost:4200/test-connection
```

Click the **"Test Proxy"** button.

### Expected Results:

✅ **If proxy is working:**
- You'll see JSON data from the backend
- Message: "SUCCESS! Proxy is working!"

❌ **If proxy is NOT working:**
- You'll see an error
- Status will be 0 or CORS error

## Step 3: Check Browser Console

Open DevTools (F12) → Console tab

You should see detailed logs like:

```
🔍 [Auth Interceptor] { method: 'GET', url: '/api/WeatherForecast', ... }
📤 [ApiService POST] { endpoint: 'Auth/login', baseUrl: '/api', fullUrl: '/api/Auth/login', ... }
```

### What to Look For:

1. **Check the URL in the logs:**
   - ✅ GOOD: `url: '/api/Auth/login'` (relative)
   - ❌ BAD: `url: 'http://localhost:5028/api/Auth/login'` (absolute)

2. **Check for errors:**
   - If you see `Status 0` → Network/CORS issue
   - If you see `404` → Endpoint not found
   - If you see `500` → Backend error

## Step 4: Check Network Tab

Open DevTools (F12) → Network tab

Try to login and look at the request:

### Check Request URL:
- ✅ GOOD: `http://localhost:4200/api/Auth/login`
- ❌ BAD: `http://localhost:5028/api/Auth/login`

### Check Request Headers:
- Should have `Host: localhost:4200`
- Should NOT have CORS errors

## Step 5: Check Dev Server Console

Look at the terminal where `ng serve` is running.

### If proxy is working, you should see:
```
[HPM] Proxy created: /api  -> http://localhost:5028
[HPM] Proxy rewrite rule created: "^/api" ~> "/api"
```

### If you DON'T see these messages:
- The proxy is NOT loaded
- You need to restart the dev server

## Common Issues and Solutions

### Issue 1: Proxy Not Loaded

**Symptoms:**
- No proxy messages in dev server console
- Requests go directly to localhost:5028
- CORS errors

**Solution:**
```bash
# Make sure you're running in development mode
ng serve --configuration development

# Or just
ng serve
```

### Issue 2: Browser Cache

**Symptoms:**
- Old URLs are still being used
- Changes don't take effect

**Solution:**
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

### Issue 3: Backend Not Accessible

**Symptoms:**
- Status 0 errors
- "Failed to fetch" errors

**Solution:**
1. Check backend is running:
   ```bash
   curl http://localhost:5028/api/WeatherForecast
   ```
2. If it fails, restart your backend

### Issue 4: Wrong Environment

**Symptoms:**
- Using production URLs
- Proxy not working

**Solution:**
Make sure `angular.json` has:
```json
"serve": {
  "defaultConfiguration": "development"
}
```

## Diagnostic Checklist

Run through this checklist:

- [ ] Backend is running on port 5028
- [ ] Dev server was stopped completely (Ctrl+C)
- [ ] Angular cache was cleared (`rmdir /s /q .angular\cache`)
- [ ] Dev server was restarted (`ng serve`)
- [ ] Browser cache was cleared (Ctrl+Shift+Delete)
- [ ] Accessing `http://localhost:4200` (not 5028)
- [ ] Test page works: `http://localhost:4200/test-connection`
- [ ] Console shows debug logs with relative URLs
- [ ] Network tab shows requests to `localhost:4200/api/...`

## What the Logs Tell You

### 🔍 [Auth Interceptor]
Shows every HTTP request being made. Check the `url` field.

### 📤 [ApiService POST]
Shows how the API service constructs URLs. Check `fullUrl`.

### ❌ [Error Interceptor]
Shows detailed error information when requests fail.

### 🔴 Status 0 Error
Means:
1. Network error (can't reach server)
2. CORS blocking the request
3. Proxy not working

## Next Steps

After restarting and checking the logs:

1. **If you see relative URLs (`/api/...`)** → Proxy should be working
2. **If you see absolute URLs (`http://localhost:5028/...`)** → Environment not loaded correctly
3. **If you see Status 0 errors** → Backend not accessible or proxy not working

## Share Debug Info

If it's still not working, share:

1. Screenshot of browser console (with the debug logs)
2. Screenshot of Network tab (showing the failed request)
3. Output from dev server console (terminal where ng serve is running)
4. Result from test page (`http://localhost:4200/test-connection`)

This will help identify the exact issue.
