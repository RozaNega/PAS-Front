# 🔧 Fix Connection Issue - Step by Step

## The Problem

You're seeing: **"Unable to connect to the server. Please ensure the backend API is running at http://localhost:5028"**

## The Root Cause

The Angular dev server is **NOT using the proxy configuration** because it wasn't restarted after the proxy was added.

## The Solution (Follow These Steps EXACTLY)

### Step 1: Stop the Dev Server
In the terminal where `ng serve` is running:
1. Press `Ctrl+C`
2. Wait until it fully stops
3. Make sure you see the command prompt again

### Step 2: Clear the Angular Cache
Run this command:
```bash
rmdir /s /q .angular\cache
```

Press `Y` if it asks for confirmation.

### Step 3: Restart the Dev Server
```bash
ng serve
```

**WAIT** for it to fully compile. You should see:
```
✔ Browser application bundle generation complete.
✔ Built successfully
** Angular Live Development Server is listening on localhost:4200 **
```

### Step 4: Clear Browser Cache
1. Open your browser
2. Press `Ctrl+Shift+Delete`
3. Select "Cached images and files"
4. Click "Clear data"

OR:
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Step 5: Test the Connection
1. Go to `http://localhost:4200`
2. Open DevTools (F12) → Network tab
3. Try to login or register
4. Look at the request URL in the Network tab

**It should show:**
- ✅ `http://localhost:4200/api/Auth/login` (CORRECT - using proxy)

**NOT:**
- ❌ `http://localhost:5028/api/Auth/login` (WRONG - bypassing proxy)

## How to Verify the Proxy is Working

### Method 1: Check Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Try to login
4. Click on the "login" request
5. Check "Request URL" - it should start with `http://localhost:4200/api/`

### Method 2: Check Console Logs
1. Open DevTools (F12)
2. Go to Console tab
3. Try to login
4. Look for `[Auth Interceptor] Request:` logs
5. The URL should be `/api/Auth/login` (relative, not absolute)

### Method 3: Test with Browser
Open this URL in your browser:
```
http://localhost:4200/api/WeatherForecast
```

If the proxy is working, you should see JSON data from the backend.

## Still Not Working?

### Check 1: Is the backend really running?
Open this URL in your browser:
```
http://localhost:5028/api/WeatherForecast
```

If you see JSON data, the backend is working.
If you see an error, the backend is NOT running or has issues.

### Check 2: Is the dev server using the proxy?
When you run `ng serve`, check the console output. You should see proxy-related messages if it's working.

### Check 3: Are you using the correct configuration?
Run this command to verify:
```bash
ng serve --configuration development
```

Make sure it says `development`, not `production`.

### Check 4: Check the files
Run the diagnostic script:
```bash
.\diagnose.ps1
```

All checks should show "OK" in green.

## Common Mistakes

### ❌ Mistake 1: Not Restarting Dev Server
Just saving files or hot-reload is NOT enough. You MUST stop and restart `ng serve`.

### ❌ Mistake 2: Not Clearing Browser Cache
The browser caches the old configuration. You MUST clear the cache.

### ❌ Mistake 3: Backend Not Running
Make sure your backend is actually running and accessible at `http://localhost:5028`.

### ❌ Mistake 4: Wrong Configuration
Make sure you're running in development mode, not production.

## Expected Flow

### Without Proxy (OLD - BROKEN)
```
Browser (localhost:4200)
    ↓
Tries to call: http://localhost:5028/api/Auth/login
    ↓
CORS ERROR ❌ (Different origin)
    ↓
"Unable to connect to the server"
```

### With Proxy (NEW - WORKING)
```
Browser (localhost:4200)
    ↓
Calls: http://localhost:4200/api/Auth/login
    ↓
Angular Dev Server (localhost:4200)
    ↓
Proxies to: http://localhost:5028/api/Auth/login
    ↓
Backend API (localhost:5028)
    ↓
SUCCESS ✅
```

## Quick Checklist

Before trying to login, make sure:

- [ ] Backend is running on port 5028
- [ ] Frontend dev server was STOPPED completely
- [ ] Angular cache was cleared (`rmdir /s /q .angular\cache`)
- [ ] Frontend dev server was RESTARTED (`ng serve`)
- [ ] Browser cache was cleared (Ctrl+Shift+Delete)
- [ ] You're accessing `http://localhost:4200` (not 5028)
- [ ] Network tab shows requests to `localhost:4200/api/...`

## If Everything Fails

1. **Close all browser windows**
2. **Stop the dev server** (Ctrl+C)
3. **Clear Angular cache:** `rmdir /s /q .angular\cache`
4. **Clear node_modules cache:** `npm cache clean --force`
5. **Restart your computer** (yes, really)
6. **Start backend**
7. **Start frontend:** `ng serve`
8. **Open browser in incognito mode**
9. **Try again**

## Need More Help?

If you've followed ALL these steps and it's still not working:

1. Take a screenshot of the Network tab showing the failed request
2. Take a screenshot of the Console tab showing any errors
3. Share the output of `.\diagnose.ps1`
4. Share the terminal output from `ng serve`

This will help identify the exact issue.
