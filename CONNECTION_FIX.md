# Frontend-Backend Connection Fix

## 🔍 Problem
Registration and login not working even though backend is running on `http://localhost:5028/swagger/index.html`.

## ✅ Solution

The issue is that the Angular dev server needs to be started **with the proxy configuration** to forward API requests to the backend.

### Quick Fix (Recommended)

**Stop the current ng serve** (Ctrl+C in the terminal where it's running)

Then use ONE of these methods:

#### Method 1: Use the Start Script (Easiest)
```bash
npm start
```

#### Method 2: Use the Batch File
```bash
START_WITH_PROXY.bat
```

#### Method 3: Manual Command
```bash
ng serve --proxy-config proxy.conf.json
```

## 🔧 Why This Happens

When you run just `ng serve`, Angular doesn't use the proxy configuration. This means:
- ❌ API calls go to `http://localhost:4200/api` (frontend server)
- ❌ Backend on `http://localhost:5028` is not reached
- ❌ CORS errors occur
- ❌ Login/Register fail

When you run `ng serve --proxy-config proxy.conf.json`:
- ✅ API calls to `/api` are forwarded to `http://localhost:5028/api`
- ✅ Backend receives the requests
- ✅ No CORS issues
- ✅ Login/Register work

## 📋 Complete Startup Process

### Step 1: Start Backend
```bash
# Open Terminal 1
cd path\to\backend
dotnet run

# Wait for: "Now listening on: http://localhost:5028"
```

### Step 2: Start Frontend with Proxy
```bash
# Open Terminal 2
cd C:\Users\A\PAS-Frontend

# Use ONE of these:
npm start
# OR
START_WITH_PROXY.bat
# OR
ng serve --proxy-config proxy.conf.json
```

### Step 3: Verify Connection
1. Open browser: `http://localhost:4200`
2. Open browser console (F12)
3. Try to register/login
4. Check console for API calls - should see requests to `/api/Auth/...`

## 🧪 Test the Connection

### Option 1: Use Test Page
1. Open: `http://localhost:4200/test-backend-connection.html`
2. Click "Test Through Proxy (/api)"
3. Should see success message

### Option 2: Check Browser Console
1. Open browser console (F12)
2. Go to Network tab
3. Try to login
4. Look for requests to `/api/Auth/login`
5. Check the request URL - should be `http://localhost:4200/api/Auth/login`
6. Check the response - should come from backend

### Option 3: Check Terminal Output
When proxy is working, you should see in the terminal:
```
[HPM] POST /api/Auth/login -> http://127.0.0.1:5028
[HPM] POST /api/Auth/register -> http://127.0.0.1:5028
```

## ⚠️ Common Mistakes

### ❌ Wrong: Running without proxy
```bash
ng serve
```

### ✅ Correct: Running with proxy
```bash
npm start
# OR
ng serve --proxy-config proxy.conf.json
```

## 🔍 Troubleshooting

### Issue: Still getting connection errors

**Check 1: Is backend really running?**
```bash
# Open browser
http://localhost:5028/swagger/index.html

# Should see Swagger UI
```

**Check 2: Is frontend using proxy?**
```bash
# In the terminal where ng serve is running, look for:
[HPM] Proxy created: /api  -> http://127.0.0.1:5028

# If you don't see this, restart with proxy config
```

**Check 3: Check browser console**
```javascript
// Open browser console (F12) and run:
fetch('/api/Auth/test')
  .then(r => r.json())
  .then(d => console.log('Success:', d))
  .catch(e => console.error('Error:', e));

// Should connect to backend through proxy
```

### Issue: CORS errors

**Cause:** Frontend not using proxy, making direct requests to backend.

**Solution:** Restart frontend with proxy configuration:
```bash
npm start
```

### Issue: 404 Not Found on /api/Auth/login

**Possible causes:**
1. Backend not running
2. Backend running on wrong port
3. Backend API endpoint is different

**Check backend Swagger:**
1. Open `http://localhost:5028/swagger/index.html`
2. Look for Auth endpoints
3. Verify the endpoint path (should be `/api/Auth/login`)

### Issue: Backend on different port

If your backend runs on a different port (e.g., 5000, 7000):

1. Update `proxy.conf.json`:
```json
{
  "/api": {
    "target": "http://localhost:YOUR_PORT",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```

2. Restart frontend:
```bash
npm start
```

## 📊 Verification Checklist

- [ ] Backend running on port 5028
- [ ] Swagger accessible at http://localhost:5028/swagger/index.html
- [ ] Frontend started with `npm start` or proxy config
- [ ] Browser console shows no CORS errors
- [ ] Network tab shows requests to `/api/...`
- [ ] Terminal shows `[HPM] Proxy created` message

## 🎯 Expected Behavior

### When Working Correctly:

**Registration:**
1. User fills registration form
2. Frontend sends POST to `/api/Auth/register`
3. Proxy forwards to `http://localhost:5028/api/Auth/register`
4. Backend processes and responds
5. User account created

**Login:**
1. User enters credentials
2. Frontend sends POST to `/api/Auth/login`
3. Proxy forwards to `http://localhost:5028/api/Auth/login`
4. Backend validates and returns token
5. User logged in and redirected to dashboard

## 🆘 Still Not Working?

1. **Stop everything:**
   ```bash
   # Stop frontend (Ctrl+C)
   # Stop backend (Ctrl+C)
   ```

2. **Clear caches:**
   ```bash
   # Clear Angular cache
   rmdir /s /q .angular\cache
   
   # Clear browser cache (Ctrl+Shift+Delete)
   ```

3. **Restart in order:**
   ```bash
   # Terminal 1: Start backend
   cd path\to\backend
   dotnet run
   
   # Terminal 2: Start frontend with proxy
   cd C:\Users\A\PAS-Frontend
   npm start
   ```

4. **Test again:**
   - Open http://localhost:4200
   - Try to register
   - Check browser console for errors
   - Check both terminal windows for errors

## 📝 Quick Reference

| Command | Purpose |
|---------|---------|
| `npm start` | Start frontend with proxy (RECOMMENDED) |
| `ng serve --proxy-config proxy.conf.json` | Start with proxy (manual) |
| `START_WITH_PROXY.bat` | Start with proxy (batch file) |
| `ng serve` | Start WITHOUT proxy (DON'T USE) |

---

**Remember:** Always use `npm start` or include `--proxy-config proxy.conf.json` when starting the dev server!