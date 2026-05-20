# Backend Setup Guide

## 🔍 Login Error: "Unable to sign in"

This error occurs because the **backend API server is not running**. The frontend needs the backend to authenticate users.

## ✅ Solution: Start the Backend Server

### Step 1: Locate Your Backend Project

The backend is typically a separate .NET project. Look for:
- A folder with `.csproj` or `.sln` files
- Usually named something like:
  - `PAS-Backend`
  - `PAS.API`
  - `PAS.WebAPI`
  - Or similar

### Step 2: Start the Backend

Open a **new terminal/command prompt** and navigate to the backend folder:

```bash
cd path/to/your/backend/project
```

Then start the server:

```bash
dotnet run
```

Or for development with hot reload:

```bash
dotnet watch run
```

### Step 3: Verify Backend is Running

You should see output like:

```
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5028
info: Microsoft.Hosting.Lifetime[0]
      Application started. Press Ctrl+C to shut down.
```

**Important:** The backend MUST be running on **port 5028** (as configured in `proxy.conf.json`)

### Step 4: Start the Frontend

In a **separate terminal**, navigate to the frontend folder and start it:

```bash
cd C:\Users\A\PAS-Frontend
ng serve
```

### Step 5: Test Login

1. Open browser: `http://localhost:4200`
2. Go to Register page
3. Create a new account with your own credentials
4. Login with the credentials you just created

## 🔧 Troubleshooting

### Issue: Backend won't start

**Check if .NET SDK is installed:**
```bash
dotnet --version
```

If not installed, download from: https://dotnet.microsoft.com/download

**Check for port conflicts:**
```bash
# Windows
netstat -ano | findstr :5028

# If port is in use, kill the process or change the port
```

### Issue: Backend starts but on different port

If your backend runs on a different port (e.g., 5000, 7000), update the proxy configuration:

1. Open `C:\Users\A\PAS-Frontend\proxy.conf.json`
2. Change the target port:
   ```json
   {
     "/api": {
       "target": "http://127.0.0.1:YOUR_PORT",
       "secure": false,
       "changeOrigin": true,
       "logLevel": "debug"
     }
   }
   ```
3. Restart the frontend: `ng serve`

### Issue: "Connection refused" or "ERR_CONNECTION_REFUSED"

This means the backend is not running. Make sure:
1. Backend server is started (`dotnet run`)
2. Backend is listening on port 5028
3. No firewall blocking the connection

### Issue: Backend database not configured

If backend starts but login fails with database errors:

1. Check `appsettings.json` in backend project
2. Ensure database connection string is correct
3. Run database migrations:
   ```bash
   dotnet ef database update
   ```

## 📋 Complete Startup Checklist

- [ ] Backend project located
- [ ] .NET SDK installed
- [ ] Backend database configured
- [ ] Backend running on port 5028
- [ ] Frontend running on port 4200
- [ ] User registered with own credentials
- [ ] Login successful

## 🎯 Quick Start Commands

### Terminal 1: Backend
```bash
cd path/to/backend
dotnet run
```

### Terminal 2: Frontend
```bash
cd C:\Users\A\PAS-Frontend
ng serve
```

### Browser
```
http://localhost:4200
```

## 📝 User Registration Flow

1. **Register** - Create account with your credentials
   - Username: Your choice
   - Password: Your choice (min 8 characters)
   - Email: Your email
   - Employee Code: Format EMP + numbers (e.g., EMP1234)

2. **Activate** - Account may need activation
   - Check with admin
   - Or use "Force Activate" button on login page (development only)

3. **Login** - Use your registered credentials
   - Username: What you registered with
   - Password: What you registered with

## ⚠️ Important Notes

- **No default credentials** - Users must register their own accounts
- **Backend required** - Frontend cannot work without backend
- **Port 5028** - Backend must run on this port (or update proxy config)
- **Database required** - Backend needs a configured database

## 🆘 Still Having Issues?

1. **Check backend console** for error messages
2. **Check frontend console** (F12 in browser) for errors
3. **Verify proxy configuration** in `proxy.conf.json`
4. **Check network tab** in browser DevTools to see API calls
5. **Ensure both servers are running** simultaneously

---

**Remember:** Users create their own accounts through registration. There are no pre-configured test credentials.