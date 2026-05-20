# 🔧 Fix Backend - Disable HTTPS Redirect

## The Problem

Your backend is redirecting all HTTP requests to HTTPS:
```
http://localhost:5028 → https://localhost:7042 (NOT ACCESSIBLE)
```

This is why the frontend can't connect.

## Solution: Disable HTTPS Redirect in Backend

### Step 1: Find Your Backend Code

Look for your backend's `Program.cs` file (usually in the root of your backend project).

### Step 2: Comment Out HTTPS Redirection

Find this line:
```csharp
app.UseHttpsRedirection();
```

Comment it out:
```csharp
// app.UseHttpsRedirection();  // Disabled for development
```

### Step 3: Restart Your Backend

Stop and restart your backend application.

### Step 4: Test Backend

Open this URL in your browser:
```
http://localhost:5028/api/WeatherForecast
```

You should see JSON data, NOT a redirect.

## Alternative: Configure Backend for Development

If you have different configurations for development and production, update your `appsettings.Development.json`:

```json
{
  "Kestrel": {
    "Endpoints": {
      "Http": {
        "Url": "http://localhost:5028"
      }
    }
  }
}
```

And in `Program.cs`, only use HTTPS redirect in production:

```csharp
if (app.Environment.IsProduction())
{
    app.UseHttpsRedirection();
}
```

## After Fixing Backend

1. Restart your backend
2. Test: `http://localhost:5028/api/WeatherForecast` should work
3. Restart Angular dev server: `ng serve`
4. Clear browser cache
5. Try login at `http://localhost:4200`

## Verify Backend is Fixed

Run this command:
```bash
curl http://localhost:5028/api/WeatherForecast
```

**Expected:** JSON data (weather forecast)
**Wrong:** 307 Redirect or connection error

---

**Fix your backend first, then restart everything!**
