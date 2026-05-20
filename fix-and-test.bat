@echo off
cls
echo ========================================
echo   FIX CONNECTION ISSUE
echo ========================================
echo.

echo Step 1: Clearing Angular cache...
if exist ".angular\cache" (
    rmdir /s /q ".angular\cache"
    echo    [OK] Cache cleared
) else (
    echo    [OK] No cache to clear
)
echo.

echo Step 2: Verifying configuration files...
if exist "proxy.conf.json" (
    echo    [OK] proxy.conf.json exists
) else (
    echo    [ERROR] proxy.conf.json NOT FOUND!
    pause
    exit /b 1
)

findstr /C:"proxyConfig" angular.json >nul
if %errorlevel%==0 (
    echo    [OK] angular.json has proxy config
) else (
    echo    [ERROR] angular.json missing proxy config!
    pause
    exit /b 1
)
echo.

echo Step 3: Checking if backend is running...
netstat -ano | findstr ":5028.*LISTENING" >nul
if %errorlevel%==0 (
    echo    [OK] Backend is running on port 5028
) else (
    echo    [WARNING] Backend might not be running!
    echo    Please make sure your backend is running on port 5028
)
echo.

echo Step 4: Starting dev server...
echo    Opening in new window...
echo.
start "Angular Dev Server" cmd /k "ng serve && pause"

echo.
echo ========================================
echo   NEXT STEPS:
echo ========================================
echo.
echo 1. Wait for dev server to fully start
echo    (Look for "Built successfully" message)
echo.
echo 2. Clear browser cache:
echo    - Press Ctrl+Shift+Delete
echo    - Select "Cached images and files"
echo    - Click "Clear data"
echo.
echo 3. Open test page:
echo    http://localhost:4200/test-connection
echo.
echo 4. Click "Test Proxy" button
echo    - Should show SUCCESS if proxy is working
echo.
echo 5. Check browser console (F12) for debug logs:
echo    - Look for: [Auth Interceptor]
echo    - Look for: [ApiService POST]
echo    - Check URLs are relative (/api/...)
echo.
echo 6. Try to login at:
echo    http://localhost:4200
echo.
echo ========================================
echo.
echo If it still doesn't work, read:
echo    DEBUG_CONNECTION.md
echo.
pause
