# Connection Diagnostic Script

Write-Host "=== PAS Frontend Connection Diagnostic ===" -ForegroundColor Cyan
Write-Host ""

# Check 1: Backend Running
Write-Host "1. Checking if backend is running on port 5028..." -ForegroundColor Yellow
$backend = netstat -ano | findstr ":5028.*LISTENING"
if ($backend) {
    Write-Host "   OK Backend is running" -ForegroundColor Green
    Write-Host "   $backend" -ForegroundColor Gray
} else {
    Write-Host "   ERROR Backend is NOT running!" -ForegroundColor Red
    Write-Host "   Please start your backend API first" -ForegroundColor Red
}
Write-Host ""

# Check 2: Frontend Running
Write-Host "2. Checking if frontend is running on port 4200..." -ForegroundColor Yellow
$frontend = netstat -ano | findstr ":4200.*LISTENING"
if ($frontend) {
    Write-Host "   OK Frontend is running" -ForegroundColor Green
    Write-Host "   $frontend" -ForegroundColor Gray
} else {
    Write-Host "   ERROR Frontend is NOT running!" -ForegroundColor Red
    Write-Host "   Please run ng serve to start the frontend" -ForegroundColor Red
}
Write-Host ""

# Check 3: Proxy Config Exists
Write-Host "3. Checking proxy configuration..." -ForegroundColor Yellow
if (Test-Path "proxy.conf.json") {
    Write-Host "   OK proxy.conf.json exists" -ForegroundColor Green
    $proxyContent = Get-Content "proxy.conf.json" -Raw
    Write-Host "   Content:" -ForegroundColor Gray
    Write-Host "   $proxyContent" -ForegroundColor Gray
} else {
    Write-Host "   ERROR proxy.conf.json NOT found!" -ForegroundColor Red
}
Write-Host ""

# Check 4: Angular.json has proxy config
Write-Host "4. Checking angular.json for proxy configuration..." -ForegroundColor Yellow
$angularJson = Get-Content "angular.json" -Raw
if ($angularJson -match '"proxyConfig":\s*"proxy.conf.json"') {
    Write-Host "   OK angular.json has proxyConfig" -ForegroundColor Green
} else {
    Write-Host "   ERROR angular.json does NOT have proxyConfig!" -ForegroundColor Red
    Write-Host "   The proxy configuration is missing from angular.json" -ForegroundColor Red
}
Write-Host ""

# Check 5: Environment file
Write-Host "5. Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path "src\environments\environment.development.ts") {
    $envContent = Get-Content "src\environments\environment.development.ts" -Raw
    if ($envContent -match "apiUrl:\s*'/api'") {
        Write-Host "   OK environment.development.ts has correct apiUrl" -ForegroundColor Green
    } elseif ($envContent -match "apiUrl:\s*'http://localhost:5028") {
        Write-Host "   ERROR environment.development.ts has absolute URL!" -ForegroundColor Red
        Write-Host "   It should be /api not http://localhost:5028/api/" -ForegroundColor Red
    } else {
        Write-Host "   WARNING Could not determine apiUrl configuration" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ERROR environment.development.ts NOT found!" -ForegroundColor Red
}
Write-Host ""

# Check 6: Test backend connectivity
Write-Host "6. Testing backend connectivity..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5028/api/WeatherForecast" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   OK Backend is accessible and responding" -ForegroundColor Green
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "   ERROR Cannot connect to backend!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "If all checks passed but you still see connection errors:" -ForegroundColor Yellow
Write-Host "1. Stop the dev server (Ctrl+C)" -ForegroundColor White
Write-Host "2. Clear cache: rmdir /s /q .angular\cache" -ForegroundColor White
Write-Host "3. Restart: ng serve" -ForegroundColor White
Write-Host "4. Clear browser cache (Ctrl+Shift+Delete)" -ForegroundColor White
Write-Host "5. Try again" -ForegroundColor White
Write-Host ""
Write-Host "The dev server MUST be restarted after adding proxy configuration!" -ForegroundColor Red
Write-Host ""
