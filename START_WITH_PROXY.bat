@echo off
echo ========================================
echo   Starting Angular with Proxy Config
echo ========================================
echo.

echo Checking if backend is running...
curl -s http://localhost:5028/swagger/index.html >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ WARNING: Backend is NOT running on port 5028!
    echo.
    echo Please start the backend first:
    echo   1. Open a new terminal
    echo   2. Navigate to backend folder
    echo   3. Run: dotnet run
    echo.
    echo Press any key to continue anyway, or Ctrl+C to cancel...
    pause >nul
) else (
    echo ✅ Backend is running on port 5028
)

echo.
echo Stopping any existing ng serve processes...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq ng serve*" >nul 2>&1

echo.
echo Clearing Angular cache...
if exist ".angular\cache" (
    rmdir /s /q ".angular\cache"
    echo ✅ Cache cleared
) else (
    echo ℹ️  No cache to clear
)

echo.
echo Starting Angular dev server with proxy configuration...
echo.
echo 📝 Important:
echo   - Frontend will run on: http://localhost:4200
echo   - Backend should be on: http://localhost:5028
echo   - API calls to /api are proxied to backend
echo   - Email/auth calls go to email service on port 5030
echo.
echo ⚠️  Make sure you also start the email service:
echo      Open a SEPARATE terminal and run:
echo        node email-service.mjs
echo      or double-click START_EMAIL_SERVICE.bat
echo.
echo Press Ctrl+C to stop the server
echo.

npm start

pause