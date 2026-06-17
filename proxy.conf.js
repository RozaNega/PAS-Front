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

// Auto-start the dev API server as a child process on port 5028
const devApiServerPath = path.resolve(__dirname, 'dev-api-server.mjs');
const devApiProcess = spawn('node', [devApiServerPath], {
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: false,
});

devApiProcess.stdout.on('data', (data) => {
  console.log('[dev-api-server]', data.toString().trim());
});
devApiProcess.stderr.on('data', (data) => {
  console.error('[dev-api-server]', data.toString().trim());
});
devApiProcess.on('error', (err) => {
  console.error('[PROXY] Failed to start dev API server:', err.message);
});
devApiProcess.on('exit', (code) => {
  console.log('[PROXY] Dev API server exited with code', code);
});

// Cleanup on exit
process.on('exit', () => {
  try { emailProcess.kill(); } catch {}
  try { devApiProcess.kill(); } catch {}
});
process.on('SIGINT', () => {
  try { emailProcess.kill(); } catch {}
  try { devApiProcess.kill(); } catch {}
  process.exit();
});
process.on('SIGTERM', () => {
  try { emailProcess.kill(); } catch {}
  try { devApiProcess.kill(); } catch {}
  process.exit();
});

const PROXY_CONFIG = [
  {
    context: ['/api/Auth/**', '/api/Notifications/**'],
    target: 'http://127.0.0.1:5030',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
  },
  {
    context: ['/api/**', '/hubs/**'],
    target: 'http://127.0.0.1:5028',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    ws: true,
  },
];

module.exports = PROXY_CONFIG;
