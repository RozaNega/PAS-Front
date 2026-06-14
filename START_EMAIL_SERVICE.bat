@echo off
title PAS Email Service
echo ========================================
echo   Starting Email Service (port 5030)
echo ========================================
echo.
echo Make sure SMTP_USER and SMTP_PASS are set in .env
echo for real email delivery. Otherwise emails
echo are logged to console only.
echo.
echo Press Ctrl+C to stop
echo.
node email-service.mjs
pause
