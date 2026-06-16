const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

// Auto-start the email service as a child process on port 5030
const emailServicePath = path.resolve(__dirname, 'email-service.mjs');
const emailProcess = spawn('node', [emailServicePath], {
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: false,
});

emailProcess.stdout.on('data', (data) => {
  console.log('[email-service]', data.toString().trim());
});
emailProcess.stderr.on('data', (data) => {
  console.error('[email-service]', data.toString().trim());
});
emailProcess.on('error', (err) => {
  console.error('[PROXY] Failed to start email service:', err.message);
});
emailProcess.on('exit', (code) => {
  console.log('[PROXY] Email service exited with code', code);
});

// Give the email service a moment to start
const startTime = Date.now();
function waitForEmailService() {
  return new Promise((resolve) => {
    const check = () => {
      const req = http.get('http://127.0.0.1:5030/api/Notifications', (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => {
        if (Date.now() - startTime < 8000) {
          setTimeout(check, 300);
        } else {
          console.log('[PROXY] Email service not ready after 8s, continuing without it.');
          resolve(false);
        }
      });
      req.end();
    };
    check();
  });
}
// Non-blocking wait – the proxy config is returned immediately
waitForEmailService().then((ready) => {
  if (ready) console.log('[PROXY] Email service is ready on port 5030');
});

function forwardToEmailService(req, res) {
  console.log('[PROXY] Routing to email service (5030):', req.method, req.url);
  const options = {
    hostname: '127.0.0.1',
    port: 5030,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: '127.0.0.1:5030', connection: 'close' },
  };
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', (err) => {
    console.error('[PROXY] Email service error:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: 'Email service unavailable' }));
  });
  req.pipe(proxyReq);
}

const PROXY_CONFIG = {
  '/api': {
    target: 'http://127.0.0.1:5028',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    bypass: function (req, res) {
      console.log('[PROXY]', req.method, req.url);

      if (req.url === '/api/Auth/forgot-password' || req.url === '/api/Auth/reset-password') {
        forwardToEmailService(req, res);
        return true;
      }

      if (req.url.startsWith('/api/Notifications')) {
        forwardToEmailService(req, res);
        return true;
      }
    },
  },
  '/hubs': {
    target: 'http://127.0.0.1:5028',
    secure: false,
    changeOrigin: true,
    ws: true,
    logLevel: 'debug',
  },
};

// Cleanup on exit
process.on('exit', () => { try { emailProcess.kill(); } catch {} });
process.on('SIGINT', () => { try { emailProcess.kill(); } catch {} process.exit(); });
process.on('SIGTERM', () => { try { emailProcess.kill(); } catch {} process.exit(); });

module.exports = PROXY_CONFIG;
