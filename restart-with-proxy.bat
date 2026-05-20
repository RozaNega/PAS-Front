@echo off
echo ========================================
echo   Restarting Angular with Proxy
echo ========================================
echo.

echo Step 1: Clearing Angular cache...
if exist ".angular\cache" (
    rmdir /s /q ".angular\cache"
    echo    OK Cache cleared
) else (
    echo    OK No cache to clear
)
echo.

echo Step 2: Starting dev server with proxy...
echo    This will open in a new window
echo    Press Ctrl+C in that window to stop the server
echo.
start cmd /k "ng serve && pause"

echo.
echo ========================================
echo   Dev server is starting...
echo ========================================
echo.
echo IMPORTANT:
echo 1. Wait for the server to fully start
echo 2. Clear your browser cache (Ctrl+Shift+Delete)
echo 3. Go to http://localhost:4200
echo 4. Try to login/register
echo.
echo The proxy should now be working!
echo.
pause
